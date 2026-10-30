/* 미니게임. 각 게임은 (box, api) 를 받아 끝나면 api.done() 을 부른다.
   api.say(who, text) 로 대사창에 짧은 반응을 띄울 수 있다. */
(function () {
  const G = {};

  /* ---- A. 길게 누르기: 등불 켜기 ---- */
  G['등불'] = (box, api) => {
    box.innerHTML = `
      <div class="game-title">등불 받기</div>
      <div class="game-help">등잔을 <b>꾹 누르고</b> 있으면 불이 붙어요</div>
      <div class="hold-wrap">
        <svg viewBox="-80 -110 160 150" class="hold-lamp">
          <defs>${Art.LAMP_DEF}</defs>
          <circle id="hl-glow" cx="10" cy="-30" r="70" fill="url(#lampglow)" opacity="0"/>
          <path d="M-40,0 Q-40,-28 0,-28 Q34,-28 56,-46 L62,-34 Q44,-10 16,0 Z" fill="#8a5a3a"/>
          <ellipse cx="-6" cy="-22" rx="18" ry="5" fill="#4a2e1e"/>
          <g id="hl-flame" transform="translate(58,-42) scale(0)">
            <path d="M0,0 Q-14,-26 2,-50 Q18,-26 4,0 Z" fill="#ffcf6b"/>
            <path d="M1,-2 Q-5,-16 2,-30 Q9,-16 3,-2 Z" fill="#fff4cf"/>
          </g>
        </svg>
        <div class="hold-bar"><i id="hl-bar"></i></div>
      </div>`;
    const lamp = box.querySelector('.hold-lamp');
    const flame = box.querySelector('#hl-flame');
    const glow = box.querySelector('#hl-glow');
    const bar = box.querySelector('#hl-bar');
    let p = 0, holding = false, last = 0, finished = false;
    const down = e => { e.preventDefault(); holding = true; lamp.classList.add('pressing'); };
    const up = () => { holding = false; lamp.classList.remove('pressing'); };
    lamp.addEventListener('pointerdown', down);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    const timer = setInterval(() => {
      if (finished) return;
      const now = performance.now();
      const dt = last ? Math.min(80, now - last) / 1000 : 0; last = now;
      p += holding ? dt / 1.6 : -dt / 3;
      p = Math.max(0, Math.min(1, p));
      flame.setAttribute('transform', `translate(58,-42) scale(${(p * 1.1).toFixed(3)})`);
      glow.setAttribute('opacity', (p * 0.9).toFixed(3));
      bar.style.width = (p * 100) + '%';
      if (p >= 1) {
        finished = true;
        clearInterval(timer);
        window.removeEventListener('pointerup', up);
        window.removeEventListener('pointercancel', up);
        lamp.classList.add('lit');
        Sound.sfx('ignite');
        box.querySelector('.game-help').textContent = '불이 붙었어요!';
        if (navigator.vibrate) navigator.vibrate(30);
        setTimeout(api.done, 1100);
      }
    }, 30);
  };

  /* ---- C. 고르기: 짐 꾸리기 ---- */
  const ICON = {
    옷: `<path d="M-18,-20 L-6,-24 Q0,-18 6,-24 L18,-20 L24,-6 L14,-2 L14,22 L-14,22 L-14,-2 L-24,-6 Z" fill="#f2ede2" stroke="#b9ab92" stroke-width="2"/>`,
    빵: `<ellipse cx="0" cy="4" rx="22" ry="14" fill="#c98b4a"/><path d="M-12,-2 Q-8,-8 -4,-2 M0,-4 Q4,-10 8,-4" stroke="#8a5525" stroke-width="2" fill="none"/>`,
    물: `<path d="M-14,-14 Q-20,10 -8,20 L8,20 Q20,10 14,-14 Q6,-20 -2,-16 L-4,-24 L4,-24 L2,-16 Q-8,-20 -14,-14 Z" fill="#7a5233"/><path d="M-8,-8 Q-12,8 -4,14" stroke="#a87650" stroke-width="3" fill="none"/>`,
    지팡이: `<path d="M-4,24 L4,-14 Q8,-26 16,-22 Q22,-18 14,-12" stroke="#7a5533" stroke-width="5" stroke-linecap="round" fill="none"/>`,
    기름: `<path d="M-10,-18 L10,-18 L8,-12 Q18,-4 16,10 Q14,22 0,22 Q-14,22 -16,10 Q-18,-4 -8,-12 Z" fill="#9b6a43"/><rect x="-6" y="-24" width="12" height="7" rx="2" fill="#6b4529"/><path d="M-10,4 L10,4" stroke="#d7b07a" stroke-width="2"/>`,
    폰: `<rect x="-12" y="-22" width="24" height="44" rx="5" fill="#222"/><rect x="-9" y="-17" width="18" height="32" rx="2" fill="#5fa8ff"/><circle cx="0" cy="18" r="1.6" fill="#666"/>`
  };
  G['짐꾸리기'] = (box, api) => {
    const items = [
      { k: '옷', name: '세마포 옷', ok: true, line: '성전에서 입는 옷이다. 이게 없으면 들어가지도 못하지.' },
      { k: '빵', name: '보리빵', ok: true, line: '엘리사벳이 구운 빵이구나. 길에서 나눠 먹자.' },
      { k: '폰', name: '???', ok: false, line: '…이건 뭐냐? 반짝이는 납작한 돌? 두고 가자. 2천 년쯤 뒤에 쓰렴.' },
      { k: '물', name: '물 가죽부대', ok: true, line: '산길이 길다. 물은 꼭 챙겨야지.' },
      { k: '지팡이', name: '지팡이', ok: true, line: '내 무릎이 고마워할 거다.' },
      { k: '기름', name: '등잔 기름', ok: true, line: '불은 꺼뜨리지 말아야지. 문지기니까.' }
    ];
    const need = items.filter(i => i.ok).length;
    let packed = 0, busy = false;
    box.innerHTML = `
      <div class="game-title">짐 꾸리기</div>
      <div class="game-help">성전에서 한 주를 지낼 짐을 골라 보자 <b id="pk-n">0 / ${need}</b></div>
      <div class="pack-grid">${items.map((it, i) => `
        <button class="pack-item" data-i="${i}">
          <svg viewBox="-30 -30 60 60">${ICON[it.k]}</svg><span>${it.name}</span>
        </button>`).join('')}
      </div>
      <div class="pack-bag"><svg viewBox="-60 -40 120 80"><path d="M-46,-14 Q-50,30 -30,36 L30,36 Q50,30 46,-14 Q20,-24 0,-22 Q-20,-24 -46,-14 Z" fill="#6f4c33"/><path d="M-20,-20 Q0,-38 20,-20" stroke="#4d3322" stroke-width="5" fill="none"/></svg></div>`;
    box.querySelectorAll('.pack-item').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (busy || btn.classList.contains('gone')) return;
        const it = items[btn.dataset.i];
        busy = true;
        if (it.ok) {
          btn.classList.add('gone');
          packed++;
          box.querySelector('#pk-n').textContent = `${packed} / ${need}`;
          Sound.sfx('pop');
          if (navigator.vibrate) navigator.vibrate(15);
        } else {
          Sound.sfx('boop');
          btn.classList.add('shake');
          setTimeout(() => btn.classList.remove('shake'), 500);
        }
        await api.say('사가랴', it.line);
        busy = false;
        if (!it.ok) btn.classList.add('gone');
        if (packed >= need) setTimeout(api.done, 300);
      });
    });
  };

  /* ---- 흔들기: 제비 항아리 ---- */
  G['제비'] = (box, api) => {
    const needPerm = typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function';
    box.innerHTML = `
      <div class="game-title">제비 뽑기</div>
      <div class="game-help">폰을 <b>흔들어서</b> 항아리 속 제비를 섞어 봐</div>
      <svg viewBox="-80 -100 160 170" class="jar">
        <g class="jar-body">
          <path d="M-34,-70 L34,-70 L30,-58 Q60,-30 56,10 Q52,52 0,56 Q-52,52 -56,10 Q-60,-30 -30,-58 Z" fill="#9b6a43"/>
          <path d="M-36,-76 L36,-76 L34,-66 L-34,-66 Z" fill="#6b4529"/>
          <path d="M-40,-10 Q0,4 40,-10" stroke="#c99a6a" stroke-width="4" fill="none"/>
          <path d="M-44,14 Q0,28 44,14" stroke="#c99a6a" stroke-width="3" fill="none" opacity=".7"/>
          <g class="jar-stones"><ellipse cx="-14" cy="-68" rx="9" ry="6" fill="#d9d2c2"/><ellipse cx="6" cy="-71" rx="8" ry="5.5" fill="#cfc6b3"/><ellipse cx="20" cy="-67" rx="7" ry="5" fill="#e3ddd0"/></g>
        </g>
        <g class="lot" opacity="0">
          <ellipse cx="0" cy="0" rx="34" ry="20" fill="#efe9dc" stroke="#b9ab92" stroke-width="2"/>
          <text x="0" y="6" text-anchor="middle" font-size="17" font-weight="700" fill="#5a3a1a">사가랴</text>
        </g>
      </svg>
      <div class="hold-bar"><i class="sh-bar"></i></div>
      ${needPerm ? `<button class="btn small sh-perm">흔들기 켜기</button>` : ''}
      <div class="game-sub">흔들기가 안 되면 항아리를 여러 번 톡톡 눌러도 돼</div>`;
    const jar = box.querySelector('.jar'), bar = box.querySelector('.sh-bar');
    let p = 0, done = false, lastShake = 0, last = null;
    const bump = amt => {
      if (done) return;
      p = Math.min(1, p + amt);
      bar.style.width = (p * 100) + '%';
      jar.classList.remove('wobble'); void jar.getBoundingClientRect(); jar.classList.add('wobble');
      Sound.sfx('tap');
      if (navigator.vibrate) navigator.vibrate(12);
      if (p >= 1) finish();
    };
    function onMotion(e) {
      const a = e.accelerationIncludingGravity || e.acceleration;
      if (!a || a.x == null) return;
      if (last) {
        const d = Math.abs(a.x - last.x) + Math.abs(a.y - last.y) + Math.abs(a.z - last.z);
        const now = Date.now();
        if (d > 16 && now - lastShake > 140) { lastShake = now; bump(0.1); }
      }
      last = { x: a.x, y: a.y, z: a.z };
    }
    function listen() { window.addEventListener('devicemotion', onMotion); }
    if (needPerm) {
      box.querySelector('.sh-perm').onclick = e => {
        e.currentTarget.remove();
        DeviceMotionEvent.requestPermission().then(st => { if (st === 'granted') listen(); }).catch(() => {});
      };
    } else listen();
    jar.addEventListener('click', () => bump(0.09));
    function finish() {
      done = true;
      window.removeEventListener('devicemotion', onMotion);
      jar.classList.add('out');
      box.querySelector('.game-help').textContent = '돌 하나가 튀어나왔다!';
      Sound.sfx('star');
      if (navigator.vibrate) navigator.vibrate([30, 40, 60]);
      setTimeout(api.done, 1800);
    }
  };

  const head = (title, help) => `<div class="game-title">${title}</div><div class="game-help">${help}</div>`;
  const rnd = (a, b) => a + Math.random() * (b - a);

  /* ---- 톡톡: 화면에 흩어진 것들을 눌러 모으기 (여러 장면에서 씀) ---- */
  const TAP = {
    양세기: { title: '양 세기', help: '흩어진 양을 눌러 우리로 들여보내자', icon: '🐑', n: 6, hits: 1, sfx: 'sheep', field: 'field', end: '양 여섯 마리, 다 들어왔다!' },
    못박기: { title: '문 달기', help: '못을 한 개씩 여러 번 톡톡 박아 줘', icon: '📍', n: 3, hits: 3, sfx: 'hammer', field: 'wood', end: '문이 달렸다!' },
    씨뿌리기: { title: '씨 뿌리기', help: '밭 여기저기를 눌러 씨를 심어 봐', icon: '🌱', n: 5, hits: 1, sfx: 'pop', field: 'soil', end: '언젠가 거둘 날이 온다.' },
    빛따라: { title: '빛 따라가기', help: '하나씩 나타나는 빛을 눌러 따라가 봐', icon: '✨', n: 7, hits: 1, sfx: 'gem', field: 'dream', seq: true, end: '빛이 한 이름을 비춘다.' },
    장작: { title: '불 지키기', help: '불이 꺼지지 않게 장작을 눌러 넣어 줘', icon: '🪵', n: 6, hits: 1, sfx: 'fire', field: 'night', end: '불이 다시 환해졌다.' }
  };
  G['톡톡'] = (box, api, arg) => {
    const P = TAP[arg] || TAP.양세기;
    box.innerHTML = head(P.title, P.help) + `<div class="tap-field f-${P.field}"><div class="tap-goal"></div></div><div class="hold-bar"><i></i></div>`;
    const field = box.querySelector('.tap-field'), bar = box.querySelector('.hold-bar i');
    let left = P.n, shown = 0;
    const used = [];
    const place = () => {
      let best = null, bestD = -1;
      for (let k = 0; k < 40; k++) {
        const c = { x: rnd(12, 88), y: rnd(16, 80) };
        const d = used.length ? Math.min(...used.map(u => Math.hypot((u.x - c.x) * 1.4, u.y - c.y))) : 99;
        if (d > bestD) { best = c; bestD = d; }
        if (d > 22) break;
      }
      used.push(best); return best;
    };
    const spawn = () => {
      const b = document.createElement('button');
      b.className = 'tap-it'; b.textContent = P.icon; b.dataset.hp = P.hits;
      const p = place(); b.style.left = p.x + '%'; b.style.top = p.y + '%';
      b.onclick = () => {
        b.dataset.hp--; Sound.sfx(P.sfx); if (navigator.vibrate) navigator.vibrate(12);
        b.classList.remove('hit'); void b.offsetWidth; b.classList.add('hit');
        if (+b.dataset.hp > 0) return;
        b.classList.add('done'); b.disabled = true; left--;
        bar.style.width = ((P.n - left) / P.n * 100) + '%';
        if (P.seq && shown < P.n) spawn();
        if (!left) { box.querySelector('.game-help').textContent = P.end; setTimeout(api.done, 1000); }
      };
      field.appendChild(b); shown++;
    };
    if (P.seq) spawn(); else for (let i = 0; i < P.n; i++) spawn();
  };

  /* ---- 손가락으로 따라 쓰기 (서판) ---- */
  G['따라쓰기'] = (box, api, word) => {
    word = word || '요한';
    box.innerHTML = head('서판에 쓰기', `손가락으로 <b>${word}</b>를 따라 써 봐`) +
      `<div class="tablet"><canvas width="600" height="300"></canvas></div><div class="hold-bar"><i></i></div><button class="btn small ghost tr-skip" hidden>다 썼어</button>`;
    const cv = box.querySelector('canvas'), ctx = cv.getContext('2d'), bar = box.querySelector('.hold-bar i');
    const font = `700 ${word.length > 3 ? 120 : 170}px "Gowun Batang", serif`;
    ctx.fillStyle = '#d8c9a4'; ctx.fillRect(0, 0, 600, 300);
    ctx.font = font; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(80,55,25,.22)'; ctx.fillText(word, 300, 160);
    // 글자 모양 위의 점들을 목표로 삼는다
    const mask = document.createElement('canvas'); mask.width = 600; mask.height = 300;
    const mx = mask.getContext('2d'); mx.font = font; mx.textAlign = 'center'; mx.textBaseline = 'middle'; mx.fillStyle = '#000'; mx.fillText(word, 300, 160);
    const px = mx.getImageData(0, 0, 600, 300).data, targets = [];
    for (let y = 4; y < 300; y += 9) for (let x = 4; x < 600; x += 9) if (px[(y * 600 + x) * 4 + 3] > 120) targets.push({ x, y, hit: false });
    let hits = 0, drawing = false, lastP = null, finished = false;
    const need = Math.ceil(targets.length * 0.55);
    const pos = e => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * 600, y: (e.clientY - r.top) / r.height * 300 }; };
    const mark = (a, b) => {
      const steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 6));
      for (let k = 0; k <= steps; k++) {
        const x = a.x + (b.x - a.x) * k / steps, y = a.y + (b.y - a.y) * k / steps;
        for (const t of targets) if (!t.hit && (t.x - x) ** 2 + (t.y - y) ** 2 < 15 * 15) { t.hit = true; hits++; }
      }
      bar.style.width = Math.min(100, hits / need * 100) + '%';
      if (hits >= need) done();
    };
    cv.addEventListener('pointerdown', e => { drawing = true; lastP = pos(e); cv.setPointerCapture(e.pointerId); e.preventDefault(); mark(lastP, lastP); });
    cv.addEventListener('pointermove', e => {
      if (!drawing || finished) return;
      const p = pos(e);
      ctx.strokeStyle = '#3a2410'; ctx.lineWidth = 14; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(lastP.x, lastP.y); ctx.lineTo(p.x, p.y); ctx.stroke();
      mark(lastP, p); lastP = p;
      if (Math.random() < 0.08) Sound.sfx('plane');
    });
    cv.addEventListener('pointerup', () => { drawing = false; });
    // 6초 뒤 '다 썼어' 버튼
    const skip = box.querySelector('.tr-skip');
    setTimeout(() => { if (!finished) skip.hidden = false; }, 6000);
    skip.onclick = () => done();
    function done() {
      if (finished) return; finished = true;
      ctx.fillStyle = 'rgba(58,36,16,.9)'; ctx.font = font; ctx.fillText(word, 300, 160);
      Sound.sfx('gem'); box.querySelector('.game-help').textContent = '서판에 적었다.';
      setTimeout(api.done, 1000);
    }
  };

  /* ---- 어둠 속 등불로 찾기 ---- */
  G['어둠찾기'] = (box, api, what) => {
    const icon = what === '문' ? '🚪' : '🐑';
    const R = Math.min(120, 64 + (Core.data.oil || 0) * 5);
    box.innerHTML = head(what === '문' ? '베들레헴 가는 길' : '잃은 양 찾기', `손가락으로 어둠을 비춰 봐 <small>(등불 기름 ${Core.data.oil || 0}방울만큼 밝아)</small>`) +
      `<div class="dark-field"><span class="dark-target">${icon}</span><div class="dark-mask"></div></div>`;
    const f = box.querySelector('.dark-field'), m = box.querySelector('.dark-mask'), t = box.querySelector('.dark-target');
    // 처음 불빛(아래 가운데)과 멀리, 위쪽 좌우 어딘가에 숨긴다
    const tx = Math.random() < 0.5 ? rnd(10, 35) : rnd(65, 90), ty = rnd(12, 48);
    t.style.left = tx + '%'; t.style.top = ty + '%';
    let found = false, near = 0;
    const light = (x, y, r) => { m.style.background = `radial-gradient(circle ${r || R}px at ${x}px ${y}px, transparent 0, transparent 45%, rgba(3,4,12,.97) 100%)`; };
    // 시작할 땐 발밑만 희미하게
    requestAnimationFrame(() => light(f.clientWidth / 2, f.clientHeight * 0.95, R * 0.55));
    light(f.clientWidth / 2 || 160, (f.clientHeight || 300) * 0.95, R * 0.55);
    f.addEventListener('pointermove', e => move(e));
    f.addEventListener('pointerdown', e => move(e));
    function move(e) {
      if (found) return;
      const r = f.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      light(x, y);
      const d = Math.hypot(x - r.width * tx / 100, y - r.height * ty / 100);
      if (d < R * 0.5) { near++; if (near > 8) win(); }
    }
    t.addEventListener('click', win);
    function win() {
      if (found) return; found = true;
      m.style.transition = 'opacity 1s'; m.style.opacity = '0.15';
      t.classList.add('found'); Sound.sfx(icon === '🐑' ? 'sheep' : 'star');
      box.querySelector('.game-help').textContent = icon === '🐑' ? '찾았다! 떨고 있던 새끼 양.' : '저기다! 불빛이 새어 나오는 곳.';
      setTimeout(api.done, 1500);
    }
  };

  /* ---- 리듬: 커지는 원에 맞춰 톡 ---- */
  G['리듬'] = (box, api) => {
    box.innerHTML = head('뛰노는 아이', '원이 꽉 찰 때 톡! 배 속 아기처럼 콩콩') + `<div class="rhythm"><div class="r-ring"></div><button class="r-dot">💓</button></div><div class="r-score">0 / 8</div>`;
    const dot = box.querySelector('.r-dot'), ring = box.querySelector('.r-ring');
    let beat = 0, hits = 0, start = performance.now();
    const period = 900;
    const timer = setInterval(() => {
      const ph = ((performance.now() - start) % period) / period;
      ring.style.transform = `scale(${0.4 + ph * 0.9})`; ring.style.opacity = 1 - ph * 0.4;
    }, 30);
    dot.onclick = () => {
      const ph = ((performance.now() - start) % period) / period;
      const good = ph > 0.7 || ph < 0.12;
      beat++; if (good) hits++;
      Sound.sfx(good ? 'heart' : 'tap');
      dot.classList.remove('pop'); void dot.offsetWidth; dot.classList.add('pop');
      box.querySelector('.r-score').textContent = `${beat} / 8${good ? ' · 좋아!' : ''}`;
      if (beat >= 8) { clearInterval(timer); box.querySelector('.game-help').textContent = hits >= 5 ? '아기가 신나게 뛰논다!' : '콩, 콩. 아기가 대답했다!'; setTimeout(api.done, 1000); }
    };
  };

  /* ---- 뒤집기: 마리아의 노래 ---- */
  G['뒤집기'] = (box, api) => {
    const cards = [['교만한 자들', '흩으셨고'], ['권세 있는 자', '자리에서 내리치셨고'], ['비천한 자', '높이셨고'], ['주리는 자', '좋은 것으로 배불리셨고'], ['부자', '빈 손으로 보내셨도다']];
    box.innerHTML = head('뒤집힌 세상', '카드를 눌러 뒤집어 봐 (눅 1:51-53)') + `<div class="flips">${cards.map((c, i) => `<button class="flip" data-i="${i}"><span class="f-a">${c[0]}</span><span class="f-b">${c[0]}<br><b>${c[1]}</b></span></button>`).join('')}</div>`;
    let n = 0;
    box.querySelectorAll('.flip').forEach(b => b.onclick = () => {
      if (b.classList.contains('on')) return;
      b.classList.add('on'); n++; Sound.sfx('page');
      if (n === cards.length) { box.querySelector('.game-help').textContent = '하나님은 세상을 거꾸로 뒤집으신다.'; Sound.sfx('star'); setTimeout(api.done, 1400); }
    });
  };

  /* ---- 저울: 의와 자비 ---- */
  G['저울'] = (box, api) => {
    box.innerHTML = head('요셉의 저울', '양쪽에 돌을 올려 봐') + `
      <svg viewBox="-150 -110 300 170" class="scale"><rect x="-4" y="-80" width="8" height="120" fill="#a57c2e"/><rect x="-40" y="38" width="80" height="10" fill="#8a6520"/>
        <g class="beam"><rect x="-120" y="-84" width="240" height="6" fill="#d4ab4c"/>
          <g transform="translate(-110,-80)"><path d="M0,0 L-30,50 L30,50 Z" fill="none" stroke="#d4ab4c"/><ellipse cx="0" cy="52" rx="34" ry="8" fill="#d4ab4c"/><text y="78" text-anchor="middle" fill="#eee" font-size="15">율법 · 의</text><g class="pile l"></g></g>
          <g transform="translate(110,-80)"><path d="M0,0 L-30,50 L30,50 Z" fill="none" stroke="#d4ab4c"/><ellipse cx="0" cy="52" rx="34" ry="8" fill="#d4ab4c"/><text y="78" text-anchor="middle" fill="#eee" font-size="15">마리아 · 자비</text><g class="pile r"></g></g>
        </g></svg>
      <div class="row"><button class="btn ghost" data-s="l">⚖️ 율법 쪽</button><button class="btn ghost" data-s="r">🤍 자비 쪽</button></div>`;
    const beam = box.querySelector('.beam');
    let l = 0, r = 0, taps = 0;
    const lines = ['돌을 올릴수록 마음이 더 무거워진다.', '어느 쪽도 가볍게 내려놓을 수 없다.', '요셉은 오래도록 저울 앞에 서 있었다.'];
    box.querySelectorAll('[data-s]').forEach(btn => btn.onclick = () => {
      const side = btn.dataset.s; if (side === 'l') l++; else r++;
      taps++; Sound.sfx('thump');
      box.querySelector('.pile.' + side).insertAdjacentHTML('beforeend', `<ellipse cx="${rnd(-14, 14)}" cy="${44 - (side === 'l' ? l : r) * 7}" rx="10" ry="6" fill="#9a958c"/>`);
      beam.style.transform = `rotate(${Math.max(-12, Math.min(12, (r - l) * 4))}deg)`;
      box.querySelector('.game-help').textContent = lines[Math.min(lines.length - 1, Math.floor(taps / 2))];
      if (taps >= 6) setTimeout(api.done, 900);
    });
  };

  /* ---- 대패질: 좌우로 쓸기 ---- */
  G['대패'] = (box, api) => {
    box.innerHTML = head('대패질', '나무 위를 손가락으로 좌우로 쓱쓱 밀어 봐') + `<div class="plank"><div class="plane">🪚</div></div><div class="hold-bar"><i></i></div>`;
    const pl = box.querySelector('.plank'), bar = box.querySelector('.hold-bar i'), tool = box.querySelector('.plane');
    let lastX = null, dist = 0, done = false;
    pl.addEventListener('pointermove', e => {
      if (done) return;
      const r = pl.getBoundingClientRect(), x = e.clientX - r.left;
      tool.style.left = Math.max(0, Math.min(r.width - 40, x - 20)) + 'px';
      if (lastX != null) {
        dist += Math.abs(x - lastX);
        if (Math.random() < 0.15) { Sound.sfx('plane'); const c = document.createElement('i'); c.className = 'chip'; c.style.left = x + 'px'; pl.appendChild(c); setTimeout(() => c.remove(), 900); }
      }
      lastX = x;
      bar.style.width = Math.min(100, dist / 18) + '%';
      if (dist > 1800) { done = true; pl.classList.add('smooth'); box.querySelector('.game-help').textContent = '매끈해졌다. 둘이 살 방의 문틀이다.'; setTimeout(api.done, 1000); }
    });
    pl.addEventListener('pointerleave', () => { lastX = null; });
  };

  /* ---- 손짓: 말 못 하는 사가랴 ---- */
  G['손짓'] = (box, api) => {
    const rounds = [
      ['성소 안에서 무언가를 봤다', ['👀', '🙏', '☝️', '😴'], '사람들: "안에서 무엇을 보았나 봐!"'],
      ['말을 할 수가 없다', ['🤐', '🍞', '🏃', '🎶'], '사람들: "말을 못 하시는구나…"'],
      ['하나님이 하신 일이다', ['☝️', '💰', '🐑', '🤷'], '사람들: "하나님께서 무언가 하셨구나."']
    ];
    let k = 0;
    const show = () => {
      const [msg, opts] = rounds[k];
      box.innerHTML = head('손짓으로 말하기', `백성에게 전하자: <b>${msg}</b>`) + `<div class="gestures">${opts.map(o => `<button class="gst">${o}</button>`).join('')}</div>`;
      box.querySelectorAll('.gst').forEach(b => b.onclick = async () => {
        Sound.sfx('select');
        await api.say(null, rounds[k][2]);
        k++;
        if (k < rounds.length) show(); else api.done();
      });
    };
    show();
  };

  /* ---- 별 잇기 ---- */
  G['별잇기'] = (box, api) => {
    const pts = [[150, 30], [175, 95], [245, 100], [190, 140], [210, 210], [150, 170], [90, 210], [110, 140], [55, 100], [125, 95]];
    box.innerHTML = head('별 잇기', '1번부터 차례로 별을 눌러 이어 봐') + `<svg viewBox="0 0 300 240" class="constel"><polyline class="cl" points="" fill="none" stroke="#ffe3a3" stroke-width="2.5"/>${pts.map((p, i) => `<g class="cs" data-i="${i}"><circle cx="${p[0]}" cy="${p[1]}" r="16" fill="transparent"/><circle cx="${p[0]}" cy="${p[1]}" r="5" fill="#fff"/><text x="${p[0] + 9}" y="${p[1] - 8}" fill="#cfd6ff" font-size="11">${i + 1}</text></g>`).join('')}</svg>`;
    let n = 0, closed = false; const line = box.querySelector('.cl'), got = [];
    const help = box.querySelector('.game-help');
    box.querySelectorAll('.cs').forEach(g => g.addEventListener('click', () => {
      if (closed) return;
      const i = +g.dataset.i;
      // 10번까지 이은 뒤에는 1번을 눌러야 닫힌다
      const want = n < pts.length ? n : 0;
      if (i !== want) { Sound.sfx('tap'); return; }
      if (n < pts.length) { got.push(pts[n].join(',')); n++; g.classList.add('on'); Sound.sfx('gem'); }
      else { got.push(pts[0].join(',')); closed = true; }
      line.setAttribute('points', got.join(' '));
      if (n === pts.length && !closed) { help.innerHTML = '마지막으로 <b>1번 별</b>을 눌러 이어 줘'; box.querySelector('.cs[data-i="0"]').classList.add('again'); }
      if (closed) { help.textContent = '별 하나가 그려졌다.'; Sound.sfx('star'); setTimeout(api.done, 1200); }
    }));
  };

  /* ---- 엔딩: 모은 별빛 켜기 (길게 누르기) ---- */
  G['빛켜기'] = (box, api) => {
    const b = Core.starCount() / Core.starTotal();
    box.innerHTML = head('그 밤의 별', `별을 <b>꾹 누르고</b> 있어 봐. 네가 모은 별빛 ${Core.starCount()}/${Core.starTotal()}`) +
      `<div class="hold-wrap"><div class="finale-star">${Art.bigStar(0.05, 200)}</div><div class="hold-bar"><i></i></div></div>`;
    const st = box.querySelector('.finale-star'), bar = box.querySelector('.hold-bar i');
    let p = 0, holding = false, done = false, last = 0;
    st.addEventListener('pointerdown', e => { e.preventDefault(); holding = true; });
    const up = () => { holding = false; };
    window.addEventListener('pointerup', up);
    const timer = setInterval(() => {
      const now = performance.now(), dt = last ? Math.min(80, now - last) / 1000 : 0; last = now;
      p = Math.max(0, Math.min(1, p + (holding ? dt / 2.2 : -dt / 4)));
      bar.style.width = (p * 100) + '%';
      st.innerHTML = Art.bigStar(Math.max(0.05, p * Math.max(0.35, b)), 200);
      if (p >= 1 && !done) {
        done = true; clearInterval(timer); window.removeEventListener('pointerup', up);
        st.classList.add('pulse'); Sound.sfx('star'); setTimeout(() => Sound.sfx('angel'), 500);
        box.querySelector('.game-help').innerHTML = b >= 0.99 ? '모든 별빛이 켜졌다. 그 밤이 환하다.' : `네가 모은 별빛 ${Core.starCount()}개가 켜졌다. 그 밤을 비추기에 충분하다.`;
        setTimeout(api.done, 2200);
      }
    }, 40);
  };

  /* ---- 말씀 퍼즐: 흩어진 말씀 조각을 순서대로 눌러 맞추기 ---- */
  G['퍼즐'] = (box, api, ref) => {
    const text = Bible.verses(ref).map(v => v.text).join(' ');
    const words = text.split(/\s+/).filter(Boolean);
    const n = Math.max(4, Math.min(7, Math.round(words.length / 2.2)));
    const parts = [];
    for (let i = 0; i < n; i++) parts.push(words.slice(Math.round(i * words.length / n), Math.round((i + 1) * words.length / n)).join(' '));
    let order = parts.map((_, i) => i);
    do { order.sort(() => Math.random() - 0.5); } while (order.every((v, i) => v === i));
    box.innerHTML = `
      <div class="game-title">🧩 말씀 퍼즐</div>
      <div class="game-help">${Bible.full(ref)} · 말씀 조각을 <b>순서대로</b> 눌러 봐</div>
      <div class="pz-line">${parts.map((_, i) => `<span class="pz-slot" data-i="${i}">＿＿</span>`).join(' ')}</div>
      <div class="pz-chips">${order.map(i => `<button class="pz-chip" data-i="${i}">${parts[i]}</button>`).join('')}</div>`;
    let next = 0, miss = 0;
    box.querySelectorAll('.pz-chip').forEach(c => c.onclick = () => {
      const i = +c.dataset.i;
      if (i !== next) {
        miss++; Sound.sfx('select');
        c.classList.remove('wrong'); void c.offsetWidth; c.classList.add('wrong');
        if (miss >= 2) { const h = box.querySelector(`.pz-chip[data-i="${next}"]`); if (h) h.classList.add('hint'); }
        return;
      }
      miss = 0;
      Sound.sfx('gem');
      c.classList.add('used'); c.disabled = true;
      const slot = box.querySelector(`.pz-slot[data-i="${i}"]`);
      slot.textContent = parts[i]; slot.classList.add('on');
      next++;
      if (next === parts.length) {
        box.querySelector('.pz-line').classList.add('done');
        box.querySelector('.game-help').innerHTML = '말씀이 다 맞춰졌어!';
        Sound.sfx('verse');
        if (navigator.vibrate) navigator.vibrate(30);
        setTimeout(api.done, 1600);
      }
    });
  };

  /* ---- 누가 한 말일까? (주일 돌아보기 퀴즈) ---- */
  const QUIZ = {
    '1': [
      { q: '사가랴여 무서워하지 말라 너의 간구함이 들린지라', ref: '눅 1:13', a: '천사', o: ['천사', '사가랴', '엘리사벳', '마리아'] },
      { q: '내가 이것을 어떻게 알리요 내가 늙고 아내도 나이가 많으니이다', ref: '눅 1:18', a: '사가랴', o: ['엘리사벳', '사가랴', '천사', '요셉'] },
      { q: '나는 하나님 앞에 서 있는 가브리엘이라', ref: '눅 1:19', a: '천사', o: ['사가랴', '마리아', '천사', '엘리사벳'] },
      { q: '주께서 나를 돌보시는 날에 사람들 앞에서 내 부끄러움을 없게 하시려고', ref: '눅 1:25', a: '엘리사벳', o: ['마리아', '천사', '사가랴', '엘리사벳'] }
    ],
    '2': [
      { q: '다윗의 자손 요셉아 네 아내 마리아 데려오기를 무서워하지 말라', ref: '마 1:20', a: '천사', o: ['천사', '마리아', '요셉', '엘리사벳'] },
      { q: '아들을 낳으리니 이름을 예수라 하라', ref: '마 1:21', a: '천사', o: ['요셉', '천사', '마리아', '사가랴'] },
      { q: '보라 처녀가 잉태하여 아들을 낳을 것이요 그의 이름을 임마누엘이라 하리라', ref: '사 7:14', a: '이사야', o: ['요셉', '이사야', '마리아', '사가랴'] },
      { q: '마태복음 1:18-25에 적힌 요셉의 말은 몇 마디일까?', ref: '마 1:18-25', a: '한마디도 없다', o: ['한마디', '세 마디', '한마디도 없다', '열 마디'], hint: '대신 그가 한 일이 적혀 있어' }
    ],
    '3': [
      { q: '주의 여종이오니 말씀대로 내게 이루어지이다', ref: '눅 1:38', a: '마리아', o: ['엘리사벳', '마리아', '천사', '요셉'] },
      { q: '여자 중에 네가 복이 있으며 네 태중의 아이도 복이 있도다', ref: '눅 1:42', a: '엘리사벳', o: ['천사', '사가랴', '엘리사벳', '마리아'] },
      { q: '아니라 요한이라 할 것이라', ref: '눅 1:60', a: '엘리사벳', o: ['사가랴', '엘리사벳', '이웃', '마리아'], hint: '사가랴는 서판에 썼지. 말로 먼저 한 사람은?' },
      { q: '찬송하리로다 주 이스라엘의 하나님이여', ref: '눅 1:68', a: '사가랴', o: ['마리아', '엘리사벳', '천사', '사가랴'] }
    ]
  };
  const FACE = ['사가랴', '엘리사벳', '마리아', '요셉', '천사', '할아버지', '이웃'];
  G['누가'] = (box, api, key) => {
    const qs = QUIZ[key] || QUIZ['1'];
    let i = 0, first = 0, tries = 0;
    const show = () => {
      const Q = qs[i]; tries = 0;
      box.innerHTML = head('🗣️ 누가 한 말일까?', `지난 이야기 돌아보기 · ${i + 1} / ${qs.length}`) + `
        <div class="qz-q">“${Q.q}”</div>
        <div class="qz-opts">${Q.o.map(o => `<button class="qz-o" data-k="${o === Q.a ? 1 : 0}">${FACE.includes(o) ? `<span class="qz-face">${Art.portrait(o)}</span>` : `<span class="qz-face qz-txt">📖</span>`}<b>${o}</b></button>`).join('')}</div>
        <div class="qz-msg"></div>`;
      box.querySelectorAll('.qz-o').forEach(b => b.onclick = () => {
        if (box.querySelector('.qz-o.right')) return;
        if (b.dataset.k === '1') {
          b.classList.add('right'); Sound.sfx('gem'); if (!tries) first++;
          box.querySelector('.qz-msg').innerHTML = `맞아! <small>${Bible.full(Q.ref)}</small>`;
          setTimeout(() => { i++; if (i < qs.length) show(); else end(); }, window.__fast ? 100 : 1400);
        } else {
          tries++; Sound.sfx('select');
          b.classList.remove('wrong'); void b.offsetWidth; b.classList.add('wrong'); b.disabled = true;
          box.querySelector('.qz-msg').textContent = Q.hint && tries === 1 ? '힌트: ' + Q.hint : '다시 골라 봐';
        }
      });
    };
    const end = () => {
      box.innerHTML = head('🗣️ 누가 한 말일까?', '') + `<div class="qz-end">${qs.length}문제 중 <b>${first}</b>개를 한 번에 맞혔어!${first === qs.length ? '<br>완벽해 ✦' : ''}</div>`;
      Sound.sfx(first === qs.length ? 'badge' : 'star');
      setTimeout(api.done, window.__fast ? 100 : 1600);
    };
    show();
  };

  /* ---- 기억의 짝: 지난 이야기 조각 카드 뒤집어 짝 맞추기 ---- */
  const PAIRS = {
    '1': [['🪔', '등불'], ['📜', '서판'], ['⭐', '별'], ['🪚', '대패'], ['⚖️', '저울'], ['💭', '꿈']]
  };
  G['짝'] = (box, api, key) => {
    const P = PAIRS[key] || PAIRS['1'];
    const deck = P.flatMap((p, i) => [i, i]).sort(() => Math.random() - 0.5);
    box.innerHTML = head('🃏 기억의 짝', '같은 그림 두 장을 찾아 뒤집어 봐') + `<div class="mm-grid">${deck.map((p, k) => `<button class="mm" data-p="${p}" data-k="${k}"><span class="mm-back">✦</span><span class="mm-front">${P[p][0]}<small>${P[p][1]}</small></span></button>`).join('')}</div><div class="mm-count">0번 뒤집음</div>`;
    let open = [], moves = 0, matched = 0, lock = false;
    box.querySelectorAll('.mm').forEach(c => c.onclick = () => {
      if (lock || c.classList.contains('up')) return;
      c.classList.add('up'); Sound.sfx('tap'); open.push(c);
      if (open.length < 2) return;
      moves++; box.querySelector('.mm-count').textContent = moves + '번 뒤집음';
      const [a, b] = open; open = [];
      if (a.dataset.p === b.dataset.p) {
        a.classList.add('got'); b.classList.add('got'); Sound.sfx('gem'); matched++;
        if (matched === P.length) { box.querySelector('.game-help').textContent = `다 찾았다! ${moves}번 만에`; Sound.sfx('star'); setTimeout(api.done, window.__fast ? 100 : 1400); }
      } else {
        lock = true;
        setTimeout(() => { a.classList.remove('up'); b.classList.remove('up'); lock = false; }, window.__fast ? 50 : 750);
      }
    });
  };

  window.Games = G;
})();
