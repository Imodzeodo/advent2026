/* 화면 전환: 홈 · 일기장 · 설정 · 인증 카드 */
(function () {
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const app = document.getElementById('app');

  function show(id, cls) {
    if (id !== 'play') Sound.music('night');
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
      ${!started ? `<button class="btn big start" id="start">시작하기</button>` : ''}
      ${list}
      <footer class="home-foot">
        ${started ? `<div class="menu">
          <button class="btn ghost" id="cards">🃏 카드 도감 <small>${Core.starCount()}/${Core.starTotal()}</small></button>
          <button class="btn ghost" id="fame">📜 나의 기록</button>
          <button class="btn ghost" id="diary">📔 일기장</button>
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
    root.querySelector('#snd').onclick = e => { Sound.setOn(!Sound.on); e.currentTarget.textContent = Sound.on ? '🔊' : '🔇'; };
    bindTestReset(root);
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
    const D = Core.data;
    const root = show('diary', 'page');
    const items = EPISODES.filter(e => D.diary[e.id] && D.diary[e.id].a);
    root.innerHTML = `
      ${testBanner()}
      <div class="page-head"><button class="back">←</button><h1>📔 일기장</h1></div>
      <p class="page-note">이 폰에만 저장돼 있어요. 아무도 볼 수 없어요.</p>
      ${items.length ? items.map(e => {
        const ch = CHAPTERS.find(c => c.n === e.ch);
        return `<article class="diary-item tone-${ch.tone}">
          <div class="di-meta">${esc(ch.label)} · ${esc(e.day)} · ${esc(e.title)}</div>
          <div class="di-q">${esc(D.diary[e.id].q)}</div>
          <div class="di-a">${esc(D.diary[e.id].a)}</div>
        </article>`;
      }).join('') : `<p class="empty">아직 적은 일기가 없어요.</p>`}`;
    root.querySelector('.back').onclick = home;
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
      }).join('')}</div>`;
    root.querySelector('.back').onclick = home;
    root.querySelectorAll('button.dx').forEach(b => b.onclick = () => card(b.dataset.id));
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
      <p class="page-note">기록은 이 브라우저에만 있어요. 다른 브라우저나 다른 폰에서 열면 처음부터 시작돼요.</p>
      <button class="btn danger ghost" id="wipe">모든 기록 지우기</button>`;
    root.querySelector('.back').onclick = home;
    root.querySelector('#save').onclick = () => {
      const n = root.querySelector('.in-nick').value.trim();
      if (!n) return Player.toast('닉네임을 적어 줘');
      D.nickname = n; D.ban = root.querySelector('.in-ban').value.trim();
      Core.save(); Player.toast('저장했어요');
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
    const hasDiary = !!(D.diary[epId] && D.diary[epId].a);
    const hasMission = !!D.mission[epId];
    const opt = { withDiary: false, missionDone: !!D.missionDone[epId] };
    root.innerHTML = `
      <div class="page-head"><button class="back">←</button><h1>카드 No.${Card.cardNo(epId)}</h1></div>
      <div class="card-preview"><div class="loading">그리는 중…</div></div>
      <div class="card-opts">
        ${hasDiary ? `<label class="tg"><input type="checkbox" id="o-diary"> 내 묵상 한 줄 넣기</label>` : ''}
        ${hasMission ? `<label class="tg"><input type="checkbox" id="o-mission" ${opt.missionDone ? 'checked' : ''}> 미션 완료로 표시</label>` : ''}
      </div>
      <button class="btn big" id="share">카톡으로 공유</button>
      <button class="btn ghost" id="save">이미지 저장</button>
      <button class="btn ghost" id="home">홈으로</button>`;
    root.querySelector('.back').onclick = cards;
    root.querySelector('#home').onclick = home;
    let cv;
    const redraw = async () => {
      cv = await Card.draw(epId, opt);
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

  window.App = { home, card, diary, go, cards, fame };
  home();
})();
