/* 나의 밤하늘: 편을 끝내면 별이 뜨고, 빛 조각을 다 모으면 그 별이 환해진다.
   한 장(章)의 별이 다 환해지면 별자리가 이어져 그림이 완성된다. */
(function () {
  // 장마다 별자리 모양 (100×70 상자 안 좌표). pts 순서 = 그 장의 편 순서
  const SHAPES = {
    1: { name: '등불자리', who: '사가랴', pts: [[50, 6], [50, 22], [30, 32], [18, 46], [44, 56], [72, 48], [88, 34]], lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 1]] },
    2: { name: '집자리', who: '요셉', pts: [[16, 62], [16, 34], [50, 8], [84, 34], [84, 62], [56, 62], [56, 44]], lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [1, 3]] },
    3: { name: '마음자리', who: '마리아', pts: [[50, 22], [30, 8], [12, 26], [50, 64], [88, 26], [70, 8], [50, 40]], lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0]] },
    4: { name: '양자리', who: '목자', pts: [[14, 26], [34, 18], [72, 20], [76, 52], [36, 52]], lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 1]] }
  };
  const BOX = { 1: [14, 18], 2: [196, 18], 3: [14, 150], 4: [196, 150] }; // 장마다 놓을 자리 (360×280 하늘)
  const SC = 1.5;

  const gemCache = {};
  function gemTotal(id) {
    if (id in gemCache) return gemCache[id];
    const src = (window.STORY || {})[id] || '';
    return (gemCache[id] = new Set([...src.matchAll(/\[\[([^\]]+)\]\]/g)].map(m => m[1])).size);
  }
  // 편 하나의 별 상태: 0 안 뜸 · 1 떴음 · 2 환함(빛 조각 다)
  function level(id) {
    const D = Core.data;
    if (!D.done[id]) return 0;
    const got = ((D.gems || {})[id] || []).length, t = gemTotal(id);
    return !t || got >= t ? 2 : 1;
  }
  function chapter(n) {
    const eps = EPISODES.filter(e => e.ch === n);
    const lv = eps.map(e => level(e.id));
    return { eps, lv, lit: lv.filter(v => v).length, bright: lv.filter(v => v === 2).length, full: lv.length && lv.every(v => v === 2) };
  }
  function stats() {
    let gems = 0, total = 0, full = 0;
    for (const e of EPISODES) { if (e.id === '0') continue; total += gemTotal(e.id); gems += Math.min(((Core.data.gems || {})[e.id] || []).length, gemTotal(e.id)); }
    for (const n of [1, 2, 3, 4]) if (chapter(n).full) full++;
    return { gems, total, full };
  }

  // 별 하나 그리기
  function star(x, y, lv, extra) {
    if (!lv) return `<circle cx="${x}" cy="${y}" r="1.6" fill="none" stroke="rgba(190,205,255,.28)" stroke-width=".8" ${extra || ''}/>`;
    const r = lv === 2 ? 3.4 : 2.2, c = lv === 2 ? '#ffe7a6' : '#d9e2ff';
    return `<g ${extra || ''}>${lv === 2 ? `<circle cx="${x}" cy="${y}" r="9" fill="url(#skyGlow)"/><path d="M${x} ${y - 8}L${x + 1} ${y - 1}L${x + 8} ${y}L${x + 1} ${y + 1}L${x} ${y + 8}L${x - 1} ${y + 1}L${x - 8} ${y}L${x - 1} ${y - 1}Z" fill="${c}" opacity=".85"/>` : ''}${lv === 1 ? `<circle cx="${x}" cy="${y}" r="4.5" fill="none" stroke="rgba(200,215,255,.35)" stroke-width=".7" stroke-dasharray="1.5 2"/>` : ''}<circle cx="${x}" cy="${y}" r="${r}" fill="${c}"/></g>`;
  }
  function constellation(n, ox, oy, sc, opt) {
    opt = opt || {};
    const S = SHAPES[n], C = chapter(n);
    const P = S.pts.map(([x, y]) => [ox + x * sc, oy + y * sc]);
    let g = '';
    for (const [a, b] of S.lines) {
      if (!C.lv[a] || !C.lv[b]) continue;
      const both = C.lv[a] === 2 && C.lv[b] === 2;
      g += `<line x1="${P[a][0]}" y1="${P[a][1]}" x2="${P[b][0]}" y2="${P[b][1]}" stroke="${C.full ? '#ffd27a' : both ? 'rgba(255,220,150,.6)' : 'rgba(200,215,255,.42)'}" stroke-width="${C.full ? 1.4 : 1}" ${both ? '' : 'stroke-dasharray="2 3"'}/>`;
    }
    P.forEach((p, i) => {
      const e = C.eps[i]; if (!e) return;
      const isNew = opt.focus === e.id;
      g += star(p[0], p[1], C.lv[i], `class="sk-star${isNew ? ' sk-new' : ''}" data-id="${e.id}"`);
    });
    const lx = ox + 50 * sc, ly = oy + 70 * sc + 16;
    g += `<text x="${lx}" y="${ly}" text-anchor="middle" class="sk-name${C.full ? ' full' : ''}">${C.full ? '✦ ' : ''}${S.name}${C.full ? ' ✦' : ` ${C.bright}/${C.eps.length}`}</text>`;
    return g;
  }
  // 바탕 잔별 (매번 같은 자리)
  function dust(w, h, n) {
    let s = 7, out = '';
    const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;
    for (let i = 0; i < n; i++) out += `<circle cx="${(rnd() * w).toFixed(1)}" cy="${(rnd() * h).toFixed(1)}" r="${(rnd() * .7 + .2).toFixed(2)}" fill="#fff" opacity="${(rnd() * .35 + .1).toFixed(2)}"/>`;
    return out;
  }
  const DEFS = `<defs><radialGradient id="skyGlow"><stop offset="0" stop-color="#ffe7a6" stop-opacity=".55"/><stop offset="1" stop-color="#ffe7a6" stop-opacity="0"/></radialGradient></defs>`;

  // 홈의 밤하늘 전체
  function svg() {
    let g = DEFS + dust(360, 290, 70);
    for (const n of [1, 2, 3, 4]) g += constellation(n, BOX[n][0], BOX[n][1], SC);
    // 가운데: 성탄 밤의 별
    const lv = level('end');
    g += lv ? `<g class="sk-star" data-id="end"><circle cx="180" cy="134" r="16" fill="url(#skyGlow)"/>${star(180, 134, 2)}</g>`
            : `<circle cx="180" cy="134" r="2" fill="none" stroke="rgba(255,231,166,.35)" stroke-width=".8" class="sk-star" data-id="end"/>`;
    return `<svg viewBox="0 0 360 290" class="sky-svg" role="img" aria-label="나의 밤하늘">${g}</svg>`;
  }
  // 편을 끝낸 화면: 그 장의 별자리만
  function mini(id) {
    const e = Core.epById(id);
    if (!e || !SHAPES[e.ch]) return '';
    return `<svg viewBox="0 0 170 135" class="sky-mini">${DEFS}${dust(170, 135, 18)}${constellation(e.ch, 10, 6, 1.5, { focus: id })}</svg>`;
  }
  function shape(id) { const e = Core.epById(id); return e && SHAPES[e.ch]; }
  window.Sky = { svg, mini, stats, level, gemTotal, chapter, shape };
})();
