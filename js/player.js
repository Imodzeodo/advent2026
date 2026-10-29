/* 에피소드 재생기: 장면 + 대사창 + 카드들 */
(function () {
  const NAME_COLOR = {
    '사가랴': '#c9952f', '엘리사벳': '#b86d8e', '이웃': '#6f7ba0', '이웃 아주머니': '#6f7ba0',
    '꼬마': '#4f9a78', '제사장': '#7c86b4', '요셉': '#5d8fb0', '마리아': '#5f7fc9',
    '할아버지': '#8b9a5a'
  };
  const colorOf = who => NAME_COLOR[who] || '#8178a8';
  // 받침에 따라 이/가, 은/는 고르기
  function josa(word, pair) {
    const c = (word || '').charCodeAt((word || '').length - 1);
    const has = c >= 0xAC00 && c <= 0xD7A3 && (c - 0xAC00) % 28 > 0;
    return word + (has ? pair[0] : pair[1]);
  }
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  let el = {}, ep = null, runId = 0;
  let typing = null, tapWait = null;

  function mount(root) {
    root.innerHTML = `
      <div class="stage"><div class="scene-layer"></div><div class="hot-layer"></div></div>
      <button class="exit" aria-label="나가기">✕</button>
      <button class="snd" aria-label="소리">${Sound.on ? '🔊' : '🔇'}</button>
      <div class="oil-pop" hidden></div>
      <div class="overlay" hidden></div>
      <div class="dialog">
        <div class="name"></div>
        <div class="text"></div>
        <div class="actions"></div>
        <div class="next">▼</div>
      </div>
      <div class="titlecard" hidden></div>`;
    el = {
      root,
      stage: root.querySelector('.stage'),
      scene: root.querySelector('.scene-layer'),
      hot: root.querySelector('.hot-layer'),
      overlay: root.querySelector('.overlay'),
      dialog: root.querySelector('.dialog'),
      name: root.querySelector('.name'),
      text: root.querySelector('.text'),
      actions: root.querySelector('.actions'),
      next: root.querySelector('.next'),
      title: root.querySelector('.titlecard'),
      oil: root.querySelector('.oil-pop')
    };
    el.dialog.addEventListener('click', e => { if (!e.target.closest('button')) onTap(); });
    el.stage.addEventListener('click', e => { if (!e.target.closest('[data-hot],.hot-mark')) onTap(); });
    root.querySelector('.exit').addEventListener('click', () => {
      if (confirm('이야기에서 나갈까요? 이번 편은 처음부터 다시 하게 돼요.')) {
        runId++;
        App.home();
      }
    });
    root.querySelector('.snd').addEventListener('click', e => {
      Sound.setOn(!Sound.on);
      e.currentTarget.textContent = Sound.on ? '🔊' : '🔇';
    });
    window.addEventListener('resize', placeHotMarks);
  }

  /* ---------- 탭 진행 ---------- */
  function onTap() {
    if (typing) { typing(); return; }
    if (tapWait) { const r = tapWait; tapWait = null; el.next.classList.remove('on'); Sound.sfx('tap'); r(); }
  }
  function waitTap() {
    el.next.classList.add('on');
    return new Promise(r => { tapWait = r; });
  }
  function typeText(text) {
    return new Promise(res => {
      el.text.textContent = '';
      let i = 0, timer;
      const chars = Array.from(text);
      const finish = () => { clearInterval(timer); el.text.textContent = text; typing = null; res(); };
      typing = finish;
      timer = setInterval(() => {
        i++;
        el.text.textContent = chars.slice(0, i).join('');
        if (i >= chars.length) finish();
      }, 26);
    });
  }
  function setSpeaker(who) {
    el.dialog.classList.toggle('narr', !who);
    el.name.textContent = who || '';
    el.name.style.display = who ? '' : 'none';
    el.name.style.background = colorOf(who);
  }
  async function say(who, text) {
    setSpeaker(who);
    el.actions.innerHTML = '';
    await typeText(Script.fill(text, ep.id));
    await waitTap();
  }
  async function sayLines(lines) {
    for (const l of lines) await say(l.who, l.text);
  }

  /* ---------- 덮는 카드 ---------- */
  function showOverlay(html, cls) {
    el.overlay.className = 'overlay ' + (cls || '');
    el.overlay.innerHTML = html;
    el.overlay.hidden = false;
    void el.overlay.offsetWidth; el.overlay.classList.add('in');
    return el.overlay;
  }
  function hideOverlay() {
    el.overlay.classList.remove('in');
    el.overlay.hidden = true;
    el.overlay.innerHTML = '';
  }
  function cardThenTap(html, cls) {
    return new Promise(res => {
      const ov = showOverlay(html, cls);
      const go = () => { ov.removeEventListener('click', go); hideOverlay(); res(); };
      setTimeout(() => ov.addEventListener('click', go), 350);
    });
  }
  function clearDialog(text) {
    setSpeaker(null);
    el.text.textContent = text || '';
    el.actions.innerHTML = '';
  }

  /* ---------- 장면·살펴보기 ---------- */
  function setScene(name) {
    return new Promise(res => {
      el.scene.classList.add('fade');
      Sound.sfx('page');
      setTimeout(() => {
        el.scene.innerHTML = Art.render(name);
        el.hot.innerHTML = '';
        el.scene.classList.remove('fade');
        setTimeout(res, 350);
      }, 300);
    });
  }
  let hotState = null;
  function placeHotMarks() {
    if (!hotState) return;
    const sr = el.stage.getBoundingClientRect();
    el.hot.querySelectorAll('.hot-mark').forEach(m => {
      const t = el.scene.querySelector(`[data-hot="${CSS.escape(m.dataset.name)}"]`);
      if (!t) { m.style.display = 'none'; return; }
      const r = t.getBoundingClientRect();
      const x = Math.min(sr.width - 50, Math.max(50, r.left - sr.left + r.width / 2));
      const y = Math.min(sr.height - 30, Math.max(30, r.top - sr.top + r.height / 2));
      m.style.left = x + 'px';
      m.style.top = y + 'px';
    });
  }

  async function explore(step, my) {
    const need = step.need || step.spots.length;
    const seen = new Set();
    let busy = false;
    const prompt = () => {
      clearDialog('');
      el.text.innerHTML = `<span class="explore-prompt">${esc(step.prompt)}</span> <span class="count">${seen.size}/${need}</span>`;
      if (seen.size >= need) {
        el.actions.innerHTML = `<button class="btn small">계속 ▶</button>`;
        el.actions.querySelector('button').onclick = finish;
      }
    };
    let finish;
    const done = new Promise(r => { finish = r; });
    el.hot.innerHTML = step.spots.map(s =>
      `<button class="hot-mark" data-name="${esc(s.name)}"><i></i><span>${esc(s.name)}</span></button>`).join('');
    hotState = step;
    placeHotMarks();
    setTimeout(placeHotMarks, 400);

    const tapSpot = async name => {
      if (busy || my !== runId) return;
      const spot = step.spots.find(s => s.name === name);
      if (!spot) return;
      busy = true;
      el.hot.classList.add('busy');
      await sayLines(spot.lines);
      seen.add(name);
      const mark = el.hot.querySelector(`.hot-mark[data-name="${CSS.escape(name)}"]`);
      if (mark) mark.classList.add('seen');
      el.hot.classList.remove('busy');
      busy = false;
      prompt();
    };
    el.hot.querySelectorAll('.hot-mark').forEach(m => m.onclick = e => { e.stopPropagation(); tapSpot(m.dataset.name); });
    const svgHandler = e => {
      const t = e.target.closest('[data-hot]');
      if (t) { e.stopPropagation(); tapSpot(t.getAttribute('data-hot')); }
    };
    el.scene.addEventListener('click', svgHandler);
    el.scene.classList.add('exploring');
    prompt();
    await done;
    el.scene.removeEventListener('click', svgHandler);
    el.scene.classList.remove('exploring');
    el.hot.innerHTML = '';
    hotState = null;
  }

  /* ---------- 단계별 처리 ---------- */
  const run = {
    async title(s) {
      el.title.innerHTML = s.parts.map((p, i) => `<div class="t${i}">${esc(p)}</div>`).join('');
      el.title.hidden = false;
      Sound.sfx('title');
      void el.title.offsetWidth; el.title.classList.add('in');
      await new Promise(res => {
        const t = setTimeout(go, 2600);
        function go() { clearTimeout(t); el.title.removeEventListener('click', go); res(); }
        setTimeout(() => el.title.addEventListener('click', go), 500);
      });
      el.title.classList.remove('in');
      await new Promise(r => setTimeout(r, 450));
      el.title.hidden = true;
    },
    scene: s => setScene(s.name),
    say: s => say(s.who, s.text),
    async fx(s) {
      el.stage.classList.add('fx-' + s.name);
      await new Promise(r => setTimeout(r, 1500));
    },
    async verse(s) {
      clearDialog('');
      Sound.sfx('verse');
      await cardThenTap(`
        <div class="card verse">
          <div class="verse-ref">${esc(s.ref)}</div>
          <div class="verse-text">${esc(s.text)}</div>
          <div class="verse-src">성경전서 개역개정판</div>
          <div class="tap-hint">탭해서 계속</div>
        </div>`, 'center');
    },
    async note(s) {
      clearDialog('');
      Sound.sfx('page');
      await cardThenTap(`
        <div class="card note">
          <div class="note-tag">그때 그곳</div>
          <div class="note-text">${esc(Script.fill(s.text, ep.id))}</div>
          <div class="tap-hint">탭해서 계속</div>
        </div>`, 'center');
    },
    async read(s) {
      clearDialog('');
      await new Promise(res => {
        const ov = showOverlay(`
          <div class="card read">
            <div class="read-icon">📖</div>
            <div class="read-title">성경 펴서 읽기</div>
            <div class="read-ref">${esc(s.ref)}</div>
            <div class="read-help">성경책이나 성경 앱을 열어 읽어 보세요.</div>
            <div class="row"><button class="btn ghost" data-v="later">나중에 읽을게</button><button class="btn" data-v="done">읽었어</button></div>
          </div>`, 'center');
        ov.querySelectorAll('button').forEach(b => b.onclick = () => { hideOverlay(); res(); });
      });
    },
    async choice(s, my) {
      setSpeaker(null);
      await typeText(Script.fill(s.prompt, ep.id));
      el.dialog.classList.add('choosing');
      const pick = await new Promise(res => {
        el.actions.innerHTML = s.options.map((o, i) => `<button class="btn choice" data-i="${i}">${esc(o.label)}</button>`).join('');
        el.actions.querySelectorAll('button').forEach(b => b.onclick = () => res(Number(b.dataset.i)));
      });
      if (my !== runId) return;
      Sound.sfx('select');
      const opt = s.options[pick];
      const D = Core.data;
      D.choice[ep.id] = D.choice[ep.id] || {};
      D.choice[ep.id][s.no] = opt.label;
      Core.save();
      el.actions.innerHTML = '';
      el.dialog.classList.remove('choosing');
      await sayLines(opt.lines);
    },
    async ask(s) {
      clearDialog('');
      const prev = (Core.data.diary[ep.id] && Core.data.diary[ep.id].a) || '';
      const answer = await new Promise(res => {
        const ov = showOverlay(`
          <div class="card ask">
            <div class="ask-who" style="color:${colorOf(ep.host)}">${esc(ep.host || '')}의 질문</div>
            <div class="ask-q">${esc(Script.fill(s.text, ep.id))}</div>
            <textarea maxlength="200" rows="4" placeholder="여기에 적어 줘. 이 폰에만 저장돼."></textarea>
            <div class="row">
              <button class="btn ghost" data-v="skip">${esc(s.skip)}</button>
              <button class="btn" data-v="ok">일기에 적기</button>
            </div>
          </div>`, 'center input');
        const ta = ov.querySelector('textarea');
        ta.value = prev;
        const ok = ov.querySelector('[data-v=ok]');
        const sync = () => { ok.disabled = !ta.value.trim(); };
        ta.addEventListener('input', sync); sync();
        ok.onclick = () => res(ta.value.trim());
        ov.querySelector('[data-v=skip]').onclick = () => res('');
      });
      hideOverlay();
      Core.data.diary[ep.id] = { q: Script.fill(s.text, ep.id), a: answer };
      Core.save();
      if (answer) toast('일기장에 적었어요');
    },
    async mission(s) {
      clearDialog('');
      Core.data.mission[ep.id] = s.text;
      Core.save();
      Sound.sfx('mission');
      await new Promise(res => {
        const ov = showOverlay(`
          <div class="card mission">
            <div class="mission-tag">오늘의 미션</div>
            <div class="mission-text">${esc(Script.fill(s.text, ep.id))}</div>
            <div class="mission-help">다음 편을 열면 ${esc(josa(ep.host || '', '이가'))} 했는지 물어볼 거야.<br>했든 못 했든, 정직하게만 답하면 등불 기름을 받아.</div>
            <button class="btn">미션 받기</button>
          </div>`, 'center');
        ov.querySelector('button').onclick = () => { hideOverlay(); res(); };
      });
    },
    async game(s, my) {
      clearDialog('');
      const fn = Games[s.name];
      if (!fn) return;
      const box = showOverlay(`<div class="gamebox"></div>`, 'game').querySelector('.gamebox');
      await new Promise(res => {
        fn(box, {
          done: res,
          say: async (who, text) => { await say(who, text); if (my === runId) clearDialog(''); }
        });
      });
      hideOverlay();
    },
    async nickname() {
      clearDialog('');
      const D = Core.data;
      await new Promise(res => {
        const ov = showOverlay(`
          <div class="card ask">
            <div class="ask-q">너를 뭐라고 부르면 될까?</div>
            <label class="lbl">닉네임 <small>(인증 카드에 들어가요)</small></label>
            <input class="in-nick" maxlength="10" placeholder="예: 별빛" value="${esc(D.nickname)}">
            <label class="lbl">반 <small>(선택)</small></label>
            <input class="in-ban" maxlength="12" placeholder="예: 2학년 3반" value="${esc(D.ban)}">
            <button class="btn" disabled>이 이름으로 시작</button>
          </div>`, 'center input');
        const nick = ov.querySelector('.in-nick'), ban = ov.querySelector('.in-ban'), btn = ov.querySelector('button');
        const sync = () => { btn.disabled = !nick.value.trim(); };
        nick.addEventListener('input', sync); sync();
        btn.onclick = () => {
          D.nickname = nick.value.trim();
          D.ban = ban.value.trim();
          Core.save();
          hideOverlay(); res();
        };
      });
    },
    async rules() {
      clearDialog('');
      await new Promise(res => {
        const ov = showOverlay(`
          <div class="card rules">
            <div class="rules-title">이렇게 진행돼</div>
            <ul>
              <li><b>하루 한 편</b>, 3분이면 끝나. 한국 시간 자정에 새 편이 열려. 주일 편은 예배 후 <b>오후 1시</b>에.</li>
              <li>놓친 날은 <b>언제든 따라잡을 수</b> 있어. 앞날 이야기는 그날이 되어야 열려.</li>
              <li>인물이 묻는 말에 답하면 <b>일기장</b>에 남아. 다음 날 그 사람이 기억하고 있을 거야.</li>
              <li>매일 끝나면 <b>오늘의 미션</b>. 다음 날 정직하게 답하면 <b>등불 기름</b>을 받아.</li>
              <li>한 편 끝낼 때마다 <b>별이 조금씩</b> 밝아져.</li>
            </ul>
            <div class="rules-warn">⚠️ 기록은 <b>지금 이 브라우저</b>에만 저장돼. 카톡에서 열었으면 앞으로도 카톡에서, 사파리·크롬에서 열었으면 거기서 계속해 줘. 아무도(선생님도) 네 일기를 볼 수 없어.</div>
            <button class="btn">알겠어</button>
          </div>`, 'center');
        ov.querySelector('button').onclick = () => { hideOverlay(); res(); };
      });
    }
  };

  /* ---------- 말씀 묵상 (편 끝) ---------- */
  run.meditate = async function () {
    const list = Bible.verses(ep.read);
    if (!list.length) return;
    clearDialog('');
    Sound.sfx('verse');
    const D = Core.data;
    const refLabel = ep.read.replace(/(\S+?)\s(\d+:)/g, (m, b, c) => (Bible.BOOK[b] || b) + ' ' + c);
    let picked = D.verse && D.verse[ep.id] || null;
    const choice = await new Promise(res => {
      const ov = showOverlay(`
        <div class="card medi">
          <div class="medi-tag">말씀 묵상</div>
          <div class="medi-ref">${esc(refLabel)}</div>
          <div class="medi-help">천천히 읽어 봐. 그리고 마음에 남는 구절을 <b>하나</b> 눌러 줘.</div>
          <div class="medi-list">${list.map(v => `
            ${v.heading ? `<div class="mh">${esc(v.heading)}</div>` : ''}
            <button class="mv${v.ref === picked ? ' on' : ''}" data-ref="${esc(v.ref)}"><sup>${v.v}</sup>${esc(v.text)}</button>`).join('')}
          </div>
          <div class="row">
            <button class="btn ghost" data-v="skip">그냥 넘어갈래</button>
            <button class="btn" data-v="ok" ${picked ? '' : 'disabled'}>이 구절로 마무리</button>
          </div>
          <div class="medi-src">성경전서 개역개정판 © 대한성서공회</div>
        </div>`, 'center input medi');
      const ok = ov.querySelector('[data-v=ok]');
      ov.querySelectorAll('.mv').forEach(b => b.onclick = () => {
        ov.querySelectorAll('.mv').forEach(x => x.classList.remove('on'));
        b.classList.add('on');
        picked = b.dataset.ref;
        ok.disabled = false;
        Sound.sfx('select');
      });
      ok.onclick = () => res(picked);
      ov.querySelector('[data-v=skip]').onclick = () => res(null);
    });
    hideOverlay();
    if (!choice) return;
    D.verse = D.verse || {};
    D.verse[ep.id] = choice;
    Core.save();
    const v = list.find(x => x.ref === choice);
    Sound.sfx('verse');
    await new Promise(res => {
      const ov = showOverlay(`
        <div class="card verse">
          <div class="verse-ref">오늘 내 마음에 남은 말씀 · ${esc(v.label)}</div>
          <div class="verse-text">${esc(v.text)}</div>
          <div class="medi-pray">이 말씀을 한 번 더 소리 내어 읽고,<br>하나님께 한 문장으로 기도해 볼까?</div>
          <button class="btn">아멘</button>
        </div>`, 'center');
      ov.querySelector('button').onclick = () => { hideOverlay(); res(); };
    });
  };

  /* ---------- 지난 미션 묻기 ---------- */
  async function missionCheck(prev) {
    const D = Core.data;
    await say(ep.host, '{이름}, 잠깐. 지난번 미션 기억나니?');
    clearDialog('');
    const ans = await new Promise(res => {
      const ov = showOverlay(`
        <div class="card mission">
          <div class="mission-tag">지난 미션 · ${esc(prev.day)}</div>
          <div class="mission-text">${esc(D.mission[prev.id])}</div>
          <div class="mission-help">정직하게 말해 줘. 어느 쪽이든 기름은 똑같이 받아.</div>
          <div class="row"><button class="btn ghost" data-v="no">못 했어</button><button class="btn" data-v="yes">했어</button></div>
        </div>`, 'center');
      ov.querySelectorAll('button').forEach(b => b.onclick = () => res(b.dataset.v));
    });
    hideOverlay();
    D.missionAns[prev.id] = ans;
    if (ans === 'yes') D.missionDone[prev.id] = true;
    D.oil = (D.oil || 0) + 1;
    Core.save();
    oilPop();
    if (ans === 'yes') await say(ep.host, '그랬구나. 잘했다. 작은 일이라도 그게 깨어 있는 거란다.');
    else await say(ep.host, '괜찮다. 정직하게 말해 줘서 고맙다. 오늘 또 기회가 있으니까.');
  }

  function oilPop() {
    Sound.sfx('oil');
    el.oil.innerHTML = `<b>+1</b> 등불 기름 <span>(모두 ${Core.data.oil})</span>`;
    el.oil.hidden = false;
    el.oil.classList.remove('show');
    void el.oil.offsetWidth;
    el.oil.classList.add('show');
    setTimeout(() => { el.oil.hidden = true; }, 2400);
  }

  function toast(msg) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    t.style.bottom = document.getElementById('play') ? 'calc(220px + env(safe-area-inset-bottom, 0px))' : 'calc(40px + env(safe-area-inset-bottom, 0px))';
    document.body.appendChild(t);
    setTimeout(() => t.classList.add('show'), 10);
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 400); }, 1800);
  }

  /* ---------- 완료 ---------- */
  async function complete(my) {
    const D = Core.data;
    const before = Core.starCount();
    const first = !D.done[ep.id];
    D.done[ep.id] = D.done[ep.id] || Date.now();
    D.doneOn = D.doneOn || {};
    if (!D.doneOn[ep.id]) D.doneOn[ep.id] = Core.nowKST().date;
    Core.save();
    const newBadges = Fame.checkNew();
    const after = Core.starCount(), total = Core.starTotal();
    clearDialog('');
    if (ep.id === '0') {
      const ov = showOverlay(`
        <div class="card done">
          ${Art.bigStar(0.05, 120)}
          <div class="done-title">준비 끝!</div>
          <div class="done-sub">11월 29일 주일, 첫 번째 초가 켜지는 날<br>예배 끝나고 오후 1시에 만나자.</div>
          <button class="btn">홈으로</button>
        </div>`, 'center full');
      ov.querySelector('button').onclick = () => App.home();
      return;
    }
    const ov = showOverlay(`
      <div class="card done">
        <div class="done-star">${Art.bigStar(before / total, 150)}</div>
        <div class="done-title">${first ? '별이 조금 더 밝아졌어' : '다시 보기 끝'}</div>
        <div class="done-sub">별빛 ${after} / ${total}${first ? ` · 카드 No.${Card.cardNo(ep.id)} 획득` : ''}</div>
        ${newBadges.length ? `<div class="new-badges">${newBadges.map(b => `<div class="nb"><span>${b.icon}</span><b>${esc(b.name)}</b><small>새 배지</small></div>`).join('')}</div>` : ''}
        <button class="btn" data-v="card">인증 카드 보기</button>
        <button class="btn ghost" data-v="home">홈으로</button>
      </div>`, 'center full');
    setTimeout(() => {
      if (my !== runId) return;
      Sound.sfx('star');
      if (newBadges.length) setTimeout(() => Sound.sfx('badge'), 900);
      const box = ov.querySelector('.done-star');
      if (box) box.innerHTML = Art.bigStar(after / total, 150);
      box && box.classList.add('pulse');
    }, 700);
    ov.querySelector('[data-v=card]').onclick = () => App.card(ep.id);
    ov.querySelector('[data-v=home]').onclick = () => App.home();
  }

  /* ---------- 시작 ---------- */
  async function play(id) {
    const my = ++runId;
    ep = Core.epById(id);
    const src = window.STORY[id];
    const root = document.getElementById('play');
    mount(root);
    const chapter = CHAPTERS.find(c => c.n === ep.ch);
    root.className = 'screen tone-' + (chapter && chapter.tone || 'ch1');
    Sound.music(Sound.forTone(chapter && chapter.tone));
    if (!src) {
      clearDialog('이 편은 아직 준비 중이에요.');
      el.actions.innerHTML = `<button class="btn small">홈으로</button>`;
      el.actions.querySelector('button').onclick = () => App.home();
      return;
    }
    const steps = Script.parse(src);
    // 대본에 '묵상:'이 따로 없으면 맨 끝에 말씀 묵상을 넣는다
    if (ep.read && !steps.some(s => s.t === 'meditate')) steps.push({ t: 'meditate' });
    // 첫 장면을 미리 깔아 둔다
    const firstScene = steps.find(s => s.t === 'scene');
    if (firstScene) el.scene.innerHTML = Art.render(firstScene.name);
    clearDialog('');

    let checked = false;
    const prev = Core.prevEpisode(id);
    const needCheck = prev && Core.data.mission[prev.id] && !Core.data.missionAns[prev.id];

    for (const s of steps) {
      if (my !== runId) return;
      // 표제 다음, 첫 장면이 깔린 뒤에 지난 미션을 묻는다
      if (needCheck && !checked && s.t !== 'title' && s.t !== 'scene') {
        checked = true;
        await missionCheck(prev);
        if (my !== runId) return;
      }
      if (s.t === 'explore') await explore(s, my);
      else if (run[s.t]) await run[s.t](s, my);
    }
    if (my === runId) complete(my);
  }

  window.Player = { play, toast };
})();
