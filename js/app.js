/* 화면 전환: 홈 · 일기장 · 설정 · 인증 카드 */
(function () {
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const app = document.getElementById('app');

  function show(id, cls) {
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
        ${started ? `<div class="row"><button class="btn ghost" id="diary">📔 일기장</button><button class="btn ghost" id="settings">⚙️ 설정</button></div>` : ''}
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
      <div class="page-head"><button class="back">←</button><h1>인증 카드</h1></div>
      <div class="card-preview"><div class="loading">그리는 중…</div></div>
      <div class="card-opts">
        ${hasDiary ? `<label class="tg"><input type="checkbox" id="o-diary"> 내 묵상 한 줄 넣기</label>` : ''}
        ${hasMission ? `<label class="tg"><input type="checkbox" id="o-mission" ${opt.missionDone ? 'checked' : ''}> 미션 완료로 표시</label>` : ''}
      </div>
      <button class="btn big" id="share">카톡으로 공유</button>
      <button class="btn ghost" id="save">이미지 저장</button>
      <button class="btn ghost" id="home">홈으로</button>`;
    root.querySelector('.back').onclick = home;
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

  window.App = { home, card, diary, go };
  home();
})();
