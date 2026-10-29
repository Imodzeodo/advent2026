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
      <div class="stage"><div class="scene-layer"></div><canvas class="fx-canvas"></canvas><div class="hot-layer"></div></div>
      <button class="exit" aria-label="나가기">✕</button>
      <button class="snd" aria-label="소리">${Sound.on ? '🔊' : '🔇'}</button>
      <div class="oil-pop" hidden></div>
      <div class="gem-hud" hidden>✦ <b>0</b>/<span>0</span></div>
      <div class="overlay" hidden></div>
      <div class="portrait" hidden></div>
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
      oil: root.querySelector('.oil-pop'),
      gemHud: root.querySelector('.gem-hud'),
      portrait: root.querySelector('.portrait')
    };
    Fx.attach(root.querySelector('.fx-canvas'));
    // 대사 속 빛나는 낱말(빛 조각) 줍기
    el.text.addEventListener('click', e => {
      const g = e.target.closest('.gem');
      if (!g || g.classList.contains('got')) return;
      e.stopPropagation();
      collectGem(g);
    });
    el.dialog.addEventListener('click', e => { if (!e.target.closest('button')) onTap(); });
    el.stage.addEventListener('click', e => { if (!e.target.closest('[data-hot],.hot-mark')) onTap(); });
    root.querySelector('.exit').addEventListener('click', () => {
      if (confirm('이야기에서 나갈까요? 이번 편은 처음부터 다시 하게 돼요.')) {
        runId++;
        App.home();
      }
    });
    root.querySelector('.snd').addEventListener('click', e => {
      e.currentTarget.textContent = Sound.toggle() ? '🔊' : '🔇';
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
  // [[낱말]] → 빛 조각(누르면 주움), *낱말* → 강조
  function segments(text) {
    const out = [];
    const re = /\[\[([^\]]+)\]\]|\*([^*]+)\*/g;
    let last = 0, m;
    while ((m = re.exec(text))) {
      if (m.index > last) out.push({ k: 't', s: text.slice(last, m.index) });
      out.push(m[1] ? { k: 'gem', s: m[1] } : { k: 'em', s: m[2] });
      last = re.lastIndex;
    }
    if (last < text.length) out.push({ k: 't', s: text.slice(last) });
    return out;
  }
  function segHTML(segs, n) {
    let html = '', left = n;
    for (const g of segs) {
      if (left <= 0) break;
      const chars = Array.from(g.s), part = chars.slice(0, left).join('');
      left -= chars.length;
      if (g.k === 't') html += esc(part);
      else if (g.k === 'em') html += `<b class="em">${esc(part)}</b>`;
      else {
        const got = gotGems().includes(g.s);
        html += `<span class="gem${got ? ' got' : ''}" data-w="${esc(g.s)}">${esc(part)}</span>`;
      }
    }
    return html;
  }
  function typeText(text, who) {
    return new Promise(res => {
      const segs = segments(text);
      const total = segs.reduce((a, g) => a + Array.from(g.s).length, 0);
      const plain = segs.map(g => g.s).join('');
      el.text.innerHTML = '';
      let i = 0, timer;
      const finish = () => { clearInterval(timer); el.text.innerHTML = segHTML(segs, total); typing = null; res(); };
      typing = finish;
      timer = setInterval(() => {
        i++;
        el.text.innerHTML = segHTML(segs, i);
        const ch = Array.from(plain)[i - 1];
        if (i % 2 && ch && ch.trim() && !/[.,…!?'"“”]/.test(ch)) Sound.blip(who);
        if (i >= total) finish();
      }, { slow: 48, mid: 30, fast: 14 }[Core.data.textSpeed] || 30);
    });
  }
  // 빛 조각
  const gotGems = () => ((Core.data.gems || {})[ep.id] || []);
  let gemTotal = 0;
  function countGems(steps) {
    const all = new Set();
    const scan = t => { for (const m of String(t || '').matchAll(/\[\[([^\]]+)\]\]/g)) all.add(m[1]); };
    for (const s of steps) {
      scan(s.text); scan(s.prompt);
      (s.spots || []).forEach(sp => sp.lines.forEach(l => scan(l.text)));
      (s.options || []).forEach(o => o.lines.forEach(l => scan(l.text)));
    }
    return all.size;
  }
  function updateGemHud() {
    el.gemHud.hidden = !gemTotal;
    el.gemHud.querySelector('b').textContent = gotGems().length;
    el.gemHud.querySelector('span').textContent = gemTotal;
  }
  function collectGem(span) {
    const D = Core.data;
    D.gems = D.gems || {};
    const list = D.gems[ep.id] = D.gems[ep.id] || [];
    if (!list.includes(span.dataset.w)) list.push(span.dataset.w);
    Core.save();
    span.classList.add('got');
    Sound.sfx('gem');
    if (navigator.vibrate) navigator.vibrate(20);
    const r = span.getBoundingClientRect(), h = el.gemHud.getBoundingClientRect(), rr = el.root.getBoundingClientRect();
    const fly = document.createElement('div');
    fly.className = 'gem-fly'; fly.textContent = '✦';
    fly.style.left = (r.left - rr.left + r.width / 2) + 'px'; fly.style.top = (r.top - rr.top) + 'px';
    el.root.appendChild(fly);
    requestAnimationFrame(() => { fly.style.left = (h.left - rr.left + 12) + 'px'; fly.style.top = (h.top - rr.top + 6) + 'px'; fly.style.opacity = '0.2'; });
    setTimeout(() => { fly.remove(); updateGemHud(); el.gemHud.classList.remove('bump'); void el.gemHud.offsetWidth; el.gemHud.classList.add('bump'); }, 650);
  }
  // 말하는 인물을 그림에서 살짝 움직이게
  function setSpeaking(who) {
    el.scene.querySelectorAll('.who.speaking').forEach(n => n.classList.remove('speaking'));
    const t = who && el.scene.querySelector(`[data-who="${CSS.escape(who)}"]`);
    if (t) el.scene.querySelectorAll(`[data-who="${CSS.escape(who)}"]`).forEach(n => n.classList.add('speaking'));
    camera(t);
  }
  // 카메라: 말하는 사람을 향해 조금 다가간다 (해설·살펴보기 때는 원래대로)
  function camera(target) {
    if (!target || hotState || Core.data.motion === false) { el.scene.style.transform = ''; return; }
    let b;
    try { b = target.getBBox(); } catch (e) { el.scene.style.transform = ''; return; }
    const sr = el.stage.getBoundingClientRect();
    const p = Fx.toScreen(b.x + b.width / 2, b.y + b.height * 0.35);
    const k = 1.08, mx = (k - 1) * sr.width / 2, my = (k - 1) * sr.height / 2;
    const tx = Math.max(-mx, Math.min(mx, (sr.width / 2 - p.x) * 0.3));
    const ty = Math.max(-my, Math.min(my, (sr.height / 2 - p.y) * 0.2));
    el.scene.style.transform = `translate(${tx.toFixed(1)}px, ${ty.toFixed(1)}px) scale(${k})`;
  }
  function setSpeaker(who) {
    el.dialog.classList.toggle('narr', !who);
    el.name.textContent = who || '';
    el.name.style.display = who ? '' : 'none';
    el.name.style.background = colorOf(who);
  }
  function setPortrait(who, expr, text) {
    if (!who) { el.portrait.hidden = true; el.dialog.classList.remove('has-pt'); return; }
    // 표정을 안 적었으면 웃음소리 정도만 알아본다
    if (!expr && /하하|허허|히히|후후/.test(text || '')) expr = '웃음';
    const html = Art.portrait(who, expr || '기본');
    if (el.portrait.dataset.key !== who + expr) {
      el.portrait.innerHTML = html;
      el.portrait.dataset.key = who + expr;
      el.portrait.classList.remove('pop'); void el.portrait.offsetWidth; el.portrait.classList.add('pop');
    }
    el.portrait.hidden = false;
    el.dialog.classList.add('has-pt');
  }
  async function say(who, text, expr) {
    setSpeaker(who);
    setSpeaking(who);
    setPortrait(who, expr, text);
    el.actions.innerHTML = '';
    const t = Script.fill(text, ep.id);
    await typeText(t, who);
    // 다 나온 직후의 연타는 잠깐 무시 (읽을 틈)
    await new Promise(r => setTimeout(r, window.__fast ? 0 : Math.min(900, 220 + Array.from(t).length * 11)));
    await waitTap();
  }
  async function sayLines(lines) {
    for (const l of lines) await say(l.who, l.text, l.expr);
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
    if (el.portrait) { el.portrait.hidden = true; el.dialog.classList.remove('has-pt'); }
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
        el.scene.style.transform = '';
        Fx.set(name);
        Sound.ambience(name);
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
    el.scene.style.transition = 'none'; el.scene.style.transform = ''; void el.scene.offsetWidth; el.scene.style.transition = '';
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
      el.title.innerHTML = s.parts.map((p, i) => `<div class="t${i}">${esc(Bible.full(p))}</div>`).join('');
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
    say: s => say(s.who, s.text, s.expr),
    async fx(s) {
      const once = { '흔들림': 650, '번쩍': 800, '두근': 900 };
      const cls = 'fx-' + s.name;
      const target = s.name === '흔들림' ? el.root : el.stage;
      target.classList.remove(cls); void target.offsetWidth;
      target.classList.add(cls);
      if (s.name === '흔들림') { Sound.sfx('thump'); if (navigator.vibrate) navigator.vibrate(120); }
      if (s.name === '번쩍') Sound.sfx('angel');
      if (s.name === '영광') Sound.sfx('angel');
      if (once[s.name]) { await new Promise(r => setTimeout(r, once[s.name])); target.classList.remove(cls); }
      else await new Promise(r => setTimeout(r, 1300));
    },
    async voice(s) { Sound.voice(s.name); },
    async sfx(s) {
      const KO = { 망치: 'hammer', 군중: 'crowd', 문: 'door', 발소리: 'steps', 심장: 'heart', 노크: 'knock', 바람: 'wind', 양: 'sheep', 아기: 'baby', 천사: 'angel', 불: 'fire', 별: 'star', 종: 'verse' };
      Sound.sfx(KO[s.name] || s.name);
      await new Promise(r => setTimeout(r, 250));
    },
    async verse(s) {
      clearDialog('');
      Sound.sfx('verse');
      if (!s.text) s.text = Bible.verses(s.ref.split('·')[0].trim()).map(v => v.text).join(' ');
      await cardThenTap(`
        <div class="card verse">
          <div class="verse-ref">${esc(Bible.full(s.ref))}</div>
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
            <div class="read-ref">${esc(Bible.full(s.ref))}</div>
            <div class="read-help">성경책이나 성경 앱을 열어 읽어 보세요.</div>
            <div class="row"><button class="btn ghost" data-v="later">나중에 읽을게</button><button class="btn" data-v="done">읽었어</button></div>
          </div>`, 'center');
        ov.querySelectorAll('button').forEach(b => b.onclick = () => { hideOverlay(); res(); });
      });
    },
    async choice(s, my) {
      setSpeaker(null);
      el.portrait.hidden = true; el.dialog.classList.remove('has-pt');
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
            <div class="mission-help">${nextHost() ? `다음 편을 열면 ${esc(josa(nextHost(), '이가'))} 했는지 물어볼 거야.` : '나의 기록에서 스스로 체크할 수 있어.'}<br>했든 못 했든, 정직하게만 답하면 등불 기름을 받아.</div>
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
        }, s.arg);
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
            <div class="rules-warn">📦 <b>설정 → 백업 코드</b>를 가끔 만들어 카톡 나와의 채팅에 보내 둬. 폰을 바꿔도 그대로 이어서 할 수 있어.</div>
            <div class="rules-warn">⚠️ 기록은 <b>지금 이 브라우저</b>에만 저장돼. 카톡에서 열었으면 앞으로도 카톡에서, 사파리·크롬에서 열었으면 거기서 계속해 줘. 아무도(선생님도) 네 일기를 볼 수 없어.</div>
            <button class="btn">알겠어</button>
          </div>`, 'center');
        ov.querySelector('button').onclick = () => { hideOverlay(); res(); };
      });
    }
  };

  /* ---------- 말씀 묵상 (편 끝): 본문 읽기 → 질문에 적어 보기 ---------- */
  run.meditate = async function () {
    const list = Bible.verses(ep.read);
    if (!list.length) return;
    clearDialog('');
    Sound.sfx('verse');
    const D = Core.data;
    D.medi = D.medi || {};
    const prev = D.medi[ep.id] || {};
    const qs = ep.medi && ep.medi.length ? ep.medi : ['오늘 말씀에서 가장 마음에 남는 부분은 어디야?', '그 말씀이 오늘 나에게 하는 말은 뭘까?'];
    const refLabel = Bible.full(ep.read);
    const picked = new Set(Bible.marks(ep.id));
    const result = await new Promise(res => {
      const ov = showOverlay(`
        <div class="card medi">
          <div class="medi-scroll">
            <div class="medi-tag">말씀 묵상</div>
            <div class="medi-ref">${esc(refLabel)}</div>
            <div class="medi-help">천천히 읽어 봐. 마음에 남는 구절은 눌러서 표시해 둬. 여러 개도 돼. 홈의 <b>📖 말씀 모음</b>에 모여.</div>
            <div class="medi-list">${list.map(v => `
              ${v.heading ? `<div class="mh">${esc(v.heading)}</div>` : ''}
              <button class="mv${picked.has(v.ref) ? ' on' : ''}" data-ref="${esc(v.ref)}"><sup>${v.v}</sup>${esc(v.text)}</button>`).join('')}
            </div>
            <div class="medi-src">성경전서 개역개정판 © 대한성서공회</div>
            <div class="medi-qs">${qs.map((q, i) => `
              <div class="mq">
                <div class="mq-q"><b>${i + 1}</b>${esc(Bible.full(q))}</div>
                <textarea rows="2" maxlength="300" data-i="${i}" placeholder="생각나는 대로 적어 봐">${esc((prev.a && prev.a[i]) || '')}</textarea>
              </div>`).join('')}
            </div>
          </div>
          <div class="row medi-btns">
            <button class="btn ghost" data-v="skip">다음에 적을래</button>
            <button class="btn" data-v="ok">묵상 마치기</button>
          </div>
        </div>`, 'center input medi');
      ov.querySelectorAll('.mv').forEach(btn => btn.onclick = () => {
        const on = btn.classList.toggle('on');
        if (on) picked.add(btn.dataset.ref); else picked.delete(btn.dataset.ref);
        Sound.sfx(on ? 'gem' : 'select');
      });
      // 적는 칸이 키보드에 가리지 않게
      ov.querySelectorAll('textarea').forEach(t => t.addEventListener('focus', () => setTimeout(() => t.scrollIntoView({ block: 'center', behavior: 'smooth' }), 300)));
      const answers = () => [...ov.querySelectorAll('textarea')].map(t => t.value.trim());
      ov.querySelector('[data-v=ok]').onclick = () => res({ a: answers(), done: true });
      ov.querySelector('[data-v=skip]').onclick = () => res({ a: answers(), done: false });
    });
    hideOverlay();
    D.verse = D.verse || {};
    const order = list.map(v => v.ref).filter(r => picked.has(r));
    if (order.length) D.verse[ep.id] = order; else delete D.verse[ep.id];
    if (result.a.some(Boolean)) D.medi[ep.id] = { q: qs, a: result.a };
    Core.save();
    if (!result.done) return;
    Sound.sfx('verse');
    const v = order.length && list.find(x => x.ref === order[0]);
    await new Promise(res => {
      const ov = showOverlay(`
        <div class="card verse">
          ${v ? `<div class="verse-ref">오늘 내 마음에 남은 말씀 · ${esc(v.label)}</div><div class="verse-text">${esc(v.text)}</div>` : `<div class="verse-ref">${esc(refLabel)}</div>`}
          <div class="medi-pray">${result.a.some(Boolean) ? '적은 생각은 일기장에 남았어.<br>' : ''}오늘 말씀을 붙들고 하나님께 한 문장으로 기도해 볼까?</div>
          <button class="btn">아멘</button>
        </div>`, 'center');
      ov.querySelector('button').onclick = () => { hideOverlay(); res(); };
    });
  };

  function nextHost() {
    const list = Core.mainEpisodes(), i = list.findIndex(e => e.id === ep.id);
    return list[i + 1] ? list[i + 1].host : '';
  }

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
    D.gemBonus = D.gemBonus || {};
    let gemLine = '';
    if (gemTotal) {
      const got = gotGems().length;
      if (got >= gemTotal && !D.gemBonus[ep.id]) { D.gemBonus[ep.id] = 1; D.oil = (D.oil || 0) + 1; gemLine = `✦ 빛 조각 ${got}/${gemTotal} 다 모았어! 기름 +1`; }
      else gemLine = `✦ 빛 조각 ${got}/${gemTotal}` + (got < gemTotal ? ' · 다시 보기로 마저 모을 수 있어' : '');
    }
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
        <div class="done-sub">별빛 ${after} / ${total}${first ? ` · 카드 No.${Card.cardNo(ep.id)} 획득` : ''}${gemLine ? `<br><span class="gem-line">${esc(gemLine)}</span>` : ''}</div>
        ${newBadges.length ? `<div class="new-badges">${newBadges.map(b => `<div class="nb"><span>${b.icon}</span><b>${esc(b.name)}</b><small>새 배지</small></div>`).join('')}</div>` : ''}
        <button class="btn" data-v="card">인증 카드 보기</button>
        <button class="link-btn" data-v="home">홈으로</button>
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
    if (ep.id === 'end') {
      const fin = document.createElement('button');
      fin.className = 'btn big finale-go'; fin.textContent = '🌟 27일의 기록 보기';
      fin.onclick = () => App.finale();
      ov.querySelector('.done-sub').after(fin);
    }
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
    gemTotal = countGems(steps);
    steps.filter(s => s.t === 'voice').forEach(s => Sound.preload(s.name));
    updateGemHud();
    // 대본에 '묵상:'이 따로 없으면 맨 끝에 말씀 묵상을 넣는다
    if (ep.read && !steps.some(s => s.t === 'meditate')) steps.push({ t: 'meditate' });
    // 첫 장면을 미리 깔아 둔다
    const firstScene = steps.find(s => s.t === 'scene');
    if (firstScene) { el.scene.innerHTML = Art.render(firstScene.name); requestAnimationFrame(() => Fx.set(firstScene.name)); Sound.ambience(firstScene.name); }
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
