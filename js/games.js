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

  window.Games = G;
})();
