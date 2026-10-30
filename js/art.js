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

  /* 선생님 얼굴 (story/cast.js). 지금 장(章)에 따라 배역이 바뀔 수 있다 */
  const A = { ch: 0 };
  function castOf(who) {
    const C = window.CAST, F = window.FACES;
    if (!C || !F || !who) return null;
    const t = C[who + '@' + A.ch] || C[who];
    return t && F[t] ? t : null;
  }
  // 얼굴 사진: (x,y)에 얼굴 한가운데, fw = 얼굴 폭.
  //   flip: 바깥 그림이 거울로 뒤집혀 있음(되돌림), want: 'R'|'L' 얼굴이 봤으면 하는 쪽
  //   F.gaze: 사진 속 얼굴이 보는 쪽, F.rot: 기운 고개를 바로 세우는 각도, F.look: 늘 보게 할 쪽
  function faceImg(t, x, y, fw, flip, want) {
    const F = window.FACES[t], k = fw / 120;
    if (F.look) want = F.look; // 늘 이쪽을 보게 (사진에 따라)
    const turn = !!(F.gaze && want && F.gaze !== want);
    const img = `<image href="img/faces/${t}.webp" x="${(-F.cx * k).toFixed(1)}" y="${(-F.cy * k).toFixed(1)}" width="${(F.w * k).toFixed(1)}" height="${(F.h * k).toFixed(1)}"/>`;
    return `<g transform="translate(${x},${y})${(!!flip) !== turn ? ' scale(-1,1)' : ''}${F.rot ? ` rotate(${F.rot})` : ''}">${img}</g>`;
  }



  /* 이름표: 장면 속 인물 머리 위에 누구인지 */
  const NAME = { '할아버지': '목자 할아버지', '군인': '로마 군인', '사람들': '나그네', '이웃2': '이웃 아저씨', '나': '나' };
  const NAME_CH = { '이웃@1': '이웃 아주머니', '이웃@2': '우물가 아주머니', '이웃2@2': '우물가 아저씨', '이웃@4': '이웃 아주머니', '천사@1': '천사 가브리엘', '천사@3': '천사 가브리엘', '천사@2': '주의 사자', '천사@4': '주의 사자' };
  const nameOf = who => NAME_CH[who + '@' + A.ch] || NAME[who] || who;
  function nameTag(who, x, y) {
    const t = nameOf(who), w = t.length * 10.5 + 14;
    return `<g class="nm" transform="translate(${x.toFixed(1)},${y.toFixed(1)})"><rect x="${(-w / 2).toFixed(1)}" y="-15" width="${w.toFixed(1)}" height="17" rx="8.5" fill="#140e04" fill-opacity=".62" stroke="#ffd27a" stroke-opacity=".55" stroke-width=".8"/><text x="0" y="-2.6" text-anchor="middle" font-size="11" font-weight="700" fill="#ffeec4">${t}</text></g>`;
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
    if (o.who === '군인') o = { ...o, helmet: true };
    const hot = o.hot ? ` data-hot="${o.hot}"` : '';
    const who = o.who ? ` data-who="${o.who}"` : '';
    let g = `<g class="who"${hot}${who}><g transform="translate(${o.x},${o.y}) scale(${s * flip},${s})">`;
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
    const t = castOf(o.who);
    if (t) {
      // 사진 얼굴: 머릿수건은 뒤로 크게, 얼굴은 1.5배 크게(큰 머리 인형 느낌)
      const fw = kind === 'child' ? 30 : 34;
      if (kind === 'woman') g += `<path d="M-21,${hy + 8} Q-22,${hy - 26} 0,${hy - 27} Q22,${hy - 26} 21,${hy + 8} L24,${hy + 40} L-24,${hy + 40} Z" fill="${cloth}"/>`;
      else if (kind === 'man' && !o.helmet) g += `<path d="M-19,${hy + 10} Q-21,${hy - 24} 0,${hy - 25} Q21,${hy - 24} 19,${hy + 10} L18,${hy + 20} L-18,${hy + 20} Z" fill="${cloth}"/>`;
      g += faceImg(t, 0, hy - 2, fw, o.flip, o.flip ? 'L' : 'R');
      if (!o.helmet) g += `<path d="M-19,${top + 9} Q-15,${top - 1} -7,${top} Q0,${top + 6} 7,${top} Q15,${top - 1} 19,${top + 9} L20,${top + 16} L-20,${top + 16} Z" fill="${kind === 'woman' ? cloth : robe}"/>`;
      if (o.helmet) g += `<g transform="translate(0,${hy - 14})"><path d="M-17,4 Q-17,-16 0,-16 Q17,-16 17,4 L17,0 Q0,-8 -17,0 Z" fill="#b0a090"/><rect x="-3" y="-26" width="6" height="12" fill="#c03030"/></g>`;
    } else {
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
    if (o.who && h >= 90 && !o.noTag) {
      let top = hy - 18;
      if (castOf(o.who)) { const F = window.FACES[castOf(o.who)], fw = kind === 'child' ? 30 : 34; top = hy - 2 - F.cy * fw / 120; }
      g += nameTag(o.who, o.x, o.y + (top - 5) * s);
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
    ${person({ x: 130, y: 486, h: 156, robe: '#4e4566', cloth: '#a79fbd', skin: '#9d7558', beard: '#e8e4f0', who: '사가랴' })}`;

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
    ${person({ x: 70, y: 492, h: 150, robe: '#5d4f78', cloth: '#bcb2cf', skin: '#a27a5c', beard: '#ece8f2', lamp: true, who: '사가랴' })}
    ${person({ x: 186, y: 486, h: 134, kind: 'woman', robe: '#7d5f7e', cloth: '#c9b8cf', skin: '#a8805f', hot: '엘리사벳', who: '엘리사벳', flip: true })}
    ${person({ x: 250, y: 466, h: 84, kind: 'child', robe: '#8b6a4f', skin: '#b38b66', hot: '꼬마', who: '꼬마', wave: true })}
    ${person({ x: 318, y: 480, h: 122, kind: 'woman', robe: '#544463', cloth: '#8f8099', skin: '#9d7a5e', hot: '이웃 아주머니', who: '이웃', flip: true })}`;

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
    ${person({ x: 112, y: 488, h: 150, robe: '#5d4f78', cloth: '#bcb2cf', skin: '#a27a5c', beard: '#ece8f2', who: '사가랴' })}
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
    ${person({ x: 64, y: 498, h: 142, robe: '#efe8dc', cloth: '#f7f2e8', skin: '#a77d5e', beard: '#4a3428', who: '제사장' })}
    ${person({ x: 290, y: 494, h: 140, robe: '#eae2d4', cloth: '#f5efe3', skin: '#a07658', flip: true })}
    ${person({ x: 176, y: 506, h: 150, robe: '#e4dccd', cloth: '#f3ede2', skin: '#a27a5c', beard: '#ece8f2', who: '사가랴' })}`;

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
    ${person({ x: 236, y: 432, h: 54, ...PRIEST, who: '제사장' })}${person({ x: 214, y: 436, h: 56, ...PRIEST, flip: true })}${person({ x: 120, y: 434, h: 54, ...PRIEST })}
    <!-- 제비 항아리 -->
    <g data-hot="제비 항아리">
      <rect x="30" y="452" width="70" height="40" fill="#8e7a62"/>
      <rect x="26" y="446" width="78" height="8" fill="#a8927a"/>
      <path d="M50,446 L80,446 L78,438 Q92,420 88,404 Q84,388 65,386 Q46,388 42,404 Q38,420 52,438 Z" fill="#9b6a43"/>
      <rect x="51" y="380" width="28" height="7" fill="#6b4529"/>
    </g>
    ${person({ x: 162, y: 504, h: 152, ...PRIEST, skin: '#a27a5c', beard: '#ece8f2', who: '사가랴' })}
    ${person({ x: 270, y: 500, h: 138, ...PRIEST, skin: '#b38b66', hot: '젊은 제사장', who: '젊은 제사장', flip: true })}`;

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
    <g id="angel" opacity="0"><g transform="translate(250,352) scale(.95)">${angelBody(castOf('천사'), 'L')}</g>${nameTag('천사', 250, 352 - 262 * .95)}</g>
    ${person({ x: 112, y: 500, h: 156, robe: '#efe9dc', cloth: '#f7f3ea', skin: '#a27a5c', beard: '#ece8f2', who: '사가랴' })}`;

  /* ---------- 공통 소품 ---------- */
  const ZEC = { robe: '#5d4f78', cloth: '#bcb2cf', skin: '#a27a5c', beard: '#ece8f2', who: '사가랴' };
  const ELI = { kind: 'woman', robe: '#7d5f7e', cloth: '#c9b8cf', skin: '#a8805f', who: '엘리사벳' };
  const JOS = { robe: '#6a5a48', cloth: '#c9b48e', skin: '#b08560', beard: '#3a2a1e', who: '요셉' };
  const MAR = { kind: 'woman', robe: '#8a7a9a', cloth: '#5f7fc9', skin: '#b88b66', who: '마리아' };
  const GRA = { robe: '#6b5a40', cloth: '#a89a7a', skin: '#9d7558', beard: '#e8e4dc', who: '할아버지' };
  const BOY = { kind: 'child', robe: '#7a6a4a', skin: '#b38b66', who: '나' };
  const SHP = { robe: '#5a4a3a', cloth: '#8f8270', skin: '#9d7a5e', who: '목자' };
  function sheep(x, y, sc, flip) {
    const f = flip ? -1 : 1;
    return `<g transform="translate(${x},${y}) scale(${sc * f},${sc})"><ellipse cx="0" cy="-14" rx="22" ry="14" fill="#ece6d8"/><circle cx="-14" cy="-22" r="9" fill="#ece6d8"/><circle cx="10" cy="-24" r="10" fill="#f4efe4"/><ellipse cx="24" cy="-18" rx="8" ry="6" fill="#3a3028"/><rect x="-12" y="-4" width="4" height="10" fill="#3a3028"/><rect x="8" y="-4" width="4" height="10" fill="#3a3028"/></g>`;
  }
  function fire(x, y) {
    return `<g transform="translate(${x},${y})"><circle cx="0" cy="-20" r="80" fill="url(#lampglow)" class="glow"/><path d="M-26,0 L26,-6 M-24,-6 L24,0" stroke="#4a2e1e" stroke-width="7"/><path class="flame" d="M-14,-4 Q-18,-34 0,-56 Q18,-34 14,-4 Z" fill="#ff9a3c"/><path class="flame" d="M-7,-4 Q-9,-24 0,-38 Q9,-24 7,-4 Z" fill="#ffe08a"/></g>`;
  }
  function bigStarSvg(x, y, r, id) {
    return `<g ${id ? `id="${id}"` : ''} transform="translate(${x},${y})"><circle r="${r * 3}" fill="url(#starglow)"/><path d="M0,-${r} Q${r * .08},-${r * .08} ${r},0 Q${r * .08},${r * .08} 0,${r} Q-${r * .08},${r * .08} -${r},0 Q-${r * .08},-${r * .08} 0,-${r} Z" fill="#fff6dc"/></g>`;
  }
  const STAR = () => `<radialGradient id="starglow"><stop offset="0" stop-color="#fff3c4" stop-opacity=".45"/><stop offset=".3" stop-color="#ffe7a8" stop-opacity=".12"/><stop offset="1" stop-color="#ffe7a8" stop-opacity="0"/></radialGradient>`;
  const ANGEL_DEF = `<radialGradient id="angelglow"><stop offset="0" stop-color="#fffbe8" stop-opacity=".95"/><stop offset=".35" stop-color="#ffe9a8" stop-opacity=".45"/><stop offset="1" stop-color="#ffe9a8" stop-opacity="0"/></radialGradient>`;
  // 천사: 들어 올린 깃털 날개 + 빛나는 옷. 원점은 발밑, 머리는 y=-200
  // 오른쪽 날개를 어깨(0,0) 기준으로 그리고, 왼쪽은 거울로 뒤집는다
  const WING = (() => {
    const f = n => n.toFixed(1);
    const tips = [[104, 104], [90, 102], [75, 95], [60, 85], [45, 72], [31, 57], [18, 41], [8, 24]];
    let out = 'M0,0 Q26,-74 80,-84 Q124,-88 126,-34 Q124,34 104,104';
    for (let i = 1; i < tips.length; i++) {
      const [x0, y0] = tips[i - 1], [x1, y1] = tips[i];
      out += ` Q${f((x0 + x1) / 2 + 3)},${f((y0 + y1) / 2 + 9)} ${x1},${y1}`;
    }
    out += ' Q2,16 0,0Z';
    // 깃대(긴 깃털 줄기)
    let shafts = '';
    tips.forEach(([x, y], i) => { const t = i / (tips.length - 1); const bx = 112 - 96 * t, by = -26 + 10 * t; shafts += `M${f(bx)},${f(by)} Q${f((bx + x) / 2 + 4)},${f((by + y) / 2)} ${f(x - 3)},${f(y - 6)} `; });
    // 덮깃 두 줄 (작은 비늘 무늬)
    const row = (pts, d) => { let r = `M${pts[0][0]},${pts[0][1]}`; for (let i = 1; i < pts.length; i++) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]; r += ` Q${f((x0 + x1) / 2 + d * 0.3)},${f((y0 + y1) / 2 + d)} ${x1},${y1}`; } return r; };
    const cov1 = row([[6, -14], [22, -40], [42, -58], [64, -66], [88, -64], [110, -50], [118, -30]], 10);
    const cov2 = row([[8, 4], [20, -14], [36, -28], [56, -36], [78, -36], [98, -26], [114, -8]], 12);
    return { out, shafts, cov1, cov2 };
  })();
  function wing(side) {
    return `<g class="wing ${side < 0 ? 'wl' : 'wr'}" style="transform-origin:${side * 10}px -150px"><g transform="translate(${side * 10},-150) scale(${side},1)">
      <path d="${WING.out}" fill="url(#wingGrad)" stroke="#fff3cf" stroke-opacity=".7" stroke-width="1.2"/>
      <path d="${WING.shafts}" fill="none" stroke="#e6d3a2" stroke-opacity=".55" stroke-width="1.1"/>
      <path d="${WING.cov2}" fill="none" stroke="#e6d3a2" stroke-opacity=".5" stroke-width="1"/>
      <path d="${WING.cov1}" fill="none" stroke="#e6d3a2" stroke-opacity=".6" stroke-width="1"/>
    </g></g>`;
  }
  const WING_DEF = `<linearGradient id="wingGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fffdf6" stop-opacity=".95"/><stop offset=".55" stop-color="#fff4d6" stop-opacity=".7"/><stop offset="1" stop-color="#ffe6a6" stop-opacity=".25"/></linearGradient>`;
  function angelBody(t, want) {
    return `<defs>${WING_DEF}</defs><circle cx="0" cy="-110" r="150" fill="url(#angelglow)" opacity=".85"/>
      <g opacity=".5" stroke="#fff6d8" stroke-width="2" stroke-linecap="round">${[-60, -35, -12, 12, 35, 60].map(d => { const a = d * Math.PI / 180; return `<line x1="${(Math.sin(a) * 40).toFixed(1)}" y1="${(-200 - Math.cos(a) * 40).toFixed(1)}" x2="${(Math.sin(a) * 92).toFixed(1)}" y2="${(-200 - Math.cos(a) * 92).toFixed(1)}" stroke-opacity="${(0.25 + Math.abs(d) / 300).toFixed(2)}"/>`; }).join('')}</g>
      ${wing(-1)}${wing(1)}
      <path d="M0,-186 Q-24,-178 -28,-148 Q-36,-60 -46,34 Q-20,46 0,42 Q20,46 46,34 Q36,-60 28,-148 Q24,-178 0,-186Z" fill="#fffaf0" opacity=".9"/>
      <path d="M-14,-120 Q-18,-40 -24,36 M8,-118 Q12,-40 18,38 M-2,-90 Q-2,-20 -4,40" stroke="#e9dcb8" stroke-width="1.4" fill="none" opacity=".7"/>
      <path d="M-26,-146 Q-50,-112 -40,-84 Q-28,-92 -18,-118Z M26,-146 Q50,-112 40,-84 Q28,-92 18,-118Z" fill="#fffdf6" opacity=".95"/>
      <path d="M-28,-150 Q0,-136 28,-150" stroke="#f2d98e" stroke-width="2.5" fill="none" opacity=".8"/>
      ${t ? `<circle cx="0" cy="-204" r="34" fill="url(#angelglow)" opacity=".9"/>${faceImg(t, 0, -204, 40, false, want)}<ellipse cx="0" cy="-244" rx="17" ry="4.5" fill="none" stroke="#ffe58a" stroke-width="3" opacity=".9"/>`
          : `<circle cx="0" cy="-200" r="17" fill="#fffdf6"/>
      <circle cx="0" cy="-200" r="26" fill="url(#angelglow)" opacity=".9"/>`}`;
  }
  function wingsSmall() {
    return `<defs>${WING_DEF}</defs><g transform="translate(50,78) scale(.36)"><g transform="translate(-10,-60) scale(-1,1)"><path d="${WING.out}" fill="url(#wingGrad)" stroke="#e8d49a" stroke-width="2"/></g><g transform="translate(10,-60)"><path d="${WING.out}" fill="url(#wingGrad)" stroke="#e8d49a" stroke-width="2"/></g></g>`;
  }
  function angel(x, y, sc, id, op, t) {
    const main = t === undefined;
    if (main) t = castOf('천사');
    return `<g ${id ? `id="${id}"` : ''} class="who" data-who="천사" opacity="${op == null ? 0 : op}"><g transform="translate(${x},${y}) scale(${sc})">${angelBody(t, x > 185 ? 'L' : x < 175 ? 'R' : '')}</g>${main ? nameTag('천사', x, y - 262 * sc) : ''}</g>`;
  }
  function interior(id, top, bottom) {
    return `<defs>${sky(id, [[0, top], [1, bottom]])}${LAMP_DEF}${STAR()}${ANGEL_DEF}</defs><rect width="${W}" height="${H}" fill="url(#${id})"/>`;
  }

  /* ---------- 1장 ---------- */
  // 1-3: 성소 + 처음부터 천사
  scenes['성소천사'] = () => scenes['성소']().replace('<g id="angel" opacity="0">', '<g id="angel" class="who" data-who="천사" opacity="1">');
  // 1-5: 밤, 사가랴의 집 안 (서판)
  scenes['집안'] = () => `${interior('s7', '#1a1424', '#3a2a2e')}
    <rect x="0" y="0" width="${W}" height="380" fill="#3a2c34"/>
    <rect x="0" y="0" width="${W}" height="380" fill="url(#lampglow)" opacity=".25"/>
    <rect x="40" y="110" width="70" height="80" fill="#0e1430"/><rect x="40" y="110" width="70" height="80" fill="none" stroke="#5a4250" stroke-width="8"/>
    ${stars(41, 6, 0, 0, 0)}<circle cx="62" cy="134" r="1.5" fill="#fff"/><circle cx="88" cy="160" r="1.2" fill="#fff" opacity=".6"/>
    <rect x="0" y="380" width="${W}" height="160" fill="#2a1e22"/>
    <rect x="110" y="368" width="150" height="14" fill="#6a4a32"/><rect x="122" y="382" width="10" height="70" fill="#5a3e2a"/><rect x="238" y="382" width="10" height="70" fill="#5a3e2a"/>
    <g data-hot="서판"><rect x="150" y="352" width="56" height="18" rx="2" fill="#c9b48e" transform="rotate(-6 178 360)"/><path d="M158,360 L196,356" stroke="#5a3a1a" stroke-width="2"/></g>
    <g data-hot="등잔">${lampShape(238, 368, 0.9)}</g>
    ${person({ x: 80, y: 500, h: 150, ...ZEC })}
    ${person({ x: 290, y: 496, h: 136, ...ELI, flip: true })}`;
  // 1-6: 새벽 지붕, 별이 또렷해짐
  scenes['지붕새벽'] = () => `
    <defs>${sky('s8', [[0, '#0b1030'], [0.5, '#2a2f5e'], [0.85, '#7a5a7a'], [1, '#c48a7a']])}${LAMP_DEF}${STAR()}</defs>
    <rect width="${W}" height="${H}" fill="url(#s8)"/>
    ${stars(11, 18, 240, 0.1, 0.45)}
    <g data-hot="별">${bigStarSvg(290, 80, 12, 'farstar2')}</g>
    <path d="M0,300 Q70,262 150,286 T300,270 T360,280 L360,360 L0,360 Z" fill="#2a2a4a"/>
    ${house(10, 300, 52, 50, '#2e3050', { win: [[10, 18, 1]] })}${house(118, 296, 60, 56, '#30344f', { win: [[12, 20, 1], [38, 20, 0]] })}
    <rect x="224" y="290" width="112" height="118" fill="#3c3450"/><rect x="220" y="284" width="120" height="8" fill="#4a4060"/>
    <path d="M262,408 L262,350 Q279,330 296,350 L296,408 Z" fill="#ffcf8a" opacity=".55"/>
    <rect x="0" y="400" width="${W}" height="140" fill="#3a3048"/><rect x="0" y="396" width="${W}" height="14" fill="#4a3f5e"/>
    ${person({ x: 110, y: 488, h: 154, ...ZEC })}
    ${person({ x: 200, y: 486, h: 136, ...ELI })}`;

  /* ---------- 2장: 나사렛, 요셉 ---------- */
  scenes['작업장'] = () => `
    <defs>${sky('s9', [[0, '#2a2650'], [0.5, '#7a5a78'], [0.85, '#d08a6a'], [1, '#e8a87a']])}${LAMP_DEF}${STAR()}</defs>
    <rect width="${W}" height="${H}" fill="url(#s9)"/>
    <path d="M0,280 Q120,240 240,270 T360,260 L360,360 L0,360 Z" fill="#5a4a5e"/>
    <path d="M10,180 L180,120 L350,180 L350,200 L10,200 Z" fill="#4a3a32"/>
    <rect x="30" y="200" width="300" height="230" fill="#6a5040"/><rect x="30" y="200" width="300" height="230" fill="#000" opacity=".25"/>
    <rect x="30" y="200" width="10" height="230" fill="#4a3428"/><rect x="320" y="200" width="10" height="230" fill="#4a3428"/>
    <g data-hot="연장">${[60, 80, 100, 120].map((x, i) => `<rect x="${x}" y="220" width="6" height="${40 + i * 6}" fill="#9a7a5a"/>`).join('')}<rect x="56" y="214" width="76" height="6" fill="#4a3428"/></g>
    <g data-hot="문틀"><rect x="236" y="250" width="14" height="170" fill="#c99a6a"/><rect x="296" y="250" width="14" height="170" fill="#c99a6a"/><rect x="236" y="240" width="74" height="14" fill="#d8aa78"/></g>
    <g data-hot="작업대"><rect x="90" y="370" width="140" height="16" fill="#b07a46"/><rect x="100" y="386" width="10" height="44" fill="#8a5a32"/><rect x="210" y="386" width="10" height="44" fill="#8a5a32"/><rect x="120" y="358" width="70" height="12" fill="#d8aa78"/></g>
    <rect x="0" y="430" width="${W}" height="110" fill="#5a4234"/>
    ${person({ x: 170, y: 500, h: 152, ...JOS })}`;
  scenes['나사렛길'] = () => `
    <defs>${sky('s10', [[0, '#7a9ac8'], [0.7, '#d8c8b0'], [1, '#e8d8bc']])}${LAMP_DEF}${STAR()}</defs>
    <rect width="${W}" height="${H}" fill="url(#s10)"/>
    <path d="M0,250 Q90,210 180,240 T360,226 L360,330 L0,330 Z" fill="#9aa07a"/>
    ${house(0, 240, 110, 190, '#c8a882', { win: [[30, 50, 0], [70, 50, 0]] })}${house(250, 230, 110, 200, '#bd9c78', { win: [[20, 60, 0]] })}
    <rect x="0" y="430" width="${W}" height="110" fill="#c2a882"/>
    <path d="M140,540 Q170,470 180,430 L200,430 Q210,470 240,540 Z" fill="#d8c2a0"/>
    ${person({ x: 52, y: 470, h: 120, kind: 'woman', robe: '#7a6a5a', cloth: '#b0a08a', hot: '빨래하는 아주머니', who: '이웃' })}
    ${person({ x: 310, y: 470, h: 124, robe: '#6a5a4a', cloth: '#a89a8a', beard: '#5a4a3a', hot: '수군대는 아저씨', who: '이웃2', flip: true })}
    ${person({ x: 160, y: 506, h: 150, ...JOS })}
    ${person({ x: 222, y: 502, h: 136, ...MAR, flip: true })}`;
  scenes['요셉밤'] = () => `${interior('s11', '#0e0c1a', '#241c22')}
    <rect x="0" y="0" width="${W}" height="390" fill="#221a26"/>
    <circle cx="200" cy="330" r="200" fill="url(#lampglow)" opacity=".5"/>
    <rect x="250" y="90" width="66" height="76" fill="#0a1030"/>${stars(5, 0, 0, 0, 0)}<circle cx="270" cy="114" r="1.6" fill="#fff"/><circle cx="296" cy="140" r="1.2" fill="#fff"/>
    <rect x="0" y="390" width="${W}" height="150" fill="#1e1618"/>
    <rect x="130" y="376" width="160" height="14" fill="#6a4a32"/><rect x="140" y="390" width="10" height="60" fill="#5a3e2a"/><rect x="270" y="390" width="10" height="60" fill="#5a3e2a"/>
    <g data-hot="두루마리"><rect x="168" y="360" width="80" height="16" rx="3" fill="#e8dcc0"/><circle cx="168" cy="368" r="9" fill="#b08a5a"/><circle cx="248" cy="368" r="9" fill="#b08a5a"/></g>
    ${lampShape(282, 376, 0.8)}
    ${person({ x: 100, y: 500, h: 152, ...JOS })}`;
  scenes['꿈'] = () => `
    <defs>${sky('s12', [[0, '#050418'], [0.6, '#1a1450'], [1, '#2a2068']])}${STAR()}${ANGEL_DEF}</defs>
    <rect width="${W}" height="${H}" fill="url(#s12)"/>
    ${stars(77, 60, 540, 0.15, 0.8)}
    <circle cx="180" cy="230" r="150" fill="url(#angelglow)" opacity=".3"/>
    ${angel(190, 380, 1, 'angel', 0)}
    <g opacity=".75">${person({ x: 110, y: 500, h: 130, ...JOS })}</g>`;
  scenes['새집'] = () => `
    <defs>${sky('s13', [[0, '#1e2250'], [0.6, '#6a5a8a'], [1, '#c89a8a']])}${LAMP_DEF}${STAR()}</defs>
    <rect width="${W}" height="${H}" fill="url(#s13)"/>
    ${stars(31, 12, 200, 0.2, 0.6)}
    <rect x="40" y="200" width="260" height="232" fill="#a58a6a"/><rect x="34" y="192" width="272" height="10" fill="#bda080"/>
    <g data-hot="문"><rect x="140" y="300" width="64" height="132" fill="#8a6040"/><rect x="146" y="306" width="52" height="126" fill="#c08a58"/><circle cx="190" cy="370" r="3" fill="#4a3020"/></g>
    <g data-hot="창문"><rect x="230" y="250" width="40" height="40" fill="#ffcf8a"/><rect x="230" y="250" width="40" height="40" fill="none" stroke="#6a4a30" stroke-width="4"/></g>
    <rect x="0" y="430" width="${W}" height="110" fill="#5a4a46"/>
    ${person({ x: 90, y: 500, h: 152, ...JOS })}
    ${person({ x: 270, y: 498, h: 136, ...MAR, flip: true })}`;

  /* ---------- 3장: 마리아 ---------- */
  scenes['마리아집'] = () => `
    <defs>${sky('s14', [[0, '#f0b0a0'], [0.5, '#f8d0b0'], [1, '#fce8c8']])}${LAMP_DEF}${STAR()}${ANGEL_DEF}</defs>
    <rect width="${W}" height="${H}" fill="url(#s14)"/>
    <path d="M0,260 Q100,220 200,250 T360,236 L360,340 L0,340 Z" fill="#c8b090"/>
    <rect x="20" y="180" width="200" height="250" fill="#e0c8a4"/><rect x="14" y="172" width="212" height="10" fill="#eedcbc"/>
    <path d="M90,430 L90,330 Q120,300 150,330 L150,430 Z" fill="#6a4a3a"/>
    <g data-hot="물동이"><path d="M268,430 Q252,400 262,380 L290,380 Q300,400 284,430 Z" fill="#b8784a"/><ellipse cx="276" cy="380" rx="14" ry="4" fill="#8a5a3a"/></g>
    <g data-hot="무화과나무"><rect x="310" y="300" width="10" height="130" fill="#6a4a30"/><circle cx="315" cy="280" r="40" fill="#7a9a5a"/><circle cx="295" cy="300" r="26" fill="#6a8a4a"/></g>
    <rect x="0" y="430" width="${W}" height="110" fill="#d8c09a"/>
    ${angel(250, 470, 0.95, 'angel', 0)}
    ${person({ x: 140, y: 500, h: 140, ...MAR })}`;
  scenes['산길'] = () => `
    <defs>${sky('s15', [[0, '#8ab0d8'], [0.6, '#e8d0b8'], [1, '#f0dcc0']])}${STAR()}</defs>
    <rect width="${W}" height="${H}" fill="url(#s15)"/>
    <path d="M0,230 L80,170 L150,220 L230,150 L300,210 L360,180 L360,330 L0,330 Z" fill="#a8a0a0"/>
    <path d="M0,300 Q120,250 230,290 T360,280 L360,540 L0,540 Z" fill="#a8a070"/>
    <path d="M60,540 Q120,450 200,400 Q260,360 300,300 L314,304 Q278,370 214,414 Q140,466 96,540 Z" fill="#d8c8a0"/>
    ${person({ x: 296, y: 312, h: 36, kind: 'woman', robe: '#6a5a6a', cloth: '#9a8a9a' })}${person({ x: 310, y: 316, h: 38, robe: '#5a4a3a', cloth: '#a89a8a' })}
    ${person({ x: 150, y: 500, h: 142, ...MAR })}`;
  scenes['유대집'] = () => `
    <defs>${sky('s16', [[0, '#9ab8e0'], [0.7, '#e8dcc8'], [1, '#f0e2c8']])}${LAMP_DEF}${STAR()}</defs>
    <rect width="${W}" height="${H}" fill="url(#s16)"/>
    <path d="M0,300 Q100,270 200,292 T360,284 L360,420 L0,420 Z" fill="#a8a088"/>
    <rect x="30" y="200" width="200" height="232" fill="#c8b098"/><rect x="26" y="192" width="208" height="10" fill="#d8c0a8"/>
    <g data-hot="대문"><rect x="104" y="318" width="58" height="114" fill="#a88a70"/><path d="M112,432 L112,342 Q133,322 154,342 L154,432 Z" fill="#4a3428"/></g>
    <rect x="252" y="246" width="108" height="186" fill="#b8a088"/>
    <rect x="0" y="430" width="${W}" height="110" fill="#b8a080"/>
    ${person({ x: 70, y: 496, h: 148, ...ZEC })}
    ${person({ x: 186, y: 494, h: 134, ...ELI })}
    ${person({ x: 296, y: 500, h: 138, ...MAR, flip: true })}`;
  scenes['할례'] = () => scenes['유대집']().replace(`${person({ x: 296, y: 500, h: 138, ...MAR, flip: true })}`,
    `${person({ x: 236, y: 456, h: 100, kind: 'woman', robe: '#7a6a8a', cloth: '#c8b8d0', who: '친척 아가씨', flip: true, noTag: true })}${person({ x: 270, y: 466, h: 108, robe: '#5a6a5a', cloth: '#a8b0a0', who: '친척 청년', flip: true, noTag: true })}${person({ x: 300, y: 480, h: 118, kind: 'woman', robe: '#8a6a5a', cloth: '#b8a08a', who: '친척 아주머니', flip: true, noTag: true })}${person({ x: 330, y: 500, h: 124, robe: '#5a4a5a', cloth: '#9a8a9a', beard: '#4a3a2a', who: '친척 아저씨', flip: true, noTag: true })}${nameTag('친척들', 285, 356)}`);
  scenes['언덕노을'] = () => `
    <defs>${sky('s17', [[0, '#4a3070'], [0.4, '#c06080'], [0.75, '#f0a070'], [1, '#f8c890']])}${STAR()}</defs>
    <rect width="${W}" height="${H}" fill="url(#s17)"/>
    <circle cx="180" cy="330" r="70" fill="#ffe0a0" opacity=".8"/>
    <path d="M0,340 Q90,300 180,330 T360,320 L360,540 L0,540 Z" fill="#6a4a5a"/>
    <path d="M0,420 Q120,380 240,410 T360,400 L360,540 L0,540 Z" fill="#4a3448"/>
    ${person({ x: 140, y: 470, h: 150, ...MAR, wave: true })}
    ${person({ x: 236, y: 474, h: 134, ...ELI, flip: true })}`;

  /* ---------- 4장: 들판, 베들레헴 ---------- */
  scenes['들판'] = () => `
    <defs>${sky('s18', [[0, '#03040e'], [0.6, '#0e1430'], [1, '#1a2040']])}${LAMP_DEF}${STAR()}${ANGEL_DEF}</defs>
    <rect width="${W}" height="${H}" fill="url(#s18)"/>
    ${stars(91, 50, 300, 0.15, 0.7)}
    <g data-hot="별">${bigStarSvg(270, 70, 7, 'farstar')}</g>
    <g class="angels" opacity="0">${angel(90, 260, 0.5, null, 1, (window.HOST || [])[0] || null)}${angel(180, 220, 0.62, null, 1)}${angel(270, 260, 0.5, null, 1, (window.HOST || [])[1] || null)}${angel(40, 200, 0.35, null, 0.8, (window.HOST || [])[2] || null)}${angel(320, 190, 0.38, null, 0.8, (window.HOST || [])[3] || null)}</g>
    <path d="M0,320 Q100,290 200,312 T360,300 L360,540 L0,540 Z" fill="#141a2a"/>
    ${house(250, 300, 30, 16, '#1e2236', { win: [[10, 4, 1]] })}${house(284, 296, 26, 20, '#1e2236', { win: [[8, 6, 1]] })}
    <g data-hot="양 떼">${sheep(40, 410, 0.8)}${sheep(90, 420, 0.7, true)}${sheep(300, 420, 0.75)}${sheep(330, 440, 0.6, true)}</g>
    <g data-hot="모닥불">${fire(190, 440)}</g>
    ${person({ x: 110, y: 500, h: 146, ...GRA })}
    ${person({ x: 268, y: 498, h: 140, ...SHP, flip: true })}
    ${person({ x: 196, y: 494, h: 96, ...BOY })}`;
  scenes['베들레헴'] = () => `
    <defs>${sky('s19', [[0, '#1a1a40'], [0.55, '#6a4a6a'], [1, '#c07a5a']])}${LAMP_DEF}${STAR()}</defs>
    <rect width="${W}" height="${H}" fill="url(#s19)"/>
    ${house(0, 200, 120, 230, '#5a4a4a', { win: [[30, 40, 1], [80, 40, 1], [30, 110, 1]] })}
    ${house(240, 180, 120, 250, '#4e4046', { win: [[20, 50, 1], [70, 50, 1]] })}
    <g data-hot="여관"><rect x="122" y="250" width="116" height="180" fill="#6a5250"/><rect x="150" y="320" width="58" height="110" fill="#ffcf8a" opacity=".85"/><rect x="120" y="244" width="120" height="8" fill="#7a6260"/><text x="180" y="290" text-anchor="middle" font-size="13" fill="#ffe0b0">여관</text></g>
    <rect x="0" y="430" width="${W}" height="110" fill="#4a3a36"/>
    <g data-hot="사람들">${person({ x: 30, y: 456, h: 100, robe: '#4a3a4a', cloth: '#8a7a8a' })}${person({ x: 64, y: 462, h: 104, robe: '#5a4a3a', cloth: '#9a8a7a', who: '사람들' })}${person({ x: 300, y: 460, h: 102, robe: '#3a3a4a', cloth: '#7a7a8a', flip: true })}</g>
    <g data-hot="로마 군인">${person({ x: 334, y: 470, h: 118, robe: '#8a2a2a', cloth: '#b0a090', who: '군인', flip: true })}</g>
    <g data-hot="어떤 부부" opacity=".85">${person({ x: 250, y: 400, h: 70, robe: '#3a3048', cloth: '#5a5070', who: '요셉' })}${person({ x: 270, y: 400, h: 62, kind: 'woman', robe: '#3a3048', cloth: '#4a5a8a', who: '마리아' })}</g>
    ${person({ x: 180, y: 486, h: 120, robe: '#6a4a3a', cloth: '#a88a6a', beard: '#3a2a1a', who: '여관 주인' })}
    ${person({ x: 112, y: 490, h: 94, ...BOY })}`;
  scenes['마구간'] = () => `${interior('s20', '#140e0c', '#2e2018')}
    <path d="M0,0 L360,0 L360,140 Q180,60 0,140 Z" fill="#0a0806"/>
    <circle cx="180" cy="360" r="190" fill="url(#lampglow)" opacity=".55"/>
    <rect x="0" y="410" width="${W}" height="130" fill="#3a2a1a"/>
    <path d="M0,420 Q60,410 120,420 T240,418 T360,422 L360,440 L0,440 Z" fill="#c8a050" opacity=".5"/>
    <g opacity=".8"><ellipse cx="60" cy="350" rx="44" ry="26" fill="#3a2a20"/><circle cx="24" cy="334" r="16" fill="#3a2a20"/><ellipse cx="320" cy="356" rx="40" ry="24" fill="#4a3a2a"/><path d="M344,326 L356,304 L352,330 Z" fill="#4a3a2a"/></g>
    <g data-hot="구유"><path d="M140,400 L220,400 L210,440 L150,440 Z" fill="#7a5a3a"/><path d="M134,392 L226,392 L220,404 L140,404 Z" fill="#9a7a4a"/><path d="M144,394 Q180,380 216,394" stroke="#d8b860" stroke-width="5" fill="none"/>
      <ellipse cx="180" cy="388" rx="26" ry="11" fill="#f4eee0"/><circle cx="160" cy="386" r="8" fill="#e8c8a8"/><path d="M168,380 Q182,376 200,382" stroke="#e0d8c4" stroke-width="2" fill="none"/>
      <circle cx="170" cy="386" r="40" fill="url(#starglow)"/></g>
    ${lampShape(300, 300, 0.8)}
    ${person({ x: 96, y: 500, h: 132, ...MAR })}
    ${person({ x: 262, y: 504, h: 150, ...JOS, flip: true })}`;
  scenes['들판새벽'] = () => `
    <defs>${sky('s21', [[0, '#2a3060'], [0.5, '#a07a9a'], [0.8, '#f0b090'], [1, '#f8d8a8']])}${STAR()}</defs>
    <rect width="${W}" height="${H}" fill="url(#s21)"/>
    ${bigStarSvg(290, 70, 9)}
    <path d="M0,320 Q100,290 200,312 T360,300 L360,540 L0,540 Z" fill="#5a5a50"/>
    ${sheep(50, 420, 0.8)}${sheep(300, 430, 0.75, true)}
    ${person({ x: 110, y: 500, h: 146, ...GRA, wave: true })}
    ${person({ x: 260, y: 498, h: 140, ...SHP, wave: true, flip: true })}
    ${person({ x: 190, y: 494, h: 98, ...BOY, wave: true })}`;

  /* ---------- 인물 초상 (대사창 옆) ---------- */
  const PORTRAIT = {
    '사가랴': { skin: '#a27a5c', cloth: '#bcb2cf', robe: '#5d4f78', beard: '#ece8f2', brow: '#d8d4e0', bg: '#3a2f55', age: 'old' },
    '엘리사벳': { skin: '#a8805f', cloth: '#c9b8cf', robe: '#7d5f7e', veil: true, bg: '#4a2f48', age: 'old', brow: '#8a7a7a' },
    '요셉': { skin: '#b08560', cloth: '#c9b48e', robe: '#6a5a48', beard: '#3a2a1e', brow: '#2a1a10', bg: '#3a3428' },
    '마리아': { skin: '#b88b66', cloth: '#5f7fc9', robe: '#8a7a9a', veil: true, bg: '#2a3458', brow: '#3a2418' },
    '할아버지': { skin: '#9d7558', cloth: '#a89a7a', robe: '#6b5a40', beard: '#e8e4dc', brow: '#d8d4cc', bg: '#2e3424', age: 'old' },
    '목자': { skin: '#9d7a5e', cloth: '#8f8270', robe: '#5a4a3a', beard: '#2a2018', brow: '#1a1008', bg: '#2a2a30' },
    '제사장': { skin: '#a77d5e', cloth: '#f7f2e8', robe: '#efe8dc', beard: '#4a3428', brow: '#2a1a10', bg: '#4a3a2a' },
    '젊은 제사장': { skin: '#b38b66', cloth: '#f7f2e8', robe: '#efe8dc', brow: '#2a1a10', bg: '#4a3a2a' },
    '꼬마': { skin: '#b38b66', hair: '#2b1d16', robe: '#8b6a4f', brow: '#2b1d16', bg: '#3a4a3a', child: true },
    '이웃': { skin: '#9d7a5e', cloth: '#8f8099', robe: '#544463', veil: true, brow: '#3a2a20', bg: '#383048' },
    '이웃2': { skin: '#a07a5c', cloth: '#a89a8a', robe: '#6a5a4a', beard: '#5a4a3a', brow: '#3a2a20', bg: '#3a3430' },
    '여관 주인': { skin: '#a8805f', cloth: '#a88a6a', robe: '#6a4a3a', beard: '#3a2a1a', brow: '#2a1a10', bg: '#4a3020' },
    '군인': { skin: '#b08a68', helmet: true, robe: '#8a2a2a', brow: '#2a1a10', bg: '#4a2020' },
    '친척': { skin: '#a8805f', cloth: '#a89aa8', robe: '#6a5a6a', beard: '#6a5a4a', brow: '#3a2a20', bg: '#3a3040' },
    '친척 아저씨': { skin: '#a8805f', cloth: '#9a8a9a', robe: '#5a4a5a', beard: '#4a3a2a', brow: '#3a2a20', bg: '#3a3040' },
    '친척 아주머니': { skin: '#a8805f', cloth: '#b8a08a', robe: '#8a6a5a', veil: true, brow: '#3a2a20', bg: '#40302e' },
    '친척 청년': { skin: '#b08a68', cloth: '#a8b0a0', robe: '#5a6a5a', brow: '#2a1a10', bg: '#2e3a30' },
    '친척 아가씨': { skin: '#b88b66', cloth: '#c8b8d0', robe: '#7a6a8a', veil: true, brow: '#3a2418', bg: '#3a3048' },
    '사람들': { skin: '#a07a5c', cloth: '#9a8a7a', robe: '#5a4a3a', brow: '#3a2a20', bg: '#383030' }
  };
  // 표정: 눈·눈썹·입 모양
  const EXPR = {
    '기본': { eye: 'dot', brow: 0, mouth: 'flat' }, '웃음': { eye: 'smile', brow: -2, mouth: 'smile', blush: true },
    '놀람': { eye: 'wide', brow: -5, mouth: 'o' }, '슬픔': { eye: 'down', brow: 4, mouth: 'sad' },
    '걱정': { eye: 'dot', brow: 4, mouth: 'wavy' }, '결심': { eye: 'dot', brow: 3, mouth: 'flat', firm: true },
    '감동': { eye: 'smile', brow: 3, mouth: 'smile', tear: true, blush: true }, '두려움': { eye: 'wide', brow: 5, mouth: 'wavy' },
    '기쁨': { eye: 'smile', brow: -3, mouth: 'open', blush: true }
  };
  // 표정 덧그림 (사진 얼굴 위에 만화 기호로): 얼굴 한가운데 (50,47), 얼굴 폭 44 기준
  function exprMarks(expr, side) {
    // side: 옆을 보는 얼굴이면 볼 홍조를 얼굴 안쪽 한 볼에만
    const blush = side ? `<ellipse cx="${side === 'L' ? 55 : 45}" cy="56" rx="4.5" ry="2.6" fill="#ff7a8a" opacity=".36"/>` : `<ellipse cx="39" cy="56" rx="4.8" ry="2.7" fill="#ff7a8a" opacity=".36"/><ellipse cx="61" cy="56" rx="4.8" ry="2.7" fill="#ff7a8a" opacity=".36"/>`;
    const tear = `<path d="M66,52 Q68.5,58 66,61 Q63.5,58 66,52 Z" fill="#8fd0ff" stroke="#fff" stroke-width=".8"/>`;
    const sweat = `<path d="M75,24 Q79,31 75,35 Q71,31 75,24 Z" fill="#8fd0ff" stroke="#fff" stroke-width=".9"/>`;
    const spark = (x, y, r) => `<path d="M${x},${y - r} Q${x + r * .15},${y - r * .15} ${x + r},${y} Q${x + r * .15},${y + r * .15} ${x},${y + r} Q${x - r * .15},${y + r * .15} ${x - r},${y} Q${x - r * .15},${y - r * .15} ${x},${y - r} Z" fill="#ffe27a"/>`;
    const bang = `<g transform="translate(81,20) rotate(12)"><rect x="-3" y="-12" width="6" height="15" rx="3" fill="#ffd34d" stroke="#7a4a10" stroke-width="1"/><circle cx="0" cy="8" r="3.2" fill="#ffd34d" stroke="#7a4a10" stroke-width="1"/></g>`;
    const gloom = `<path d="M38,26 L38,36 M44,24 L44,35 M50,23 L50,35 M56,24 L56,35 M62,26 L62,36" stroke="#4a4aa0" stroke-width="1.6" opacity=".45" stroke-linecap="round"/>`;
    return ({ '웃음': blush, '기쁨': blush + spark(18, 28, 6) + spark(84, 38, 4.5), '감동': blush + tear + spark(82, 26, 4.5),
      '슬픔': tear + `<circle cx="50" cy="50" r="50" fill="#3050a0" opacity=".12"/>`, '걱정': sweat, '두려움': gloom + sweat,
      '놀람': bang, '결심': spark(80, 24, 6) })[expr] || '';
  }
  function photoPortrait(t, who, expr) {
    const P = PORTRAIT[who] || PORTRAIT['사람들'];
    let g = `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="${P.bg}"/>`;
    if (P.veil) g += `<path d="M18,60 Q16,10 50,8 Q84,10 82,60 L88,100 L12,100 Z" fill="${P.cloth}"/>`;
    else if (P.helmet) g += '';
    else if (P.cloth && !P.child) g += `<path d="M23,62 Q20,12 50,10 Q80,12 77,62 L80,84 L20,84 Z" fill="${P.cloth}"/>`;
    g += `<path d="M8,100 Q12,76 34,72 L66,72 Q88,76 92,100 Z" fill="${P.robe}"/>`;
    g += faceImg(t, 50, 47, 44, false, 'R');
    g += `<path d="${P.veil ? 'M6,100 Q10,80 26,73 Q36,70 50,73 Q64,70 74,73 Q90,80 94,100 Z' : 'M6,100 Q10,80 26,73 Q36,69 43,74 Q50,79 57,74 Q64,69 74,73 Q90,80 94,100 Z'}" fill="${P.veil ? P.cloth : P.robe}"/>${P.veil ? '' : '<path d="M43,74 Q50,79 57,74" stroke="#000" stroke-opacity=".2" stroke-width="1.6" fill="none"/>'}`;
    if (P.helmet) g += `<path d="M28,36 Q28,8 50,8 Q72,8 72,36 L72,30 Q50,20 28,30 Z" fill="#b0a090"/><rect x="47" y="-2" width="6" height="14" fill="#c03030"/>`;
    const F = window.FACES[t];
    g += exprMarks(expr, F.gaze ? (F.look || 'R') : '');
    return g + `</svg>`;
  }
  function portrait(who, expr) {
    if (!who) return '';
    const t = castOf(who === '가브리엘' ? '천사' : who);
    if ((who === '천사' || who === '가브리엘') && t) return `<svg viewBox="0 0 100 100"><defs>${ANGEL_DEF}</defs><circle cx="50" cy="50" r="50" fill="#fff6dc"/><circle cx="50" cy="44" r="40" fill="url(#angelglow)"/>${wingsSmall()}<path d="M18,100 Q22,74 38,70 L62,70 Q78,74 82,100 Z" fill="#fffaf0"/>${faceImg(t, 50, 45, 42, false, 'R')}<ellipse cx="50" cy="12" rx="16" ry="4" fill="none" stroke="#f0c850" stroke-width="2.6"/>${exprMarks(expr)}</svg>`;
    if (who === '천사' || who === '가브리엘') return `<svg viewBox="0 0 100 100"><defs>${ANGEL_DEF}</defs><circle cx="50" cy="50" r="50" fill="#fff6dc"/><g transform="translate(50,118) scale(.42)">${angelBody()}</g></svg>`;
    if (t && !/서판$/.test(who)) return photoPortrait(t, who, expr);
    if (/서판$/.test(who)) return `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="#3a2f55"/><rect x="24" y="30" width="52" height="40" rx="4" fill="#c9b48e" stroke="#7a5a3a" stroke-width="4"/><path d="M32,44 L66,44 M32,54 L58,54 M32,62 L50,62" stroke="#5a3a1a" stroke-width="3" stroke-linecap="round"/><path d="M70,22 L80,14" stroke="#e8dcc0" stroke-width="4" stroke-linecap="round"/></svg>`;
    const P = PORTRAIT[who] || PORTRAIT['사람들'];
    const E = EXPR[expr] || EXPR['기본'];
    const cx = 50, cy = 50, hr = P.child ? 19 : 21;
    let g = `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="${P.bg}"/>`;
    g += `<path d="M10,100 Q14,76 36,72 L64,72 Q86,76 90,100 Z" fill="${P.robe}"/>`;
    if (P.veil) g += `<path d="M24,58 Q22,22 50,20 Q78,22 76,58 L82,96 L18,96 Z" fill="${P.cloth}"/>`;
    else if (P.cloth) g += `<path d="M27,50 Q26,22 50,21 Q74,22 73,50 L78,74 L22,74 Z" fill="${P.cloth}"/>`;
    g += `<rect x="44" y="62" width="12" height="12" fill="${P.skin}"/>`;
    g += `<ellipse cx="${cx}" cy="${cy}" rx="${hr - 1}" ry="${hr + 1}" fill="${P.skin}"/>`;
    if (P.hair) g += `<path d="M30,46 Q30,26 50,26 Q70,26 70,46 Q64,36 50,36 Q36,36 30,46 Z" fill="${P.hair}"/>`;
    if (P.veil) g += `<path d="M29,46 Q30,26 50,25 Q70,26 71,46 Q66,32 50,32 Q34,32 29,46 Z" fill="${P.cloth}"/>`;
    else if (P.cloth) g += `<path d="M28,44 Q30,24 50,24 Q70,24 72,44 Q64,33 50,33 Q36,33 28,44 Z" fill="${P.cloth}"/><rect x="29" y="38" width="42" height="3" rx="1.5" fill="#000" opacity=".2"/>`;
    if (P.helmet) g += `<path d="M28,46 Q28,22 50,22 Q72,22 72,46 L72,40 Q50,30 28,40 Z" fill="#b0a090"/><rect x="47" y="12" width="6" height="14" fill="#c03030"/>`;
    // 눈썹
    const by = 43, bt = E.brow;
    g += `<path d="M37,${by + bt} L45,${by}" stroke="${P.brow}" stroke-width="2.4" stroke-linecap="round"/><path d="M55,${by} L63,${by + bt}" stroke="${P.brow}" stroke-width="2.4" stroke-linecap="round"/>`;
    // 눈
    const ey = 50;
    if (E.eye === 'smile') g += `<path d="M38,${ey + 1} Q41,${ey - 3} 44,${ey + 1}" stroke="#2a1a10" stroke-width="2.2" fill="none" stroke-linecap="round"/><path d="M56,${ey + 1} Q59,${ey - 3} 62,${ey + 1}" stroke="#2a1a10" stroke-width="2.2" fill="none" stroke-linecap="round"/>`;
    else if (E.eye === 'wide') g += `<circle cx="41" cy="${ey}" r="3.2" fill="#fff"/><circle cx="41" cy="${ey}" r="1.8" fill="#2a1a10"/><circle cx="59" cy="${ey}" r="3.2" fill="#fff"/><circle cx="59" cy="${ey}" r="1.8" fill="#2a1a10"/>`;
    else if (E.eye === 'down') g += `<path d="M38,${ey} Q41,${ey + 2} 44,${ey}" stroke="#2a1a10" stroke-width="2.2" fill="none" stroke-linecap="round"/><path d="M56,${ey} Q59,${ey + 2} 62,${ey}" stroke="#2a1a10" stroke-width="2.2" fill="none" stroke-linecap="round"/>`;
    else g += `<ellipse cx="41" cy="${ey}" rx="2" ry="${P.age === 'old' ? 1.6 : 2.4}" fill="#2a1a10"/><ellipse cx="59" cy="${ey}" rx="2" ry="${P.age === 'old' ? 1.6 : 2.4}" fill="#2a1a10"/>`;
    if (P.age === 'old') g += `<path d="M36,55 Q39,57 42,55 M58,55 Q61,57 64,55" stroke="#000" stroke-opacity=".18" stroke-width="1.2" fill="none"/>`;
    if (E.tear) g += `<path d="M62,53 Q63,58 61,60 Q59,58 62,53 Z" fill="#9fd4ff"/>`;
    if (E.blush) g += `<ellipse cx="36" cy="57" rx="4" ry="2.2" fill="#e88a8a" opacity=".45"/><ellipse cx="64" cy="57" rx="4" ry="2.2" fill="#e88a8a" opacity=".45"/>`;
    // 수염
    if (P.beard) g += `<path d="M31,52 Q31,82 50,86 Q69,82 69,52 Q64,66 50,66 Q36,66 31,52 Z" fill="${P.beard}"/>`;
    // 입
    const my = P.beard ? 62 : 61, mc = P.beard ? '#3a2018' : '#7a3a2a';
    const M = { flat: `<path d="M45,${my} L55,${my}" stroke="${mc}" stroke-width="2.2" stroke-linecap="round"/>`,
      smile: `<path d="M43,${my - 1} Q50,${my + 5} 57,${my - 1}" stroke="${mc}" stroke-width="2.2" fill="none" stroke-linecap="round"/>`,
      open: `<path d="M43,${my - 1} Q50,${my + 8} 57,${my - 1} Z" fill="${mc}"/>`,
      o: `<ellipse cx="50" cy="${my + 1}" rx="3.2" ry="4" fill="${mc}"/>`,
      sad: `<path d="M44,${my + 2} Q50,${my - 3} 56,${my + 2}" stroke="${mc}" stroke-width="2.2" fill="none" stroke-linecap="round"/>`,
      wavy: `<path d="M44,${my} Q47,${my - 2} 50,${my} T56,${my}" stroke="${mc}" stroke-width="2" fill="none" stroke-linecap="round"/>` };
    g += M[E.mouth] || M.flat;
    g += `</svg>`;
    return g;
  }

  function render(name) {
    const fn = scenes[name];
    if (!fn) return `<svg viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="#0b1026"/><text x="180" y="270" fill="#888" text-anchor="middle" font-size="14">장면 '${name}' 없음</text></svg>`;
    return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">${fn()}</svg>`;
  }

  window.Art = { nameOf, setChapter: n => { A.ch = n; }, castOf, render, bigStar, lampShape, LAMP_DEF, person, portrait, EXPR };
})();
