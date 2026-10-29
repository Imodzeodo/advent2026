/* 장면 위에 떠다니는 것들: 반딧불·잔불·향 연기·먼지·꽃가루·반짝임 (캔버스 한 장) */
(function () {
  // 장면 → 효과 [종류, 기준점(장면 좌표 360×540)]
  const PRESET = {
    '밤하늘': ['flies'], '지붕': ['flies'], '지붕새벽': ['flies'], '새벽집': ['flies'], '새집': ['flies'],
    '들판': ['embers', 190, 430], '들판새벽': ['pollen'],
    '성소': ['incense', 180, 300], '성소천사': ['incense', 180, 300],
    '집안': ['dust', 238, 350], '요셉밤': ['dust', 282, 360], '마구간': ['dust', 180, 380], '작업장': ['dust', 170, 300],
    '나사렛길': ['pollen'], '마리아집': ['pollen'], '유대집': ['pollen'], '할례': ['pollen'], '산길': ['pollen'],
    '성전뜰': ['pollen'], '길': ['pollen'], '성전': ['pollen'], '언덕노을': ['pollen'], '베들레헴': ['dust', 180, 360],
    '꿈': ['sparkle']
  };
  const W0 = 360, H0 = 540;
  let cv = null, ctx = null, parts = [], kind = null, origin = null, raf = 0, last = 0, dpr = 1, w = 0, h = 0, map = null;
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const R = (a, b) => a + Math.random() * (b - a);

  function attach(canvas) { cv = canvas; ctx = cv.getContext('2d'); resize(); }
  function resize() {
    if (!cv) return;
    const r = cv.getBoundingClientRect();
    dpr = Math.min(2, window.devicePixelRatio || 1);
    w = r.width; h = r.height;
    cv.width = Math.max(1, w * dpr); cv.height = Math.max(1, h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // 장면 SVG는 slice로 꽉 채우므로 같은 비율로 좌표를 맞춘다
    const k = Math.max(w / W0, h / H0);
    map = (x, y) => ({ x: (w - W0 * k) / 2 + x * k, y: (h - H0 * k) / 2 + y * k, k });
  }
  window.addEventListener('resize', resize);

  function spawn() {
    const o = origin ? map(origin[0], origin[1]) : null;
    switch (kind) {
      case 'flies': return { x: R(0, w), y: R(h * 0.15, h * 0.85), vx: R(-6, 6), vy: R(-5, 3), r: R(1, 2.2), life: R(5, 10), c: '255,235,170', tw: R(1, 3) };
      case 'embers': return { x: o.x + R(-14, 14) * o.k, y: o.y, vx: R(-6, 6), vy: R(-38, -18), r: R(0.8, 2), life: R(1.5, 3), c: '255,170,80', tw: 6 };
      case 'incense': return { x: o.x + R(-4, 4) * o.k, y: o.y, vx: R(-4, 4), vy: R(-16, -9), r: R(6, 12) * o.k / 1.2, life: R(4, 7), c: '235,225,255', smoke: true };
      case 'dust': return { x: (o ? o.x : w / 2) + R(-120, 120), y: (o ? o.y : h / 2) + R(-140, 40), vx: R(-3, 3), vy: R(-3, 1), r: R(0.6, 1.6), life: R(5, 9), c: '255,220,160', tw: 0.8 };
      case 'pollen': return { x: R(0, w), y: R(0, h * 0.9), vx: R(2, 9), vy: R(-3, 3), r: R(0.7, 1.7), life: R(6, 11), c: '255,250,230', tw: 1 };
      case 'sparkle': return { x: R(0, w), y: R(0, h), vx: R(-2, 2), vy: R(-6, -1), r: R(1, 2.6), life: R(2, 4), c: '220,215,255', tw: 4, star: true };
    }
  }
  const COUNT = { flies: 22, embers: 26, incense: 14, dust: 30, pollen: 26, sparkle: 34 };

  function set(scene) {
    const p = PRESET[scene];
    kind = p ? p[0] : null; origin = p && p[1] != null ? [p[1], p[2]] : null;
    parts = [];
    resize();
    if (!kind) { if (ctx) ctx.clearRect(0, 0, w, h); return; }
    const n = Math.round(COUNT[kind] * (reduce ? 0.3 : 1));
    for (let i = 0; i < n; i++) { const q = spawn(); q.age = R(0, q.life); parts.push(q); }
    if (!raf) { last = performance.now(); raf = requestAnimationFrame(tick); }
  }

  function tick(t) {
    raf = 0;
    if (!cv || !document.body.contains(cv) || !kind) return;
    const dt = Math.min(0.05, (t - last) / 1000); last = t;
    ctx.clearRect(0, 0, w, h);
    for (let i = 0; i < parts.length; i++) {
      let q = parts[i];
      q.age += dt;
      if (q.age > q.life) { q = parts[i] = spawn(); q.age = 0; }
      q.x += q.vx * dt; q.y += q.vy * dt;
      if (q.smoke) { q.vx += R(-8, 8) * dt; q.r += 3 * dt; }
      const life = q.age / q.life;
      let a = Math.sin(Math.PI * life);
      if (q.tw) a *= 0.55 + 0.45 * Math.sin(t / 1000 * q.tw + i);
      if (q.smoke) {
        const g = ctx.createRadialGradient(q.x, q.y, 0, q.x, q.y, q.r);
        g.addColorStop(0, `rgba(${q.c},${0.16 * a})`); g.addColorStop(1, `rgba(${q.c},0)`);
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(q.x, q.y, q.r, 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.fillStyle = `rgba(${q.c},${0.85 * a})`;
        ctx.beginPath(); ctx.arc(q.x, q.y, q.r, 0, Math.PI * 2); ctx.fill();
        if (kind === 'flies' || kind === 'embers' || q.star) {
          ctx.fillStyle = `rgba(${q.c},${0.18 * a})`;
          ctx.beginPath(); ctx.arc(q.x, q.y, q.r * 4, 0, Math.PI * 2); ctx.fill();
        }
      }
    }
    if (!document.hidden) raf = requestAnimationFrame(tick);
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden && kind && !raf) { last = performance.now(); raf = requestAnimationFrame(tick); } });

  // 장면 좌표 → 화면 좌표 (카메라용)
  function toScreen(x, y) { return map ? map(x, y) : { x, y, k: 1 }; }
  window.Fx = { attach, set, resize, toScreen };
})();
