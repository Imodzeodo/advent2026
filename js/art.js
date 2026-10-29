/* 코드로 그린 장면 일러스트 (SVG). 얼굴은 그리지 않는 종이 오리기 풍.
   data-hot="이름" 이 붙은 요소는 '살펴보기'에서 누를 수 있는 대상이 된다. */
(function () {
  const W = 360, H = 540;

  // 같은 결과가 나오는 난수 (별 위치 고정용)
  function rng(seed) {
    let s = seed;
    return () => (s = (s * 16807) % 2147483647) / 2147483647;
  }

  function stars(seed, count, maxY, minO, maxO) {
    const r = rng(seed);
    let out = '';
    for (let i = 0; i < count; i++) {
      const x = r() * W, y = r() * maxY, rad = 0.5 + r() * 1.1, o = minO + r() * (maxO - minO);
      out += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${rad.toFixed(2)}" fill="#fff" opacity="${o.toFixed(2)}" class="twinkle" style="animation-delay:${(r() * 4).toFixed(2)}s"/>`;
    }
    return out;
  }

  function sky(id, stops) {
    return `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">` +
      stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('') +
      `</linearGradient>`;
  }

  /* 사람: x,y = 발 위치, h = 키
     kind: man | woman | child,  old: 흰 수염,  lamp: 등잔 들기 */
  function person(o) {
    const h = o.h || 130, s = h / 130;
    const robe = o.robe || '#5a4a63';
    const cloth = o.cloth || '#cbbfa8';
    const skin = o.skin || '#b98a68';
    const kind = o.kind || 'man';
    const flip = o.flip ? -1 : 1;
    const hot = o.hot ? ` data-hot="${o.hot}"` : '';
    let g = `<g${hot} transform="translate(${o.x},${o.y}) scale(${s * flip},${s})">`;
    g += `<ellipse cx="0" cy="0" rx="26" ry="5" fill="#000" opacity=".28"/>`;
    // 뒤로 늘어진 머릿수건 / 베일
    if (kind === 'woman') g += `<path d="M-15,-94 Q0,-114 15,-94 L24,-26 Q0,-20 -24,-26 Z" fill="${cloth}"/>`;
    else if (kind === 'man') g += `<path d="M-14,-92 Q0,-112 14,-92 L19,-62 L-19,-62 Z" fill="${cloth}"/>`;
    // 몸(겉옷)
    const top = kind === 'child' ? -66 : -76;
    g += `<path d="M-23,0 L-17,${top + 6} Q0,${top - 4} 17,${top + 6} L23,0 Q0,4 -23,0 Z" fill="${robe}"/>`;
    g += `<path d="M-17,${top + 6} Q0,${top - 4} 17,${top + 6} L12,${top + 18} Q0,${top + 10} -12,${top + 18} Z" fill="#fff" opacity=".07"/>`;
    g += `<rect x="-18" y="${kind === 'child' ? -36 : -42}" width="36" height="4" rx="2" fill="#000" opacity=".22"/>`;
    // 머리
    const hy = kind === 'child' ? -76 : -88;
    g += `<circle cx="0" cy="${hy}" r="${kind === 'child' ? 11 : 12}" fill="${skin}"/>`;
    if (kind === 'man') {
      g += `<path d="M-13,${hy - 1} Q0,${hy - 17} 13,${hy - 1} Q0,${hy - 7} -13,${hy - 1} Z" fill="${cloth}"/>`;
      g += `<rect x="-13" y="${hy - 4}" width="26" height="3" rx="1.5" fill="#000" opacity=".25"/>`;
      if (o.beard) g += `<path d="M-10,${hy + 3} Q-8,${hy + 24} 0,${hy + 27} Q8,${hy + 24} 10,${hy + 3} Q0,${hy + 9} -10,${hy + 3} Z" fill="${o.beard}"/>`;
    } else if (kind === 'woman') {
      g += `<path d="M-14,${hy + 2} Q-14,${hy - 16} 0,${hy - 16} Q14,${hy - 16} 14,${hy + 2} Q12,${hy - 9} 0,${hy - 10} Q-12,${hy - 9} -14,${hy + 2} Z" fill="${cloth}"/>`;
    } else {
      g += `<path d="M-11,${hy - 2} Q0,${hy - 15} 11,${hy - 2} Q0,${hy - 8} -11,${hy - 2} Z" fill="#2b1d16"/>`;
    }
    // 팔(소매)
    if (o.lamp) {
      g += `<path d="M12,${top + 14} Q26,${top + 30} 22,${top + 40}" stroke="${robe}" stroke-width="9" stroke-linecap="round" fill="none"/>`;
      g += lampShape(24, top + 40, 0.7, o.lampId);
    } else if (o.wave) {
      g += `<path d="M12,${top + 14} Q26,${top + 2} 30,${top - 14}" stroke="${robe}" stroke-width="8" stroke-linecap="round" fill="none"/>`;
    } else {
      g += `<path d="M14,${top + 14} Q20,${top + 34} 13,${top + 46}" stroke="#000" stroke-opacity=".15" stroke-width="7" stroke-linecap="round" fill="none"/>`;
    }
    g += `</g>`;
    return g;
  }

  // 흙으로 빚은 기름 등잔 + 불꽃
  function lampShape(x, y, s, id) {
    s = s || 1;
    return `<g transform="translate(${x},${y}) scale(${s})" ${id ? `id="${id}"` : ''}>
      <circle cx="10" cy="-14" r="34" fill="url(#lampglow)" class="glow"/>
      <path d="M-14,0 Q-14,-10 0,-10 Q12,-10 20,-16 L22,-12 Q16,-4 6,0 Z" fill="#8a5a3a"/>
      <ellipse cx="-2" cy="-8" rx="7" ry="2" fill="#4a2e1e"/>
      <path class="flame" d="M20,-15 Q14,-26 21,-36 Q28,-26 22,-15 Z" fill="#ffcf6b"/>
      <path class="flame" d="M20.5,-16 Q18,-22 21,-28 Q24,-22 21.5,-16 Z" fill="#fff4cf"/>
    </g>`;
  }

  const STAR_GLOW = `<radialGradient id="starglow"><stop offset="0" stop-color="#fff3c4" stop-opacity=".45"/><stop offset=".3" stop-color="#ffe7a8" stop-opacity=".12"/><stop offset="1" stop-color="#ffe7a8" stop-opacity="0"/></radialGradient>`;
  const LAMP_DEF = `<radialGradient id="lampglow"><stop offset="0" stop-color="#ffcf6b" stop-opacity=".85"/><stop offset=".35" stop-color="#ffb347" stop-opacity=".35"/><stop offset="1" stop-color="#ffb347" stop-opacity="0"/></radialGradient>`;

  // 평평한 지붕의 흙벽돌 집
  function house(x, y, w, h, fill, opts) {
    opts = opts || {};
    let g = `<g>`;
    g += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"/>`;
    g += `<rect x="${x - 3}" y="${y - 5}" width="${w + 6}" height="6" fill="${fill}"/>`;
    g += `<rect x="${x - 3}" y="${y - 5}" width="${w + 6}" height="2" fill="#fff" opacity=".06"/>`;
    if (opts.win) opts.win.forEach(([wx, wy, lit]) => {
      g += `<rect x="${x + wx}" y="${y + wy}" width="9" height="11" rx="1" fill="${lit ? '#ffb85c' : '#0a0c18'}" opacity="${lit ? .9 : .7}"/>`;
    });
    g += `</g>`;
    return g;
  }

  /* ---------- 큰 별 (홈·완료 화면·카드) ---------- */
  let starSeq = 0;
  function bigStar(b, size) {
    // b: 0~1 밝기
    const gid = 'sg' + (++starSeq);
    const glowR = 22 + 70 * b, core = 0.45 + 0.75 * b;
    const col = b < 0.5 ? '#c8cdef' : '#fff3c4';
    return `<svg viewBox="-100 -100 200 200" width="${size}" height="${size}" aria-hidden="true">
      <defs><radialGradient id="${gid}"><stop offset="0" stop-color="#fff6d8" stop-opacity="${0.25 + 0.6 * b}"/><stop offset=".4" stop-color="#ffd27a" stop-opacity="${0.08 + 0.3 * b}"/><stop offset="1" stop-color="#ffd27a" stop-opacity="0"/></radialGradient></defs>
      <circle r="${glowR}" fill="url(#${gid})"/>
      <g transform="scale(${core})" class="starcore">
        <path d="M0,-60 Q5,-5 60,0 Q5,5 0,60 Q-5,5 -60,0 Q-5,-5 0,-60 Z" fill="${col}"/>
        <path d="M0,-30 Q3,-3 30,0 Q3,3 0,30 Q-3,3 -30,0 Q-3,-3 0,-30 Z" fill="#fff" transform="rotate(45)" opacity="${0.4 + 0.5 * b}"/>
        <circle r="7" fill="#fff"/>
      </g>
    </svg>`;
  }

  /* ---------- 장면들 ---------- */
  const scenes = {};

  // 인트로: 별 하나 없는 밤
  scenes['밤하늘'] = () => `
    <defs>${sky('s0', [[0, '#03050f'], [0.7, '#0b1026'], [1, '#151a36']])}${STAR_GLOW}</defs>
    <rect width="${W}" height="${H}" fill="url(#s0)"/>
    ${stars(7, 18, 380, 0.05, 0.25)}
    <g id="farstar" transform="translate(180,190)">
      <circle r="44" fill="url(#starglow)" class="glow"/>
      <circle r="2.4" fill="#fff6dc" class="twinkle-strong"/>
    </g>
    <path d="M0,430 Q90,395 180,420 T360,405 L360,540 L0,540 Z" fill="#070914"/>
    <path d="M0,470 Q120,445 220,468 T360,460 L360,540 L0,540 Z" fill="#04050c"/>`;

  // 1장 프롤로그: 사가랴의 집 지붕 위, 밤
  scenes['지붕'] = () => `
    <defs>${sky('s1', [[0, '#050816'], [0.55, '#10173a'], [1, '#1f2650']])}${LAMP_DEF}${STAR_GLOW}</defs>
    <rect width="${W}" height="${H}" fill="url(#s1)"/>
    <g data-hot="하늘">
      <rect x="20" y="40" width="200" height="150" fill="transparent"/>
      ${stars(11, 22, 260, 0.08, 0.35)}
    </g>
    <g id="farstar" transform="translate(300,70)" opacity="0">
      <circle r="30" fill="url(#starglow)"/>
      <circle r="2" fill="#fff6dc"/>
    </g>
    <path d="M0,300 Q70,262 150,286 T300,270 T360,280 L360,360 L0,360 Z" fill="#0e1330"/>
    <g data-hot="마을">
      ${house(10, 300, 52, 50, '#1a2040', { win: [[10, 18, 0], [32, 18, 0]] })}
      ${house(70, 312, 40, 40, '#161c38', { win: [[15, 14, 0]] })}
      ${house(118, 296, 60, 56, '#1c2243', { win: [[12, 20, 1], [38, 20, 0]] })}
      ${house(186, 318, 36, 34, '#151a35')}
    </g>
    <rect x="0" y="352" width="${W}" height="8" fill="#0b0f26"/>
    <!-- 지붕 위 작은 방(빈 방) -->
    <g data-hot="빈 방">
      <rect x="224" y="290" width="112" height="118" fill="#2c2540"/>
      <rect x="220" y="284" width="120" height="8" fill="#372e4f"/>
      <path d="M262,408 L262,350 Q279,330 296,350 L296,408 Z" fill="#07060d"/>
    </g>
    <!-- 지붕 바닥과 낮은 난간 -->
    <rect x="0" y="400" width="${W}" height="140" fill="#2b2438"/>
    <rect x="0" y="396" width="${W}" height="14" fill="#3a3150"/>
    <rect x="0" y="396" width="${W}" height="3" fill="#fff" opacity=".05"/>
    <g data-hot="등잔">${lampShape(196, 397, 1, 'roof-lamp')}</g>
    ${person({ x: 130, y: 486, h: 156, robe: '#4e4566', cloth: '#a79fbd', skin: '#9d7558', beard: '#e8e4f0' })}`;

  // 1-1: 떠나는 날 새벽, 사가랴의 집 앞
  scenes['새벽집'] = () => `
    <defs>${sky('s2', [[0, '#0d1230'], [0.45, '#2e2c5a'], [0.75, '#6a4a6e'], [1, '#8a5a68']])}${LAMP_DEF}</defs>
    <rect width="${W}" height="${H}" fill="url(#s2)"/>
    ${stars(23, 14, 160, 0.1, 0.4)}
    <path d="M0,300 Q100,270 200,292 T360,284 L360,420 L0,420 Z" fill="#2a2546"/>
    <!-- 사가랴의 집 -->
    <rect x="30" y="200" width="200" height="232" fill="#4d4060"/>
    <rect x="26" y="192" width="208" height="10" fill="#5b4c70"/>
    <rect x="58" y="240" width="16" height="20" rx="2" fill="#ffb85c" opacity=".85"/>
    <g data-hot="대문">
      <rect x="104" y="318" width="58" height="114" fill="#6a587c"/>
      <path d="M112,432 L112,342 Q133,322 154,342 L154,432 Z" fill="#231b30"/>
    </g>
    <!-- 이웃집 -->
    <rect x="252" y="246" width="108" height="186" fill="#3d3452"/>
    <rect x="248" y="238" width="116" height="10" fill="#4a3f61"/>
    <rect x="276" y="300" width="22" height="24" rx="2" fill="#120e1c"/>
    <rect x="0" y="430" width="${W}" height="110" fill="#2a2235"/>
    <path d="M0,430 L360,430" stroke="#fff" stroke-opacity=".05" stroke-width="2"/>
    ${person({ x: 70, y: 492, h: 150, robe: '#5d4f78', cloth: '#bcb2cf', skin: '#a27a5c', beard: '#ece8f2', lamp: true })}
    ${person({ x: 186, y: 486, h: 134, kind: 'woman', robe: '#7d5f7e', cloth: '#c9b8cf', skin: '#a8805f', hot: '엘리사벳', flip: true })}
    ${person({ x: 250, y: 500, h: 84, kind: 'child', robe: '#8b6a4f', skin: '#b38b66', hot: '꼬마', wave: true })}
    ${person({ x: 318, y: 480, h: 122, kind: 'woman', robe: '#544463', cloth: '#8f8099', skin: '#9d7a5e', hot: '이웃 아주머니', flip: true })}`;

  // 1-1: 예루살렘으로 올라가는 길
  scenes['길'] = () => `
    <defs>${sky('s3', [[0, '#26315a'], [0.5, '#6b6488'], [0.8, '#c98f78'], [1, '#e2b08a']])}${LAMP_DEF}</defs>
    <rect width="${W}" height="${H}" fill="url(#s3)"/>
    <circle cx="80" cy="250" r="60" fill="#ffd9a0" opacity=".18"/>
    <circle cx="80" cy="250" r="24" fill="#ffe9c4" opacity=".85"/>
    <!-- 먼 언덕 위 예루살렘 -->
    <path d="M150,248 Q240,214 360,236 L360,300 L150,300 Z" fill="#8e7b95"/>
    <g fill="#e4d4bf" opacity=".85">
      <rect x="232" y="214" width="70" height="14"/><rect x="240" y="204" width="8" height="12"/><rect x="262" y="198" width="12" height="18"/><rect x="288" y="206" width="8" height="10"/>
      <rect x="258" y="190" width="20" height="10" fill="#f3e6cf"/>
    </g>
    <path d="M0,290 Q90,250 180,282 T360,270 L360,360 L0,360 Z" fill="#6d5c7c"/>
    <path d="M0,350 Q120,300 230,336 T360,330 L360,540 L0,540 Z" fill="#53475f"/>
    <path d="M150,540 Q170,450 230,400 Q260,372 250,340 L262,340 Q278,376 248,410 Q200,460 210,540 Z" fill="#a08a7a" opacity=".55"/>
    ${person({ x: 252, y: 352, h: 30, robe: '#3e3448', cloth: '#9f93a8' })}
    ${person({ x: 240, y: 362, h: 32, kind: 'woman', robe: '#4a3b4f', cloth: '#a698ad' })}
    ${person({ x: 228, y: 384, h: 44, robe: '#3d3450', cloth: '#a397b1' })}
    ${person({ x: 260, y: 394, h: 46, robe: '#4b3d55', cloth: '#b0a3b5', flip: true })}
    ${person({ x: 112, y: 488, h: 150, robe: '#5d4f78', cloth: '#bcb2cf', skin: '#a27a5c', beard: '#ece8f2' })}
    ${person({ x: 214, y: 470, h: 120, robe: '#6c5a74', cloth: '#d4c8d6', skin: '#a8805f', flip: true })}`;

  // 1-1 끝: 해 질 녘 성전
  scenes['성전'] = () => `
    <defs>${sky('s4', [[0, '#3a2550'], [0.14, '#b85f78'], [0.3, '#f2a463'], [1, '#f4c27c']])}${LAMP_DEF}</defs>
    <rect width="${W}" height="${H}" fill="url(#s4)"/>
    <circle cx="290" cy="150" r="70" fill="#ffd28a" opacity=".25"/>
    <circle cx="290" cy="150" r="26" fill="#fff0c8" opacity=".95"/>
    <!-- 성전 벽 -->
    <rect x="0" y="170" width="${W}" height="270" fill="#d7bf98"/>
    <rect x="0" y="170" width="${W}" height="270" fill="#ff9a52" opacity=".18"/>
    ${Array.from({ length: 9 }, (_, r) => Array.from({ length: 6 }, (_, c) =>
      `<rect x="${c * 64 + (r % 2 ? -32 : 0)}" y="${178 + r * 29}" width="60" height="25" fill="#fff" opacity=".06"/>`).join('')).join('')}
    <rect x="0" y="160" width="${W}" height="14" fill="#e7d2ad"/>
    <path d="M128,440 L128,270 Q180,226 232,270 L232,440 Z" fill="#3a2530"/>
    <path d="M140,440 L140,278 Q180,242 220,278 L220,440 Z" fill="#ffcf8a" opacity=".22"/>
    <rect x="0" y="436" width="${W}" height="104" fill="#5c3c45"/>
    ${person({ x: 64, y: 498, h: 142, robe: '#efe8dc', cloth: '#f7f2e8', skin: '#a77d5e', beard: '#4a3428' })}
    ${person({ x: 290, y: 494, h: 140, robe: '#eae2d4', cloth: '#f5efe3', skin: '#a07658', flip: true })}
    ${person({ x: 176, y: 506, h: 150, robe: '#e4dccd', cloth: '#f3ede2', skin: '#a27a5c', beard: '#ece8f2' })}`;

  // 1-2: 이른 아침 성전 앞뜰 (제비뽑기)
  const PRIEST = { robe: '#efe9dc', cloth: '#f7f3ea' };
  scenes['성전뜰'] = () => `
    <defs>${sky('s5', [[0, '#34406e'], [0.45, '#9b86a6'], [0.8, '#e8bfa6'], [1, '#f3d8b8']])}${LAMP_DEF}</defs>
    <rect width="${W}" height="${H}" fill="url(#s5)"/>
    <!-- 성소 건물 -->
    <rect x="50" y="110" width="260" height="300" fill="#dccaa8"/>
    <rect x="50" y="110" width="260" height="300" fill="#7a5a8a" opacity=".12"/>
    <rect x="42" y="98" width="276" height="16" fill="#eadbbd"/>
    ${[70, 105, 255, 290].map(x => `<rect x="${x - 7}" y="150" width="14" height="250" fill="#efe2c6"/><rect x="${x - 10}" y="146" width="20" height="8" fill="#f6ecd6"/>`).join('')}
    <g data-hot="성소 문">
      <rect x="140" y="230" width="80" height="180" fill="#c9a24d"/>
      <rect x="148" y="240" width="64" height="170" fill="#8a6524"/>
      <path d="M148,410 L148,262 Q180,236 212,262 L212,410 Z" fill="#2a1a10"/>
    </g>
    <rect x="30" y="406" width="300" height="10" fill="#cdb894"/>
    <rect x="18" y="416" width="324" height="12" fill="#bfa984"/>
    <rect x="0" y="428" width="${W}" height="112" fill="#a8927a"/>
    <!-- 뒤쪽 제사장들 -->
    ${person({ x: 236, y: 432, h: 54, ...PRIEST })}${person({ x: 214, y: 436, h: 56, ...PRIEST, flip: true })}${person({ x: 120, y: 434, h: 54, ...PRIEST })}
    <!-- 제비 항아리 -->
    <g data-hot="제비 항아리">
      <rect x="30" y="452" width="70" height="40" fill="#8e7a62"/>
      <rect x="26" y="446" width="78" height="8" fill="#a8927a"/>
      <path d="M50,446 L80,446 L78,438 Q92,420 88,404 Q84,388 65,386 Q46,388 42,404 Q38,420 52,438 Z" fill="#9b6a43"/>
      <rect x="51" y="380" width="28" height="7" fill="#6b4529"/>
    </g>
    ${person({ x: 162, y: 504, h: 152, ...PRIEST, skin: '#a27a5c', beard: '#ece8f2' })}
    ${person({ x: 270, y: 500, h: 138, ...PRIEST, skin: '#b38b66', hot: '젊은 제사장', flip: true })}`;

  // 1-2: 성소 안 (등잔대·떡상·분향단·휘장)
  scenes['성소'] = () => `
    <defs>
      ${sky('s6', [[0, '#0e0a12'], [1, '#2a1a1e']])}${LAMP_DEF}
      <radialGradient id="angelglow"><stop offset="0" stop-color="#fffbe8" stop-opacity=".95"/><stop offset=".35" stop-color="#ffe9a8" stop-opacity=".45"/><stop offset="1" stop-color="#ffe9a8" stop-opacity="0"/></radialGradient>
      <linearGradient id="gold" x1="0" x2="1"><stop offset="0" stop-color="#8a6420"/><stop offset=".5" stop-color="#e2bd5c"/><stop offset="1" stop-color="#8a6420"/></linearGradient>
    </defs>
    <rect width="${W}" height="${H}" fill="url(#s6)"/>
    <!-- 휘장 -->
    <g data-hot="휘장">
      ${Array.from({ length: 12 }, (_, i) => `<rect x="${40 + i * 23.3}" y="70" width="24" height="320" fill="${['#26357a', '#4f2b66', '#7a1f2e'][i % 3]}"/>`).join('')}
      ${Array.from({ length: 12 }, (_, i) => `<rect x="${40 + i * 23.3}" y="70" width="6" height="320" fill="#000" opacity=".25"/>`).join('')}
      <rect x="34" y="62" width="292" height="10" fill="url(#gold)"/>
    </g>
    <rect x="0" y="390" width="${W}" height="150" fill="#24181a"/>
    <rect x="0" y="388" width="${W}" height="4" fill="#4a3424"/>
    <!-- 등잔대 -->
    <g data-hot="등잔대">
      <circle cx="62" cy="250" r="70" fill="url(#lampglow)" class="glow"/>
      <rect x="58" y="250" width="8" height="150" fill="url(#gold)"/>
      <path d="M40,404 L84,404 L74,392 L50,392 Z" fill="url(#gold)"/>
      ${[16, 30, 44].map(r => `<path d="M${62 - r},252 Q${62 - r},${262 + r} 62,${266 + r} Q${62 + r},${262 + r} ${62 + r},252" stroke="#d4ab4c" stroke-width="5" fill="none"/>`).join('')}
      ${[-44, -30, -16, 0, 16, 30, 44].map(d => `<path class="flame" d="M${62 + d - 3},250 Q${62 + d},236 ${62 + d + 3},250 Z" fill="#ffd36b"/>`).join('')}
    </g>
    <!-- 떡상 -->
    <g data-hot="떡상">
      <rect x="262" y="332" width="80" height="10" fill="url(#gold)"/>
      <rect x="268" y="342" width="6" height="56" fill="#a57c2e"/><rect x="330" y="342" width="6" height="56" fill="#a57c2e"/>
      ${[0, 1, 2, 3].map(i => `<ellipse cx="282" cy="${328 - i * 7}" rx="13" ry="4.5" fill="#d8a35e"/><ellipse cx="322" cy="${328 - i * 7}" rx="13" ry="4.5" fill="#d8a35e"/>`).join('')}
    </g>
    <!-- 분향단 -->
    <g data-hot="분향단">
      <path class="smoke" d="M180,300 C168,270 196,250 182,220 C170,196 194,176 186,150" stroke="#e9e1ff" stroke-opacity=".35" stroke-width="10" fill="none" stroke-linecap="round"/>
      <rect x="160" y="310" width="40" height="80" fill="url(#gold)"/>
      <rect x="154" y="302" width="52" height="10" fill="#e8c46a"/>
      <rect x="152" y="296" width="8" height="8" fill="#e8c46a"/><rect x="200" y="296" width="8" height="8" fill="#e8c46a"/>
      <circle cx="180" cy="300" r="22" fill="url(#lampglow)"/>
    </g>
    <!-- 분향단 오른편의 빛 (1-2 끝, 1-3) -->
    <g id="angel" opacity="0">
      <circle cx="250" cy="250" r="120" fill="url(#angelglow)"/>
      <path d="M246,190 Q190,150 176,96 Q214,150 240,176 Z" fill="#fffaf0" opacity=".35"/>
      <path d="M254,190 Q310,150 324,96 Q286,150 260,176 Z" fill="#fffaf0" opacity=".35"/>
      <path d="M250,160 Q232,170 228,200 L216,388 Q250,398 284,388 L272,200 Q268,170 250,160 Z" fill="#fffaf0" opacity=".55"/>
      <circle cx="250" cy="150" r="15" fill="#fffdf6" opacity=".85"/>
    </g>
    ${person({ x: 112, y: 500, h: 156, robe: '#efe9dc', cloth: '#f7f3ea', skin: '#a27a5c', beard: '#ece8f2' })}`;

  function render(name) {
    const fn = scenes[name];
    if (!fn) return `<svg viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="#0b1026"/><text x="180" y="270" fill="#888" text-anchor="middle" font-size="14">장면 '${name}' 없음</text></svg>`;
    return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">${fn()}</svg>`;
  }

  window.Art = { render, bigStar, lampShape, LAMP_DEF, person };
})();
