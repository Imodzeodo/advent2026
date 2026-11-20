/* 세로 화면 오프닝 예고편 */
(function () {
  const scenes = [
    ['밤하늘', 0, '사백 년 동안, 하늘은 조용했다.', 4400],
    ['성전', 1, '늙은 제사장은 대답 없는 기도를 드렸고,', 4400, { actor: '사가랴', ground: '#5c3c45', pan: '-1.4%' }],
    ['작업장', 2, '한 목수는 말 못 할 고민을 품었고,', 4400, { actor: '요셉', ground: '#5a4234', pan: '1.6%' }],
    ['마리아집', 3, "갈릴리의 한 소녀는 '네'라고 대답했다.", 4400, { actor: '마리아', ground: '#d8c09a', pan: '-1.6%' }],
    ['들판', 4, '그리고 들판의 목동들은, 그 밤을 보았다.', 4400, { actor: '할아버지', ground: '#141a2a', pan: '1.4%' }],
    ['초', 0, '스물일곱 밤.', 5600],
    ['제목', 0, '', 3400]
  ];
  let playing;
  let soundUnlocked = false;

  function countdown() {
    const today = Core.nowKST().date;
    let opening = Date.UTC(2026, 10, 29);
    if (window.SITE?.relative) {
      const year = Number(today.slice(0, 4));
      const nov27 = Date.UTC(year, 10, 27);
      const untilSunday = (7 - new Date(nov27).getUTCDay()) % 7;
      opening = nov27 + untilSunday * 86400000;
    }
    const days = Math.round((opening - Date.parse(today)) / 86400000);
    return days > 0 ? 'D-' + days : '지금 시작';
  }

  function candles() {
    const colors = ['#5b2a9a', '#9b7bd4', '#f2b8cf', '#f7f4ee'];
    const columns = colors.map((color, i) => {
      const x = 60 + i * 51;
      const y = 208 + i * 11;
      return `<g transform="translate(${x},${y})"><rect x="-13" width="26" height="${110 - i * 11}" rx="5" fill="${color}" stroke="${i === 3 ? '#aaa6a6' : '#edd8ff'}" stroke-opacity=".65"/>
        <path d="M0 0v-10" stroke="#302237" stroke-width="2.4"/>
        <g class="tr-flame" style="--light:${.3 + i * .63}s"><circle cy="-18" r="46" fill="url(#tr-candle-glow)"/>
        <path d="M0-35q23 23 0 29q-19-2 0-29z" fill="#ffad56"/><path d="M0-25q10 13 0 17q-9-1 0-17z" fill="#fff1ad"/></g></g>`;
    }).join('');
    return `<svg viewBox="0 0 275 390" aria-hidden="true">
      <defs><radialGradient id="tr-candle-glow"><stop stop-color="#ffd792" stop-opacity=".43"/><stop offset="1" stop-color="#ffd792" stop-opacity="0"/></radialGradient></defs>
      <ellipse cx="136" cy="322" rx="121" ry="19" fill="#050611"/>
      <path d="M18 322Q137 292 254 322Q182 358 18 322Z" fill="#334b47"/>
      ${columns}
      <path d="M23 323q58-5 108 13q-58 3-108-13zm229 1q-58-5-108 13q58 3 108-13z" fill="#597265"/>
      <path d="M38 330q15-9 27-6m11 13q13-12 27-8m73 11q-10-11-21-9m43 5q-10-11-22-8m45-1q-10-9-21-7" fill="none" stroke="#82947b" stroke-width="4" stroke-linecap="round"/>
    </svg>`;
  }

  function framePortrait(frame, { actor, ground, pan }) {
    const svg = frame.querySelector('.tr-art svg');
    const subject = svg.querySelector(`[data-who="${actor}"]`);
    if (!subject || !frame.clientHeight) return;

    const body = subject.getBBox();
    const { width: sceneWidth, height: sceneHeight } = svg.viewBox.baseVal;
    const height = 350;
    const width = Math.min(sceneWidth, height * frame.clientWidth / frame.clientHeight);
    const x = Math.min(sceneWidth - width, Math.max(0, body.x + body.width / 2 - width / 2));
    const y = body.y + body.height / 2 - height * .6;
    if (y + height > sceneHeight) {
      // 원본 장면의 바닥색을 이어서 가까운 구도에서도 화면 아래를 채운다.
      const floor = document.createElementNS(svg.namespaceURI, 'rect');
      floor.setAttribute('y', sceneHeight - 1);
      floor.setAttribute('width', sceneWidth);
      floor.setAttribute('height', y + height - sceneHeight + 1);
      floor.setAttribute('fill', ground);
      svg.appendChild(floor);
    }
    svg.setAttribute('viewBox', `${x} ${y} ${width} ${height}`);
    frame.style.setProperty('--portrait-pan', pan);
    frame.classList.add('tr-portrait');
    const dust = Array.from({ length: 15 }, (_, i) => `<i style="--x:${8 + i * 29 % 85}%;--y:${9 + i * 17 % 30}%;--size:${i % 5 === 0 ? 3 : 1.5 + i % 3 * .35}px;--phase:${-i * .41}s"></i>`);
    frame.insertAdjacentHTML('beforeend', `<div class="tr-dust" aria-hidden="true">${dust.join('')}</div>`);
  }

  function play({ fromStart = false } = {}) {
    if (playing) return playing;
    if (window.__fast) return Promise.resolve();
    playing = new Promise(resolve => {
      const previous = document.activeElement;
      const dialog = document.createElement('dialog');
      dialog.className = 'tr-overlay';
      dialog.setAttribute('aria-label', '그 밤을 향하여 예고편');
      dialog.innerHTML = `<section class="tr-stage">
        <button type="button" class="tr-skip">건너뛰기</button>
        <div class="tr-progress" aria-hidden="true">${scenes.map(() => '<span></span>').join('')}</div>
        <div class="tr-frame"></div></section>`;
      const frame = dialog.querySelector('.tr-frame');
      const segments = [...dialog.querySelectorAll('.tr-progress span')];
      let sceneTimer;
      let voiceTimer;
      let started = false;
      let finished = false;

      function finish() {
        if (finished) return;
        finished = true;
        clearTimeout(sceneTimer);
        clearTimeout(voiceTimer);
        if (started) {
          Sound.stopVoice();
          Sound.music('night');
        }
        if (dialog.open) dialog.close();
        dialog.remove();
        if (!fromStart && previous?.isConnected) previous.focus({ preventScroll: true });
        resolve();
      }

      function show(i) {
        const [scene, chapter, caption, duration, portrait] = scenes[i];
        const shownAt = performance.now();
        const isTitle = scene === '제목';
        const isCandles = scene === '초';
        Art.setChapter(chapter);
        const art = isCandles ? candles() : Art.render(isTitle ? '밤하늘' : scene);
        frame.className = `tr-frame ${isCandles ? 'tr-candles' : isTitle ? 'tr-finale' : 'tr-scene'} tr-scene-${i + 1}`;
        frame.style.setProperty('--duration', duration + 'ms');
        frame.innerHTML = `<div class="tr-art">${art}</div><div class="tr-shade"></div>`;
        if (portrait) framePortrait(frame, portrait);
        if (isTitle) {
          frame.insertAdjacentHTML('beforeend', `<div class="tr-title"><h1>그 밤을<br>향하여</h1><p></p>
            <button type="button" class="btn">시작하기</button></div>`);
          const label = frame.querySelector('.tr-title p');
          label.textContent = window.SITE?.label || '';
          label.hidden = !label.textContent;
          frame.querySelector('button').onclick = finish;
        } else {
          frame.insertAdjacentHTML('beforeend', `<div class="tr-caption" role="status"><p></p>${isCandles ? '<strong></strong>' : ''}</div>`);
          frame.querySelector('.tr-caption p').textContent = caption;
          if (isCandles) frame.querySelector('.tr-caption strong').textContent = countdown();
          voiceTimer = setTimeout(async () => {
            const length = await Sound.voice('tr-' + (i + 1)).catch(() => null);
            if (!length || finished || !frame.classList.contains('tr-scene-' + (i + 1))) return;
            const required = performance.now() - shownAt + length * 1000 + 290;
            if (required <= duration) return;
            clearTimeout(sceneTimer);
            frame.style.setProperty('--duration', required + 'ms');
            segments[i].style.setProperty('--duration', required + 'ms');
            sceneTimer = setTimeout(() => show(i + 1), required - (performance.now() - shownAt));
          }, 120);
        }
        for (const [index, segment] of segments.entries()) {
          segment.className = index < i ? 'seen' : index === i ? 'current' : '';
          segment.style.setProperty('--duration', duration + 'ms');
        }
        sceneTimer = setTimeout(isTitle ? finish : () => show(i + 1), duration);
      }

      function start() {
        if (started) return;
        started = true;
        soundUnlocked = true;
        Sound.ambience(null);
        Sound.stopVoice();
        Sound.music('veni');
        for (let i = 1; i <= 6; i++) Sound.preload('tr-' + i).catch(() => {});
        show(0);
        dialog.querySelector('.tr-skip').focus({ preventScroll: true });
      }

      dialog.addEventListener('cancel', event => { event.preventDefault(); finish(); });
      dialog.addEventListener('close', finish, { once: true });
      dialog.querySelector('.tr-skip').onclick = finish;
      document.body.append(dialog);
      dialog.showModal();
      if (soundUnlocked) start();
      else {
        frame.classList.add('tr-wake');
        frame.innerHTML = `<div class="tr-art">${Art.render('밤하늘')}</div><div class="tr-shade"></div>
          <div class="tr-wake-copy"><h1>그 밤을 향하여</h1><button type="button" class="btn" autofocus>▶ 눌러서 시작</button></div>`;
        const wake = frame.querySelector('button');
        wake.onclick = start;
        wake.focus({ preventScroll: true });
      }
    }).finally(() => { playing = null; });
    return playing;
  }

  window.Trailer = { play };
})();
