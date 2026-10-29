/* 화면 전환: 홈 · 일기장 · 설정 · 인증 카드 */
(function () {
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const app = document.getElementById('app');

  // 글자 크기·움직임 설정을 화면 전체에 적용
  function applyPrefs() {
    const D = Core.data, h = document.documentElement;
    h.classList.toggle('fs-l', D.textSize === 'l');
    h.classList.toggle('fs-xl', D.textSize === 'xl');
    h.classList.toggle('no-motion', D.motion === false);
  }
  applyPrefs();
  function show(id, cls) {
    if (id !== 'play') { Sound.music('night'); Sound.ambience(null); }
    app.innerHTML = `<div id="${id}" class="screen ${cls || ''}"></div>`;
    window.scrollTo(0, 0);
    return document.getElementById(id);
  }

  function testBanner() {
    if (!Core.IS_TEST) return '';
    const n = Core.nowKST();
    return `<div class="test-banner">테스트 모드 · ${Core.PREVIEW_ALL ? '전체 열림' : esc(n.date) + ' ' + n.hour + '시 기준'} · 기록은 따로 저장됨
      <button class="link" id="test-reset">테스트 기록 지우기</button></div>`;
  }

  /* ---------- 홈 ---------- */
  function home() {
    const D = Core.data;
    const root = show('home');
    const b = Core.starCount() / Core.starTotal();
    const started = !!D.done['0'];
    const today = Core.nowKST().date;

    let list = '';
    for (const ch of CHAPTERS) {
      if (ch.n === 0) continue;
      const eps = EPISODES.filter(e => e.ch === ch.n);
      list += `<section class="chapter tone-${ch.tone}">
        <h2><span>${esc(ch.label)}</span> ${esc(ch.title)}${ch.who ? `<small>${esc(ch.who)}</small>` : ''}</h2>
        <div class="eps">`;
      for (const e of eps) {
        const open = Core.isOpen(e);
        const done = !!D.done[e.id];
        const ready = !!window.STORY[e.id];
        let cls = 'ep', label = esc(e.title), state = '';
        if (done) { cls += ' done'; state = '✓'; }
        else if (!started) { cls += ' locked'; label = ''; state = '🔒'; }
        else if (open && !ready) { cls += ' soon'; state = '준비 중'; }
        else if (open) { cls += ' open'; state = e.date === today ? '오늘' : '열림'; }
        else {
          cls += ' locked'; state = '🔒';
          label = Core.IS_TEST ? esc(e.title) : '';
        }
        list += `<button class="${cls}" data-id="${e.id}">
          <span class="ep-date">${esc(Core.dateLabel(e.date))}<em>${esc(e.day)}</em></span>
          <span class="ep-title">${label}${!open && !done && started ? `<span class="ep-open">${e.openHour ? e.openHour + '시에' : ''} 열려요</span>` : ''}</span>
          <span class="ep-state">${state}</span>
        </button>`;
      }
      list += `</div></section>`;
    }

    root.innerHTML = `
      ${testBanner()}
      <button class="snd-home" id="snd">${Sound.on ? '🔊' : '🔇'}</button>
      <header class="home-head">
        <div class="home-star">${Art.bigStar(Math.max(0.04, b), 170)}</div>
        <h1>그 밤을 향하여</h1>
        <p class="sub">2026 연동교회 고등부 대림절</p>
        ${started ? `<div class="stats">
          <span>${esc(D.nickname)}${D.ban ? ' · ' + esc(D.ban) : ''}</span>
          <span>⭐ 별빛 ${Core.starCount()}/${Core.starTotal()}</span>
          <span>🪔 기름 ${D.oil || 0}</span>
        </div>` : ''}
      </header>
      ${!Core.canSave ? `<div class="warn">이 브라우저에서는 기록이 저장되지 않아요(사생활 보호 모드일 수 있어요). 일반 모드로 열어 주세요.</div>` : ''}
      ${nightLine()}
      ${backupNudge()}
      ${!started ? `<button class="btn big start" id="start">시작하기</button>` : D.done.end ? `<button class="btn big finale-go" id="finale">🌟 27일의 기록 다시 보기</button>` : noteCard()}
      ${list}
      <footer class="home-foot">
        ${started ? `<div class="menu">
          <button class="btn ghost" id="cards">🃏 카드 도감 <small>${Core.starCount()}/${Core.starTotal()}</small></button>
          <button class="btn ghost" id="fame">📜 나의 기록</button>
          <button class="btn ghost" id="code">🔑 주일 암호 <small>${Object.keys(D.codes || {}).length}/4</small></button>
          <button class="btn ghost" id="diary">📔 묵상 노트</button>
          <button class="btn ghost" id="verses">📖 말씀 모음 <small>${Object.values(D.verse || {}).reduce((a, v) => a + (Array.isArray(v) ? v.length : 1), 0)}</small></button>
          <button class="btn ghost" id="settings">⚙️ 설정</button>
        </div>` : ''}
        <p>기록은 <b>이 폰의 이 브라우저</b>에만 저장돼요.<br>${Core.isKakao ? '지금 카톡에서 열었으니 앞으로도 카톡 링크로 들어와 주세요.' : '다음에도 같은 브라우저로 들어와 주세요.'}</p>
      </footer>`;

    root.querySelectorAll('.ep').forEach(btn => btn.onclick = () => {
      const e = Core.epById(btn.dataset.id);
      if (btn.classList.contains('done')) return doneSheet(e);
      if (btn.classList.contains('open')) return go(e.id);
      if (btn.classList.contains('soon')) return Player.toast('아직 준비 중인 편이에요');
      if (!started) return Player.toast('먼저 시작하기를 눌러 줘');
      Player.toast(`${Core.dateLabel(e.date)} ${e.openHour ? e.openHour + '시에' : ''} 열려요`);
    });
    const s = root.querySelector('#start'); if (s) s.onclick = () => go('0');
    const d = root.querySelector('#diary'); if (d) d.onclick = diary;
    const st = root.querySelector('#settings'); if (st) st.onclick = settings;
    const cd = root.querySelector('#cards'); if (cd) cd.onclick = cards;
    const fm = root.querySelector('#fame'); if (fm) fm.onclick = fame;
    const co = root.querySelector('#code'); if (co) co.onclick = codePage;
    const vv = root.querySelector('#verses'); if (vv) vv.onclick = versePage;
    const fi = root.querySelector('#finale'); if (fi) fi.onclick = finale;
    const nu = root.querySelector('#nudge'); if (nu) nu.onclick = () => { settings(); setTimeout(() => { const b = document.getElementById('bk-make'); if (b) b.scrollIntoView({ block: 'center' }); }, 100); };
    const nc = root.querySelector('.note-card'); if (nc) nc.onclick = () => go(nc.dataset.id);
    root.querySelector('#snd').onclick = e => { e.currentTarget.textContent = Sound.toggle() ? '🔊' : '🔇'; };
    bindTestReset(root);
  }

  // 오늘 열린 편(또는 가장 최근에 열렸는데 아직 안 한 편)의 인물 쪽지
  function noteCard() {
    const D = Core.data;
    const open = Core.mainEpisodes().filter(e => Core.isOpen(e) && !D.done[e.id] && window.STORY[e.id]);
    const e = open[open.length - 1];
    if (!e || !e.note) return '';
    const more = open.length > 1 ? `<span class="note-more">못 한 편이 ${open.length - 1}개 더 있어요</span>` : '';
    return `<button class="note-card" data-id="${e.id}">
      <span class="note-from">📩 ${esc(e.host)}의 쪽지 <em>${esc(Core.dateLabel(e.date))} ${esc(e.day)}</em></span>
      <span class="note-text">“${esc(e.note)}”</span>
      <span class="note-go">이야기 열기 →</span>${more}
    </button>`;
  }
  function backupNudge() {
    const D = Core.data, n = Core.starCount();
    if (n < 3) return '';
    const days = D.lastBackup ? (Date.now() - D.lastBackup) / 864e5 : 99;
    if (days < 7) return '';
    return `<button class="nudge" id="nudge">📦 기록을 지켜 두자: <b>백업 코드</b> 만들기 (${D.lastBackup ? Math.floor(days) + '일 전 백업' : '아직 백업 안 함'})</button>`;
  }
  // 지금 한국 시간이 밤이면 한 줄
  function nightLine() {
    const n = Core.nowKST();
    if (n.date === '2026-12-24' && n.hour >= 18) return `<div class="night-line holy">✨ 오늘 밤이 바로 그 밤이야. 목자들이 들판에서 양을 지키던 그 밤.</div>`;
    if (n.date === '2026-12-25') return `<div class="night-line holy">⭐ 메리 크리스마스! 구주가 나셨어.</div>`;
    if (n.hour >= 19 || n.hour < 5) return `<div class="night-line">🌙 지금 밖도 밤이야. 잠깐 창밖 하늘을 올려다봐.</div>`;
    return '';
  }

  function bindTestReset(root) {
    const t = root.querySelector('#test-reset');
    if (t) t.onclick = () => { if (confirm('테스트 기록을 지울까요?')) { Core.reset(); home(); } };
  }

  function go(id) {
    show('play');
    Player.play(id);
  }

  function doneSheet(e) {
    const D = Core.data;
    const sheet = document.createElement('div');
    sheet.className = 'sheet-back';
    sheet.innerHTML = `<div class="sheet">
      <div class="sheet-title">${esc(e.day)} · ${esc(e.title)}</div>
      ${D.diary[e.id] && D.diary[e.id].a ? `<div class="sheet-diary">“${esc(D.diary[e.id].a)}”</div>` : ''}
      <button class="btn" data-v="card">인증 카드</button>
      <button class="btn ghost" data-v="replay">다시 보기</button>
      <button class="btn ghost" data-v="close">닫기</button>
    </div>`;
    document.body.appendChild(sheet);
    const close = () => sheet.remove();
    sheet.onclick = ev => { if (ev.target === sheet) close(); };
    sheet.querySelector('[data-v=card]').onclick = () => { close(); card(e.id); };
    sheet.querySelector('[data-v=replay]').onclick = () => { close(); go(e.id); };
    sheet.querySelector('[data-v=close]').onclick = close;
  }

  /* ---------- 일기장 ---------- */
  function diary() {
    const root = show('diary', 'page');
    const list = Note.entries();
    root.innerHTML = `
      ${testBanner()}
      <div class="page-head"><button class="back">←</button><h1>📔 묵상 노트</h1></div>
      <p class="page-note">매일 적은 일기와 말씀 묵상이 여기 모여요. 이 폰에만 저장되고, 아무도 볼 수 없어요.</p>
      ${list.length ? `<div class="export">
        <button class="btn" id="ex-img">🖼 노트 이미지로 저장</button>
        <div class="row"><button class="btn ghost" id="ex-copy">📋 글로 복사</button><button class="btn ghost" id="ex-txt">💾 파일(.txt)</button></div>
      </div>` : ''}
      ${list.length ? list.map(x => `
        <article class="diary-item tone-${x.ch.tone}">
          <div class="di-meta">${esc(x.ch.label)} · ${esc(Core.dateLabel(x.e.date))} ${esc(x.e.day)}</div>
          <div class="di-title">${esc(x.e.title)} <small>${esc(x.read)}</small></div>
          ${x.vs.map(v => `<div class="di-verse">“${esc(v.text)}” <small>${esc(v.label)}</small></div>`).join('')}
          ${x.qa.map(q => `<div class="di-q">${q.who === '말씀 묵상' ? '📖 ' : ''}${esc(q.q)}</div><div class="di-a">${esc(q.a)}</div>`).join('')}
          ${x.mission ? `<div class="di-m">미션 · ${esc(x.mission)}</div>` : ''}
        </article>`).join('') : `<p class="empty">아직 적은 묵상이 없어요.</p>`}`;
    root.querySelector('.back').onclick = home;
    const img = root.querySelector('#ex-img');
    if (img) img.onclick = async () => {
      img.disabled = true; img.textContent = '노트를 그리는 중…';
      const ps = await Note.pages();
      img.disabled = false; img.textContent = '🖼 노트 이미지로 저장';
      noteSheet(ps);
    };
    const cp = root.querySelector('#ex-copy');
    if (cp) cp.onclick = async () => Player.toast((await Note.copy()) ? '복사했어요. 메모장이나 카톡에 붙여 넣어 보세요' : '복사가 안 되는 브라우저예요. 파일로 저장해 주세요');
    const tx = root.querySelector('#ex-txt');
    if (tx) tx.onclick = () => {
      const a = document.createElement('a');
      a.href = Note.txtUrl(); a.download = `묵상노트-${Core.data.nickname || '나'}.txt`;
      document.body.appendChild(a); a.click(); a.remove();
      if (Core.isKakao) Player.toast('카톡 안에서는 파일 저장이 안 될 수 있어요. 글로 복사를 써 주세요');
    };
    bindTestReset(root);
  }

  // 노트 이미지 보기·공유·저장
  function noteSheet(ps) {
    const sheet = document.createElement('div');
    sheet.className = 'sheet-back';
    const urls = ps.map(p => p.cv.toDataURL('image/png'));
    sheet.innerHTML = `<div class="sheet save">
      <div class="sheet-title">나의 묵상 노트 · ${ps.length}장</div>
      <div class="sheet-note">${Core.isIOS ? "이미지를 <b>길게 눌러</b> '사진 앱에 저장'을 고르세요." : '이미지를 <b>길게 눌러</b> 저장하세요.'}</div>
      ${urls.map((u, i) => `<img src="${u}" alt="${esc(ps[i].chap.label)} 묵상 노트" class="note-img">`).join('')}
      <button class="btn" id="ns-share">한꺼번에 공유</button>
      <button class="btn ghost" id="ns-close">닫기</button>
    </div>`;
    document.body.appendChild(sheet);
    sheet.querySelector('#ns-close').onclick = () => sheet.remove();
    sheet.onclick = ev => { if (ev.target === sheet) sheet.remove(); };
    sheet.querySelector('#ns-share').onclick = async () => {
      const files = await Promise.all(ps.map(async (p, i) => new File([await Card.toBlob(p.cv)], `묵상노트-${i + 1}.png`, { type: 'image/png' })));
      if (navigator.canShare && navigator.canShare({ files })) {
        try { await navigator.share({ files }); } catch (e) { /* 취소 */ }
      } else Player.toast('여기서는 바로 공유가 안 돼요. 이미지를 길게 눌러 저장해 주세요');
    };
  }

  /* ---------- 엔딩: 27일의 기록 ---------- */
  function finale() {
    const D = Core.data;
    const root = show('finale', 'page finale');
    Sound.music('silent');
    const list = Core.mainEpisodes();
    const n = o => Object.keys(o || {}).length;
    const stats = [
      ['⭐', '별빛', `${Core.starCount()}/${Core.starTotal()}`],
      ['✅', '미션 완료', Fame.missionYes()],
      ['🤍', '정직한 답', Object.values(D.missionAns || {}).filter(v => v === 'no').length],
      ['📔', '일기', Object.values(D.diary || {}).filter(x => x && x.a).length],
      ['📖', '말씀 묵상', Object.values(D.medi || {}).filter(m => m.a.some(Boolean)).length],
      ['✦', '빛 조각', Object.values(D.gems || {}).reduce((a, g) => a + g.length, 0)],
      ['🪔', '등불 기름', D.oil || 0],
      ['🏅', '배지', `${n(D.badges)}/${Fame.BADGES.length}`]
    ];
    const marked = [];
    for (const e of list) for (const r of Bible.marks(e.id)) { const v = Bible.verses(r)[0]; if (v) marked.push(v); }
    const picks = marked.length ? [0, Math.floor(marked.length / 3), Math.floor(marked.length * 2 / 3), marked.length - 1].filter((x, i, a) => a.indexOf(x) === i).map(i => marked[i]) : [Bible.verses('눅 2:14')[0]];
    const letters = (window.LETTERS || []).map(l => ({ ...l, text: Script.fill(l.text, '') }));
    const tiles = list.map((e, i) => {
      const ch = CHAPTERS.find(c => c.n === e.ch);
      const got = !!D.done[e.id];
      return `<div class="fin-tile tone-${ch.tone}${got ? ' got' : ''}" style="--d:${i * 70}ms"><span>${got ? (e.card ? e.card.emoji : '⭐') : '·'}</span><small>${i + 1}</small></div>`;
    }).join('') + (window.CODES || []).map(c => `<div class="fin-tile hidden-t${D.codes && D.codes[c.n] ? ' got' : ''}" style="--d:${(27 + c.n) * 70}ms"><span>${D.codes && D.codes[c.n] ? '🕯️' : '·'}</span><small>H${c.n}</small></div>`).join('');
    root.innerHTML = `
      <section class="fin-hero reveal">
        <div class="fin-star">${Art.bigStar(Math.max(0.3, Core.starCount() / Core.starTotal()), 230)}</div>
        <h1>그 밤을 향하여</h1>
        <p class="fin-sub">${esc(D.nickname || '친구')}의 스물일곱 날</p>
        <p class="fin-scroll">아래로 천천히 내려 봐 ↓</p>
      </section>
      <section class="reveal"><h2>모은 카드</h2><div class="fin-grid">${tiles}</div></section>
      <section class="reveal"><h2>4주의 기록</h2><div class="fin-stats">${stats.map(s => `<div><span>${s[0]}</span><b>${esc(String(s[2]))}</b><small>${s[1]}</small></div>`).join('')}</div></section>
      <section class="reveal"><h2>네가 붙든 말씀</h2>${picks.map(v => `<blockquote class="vq">${esc(v.text)}<cite>${esc(v.label)}</cite></blockquote>`).join('')}</section>
      ${letters.length ? `<section class="reveal"><h2>그들이 남긴 편지</h2>${letters.map(l => `
        <div class="fin-letter">
          <div class="fin-lt-head"><span class="fin-pt">${Art.portrait(l.who, '웃음')}</span><b>${esc(l.who === '할아버지' ? '할아버지 목자' : l.who)}</b></div>
          <div class="fin-lt-body">${esc(l.text)}</div>
          <div class="fin-from">${esc(l.from)}</div>
        </div>`).join('')}</section>` : ''}
      <section class="reveal fin-credits">
        <h2>함께한 사람들</h2>
        <p><b>사가랴 · 엘리사벳 · 요셉 · 마리아</b><br>할아버지 목자와 들판의 목자들<br>그리고 등불을 든 <b>${esc(D.nickname || '너')}</b></p>
        <p>2026 연동교회 고등부 대림절</p>
        <p class="fin-small">성경 본문: 성경전서 개역개정판 © 대한성서공회<br>음악: 곧 오소서 임마누엘 · 기쁘다 구주 오셨네 · 고요한 밤 거룩한 밤 (옛 찬송 선율)</p>
        <p class="fin-last">"목자들은 자기들에게 이르던 바와 같이<br>듣고 본 그 모든 것으로 인하여<br>하나님께 영광을 돌리고 찬송하며 돌아가니라"<br><small>누가복음 2:20</small></p>
      </section>
      <section class="reveal fin-end">
        <button class="btn big" id="fin-card">🌟 완주 카드 만들기</button>
        <button class="link-btn" id="fin-home">홈으로</button>
      </section>`;
    // 내려가면 하나씩 나타나기
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); if (e.target.querySelector('.fin-grid')) Sound.sfx('star'); io.unobserve(e.target); } }), { threshold: 0.2 });
    root.querySelectorAll('.reveal').forEach(s => io.observe(s));
    root.querySelector('#fin-card').onclick = () => card('FIN');
    root.querySelector('#fin-home').onclick = home;
    setTimeout(() => Sound.sfx('angel'), 400);
  }

  /* ---------- 말씀 모음: 묵상 때 표시한 구절들 ---------- */
  function versePage() {
    const root = show('verses', 'page');
    const groups = Core.mainEpisodes().map(e => ({ e, vs: Bible.marks(e.id).map(r => Bible.verses(r)[0]).filter(Boolean) })).filter(g => g.vs.length);
    const total = groups.reduce((a, g) => a + g.vs.length, 0);
    root.innerHTML = `
      ${testBanner()}
      <div class="page-head"><button class="back">←</button><h1>📖 말씀 모음</h1><span class="head-count">${total}절</span></div>
      <p class="page-note">말씀 묵상에서 마음에 남아 표시한 구절들이에요. 표시를 바꾸려면 그 편을 다시 보기 하면 돼요.</p>
      ${total ? `<button class="btn ghost" id="vcopy">📋 모두 복사</button>` : ''}
      ${groups.length ? groups.map(g => {
        const ch = CHAPTERS.find(c => c.n === g.e.ch);
        return `<section class="vgroup tone-${ch.tone}">
          <div class="di-meta">${esc(ch.label)} · ${esc(Core.dateLabel(g.e.date))} · ${esc(g.e.title)}</div>
          ${g.vs.map(v => `<blockquote class="vq">${esc(v.text)}<cite>${esc(v.label)}</cite></blockquote>`).join('')}
        </section>`;
      }).join('') : `<p class="empty">아직 표시한 구절이 없어요.<br>매일 끝의 말씀 묵상에서 구절을 눌러 보세요.</p>`}`;
    root.querySelector('.back').onclick = home;
    const c = root.querySelector('#vcopy');
    if (c) c.onclick = async () => {
      const t = groups.map(g => `[${g.e.title}]\n` + g.vs.map(v => `"${v.text}" (${v.label})`).join('\n')).join('\n\n') + '\n\n성경전서 개역개정판 © 대한성서공회';
      try { await navigator.clipboard.writeText(t); Player.toast('복사했어요'); } catch (e) { Player.toast('복사가 안 되는 브라우저예요'); }
    };
    bindTestReset(root);
  }

  /* ---------- 카드 도감 ---------- */
  function cards() {
    const D = Core.data;
    const root = show('cards', 'page');
    const list = Core.mainEpisodes();
    const got = list.filter(e => D.done[e.id]).length;
    root.innerHTML = `
      ${testBanner()}
      <div class="page-head"><button class="back">←</button><h1>🃏 카드 도감</h1><span class="head-count">${got} / ${list.length}</span></div>
      <p class="page-note">한 편을 끝낼 때마다 카드 한 장. 그날 편을 그날 끝내면 <b>'그날 완료'</b> 리본이 붙어요.</p>
      <div class="dex">${list.map(e => {
        const ch = CHAPTERS.find(c => c.n === e.ch);
        const no = Card.cardNo(e.id);
        if (!D.done[e.id]) return `<div class="dx locked tone-${ch.tone}"><div class="dx-no">No.${no}</div><div class="dx-q">?</div><div class="dx-t">${esc(Core.dateLabel(e.date))}</div></div>`;
        const art = e.card && e.card.scene ? Art.render(e.card.scene) : `<div class="dx-emoji">${e.card ? e.card.emoji : '⭐'}</div>`;
        return `<button class="dx tone-${ch.tone}${Fame.onTime(e) ? ' ontime' : ''}" data-id="${e.id}">
          <div class="dx-no">No.${no}</div>
          <div class="dx-art">${art}<span class="dx-badge">${e.card ? e.card.emoji : ''}</span></div>
          <div class="dx-t">${esc(e.title)}</div>
        </button>`;
      }).join('')}</div>
      <h2 class="sec">🕯️ 대림초 히든 카드 <small>${Object.keys(D.codes || {}).length} / 4</small></h2>
      <p class="page-note">주일 예배 때 듣는 암호를 🔑 주일 암호에 넣으면 열려요.</p>
      <div class="dex">${(window.CODES || []).map(c => D.codes && D.codes[c.n]
        ? `<button class="dx hidden-card" data-id="H${c.n}"><div class="dx-no">HIDDEN ${c.n}</div><div class="dx-art"><div class="dx-emoji">${'🕯️'.repeat(c.n)}</div></div><div class="dx-t">${esc(c.title)}</div></button>`
        : `<div class="dx locked"><div class="dx-no">HIDDEN ${c.n}</div><div class="dx-q">🔑</div><div class="dx-t">${esc(Core.dateLabel(c.from))} 주일</div></div>`).join('')}</div>`;
    root.querySelector('.back').onclick = home;
    root.querySelectorAll('button.dx').forEach(b => b.onclick = () => card(b.dataset.id));
    bindTestReset(root);
  }

  /* ---------- 주일 암호 ---------- */
  function codePage() {
    const D = Core.data;
    const root = show('codes', 'page');
    const today = Core.nowKST().date;
    root.innerHTML = `
      ${testBanner()}
      <div class="page-head"><button class="back">←</button><h1>🔑 주일 암호</h1></div>
      <p class="page-note">주일 예배 때 전도사님이 알려 주는 암호를 넣으면, 그 주의 대림초가 켜진 <b>히든 카드</b>가 열려요.</p>
      <div class="candles">${(window.CODES || []).map(c => `
        <div class="cd${D.codes && D.codes[c.n] ? ' lit' : ''}${c.n === 3 ? ' pink' : ''}">
          <i></i><b>${c.n}주</b><small>${esc(Core.dateLabel(c.from))}</small>
        </div>`).join('')}
      </div>
      <input class="code-in" maxlength="20" placeholder="암호를 넣어 줘" autocomplete="off">
      <button class="btn big" id="try">확인</button>
      <p class="code-msg"></p>`;
    root.querySelector('.back').onclick = home;
    const inp = root.querySelector('.code-in'), msg = root.querySelector('.code-msg');
    const go2 = () => {
      const w = inp.value.trim();
      if (!w) return;
      const r = Fame.tryCode(w);
      if (r.ok) {
        Sound.sfx('badge');
        Fame.checkNew();
        Player.toast(r.isNew ? `${r.code.n}주 히든 카드를 찾았어!` : '이미 찾은 카드예요');
        setTimeout(() => card('H' + r.code.n), 600);
      } else {
        Sound.sfx('boop');
        inp.classList.remove('shake'); void inp.offsetWidth; inp.classList.add('shake');
        msg.textContent = r.early ? `이 암호는 ${Core.dateLabel(r.early.from)} 주일부터 쓸 수 있어요.` : '암호가 달라요. 예배 때 들은 말을 다시 떠올려 봐.';
      }
    };
    root.querySelector('#try').onclick = go2;
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') go2(); });
    bindTestReset(root);
  }

  /* ---------- 나의 기록 (미션 기록 · 배지 탭) ---------- */
  let fameTab = 'mission';
  function fame() {
    const D = Core.data;
    Fame.checkNew();
    const root = show('fame', 'page');
    const list = Core.mainEpisodes();
    const s = Fame.streaks();
    const mYes = Fame.missionYes();
    const mGiven = list.filter(e => D.mission[e.id]).length;
    const ST = { yes: ['✅', '했어'], no: ['🤍', '못 했어 (정직)'], wait: ['⏳', '다음 편에서 확인'], none: ['', ''] };
    root.innerHTML = `
      ${testBanner()}
      <div class="page-head"><button class="back">←</button><h1>📜 나의 기록</h1></div>
      <div class="fame-stats">
        <div><b>${Core.starCount()}</b><span>별빛</span></div>
        <div><b>${mYes}<small>/${mGiven}</small></b><span>미션 완료</span></div>
        <div><b>${s.best}</b><span>최고 연속</span></div>
        <div><b>${D.oil || 0}</b><span>등불 기름</span></div>
      </div>
      <div class="tabs">
        <button class="tab${fameTab === 'mission' ? ' on' : ''}" data-tab="mission">미션 기록 <small>${mYes}/${mGiven}</small></button>
        <button class="tab${fameTab === 'badge' ? ' on' : ''}" data-tab="badge">배지 <small>${Object.keys(D.badges || {}).length}/${Fame.BADGES.length}</small></button>
      </div>
      <section class="tabpane" data-pane="badge" ${fameTab === 'badge' ? '' : 'hidden'}>
      <div class="badges">${Fame.BADGES.map(b => {
        const has = D.badges && D.badges[b.id];
        return `<div class="bd${has ? ' has' : ''}"><span>${has ? b.icon : '🔒'}</span><b>${esc(b.name)}</b><small>${esc(b.desc)}</small></div>`;
      }).join('')}</div>
      </section>
      <section class="tabpane" data-pane="mission" ${fameTab === 'mission' ? '' : 'hidden'}>
      <div class="mlog">${list.map(e => {
        const st = Fame.missionStatus(e);
        if (st === 'none' && !D.done[e.id]) return `<div class="ml off"><span class="ml-d">${esc(Core.dateLabel(e.date))}</span><span class="ml-t">${Core.isOpen(e) ? '아직 안 했어요' : '🔒'}</span></div>`;
        return `<div class="ml ${st}"><span class="ml-d">${esc(Core.dateLabel(e.date))}${Fame.onTime(e) ? '<em>그날</em>' : ''}</span>
          <span class="ml-t">${esc(D.mission[e.id] || '미션 없음')}</span>
          <span class="ml-s">${ST[st][0]}<small>${ST[st][1]}</small></span></div>`;
      }).join('')}</div>
      <p class="page-note">미션 결과는 다음 편을 열 때 정직하게 답한 대로 기록돼요. 못 했다고 답해도 기름은 똑같이 받아요.</p>
      </section>`;
    root.querySelector('.back').onclick = home;
    root.querySelectorAll('.tab').forEach(t => t.onclick = () => {
      fameTab = t.dataset.tab;
      root.querySelectorAll('.tab').forEach(x => x.classList.toggle('on', x === t));
      root.querySelectorAll('.tabpane').forEach(p => { p.hidden = p.dataset.pane !== fameTab; });
      Sound.sfx('select');
    });
    bindTestReset(root);
  }

  /* ---------- 설정 ---------- */
  function settings() {
    const D = Core.data;
    const root = show('settings', 'page');
    root.innerHTML = `
      ${testBanner()}
      <div class="page-head"><button class="back">←</button><h1>⚙️ 설정</h1></div>
      <label class="lbl">닉네임</label><input class="in-nick" maxlength="10" value="${esc(D.nickname)}">
      <label class="lbl">반 (선택)</label><input class="in-ban" maxlength="12" value="${esc(D.ban)}">
      <button class="btn" id="save">저장</button>
      <hr>
      <h2 class="sec">👀 보기 편하게</h2>
      <div class="seg-label">글자 크기</div>
      <div class="seg" data-k="textSize">${[['m', '보통'], ['l', '크게'], ['xl', '아주 크게']].map(([v, t]) => `<button data-v="${v}" class="${(D.textSize || 'm') === v ? 'on' : ''}">${t}</button>`).join('')}</div>
      <div class="seg-label">글자 나오는 속도</div>
      <div class="seg" data-k="textSpeed">${[['slow', '천천히'], ['mid', '보통'], ['fast', '빠르게']].map(([v, t]) => `<button data-v="${v}" class="${(D.textSpeed || 'mid') === v ? 'on' : ''}">${t}</button>`).join('')}</div>
      <div class="seg-label">화면 움직임 (카메라·떠다니는 빛)</div>
      <div class="seg" data-k="motion">${[['on', '켜기'], ['off', '끄기']].map(([v, t]) => `<button data-v="${v}" class="${(D.motion === false ? 'off' : 'on') === v ? 'on' : ''}">${t}</button>`).join('')}</div>
      <hr>
      <h2 class="sec">📦 기록 백업</h2>
      <p class="page-note">기록은 이 브라우저에만 있어요. 폰을 바꾸거나, 카톡 캐시를 지우거나, '홈 화면에 추가'로 옮기면 처음부터 시작돼요.<br><b>백업 코드</b>를 만들어 카톡 나와의 채팅에 보내 두면, 언제든 그대로 되살릴 수 있어요.${D.lastBackup ? `<br>마지막 백업: ${new Date(D.lastBackup).toLocaleDateString('ko-KR')}` : ''}</p>
      <button class="btn" id="bk-make">백업 코드 만들기</button>
      <div class="bk-out" hidden>
        <textarea class="bk-code" rows="4" readonly></textarea>
        <div class="row"><button class="btn ghost" id="bk-copy">📋 복사</button><button class="btn ghost" id="bk-file">💾 파일로</button></div>
        <p class="page-note">복사한 코드를 카톡 '나와의 채팅'에 붙여 넣어 두세요.</p>
      </div>
      <button class="btn ghost" id="bk-load">백업 불러오기</button>
      <div class="bk-in" hidden>
        <textarea class="bk-paste" rows="4" placeholder="'그밤백업1'로 시작하는 코드를 붙여 넣어 줘"></textarea>
        <div class="row"><label class="btn ghost bk-filebtn">📂 파일 고르기<input type="file" accept=".txt,text/plain" hidden></label><button class="btn" id="bk-apply">이 기록으로 바꾸기</button></div>
      </div>
      <hr>
      <button class="btn danger ghost" id="wipe">모든 기록 지우기</button>`;
    root.querySelector('.back').onclick = home;
    root.querySelector('#save').onclick = () => {
      const n = root.querySelector('.in-nick').value.trim();
      if (!n) return Player.toast('닉네임을 적어 줘');
      D.nickname = n; D.ban = root.querySelector('.in-ban').value.trim();
      Core.save(); Player.toast('저장했어요');
    };
    root.querySelectorAll('.seg').forEach(seg => seg.querySelectorAll('button').forEach(b => b.onclick = () => {
      const k = seg.dataset.k, v = b.dataset.v;
      D[k] = k === 'motion' ? v === 'on' : v;
      Core.save(); applyPrefs();
      seg.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
      Sound.sfx('select');
    }));
    // 백업 만들기
    let code = '';
    root.querySelector('#bk-make').onclick = async () => {
      code = await Backup.make();
      root.querySelector('.bk-out').hidden = false;
      root.querySelector('.bk-code').value = code;
      Player.toast('백업 코드를 만들었어요');
    };
    root.querySelector('#bk-copy').onclick = async () => {
      const ta = root.querySelector('.bk-code');
      try { await navigator.clipboard.writeText(code); Player.toast('복사했어요. 카톡 나와의 채팅에 붙여 넣어 두세요'); }
      catch (e) { ta.focus(); ta.select(); Player.toast('코드를 길게 눌러 전체 선택 → 복사해 주세요'); }
    };
    root.querySelector('#bk-file').onclick = () => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([code], { type: 'text/plain' }));
      a.download = `그밤-백업-${D.nickname || '나'}.txt`;
      document.body.appendChild(a); a.click(); a.remove();
    };
    // 불러오기
    root.querySelector('#bk-load').onclick = () => { root.querySelector('.bk-in').hidden = false; };
    root.querySelector('.bk-filebtn input').onchange = async e => {
      const f = e.target.files[0]; if (f) root.querySelector('.bk-paste').value = await f.text();
    };
    root.querySelector('#bk-apply').onclick = async () => {
      try {
        const obj = await Backup.read(root.querySelector('.bk-paste').value);
        if (!confirm(`이 백업으로 바꿀까요?\n${Backup.summary(obj)}\n\n지금 이 브라우저의 기록은 백업 내용으로 바뀌어요.`)) return;
        Core.replace(obj); Player.toast('기록을 되살렸어요'); home();
      } catch (err) { Player.toast(err.message || '코드를 읽을 수 없어요'); }
    };
    root.querySelector('#wipe').onclick = () => {
      if (confirm('일기, 별빛, 기름까지 모두 지워져요. 정말 지울까요?') && confirm('되돌릴 수 없어요. 지울까요?')) {
        Core.reset(); home();
      }
    };
    bindTestReset(root);
  }

  /* ---------- 인증 카드 ---------- */
  async function card(epId) {
    const D = Core.data;
    const root = show('cardview', 'page');
    const isH = /^H\d$/.test(epId), isF = epId === 'FIN';
    const hasDiary = !isH && !isF && !!(D.diary[epId] && D.diary[epId].a);
    const hasMission = !isH && !isF && !!D.mission[epId];
    const opt = { withDiary: false, missionDone: !!D.missionDone[epId] };
    root.innerHTML = `
      <div class="page-head"><button class="back">←</button><h1>${isF ? '🌟 완주 카드' : isH ? '🕯️ 히든 카드 ' + epId[1] : '카드 No.' + Card.cardNo(epId)}</h1></div>
      <div class="card-preview"><div class="loading">그리는 중…</div></div>
      <div class="card-opts">
        ${hasDiary ? `<label class="tg"><input type="checkbox" id="o-diary"> 내 묵상 한 줄 넣기</label>` : ''}
        ${hasMission ? `<label class="tg"><input type="checkbox" id="o-mission" ${opt.missionDone ? 'checked' : ''}> 미션 완료로 표시</label>` : ''}
      </div>
      <button class="btn big" id="share">카톡으로 공유</button>
      <button class="btn ghost" id="save">이미지 저장</button>
      <button class="link-btn" id="home">홈으로</button>`;
    root.querySelector('.back').onclick = cards;
    root.querySelector('#home').onclick = home;
    let cv;
    const redraw = async () => {
      cv = isF ? await Card.drawFinale() : isH ? await Card.drawHidden(+epId[1]) : await Card.draw(epId, opt);
      const box = root.querySelector('.card-preview');
      box.innerHTML = '';
      const img = new Image();
      img.src = cv.toDataURL('image/png');
      img.alt = '인증 카드';
      box.appendChild(img);
    };
    const od = root.querySelector('#o-diary');
    if (od) od.onchange = () => { opt.withDiary = od.checked; redraw(); };
    const om = root.querySelector('#o-mission');
    if (om) om.onchange = () => {
      opt.missionDone = om.checked;
      D.missionDone[epId] = om.checked;
      Core.save();
      redraw();
    };
    await redraw();
    root.querySelector('#share').onclick = async () => {
      const r = await Card.share(cv, epId);
      if (r === 'fallback') saveSheet(cv, epId, true);
    };
    root.querySelector('#save').onclick = () => saveSheet(cv, epId, false);
  }

  // 공유가 안 되는 곳(카톡 인앱 등)과 저장 버튼: 이미지를 크게 띄워 길게 눌러 저장하게 한다
  function saveSheet(cv, epId, fromShare) {
    const url = cv.toDataURL('image/png');
    const sheet = document.createElement('div');
    sheet.className = 'sheet-back';
    const how = Core.isIOS ? "이미지를 <b>길게 눌러</b> '사진 앱에 저장'을 고르세요." : '이미지를 <b>길게 눌러</b> 저장하거나, 아래 버튼을 눌러 주세요.';
    sheet.innerHTML = `<div class="sheet save">
      ${fromShare ? `<div class="sheet-note">${Core.isKakao ? '카톡 안에서는 바로 공유가 안 돼요.' : '이 브라우저에서는 바로 공유가 안 돼요.'} 저장한 뒤 반 단톡방에 올려 주세요.</div>` : ''}
      <img src="${url}" alt="인증 카드">
      <div class="sheet-note">${how}</div>
      ${Core.isKakao ? '' : `<a class="btn" download="그밤-${epId}.png" href="${url}">파일로 내려받기</a>`}
      <button class="btn ghost">닫기</button>
    </div>`;
    document.body.appendChild(sheet);
    sheet.querySelector('button').onclick = () => sheet.remove();
    sheet.onclick = ev => { if (ev.target === sheet) sheet.remove(); };
  }

  // 오프라인 지원(배포 주소에서만)
  if ('serviceWorker' in navigator && /github\.io$/.test(location.hostname)) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }

  window.App = { home, card, diary, go, cards, fame, codePage, versePage, finale };
  home();
})();
