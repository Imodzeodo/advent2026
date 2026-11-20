/* 에피소드 재생기: 장면 + 대사창 + 카드들 */
(function () {
  const NAME_COLOR = {
    '사가랴': '#c9952f', '엘리사벳': '#b86d8e', '이웃': '#6f7ba0', '이웃 아주머니': '#6f7ba0',
    '꼬마': '#4f9a78', '제사장': '#7c86b4', '요셉': '#5d8fb0', '마리아': '#5f7fc9',
    '할아버지': '#8b9a5a'
  };
  const colorOf = who => NAME_COLOR[who] || '#8178a8';
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  let el = {}, ep = null, runId = 0;
  // 연출 모드: normal(기본) · chat(대화창) · movie(보는 날: 저절로 넘어감)
  let mode = 'normal', chatMe = '', voiceUntil = 0, voicedCard = false;
  let typing = null, tapWait = null;
  let meteorAt = 0, dialogueCount = 0;

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
        <button class="log-btn" type="button" aria-label="지난 대사 보기">↺ 지난 대사</button>
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
    bindGems(el.text);
    root.querySelector('.log-btn').addEventListener('click', e => { e.stopPropagation(); showLog(); });
    el.dialog.addEventListener('click', e => { if (!e.target.closest('button')) onTap(); });
    el.stage.addEventListener('click', e => { if (!e.target.closest('[data-hot],.hot-mark')) onTap(); });
    root.querySelector('.exit').addEventListener('click', () => {
      if (confirm('이야기에서 나갈까요? 다음에 마지막 장면부터 이어서 할 수 있어요.')) {
        runId++;
        App.home();
      }
    });
    root.querySelector('.snd').addEventListener('click', e => {
      e.currentTarget.textContent = Sound.toggle() ? '🔊' : '🔇';
    });
    window.addEventListener('resize', placeHotMarks);
    if (!window.__keysBound) {
      window.__keysBound = true;
      window.addEventListener('keydown', onKey);
    }
  }

  /* ---------- 키보드 (컴퓨터) ---------- */
  function onKey(e) {
    if (!document.getElementById('play') || !el.root || !document.body.contains(el.root)) return;
    const tag = (document.activeElement && document.activeElement.tagName) || '';
    if (tag === 'TEXTAREA' || tag === 'INPUT') return;
    const k = e.key;
    // 숫자 1~4: 선택지 고르기
    if (/^[1-4]$/.test(k)) {
      const bs = el.actions.querySelectorAll('.btn.choice');
      if (bs[+k - 1]) { e.preventDefault(); bs[+k - 1].click(); }
      return;
    }
    if (![' ', 'Enter', 'ArrowRight', 'ArrowDown'].includes(k)) return;
    e.preventDefault();
    const ov = el.overlay.hidden ? null : el.overlay;
    if (!el.title.hidden) { el.title.click(); return; }
    if (ov) {
      if (ov.querySelector('.tap-hint')) { ov.click(); return; }
      // 버튼이 하나뿐인 카드(미션·아멘 등)는 그 버튼을
      const btns = [...ov.querySelectorAll('.btn:not(.ghost)')].filter(b => !b.disabled && b.offsetParent);
      if (btns.length === 1) btns[0].click();
      return;
    }
    const cont = el.actions.querySelector('.btn:not(.choice)');
    if (cont) { cont.click(); return; }
    onTap();
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
  function segHTML(segs, animate = false) {
    return segs.map(g => {
      const part = animate ? Array.from(g.s, ch => `<span class="letter-unshown">${esc(ch)}</span>`).join('') : esc(g.s);
      if (g.k === 't') return part;
      if (g.k === 'em') return `<b class="em">${part}</b>`;
      const got = gotGems().includes(g.s);
      return `<span class="gem${got ? ' got' : ''}${animate ? ' gem-unshown' : ''}" data-w="${esc(g.s)}">${part}</span>`;
    }).join('');
  }
  let replay = false; // 이미 끝낸 편을 다시 하는 중
  function typeText(text, who) {
    return new Promise(res => {
      const segs = segments(text);
      const animate = !replay && !window.__fast;
      el.text.innerHTML = segHTML(segs, animate);
      const letters = el.text.querySelectorAll('.letter-unshown');
      if (!letters.length) { res(); return; }
      let i = 0, timer;
      const reveal = letter => {
        letter.parentElement.classList.remove('gem-unshown');
        letter.classList.remove('letter-unshown');
      };
      const finish = () => {
        clearInterval(timer);
        if (typing === finish) {
          for (; i < letters.length; i++) reveal(letters[i]);
          typing = null;
        }
        res();
      };
      typing = finish;
      timer = setInterval(() => {
        if (typing !== finish) { finish(); return; }
        const letter = letters[i++], ch = letter.textContent;
        reveal(letter);
        if (i % 2 && ch && ch.trim() && !/[.,…!?'"“”]/.test(ch)) Sound.blip(who);
        if (i >= letters.length) finish();
      }, { slow: 48, mid: 30, fast: 14 }[Core.data.textSpeed] || 30);
    });
  }
  // 빛 조각
  const gotGems = () => ((Core.data.gems || {})[ep.id] || []);
  function bindGems(root) {
    const presses = new Map();
    root.addEventListener('pointerdown', e => {
      const gem = e.target.closest('.gem:not(.gem-unshown)');
      if (gem && e.button === 0) presses.set(e.pointerId, gem);
    });
    root.addEventListener('pointercancel', e => presses.delete(e.pointerId));
    root.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') presses.delete(e.pointerId); });
    root.addEventListener('pointerup', e => {
      const gem = presses.get(e.pointerId);
      presses.delete(e.pointerId);
      if (gem && document.elementFromPoint(e.clientX, e.clientY)?.closest('.gem') === gem) collectGem(gem);
    });
    root.addEventListener('click', e => {
      const gem = e.target.closest('.gem:not(.gem-unshown)');
      if (!gem) return;
      e.stopPropagation();
      collectGem(gem);
    });
  }
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
    if (span.classList.contains('got')) return;
    const D = Core.data;
    D.gems = D.gems || {};
    const list = D.gems[ep.id] = D.gems[ep.id] || [];
    span.classList.add('got');
    if (list.includes(span.dataset.w)) return;
    list.push(span.dataset.w);
    Core.save();
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
    el.name.textContent = who ? (Art.nameOf ? Art.nameOf(who) : who) : '';
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
    if (mode === 'chat') return chatSay(who, text, expr);
    setSpeaker(who);
    setSpeaking(who);
    setPortrait(who, expr, text);
    el.actions.innerHTML = '';
    const t = Script.fill(text, ep.id);
    remember(who, t);
    const my = runId;
    if (mode === 'normal' && ++dialogueCount === meteorAt && !window.__fast) shootMeteor(ep.id, my);
    await typeText(t, who);
    if (my !== runId) return;
    if (mode === 'movie') { await autoWait(1500 + plainLen(t) * 95); return; }
    // 다 나온 직후의 연타는 잠깐 무시 (읽을 틈)
    await new Promise(r => setTimeout(r, window.__fast ? 0 : Math.min(900, 220 + Array.from(t).length * 11)));
    if (my !== runId) return;
    await waitTap();
  }
  function shootMeteor(id, my) {
    const D = Core.data;
    if (D.meteor?.[id]) return;
    const stage = el.stage;
    const star = document.createElement('button');
    star.type = 'button'; star.className = 'meteor-shot'; star.setAttribute('aria-label', '별똥별 잡기');
    star.innerHTML = '<span aria-hidden="true">✦</span>';
    star.onclick = event => {
      event.stopPropagation();
      if (my !== runId || !star.isConnected || D.meteor?.[id]) return;
      const box = stage.getBoundingClientRect(), point = star.getBoundingClientRect();
      Fx.burst(stage, 100 * (point.left + point.width / 2 - box.left) / box.width, 100 * (point.top + point.height / 2 - box.top) / box.height, 20);
      star.remove();
      D.meteor = D.meteor || {};
      D.meteor[id] = 1;
      const extra = Math.max(0, Math.round(window.Field?.bonus?.('meteorOil') || 0));
      Core.addOil(1 + extra, 'meteor'); Core.save();
      Sound.sfx('gem'); toast(`별똥별을 잡았어! 기름 +${1 + extra}`);
    };
    stage.appendChild(star);
    setTimeout(() => star.remove(), 2500);
  }
  /* ---------- 지난 대사 (연타로 놓친 말 다시 보기) ---------- */
  let backlog = [];
  function remember(who, t) {
    backlog.push({ who: who ? (Art.nameOf ? Art.nameOf(who) : who) : '', text: String(t).replace(/\[\[|\]\]|\*/g, '') });
    if (backlog.length > 60) backlog.shift();
  }
  function showLog() {
    if (el.root.querySelector('.backlog')) return;
    const box = document.createElement('div');
    box.className = 'backlog';
    box.innerHTML = `<div class="backlog-card"><div class="backlog-head"><b>지난 대사</b><button type="button" class="backlog-x" aria-label="닫기">✕</button></div>
      <div class="backlog-list">${backlog.length ? backlog.map(l => `<p class="${l.who ? '' : 'narr'}">${l.who ? `<b>${esc(l.who)}</b>` : ''}${esc(l.text)}</p>`).join('') : '<p class="narr">아직 지난 대사가 없어요.</p>'}</div></div>`;
    const close = e => { if (e) e.stopPropagation(); box.remove(); };
    box.addEventListener('click', e => { e.stopPropagation(); if (e.target === box) close(); });
    box.querySelector('.backlog-x').onclick = close;
    el.root.appendChild(box);
    const list = box.querySelector('.backlog-list'); list.scrollTop = list.scrollHeight;
  }
  const plainLen = t => Array.from(String(t).replace(/\[\[|\]\]|\*/g, '')).length;
  // 보는 날: 읽을 시간이 지나면 저절로, 누르면 바로 넘어간다
  function autoWait(ms) {
    if (window.__fast) ms = el.text.querySelector('.gem:not(.got)') ? 600 : 200;
    return new Promise(r => {
      el.next.classList.add('on', 'auto');
      el.next.style.setProperty('--auto', ms + 'ms');
      const t = setTimeout(() => { if (tapWait === go) { tapWait = null; go(); } }, ms);
      function go() { clearTimeout(t); el.next.classList.remove('on', 'auto'); r(); }
      tapWait = go;
    });
  }
  /* ---------- 대화창 모드 (메신저처럼) ---------- */
  function chatOpen(title) {
    chatClose(true);
    const p = document.createElement('div');
    p.className = 'chat-panel';
    p.innerHTML = `<div class="chat-head">${esc(title || '대화')}</div><div class="chat-log"></div>`;
    el.stage.appendChild(p);
    bindGems(p.querySelector('.chat-log'));
    void p.offsetWidth; p.classList.add('in');
    el.root.classList.add('m-chat');
  }
  function chatClose(now) {
    el.root.classList.remove('m-chat');
    el.stage.querySelectorAll('.chat-panel').forEach(p => { if (now) p.remove(); else { p.classList.remove('in'); setTimeout(() => p.remove(), 400); } });
  }
  async function chatSay(who, text, expr) {
    const log = el.stage.querySelector('.chat-log');
    if (!log) { mode = 'normal'; return say(who, text, expr); }
    setSpeaker(null); setPortrait(null); setSpeaking(who);
    el.actions.innerHTML = '';
    el.text.innerHTML = '<span class="chat-hint">탭해서 다음 메시지</span>';
    const t = Script.fill(text, ep.id), segs = segments(t);
    remember(who, t);
    const total = segs.reduce((a, g) => a + Array.from(g.s).length, 0);
    const base = who && who.replace(/의 서판$/, '');
    const row = document.createElement('div');
    if (!who) row.className = 'cm sys';
    else row.className = 'cm ' + (base === chatMe ? 'me' : 'them') + (/서판$/.test(who) ? ' cm-tab' : '');
    const head = who && base !== chatMe ? `<div class="cm-av">${Art.portrait(base, expr || '기본')}</div>` : '';
    const name = who && base !== chatMe ? `<div class="cm-name" style="color:${colorOf(base)}">${esc(Art.nameOf ? Art.nameOf(who) : who)}</div>` : '';
    row.innerHTML = who ? `${head}<div class="cm-body">${name}<div class="cm-bub"><span class="cm-typing"><i></i><i></i><i></i></span></div></div>` : `<div class="cm-bub"></div>`;
    log.appendChild(row);
    log.scrollTop = log.scrollHeight;
    const bub = row.querySelector('.cm-bub');
    if (who && !window.__fast) await new Promise(r => setTimeout(r, Math.min(1100, 350 + total * 18)));
    bub.innerHTML = segHTML(segs);
    row.classList.add('shown');
    log.scrollTop = log.scrollHeight;
    Sound.sfx(who ? 'select' : 'page');
    if (who) Sound.blip(base);
    await new Promise(r => setTimeout(r, window.__fast ? 0 : 450));
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
    // 카드가 대사창 위 공간보다 길면 대사창 자리까지 넓게 쓴다 (작은 폰에서 버튼이 밀려나지 않게)
    const ov = el.overlay;
    const fit = () => { if (ov.hidden) return; ov.classList.remove('tall'); if (ov.scrollHeight > ov.clientHeight + 4) ov.classList.add('tall'); };
    fit(); requestAnimationFrame(fit); setTimeout(fit, 300);
    holdButtons(ov, cls);
    return el.overlay;
  }
  // 연타로 카드를 놓치지 않게: 카드가 뜬 뒤 잠깐 버튼을 잠근다 (중요 카드 'hold'는 더 길게, 막대가 차오름)
  function holdButtons(ov, cls) {
    const c = ' ' + (cls || '') + ' ';
    if (window.__fast || / (game|input) /.test(c) || !/ center /.test(c)) return;
    const ms = / hold /.test(c) ? 1800 : 700;
    const card = ov.firstElementChild;
    ov.querySelectorAll('.btn').forEach(b => {
      if (b.disabled) return;
      b.disabled = true; b.classList.add('hold-wait'); b.style.setProperty('--hold', ms + 'ms');
      setTimeout(() => { if (card && card.isConnected) { b.disabled = false; b.classList.remove('hold-wait'); } }, ms);
    });
  }
  function hideOverlay() {
    el.overlay.classList.remove('in');
    el.overlay.hidden = true;
    el.overlay.innerHTML = '';
  }
  function cardThenTap(html, cls, autoMs) {
    return new Promise(res => {
      const ov = showOverlay(html, cls);
      let t, done = false;
      const go = () => { if (done) return; done = true; clearTimeout(t); ov.removeEventListener('click', go); hideOverlay(); res(); };
      setTimeout(() => { if (!done) ov.addEventListener('click', go); }, window.__fast ? 350 : 650);
      if (autoMs) t = setTimeout(go, window.__fast ? 300 : autoMs);
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
      el.scene.querySelectorAll(`[data-hot="${CSS.escape(name)}"]`).forEach(n => n.classList.add('seen-obj'));
      idleNudge();
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
    // 한동안 안 누르면 아직 안 본 곳 하나가 통통 튄다
    let nudgeT;
    function idleNudge() {
      clearTimeout(nudgeT);
      nudgeT = setTimeout(() => {
        if (my !== runId || busy) return;
        const m = el.hot.querySelector('.hot-mark:not(.seen)');
        if (m) { m.classList.remove('bounce'); void m.offsetWidth; m.classList.add('bounce'); idleNudge(); }
      }, 5000);
    }
    idleNudge();
    prompt();
    await done;
    clearTimeout(nudgeT);
    el.scene.removeEventListener('click', svgHandler);
    el.scene.classList.remove('exploring');
    el.hot.innerHTML = '';
    hotState = null;
  }

  // 말씀 카드에 어울리는 소리 (카드가 뜰 때 함께)
  const VERSE_SFX = {
    '눅 1:10': 'crowd', '눅 1:21': 'crowd', '눅 1:22': 'crowd', '눅 1:11-12': 'angel', '눅 1:26-27': 'angel',
    '막 1:3': 'wind', '사 40:3': 'wind', '마 1:24': 'steps', '눅 1:39': 'steps', '눅 1:40': 'knock',
    '눅 1:41': 'heart', '눅 1:44-45': 'heart', '눅 1:57-58': 'baby', '눅 1:64': 'star',
    '눅 2:1': 'crowd', '눅 2:3': 'crowd', '눅 2:4-5': 'steps', '눅 2:8': 'sheep', '사 40:11': 'sheep', '시 23:1': 'sheep',
    '눅 2:9': 'angel', '눅 2:12': 'baby', '눅 2:15': 'steps', '눅 2:16': 'door', '눅 2:20': 'steps', '마 2:10': 'star', '사 9:2': 'fire'
  };
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
    async mode(s) {
      if (s.mode !== 'normal') el.stage.querySelector('.meteor-shot')?.remove();
      if (mode === 'chat' && s.mode !== 'chat') chatClose();
      el.root.classList.remove('m-movie');
      mode = s.mode;
      if (mode === 'chat') { chatMe = s.me; clearDialog(''); chatOpen(s.title); await new Promise(r => setTimeout(r, 400)); }
      if (mode === 'movie') {
        el.root.classList.add('m-movie');
        clearDialog('');
        Player.toast('🎬 보는 날 · 저절로 넘어가요. 누르면 빨리 넘어가요');
        await new Promise(r => setTimeout(r, 600));
      }
    },
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
    async voice(s) {
      voiceUntil = 0; voicedCard = true;
      await Promise.race([
        Sound.voice(s.name).then(d => { if (d) voiceUntil = Date.now() + d * 1000; }).catch(() => {}),
        new Promise(r => setTimeout(r, 1200))
      ]);
    },
    async sfx(s) {
      const KO = { 망치: 'hammer', 군중: 'crowd', 문: 'door', 발소리: 'steps', 심장: 'heart', 노크: 'knock', 바람: 'wind', 양: 'sheep', 아기: 'baby', 천사: 'angel', 불: 'fire', 별: 'star', 종: 'verse' };
      Sound.sfx(KO[s.name] || s.name);
      await new Promise(r => setTimeout(r, 250));
    },
    async verse(s) {
      clearDialog('');
      Sound.sfx('verse');
      const ref0 = s.ref.split('·')[0].trim();
      const vs = VERSE_SFX[ref0];
      if (vs) setTimeout(() => Sound.sfx(vs), 350);
      // 인물 음성이 앞에 없으면 해설 성우가 말씀을 읽어 준다
      const narr = (window.NARR || {})[ref0];
      if (!voicedCard && narr) {
        voiceUntil = 0;
        await Promise.race([
          Sound.voice(narr).then(d => { if (d) voiceUntil = Date.now() + d * 1000; }).catch(() => {}),
          new Promise(r => setTimeout(r, 900))
        ]);
      }
      voicedCard = false;
      if (!s.text) s.text = Bible.verses(s.ref.split('·')[0].trim()).map(v => v.text).join(' ');
      const auto = mode === 'movie' ? Math.max(2200 + plainLen(s.text) * 85, voiceUntil - Date.now() + 900) : 0;
      await cardThenTap(`
        <div class="card verse">
          <div class="verse-ref">${esc(Bible.full(s.ref))}</div>
          <div class="verse-text">${esc(s.text)}</div>
          <div class="verse-src">성경전서 개역개정판</div>
          <div class="tap-hint">${auto ? '저절로 넘어가요 · 탭하면 바로' : '탭해서 계속'}</div>
          ${auto ? `<div class="auto-bar" style="--auto:${auto}ms"></div>` : ''}
        </div>`, 'center', auto);
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
            <div class="mission-help">${nextHost() ? `다음 편을 열면 ${esc(Core.josa(nextHost(), '이가'))} 했는지 물어볼 거야.` : '나의 기록에서 스스로 체크할 수 있어.'}<br>했든 못 했든, 정직하게만 답하면 등불 기름을 받아.</div>
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
            <p class="rules-flow">매일 밤 3분 — <b>이야기 한 편 → 내 양 돌보기</b>.<br>성탄 밤, 네가 지킨 양 떼와 구유로.</p>
            <ul>
              <li>새 편은 한국 시간 자정에 열려.${Core.REL ? '' : ' 주일은 오전 11시.'} 놓쳐도 나중에 볼 수 있어.</li>
              <li>한 편을 끝내면 별이 켜져. 네 답은 묵상 노트에 남아.</li>
              <li>미션에 정직하게 답하면 등불 기름을 받아.</li>
            </ul>
            <div class="rules-warn">기록은 이 브라우저에만 남아. <b>설정 → 기록 열쇠</b>를 카톡 나와의 채팅에 보내 두면 폰을 바꿔도 이어서 할 수 있어.</div>
            <button class="btn">알겠어</button>
          </div>`, 'center hold');
        ov.querySelector('button').onclick = () => { hideOverlay(); res(); };
      });
    }
  };

  run.appoint = async function (_, my) {
    clearDialog('');
    const D = Core.data;
    if (!D.appointedOn) {
      const ov = showOverlay(`<div class="card appoint-ceremony">
        <h2>등잔을 꾹 눌러 불을 붙여 줘</h2>
        <button class="appoint-hold" aria-label="등잔 1.5초 누르기">
          <svg viewBox="-50 -70 115 98" aria-hidden="true"><defs>${Art.LAMP_DEF}</defs>${Art.lampShape(0, 0, 1)}</svg>
        </button>
        <div class="appoint-progress" aria-hidden="true"><i></i></div>
      </div>`, 'center full');
      const lamp = ov.querySelector('.appoint-hold');
      await new Promise(resolve => {
        let timer = 0, lit = false;
        const start = () => {
          if (timer || lit) return;
          lamp.closest('.appoint-ceremony').classList.add('holding');
          timer = setTimeout(() => {
            if (my !== runId) { resolve(); return; }
            lit = true;
            const card = lamp.closest('.appoint-ceremony');
            card.classList.add('lit');
            Sound.sfx('angel'); navigator.vibrate?.(70);
            Fx.burst(ov, 50, 49, 34);
            Sound.voice('init-1');
            D.appointedOn = Core.nowKST().date;
            Core.save();
            setTimeout(resolve, window.__fast ? 0 : 650);
          }, window.__fast ? 0 : 1500);
        };
        const end = () => {
          if (lit) return;
          clearTimeout(timer); timer = 0;
          lamp.closest('.appoint-ceremony').classList.remove('holding');
        };
        lamp.onpointerdown = event => {
          if (event.button !== 0) return;
          if (event.isTrusted) lamp.setPointerCapture(event.pointerId);
          start();
        };
        lamp.onpointerup = lamp.onpointercancel = end;
        lamp.onkeydown = event => {
          if (![' ', 'Enter'].includes(event.key)) return;
          event.preventDefault(); event.stopPropagation(); start();
        };
        lamp.onkeyup = end;
        lamp.onblur = end;
      });
      if (my !== runId) return;
    }
    await new Promise(resolve => {
      const ov = showOverlay(`<div class="card appoint-card">
        <h2>등불지기 임명장</h2><div class="card-preview" aria-live="polite">그리는 중…</div>
        <div class="row"><button class="btn ghost" id="share" disabled>카톡으로 공유</button><button class="btn ghost" id="save" disabled>이미지 저장</button></div>
        <button class="btn" data-appoint-next>계속</button>
      </div>`, 'center full');
      ov.querySelector('[data-appoint-next]').onclick = () => { hideOverlay(); resolve(); };
      const preview = ov.querySelector('.card-preview');
      Card.drawAppoint().then(cv => {
        if (!preview.isConnected) return;
        const img = new Image(); img.src = cv.toDataURL('image/png'); img.alt = '등불지기 임명장';
        preview.replaceChildren(img);
        App.bindImageActions(ov, cv, 'APPOINT');
      }).catch(() => { preview.textContent = '임명장 이미지를 만들지 못했어요.'; });
    });
  };

  run.lamb = async function (_, my) {
    if (!window.Field || Field.has()) return;
    clearDialog('');
    const ov = showOverlay('', 'center full input field-event');
    await Field.receiveFirstLamb(ov);
    if (my === runId) hideOverlay();
  };

  run.flock = async function (_, my) {
    if (!window.Field?.has()) return;
    clearDialog('');
    const ov = showOverlay('', 'center full field-event');
    await Field.flockScene(ov);
    if (my === runId) hideOverlay();
  };

  /* ---------- 말씀 묵상 (편 끝): 본문 읽기 → 질문에 적어 보기 ---------- */
  run.meditate = async function () {
    const list = Bible.verses(ep.read);
    if (!list.length) return;
    clearDialog('');
    Sound.sfx('verse');
    const D = Core.data;
    D.medi = D.medi || {};
    const qs = ep.medi && ep.medi.length ? ep.medi : ['오늘 말씀에서 가장 마음에 남는 부분은 어디야?', '그 말씀이 오늘 나에게 하는 말은 뭘까?'];
    const refLabel = Bible.full(ep.read);
    const picked = new Set(Bible.marks(ep.id));
    // 묵상 → 기도. 기도 카드에서 '묵상 다시 보기'로 돌아올 수 있다
    for (;;) {
    const prev = D.medi[ep.id] || {};
    const mq = (q, i) => `
              <div class="mq">
                <div class="mq-q"><b>${i + 1}</b>${esc(Bible.full(q))}</div>
                <textarea rows="2" maxlength="300" data-i="${i}" placeholder="한 줄이면 충분해">${esc((prev.a && prev.a[i]) || '')}</textarea>
              </div>`;
    const result = await new Promise(res => {
      const ov = showOverlay(`
        <div class="card medi">
          <div class="medi-scroll">
            <div class="medi-tag">말씀 묵상</div>
            <div class="medi-ref">${esc(refLabel)}</div>
            <div class="medi-help">천천히 읽어 봐. 마음에 남는 구절을 누르면 표시돼. 홈의 <b>📖 말씀 모음</b>에 모여.</div>
            <div class="medi-list">${list.map(v => `
              ${v.heading ? `<div class="mh">${esc(v.heading)}</div>` : ''}
              <button class="mv${picked.has(v.ref) ? ' on' : ''}" data-ref="${esc(v.ref)}"><sup>${v.v}</sup>${esc(v.text)}</button>`).join('')}
            </div>
            <div class="medi-src">성경전서 개역개정판 © 대한성서공회</div>
            <div class="medi-qs">${qs.slice(0, 1).map((q, i) => mq(q, i)).join('')}
              ${qs.length > 1 ? `<details class="mq-more"${prev.a && prev.a.slice(1).some(Boolean) ? ' open' : ''}><summary>더 생각해 보기 (${qs.length - 1}) · 안 적어도 괜찮아</summary>${qs.slice(1).map((q, i) => mq(q, i + 1)).join('')}</details>` : ''}
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
      // 뜨자마자 눌린 연타는 무시
      const t0 = Date.now(), ready = () => Date.now() - t0 > (window.__fast ? 0 : 700);
      ov.querySelector('[data-v=ok]').onclick = () => { if (ready()) res({ a: answers(), done: true }); };
      ov.querySelector('[data-v=skip]').onclick = () => { if (ready()) res({ a: answers(), done: false }); };
    });
    hideOverlay();
    D.verse = D.verse || {};
    const order = list.map(v => v.ref).filter(r => picked.has(r));
    if (order.length) D.verse[ep.id] = order; else delete D.verse[ep.id];
    if (result.a.some(Boolean)) D.medi[ep.id] = { q: qs, a: result.a }; else delete D.medi[ep.id];
    Core.save();
    Sound.sfx('verse');
    const v = order.length && list.find(x => x.ref === order[0]);
    let goBack = false;
    await new Promise(res => {
      const ov = showOverlay(`
        <div class="card verse">
          ${v ? `<div class="verse-ref">오늘 내 마음에 남은 말씀 · ${esc(v.label)}</div><div class="verse-text">${esc(v.text)}</div>` : `<div class="verse-ref">${esc(refLabel)}</div>`}
          ${result.a.some(Boolean) ? '<div class="medi-saved">적은 생각은 묵상 노트에 남았어.</div>' : ''}
          <div class="pray-box">
            <div class="pray-tag">🙏 오늘의 기도 <small>따라 읽거나, 내 말로 바꿔서</small></div>
            <div class="pray-text">${esc((window.PRAYERS || {})[ep.id] || '하나님, 오늘 읽은 말씀을 마음에 새기고 살아가게 해 주세요.')} ${esc(window.PRAYER_END || '예수님의 이름으로 기도합니다. 아멘.')}</div>
          </div>
          <div class="row"><button class="btn ghost" data-v="back">← 묵상 다시 보기</button><button class="btn" data-v="amen" disabled>아멘</button></div>
        </div>`, 'center');
      const amen = ov.querySelector('[data-v=amen]');
      // 기도문을 읽을 틈을 주고 나서 '아멘'이 눌린다 (연타로 넘어가지 않게)
      setTimeout(() => { amen.disabled = false; }, window.__fast ? 0 : 1500);
      amen.onclick = () => { hideOverlay(); res(false); };
      ov.querySelector('[data-v=back]').onclick = () => { hideOverlay(); res(true); };
    }).then(back => { goBack = back; });
    if (!goBack) break;
    }
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
    Core.addOil(1, 'mission');
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

  function toast(msg, action) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    if (action) {
      t.classList.add('has-action');
      const b = document.createElement('button');
      b.textContent = action.label;
      b.onclick = () => { t.remove(); action.open(); };
      t.appendChild(b);
    }
    t.style.bottom = document.getElementById('play') ? 'calc(220px + env(safe-area-inset-bottom, 0px))' : 'calc(40px + env(safe-area-inset-bottom, 0px))';
    document.body.appendChild(t);
    setTimeout(() => t.classList.add('show'), 10);
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 400); }, action ? 6200 : 1800);
  }

  /* ---------- 완료 ---------- */
  // 끝난 화면의 별자리 한 조각
  function skyLine() {
    const S = Sky.shape(ep.id); if (!S) return '';
    const C = Sky.chapter(Core.epById(ep.id).ch), lv = Sky.level(ep.id);
    const msg = C.full ? `✦ ${Core.josa(S.name, '이가')} 완성됐어!` : lv === 2 ? `${S.name}에 환한 별이 떴어` : `${S.name}에 별이 떴어 · 빛 조각을 다 모으면 환해져`;
    return `<div class="sky-done">${Sky.mini(ep.id)}<div class="sky-msg${C.full ? ' full' : ''}">${msg}</div></div>`;
  }
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
      if (got >= gemTotal && !D.gemBonus[ep.id]) { D.gemBonus[ep.id] = 1; Core.addOil(1, 'gems'); gemLine = `✦ 빛 조각 ${got}/${gemTotal} 다 모았어! 기름 +1`; }
      else gemLine = `✦ 빛 조각 ${got}/${gemTotal}` + (got < gemTotal ? ' · 다시 보기로 마저 모을 수 있어' : '');
    }
    Core.save();
    const chapterGuest = first && await window.Field?.awardChapterGuest(ep.id);
    if (my !== runId || !el.root.isConnected) return;
    const newBadges = Fame.checkNew();
    const after = Core.starCount(), total = Core.starTotal();
    clearDialog('');
    if (ep.id === '0') {
      const ov = showOverlay(`
        <div class="card done">
          ${Art.bigStar(0.05, 120)}
          <div class="done-title">준비 끝!</div>
          <div class="done-sub">${Core.REL ? '성탄 26일 전, 첫 번째 이야기가 열려.<br>그날 0시에 만나자.' : '📅 <b>11월 29일 주일 오전 11시</b><br>첫 번째 초가 켜지는 날, 첫 이야기가 열려.<br>예배 끝나고 반에서 같이 시작하자!'}</div>
          <button class="btn">홈으로</button>
        </div>`, 'center full hold');
      ov.querySelector('button').onclick = () => App.home({ top: true });
      return;
    }
    // 다음 편: 열려 있으면 바로 이어서, 아니면 언제 열리는지 예고
    const list = Core.mainEpisodes(), nx = list[list.findIndex(x => x.id === ep.id) + 1];
    const nextOpen = nx && Core.isOpen(nx) && !D.done[nx.id] && window.STORY[nx.id];
    const nextLine = !nx || nextOpen || D.done[nx.id] ? '' : `<div class="next-tease">🌙 다음 이야기 「${esc(nx.title)}」<br><small>${esc(Core.dateLabel(nx.date))} ${Core.hourLabel(nx.openHour)}에 열려요</small></div>`;
    const firstDay = first && ep.id === '1-0';
    const fieldOpen = !!window.Field?.has();
    const firstSheep = firstDay && Core.data.field?.sheep?.[0];
    const fieldLabel = firstSheep ? `${Core.josa(firstSheep.name, '이가')} 기다려` :
      Core.data.field?.cared === Core.nowKST().date ? '들판 들르기' : '오늘 밤 들판으로';
    const ov = showOverlay(`
      <div class="card done">
        ${firstDay ? '<div class="first-day-banner">대림절이 시작됐어요 · 첫째 초</div>' : ''}
        <div class="done-star">${Art.bigStar(before / total, 150)}</div>
        <div class="done-title">${first ? '별이 조금 더 밝아졌어' : '다시 보기 끝'}</div>
        <div class="done-sub">별빛 ${after} / ${total}${first ? ` · 카드 No.${Card.cardNo(ep.id)} 획득` : ''}${gemLine ? `<br><span class="gem-line">${esc(gemLine)}</span>` : ''}</div>
        ${fieldOpen ? `<button class="btn" data-v="field">🐑 ${esc(fieldLabel)}</button>` : ''}
        ${chapterGuest ? '<p class="done-field-guest">🐑 들판에 손님이 찾아왔어</p>' : ''}
        ${skyLine()}
        ${newBadges.length ? `<div class="new-badges">${newBadges.map(b => `<div class="nb"><span>${b.icon}</span><b>${esc(b.name)}</b><small>새 배지</small><button class="btn ghost small" data-badge="${b.id}">카드 보기</button></div>`).join('')}</div>` : ''}
        ${nextLine}
        <button class="btn${fieldOpen ? ' ghost' : ''}" data-v="card">인증 카드 보기</button>
        ${nextOpen ? `<button class="btn ghost next-go" data-v="next">다음 편 이어서 ▶ 「${esc(nx.title)}」</button>` : ''}
        <button class="btn ghost" data-v="home">홈으로</button>
      </div>`, 'center full');
    setTimeout(() => {
      if (my !== runId || !ov.isConnected) return;
      if (firstDay) Fx.burst(ov, 50, 27, 45);
      Sound.sfx('star');
      if (newBadges.length) setTimeout(() => Sound.sfx('badge'), 900);
      const box = ov.querySelector('.done-star');
      if (box) box.innerHTML = Art.bigStar(after / total, 150);
      box && box.classList.add('pulse');
    }, 700);
    const finishedId = ep.id;
    ov.querySelector('[data-v=field]')?.addEventListener('click', () => Field.page({ tonight: finishedId }));
    ov.querySelector('[data-v=card]').onclick = () => App.card(finishedId);
    ov.querySelectorAll('[data-badge]').forEach(button => { button.onclick = () => App.card('B:' + button.dataset.badge); });
    if (ep.id === 'end') {
      const fin = document.createElement('button');
      fin.className = 'btn ghost finale-go'; fin.textContent = '🌟 27일의 기록 보기';
      fin.onclick = () => App.finale();
      (ov.querySelector('[data-v=field]') || ov.querySelector('.done-sub')).after(fin);
    }
    ov.querySelector('[data-v=home]').onclick = () => App.home({ top: true });
    const nb = ov.querySelector('[data-v=next]'); if (nb) nb.onclick = () => App.go(nx.id);
  }

  /* ---------- 시작 ---------- */
  async function play(id) {
    const my = ++runId;
    typing = null;
    tapWait = null;
    ep = Core.epById(id);
    dialogueCount = 0; backlog = [];
    meteorAt = id === '0' || window.__fast ? 0 : 4 + Math.floor(Math.random() * 5);
    replay = !!Core.data.done[id];
    if (replay) setTimeout(() => toast('다시 보기 · 글자가 한 번에 나와요'), 900);
    Art.setChapter(ep.ch);
    const src = window.STORY[id];
    const root = document.getElementById('play');
    mount(root);
    mode = 'normal'; chatMe = ''; voiceUntil = 0; voicedCard = false;
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
    steps.filter(s => s.t === 'verse').forEach(s => { const n = (window.NARR || {})[s.ref.split('·')[0].trim()]; if (n) Sound.preload(n); });
    updateGemHud();
    // 대본에 '묵상:'이 따로 없으면 맨 끝에 말씀 묵상을 넣는다
    if (ep.read && !steps.some(s => s.t === 'meditate')) {
      const lamb = steps.findIndex(s => s.t === 'lamb');
      steps.splice(lamb < 0 ? steps.length : lamb, 0, { t: 'meditate' });
    }
    // 첫 장면을 미리 깔아 둔다
    const firstScene = steps.find(s => s.t === 'scene');
    if (firstScene) { el.scene.innerHTML = Art.render(firstScene.name); requestAnimationFrame(() => Fx.set(firstScene.name)); Sound.ambience(firstScene.name); }
    clearDialog('');

    let checked = false;
    const prev = Core.prevEpisode(id);
    const needCheck = prev && Core.data.mission[prev.id] && !Core.data.missionAns[prev.id];

    // 지난번에 중간에 나갔으면, 마지막 장면부터 이어서 할지 묻는다
    let start = 0;
    const R = Core.data.resume;
    if (R && R.id === id && R.i > 0 && R.i < steps.length && !window.__fast) {
      const go = await new Promise(res => {
        const ov = showOverlay(`
          <div class="card">
            <div class="done-title" style="font-size:19px">지난번에 여기까지 봤어</div>
            <div class="done-sub">마지막 장면부터 이어서 할까?</div>
            <div class="row"><button class="btn ghost" data-v="0">처음부터</button><button class="btn" data-v="1">이어서 하기</button></div>
          </div>`, 'center');
        ov.querySelectorAll('button').forEach(b => b.onclick = () => { hideOverlay(); res(b.dataset.v === '1'); });
      });
      if (my !== runId) return;
      if (go) {
        start = R.i;
        const lastMode = steps.slice(0, start).filter(x => x.t === 'mode').pop();
        if (lastMode && lastMode.mode !== 'normal') await run.mode(lastMode);
        checked = true;
      }
    }
    for (let si = start; si < steps.length; si++) {
      const s = steps[si];
      if (my !== runId) return;
      if (s.t === 'scene' && si > 0 && steps.slice(0, si).some(x => x.t === 'scene')) { Core.data.resume = { id, i: si }; Core.save(); }
      // 표제 다음, 첫 장면이 깔린 뒤에 지난 미션을 묻는다
      if (needCheck && !checked && s.t !== 'title' && s.t !== 'scene') {
        checked = true;
        await missionCheck(prev);
        if (my !== runId) return;
      }
      if (window.__fast) window.__step = s;
      if (s.t === 'explore') await explore(s, my);
      else if (run[s.t]) await run[s.t](s, my);
    }
    if (my === runId) {
      if (mode === 'chat') chatClose(); mode = 'normal'; el.root.classList.remove('m-movie');
      if (Core.data.resume && Core.data.resume.id === id) { delete Core.data.resume; Core.save(); }
      complete(my);
    }
  }

  window.Player = { play, toast };
})();
