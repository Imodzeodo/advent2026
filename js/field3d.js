/* 나의 들판 3D (로우폴리 밤 들판). three.js 번들은 들판을 열 때만 불러온다.
   API는 plans/2026-11-20-3D-들판.md 참고: Field3D.supported/load/mount/portrait */
(function () {
  const SCRIPT_URL = (document.currentScript && document.currentScript.src) || location.href;
  const VENDOR = new URL('vendor/three.min.js?v=1', SCRIPT_URL).href;
  let T = null, loading = null;

  /* ---------- 공용 도우미 ---------- */
  // 설정의 '움직임 줄이기' 또는 기기의 동작 줄이기
  const calm = () => document.documentElement.classList.contains('no-motion') || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  function seeded(seed) { let s = seed % 2147483647; if (s <= 0) s += 2147483646; return () => (s = s * 16807 % 2147483647) / 2147483647; }
  const hashStr = str => [...String(str)].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0, 2166136261);
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // 땅 높이: 가운데 들판은 완만하게, 뒤로 갈수록 언덕(베들레헴), 양옆도 살짝 오름
  function groundY(x, z) {
    let y = 0.32 * Math.sin(x * 0.23 + 1.3) * Math.cos(z * 0.19) + 0.22 * Math.sin((x + z) * 0.12 + 0.4);
    if (z < -9) { const k = clamp((-9 - z) / 24, 0, 1); y += 4.2 * k * k * (3 - 2 * k); }
    const side = Math.min(8, Math.max(0, Math.abs(x) - 12));
    y += side * side * 0.035;
    if (z > 12) y += Math.pow((z - 12) / 10, 2) * 2;
    return y;
  }
  // 들판 입구에서 가운데로 들어오는 오솔길
  const PATH = [[-16, 14], [-10.5, 10.6], [-7, 8.6], [-3.6, 7.0], [-0.6, 5.0]];
  function pathDist(x, z) {
    let best = 1e9;
    for (let i = 0; i < PATH.length - 1; i++) {
      const [ax, az] = PATH[i], [bx, bz] = PATH[i + 1];
      const dx = bx - ax, dz = bz - az, t = clamp(((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz), 0, 1);
      best = Math.min(best, Math.hypot(x - (ax + dx * t), z - (az + dz * t)));
    }
    return best;
  }

  // 들판 배치 기준(세계 좌표)
  const PASTURE = { x0: -5.6, x1: 5.6, z0: -2.4, z1: 9.0 };
  const SLOTS = [
    [-6.4, -3.0], [-2.4, -4.6], [2.4, -4.6], [6.4, -3.0],
    [-7.0, 2.6], [-6.4, 7.0], [6.4, 7.0], [7.0, 2.6],
    [-5.2, 6.4, -7], [5.4, 7.4, -9]   // 하늘 칸: x, 높이, z
  ];
  const GATE = [[-1.9, 7.2], [-0.6, 8.0]];

  function radialTexture(inner, outer, size = 128) {
    const c = document.createElement('canvas'); c.width = c.height = size;
    const g = c.getContext('2d'), r = size / 2;
    const grd = g.createRadialGradient(r, r, 0, r, r, r);
    grd.addColorStop(0, inner); grd.addColorStop(0.35, inner.replace(/[\d.]+\)$/, '0.45)')); grd.addColorStop(1, outer);
    g.fillStyle = grd; g.fillRect(0, 0, size, size);
    const tex = new T.CanvasTexture(c); tex.colorSpace = T.SRGBColorSpace; return tex;
  }
  function starTexture() {
    const s = 256, c = document.createElement('canvas'); c.width = c.height = s;
    const g = c.getContext('2d'), r = s / 2;
    let grd = g.createRadialGradient(r, r, 0, r, r, r * 0.5);
    grd.addColorStop(0, 'rgba(255,255,245,1)'); grd.addColorStop(0.2, 'rgba(255,240,200,.85)'); grd.addColorStop(1, 'rgba(255,220,150,0)');
    g.fillStyle = grd; g.fillRect(0, 0, s, s);
    g.globalCompositeOperation = 'lighter';
    for (const [w, h, a] of [[s, 5, 0.9], [5, s, 0.9], [s * 0.55, 3, 0.5], [3, s * 0.55, 0.5]]) {
      const lg = g.createLinearGradient(w > h ? 0 : r, w > h ? r : 0, w > h ? s : r, w > h ? r : s);
      lg.addColorStop(0, 'rgba(255,240,210,0)'); lg.addColorStop(0.5, `rgba(255,248,225,${a})`); lg.addColorStop(1, 'rgba(255,240,210,0)');
      g.fillStyle = lg; g.fillRect(r - w / 2, r - h / 2, w, h);
    }
    const tex = new T.CanvasTexture(c); tex.colorSpace = T.SRGBColorSpace; return tex;
  }
  function textSprite(text, opt = {}) {
    const c = document.createElement('canvas'), g = c.getContext('2d');
    c.width = 128; c.height = 128;
    g.font = `700 ${opt.size || 84}px "Apple SD Gothic Neo", sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    if (opt.bubble) { g.fillStyle = '#ffe08a'; g.beginPath(); g.arc(64, 60, 46, 0, Math.PI * 2); g.fill(); g.beginPath(); g.moveTo(52, 98); g.lineTo(64, 122); g.lineTo(76, 98); g.fill(); g.fillStyle = '#3a2a10'; }
    else g.fillStyle = opt.color || '#ffffff';
    g.fillText(text, 64, 62);
    const tex = new T.CanvasTexture(c); tex.colorSpace = T.SRGBColorSpace;
    const sp = new T.Sprite(new T.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
    return sp;
  }

  /* ---------- 재질 캐시 ---------- */
  const matCache = new Map();
  function mat(color, opt = {}) {
    const key = color + JSON.stringify(opt);
    if (!matCache.has(key)) {
      matCache.set(key, opt.basic
        ? new T.MeshBasicMaterial({ color, transparent: !!opt.transparent, opacity: opt.opacity ?? 1, depthWrite: !opt.transparent })
        : new T.MeshStandardMaterial({ color, flatShading: true, roughness: opt.rough ?? 0.95, metalness: opt.metal ?? 0, emissive: opt.emissive || '#000000', emissiveIntensity: opt.ei ?? 1, transparent: !!opt.transparent, opacity: opt.opacity ?? 1 }));
    }
    return matCache.get(key);
  }
  function place(geo, x, y, z, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0) {
    const g = geo.clone();
    const m = new T.Matrix4().compose(new T.Vector3(x, y, z), new T.Quaternion().setFromEuler(new T.Euler(rx, ry, rz)), new T.Vector3(sx, sy, sz));
    g.applyMatrix4(m);
    return g.index ? g.toNonIndexed() : g;
  }
  function merged(list, material) {
    const geo = T.mergeGeometries(list.map(g => { const n = g.index ? g.toNonIndexed() : g; n.deleteAttribute('uv'); return n; }), false);
    geo.computeVertexNormals();
    const m = new T.Mesh(geo, material);
    return m;
  }

  /* ---------- 양 만들기 ---------- */
  const WEAR = {
    '빨간 목도리': { kind: 'scarf', color: '#c23b3b' }, '꽃 화관': { kind: 'flower' }, '보라 방울': { kind: 'bell', color: '#8a5bd6' },
    '은 종': { kind: 'bell', color: '#d9dee6', metal: 0.6 }, '분홍 리본': { kind: 'ribbon', color: '#f39ac0' }, '금빛 별 목걸이': { kind: 'star', color: '#ffd24a' }
  };
  const stageOf = lv => lv >= 10 ? 3 : lv >= 5 ? 2 : lv >= 2 ? 1 : 0;

  function buildSheep(species, level = 1, wear = null, seed = 1, woolLen = 1) {
    const dex = (window.SHEEP_DEX && window.SHEEP_DEX.byId[species]) || window.SHEEP_DEX?.[0];
    const L = dex.look, st = stageOf(level), rnd = seeded(seed * 97 + hashStr(species));
    const root = new T.Group(); root.userData.kind = 'sheep';
    const body = new T.Group(); root.add(body);
    const ico = new T.IcosahedronGeometry(1, 0), oct = new T.OctahedronGeometry(1, 0);
    const wide = L.round ? 1.14 : 1;
    // 속몸(털을 깎아도 남는 짧은 털) — 털색을 살짝 분홍빛으로
    const skin = new T.Color(L.wool).lerp(new T.Color('#f2c9b8'), 0.35).getStyle();
    body.add(new T.Mesh(place(ico, 0, 0.78, -0.02, 0.4 * wide, 0.34, 0.6), mat(skin, { rough: 1 })));
    // 바깥 털(깎이는 부분): 몸 가운데(0,0.8,0)를 기준으로 줄었다 늘었다
    const woolG = new T.Group(); woolG.position.set(0, 0.8, 0); body.add(woolG);
    const puffs = [], spots = [], specks = [];
    const count = Math.round(9 + L.curl * 7 + (st >= 2 ? 4 : 0));
    const pr = (0.36 - L.curl * 0.08) * (st === 0 ? 1.1 : 1);
    const rate = L.spotRate ?? 0.3;
    puffs.push(place(ico, 0, 0, -0.02, 0.56 * wide, 0.46, 0.74));
    for (let i = 0; i < count; i++) {
      const u = rnd() * Math.PI * 2, v = (rnd() * 0.9 + 0.05) * Math.PI * 0.62;
      const x = Math.cos(u) * Math.sin(v) * 0.52 * wide, y = Math.cos(v) * 0.36, z = Math.sin(u) * Math.sin(v) * 0.7;
      const sz = pr * (0.75 + rnd() * 0.5);
      const g = place(ico, x, y, z, sz, sz * 0.92, sz, rnd() * 3, rnd() * 3, rnd() * 3);
      (L.spots && rnd() < rate ? spots : puffs).push(g);
      if (L.acc === 'starry' && i % 2 === 0) specks.push(place(oct, x * 1.2, y * 1.16 + 0.03, z * 1.14, 0.075, 0.075, 0.075, rnd(), rnd(), 0));
    }
    for (let i = 0; i < 4; i++) puffs.push(place(ico, (rnd() - 0.5) * 0.5, -0.22, (rnd() - 0.5) * 0.9, 0.28, 0.2, 0.3, rnd() * 3, rnd() * 3, 0));
    puffs.push(place(ico, 0, 0.08, -0.78, 0.16, 0.15, 0.14, 1, 0.4, 0));
    const woolMat = mat(L.wool, { rough: L.metal ? 0.5 : 1, metal: L.metal || 0 });
    woolG.add(merged(puffs, woolMat));
    if (spots.length) woolG.add(merged(spots, mat(L.spots, { rough: 1 })));
    if (specks.length) woolG.add(merged(specks, mat('#ffe08a', { emissive: '#ffcf4a', ei: 1.6 })));
    // 머리
    const head = new T.Group(); head.position.set(0, 1.0, 0.72); body.add(head);
    const hs = st === 0 ? 1.18 : 1;
    head.add(merged([place(ico, 0, 0, 0.08, 0.25 * hs, 0.27 * hs, 0.34 * hs, 0.2, 0, 0), place(ico, 0, -0.06, 0.32 * hs, 0.17 * hs, 0.16 * hs, 0.16 * hs)], mat(L.face)));
    const tuft = [], tn = L.bigTuft ? 7 : 4, tk = L.bigTuft ? 1.45 : 1;
    for (let i = 0; i < tn; i++) tuft.push(place(ico, (i - (tn - 1) / 2) * 0.08, 0.22 * hs + (i % 2) * 0.04 * tk, -0.02 + (i % 2) * 0.06, 0.12 * tk, 0.1 * tk, 0.12 * tk, i, i * 2, 0));
    const tuftMesh = merged(tuft, woolMat); head.add(tuftMesh);
    for (const sx of [-1, 1]) {   // 귀
      const ear = new T.Group(); ear.position.set(sx * 0.24 * hs, 0.08, 0.02); ear.rotation.set(0.2, 0, sx * -0.9);
      ear.add(new T.Mesh(place(oct, sx * 0.12, 0, 0, 0.16, 0.05, 0.09), mat(L.face)));
      ear.add(new T.Mesh(place(oct, sx * 0.13, 0.012, 0.01, 0.11, 0.03, 0.055), mat(L.ear)));
      head.add(ear);
    }
    const eyeW = new T.SphereGeometry(1, 6, 4);
    for (const sx of [-1, 1]) {   // 눈(까망이는 흰 눈테)
      if (L.eyeRing) head.add(new T.Mesh(place(eyeW, sx * 0.14 * hs, 0.06 * hs, 0.232 * hs, 0.09, 0.095, 0.04), mat('#efe9df', { basic: true })));
      head.add(new T.Mesh(place(eyeW, sx * 0.14 * hs, 0.06 * hs, 0.24 * hs, 0.065, 0.07, 0.04), mat('#f5f2ea', { basic: true })));
      head.add(new T.Mesh(place(eyeW, sx * 0.152 * hs, 0.06 * hs, 0.262 * hs, 0.04, 0.046, 0.025), mat('#121014', { basic: true })));
      if (L.blush) head.add(new T.Mesh(place(eyeW, sx * 0.17 * hs, -0.04 * hs, 0.25 * hs, 0.05, 0.03, 0.02), mat('#ff8fa8', { basic: true })));
    }
    if (L.horns) {
      const tor = new T.TorusGeometry(0.13, 0.045, 5, 9, Math.PI * 1.35);
      for (const sx of [-1, 1]) head.add(new T.Mesh(place(tor, sx * 0.2, 0.14, -0.06, 1, 1, 1, 0, sx * 1.4, sx > 0 ? 0.3 : 2.8), mat('#d9c7a3')));
    }
    // 다리
    const legGeo = new T.CylinderGeometry(0.08, 0.065, 0.5, 5);
    const legs = [];
    for (const [lx, lz] of [[-0.27, 0.42], [0.27, 0.42], [-0.27, -0.42], [0.27, -0.42]]) {
      const leg = new T.Group(); leg.position.set(lx, 0.5, lz);
      leg.add(new T.Mesh(place(legGeo, 0, -0.25, 0), mat(L.face)));
      if (L.acc === 'springs') leg.add(new T.Mesh(place(new T.TorusGeometry(0.08, 0.022, 4, 8), 0, -0.42, 0, 1, 1, 1, Math.PI / 2, 0, 0), mat('#b9bec9', { metal: 0.6, rough: 0.4 })));
      body.add(leg); legs.push(leg);
    }
    // 장식(꾸미기가 기본 장식보다 우선) + 종 고유 장식
    const w = wear && WEAR[wear];
    const anim = { flames: [], drops: [], halo: null };
    addAccessory(body, head, w ? w.kind : L.acc, w || {}, st >= 2 || !!w);
    addSignature(body, head, L.acc, anim, woolG);
    // 빛나는 털
    const glows = [];
    if (L.glow) { const g = glowSprite(L.glow, 2.6, 0.42); g.position.set(0, 0.83, 0); body.add(g); glows.push(g); }
    if (st === 3) { const g = glowSprite('#ffe9b0', 3.2, 0.32); g.position.set(0, 0.88, 0); body.add(g); glows.push(g); root.userData.halo = true; }
    // 둥근 그림자
    const sh = new T.Mesh(new T.CircleGeometry(0.85, 16), mat('#000000', { basic: true, transparent: true, opacity: 0.32 }));
    sh.rotation.x = -Math.PI / 2; sh.position.y = 0.03; root.add(sh);
    const hit = new T.Mesh(new T.BoxGeometry(1.4, 1.7, 2.0), new T.MeshBasicMaterial({ visible: false }));
    hit.position.y = 0.9; root.add(hit); root.userData.hit = hit;
    const scale = [0.62, 0.8, 1, 1.04][st] * (L.size || 1);
    root.scale.setScalar(scale);
    const wl = clamp(woolLen ?? 1, 0, 1);
    Object.assign(root.userData, { body, head, legs, glows, species, level, wear, st, scale, woolG, tuftMesh, anim, wool: wl, woolShown: wl, woolColor: L.wool });
    applyWool(root);
    return root;
  }
  // 털 길이 반영: 0이면 홀쭉(바깥 털이 속몸 크기만큼 줄어듦)
  function applyWool(o) {
    const u = o.userData, k = 0.36 + 0.64 * u.woolShown;
    u.woolG.scale.set(k, 0.42 + 0.58 * u.woolShown, k);
    u.tuftMesh.scale.setScalar(0.5 + 0.5 * u.woolShown);
  }
  // 종마다 한눈에 구분되는 장식
  function addSignature(body, head, kind, anim, woolG) {
    const ico = new T.IcosahedronGeometry(1, 0), oct = new T.OctahedronGeometry(1, 0), cone = new T.ConeGeometry(1, 1, 6);
    if (kind === 'nightcap') {
      head.add(new T.Mesh(place(cone, 0.02, 0.4, -0.06, 0.17, 0.46, 0.17, -0.55, 0, 0.35), mat('#4a5fc1')));
      head.add(new T.Mesh(place(ico, -0.1, 0.55, -0.3, 0.07, 0.07, 0.07), mat('#ffffff')));
      head.add(new T.Mesh(place(new T.TorusGeometry(0.17, 0.04, 4, 10), 0, 0.27, -0.02, 1, 1, 1, Math.PI / 2 - 0.2, 0, 0), mat('#f2f2f2')));
    } else if (kind === 'grass') {
      for (let i = 0; i < 3; i++) head.add(new T.Mesh(place(new T.BoxGeometry(1, 1, 1), 0.06 + i * 0.05, -0.12, 0.46, 0.02, 0.22, 0.02, 0.2, 0, -0.9 + i * 0.25), mat('#7fbf5a')));
    } else if (kind === 'bow') {
      for (const sx of [-1, 1]) head.add(new T.Mesh(place(new T.ConeGeometry(0.1, 0.22, 4), sx * 0.12, 0.3, -0.04, 1, 1, 1, 0, 0, sx * 1.57), mat('#ff7aa8')));
      head.add(new T.Mesh(place(ico, 0, 0.3, -0.04, 0.06, 0.06, 0.06), mat('#ff7aa8')));
    } else if (kind === 'flame') {
      const g = new T.Group(); g.position.set(0, 0.32, -0.02); head.add(g);
      [['#ff6a1a', 0.14, 0.42], ['#ffb13b', 0.1, 0.32], ['#fff0a0', 0.06, 0.2]].forEach(([c, r, h]) => g.add(new T.Mesh(place(cone, 0, h / 2, 0, r, h, r), mat(c, { emissive: c, ei: 2 }))));
      anim.flames.push(g);
    } else if (kind === 'drops') {
      for (let i = 0; i < 3; i++) { const d = new T.Mesh(place(ico, 0, 0, 0, 0.06, 0.09, 0.06), mat('#bfeaff', { emissive: '#5fb7e6', ei: 0.6, transparent: true, opacity: 0.85 })); d.position.set((i - 1) * 0.28, 1.55 + i * 0.06, 0.5); body.add(d); anim.drops.push(d); }
    } else if (kind === 'backpack') {
      body.add(new T.Mesh(place(new T.BoxGeometry(1, 1, 1), 0, 1.22, -0.3, 0.42, 0.34, 0.3, -0.15, 0, 0), mat('#5b7a3e')));
      body.add(new T.Mesh(place(new T.BoxGeometry(1, 1, 1), 0, 1.42, -0.3, 0.46, 0.08, 0.32, -0.15, 0, 0), mat('#3f5a2a')));
      body.add(new T.Mesh(place(new T.CylinderGeometry(0.06, 0.06, 0.5, 6), 0, 1.45, -0.48, 1, 1, 1, 0, 0, Math.PI / 2), mat('#c94a3a')));
    } else if (kind === 'comet') {
      const g = glowSprite('#c6b6ff', 1.4, 0.55); g.position.set(0, 1.1, -0.95); body.add(g); anim.drops.push(g);
    } else if (kind === 'crown') {
      const gold = mat('#ffd24a', { metal: 0.7, rough: 0.3, emissive: '#7a5a10', ei: 0.4 });
      head.add(new T.Mesh(place(new T.CylinderGeometry(0.16, 0.18, 0.09, 8, 1, true), 0, 0.34, -0.02), gold));
      for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; head.add(new T.Mesh(place(cone, Math.cos(a) * 0.15, 0.44, -0.02 + Math.sin(a) * 0.15, 0.045, 0.12, 0.045), gold)); }
    } else if (kind === 'halo') {
      const h = new T.Mesh(new T.TorusGeometry(0.22, 0.03, 6, 20), mat('#fff6d0', { emissive: '#ffe9a0', ei: 1.8 }));
      h.rotation.x = Math.PI / 2; h.position.set(0, 0.52, -0.02); head.add(h); anim.halo = h;
    }
  }
  function glowSprite(color, size, opacity) {
    const c = new T.Color(color);
    const sp = new T.Sprite(new T.SpriteMaterial({ map: radialTexture(`rgba(${c.r * 255 | 0},${c.g * 255 | 0},${c.b * 255 | 0},1)`, 'rgba(0,0,0,0)'), color: '#ffffff', transparent: true, opacity, blending: T.AdditiveBlending, depthWrite: false }));
    sp.scale.setScalar(size); return sp;
  }
  function addAccessory(body, head, kind, opt, big) {
    if (!kind) return;
    const ico = new T.IcosahedronGeometry(1, 0), oct = new T.OctahedronGeometry(1, 0);
    if (kind === 'scarf') {
      const t = new T.Mesh(new T.TorusGeometry(0.3, 0.11, 5, 10), mat(opt.color || '#b8484a'));
      t.position.set(0, 0.9, 0.56); t.rotation.set(1.2, 0, 0); body.add(t);
      const tail = new T.Mesh(place(new T.BoxGeometry(1, 1, 1), 0.2, 0.68, 0.7, 0.14, 0.34, 0.07, 0.2, 0, -0.25), mat(opt.color || '#b8484a')); body.add(tail);
    } else if (kind === 'flower') {
      const cols = ['#ff9ac0', '#ffe08a', '#ffffff', '#c9a0ff', '#ff9ac0'];
      cols.forEach((c, i) => { const m = new T.Mesh(place(oct, -0.24 + i * 0.12, 0.28, -0.02 + (i % 2) * 0.07, 0.09, 0.07, 0.09), mat(c, { emissive: c, ei: 0.15 })); head.add(m); });
    } else if (kind === 'bell') {
      const col = opt.color || '#e2b94a';
      body.add(new T.Mesh(place(new T.TorusGeometry(0.29, 0.045, 4, 12), 0, 0.84, 0.6, 1, 1, 1, 1.25, 0, 0), mat('#7a4a2a')));
      body.add(new T.Mesh(place(new T.ConeGeometry(0.15, 0.2, 7), 0, 0.64, 0.82, 1, 1, 1), mat(col, { metal: opt.metal ?? 0.4, rough: 0.5, emissive: col, ei: 0.08 })));
    } else if (kind === 'ribbon') {
      const col = opt.color || '#f39ac0';
      for (const sx of [-1, 1]) head.add(new T.Mesh(place(new T.ConeGeometry(0.1, 0.24, 4), sx * 0.13, 0.27, -0.05, 1, 1, 1, 0, 0, sx * 1.57), mat(col)));
      head.add(new T.Mesh(place(ico, 0, 0.27, -0.05, 0.07, 0.07, 0.07), mat(col)));
    } else if (kind === 'star') {
      const col = opt.color || '#ffd24a';
      body.add(new T.Mesh(place(new T.TorusGeometry(0.29, 0.035, 4, 12), 0, 0.84, 0.6, 1, 1, 1, 1.25, 0, 0), mat('#c9a24a', { metal: 0.5, rough: 0.4 })));
      body.add(new T.Mesh(place(oct, 0, 0.62, 0.84, 0.16, 0.16, 0.06, 0, 0, Math.PI / 4), mat(col, { emissive: col, ei: 0.6 })));
    } else if (kind === 'leaf') {
      for (const sx of [-1, 1]) head.add(new T.Mesh(place(oct, sx * 0.07, 0.3, -0.02, 0.05, 0.13, 0.03, 0, 0, sx * -0.5), mat('#7fa15a')));
    } else if (kind === 'lantern') {
      body.add(new T.Mesh(place(new T.TorusGeometry(0.29, 0.035, 4, 12), 0, 0.84, 0.6, 1, 1, 1, 1.25, 0, 0), mat('#6b4a2a')));
      body.add(new T.Mesh(place(new T.BoxGeometry(1, 1, 1), 0, 0.66, 0.8, 0.12, 0.15, 0.12), mat('#ffd27a', { emissive: '#ffbf4a', ei: 1.4 })));
    } else if (kind === 'harp') {
      body.add(new T.Mesh(place(new T.TorusGeometry(0.16, 0.025, 4, 10, Math.PI), 0, 1.26, -0.15, 1, 1, 1, 0, 1.57, 0), mat('#e6c25a', { metal: 0.6, rough: 0.35 })));
    }
  }

  /* ---------- 물건 만들기 ---------- */
  function buildItem(id, ctx) {
    const g = new T.Group(); g.userData.kind = 'item'; g.userData.item = id;
    const box = new T.BoxGeometry(1, 1, 1), cyl = new T.CylinderGeometry(1, 1, 1, 6), ico = new T.IcosahedronGeometry(1, 0), dod = new T.DodecahedronGeometry(1, 0), cone = new T.ConeGeometry(1, 1, 6);
    const wood = mat('#8a6440'), woodD = mat('#5e4128'), stone = mat('#8d8a86'), stoneD = mat('#6d6a69');
    const add = (geo, m) => { const mesh = geo.isMesh ? geo : new T.Mesh(geo, m); g.add(mesh); return mesh; };
    if (id === '나무 울타리') {
      const posts = [], rails = [];
      for (let i = -1; i <= 1; i++) posts.push(place(box, i * 0.9, 0.45, 0, 0.12, 0.9, 0.12, 0, 0, (i * 0.05)));
      rails.push(place(box, 0, 0.62, 0.02, 1.95, 0.08, 0.06, 0, 0, 0.02), place(box, 0, 0.3, 0.02, 1.95, 0.08, 0.06, 0, 0, -0.02));
      add(merged(posts, woodD)); add(merged(rails, wood));
    } else if (id === '올리브나무') {
      add(merged([place(cyl, 0, 0.55, 0, 0.13, 1.1, 0.13, 0, 0, 0.12), place(cyl, 0.14, 1.05, 0, 0.08, 0.5, 0.08, 0, 0, -0.6)], mat('#6b5440')));
      const r = seeded(7), leaves = [];
      for (let i = 0; i < 6; i++) leaves.push(place(ico, (r() - 0.5) * 1.1, 1.45 + r() * 0.5, (r() - 0.5) * 0.9, 0.42 + r() * 0.2, 0.32, 0.4, r() * 3, r() * 3, 0));
      add(merged(leaves, mat('#71895a')));
    } else if (id === '돌 양 우리') {
      const stones = [], r = seeded(11);
      for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; if (i === 3) continue; stones.push(place(dod, Math.cos(a) * 1.1, 0.18 + (i % 2) * 0.12, Math.sin(a) * 0.8, 0.24 + r() * 0.06, 0.2, 0.2, r() * 3, r() * 3, 0)); }
      add(merged(stones, stone));
    } else if (id === '모닥불') {
      const stones = [];
      for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; stones.push(place(dod, Math.cos(a) * 0.48, 0.08, Math.sin(a) * 0.48, 0.14, 0.11, 0.14, i, i, 0)); }
      add(merged(stones, stoneD));
      add(merged([place(cyl, 0, 0.12, 0, 0.06, 0.8, 0.06, 0, 0.5, 1.45), place(cyl, 0, 0.14, 0, 0.06, 0.8, 0.06, 0, -0.7, 1.45), place(cyl, 0, 0.16, 0, 0.06, 0.8, 0.06, 0, 1.8, 1.45)], woodD));
      const flame = new T.Group(); flame.position.y = 0.2; g.add(flame);
      const fl = [['#ff7a2a', 0.26, 0.75], ['#ffb13b', 0.18, 0.6], ['#fff0a0', 0.1, 0.38]];
      fl.forEach(([c, r, h], i) => { const m = new T.Mesh(place(new T.ConeGeometry(1, 1, 5), 0, h / 2, 0, r, h, r), mat(c, { emissive: c, ei: 2.2 - i * 0.3 })); flame.add(m); });
      const glow = glowSprite('#ff9a4a', 3.4, 0.55); glow.position.y = 0.5; g.add(glow);
      const light = new T.PointLight('#ff9a4a', 9, 9, 1.6); light.position.y = 0.9; g.add(light);
      g.userData.flicker = { flame, light, glow, base: 9 };
    } else if (id === '목자 천막') {
      const tent = new T.ConeGeometry(1, 1, 4);
      add(place(tent, 0, 0.75, 0, 1.25, 1.5, 1.1, 0, Math.PI / 4, 0), mat('#b59570'));
      add(place(tent, 0, 0.62, 0.32, 0.55, 1.22, 0.6, 0, Math.PI / 4, 0), mat('#3a2a20'));
      add(place(cyl, 0, 1.6, 0, 0.04, 0.4, 0.04), woodD);
      const stripe = add(place(new T.ConeGeometry(1, 1, 4, 1, true), 0, 0.98, 0, 0.92, 0.36, 0.82, 0, Math.PI / 4, 0), mat('#8c4a3a'));
      stripe.material = mat('#8c4a3a');
    } else if (id === '우물') {
      const ring = [];
      for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; ring.push(place(box, Math.cos(a) * 0.62, 0.32, Math.sin(a) * 0.62, 0.34, 0.6, 0.22, 0, -a, 0)); }
      add(merged(ring, stone));
      const water = add(new T.CircleGeometry(0.5, 12), mat('#2b4f7a', { emissive: '#1a3a66', ei: 0.6, rough: 0.2 })); water.rotation.x = -Math.PI / 2; water.position.y = 0.5;
      add(merged([place(box, -0.62, 1.0, 0, 0.08, 1.4, 0.08), place(box, 0.62, 1.0, 0, 0.08, 1.4, 0.08), place(box, 0, 1.62, 0, 1.4, 0.07, 0.07)], woodD));
      add(place(new T.ConeGeometry(1, 1, 4), 0, 1.92, 0, 1.0, 0.5, 0.7, 0, Math.PI / 4, 0), mat('#7a5a3a'));
      add(place(cyl, 0.1, 1.15, 0, 0.12, 0.18, 0.12), wood);
    } else if (id === '등불 기둥') {
      add(merged([place(box, 0, 0.8, 0, 0.1, 1.6, 0.1), place(box, 0.22, 1.58, 0, 0.5, 0.06, 0.06)], woodD));
      const lamp = add(place(box, 0.42, 1.38, 0, 0.2, 0.26, 0.2), mat('#ffd27a', { emissive: '#ffbf4a', ei: 2 }));
      add(place(new T.ConeGeometry(1, 1, 4), 0.42, 1.56, 0, 0.17, 0.1, 0.17, 0, Math.PI / 4, 0), mat('#3a2a1a'));
      const glow = glowSprite('#ffc860', 2.6, 0.6); glow.position.set(0.42, 1.38, 0); g.add(glow);
      const light = new T.PointLight('#ffc260', 6, 7, 1.6); light.position.set(0.42, 1.3, 0); g.add(light);
      g.userData.flicker = { light, glow, base: 6, soft: true };
      void lamp;
    } else if (id === '하늘 등') {
      const lan = new T.Group(); g.add(lan);
      lan.add(new T.Mesh(place(new T.CylinderGeometry(0.36, 0.24, 0.72, 8), 0, 0, 0), mat('#ffd890', { emissive: '#ff9a3a', ei: 1.9 })));
      lan.add(new T.Mesh(place(new T.CylinderGeometry(0.37, 0.37, 0.05, 8), 0, 0.36, 0), mat('#c98a3a', { emissive: '#7a4a10', ei: 0.6 })));
      lan.add(new T.Mesh(place(new T.OctahedronGeometry(1, 0), 0, -0.42, 0, 0.07, 0.12, 0.07), mat('#fff0b0', { emissive: '#ffd060', ei: 3 })));
      const glow = glowSprite('#ffb85a', 2.4, 0.7); lan.add(glow);
      g.userData.float = { obj: lan, seed: Math.random() * 6 };
    } else if (id === '별똥별 비') {
      g.userData.meteors = true;   // 하늘 효과는 장면 갱신에서
      const sp = glowSprite('#c6b6ff', 1.2, 0.5); g.add(sp);
    } else if (id === '들꽃 밭') {
      const r = seeded(5), stems = [], cols = ['#ff9ac0', '#ffe08a', '#ffffff', '#c9a0ff'];
      const petals = cols.map(() => []);
      for (let i = 0; i < 26; i++) {
        const x = (r() - 0.5) * 1.8, z = (r() - 0.5) * 1.4, h = 0.18 + r() * 0.16;
        stems.push(place(box, x, h / 2, z, 0.02, h, 0.02));
        petals[i % 4].push(place(new T.OctahedronGeometry(1, 0), x, h + 0.03, z, 0.07, 0.04, 0.07, 0, r() * 3, 0));
      }
      add(merged(stems, mat('#4f7a3e')));
      petals.forEach((p, i) => add(merged(p, mat(cols[i], { emissive: cols[i], ei: 0.12 }))));
    } else if (id === '하프') {
      add(merged([place(dod, 0, 0.18, 0, 0.42, 0.18, 0.42)], stone));
      const gold = mat('#e6c25a', { metal: 0.6, rough: 0.35, emissive: '#7a5a10', ei: 0.3 });
      add(place(new T.TorusGeometry(0.42, 0.05, 5, 12, Math.PI * 1.2), 0, 0.85, 0, 1, 1.25, 1, 0, 0, -0.3), gold);
      add(place(box, -0.25, 0.7, 0, 0.07, 0.75, 0.07, 0, 0, 0.12), gold);
      const strings = [];
      for (let i = 0; i < 5; i++) strings.push(place(box, -0.15 + i * 0.09, 0.78, 0, 0.012, 0.55 - i * 0.05, 0.012));
      add(merged(strings, mat('#fff4cc', { emissive: '#ffe08a', ei: 0.5 })));
      const glow = glowSprite('#ffe08a', 1.8, 0.35); glow.position.y = 0.8; g.add(glow);
    } else if (id === '마구간') {
      add(merged([place(box, 0, 0.9, -0.5, 2.6, 1.8, 0.12), place(box, -1.25, 0.9, 0.2, 0.12, 1.8, 1.4), place(box, 1.25, 0.9, 0.2, 0.12, 1.8, 1.4)], wood));
      add(merged([place(box, -1.25, 1.0, 0.95, 0.14, 2.0, 0.14), place(box, 1.25, 1.0, 0.95, 0.14, 2.0, 0.14)], woodD));
      add(place(box, 0, 2.0, 0.25, 3.0, 0.16, 1.9, 0.12, 0, 0), mat('#c9a35a'));
      add(place(box, 0, 0.3, 0.3, 0.9, 0.35, 0.5), woodD);
      add(place(box, 0, 0.5, 0.3, 0.8, 0.08, 0.42), mat('#f2d27a', { emissive: '#ffcf6a', ei: 1.2 }));
      const glow = glowSprite('#ffd890', 4.2, 0.6); glow.position.set(0, 0.8, 0.3); g.add(glow);
      const light = new T.PointLight('#ffd27a', 8, 9, 1.6); light.position.set(0, 1.2, 0.6); g.add(light);
      const star = new T.Sprite(new T.SpriteMaterial({ map: ctx.starTex, transparent: true, blending: T.AdditiveBlending, depthWrite: false }));
      star.scale.setScalar(1.3); star.material.opacity = 0.8; star.position.set(0, 3.2, 0); g.add(star);
    }
    // 그림자
    if (!['하늘 등', '별똥별 비'].includes(id)) {
      const sh = new T.Mesh(new T.CircleGeometry(id === '마구간' ? 2 : 0.95, 16), mat('#000000', { basic: true, transparent: true, opacity: 0.28 }));
      sh.rotation.x = -Math.PI / 2; sh.position.y = 0.02; g.add(sh);
    }
    const hit = new T.Mesh(new T.BoxGeometry(1.8, 2.2, 1.8), new T.MeshBasicMaterial({ visible: false })); hit.position.y = 0.9; g.add(hit); g.userData.hit = hit;
    return g;
  }

  /* ---------- 들판 장면 ---------- */
  function buildWorld(scene, ctx) {
    // 하늘 돔
    const skyGeo = new T.SphereGeometry(220, 24, 16);
    const skyMat = new T.ShaderMaterial({
      side: T.BackSide, depthWrite: false, fog: false,
      uniforms: { top: { value: new T.Color('#03050f') }, mid: { value: new T.Color('#0d1638') }, hor: { value: new T.Color('#2a2552') } },
      vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'uniform vec3 top; uniform vec3 mid; uniform vec3 hor; varying vec3 vP; void main(){ float h = clamp(vP.y,0.0,1.0); vec3 c = mix(hor, mid, smoothstep(0.0,0.22,h)); c = mix(c, top, smoothstep(0.22,0.85,h)); gl_FragColor = vec4(c,1.0); }'
    });
    scene.add(new T.Mesh(skyGeo, skyMat));
    // 별
    const r = seeded(42), N = 1700, pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const u = r() * Math.PI * 2, v = Math.acos(lerp(0.03, 1, Math.pow(r(), 0.8)));
      pos.set([Math.cos(u) * Math.sin(v) * 200, Math.cos(v) * 200, Math.sin(u) * Math.sin(v) * 200], i * 3);
      const w = 0.55 + r() * 0.45, warm = r() < 0.2;
      col.set(warm ? [w, w * 0.92, w * 0.75] : [w * 0.85, w * 0.9, w], i * 3);
    }
    const sg = new T.BufferGeometry(); sg.setAttribute('position', new T.BufferAttribute(pos, 3)); sg.setAttribute('color', new T.BufferAttribute(col, 3));
    const stars = new T.Points(sg, new T.PointsMaterial({ size: 1.6, sizeAttenuation: false, vertexColors: true, transparent: true, opacity: 0.9, fog: false, depthWrite: false }));
    scene.add(stars);
    const twinkles = [];
    for (let i = 0; i < 26; i++) {
      const sp = new T.Sprite(new T.SpriteMaterial({ map: ctx.dotTex, transparent: true, blending: T.AdditiveBlending, depthWrite: false, fog: false }));
      const u = (r() - 0.5) * 2.4, v = 0.25 + r() * 0.9;
      sp.position.set(Math.sin(u) * Math.cos(v) * 190, Math.sin(v) * 190, -Math.cos(u) * Math.cos(v) * 190);
      sp.scale.setScalar(2.2 + r() * 2); sp.userData.ph = r() * 6; twinkles.push(sp); scene.add(sp);
    }
    // 베들레헴의 별
    const bigStar = new T.Sprite(new T.SpriteMaterial({ map: ctx.starTex, transparent: true, blending: T.AdditiveBlending, depthWrite: false, fog: false }));
    bigStar.position.set(16, 46, -170); bigStar.scale.setScalar(26); scene.add(bigStar);
    const halo = glowSprite('#bcd0ff', 70, 0.18); halo.material.fog = false; halo.position.copy(bigStar.position); scene.add(halo);

    // 땅
    const SIZE = 170, SEG = 120;
    const pg = new T.PlaneGeometry(SIZE, SIZE, SEG, SEG); pg.rotateX(-Math.PI / 2);
    const P = pg.attributes.position, rr = seeded(9);
    for (let i = 0; i < P.count; i++) {
      const x = P.getX(i), z = P.getZ(i) - 22;
      P.setZ(i, z + (rr() - 0.5) * 0.4); P.setX(i, x + (rr() - 0.5) * 0.4);
      P.setY(i, groundY(P.getX(i), P.getZ(i)) + (rr() - 0.5) * 0.12);
    }
    const ground = pg.toNonIndexed(); const GP = ground.attributes.position;
    const colors = new Float32Array(GP.count * 3), cA = new T.Color('#24432f'), cB = new T.Color('#2e5638'), cC = new T.Color('#1d3829'), dirt = new T.Color('#6a5a44'), dirtB = new T.Color('#5a4c3a'), tmp = new T.Color();
    for (let f = 0; f < GP.count; f += 3) {
      const cx = (GP.getX(f) + GP.getX(f + 1) + GP.getX(f + 2)) / 3, cz = (GP.getZ(f) + GP.getZ(f + 1) + GP.getZ(f + 2)) / 3, cy = (GP.getY(f) + GP.getY(f + 1) + GP.getY(f + 2)) / 3;
      const n = rr();
      tmp.copy(n < 0.33 ? cA : n < 0.66 ? cB : cC).multiplyScalar(0.86 + rr() * 0.3);
      const patch = Math.sin(cx * 0.31 + 1.1) * Math.cos(cz * 0.27) ; if (patch > 0.55) tmp.lerp(new T.Color('#3d6a3f'), 0.35);
      if (cy > 3) tmp.lerp(new T.Color('#3b4a3a'), clamp((cy - 3) / 6, 0, 0.7));   // 언덕 위는 메마른 색
      const pd = pathDist(cx, cz);
      if (pd < 0.85) tmp.copy(n < 0.5 ? dirt : dirtB); else if (pd < 1.25) tmp.lerp(dirt, 0.45);
      for (let k = 0; k < 3; k++) colors.set([tmp.r, tmp.g, tmp.b], (f + k) * 3);
    }
    ground.setAttribute('color', new T.BufferAttribute(colors, 3)); ground.computeVertexNormals();
    const gmesh = new T.Mesh(ground, new T.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1 }));
    scene.add(gmesh); ctx.ground = gmesh;

    // 풀 덤불(인스턴싱)
    const blade = new T.ConeGeometry(0.07, 0.55, 3);
    const tuftGeo = T.mergeGeometries([place(blade, 0, 0.27, 0, 1, 1, 1, 0.15, 0, 0.1), place(blade, 0.07, 0.22, 0.03, 1, 0.8, 1, -0.2, 1, -0.3), place(blade, -0.06, 0.2, -0.03, 1, 0.75, 1, 0.25, 2, 0.35)].map(g => { g.deleteAttribute('uv'); return g; }));
    const TUFTS = 640, tufts = new T.InstancedMesh(tuftGeo, new T.MeshStandardMaterial({ color: '#ffffff', flatShading: true, roughness: 1 }), TUFTS);
    const m4 = new T.Matrix4(), q = new T.Quaternion(), tr = seeded(31), gcols = ['#3c6b45', '#4a7a4c', '#2f5a3c', '#5a8a55'];
    let n = 0;
    while (n < TUFTS) {
      const x = (tr() - 0.5) * 40, z = -16 + tr() * 27;
      if (pathDist(x, z) < 1.1) continue;
      const s = (0.6 + tr() * 0.8) * (z > 6 ? 0.65 : 1);
      q.setFromEuler(new T.Euler(0, tr() * 6, 0));
      m4.compose(new T.Vector3(x, groundY(x, z) - 0.03, z), q, new T.Vector3(s, s * (0.8 + tr() * 0.6), s));
      tufts.setMatrixAt(n, m4); tufts.setColorAt(n, new T.Color(gcols[n % 4])); n++;
    }
    scene.add(tufts);
    const fcols = ['#ff9ac0', '#ffe08a', '#f4f0ff', '#b9a0ff'], fl = fcols.map(() => []), fr = seeded(55);
    for (let i = 0; i < 140; i++) {
      const x = (fr() - 0.5) * 30, z = -6 + fr() * 19; if (pathDist(x, z) < 1) continue;
      const y = groundY(x, z);
      fl[i % 4].push(place(new T.OctahedronGeometry(1, 0), x, y + 0.12, z, 0.07, 0.05, 0.07, 0, fr() * 3, 0));
    }
    fl.forEach((list, i) => scene.add(merged(list, mat(fcols[i], { emissive: fcols[i], ei: 0.25 }))));
    const pebbles = [], pr2 = seeded(66);
    for (let i = 0; i < 40; i++) { const x = (pr2() - 0.5) * 26, z = 5 + pr2() * 9; const sc = 0.08 + pr2() * 0.16; pebbles.push(place(new T.DodecahedronGeometry(1, 0), x, groundY(x, z) + sc * 0.3, z, sc, sc * 0.6, sc, pr2() * 3, pr2() * 3, 0)); }
    scene.add(merged(pebbles, mat('#6c6a66')));
    // 바위
    const rocks = [], rk = seeded(77);
    for (let i = 0; i < 18; i++) { const x = (rk() - 0.5) * 36, z = -14 + rk() * 22; if (Math.abs(x) < 8 && z > -7 || z > 6) continue; const s = 0.3 + rk() * 0.6; rocks.push(place(new T.DodecahedronGeometry(1, 0), x, groundY(x, z) + s * 0.3, z, s, s * 0.7, s, rk() * 3, rk() * 3, 0)); }
    scene.add(merged(rocks, mat('#5f5d5c')));
    // 나무: 가장자리 올리브·사이프러스
    const trees = [[-11, -6, 'olive'], [-13.5, 1, 'cyp'], [-12, -10, 'cyp'], [11.5, -7, 'olive'], [13, 0, 'cyp'], [10, -12, 'cyp'], [-8, -13, 'olive'], [7, -14, 'cyp'], [15, 6, 'olive'], [-15, 7, 'olive']];
    const trunks = [], olives = [], cyps = [];
    trees.forEach(([x, z, k], i) => {
      const y = groundY(x, z), s = 1 + (i % 3) * 0.2;
      if (k === 'olive') { trunks.push(place(new T.CylinderGeometry(1, 1, 1, 5), x, y + 0.7 * s, z, 0.18 * s, 1.4 * s, 0.18 * s, 0, 0, 0.1)); const rt = seeded(i + 3); for (let j = 0; j < 6; j++) olives.push(place(new T.IcosahedronGeometry(1, 0), x + (rt() - 0.5) * 1.6 * s, y + (1.7 + rt() * 0.7) * s, z + (rt() - 0.5) * 1.4 * s, 0.6 * s, 0.45 * s, 0.6 * s, rt() * 3, rt() * 3, 0)); }
      else { trunks.push(place(new T.CylinderGeometry(1, 1, 1, 5), x, y + 0.3, z, 0.12, 0.6, 0.12)); cyps.push(place(new T.ConeGeometry(1, 1, 6), x, y + 0.6 + 2.0 * s, z, 0.55 * s, 4.0 * s, 0.55 * s)); }
    });
    scene.add(merged(trunks, mat('#4e3c2c'))); scene.add(merged(olives, mat('#5f7a52'))); scene.add(merged(cyps, mat('#1f3a2a')));
    // 베들레헴 마을(언덕 위)
    const houses = [], roofs = [], wins = [], hr = seeded(123);
    for (let i = 0; i < 46; i++) {
      const x = -15 + hr() * 32, z = -37 - hr() * 7; const y = groundY(x, z) - 0.1;
      const w = 0.7 + hr() * 0.8, h = 0.6 + hr() * 0.8, d = 0.7 + hr() * 0.7;
      houses.push(place(new T.BoxGeometry(1, 1, 1), x, y + h / 2, z, w, h, d, 0, (hr() - 0.5) * 0.4, 0));
      if (hr() < 0.3) roofs.push(place(new T.SphereGeometry(1, 6, 3, 0, Math.PI * 2, 0, Math.PI / 2), x, y + h, z, w * 0.35, w * 0.35, w * 0.35));
      if (hr() < 0.55) wins.push(place(new T.BoxGeometry(1, 1, 1), x + (hr() - 0.5) * w * 0.5, y + h * 0.55, z + d / 2 + 0.02, 0.22, 0.3, 0.04));
    }
    scene.add(merged(houses, mat('#6f6152'))); if (roofs.length) scene.add(merged(roofs, mat('#7a6b5a')));
    scene.add(merged(wins, mat('#ffcf7a', { emissive: '#ffb84a', ei: 2.2 })));
    const townGlow = glowSprite('#ffb86a', 34, 0.12); townGlow.position.set(1, groundY(1, -40) + 1.5, -40); scene.add(townGlow);
    // 반딧불
    const flies = [];
    for (let i = 0; i < 26; i++) {
      const sp = new T.Sprite(new T.SpriteMaterial({ map: ctx.dotTex, color: '#e9ff9a', transparent: true, blending: T.AdditiveBlending, depthWrite: false }));
      sp.scale.setScalar(0.28); sp.userData = { x: (r() - 0.5) * 18, z: -6 + r() * 14, y: 0.6 + r() * 1.6, ph: r() * 6, sp: 0.3 + r() * 0.5 };
      flies.push(sp); scene.add(sp);
    }
    // 빛
    scene.add(new T.HemisphereLight('#6b7ad0', '#22351f', 1.5));
    const moon = new T.DirectionalLight('#b8c8ff', 1.5); moon.position.set(-18, 26, 14); scene.add(moon);
    const warmFill = new T.DirectionalLight('#ffc98a', 0.55); warmFill.position.set(8, 5, 20); scene.add(warmFill);
    const rim = new T.DirectionalLight('#ffd9a0', 0.35); rim.position.set(16, 10, -30); scene.add(rim);
    scene.fog = new T.FogExp2('#161d48', 0.011);
    return { stars, twinkles, bigStar, flies };
  }

  /* ---------- mount ---------- */
  async function mount(container, state, handlers = {}) {
    await load();
    const ctx = { dotTex: radialTexture('rgba(255,255,255,1)', 'rgba(255,255,255,0)', 64), starTex: starTexture() };
    const renderer = new T.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: false });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.outputColorSpace = T.SRGBColorSpace; renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.55;
    const wrap = document.createElement('div'); wrap.className = 'f3d-wrap';
    wrap.appendChild(renderer.domElement); renderer.domElement.className = 'f3d-canvas';
    const labels = document.createElement('div'); labels.className = 'f3d-labels'; wrap.appendChild(labels);
    container.appendChild(wrap);
    const scene = new T.Scene(); scene.background = new T.Color('#05070f');
    const camera = new T.PerspectiveCamera(48, 1, 0.1, 500);
    const world = buildWorld(scene, ctx);
    const cam = { az: 0, el: 0.19, dist: 16, target: new T.Vector3(0, 1.7, 2.2), want: null, drift: 0 };
    const sheepObjs = new Map(), itemObjs = new Map(), visitorObjs = new Map();
    const clock = new T.Clock();
    const perf = { n: 0, done: false };
    const CALM = calm();
    let raf = 0, alive = true, last = state, selected = null, meteorT = 2;
    const meteors = [];

    // 세로 화면에서도 양이 화면 밖으로 나가지 않게: 그 깊이(z)에서 보이는 가로 반폭
    function xLim(z) {
      const hf = Math.atan(Math.tan(camera.fov * Math.PI / 360) * camera.aspect);
      return clamp((17.9 - z) * Math.tan(hf) - 1.1, 1.6, PASTURE.x1);
    }
    function pickSpot(rnd) {
      const z = lerp(PASTURE.z0, PASTURE.z1 - 1.2, rnd()), L = xLim(z);
      return [lerp(-L, L, rnd()), z];
    }
    function resize() {
      const w = wrap.clientWidth || 360, h = wrap.clientHeight || 480;
      renderer.setSize(w, h, false); camera.aspect = w / h;
      camera.fov = w / h < 0.8 ? 52 : 44; camera.updateProjectionMatrix();
    }
    const ro = new ResizeObserver(resize); ro.observe(wrap); resize();

    // 양 배치·동작
    function spawnSheep(s, i, appear) {
      const obj = buildSheep(s.species, s.level, s.wear, hashStr(s.id), s.wool ?? 1);
      const rnd = seeded(hashStr(s.id) + 7); rnd(); rnd();
      const [x, z] = pickSpot(rnd);
      obj.position.set(x, groundY(x, z), z); obj.rotation.y = rnd() * 6;
      obj.userData.id = s.id; obj.userData.ai = { mode: 'idle', t: rnd() * 3, tx: x, tz: z, sleepy: s.species === 'sleepy' };
      obj.userData.data = s;
      if (appear) { obj.userData.appear = 1; obj.position.y += 6; }
      scene.add(obj); sheepObjs.set(s.id, obj);
      return obj;
    }
    function rebuildSheep(s) {
      const old = sheepObjs.get(s.id); const pos = old.position.clone(), rot = old.rotation.y, ai = old.userData.ai;
      scene.remove(old); disposeObj(old); sheepObjs.delete(s.id);
      const obj = spawnSheep(s, 0, false); obj.position.copy(pos); obj.rotation.y = rot; obj.userData.ai = ai;
    }
    function placeItem(n, id, appear) {
      const sl = SLOTS[n]; if (!sl) return;
      const obj = buildItem(id, ctx);
      if (n >= 8) obj.position.set(sl[0], sl[1], sl[2]); else obj.position.set(sl[0], groundY(sl[0], sl[1]), sl[1]);
      if (n < 8) obj.rotation.y = Math.atan2(-sl[0], 10 - sl[1]) * 0.6;
      obj.userData.slot = n; if (appear) { obj.userData.rise = 0; obj.scale.setScalar(0.01); }
      scene.add(obj); itemObjs.set(n, obj);
    }
    let stableObj = null;
    function update(st) {
      last = st;
      const ids = new Set(st.sheep.filter(s => !s.lost).map(s => s.id));
      for (const [id, obj] of sheepObjs) if (!ids.has(id)) { scene.remove(obj); disposeObj(obj); sheepObjs.delete(id); }
      st.sheep.forEach((s, i) => {
        if (s.lost) return;
        const o = sheepObjs.get(s.id);
        if (!o) spawnSheep(s, i, !!update.ready);
        else if (o.userData.level !== s.level && stageOf(o.userData.level) !== stageOf(s.level) || o.userData.wear !== s.wear) rebuildSheep(s);
        else { o.userData.level = s.level; o.userData.data = s; if (!(shear && shear.o === o)) { const w = s.wool ?? 1; if (w !== o.userData.wool) { o.userData.wool = w; if (w < 0.3) o.userData.shiver = o.userData.shiver ?? 0; } } }
      });
      for (const [n, obj] of itemObjs) if (st.slots[n] !== obj.userData.item) { scene.remove(obj); disposeObj(obj); itemObjs.delete(n); }
      Object.entries(st.slots || {}).forEach(([n, id]) => { if (id && !itemObjs.has(+n)) placeItem(+n, id, !!update.ready); });
      if (st.stable && !stableObj) { stableObj = buildItem('마구간', ctx); stableObj.position.set(0, groundY(0, -8.2), -8.2); scene.add(stableObj); }
      // 방문객
      const vids = new Set((st.visitors || []).map(v => v.id));
      for (const [id, obj] of visitorObjs) if (!vids.has(id)) { scene.remove(obj); disposeObj(obj); visitorObjs.delete(id); }
      (st.visitors || []).forEach((v, i) => {
        if (visitorObjs.has(v.id)) return;
        const obj = buildSheep(v.species, 3, null, hashStr(v.id));
        const [gx, gz] = GATE[i % GATE.length];
        obj.position.set(-11, groundY(-11, 12), 12); obj.userData.walkTo = [gx, gz]; obj.userData.id = v.id; obj.userData.visitor = true;
        const bang = textSprite('!', { bubble: true }); bang.scale.setScalar(0.9); bang.position.set(0, 2.25, 0.2); obj.add(bang); obj.userData.bang = bang;
        scene.add(obj); visitorObjs.set(v.id, obj);
      });
      // 배치 모드 표시
      markers.forEach(m => { scene.remove(m); }); markers.length = 0;
      if (st.moving) (st.moving.allowed || []).forEach(n => {
        const sl = SLOTS[n]; if (!sl) return;
        const ring = new T.Mesh(new T.RingGeometry(0.75, 1.0, 24), new T.MeshBasicMaterial({ color: '#ffd27a', transparent: true, opacity: 0.8, side: T.DoubleSide, depthWrite: false }));
        if (n >= 8) { ring.position.set(sl[0], sl[1], sl[2]); } else { ring.rotation.x = -Math.PI / 2; ring.position.set(sl[0], groundY(sl[0], sl[1]) + 0.06, sl[1]); }
        ring.userData = { slot: n, pulse: Math.random() * 6 }; markers.push(ring); scene.add(ring);
      });
    }
    const markers = [];

    // 터치: 회전·확대·탭
    const el = renderer.domElement; el.style.touchAction = 'none';
    const pointers = new Map(); let downAt = null, pinch0 = null, moved = 0;
    function onDown(e) { if (mode.patrol) { el.setPointerCapture?.(e.pointerId); mode.patrol.lampAt(e.clientX, e.clientY); return; } if (mode.proc) return; el.setPointerCapture?.(e.pointerId); pointers.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (pointers.size === 1) { downAt = { x: e.clientX, y: e.clientY, t: performance.now() }; moved = 0; startPress(e.clientX, e.clientY); startShear(e.clientX, e.clientY); } if (pointers.size === 2) { const [a, b] = [...pointers.values()]; pinch0 = { d: Math.hypot(a.x - b.x, a.y - b.y), dist: cam.dist }; } cam.drift = 0; }
    function onMove(e) {
      if (mode.patrol) { if (e.buttons || e.pointerType === 'touch') mode.patrol.lampAt(e.clientX, e.clientY); return; }
      if (!pointers.has(e.pointerId)) return;
      const p = pointers.get(e.pointerId), dx = e.clientX - p.x, dy = e.clientY - p.y;
      p.x = e.clientX; p.y = e.clientY; moved += Math.abs(dx) + Math.abs(dy);
      if (press && moved > 10 && !press.fired) clearPress();
      if (press && press.fired) return;
      if (shear) { shearMove(e.clientX, e.clientY, Math.abs(dx) + Math.abs(dy)); return; }
      if (pointers.size === 1) { cam.az = clamp(cam.az - dx * 0.006, -1.05, 1.05); cam.el = clamp(cam.el + dy * 0.004, 0.08, 0.7); cam.want = null; }
      else if (pointers.size === 2 && pinch0) { const [a, b] = [...pointers.values()]; cam.dist = clamp(pinch0.dist * pinch0.d / Math.max(20, Math.hypot(a.x - b.x, a.y - b.y)), 12, 28); }
    }
    function onUp(e) {
      if (mode.patrol) { mode.patrol.lampOff(); return; }
      const wasPet = press && press.fired; clearPress();
      const wasShear = shear && shear.active; shear = null;
      if (wasShear) { pointers.delete(e.pointerId); downAt = null; return; }
      if (wasPet) { pointers.delete(e.pointerId); downAt = null; return; }
      pointers.delete(e.pointerId); if (pointers.size < 2) pinch0 = null;
      if (downAt && pointers.size === 0 && moved < 10 && performance.now() - downAt.t < 450) tap(e.clientX, e.clientY);
      if (pointers.size === 0) downAt = null;
    }
    function onWheel(e) { e.preventDefault(); cam.dist = clamp(cam.dist + e.deltaY * 0.01, 12, 28); }
    el.addEventListener('pointerdown', onDown); el.addEventListener('pointermove', onMove); el.addEventListener('pointerup', onUp); el.addEventListener('pointercancel', onUp); el.addEventListener('wheel', onWheel, { passive: false });
    const ray = new T.Raycaster();
    const mode = { patrol: null, proc: null };
    const groundPlane = new T.Plane(new T.Vector3(0, 1, 0), -0.3);
    function groundAt(cx, cy) {
      const r = el.getBoundingClientRect();
      ray.setFromCamera(new T.Vector2((cx - r.left) / r.width * 2 - 1, -(cy - r.top) / r.height * 2 + 1), camera);
      const out = new T.Vector3(); return ray.ray.intersectPlane(groundPlane, out) ? out : null;
    }
    let press = null, shear = null;
    const tufts = [];
    function startShear(cx, cy) {
      shear = null;
      if (!handlers.onShear) return;
      const o = sheepAt(cx, cy); if (!o) return;
      shear = { o, dist: 0, last: 0, active: false, empty: o.userData.wool < 0.6 };
    }
    function shearMove(cx, cy, d) {
      const sh = shear, o = sh.o;
      if (!sh.active) {
        if (moved <= 10) return;
        if (sh.empty) { react(o.userData.id, 'shiver'); handlers.onShearEmpty?.(o.userData.id); shear = null; return; }
        sh.active = true; clearPress(); o.userData.ai = { ...o.userData.ai, mode: 'idle', t: 3 };
      }
      if (sh.done) return;
      sh.dist += d;
      const NEED = 260;
      o.userData.wool = Math.max(0.08, 1 - sh.dist / NEED * 0.92);
      while (sh.dist - sh.last > 30) { sh.last += 30; spawnTuft(o); handlers.onShearTick?.(o.userData.id); }
      if (sh.dist >= NEED && !sh.done) {
        sh.done = true; o.userData.wool = 0; o.userData.shiver = 2.6;
        for (let i = 0; i < 5; i++) setTimeout(() => spawnTuft(o), i * 60);
        burst(o.position.clone().add(new T.Vector3(0, 1, 0)), '#fff4d0', 16, 1.6);
        handlers.onShear(o.userData.id);
      }
    }
    function spawnTuft(o) {
      const sz = 0.13 + Math.random() * 0.08;
      const m = new T.Mesh(new T.IcosahedronGeometry(sz, 0), mat(o.userData.woolColor, { rough: 1 }));
      m.position.copy(o.position).add(new T.Vector3((Math.random() - 0.5) * 0.8, 0.9 * o.userData.scale + Math.random() * 0.4, (Math.random() - 0.5) * 0.8));
      // 화면 아래 가운데(바구니 쪽)로 날아감
      const goal = new T.Vector3(0, -0.92, 0.5).unproject(camera);
      const dir = goal.sub(camera.position).normalize();
      const end = camera.position.clone().add(dir.multiplyScalar(4));
      m.userData = { from: m.position.clone(), to: end, t: 0, spin: new T.Vector3(Math.random() * 6, Math.random() * 6, 0), up: 1.2 + Math.random() };
      scene.add(m); tufts.push(m);
    }
    function stepTufts(dt) {
      for (let i = tufts.length - 1; i >= 0; i--) {
        const m = tufts[i], u = m.userData; u.t += dt / 0.75;
        const k = Math.min(1, u.t), e = k * k * (3 - 2 * k);
        m.position.lerpVectors(u.from, u.to, e); m.position.y += Math.sin(k * Math.PI) * u.up;
        m.rotation.x += u.spin.x * dt; m.rotation.y += u.spin.y * dt; m.scale.setScalar(1 - k * 0.5);
        if (k >= 1) { scene.remove(m); m.geometry.dispose(); tufts.splice(i, 1); }
      }
    }
    function sheepAt(cx, cy) {
      const r = el.getBoundingClientRect();
      ray.setFromCamera(new T.Vector2((cx - r.left) / r.width * 2 - 1, -(cy - r.top) / r.height * 2 + 1), camera);
      const hit = ray.intersectObjects([...sheepObjs.values()].map(o => o.userData.hit), false)[0];
      let o = hit && hit.object; while (o && o.userData.kind !== 'sheep') o = o.parent;
      return o || null;
    }
    function startPress(cx, cy) {
      clearPress();
      if (!handlers.onPetSheep) return;   // 읽기 전용(친구 들판 구경)에서는 쓰다듬기 없음
      const o = sheepAt(cx, cy); if (!o) return;
      press = { o, fired: false, timer: setTimeout(() => {
        if (!press) return; press.fired = true;
        o.userData.ai.mode = 'idle'; o.userData.ai.t = 2.5;
        const pt = o.position.clone(); pt.y += 1.3 * o.userData.scale;
        for (let i = 0; i < 3; i++) setTimeout(() => floatText(pt.clone().add(new T.Vector3((i - 1) * 0.35, 0, 0)), '♥', '#ff8fb1'), i * 140);
        o.userData.hop = 1; burst(pt, '#ffc2d6', 10, 1.2);
        handlers.onPetSheep?.(o.userData.id);
      }, 450) };
    }
    function clearPress() { if (press) clearTimeout(press.timer); press = null; }
    function tap(cx, cy) {
      const r = el.getBoundingClientRect();
      ray.setFromCamera(new T.Vector2((cx - r.left) / r.width * 2 - 1, -(cy - r.top) / r.height * 2 + 1), camera);
      const targets = [];
      for (const o of visitorObjs.values()) targets.push(o.userData.hit);
      for (const o of sheepObjs.values()) targets.push(o.userData.hit);
      markers.forEach(m => targets.push(m));
      for (const o of itemObjs.values()) targets.push(o.userData.hit);
      const hit = ray.intersectObjects(targets, false)[0];
      if (!hit) { handlers.onTapGround?.(); return; }
      let o = hit.object; while (o && !o.userData.kind && !('slot' in o.userData)) o = o.parent;
      if (!o) return;
      if (o.userData.visitor) handlers.onTapVisitor?.(o.userData.id);
      else if (o.userData.kind === 'sheep') handlers.onTapSheep?.(o.userData.id);
      else if ('slot' in o.userData) handlers.onTapSlot?.(o.userData.slot);
    }

    // 반응 연출
    const fxList = [];
    function burst(pos, color, count = 14, up = 1.4) {
      for (let i = 0; i < count; i++) {
        const sp = new T.Sprite(new T.SpriteMaterial({ map: ctx.dotTex, color, transparent: true, blending: T.AdditiveBlending, depthWrite: false }));
        sp.position.copy(pos); sp.scale.setScalar(0.22);
        const a = Math.random() * Math.PI * 2; sp.userData = { v: new T.Vector3(Math.cos(a) * 1.4, up + Math.random() * 1.4, Math.sin(a) * 1.4), life: 1 };
        scene.add(sp); fxList.push(sp);
      }
    }
    function floatText(pos, text, color) {
      const sp = textSprite(text, { color, size: 92 }); sp.scale.setScalar(0.7); sp.position.copy(pos).add(new T.Vector3(0, 0.7, 0));
      sp.userData = { v: new T.Vector3(0, 0.9, 0), life: 1.4, text: true }; scene.add(sp); fxList.push(sp);
    }
    function legendBeam(o) {
      const h = 22, c = document.createElement('canvas'); c.width = 64; c.height = 256;
      const g = c.getContext('2d'), gv = g.createLinearGradient(0, 0, 0, 256);
      gv.addColorStop(0, 'rgba(255,230,150,0)'); gv.addColorStop(0.55, 'rgba(255,226,140,.35)'); gv.addColorStop(1, 'rgba(255,240,190,1)');
      g.fillStyle = gv; g.fillRect(0, 0, 64, 256);
      g.globalCompositeOperation = 'destination-in';
      const gh = g.createLinearGradient(0, 0, 64, 0); gh.addColorStop(0, 'rgba(0,0,0,0)'); gh.addColorStop(0.5, 'rgba(0,0,0,1)'); gh.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gh; g.fillRect(0, 0, 64, 256);
      const tex = new T.CanvasTexture(c); tex.colorSpace = T.SRGBColorSpace;
      const beam = new T.Mesh(new T.PlaneGeometry(1.9, h), new T.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, fog: false }));
      beam.position.set(o.position.x, o.position.y + h / 2, o.position.z); scene.add(beam);
      const ring = new T.Mesh(new T.RingGeometry(0.4, 0.7, 28), new T.MeshBasicMaterial({ color: '#ffd86a', transparent: true, opacity: 0.9, side: T.DoubleSide, depthWrite: false, blending: T.AdditiveBlending }));
      ring.rotation.x = -Math.PI / 2; ring.position.set(o.position.x, o.position.y + 0.06, o.position.z); scene.add(ring);
      beams.push({ beam, ring, o, t: 0 });
      cam.want = o.position.clone(); selected = null;
      setTimeout(() => { if (cam.want && cam.want.equals?.(o.position)) cam.want = null; }, 4200);
    }
    const beams = [];
    function stepBeams(dt) {
      for (let i = beams.length - 1; i >= 0; i--) {
        const b = beams[i]; b.t += dt; const k = b.t;
        b.beam.position.x = b.o.position.x; b.beam.position.z = b.o.position.z; b.beam.rotation.y = Math.atan2(camera.position.x - b.o.position.x, camera.position.z - b.o.position.z);
        b.beam.material.opacity = k < 0.6 ? k / 0.6 * 0.95 : k < 2.4 ? 0.95 : Math.max(0, 0.95 - (k - 2.4) / 1.4 * 0.95);
        b.beam.scale.x = 1 + Math.sin(k * 3) * 0.08;
        b.ring.position.set(b.o.position.x, groundY(b.o.position.x, b.o.position.z) + 0.06, b.o.position.z);
        b.ring.scale.setScalar(1 + k * 2.2); b.ring.material.opacity = Math.max(0, 0.9 - k / 2.2);
        if (Math.random() < dt * 30 && k < 2.6) { const pt = b.o.position.clone(); pt.x += (Math.random() - 0.5) * 1.4; pt.z += (Math.random() - 0.5) * 1.4; pt.y += 0.3 + Math.random() * 2; burst(pt, '#ffe9a8', 1, 0.6); }
        if (k > 3.9) { scene.remove(b.beam); scene.remove(b.ring); b.beam.geometry.dispose(); b.beam.material.map?.dispose(); b.beam.material.dispose(); b.ring.geometry.dispose(); b.ring.material.dispose(); beams.splice(i, 1); }
      }
    }
    function react(id, kind) {
      if (kind === 'legend') { const t = visitorObjs.get(id) || sheepObjs.get(id); if (t) { legendBeam(t); burst(t.position.clone().add(new T.Vector3(0, 1.2, 0)), '#ffe08a', 34, 2.8); } return; }
      const o = sheepObjs.get(id); if (!o) return;
      const p = o.position.clone(); p.y += 1.2;
      o.userData.ai.mode = kind === 'eat' ? 'graze' : 'idle'; o.userData.ai.t = 1.6;
      if (kind === 'heart') { floatText(p, '♥', '#ff8fb1'); o.userData.hop = 1; }
      else if (kind === 'jump') o.userData.hop = 1;
      else if (kind === 'levelup') { burst(p, '#ffd27a', 22, 2.2); floatText(p, 'Lv UP', '#ffe08a'); o.userData.hop = 1; }
      else if (kind === 'grow' || kind === 'join') { burst(p, '#fff1c0', 30, 2.6); o.userData.hop = 1; }
      else if (kind === 'sleep') { o.userData.ai.mode = 'sleep'; o.userData.ai.t = 6; }
      else if (kind === 'shiver') { o.userData.shiver = 1.4; if (o.userData.wool >= 0.3) { const w0 = o.userData.wool; o.userData.wool = 0.29; setTimeout(() => { o.userData.wool = w0; }, 1400); } }
    }
    let feedPile = null;
    function feed() {
      return new Promise(res => {
        if (feedPile) { scene.remove(feedPile); }
        feedPile = new T.Group();
        const hay = [], hr = seeded(Date.now() % 1000 + 3);
        for (let i = 0; i < 26; i++) hay.push(place(new T.BoxGeometry(1, 1, 1), (hr() - 0.5) * 1.2, 0.08 + hr() * 0.25, (hr() - 0.5) * 1.0, 0.5, 0.03, 0.03, hr(), hr() * 3, hr()));
        feedPile.add(merged(hay, mat('#d9b85a', { emissive: '#3a2a08', ei: 0.4 })));
        feedPile.position.set(0, groundY(0, 0.8) + 4, 0.8); feedPile.userData.drop = true; scene.add(feedPile);
        let k = 0;
        for (const o of sheepObjs.values()) { const a = (k++ / Math.max(1, sheepObjs.size)) * Math.PI * 2; o.userData.ai = { ...o.userData.ai, mode: 'walk', tx: Math.cos(a) * 1.5, tz: 0.8 + Math.sin(a) * 1.2, then: 'graze', t: 4 }; }
        setTimeout(() => { burst(new T.Vector3(0, groundY(0, 0.8) + 0.5, 0.8), '#ffe08a', 18, 1.6); }, 650);
        setTimeout(res, 2500);
      });
    }
    // 첫 양 맞이: 그 양이 오솔길 끝에서 걸어 들어와 가운데 앞에서 폴짝·하트 → Promise
    function welcome(id) {
      return new Promise(resolve => {
        const o = sheepObjs.get(id); if (!o) return resolve();
        o.userData.appear = 0;
        const sx = -6.4, sz = 8.1;
        o.position.set(sx, groundY(sx, sz), sz); o.rotation.y = Math.atan2(0 - sx, 5.6 - sz);
        o.userData.ai = { mode: 'walk', tx: 0.2, tz: 5.6, then: 'idle', t: 12, sleepy: false, fast: 1.7 };
        cam.want = new T.Vector3(-1.5, 0, 6.5); selected = id;
        const t0 = performance.now();
        const check = () => {
          if (!alive) return resolve();
          const d = Math.hypot(o.position.x - 0.2, o.position.z - 5.6);
          if (d < 0.25 || performance.now() - t0 > 9000) {
            o.userData.ai = { mode: 'idle', t: 4, tx: o.position.x, tz: o.position.z };
            o.rotation.y = Math.atan2(camera.position.x - o.position.x, camera.position.z - o.position.z);
            react(id, 'join'); setTimeout(() => react(id, 'heart'), 500);
            cam.want = o.position.clone();
            setTimeout(resolve, 1300);
          } else setTimeout(check, 120);
        };
        check();
      });
    }
    function focus(id) {
      selected = id;
      const o = id && (sheepObjs.get(id) || visitorObjs.get(id));
      cam.want = o ? o.position.clone() : null;
      if (!o) cam.dist = Math.max(cam.dist, sheepObjs.size <= 2 ? 13.5 : sheepObjs.size <= 4 ? 15 : 16.5);
    }

    // 프레임
    const tmpV = new T.Vector3();
    function frame() {
      if (!alive) return;
      raf = requestAnimationFrame(frame);
      if (document.hidden || !wrap.isConnected) return;
      const dt = Math.min(0.05, clock.getDelta()), t = clock.elapsedTime;
      // 저사양 폰: 처음 2.5초 평균이 40fps 아래면 해상도를 낮춘다(한 번만)
      if (!perf.done) { perf.n++; if (t > 2.5) { perf.done = true; const fps = perf.n / t; if (fps < 40 && renderer.getPixelRatio() > 1) { renderer.setPixelRatio(1); resize(); } if (fps < 24) world.flies.forEach(f => { f.visible = false; }); } }
      // 카메라
      cam.drift += dt; if (!CALM && !pointers.size && cam.drift > 6 && !cam.want) cam.az += Math.sin(t * 0.05) * dt * 0.02;
      const tgt = cam.want ? tmpV.set(cam.want.x * 0.7, cam.want.y + 1.0, cam.want.z * 0.7 + 0.4) : tmpV.set(0, 1.7, 2.2);
      cam.target.lerp(tgt, 1 - Math.pow(0.02, dt));
      const d = cam.want ? Math.min(cam.dist, 11) : cam.dist;
      camera.position.set(cam.target.x + Math.sin(cam.az) * Math.cos(cam.el) * d, cam.target.y + Math.sin(cam.el) * d, cam.target.z + Math.cos(cam.az) * Math.cos(cam.el) * d);
      camera.lookAt(cam.target);
      // 하늘
      world.twinkles.forEach(s => { s.material.opacity = 0.45 + 0.55 * Math.abs(Math.sin(t * 1.3 + s.userData.ph)); });
      world.bigStar.material.opacity = 0.85 + 0.15 * Math.sin(t * 2.1); world.bigStar.material.rotation = Math.sin(t * 0.2) * 0.05;
      world.flies.forEach((f, fi) => { const u = f.userData; if (CALM && fi % 2) { f.visible = false; return; } f.position.set(u.x + Math.sin(t * u.sp + u.ph) * 1.4, groundY(u.x, u.z) + u.y + Math.sin(t * 1.7 + u.ph) * 0.35, u.z + Math.cos(t * u.sp * 0.8 + u.ph) * 1.1); f.material.opacity = 0.4 + 0.6 * Math.max(0, Math.sin(t * 2.3 + u.ph)); });
      // 물건
      for (const o of itemObjs.values()) {
        const u = o.userData;
        if (u.rise != null && u.rise < 1) { u.rise = Math.min(1, u.rise + dt * 2.2); const e = 1 - Math.pow(1 - u.rise, 3); o.scale.setScalar(e * (1 + Math.sin(e * Math.PI) * 0.15)); if (u.rise >= 1) burst(o.position.clone().add(new T.Vector3(0, 0.6, 0)), '#ffe08a', 10, 1); }
        if (u.flicker) { const f = u.flicker, k = u.flicker.soft ? 0.06 : 0.22; const n = 1 + Math.sin(t * 13 + o.position.x) * k * 0.5 + Math.sin(t * 7.3) * k * 0.5; f.light.intensity = f.base * n; f.glow.material.opacity = (f.soft ? 0.6 : 0.55) * n; if (f.flame) { f.flame.scale.set(1 + (n - 1) * 0.6, n, 1 + (n - 1) * 0.6); f.flame.rotation.y = t * 0.8; } }
        if (u.float) u.float.obj.position.y = Math.sin(t * 0.9 + u.float.seed) * 0.35;
      }
      // 별똥별 비
      if ([...itemObjs.values()].some(o => o.userData.meteors)) {
        meteorT -= dt;
        if (meteorT < 0) { meteorT = 1.8 + Math.random() * 2.5; const m = new T.Sprite(new T.SpriteMaterial({ map: ctx.dotTex, color: '#dcd2ff', transparent: true, blending: T.AdditiveBlending, depthWrite: false, fog: false })); m.position.set(-30 + Math.random() * 60, 40 + Math.random() * 20, -90); m.scale.set(1.4, 1.4, 1); m.userData = { v: new T.Vector3(-26, -14, 0), life: 1.2 }; scene.add(m); meteors.push(m); }
      }
      for (let i = meteors.length - 1; i >= 0; i--) { const m = meteors[i]; m.userData.life -= dt; m.position.addScaledVector(m.userData.v, dt); m.material.opacity = Math.max(0, m.userData.life); m.scale.set(1.4 + (1.2 - m.userData.life) * 5, 1.2, 1); m.material.rotation = Math.atan2(-14, -26); if (m.userData.life <= 0) { scene.remove(m); m.material.dispose(); meteors.splice(i, 1); } }
      // 꼴 더미
      if (feedPile && feedPile.userData.drop) { const gy = groundY(0, 0.8); feedPile.position.y = Math.max(gy, feedPile.position.y - dt * 12); if (feedPile.position.y <= gy) feedPile.userData.drop = false; }
      // 양
      if (mode.patrol) mode.patrol.step(dt, t);
      else if (mode.proc) mode.proc.step(dt, t);
      else for (const o of sheepObjs.values()) animateSheep(o, dt, t);
      for (const o of visitorObjs.values()) {
        const [tx, tz] = o.userData.walkTo; const dx = tx - o.position.x, dz = tz - o.position.z, dd = Math.hypot(dx, dz);
        if (dd > 0.05) { const sp = Math.min(dd, dt * 1.6); o.position.x += dx / dd * sp; o.position.z += dz / dd * sp; o.rotation.y = Math.atan2(dx, dz); legSwing(o, t, 1); }
        else { o.rotation.y = lerp(o.rotation.y, 0.6, dt * 2); legSwing(o, t, 0); }
        o.position.y = groundY(o.position.x, o.position.z);
        o.userData.bang.position.y = 2.25 + Math.abs(Math.sin(t * 3)) * 0.25;
      }
      markers.forEach(m => { m.material.opacity = 0.45 + 0.4 * Math.abs(Math.sin(t * 3 + m.userData.pulse)); });
      if (beams.length) stepBeams(dt);
      if (tufts.length) stepTufts(dt);
      // 효과
      for (let i = fxList.length - 1; i >= 0; i--) {
        const s = fxList[i], u = s.userData; u.life -= dt;
        s.position.addScaledVector(u.v, dt); if (!u.text) u.v.y -= dt * 2.2;
        s.material.opacity = Math.max(0, Math.min(1, u.life)); if (!u.text) s.scale.setScalar(0.22 * Math.max(0.2, u.life));
        if (u.life <= 0) { scene.remove(s); s.material.map && u.text && s.material.map.dispose(); s.material.dispose(); fxList.splice(i, 1); }
      }
      // 이름표
      labels.innerHTML = '';
      if (mode.proc) mode.proc.labels.forEach(([o, name]) => { if (!o.userData.sat) return; const p = o.position.clone(); p.y += 1.6 * o.userData.scale + 0.25; p.project(camera); const lab = document.createElement('span'); lab.className = 'f3d-label small'; lab.textContent = name; lab.style.left = ((p.x + 1) / 2 * 100) + '%'; lab.style.top = ((1 - p.y) / 2 * 100) + '%'; labels.appendChild(lab); });
      else if (selected) {
        const o = sheepObjs.get(selected) || visitorObjs.get(selected);
        if (o) { const p = o.position.clone(); p.y += 2.0 * o.userData.scale + 0.3; p.project(camera); const lab = document.createElement('span'); lab.className = 'f3d-label'; lab.textContent = o.userData.data?.name || ''; lab.style.left = ((p.x + 1) / 2 * 100) + '%'; lab.style.top = ((1 - p.y) / 2 * 100) + '%'; if (lab.textContent) labels.appendChild(lab); }
      }
      renderer.render(scene, camera);
    }
    function animExtras(o, dt, t) {
      const u = o.userData, a = u.anim; if (!a) return;
      a.flames.forEach(f => { const n = 1 + Math.sin(t * 14 + o.position.x) * 0.12 + Math.sin(t * 9) * 0.08; f.scale.set(n, n * 1.1, n); });
      a.drops.forEach((d, i) => { d.position.y += Math.sin(t * 2 + i) * 0.002; });
      if (a.halo) a.halo.rotation.z += dt * 0.8;
      if (Math.abs(u.woolShown - u.wool) > 0.005) { u.woolShown = lerp(u.woolShown, u.wool, 1 - Math.pow(0.02, dt)); applyWool(o); }
      if (u.wool < 0.3 && (u.shiver = (u.shiver ?? 2.5) - dt) > 0) u.body.rotation.z = Math.sin(t * 46) * 0.035; else if (u.body.rotation.z) u.body.rotation.z = 0;
    }
    function legSwing(o, t, amt) {
      const legs = o.userData.legs; if (!legs) return;
      const s = Math.sin(t * 9 + o.position.x) * 0.5 * amt;
      legs[0].rotation.x = s; legs[3].rotation.x = s; legs[1].rotation.x = -s; legs[2].rotation.x = -s;
      o.userData.body.position.y = Math.abs(Math.sin(t * 9)) * 0.05 * amt;
    }
    function animateSheep(o, dt, t) {
      const ai = o.userData.ai, u = o.userData;
      if (u.appear) { o.position.y = lerp(o.position.y, groundY(o.position.x, o.position.z), 1 - Math.pow(0.01, dt)); if (Math.abs(o.position.y - groundY(o.position.x, o.position.z)) < 0.02) { u.appear = 0; burst(o.position.clone().add(new T.Vector3(0, 0.8, 0)), '#fff1c0', 24, 2); } return; }
      ai.t -= dt;
      if (ai.t <= 0 && ai.mode !== 'walk') {
        const r = Math.random();
        if (ai.sleepy && r < 0.45 || r < 0.08) { ai.mode = 'sleep'; ai.t = 6 + Math.random() * 8; }
        else if (r < 0.55) { ai.mode = 'walk'; [ai.tx, ai.tz] = pickSpot(Math.random); ai.then = 'idle'; ai.t = 9; }
        else if (r < 0.85) { ai.mode = 'graze'; ai.t = 2.5 + Math.random() * 3; }
        else { ai.mode = 'idle'; ai.t = 1.5 + Math.random() * 2.5; }
      }
      let moving = 0;
      if (ai.mode === 'walk') {
        const dx = ai.tx - o.position.x, dz = ai.tz - o.position.z, dd = Math.hypot(dx, dz);
        // 다른 양과 겹치지 않게 살짝 비킴
        let ax = 0, az = 0;
        for (const p of sheepObjs.values()) { if (p === o) continue; const ex = o.position.x - p.position.x, ez = o.position.z - p.position.z, e = Math.hypot(ex, ez); if (e < 1.2 && e > 0.001) { ax += ex / e * (1.2 - e); az += ez / e * (1.2 - e); } }
        if (dd < 0.15 || ai.t <= 0) { ai.mode = ai.then || 'idle'; ai.t = ai.mode === 'graze' ? 3 + Math.random() * 2 : 1.5; }
        else {
          const want = Math.atan2(dx + ax, dz + az); let diff = want - o.rotation.y; diff = Math.atan2(Math.sin(diff), Math.cos(diff));
          o.rotation.y += diff * Math.min(1, dt * 3.2);
          const sp = 0.85 * dt * (u.data?.species === 'tiny' ? 1.4 : 1) * (ai.fast || 1);
          o.position.x += Math.sin(o.rotation.y) * sp; o.position.z += Math.cos(o.rotation.y) * sp; moving = 1;
        }
      }
      if (!ai.fast) { const L = xLim(o.position.z) + 0.3; o.position.x = clamp(o.position.x, -L, L); o.position.z = clamp(o.position.z, PASTURE.z0 - 0.5, PASTURE.z1); }
      o.position.y = groundY(o.position.x, o.position.z);
      legSwing(o, t, moving);
      // 머리·몸 자세
      const head = u.head, body = u.body;
      const headPitch = ai.mode === 'graze' ? 0.85 + Math.sin(t * 6) * 0.08 : ai.mode === 'sleep' ? 0.5 : Math.sin(t * 0.7 + o.position.z) * 0.08;
      head.rotation.x = lerp(head.rotation.x, headPitch, dt * 4);
      head.position.y = lerp(head.position.y, ai.mode === 'graze' ? 0.86 : 1.0, dt * 4);
      const sleepDrop = ai.mode === 'sleep' ? -0.34 : 0;
      body.position.y = moving ? body.position.y : lerp(body.position.y, sleepDrop, dt * 3);
      u.legs.forEach(l => { l.scale.y = lerp(l.scale.y, ai.mode === 'sleep' ? 0.3 : 1, dt * 3); });
      const breath = 1 + Math.sin(t * 2 + o.position.x * 3) * 0.018; body.scale.set(breath, 1 + (breath - 1) * 0.6, breath);
      if (u.hop) { u.hop = Math.max(0, u.hop - dt * 2.4); o.position.y += Math.sin((1 - u.hop) * Math.PI) * 0.55; }
      if (ai.mode === 'sleep') { u.zz = (u.zz || 0) + dt; if (u.zz > 1.6) { u.zz = 0; const p = o.position.clone(); p.y += 1.3 * u.scale; const z = textSprite('z', { color: '#c9d4ff', size: 70 }); z.scale.setScalar(0.45); z.position.copy(p); z.userData = { v: new T.Vector3(0.2, 0.5, 0), life: 1.5, text: true }; scene.add(z); fxList.push(z); } }
      u.glows.forEach(g => { g.material.opacity = (u.st === 3 ? 0.32 : 0.42) * (0.8 + 0.2 * Math.sin(t * 2 + o.position.x)); });
      animExtras(o, dt, t);
    }

    /* ---------- 밤 순찰 ---------- */
    function buildWolf() {
      const g = new T.Group(), body = new T.Group(); g.add(body);
      const dark = mat('#161722'), dark2 = mat('#232436');
      body.add(new T.Mesh(place(new T.DodecahedronGeometry(1, 0), 0, 0.75, 0, 0.36, 0.34, 0.78), dark));
      body.add(new T.Mesh(place(new T.DodecahedronGeometry(1, 0), 0, 0.98, 0.62, 0.27, 0.26, 0.3), dark2));
      body.add(new T.Mesh(place(new T.ConeGeometry(1, 1, 5), 0, 0.92, 0.98, 0.12, 0.38, 0.12, Math.PI / 2, 0, 0), dark));
      for (const sx of [-1, 1]) body.add(new T.Mesh(place(new T.ConeGeometry(1, 1, 4), sx * 0.13, 1.25, 0.56, 0.07, 0.2, 0.06), dark));
      body.add(new T.Mesh(place(new T.ConeGeometry(1, 1, 5), 0, 0.85, -0.85, 0.1, 0.55, 0.1, -1.1, 0, 0), dark2));
      const legs = [];
      for (const [lx, lz] of [[-0.2, 0.4], [0.2, 0.4], [-0.2, -0.4], [0.2, -0.4]]) { const leg = new T.Group(); leg.position.set(lx, 0.55, lz); leg.add(new T.Mesh(place(new T.CylinderGeometry(0.06, 0.05, 0.55, 4), 0, -0.27, 0), dark)); body.add(leg); legs.push(leg); }
      for (const sx of [-1, 1]) {
        body.add(new T.Mesh(place(new T.SphereGeometry(1, 5, 4), sx * 0.11, 1.05, 0.86, 0.045, 0.035, 0.03), mat('#ff3b3b', { basic: true })));
        const eg = glowSprite('#ff4040', 0.55, 0.85); eg.position.set(sx * 0.11, 1.05, 0.9); body.add(eg);
      }
      const sh = new T.Mesh(new T.CircleGeometry(0.8, 14), mat('#000000', { basic: true, transparent: true, opacity: 0.4 })); sh.rotation.x = -Math.PI / 2; sh.position.y = 0.03; g.add(sh);
      const warn = new T.Mesh(new T.RingGeometry(0.95, 1.2, 24), new T.MeshBasicMaterial({ color: '#ff4a4a', transparent: true, opacity: 0.7, side: T.DoubleSide, depthWrite: false }));
      warn.rotation.x = -Math.PI / 2; warn.position.y = 0.05; g.add(warn);
      Object.assign(g.userData, { body, legs, scale: 1, warn });
      return g;
    }
    function patrol(params = {}) {
      if (mode.patrol || mode.proc) return Promise.reject(new Error('busy'));
      return new Promise(resolve => {
        const P = { seconds: 30, flock: [], fillTo: 8, lampBonus: 0, speedBonus: 0, wolfRate: 1, ...params };
        const sfx = k => { try { P.onSfx?.(k); } catch (e) { /* 무시 */ } };
        const hidden = [...sheepObjs.values(), ...visitorObjs.values()];
        hidden.forEach(o => { o.visible = false; });
        const saveCam = { az: cam.az, el: cam.el, dist: cam.dist, want: cam.want };
        cam.want = null; cam.az = 0; selected = null;
        const camGoal = { el: 0.95, dist: 17.5 };
        // 우리(화면 아래 가운데)
        const PEN = { x: 0, z: 6.4, rx: 2.2, rz: 1.5 }, GATE_Z = PEN.z - PEN.rz;
        const pen = new T.Group(); const stones = [], sr = seeded(4);
        for (let i = 0; i < 26; i++) { const a = i / 26 * Math.PI * 2; if (Math.abs(Math.sin(a) + 1) < 0.25 && Math.abs(Math.cos(a)) < 0.45) continue; stones.push(place(new T.DodecahedronGeometry(1, 0), PEN.x + Math.cos(a) * PEN.rx, groundY(PEN.x, PEN.z) + 0.2, PEN.z + Math.sin(a) * PEN.rz, 0.26, 0.24 + sr() * 0.08, 0.24, sr() * 3, sr() * 3, 0)); }
        pen.add(merged(stones, mat('#9a968f')));
        const gateGlow = new T.Mesh(new T.RingGeometry(0.5, 0.75, 20), new T.MeshBasicMaterial({ color: '#ffd27a', transparent: true, opacity: 0.6, side: T.DoubleSide, depthWrite: false }));
        gateGlow.rotation.x = -Math.PI / 2; gateGlow.position.set(PEN.x, groundY(PEN.x, GATE_Z) + 0.06, GATE_Z); pen.add(gateGlow);
        scene.add(pen);
        // 양 떼
        const list = P.flock.slice(0, 12).map(f => ({ ...f }));
        while (list.length < P.fillTo) list.push({ id: 'nb' + list.length, species: 'cotton', level: 5, wear: null, neighbor: true });
        const sr2 = seeded(Date.now() % 9973 + 11);
        const flock = list.map((f, i) => {
          const o = buildSheep(f.species, f.level || 5, f.wear, hashStr(f.id || ('p' + i)));
          let x, z; do { x = (sr2() - 0.5) * 13; z = -5 + sr2() * 8; } while (Math.hypot(x, z - 1) < 1.5);
          o.position.set(x, groundY(x, z), z); o.rotation.y = sr2() * 6;
          o.userData.pat = { penned: false, wander: sr2() * 6, panic: 0, px: 0, pz: 0 };
          scene.add(o); return o;
        });
        // 등불
        const R = 3.9 * (1 + (P.lampBonus || 0));
        const lamp = new T.Group(); lamp.visible = false; scene.add(lamp);
        const lampLight = new T.PointLight('#ffc070', 14, R * 2.4, 1.4); lampLight.position.y = 2.2; lamp.add(lampLight);
        const pool = new T.Mesh(new T.CircleGeometry(R, 40), new T.MeshBasicMaterial({ map: radialTexture('rgba(255,210,130,0.55)', 'rgba(255,190,90,0)'), transparent: true, depthWrite: false, blending: T.AdditiveBlending }));
        pool.rotation.x = -Math.PI / 2; pool.position.y = 0.08; lamp.add(pool);
        const lampOrb = glowSprite('#ffd890', 1.6, 0.95); lampOrb.position.y = 1.8; lamp.add(lampOrb);
        const lampPos = new T.Vector3(); let lampOn = false;
        // HUD
        const hud = document.createElement('div'); hud.className = 'f3d-hud';
        hud.innerHTML = `<div class="f3d-timer"><svg viewBox="0 0 44 44"><circle cx="22" cy="22" r="19" class="bg"/><circle cx="22" cy="22" r="19" class="fg"/></svg><b>30</b></div><div class="f3d-count">우리 안 <b>0</b>/${flock.length}</div><div class="f3d-big">3</div><div class="f3d-tip">손가락으로 등불을 비춰 양을 우리로!</div>`;
        wrap.appendChild(hud);
        const hudT = hud.querySelector('.f3d-timer b'), hudRing = hud.querySelector('.fg'), hudC = hud.querySelector('.f3d-count b'), hudBig = hud.querySelector('.f3d-big');
        const wolves = [];
        let phase = 'intro', introT = 3.2, left = P.seconds, wolfT = 8, scared = 0, penned = 0, endT = 0;
        sfx('start');
        const st = {
          lampAt(cx, cy) { if (phase !== 'play') return; const g = groundAt(cx, cy); if (g) { lampPos.set(clamp(g.x, -10, 10), 0, clamp(g.z, -8, 9)); lampOn = true; } },
          lampOff() { lampOn = false; },
          lampWorld(x, z) { if (phase === 'play') { lampPos.set(clamp(x, -10, 10), 0, clamp(z, -8, 9)); lampOn = true; } },   // 시험용
          peek() { return { phase, left, penned, flock: flock.map(o => ({ x: o.position.x, z: o.position.z, p: o.userData.pat.penned })), wolves: wolves.filter(w => !w.userData.flee).map(w => ({ x: w.position.x, z: w.position.z })) }; },
          step(dt, t) {
            cam.el = lerp(cam.el, phase === 'end' && endT > 0.9 ? saveCam.el : camGoal.el, 1 - Math.pow(0.05, dt));
            cam.dist = lerp(cam.dist, phase === 'end' && endT > 0.9 ? saveCam.dist : camGoal.dist, 1 - Math.pow(0.05, dt));
            cam.target.lerp(tmpV.set(0, 0.2, 1.4), 1 - Math.pow(0.05, dt));
            gateGlow.material.opacity = 0.35 + 0.35 * Math.abs(Math.sin(t * 3));
            if (phase === 'intro') {
              introT -= dt; const n = Math.ceil(introT - 0.2);
              hudBig.textContent = n > 0 ? n : '시작!'; hudBig.style.opacity = 1;
              if (introT <= 0) { phase = 'play'; hudBig.style.opacity = 0; hud.querySelector('.f3d-tip').style.opacity = 0.85; }
            } else if (phase === 'play') {
              left -= dt;
              hudT.textContent = Math.max(0, Math.ceil(left)); hudRing.style.strokeDashoffset = (119.4 * (1 - Math.max(0, left) / P.seconds)).toFixed(1);
              if (left < 6) hud.classList.add('hurry');
              wolfT -= dt * (P.wolfRate || 1);
              if (wolfT <= 0 && wolves.filter(w => !w.userData.flee).length < 2) {
                wolfT = 7 + Math.random() * 2.5;
                const w = buildWolf(); const side = Math.random();
                const x = side < 0.4 ? -11 : side < 0.8 ? 11 : (Math.random() - 0.5) * 16, z = side < 0.8 ? -6 + Math.random() * 9 : -9;
                w.position.set(x, groundY(x, z), z); w.userData.expose = 0; w.userData.flee = null; w.userData.life = 14; scene.add(w); wolves.push(w);
              }
              if (left <= 0 || penned === flock.length) { phase = 'end'; endT = 0; hudBig.textContent = penned === flock.length ? '모두 지켰어!' : '순찰 끝!'; hudBig.style.opacity = 1; sfx('end'); }
            } else if (phase === 'end') {
              endT += dt;
              if (endT > 2.2) return finish();
            }
            // 등불
            lamp.visible = lampOn && phase === 'play';
            if (lamp.visible) { lamp.position.lerp(tmpV.set(lampPos.x, groundY(lampPos.x, lampPos.z), lampPos.z), 1 - Math.pow(0.0005, dt)); lampLight.intensity = 14 + Math.sin(t * 11) * 1.2; }
            // 양
            for (const o of flock) o.userData.pat.ledPrev = o.userData.pat.led, o.userData.pat.led = 0;
            for (const o of flock) {
              const u = o.userData.pat; let speed = 0, tx = null, tz = null;
              if (u.penned) { tx = u.px; tz = u.pz; speed = 0.9; }
              else if (u.panic > 0) { u.panic -= dt; tx = o.position.x + Math.sin(u.panicDir) * 3; tz = o.position.z + Math.cos(u.panicDir) * 3; speed = 3.4; }
              else if (lamp.visible && Math.hypot(o.position.x - lamp.position.x, o.position.z - lamp.position.z) < R) {
                // 우리 문 쪽으로, 문 앞이면 안으로
                const nearGate = Math.abs(o.position.x - PEN.x) < 1.3 && o.position.z > GATE_Z - 1.6;
                tx = PEN.x + (nearGate ? 0 : clamp(o.position.x * 0.25, -0.6, 0.6)); tz = nearGate ? PEN.z : GATE_Z - 0.8;
                speed = 2.9 * (1 + (P.speedBonus || 0)); u.led = 1;
              } else if (phase === 'play' && flock.some(p2 => p2 !== o && (p2.userData.pat.led || p2.userData.pat.ledPrev) && !p2.userData.pat.penned && Math.hypot(p2.position.x - o.position.x, p2.position.z - o.position.z) < 1.9)) {
                // 양 떼 본능: 끌려가는 이웃을 따라감
                const nearGate = Math.abs(o.position.x - PEN.x) < 1.3 && o.position.z > GATE_Z - 1.6;
                tx = PEN.x + (nearGate ? 0 : clamp(o.position.x * 0.25, -0.6, 0.6)); tz = nearGate ? PEN.z : GATE_Z - 0.8; speed = 2.1 * (1 + (P.speedBonus || 0));
              } else if (phase === 'play' || phase === 'intro') {
                u.wander += dt * 0.4; tx = o.position.x * 0.92 + Math.sin(u.wander + o.id) * 2; tz = (o.position.z - 1) * 0.92 + 1 + Math.cos(u.wander * 0.8 + o.id) * 2; speed = 0.32;
              }
              let moving = 0;
              if (tx != null && speed) {
                // 서로 비키기
                let ax = 0, az = 0;
                for (const p2 of flock) { if (p2 === o) continue; const ex = o.position.x - p2.position.x, ez = o.position.z - p2.position.z, e = Math.hypot(ex, ez); if (e < 1.0 && e > 0.001) { ax += ex / e * (1.0 - e) * 2; az += ez / e * (1.0 - e) * 2; } }
                const dx = tx - o.position.x + ax, dz = tz - o.position.z + az, dd = Math.hypot(dx, dz);
                if (dd > 0.08) {
                  const want = Math.atan2(dx, dz); let diff = Math.atan2(Math.sin(want - o.rotation.y), Math.cos(want - o.rotation.y));
                  o.rotation.y += diff * Math.min(1, dt * 5);
                  const sp = Math.min(dd, speed * dt); o.position.x += Math.sin(o.rotation.y) * sp; o.position.z += Math.cos(o.rotation.y) * sp; moving = speed > 1 ? 1.4 : 1;
                }
              }
              // 우리 밖 양은 우리 벽을 못 지나감(문으로만)
              if (!u.penned) {
                const ex = (o.position.x - PEN.x) / (PEN.rx + 0.35), ez = (o.position.z - PEN.z) / (PEN.rz + 0.35);
                const inside = ex * ex + ez * ez < 1;
                if (inside && Math.abs(o.position.x - PEN.x) < 1.0 && o.position.z > GATE_Z - 0.2) {
                  u.penned = true; penned++; hudC.textContent = penned; sfx('pen');
                  const a = Math.random() * Math.PI * 2; u.px = PEN.x + Math.cos(a) * PEN.rx * 0.5; u.pz = PEN.z + Math.sin(a) * PEN.rz * 0.45;
                  burst(o.position.clone().add(new T.Vector3(0, 1, 0)), '#ffe08a', 12, 1.6); hudC.parentNode.classList.remove('pop'); void hudC.offsetWidth; hudC.parentNode.classList.add('pop');
                } else if (inside) { const k = 1 / Math.sqrt(ex * ex + ez * ez); o.position.x = PEN.x + (o.position.x - PEN.x) * k * 1.01; o.position.z = PEN.z + (o.position.z - PEN.z) * k * 1.01; }
                o.position.x = clamp(o.position.x, -11, 11); o.position.z = clamp(o.position.z, -9, 10);
              }
              o.position.y = groundY(o.position.x, o.position.z);
              legSwing(o, t, moving);
            }
            // 늑대
            for (let i = wolves.length - 1; i >= 0; i--) {
              const w = wolves[i], wu = w.userData; wu.life -= dt;
              let target = null, best = 1e9;
              if (!wu.flee) for (const o of flock) { if (o.userData.pat.penned) continue; const d = Math.hypot(o.position.x - w.position.x, o.position.z - w.position.z); if (d < best) { best = d; target = o; } }
              if (lamp.visible && !wu.flee && Math.hypot(w.position.x - lamp.position.x, w.position.z - lamp.position.z) < R) { wu.expose += dt; if (wu.expose > 0.4) { wu.flee = { x: w.position.x < 0 ? -14 : 14, z: -10 }; scared++; sfx('scare'); burst(w.position.clone().add(new T.Vector3(0, 1.1, 0)), '#ffd27a', 16, 1.8); } }
              else wu.expose = Math.max(0, wu.expose - dt);
              const goal = wu.flee || (target ? { x: target.position.x, z: target.position.z } : { x: w.position.x, z: -12 });
              const dx = goal.x - w.position.x, dz = goal.z - w.position.z, dd = Math.hypot(dx, dz);
              const sp = (wu.flee ? 5 : 1.3) * dt;
              if (dd > 0.05) { w.rotation.y = Math.atan2(dx, dz); w.position.x += dx / dd * Math.min(sp, dd); w.position.z += dz / dd * Math.min(sp, dd); }
              w.position.y = groundY(w.position.x, w.position.z);
              legSwing(w, t * 1.4, 1);
              wu.warn.visible = !wu.flee; wu.warn.material.opacity = 0.35 + 0.45 * Math.abs(Math.sin(t * 6)); wu.warn.scale.setScalar(1 + 0.15 * Math.sin(t * 6));
              if (target && !wu.flee && best < 0.95) { const tu = target.userData.pat; tu.panic = 1.0; tu.panicDir = Math.atan2(target.position.x - w.position.x, target.position.z - w.position.z) + (Math.random() - 0.5); sfx('bump'); wu.flee = { x: w.position.x < 0 ? -14 : 14, z: -10 }; }
              if ((wu.flee && dd < 0.5) || wu.life <= 0 || phase === 'end') { scene.remove(w); disposeObj(w); wolves.splice(i, 1); }
            }
          }
        };
        function finish() {
          if (!mode.patrol) return;
          mode.patrol = null;
          flock.forEach(o => { scene.remove(o); disposeObj(o); }); wolves.forEach(w => { scene.remove(w); disposeObj(w); });
          scene.remove(pen); disposeObj(pen); scene.remove(lamp); disposeObj(lamp); hud.remove();
          hidden.forEach(o => { o.visible = true; });
          cam.az = saveCam.az; cam.el = saveCam.el; cam.dist = saveCam.dist; cam.want = saveCam.want;
          resolve({ penned, total: flock.length, scared, timeLeft: Math.max(0, Math.round(left)) });
        }
        mode.patrol = st;
      });
    }

    /* ---------- 성탄: 마구간으로 ---------- */
    function procession(list = [], popts = {}) {
      if (mode.patrol || mode.proc) return Promise.reject(new Error('busy'));
      return new Promise(resolve => {
        const hidden = [...sheepObjs.values(), ...visitorObjs.values(), ...itemObjs.values()]; if (stableObj) hidden.push(stableObj);
        hidden.forEach(o => { o.visible = false; });
        const stage = new T.Group(); scene.add(stage);
        const stable = buildItem('마구간', ctx); stable.position.set(0, groundY(0, -1.5), -1.5); stable.scale.setScalar(1.25); stage.add(stable);
        if (popts.blanket) {   // 구유에 깔린 양털 이불(모은 털 색 줄무늬)
          const cols = (popts.colors && popts.colors.length ? popts.colors : ['#f6f3ec', '#f2c23e']).slice(0, 8), quilt = new T.Group();
          const w = 1.0 / cols.length;
          cols.forEach((c, i) => quilt.add(new T.Mesh(place(new T.BoxGeometry(1, 1, 1), -0.5 + w * (i + 0.5), 0, 0, w * 0.96, 0.07, 0.56), new T.MeshBasicMaterial({ color: new T.Color(c).multiplyScalar(0.85) }))));
          quilt.add(new T.Mesh(place(new T.BoxGeometry(1, 1, 1), 0, 0.03, 0.22, 0.95, 0.07, 0.1), mat('#fff6dc', { rough: 1 })));
          quilt.position.set(0, 0.6, 0.36); quilt.rotation.x = -0.25; stable.add(quilt);
          quilt.scale.setScalar(1.05);
        }
        const fire = buildItem('등불 기둥', ctx); fire.position.set(-2.6, groundY(-2.6, -0.4), -0.4); stage.add(fire);
        const n = Math.min(12, list.length);
        const flock = list.slice(0, n).map((f, i) => {
          const o = buildSheep(f.species, f.level || 5, f.wear, hashStr(f.id || 'x' + i));
          o.position.set(-8.5 - i * 1.1, 0, 3.0); o.position.y = groundY(o.position.x, o.position.z);
          // 구유 앞 가운데는 비워 두고 양옆으로 반원(앞줄 6, 뒷줄 6)
          const row = i < 6 ? 0 : 1, k = row ? i - 6 : i, cnt = row ? n - 6 : Math.min(6, n);
          const half = Math.ceil(cnt / 2), side = k % 2 ? 1 : -1, j = Math.floor(k / 2);
          const a = Math.PI * (0.04 + 0.22 * (half === 1 ? 0.5 : j / Math.max(1, half - 1)));
          const rad = 3.1 + row * 1.6;
          o.userData.goal = { x: side * Math.cos(a) * rad, z: -1.3 + Math.sin(a) * rad * 0.62 };
          o.userData.delay = i * 0.32; o.userData.sat = false; stage.add(o);
          return o;
        });
        const saveCam = { az: cam.az, el: cam.el, dist: cam.dist };
        cam.az = -0.05; cam.el = 0.42; cam.dist = 14.5; selected = null;
        // 눈처럼 내리는 빛가루
        const dust = [];
        for (let i = 0; i < (CALM ? 24 : 70); i++) {
          const sp = new T.Sprite(new T.SpriteMaterial({ map: ctx.dotTex, color: i % 3 ? '#fff6dc' : '#ffe2a0', transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false }));
          sp.scale.setScalar(0.12 + Math.random() * 0.14);
          sp.userData = { x: (Math.random() - 0.5) * 16, z: -4 + Math.random() * 10, y: Math.random() * 9, sp: 0.35 + Math.random() * 0.5, ph: Math.random() * 6 };
          stage.add(sp); dust.push(sp);
        }
        let tt = 0, doneAt = null;
        const st = {
          labels: flock.map((o, i) => [o, list[i].name || '']),
          step(dt, t) {
            dust.forEach(d => { const u = d.userData; u.y -= u.sp * dt; if (u.y < 0) u.y = 9; d.position.set(u.x + Math.sin(tt * 0.6 + u.ph) * 0.6, groundY(u.x, u.z) + u.y, u.z); d.material.opacity = Math.min(1, tt / 2) * (0.35 + 0.45 * Math.abs(Math.sin(tt * 1.5 + u.ph))); });
            tt += dt; cam.dist = lerp(cam.dist, 11, dt * 0.1); cam.target.lerp(tmpV.set(0, 0.9, -1.0), 1 - Math.pow(0.05, dt));
            let all = true;
            flock.forEach(o => {
              const u = o.userData; if (tt < u.delay) { all = false; return; }
              if (!u.sat) {
                const wp = o.position.x < -4.5 && u.goal.x > -4.5 ? { x: -4.5, z: 2.6 } : u.goal;
                const dx = wp.x - o.position.x, dz = wp.z - o.position.z, dd = Math.hypot(dx, dz);
                if (dd < 0.08 && wp === u.goal) { u.sat = true; u.satT = 0; }
                else { const want = Math.atan2(dx, dz); o.rotation.y += Math.atan2(Math.sin(want - o.rotation.y), Math.cos(want - o.rotation.y)) * Math.min(1, dt * 4); const sp = Math.min(dd, 3.1 * dt); o.position.x += dx / dd * sp; o.position.z += dz / dd * sp; legSwing(o, t, 1); all = false; }
              } else {
                u.satT += dt;
                const face = Math.atan2(0 - o.position.x, -1.6 - o.position.z); o.rotation.y += Math.atan2(Math.sin(face - o.rotation.y), Math.cos(face - o.rotation.y)) * Math.min(1, dt * 3);
                u.body.position.y = lerp(u.body.position.y, -0.3, dt * 2); u.legs.forEach(l => { l.scale.y = lerp(l.scale.y, 0.35, dt * 2); }); legSwing(o, t, 0);
                u.head.rotation.x = lerp(u.head.rotation.x, 0.15, dt * 2);
                if (u.satT < 0.05) burst(o.position.clone().add(new T.Vector3(0, 0.9, 0)), '#fff1c0', 8, 1.2);
              }
              o.position.y = groundY(o.position.x, o.position.z);
            });
            if (all && doneAt == null) doneAt = tt;
            if (!st.finished && ((doneAt != null && tt - doneAt > 1.8) || tt > 22)) finish();
          }
        };
        function finish() {   // 장면은 그대로 두고(앉은 양·이름표 유지) 끝났다고만 알린다. 정리는 destroy에서
          if (st.finished) return; st.finished = true;
          resolve();
        }
        if (!n) { scene.remove(stage); hidden.forEach(o => { o.visible = true; }); cam.az = saveCam.az; cam.el = saveCam.el; cam.dist = saveCam.dist; return resolve(); }
        mode.proc = st;
      });
    }

    function disposeObj(obj) { obj.traverse(c => { if (c.geometry) c.geometry.dispose(); if (c.material && c.material.map && c.isSprite) c.material.map.dispose(); if (c.material && c.isSprite) c.material.dispose(); }); }
    function snapshot(w = 720, h = 540, type = 'image/jpeg') {
      const pr = renderer.getPixelRatio(), size = renderer.getSize(new T.Vector2());
      renderer.setPixelRatio(1); renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
      renderer.render(scene, camera); const url = renderer.domElement.toDataURL(type, 0.86);
      renderer.setPixelRatio(pr); renderer.setSize(size.x, size.y, false); resize();
      return url;
    }
    function destroy() {
      alive = false; cancelAnimationFrame(raf); ro.disconnect();
      el.removeEventListener('pointerdown', onDown); el.removeEventListener('pointermove', onMove); el.removeEventListener('pointerup', onUp); el.removeEventListener('pointercancel', onUp); el.removeEventListener('wheel', onWheel);
      scene.traverse(c => { if (c.geometry) c.geometry.dispose(); if (c.material) { (Array.isArray(c.material) ? c.material : [c.material]).forEach(m => { if (m.map) m.map.dispose(); m.dispose(); }); } });
      matCache.clear();
      renderer.dispose(); renderer.forceContextLoss?.(); wrap.remove();
    }

    update(state); update.ready = true;
    // 양이 적은 초반엔 조금 가까이서
    const few = (state.sheep || []).filter(x => !x.lost).length;
    if (few && few <= 2) cam.dist = 13.5; else if (few <= 4) cam.dist = 15;
    frame();
    setTimeout(() => handlers.onReady?.(), 0);
    // 양 머리 위에 짧은 글자(털 +1 등)를 띄운다.
    function say(id, text, color = '#fff4d0') {
      const o = sheepObjs.get(id); if (!o) return;
      floatText(o.position.clone().add(new T.Vector3(0, 1.1 * o.userData.scale, 0)), text, color);
    }
    const view = { update, react, feed, focus, welcome, snapshot, patrol, procession, destroy, say, _debug: { scene, camera, renderer, sheepObjs, cam, mode, groundAt } };
    return view;
  }

  /* ---------- 초상(도감·카드) ---------- */
  let pr = null; const portraitCache = new Map();
  async function portrait(species, opts = {}) {
    await load();
    const key = species + '|' + stageOf(opts.level || 3) + '|' + (opts.wear || '') + '|' + (opts.size || 256);
    if (portraitCache.has(key)) return portraitCache.get(key);
    const S = opts.size || 256;
    if (!pr) {
      const renderer = new T.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
      renderer.outputColorSpace = T.SRGBColorSpace; renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.35;
      const scene = new T.Scene();
      scene.add(new T.HemisphereLight('#6a78c8', '#2a3a2a', 1.3));
      const key1 = new T.DirectionalLight('#dfe6ff', 1.5); key1.position.set(-3, 5, 6); scene.add(key1);
      const warm = new T.DirectionalLight('#ffcf8a', 0.7); warm.position.set(5, 2, -2); scene.add(warm);
      const camera = new T.PerspectiveCamera(30, 1, 0.1, 50);
      pr = { renderer, scene, camera };
    }
    pr.renderer.setPixelRatio(1); pr.renderer.setSize(S, S, false);
    const obj = buildSheep(species, opts.level || 3, opts.wear || null, 3);
    obj.rotation.y = 0.12; obj.position.set(0, 0, 0); obj.scale.setScalar(obj.userData.scale / (window.SHEEP_DEX.byId[species]?.look.size || 1));
    obj.children.forEach(c => { if (c.geometry && c.geometry.type === 'CircleGeometry') c.visible = false; });
    pr.scene.add(obj);
    pr.camera.position.set(2.75, 1.62, 3.0); pr.camera.lookAt(0.05, 0.64, 0.1);
    pr.renderer.setClearColor(0x000000, 0); pr.renderer.render(pr.scene, pr.camera);
    const url = pr.renderer.domElement.toDataURL('image/png');
    pr.scene.remove(obj); obj.traverse(c => { if (c.geometry) c.geometry.dispose(); });
    portraitCache.set(key, url);
    return url;
  }

  function supported() {
    try { const c = document.createElement('canvas'); return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl'))); } catch (e) { return false; }
  }
  function load() {
    if (T) return Promise.resolve(T);
    if (!loading) loading = import(VENDOR).then(m => (T = m)).catch(e => { loading = null; throw e; });
    return loading;
  }

  window.Field3D = { supported, load, mount, portrait, SLOTS, stageOf };
})();
