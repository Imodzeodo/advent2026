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
        : new T.MeshStandardMaterial({ color, vertexColors: !!opt.vertexColors, flatShading: true, roughness: opt.rough ?? 0.95, metalness: opt.metal ?? 0, emissive: opt.emissive || '#000000', emissiveIntensity: opt.ei ?? 1, transparent: !!opt.transparent, opacity: opt.opacity ?? 1,
            side: opt.doubleSided ? T.DoubleSide : T.FrontSide }));
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

  function addScenery(scene, batches, materialFor, wind) {
    const opaque = [], swaying = [];
    for (const [key, parts] of batches) {
      const material = materialFor(key);
      if (material.emissive.getHex() || material.transparent || material.roughness !== .95 ||
          material.metalness !== 0 || material.side !== T.FrontSide) {
        scene.add(merged(parts, material));
        parts.forEach(g => g.dispose());
        continue;
      }
      const { r, g, b } = material.color;
      for (const part of parts) {
        const colors = new Float32Array(part.attributes.position.count * 3);
        for (let i = 0; i < colors.length; i += 3) {
          colors[i] = r; colors[i + 1] = g; colors[i + 2] = b;
        }
        part.setAttribute('color', new T.BufferAttribute(colors, 3));
        (wind && part.userData.wind ? swaying : opaque).push(part);
      }
    }
    if (opaque.length) scene.add(merged(opaque, mat('#ffffff', { vertexColors: true })));
    if (swaying.length) {
      const material = mat('#ffffff', { vertexColors: true }).clone();
      const clock = { value: 0 };
      material.onBeforeCompile = shader => {
        shader.uniforms.windTime = clock;
        shader.vertexShader = 'uniform float windTime;\n' + shader.vertexShader.replace('#include <begin_vertex>',
          '#include <begin_vertex>\ntransformed.x += .075 * sin(windTime * 2.1 + position.x * .52 + position.z * .44);' +
          '\ntransformed.z += .055 * cos(windTime * 2.7 + position.z * .78);');
      };
      scene.add(merged(swaying, material));
      wind.clock = clock;
      wind.material = material;
    }
    [...opaque, ...swaying].forEach(g => g.dispose());
  }

  /* ---------- 양 만들기 ---------- */
  const WEAR_SLOTS = ['head', 'face', 'neck', 'back', 'dye'];
  const wardrobe = [
    ['빨간 털모자', 'head', 3, 'pomhat', '#d34652', '🧶'],
    ['초록 털모자', 'head', 3, 'earhat', '#398b61', '🧶'],
    ['밀짚모자', 'head', 4, 'straw', '#edc376', '👒'],
    ['목자 두건', 'head', 4, 'hood', '#c1a6df', '🧕'],
    ['별 머리띠', 'head', 5, 'starband', '#ffd667', '⭐'],
    ['꽃 화관', 'head', 3, 'petals', '#f58cb7', '🌸', '분홍 꽃 화관'],
    ['혼인 꽃 화관', 'head', null, 'wedding-wreath', '#fff1d7', '🌼'],
    ['흰 꽃 화관', 'head', null, 'daisies', '#fff5e3', '🌼'],
    ['작은 왕관', 'head', 6, 'crown', '#ffd46b', '👑'],
    ['리본 핀', 'head', 2, 'hairpin', '#e99fc3', '🎀'],
    ['나무 뿔 장식', 'head', null, 'antlers', '#a5724e', '🦌'],
    ['은 왕관', 'head', null, 'silver-crown', '#c6d1de', '♛'],
    ['흰 깃털 핀', 'head', null, 'feather', '#fff4dd', '🪶'],
    ['종이 별 모자', 'head', null, 'paper', '#a8b3f5', '✦'],
    ['동그란 안경', 'face', 4, 'round', '#f3ca73', '👓'],
    ['검은 선글라스', 'face', 5, 'shades', '#262839', '🕶️'],
    ['하트 선글라스', 'face', 5, 'hearts', '#f479aa', '💗'],
    ['볼 스티커', 'face', 2, 'stickers', '#ffde83', '🌟'],
    ['콧수염', 'face', 3, 'moustache', '#4b2d3b', '〰'],
    ['빨간 목도리', 'neck', 3, 'scarf', '#d54253', '🧣'],
    ['초록 체크 목도리', 'neck', 5, 'plaid', '#256450', '🧣'],
    ['나비넥타이', 'neck', 3, 'bowtie', '#5472bd', '🎀'],
    ['보라 방울', 'neck', 4, 'jingle', '#a66be6', '🔔'],
    ['은 종', 'neck', 5, 'bell', '#dbe9fa', '🔔'],
    ['분홍 리본', 'neck', 3, 'ribbon', '#f498bc', '🎀'],
    ['금빛 별 목걸이', 'neck', 5, 'star', '#ffcd56', '⭐'],
    ['등불 목걸이', 'neck', null, 'lantern', '#efaa50', '🏮'],
    ['망토', 'back', 6, 'cape', '#714cc8', '🟣', '보라 망토'],
    ['남색 망토', 'back', 6, 'dark-cape', '#2f395b', '◆'],
    ['목자 지팡이', 'back', null, 'staff', '#a8784d', '🦯'],
    ['가죽 조끼', 'back', 6, 'vest', '#934d32', '🦺'],
    ['빨간 망토', 'back', 6, 'mantle', '#cb354d', '🔴'],
    ['작은 날개', 'back', null, 'wings', '#f7f1e7', '🪽'],
    ['배낭', 'back', 5, 'pack', '#b57c43', '🎒'],
    ['금빛 천사 날개', 'back', null, 'angel', '#ffd478', '🪽'],
    ['분홍 염색', 'dye', 5, 'dye', '#f49cb8', '●'],
    ['하늘 염색', 'dye', 5, 'dye', '#75b7ef', '●'],
    ['민트 염색', 'dye', 5, 'dye', '#6ddac1', '●'],
    ['보라 염색', 'dye', 5, 'dye', '#aa96b4', '●'],
    ['노랑 염색', 'dye', 5, 'dye', '#f8d065', '●'],
    ['주황 염색', 'dye', 5, 'dye', '#f59a58', '●'],
    ['초콜릿 염색', 'dye', 5, 'dye', '#87564a', '●'],
    ['남색 염색', 'dye', 5, 'dye', '#68728a', '●'],
    ['검정 염색', 'dye', 5, 'dye', '#3f3c47', '●'],
    ['은빛 염색', 'dye', 7, 'dye', '#c8d9ea', '✧'],
    ['털실 목도리', 'neck', null, 'scarf', '#579376', '🧣'],
    ['포근한 강보 망토', 'back', null, 'swaddle', '#d6aa83', '🧣'],
    ['포도빛 리본', 'neck', null, 'ribbon', '#8e4a9d', '🎀'],
    ['나무 이름표 목걸이', 'neck', null, 'wood-tag', '#ab704c', '🪵'],
    ['작은 등잔 등불', 'back', null, 'oil-lamp', '#d48857', '🪔'],
    ['향 주머니', 'neck', null, 'sachet', '#819258', '🌿'],
    ['목동 띠', 'neck', null, 'shepherd-band', '#986448', '🪨'],
    ['별빛 랜턴', 'back', null, 'star-lantern', '#657baf', '🏮'],
    ['작은 물동이 모자', 'head', null, 'water-jug', '#bb785c', '🏺']
  ].map(([name, slot, price, kind, color, symbol, label]) => Object.freeze({ name, slot, price, kind, color, symbol, label: label || name }));
  Object.freeze(wardrobe);
  const WEAR = new Map(wardrobe.map(item => [item.name, item]));
  function normalizeWear(wear) {
    const legacy = typeof wear === 'string' ? WEAR.get(wear) : null;
    return Object.fromEntries(WEAR_SLOTS.map(slot => {
      const name = legacy?.slot === slot ? legacy.name : wear?.[slot];
      return [slot, WEAR.get(name)?.slot === slot ? name : null];
    }));
  }
  const wearKey = wear => Object.values(normalizeWear(wear)).join('|');
  const stageOf = lv => lv >= 10 ? 3 : lv >= 5 ? 2 : lv >= 2 ? 1 : 0;
  const CAPES = new Set(['cape', 'mantle', 'dark-cape', 'swaddle']);

  function gearShape(points, thickness = .055) {
    const outline = new T.Shape();
    points.forEach(([x, y], i) => i ? outline.lineTo(x, y) : outline.moveTo(x, y));
    outline.closePath();
    return new T.ExtrudeGeometry(outline, { depth: thickness, bevelEnabled: true, bevelThickness: .018, bevelSize: .016, bevelSegments: 1, curveSegments: 3 })
      .translate(0, 0, -thickness / 2);
  }
  const starPoints = (outer, inner, arms = 5) => Array.from({ length: arms * 2 }, (_, i) => {
    const angle = Math.PI / 2 + i * Math.PI / arms, radius = i % 2 ? inner : outer;
    return [Math.cos(angle) * radius, Math.sin(angle) * radius];
  });

  // 같은 모델을 착용 모습과 상점 아이콘에 쓴다.
  function makeGear(item, fitCloth) {
    const model = new T.Group();
    model.name = item.name;
    const facets = new T.IcosahedronGeometry(1, 0), box = new T.BoxGeometry(1, 1, 1);
    const gold = mat('#f4c96a', { metal: .56, rough: .38, emissive: '#68450e', ei: .27 });
    const cloth = mat(item.color);
    const cream = mat('#fff3de');
    const put = (geo, material, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0, parent = model) => {
      const mesh = new T.Mesh(geo, material);
      mesh.position.set(x, y, z);
      mesh.scale.set(sx, sy, sz);
      mesh.rotation.set(rx, ry, rz);
      parent.add(mesh);
      return mesh;
    };
    const ring = (radius, tube, material, x = 0, y = 0, z = 0, rx = Math.PI / 2, sz = 1) =>
      put(new T.TorusGeometry(radius, tube, 5, 18), material, x, y, z, 1, 1, sz, rx);
    const cylinder = (r1, r2, h, sides, material, x = 0, y = 0, z = 0) =>
      put(new T.CylinderGeometry(r1, r2, h, sides), material, x, y, z);
    const star = (radius, material, x, y, z, angle = 0) => put(gearShape(starPoints(radius, radius * .47)), material, x, y, z, 1, 1, 1, 0, 0, angle);
    const stem = (a, b, radius, material) => {
      const from = new T.Vector3(...a), to = new T.Vector3(...b);
      const delta = to.clone().sub(from), at = from.addScaledVector(delta, .5);
      const part = cylinder(radius * .63, radius, delta.length(), 5, material, at.x, at.y, at.z);
      part.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), delta.normalize());
    };
    const collar = (m, thick = .035) => ring(.32, thick, m, 0, -.02, -.07, 1.36, .86);
    const charm = (points, material, y = -.19, z = .22) => put(gearShape(points), material, 0, y, z);
    const clothMesh = (vertices, material) => {
      const geometry = new T.BufferGeometry();
      geometry.setAttribute('position', new T.Float32BufferAttribute(vertices, 3));
      geometry.computeVertexNormals();
      put(geometry, material);
    };
    const dark = mat('#322744');
    switch (item.kind) {
      case 'pomhat':
        put(new T.SphereGeometry(1, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2), cloth, 0, .015, -.03, .32, .30, .33);
        ring(.30, .052, cream, 0, .015, -.03);
        put(facets, cream, .02, .34, -.035, .09, .09, .09);
        break;
      case 'earhat':
        put(new T.ConeGeometry(.33, .52, 8), cloth, -.045, .205, -.035, 1, 1, 1, 0, 0, .24);
        ring(.30, .052, mat('#a5dab0'), 0, -.02, -.03);
        for (const side of [-1, 1]) {
          put(facets, cloth, side * .275, -.122, 0, .10, .17, .12);
          stem([side * .28, -.19, .015], [side * .31, -.285, .10], .022, mat('#a5dab0'));
        }
        break;
      case 'straw':
        cylinder(.48, .45, .045, 15, cloth, 0, 0, -.04);
        cylinder(.21, .27, .22, 11, cloth, 0, .127, -.05);
        cylinder(.25, .265, .065, 11, mat('#b35443'), 0, .075, -.05);
        break;
      case 'hood': {
        put(new T.SphereGeometry(1, 9, 5, 0, Math.PI * 2, 0, Math.PI * .63), cloth, 0, -.07, -.09, .36, .28, .39);
        const drape = gearShape([[-.37, .08], [.35, .08], [.3, -.35], [.15, -.55], [-.29, -.38]], .032);
        put(drape, cloth, 0, -.05, -.42, 1, 1, 1, -.22);
        ring(.327, .03, mat('#eacb93'), 0, -.02, -.03);
        break;
      }
      case 'starband':
        ring(.29, .032, gold, 0, -.03, -.01, 1.36);
        for (const [x, y, size] of [[-.245, .20, .095], [0, .34, .19], [.25, .22, .12]]) {
          stem([x, .045, 0], [x, y, .04], .024, gold);
          star(size, gold, x, y, .064, x);
        }
        break;
      case 'petals':
      case 'daisies': {
        const daisy = item.kind === 'daisies';
        ring(.30, .045, mat(daisy ? '#537b68' : '#36684e'), 0, -.03, -.02);
        const petals = new T.SphereGeometry(1, 6, 4);
        for (let i = 0; i < (daisy ? 7 : 5); i++) {
          const angle = i * Math.PI / (daisy ? 6 : 4), x = Math.cos(angle) * .30, z = Math.sin(angle) * .27;
          const y = .02 + (daisy ? .015 : i % 2 * .09);
          if (daisy) {
            for (let p = 0; p < 5; p++) { const a = p * Math.PI * .4; put(petals, cream, x + Math.cos(a) * .063, y + .018, z + Math.sin(a) * .063, .054, .038, .043, 0, -a); }
            put(facets, gold, x, y + .053, z, .04, .024, .04);
          } else {
            const petal = [cloth, mat('#f8b0c8'), mat('#cf6c9e')][i % 3];
            for (const [dx, dz] of [[0, 0], [.048, -.025], [-.036, .040]]) put(facets, petal, x + dx, y + .05, z + dz, .09, .075, .08);
            put(facets, mat('#ffd09e'), x, y + .12, z, .029, .029, .029);
          }
        }
        break;
      }
      case 'wedding-wreath':
        ring(.31, .035, mat('#8b9567'), 0, -.02, -.02);
        for (const side of [-1, 1]) for (let n = 0; n < 4; n++) {
          const a = .52 + n * .38, x = side * Math.cos(a) * .32, z = Math.sin(a) * .255;
          const y = .06 + (.055 * (3 - n));
          stem([x, -.014, z], [x * 1.12, y, z], .014, mat('#74916b'));
          put(facets, n % 2 ? cloth : cream, x * 1.12, y, z, .072, .072, .072, 0, n);
        }
        for (const side of [-1, 1]) {
          const ribbon = gearShape([[0, 0], [.10, 0], [.13, -.26], [.08, -.22], [.035, -.28]], .019);
          put(ribbon, mat('#fff0bb'), side * .20, .02, -.245, side, 1, 1, -.22, 0, side * .18);
        }
        break;
      case 'crown':
        put(new T.CylinderGeometry(.246, .29, .125, 9, 1, true), gold, 0, .07, 0);
        ring(.27, .024, gold);
        for (let i = 0; i < 7; i++) {
          const a = i * Math.PI * 2 / 7;
          cylinder(0, .067, i % 2 ? .14 : .25, 4, gold, Math.cos(a) * .226, i % 2 ? .195 : .225, Math.sin(a) * .226);
        }
        put(facets, mat('#8b4ac7', { emissive: '#6626a1', ei: .4 }), 0, .091, .256, .072, .067, .047);
        break;
      case 'silver-crown': {
        const silver = mat(item.color, { metal: .64, rough: .36 });
        cylinder(.28, .285, .12, 10, silver, 0, .02);
        ring(.30, .028, mat('#72899d'));
        for (let n = 0; n < 5; n++) {
          const a = n * Math.PI * .4;
          const spike = gearShape([[-.103, 0], [-.08, .17], [0, .25], [.08, .17], [.103, 0]], .035);
          put(spike, silver, .23 * Math.sin(a), .065, .23 * Math.cos(a), 1, n === 0 ? 1.27 : 1, 1, 0, a);
        }
        put(facets, mat('#5385d3'), 0, .152, .28, .068, .092, .047);
        break;
      }
      case 'shades': {
        const frame = mat('#262334', { rough: .55 });
        const glass = mat('#292d4a', { metal: .55, rough: .27 });
        for (const side of [-1, 1]) {
          const lens = gearShape([[-.145, .065], [.149, .065], [.117, -.070], [.055, -.105], [-.094, -.097], [-.147, -.042]], .065);
          put(lens, frame, side * .18, .032, .032, 1, 1, 1, 0, side * .22, side * .08);
          put(lens, glass, side * .18, .029, .066, .87, .8, .5, 0, side * .22, side * .08);
          stem([side * .30, .06, .04], [side * .265, .055, -.31], .021, frame);
          put(box, mat('#949cba'), side * .225, .08, .088, .099, .015, .012, 0, 0, side * .08);
        }
        put(box, frame, 0, .055, .034, .15, .034, .042);
        break;
      }
      case 'hairpin': {
        const knot = gearShape([[-.22, .09], [-.11, .16], [0, .045], [.13, .14], [.25, .09], [.20, -.08], [0, -.04], [-.22, -.1]]);
        put(box, gold, .17, -.026, .16, .41, .049, .055, 0, -.35, -.38);
        put(knot, cloth, .17, .052, .19, .82, .82, 1, 0, -.28, -.28);
        put(facets, cream, .17, .053, .23, .056, .052, .040);
        break;
      }
      case 'feather':
        for (let n = 0; n < 5; n++) {
          const width = .11 - n * .011;
          put(facets, n % 2 ? mat('#dfdcf4') : cloth, .31 + n * .031, .1 + n * .065, .06 - n * .05, width, .078, .033, 0, .2, .4);
        }
        stem([.28, .03, .09], [.47, .43, -.18], .017, gold);
        put(box, gold, .29, .015, .06, .15, .05, .11, 0, 0, .4);
        break;
      case 'antlers':
        for (const side of [-1, 1]) {
          const a = [side * .14, -.05, -.04], b = [side * .34, .24, -.08], c = [side * .39, .49, -.15];
          stem(a, b, .07, cloth); stem(b, c, .049, cloth);
          stem(b, [side * .59, .39, -.18], .04, cloth);
          stem([side * .36, .35, -.11], [side * .19, .52, -.05], .035, cloth);
        }
        ring(.23, .023, mat('#614f70'), 0, -.04, -.03);
        break;
      case 'paper':
        put(gearShape([[-.40, -.03], [-.29, .24], [-.16, .13], [0, .42], [.17, .13], [.31, .24], [.4, -.03]], .11), cloth, 0, .03, -.01);
        put(gearShape([[-.39, 0], [0, .092], [.39, 0], [0, -.11]], .08), mat('#d8c9ff'), 0, .045, .051);
        star(.106, gold, 0, .22, .079, -.13);
        break;
      case 'round':
        for (const x of [-.155, .155]) {
          ring(.128, .027, gold, x, 0, .064, 0);
          stem([x * 1.72, .045, .06], [x * 1.6, .08, -.25], .023, gold);
        }
        put(box, gold, 0, .032, .063, .102, .027, .025);
        break;
      case 'hearts':
        for (const x of [-.163, .163]) {
          const shape = [[0, -.145], [-.14, -.014], [-.16, .064], [-.095, .125], [-.035, .109], [0, .069], [.046, .122], [.116, .120], [.16, .054], [.128, -.017]];
          put(gearShape(shape, .045), cloth, x, .016, .082);
          put(gearShape(shape, .030), mat('#773c68', { rough: .35, metal: .15 }), x, .02, .116, .78, .78, .75);
          put(box, cream, x - .044, .074, .135, .067, .021, .008, 0, 0, .35);
          stem([x * 1.72, .05, .074], [x * 1.5, .09, -.28], .022, cloth);
        }
        put(box, cloth, 0, .038, .083, .08, .04, .05);
        break;
      case 'stickers':
        for (const side of [-1, 1]) {
          star(.10, gold, side * .235, -.068, .07, side * .33);
          star(.049, mat('#f9a7c7'), side * .31, -.019, .028, -side * .25);
        }
        break;
      case 'moustache':
        charm([[-.32, .04], [-.23, .10], [-.17, .075], [-.095, .031], [0, .066], [.095, .031], [.17, .075], [.23, .10], [.32, .04],
          [.24, -.043], [.126, -.066], [0, -.025], [-.126, -.066], [-.24, -.043]], cloth, -.14, .15);
        break;
      case 'scarf':
      case 'plaid': {
        const plaid = item.kind === 'plaid';
        collar(cloth, .093);
        const tails = plaid ? [[-.13, -.26, .33, -.12], [.13, -.30, .42, .13]] : [[.17, -.29, .47, .25]];
        for (const [x, y, height, tilt] of tails) {
          const group = new T.Group(); group.position.set(x, y, .233); group.rotation.z = tilt; model.add(group);
          put(box, cloth, 0, 0, 0, .18, height, .075, 0, 0, 0, group);
          const stripe = mat(plaid ? '#e4b26b' : '#ef9a8e');
          for (const offset of [-.13, .04, .14]) {
            put(box, stripe, 0, offset, .043, .18, .016, .014, 0, 0, 0, group);
          }
          if (plaid) for (const offset of [-.047, .045]) put(box, stripe, offset, 0, .047, .017, height, .010, 0, 0, 0, group);
          for (let i = 0; i < 4; i++) put(box, stripe, (i - 1.5) * .045, -height / 2 - .02, 0, .022, .052, .026, 0, 0, 0, group);
        }
        break;
      }
      case 'bowtie':
      case 'ribbon': {
        const ribbon = item.kind === 'ribbon';
        collar(ribbon ? mat('#f0b7ce') : dark, .046);
        const bow = gearShape([[-.25, .158], [-.27, -.12], [0, -.048], [.27, -.12], [.25, .158], [0, .055]]);
        put(bow, cloth, 0, -.112, .237, ribbon ? .88 : .78, .82, .68, -.16);
        if (ribbon) for (const side of [-1, 1]) put(gearShape([[0, .13], [side * .15, -.23], [side * .073, -.19], [side * .024, -.245]]), cloth, 0, -.30, .223);
        put(facets, ribbon ? cream : mat('#a8bde8'), 0, -.108, .261, .056, .059, .035);
        break;
      }
      case 'jingle':
      case 'bell':
        collar(mat(item.kind === 'jingle' ? '#59416a' : '#746061'), .043);
        if (item.kind === 'jingle') {
          put(new T.SphereGeometry(1, 9, 6), mat(item.color, { metal: .24, rough: .45 }), 0, -.232, .229, .176, .168, .143);
          put(box, dark, 0, -.293, .354, .165, .026, .034, 0, 0, -.2);
          put(facets, gold, 0, -.082, .205, .047, .067, .041);
        } else {
          cylinder(.078, .19, .247, 9, mat(item.color, { metal: .62, rough: .35 }), 0, -.223, .209);
          ring(.17, .029, gold, 0, -.342, .209);
          put(facets, dark, 0, -.362, .209, .050, .06, .05);
        }
        break;
      case 'star':
        collar(gold, .035);
        star(.218, gold, 0, -.19, .233, .10);
        star(.077, cream, 0, -.174, .30, .10);
        break;
      case 'lantern': {
        collar(mat('#89603f'), .039);
        ring(.079, .017, gold, 0, -.091, .229, 0);
        const lit = mat('#ffd27b', { emissive: '#f0a83d', ei: 1.4, rough: .42 });
        put(box, lit, 0, -.227, .22, .18, .22, .15);
        for (const x of [-.102, .102]) for (const z of [.132, .308]) {
          put(box, dark, x, -.225, z, .027, .27, .027);
        }
        cylinder(0, .172, .12, 4, gold, 0, -.077, .22);
        put(box, gold, 0, -.352, .22, .224, .036, .196);
        break;
      }
      case 'water-jug':
        cylinder(.16, .23, .11, 9, cloth, 0, .02, -.02);
        put(new T.SphereGeometry(1, 10, 6), cloth, 0, .22, -.02, .262, .244, .23);
        cylinder(.15, .105, .18, 9, cloth, 0, .413, -.02);
        ring(.133, .033, mat('#e5ab7e'), 0, .504, -.02);
        ring(.122, .03, cloth, .219, .29, -.025, 0, 1.14);
        cylinder(.11, .11, .018, 9, dark, 0, .486, -.02);
        break;
      case 'wood-tag':
        collar(mat('#886344'), .035);
        charm([[-.18, .105], [.13, .105], [.20, 0], [.13, -.105], [-.18, -.105]], cloth);
        for (const y of [-.16, -.215]) put(box, mat('#593e38'), -.032, y, .265, .16, .012, .01);
        put(facets, gold, .123, -.188, .265, .026, .026, .015);
        break;
      case 'sachet':
        collar(cream, .032);
        put(facets, cloth, 0, -.23, .244, .129, .15, .08);
        ring(.074, .018, cream, 0, -.137, .244);
        put(facets, mat('#bbd17e'), 0, -.046, .248, .035, .09, .025, 0, 0, -.55);
        break;
      case 'shepherd-band':
        collar(cloth, .069);
        put(box, gold, 0, -.105, .247, .17, .12, .05);
        put(box, mat('#694334'), 0, -.104, .276, .115, .068, .02);
        stem([.10, -.10, .22], [.15, -.29, .23], .029, cloth);
        put(facets, mat('#9b9892'), .15, -.29, .23, .075, .059, .055);
        break;
      case 'oil-lamp': {
        const fire = mat('#ffcb68', { emissive: '#ff932e', ei: 1.45 });
        cylinder(.19, .14, .12, 10, cloth, 0, -.05, -.06);
        cylinder(.155, .155, .022, 10, mat('#7e4f3d'), 0, .014, -.06);
        put(facets, cloth, 0, -.015, -.26, .106, .067, .177);
        put(facets, fire, 0, .115, -.265, .057, .117, .059, 0, 0, -.18);
        ring(.09, .027, cloth, 0, -.015, .14);
        break;
      }
      case 'star-lantern': {
        const lit = mat('#ffdc87', { emissive: '#ffc05c', ei: 1.22 });
        put(box, lit, 0, .12, 0, .27, .288, .265);
        for (const x of [-.148, .148]) for (const z of [-.147, .147])
          put(box, cloth, x, .115, z, .034, .36, .035);
        put(box, cloth, 0, -.057, 0, .326, .059, .33);
        cylinder(0, .241, .17, 4, cloth, 0, .376, 0).rotateY(Math.PI / 4);
        star(.092, gold, 0, .136, .147);
        star(.092, gold, 0, .136, -.147);
        break;
      }
      case 'cape':
      case 'mantle':
      case 'swaddle':
      case 'dark-cape': {
        const royal = item.kind === 'cape', velvet = item.kind === 'mantle';
        const hem = royal ? mat('#a88ad6') : velvet || item.kind === 'swaddle' ? cream : mat('#657499');
        const cut = [
          [.40, -.12, .27, .05], [.20, .008, .49, .18], [-.10, .038, .59, .28],
          [-.36, -.040, .65, .33], [-.62, -.20, .65, .33], [-.801, -.49, .56, .12]
        ];
        const columns = fitCloth ? 12 : 6;
        const rows = Array.from({ length: fitCloth ? 11 : 6 }, (_, row) => {
          const at = fitCloth ? row / 2 : row;
          const a = cut[Math.floor(at)], b = cut[Math.ceil(at)];
          const [z, y, width, dip] = a.map((v, i) => lerp(v, b[i], at % 1));
          const hemWeight = Math.max(0, at - 4);
          return Array.from({ length: columns + 1 }, (_, col) => {
            const side = 2 * col / columns - 1;
            const scallop = Math.cos(side * Math.PI * 3) * .024 * hemWeight;
            const point = royal ? (1 - Math.abs(side)) * .14 * hemWeight : 0;
            const node = [side * width, y - side ** 2 * dip - point + scallop,
              z - (1 - Math.abs(side)) * .056 * hemWeight];
            return fitCloth ? fitCloth(node) : node;
          });
        });
        const surfaces = [], panels = [];
        for (let row = 0; row < rows.length - 1; row++) {
          for (let column = 0; column < rows[row].length - 1; column++) {
            const a = rows[row][column], b = rows[row][column + 1], c = rows[row + 1][column], d = rows[row + 1][column + 1];
            const panel = Math.floor(column * 6 / columns);
            (panel % 3 === 1 ? panels : surfaces).push(...a, ...b, ...c, ...b, ...d, ...c);
          }
        }
        clothMesh(surfaces, mat(item.color, { doubleSided: true }));
        const pleat = new T.Color(item.color).multiplyScalar(.78).getStyle();
        clothMesh(panels, mat(pleat, { doubleSided: true }));
        for (const n of [0, rows[0].length - 1]) {
          for (let i = 0; i < rows.length - 1; i++) stem(rows[i][n], rows[i + 1][n], velvet ? .031 : .016, hem);
        }
        const bottom = rows.at(-1);
        for (let n = 0; n < bottom.length - 1; n++) stem(bottom[n], bottom[n + 1], velvet ? .035 : .019, hem);
        if (royal) {
          const middle = columns / 2, row = fitCloth ? 7 : 3;
          const center = new T.Vector3(...rows[row][middle]);
          const across = new T.Vector3(...rows[row][middle + 1]).sub(new T.Vector3(...rows[row][middle - 1]));
          const down = new T.Vector3(...rows[row + 1][middle]).sub(new T.Vector3(...rows[row - 1][middle]));
          const normal = across.cross(down).normalize();
          center.addScaledVector(normal, .037);
          const medal = star(.108, gold, ...center.toArray());
          medal.quaternion.setFromUnitVectors(new T.Vector3(0, 0, 1), normal);
          medal.rotateZ(.12);
        }
        if (item.kind === 'dark-cape') {
          const [x, y, z] = rows[fitCloth ? 2 : 1][columns / 2];
          put(box, gold, x, y + .02, z, .094, .022, .079, -.12, .58);
        }
        break;
      }
      case 'wings':
      case 'angel': {
        const angel = item.kind === 'angel';
        model.userData.wings = [];
        for (const side of [-1, 1]) {
          const pivot = new T.Group(); pivot.position.set(side * .23, .013, 0); model.add(pivot);
          pivot.rotation.y = side * .27;
          for (let i = 0; i < (angel ? 5 : 4); i++) {
            const angle = (angel ? .82 : .56) - i * .26;
            const length = (angel ? .96 : .69) - i * .074;
            const feather = gearShape([[0, -.077], [.52 * length, -.086], [length, -.014], [.83 * length, .093], [.27 * length, .115]], .043);
            put(feather, i % 2 ? (angel ? gold : mat('#dfdeee')) : cloth, 0, -.043 * i, -.037 * i, side, 1, 1, 0, .08, side * angle, pivot);
          }
          put(facets, angel ? gold : cream, side * .1, -.03, .028, .21, .15, .1, 0, 0, 0, pivot);
          model.userData.wings.push({ pivot, side });
        }
        break;
      }
      case 'staff':
        stem([-.56, -.66, -.34], [.55, .49, -.38], .054, cloth);
        put(new T.TorusGeometry(.21, .043, 6, 18, Math.PI * 1.52), cloth, .61, .47, -.38, 1, 1, 1, 0, 0, -.6);
        for (let n = 0; n < 4; n++) {
          const at = .03 + .057 * n;
          put(new T.CylinderGeometry(.061, .061, .03, 8), mat('#6d4144'), at, at - .11, -.36, 1, 1, 1, 0, 0, -.77);
        }
        break;
      case 'vest': {
        for (const side of [-1, 1]) {
          const cut = [
            [[.16, .032, .30], [.20, .04, -.03], [.15, .02, -.35]],
            [[.55, -.15, .40], [.57, -.15, -.03], [.50, -.19, -.55]],
            [[.58, -.43, .36], [.59, -.49, -.04], [.54, -.43, -.49]]
          ];
          const steps = fitCloth ? 6 : 2;
          const rows = Array.from({ length: steps + 1 }, (_, r) => Array.from({ length: steps + 1 }, (_, c) => {
            const row = r * 2 / steps, col = c * 2 / steps;
            const sample = points => points[Math.floor(col)].map((v, i) => lerp(v, points[Math.ceil(col)][i], col % 1));
            const a = sample(cut[Math.floor(row)]), b = sample(cut[Math.ceil(row)]);
            const [x, y, z] = a.map((v, i) => lerp(v, b[i], row % 1));
            return fitCloth ? fitCloth([side * x, y, z]) : [side * x, y, z];
          }));
          const leather = mat(item.color, { doubleSided: true });
          const seam = mat('#c38b61');
          const vertices = [];
          for (let r = 0; r < steps; r++) for (let c = 0; c < steps; c++) {
            const a = rows[r][c], b = rows[r][c + 1], d = rows[r + 1][c], e = rows[r + 1][c + 1];
            vertices.push(...a, ...b, ...d, ...b, ...e, ...d);
          }
          clothMesh(vertices, leather);
          for (const c of [0, steps]) for (let r = 0; r < steps; r++) stem(rows[r][c], rows[r + 1][c], .017, seam);
          for (let c = 0; c < steps; c++) stem(rows[steps][c], rows[steps][c + 1], .018, seam);
          const pocket = [side * .58, -.31, -.07];
          const pocketX = (fitCloth ? fitCloth(pocket)[0] : pocket[0]) + side * .028;
          put(box, mat('#5d3632'), pocketX, -.31, -.07, .052, .18, .27);
          for (let n = 0; n < 5; n++) put(box, mat('#efb987'), pocketX + side * .03, -.37, -.17 + n * .05, .014, .018, .021);
        }
        put(box, cloth, 0, .015, -.02, .45, .057, .65);
        break;
      }
      case 'pack':
        put(box, cloth, 0, 0, -.105, .54, .39, .42, -.08);
        put(box, mat('#39766a'), 0, .172, -.121, .58, .10, .44, -.07);
        put(box, mat('#d6a365'), 0, -.058, -.346, .315, .193, .072);
        put(box, gold, 0, .005, -.386, .085, .074, .027);
        for (const x of [-.20, .2]) put(box, mat('#684a52'), x, .02, .12, .068, .36, .12, -.1);
        put(new T.CylinderGeometry(.074, .074, .56, 8), mat('#c96953'), 0, .25, -.148, 1, 1, 1, 0, 0, Math.PI / 2);
        break;
      case 'dye':
        for (const [x, y, z, size] of [[0, 0, 0, .31], [-.17, .07, -.02, .22], [.17, .10, .015, .23], [.00, .196, -.065, .23], [-.06, -.106, .167, .197]]) {
          put(facets, cloth, x, y, z, size, size * .95, size, x * 4, z * 8, y);
        }
        if (item.name === '은빛 염색') {
          star(.096, cream, .23, .30, .135);
          star(.06, cream, -.26, .22, .205);
        }
        break;
    }
    if (window.DISCOVER_CRAFT?.[item.name]) mergeCraftedGear(model);
    return model;
  }

  function mergeCraftedGear(model) {
    model.updateMatrixWorld();
    const batches = new Map(), original = new Set();
    model.traverse(part => {
      if (!part.isMesh) return;
      if (!batches.has(part.material)) batches.set(part.material, []);
      batches.get(part.material).push(part.geometry.clone().applyMatrix4(part.matrixWorld));
      original.add(part.geometry);
    });
    model.clear();
    for (const [material, parts] of batches) {
      model.add(merged(parts, material));
      parts.forEach(part => part.dispose());
    }
    original.forEach(part => part.dispose());
  }

  // 모자 크기는 장식 끝이 아니라 머리에 닿는 면과 전체 실루엣을 함께 고려한다.
  const HEAD_FIT = {
    pomhat: [.80, .245], earhat: [.75, .264], straw: [.61, .249], hood: [.78, .276],
    starband: [.83, .248], petals: [.76, .258], daisies: [.77, .258], 'wedding-wreath': [.78, .255],
    crown: [.84, .231, .61], 'silver-crown': [.82, .233, .60], hairpin: [.86, .244],
    feather: [.82, .251], antlers: [.56, .247, .95], paper: [.74, .250], 'water-jug': [.77, .24]
  };
  const EYE_FIT = { round: [.155, 0, .064], shades: [.18, .032, .032], hearts: [.163, .016, .082] };
  const CAPE_FIT = { lift: .005, z: -.055, height: .87, depth: .96 };
  const VEST_FIT = { lift: -.044, z: -.14, width: profile => (profile.flank + .012) / .57 };

  function coatProfile(woolGroup) {
    const profile = { chest: .64, top: .39, rear: .32, flank: .56 };
    for (const mesh of woolGroup.children) {
      const vertices = mesh.geometry.attributes.position;
      for (let i = 0; i < vertices.count; i++) {
        const x = Math.abs(vertices.getX(i)), y = vertices.getY(i), z = vertices.getZ(i);
        if (x < .42 && y > -.19 && y < .18) profile.chest = Math.max(profile.chest, z);
        if (y > -.25 && y < .30 && z > -.48 && z < .39) profile.flank = Math.max(profile.flank, x);
        if (x > .34) continue;
        if (z > -.56 && z < .26) profile.top = Math.max(profile.top, y);
        if (z > -.74 && z < -.27) profile.rear = Math.max(profile.rear, y);
      }
    }
    return profile;
  }

  function capeFitter(woolGroup, profile, wide) {
    // 망토 재단점마다 몸통 중심에서 털의 바깥 면을 찾는다. 털을 깎을 때는 맞춘 천을 몸과 함께 줄인다.
    woolGroup.updateWorldMatrix(true, true);
    const ray = new T.Raycaster();
    const center = new T.Vector3(0, .81, 0), point = new T.Vector3(), direction = new T.Vector3();
    const { lift, z: offset, height, depth } = CAPE_FIT;
    const top = .8 + profile.top + lift;
    return ([x, y, z]) => {
      point.set(x * wide, top + y * height, z * depth + offset).sub(center);
      direction.copy(point).normalize();
      ray.ray.origin.copy(center).addScaledVector(direction, 2);
      ray.ray.direction.copy(direction).negate();
      const hit = ray.intersectObjects(woolGroup.children, false)[0];
      if (!hit || point.length() >= 2 - hit.distance + .063) return [x, y, z];
      point.copy(hit.point).addScaledVector(direction, .063);
      return [point.x / wide, (point.y - top) / height, (point.z - offset) / depth];
    };
  }

  function vestFitter(woolGroup, profile) {
    woolGroup.updateWorldMatrix(true, true);
    const ray = new T.Raycaster();
    const top = .8 + profile.top + VEST_FIT.lift;
    const width = VEST_FIT.width(profile);
    const nearby = [[0, 0], [-.036, 0], [.036, 0], [0, -.074], [0, .074]];
    return ([x, y, z]) => {
      const side = Math.sign(x);
      ray.ray.direction.set(-side, 0, 0);
      let edge = 0;
      // 봉제선 사이의 털 뭉치까지 덮도록 재단점 주변도 확인한다.
      for (const [dy, dz] of nearby) {
        ray.ray.origin.set(side * 2, top + y + dy, VEST_FIT.z + z + dz);
        const hit = ray.intersectObjects(woolGroup.children, false)[0];
        if (hit) edge = Math.max(edge, Math.abs(hit.point.x));
      }
      return [edge ? side * (edge + .054) / width : x * .78, y, z];
    };
  }

  function dressModel(body, head, outfit, anim, skull, wide, woolGroup) {
    const garments = {};
    const profile = outfit.neck || outfit.back ? coatProfile(woolGroup) : null;
    for (const slot of ['head', 'face', 'neck', 'back']) {
      const item = WEAR.get(outfit[slot]);
      if (!item) continue;
      const fitCloth = CAPES.has(item.kind) ? capeFitter(woolGroup, profile, wide)
        : item.kind === 'vest' ? vestFitter(woolGroup, profile) : null;
      const model = makeGear(item, fitCloth);
      if (slot === 'head') {
        const [width, height, vertical = width] = HEAD_FIT[item.kind];
        model.scale.set(width * skull, vertical * skull, width * skull);
        model.position.set(0, height * skull, -.024 * skull);
        head.add(model);
      } else if (slot === 'face') {
        const lens = EYE_FIT[item.kind];
        if (lens) {
          const [x, y, z] = lens;
          const sy = .75 * skull, sz = .72 * skull;
          model.scale.set(.152 * skull / x, sy, sz);
          model.position.set(0, .060 * skull - y * sy, .285 * skull - z * sz);
        } else if (item.kind === 'moustache') {
          model.scale.set(.64 * skull, .60 * skull, .68 * skull);
          model.position.set(0, -.022 * skull, .365 * skull);
        } else {
          model.scale.set(.71 * skull, .71 * skull, .62 * skull);
          model.position.set(0, -.010 * skull, .223 * skull);
        }
        head.add(model);
      } else {
        body.add(model);
        garments[slot] = { model, kind: item.kind };
      }
      if (model.userData.wings) anim.wings.push(...model.userData.wings);
    }
    return profile ? { ...garments, profile, wide, skull } : null;
  }

  function fitBodyWear(garments, wool, headPitch) {
    if (!garments) return;
    const { neck, back, profile, wide, skull } = garments;
    if (neck) {
      const sternum = lerp(.50, profile.chest, wool);
      neck.model.scale.set(.78 * wide, .73, .72);
      neck.model.position.set(0, neckHeight(skull, headPitch), sternum - .115);
    }
    if (!back) return;
    const { model, kind } = back;
    const top = .8 + lerp(.31, profile.top, wool);
    const rear = .8 + lerp(.24, profile.rear, wool);
    const spread = lerp(.82, 1, wool);
    switch (kind) {
      case 'pack':
        model.scale.set(.92 * wide, .94, .91);
        model.position.set(0, rear + .097, -.53);
        break;
      case 'wings':
      case 'angel':
        model.scale.set(.92 * wide, .92, .92);
        model.position.set(0, top - .021, -.31);
        break;
      case 'oil-lamp':
      case 'star-lantern':
        model.scale.setScalar(.9);
        model.position.set(0, rear + .13, -.51);
        break;
      case 'staff':
        model.scale.set(.91 * wide, .87, .90);
        model.position.set(0, top - .23, -.27);
        model.rotation.x = 1.10;
        break;
      case 'vest':
        model.scale.set(lerp(.80, VEST_FIT.width(profile), wool), 1, lerp(.83, 1, wool));
        model.position.set(0, top + VEST_FIT.lift, VEST_FIT.z);
        break;
      default:
        model.scale.set(wide * spread, CAPE_FIT.height, lerp(.83, CAPE_FIT.depth, wool));
        model.position.set(0, top + CAPE_FIT.lift, CAPE_FIT.z);
        break;
    }
  }

  function neckHeight(skull, headPitch) {
    return .878 - (skull - 1) * .22 - Math.max(0, headPitch) * .16;
  }

  function animateWings(figure, seconds) {
    for (const { pivot, side } of figure.userData.anim.wings) {
      pivot.rotation.y = side * (.25 + Math.sin(seconds * 3.3) * .21);
      pivot.rotation.z = side * Math.sin(seconds * 3.3 + .8) * .09;
    }
  }

  function buildSheep(species, level = 1, wear = null, seed = 1, woolLen = 1) {
    const dex = (window.SHEEP_DEX && window.SHEEP_DEX.byId[species]) || window.SHEEP_DEX?.[0];
    const L = dex.look, st = stageOf(level), rnd = seeded(seed * 97 + hashStr(species));
    const outfit = normalizeWear(wear);
    const woolColor = WEAR.get(outfit.dye)?.color || L.wool;
    const silver = outfit.dye === '은빛 염색';
    const root = new T.Group(); root.userData.kind = 'sheep';
    const body = new T.Group(); root.add(body);
    const ico = new T.IcosahedronGeometry(1, 0), oct = new T.OctahedronGeometry(1, 0);
    const wide = L.round ? 1.14 : 1;
    // 속몸(털을 깎아도 남는 짧은 털) — 털색을 살짝 분홍빛으로
    const skin = new T.Color(woolColor).lerp(new T.Color('#f2c9b8'), 0.35).getStyle();
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
    const woolMat = mat(woolColor, { rough: silver ? .53 : L.metal ? .50 : 1, metal: silver ? .33 : L.metal || 0 });
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
    const ears = [];
    for (const sx of [-1, 1]) {   // 귀
      const ear = new T.Group(); ears.push(ear); ear.position.set(sx * 0.24 * hs, 0.08, 0.02); ear.rotation.set(0.2, 0, sx * -0.9);
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
    const nativeSlot = { nightcap: 'head', bow: 'head', flame: 'head', crown: 'head', halo: 'head', flower: 'head',
      leaf: 'head', grass: 'face', scarf: 'neck', bell: 'neck', star: 'neck', lantern: 'neck', backpack: 'back' }[L.acc];
    const accessory = outfit[nativeSlot] ? null : L.acc;
    const anim = { flames: [], drops: [], halo: null, wings: [] };
    addAccessory(body, head, accessory, {}, st >= 2);
    addSignature(body, head, accessory, anim, woolG);
    const garments = dressModel(body, head, outfit, anim, hs, wide, woolG);
    // 빛나는 털
    const glows = [];
    if (L.glow) { const g = glowSprite(L.glow, 2.6, 0.42); g.position.set(0, 0.83, 0); body.add(g); glows.push(g); }
    if (st === 3) { const g = glowSprite('#ffe9b0', 3.2, 0.32); g.position.set(0, 0.88, 0); body.add(g); glows.push(g); root.userData.halo = true; }
    // 둥근 그림자
    const sh = new T.Mesh(new T.CircleGeometry(0.85, 16), mat('#000000', { basic: true, transparent: true, opacity: 0.32 }));
    sh.rotation.x = -Math.PI / 2; sh.position.y = 0.03; root.add(sh);
    const hit = new T.Mesh(new T.BoxGeometry(1.4, 1.7, 2.0), new T.MeshBasicMaterial({ visible: false }));
    hit.position.y = 0.9; root.add(hit); root.userData.hit = hit;
    const scale = [0.74, 0.86, 1, 1.04][st] * (L.size || 1);
    root.scale.setScalar(scale);
    const wl = clamp(woolLen ?? 1, 0, 1);
    Object.assign(root.userData, { body, head, legs, ears, glows, species, level, wear, wearKey: wearKey(outfit),
      st, scale, woolG, tuftMesh, anim, garments, wool: wl, woolShown: wl, woolColor });
    applyWool(root);
    return root;
  }
  // 털 길이 반영: 0이면 홀쭉(바깥 털이 속몸 크기만큼 줄어듦)
  function applyWool(o) {
    const u = o.userData, k = 0.36 + 0.64 * u.woolShown;
    u.woolG.scale.set(k, 0.42 + 0.58 * u.woolShown, k);
    u.tuftMesh.scale.setScalar(0.5 + 0.5 * u.woolShown);
    fitBodyWear(u.garments, u.woolShown, u.head.rotation.x);
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
    } else if (kind === 'beanie') {
      const c = opt.color || '#d23c3c';
      head.add(new T.Mesh(place(new T.SphereGeometry(1, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2), 0, 0.2, -0.02, 0.27, 0.26, 0.29), mat(c)));
      head.add(new T.Mesh(place(new T.TorusGeometry(0.25, 0.05, 5, 12), 0, 0.21, -0.02, 1, 1, 1.08, Math.PI / 2, 0, 0), mat('#f4f0ea')));
      head.add(new T.Mesh(place(ico, 0, 0.5, -0.04, 0.08, 0.08, 0.08), mat('#ffffff')));
    } else if (kind === 'strawhat') {
      const straw = mat('#e6c46a');
      head.add(new T.Mesh(place(new T.CylinderGeometry(0.42, 0.42, 0.03, 14), 0, 0.24, -0.02), straw));
      head.add(new T.Mesh(place(new T.CylinderGeometry(0.19, 0.22, 0.16, 10), 0, 0.33, -0.02), straw));
      head.add(new T.Mesh(place(new T.CylinderGeometry(0.225, 0.225, 0.05, 10), 0, 0.28, -0.02), mat('#c0392b')));
    } else if (kind === 'headscarf') {
      head.add(new T.Mesh(place(new T.SphereGeometry(1, 8, 5, 0, Math.PI * 2, 0, Math.PI * 0.6), 0, 0.12, -0.06, 0.31, 0.3, 0.36), mat('#cdb48a')));
      head.add(new T.Mesh(place(new T.TorusGeometry(0.29, 0.035, 4, 12), 0, 0.2, -0.04, 1, 1, 1.15, Math.PI / 2, 0, 0), mat('#7a4a2a')));
      head.add(new T.Mesh(place(new T.BoxGeometry(1, 1, 1), 0, -0.05, -0.34, 0.4, 0.34, 0.04, 0.3, 0, 0), mat('#cdb48a')));
    } else if (kind === 'starband') {
      head.add(new T.Mesh(place(new T.TorusGeometry(0.25, 0.025, 4, 12, Math.PI), 0, 0.2, -0.02, 1, 1, 1, 0, Math.PI / 2, 0), mat('#c9a24a', { metal: 0.5 })));
      head.add(new T.Mesh(place(oct, 0, 0.5, -0.02, 0.15, 0.15, 0.05, 0, 0.5, Math.PI / 4), mat('#ffd24a', { emissive: '#ffcf4a', ei: 1.4 })));
    } else if (kind === 'bowtie') {
      const c = opt.color || '#c23b3b';
      for (const sx of [-1, 1]) body.add(new T.Mesh(place(new T.ConeGeometry(0.13, 0.26, 4), sx * 0.15, 0.7, 0.9, 1, 1, 1, 0, 0, sx * 1.57), mat(c, { emissive: c, ei: 0.2 })));
      body.add(new T.Mesh(place(ico, 0, 0.7, 0.92, 0.065, 0.065, 0.065), mat(c)));
    } else if (kind === 'glasses') {
      const fr = mat('#f4e3a8', { metal: 0.6, rough: 0.3, emissive: '#5a4a10', ei: 0.4 });
      for (const sx of [-1, 1]) head.add(new T.Mesh(place(new T.TorusGeometry(0.095, 0.022, 5, 16), sx * 0.15, 0.06, 0.3, 1, 1, 1, 0, sx * 0.25, 0), fr));
      head.add(new T.Mesh(place(new T.BoxGeometry(1, 1, 1), 0, 0.08, 0.33, 0.12, 0.02, 0.02), fr));
    } else if (kind === 'cape') {
      const c = opt.color || '#6a3fb0';
      for (const sx of [-1, 1]) body.add(new T.Mesh(place(new T.BoxGeometry(1, 1, 1), sx * 0.48, 0.92, -0.15, 0.05, 0.55, 1.0, 0, 0, sx * -0.25), mat(c)));
      body.add(new T.Mesh(place(new T.BoxGeometry(1, 1, 1), 0, 1.24, -0.18, 0.96, 0.05, 1.02, -0.1, 0, 0), mat(c)));
      body.add(new T.Mesh(place(new T.BoxGeometry(1, 1, 1), 0, 0.85, -0.72, 0.9, 0.6, 0.05, 0.2, 0, 0), mat(c)));
      body.add(new T.Mesh(place(ico, 0, 1.0, 0.52, 0.06, 0.06, 0.06), mat('#ffd24a', { metal: 0.6 })));
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
      const strength = ctx.lampStrength ?? 1;
      add(place(box, 0.42, 1.38, 0, 0.2, 0.26, 0.2), mat('#ffd27a', { emissive: '#ffbf4a', ei: 2 * strength }));
      add(place(new T.ConeGeometry(1, 1, 4), 0.42, 1.56, 0, 0.17, 0.1, 0.17, 0, Math.PI / 4, 0), mat('#3a2a1a'));
      const glow = glowSprite('#ffc860', 2.6, 0.6 * strength); glow.position.set(0.42, 1.38, 0); g.add(glow);
      const light = new T.PointLight('#ffc260', 6, 7, 1.6); light.position.set(0.42, 1.3, 0); g.add(light);
      g.userData.flicker = { light, glow, base: 6, soft: true };
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
    const gmesh = new T.Mesh(ground, new T.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1, side: T.DoubleSide }));
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
      if (!sizeChanged(renderer, w, h)) return;
      renderer.setSize(w, h, false); camera.aspect = w / h;
      camera.fov = w / h < 0.8 ? 52 : 44; camera.updateProjectionMatrix();
      renderer.render(scene, camera);   // 크기를 바꾸면 캔버스가 지워지므로 바로 다시 그린다(검은 깜빡임 방지)
    }
    const ro = new ResizeObserver(resize); ro.observe(wrap); resize();

    // 양 배치·동작
    function spawnSheep(s, i, appear) {
      const obj = buildSheep(s.species, s.level, s.wear, hashStr(s.id), s.wool ?? 1);
      const rnd = seeded(hashStr(s.id) + 7); rnd(); rnd();
      const [x, z] = pickSpot(rnd);
      obj.position.set(x, groundY(x, z), z); obj.rotation.y = rnd() * 6;
      obj.userData.id = s.id; obj.userData.ai = { mode: 'idle', t: rnd() * 3, tx: x, tz: z, sleepy: s.species === 'sleepy' };
      obj.userData.data = s; setMiss(obj, !!s.miss);
      if (appear) { obj.userData.appear = 1; obj.position.y += 6; }
      scene.add(obj); sheepObjs.set(s.id, obj);
      return obj;
    }
    function setMiss(o, on) {
      if (on && !o.userData.missSp) { const sp = textSprite('💭', { size: 96 }); sp.scale.setScalar(0.75); sp.position.set(0.35, 2.05, 0.3); o.add(sp); o.userData.missSp = sp; }
      else if (!on && o.userData.missSp) { o.remove(o.userData.missSp); o.userData.missSp.material.map?.dispose(); o.userData.missSp = null; }
    }
    // 반겨 주기: 양들이 화면 앞쪽으로 달려와 폴짝·하트 → Promise
    function greet(ids) {
      const list = (ids && ids.length ? ids : [...sheepObjs.keys()]).map(id => sheepObjs.get(id)).filter(Boolean);
      list.forEach((o, i) => {
        const x = (i - (list.length - 1) / 2) * 1.1, z = 6.2 - Math.abs(x) * 0.15;
        o.userData.ai = { mode: 'walk', tx: clamp(x, -3, 3), tz: z, then: 'idle', t: 8, fast: 2.2 };
        setTimeout(() => { if (alive) { react(o.userData.id, 'heart'); o.userData.hop = 1; } }, 2200 + i * 180);
      });
      cam.want = new T.Vector3(0, 0, 5.5);
      return new Promise(r => setTimeout(() => { cam.want = null; r(); }, 3400));
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
        else if (o.userData.species !== s.species || stageOf(o.userData.level) !== stageOf(s.level) ||
                 o.userData.wearKey !== wearKey(s.wear)) rebuildSheep(s);
        else { o.userData.level = s.level; o.userData.data = s; setMiss(o, !!s.miss); if (!(shear && shear.o === o) && !o.userData.shearProg) { const w = s.wool ?? 1; if (w !== o.userData.wool) { o.userData.wool = w; if (w < 0.3) o.userData.shiver = o.userData.shiver ?? 0; } } }
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
        const pad = new T.Mesh(n >= 8 ? new T.SphereGeometry(1.5, 8, 6) : new T.CylinderGeometry(1.5, 1.5, 2.4, 12), new T.MeshBasicMaterial({ visible: false }));
        pad.position.copy(ring.position); if (n < 8) pad.position.y += 0.9; pad.userData = { slot: n, pad: true }; markers.push(pad); scene.add(pad);
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
      if (pointers.size === 1) { cam.az = clamp(cam.az - dx * 0.006, -0.8, 0.8); cam.el = clamp(cam.el + dy * 0.004, 0.12, 0.7); cam.want = null; }
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
      // 털은 내 양만 깎인다. 친구 양을 문지르면 털은 그대로, 쓰다듬은 것처럼 하트만.
      if (handlers.canShear && !handlers.canShear(o.userData.id)) { react(o.userData.id, 'heart'); return; }
      const prog = o.userData.shearProg || 0;
      shear = { o, dist: prog, last: prog, active: false, empty: o.userData.wool < 0.6 && !prog };
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
      const NEED = 220;
      o.userData.shearProg = sh.dist;
      o.userData.wool = Math.max(0.08, 1 - sh.dist / NEED * 0.92);
      while (sh.dist - sh.last > 30) { sh.last += 30; spawnTuft(o); handlers.onShearTick?.(o.userData.id); }
      if (sh.dist >= NEED && !sh.done) {
        sh.done = true; o.userData.wool = 0; o.userData.shiver = 2.6; o.userData.shearProg = 0;
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
      if (markers.length) {   // 물건 놓는 중: 동그라미가 먼저
        const mh = ray.intersectObjects(markers, false)[0];
        if (mh) { handlers.onTapSlot?.(mh.object.userData.slot); return; }
      }
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
    // 간식 주기: 그 양 앞에 간식(사과·꼴)이 톡 떨어지고, 양이 와서 먹음 → Promise(약 2.6초)
    function treat(id) {
      return new Promise(res => {
        const o = sheepObjs.get(id); if (!o) return res();
        const yaw = o.rotation.y, tx = o.position.x + Math.sin(yaw) * 1.1, tz = o.position.z + Math.cos(yaw) * 1.1;
        const g = new T.Group();
        g.add(new T.Mesh(place(new T.IcosahedronGeometry(1, 0), 0, 0.12, 0, 0.13, 0.12, 0.13), mat('#d6413a', { emissive: '#5a0a08', ei: 0.3 })));
        g.add(new T.Mesh(place(new T.BoxGeometry(1, 1, 1), 0, 0.27, 0, 0.02, 0.08, 0.02), mat('#5a3a20')));
        g.add(new T.Mesh(place(new T.OctahedronGeometry(1, 0), 0.05, 0.3, 0, 0.06, 0.02, 0.04), mat('#5fa04a')));
        g.position.set(tx, groundY(tx, tz) + 3, tz); g.userData.drop = { y: groundY(tx, tz), v: 0 }; scene.add(g); treats.push(g);
        o.userData.ai = { mode: 'walk', tx: tx - Math.sin(yaw) * 0.55, tz: tz - Math.cos(yaw) * 0.55, then: 'graze', t: 4 };
        cam.want = o.position.clone();
        setTimeout(() => { react(id, 'eat'); }, 1100);
        setTimeout(() => { burst(g.position.clone().add(new T.Vector3(0, 0.3, 0)), '#ffd2a0', 10, 1.2); scene.remove(g); treats.splice(treats.indexOf(g), 1); react(id, 'heart'); cam.want = null; res(); }, 2600);
      });
    }
    const treats = [];
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
      { const gy = groundY(camera.position.x, camera.position.z) + 1.6; if (camera.position.y < gy) camera.position.y = gy; }
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
      markers.forEach(m => { if (!m.userData.pad) m.material.opacity = 0.45 + 0.4 * Math.abs(Math.sin(t * 3 + m.userData.pulse)); });
      if (beams.length) stepBeams(dt);
      if (tufts.length) stepTufts(dt);
      treats.forEach(g => { const d = g.userData.drop; if (d) { d.v += dt * 18; g.position.y = Math.max(d.y, g.position.y - d.v * dt); if (g.position.y <= d.y) g.userData.drop = null; } });
      // 효과
      for (let i = fxList.length - 1; i >= 0; i--) {
        const s = fxList[i], u = s.userData; u.life -= dt;
        s.position.addScaledVector(u.v, dt); if (!u.text) u.v.y -= dt * 2.2;
        s.material.opacity = Math.max(0, Math.min(1, u.life)); if (!u.text) s.scale.setScalar(0.22 * Math.max(0.2, u.life));
        if (u.life <= 0) { scene.remove(s); s.material.map && u.text && s.material.map.dispose(); s.material.dispose(); fxList.splice(i, 1); }
      }
      // 이름표
      labels.innerHTML = '';
      if (mode.proc) mode.proc.labels.forEach(([o, name]) => { if (!o.userData.sat) return; const p = o.position.clone(); p.y += 1.6 * o.userData.scale + 0.25; p.project(camera); const lab = document.createElement('span'); lab.className = 'f3d-label small'; lab.textContent = name; lab.style.left = clamp((p.x + 1) / 2 * 100, 9, 91) + '%'; lab.style.top = ((1 - p.y) / 2 * 100) + '%'; lab.style.zIndex = Math.round(1000 - p.z * 1000); labels.appendChild(lab); });
      else if (selected) {
        const o = sheepObjs.get(selected) || visitorObjs.get(selected);
        if (o) { const p = o.position.clone(); p.y += 2.0 * o.userData.scale + 0.3; p.project(camera); const lab = document.createElement('span'); lab.className = 'f3d-label'; lab.textContent = o.userData.data?.name || ''; lab.style.left = ((p.x + 1) / 2 * 100) + '%'; lab.style.top = ((1 - p.y) / 2 * 100) + '%'; if (lab.textContent) labels.appendChild(lab); }
      }
      renderer.render(scene, camera);
    }
    function animExtras(o, dt, t) {
      const u = o.userData, a = u.anim; if (!a) return;
      animateWings(o, t);
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
      const neck = u.garments?.neck;
      if (neck) neck.model.position.y = neckHeight(u.garments.skull, head.rotation.x);
      const sleepDrop = ai.mode === 'sleep' ? -0.34 : 0;
      body.position.y = moving ? body.position.y : lerp(body.position.y, sleepDrop, dt * 3);
      u.legs.forEach(l => { l.scale.y = lerp(l.scale.y, ai.mode === 'sleep' ? 0.3 : 1, dt * 3); });
      const breath = 1 + Math.sin(t * 2 + o.position.x * 3) * 0.018; body.scale.set(breath, 1 + (breath - 1) * 0.6, breath);
      if (u.hop) { u.hop = Math.max(0, u.hop - dt * 2.4); o.position.y += Math.sin((1 - u.hop) * Math.PI) * 0.55; }
      if (u.missSp) u.missSp.position.y = 2.05 + Math.sin(t * 2 + o.position.x) * 0.08;
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
          labels: flock.map((o, i) => [o, i < 6 || n <= 8 ? (list[i].name || '') : '']).filter(([, nm]) => nm),
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
      renderer.setPixelRatio(pr); renderer.setSize(size.x, size.y, false); camera.aspect = size.x / size.y; camera.fov = camera.aspect < 0.8 ? 52 : 44; camera.updateProjectionMatrix(); renderer.render(scene, camera); resize();
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
    const view = { update, react, feed, treat, focus, welcome, greet, snapshot, patrol, procession, destroy, say, _debug: { scene, camera, renderer, sheepObjs, cam, mode, groundAt } };
    return view;
  }

  /* ---------- 초상(도감·카드) ---------- */
  let studio;
  const portraitCache = new Map(), iconCache = new Map();
  function makeStudio(snapshot = false) {
    const renderer = new T.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: snapshot });
    renderer.outputColorSpace = T.SRGBColorSpace;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    renderer.setClearColor(0x000000, 0);
    const scene = new T.Scene();
    scene.add(new T.HemisphereLight('#a4b1ec', '#534064', 1.45));
    const key = new T.DirectionalLight('#f3eeff', 2.0); key.position.set(-3, 5, 6); scene.add(key);
    const rim = new T.DirectionalLight('#ffcf91', .95); rim.position.set(5, 3, -4); scene.add(rim);
    const fill = new T.DirectionalLight('#91c9fe', .46); fill.position.set(5, 1, 5); scene.add(fill);
    return { renderer, scene, camera: new T.PerspectiveCamera(31, 1, .05, 50) };
  }

  function studioFigure(sheep) {
    const object = buildSheep(sheep.species, sheep.level || 3, sheep.wear, 3);
    object.children.forEach(child => { if (child.geometry?.type === 'CircleGeometry') child.visible = false; });
    return object;
  }

  function figureBounds(object) {
    const bounds = new T.Box3();
    object.updateMatrixWorld(true);
    object.traverseVisible(mesh => {
      if (!mesh.isMesh || !mesh.material.visible) return;
      if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
      bounds.union(mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrixWorld));
    });
    return bounds;
  }

  function fitStudio(camera, bounds, direction, turns = false) {
    const center = bounds.getCenter(new T.Vector3()), size = bounds.getSize(new T.Vector3());
    const width = turns ? Math.hypot(size.x, size.z) : size.x * Math.abs(direction.z) + size.z * Math.abs(direction.x);
    const vertical = size.y + Math.max(size.x, size.z) * direction.y * .62;
    const span = Math.max(vertical, width / camera.aspect);
    const distance = span * 1.08 / (2 * Math.tan(camera.fov * Math.PI / 360)) + Math.max(size.x, size.z) * .37;
    camera.position.copy(center).addScaledVector(direction, distance);
    camera.lookAt(center);
  }

  function disposeFigure(object) {
    const geometry = new Set();
    object.traverse(child => {
      if (child.geometry) geometry.add(child.geometry);
      if (child.isSprite) { child.material.map?.dispose(); child.material.dispose(); }
      if (child.userData.disposeMaterial) child.material.dispose();
      if (child === object.userData.hit) child.material.dispose();
    });
    for (const part of geometry) part.dispose();
  }

  function studioImage(object, size, direction) {
    studio ||= makeStudio(true);
    const { renderer, scene, camera } = studio;
    renderer.setSize(size, size, false);
    fitStudio(camera, figureBounds(object), direction);
    scene.add(object);
    renderer.render(scene, camera);
    const url = renderer.domElement.toDataURL('image/png');
    scene.remove(object);
    disposeFigure(object);
    return url;
  }

  async function portrait(species, opts = {}) {
    await load();
    const key = [species, stageOf(opts.level || 3), wearKey(opts.wear), opts.size || 256].join(':');
    if (portraitCache.has(key)) return portraitCache.get(key);
    const object = studioFigure({ species, ...opts });
    object.rotation.y = .08;
    const url = studioImage(object, opts.size || 256, new T.Vector3(2.3, 1.0, 3.2).normalize());
    if (portraitCache.size >= 120) portraitCache.delete(portraitCache.keys().next().value);
    portraitCache.set(key, url);
    return url;
  }

  async function wearIcon(name) {
    if (!WEAR.has(name)) return null;
    if (iconCache.has(name)) return iconCache.get(name);
    await load();
    if (iconCache.has(name)) return iconCache.get(name);
    const item = WEAR.get(name);
    const direction = item.slot === 'back' ? [-2.4, 1.2, -3.9] : [1.45, 1.19, 3.9];
    const url = studioImage(makeGear(item), 160, new T.Vector3(...direction).normalize());
    iconCache.set(name, url);
    return url;
  }

  async function turntable(container, sheep) {
    await load();
    const { renderer, scene, camera } = makeStudio();
    renderer.setPixelRatio(Math.min(1.5, window.devicePixelRatio || 1));
    const canvas = renderer.domElement;
    canvas.className = 'f3d-turntable';
    container.appendChild(canvas);
    const direction = new T.Vector3(.33, .24, .91).normalize();
    const reduced = calm();
    let figure, bounds, angle = -.2, pointer = null, lastX = 0, last = 0, idleAfter = 0, raf, spinStart = 0;
    const resize = () => {
      const width = container.clientWidth || 320, height = container.clientHeight || 255;
      if (!sizeChanged(renderer, width, height)) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      fitStudio(camera, bounds, direction, true);
      if (figure) renderer.render(scene, camera);
    };
    const update = next => {
      if (figure) { scene.remove(figure); disposeFigure(figure); }
      figure = studioFigure(next);
      bounds = figureBounds(figure);
      scene.add(figure);
      resize();
    };
    const down = event => {
      if (pointer !== null) return;
      pointer = event.pointerId;
      lastX = event.clientX;
      canvas.setPointerCapture?.(pointer);
    };
    const move = event => {
      if (event.pointerId !== pointer) return;
      angle += (event.clientX - lastX) * .014;
      lastX = event.clientX;
    };
    const up = event => {
      if (event.pointerId !== pointer) return;
      pointer = null;
      idleAfter = performance.now() + 1500;
    };
    const frame = now => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(.05, (now - (last || now)) / 1000);
      last = now;
      if (!canvas.isConnected || document.hidden) return;
      if (!reduced && pointer === null && now > idleAfter) angle += dt * .35;
      const turn = spinStart ? clamp((now - spinStart) / 900, 0, 1) : 0;
      figure.rotation.y = angle + Math.PI * 2 * turn * turn * (3 - 2 * turn);
      if (turn === 1) spinStart = 0;
      if (!reduced) animateWings(figure, now / 1000);
      renderer.render(scene, camera);
    };
    update(sheep);
    const observer = new ResizeObserver(resize); observer.observe(container);
    canvas.addEventListener('pointerdown', down); canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
    raf = requestAnimationFrame(frame);
    return { update, spin() {
      if (reduced) return;
      spinStart = performance.now();
      idleAfter = spinStart + 1500;
    }, destroy() {
      cancelAnimationFrame(raf); observer.disconnect();
      disposeFigure(figure); renderer.dispose(); renderer.forceContextLoss?.(); canvas.remove();
    } };
  }

  /* ---------- 성탄 길 탐험 ---------- */
  const EXPLORE_EDGE = 8;
  const EXPLORE_COLORS = { photo: '#b9e8bd', guard: '#e4a7a7', light: '#eeb77c', person: '#ffd17e', quest: '#ff9fcc', verse: '#fff8e9', exit: '#cbdda3', secret: '#af97ff', look: '#8ee0ff', touch: '#ffcf86', try: '#ff9fcc', discoverDone: '#9ddbb2' };

  function exploreBoundary(scene, height, edge, color) {
    const stone = new T.BoxGeometry(), parts = [];
    const count = Math.ceil(edge * 2 / 1.5), width = edge * 2 / count;
    for (const side of [-1, 1]) {
      const border = side * (edge + .28);
      for (let i = 0; i < count; i++) {
        const offset = -edge + (i + .5) * width, h = i % 3 === 0 ? .96 : .80;
        parts.push(place(stone, offset, height(offset, border) + h / 2, border, width + .035, h, .56));
        parts.push(place(stone, border, height(border, offset) + h / 2, offset, .56, h, width + .035));
      }
    }
    scene.add(merged(parts, mat(color)));
    parts.forEach(part => part.dispose()); stone.dispose();
  }

  const DAYLIGHT = {
    night: { horizon: '#3b3a63', sky: '#0c1438', sun: '#c4d4ff', angle: [-17, 23, 11], light: 1.12, fog: [22, 53], lamp: 1.3 },
    predawn: { horizon: '#786989', sky: '#332e57', sun: '#b7c4ef', angle: [21, 6, -13], light: 1.25, fog: [17, 48], lamp: 1.05 },
    dawn: { horizon: '#c99e8e', sky: '#5d7293', sun: '#ffcfaa', angle: [21, 9, -12], light: 1.65, fog: [17, 50], lamp: .64 },
    day: { horizon: '#98b6c3', sky: '#537da7', sun: '#fff0dc', angle: [-5, 25, 8], light: 2.12, fog: [24, 62], lamp: .12 },
    dusk: { horizon: '#bb8c77', sky: '#332e57', sun: '#ffc492', angle: [-21, 8, 11], light: 1.55, fog: [19, 54], lamp: .91 },
  };
  const SCENE_TIMES = {
    '3-0': 'dawn', '3-1': 'day', '3-2': 'day', '3-4': 'dusk', '3-5': 'day', '3-6': 'day',
  };
  function exploreClimate(place, time, reduced) {
    const christmas = place === 'end' || /^4-/.test(place);
    const day = window.Core?.nowKST().date || new Date().toISOString().slice(0, 10);
    const roll = Math.floor(seeded(hashStr(day + '/' + place))() * 12);
    return { time: christmas ? 'night' : SCENE_TIMES[place] || time || 'night',
      weather: christmas ? 'clear' : ['rain', 'wind', 'market'][roll] || 'clear', reduced };
  }
  function outdoorWeather(scene, climate, height, blocks, edge, protectedPoints, addPeople) {
    const { weather, reduced } = climate;
    if (weather === 'clear' || weather === 'wind') return [];
    const market = weather === 'market';
    const cube = new T.BoxGeometry(), cone = new T.ConeGeometry(1, 1, 7), ball = new T.IcosahedronGeometry(1, 0);
    const batches = new Map();
    function part(geo, color, ...transform) {
      if (!batches.has(color)) batches.set(color, []);
      batches.get(color).push(place(geo, ...transform));
    }
    const stalls = [], shelters = [];
    climate.stalls = stalls;
    const lane = edge > 15 ? [8.6, 11.8, 14.6] : [4.8, 6.1];
    const candidates = (edge > 15 ? [11.6, 7.1, 3.1, -.5, -4.4, -8.1] : [-.6, 2.6, -3.9, 5.5, -6.4])
      .flatMap(z => lane.flatMap(x => [[x, z], [-x, z]]));
    for (const [x, z] of candidates) {
      if (stalls.length >= (market ? 2 : 1)) break;
      if (protectedPoints.some(([px, pz]) => Math.hypot(px - x, pz - z) < 2.45) ||
          blocks.some(([bx, bz, r]) => Math.hypot(bx - x, bz - z) < r + 1.68) ||
          stalls.some(([sx, sz]) => Math.hypot(sx - x, sz - z) < 3.5)) continue;
      const y = height(x, z);
      stalls.push([x, z]);
      for (const dx of [-1.29, 1.29]) for (const dz of [-.74, .74])
        part(cube, '#795442', x + dx, y + 1.07, z + dz, .11, 2.14, .11);
      for (let i = 0; i < 6; i++) {
        const color = i % 2 ? '#caa873' : market ? '#964c59' : '#647c82';
        part(cube, color, x + (i - 2.5) * .46, y + 2.07, z, .46, .09, 1.86, .11);
      }
      if (market) {
        part(cube, '#996b49', x, y + .81, z + .42, 2.55, .18, .66);
        for (let i = 0; i < 3; i++) part(cone, '#bb815b', x + (i - 1) * .72, y + 1.07, z + .41, .18, .35, .18, Math.PI);
      }
    }
    if (stalls.length) for (let i = 0; i < 3; i++) {
      const [x, z] = stalls[i % stalls.length];
      const px = x + (i - 1) * .69, pz = z - .25, y = height(px, pz);
      shelters.push([px, pz]);
      if (!addPeople) continue;
      part(cone, ['#92735e', '#7f647f', '#557a73'][i], px, y + .49, pz, .25, .96, .24);
      part(ball, '#bd906e', px, y + 1.05, pz, .15, .19, .15);
      part(cone, '#d8bc97', px, y + 1.19, pz, .19, .2, .17);
    }
    addScenery(scene, batches, mat);
    cube.dispose(); cone.dispose(); ball.dispose();
    if (!market) {
      scene.fog.near *= .73;
      scene.fog.far *= .77;
      const puddles = [];
      climate.puddleCenters = [];
      const puddleShape = new T.CircleGeometry(1, 15);
      const puddleMat = new T.MeshBasicMaterial({ color: '#a0bfd0', opacity: .29, transparent: true, depthWrite: false });
      for (const [x, z] of [[-2.6, 3.6], [2.2, 1.4], [-4.3, -1.1], [2.8, -4.4], [-3.2, -7.2]]) {
        climate.puddleCenters.push([x, z]);
        puddles.push(place(puddleShape, x, height(x, z) + .06, z, .84, .47, 1, -Math.PI / 2));
      }
      scene.add(merged(puddles, puddleMat));
      puddles.forEach(g => g.dispose()); puddleShape.dispose();
      climate.puddles = puddleMat;
      if (!reduced) {
        const maximum = 106, points = new Float32Array(maximum * 6);
        const geo = new T.BufferGeometry().setAttribute('position', new T.BufferAttribute(points, 3).setUsage(T.DynamicDrawUsage));
        const rain = new T.LineSegments(geo, new T.LineBasicMaterial({ color: '#c5d9eb', transparent: true, opacity: .62, depthWrite: false }));
        rain.frustumCulled = false;
        scene.add(rain);
        climate.rain = rain;
        const random = seeded(hashStr(climate.time + '/rain'));
        climate.drops = Array.from({ length: maximum }, () => [(random() - .5) * 16, (random() - .5) * 15, random() * 8]);
      }
    }
    return shelters;
  }
  function weatherFrame(climate, p, t, lowQuality) {
    if (climate.clock) climate.clock.value = t;
    if (!climate.rain) return;
    const { geometry } = climate.rain, positions = geometry.attributes.position;
    const count = lowQuality ? 32 : climate.drops.length;
    geometry.setDrawRange(0, count * 2);
    for (let i = 0; i < count; i++) {
      const [x, z, offset] = climate.drops[i], y = (offset - t * 8 % 8 + 8) % 8;
      positions.setXYZ(i * 2, p.x + x + y * .12, p.y + y - 1.8, p.z + z);
      positions.setXYZ(i * 2 + 1, p.x + x + y * .12 + .044, p.y + y - 1.44, p.z + z);
    }
    positions.needsUpdate = true;
    climate.puddles.opacity = .25 + .10 * Math.sin(t * 3.2) ** 2;
  }

  function exploreWorld(scene, kit, seed, layout,
    climate = { time: layout.time || 'night', weather: 'clear', reduced: true }, protectedPoints = [], regional = false) {
    const rand = seeded(hashStr(seed));
    const { time } = climate, daylight = DAYLIGHT[time];
    const dawn = time === 'dawn', night = time === 'night', day = time === 'day';
    const wind = climate.weather === 'wind' && !climate.reduced ? climate : null;
    const paved = ['temple', 'sanctuary', 'roof', 'gate'].includes(kit);
    const stable = kit === 'stable';
    const hillside = ['hillpath', 'galilee', 'elizabeth'].includes(kit);
    const dry = layout.variant === 'dry';
    const groundHeight = (x, z) => paved ? 0 : hillside ? .17 * Math.sin(x * .47) * Math.cos(z * .5) - z * .055 : .045 * Math.sin(x * .7 + z * .4);
    const gate = kit === 'gate', stairX = 6.47, stairHalf = 1.02, stairBase = -1.78, stairHead = -6.52, towerY = 4.16;
    const gateRoof = (x, z) => gate && Math.abs(x) > 2.71 && Math.abs(x) < 7.84 && z <= stairHead && z >= -7.91;
    const gateSteps = (x, z) => gate && Math.abs(Math.abs(x) - stairX) < stairHalf && z > stairHead && z < stairBase;
    const height = (x, z) => gateRoof(x, z) ? towerY : gateSteps(x, z)
      ? towerY * Math.floor((stairBase - z) / (stairBase - stairHead) * 17) / 17 : groundHeight(x, z);
    const gateWall = (x, z) => {
      if (!gate) return false;
      const side = Math.abs(x);
      const stairRail = Math.abs(Math.abs(side - stairX) - stairHalf) < .21 && z > stairHead && z < stairBase - .12;
      const towerFront = Math.abs(z - stairHead) < .21 && side > 1.55 && !gateSteps(x, z + .3);
      const towerSide = z <= stairHead && z >= -8 && (Math.abs(side - 2.71) < .23 || Math.abs(side - 7.84) < .23);
      const towerBack = Math.abs(z + 7.91) < .17 && side >= 2.71;
      return stairRail || towerFront || towerSide || towerBack;
    };
    const blocks = [], batches = new Map(), birds = [], fx = [];
    let campfire, rearPath;
    const box = new T.BoxGeometry(1, 1, 1), rock = new T.IcosahedronGeometry(1, 0);
    const col = new T.CylinderGeometry(1, 1, 1, 8), cone = new T.ConeGeometry(1, 1, 5);
    const stone = mat(paved ? '#aaa7ac' : '#938779'), edge = mat('#d4c1a7'), dark = mat('#726e88');
    const wood = mat('#785145'), windowLight = mat(day ? '#af926f' : '#ffbd68', { emissive: day ? '#000000' : '#ff962e', ei: daylight.lamp });
    const door = mat('#513d55'), olive = mat(dry ? '#80785b' : '#607a5c'), juniper = mat('#3f6262');
    const terra = mat('#925f63'), bricks = mat('#c28a6a'), fabric = mat('#ae766b');
    const batch = (shape, material, ...transform) => {
      if (!batches.has(material)) batches.set(material, []);
      const part = place(shape, ...transform);
      part.userData.wind = material === olive || material === juniper || material === fabric;
      batches.get(material).push(part);
    };
    const cube = (material, x, y, z, w, h, d, rx, ry, rz) => batch(box, material, x, y, z, w, h, d, rx, ry, rz);
    const stop = (x, z, r) => blocks.push([x, z, r]);
    const at = (item, x, z, angle = 0) => {
      const prop = buildItem(item, { lampStrength: day ? .12 : daylight.lamp / DAYLIGHT.night.lamp });
      prop.position.set(x, height(x, z), z); prop.rotation.y = angle;
      prop.traverse(child => { if (child.isLight) child.visible = false; });
      scene.add(prop);
      return prop;
    };
    const oliveTree = (x, z, scale = 1, tall = false) => {
      const y = height(x, z);
      batch(col, wood, x, y + .79 * scale, z, .14 * scale, 1.6 * scale, .14 * scale, 0, 0, .11);
      if (tall) batch(cone, juniper, x, y + 2.05 * scale, z, .68 * scale, 3.3 * scale, .68 * scale);
      else for (let i = 0; i < 5; i++) batch(rock, olive, x + Math.cos(i * 2.4) * .7 * scale,
        y + (1.7 + rand() * .45) * scale, z + Math.sin(i * 2.4) * .6 * scale, .78 * scale, .56 * scale, .68 * scale, 0, rand() * 6);
      if (Math.abs(x) < EXPLORE_EDGE && Math.abs(z) < EXPLORE_EDGE) stop(x, z, .52 * scale);
    };
    const visitor = (x, z, color) => {
      const y = height(x, z), stature = .82 + rand() * .37;
      batch(col, mat(color), x, y + .39 * stature, z, .24, .78 * stature, .24);
      batch(rock, mat('#b8896d'), x, y + .93 * stature, z, .15, .18, .15);
      batch(cone, mat('#dac2a8'), x, y + 1.08 * stature, z, .21, .23, .21);
      stop(x, z, .33);
    };
    const building = (x, z, s, style = 'house') => {
      const y = height(x, z), house = style === 'house', tavern = style === 'inn';
      const w = (tavern ? 4.9 : house ? 3.1 : 4.6) * s, h = (tavern ? 3.4 : house ? 2.8 : 2.9) * s;
      const facade = house ? bricks : stone;
      cube(facade, x, y + h * .5, z, w, h, 1.95 * s);
      cube(dark, x, y + h + .04, z, w + .19, .16, 2.1 * s);
      cube(door, x, y + .77 * s, z + 1.006 * s, .78 * s, 1.54 * s, .075);
      for (const hand of [-1, 1]) {
        cube(wood, x + hand * w * .31, y + h * .64, z + 1.017 * s, .63 * s, .62 * s, .051);
        cube(windowLight, x + hand * w * .31, y + h * .64, z + 1.056 * s, .42 * s, .43 * s, .027);
        cube(wood, x + hand * w * .31, y + h * .64, z + 1.08 * s, .055, .43 * s, .035);
        cube(edge, x + hand * w * .37, y + h + .27, z + .71 * s, w * .19, .4, .18);
      }
      if (tavern) for (const side of [-1, 1]) {
        cube(wood, x + side * w * .41, y + h * .36, z + 1.8 * s, .12, h * .73, .12);
        cube(terra, x + side * w * .25, y + h * .76, z + 1.53 * s, w * .51, .10, 1.2 * s, .16);
      }
      if (wind && z > -10 && !tavern) {
        const dx = w * .34, faceZ = z + 1.16 * s;
        cube(wood, x + dx, y + h * .88, faceZ, .85 * s, .045, .04);
        cube(fabric, x + dx, y + h * .88 - .23 * s, faceZ, .69 * s, .47 * s, .041, -.07);
      }
      if (z > -9) for (let i = -1; i <= 1; i++) stop(x + i * w * .26, z, .99 * s);
    };
    const pillar = (x, z, h) => {
      cube(edge, x, .18, z, 1.0, .36, 1.0);
      batch(col, stone, x, h * .5 + .28, z, .34, h, .34);
      cube(edge, x, h + .25, z, .88, .24, .88);
      stop(x, z, .47);
    };

    const sky = new T.Color(night ? '#252451' : daylight.horizon);
    scene.fog = new T.Fog(sky, ...daylight.fog);
    scene.background = sky;
    const dome = new T.Mesh(new T.SphereGeometry(82, 16, 10), new T.ShaderMaterial({
      side: T.BackSide, depthWrite: false,
      uniforms: { horizon: { value: night ? sky.clone().lerp(new T.Color('#685077'), .55) : sky },
        high: { value: new T.Color(night ? '#100f37' : daylight.sky) } },
      vertexShader: 'varying vec3 vSky; void main(){ vSky = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'varying vec3 vSky; uniform vec3 horizon, high; void main(){ float h = smoothstep(-0.04, 0.64, normalize(vSky).y); gl_FragColor = vec4(mix(horizon, high, h), 1.0); #include <colorspace_fragment> }'.replace('#include <colorspace_fragment>', '\n#include <colorspace_fragment>\n')
    }));
    dome.renderOrder = -3; scene.add(dome);
    scene.add(new T.HemisphereLight(stable ? '#f4ddc0' : dawn ? '#ccd9ff' : '#c6caff', stable ? '#805a3f' : '#756169', night ? 1.33 : 1.7));
    const sun = new T.DirectionalLight(night ? (stable ? '#ffdfb5' : '#f4e9e8') : daylight.sun, night ? 1.6 : daylight.light);
    sun.position.set(...(night ? [-5, 10, 5] : daylight.angle)); scene.add(sun);
    const groundGeo = new T.PlaneGeometry(regional ? 16.08 : 64, regional ? 16.08 : 54, 48, 40).rotateX(-Math.PI / 2).translate(0, 0, regional ? 0 : -8).toNonIndexed();
    const p = groundGeo.attributes.position, colors = new Float32Array(p.count * 3);
    const earth = new T.Color(stable ? '#755039' : paved ? '#958b95' : dry ? '#a8795d' : ['nazareth', 'workshop', 'well', 'inn'].includes(kit) ? '#876f71' : '#697454');
    const pathColor = new T.Color(stable ? '#9d733f' : paved ? '#aa9da6' : dry ? '#c5906c' : '#aa8a79');
    const strawLight = new T.Color('#d4a15b');
    const tint = new T.Color();
    for (let n = 0; n < p.count; n += 3) {
      const x = (p.getX(n) + p.getX(n + 1) + p.getX(n + 2)) / 3, z = p.getZ(n);
      const offset = Math.abs(x - Math.sin(z * .31 + seed % 4) * (hillside ? 2 : .5));
      const path = offset < (paved ? 2.8 : 1.14);
      const variation = rand();
      tint.copy(path ? pathColor : earth).multiplyScalar(.87 + variation * .22);
      if (stable) {
        const d = Math.hypot(x * 1.17, (z + 5.9) * .49);
        const strength = layout.christmas ? .69 : layout.eve ? .43 : .16;
        tint.copy(earth).lerp(pathColor, Math.max(0, 1 - offset / 3.6) * (.64 + variation * .36));
        tint.lerp(strawLight, strength * Math.exp(-.19 * d * d)).multiplyScalar(.80 + variation * .35);
      }
      for (let i = n; i < n + 3; i++) {
        p.setY(i, groundHeight(p.getX(i), p.getZ(i)));
        colors.set([tint.r, tint.g, tint.b], i * 3);
      }
    }
    groundGeo.setAttribute('color', new T.BufferAttribute(colors, 3)); groundGeo.computeVertexNormals();
    const ground = new T.Mesh(groundGeo, new T.MeshStandardMaterial({ vertexColors: true, roughness: 1 }));
    scene.add(ground);
    const starPos = [];
    for (let i = 0; i < (night ? 170 : 37); i++) {
      const a = rand() * 6.283;
      starPos.push(Math.cos(a) * 50, 9 + rand() * 25, Math.sin(a) * 50);
    }
    const starsGeo = new T.BufferGeometry().setAttribute('position', new T.Float32BufferAttribute(starPos, 3));
    if (!day) scene.add(new T.Points(starsGeo, new T.PointsMaterial({ color: '#fff0d0', size: 1.8, sizeAttenuation: false, opacity: .77, transparent: true, fog: false })));
    else starsGeo.dispose();

    for (let i = 0; i < (regional ? 0 : 14); i++) {
      const x = -31 + i * 4.65, z = -21 - rand() * 13;
      batch(cone, mat(paved ? '#6e6588' : '#505e76'), x, .3, z, 8 + rand() * 4, 5 + rand() * 8, 8, 0, rand() * 6);
      if (i % 2 === 0) building(x * .82, z + 5, .53 + rand() * .29);
    }

    if (kit === 'temple' || kit === 'sanctuary') {
      const inner = kit === 'sanctuary';
      for (const side of [-1, 1]) {
        const row = inner ? 5.3 : 6.5;
        for (let i = 0; i < 4; i++) pillar(side * row, -6.5 + i * 2.8 + (seed % 3) * .18, inner ? 3.75 : 2.8);
        cube(stone, side * 3.4, 2.1, -9.55, 2.8, 4.2, 1.18);
        cube(edge, side * 1.71, 1.95, -8.94, .67, 3.9, .36);
      }
      cube(door, 0, 1.9, -9.7, 3.38, 3.8, .69);
      cube(windowLight, 0, 1.8, -9.29, inner ? 1.26 : .19, 3.55, .094);
      cube(stone, 0, 4.32, -9.57, 9.0, .48, 1.6);
      cube(edge, 0, 4.01, -8.69, 9.03, .17, .19);
      cube(edge, 0, 4.78, -9.7, 9.45, .30, 1.75);
      for (const side of [-1, 1]) {
        cube(terra, side * 2.53, 2.44, -8.91, .42, 2.21, .07);
        cube(edge, side * 2.53, 3.66, -8.9, .58, .08, .11);
        at('등불 기둥', side * 4.55, -6.09, -.22 * side);
      }
      for (let i = 0; i < 3; i++) cube(edge, 0, .08 + i * .10, -8.1 - i * .38, 8.1 - i * .37, .16 + i * .20, .43);
      for (let lane = -3; lane <= 3; lane++) {
        for (let j = -4; j <= 4; j++) cube((lane + j + seed) % 3 ? stone : edge, lane * 2.07 + (j % 2) * .32, .017, j * 2.07, 2.02, .039, 2.02);
      }
      if (layout.variant === 'crowd') {
        for (let i = 0; i < 10; i++) {
          const side = i % 2 ? 1 : -1, x = side * (2.1 + (i % 4) * 1.14), z = -6 + Math.floor(i / 2) * 1.17 + rand() * .53;
          const stature = .76 + rand() * .57;
          batch(col, mat(['#766188', '#b98773', '#738589'][i % 3]), x, .39 * stature, z, .25, .77 * stature, .25);
          batch(rock, mat('#bd8967'), x, .93 * stature, z, .151, .18, .15);
          batch(cone, mat('#dcc1a1'), x, 1.08 * stature, z, .219, .23, .21);
        }
      }
      const altarZ = inner ? -5.8 : -7.28;
      cube(wood, 0, .54, altarZ, .88, 1.08, .69);
      cube(edge, 0, 1.08, altarZ, 1.01, .12, .83); stop(0, altarZ, .61);
      const smokeGeo = new T.SphereGeometry(.14, 6, 4);
      for (let i = 0; i < 6; i++) {
        const cloud = new T.Mesh(smokeGeo, new T.MeshBasicMaterial({ color: '#e2c5d8', transparent: true, opacity: .22, depthWrite: false }));
        scene.add(cloud); fx.push({ cloud, x: 0, z: altarZ, base: 1.2, i });
      }
      for (let i = 0; i < 5; i++) {
        const bird = new T.Group();
        for (const side of [-1, 1]) {
          const wing = new T.Mesh(cone, mat('#f0eadf'));
          wing.rotation.z = side * 1.45; wing.position.x = side * .12; wing.scale.set(.11, .32, .14);
          bird.add(wing);
        }
        bird.position.set(-5.4 + (i % 3) * .69, .14, 3.55 + Math.floor(i / 3) * .56);
        birds.push({ bird, home: bird.position.clone(), i }); scene.add(bird);
      }
    } else if (kit === 'roof') {
      for (let i = -4; i <= 4; i++) {
        cube(stone, i * 2.2, .38, -8.6, 2.17, .76, .23);
        cube(edge, i * 2.2, .015, .22, 2.16, .033, 16.9);
      }
      for (const side of [-1, 1]) {
        cube(stone, side * 8.75, .43, -.6, .23, .86, 16.0);
        cube(bricks, side * 5.9, .64, -6.4, 2.6, 1.29, 2.35);
        at('등불 기둥', side * 5.7, -4.8, side * .24);
      }
      cube(terra, 3.0, .052, -1.5, 2.1, .12, 1.9);
      building(-1.6, -10.2, .78);
    } else if (kit === 'gate') {
      for (const side of [-1, 1]) {
        cube(stone, side * 4.9, 1.95, -7.2, 5.9, 3.9, 1.36);
        cube(dark, side * 2.0, 2.39, -7.16, 1.18, 4.78, 1.76);
        for (let i = 0; i < 5; i++) cube(edge, side * (2.1 + i * 1.2), 4.03, -7.2, .64, .63, 1.18);
      }
      cube(stone, 0, 4.27, -7.2, 3.54, .93, 1.5);
      cube(terra, 0, 4.43, -6.38, 1.62, .45, .12);
      const tread = (stairBase - stairHead) / 17;
      for (const side of [-1, 1]) {
        const x = side * stairX;
        cube(edge, side * 5.28, towerY - .07, -7.19, 5.12, .14, 1.37);
        cube(stone, side * 5.28, towerY + .20, -7.91, 5.14, .41, .17);
        for (const railX of [2.71, 7.84]) cube(stone, side * railX, towerY + .21, -7.19, .20, .43, 1.49);
        for (let i = 0; i < 17; i++) {
          const z = stairBase - (i + .5) * tread, y = height(x, z);
          cube(i % 2 ? stone : edge, x, y / 2, z, stairHalf * 2, y + .06, tread + .01);
          for (const hand of [-1, 1]) cube(stone, x + hand * stairHalf, (y + .36) * .5, z, .18, y + .36, tread + .02);
        }
      }
      at('등불 기둥', -4.9, -5.8); at('등불 기둥', 4.9, -5.8);
      for (const [lane, x] of [-2.5, 1.1, 4.4].entries()) {
        for (let i = 0; i < 4; i++) visitor(x + (i % 2) * .32, 3.45 - i * 1.36 - lane * 1.4,
          ['#7f6679', '#727889', '#98795f'][(lane + i) % 3]);
      }
      cube(wood, 2.8, .53, -4, 1.75, 1.06, .59);
      cube(edge, 2.8, 1.09, -4, .72, .065, .33);
    } else if (kit === 'nazareth' || kit === 'workshop' || kit === 'well' || kit === 'inn') {
      const stand = kit === 'workshop';
      building(-5.4, -7.46, 1.02, kit === 'inn' ? 'inn' : 'house');
      building(.1, -9.45, 1.24, kit === 'inn' ? 'inn' : 'house');
      building(5.7, -7.76, 1.07, kit === 'inn' ? 'inn' : 'house');
      if (stand) {
        const tx = 1.8, tz = -5.4, y = height(tx, tz);
        cube(wood, tx, y + .91, tz, 2.65, .22, 1.05);
        for (const side of [-1, 1]) cube(wood, tx + side * .93, y + .40, tz, .32, .80, .83);
        cube(terra, tx + .47, y + 1.054, tz + .19, .51, .18, .16);
        stop(tx, tz, .85);
        for (let i = 0; i < 7; i++) cube(i % 2 ? wood : edge, 5.5 + .07 * i, y + .15 + .155 * i, tz - .2, 1.92, .153, .22 + .03 * i, 0, i * .17);
      } else {
        const x = kit === 'well' ? -1.9 : 5.8, z = kit === 'well' ? -3.85 : -.73;
        at('우물', x, z); stop(x, z, .85);
      }
      oliveTree(-6.7, -.4, 1.36);
      if (kit === 'inn') {
        building(7.9, -4.4, .63);
        rearPath = new T.Group();
        const flagstones = new T.BoxGeometry(1, 1, 1);
        const stones = [];
        for (let i = 0; i < 7; i++) {
          const z = -4.7 - i * .53, x = 7.25 + Math.sin(i * .61) * .31;
          stones.push(place(flagstones, x, height(x, z) + .032, z, .71, .065, .48, 0, i * .45));
        }
        rearPath.add(merged(stones, edge));
        stones.forEach(geometry => geometry.dispose());
        flagstones.dispose();
        const glow = glowSprite('#ffc681', 2.65, .78);
        glow.position.set(7.35, .59, -7.66); rearPath.add(glow); scene.add(rearPath);
      }
      if (kit === 'well') {
        for (let i = 0; i < 3; i++) cube(edge, -4.2, .08 + i * .065, -2.65 - i * .29, 1.06, .16 + i * .09, .3);
        for (const [x, z, size] of [[.9, -2.1, .27], [-.4, .1, .58]]) {
          batch(col, mat('#698ca6', { rough: .25 }), x, height(x, z) + .018, z, size, .025, size * .72);
        }
      }
      if (stand) {
        for (const side of [-1, 1]) cube(wood, -5.4 + .72 * side, .94, -5.85, .16, 1.9, .25);
        cube(wood, -5.4, 1.91, -5.85, 1.58, .18, .25);
        at('등불 기둥', 3.25, -5.9);
      }
      if (layout.variant === 'wedding') {
        for (let i = 0; i < 8; i++) cube(i % 2 ? terra : edge, -4.0 + i * 1.16, 2.7 - Math.sin(i * .44) * .44, -4.5, .42, .31, .068, 0, 0, i * .29);
        cube(wood, -4.8, 1.38, -4.5, .1, 2.76, .10); cube(wood, 4.8, 1.38, -4.5, .1, 2.76, .10);
      }
    } else if (kit === 'stable') {
      const lit = Boolean(layout.christmas || layout.eve);
      const z = -7.4, y = height(0, z);
      const limestone = ['#867374', '#b29c8e', '#9a8683', '#c1ab91', '#766772'].map(color => mat(color));
      const recess = mat('#49404f'), stoneFloor = mat('#a48a71');
      const caveFace = new T.IcosahedronGeometry(1, 1);
      const front = z + 2.75;
      for (let layer = 0; layer < 4; layer++) for (let i = 0; i <= 14; i++) {
        const a = i / 14 * Math.PI, depth = front - layer * 1.38;
        const width = 4.35 - layer * .25, vault = 3.12 - layer * .28;
        const px = Math.cos(a) * width;
        const py = y + .46 + Math.sin(a) * vault;
        const hz = .93 + (i % 3) * .17;
        batch(caveFace, limestone[(i + layer * 3) % limestone.length], px, py, depth + Math.sin(i * 2.4 + layer) * .26,
          .94 + Math.abs(Math.cos(a)) * .28, .77 + (i % 4) * .11, hz, -.23, i * .29, a - 1.58);
        if (i < 2 || i > 12) stop(px, depth, .52);
      }
      for (let i = -4; i <= 4; i++) {
        batch(caveFace, recess, i * .77, y + 1.35, z - 2.1, 1.05, 2.13, .88, .19, i);
        stop(i * .77, z - 2.02, .45);
        for (let j = 0; j < 6; j++) {
          const px = i * .84 + .11 * (j % 2), pz = z + 2.85 - j * .86;
          cube(j % 4 === 0 ? limestone[2] : stoneFloor, px, height(px, pz) + .014, pz, .80, .027, .82, 0, i * .02);
        }
      }
      for (const side of [-1, 1]) {
        batch(caveFace, limestone[2], side * 5.2, y + .74, z - .3, 2.22, 1.49, 2.95, -.25, side);
        batch(caveFace, limestone[1], side * 4.4, y + .19, z + 3.45, 1.58, .78, 1.09, .10, side * .72);
        cube(wood, side * 2.66, y + 1.11, z + 1.57, .17, 2.24, .19);
        cube(wood, side * 2.66, y + 1.09, z + 2.29, .12, .12, 1.48);
      }
      caveFace.dispose();
      const interior = mat('#a27147');
      cube(interior, 0, y + 1.22, z - .86, 4.28, 2.2, .081);
      for (const side of [-1, 1]) for (let i = 0; i < 4; i++) cube(wood, side * (1.09 + i * .46), y + 1.24, z - .78, .086, 2.4, .088);
      const crib = z + 1.18;
      if (layout.eve) {
        const doorZ = z + 1.33;
        for (const side of [-1, 1]) {
          cube(wood, side * .55, y + 1.16, doorZ, 1.04, 2.32, .12);
          for (let i = 0; i < 4; i++) cube(interior, side * (.18 + .24 * i), y + 1.16, doorZ + .08, .202, 2.31, .035);
          cube(wood, side * .54, y + .62, doorZ + .11, 1.05, .13, .08);
        }
        cube(windowLight, 0, y + 1.18, doorZ + .09, .057, 2.28, .028);
        stop(0, doorZ - .43, .52);
      }
      const straw = mat('#c39a58'), paleStraw = mat('#e5bf76');
      for (let i = 0; i < 60; i++) {
        const x = (rand() - .5) * 9.5, dist = -7.5 + rand() * 11;
        for (let strand = 0; strand < 4; strand++) {
          const sx = x + (rand() - .5) * .52, sz = dist + (rand() - .5) * .55;
          const layer = .016 + rand() * .016;
          cube(strand % 3 ? straw : paleStraw, sx, height(sx, sz) + layer, sz,
            .028 + rand() * .025, .012, .19 + rand() * .31, 0, rand() * Math.PI);
        }
      }
      for (const side of [-1, 1]) {
        const x = side * 2.57;
        cube(straw, x, y + .21, crib + .28, .73, .35, .59, -.025, side * .09);
        cube(paleStraw, x, y + .397, crib + .28, .72, .045, .55, -.03, side * .09);
        for (const shift of [-.17, .17]) cube(wood, x + shift, y + .404, crib + .28, .044, .025, .56, 0, side * .09);
      }
      if (lit) {
        const cribLight = new T.PointLight('#ffb65c', layout.christmas ? 13 : 7, 7.4, 1.8);
        cribLight.position.set(0, y + 1.62, crib + .24); scene.add(cribLight);
        for (const side of [-1, 1]) {
          const lantern = at('등불 기둥', side * 2.35, z + 2.6);
          lantern.scale.setScalar(.8);
        }
      }
      cube(wood, 0, y + .48, crib, 1.64, .44, .68);
      cube(edge, 0, y + .72, crib, 1.55, .12, .65);
      for (const side of [-1, 1]) cube(wood, .59 * side, y + .22, crib, .17, .49, .65, 0, 0, side * .18);
      if (layout.blanket?.length && layout.christmas) {
        for (let i = 0; i < 8; i++) {
          const color = mat(layout.blanket[i % layout.blanket.length]);
          cube(color, -.58 + i * .165, y + .803, crib + .06, .173, .035, .49);
          cube(color, -.58 + i * .165, y + .659, crib + .319, .173, .28, .035, -.17);
        }
      }
      if (layout.christmas) {
        batch(rock, mat('#f6e7cd'), -.1, y + .875, crib, .47, .15, .24, 0, .04, -.07);
        batch(rock, mat('#dcaf87'), .28, y + .91, crib + .044, .144, .125, .139);
        stop(0, crib, .58);
      }
    } else {
      const village = kit === 'elizabeth' || kit === 'hillpath' && !dry;
      if (village) building(0, -8.65, kit === 'elizabeth' ? 1.66 : 1.0, 'farm');
      if (kit === 'elizabeth') {
        const canopy = [olive, juniper, mat('#71855c'), mat('#526442')];
        const grapes = [mat('#5b4765'), mat('#89718a')];
        const face = -8.65 + 1.66 * .975, base = height(0, -8.65);
        const stonework = ['#9b8d83', '#9d8b7d', '#a99b8d', '#a2928b', '#bbb09c'].map(color => mat(color));
        for (let row = 0; row < 9; row++) for (let i = -5; i <= 5; i++) {
          const px = i * .67 + (row % 2 ? .13 : -.14), py = (row + .5) * .51;
          if (Math.abs(px) < .94 && py < 2.72 || Math.abs(Math.abs(px) - 2.36) < .76 && py > 2.35 && py < 3.77) continue;
          cube(stonework[(Math.abs(i + row * 2) * 3) % stonework.length], px, base + py, face + .035, .653, .494, .078);
        }
        cube(wood, 0, base + 2.65, face + .125, 1.74, .27, .27);
        for (const side of [-1, 1]) cube(edge, side * 2.36, base + 2.48, face + .112, 1.18, .18, .25);
        for (const x of [-6.4, -2.25]) for (const z of [-4.55, -.65]) {
          const y = height(x, z);
          cube(wood, x, y + 1.26, z, .16, 2.52, .16);
          cube(stone, x, y + .11, z, .37, .22, .37);
          stop(x, z, .13);
        }
        for (let i = 0; i < 9; i++) {
          const x = -6.45 + i * .525, top = 2.71 + Math.sin(i * 1.9) * .06;
          cube(wood, x, top, -2.6, .12, .13, 4.45);
          for (let j = 0; j < 10; j++) {
            const z = -4.65 + j * .46;
            if ((i + j * 3) % 8 === 0) continue;
            batch(rock, canopy[(i * 3 + j) % 4], x + Math.sin(j * 5) * .18, top + .13, z, .47, .20 + .13 * Math.abs(Math.sin(i + j)), .43, .20, i * 1.4);
            if ((i * 2 + j) % 4 === 0) for (let k = 0; k < 4; k++) {
              batch(rock, grapes[k % 2], x + Math.cos(k * 2.4) * .10, top - .10 - k * .073, z + Math.sin(k * 2.4) * .10, .086, .102, .085);
            }
          }
        }
        for (const z of [-4.65, -2.65, -.55]) cube(wood, -4.32, 2.63, z, 4.57, .14, .16);
        const hearthX = 4.01, hearthZ = -3.8, hearthY = height(hearthX, hearthZ);
        for (let i = 0; i <= 20; i++) {
          const angle = i / 20 * Math.PI * 2;
          if (Math.sin(angle) > .72) continue;
          cube(i % 3 ? bricks : edge, hearthX + Math.cos(angle) * .72, hearthY + .41, hearthZ + Math.sin(angle) * .69,
            .32, .79, .35, 0, -angle);
        }
        batch(rock, terra, hearthX, hearthY + .84, hearthZ - .07, .92, .57, .84);
        const ember = mat('#ffad56', { emissive: '#ff8139', ei: 1.5 });
        for (let i = 0; i < 7; i++) batch(rock, ember, hearthX + (i - 3) * .13, hearthY + .11, hearthZ + .51, .11, .08, .17);
        stop(hearthX, hearthZ, .80);
        for (const z of [2.7, 6, 9.3, 12.6]) for (let i = 0; i < 11; i++) {
          const x = 4.9 + i * 1.18, pz = z + (x - 4.9) * .2, h = height(x, pz);
          cube(i % 3 ? stone : edge, x, h + .23, pz, 1.16, .49, .45, 0, -.19);
          batch(rock, canopy[(i + 1) % 4], x, h + .34, pz - .62, .64, .27, .42, 0, i);
        }
      }
      if (kit === 'field') {
        const fire = at('모닥불', 0, -5.5); fire.scale.setScalar(1.22); stop(0, -5.5, .75);
        campfire = fire.userData.flicker;
        if (night) campfire.light.visible = true;
        else {
          const x = 6.8, z = -6.3, y = height(x, z);
          batch(col, mat('#4f90a0', { rough: .25 }), x, y + .023, z, .57, .036, .38);
          for (let i = 0; i < 7; i++) batch(rock, edge, x + .59 * Math.cos(i * .9), y + .06, z + .39 * Math.sin(i * .9), .14, .12, .16);
        }
        at('돌 양 우리', 5.8, -5.7); at('목자 천막', -5.4, -6.6, -.1);
      }
      const rows = layout.variant === 'vineyard' || kit === 'hillpath' && !dry;
      if (rows) for (const side of [-1, 1]) {
        for (let j = 0; j < 3; j++) for (let i = 0; i < 5; i++) {
          const x = side * (6.35 + j * .83), z = -5.8 + i * 1.55, y = height(x, z);
          cube(wood, x, y + .31, z, .081, .62, .081);
          if (layout.variant === 'vineyard') cube(wood, x, y + .52, z, .07, .065, 1.6);
          batch(rock, olive, x, y + .5, z, .40, .28, .42, 0, i);
          batch(rock, mat('#7e557d'), x + side * -.23, y + .38, z + .11, .10, .13, .12);
        }
      }
      if (dry) {
        const x = 6.4, z = -3.9, y = height(x, z);
        for (let i = 0; i < 9; i++) batch(rock, edge, x + .53 * Math.cos(i * .698), y + .13, z + .53 * Math.sin(i * .698), .25, .19, .23, 0, i);
      }
      if (kit === 'galilee') {
        const summit = layout.variant === 'summit';
        if (summit) {
          for (const [x, y, z] of [[3.7, 5.6, -16], [6.1, 7.4, -17.2], [8.9, 6.4, -18.1]]) {
            const point = glowSprite('#fff1c3', .75, .92);
            point.position.set(x, y, z); scene.add(point);
          }
          for (const [x, z, size] of [[6.1, -6.4, .86], [-4.8, -5.3, .75], [1.05, -7, .48]]) {
            batch(rock, dark, x, height(x, z) + .42, z, size, .67, size, 0, z);
          }
        } else {
          cube(mat('#6c8ca5', { rough: .32 }), 7.5, .24, -12.8, 13, .035, 6.5);
          for (const [x, z] of [[-4.8, 1.2], [4.85, -3.15], [-3.4, -2.65]]) oliveTree(x, z, .98);
        }
      }
      if (layout.variant === 'courtyard') {
        for (const x of [-5.1, -3.9, 4.1, 5.3]) cube(wood, x, height(x, -4.9) + .31, -4.9, .08, .62, .08);
        for (const x of [-4.5, 4.7]) cube(wood, x, height(x, -4.9) + .58, -4.9, 1.27, .07, .08);
        cube(wood, 3.04, height(3.04, -7.25) + .34, -7.25, .69, .28, .77);
        cube(edge, 3.04, height(3.04, -7.25) + .49, -7.25, .6, .055, .67);
      }
      if (layout.variant === 'vineyard') {
        const x = 7.2, z = 3.5, y = height(x, z);
        batch(col, stone, x, y + .16, z, .65, .32, .65);
        batch(col, terra, x, y + .33, z, .49, .025, .49);
      }
      if (layout.variant === 'feast') {
        for (const x of [-3.4, 3.4]) {
          const y = height(x, -5.7);
          cube(wood, x, y + .5, -5.7, 1.55, .09, .66);
          for (const side of [-1, 1]) cube(wood, x + side * .60, y + .23, -5.7, .13, .46, .50);
          batch(col, terra, x, y + .68, -5.74, .19, .29, .19);
        }
      }
      for (let i = 0; i < 7; i++) {
        const x = (i % 2 ? 1 : -1) * (6.85 + rand() * 1.8), z = -7 + (i % 4) * 2.1;
        if (!dry) oliveTree(x, z, .73 + rand() * .65, i % 3 === 0);
      }
      batch(rock, dark, 5.95, height(5.95, -5.35) + .34, -5.35, .89, .6, .77, 0, 1.56);
    }

    for (let i = 0; i < (stable ? 38 : paved ? 18 : 135); i++) {
      const x = (rand() - .5) * 28, z = 9 - rand() * 24;
      if (Math.abs(x) < 1.8 || paved && Math.abs(x) < 7.55) continue;
      const s = .045 + rand() * .25, y = height(x, z);
      if (i % 3 && !stable) batch(cone, dry ? stone : olive, x, y + s * .55, z, s * .26, s * 2.3, s * .27, .18, i, .25);
      else batch(rock, dark, x, y + s * .3, z, s, s * .52, s * .73, i, i * .3);
    }
    // Irregular landmarks outside the path keep re-used kits recognizable on different nights.
    for (const x of [-6.7, 6.7]) {
      const z = 5.8 + rand() * .8, y = height(x, z);
      cube(bricks, x, y + .35, z, 1.25, .70, .44, 0, (rand() - .5) * .65);
      cube(edge, x, y + .716, z, 1.28, .12, .48);
      stop(x, z, .48);
    }

    addScenery(scene, batches, material => material, wind);
    outdoorWeather(scene, climate, height, blocks, EXPLORE_EDGE, protectedPoints, true);
    box.dispose(); col.dispose();
    if (!birds.length) cone.dispose();
    rock.dispose();
    const star = new T.Sprite(new T.SpriteMaterial({ map: starTexture(), transparent: true, depthWrite: false, blending: T.AdditiveBlending, fog: false }));
    if (stable) {
      star.position.set(.38, 8.6, -8.2);
      star.scale.setScalar(layout.christmas ? 6.1 : 3.7);
      if (layout.christmas) {
        const ray = new T.BufferGeometry();
        ray.setAttribute('position', new T.Float32BufferAttribute([
          -.95, .04, 0, .95, .04, 0, .35, 8.3, -.6, .35, 8.3, -.6, -.15, .04, -1.15, .75, .04, 1.05
        ], 3));
        ray.setAttribute('uv', new T.Float32BufferAttribute([0,0,1,0,.5,1,.5,1,0,0,1,0], 2));
        const light = new T.Mesh(ray, new T.ShaderMaterial({
          side: T.DoubleSide, transparent: true, depthWrite: false, forceSinglePass: true, blending: T.AdditiveBlending,
          vertexShader: 'varying vec2 rayUV; void main(){rayUV=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
          fragmentShader: 'varying vec2 rayUV; void main(){float strength=pow(max(0.,1.-2.*abs(rayUV.x-.5)),2.); gl_FragColor=vec4(1.,.77,.41,strength*mix(.16,.29,rayUV.y));}'
        }));
        light.position.set(.03, 0, -7.55); scene.add(light);
        light.userData.disposeMaterial = true;
      }
    } else {
      star.position.set(3.1, 7.8, -22); star.scale.setScalar(2.65);
    }
    if (night || layout.christmas) scene.add(star);
    else { star.material.map.dispose(); star.material.dispose(); }
    if (!regional) exploreBoundary(scene, height, EXPLORE_EDGE, paved ? '#a19ba3' : '#8c7767');
    return { ground, height, groundHeight, blocks, birds, fx, star, dome, campfire, rearPath,
      walkable: (x, z) => !gateWall(x, z), climbs: gate ? [[-6.47, -7.17], [6.47, -7.17]] : [] };
  }

  const ADVENTURE_EDGE = 23.5;
  const ADVENTURE_PEOPLE = {
    '성전 문지기': ['#445b7c', '#d9c19d', 'staff'], '사가랴': ['#e8d8be', '#95565a', 'staff'],
    '엘리사벳': ['#547c75', '#dec69b', 'jar'], '요셉': ['#a86c4f', '#e9c39a', 'staff'],
    '마리아': ['#546ba6', '#ddd6c6', 'jar'], '할아버지': ['#8a6954', '#c5a68d', 'staff'],
    '여관 주인': ['#82474a', '#d9bf8d', 'basket'], '등잔 상인': ['#ae684c', '#e2bf7e', 'lantern'],
    '비둘기 할머니': ['#82556e', '#d8aab7', 'basket'], '엄마를 찾는 아이': ['#bd8c42', '#f3deb9', null, .66]
  };

  function adventureModels() {
    const cube = new T.BoxGeometry(), ball = new T.IcosahedronGeometry(1, 0);
    const robe = new T.CylinderGeometry(.63, 1, 1, 7);
    const taper = new T.ConeGeometry(1, 1, 5);
    const painted = new T.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: .87 });
    const faces = new Map();
    const skin = '#bb845e', ink = '#413034', sandals = '#5b4235';
    let disposed = false;
    function mesh(parts) {
      const geometry = parts.map(([shape, color, ...transform]) => {
        const g = place(shape, ...transform), rgb = new T.Color(color);
        const colors = new Float32Array(g.attributes.position.count * 3);
        for (let i = 0; i < colors.length; i += 3) colors.set([rgb.r, rgb.g, rgb.b], i);
        g.setAttribute('color', new T.BufferAttribute(colors, 3));
        return g;
      });
      const result = merged(geometry, painted);
      geometry.forEach(g => g.dispose());
      return result;
    }
    function faceFor(name) {
      const key = window.CAST?.[name] || window.CAST?.[name + '@1'];
      if (!window.FACES?.[key]) return null;
      if (!faces.has(key)) {
        const material = new T.MeshBasicMaterial({ transparent: true, depthWrite: false });
        const image = new Image();
        image.onload = () => {
          if (disposed) return;
          const map = new T.CanvasTexture(image);
          map.colorSpace = T.SRGBColorSpace; material.map = map; material.needsUpdate = true;
        };
        image.src = 'img/faces/' + encodeURIComponent(key) + '.webp';
        faces.set(key, material);
      }
      const face = new T.Mesh(new T.PlaneGeometry(.48, .51), faces.get(key));
      face.position.set(0, 1.67, .225);
      face.onBeforeRender = () => { face.material.opacity = face.material.map ? 1 : 0; };
      return face;
    }
    function person(name, variant, detailed) {
      const palette = [
        ['#a86258', '#e9caa2', 'basket'], ['#53766f', '#d2b490', 'jar'],
        ['#62688d', '#e3d3b1', 'staff'], ['#a78046', '#e4c2a0', 'basket'],
        ['#80607d', '#eed7ae', 'jar'], ['#617951', '#dfc6a5', 'staff']
      ];
      const [cloth, linen, prop, size = /아이|소년/.test(name) ? .72 : 1] = ADVENTURE_PEOPLE[name] || palette[variant % palette.length];
      const body = [
        [robe, cloth, 0, .75, 0, .34, 1.1, .25],
        [robe, linen, 0, .97, 0, .29, .095, .24],
        [ball, linen, 0, 1.75, -.052, .265, .31, .24],
        [ball, skin, 0, 1.66, .096, .187, .215, .144],
        [cube, linen, -.18, 1.43, -.026, .102, .39, .18, 0, 0, -.24],
        [cube, linen, .18, 1.44, -.035, .105, .36, .18, 0, 0, .21]
      ];
      // 가까이서 보는 인물(detailed)은 발·두 팔을 따로 만들어 걸음에 맞춰 움직인다(gaitPerson)
      for (const side of [-1, 1]) {
        body.push([cube, ink, side * .071, 1.696, .224, .024, .026, .017]);
        if (!detailed) body.push([cube, sandals, side * .127, .10, .048, .16, .13, .32]);
      }
      if (prop === 'staff') body.push([cube, sandals, -.39, .75, .16, .046, 1.49, .05, .06, 0, -.12]);
      if (prop === 'jar') body.push([ball, '#ae6d53', -.42, .79, .17, .24, .28, .22], [robe, '#c98960', -.42, 1.02, .17, .115, .099, .12]);
      if (prop === 'basket') body.push([robe, '#af8551', -.41, .60, .22, .23, .25, .21, 0, 0, Math.PI]);
      if (prop === 'lantern') body.push([robe, '#ac754b', -.4, .59, .14, .15, .18, .15], [taper, '#ffd181', -.4, .77, .14, .075, .22, .075]);
      const actor = new T.Group(), rig = new T.Group();
      actor.add(rig);
      let arm;
      const staticArms = [], arms = [], feet = [];
      for (const side of [-1, 1]) {
        const parts = [[robe, cloth, side * .042, -.19, .026, .11, .42, .11, 0, 0, side * .12],
          [ball, skin, side * .064, -.41, .049, .077, .077, .069]];
        if (detailed) {
          const a = mesh(parts); a.position.set(side * .265, 1.24, 0); rig.add(a); arms.push(a);
          if (side === 1) arm = a;
          const f = mesh([[cube, sandals, 0, 0, .048, .16, .13, .32]]); f.position.set(side * .127, .10, 0); actor.add(f); feet.push(f);
        } else for (const [shape, color, x, y, z, ...rest] of parts) staticArms.push([shape, color, side * .265 + x, 1.24 + y, z, ...rest]);
      }
      rig.add(mesh([...body, ...staticArms]));
      if (detailed) {
        const face = faceFor(name);
        if (face) rig.add(face);
      }
      actor.scale.setScalar(size);
      // 걸음 상태: phase는 걸은 거리로만 늘어난다(발이 미끄러지지 않게)
      actor.userData.gait = { rig, arms, feet, phase: Math.random() * 6, amt: 0, seed: Math.random() * 9, holds: prop === 'staff' || prop === 'jar' || prop === 'basket' || prop === 'lantern', wave: 0 };
      return { actor, arm };
    }
    function animal(kind, saddled = false) {
      const bird = ['닭', '비둘기', '독수리'].includes(kind), hoof = ['나귀', '염소', '어린 양', '소'].includes(kind);
      const coat = { 나귀: '#9c8e88', 염소: '#cca77d', '어린 양': '#f5e6cc', 소: '#9b6850', 독수리: '#706264',
        닭: '#b66844', 비둘기: '#e5e0ed', 고양이: '#d3a263' }[kind];
      if (saddled) {
        const mount = new T.Group(), head = new T.Group(), ears = [], feet = [];
        mount.add(mesh([[ball, coat, 0, .82, 0, .42, .44, .77],
          [ball, coat, 0, .98, .49, .26, .38, .31, .3], [taper, '#6d615b', 0, .94, -.72, .10, .56, .095, .48],
          [cube, '#a46655', 0, 1.06, -.12, .83, .25, .6], [cube, '#785445', 0, 1.26, -.12, .52, .14, .56]]));
        head.position.set(0, 1.19, .60);
        head.add(mesh([[ball, '#baaa9e', 0, .13, .19, .28, .27, .41],
          [ball, '#e2d1bc', 0, .084, .44, .217, .17, .2],
          [cube, ink, -.19, .23, .28, .05, .056, .055], [cube, ink, .19, .23, .28, .05, .056, .055],
          [cube, '#765647', 0, .11, .43, .45, .071, .07]]));
        for (const side of [-1, 1]) {
          const ear = mesh([[taper, coat, 0, .21, 0, .107, .46, .104]]);
          ear.position.set(side * .13, .31, .08); ear.rotation.z = -side * .30; head.add(ear); ears.push(ear);
          for (const z of [-.41, .36]) {
            const foot = mesh([[cube, coat, 0, -.36, 0, .15, .65, .16], [cube, '#67514a', 0, -.67, .034, .17, .14, .19]]);
            foot.position.set(side * .24, .74, z); mount.add(foot); feet.push(foot);
          }
        }
        mount.add(head);
        mount.userData.mountRig = { head, ears, feet };
        return mount;
      }
      const parts = bird ? [
        [ball, coat, 0, .26, 0, .17, .18, .27], [ball, coat, 0, .40, .18, .114, .12, .131],
        [taper, '#d8a057', 0, .387, .292, .05, .12, .05, Math.PI / 2],
        [taper, coat, 0, .29, -.27, .14, .31, .06, -1.15],
        [cube, ink, -.073, .426, .239, .035, .035, .035], [cube, ink, .073, .426, .239, .035, .035, .035]
      ] : [
        [ball, coat, 0, .71, 0, .38, .43, .72], [ball, coat, 0, .92, .55, .24, .39, .28, .28],
        [ball, hoof ? '#d7be9e' : coat, 0, 1.04, .78, .25, .22, .35],
        [ball, '#614c46', 0, 1.02, 1.02, .169, .13, .11],
        [taper, coat, 0, .82, -.64, .085, .64, .073, .48]
      ];
      for (const side of [-1, 1]) {
        if (bird) {
          parts.push([cube, '#a47656', side * .075, .07, .04, .04, .13, .045]);
          parts.push([ball, kind === '비둘기' ? '#a9a0bf' : '#d09051', side * .139, .255, -.03, .083, .102, .191]);
        } else {
          for (const z of [-.38, .32]) parts.push([cube, coat, side * .22, .29, z, .13, .53, .14, z * .2]);
          parts.push([taper, kind === '염소' ? '#735949' : coat, side * .105, 1.36, .63, .096, kind === '나귀' ? .47 : .32, .11, -.30, 0, side * -.32]);
          parts.push([cube, ink, side * .176, 1.12, .855, .037, .05, .048]);
        }
      }
      if (kind === '닭') parts.push([ball, '#b23b3d', 0, .511, .171, .053, .082, .088]);
      const actor = mesh(parts);
      actor.scale.setScalar(kind === '나귀' ? 1 : kind === '소' || kind === '독수리' ? 1.3 : kind === '고양이' ? .36 : bird ? .96 : .69);
      return actor;
    }
    return { person, animal, dispose() {
      disposed = true; painted.dispose(); cube.dispose(); ball.dispose(); robe.dispose(); taper.dispose();
      for (const material of faces.values()) { material.map?.dispose(); material.dispose(); }
    } };
  }

  function adventureWorld(scene, seed, layout, adventure, climate, protectedPoints, regional = false) {
    const rand = seeded(seed), { visual, zones } = adventure;
    const temple = visual === 'temple' || visual === 'sanctuary';
    const roof = visual === 'house' || visual === 'roofs';
    const desert = visual === 'desert', galilee = visual === 'galilee', workshop = visual === 'workshop';
    const openCountry = desert || galilee;
    const { time } = climate, daylight = DAYLIGHT[time];
    const night = time === 'night', dawn = time === 'dawn', day = time === 'day';
    const predawn = time === 'predawn', variant = layout.adventureVariant;
    const wind = climate.weather === 'wind' && !climate.reduced ? climate : null;
    const models = adventureModels();
    const actors = [], residents = new Map(), blocks = [], batches = new Map(), fx = [], birds = [], features = new Map();
    const cube = new T.BoxGeometry(), pebble = new T.IcosahedronGeometry(1, 0);
    const circle = new T.CylinderGeometry(1, 1, 1, 8);
    const pot = new T.CylinderGeometry(.76, 1, 1, 8), hangingCloth = new T.BoxGeometry();
    const slope = x => clamp(Math.floor(Math.max(0, -x) * 2) * .5, 0, 6);
    const terrainHeight = (x, z) => {
      if (temple) return slope(z + 12) * .24;
      if (roof) return slope(z + 3) * .23;
      return -.12 * z + .34 * Math.sin(x * .22) + .19 * Math.sin(z * .4);
    };
    const roofTop = 3.86, roofHalf = 3.35, stairHalf = 1.22;
    const roofFront = -17.9, stairFoot = -12.8, roofBack = -22.8;
    const roofProgress = z => clamp(Math.floor((stairFoot - z) / (stairFoot - roofFront) * 12) / 12, 0, 1);
    const onRoof = (x, z) => roof && Math.abs(x) < roofHalf && z <= roofFront && z >= roofBack;
    const onRoofStairs = (x, z) => roof && Math.abs(x) < stairHalf && z > roofFront && z < stairFoot;
    const height = (x, z) => onRoof(x, z) ? roofTop : onRoofStairs(x, z)
      ? lerp(terrainHeight(x, z), roofTop, roofProgress(z)) : terrainHeight(x, z);
    const rail = (x, z) => roof && (
      Math.abs(Math.abs(x) - roofHalf) < .28 && z >= roofBack - .25 && z <= roofFront + .25
      || Math.abs(z - roofBack) < .28 && Math.abs(x) <= roofHalf + .25
      || Math.abs(z - roofFront) < .25 && Math.abs(x) >= stairHalf && Math.abs(x) <= roofHalf
      || Math.abs(Math.abs(x) - stairHalf) < .25 && z > roofFront && z < stairFoot - .12
    );
    const elevation = (z, hook) => height(0, z) + hook;
    function batch(geometry, color, ...shape) {
      if (!batches.has(color)) batches.set(color, []);
      const part = place(geometry, ...shape);
      part.userData.wind = color === '#687d59' || color === '#536b62' || geometry === hangingCloth;
      batches.get(color).push(part);
    }
    const box = (color, ...shape) => batch(cube, color, ...shape);
    const rock = (color, ...shape) => batch(pebble, color, ...shape);
    const round = (color, ...shape) => batch(circle, color, ...shape);
    const stop = (x, z, radius) => blocks.push([x, z, radius]);
    const wall = temple ? (regional ? '#c8ae8a' : day ? '#c6ae8d' : '#978fa0') : '#ab866f';
    const cap = temple ? (regional ? '#e7d0a8' : night ? '#b4a8ae' : '#dfc4a0') : '#d3ad85';
    const wood = '#694452', ochre = '#b27750', fabric = night ? '#8d4c60' : '#a35255';
    const flameMat = mat('#ffca6c', { emissive: '#ff932d', ei: daylight.lamp });
    const roofLine = temple ? '#655a6c' : '#634e64';
    const ambient = new T.HemisphereLight(night ? '#bfc6ff' : '#fff0dc', '#86656b', night ? 1.45 : 1.85);
    scene.add(ambient);
    const sun = new T.DirectionalLight(daylight.sun, daylight.light);
    sun.position.set(...daylight.angle); scene.add(sun);
    const horizon = new T.Color(daylight.horizon);
    scene.background = horizon;
    scene.fog = new T.Fog(horizon, ...daylight.fog);
    const dome = new T.Mesh(new T.SphereGeometry(88, 20, 12), new T.ShaderMaterial({
      side: T.BackSide, depthWrite: false,
      uniforms: { horizon: { value: horizon }, zenith: { value: new T.Color(daylight.sky) } },
      vertexShader: 'varying vec3 sky; void main(){ sky=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
      fragmentShader: 'varying vec3 sky; uniform vec3 horizon,zenith; void main(){gl_FragColor=vec4(mix(horizon,zenith,smoothstep(-.06,.65,normalize(sky).y)),1.);\n#include <colorspace_fragment>\n}'
    }));
    dome.renderOrder = -3;
    scene.add(dome);
    if (!day) {
      const dots = [];
      for (let i = 0; i < (night || predawn ? 170 : 28); i++) {
        const angle = rand() * 2 * Math.PI;
        dots.push(Math.sin(angle) * 57, 10 + rand() * 33, Math.cos(angle) * 57);
      }
      const points = new T.Points(new T.BufferGeometry().setAttribute('position', new T.Float32BufferAttribute(dots, 3)),
        new T.PointsMaterial({ color: '#fff2ce', size: night ? 1.8 : 1.3, sizeAttenuation: false, fog: false, opacity: .75, transparent: true }));
      scene.add(points);
      const star = glowSprite(night || predawn ? '#ffe3a7' : '#ffe2bd', night || predawn ? 3.1 : 6.7, .85);
      star.position.set(predawn ? -3 : 8, night ? 16 : 10, -40); scene.add(star);
    }
    const routeX = z => (visual === 'hills' || openCountry) ? 5 * Math.sin((z + 7) * .10) : 0;
    const groundGeo = new T.PlaneGeometry(regional ? 47.08 : 70, regional ? 47.08 : 68, 52, 54).rotateX(-Math.PI / 2).toNonIndexed();
    const groundPos = groundGeo.attributes.position, colors = [];
    const groundColor = new T.Color(desert ? '#a68262' : galilee ? '#697e54' : temple ? regional ? '#a39587' : '#7f7684' : roof ? '#927975' : '#706e5c');
    const roadColor = new T.Color(desert ? '#c1a179' : temple ? regional ? '#b7a693' : '#a69ba0' : visual === 'hills' ? '#aa926f' : '#ac927e'), tint = new T.Color();
    for (let i = 0; i < groundPos.count; i += 3) {
      const x = (groundPos.getX(i) + groundPos.getX(i + 1) + groundPos.getX(i + 2)) / 3, z = groundPos.getZ(i);
      const dirt = Math.abs(x - routeX(z)) < 3 || Math.abs(z - 11) < 2 || Math.abs(z + 4) < 2 || Math.abs(z + 16) < 1.4;
      tint.copy(dirt ? roadColor : groundColor).multiplyScalar(.93 + rand() * (temple ? .12 : .14));
      for (let j = i; j < i + 3; j++) {
        groundPos.setY(j, terrainHeight(groundPos.getX(j), groundPos.getZ(j)));
        colors.push(tint.r, tint.g, tint.b);
      }
    }
    groundGeo.setAttribute('color', new T.Float32BufferAttribute(colors, 3));
    groundGeo.computeVertexNormals();
    const ground = new T.Mesh(groundGeo, new T.MeshStandardMaterial({ vertexColors: true, roughness: 1 }));
    scene.add(ground);

    function jar(x, z, size = 1, base = 0, color = '#a46857') {
      const y = height(x, z) + base;
      batch(pot, color, x, y + .27 * size, z, .24 * size, .46 * size, .24 * size);
      round(color, x, y + .51 * size, z, .125 * size, .09 * size, .125 * size);
      round('#563e46', x, y + .559 * size, z, .10 * size, .013 * size, .10 * size);
    }
    function basket(x, z, size = 1, base = 0) {
      const y = height(x, z) + base;
      batch(pot, ochre, x, y + .17 * size, z, .31 * size, .29 * size, .31 * size, 0, 0, Math.PI);
      round(cap, x, y + .32 * size, z, .32 * size, .054 * size, .32 * size);
      for (let i = 0; i < 4; i++) rock(i % 2 ? '#bd9757' : '#9a7853', x + (i % 2 - .5) * .22 * size, y + .37 * size, z + (i / 2 - .75) * .21 * size, .105 * size, .092 * size, .105 * size);
    }
    const smokeGeo = new T.IcosahedronGeometry(.19, 0);
    function lamp(x, z, y = .65, bright = true, smoking = false) {
      const h = height(x, z) + y;
      round(wood, x, h - .25, z, .065, .5, .065);
      round(ochre, x, h, z, .21, .115, .21);
      if (!bright) return;
      if (night || predawn) {
        const light = glowSprite('#ffc482', 1.18, .46 * daylight.lamp);
        light.position.set(x, h + .22, z); scene.add(light);
      }
      batch(pebble, '@flame', x, h + .15, z, .114, .24, .114);
      if (smoking) for (let i = 0; i < 3; i++) {
        const cloud = new T.Mesh(smokeGeo, new T.MeshBasicMaterial({ color: '#f8d5bd', transparent: true, opacity: .2, depthWrite: false }));
        scene.add(cloud); fx.push({ cloud, x, z, base: h + .2, i: i * 2 });
      }
    }
    function olive(x, z, scale) {
      const y = height(x, z);
      round(wood, x, y + .76 * scale, z, .14 * scale, 1.52 * scale, .14 * scale, 0, 0, .16);
      for (let n = 0; n < 5; n++) {
        rock(n % 2 ? '#687d59' : '#536b62', x + Math.sin(n * 1.28) * .71 * scale, y + (1.58 + rand() * .47) * scale,
          z + Math.cos(n * 1.28) * .6 * scale, .84 * scale, .62 * scale, .80 * scale, 0, n);
      }
      stop(x, z, .43 * scale);
    }
    function wallRun(x, z, count, axis, h = 1) {
      for (let n = 0; n < count; n++) {
        const px = x + (axis === 'x' ? n * 1.55 : 0), pz = z + (axis === 'z' ? n * 1.55 : 0), y = height(px, pz);
        const [w, d] = axis === 'x' ? [1.54, .52] : [.52, 1.54];
        box(wall, px, y + h / 2, pz, w, h, d);
        box(cap, px, y + h + .055, pz, w + .025, .12, d + .14);
        stop(px, pz, .76);
      }
    }
    function column(x, z, h = 3.9) {
      const y = height(x, z);
      box(cap, x, y + .15, z, 1, .3, .96);
      round(wall, x, y + h * .5, z, .38, h, .38);
      box(cap, x, y + h, z, .94, .23, .91);
      stop(x, z, .47);
    }
    function home(x, z, width, color = wall) {
      const y = height(x, z), front = z + 1.54;
      box(color, x, y + 1.43, z, width, 2.86, 3);
      box(roofLine, x, y + 2.86, z, width + .23, .22, 3.17);
      box(cap, x, y + 3.06, front, width + .18, .19, .14);
      box(wood, x, y + .89, front, .78, 1.73, .13);
      for (const side of [-1, 1]) {
        box(wood, x + side * width * .3, y + 1.84, front + .015, .58, .61, .12);
        box(night || predawn || dawn ? '@flame' : '#af926f', x + side * width * .3, y + 1.84, front + .089, .42, .43, .035);
        box(wood, x + side * width * .3, y + 1.85, front + .111, .043, .47, .028);
        box(cap, x + side * width * .3, y + 1.48, front + .10, .73, .10, .30);
      }
      for (let dx = -width / 2 + .4; dx < width / 2; dx += .9) stop(x + dx, z, 1.49);
    }
    function stall(x, z, color) {
      const y = height(x, z);
      for (const side of [-1, 1]) {
        for (const depth of [-.72, .72]) box(wood, x + side * 1.29, y + 1.18, z + depth, .12, 2.36, .12);
        box(wood, x + 1.01 * side, y + .49, z + .51, .12, .96, .19);
      }
      for (let i = 0; i < 7; i++) {
        const px = x + (i - 3) * .404, stripe = i % 2 ? color : cap;
        box(stripe, px, y + 2.35, z, .409, .105, 1.72, -.115);
        batch(hangingCloth, stripe, px, y + 2.23, z + .86, .407, .24, .083);
      }
      box(wood, x, y + .93, z + .50, 2.57, .14, .75);
      jar(x - .68, z + .47, .65, 1.01); basket(x + .29, z + .55, .67, 1.01);
      jar(x + 1.53, z + .54, 1.27);
      stop(x, z, .83);
    }
    function well(x, z, dry = false) {
      const y = height(x, z);
      round('#535a68', x, y + .28, z, 1.02, .55, 1.02);
      round(dry ? '#9b7d60' : '#527d86', x, y + .565, z, .79, .021, .79);
      for (let i = 0; i < 11; i++) {
        const a = i / 11 * 2 * Math.PI;
        box(cap, x + Math.cos(a) * .94, y + .69, z + Math.sin(a) * .94, .33, .29, .55, 0, -a);
      }
      if (!dry) {
        for (const side of [-1, 1]) box(wood, x + side * .99, y + 1.38, z, .129, 2.75, .16);
        box(wood, x, y + 2.68, z, 2.35, .19, .20);
        box(ochre, x, y + 1.85, z, .041, 1.61, .042);
      }
      stop(x, z, 1.03);
    }
    function laundry(x, z) {
      const y = height(x, z);
      for (const side of [-1, 1]) box(wood, x + side * 1.89, y + 1.04, z, .085, 2.08, .085);
      box(wood, x, y + 1.94, z, 3.79, .033, .027);
      for (let i = 0; i < 4; i++) batch(hangingCloth, [cap, '#7f9d9a', fabric, '#dfc3ab'][i], x - 1.35 + i * .8, y + 1.57 + .04 * i, z, .62, .79 - .08 * i, .043, .07, 0, .06 * (i - 1));
    }
    function stairway(z, width) {
      for (let i = 0; i < 6; i++) {
        const pz = z - i * .51;
        box(i % 2 ? wall : cap, 0, elevation(pz, -.035), pz, width, .13, .53);
      }
    }

    if (temple) {
      for (const side of [-1, 1]) {
        for (const z of [-17.2, -13, -8.6, -4.3, .1]) column(side * 6.2, z, visual === 'sanctuary' ? 4.9 : 4.3);
        box(roofLine, side * 6.2, elevation(-12, 4.45), -11, .97, .34, 15.8);
        wallRun(side * 21.7, -20.7, 14, 'z', 1.52);
        stall(side * 9.2, 11.8, side > 0 ? fabric : '#596f7e');
        stall(side * 15.7, 4.6, '#927448');
        lamp(side * 4.15, -11.75, .94, true);
        lamp(side * 13, 6.9, 1.02, true);
        if (!regional) olive(side * 15.7, -13, 1.45);
        home(side * 16.5, -20.7, 5.3);
        if (regional && visual === 'sanctuary') continue;
        box(wall, side * 4.65, elevation(-21, 3), -21, 3.65, 6, 1.7);
        box(cap, side * 2.8, elevation(-21, 2.96), -20.05, .68, 5.9, .58);
        box(fabric, side * 1.45, elevation(-21, 2.46), -20.75, 2.81, 4.9, .22);
        box(ochre, side * 3.91, elevation(-21, 4.52), -20.05, .51, 1.42, .1);
      }
      if (!(regional && visual === 'sanctuary')) {
        box('@flame', 0, elevation(-21, 2.44), -20.89, .36, 4.82, .05);
        box(cap, 0, elevation(-21, 5.85), -21, 13.4, .49, 1.99);
        box(roofLine, 0, elevation(-21, 6.22), -21, 13.9, .40, 2.22);
        if (regional) box('#d4a456', 0, elevation(-21, 6.44), -21, 14.05, .12, 2.34);
      }
      for (let x = -18; x <= 18; x += 2.7) for (let z = -19; z < 19; z += 2.6) {
        if (Math.abs(x) > 11 && z > 9) continue;
        if (z < -11.4) continue;
        const limestone = night ? ['#aca2ae', '#a098a6', '#b1a4aa', '#9891a3'] : ['#c2b0a0', '#cbb6a0', '#b6a299', '#c1aa98'];
        box(limestone[Math.floor(rand() * 4)], x, .021, z, 2.645, .082, 2.535, 0, (rand() - .5) * .015);
      }
      stairway(-12, 10);
      well(12.7, -3.6); laundry(17.5, 13.1);
      if (night && visual === 'temple') {
        stall(4.75, 7.15, '#94596a'); stall(-6.25, 5.1, '#4f637a');
        for (const [x, z] of [[-4.8, 12], [2.7, 9.4], [-3.9, 2], [3.4, -6.2]]) {
          jar(x, z, 1.25); basket(x + .6, z + .3, .92); lamp(x - .5, z - .53, .95);
        }
      }
      if (variant === 'procession') {
        for (const z of [-13.8, -8.4, -3, 2.3, 7.7]) {
          box('#985953', 0, height(0, z) + .084, z, 1.84, .032, 5.29);
          for (const x of [-1, 1]) box('#d5a661', x * .79, height(0, z) + .107, z, .09, .018, 5.24);
        }
      }
      if (variant === 'steps') {
        for (const [x, z] of [[-4.45, 3.7], [4.3, -1.9], [-4.5, -6.9]]) {
          box(cap, x, .36, z, 2.17, .22, .54); box(wall, x, .14, z, 1.63, .28, .42);
        }
        stall(6.85, 8.15, '#76618b');
      }
      if (visual === 'sanctuary') {
        box(wood, 0, elevation(-18, .5), -18, 1.12, 1, .87);
        box(cap, 0, elevation(-18, 1.03), -18, 1.17, .12, .91);
        stop(0, -18, .67); lamp(0, -18, 1.18, true, true);
      } else lamp(-4.7, 6, 1.1, true, true);
    } else if (openCountry) {
      for (const side of [-1, 1]) {
        for (let i = 0; i < 27; i++) {
          const x = side * (5.6 + rand() * 16), z = -21 + rand() * 42;
          const color = desert ? (i % 2 ? '#a77960' : cap) : (i % 2 ? '#827962' : '#91a16a');
          rock(color, x, height(x, z) + .15, z, .35 + rand() * 1.3, .4 + rand() * .95, .38 + rand(), 0, i);
        }
      }
      if (desert) {
        well(-16.3, -18.35, true);
        for (const [x, z] of [[-10, 15], [11, 2], [6, -17]]) {
          round(wood, x, height(x, z) + .58, z, .09, 1.16, .09);
          box(cap, x, height(x, z) + 1.12, z, .82, .24, .2, 0, .47);
        }
        for (const [x, z, size] of [[-16, 5, 2.6], [15, -2, 3], [-9, -20, 2.5]]) {
          rock('#916f64', x, height(x, z) + size * .64, z, size, size * 1.38, size * .77, 0, .5);
          stop(x, z, size * .55);
        }
      } else {
        for (const [x, z] of [[-15, 12], [-10.1, .4], [-6.1, -2], [-2.6, -4.8], [2.2, -7.5], [7.3, -6.2], [14, -4], [17.2, -6.5], [11.8, -15]]) {
          olive(x, z, .95 + rand() * .48);
        }
        basket(12.6, -7.2, 1.5);
        const lake = new T.Mesh(new T.CircleGeometry(26, 36), mat('#678c98', { roughness: .5 }));
        lake.rotation.x = -Math.PI / 2;
        lake.scale.y = .38;
        lake.position.set(15, 3.72, -37);
        scene.add(lake);
        for (let i = 0; i < 13; i++) {
          box(i % 2 ? '#93acb0' : '#b6bdb3', -3 + rand() * 38, 3.74, -31 - rand() * 11, .55 + rand() * 3, .006, .036);
        }
      }
    } else {
      for (const side of [-1, 1]) {
        for (const [i, z] of [15, 3, -15].entries()) {
          home(side * (10.2 + i * 3.2), z, 4.25 + rand() * 2.2, i % 2 ? wall : '#ba9778');
          jar(side * (8.7 + i * 3.2), z + 1.95, 1.05);
          basket(side * (11.7 + i * 3.2), z + 2.05, .92);
          olive(side * (17 + rand() * 3), z + 4.5, 1.15 + rand() * .42);
        }
        wallRun(side * 20.7, -9, 11, 'z', visual === 'hills' ? .64 : 1.05);
        lamp(side * 3.3, -8.6, .92, true, !dawn);
        for (let i = 0; i < 27; i++) {
          const x = side * (5.5 + rand() * 16.4), z = -21 + rand() * 43;
          rock(i % 2 ? '#8d8275' : '#6c795b', x, height(x, z) + .08, z, .12 + rand() * .45, .19 + rand() * .26, .28 + rand() * .30, 0, i);
        }
      }
      if (visual === 'well') well(2.7, -1.05);
      else if (!workshop) well(5.9, 10.8);
      laundry(-7.5, 9.4); olive(10.4, -5.7, 1.5);
      if (workshop) {
        home(.4, -22, 9.3, '#967c79');
        for (const [x, z] of [[-5.8, -19], [13, -2.4], [-14.7, 13.2]]) {
          const y = height(x, z);
          for (const side of [-1, 1]) box(wood, x + side * .91, y + .44, z, .24, .88, .71);
          box(ochre, x, y + .91, z, 2.53, .23, .88);
          for (let i = 0; i < 4; i++) box(i % 2 ? cap : wood, x - .65 + i * .43, y + 1.1, z, .21, .15, .71, 0, (i - 1) * .17);
          stop(x, z, .61);
          if (variant !== 'dream') lamp(x + 1.1, z, 1.05);
        }
        const z = variant === 'dream' ? -20.8 : -18.9;
        for (let x = -3; x <= 4; x += 1) {
          box(variant === 'dream' ? roofLine : wood, x, height(x, z) + .13, z, 1, .26, 1.46);
        }
      }
      if (visual === 'nazareth') {
        olive(-17.3, -20.35, 1.7);
        if (variant === 'wedding') {
          home(0, -21, 7.2, '#c49a83');
          for (const x of [-3, 3]) {
            box(wood, x, height(x, -17.1) + 1.25, -17.1, .14, 2.5, .15);
            jar(x + .42, -16.95, 1.12);
          }
          for (let i = 0; i < 13; i++) {
            const x = (i - 6) * .5;
            box('#d6bcab', x, height(x, -17.1) + 2.22 + .31 * Math.abs(x) / 3, -17.1, .54, .16, .12, 0, 0, x * .048);
            rock(i % 2 ? '#fff1d9' : '#dda498', x, height(x, -17.1) + 2.07 + .32 * Math.abs(x) / 3, -17.05, .22, .15, .13);
          }
        } else home(1.9, -5.7, 4.8, '#997c74');
      }
      if (visual === 'well') {
        home(4.7, -20.3, 7.1, '#bc947f');
        for (const [x, z] of [[-2.7, 14.7], [-1.8, 14], [3.5, -15.6], [5.3, -15.8], [6.4, -15.5]]) jar(x, z, 1.6);
      }
      if (visual === 'house') {
        home(-7.2, 4.7, 3.4, '#b38b72'); home(7.8, -2.2, 3.9, '#af8979');
        jar(-5.36, 6.6, 1.14); basket(-5.89, 6.48);
        wallRun(-13.7, -3.4, 3, 'x', .67);
      }
      if (visual === 'roofs') {
        home(7.5, 4.5, 4.4, '#a2807c'); home(-6.5, -1.3, 4.7, '#9a787a');
        for (const [x, z] of [[-3.9, 7.1], [4.25, 11.9], [-3.4, 1.2], [5.0, -4.4]]) lamp(x, z, .82);
      }
      if (visual === 'hills') for (const [x, z, scale] of [[-5.2, 7, 1.2], [7, 3.5, 1.23], [-5.2, -3.8, 1.31], [6.1, -10.2, 1.1]]) {
        olive(x, z, scale); rock('#9b8873', x + 1.15, height(x, z) + .23, z, .64, .44, .46);
      }
      if (roof) {
        for (const x of [-15.2, 7.2]) wallRun(x, -22.5, 5, 'x', .7);
        for (const x of [-8.1, 6.4]) wallRun(x, -18, 5, 'z', .52);
        for (let i = 0; i < 12; i++) box(i % 2 ? wall : cap, 0, elevation(-4 - i * .5, -.043), -4 - i * .5, 6.35, .17, .51);
        box(fabric, 3.1, elevation(-15, .06), -15, 3.6, .11, 2.5);
        for (let i = 0; i < 5; i++) box(cap, 1.61 + i * .72, elevation(-14.03, .12), -14.03, .14, .025, .43);
        lamp(3.5, -17.4, .52, true);
        const deckLength = roofFront - roofBack, deckCenter = (roofBack + roofFront) / 2;
        box(wall, 0, roofTop / 2, deckCenter, roofHalf * 2, roofTop, deckLength);
        box(cap, 0, roofTop - .04, deckCenter, roofHalf * 2, .10, deckLength);
        for (const side of [-1, 1]) {
          box(wall, side * roofHalf, roofTop + .39, deckCenter, .31, .78, deckLength + .29);
          const frontWidth = roofHalf - stairHalf;
          box(wall, side * (stairHalf + frontWidth / 2), roofTop + .39, roofFront, frontWidth, .78, .31);
        }
        box(wall, 0, roofTop + .39, roofBack, roofHalf * 2, .78, .30);
        const tread = (stairFoot - roofFront) / 12;
        for (let i = 0; i < 12; i++) {
          const z = stairFoot - (i + .5) * tread, y = height(0, z);
          box(i % 2 ? wall : cap, 0, y / 2, z, stairHalf * 2, y, tread + .016);
          for (const side of [-1, 1]) box(wall, side * stairHalf, (y + .53) / 2, z, .24, y + .53, tread + .02);
        }
      } else {
        for (const z of [-12, -3, 7, 17]) {
          const x = routeX(z);
          for (let i = 0; i < 5; i++) rock(cap, x + (rand() - .5) * 5, height(x, z) + .03, z + rand() * 2, .43, .12, .62, 0, i);
        }
        stall(-13, 5.3, '#706580');
      }
    }
    for (let i = 0; i < (regional ? 0 : 18); i++) {
      const x = (rand() - .5) * 65, z = -29 - rand() * 6 - (galilee ? 21 : 0);
      rock(desert ? '#a78177' : night ? '#494568' : '#777d80', x, 1, z, 3.7 + rand() * 6, 4 + rand() * 8, 6, 0, i);
    }
    for (const [index, [opening, z]] of adventure.crossings.entries()) {
      for (let x = -23.25; x <= 23.4; x += 1.5) {
        if (Math.abs(x - opening) < 2.0) continue;
        const y = height(x, z), low = temple ? .53 : .43;
        box(wall, x, y + low / 2, z, 1.48, low, .48);
        box(cap, x, y + low + .066, z, 1.50, .143, .62);
        stop(x, z, .75);
      }
      for (const side of [-1, 1]) {
        const x = opening + side * 1.57, y = height(x, z);
        box(wall, x, y + .92, z, .37, 1.84, .42);
        box(cap, x, y + 1.89, z, .56, .17, .57);
        lamp(x, z - .08, 2.07, true);
      }
      for (let i = 0; i < 5; i++) {
        const pz = z + (i - 2) * .38;
        box(index ? cap : roofLine, opening, height(opening, pz) + .038, pz, 2.68, .063, .36);
      }
    }
    const signs = zones.map((_, i) => [i === 1 ? -3 : 3.6, [12, -2, -15][i]]);
    for (const [i, [x, z]] of signs.entries()) {
      const sign = textSprite(zones[i], { color: '#fff0c9', size: 19 });
      sign.position.set(x, height(x, z) + 1.15, z);
      sign.scale.setScalar(2.72); scene.add(sign);
      box(wood, x, height(x, z) + .53, z, .09, 1.06, .09);
    }
    for (const target of Object.values(adventure.targets)) {
      if (!target.feature) continue;
      const [x, z] = target.pos, y = height(x, z);
      const obj = new T.Group(); obj.position.set(x, y, z); scene.add(obj);
      function part(color, geometry, dx, dy, dz, w, h, d) {
        const mesh = new T.Mesh(place(geometry, dx, dy, dz, w, h, d), color === '@flame' ? flameMat : mat(color));
        obj.add(mesh); return mesh;
      }
      if (target.feature === 'jump') {
        part(wall, cube, 0, .27, 0, 2.25, .54, .5); part(cap, cube, 0, .56, 0, 2.29, .13, .61);
      } else if (target.feature === 'push') {
        part(wood, cube, 0, .59, 0, 1.11, .38, .89);
        part(ochre, cube, 0, .81, 0, 1.15, .09, .93);
        for (const side of [-1, 1]) part(roofLine, cube, side * .52, .34, 0, .14, .57, .57).rotation.x = .28;
      } else if (target.feature === 'shine') {
        part(roofLine, cube, 0, .34, 0, 1.02, .63, .73); part(wood, cube, 0, .66, 0, 1.05, .19, .76);
      }
      features.set(target.feature, obj);
    }
    addScenery(scene, batches, color => color === '@flame' ? flameMat : mat(color), wind);
    cube.dispose(); pebble.dispose(); circle.dispose(); pot.dispose(); hangingCloth.dispose();
    const shelters = outdoorWeather(scene, climate, height, blocks, ADVENTURE_EDGE, protectedPoints, climate.weather === 'market' || openCountry || variant === 'dream');
    function addActor(actor, pos, move, arm, key, yaw = .45) {
      actor.position.set(pos[0], height(...pos), pos[1]); actor.rotation.y = yaw; scene.add(actor);
      const resident = { actor, pos, move, arm, key, yaw, phase: rand() * 10 };
      actors.push(resident);
      if (key) residents.set(key, resident);
      return resident;
    }
    for (const [i, [key, target]] of Object.entries(adventure.targets).entries()) {
      if (target.actor) {
        const { actor, arm } = models.person(target.actor, i, true);
        addActor(actor, target.pos, 0, arm, key, target.yaw ?? .26);
      } else if (target.animal) addActor(models.animal(target.animal), target.pos, target.trail || target.stationary ? 0 : .55, null, key);
    }
    const streets = temple ? [[-4.5, 13], [4.4, 10.8], [-3.6, 2.5], [5.7, -3.5], [-8.9, -10], [3.8, -12.8], [-11.7, 6.7], [10.3, 3.3]] :
      [[-4.6, 13.2], [3.8, 11.5], [-8, 4.7], [5.3, 3.7], [-3.7, -6.7], [4.5, -11], [-14.3, -.8], [12.3, -7.9]];
    const pedestrians = desert || variant === 'dream' ? [] : galilee ? streets.slice(0, 4) : streets;
    pedestrians.forEach((pos, i) => {
      const { actor, arm } = models.person(i === 2 ? '마을 아이' : '마을 사람', i, i < 4);
      const shelter = climate.weather === 'rain' && !openCountry && shelters[i];
      addActor(actor, shelter || pos, shelter ? 0 : i % 3 !== 1 ? 1.1 + (i % 3) * .55 : 0, arm);
    });
    for (const [i, pair] of (adventure.fauna || (temple ? [['비둘기', [-2.4, 10]], ['비둘기', [-3, 8]], ['비둘기', [4.9, -8]], ['고양이', [2.6, 13.1]], ['나귀', [7.1, 11.5]], ['닭', [11.6, 5.4]]] :
      [['닭', [-2.5, 12]], ['닭', [-4.7, 10]], ['염소', [3.1, 9.5]], ['나귀', [-6.6, 14]], ['고양이', [3.4, -10]], ['비둘기', [-5.2, -12]]])).entries()) {
      const [kind, pos] = pair;
      const resident = addActor(models.animal(kind), pos, .92 + (i % 3) * .31);
      resident.animal = kind;
    }
    if (!regional) exploreBoundary(scene, terrainHeight, ADVENTURE_EDGE, cap);
    return { ground, height, groundHeight: terrainHeight, dome, blocks, birds, fx, actors, residents, models, features,
      walkable: (x, z) => !rail(x, z), signs, climbs: roof ? [[0, -20.7]] : temple ? [[1.65, -18.5]] : [] };
  }

  function districtScenery(group, site, climate) {
    const { key, edge } = site;
    const rand = seeded(hashStr(key));
    const night = climate.time === 'night';
    const limestone = night ? ['#b6aaaf', '#a098a5', '#c8b9bc'] : ['#d5bd99', '#b9a383', '#e4cfad'];
    const [wall, shade, cap] = limestone;
    const tile = night ? '#aea2ac' : '#cbb092', wood = '#73524a', bronze = '#c99249';
    const cube = new T.BoxGeometry(), stone = new T.IcosahedronGeometry(1, 0);
    const column = new T.CylinderGeometry(.86, 1, 1, 8);
    const batches = new Map(), details = new Map(), obstacles = [], blocks = [], climbs = [], fx = [];
    function add(batch, shape, color, transform) {
      if (!batch.has(color)) batch.set(color, []);
      batch.get(color).push(place(shape, ...transform));
    }
    const box = (color, ...shape) => add(batches, cube, color, shape);
    const stoneJoint = (color, ...shape) => add(details, cube, color, shape);
    const rock = (color, ...shape) => add(batches, stone, color, shape);
    const round = (color, ...shape) => add(batches, column, color, shape);
    const stair = (distance, step, total) => clamp(Math.floor(distance / step) + 1, 0, total);
    const lowerSlope = z => -.82 - .085 * (z + 9);
    const mound = (x, z, rise) => .25 + rise * Math.max(0, 1 - (x / edge) ** 2 - (z / edge) ** 2) ** 1.55;
    const streamX = z => Math.sin(z * .27) * 2.4;
    const groundHeight = (x, z) => {
      if (key === 'olives') return .25 + 12 * Math.max(0, 1 - ((x / 13) ** 2 + (z / 13) ** 2)) ** 1.55;
      if (key === 'outer-court') return 2.8 - 2.4 * clamp((-z - 4) / 7, 0, 1);
      if (key === 'south-steps') return Math.abs(x) <= 3.35 ? 0 : 2.8 * clamp((-z + 5.5) / 12, 0, 1);
      if (key === 'lower-town') return lowerSlope(z);
      if (key === 'siloam') return -2.35;
      if (key === 'bethlehem-vista') return mound(x, z, 11);
      if (key === 'eder-tower') return mound(x, z, 4.4);
      if (key === 'judean-terraces') return 2.5 - z * .22;
      if (key === 'valley-stream') return Math.min(1.6, Math.abs(x - streamX(z)) * .22) - 1.1;
      if (key === 'wilderness-edge') return .35 + .12 * Math.sin(z * .4) - .95 * Math.max(0, 1 - Math.abs(x - streamX(z)) / 3);
      if (key === 'wilderness-vista') return mound(x, z, 10.2);
      if (key === 'nazareth-cliff') return mound(x, z, 8.8) - 2.6 * clamp((z - 2) / 8, 0, 1);
      if (key === 'tabor-vista' || key === 'lake-pass') return mound(x, z, key === 'lake-pass' ? 9.6 : 6.3);
      return .16;
    };
    const height = (x, z) => {
      const y = groundHeight(x, z);
      if (key === 'south-steps' && Math.abs(x) <= 3.35) return .2 * stair(5.5 - z, .9, 14);
      if (key === 'wall-walk' && Math.abs(z) < 1.55 && x >= -9 && x < -2.5) return y + .34 * stair(x + 9, .5, 13);
      if (key === 'wall-walk' && x >= -2.5 && x <= 8.6 && Math.abs(z) < 2.2) return y + 4.42;
      if (key === 'lower-town' && Math.abs(x) < 1.35 && z > 1 && z < 7) return lowerSlope(1 + .6 * stair(z - 1, .6, 10));
      return y;
    };
    const solid = (x, z, w, d) => obstacles.push([x, z, w / 2 + .18, d / 2 + .18]);
    function masonry(x, z, w, h, d, base = height(x, z)) {
      box(wall, x, base + h * .5, z, w, h, d);
      box(cap, x, base + h, z, w + .16, .16, d + .16);
      for (let level = .55; level < h - .15; level += .55) stoneJoint(shade, x, base + level, z, w + .02, .035, d + .02);
    }
    function pavement(x, z, nx, nz, width = 1.36) {
      for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
        const px = x + i * width, pz = z + j * width;
        stoneJoint(rand() > .34 ? tile : limestone[i % 3], px, height(px, pz) -.04, pz, width - .035, .11, width - .035);
      }
    }
    function colonnade(x, z, length, alongX, roofColor = shade) {
      const y = height(x, z), tall = 3.2, width = 1.85;
      const n = Math.ceil(length / 2.05);
      for (let i = 0; i <= n; i++) {
        const delta = length * (i / n - .5), px = x + (alongX ? delta : 0), pz = z + (alongX ? 0 : delta);
        for (const side of [-1, 1]) {
          const cx = px + (alongX ? 0 : side * .7), cz = pz + (alongX ? side * .7 : 0);
          const base = height(cx, cz);
          box(shade, cx, base + .13, cz, .59, .26, .62);
          round(wall, cx, (base + y + tall) / 2, cz, .22, y + tall - base, .22);
          box(cap, cx, y + tall - .12, cz, .57, .21, .57);
          blocks.push([cx, cz, .19]);
        }
      }
      box(roofColor, x, y + tall, z, alongX ? length + .63 : width, .23, alongX ? width : length + .63);
      box(cap, x, y + tall + .16, z, alongX ? length + .77 : width + .13, .12, alongX ? width + .13 : length + .77);
    }
    function torch(x, z, y = height(x, z)) {
      round(wood, x, y + .72, z, .075, 1.44, .075);
      round(bronze, x, y + 1.43, z, .18, .17, .18);
      rock('flame', x, y + 1.66, z, .13, .31, .13, .12);
      if (night || climate.time === 'dusk') {
        rock('#cd9568', x, y + .016, z, 1.38, .016, 1.20);
      }
    }
    function jar(x, z, y = height(x, z)) {
      rock('#ad735d', x, y + .27, z, .31, .35, .31);
      round('#c38c67', x, y + .57, z, .15, .18, .15);
      round(wood, x, y + .665, z, .115, .028, .115);
    }
    function person(x, z, robe, facing = 0, carrying = false) {
      const y = height(x, z);
      round(robe, x, y + .64, z, .3, 1.25, .27, -.065, facing);
      rock('#b08a6c', x, y + 1.44, z, .153, .18, .153);
      rock(cap, x, y + 1.53, z, .193, .14, .181);
      box(bronze, x, y + .77, z, .48, .08, .43, 0, facing);
      if (carrying) jar(x + .42, z + .12, y + .25);
    }
    function sheep(x, z, yaw) {
      const y = height(x, z), fleece = '#e4dacd', face = '#655650';
      rock(fleece, x, y + .47, z, .37, .38, .53, 0, yaw);
      rock(face, x + Math.sin(yaw) * .41, y + .58, z + Math.cos(yaw) * .41, .17, .21, .2);
      for (const dx of [-.17, .17]) for (const dz of [-.24, .24]) {
        box(face, x + dx, y + .155, z + dz, .093, .31, .11);
      }
    }
    function olive(x, z, size) {
      const y = height(x, z);
      round(wood, x, y + size * .7, z, .16 * size, 1.35 * size, .16 * size, .12, 0, -.2);
      for (let i = 0; i < 4; i++) {
        const dx = Math.cos(i * 2.4), dz = Math.sin(i * 2.4);
        round(wood, x + dx * size * .27, y + size * 1.21, z + dz * size * .27, .068 * size, .84 * size, .068 * size, dz * .7, 0, -dx * .7);
        rock(['#879368', '#687756', '#93a17a'][i % 3], x + dx * size * .66, y + size * (1.58 + rand() * .32),
          z + dz * size * .66, size, size * .56, size * .83, 0, i);
      }
      blocks.push([x, z, .24 * size]);
    }
    function well(x, z) {
      const y = height(x, z);
      round(shade, x, y + .45, z, 1.3, .9, 1.3);
      round(cap, x, y + .92, z, 1.4, .18, 1.4);
      round('water', x, y + 1.03, z, 1.02, .045, 1.02);
      for (const dx of [-1.48, 1.48]) box(wood, x + dx, y + 1.39, z, .17, 2.78, .18);
      box(wood, x, y + 2.70, z, 3.3, .18, .28);
      box(wood, x + .32, y + 1.78, z, .045, 1.73, .045);
      solid(x, z, 2.9, 2.6);
    }
    function basin(x, z, w, d, depth) {
      const y = height(x, z);
      box('water', x, y + .035, z, w -.44, .075, d -.44);
      for (const side of [-1, 1]) {
        masonry(x + side * w / 2, z, .45, depth, d + .48, y);
        masonry(x, z + side * d / 2, w, depth, .45, y);
      }
      for (let i = 0; i < 4; i++) {
        box(limestone[i % 3], x, y + .08 + i * .092, z + d / 2 - 1.89 + i * .43, w * .33, .13, .46);
      }
      for (let i = 0; i < 9; i++) {
        box('#89aaa9', x + (rand() - .5) * (w - 1), y + .078, z + (rand() - .5) * (d - 1), .45 + rand() * .9, .008, .042);
      }
      solid(x, z, w + .32, d + .32);
    }
    function stall(x, z, cloth, doves = false) {
      const y = height(x, z);
      for (const dx of [-1.5, 1.5]) for (const dz of [-.73, .73]) {
        box(wood, x + dx, y + 1.04, z + dz, .10, 2.08, .10);
      }
      for (let i = -2; i <= 2; i++) {
        box(i % 2 ? cap : cloth, x + i * .64, y + 2.02, z, .65, .095, 2.03, -.16);
      }
      box(wood, x, y + .76, z, 2.62, .17, .73);
      for (const dx of [-1.02, 1.02]) box(shade, x + dx, y + .34, z, .21, .68, .52);
      if (doves) {
        for (let i = -3; i <= 3; i++) box(wood, x + i * .14, y + 1.11, z - .04, .025, .52, .50);
        box(wood, x, y + 1.38, z - .04, .96, .055, .56);
      } else {
        for (const dx of [-.8, 0, .82]) round(bronze, x + dx, y + .87, z, .22, .07, .20);
      }
      solid(x, z, 2.95, 1.08);
    }
    function smoke(x, z, y) {
      for (let i = 0; i < 3; i++) {
        const cloud = glowSprite('#c7bac7', 1.4, .17);
        cloud.position.set(x, y + i * .45, z);
        cloud.userData.drawPriority = 1;
        group.add(cloud);
        fx.push({ cloud, x, z, base: y, i });
      }
    }

    if (key === 'herod-palace') {
      pavement(-9.8, -3.5, 15, 10);
      for (const [x, h] of [[-8, 10.5], [8, 8.4]]) {
        masonry(x, -6.45, 4.55, h, 5.18);
        box('#c49559', x, h - 1, -6.45, 4.68, .23, 5.30);
        for (const dx of [-1.77, -.89, 0, .89, 1.77]) {
          box(cap, x + dx, h + .49, -4.15, .54, .67, .47);
        }
        solid(x, -6.45, 4.55, 5.18);
      }
      masonry(0, -7, 12.2, 6.1, 4.15);
      solid(0, -7, 12.2, 4.15);
      box('#5f4242', 0, 1.94, -4.89, 2.73, 3.54, .14);
      for (const x of [-2.3, -1.69, 1.69, 2.3]) {
        round(wall, x, 2.34, -4.44, .22, 4.32, .25);
        box(bronze, x, 4.52, -4.44, .56, .25, .59);
      }
      box(bronze, 0, 4.69, -4.52, 5.2, .28, .80);
      for (let x = -1.2; x < 1.3; x += .32) box('#c59b5b', x, 1.94, -4.79, .035, 3.49, .065);
      for (const [x, color] of [[-6.2, '#9e5466'], [6.2, '#765a82']]) {
        box(wood, x, 4.55, -3.78, 1.57, .08, .09);
        box(color, x, 3.48, -3.78, 1.19, 2.1, .08);
        box(bronze, x, 2.49, -3.72, 1.19, .13, .07);
        torch(x, .9);
      }
    } else if (key === 'nazareth-cliff') {
      for (let x = -8; x < 9; x += 1.48) {
        const z = 5.4 - Math.abs(x) * .20, y = height(x, z);
        rock('#b69376', x, y - .55, z + .65, 1.5, 2.45, 1.38, .12, x);
        rock('#d0b39a', x, y + .15, z, .70, .34, .60, 0, x);
      }
      for (const side of [-1, 1]) {
        masonry(side * 5, -3.9, 4.1, .7, .5);
        olive(side * 4.8, -6, 1);
      }
      climbs.push([.15, 2]);
    } else if (key === 'synagogue-yard') {
      pavement(-6.18, -1.0, 10, 7);
      const foundation = height(0, 0);
      masonry(0, -7.65, 11.5, 4.65, .38);
      for (const side of [-1, 1]) {
        masonry(side * 5.47, -4.5, .59, 4.65, 6.4);
        masonry(side * 3.59, -1.83, 4.09, 3.50, .56);
        masonry(side * 3.77, -5.16, 2.42, .51, .58);
        masonry(side * 3.73, -3.25, 2.49, .49, .56);
        box(bronze, side * 1.51, 2.08, -1.46, .23, 3.85, .37);
        for (let j = 0; j < 5; j++) {
          const x = side * (1.78 + j * .76);
          stoneJoint(cap, x, foundation + .029, .82, .26, .045, .26, 0, Math.PI / 4);
        }
      }
      box(shade, 0, 4.82, -4.46, 11.88, .36, 6.7);
      box(cap, 0, 4.67, -1.43, 11.97, .20, .67);
      box(bronze, 0, 4.53, -1.32, 11.74, .11, .43);
      box(wall, 0, 4.19, -1.86, 11.11, .75, .77);
      box(cap, 0, 3.84, -1.41, 3.25, .24, .38);
      for (const x of [-4.68, -3.21, 3.21, 4.68]) {
        box(shade, x, .33, -.90, .72, .34, .72);
        round(cap, x, 1.95, -.90, .245, 3.22, .245);
        box(cap, x, 3.59, -.90, .74, .30, .71);
      }
      const chestZ = -4.89;
      box('#765248', 0, .57, chestZ, 2.23, .84, .83);
      box(bronze, 0, .97, chestZ, 2.31, .14, .91);
      for (let i = 0; i < 4; i++) {
        const px = -.66 + i * .44;
        round('#d6b88d', px, 1.14, chestZ, .105, .54, .103, Math.PI / 2 + i * .15, 0, .12);
        round('#87664e', px + .035, 1.18, chestZ + .24, .143, .073, .143, Math.PI / 2);
      }
      torch(-1.26, -5.17); torch(1.27, -5.17);
      solid(0, -7.65, 11.5, .38);
      for (const side of [-1, 1]) {
        solid(side * 5.47, -4.5, .59, 6.4);
        solid(side * 3.59, -1.83, 4.09, .56);
      }
      solid(0, chestZ, 2.31, .91);
      for (const side of [-1, 1]) {
        masonry(side * 4.35, 3.4, 2.6, .42, .70);
        olive(side * 6.6, 3.05, 1.02);
      }
      for (let i = 0; i < 12; i++) {
        const x = (i % 2 ? 1 : -1) * (6.4 + Math.floor(i / 4) * 2.09);
        const z = 6.9 - (i % 4) * 3.09, y = height(x, z), h = 1.83 + rand() * 1.62;
        box(i % 3 ? wall : '#bc9981', x, y + h / 2, z, 1.85, h, 2.35);
        box(cap, x, y + h, z, 2.02, .19, 2.5);
        box(wood, x, y + .65, z + 1.19, .53, 1.3, .052);
        if (Math.abs(x) < edge - 1) solid(x, z, 1.85, 2.35);
      }
    } else if (key === 'grain-yard') {
      round('#ba9768', -.9, .16, .1, 5.15, .05, 4.4);
      masonry(3, -5.4, 7.3, 2.99, 3.5);
      box(wood, 3, 3.24, -5.4, 7.65, .27, 3.8);
      box('#4e372c', 3.25, 1.07, -3.62, 1.04, 1.75, .09);
      solid(3, -5.4, 7.3, 3.5);
      for (let i = 0; i < 12; i++) {
        const x = -6.9 + rand() * 3.4, z = -3.6 + rand() * 2.6;
        rock('#c0a375', x, .46, z, .47, .52, .40, .21, i);
      }
      jar(5.1, -2.9); jar(5.8, -2.9); torch(4.1, -2.8);
    } else if (key === 'olive-cave') {
      for (const side of [-1, 1]) {
        rock('#9d8c78', side * 2.95, 1.3, -4.6, 2.6, 2.56, 3.45, .1, side);
        olive(side * 5.7, .3, 1.05);
      }
      rock(wall, 0, 2.72, -4.9, 4.7, 1.56, 2.68, -.22);
      box('#382e31', 0, 1.23, -3.85, 2.35, 2.1, .19);
      solid(0, -4.9, 8.15, 3.58);
      round(shade, 2.9, .37, .7, 1.02, .40, .97);
      round(cap, 2.9, .65, .7, .83, .21, .82);
      box(wood, 2.9, .92, .7, 1.96, .15, .15, 0, -.6);
      blocks.push([2.9, .7, .82]);
      jar(2.5, 2.15); torch(1.85, -2.12);
    } else if (key === 'tabor-vista' || key === 'lake-pass') {
      for (const [x, z, size] of [[-5.5,3,1.02],[-7,-1,1.20],[-4,-5,.94],[3,5,.94]]) olive(x, z, size);
      for (let i = 0; i < 44; i++) {
        const x = (rand() - .5) * 20, z = (rand() - .5) * 18;
        if (Math.hypot(x, z) < 3.3) continue;
        const y = height(x, z);
        box('#657047', x, y + .16, z, .028, .32, .028);
        rock(i % 4 ? '#b7493e' : '#e4c1a2', x, y + .35, z, .13, .055, .13);
      }
      climbs.push([0, 0]);
    } else if (key === 'south-road') {
      for (const side of [-1, 1]) for (let z = -3; z <= 5; z += 1.5) masonry(side * 2.8, z, .58, .5, 1.46);
      olive(-4.7, -1, 1.0); olive(4.4, 2.5, 1.13);
    } else if (key === 'judean-terraces') {
      for (const z of [-6.8, -2.9, 1.1, 5.1]) {
        for (const side of [-1, 1]) {
          masonry(side * 5.7, z, 7.35, .61, .67);
          if (z < 3) olive(side * 6.9, z - 1.2, 1.07);
          for (const x of [3.1, 4.25, 5.4, 6.55, 7.7, 8.85]) {
            const px = side * x, pz = z + .83, y = height(px, pz);
            box(wood, px, y + .36, pz, .10, .72, .10);
            rock('#66784e', px, y + .67, pz, .55, .23, .43, 0, x);
            rock('#76637b', px + .17, y + .58, pz + .12, .14, .14, .14);
          }
        }
      }
      climbs.push([0, -5.0]);
    } else if (key === 'village-threshing') {
      well(-4.9, -1.4);
      round('#b69a73', 3.3, .17, -1.7, 4.05, .035, 3.45);
      for (let i = 0; i < 21; i++) {
        const angle = i * 2.4, radius = 3.6 * Math.sqrt(rand());
        const x = 3.3 + Math.cos(angle) * radius, z = -1.7 + Math.sin(angle) * radius * .8;
        box('#d1ad62', x, .20, z, .41, .034, .09, 0, angle);
      }
      masonry(4, -7.0, 7.5, 2.7, 3.2);
      box('#5e4942', 4, 1.15, -5.38, .95, 1.75, .085);
      solid(4, -7, 7.5, 3.2);
      jar(-3.6, .15); jar(6.15, -5.1); olive(-7.4, -5.1, 1.25);
    } else if (key === 'valley-stream' || key === 'wilderness-edge') {
      const dry = key === 'wilderness-edge';
      for (let z = -edge + 1; z < edge; z += .85) {
        const x = streamX(z), y = height(x, z);
        box(dry ? '#aa835b' : 'water', x, y + .06, z, dry ? 2 : 1.55, .045, 1.06, 0, Math.atan(.65 * Math.cos(z * .27)));
        for (const side of [-1, 1]) {
          const px = x + side * (1 + rand() * .85), size = .15 + rand() * .36;
          rock(dry ? '#d8bf96' : '#a99a83', px, height(px, z), z, size, size * .64, size * .87, 0, z);
        }
      }
      if (dry) {
        for (const [x, z, size] of [[-8,-5,2.9],[-5,-6,1.6],[6,-7,2.1],[8,4,2.7],[-7,7,1.8],[10,-9,3.2]]) {
          rock('#c9ad83', x, height(x, z) + .42 * size, z, size, .86 * size, .74 * size, .15, z);
          blocks.push([x, z, size * .53]);
        }
      } else {
        for (let x = -1.7; x < 2.5; x += .49) box(wood, x, .04, .45, .47, .18, 1.7, 0, .07);
        olive(-6.6, -1.7, 1.4); olive(6.9, 4.7, 1.22);
      }
    } else if (key === 'wilderness-vista') {
      for (const [x, z, size] of [[-5,-3,1.9],[-4,3,1.3],[4,-3,1.7],[5,1.5,1.55],[-8,1,2.3],[7,-6,2.4]]) {
        rock('#dbc5a3', x, height(x, z) + .29 * size, z, size, .73 * size, .82 * size, 0, z);
        blocks.push([x, z, size * .53]);
      }
      climbs.push([0, 0]);
    } else if (key === 'rachel-tomb') {
      masonry(-1.7, -1.3, 4.6, 1.95, 3.55);
      round(cap, -1.7, 2.14, -1.3, 2.65, .30, 2.05);
      rock(wall, -1.7, 2.14, -1.3, 2.66, 1.83, 2.04);
      box('#47383d', -1.7, .93, .49, .88, 1.56, .06);
      solid(-1.7, -1.3, 4.6, 3.55);
      for (const side of [-1, 1]) masonry(-1.7 + side * 4, -3.2, 2.8, .56, .55);
      torch(-3.8, 1.4);
    } else if (key === 'david-well') {
      pavement(-4.7, -4.7, 8, 8);
      well(0, 0);
      jar(2.9, .6); torch(-2.7, 2.8);
    } else if (key === 'boaz-field') {
      for (const side of [-1, 1]) {
        for (let row = 0; row < 5; row++) {
          const x = side * (3.5 + row * 1.25);
          box('#95724c', x, .16, -.6, 1.11, .045, 16);
          for (let z = -8; z < 7; z += .52) {
            const px = x + (rand() - .5) * .86, h = .46 + rand() * .42;
            const pz = z + rand() * .44;
            box('#a88e46', px, .17 + h / 2, pz, .023, h, .023, 0, 0, .08);
            rock(rand() > .5 ? '#dcb571' : '#c49650', px - h * .04, .17 + h, pz, .064, .139, .064, 0, z);
          }
        }
      }
      for (const z of [-9.3, 8.2]) for (const side of [-1, 1]) masonry(side * 6.9, z, 7, .45, .47);
    } else if (key === 'eder-tower') {
      const y = height(0, -3.4);
      masonry(0, -3.4, 3.85, 6.7, 3.7, y - .32);
      box('#44383e', 0, y + .97, -1.53, .63, 1.5, .06);
      for (const axis of [-1, 1]) for (const x of [-1.66, -.83, 0, .83, 1.66]) {
        box(cap, x, y + 6.68, -3.4 + axis * 1.69, .49, .59, .51);
      }
      solid(0, -3.4, 3.85, 3.7);
      for (const [x, z, yaw] of [[-5, -1, .7], [-5.9, -.1, -1], [-6.2, -1.8, 1.3]]) sheep(x, z, yaw);
      torch(2.4, -.8);
      climbs.push([0, 2.3]);
    } else if (key === 'shepherd-cave') {
      const caveRock = '#8f7878';
      for (const side of [-1, 1]) {
        rock(caveRock, side * 3.15, 1.12, -4.1, 2.6, 2.75, 3.45, .1, side);
        masonry(side * 4.5, 1.5, .52, .72, 5.3);
      }
      rock(wall, 0, 2.37, -4.55, 4.5, 1.52, 2.65, -.22);
      box('#3a2b3a', 0, 1.12, -3.72, 2.26, 2.03, .22);
      solid(0, -4.7, 8.1, 3.6);
      sheep(-2.4, 2.7, .6); sheep(2.4, 3.25, -.8);
      torch(2.05, -1.85);
    } else if (key === 'bethlehem-vista') {
      for (const x of [-3.9, -2.75, -1.6, 1.6, 2.75, 3.9]) {
        masonry(x, -2.25, 1.20, .48, .58);
      }
      torch(-3.1, -.15); torch(3.1, -.15);
      climbs.push([0, 0]);
    } else if (key === 'outer-court') {
      pavement(-8.3, -8.3, 13, 13);
      for (const side of [-1, 1]) colonnade(side * 8.8, .6, 16.4, false);
      for (const x of [-5.75, 5.75]) {
        colonnade(x, -6.3, 5.2, true, '#827483');
        colonnade(x, 8.8, 5.2, true, '#827483');
      }
      stall(5, -2.1, '#a45456');
      stall(-5, .55, '#596d81', true);
      for (const [x, z, robe] of [[-3, 3, '#765a7b'], [-1.8, 3.7, '#7a8d83'], [1.9, -4, '#a57665'], [4.5, 3.1, '#82778c'], [4.55, -3.15, '#7a5849']]) person(x, z, robe);
      for (const [x, z] of [[-7, 6.7], [7, 6.7], [-5, -5.8], [5, -5.8]]) torch(x, z);
      for (const x of [-5.5, 5.5]) masonry(x, 9.1, 4.1, .6, .47);
    } else if (key === 'south-steps') {
      for (let i = 0; i < 14; i++) {
        const top = (i + 1) * .2;
        box(limestone[i % 3], 0, top * .5 - .035, 5.05 - i * .9, 6.68, top + .07, .902);
      }
      for (const x of [-3.62, 3.62]) for (let i = 0; i < 7; i++) {
        const z = 4.6 - i * 1.82;
        masonry(x, z, .48, .42, 1.85);
      }
      basin(-5.05, .6, 2.7, 3.2, .3);
      basin(5.3, 3.6, 2.35, 2.4, .31);
      torch(-3.8, 4.8); torch(3.8, -5.1);
      climbs.push([0, -5.1]);
    } else if (key === 'sheep-gate') {
      pavement(-8.95, -7.95, 13, 12);
      for (const x of [-9.1, -3]) {
        masonry(x, -.9, 2.35, 5.75, 2.25);
        solid(x, -.9, 2.35, 2.3);
        for (const dx of [-.84, .84]) for (const dz of [-.84, .84]) box(cap, x + dx, 6.18, -.9 + dz, .46, .59, .44);
      }
      box(wall, -6.05, 4.45, -.9, 4.26, 1.37, 1.86);
      box(cap, -6.05, 5.13, -.9, 4.41, .19, 2.02);
      round(wood, -7.83, 6.08, -.72, .066, 2.25, .066);
      box('#aa514e', -7.08, 6.77, -.68, 1.43, .55, .07, .09, -.19, -.14);
      box(bronze, -7.09, 6.55, -.68, 1.4, .063, .08, .09, -.19, -.14);
      basin(3.45, -1.6, 8.2, 7.35, .43);
      for (const z of [-6.28, 3.55, -1.65]) colonnade(3.55, z, 8.30, true);
      for (const x of [-1.42, 8.48]) colonnade(x, -1.66, 7.65, false);
      for (const [x, z, yaw] of [[-6.45, -2.5, .3], [-6.05, -3.9, -1], [-4.8, -3.05, .6], [-7.35, -4.2, 1.1], [-5.2, -5.4, .5]]) sheep(x, z, yaw);
      person(-8.1, -3.7, '#796153');
      for (const [x, z] of [[-7.5, 1.4], [-3.4, 1.5], [7, 4.35]]) torch(x, z);
    } else if (key === 'wall-walk') {
      for (let i = 0; i < 13; i++) {
        const top = (i + 1) * .34;
        box(limestone[i % 3], -8.75 + i * .5, .16 + top / 2, 0, .505, top, 3.1);
      }
      masonry(3.05, 0, 11.1, 4.42, 4.4, .08);
      for (const z of [-2.08, 2.08]) {
        box(shade, 2.98, 4.78, z, 10.95, .52, .28);
        for (let i = -2; i <= 8; i++) box(cap, i, 5.19, z, .48, .49, .36);
      }
      for (const side of [-1, 1]) {
        solid(3.05, side * 2.25, 11.1, .19);
        solid(-5.7, side * 1.66, 6.5, .19);
        masonry(8.0, side * 1.77, 2.1, 2.32, .83, 4.52);
      }
      box(cap, 7.75, 6.92, 0, 2.72, .36, 4.87);
      solid(8.74, 0, .17, 4.4);
      torch(6.05, -1.33); torch(-9.3, 1.82);
      climbs.push([4.25, 0]);
    } else if (key === 'lower-town') {
      for (const [x, z, width, d, h] of [[-4.9, -1.45, 3.9, 3.4, 2.7], [4.8, -.9, 3.3, 3.9, 3.43], [-7.25, 5.55, 2.85, 3.3, 2.63], [5.4, -5.8, 4.5, 3.6, 3.05], [-5.25, -5.8, 4.24, 3.1, 2.55], [4.9, 5.65, 3.6, 3.2, 2.82]]) {
        const y = height(x, z);
        masonry(x, z, width, h, d, y - .19);
        box(shade, x, y + h - .11, z, width + .22, .19, d + .2);
        box('#43343e', x, y + .52, z + d / 2 + .015, .86, 1.53, .065);
        box(wood, x, y + 1.31, z + d / 2 + .055, 1.05, .11, .14);
        box(night ? 'flame' : wood, x + .93, y + 1.57, z + d / 2 + .03, .3, .4, .09);
        solid(x, z, width, d);
      }
      for (let i = 0; i < 10; i++) {
        const z = 1.3 + i * .6;
        box(limestone[i % 3], 0, height(0, z) -.09, z, 2.65, .18, .601);
      }
      const ovenY = height(3.1, 2.4);
      round('#a47769', 3.1, ovenY + .35, 2.4, .75, .70, .66);
      rock('#b48263', 3.1, ovenY + .76, 2.4, .77, .56, .68);
      box(wood, 3.1, ovenY + .36, 3, .59, .42, .14);
      rock('flame', 3.1, ovenY + .28, 3.09, .23, .13, .09);
      smoke(3.1, 2.4, ovenY + 1.13);
      blocks.push([3.1, 2.4, .61]);
      person(2.55, 4.3, '#746180', -.3, true);
      jar(-2.6, .85); jar(-3.1, .95); torch(-3.6, .58); torch(2.15, -4.35);
    } else if (key === 'siloam') {
      pavement(-5.8, -5.8, 9, 9);
      basin(-.5, -.3, 7.9, 5.4, .46);
      for (const side of [-1, 1]) {
        masonry(side * 5.9, -1.35, 1.03, 1.1, 6.1);
        torch(side * 5.15, 2.7);
      }
      for (const [x, z, color] of [[-3.5, 3.55, '#796780'], [4.3, -.4, '#a77265'], [-2.65, -4.6, '#778888']]) person(x, z, color, Math.PI, true);
      jar(2.75, 3.7); jar(3.19, 3.8);
    } else if (key === 'olives') {
      for (const [x, z, size] of [[-8,-5,1.23],[-8,4,1.22],[-4.7,-3,1.27],[-3.9,6.7,1.19],[2,-5.4,1.38],[4.7,-1.8,1.28],[7,3.7,1.24],[5.6,7.2,1.13],[.4,7.9,.99],[8,-7,1.02],[-5.4,-8.7,1.22]]) {
        const y = height(x, z);
        round(wood, x, y + size * .66, z, .19 * size, 1.3 * size, .19 * size, .19, 0, -.16);
        for (let i = 0; i < 5; i++) {
          const dx = Math.cos(i * 2.4), dz = Math.sin(i * 2.4), s = size * (.8 + rand() * .4);
          round(wood, x + dx * .27 * size, y + size * 1.14, z + dz * .27 * size, .075 * size, .81 * size, .075 * size, dz * .72, 0, -dx * .72);
          rock(['#788456', '#5a714f', '#879064'][i % 3], x + dx * .68 * size, y + size * (1.52 + rand() * .34), z + dz * .68 * size, s, s * .63, s * .90, 0, i);
        }
        blocks.push([x, z, .27 * size]);
      }
      for (let i = 0; i < 34; i++) {
        const x = (rand() - .5) * 24, z = (rand() - .5) * 24;
        if (Math.hypot(x, z) < 2.65) continue;
        rock(i % 2 ? '#a89878' : '#74845d', x, height(x, z), z, .18 + rand() * .45, .15 + rand() * .27, .32);
      }
      torch(2.7, 2.8);
      climbs.push([-.3, .2]);
    }
    addScenery(group, batches, color => color === 'flame' ? mat('#ffc979', { emissive: '#ff9a49', ei: night ? 1.8 : .45 }) :
      color === 'water' ? mat('#52838b', { rough: .47 }) : mat(color));
    const detail = new T.Group();
    group.add(detail);
    addScenery(detail, details, color => mat(color));
    cube.dispose(); stone.dispose(); column.dispose();
    const views = { olives: [28, -31], 'wall-walk': [28, -31], 'bethlehem-vista': [-41, -83],
      'eder-tower': [24, 25], 'wilderness-vista': [156, 14], 'judean-terraces': [10, 20],
      'nazareth-cliff': [-56, 115], 'tabor-vista': [135, 72], 'lake-pass': [125, -78] };
    const [viewX, viewZ] = views[key] || [-28, -19];
    const lookAt = site.translate([viewX - site.x, viewZ - site.z]);
    return { height, groundHeight, blocks, climbs, lookAt, detail, fx,
      walkable(x, z) {
        if (Math.abs(x) > edge || Math.abs(z) > edge) return true;
        return !obstacles.some(([cx, cz, w, d]) => Math.abs(x - cx) < w && Math.abs(z - cz) < d);
      }
    };
  }

  const TEMPLE_STAIRS = { front: 4.04, tread: .47, rise: .185, count: 12, base: 1.19, width: 16.6 };

  function templeMount(scene, x, z, climate, groundAt) {
    const group = new T.Group();
    group.position.set(x, 0, z);
    scene.add(group);
    const night = climate.time === 'night', dusk = climate.time === 'dusk';
    const ivory = night ? '#ded1cd' : '#faf0dc';
    const ash = night ? '#918b9e' : '#baa68f';
    const gold = '#dca45e', dark = '#352b43', flame = '#ffbf69';
    const blocks = [], walls = [];
    const cube = new T.BoxGeometry(), jewel = new T.OctahedronGeometry(1), post = new T.CylinderGeometry(.85, 1, 1, 12);
    const shell = new Map(), trim = new Map(), far = new Map();
    const add = (batch, shape, color, ...pose) => {
      if (!batch.has(color)) batch.set(color, []);
      batch.get(color).push(place(shape, ...pose));
    };
    const box = (color, ...pose) => add(shell, cube, color, ...pose);
    const line = (color, ...pose) => add(trim, cube, color, ...pose);
    const tower = (color, ...pose) => {
      box(color, ...pose);
      add(far, cube, color, ...pose);
    };
    const stone = (color, px, py, pz, width, height, depth) => box(color, px, py + height / 2, pz, width, height, depth);
    const boundary = (px, pz, width, depth) => walls.push([x + px, z + pz, width / 2 + .15, depth / 2 + .15]);
    const colors = ['#93869a', ash, '#b4a49f', '#bba999'];
    const { front, tread, rise, count, base: deck, width: stairWidth } = TEMPLE_STAIRS;
    const entry = deck + count * rise, roof = entry + 24.2;
    const face = front - .12, doorHalf = 3.24, doorTop = entry + 13.35;
    tower(ash, 0, -.71, -.65, 44, 3.7, 25.1);
    tower(ivory, 0, 1.07, -.65, 44.3, .24, 25.4);
    for (let h = 0; h < 4; h++) {
      const y = -1.25 + h * .64;
      for (let j = 0; j < 15; j++) {
        const px = (j - 7) * 2.9, pz = 11.98;
        if (Math.abs(px) < 7.2) continue;
        line(colors[(j + h) % 4], px + (h % 2 ? .14 : -.14), y, pz, 2.86, .60, .25);
      }
      for (const side of [-1, 1]) for (let j = 0; j < 9; j++) {
        line(colors[(j + h + 1) % 4], side * 22.04, y, -11.8 + j * 2.8, .21, .60, 2.76);
      }
    }
    for (let j = 0; j < count; j++) {
      const top = entry - j * rise;
      const pz = front + (j + .5) * tread;
      box('#c1ad9d', 0, (top + deck) / 2, pz, stairWidth + j * .15, top - deck, tread + .018);
      box(ivory, 0, top - .031, pz, stairWidth + j * .15 + .09, .063, tread + .055);
    }
    tower(ash, 0, (entry + deck) / 2, -.88, 16.9, entry - deck, 10.2);
    tower(ivory, 0, entry - .08, -.88, 17.12, .16, 10.28);

    // The broad upper front overhangs the narrower body behind it.
    const bodyWidth = 16.4, shoulderWidth = 24.2, shoulderY = entry + 15.22, frontDepth = 4.15;
    const midZ = face - frontDepth / 2;
    const bodyPier = (bodyWidth / 2 - doorHalf), pierX = doorHalf + bodyPier * .5;
    tower(ivory, 0, (entry + roof - .64) / 2, -4.77, 14.6, roof - .64 - entry, 7.15);
    tower(ivory, 0, (doorTop + roof - .7) / 2, midZ, bodyWidth, roof - .7 - doorTop, frontDepth);
    tower(ivory, 0, (shoulderY + roof - .71) / 2, midZ - .05, shoulderWidth, roof - .71 - shoulderY, frontDepth - .1);
    const spikes = new T.ConeGeometry(1, 1, 6);
    for (const side of [-1, 1]) {
      tower(ivory, side * pierX, (entry + doorTop) / 2, midZ, bodyPier, doorTop - entry, frontDepth);
      tower(ash, side * 7.98, entry + 3.45, -4.5, 1.93, 6.9, 6.7);
      box(ivory, side * 7.98, entry + 6.98, -4.5, 2.05, .26, 6.9);
      for (let i = 0; i < 4; i++) {
        const width = .73 + i * 1.04;
        box(i === 0 ? ash : ivory, side * (bodyWidth + width) / 2, shoulderY - 1.22 + i * .32,
          midZ, width + .12, .36, frontDepth - .18);
      }
      const pilasterX = side * 5.73;
      add(shell, post, '#e0cdbb', pilasterX, entry + 5.86, face - .08, .46, 11.25, .36);
      box(ash, pilasterX, entry + .2, face + .10, 1.24, .38, .63);
      box(ivory, pilasterX, entry + 11.66, face + .11, 1.21, .42, .7);
      line(gold, pilasterX, entry + 11.96, face + .14, .92, .13, .66);
      stone(dark, side * 3.18, entry, 1.59, .34, doorTop - entry, 3.33);
      line(gold, side * 3.33, (entry + doorTop) / 2, face + .14, .27, doorTop - entry, .28);
      line('#ae7b45', side * 3.59, (entry + doorTop) / 2, face + .12, .19, doorTop - entry, .21);
      for (let i = 0; i < 19; i++) {
        const y = entry + .81 + 1.16 * i;
        const lower = y < doorTop;
        const inside = lower ? 3.70 : .12, edge = y < shoulderY ? bodyWidth / 2 : shoulderWidth / 2;
        line('#b5a392', side * (inside + edge) / 2, y, face + .024, edge - inside, .024, .036);
        for (let j = 0; j < (lower ? 2 : 4); j++) {
          const xx = inside + .86 + j * 2.21 + (i % 2) * .55;
          if (xx < edge - .45) line('#b5a392', side * xx, y - .52, face + .023, .025, 1.03, .034);
        }
      }
      for (const px of [7.78, 9.53]) {
        line('#746777', side * px, roof - 3.52, face + .052, .53, 1.46, .088);
        line(ivory, side * px, roof - 4.31, face + .11, .78, .19, .32);
      }
    }
    for (const [y, w, depth, height, color] of [[-.83, 24.38, 4.58, .27, ash], [-.61, 24.54, 4.73, .19, gold],
      [-.37, 24.02, 4.49, .29, ivory], [-.15, 24.41, 4.67, .17, gold]]) {
      tower(color, 0, roof + y, midZ, w, height, depth);
    }
    tower('#c2a580', 0, roof - .45, -4.71, 14.96, .46, 7.16);
    for (let i = -18; i <= 18; i++) {
      add(trim, spikes, gold, i * .652, roof + .12, face + .18, .096, .52, .096);
      if (i % 3 === 0) add(far, spikes, gold, i * .652, roof + .14, face + .18, .13, .52, .13);
    }
    spikes.dispose();

    // The curtain hangs within the deep portal, below a gilded vine relief.
    stone('#59364e', 0, entry, .03, 6.5, 12.62, .29);
    for (let i = 0; i < 28; i++) {
      const px = (i - 13.5) * .234, color = ['#7d3855', '#ab5263', '#763b5a', '#553955'][i % 4];
      const pleat = .10 + Math.sin(i * 1.7) * .16;
      if (Math.abs(px) < .19) continue;
      line(color, px, entry + 6.25, .3 + pleat, .27, 12.4, .19, 0, i * .49);
      line('#c18b64', px, entry + .45, .40 + pleat, .25, .16, .13, 0, i * .49);
    }
    add(trim, cube, 'light', 0, entry + 6.15, .26, .14, 12.18, .12);
    line(gold, 0, doorTop + .01, face + .15, 7.2, .29, .33);
    line('#9a7051', 0, doorTop + .86, face + .12, 9.25, 1.28, .32);
    for (const y of [.31, 1.49]) line(gold, 0, doorTop + y, face + .24, 9.42, .14, .34);
    const vineHeight = t => doorTop + .93 + .22 * Math.sin(Math.PI * 8 * t);
    for (let i = 0; i < 64; i++) {
      const dx = 8.88 / 64, x = i * dx - 4.44;
      const y = vineHeight(i / 64), dy = vineHeight((i + 1) / 64) - y;
      add(trim, post, gold, x + dx / 2, y + dy / 2, face + .34, .053, Math.hypot(dx, dy) + .024, .052, 0, 0, -Math.atan2(dx, dy));
    }
    for (let i = 0; i <= 16; i++) {
      const px = i * .554 - 4.432, y = vineHeight(i / 16);
      add(trim, jewel, gold, px, y + .18, face + .36, .22, .103, .052, 0, 0, i % 2 ? -.55 : .55);
      if (i % 2 === 0) for (let berry = 0; berry < 6; berry++) {
        const row = berry < 3 ? 0 : berry < 5 ? 1 : 2;
        const col = berry - [0, 3, 5][row];
        add(trim, jewel, gold, px + (col - (2 - row) / 2) * .105, y - .11 - row * .112, face + .40, .076, .083, .067);
      }
    }
    for (let i = -10; i <= 10; i++) for (let j = 0; j < 19; j++) {
      const px = i * 1.8 + (j % 2) * .25, pz = 9.4 + j * 1.54;
      if (Math.abs(px) > 14 && pz > 27 || Math.abs(px) < 6 && pz > 36) continue;
      const base = groundAt(x + px, z + pz);
      const border = Math.abs(i) === 3 || Math.abs(i) === 4;
      const color = border ? (i % 2 ? '#846f77' : '#ad8a6d') : colors[(Math.abs(i) + j * 7) % colors.length];
      line(color, px, base + .023, pz, 1.76, .047, 1.49);
    }
    const altarX = -6.25, altarZ = 14.05, court = groundAt(x + altarX, z + altarZ), altarTop = court + 2.19;
    for (const [py, w, d, h, color] of [[.18, 6.08, 5.1, .36, ash], [1.07, 5.55, 4.7, 1.44, '#ac9380'],
      [1.84, 5.87, 4.98, .24, ivory], [2.05, 5.60, 4.78, .27, '#a88972']]) {
      box(color, altarX, court + py, altarZ, w, h, d);
    }
    box(dark, altarX, altarTop + .018, altarZ, 3.5, .05, 2.62);
    for (const dx of [-2.46, 2.46]) for (const dz of [-2.07, 2.07]) box(ivory, altarX + dx, altarTop + .23, altarZ + dz, .54, .49, .53);
    for (let i = 0; i < 12; i++) add(trim, jewel, 'light', altarX - 1.2 + i * .22, altarTop + .077,
      altarZ + Math.sin(i * 6) * .54, .16, .085, .21);
    boundary(altarX, altarZ, 6.08, 5.1);
    const rampLength = 5.1, rampWidth = 2.16, rampZ = altarZ + 2.35, rampX = altarX + .36;
    const rampFoot = groundAt(x + rampX, z + rampZ + rampLength) + .05;
    const rampRise = altarTop - rampFoot - .125, slope = Math.atan2(rampRise, rampLength);
    const rampShape = new T.Shape();
    rampShape.moveTo(0, 0); rampShape.lineTo(rampLength, 0); rampShape.lineTo(0, rampRise); rampShape.closePath();
    const ramp = new T.ExtrudeGeometry(rampShape, { depth: rampWidth, bevelEnabled: false });
    add(shell, ramp, '#b4a096', rampX + rampWidth / 2, rampFoot, rampZ, 1, 1, 1, 0, -Math.PI / 2);
    ramp.dispose();
    box(ivory, rampX, rampFoot + rampRise / 2, rampZ + rampLength / 2, rampWidth + .15, .18,
      Math.hypot(rampLength, rampRise), slope);
    for (let j = 1; j < 9; j++) {
      const step = j / 9;
      line('#a18a7b', rampX, rampFoot + rampRise * (1 - step) + .103, rampZ + rampLength * step,
        rampWidth + .03, .017, .035, slope);
    }
    boundary(rampX, rampZ + rampLength / 2, rampWidth, rampLength);

    const basinX = 5.1, basinZ = 14.75, basinY = groundAt(x + basinX, z + basinZ);
    const bronze = '#af754d', brass = '#e1a565';
    const bowl = new T.LatheGeometry([[.64, .75], [.88, .91], [1.22, 1.05], [1.45, 1.35], [1.52, 1.69],
      [1.55, 1.83], [1.48, 1.9], [1.36, 1.86], [1.35, 1.69], [1.21, 1.34], [.65, 1.11], [0, 1.09]]
      .map(([r, h]) => new T.Vector2(r, h)), 24);
    add(trim, bowl, bronze, basinX, basinY, basinZ);
    bowl.dispose();
    add(shell, post, '#785048', basinX, basinY + .38, basinZ, .61, .76, .61);
    add(shell, post, '#b3876c', basinX, basinY + .20, basinZ, .85, .36, .85);
    box(ash, basinX, basinY + .075, basinZ, 2.13, .15, 2.13);
    const water = new T.CircleGeometry(1.37, 24).rotateX(-Math.PI / 2);
    add(trim, water, '#638891', basinX, basinY + 1.75, basinZ);
    water.dispose();
    const rim = new T.TorusGeometry(1.49, .065, 6, 32).rotateX(-Math.PI / 2);
    add(trim, rim, brass, basinX, basinY + 1.88, basinZ);
    rim.dispose();
    for (let i = 0; i < 12; i++) {
      const angle = i * Math.PI / 6;
      add(trim, jewel, brass, basinX + 1.47 * Math.sin(angle), basinY + 1.57, basinZ + 1.47 * Math.cos(angle), .09, .12, .092);
    }
    boundary(basinX, basinZ, 2.62, 2.62);
    function lamp(px, pz, height) {
      const base = groundAt(x + px, z + pz);
      add(trim, post, '#6d5154', px, base + height * .48, pz, .10, height, .10);
      add(trim, post, gold, px, base + height, pz, .21, .16, .21);
      add(trim, jewel, 'light', px, base + height + .19, pz, .095, .22, .094);
      if (night || dusk) {
        const glow = glowSprite('#ffc281', 3, .52);
        glow.userData.drawPriority = 18;
        glow.position.set(px, base + height + .18, pz);
        group.add(glow);
      }
    }
    for (const side of [-1, 1]) {
      for (const pz of [4.7, 10.1, 16.8, 22]) lamp(side * 9.3, pz, 1.55);
      for (const pz of [2.6, 6.45, 10.3, 14.15, 18.0, 21.85]) {
        if (side === 1 && pz > 11 && pz < 20) continue;
        const px = side * 14.25, y = groundAt(x + px, z + pz);
        stone('#aa958b', px, y, pz, .75, 1.69, 3.84);
        line(ivory, px, y + 1.76, pz, .88, .17, 3.89);
        for (let row = 1; row < 4; row++) line(ash, px - side * .378, y + row * .42, pz, .03, .025, 3.85);
        boundary(px, pz, .75, 3.84);
      }
      const px = side * 10.65, pz = 23.75, y = groundAt(x + px, z + pz);
      stone('#aa958b', px, y, pz, 6.68, 1.87, .82);
      line(ivory, px, y + 1.93, pz, 6.84, .16, .99);
      boundary(px, pz, 6.68, .82);
      const jambX = side * 6.85;
      stone(ash, jambX, y, pz, 1.75, .41, 1.88);
      stone(ivory, jambX, y + .41, pz, 1.48, 2.46, 1.55);
      box(ivory, jambX, y + 2.92, pz, 1.88, .25, 1.83);
      line(gold, jambX, y + 3.09, pz, 1.69, .10, 1.67);
      boundary(jambX, pz, 1.7, 1.82);
    }
    const gateX = 14.25, gateZ = 16.08, gateY = groundAt(x + gateX, z + gateZ);
    for (const side of [-1, 1]) {
      const pz = gateZ + side * 3.23;
      stone(ash, gateX, gateY, pz, 1.73, .41, 1.54);
      stone(ivory, gateX, gateY + .41, pz, 1.49, 4.10, 1.44);
      box(ivory, gateX, gateY + 4.58, pz, 1.75, .27, 1.66);
      box('#91644c', gateX - .93, gateY + 2.41, pz - side * .50, .22, 3.97, 1.27, 0, side * .58);
      for (const py of [1.03, 3.21]) line(brass, gateX - 1.06, gateY + py, pz - side * .58, .14, .09, 1.27, 0, side * .58);
      boundary(gateX, pz, 1.71, 1.67);
    }
    box(ash, gateX, gateY + 4.91, gateZ, 1.75, .54, 8.1);
    line(ivory, gateX, gateY + 5.27, gateZ, 1.94, .20, 8.5);
    line(gold, gateX, gateY + 5.41, gateZ, 1.88, .092, 8.45);
    const doorwayGlow = glowSprite('#ffca87', 10, night ? .69 : .32);
    doorwayGlow.position.set(0, entry + 5.35, face + .23);
    group.add(doorwayGlow);
    const entranceLight = new T.PointLight('#ffc079', night ? 71 : 13, 15, 2);
    entranceLight.position.set(0, entry + 5.3, front + 1.1);
    const spill = new T.Mesh(new T.PlaneGeometry(13, 12).rotateX(-Math.PI / 2), new T.MeshBasicMaterial({
      color: '#ffb674', map: radialTexture('rgba(255,241,202,.82)', 'rgba(255,178,103,0)'),
      opacity: night ? .68 : .31, transparent: true, depthWrite: false, blending: T.AdditiveBlending
    }));
    spill.position.set(0, deck + .016, 9.3);
    spill.userData.drawPriority = 18;
    group.add(spill);

    // Instanced double rows let the east and south porticoes read as long continuous galleries.
    const columns = [];
    function portico(px, pz, length, alongX, rows) {
      const roofY = 5.25, count = Math.ceil(length / 2.45);
      const width = rows * 1.39;
      for (let j = 0; j <= count; j++) for (let r = 0; r < rows; r++) {
        const step = length * (j / count - .5), offset = (r - (rows - 1) / 2) * 1.39;
        const cx = px + (alongX ? step : offset), cz = pz + (alongX ? offset : step);
        const base = Math.max(groundAt(x + cx, z + cz), 1.19);
        columns.push([cx, base, cz, roofY]);
        blocks.push([x + cx, z + cz, .32]);
        if (r === 0) add(far, cube, ivory, cx, (base + roofY) / 2, cz, .40, roofY - base, .40);
      }
      tower(ash, px, roofY, pz, alongX ? length + 1.15 : width + .25, .48, alongX ? width + .25 : length + 1.15);
      box(ivory, px, roofY + .34, pz, alongX ? length + 1.34 : width + .49, .21, alongX ? width + .49 : length + 1.34);
      line(gold, px, roofY + .18, pz, alongX ? length + 1.26 : width + .39, .09, alongX ? width + .39 : length + 1.26);
    }
    portico(19.4, -.9, 23.6, false, 2);
    portico(-19.4, -.9, 23.6, false, 2);
    portico(0, -11.6, 33.7, true, 2);
    for (const side of [-1, 1]) portico(side * 14.45, 10.3, 12.4, true, 3);
    const dummy = new T.Object3D();
    function instanced(geometry, color, count, pose) {
      const mesh = new T.InstancedMesh(geometry.clone(), mat(color), count);
      for (let i = 0; i < count; i++) {
        pose(dummy, i);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
      group.add(mesh);
      return mesh;
    }
    const shafts = instanced(post, ivory, columns.length, (obj, i) => {
      const [px, base, pz, top] = columns[i];
      obj.position.set(px, (base + top) / 2, pz); obj.scale.set(.25, top - base - .31, .25);
    });
    const capitals = instanced(cube, ivory, columns.length * 2, (obj, i) => {
      const [px, base, pz, top] = columns[Math.floor(i / 2)];
      obj.position.set(px, i % 2 ? base + .09 : top - .21, pz); obj.scale.set(.71, .18, .72);
    });
    boundary(0, -4.77, 16.7, 7.15);
    for (const side of [-1, 1]) boundary(side * pierX, midZ, bodyPier, frontDepth);
    const decoration = new T.Group(), near = new T.Group(), distant = new T.Group();
    group.add(near, distant);
    near.add(decoration, shafts, capitals, spill, entranceLight, ...group.children.filter(obj => obj.isSprite));
    addScenery(near, shell, color => mat(color));
    addScenery(distant, far, color => mat(color, { emissive: dusk ? '#c58b44' : night ? '#a89088' : '#e8d5b6', ei: night ? .13 : .16 }));
    addScenery(decoration, trim, color => color === 'light' ? mat(flame, { emissive: '#ff9c3d', ei: night ? 2.4 : .8 }) :
      color === gold ? mat(gold, { rough: .41, emissive: '#df913b', ei: night ? .27 : .09 }) : mat(color));

    const people = new T.Group();
    near.add(people);
    const rand = seeded(1749);
    const crowd = Array.from({ length: night ? 6 : 42 }, (_, i) => {
      const aisle = i < 16 && !night;
      const priest = i >= 16 && i < 24;
      const px = aisle ? -5.1 + (i % 4) * .99 : priest ? 3.8 + (i % 4) * .74 : (rand() < .5 ? -1 : 1) * (6.2 + rand() * 10.5);
      const pz = aisle ? 24 - Math.floor(i / 4) * 2.1 - rand() : priest ? 8.3 + (i % 3) * 1.2 : 8.4 + rand() * 17;
      return { px, pz, speed: aisle ? .62 + rand() * .25 : 0, phase: rand() * 6, priest };
    });
    const robeGeo = new T.CylinderGeometry(.22, .36, 1.2, 7);
    const crowdRobes = instanced(robeGeo, '#ffffff', crowd.length, obj => obj.scale.setScalar(1));
    const crowdHeads = instanced(jewel, '#bea48c', crowd.length, obj => obj.scale.setScalar(.19));
    people.add(crowdRobes, crowdHeads);
    const tint = new T.Color(), robes = ['#ae8774', '#88718d', '#736e82', '#a14f5a', '#a99b79'];
    crowd.forEach(({ priest }, i) => crowdRobes.setColorAt(i, tint.set(priest ? '#e4d8c5' : robes[i % robes.length])));
    for (const mesh of [crowdHeads, crowdRobes]) {
      mesh.frustumCulled = false;
      mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
    }
    const wings = new T.BufferGeometry();
    wings.setAttribute('position', new T.Float32BufferAttribute([
      0,0,.12, -.54,-.05,-.11, -.23,-.06,.15, 0,0,.12, .23,-.06,.15, .54,-.05,-.11,
      0,0,-.12, 0,0,.18, -.08,-.06,-.2, 0,0,-.12, .08,-.06,-.2, 0,0,.18
    ], 3));
    wings.computeVertexNormals();
    const birds = instanced(wings, '#d7ceda', night ? 0 : 7, obj => obj.scale.setScalar(1));
    birds.material = mat('#d7ceda', { doubleSided: true });
    wings.dispose();
    birds.frustumCulled = false;
    near.add(birds);
    robeGeo.dispose(); cube.dispose(); post.dispose(); jewel.dispose();
    return {
      walls, blocks, title: '예루살렘 성전',
      dispose() { spill.material.map.dispose(); spill.material.dispose(); },
      shot: [x + 3.2, z + 44.8], look: [x, 12.65, z + .4], height: 2.1, lowHeight: .84, push: 2.3,
      trigger(px, pz, site) {
        return ['temple', 'sanctuary'].includes(site?.key) ||
          (site?.key === 'south-steps' && Math.hypot(px - site.offset[0], pz - site.offset[1] + 5.1) < 1.9);
      },
      update(px, pz, seconds, close) {
        const distance = Math.hypot(x - px, z - pz);
        near.visible = close || distance < 50;
        distant.visible = !near.visible;
        decoration.visible = close || distance < 35;
        if (!near.visible) return;
        for (let i = 0; i < crowd.length; i++) {
          const { px, pz, speed, phase } = crowd[i];
          const travel = speed ? (seconds * speed + phase) % 8 : 0;
          const cz = pz - travel, cx = px + .22 * Math.sin(seconds + phase);
          const y = Math.max(groundAt(x + cx, z + cz), Math.abs(cx) < 21.9 && cz < 11.8 ? 1.18 : -Infinity);
          dummy.rotation.set(0, phase, Math.sin(seconds * 6 + phase) * (speed ? .04 : .012));
          dummy.position.set(cx, y + .61, cz); dummy.scale.setScalar(1);
          dummy.updateMatrix(); crowdRobes.setMatrixAt(i, dummy.matrix);
          dummy.position.y = y + 1.42; dummy.scale.set(.18, .22, .17);
          dummy.updateMatrix(); crowdHeads.setMatrixAt(i, dummy.matrix);
        }
        crowdRobes.instanceMatrix.needsUpdate = crowdHeads.instanceMatrix.needsUpdate = true;
        for (let i = 0; i < birds.count; i++) {
          const turn = seconds * .49 + i;
          dummy.position.set(Math.cos(turn) * (9 + i), 9 + Math.sin(turn * 1.2) * 2 + i * .32, 7.8 + Math.sin(turn) * 8);
          dummy.scale.set(1, .85 + .65 * Math.abs(Math.sin(seconds * 15 + i)), 1);
          dummy.rotation.set(0, turn, Math.sin(seconds * 15 + i) * .32);
          dummy.updateMatrix(); birds.setMatrixAt(i, dummy.matrix);
        }
        birds.instanceMatrix.needsUpdate = true;
      }
    };
  }

  function regionWorld(scene, options, climate, protectedPoints) {
    const { region, seed } = options;
    const [ox, oz] = region.origin, [wide, deep] = region.bounds;
    const jerusalem = region.index === 0;
    const water = region.placesToPlay.find(play => play.type === 'stones')?.pos;
    const game = region.placesToPlay.find(play => play.type === 'game')?.pos;
    const summit = region.index === 2 ? [36 - ox, -24 - oz] : null;
    const ground = new T.Group(), sky = new T.Group();
    const blocks = [], actors = [], birds = [], fx = [];
    const features = new Map(), residents = new Map(), parts = [], jumpSurfaces = [];
    scene.add(ground, sky);
    let main, activePart;
    const rand = seeded(hashStr('region/' + region.index));
    for (const site of region.sites) {
      if (!site.area && !site.extension) continue;
      const { area, offset: [x, z], translate, markerId } = site;
      const group = new T.Group();
      group.position.set(x, 0, z);
      scene.add(group);
      if (site.extension) {
        const local = districtScenery(group, site, climate);
        const drop = site.key === 'wilderness-edge' || site.key === 'wilderness-vista' ? -2.6 : 0;
        if (drop) {
          const { height, groundHeight } = local;
          group.position.y = drop;
          local.height = (x, z) => height(x, z) + drop;
          local.groundHeight = (x, z) => groundHeight(x, z) + drop;
        }
        blocks.push(...local.blocks.map(([px, pz, r]) => [...translate([px, pz]), r]));
        for (const effect of local.fx) {
          effect.cloud.position.x += x; effect.cloud.position.z += z;
          effect.x += x; effect.z += z;
          scene.add(effect.cloud);
          fx.push(effect);
        }
        parts.push({ site, group, local });
        continue;
      }
      const layout = site.primary ? options.layout : area.layout;
      const weather = site.primary ? climate : { ...climate, weather: 'clear' };
      const adventure = area.adventure && (site.primary ? area.adventure : { ...area.adventure,
        targets: Object.fromEntries(Object.entries(area.adventure.targets)
          .filter(([key, target]) => target.feature || (area.discover?.items.some(entry => entry.residentKey === key)))
          .map(([key, target]) => [markerId(key), target])) });
      const points = protectedPoints.map(([px, pz]) => [px - x, pz - z]);
      const local = adventure
        ? adventureWorld(group, area.seed || seed, layout, adventure, weather, points, true)
        : exploreWorld(group, area.kit, area.seed || seed, layout, weather, points, true);
      if (site.primary) {
        main = local;
        activePart = group;
        scene.background = group.background;
        scene.fog = group.fog;
        scene.fog.near += jerusalem ? 26 : 8; scene.fog.far += jerusalem ? 66 : 26;
      }
      for (const child of [...group.children]) {
        const skyObject = child === local.dome || child.isPoints;
        if (!skyObject && (!child.isLight || child.isPointLight)) continue;
        if (site.primary) (skyObject ? sky : scene).add(child);
        else {
          child.removeFromParent();
          child.geometry?.dispose(); child.material?.dispose();
        }
      }
      ground.add(local.ground);
      local.ground.position.set(x, 0, z);
      blocks.push(...local.blocks.map(([px, pz, r]) => [...translate([px, pz]), r]));
      for (const resident of local.actors || []) {
        resident.pos = translate(resident.pos);
        actors.push(resident);
      }
      for (const [key, resident] of local.residents || []) residents.set(key, resident);
      for (const [key, feature] of local.features || []) {
        feature.userData.kind = key;
        features.set(markerId(key), feature);
      }
      for (const effect of local.fx) {
        effect.cloud.userData.drawPriority = 1;
        fx.push(effect);
      }
      for (const bird of local.birds) {
        bird.bird.removeFromParent();
        bird.bird.position.x += x; bird.bird.position.z += z;
        bird.home.x += x; bird.home.z += z;
        scene.add(bird.bird);
        birds.push(bird);
      }
      parts.push({ site, group, local });
    }
    const moveActor = resident => {
      const { actor } = resident, part = parts.find(part => actor.parent === part.group);
      if (part) {
        actor.position.add(part.group.position);
        part.group.remove(actor);
        part.actors.add(actor);
        actor.userData.drawPriority = resident.key ? 20 : 0;
      }
    };
    for (const part of parts) {
      if (part.site.extension) continue;
      part.actors = new T.Group();
      scene.add(part.actors);
    }
    actors.forEach(moveActor);
    const positionOf = ([x, z]) => [x - ox, z - oz];
    const pathSegments = region.paths.map(path => path.map(positionOf));
    const pathDistance = (x, z) => {
      let distance = Infinity;
      for (const [[ax, az], [bx, bz]] of pathSegments) {
        const dx = bx - ax, dz = bz - az;
        const t = clamp(((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1), 0, 1);
        distance = Math.min(distance, Math.hypot(x - ax - dx * t, z - az - dz * t));
      }
      return distance;
    };
    const gapFrom = (site, x, z) => Math.max(Math.abs(x - site.offset[0]), Math.abs(z - site.offset[1])) - site.edge;
    const partAt = (x, z) => parts.find(({ site }) => gapFrom(site, x, z) <= 0);
    const exterior = (x, z) => {
      const px = x + ox, pz = z + oz;
      const slope = region.index === 1 || region.index === 2 ? 1.35 : .65;
      const rise = summit ? 5.2 * Math.max(0, 1 - Math.hypot((x - summit[0]) / 11, (z - summit[1]) / 9)) : 0;
      const valley = jerusalem ? -4.1 * Math.max(0, 1 - Math.hypot((px - 54) / 7, (pz + 7) / 40)) : 0;
      const fall = region.index === 1 ? -3.4 * clamp((px - 37) / 76, 0, 1) :
        region.index === 0 || region.index === 3 ? -2.4 * clamp((Math.abs(px) - wide * .70) / (wide * .30), 0, 1) : 0;
      const hills = rise + valley + fall + slope * Math.sin(px * .072) * Math.cos(pz * .065) + .20 * Math.sin(pz * .23);
      let near, gap = 8;
      for (const part of parts) {
        const distance = gapFrom(part.site, x, z);
        if (distance < gap) { gap = distance; near = part; }
      }
      if (!near) return hills;
      const { site, local } = near, [dx, dz] = site.offset, r = site.edge;
      return lerp(local.groundHeight(clamp(x - dx, -r, r), clamp(z - dz, -r, r)), hills, clamp(gap / 8, 0, 1));
    };
    const height = (x, z) => {
      const part = partAt(x, z);
      const base = part ? part.local.height(x - part.site.offset[0], z - part.site.offset[1]) : exterior(x, z);
      if (!jerusalem) return base;
      const dx = x + ox - 28, dz = z + oz + 32.5;
      const { front, tread, count, rise, base: deck, width } = TEMPLE_STAIRS;
      if (dz >= front && dz < front + tread * count) {
        const stair = Math.floor((dz - front) / tread);
        if (Math.abs(dx) < (width + stair * .15) / 2) return Math.max(base, deck + (count - stair) * rise);
      }
      if (Math.abs(dx) < 21.99 && dz >= -13.2 && dz < 11.9) return Math.max(base, 1.19);
      return base;
    };
    const density = .94;
    const landGeo = new T.PlaneGeometry(wide * 2 + 4, deep * 2 + 4, Math.ceil(wide * density), Math.ceil(deep * density))
      .rotateX(-Math.PI / 2).translate(-ox, 0, -oz).toNonIndexed();
    const pos = landGeo.attributes.position, colors = new Float32Array(pos.count * 3);
    const earth = new T.Color(['#8c7d78', '#777855', '#677a5a', '#77634f'][region.index]);
    const road = new T.Color(['#b6a296', '#b3986f', '#b69b77', '#ab8967'][region.index]);
    const color = new T.Color(), dryEarth = new T.Color('#b29670'), dryRoad = new T.Color('#d6b489');
    for (let i = 0; i < pos.count; i += 3) {
      const x = (pos.getX(i) + pos.getX(i + 1) + pos.getX(i + 2)) / 3;
      const z = (pos.getZ(i) + pos.getZ(i + 1) + pos.getZ(i + 2)) / 3;
      const wear = clamp((2.8 - pathDistance(x, z) + rand() * .55) / 1.1, 0, 1);
      const aridity = region.index === 1 ? clamp((x + ox - 32) / 32, 0, 1) : 0;
      color.copy(earth).lerp(dryEarth, aridity).lerp(road, wear).lerp(dryRoad, wear * aridity).multiplyScalar(.91 + rand() * .18);
      for (let j = i; j < i + 3; j++) {
        pos.setY(j, exterior(pos.getX(j), pos.getZ(j)) - .07);
        colors.set([color.r, color.g, color.b], j * 3);
      }
    }
    landGeo.setAttribute('color', new T.BufferAttribute(colors, 3));
    landGeo.computeVertexNormals();
    ground.add(new T.Mesh(landGeo, new T.MeshStandardMaterial({ vertexColors: true, roughness: 1 })));

    const cube = new T.BoxGeometry(), stone = new T.IcosahedronGeometry(1, 0);
    const cone = new T.ConeGeometry(1, 1, 7), column = new T.CylinderGeometry(.72, 1, 1, 7);
    const patches = new Map();
    const add = (mesh, color, ...shape) => {
      if (!patches.has(color)) patches.set(color, []);
      patches.get(color).push(place(mesh, ...shape));
    };
    const wall = ['#a9978f', '#a18c76', '#a68e73', '#987f6e'][region.index];
    const cap = ['#d0bba7', '#bbab88', '#bba68d', '#b0987d'][region.index];
    const foliage = ['#62735d', '#687b51', '#547b53', '#646d4d'][region.index];
    const trunk = '#6f5243';
    function tree(x, z, size) {
      const canopy = Array.from({ length: 5 }, () => rand());
      if (game && Math.hypot(x - game[0], z - game[1]) < 13) return;
      const y = height(x, z);
      add(column, trunk, x, y + size, z, .24 * size, 2 * size, .24 * size);
      for (let i = 0; i < 5; i++) add(stone, foliage, x + Math.cos(i * 2.4) * .88 * size,
        y + (2.0 + canopy[i] * .55) * size, z + Math.sin(i * 2.4) * .88 * size, size, .73 * size, size, 0, i);
      blocks.push([x, z, .30 * size]);
    }
    function wallAt(x, z, width, length, h = .7) {
      const y = height(x, z);
      add(cube, wall, x, y + h * .5, z, width, h, length);
      add(cube, cap, x, y + h, z, width + .12, .12, length + .12);
    }
    function lowStep(x, z, width, depth, rise, color, walkOn = false) {
      const base = height(x, z);
      add(cube, color, x, base + rise / 2, z, width, rise, depth);
      jumpSurfaces.push({ x, z, halfX: width / 2, halfZ: depth / 2, top: base + rise, walkOn });
    }
    // The region has a continuous stone boundary, with its road network inside.
    for (const side of [-1, 1]) {
      for (let x = -wide + 1; x < wide; x += 2) wallAt(x - ox, side * (deep + .15) - oz, 2.10, .66);
      for (let z = -deep + 1; z < deep; z += 2) wallAt(side * (wide + .15) - ox, z - oz, .66, 2.10);
    }
    for (let i = 0; i < 17; i++) {
      const x = -wide - 3 + i * (2 * wide + 6) / 16 - ox;
      const z = -deep - 7 - rand() * 7 - oz;
      const size = region.index === 2 && x + ox < -15 ? 2 + rand() * 3 : 4 + rand() * 9;
      add(stone, ['#756c7f', '#616d73', '#536d74', '#645970'][region.index],
        x, size * .26, z, size * 1.45, size * .89, size * 1.35, .15, i * 1.18);
    }
    for (let i = 0; i < 270; i++) {
      const [x, z] = positionOf([(rand() * 2 - 1) * (wide - 3), (rand() * 2 - 1) * (deep - 3)]);
      if (pathDistance(x, z) < 3.65 || region.sites.some(site => gapFrom(site, x, z) < 2)) continue;
      const y = height(x, z), size = .13 + rand() * .38;
      const bare = jerusalem || region.index === 1 && x + ox > 42;
      if (bare) {
        if (i % 3 === 0) add(stone, region.index === 1 ? '#c8ad87' : wall, x, y + size * .21, z, size, size * .49, size * .66, 0, i);
      } else if (i % 8 === 0) tree(x, z, .85 + rand() * .83);
      else if (i % 3 === 0) add(stone, wall, x, y + size * .28, z, size, size * .60, size * .74, 0, i);
      else add(cone, foliage, x, y + size * .5, z, size * .65, size, size * .65, .2, i);
    }

    const signs = [];
    if (water) {
      const [wx, wz] = water;
      const river = new T.PlaneGeometry(2.62, 13.8, 4, 17).rotateX(-Math.PI / 2);
      const position = river.attributes.position;
      for (let i = 0; i < position.count; i++) {
        const x = position.getX(i) + wx, z = position.getZ(i) + wz;
        position.setXYZ(i, x, height(x, z) + .07, z);
      }
      river.computeVertexNormals();
      scene.add(new T.Mesh(river, mat('#598492', { rough: .39 })));
      for (const dx of [-1.26, -.42, .42, 1.26]) lowStep(wx + dx, wz, .76, .82, .26, cap, true);
      for (const dx of [-1.64, 1.64]) for (const dz of [-5.3, -3.4, 2.8, 4.9]) {
        const x = wx + dx, z = wz + dz;
        add(cone, foliage, x, height(x, z) + .36, z, .13, .78, .14, .10, dz);
      }
    }
    for (const [x, z, w, d, rise, color] of [[3.3, 4.7, 1.32, 1.06, .52, trunk], [-3.45, 9.25, 1.36, 1.02, .43, cap]]) {
      lowStep(x, z, w, d, rise, color);
      if (color === trunk) for (const side of [-1, 1]) {
        add(cube, '#b28868', x + side * .44, height(x, z) + rise / 2, z + d / 2, .11, rise, .045);
      }
    }
    const stairSite = region.sites.find(site => site.key === 'south-steps');
    if (stairSite) {
      for (const side of [-1, 1]) lowStep(...stairSite.translate([side * 2.7, 3.2]), 1.18, .74, .41, cap);
    }
    const wellSite = region.sites.find(site => site.key === 'village-threshing' || site.key === 'well');
    if (wellSite) {
      const [x, z] = wellSite.translate(wellSite.extension ? [-4.9, .46] : [2.7, .61]);
      lowStep(x, z, 1.35, .78, .40, cap);
    }
    for (const site of region.sites) {
      const [x, z] = site.offset, r = site.edge, towardsRoad = site.z > 0 ? -1 : 1;
      const entranceZ = site.extension ? z + towardsRoad * (r + .48) : z + towardsRoad * (r + 1.45);
      const signX = x + 2.75, signY = height(signX, entranceZ);
      signs.push([signX, entranceZ]);
      const sign = textSprite(site.extension ? site.label : site.name, { color: '#fff1c7', size: 21 });
      sign.position.set(signX, signY + 2.19, entranceZ);
      sign.scale.setScalar(4.8);
      scene.add(sign);
      sign.userData.drawPriority = 8;
      add(column, trunk, signX, signY + .97, entranceZ, .095, 1.94, .095);
      add(cube, trunk, signX, signY + 1.86, entranceZ, 2.4, .5, .13);
      for (const side of [-1, 1]) {
        const px = x + side * 3.7, py = height(px, entranceZ);
        wallAt(px, entranceZ, 1.73, .96, 1.08);
        add(stone, cap, px, py + 1.18, entranceZ, .35, .20, .35);
      }
      if (site.extension || jerusalem && site.key === 'sanctuary') continue;
      const inward = site.x <= 0 ? 1 : -1;
      const lx = x + inward * (r + 3.7), lz = z - towardsRoad * Math.min(r - 3, inward > 0 ? 9 : 3);
      const y = height(lx, lz);
      if (['temple', 'sanctuary', 'gate'].includes(site.key)) {
        const tower = site.key === 'gate', tall = tower ? 7.8 : 5.35;
        add(cube, wall, lx, y + tall * .5, lz, tower ? 4.2 : 6, tall, 3.8);
        add(cube, cap, lx, y + tall, lz, tower ? 4.6 : 7.2, .48, 4.4);
        for (const dx of [-2.6, -1.3, 0, 1.3, 2.6]) {
          if (tower) add(cube, wall, lx + dx * .71, y + tall + .41, lz + 1.5, .54, .69, .59);
          else add(column, cap, lx + dx, y + tall * .45, lz + 2.25, .27, tall * .9, .27);
        }
        blocks.push([lx, lz, 2.6]);
      } else if (site.key === 'stable' || site.key === 'field') {
        const stable = site.key === 'stable';
        for (const dx of [-2.8, 2.8]) wallAt(lx + dx, lz, .45, 4, .67);
        if (stable) {
          if (!site.area) {
            for (let i = 0; i <= 10; i++) {
              const angle = i * Math.PI / 10;
              add(stone, i % 2 ? wall : cap, x + 4.1 * Math.cos(angle), 1 + 2.85 * Math.sin(angle), z - 5,
                1.17, 1.13, 2.68, .21, i * .7);
            }
            add(stone, '#564654', x, 1.62, z - 8, 4.25, 2.91, 1.31);
          }
        } else {
          add(cube, trunk, lx, y + .22, lz, 1.1, .28, .65, 0, -.3);
          add(cone, '#d8854c', lx, y + .72, lz, .32, .90, .34);
          for (let i = 1; i <= 4; i++) add(stone, '#978b9a', lx + i * .28, y + i * 1.25, lz, .38 * i, .29 * i, .32 * i);
        }
      } else if (site.key === 'well') {
        add(column, wall, lx, y + .48, lz, 1.95, .96, 1.95);
        add(column, '#617f91', lx, y + .98, lz, 1.40, .07, 1.40);
        for (const dx of [-1.6, 1.6]) add(cube, trunk, lx + dx, y + 1.8, lz, .18, 3.6, .18);
        add(cone, '#b48b63', lx, y + 3.66, lz, 2.8, 1.25, 2.8, 0, .4);
        blocks.push([lx, lz, 1.8]);
      } else if (site.key === 'desert') {
        for (const dx of [-3.5, 0, 2.2]) add(stone, '#9e8566', lx + dx, y + 1.28, lz, 2.4, 2.2, 1.45, 0, dx);
        blocks.push([lx, lz, 2]);
      } else {
        tree(lx, lz, site.key === 'galilee' ? 2.8 : 1.85);
        for (const side of [-1, 1]) wallAt(lx + side * 2.8, lz + 3.3, 1.9, .64, .52);
      }
    }
    if (region.index === 1) {
      for (const px of [6.8, 9.1, 14.9, 17.2]) {
        for (let pz = 14.5; pz < 22.5; pz += 1.4) {
          const [x, z] = positionOf([px, pz]), y = height(x, z);
          add(column, trunk, x, y + .32, z, .12, .65, .12);
          add(stone, foliage, x, y + .69, z, .61, .28, .69, 0, pz);
          add(stone, '#686187', x + .27, y + .59, z, .19, .23, .18, 0, px);
        }
      }
    }
    // Roadside sellers, bundles and a trough sit clear of the walking lane.
    for (const [px, pz, cloth] of [[1, 4.8, '#aa645f'], [-12, -4.7, '#957aa0'], [13, -4.6, '#b8885f']]) {
      const [x, z] = positionOf([px, pz]);
      const y = height(x, z);
      if (partAt(x, z) || pathDistance(x, z) < 2.4) continue;
      for (const dx of [-1.45, 1.45]) for (const dz of [-.65, .65]) {
        add(column, trunk, x + dx, y + 1.07, z + dz, .07, 2.14, .07);
      }
      add(cube, cloth, x, y + 2.13, z, 3.15, .12, 1.81, .17);
      add(cube, trunk, x, y + .51, z + .25, 2.05, .18, .81);
      for (const dx of [-.65, 0, .65]) add(column, '#9f6959', x + dx, y + .78, z + .32, .19, .37, .19);
      add(column, '#667b57', x - 1.9, y + .55, z + .2, .23, .98, .23);
      add(stone, '#bd917b', x - 1.9, y + 1.17, z + .2, .17, .19, .17);
      blocks.push([x, z, 1.05]);
    }
    if (region.index === 1 || region.index === 2) {
      const lake = region.index === 2;
      const [x, z] = positionOf(lake ? [123, -76] : [149, 14]);
      add(column, lake ? '#669ca8' : '#7291a0', x, lake ? -3.6 : -7.3, z, lake ? 13 : 11, .12, lake ? 24 : 38, 0, .11);
      for (let i = 0; i < 5; i++) {
        add(cube, lake ? '#9abdc0' : '#cbb1a4', x - 4 + rand() * 13, lake ? -3.51 : -7.21, z - 8 + i * 4, 3.2 + rand() * 4, .028, .18);
        add(stone, lake ? '#748d89' : '#a38b81', x + 17 + i * 4, -3 + rand() * 2, z - 28 + i * 12, 13, 7.2, 10.5, 0, i);
      }
      if (!lake) {
        const basin = new T.SphereGeometry(1, 16, 6, 0, Math.PI * 2, 0, Math.PI / 2);
        const sand = ['#b18b68', '#a48674', '#967f7b', '#b4927d'];
        const ridge = seeded(9075);
        for (const [row, px, py, width, depth] of [[0, 117, -9.5, 16, 16], [1, 131, -12.2, 17, 20], [2, 169, -13.3, 17, 24], [3, 190, -10, 30, 28]]) {
          for (let i = 0; i < 9; i++) {
            const pz = -82 + i * (row < 2 ? 24 : 28) + ridge() * 12;
            if (row < 2 && pz > -11 && pz < 37) continue;
            const [sx, sz] = positionOf([px + ridge() * 12, pz]);
            add(basin, sand[row], sx, py, sz, width + ridge() * 10, 7.5 + ridge() * 11, depth, .06, .28 + i * .64, .06);
          }
        }
        basin.dispose();
        for (let i = 0; i < 46; i++) {
          const px = x - 9 + ridge() * 18, pz = z - 29 + ridge() * 58;
          add(cube, ['#b8bbb0', '#9ea9a6', '#9ab7bc', '#adc0bd'][i % 4], px, -7.206, pz, .45 + ridge() * 2.6, .009, .08 + ridge() * .04);
        }
      }
      if (lake) {
        const [tx, tz] = positionOf([134, 73]);
        const hill = new T.SphereGeometry(1, 24, 10, 0, 2 * Math.PI, 0, Math.PI / 2);
        add(hill, '#64856a', tx, -3.4, tz, 19, 18, 16);
        add(hill, '#8d9b77', tx + 13, -3.5, tz + 9, 19, 9, 15);
        hill.dispose();
      }
    }
    if (region.index === 3) {
      const [x, z] = positionOf([-41, -80]);
      for (const [dx, dz, w, h] of [[-8,-3,6,4],[-2,1,5,3.4],[3,-6,8,5.7],[9,2,4.4,3.2],[13,-2,5,4.1]]) {
        add(cube, '#a18a94', x + dx, h * .5, z + dz, w, h, 4.2);
        add(cube, '#cbb4a3', x + dx, h, z + dz, w + .2, .22, 4.4);
      }
      const [sx, sz] = positionOf([19, -9]);
      const star = new T.Sprite(new T.SpriteMaterial({
        map: starTexture(), color: '#ffe5a3', transparent: true, depthWrite: false, fog: false, blending: T.AdditiveBlending
      }));
      star.position.set(sx, 23, sz);
      star.scale.setScalar(3.7);
      scene.add(star);
    }
    const temple = jerusalem ? templeMount(scene, ...positionOf([28, -32.5]), climate, height) : null;
    if (temple) {
      blocks.push(...temple.blocks);
      const city = seeded(1072);
      for (let i = 0; i < 144; i++) {
        const px = -48 + (i % 15) * 6.15 + (city() - .5) * 2.8;
        const pz = -31 + Math.floor(i / 15) * 7.3 + (city() - .5) * 3.1;
        const [x, z] = positionOf([px, pz]);
        if (partAt(x, z) || pathDistance(x, z) < 4.1 || (Math.abs(px - 28) < 23.4 && pz < 8) ||
            (Math.abs(px - 31) < 6.8 && pz < 17)) continue;
        const y = height(x, z), w = 2.4 + city() * 2.75, h = 1.8 + city() * 2.98;
        add(cube, ['#a38c88', '#b49684', '#a99b96', '#ccb3a1'][i % 4], x, y + h * .5, z, w, h, 3.7);
        add(cube, '#d0b8a1', x, y + h, z, w + .16, .18, 3.86);
        add(cube, '#795d62', x, y + .69, z + 1.86, .52, 1.36, .07);
        blocks.push([x, z, w * .39]);
      }
    }
    addScenery(scene, patches, color => mat(color));
    cube.dispose(); stone.dispose(); cone.dispose(); column.dispose();
    const landmarks = temple ? [temple] : [];
    const landmarkScenes = {
      stable: { title: '마구간', shot: [-.8, 7.25], look: [.13, 3.25, -7.68], height: 3.05, lowHeight: 1.85, push: 1.32, range: 10.7 },
      elizabeth: { title: '엘리사벳 집 마당', shot: [1.8, 10.2], look: [-.2, 1.92, -6.3], height: 3.05, lowHeight: 1.75, push: 1.42, range: 11.2 },
      'synagogue-yard': { title: '회당 앞 마당', shot: [1.3, 9.85], look: [-.12, 2.26, -3.25], height: 3.05, lowHeight: 1.75, push: 1.23, range: 7.4 },
      'wilderness-vista': { title: '광야 길 전망 자리', shot: [-1.60, 1.32], look: [54, -1.05, -18], height: 4.3, lowHeight: 2.2, push: .83, range: 3.95, foreground: false }
    };
    for (const { site } of parts) {
      const spec = landmarkScenes[site.key];
      if (!spec) continue;
      const [x, y, z] = spec.look;
      landmarks.push({ ...spec, shot: site.translate(spec.shot), look: [x + site.offset[0], y, z + site.offset[1]],
        trigger(px, pz, place) { return site === place && Math.hypot(px - site.offset[0], pz - site.offset[1]) < spec.range; } });
    }
    const regularFog = scene.fog.far;
    const horizonFogs = { 'wilderness-vista': 116, 'tabor-vista': 116, 'lake-pass': 124, 'bethlehem-vista': 156 };
    const horizons = region.sites.filter(site => horizonFogs[site.key]);
    function update(x, z) {
      sky.position.set(x, 0, z);
      if (horizons.length) {
        scene.fog.far = regularFog;
        for (const site of horizons) {
          const distance = Math.hypot(x - site.offset[0], z - site.offset[1]);
          const blend = clamp(1 - distance / 9, 0, 1);
          scene.fog.far = Math.max(scene.fog.far, lerp(regularFog, horizonFogs[site.key], blend));
        }
      }
      let group = null, nearest = 8;
      for (const part of parts) {
        if (part.site.extension) {
          part.local.detail.visible = gapFrom(part.site, x, z) < 22;
          continue;
        }
        const gap = gapFrom(part.site, x, z);
        if (gap < nearest) { nearest = gap; group = part.group; }
      }
      if (group === activePart) return;
      activePart = group;
      for (const part of parts) {
        if (!part.site.extension) part.group.visible = part.actors.visible = part.group === group;
      }
    }
    const titles = { temple: '성전 계단 전망', sanctuary: '성소 계단 전망', roof: '사가랴 집 지붕 전망', gate: '성문 망루 전망',
      'bethlehem-vista': '베들레헴 언덕 전망', 'wilderness-vista': '광야 길 전망 자리', 'tabor-vista': '다볼산 전망',
      'lake-pass': '갈릴리 호수 고개 전망' };
    const viewpoints = parts.flatMap(({ site, local }) => (local.climbs || []).map(pos => ({
      pos: site.translate(pos), title: titles[site.key] || site.label + ' 전망',
      episode: site.episode || region.main.episode, lookAt: local.lookAt
    })));
    if (summit) {
      const hill = region.sites.find(site => site.key === 'galilee');
      viewpoints.push({ pos: summit, title: '갈릴리 언덕 전망', episode: hill.episode || region.main.episode });
    }
    activePart = undefined;
    update(...(options.spawn || options.adventure?.spawn || [0, 6.2]));
    return { ...main, ground, height, blocks, actors, residents, features, birds, fx, update, viewpoints, jumpSurfaces, temple, landmarks,
      placesToPlay: region.placesToPlay,
      climbs: viewpoints.map(viewpoint => viewpoint.pos),
      signs: signs.concat(parts.flatMap(({ site, local }) => (local.signs || []).map(site.translate))),
      walkable(x, z) {
        if (Math.abs(x + ox) > wide || Math.abs(z + oz) > deep) return false;
        if (water && Math.abs(x - water[0]) < 1.28 && Math.abs(z - water[1]) < 6.85 && Math.abs(z - water[1]) > .63) return false;
        if (temple?.walls.some(([px, pz, w, d]) => Math.abs(x - px) < w && Math.abs(z - pz) < d)) return false;
        const part = partAt(x, z);
        return !part || part.local.walkable(x - part.site.offset[0], z - part.site.offset[1]);
      },
      dispose() {
        temple?.dispose();
        for (const { local } of parts) if (local !== main) local.models?.dispose();
        for (const part of ground.children) part.material.dispose();
      }
    };
  }

  const DISTRICT_WORK = {
    temple: [3.2, 11, '등잔을 지키는 사람', 'oil-lamp', 'lamp'],
    sanctuary: [5.5, 11, '등잔대 곁의 제사장', 'menorah', 'menorah'],
    'outer-court': [4.1, 1.8, '동전을 고르는 환전상', 'money-changer', 'coins'],
    'south-steps': [4.8, 4.7, '계단에 오르는 순례자', 'ascent-steps', null, 'walk'],
    'sheep-gate': [-6.2, .2, '양을 모는 목자', 'sheep-gate', 'sheepfold', 'walk'],
    'wall-walk': [2.3, .7, '성벽을 살피는 파수꾼'],
    'lower-town': [3.5, 3.9, '화덕 곁에서 빵 굽기', 'clay-oven', 'oven'],
    siloam: [3.4, 3.9, '못가에서 물 긷기', 'siloam', 'jar', 'draw'],
    olives: [2.2, 3.7, '올리브를 바구니에 담기', 'mount-of-olives'],
    'herod-palace': [-4.35, 1.8, '궁 앞을 순찰하는 군인', 'herod-palace', null, 'walk'],
    roof: [-5.1, 6.6, '맷돌을 돌리는 두 사람', 'millstone', 'millstone', 'grind', 'pair'],
    hillpath: [-3.1, 4, '산골길을 오르는 나그네', 'traveler-pack', null, 'walk'],
    elizabeth: [5.2, .6, '천에 쓸 실 잣기', 'loom-spindle', 'loom', 'grind'],
    'judean-terraces': [-4.8, 2.8, '포도송이를 따는 사람', 'terraced-field', 'vine', 'reach'],
    'village-threshing': [2, -.9, '곡식과 겨 까부르기', 'thresh-winnow', 'winnow', 'winnow', '소'],
    'valley-stream': [2.5, 2.6, '시냇가에서 물동이 채우기', 'water-carry', 'jar', 'draw'],
    'wilderness-edge': [-5, 2.9, '염소 떼를 찾는 목자', 'barren-country', null, 'walk', 'goats'],
    'wilderness-vista': [-2.5, 1.2, '광야 길을 살피는 나그네', 'wilderness-road', null, null, '독수리'],
    desert: [-4.6, 8.2, '돌을 골라 길을 살피는 목자', 'wilderness-road', null, 'gather'],
    nazareth: [-3, 8.8, '골목에서 노는 아이들', 'small-village', null, 'walk', 'pair'],
    workshop: [3.2, 3.1, '대패로 나무 다듬기', 'carpenter-plane', 'carpenter', 'plane'],
    well: [-2.1, 4.25, '우물에서 물 긷기', 'well-bucket', 'jar', 'draw', 'pair'],
    galilee: [3.2, 6.2, '올리브 열매 고르기', 'olive-press', 'olivepress', 'gather'],
    'south-road': [1.8, 2.15, '남쪽 길로 떠나는 나그네', 'traveler-pack', null, 'walk'],
    'nazareth-cliff': [-2.2, 1.05, '낭떠러지에서 골짜기 내려다보기', 'hilltown'],
    'synagogue-yard': [2.15, 1.45, '두루마리를 펼치는 사람', 'scroll-synagogue', 'scroll', 'reach'],
    'grain-yard': [-1.0, 1.3, '타작판으로 이삭 떨기', 'thresh-winnow', 'grain', 'winnow', '소'],
    'olive-cave': [3.9, 1.25, '올리브 틀을 돌리는 사람', 'olive-press', 'olivepress', 'grind'],
    'tabor-vista': [-2.2, .9, '언덕을 지나가는 목자', 'mount-tabor', null, 'walk'],
    'lake-pass': [3.2, -.5, '그물을 손질하는 어부', 'sea-of-galilee', 'net', 'plane'],
    gate: [-4.45, 2.7, '성문 곁에서 호적을 적기', 'census', 'tablet'],
    inn: [3.15, .8, '나귀의 짐 내리기', 'donkey', null, 'reach', '나귀'],
    field: [2.65, .65, '모닥불에 장작 넣기', 'watch-fire', 'campfire', 'gather'],
    stable: [2.6, -1.4, '여물통에 볏짚 담기', 'stone-manger', 'manger', 'gather'],
    'rachel-tomb': [-4.8, 2.85, '길가의 무덤 앞을 지나는 사람', 'rachel-tomb', null, 'walk'],
    'david-well': [-2.75, .7, '성문 곁에서 두레박 당기기', 'david-well', 'jar', 'draw'],
    'boaz-field': [3.3, 2.7, '밭 모퉁이에서 이삭 줍기', 'gleaning', 'grain', 'gather'],
    'eder-tower': [-2.95, 1.05, '망대 아래에서 양 세기', 'eder-tower', null, 'reach'],
    'shepherd-cave': [-2.45, -.85, '우리 안으로 양 몰기', 'sheepfold', null, 'walk'],
    'bethlehem-vista': [3.6, 2.05, '언덕에서 들판을 지켜보는 목자'],
  };
  const REGIONAL_RIDES = [
    [[-39, 10], [-21, 38], [9, -36]], [[-24, 3], [-37, 10], [48, 12]],
    [[-49, 49], [17, 2], [46, -22]], [[-31, -34], [31, -13], [19, 35]]
  ];
  const REGIONAL_SHORTCUTS = [
    [[-41, 19], [15, 20], [35, 9], [26, -41]],
    [[-49, -4], [-37, 38], [21, 43], [58, 5]],
    [[-71, 53], [-30, -30], [24, 48], [55, -13]],
    [[-35, -37], [-23, -9], [39, 32], [10, 43]]
  ];
  function makeRegionalLife(scene, region, world, reduced) {
    const models = world.models, markers = [], workers = [], animals = [], rides = new Map();
    const [ox, oz] = region.origin;
    const at = ([x, z]) => [x - ox, z - oz];
    const propMat = mat('#ffffff', { vertexColors: true, flat: true, rough: .85 });
    const add = (actor, x, z, yaw, priority = 10) => {
      actor.position.set(x, world.height(x, z), z);
      actor.rotation.y = yaw;
      actor.userData.drawPriority = priority;
      actor.visible = false;
      scene.add(actor);
      return actor;
    };
    const addWorker = (name, x, z, i, motion) => {
      const { actor } = models.person(name, i, true);
      const y = world.height(x, z);
      add(actor, x, z, .4);
      workers.push({ actor, x, y, z, motion, phase: i * 1.83 });
    };
    const animalAt = (kind, x, z, yaw, i) => {
      const actor = add(models.animal(kind), x, z, yaw);
      animals.push({ actor, kind, x, z, y: actor.position.y, phase: i * 2.1, yaw });
    };
    for (const [i, site] of region.sites.entries()) {
      const work = DISTRICT_WORK[site.key];
      if (!work) continue;
      const [dx, dz, title, discover, prop, motion, company] = work;
      const [x, z] = site.translate([dx, dz]);
      addWorker(title, x, z, i, motion);
      if (company === 'pair') addWorker(title, x - .96, z + .35, i + 2, motion);
      else if (company === 'goats') for (let n = 0; n < 4; n++) animalAt('염소', x + 1.5 + n * .72, z - 2 + Math.sin(n * 2) * .8, n + 1, n);
      else if (company) animalAt(company, x + 2.1, z - 1.45, .65, i);
      if (prop) {
        const tool = add(buildDiscoverProp(prop, propMat, models), x + .3, z + .64, -.43);
        tool.scale.setScalar(.82);
        workers.at(-1).tool = tool;
      }
      markers.push({ id: 'observe/' + site.key, type: 'observe', title, pos: [x, z], symbol: '👀', quiet: true, observe: discover || true });
      if (site.key === 'elizabeth') {
        const [px, pz] = site.translate([-1.8, -1.75]);
        addWorker('포도 밟는 아이', px - .45, pz, i + 2, 'stomp');
        addWorker('포도 밟는 아이', px + .38, pz - .21, i + 3, 'stomp');
        workers.at(-1).tool = add(buildDiscoverProp('winepress', propMat, models), px, pz + .27, .08);
        markers.push({ id: 'observe/grape-press', type: 'observe', title: '포도를 밟는 아이들', pos: [px, pz + .66],
          symbol: '👀', quiet: true, observe: 'winepress' });
      }
    }
    for (const [i, point] of REGIONAL_RIDES[region.index].entries()) {
      const [x, z] = at(point), id = 'ride/' + i;
      const donkey = add(models.animal('나귀', true), x, z, .6, 12);
      rides.set(id, donkey);
      markers.push({ id, type: 'ride', title: '나귀 타기', pos: [x, z], symbol: '🫏', quiet: true, ride: true });
    }
    const cube = new T.BoxGeometry(), wall = new Map([['#b09a80', []], ['#ceb69b', []]]);
    for (const [i, point] of REGIONAL_SHORTCUTS[region.index].entries()) {
      const [x, z] = at(point);
      for (let dx = -2.2; dx < 2.4; dx += .64) {
        const y = world.height(x + dx, z);
        wall.get('#b09a80').push(place(cube, x + dx, y + .26, z, .64, .53, .43));
        wall.get('#ceb69b').push(place(cube, x + dx, y + .55, z, .66, .12, .48));
        world.blocks.push([x + dx, z, .29]);
      }
      markers.push({ id: 'shortcut/' + i, type: 'shortcut', title: '담 넘기', pos: [x, z], symbol: '🐑', quiet: true, shortcut: true });
    }
    addScenery(scene, wall, color => mat(color));
    cube.dispose();
    return { markers, rides, update(p, t, mounted) {
      for (const { actor, x, y, z, motion, phase, tool } of workers) {
        const d = Math.hypot(x - p.x, z - p.z);
        actor.visible = d < 28;
        if (tool) tool.visible = actor.visible;
        if (!actor.visible || reduced) continue;
        const { arms, rig, feet } = actor.userData.gait;
        const f = t * (motion === 'winnow' ? 2.7 : 3.4) + phase, wave = Math.sin(f);
        const crouch = motion === 'gather' || motion === 'draw';
        rig.rotation.x = crouch ? .32 + wave * .15 : motion === 'plane' ? .19 + wave * .09 : wave * .035;
        rig.position.y = crouch ? -.18 - wave * .07 : 0;
        arms.forEach((arm, i) => {
          arm.rotation.x = motion === 'walk' ? wave * (i ? .55 : -.55) :
            -.38 - Math.max(0, wave) * (motion === 'reach' || motion === 'winnow' ? 1.2 : .64);
          arm.rotation.z = motion === 'grind' ? .16 * Math.cos(f + i) : 0;
        });
        if (motion === 'walk' || motion === 'stomp') {
          if (motion === 'walk') actor.position.set(x + wave * .6, y, z + Math.cos(f * .5) * .32);
          feet.forEach((foot, i) => { foot.position.y = .10 + Math.max(0, wave * (i ? 1 : -1)) * .11; });
        } else if (tool && motion === 'grind') tool.rotation.y = -.43 + .16 * Math.sin(f);
      }
      for (const { actor, kind, x, y, z, phase, yaw } of animals) {
        actor.visible = Math.hypot(x - p.x, z - p.z) < 29;
        if (!actor.visible || reduced) continue;
        const angle = t * .61 + phase;
        actor.position.x = x + Math.sin(angle) * (kind === '독수리' ? 6 : .62);
        actor.position.z = z + Math.cos(angle) * (kind === '독수리' ? 4 : .40);
        actor.position.y = kind === '독수리' ? y + 6.1 + Math.sin(angle * 1.5) * .45 : world.height(actor.position.x, actor.position.z);
        actor.rotation.y = yaw + Math.sin(angle) * .65;
      }
      for (const [id, donkey] of rides) donkey.visible = id !== mounted && donkey.position.distanceToSquared(p) < 30 ** 2;
    } };
  }

  function makePathPlay(scene, world, models, reduced, open) {
    const group = new T.Group();
    scene.add(group);
    const animals = [];
    const games = [];
    const markers = [];
    for (const play of world.placesToPlay) {
      const [x, z] = play.pos;
      const y = world.height(x, z);
      if (play.type === 'pigeons' || play.type === 'chickens') {
        const flock = new T.Group();
        flock.position.set(x, y, z);
        const flying = play.type === 'pigeons';
        const birds = Array.from({ length: flying ? 4 : 2 }, (_, i) => {
          const bird = models.animal(flying ? '비둘기' : '닭');
          const home = new T.Vector3((i - 1) * .45, 0, Math.sin(i * 2.4) * .48);
          bird.position.copy(home);
          bird.rotation.y = i * 2.3;
          flock.add(bird);
          return { bird, home };
        });
        flock.userData.drawPriority = 8;
        group.add(flock);
        animals.push({ flock, birds, flying, start: null, direction: 0 });
      } else if (play.type === 'bush') {
        markers.push({ id: 'path/bush', type: 'bush', pos: play.pos, title: '길가 수풀', symbol: '✋', pathPlay: true });
      } else if (play.type === 'game') {
        const circle = new T.Group();
        circle.position.set(x, y, z - .9);
        const rug = new T.Mesh(new T.CircleGeometry(1.06, 9).rotateX(-Math.PI / 2), mat('#bc9576'));
        rug.position.y = .04; circle.add(rug);
        const children = [-1, 1].map((side, i) => {
          const { actor, arm } = models.person('마을 아이', 4 + i, true);
          actor.position.set(side * .77, world.height(x + side * .77, z - .95) - y, -.05);
          actor.rotation.y = -side * Math.PI / 2;
          actor.userData.gait.rig.position.y = -.43;
          actor.userData.gait.feet.forEach(foot => { foot.position.z = .36; });
          circle.add(actor);
          return arm;
        });
        const pebbleShape = new T.IcosahedronGeometry(.092, 0);
        for (let i = 0; i < 4; i++) {
          const pebble = new T.Mesh(pebbleShape, mat(i % 2 ? '#9caca0' : '#e3caac'));
          pebble.position.set(-.22 + (i % 2) * .31, .13, -.21 + Math.floor(i / 2) * .27);
          circle.add(pebble);
        }
        const tossed = new T.Mesh(pebbleShape, mat('#d7ae8c'));
        circle.add(tossed);
        const seat = new T.Mesh(new T.BoxGeometry(1.45, .30, .43), mat('#8a7467'));
        seat.position.set(0, .15, 1.71); circle.add(seat);
        circle.userData.drawPriority = 12;
        group.add(circle);
        markers.push({ id: 'path/game', type: 'look', pos: play.pos, quiet: true, title: '아이들의 공기놀이', symbol: '👀', pathPlay: true });
        games.push({ circle, children, tossed });
      }
    }
    function update(p, now, t) {
      for (const { circle, children, tossed } of games) {
        circle.visible = circle.position.distanceToSquared(p) < 18 ** 2;
        if (!circle.visible) continue;
        const beat = reduced ? .25 : (t / 1.9) % 1;
        const side = Math.floor(t / 1.9) % 2 ? -1 : 1;
        tossed.position.set(side * (.42 - beat * .25), .14 + Math.sin(beat * Math.PI) * .73, 0);
        children.forEach((arm, i) => { arm.rotation.x = side === (i ? 1 : -1) ? -.35 - Math.sin(beat * Math.PI) : -.43; });
      }
      for (const animal of animals) {
        const { flock, birds, flying } = animal;
        const dist = Math.hypot(flock.position.x - p.x, flock.position.z - p.z);
        flock.visible = dist < 23;
        if (reduced || !flock.visible) continue;
        if (animal.start === null && dist < 2.85) {
          animal.start = now;
          const away = Math.atan2(flock.position.x - p.x, flock.position.z - p.z);
          animal.direction = away;
          if (!flying) {
            const alternatives = [0, .68, -.68, 1.35, -1.35, Math.PI].map(turn => away + turn);
            animal.direction = alternatives.find(angle => birds.every(({ home }, i) => {
              const heading = angle + (i - 1) * .33;
              return [.6, 1.3, 2.15].every(step => open(flock.position.x + home.x + Math.sin(heading) * step,
                flock.position.z + home.z + Math.cos(heading) * step));
            })) ?? away;
          }
        }
        const age = animal.start === null ? 0 : (now - animal.start) / 1000;
        if (age > 4.5 && dist > 8) animal.start = null;
        birds.forEach(({ bird, home }, i) => {
          const step = Math.max(0, age - i * .09);
          const direction = animal.direction + (i - 1) * .33;
          const distance = flying ? step * 2.4 : Math.min(step, 1.38) * 1.6;
          const x = home.x + Math.sin(direction) * distance, z = home.z + Math.cos(direction) * distance;
          if (!step || open(flock.position.x + x, flock.position.z + z)) {
            bird.position.set(x, world.height(flock.position.x + x, flock.position.z + z) - flock.position.y, z);
          }
          bird.visible = !flying || step < 3.2;
          if (step) {
            bird.rotation.y = direction;
            if (flying) {
              bird.position.y = step * 1.55 + home.y;
              bird.children.forEach((wing, j) => { if (j) wing.rotation.z = Math.sin(t * 19) * (j % 2 ? -1 : 1) * .55; });
            } else if (step < 1.38) bird.position.y += Math.abs(Math.sin(t * 19)) * .095;
          }
        });
      }
    }
    return { markers, update, animals };
  }

  function explorePath(from, to, open, edge = EXPLORE_EDGE, bounds = null) {
    const d = edge > EXPLORE_EDGE ? .58 : .43;
    const [left, top, right, bottom] = bounds || [-edge, -edge, edge, edge];
    const width = Math.floor((right - left) / d) + 1, height = Math.floor((bottom - top) / d) + 1;
    const point = (ix, iz) => [ix * d + left, iz * d + top];
    const col = x => clamp(Math.round((x - left) / d), 0, width - 1);
    const row = z => clamp(Math.round((z - top) / d), 0, height - 1);
    const line = (a, b) => {
      const n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / (d * .52));
      for (let i = 1; i <= n; i++) if (!open(lerp(a[0], b[0], i / n), lerp(a[1], b[1], i / n))) return false;
      return true;
    };
    if (line(from, to)) return [to];
    const source = row(from[1]) * width + col(from[0]), queue = [source];
    const seen = new Int32Array(width * height).fill(-1);
    const neighbors = [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, 1], [-1, 1], [1, -1]];
    seen[source] = source;
    let best = source, bestDist = Infinity;
    for (let i = 0; i < queue.length; i++) {
      const here = queue[i], ix = here % width, iz = Math.floor(here / width), a = here === source ? from : point(ix, iz);
      const distance = Math.hypot(a[0] - to[0], a[1] - to[1]);
      if (distance < bestDist) { best = here; bestDist = distance; }
      if (open(...to) && distance < d * 1.6 && line(a, to)) { best = here; break; }
      for (const [dx, dz] of neighbors) {
        const x = ix + dx, z = iz + dz, next = z * width + x;
        if (x < 0 || z < 0 || x >= width || z >= height || seen[next] !== -1 || !line(a, point(x, z))) continue;
        seen[next] = here; queue.push(next);
      }
    }
    const route = line(point(best % width, Math.floor(best / width)), to) && open(...to) ? [to] : [];
    for (let p = best; p !== source; p = seen[p]) route.push(point(p % width, Math.floor(p / width)));
    route.reverse();
    const result = [];
    for (let i = 0; i < route.length;) {
      const anchor = result.at(-1) || from;
      let furthest = route.length - 1;
      while (furthest > i && !line(anchor, route[furthest])) furthest--;
      result.push(route[furthest]); i = furthest + 1;
    }
    return result;
  }

  function buildDiscoverProp(prop, material, models) {
    if (prop === 'donkey' && models) return models.animal('나귀');
    if (prop === 'doves' && models) {
      const g = new T.Group();
      for (const [dx, dz, rot] of [[-.22, .08, .4], [.22, -.06, -.6]]) {
        const b = models.animal('비둘기');
        b.position.set(dx, 0, dz); b.rotation.y = rot; g.add(b);
      }
      return g;
    }
    const cube = new T.BoxGeometry(), cyl = new T.CylinderGeometry(.5, .5, 1, 8), ball = new T.IcosahedronGeometry(.5, 0);
    const parts = [];
    const add = (shape, color, ...tf) => {
      const geo = place(shape, ...tf), rgb = new T.Color(color);
      const colors = new Float32Array(geo.attributes.position.count * 3);
      for (let i = 0; i < colors.length; i += 3) colors.set([rgb.r, rgb.g, rgb.b], i);
      geo.setAttribute('color', new T.BufferAttribute(colors, 3));
      parts.push(geo);
    };
    if (prop === 'millstone') {
      add(cyl, '#8f8786', 0, .14, 0, .92, .26, .92);
      add(cyl, '#aba29c', 0, .38, 0, .86, .22, .86);
      add(cyl, '#7d563c', .26, .58, .08, .09, .28, .09);
      add(cyl, '#52494a', 0, .5, 0, .2, .04, .2);
    } else if (prop === 'oven') {
      add(cyl, '#b57856', 0, .34, 0, .94, .68, .94);
      add(ball, '#c48660', 0, .64, 0, .92, .48, .92);
      add(cube, '#352226', 0, .28, .42, .34, .34, .18);
      add(ball, '#ffaa44', 0, .22, .39, .24, .18, .16);
    } else if (prop === 'lamp') {
      add(cyl, '#8c664a', 0, .28, 0, .22, .56, .22);
      add(cyl, '#c4865a', 0, .58, 0, .48, .12, .42);
      add(ball, '#ffd670', .12, .72, 0, .18, .28, .18);
    } else if (prop === 'incense') {
      add(cube, '#b58d52', 0, .45, 0, .68, .9, .68);
      add(cube, '#e3be72', 0, .92, 0, .78, .1, .78);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(cube, '#f0cc7a', sx * .34, 1.04, sz * .34, .1, .18, .1);
      add(ball, '#ff9a3d', 0, 1.0, 0, .34, .14, .34);
    } else if (prop === 'menorah') {
      add(cyl, '#d9ab50', 0, .12, 0, .54, .16, .54);
      add(cyl, '#f2c86b', 0, .72, 0, .1, 1.15, .1);
      for (const sx of [-1, 1]) {
        add(cube, '#f2c86b', sx * .22, .68, 0, .44, .06, .06);
        add(cube, '#f2c86b', sx * .42, .94, 0, .06, .52, .06);
        add(cube, '#f2c86b', sx * .28, .98, 0, .06, .42, .06);
        add(cube, '#f2c86b', sx * .15, 1.04, 0, .06, .3, .06);
      }
      for (const x of [-.42, -.28, -.15, 0, .15, .28, .42]) add(ball, '#ffea94', x, 1.28, 0, .09, .16, .09);
    } else if (prop === 'trumpet') {
      add(cube, '#7b5842', 0, .34, 0, .46, .68, .34);
      add(cyl, '#e8c468', 0, .78, 0, .1, .84, .1, 0, 0, 1.28);
      add(cyl, '#f7d982', .38, .9, 0, .28, .22, .28, 0, 0, 1.28);
    } else if (prop === 'cradle') {
      add(cube, '#8b5e40', 0, .28, 0, .92, .34, .54);
      add(cube, '#e8dac2', 0, .44, 0, .78, .08, .42);
      for (const sx of [-.34, .34]) add(cube, '#6b452d', sx, .08, 0, .08, .12, .66);
    } else if (prop === 'tablet') {
      add(cube, '#7a523b', 0, .38, 0, .54, .74, .22);
      add(cube, '#9e6d4b', 0, .78, .06, .52, .42, .08, -.32);
      add(cube, '#e8d7a8', 0, .78, .1, .4, .3, .04, -.32);
      add(cyl, '#4a3228', .24, .82, .12, .04, .34, .04, 0, 0, .35);
    } else if (prop === 'jar' || prop === 'water') {
      add(ball, '#b56e50', 0, .38, 0, .56, .68, .56);
      add(cyl, '#c97e5c', 0, .76, 0, .26, .22, .26);
      add(cyl, '#528090', 0, .86, 0, .2, .04, .2);
    } else if (prop === 'well') {
      add(cyl, '#7d6c64', 0, .26, 0, .74, .5, .74);
      add(cyl, '#548594', 0, .52, 0, .56, .04, .56);
      add(cyl, '#8c5e3c', .05, .74, 0, .3, .32, .3);
      add(cyl, '#d9bf8c', .05, 1.02, 0, .05, .36, .05);
    } else if (prop === 'winepress') {
      add(cube, '#8f847c', 0, .2, 0, 1.15, .4, 1.15);
      add(cube, '#5c2d5e', 0, .38, 0, .88, .12, .88);
      for (const [dx, dz] of [[-.2, -.15], [.18, .12], [0, .22], [-.15, .18]]) add(ball, '#78347c', dx, .48, dz, .22, .18, .22);
    } else if (prop === 'olivepress') {
      add(cyl, '#9c9288', 0, .22, 0, 1.12, .44, 1.12);
      add(cyl, '#6f7354', 0, .44, 0, .84, .08, .84);
      add(cyl, '#b5aba0', .04, .66, 0, .54, .22, .54, Math.PI / 2);
      add(cube, '#7b553a', 0, .88, 0, 1.15, .1, .1);
    } else if (prop === 'carpenter') {
      for (const sx of [-.38, .38]) add(cube, '#724c34', sx, .32, 0, .14, .64, .46);
      add(cube, '#b58454', 0, .68, 0, 1.05, .12, .56);
      add(cube, '#d9b583', -.08, .79, 0, .72, .08, .24);
      add(cube, '#6b4228', .18, .88, 0, .24, .12, .14);
    } else if (prop === 'loom') {
      for (const sx of [-.42, .42]) add(cube, '#7b5338', sx, .65, 0, .1, 1.3, .1);
      add(cube, '#7b5338', 0, 1.24, 0, .96, .1, .1);
      add(cube, '#7b5338', 0, .22, 0, .96, .1, .1);
      add(cube, '#e3d0ad', 0, .72, 0, .68, .78, .05);
      add(cube, '#b55f5c', 0, .62, .03, .68, .18, .04);
    } else if (prop === 'swaddle') {
      add(cube, '#7b553b', 0, .28, 0, .82, .56, .54);
      add(ball, '#f2e6cf', 0, .64, 0, .62, .28, .38);
      add(cube, '#d9b88c', 0, .65, 0, .22, .3, .42);
    } else if (prop === 'flowers') {
      add(cyl, '#5c7c48', 0, .06, 0, .9, .12, .9);
      for (const [dx, dz, s] of [[-.24, .1, .22], [.22, -.12, .25], [0, .22, .2], [-.1, -.22, .21], [.16, .18, .19]]) {
        add(cyl, '#4d7340', dx, .22, dz, .04, .32, .04);
        add(ball, '#db4848', dx, .4, dz, s, s * .8, s);
      }
    } else if (prop === 'fig') {
      add(cyl, '#6e4c36', 0, .55, 0, .2, 1.1, .2);
      for (const [dx, dy, dz, s] of [[0, 1.15, 0, .95], [-.35, .95, .2, .68], [.36, 1.0, -.15, .72]]) add(ball, '#547a44', dx, dy, dz, s, s * .72, s);
    } else if (prop === 'milestone') {
      add(cube, '#9c9288', 0, .14, 0, .68, .28, .68);
      add(cyl, '#b5aba0', 0, .74, 0, .44, 1.0, .44);
      add(cube, '#695e56', 0, .86, .22, .26, .24, .03);
    } else if (prop === 'pack') {
      add(ball, '#8c563a', -.16, .24, 0, .44, .34, .32);
      add(cyl, '#b08b64', .22, .2, .08, .34, .38, .34, 0, 0, Math.PI / 2);
      add(cyl, '#6b4730', -.08, .66, -.12, .06, 1.3, .06, .12, 0, -.25);
    } else if (prop === 'linen') {
      add(cube, '#7b553b', 0, .36, 0, .72, .72, .48);
      add(cube, '#f7f3ea', 0, .78, 0, .6, .18, .38);
      add(cube, '#dfd7c5', 0, .88, 0, .44, .06, .34);
    } else if (prop === 'scroll') {
      add(cube, '#7b553b', 0, .4, 0, .58, .8, .44);
      add(cube, '#f0dfc0', 0, .86, .04, .54, .36, .06, -.45);
      for (const sx of [-.28, .28]) add(cyl, '#a87846', sx, .86, .04, .09, .42, .09, -.45);
    } else if (prop === 'coins') {
      add(cube, '#7b553b', 0, .38, 0, .92, .76, .58);
      for (const [dx, dz, h] of [[-.22, .06, .18], [0, -.04, .24], [.22, .08, .14]]) add(cyl, '#d7dde6', dx, .76 + h / 2, dz, .18, h, .18);
    } else if (prop === 'warningStone') {
      add(cube, '#86776f', 0, .14, 0, 1.10, .28, .61);
      add(cube, '#c3b4a4', 0, .63, 0, .91, .73, .20);
      for (let i = 0; i < 5; i++) {
        for (let j = 0; j < 7; j++) add(cube, '#87776b', -.324 + j * .106, .42 + i * .105, .109,
          .036 + ((i + j * 2) % 3) * .012, .027, .023, 0, 0, (j % 3 - 1) * .28);
      }
    } else if (prop === 'sheepGate') {
      for (const x of [-.44, .44]) {
        add(cube, '#c1ad96', x, .61, 0, .23, 1.2, .40);
        add(cube, '#ded0b4', x, 1.27, 0, .32, .16, .46);
      }
      add(cube, '#b6a18e', 0, 1.06, 0, 1.08, .22, .35);
      add(cube, '#a95350', -.15, 1.43, 0, .51, .22, .06, 0, 0, -.12);
    } else if (prop === 'bethesda') {
      add(cube, '#55808f', 0, .16, 0, 1.05, .17, .65);
      for (const z of [-.36, 0, .36]) add(cube, '#cebfa8', 0, .38, z, 1.15, .14, .10);
      for (const x of [-.51, .51]) add(cube, '#cebfa8', x, .38, 0, .10, .14, .81);
    } else if (prop === 'mikveh') {
      add(cube, '#b0a498', 0, .16, 0, 1.25, .32, 1.15);
      add(cube, '#4d92a6', 0, .28, 0, .96, .12, .86);
      add(cube, '#c9bfb0', -.38, .28, .26, .28, .14, .42);
    } else if (prop === 'yoke') {
      for (const sx of [-.42, .42]) add(cube, '#6b4730', sx, .36, 0, .1, .72, .24);
      add(cube, '#9e6b43', 0, .74, 0, 1.18, .14, .18);
      for (const sx of [-.32, .32]) {
        add(ball, '#b58052', sx, .82, 0, .3, .18, .22);
        for (const dx of [-.12, .12]) add(cyl, '#d4a977', sx + dx, .56, 0, .06, .38, .06);
        add(cube, '#c49664', sx, .38, 0, .28, .07, .12);
      }
      add(cyl, '#594d48', 0, .62, .06, .14, .08, .14, Math.PI / 2);
    } else if (prop === 'stonejar') {
      add(cube, '#9e968c', 0, .1, 0, .58, .2, .58);
      add(ball, '#d4ccc0', 0, .48, 0, .66, .66, .66);
      add(cyl, '#e3dcd0', 0, .86, 0, .46, .18, .46);
      for (const sx of [-.34, .34]) add(cube, '#bfb6aa', sx, .56, 0, .08, .26, .12);
      add(cyl, '#5a8f9e', 0, .94, 0, .36, .04, .36);
    } else if (prop === 'village') {
      add(cube, '#9c8e7e', 0, .12, 0, 1.18, .24, 1.02);
      add(cube, '#c9a685', -.24, .44, -.08, .5, .42, .46);
      add(cube, '#8f7564', -.24, .67, -.08, .54, .06, .5);
      add(cube, '#4a352c', -.24, .35, .16, .14, .22, .04);
      add(cube, '#dfd0bc', .26, .5, .06, .46, .54, .48);
      add(cube, '#8f7564', .26, .79, .06, .5, .06, .52);
      add(cube, '#ffcb74', .26, .56, .31, .14, .14, .04);
      add(cyl, '#6e4c36', -.36, .4, .28, .08, .34, .08);
      add(ball, '#5c7a4e', -.36, .66, .28, .34, .26, .34);
    } else if (prop === 'feast') {
      for (const sx of [-.46, .46]) for (const sz of [-.24, .24]) add(cube, '#6b452d', sx, .2, sz, .1, .4, .1);
      add(cube, '#8c5a3c', 0, .43, 0, 1.16, .09, .74);
      add(cube, '#b84842', 0, .48, 0, 1.04, .04, .48);
      add(cyl, '#c78863', 0, .53, 0, .44, .08, .44);
      add(ball, '#e6b86e', -.08, .59, .04, .22, .12, .22);
      add(ball, '#6e3568', .1, .6, -.05, .18, .14, .18);
      for (const sx of [-.36, .36]) add(cyl, '#a65d43', sx, .57, .12, .14, .16, .14);
    } else if (prop === 'gate') {
      add(cube, '#9e958b', 0, .1, 0, 1.22, .2, .84);
      for (const sx of [-.4, .4]) {
        add(cube, '#b8afa4', sx, .58, 0, .36, .84, .5);
        add(cube, '#cfc6ba', sx, 1.06, 0, .4, .14, .54);
      }
      add(cube, '#c4bab0', 0, .92, 0, .54, .22, .44);
      add(cube, '#8a8077', -.36, .26, .32, .38, .16, .22);
    } else if (prop === 'census') {
      add(cube, '#6e4730', 0, .38, 0, .96, .76, .58);
      add(cube, '#f2e3c2', -.04, .79, .02, .62, .05, .4);
      for (const sx of [-.34, .26]) add(cyl, '#a67244', sx, .82, .02, .08, .44, .08, Math.PI / 2);
      add(cyl, '#332d33', .34, .82, -.12, .12, .12, .12);
      add(cyl, '#c99e5a', .28, .9, -.06, .03, .28, .03, .3, 0, -.45);
    } else if (prop === 'soldier') {
      add(cube, '#8f867d', 0, .12, 0, .88, .24, .74);
      add(cube, '#b33434', -.16, .56, .12, .48, .68, .1, -.12);
      add(cube, '#ebb952', -.16, .56, .17, .16, .16, .04, -.12);
      add(ball, '#b8c2cc', .2, .66, -.04, .34, .32, .36);
      add(cube, '#cf3838', .2, .88, -.04, .1, .18, .34);
      add(cyl, '#6e4a32', .34, .7, -.16, .05, 1.08, .05);
      add(ball, '#d4dde6', .34, 1.26, -.16, .09, .2, .06);
    } else if (prop === 'guestroom') {
      add(cube, '#9e9388', -.06, .28, 0, .96, .56, .74);
      add(cube, '#3d302c', -.1, .22, .34, .44, .38, .12);
      add(cube, '#deb562', -.1, .12, .32, .38, .1, .16);
      add(cube, '#c99b78', -.06, .78, 0, .92, .46, .7);
      add(cube, '#ffd075', -.1, .8, .36, .24, .22, .05);
      add(cube, '#b08565', -.06, 1.05, 0, .98, .08, .76);
      for (let i = 0; i < 3; i++) add(cube, '#aba095', .48, .14 + i * .22, .18 - i * .16, .22, .22, .22);
    } else if (prop === 'door') {
      add(cube, '#b5aba0', 0, .58, 0, .96, 1.16, .3);
      add(cube, '#cfc5ba', 0, 1.18, 0, 1.04, .12, .36);
      add(cube, '#6b432c', 0, .52, .06, .56, .96, .22);
      add(cube, '#363036', 0, .74, .18, .48, .06, .04);
      add(cube, '#363036', 0, .34, .18, .48, .06, .04);
      add(cyl, '#d9a84e', .14, .54, .19, .1, .1, .04, Math.PI / 2);
      add(ball, '#ffcb6b', .36, .82, .18, .14, .18, .14);
    } else if (prop === 'david') {
      add(cube, '#9c9288', 0, .14, 0, .96, .28, .86);
      add(cube, '#b5aba0', 0, .42, 0, .72, .3, .64);
      add(cyl, '#cfc5ba', 0, .76, 0, .48, .44, .48);
      add(cyl, '#f2c456', 0, 1.04, 0, .36, .14, .36);
      for (let i = 0; i < 4; i++) {
        const a = i * Math.PI / 2;
        add(cube, '#ffd86b', Math.cos(a) * .15, 1.15, Math.sin(a) * .15, .09, .12, .09);
      }
    } else if (prop === 'sheepfold') {
      add(cyl, '#9e8762', 0, .06, 0, 1.08, .12, 1.08);
      for (let i = 0; i < 9; i++) {
        const a = -2.35 + i * .58;
        add(cube, i % 2 ? '#9c9288' : '#b5aba0', Math.sin(a) * .44, .26, Math.cos(a) * .44, .28, .36, .22, 0, a);
      }
      add(cyl, '#784e32', 0, .18, .44, .06, .58, .06, 0, 0, Math.PI / 2);
      add(ball, '#f5ebd8', -.08, .24, -.06, .28, .22, .34);
    } else if (prop === 'staff') {
      add(ball, '#8f867d', 0, .2, 0, .68, .36, .56);
      add(cyl, '#8c5c3a', -.1, .66, .04, .06, 1.12, .06, 0, 0, -.14);
      add(cube, '#a36e46', -.02, 1.2, .04, .24, .08, .08);
      add(cube, '#a36e46', .08, 1.12, .04, .08, .16, .08);
      add(cyl, '#5e3b26', .16, .5, -.04, .09, .78, .09, 0, 0, .22);
      add(ball, '#4a2e1d', .24, .86, -.04, .16, .16, .16);
    } else if (prop === 'sling') {
      add(cube, '#948b82', 0, .2, 0, .86, .4, .72);
      add(cube, '#824e32', -.08, .44, .04, .34, .07, .22, 0, .3);
      add(cyl, '#c9a675', -.26, .44, -.08, .04, .38, .04, 0, .4, Math.PI / 2);
      add(cyl, '#c9a675', .12, .44, .16, .04, .38, .04, 0, -.5, Math.PI / 2);
      for (const [dx, dz, c] of [[-.06, .04, '#c4beb6'], [.2, -.12, '#aba49c'], [.24, .08, '#cfc9c0']]) {
        add(ball, c, dx, .5, dz, .16, .14, .16);
      }
    } else if (prop === 'campfire') {
      for (let i = 0; i < 8; i++) {
        const a = i * Math.PI / 4;
        add(ball, '#756e6a', Math.cos(a) * .4, .13, Math.sin(a) * .4, .22, .2, .22);
      }
      add(cyl, '#69412b', 0, .2, 0, .1, .74, .1, .3, .5, 1.25);
      add(cyl, '#7a4d33', 0, .22, 0, .1, .74, .1, -.3, -.6, 1.25);
      add(ball, '#e05528', 0, .28, 0, .42, .18, .42);
      add(ball, '#ff8f29', 0, .48, 0, .34, .42, .34);
      add(ball, '#ffd875', .04, .66, -.02, .2, .32, .2);
    } else if (prop === 'lamb') {
      add(cube, '#9e5b48', 0, .09, 0, .84, .18, .66);
      add(cube, '#e8d7bd', 0, .19, 0, .7, .05, .54);
      add(ball, '#f7efe0', -.04, .38, -.02, .46, .34, .54);
      add(ball, '#f7efe0', -.04, .5, -.08, .36, .26, .38);
      add(ball, '#d9bea2', .02, .52, .22, .22, .22, .26);
      for (const sx of [-.14, .16]) add(cube, '#e3b0a6', sx, .53, .18, .12, .06, .08, 0, 0, sx * -1.2);
    } else if (prop === 'manger') {
      for (const sx of [-.36, .36]) add(cube, '#8f857c', sx, .2, 0, .18, .4, .56);
      add(cube, '#b8aea2', 0, .42, 0, .98, .28, .62);
      add(cube, '#dfb760', 0, .57, 0, .84, .1, .48);
      add(ball, '#f7f2e6', 0, .66, 0, .52, .2, .32);
      add(ball, '#e0b48d', .14, .7, 0, .16, .15, .16);
    } else if (prop === 'cave') {
      add(cube, '#756d65', 0, .1, 0, 1.18, .2, .9);
      add(ball, '#8f867d', -.36, .52, -.06, .52, .78, .68);
      add(ball, '#a89e94', .36, .52, -.06, .52, .78, .68);
      add(ball, '#9c9288', 0, .86, -.06, .88, .44, .68);
      add(cube, '#362c28', 0, .46, -.12, .56, .56, .36);
      add(cube, '#d9b15f', 0, .22, .12, .52, .08, .38);
      add(ball, '#ffcb6e', 0, .58, .04, .18, .22, .18);
    } else if (prop === 'oxdonkey') {
      add(cube, '#c9a259', 0, .07, 0, 1.16, .14, .82);
      add(ball, '#8c4f36', -.28, .44, -.04, .42, .38, .58);
      add(ball, '#7a432d', -.26, .62, .22, .26, .24, .28);
      for (const sx of [-.38, -.14]) add(cyl, '#e3d3b6', sx, .76, .22, .04, .18, .04, 0, 0, (sx + .26) * 2.2);
      add(ball, '#8f8580', .28, .42, -.04, .38, .36, .54);
      add(ball, '#cfc2b4', .26, .58, .22, .22, .22, .26);
      for (const sx of [.18, .34]) add(cube, '#756b66', sx, .78, .18, .06, .24, .08);
    } else if (prop === 'palace') {
      add(cube, '#d0b58b', 0, .43, 0, .84, .76, .54);
      for (const x of [-.46, .46]) {
        add(cube, '#c7a87a', x, .65, -.04, .29, 1.23, .57);
        add(cube, '#e4c69b', x, 1.26, -.04, .36, .13, .63);
      }
      add(cube, '#653f45', 0, .36, .28, .33, .54, .045);
      add(cube, '#d4a95f', 0, .65, .31, .51, .07, .11);
    } else if (prop === 'wadi' || prop === 'wilderness-road' || prop === 'tabor' || prop === 'lake') {
      const green = prop === 'tabor' || prop === 'lake';
      add(cube, green ? '#758261' : '#b29370', 0, .11, 0, 1.13, .22, .89);
      if (prop === 'tabor') add(ball, '#83966b', .07, .31, -.05, .95, .61, .8);
      else if (prop === 'lake') {
        add(cyl, '#6499a7', 0, .235, 0, 1.02, .03, .73);
        add(ball, '#755343', .06, .30, .05, .34, .12, .12);
        add(cube, '#e8cfad', .07, .42, .05, .044, .30, .04);
      } else {
        for (const x of [-.38, .38]) add(ball, '#d3ba90', x, .33, -.15, .39, .42, .54, 0, x);
        for (const z of [-.27, 0, .25]) add(cube, '#c5a57c', z * .35, .237, z, .26, .028, .33, 0, .23);
      }
    } else if (prop === 'camel-coat') {
      add(cube, '#73513c', 0, .47, 0, .07, .94, .08);
      add(cube, '#ab8966', 0, .59, 0, .56, .73, .20);
      for (const x of [-.36, .36]) add(cube, '#b49370', x, .64, .01, .22, .55, .18, 0, 0, x * .85);
      add(cube, '#6a4732', 0, .48, .11, .58, .085, .032);
      add(cube, '#bd925e', .06, .48, .131, .10, .10, .028);
    } else if (prop === 'wild-honey') {
      add(ball, '#a88466', 0, .14, 0, 1.02, .26, .72);
      for (const x of [-.20, .04, .26]) add(cyl, '#d49b45', x, .30, -.05, .23, .102, .23, 0, x);
      add(ball, '#83794d', -.26, .31, .23, .3, .10, .12, 0, .28);
      for (const z of [.17, .31]) add(cyl, '#766343', -.27, .31, z, .025, .23, .025, Math.PI / 2, 0, -.67);
    } else if (prop === 'winnow') {
      add(cyl, '#a87c4d', 0, .27, 0, .95, .23, .71, .12);
      add(cyl, '#cba966', 0, .40, 0, .86, .038, .62, .12);
      for (const x of [-.28, -.09, .10, .27]) add(ball, '#e7bd75', x, .43, Math.sin(x * 6) * .14, .12, .04, .09);
    } else if (prop === 'net') {
      add(cube, '#6d5344', 0, .54, -.06, 1.21, .10, .10);
      for (const side of [-1, 1]) {
        add(cube, '#8d6c50', side * .53, .255, -.07, .095, .51, .11);
        for (let x = -.40; x <= .49; x += .135) {
          add(cube, '#d0b68d', x, .30, .05, .024, .53, .023, -.38, 0, side * .32);
        }
      }
    } else if (prop === 'vine') {
      add(cube, '#735442', 0, .57, 0, .12, 1.14, .11);
      for (const side of [-1, 1]) {
        add(ball, '#788754', side * .32, .82, .04, .48, .34, .36, 0, side);
        for (let i = 0; i < 6; i++) add(ball, '#726281', side * (.26 + i % 3 * .066), .64 - Math.floor(i / 3) * .074, .24, .115, .10, .11);
      }
    } else if (prop === 'tomb') {
      add(cube, '#bcaa8b', 0, .35, 0, .96, .7, .75);
      add(cyl, '#dcc9a7', 0, .72, 0, 1.03, .13, .83);
      add(ball, '#d2bb97', 0, .75, 0, 1.1, .77, .85);
      add(cube, '#57443c', 0, .3, .38, .22, .42, .045);
    } else if (prop === 'watchtower') {
      add(cube, '#baa584', 0, .58, 0, .67, 1.16, .63);
      add(cube, '#705750', 0, .3, .32, .19, .37, .05);
      for (const x of [-.28, 0, .28]) for (const z of [-.27, .27]) {
        add(cube, '#ded0ae', x, 1.19, z, .13, .2, .13);
      }
    } else if (prop === 'grain') {
      add(cube, '#987052', 0, .07, 0, .99, .14, .65);
      for (const x of [-.38, -.25, -.09, .08, .21, .36]) {
        add(cyl, '#ae8e47', x, .39, .02, .026, .62, .026, 0, 0, x * .73);
        add(ball, '#dbad59', x * .76, .69, .02, .115, .28, .105, 0, 0, x * .73);
      }
    } else if (prop === 'greatstar') {
      add(cube, '#8f7b6c', 0, .14, 0, .84, .28, .64);
      add(cube, '#b09a86', 0, .32, 0, .62, .12, .48);
      add(cyl, '#d9b45b', 0, .64, 0, .09, .56, .09);
      add(cube, '#ffe375', 0, 1.04, 0, .78, .16, .14);
      add(cube, '#ffe375', 0, 1.04, 0, .16, .78, .14);
      add(cube, '#ffc94d', 0, 1.04, 0, .54, .12, .12, 0, 0, Math.PI / 4);
      add(cube, '#ffc94d', 0, 1.04, 0, .12, .54, .12, 0, 0, Math.PI / 4);
      add(ball, '#fff6cc', 0, 1.04, 0, .26, .26, .22);
    } else if (prop === 'steps' || prop === 'terrace' || prop === 'brick' || prop === 'roof') {
      const c1 = prop === 'brick' ? '#b88563' : '#ada296';
      const c2 = prop === 'brick' ? '#9e6f52' : '#c7bcb0';
      add(cube, c1, 0, .14, .18, 1.0, .28, .42);
      add(cube, c2, 0, .38, -.06, 1.0, .28, .42);
      add(cube, c1, 0, .62, -.28, 1.0, .28, .42);
    } else {
      add(cube, '#baa898', 0, .16, 0, .74, .32, .74);
      add(cyl, '#cfc1b2', 0, .72, 0, .42, .86, .42);
      add(cube, '#e3d5c3', 0, 1.18, 0, .64, .16, .64);
    }
    const obj = merged(parts, material);
    parts.forEach(g => g.dispose());
    cube.dispose(); cyl.dispose(); ball.dispose();
    const wrap = new T.Group();
    wrap.add(obj);
    return wrap;
  }

  const ROOM_EDGE = 5.6;

  function addExploreShelter(scene, world, house) {
    const [x, doorZ] = house.pos, z = doorZ - 1.62, y = world.height(x, z), geometry = new T.BoxGeometry();
    const parts = [
      ['#ad8a71', x, y + 1.11, z, 3.4, 2.22, 2.6],
      ['#79615f', x, y + 2.23, z, 3.59, .24, 2.7],
      ['#594131', x, y + .85, z + 1.34, .82, 1.7, .13],
      ['#e8bd86', x - .97, y + 1.46, z + 1.33, .44, .40, .10]
    ];
    for (const [color, ...shape] of parts) scene.add(new T.Mesh(place(geometry, ...shape), mat(color)));
    for (const dx of [-1.05, 0, 1.05]) world.blocks.push([x + dx, z, 1.22]);
    geometry.dispose();
  }

  function interiorWorld(scene, room) {
    const models = adventureModels(), blocks = [], walls = [];
    const cave = room.id === 'house/shepherd-cave' || room.id === 'house/olive-cave';
    const stone = cave ? '#81706b' : room.style === 'stable' ? '#806458' : '#b18c6c';
    const timber = '#66443a', linen = '#966253', height = () => 0;
    const bounds = { x: ROOM_EDGE, z: 5.15 };
    const geometry = new T.BoxGeometry();
    function box(color, x, y, z, width, tall, depth, parent = scene) {
      const object = new T.Mesh(place(geometry, x, y, z, width, tall, depth), mat(color));
      parent.add(object);
      return object;
    }
    function wall(axis, side) {
      const group = new T.Group();
      walls.push({ axis, side, group });
      scene.add(group);
      return group;
    }
    const ground = box('#b18a70', 0, -.08, 0, 11.6, .16, 10.7);
    if (!cave) box(linen, 0, .016, -.75, 2.95, .035, 3.8);
    for (const side of [-1, 1]) {
      const x = side * (bounds.x + .14), group = wall('x', side);
      box(stone, x, 1.45, -2.97, .31, 2.9, 4.50, group);
      box(stone, x, 1.45, 2.97, .31, 2.9, 4.50, group);
      box(stone, x, .65, 0, .31, 1.3, 1.46, group);
      box(stone, x, 2.58, 0, .31, .65, 1.46, group);
      box('#e7b97d', x, 1.30, 0, .70, .12, 1.48, group);
    }
    const rearWall = wall('z', -1);
    box(stone, 0, 1.45, -bounds.z - .14, 11.8, 2.9, .30, rearWall);
    if (cave) {
      const boulder = new T.IcosahedronGeometry(1, 0);
      const surfaces = new Map([['#8c766c', []], ['#a08c7d', []]]);
      for (let i = 0; i < 13; i++) {
        const x = (i - 6) * .85, y = 1.62 + Math.cos(i * 1.61) * .70;
        surfaces.get(i % 2 ? '#8c766c' : '#a08c7d').push(place(boulder, x, y, -5.02, 1.12, 1.3, .66, .22, i));
      }
      addScenery(rearWall, surfaces, color => mat(color));
      boulder.dispose();
    }
    const doorway = wall('z', 1);
    for (const side of [-1, 1]) box(stone, side * 3.4, 1.45, bounds.z + .14, 4.95, 2.9, .30, doorway);
    box(stone, 0, 2.58, bounds.z + .14, 2.0, .65, .32, doorway);
    box(timber, 0, 1.11, bounds.z + .12, 1.7, 2.23, .18, doorway);
    if (room.style !== 'stable') for (const z of [-4.2]) box(timber, 0, 2.86, z, 11.45, .18, .14); // 위에서 내려다보는 카메라라 가운데 들보는 시야를 가려서 뒤쪽 하나만
    const workroom = room.style === 'workshop', stable = room.style === 'stable';
    const tableZ = stable ? -4.18 : workroom ? -1.65 : .20;
    box(timber, 0, workroom ? .86 : .51, tableZ, workroom ? 2.6 : 1.8, .18, .78);
    for (const x of [-.63, .63]) box(timber, x, workroom ? .39 : .21, tableZ, .14, workroom ? .78 : .42, .55);
    blocks.push([0, tableZ, .60]);
    for (const side of [-1, 1]) {
      box(timber, side * 4.62, 1.14, -4.85, 1.58, .15, .63);
      box(timber, side * 4.62, 1.70, -4.85, 1.58, .15, .63);
      const jar = new T.Mesh(new T.CylinderGeometry(.25, .32, .54, 8), mat(stable ? '#998053' : '#9d6549'));
      jar.position.set(side * 4.82, .30, 3.68); scene.add(jar);
      box('#cc9c71', side * 4.28, .075, 3.15, .80, .15, .52);
    }
    if (room.id === 'house/shepherd-cave') {
      for (const x of [-4.3, -3.2, 3.6]) {
        const sheep = models.animal('어린 양');
        sheep.position.set(x, .03, -2.5 - Math.sin(x) * .58);
        sheep.rotation.y = x * .32;
        scene.add(sheep);
      }
      box('#ae9064', -3.7, .09, -2.75, 2.7, .13, 2.15);
      box('#ae9064', 3.65, .09, -2.75, 2.4, .13, 2.10);
      for (const side of [-1, 1]) box(stone, side * 4.0, .34, -.7, 2.65, .69, .42);
    }
    if (room.id === 'house/olive-cave') {
      const disk = new T.CylinderGeometry(1, 1, .38, 16);
      const bed = new T.Mesh(disk, mat('#a89881'));
      bed.position.set(-2.9, .23, -1.15); scene.add(bed);
      const roller = new T.Mesh(disk, mat('#c0ae96'));
      roller.position.set(-2.9, .82, -1.15); roller.scale.setScalar(.65); roller.rotation.z = Math.PI / 2; scene.add(roller);
      box(timber, -2.9, .84, -1.15, 2.25, .14, .12);
      blocks.push([-2.9, -1.15, .93]);
    }
    const crate = { x: 3.35, z: 2.15, halfX: .54, halfZ: .48, top: .46 };
    box(timber, crate.x, .23, crate.z, 1.08, .46, .96);
    for (const dx of [-.37, .37]) box('#bf9c75', crate.x + dx, .23, crate.z + .482, .11, .46, .04);
    const lamp = new T.Mesh(new T.ConeGeometry(.10, .20, 7), mat('#ffd588', { emissive: '#ff9724', ei: 2 }));
    lamp.position.set(0, workroom ? 1.09 : .74, tableZ); scene.add(lamp);
    const glow = new T.PointLight('#ffbb72', 6.4, 7.5, 2);
    glow.position.set(0, 1.65, tableZ); scene.add(glow);
    scene.add(new T.HemisphereLight('#ffe2be', '#836658', 2.02));
    const sun = new T.DirectionalLight('#c8d8e2', 1.4);
    sun.position.set(-5, 2.5, -1); scene.add(sun);
    scene.background = new T.Color('#2b2021');
    geometry.dispose();
    return {
      ground, height, blocks, models, walls, bounds, jumpSurfaces: [crate], residents: new Map(), features: new Map(), actors: [], birds: [], fx: [],
      walkable: (x, z) => Math.abs(x) <= bounds.x && Math.abs(z) <= bounds.z
    };
  }

  const landmarkDays = new Map();
  async function mountExplore(container, options, handlers = {}) {
    await load();
    const { sheep, layout = {}, room, region } = options;
    const adventure = room ? { spawn: [0, 2.55], crossings: [] } : options.adventure ||
      (options.discovery ? { spawn: [0, 6.2], crossings: [] } : null);
    const edge = room ? ROOM_EDGE : region ? Math.max(...region.bounds.map((size, i) => size + Math.abs(region.origin[i]))) : options.adventure ? ADVENTURE_EDGE : EXPLORE_EDGE;
    const seed = options.seed || hashStr(options.place || 'temple');
    const renderer = new T.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
    renderer.outputColorSpace = T.SRGBColorSpace;
    renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.46;
    const small = navigator.deviceMemory && navigator.deviceMemory < 4;
    const pixelRatio = Math.min(small ? 1 : 1.35, window.devicePixelRatio || 1);
    renderer.setPixelRatio(pixelRatio);
    const wrap = document.createElement('div');
    wrap.className = 'f3d-explore';
    const canvas = renderer.domElement;
    canvas.setAttribute('aria-label', '양을 이동할 3D 탐험 장소');
    const hud = document.createElement('div');
    hud.className = 'f3d-explore-labels';
    wrap.append(canvas, hud); container.append(wrap);

    const scene = new T.Scene(), camera = new T.PerspectiveCamera(53, 1, .1, region ? 160 : 105);
    if (region) scene.matrixWorldAutoUpdate = false; // renderScene updates scene matrices before the draw-call budget pass.
    const reduced = calm();
    const climate = room ? null : exploreClimate(options.place, layout.time, reduced);
    const protectedPoints = [options.spawn || adventure?.spawn || [0, 6.2],
      ...Object.values(adventure?.targets || {}).map(target => target.pos),
      ...(options.markers || []).map(marker => marker.pos), ...(options.houses || []).map(house => house.pos)].filter(Boolean);
    const world = room ? interiorWorld(scene, room) : region ? regionWorld(scene, options, climate, protectedPoints) : options.adventure ? adventureWorld(scene, seed, layout, adventure, climate, protectedPoints) :
      exploreWorld(scene, options.kit || options.place, seed, layout, climate, protectedPoints);
    if (climate?.weather === 'market' && region?.index !== 0) {
      const onZone = handlers.onZone;
      const marketSound = () => window.Sound?.ambience('모험 장터');
      marketSound();
      handlers = { ...handlers, onZone() { onZone?.(); marketSound(); } };
    }
    if (adventure && !world.models) {
      world.models = adventureModels();
      world.actors ??= []; world.residents ??= new Map(); world.features ??= new Map();
    }
    for (const house of options.houses || []) if (house.standAlone) addExploreShelter(scene, world, house);
    const guide = adventure && world.models.person('여행자', 2, true);
    const leader = guide?.actor;
    const spawn = options.spawn ?? adventure?.spawn ?? [0, 6.2];
    const azStart = adventure ? (options.place === '1-0' ? -.18 : options.place === '1-1' ? .28 : .14) : null;
    if (leader) {
      leader.position.set(spawn[0], world.height(...spawn), spawn[1]);
      leader.rotation.y = Math.PI;
      scene.add(leader);
    }
    let player = buildSheep(sheep.species, sheep.level, sheep.wear, seed, sheep.wool ?? 1);
    const sheepStart = adventure ? [clamp(spawn[0] + .66, -edge + .15, edge - .15), clamp(spawn[1] + 1.1, -edge + .15, edge - .15)] : spawn;
    player.position.set(sheepStart[0], world.height(...sheepStart), sheepStart[1]); player.rotation.y = Math.PI;
    scene.add(player);
    const target = new T.Vector3(0, .77, 5.0);
    const camPosition = new T.Vector3(), aim = new T.Vector3(), spot = new T.Vector3();
    const elementPos = new T.Vector3(), raycaster = new T.Raycaster(), pointerPos = new T.Vector2();
    const elements = new Map(), effectSprites = new Set();
    let clearSpots = [];
    const discoverPropMat = new T.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: .85 });
    const propAnims = new Map();
    let inspectState = null, sheepMood = null, lastNearbyId = '', scentEffect = null;
    const groundRing = new T.RingGeometry(.55, .66, 24).rotateX(-Math.PI / 2);
    const crystal = new T.OctahedronGeometry(.24);
    const lantern = glowSprite('#ffe1aa', 3, .65);
    lantern.visible = false;
    lantern.position.set(-.5, .82, .5); player.add(lantern);
    let carrying = '', carryLabel, kneeling = false, foundLamb;
    let seated = false, vista = null, vistaSince = 0, vistaBlend = 0;
    let fireStrength = world.campfire && climate?.time === 'night' ? .3 : 1;
    if (options.progress?.[options.place] === 'done') fireStrength = 1;
    function setCarry(symbol) {
      if (symbol === carrying) return;
      carrying = symbol;
      carryLabel?.remove();
      carryLabel = null;
      if (!symbol) return;
      carryLabel = document.createElement('span');
      carryLabel.className = 'f3d-explore-speech explore-cargo';
      carryLabel.textContent = symbol;
      hud.append(carryLabel);
    }
    function kneel(addWings = true) {
      if (addWings && !kneeling) {
        const dressed = buildSheep(sheep.species, sheep.level, { ...normalizeWear(sheep.wear), back: '금빛 천사 날개' }, seed, sheep.wool ?? 1);
        dressed.position.copy(player.position);
        player.removeFromParent(); disposeFigure(player);
        player = dressed; player.add(lantern); scene.add(player);
      }
      const newlyKnelt = !kneeling;
      kneeling = true;
      player.rotation.y = Math.PI;
      const u = player.userData;
      u.body.position.y = -.33;
      u.head.rotation.x = .17;
      legSwingExplore(u.legs, 0, 0, true);
      if (newlyKnelt) react('sheep', 'spark');
    }
    const goal = new T.Mesh(new T.RingGeometry(.23, .29, 18).rotateX(-Math.PI / 2), mat('#ffc880', { basic: true }));
    goal.visible = false; scene.add(goal);
    const azBase = azStart ?? ([-.18, .19, -.31, .25][layout.angle || 0] || 0);
    let az = azBase, azWant = azBase, activePointer, route = [], waitForTarget = null;
    let raf, lastFrame, stopped = false, reaction = null, talking, doveAt, followOrigin, markerWidth = 0, markerHeight = 0;
    let lastMetric = 0, frames = 0, frameTime = 0, sinceSlow = 0, resolution = pixelRatio, firstFrame = true;
    let peakCalls = 0, metrics = { fps: 0, calls: 0, triangles: 0, ratio: resolution };
    const enterDistance = adventure ? 1.48 : 1.2;
    const actionDistance = 2.15;
    const landmarks = world.landmarks || [];
    const witnessed = new Set();
    let landmark, revealAfter = performance.now() + 240, cinematic = false, revealHUD, revealVeil, revealName, skipReveal, lookUpUntil = 0;
    const sheepBeforeShot = new T.Vector3();
    if (landmarks.length) {
      revealHUD = document.createElement('div');
      revealHUD.className = 'explore-landmark';
      revealHUD.hidden = true;
      revealVeil = document.createElement('div');
      revealVeil.className = 'explore-landmark-veil';
      revealName = document.createElement('span');
      revealName.className = 'explore-landmark-title';
      revealName.setAttribute('aria-live', 'polite');
      skipReveal = document.createElement('button');
      skipReveal.type = 'button'; skipReveal.textContent = '건너뛰기';
      skipReveal.onclick = () => finishReveal(performance.now());
      revealHUD.append(revealVeil, revealName, skipReveal);
      wrap.append(revealHUD);
    }

    function finishReveal(now) {
      if (!landmark) return;
      const hadFocus = document.activeElement === skipReveal;
      landmark = null;
      cinematic = false;
      revealHUD.hidden = true;
      wrap.classList.remove('is-revealing');
      world.update?.(walkPosition().x, walkPosition().z);
      lookUpUntil = now + 700;
      if (hadFocus) wrap.querySelector('.adventure-stick')?.focus({ preventScroll: true });
    }

    function revealFrame(now, p) {
      if (!revealHUD) return;
      if (!landmark && now >= revealAfter && !held && !mounted && !crossing && !jump && !inspectState &&
          !activePointer && !joystick && handlers.canInteract?.() !== false) {
        const site = region.nearSite([p.x, p.z]);
        const show = landmarks.find(entry => !witnessed.has(entry.title) && entry.trigger(p.x, p.z, site));
        if (show) {
          witnessed.add(show.title);
          const day = window.Core?.nowKST().date || new Date().toISOString().slice(0, 10);
          const key = 'advent-landmark:' + (window.Core?.IS_TEST ? 'test:' : '') + show.title;
          let played = landmarkDays.get(key) === day;
          try {
            played ||= localStorage.getItem(key) === day;
            if (!played) localStorage.setItem(key, day);
          } catch { /* Storage can be unavailable in a private web view. */ }
          landmarkDays.set(key, day);
          if (!played) {
            landmark = { show, start: now };
            revealName.textContent = show.title;
            revealHUD.hidden = false;
            wrap.classList.add('is-revealing');
          }
        }
      }
      if (!landmark) return;
      const age = now - landmark.start, duration = reduced ? 1900 : 3520;
      if (age >= duration) return finishReveal(now);
      cinematic = age >= 220 && age < duration - 220;
      revealVeil.style.opacity = clamp(age < 440 ? 1 - Math.abs(age - 220) / 220 :
        age > duration - 440 ? 1 - Math.abs(age - (duration - 220)) / 220 : 0, 0, 1);
    }

    function useLandmarkCamera(now) {
      if (!cinematic || !landmark) return;
      const { show, start } = landmark, [x, z] = show.shot;
      const time = reduced ? .55 : clamp((now - start - 220) / 2940, 0, 1);
      const eased = time * time * (3 - 2 * time), baseline = world.height(x, z);
      const [lx, ly, lz] = show.look, yaw = Math.atan2(lx - x, lz - z);
      const push = eased * (show.push ?? 2.65);
      camera.position.set(x + Math.sin(yaw) * push, baseline + lerp(show.height, show.lowHeight ?? 1.65, eased), z + Math.cos(yaw) * push);
      camera.lookAt(lx, ly + (show.push == null ? .7 : .25) * eased, lz);
      camera.updateMatrixWorld();
    }
    const actionHUD = document.createElement('div');
    actionHUD.className = 'explore-action-hud';
    actionHUD.hidden = true;
    const actionButton = document.createElement('button');
    actionButton.type = 'button'; actionButton.className = 'explore-action';
    const switchAction = (label, title, offset) => {
      const button = document.createElement('button');
      button.type = 'button'; button.textContent = label;
      button.setAttribute('aria-label', title);
      button.onclick = () => {
        if (nearbyActions.length < 2) return;
        manualAction = true;
        const i = nearbyActions.findIndex(entry => entry.marker.id === chosenAction);
        chosenAction = nearbyActions[(Math.max(0, i) + offset + nearbyActions.length) % nearbyActions.length]?.marker.id;
        renderActions();
      };
      return button;
    };
    let nearbyActions = [], chosenAction = '', manualAction = false;
    const prevAction = switchAction('◀', '이전 행동', -1);
    const nextAction = switchAction('▶', '다음 행동', 1);
    actionHUD.append(prevAction, actionButton, nextAction);
    wrap.append(actionHUD);
    actionButton.onclick = () => activateMarker(chosenAction);

    function actionText(marker) {
      const title = marker.title.replace(/^✓\s*/, '');
      const verb = {
        look: '살펴보기', touch: '만져 보기', try: '해 보기', person: '말하기',
        verse: '읽기', photo: '사진 찍기', exit: '가기'
      }[marker.type] || '살펴보기';
      if (marker.discoverId === 'millstone') return '🛠 맷돌 돌려 보기';
      if (marker.id === 'path/bush') return '✋ 수풀 흔들어 보기';
      if (marker.id === 'path/game') return seated ? '👀 자리에서 일어나기' : '👀 공기놀이 옆에 앉기';
      if (marker.ride) return mounted ? '🫏 나귀에서 내리기' : '🫏 나귀 타기';
      if (marker.shortcut) return '🐑 담 넘기';
      if (marker.observe) return `👀 구경하기 · ${title}`;
      if (marker.type === 'person') return `💬 ${Core.josa(title, '과와')} ${verb}`;
      const icon = { look: '👀', touch: '✋', try: '🛠', person: '💬' }[marker.type] || marker.symbol;
      return `${icon} ${title} · ${verb}`;
    }

    function canActivate(entry, p = walkPosition()) {
      if (!entry || entry.marker.lit || entry.marker.type === 'house-door') return false;
      const { x, y, z } = entry.obj.position;
      return Math.hypot(x - p.x, z - p.z) <= actionDistance && Math.abs(y - p.y) < 1.4;
    }

    function activateMarker(id) {
      const entry = elements.get(id);
      if (stopped || landmark || handlers.canInteract?.() === false || !canActivate(entry)) return false;
      waitForTarget = null;
      route = []; goal.visible = false;
      leaderVel.set(0, 0);
      if (entry.marker.moving) followOrigin = entry.obj.position.clone();
      handlers.onReach?.(id);
      return true;
    }

    function renderActions() {
      const selected = nearbyActions.find(entry => entry.marker.id === chosenAction);
      actionHUD.hidden = !selected;
      prevAction.hidden = nextAction.hidden = nearbyActions.length < 2;
      if (!selected) return;
      const { marker } = selected;
      const text = actionText(marker);
      if (actionButton.textContent !== text) actionButton.textContent = text;
      actionButton.dataset.action = marker.id;
    }
    const footsteps = [], trail = [];
    let abilityEffect, waypoint, escort, joystick, displayedZone = -1, ceremony;
    const celebrationActors = [];
    let followTimer = 0, greeted = '', lastGreeting = -Infinity;
    let sheepSpeed = 0, leaderSpeed = 0, footIndex = 0;
    const leaderVel = new T.Vector2();
    let travel = 0, walking = false, nextStepSound = 0;
    const onGround = (x, z) => [x, world.height(x, z), z];
    const walkPosition = () => (leader || player).position;
    const life = region ? makeRegionalLife(scene, region, world, reduced) : null;
    let mounted = null, mountModel, held = false, carriedWordAt = 0, hoofDistance = 0;
    let sheepHop, crossing, jump, sheepJumps = [], lastHop, hopCount = 0, groundContact, jumpMovement = null;
    const surfaces = world.jumpSurfaces || [];
    const jumpFX = leader && new T.Points(new T.BufferGeometry().setAttribute(
      'position', new T.BufferAttribute(new Float32Array(36), 3).setUsage(T.DynamicDrawUsage)
    ), new T.PointsMaterial({ color: '#e2bc8c', size: .092, transparent: true, depthWrite: false }));
    if (jumpFX) {
      jumpFX.visible = false;
      jumpFX.frustumCulled = false;
      jumpFX.userData.drawPriority = 24;
      scene.add(jumpFX);
    }
    let landingEffect;
    function surfaceAt(x, z) {
      return surfaces.find(({ x: px, z: pz, halfX, halfZ }) => Math.abs(x - px) < halfX && Math.abs(z - pz) < halfZ);
    }
    function jumpLift(now) {
      if (!jump) return 0;
      const arc = clamp((now - jump.start - 85) / 500, 0, 1);
      return Math.max(0, Math.min(4 * .9 * arc * (1 - arc), (room ? 2.76 - 1.94 : Infinity) - (groundContact?.top || 0)));
    }
    function startJump() {
      if (!leader || stopped || landmark || jump || held || mounted || crossing || inspectState || handlers.canInteract?.() === false) return false;
      const now = performance.now(), p = walkPosition();
      seated = kneeling = false;
      hopCount = lastHop && now - lastHop.time < 4200 && Math.hypot(p.x - lastHop.x, p.z - lastHop.z) < .65 ? hopCount + 1 : 1;
      lastHop = { time: now, x: p.x, z: p.z };
      jump = { start: now, floor: p.y };
      const takeoff = now + 235;
      sheepJumps.push({ start: takeoff });
      if (hopCount === 3) {
        sheepJumps.push({ start: takeoff + 320 }, { start: takeoff + 640, heart: true });
        hopCount = 0;
      } else if (Math.random() < .17) sheepJumps.push({ start: takeoff + 320 });
      for (const animal of pathPlay?.animals || []) {
        const at = animal.flock.position;
        if (animal.flying && Math.hypot(p.x - at.x, p.z - at.z) < 4.2 && animal.start === null) {
          animal.start = now;
          animal.direction = Math.atan2(at.x - p.x, at.z - p.z);
        }
      }
      if ((!doveAt || now - doveAt > 3200) && world.birds.some(({ home }) => Math.hypot(home.x - p.x, home.z - p.z) < 4)) doveAt = now;
      if (!reduced) for (const resident of world.actors) {
        const { actor, animal, travel } = resident;
        if (animal !== '비둘기' || travel || !actor.visible) continue;
        const from = actor.position, dx = from.x - p.x, dz = from.z - p.z, distance = Math.hypot(dx, dz);
        if (distance < .15 || distance > 3.55) continue;
        const x = from.x + dx * 3.25 / distance, z = from.z + dz * 3.25 / distance;
        if (open(x, z)) resident.travel = { start: now, from: from.clone(), to: new T.Vector3(...onGround(x, z)), lift: 3.15 };
      }
      return true;
    }
    function jumpKey(event) {
      if (event.key === 'Escape' && landmark) { event.preventDefault(); finishReveal(performance.now()); return; }
      if (event.code !== 'Space' || event.defaultPrevented || event.repeat ||
          event.target.closest?.('button, input, textarea, select, [contenteditable], dialog, [role="button"]')) return;
      if (startJump()) event.preventDefault();
    }
    function jumpPose(now, p) {
      if (!jump) return;
      const age = now - jump.start, rig = leader.userData.gait.rig;
      const landing = age >= 585;
      if (landing && !jump.landed) {
        jump.landed = true;
        const splash = !groundContact && climate?.puddleCenters?.some(([x, z]) => ((p.x - x) / .84) ** 2 + ((p.z - z) / .47) ** 2 <= 1);
        handlers.onLand?.(splash);
        if (!reduced) {
          landingEffect = { start: now, x: p.x, z: p.z, y: p.y, splash };
          jumpFX.material.color.set(splash ? '#b4e5fa' : '#e2bc8c');
          jumpFX.visible = true;
        }
      }
      if (age >= 715) { jump = null; return; }
      const press = age < 85 ? Math.sin(Math.PI * age / 85) : landing ? Math.sin(Math.PI * (age - 585) / 130) : 0;
      rig.position.y += Math.max(0, jumpLift(now) - Math.max(0, p.y - jump.floor)) - (reduced ? .035 : .12) * press;
      rig.scale.y *= 1 - .075 * press;
    }
    function updateLandingEffect(now) {
      if (!landingEffect) return;
      const { start, x, z, y, splash } = landingEffect;
      const age = (now - start) / (splash ? 380 : 310);
      if (age >= 1) { jumpFX.visible = false; landingEffect = null; return; }
      const coordinates = jumpFX.geometry.attributes.position;
      for (let i = 0; i < coordinates.count; i++) {
        const angle = i * 2.4, distance = (.37 + .56 * age) * (.45 + (i % 5) * .16);
        coordinates.setXYZ(i, x + Math.cos(angle) * distance, y + .035 + Math.sin(Math.PI * age) * (splash ? .34 : .13) * (1 - i / 20),
          z + Math.sin(angle) * distance);
      }
      coordinates.needsUpdate = true;
      jumpFX.material.opacity = .74 * (1 - age);
    }
    const previewedShortcuts = new Set();
    const carryPoint = new T.Vector3();
    const jumpContents = new Set(['carpenter-plane', 'traveler-pack']);
    const storyShortcuts = region ? region.sites.flatMap(site => {
      const target = site.area?.adventure?.targets.jump;
      if (!target || !site.area.discover?.items.some(entry => entry.ability === 'jump' && jumpContents.has(entry.id))) return [];
      return [{ id: 'shortcut/' + site.episode, type: 'shortcut', title: '담 넘기', pos: site.translate(target.pos),
        symbol: '🐑', quiet: true, shortcut: true, episode: site.episode, featureId: site.markerId('jump') }];
    }) : [];
    const blockCells = region && new Map();
    const cellSize = 4;
    if (blockCells) for (const block of world.blocks) {
      const [x, z, r] = block, reach = r + .24;
      for (let i = Math.floor((x - reach) / cellSize); i <= Math.floor((x + reach) / cellSize); i++) {
        for (let j = Math.floor((z - reach) / cellSize); j <= Math.floor((z + reach) / cellSize); j++) {
          const key = `${i},${j}`;
          if (!blockCells.has(key)) blockCells.set(key, []);
          blockCells.get(key).push(block);
        }
      }
    }
    const open = (x, z) => {
      if (Math.abs(x) > edge || Math.abs(z) > edge || world.walkable?.(x, z) === false) return false;
      const surface = surfaceAt(x, z);
      if (surface && !surface.walkOn && jumpMovement?.surface !== surface &&
          (!jumpMovement || jumpMovement.height + .035 < surface.top || surface.top - jumpMovement.base > .701)) return false;
      const blocks = blockCells ? blockCells.get(`${Math.floor(x / cellSize)},${Math.floor(z / cellSize)}`) || [] : world.blocks;
      if (blocks.some(([ox, oz, r]) => (x - ox) ** 2 + (z - oz) ** 2 < (r + .24) ** 2)) return false;
      if (adventure) for (const [kind, feature] of world.features) {
        const featureKind = feature.userData.kind || kind;
        if (featureKind === 'shine' || feature.userData.cleared) continue;
        const group = feature.parent === scene ? null : feature.parent;
        const dx = Math.abs(x - feature.position.x - (group?.position.x || 0));
        const dz = Math.abs(z - feature.position.z - (group?.position.z || 0));
        if (dx < (featureKind === 'jump' ? 1.29 : .78) && dz < .57) return false;
      }
      return !clearSpots.some(([px, pz]) => (x - px) ** 2 + (z - pz) ** 2 < .47 ** 2);
    };
    const pathPlay = region ? makePathPlay(scene, world, world.models, reduced, open) : null;
    const shortcutMarkers = life ? life.markers.filter(marker => marker.shortcut).concat(storyShortcuts) : [];
    const scenicMarkers = region ? pathPlay.markers.concat(life.markers, storyShortcuts, world.viewpoints.map((viewpoint, i) => ({
      id: 'viewpoint/' + i, type: 'photo', title: viewpoint.title, symbol: '📷', pos: viewpoint.pos, viewpoint
    }))) : [];
    function ride(id = null) {
      if (!leader || id && (!life?.rides.has(id) || held || crossing)) return false;
      if (mounted) id = null;
      mounted = id;
      if (id && !mountModel) {
        mountModel = world.models.animal('나귀', true);
        mountModel.userData.drawPriority = 90;
        leader.add(mountModel);
      }
      if (mountModel) mountModel.visible = !!id;
      if (!id) {
        const { rig, arms, feet } = leader.userData.gait;
        rig.position.y = 0;
        rig.scale.y = 1;
        rig.rotation.x = 0;
        arms.forEach(arm => { arm.rotation.x = 0; arm.rotation.z = 0; });
        feet.forEach((foot, i) => { foot.position.set(i ? .127 : -.127, .10, 0); foot.rotation.x = 0; });
      }
      handlers.onRide?.(!!id);
      return true;
    }
    function holdLamb(hold) {
      if (!leader || crossing || (sheep.level || 1) >= 5) return false;
      if (hold && mounted) ride();
      held = hold;
      if (held) {
        sheepHop = null;
        carriedWordAt = performance.now() + 5200;
        kneeling = false;
      } else {
        player.position.copy(leader.position);
        trail.length = 0;
      }
      return true;
    }
    function shortcutLanding(marker, p) {
      const [x, z] = marker.pos, direction = p.z > z ? -1 : 1;
      for (const dx of [0, -.58, .58, -1.05, 1.05]) {
        const px = x + dx, pz = z + direction * 1.37;
        if (open(px, pz)) return new T.Vector3(...onGround(px, pz));
      }
      return null;
    }
    function takeShortcut(marker) {
      if (!leader || crossing) return false;
      const to = shortcutLanding(marker, leader.position);
      if (!to) return false;
      if (mounted) ride();
      if (held) return false;
      const now = performance.now();
      sheepHop = { start: now - 410, from: player.position.clone(), to, marker };
      crossing = { start: now, from: leader.position.clone(), to };
      if (marker.featureId) {
        const feature = world.features.get(marker.featureId);
        if (feature) feature.userData.cleared = true;
      }
      route = []; waitForTarget = null; goal.visible = false; leaderVel.set(0, 0);
      return true;
    }
    function animateTravel(p, walked, now, t) {
      if (crossing) {
        const phase = clamp((now - crossing.start) / 470, 0, 1);
        p.lerpVectors(crossing.from, crossing.to, reduced ? Number(phase >= 1) : phase);
        if (!reduced) p.y += Math.sin(phase * Math.PI) * .75;
        if (phase >= 1) { crossing = null; sheepHop = null; trail.length = 0; }
      }
      if (sheepHop) {
        const phase = clamp((now - sheepHop.start) / 390, 0, 1);
        player.position.lerpVectors(sheepHop.from, sheepHop.to, reduced ? Number(phase >= 1) : phase);
        if (!reduced) player.position.y += Math.sin(phase * Math.PI) * .65;
      }
      if (mounted) {
        const stand = region.nearSite([p.x, p.z]);
        if (['south-steps', 'wall-walk'].includes(stand?.key) || world.climbs.some(([x, z]) => Math.hypot(x - p.x, z - p.z) < 2.35)) {
          ride();
          return;
        }
        hoofDistance += walked;
        const { rig, arms, feet } = leader.userData.gait, gait = hoofDistance * 8.4;
        const { head, ears, feet: hooves } = mountModel.userData.mountRig;
        const bob = reduced || !walking ? 0 : Math.sin(gait * 2) * .046;
        rig.position.y = 1.08 + bob;
        rig.scale.y = .86;
        rig.rotation.x = .14;
        arms.forEach((arm, i) => { arm.rotation.x = -.83; arm.rotation.z = i ? -.34 : .34; });
        feet.forEach((foot, i) => { foot.position.set(i ? .43 : -.43, .82 + bob, .12); foot.rotation.x = -.11; });
        head.rotation.x = walking && !reduced ? Math.sin(gait) * .10 : 0;
        ears.forEach((ear, i) => { ear.rotation.x = reduced ? 0 : .13 * Math.sin(t * (3 + i) + i); });
        hooves.forEach((foot, i) => { foot.rotation.x = walking && !reduced ? Math.sin(gait + (i === 0 || i === 3 ? 0 : Math.PI)) * .54 : 0; });
      }
      if (held) {
        const { arms } = leader.userData.gait;
        arms.forEach((arm, i) => { arm.rotation.x = -1.30; arm.rotation.z = i ? -.44 : .44; });
        carryPoint.set(.02, 1.05, .40);
        player.position.copy(leader.localToWorld(carryPoint));
        player.rotation.y = leader.rotation.y + 1.26;
        if (!reduced && now >= carriedWordAt) {
          carriedWordAt = now + 10500;
          say('sheep', '♥');
        }
      }
    }
    function playAt(id) {
      if (id === 'path/bush') {
        react(id, 'rustle');
        doveAt = performance.now();
        trailDoves(elements.get(id).obj.position);
      }
      if (id === 'path/game') {
        seated = !seated;
        kneeling = seated;
        if (seated && leader) {
          const [x, z] = elements.get(id).marker.pos;
          leader.rotation.y = Math.atan2(x - leader.position.x, z - .9 - leader.position.z);
        }
      }
    }

    const clipPlanes = region && Array.from({ length: 6 }, () => new T.Plane());
    const drawSphere = region && new T.Sphere();
    const viewMatrix = region && new T.Matrix4();
    const drawPosition = region && new T.Vector3();
    const drawCosts = new Map();
    const culled = [];
    function inView(obj) {
      if (obj.isSprite) {
        drawSphere.center.set(0, 0, 0);
        drawSphere.radius = Math.SQRT1_2;
      } else {
        const source = obj.isInstancedMesh ? obj : obj.geometry;
        if (!source.boundingSphere) source.computeBoundingSphere();
        drawSphere.copy(source.boundingSphere);
      }
      drawSphere.applyMatrix4(obj.matrixWorld);
      return clipPlanes.every(plane => plane.distanceToPoint(drawSphere.center) >= -drawSphere.radius);
    }
    const passCount = material => !material?.visible ? 0 :
      material.transparent && material.side === T.DoubleSide && !material.forceSinglePass ? 2 : 1;
    function countDraws(obj, candidate) {
      if (!obj.visible) return 0;
      const optional = Number.isFinite(obj.userData.drawPriority) ? obj : candidate;
      let calls = 0;
      if (obj.layers.test(camera.layers) && (obj.isMesh || obj.isPoints || obj.isLine || obj.isSprite) &&
          (!obj.frustumCulled || inView(obj))) {
        if (Array.isArray(obj.material)) {
          for (const group of obj.geometry.groups) calls += passCount(obj.material[group.materialIndex]);
        } else calls = passCount(obj.material);
        if (optional && calls) drawCosts.set(optional, (drawCosts.get(optional) || 0) + calls);
      }
      for (const child of obj.children) calls += countDraws(child, optional);
      return calls;
    }
    function renderScene() {
      const staged = cinematic && landmark?.show.foreground !== false;
      const facing = player.rotation.y;
      const leaderVisible = leader?.visible, sheepVisible = player.visible;
      if (cinematic && leader) leader.visible = false;
      if (cinematic && !staged) player.visible = false;
      if (staged) {
        const cam = camera.position, [lx, , lz] = landmark.show.look;
        const yaw = Math.atan2(lx - cam.x, lz - cam.z);
        const distance = 6.6 + 1.35 * Math.max(0, cam.y - world.height(cam.x, cam.z));
        const x = cam.x + Math.sin(yaw) * distance - Math.cos(yaw) * 1.3;
        const z = cam.z + Math.cos(yaw) * distance + Math.sin(yaw) * 1.3;
        sheepBeforeShot.copy(player.position);
        player.position.set(x, world.height(x, z), z);
        player.rotation.y = yaw + .22;
      }
      if (region) {
        scene.updateMatrixWorld();
        camera.updateMatrixWorld();
        const clip = viewMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse).elements;
        for (let i = 0; i < clipPlanes.length; i++) {
          const a = Math.floor(i / 2), sign = i % 2 ? -1 : 1;
          clipPlanes[i].setComponents(clip[3] + sign * clip[a], clip[7] + sign * clip[a + 4],
            clip[11] + sign * clip[a + 8], clip[15] + sign * clip[a + 12]).normalize();
        }
        drawCosts.clear();
        let calls = countDraws(scene);
        if (calls > 148) {
          const pos = walkPosition();
          const order = [...drawCosts].map(([obj, calls]) => {
            drawPosition.setFromMatrixPosition(obj.matrixWorld);
            return { obj, calls, score: Math.hypot(drawPosition.x - pos.x, drawPosition.z - pos.z) - obj.userData.drawPriority };
          }).sort((a, b) => b.score - a.score);
          for (const { obj, calls: saved } of order) {
            if (calls <= 148) break;
            obj.visible = false; culled.push(obj); calls -= saved;
          }
        }
      }
      renderer.render(scene, camera);
      if (staged) { player.position.copy(sheepBeforeShot); player.rotation.y = facing; }
      player.visible = sheepVisible;
      if (leader) leader.visible = leaderVisible;
      peakCalls = Math.max(peakCalls, renderer.info.render.calls);
      for (const obj of culled) obj.visible = true;
      culled.length = 0;
    }

    function resize() {
      const width = container.clientWidth, height = container.clientHeight;
      if (!width || !height) return;
      markerWidth = width; markerHeight = height;
      if (!sizeChanged(renderer, width, height)) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height; camera.updateProjectionMatrix();
      renderScene();   // 검은 깜빡임 방지
    }
    const observer = new ResizeObserver(resize);
    observer.observe(container); resize();
    function removeMarker(id) {
      const current = elements.get(id);
      current?.obj.removeFromParent();
      current?.label.remove();
      current?.ring.material.dispose();
      if (current?.sign) disposeFigure(current.sign);
      if (current?.item?.isMesh && current.item.geometry !== crystal) current.item.geometry.dispose();
      if (current?.item?.isSprite) { current.item.material.map?.dispose(); current.item.material.dispose(); }
      elements.delete(id);
    }
    const rockForWolf = () => new T.IcosahedronGeometry(1, 0);
    function atExploreLantern(lit) {
      const lantern = new T.Group();
      const stem = new T.Mesh(new T.CylinderGeometry(.05, .13, .44, 6), mat('#845f59'));
      stem.position.y = .24; lantern.add(stem);
      const cup = new T.Mesh(new T.CylinderGeometry(.21, .12, .15, 7), mat('#b48658'));
      cup.position.y = .49; lantern.add(cup);
      if (lit) {
        const flame = new T.Mesh(new T.ConeGeometry(.15, .34, 6), mat('#ffd573', { emissive: '#ff9b38', ei: 2.2 }));
        flame.position.y = .675; lantern.add(flame);
        const glow = glowSprite('#ffca80', 1.4, .70);
        glow.position.y = .62; lantern.add(glow);
      }
      return lantern;
    }

    function addMarker(marker) {
      const [x, z] = marker.pos;
      const y = world.height(x, z);
      const obj = new T.Group(); obj.position.set(x, y + .06, z);
      const color = marker.discovered ? EXPLORE_COLORS.discoverDone : (EXPLORE_COLORS[marker.type] || '#9ce4ff');
      const light = mat(color, { basic: true, transparent: true, opacity: marker.discovered ? .45 : .8 });
      const ring = new T.Mesh(groundRing, light);
      obj.add(ring);
      let item, sign;
      if (adventure && (world.residents.has(marker.id) || marker.feature || marker.quiet)) {
        // 마을 사람과 동물은 퀘스트 단계가 바뀌어도 같은 자리에 남는다.
      } else if (marker.prop) {
        sign = buildDiscoverProp(marker.prop, discoverPropMat, world.models);
        obj.add(sign);
      } else if (marker.type === 'house-door') {
        sign = new T.Group();
        const rim = new T.Mesh(place(new T.BoxGeometry(), 0, .12, .03, .71, .13, .57), mat('#d6ad77'));
        const light = glowSprite('#ffd697', .92, .76); light.position.set(0, .42, 0);
        sign.add(rim, light); obj.add(sign);
      } else if (marker.type === 'exit') {
        sign = new T.Group();
        sign.add(new T.Mesh(place(new T.BoxGeometry(), 0, .52, 0, .11, 1.04, .12), mat('#895e47')));
        sign.add(new T.Mesh(place(new T.BoxGeometry(), 0, 1.03, 0, .91, .27, .14, 0, .11, .035), mat('#b68b60')));
        obj.add(sign);
      } else if (marker.type === 'verse') {
        sign = new T.Group();
        sign.add(new T.Mesh(place(new T.BoxGeometry(), 0, .32, 0, .52, .64, .23, 0, 0, -.08), mat('#c3adab')));
        sign.add(new T.Mesh(place(new T.BoxGeometry(), 0, .58, .11, .37, .052, .045), mat('#eaddc3')));
        obj.add(sign);
      } else if (marker.type === 'person' || marker.type === 'quest') {
        sign = new T.Group();
        const robeColor = marker.type === 'quest' ? '#bf6487' : ['#8565a2', '#697d94', '#8d745e', '#a47886', '#67668d'][hashStr(marker.title) % 5];
        const robe = new T.Mesh(new T.CylinderGeometry(.19, .34, .87, 7), mat(robeColor));
        robe.position.y = .47; sign.add(robe);
        const head = new T.Mesh(new T.IcosahedronGeometry(.205, 1), mat('#c98d68'));
        head.position.y = 1.0; sign.add(head);
        const shawl = new T.Mesh(new T.ConeGeometry(.26, .29, 8), mat('#d9b99e'));
        shawl.position.y = 1.14; sign.add(shawl); obj.add(sign);
      } else if (marker.type === 'light') {
        sign = atExploreLantern(marker.lit);
        obj.add(sign);
      } else if (marker.type === 'bell') {
        sign = new T.Group();
        const bell = new T.Mesh(new T.CylinderGeometry(.19, .31, .39, 9), mat('#d29a55', { metal: .25 }));
        bell.position.y = .67;
        const clapper = new T.Mesh(new T.SphereGeometry(.075, 6, 5), mat('#ffcf8c'));
        clapper.position.y = .46; sign.add(bell, clapper); obj.add(sign);
      } else if (marker.type === 'bush') {
        sign = new T.Group();
        for (let i = 0; i < 4; i++) {
          const leaf = new T.Mesh(new T.IcosahedronGeometry(.34, 0), mat(i % 2 ? '#617b55' : '#47705e'));
          leaf.position.set(Math.cos(i * 1.57) * .23, .22 + i * .03, Math.sin(i * 1.57) * .22);
          sign.add(leaf);
        }
        obj.add(sign);
      } else if (marker.type === 'reflection') {
        item = glowSprite('#c4ecff', .7, .84);
        item.position.y = .09; obj.add(item);
      } else if (marker.type === 'follow' && marker.symbol === '✦') {
        item = glowSprite('#ffecba', 1.32, .84);
        item.position.y = .45; obj.add(item);
      } else if (marker.type === 'guard') {
        sign = new T.Group();
        const coat = mat('#3b354e');
        const body = new T.Mesh(rockForWolf(), coat);
        body.position.y = .46; body.scale.set(.29, .28, .63); sign.add(body);
        const muzzle = new T.Mesh(rockForWolf(), coat);
        muzzle.position.set(0, .53, .55); muzzle.scale.set(.22, .19, .32); sign.add(muzzle);
        for (const side of [-1, 1]) {
          const ear = new T.Mesh(new T.ConeGeometry(.105, .30, 4), coat);
          ear.position.set(side * .13, .77, .44); sign.add(ear);
          const eye = new T.Mesh(new T.SphereGeometry(.039, 5, 4), mat('#ffb48c', { basic: true }));
          eye.position.set(side * .098, .60, .77); sign.add(eye);
        }
        obj.add(sign);
      } else if (marker.type === 'follow' && marker.symbol === '〰') {
        item = glowSprite('#e5bfd9', 1.36, .67);
        item.position.y = .46; obj.add(item);
      } else if (marker.type === 'clear') {
        item = new T.Mesh(crystal, mat('#9f8991'));
        item.scale.set(2.15, 1.35, 1.7); item.position.y = .3; obj.add(item);
      } else {
        item = new T.Mesh(crystal, mat(color, { emissive: color, ei: .55 }));
        item.position.y = .32; obj.add(item);
      }
      scene.add(obj);
      if (region) obj.userData.drawPriority = 38;
      const label = document.createElement('button');
      label.type = 'button'; label.className = 'f3d-explore-label';
      label.style.setProperty('--label-half', (marker.type === 'house-door' ? Math.min(78, 13 + String(marker.title).length * 5.5) : 18) + 'px');
      label.style.setProperty('--marker', color);
      label.dataset.action = marker.id;
      label.dataset.kind = marker.type;
      if (adventure) {
        label.dataset.priority = marker.priority || 'optional';
        if (marker.discovered) label.dataset.discovered = 'true';
        if (marker.isNew) label.dataset.isNew = 'true';
      }
      label.setAttribute('aria-label', actionText(marker));
      const sigil = document.createElement('i'); sigil.textContent =
        ({ look: '👀', touch: '✋', try: '🛠', person: '💬' })[marker.type] || marker.symbol;
      const caption = document.createElement('span'); caption.textContent = marker.title;
      label.append(sigil, caption);
      label.addEventListener('click', () => {
        if (label.hidden) return;
        if (marker.type === 'house-door') moveTo(...marker.pos, marker.id);
        else activateMarker(marker.id);
      });
      hud.append(label);
      if (marker.moving && followOrigin) {
        obj.position.copy(followOrigin);
        followOrigin = null;
      }
      elements.set(marker.id, { marker, obj, label, item, ring, sign, near: false });
    }

    function setMarkers(list) {
      clearSpots = list.filter(marker => marker.type === 'clear').map(marker => marker.pos);
      const markers = new Map(list.map(marker => [marker.id, marker]));
      for (const [id, previous] of elements) {
        const marker = markers.get(id);
        if (!marker || JSON.stringify(marker) !== JSON.stringify(previous.marker)) removeMarker(id);
      }
      for (const marker of list) if (!elements.has(marker.id)) addMarker(marker);
      if (!adventure) lantern.visible = list.some(marker => marker.type === 'guard');
    }
    setMarkers(options.markers || []);
    function spawnPickup(id, pos) {
      removeMarker(id); addMarker({ id, pos, title: '반짝이는 물건', symbol: '✦', type: 'find' });
    }
    function findPath(from, to, tolerance = .07) {
      if (!region) return explorePath(from, to, open, edge);
      const margin = 19;
      const [ox, oz] = region.origin, [halfX, halfZ] = region.bounds;
      const bounds = [-halfX - ox, -halfZ - oz, halfX - ox, halfZ - oz];
      const local = [Math.max(bounds[0], Math.min(from[0], to[0]) - margin),
        Math.max(bounds[1], Math.min(from[1], to[1]) - margin),
        Math.min(bounds[2], Math.max(from[0], to[0]) + margin),
        Math.min(bounds[3], Math.max(from[1], to[1]) + margin)];
      const path = explorePath(from, to, open, edge, local), last = path.at(-1) || from;
      if (Math.hypot(to[0] - last[0], to[1] - last[1]) <= tolerance || !open(...to)) return path;
      return explorePath(from, to, open, edge, bounds);
    }
    function destinationRoute(from, x, z, markerId = null) {
      const [tx, tz] = [clamp(x, -edge, edge), clamp(z, -edge, edge)];
      let end = [tx, tz];
      if (markerId && !open(tx, tz)) {
        const radii = adventure ? [.75, 1.10, 1.39] : [.93];
        const samples = adventure ? 18 : 12;
        const tries = radii.flatMap(r => Array.from({ length: samples }, (_, i) => {
          const angle = i / samples * 2 * Math.PI;
          return [tx + Math.sin(angle) * r, tz + Math.cos(angle) * r];
        }));
        const options = tries.filter(pt => open(...pt))
          .sort((a, b) => Math.hypot(a[0] - from[0], a[1] - from[1]) - Math.hypot(b[0] - from[0], b[1] - from[1]));
        for (const option of options) {
          const path = findPath(from, option);
          const last = path.at(-1) || from;
          if (Math.hypot(last[0] - tx, last[1] - tz) < enterDistance) return path;
        }
        if (options.length) end = options[0];
      }
      return findPath(from, end, markerId ? enterDistance : .07);
    }
    function moveTo(x, z, markerId = null) {
      const p = walkPosition();
      if (landmark) finishReveal(performance.now());
      route = destinationRoute([p.x, p.z], x, z, markerId);
      waitForTarget = markerId;
      if (markerId && elements.has(markerId)) elements.get(markerId).near = false;
      const final = route.at(-1);
      goal.visible = !!final;
      if (final) goal.position.set(final[0], world.height(...final) + .084, final[1]);
      handlers.onMove?.();
    }
    function routeInfo(pos) {
      const p = walkPosition(), from = [p.x, p.z];
      const path = destinationRoute(from, ...pos, 'approach');
      const end = path.at(-1) || from;
      let meters = 0, previous = from;
      for (const point of path) {
        meters += Math.hypot(point[0] - previous[0], point[1] - previous[1]);
        previous = point;
      }
      const gap = Math.hypot(end[0] - pos[0], end[1] - pos[1]);
      const facing = path.find(point => Math.hypot(point[0] - p.x, point[1] - p.z) > .24) || pos;
      return { path, meters: meters + gap, reachable: gap < enterDistance, facing };
    }
    function scentAngle(pos) {
      const p = walkPosition(), angle = Math.atan2(pos[0] - p.x, p.z - pos[1]) + az;
      return Math.atan2(Math.sin(angle), Math.cos(angle));
    }
    function clearScent() {
      if (!scentEffect) return;
      for (const mark of scentEffect.marks) mark.removeFromParent();
      scentEffect.geometry.dispose();
      scentEffect = null;
    }
    function showScent(path, line) {
      clearScent();
      const p = walkPosition();
      const geometry = new T.CircleGeometry(.115, 8).rotateX(-Math.PI / 2);
      const points = [[p.x, p.z], ...path], marks = [];
      let remaining = 6.7, previous = points[0];
      for (const next of points.slice(1)) {
        const length = Math.hypot(next[0] - previous[0], next[1] - previous[1]);
        for (let n = .48; n <= Math.min(length, remaining); n += .56) {
          const x = lerp(previous[0], next[0], n / length), z = lerp(previous[1], next[1], n / length);
          const shift = (marks.length % 2 ? -.13 : .13);
          const mark = new T.Mesh(geometry, mat('#ffe195', { basic: true }));
          mark.position.set(x + shift, world.height(x + shift, z) + .07, z);
          mark.scale.set(.87, 1, 1.26); mark.visible = false;
          scene.add(mark); marks.push(mark);
        }
        remaining -= length;
        if (remaining <= 0) break;
        previous = next;
      }
      const first = points.find(point => Math.hypot(point[0] - p.x, point[1] - p.z) > .35);
      const lead = first && Math.hypot(first[0] - p.x, first[1] - p.z);
      const stop = lead ? [lerp(p.x, first[0], Math.min(1, 1.55 / lead)), lerp(p.z, first[1], Math.min(1, 1.55 / lead))] : null;
      const from = [player.position.x, player.position.z];
      const leadPath = stop ? findPath(from, stop) : [];
      const segments = [];
      let distance = 0, previousLead = from;
      for (const point of leadPath) {
        const length = Math.hypot(point[0] - previousLead[0], point[1] - previousLead[1]);
        if (length > .02) { segments.push({ from: previousLead, to: point, start: distance, length }); distance += length; }
        previousLead = point;
      }
      scentEffect = { geometry, marks, segments, distance: Math.min(3.2, distance), start: performance.now() };
      sheepReact('sniff', line);
    }
    function updateScentEffect(now) {
      if (!scentEffect) return;
      const { start, marks, segments, distance } = scentEffect, age = now - start;
      if (age >= 3800) return clearScent();
      marks.forEach((mark, i) => {
        mark.visible = age > 55 * i;
        mark.scale.setScalar(1 + Math.sin(age * .015 - i) * .19);
      });
      if (!segments.length || reduced || walking || held || crossing || sheepHop || age >= 1100) return;
      const shift = clamp(age / 870, 0, 1);
      const progress = shift * distance;
      const { from, to, start: offset, length } = segments.find(segment => progress <= segment.start + segment.length) || segments.at(-1);
      const fraction = clamp((progress - offset) / length, 0, 1);
      const x = lerp(from[0], to[0], fraction), z = lerp(from[1], to[1], fraction);
      if (!open(x, z)) return;
      player.position.set(x, world.height(x, z) + Math.abs(Math.sin(shift * Math.PI * 3)) * .06, z);
      player.rotation.y = Math.atan2(to[0] - from[0], to[1] - from[1]);
    }
    function down(event) {
      if (landmark || (!adventure && !event.isPrimary) || activePointer || event.button > 0) return;
      canvas.setPointerCapture?.(event.pointerId);
      activePointer = { id: event.pointerId, x: event.clientX, moved: false, az };
    }
    function move(event) {
      if (event.pointerId !== activePointer?.id) return;
      const delta = event.clientX - activePointer.x;
      if (Math.abs(delta) > 8) activePointer.moved = true;
      if (activePointer.moved) azWant = clamp(activePointer.az - delta * .007, azBase - (adventure ? 7 : .78), azBase + (adventure ? 7 : .78));
    }
    function up(event) {
      if (event.pointerId !== activePointer?.id) return;
      const drag = activePointer.moved;
      activePointer = null;
      if (drag || event.type === 'pointercancel') return;
      const rect = canvas.getBoundingClientRect();
      pointerPos.set((event.clientX - rect.left) / rect.width * 2 - 1, 1 - (event.clientY - rect.top) / rect.height * 2);
      raycaster.setFromCamera(pointerPos, camera);
      const propHits = nearbyActions.flatMap(entry => {
        if (!canActivate(entry)) return [];
        const actor = world.residents?.get(entry.marker.id)?.actor;
        const models = [entry.sign, entry.item, actor].filter(child => child?.visible);
        const hit = raycaster.intersectObjects(models, true)[0];
        return hit ? [{ id: entry.marker.id, distance: hit.distance }] : [];
      }).sort((a, b) => a.distance - b.distance);
      if (propHits.length && activateMarker(propHits[0].id)) return;
      const hit = raycaster.intersectObject(world.ground, true)[0]?.point;
      if (hit) {
        const raised = world.climbs?.length && findRaisedTap();
        moveTo(raised?.[0] ?? hit.x, raised?.[1] ?? hit.z);
      }
    }
    function findRaisedTap() {
      const ray = raycaster.ray, origin = ray.origin, direction = ray.direction;
      if (direction.y >= -.025) return null;
      for (let i = .2; i < 42; i += .14) {
        const x = origin.x + i * direction.x, z = origin.z + i * direction.z;
        if (origin.y + i * direction.y <= world.height(x, z)) return [x, z];
      }
      return null;
    }
    canvas.addEventListener('pointerdown', down); canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
    if (adventure) {
      const jumpButton = document.createElement('button');
      jumpButton.type = 'button'; jumpButton.className = 'explore-jump'; jumpButton.textContent = '⤴';
      jumpButton.setAttribute('aria-label', '점프'); jumpButton.setAttribute('aria-keyshortcuts', 'Space');
      jumpButton.onpointerdown = event => event.preventDefault();
      jumpButton.onclick = startJump;
      wrap.append(jumpButton);
      wrap.classList.add('has-jump');
      window.addEventListener('keydown', jumpKey);
      const stick = document.createElement('div');
      stick.className = 'adventure-stick';
      stick.tabIndex = 0; stick.setAttribute('role', 'group');
      stick.setAttribute('aria-label', '이동 조이스틱 · 방향키도 사용 가능');
      const thumb = document.createElement('span');
      stick.append(thumb); wrap.append(stick);
      const resetStick = () => { joystick = null; thumb.style.transform = ''; };
      const steer = (x, y, pointer) => {
        const length = Math.max(27, Math.hypot(x, y));
        joystick = { x: x / length, y: y / length, pointer };
        thumb.style.transform = `translate(${joystick.x * 26}px,${joystick.y * 26}px)`;
      };
      const dragStick = event => {
        const rect = stick.getBoundingClientRect();
        steer(event.clientX - rect.left - rect.width / 2, event.clientY - rect.top - rect.height / 2, event.pointerId);
      };
      stick.onpointerdown = event => {
        if (landmark) finishReveal(performance.now());
        if (joystick?.pointer != null) return;
        stick.setPointerCapture?.(event.pointerId);
        route = []; waitForTarget = null; goal.visible = false; dragStick(event); handlers.onMove?.();
      };
      stick.onpointermove = event => { if (event.pointerId === joystick?.pointer) dragStick(event); };
      stick.onlostpointercapture = stick.onpointerup = stick.onpointercancel = event => {
        if (event.pointerId === joystick?.pointer) resetStick();
      };
      const arrows = { ArrowLeft: [-27, 0], ArrowRight: [27, 0], ArrowUp: [0, -27], ArrowDown: [0, 27] };
      stick.onkeydown = event => {
        if (!arrows[event.key]) return;
        if (landmark) finishReveal(performance.now());
        event.preventDefault(); route = []; waitForTarget = null; goal.visible = false;
        steer(...arrows[event.key]); handlers.onMove?.();
      };
      stick.onkeyup = event => { if (arrows[event.key]) resetStick(); };
      stick.onblur = () => { if (joystick?.pointer == null) resetStick(); };
    }
    canvas.addEventListener('webglcontextlost', e => {
      e.preventDefault();
      if (!stopped) handlers.onUnavailable?.();
    });

    function say(id, line) {
      talking?.label.remove();
      const label = document.createElement('span'); label.className = 'f3d-explore-speech'; label.textContent = line;
      hud.append(label);
      const half = Math.min(markerWidth * .44 || 135, Math.max(76, (label.offsetWidth || 180) / 2 + 6));
      label.style.setProperty('--label-half', half.toFixed(0) + 'px');
      talking = { id, label, until: performance.now() + 2800 };
    }
    function react(id, kind = 'spark') {
      if (kind === 'doves') {
        doveAt = performance.now();
        if (adventure) {
          const origin = world.residents.get(id)?.actor.position || walkPosition();
          trailDoves(origin);
        }
        return;
      }
      if (kind === 'ceremony' && adventure) {
        ceremony = performance.now();
        const origin = elements.get(id)?.obj.position || walkPosition();
        for (let i = 0; i < 5; i++) {
          const { actor } = world.models.person(i === 3 ? '사가랴' : '제사장', i, false);
          const angle = (i / 5 + .1) * 2 * Math.PI;
          const x = origin.x + Math.sin(angle) * 2.5, z = origin.z + Math.cos(angle) * 2.5;
          actor.position.set(...onGround(x, z)); actor.rotation.y = angle + Math.PI; scene.add(actor); celebrationActors.push(actor);
        }
      }
      reaction = { start: performance.now(), kind, id };
      if (kind === 'star') return;
      if (kind === 'lamb' && !reduced) {
        const lamb = buildSheep('cotton', 1, null, seed);
        lamb.scale.multiplyScalar(.65);
        const origin = elements.get(id).obj.position.clone();
        lamb.position.copy(origin); scene.add(lamb);
        foundLamb = { lamb, origin, start: reaction.start };
      }
      if (reduced || kind === 'rustle') return;
      const spark = new T.Sprite(new T.SpriteMaterial({ map: starTexture(), transparent: true, depthWrite: false, blending: T.AdditiveBlending }));
      spark.position.copy(elements.get(id)?.obj.position || player.position);
      spark.position.y += .7; spark.scale.setScalar(kind === 'scare' ? 3.4 : kind === 'note' ? 1.75 : 1.2);
      spark.userData.start = performance.now();
      effectSprites.add(spark); scene.add(spark);
    }
    function project(label, pos, y) {
      elementPos.copy(pos); elementPos.y += y; elementPos.project(camera);
      const { x, y: top, z } = elementPos;
      if (Math.abs(x) > .97 || Math.abs(top) > .93 || z < -1 || z > 1) return false;
      const half = parseFloat(label.style.getPropertyValue('--label-half')) || 75;
      const left = clamp((x + 1) * markerWidth * .5, half, markerWidth - half);
      label.style.transform = `translate3d(${left.toFixed(1)}px,${((1 - top) * markerHeight * .5).toFixed(1)}px,0) translate(-50%,-100%)`;
      return true;
    }

    function trailDoves(origin) {
      world.birds.splice(0).forEach(({ bird }) => { bird.removeFromParent(); disposeFigure(bird); });
      for (let i = 0; i < 5; i++) {
        const bird = world.models.animal('비둘기');
        bird.position.copy(origin).add(new T.Vector3((i - 2) * .34, .4, (i % 2) * .32));
      if (region) bird.userData.drawPriority = 16;
        world.birds.push({ bird, home: bird.position.clone(), i });
        scene.add(bird);
      }
    }
    function moveAnimal(key, pos, lift = 3.5) {
      const resident = world.residents?.get(key);
      if (!resident) return;
      const from = resident.actor.position.clone();
      resident.travel = { start: performance.now(), from, to: new T.Vector3(...onGround(...pos)), lift };
    }
    function restoreAbility(kind, key = kind) {
      const feature = world.features?.get(key);
      if (!feature || feature.userData.cleared) return;
      feature.userData.cleared = true;
      if (kind === 'push') feature.position.x += 1.7;
    }
    function setEscort(key) {
      if (escort && !key) {
        const { x, z } = escort.actor.position;
        escort.pos = [x, z];
      }
      escort = key ? world.residents?.get(key) : null;
      if (escort) escort.actor.position.copy(walkPosition()).add(new T.Vector3(-.9, 0, 1.1));
    }
    function revealAbility(kind, destination, key = kind) {
      if (!adventure) return;
      const p = player.position;
      const feature = world.features.get(key);
      const start = performance.now();
      abilityEffect = { kind, start, from: p.clone(), to: destination && new T.Vector3(...onGround(...destination)), feature };
      if (kind === 'smell' && destination) {
        footsteps.splice(0).forEach(mark => { mark.removeFromParent(); mark.geometry.dispose(); });
        const [tx, tz] = destination, dist = Math.hypot(tx - p.x, tz - p.z);
        const count = Math.min(12, Math.max(4, Math.ceil(dist / 1.05)));
        for (let n = 1; n <= count; n++) {
          const mark = new T.Mesh(new T.CircleGeometry(.12, 7).rotateX(-Math.PI / 2), mat('#ffd989', { basic: true }));
          const f = n / count, step = (n % 2 ? .15 : -.15);
          const x = lerp(p.x, tx, f) + step, z = lerp(p.z, tz, f);
          mark.position.set(x, world.height(x, z) + .061, z);
          mark.visible = false; footsteps.push(mark); scene.add(mark);
        }
      }
      if (kind === 'push' && feature) {
        abilityEffect.featureX = feature.position.x;
        feature.userData.cleared = true;
      }
      if (kind === 'jump' && feature) feature.userData.cleared = true;
      if (kind === 'shine') {
        lantern.visible = true;
        react('sheep', 'spark');
      }
      if (reduced && kind === 'push' && feature) feature.position.x += 1.7;
    }
    const sheepTopSpeed = region ? 6.8 : 5.2;
    function followLeader(p, t, now, delta) {
      const s = player.position;
      const last = trail.at(-1);
      if (!last || last.distanceToSquared(p) > .26) trail.push(p.clone());
      if (trail.length > 24) trail.shift();
      while (trail.length > 1 && s.distanceToSquared(trail[0]) < 1.10) trail.shift();
      const at = trail[0];
      const dx = at.x - s.x, dz = at.z - s.z;
      const distance = Math.hypot(dx, dz), near = Math.hypot(p.x - s.x, p.z - s.z);
      let trotting = false;
      // 멀수록 빨리, 가까워지면 천천히 — 속도를 부드럽게 올리고 내린다(갑자기 서거나 튀지 않게)
      const chase = (near > 1.36 || trail.length > 3) && distance > .38 ? clamp((near - 1.1) * 1.6, .9, mounted ? 9.4 : sheepTopSpeed) : 0;
      sheepSpeed += (chase - sheepSpeed) * Math.min(1, delta * (chase > sheepSpeed ? 4.5 : 6.5));
      if (sheepSpeed > .04 && distance > .05) {
        const step = Math.min(distance, delta * sheepSpeed);
        const x = s.x + dx / distance * step, z = s.z + dz / distance * step;
        if (open(x, z)) {
          s.x = x; s.z = z; s.y = world.height(x, z); trotting = true; followTimer = 0;
          const yaw = Math.atan2(dx, dz) - player.rotation.y;
          player.rotation.y += Math.atan2(Math.sin(yaw), Math.cos(yaw)) * Math.min(1, delta * 6);
        } else { followTimer += delta; sheepSpeed *= .5; }
      } else if (near < 2.6) {
        // 멈춰 있을 땐 천천히 주인 쪽을 돌아본다
        const yaw = Math.atan2(p.x - s.x, p.z - s.z) - player.rotation.y;
        player.rotation.y += Math.atan2(Math.sin(yaw), Math.cos(yaw)) * Math.min(1, delta * 1.6);
      }
      if (near > 7 || followTimer > 1.7) {
        const candidates = [trail.find(point => open(point.x, point.z)), p];
        const point = candidates.find(Boolean);
        s.copy(point); trail.splice(0, Math.max(0, trail.indexOf(point))); followTimer = 0;
      }
      if (escort) {
        const e = escort.actor, ex = e.position.x, ez = e.position.z;
        const point = trail.find(node => node.distanceToSquared(e.position) > 1.5) || p;
        const dx = point.x - e.position.x, dz = point.z - e.position.z;
        const length = Math.hypot(dx, dz);
        if (length > 1.1) {
          const m = Math.min(length, 3.05 * delta) / length;
          const x = e.position.x + dx * m, z = e.position.z + dz * m;
          if (open(x, z)) {
            e.position.set(x, world.height(x, z), z);
            const turn = Math.atan2(dx, dz) - e.rotation.y;
            e.rotation.y += Math.atan2(Math.sin(turn), Math.cos(turn)) * Math.min(1, delta * 8);
          }
          if (Math.hypot(p.x - e.position.x, p.z - e.position.z) > 6.5 && open(at.x, at.z)) e.position.copy(at);
        }
        gaitPerson(e, Math.min(Math.hypot(e.position.x - ex, e.position.z - ez), delta * 6), delta, t, reduced);
      }
      return trotting;
    }
    function animateVillage(p, t, now, delta = 1 / 60) {
      for (const resident of world.actors) {
        const { actor, pos, move, arm, key, yaw, phase } = resident;
        if (resident.hidden || escort === resident) { actor.visible = !resident.hidden; continue; }
        const g = actor.userData.gait, ox = actor.position.x, oz = actor.position.z;
        if (resident.travel) {
          const { start, from, to, lift } = resident.travel, phase = Math.min(1, (now - start) / 1900);
          const eased = lift ? phase : phase * phase * (3 - 2 * phase);
          actor.position.lerpVectors(from, to, eased);
          if (lift) actor.position.y += Math.sin(phase * Math.PI) * lift;
          else if (g) gaitPerson(actor, Math.hypot(actor.position.x - ox, actor.position.z - oz), delta, t, reduced);
          else actor.position.y += Math.abs(Math.sin(t * 9)) * .075;
          actor.rotation.y = Math.atan2(to.x - from.x, to.z - from.z);
          if (phase === 1) {
            resident.pos = [to.x, to.z]; resident.travel = null;
            if (!lift) resident.move = .55;
          }
          continue;
        }
        const d = Math.hypot(actor.position.x - p.x, actor.position.z - p.z);
        actor.visible = d < 25;
        if (!actor.visible) continue;
        const close = d < 10.5;
        if (g) {
          g.arms.forEach(a => { a.visible = close; });
          g.wave = key && key === greeted && now - lastGreeting < 2600 ? 1 : 0;
        }
        if (!reduced && move) {
          // 타원 길을 걷되, 길 끝에서 잠깐 서서 쉬었다 간다(사람마다 박자가 다름)
          const cycle = (t * (key ? .75 : .48) + phase) % (Math.PI * 2 + 1.4);
          const angle = Math.floor((t * (key ? .75 : .48) + phase) / (Math.PI * 2 + 1.4)) * Math.PI * 2 + Math.min(cycle, Math.PI * 2);
          const x = pos[0] + Math.sin(angle) * move, z = pos[1] + Math.cos(angle) * move * .6;
          if (!open(x, z)) { if (g) gaitPerson(actor, 0, delta, t, reduced); continue; }
          const moved = Math.hypot(x - ox, z - oz);
          actor.position.set(x, world.height(x, z) + (g ? 0 : Math.abs(Math.sin(t * 9 + phase)) * .073), z);
          if (moved > .0005) {
            const turn = Math.atan2(x - ox, z - oz) - actor.rotation.y;
            actor.rotation.y += Math.atan2(Math.sin(turn), Math.cos(turn)) * Math.min(1, delta * 7);
          }
          if (g) gaitPerson(actor, moved, delta, t, reduced);
        } else {
          const turn = key && d < 3.1 ? Math.atan2(p.x - actor.position.x, p.z - actor.position.z) : yaw;
          const difference = turn - actor.rotation.y;
          actor.rotation.y += Math.atan2(Math.sin(difference), Math.cos(difference)) * Math.min(1, delta * 5);
          if (g) gaitPerson(actor, 0, delta, t, reduced);
        }
        if (key && d < 3.2 && arm && key !== greeted && now - lastGreeting > 9500 && !talking && handlers.canInteract?.() !== false && handlers.companionLine) {
          greeted = key; lastGreeting = now;
          say('sheep', handlers.companionLine);
        }
      }
      if (abilityEffect) {
        const { kind, start, to, from, feature, featureX } = abilityEffect;
        const age = now - start;
        if (kind === 'smell') {
          footsteps.forEach((mark, i) => {
            mark.visible = age > i * 55 && age < 3000;
            mark.scale.setScalar(1 + Math.sin(age * .013 - i) * .22);
          });
        } else if (!reduced && kind === 'jump' && age < 720 && to) {
          const phase = age / 720;
          player.position.lerpVectors(from, to, phase);
          player.position.y += Math.sin(phase * Math.PI) * 1.32;
        } else if (!reduced && kind === 'push' && feature) {
          feature.position.x = featureX + 1.7 * Math.min(1, age / 700);
        } else if (kind === 'shine' && age > 3000) lantern.visible = false;
        if (age >= 3000) abilityEffect = null;
      }
    }
    function setWaypoint(pos) { waypoint = pos; }
    function bearingTarget(p) {
      if (!adventure) return waypoint;
      const towardsSouth = waypoint[1] > p.z;
      const crossings = adventure.crossings;
      const crosses = ([, z]) => (p.z - z) * (waypoint[1] - z) < 0;
      const gate = towardsSouth ? crossings.findLast(crosses) : crossings.find(crosses);
      return gate ? [gate[0], gate[1] + (towardsSouth ? 1.05 : -1.05)] : waypoint;
    }
    function moveInfo() { return { walking, travel, zone: adventure ? adventure.crossings.filter(([, z]) => walkPosition().z < z).length : 0 }; }

    function inspect(id) {
      const entry = elements.get(id);
      const resident = world.residents?.get(id);
      const source = entry?.obj?.position || resident?.actor?.position;
      if (!source) return;
      route = []; waitForTarget = null; goal.visible = false;
      // 카메라를 물건의 옆쪽(여행자와 비껴 선 쪽)에 둬서 여행자 등이 화면을 가리지 않게
      const w = walkPosition(), side = Math.atan2(w.x - source.x, w.z - source.z);
      const turn = Math.atan2(Math.sin(side + 1.3 - az), Math.cos(side + 1.3 - az)), turn2 = Math.atan2(Math.sin(side - 1.3 - az), Math.cos(side - 1.3 - az));
      inspectState = { id, pos: source.clone(), start: performance.now(), baseAz: az + (Math.abs(turn) < Math.abs(turn2) ? turn : turn2) };
    }
    function watch(id) {
      inspect(id);
      if (!inspectState) return;
      inspectState.watching = true;
      player.visible = false;
      if (leader) leader.visible = false;
    }
    function endInspect() {
      if (inspectState?.watching) {
        player.visible = true;
        if (leader) leader.visible = true;
      }
      inspectState = null;
    }
    function touchProp(id, anim = 'spark') {
      const now = performance.now();
      propAnims.set(id, { kind: anim, start: now });
      if (anim === 'doves') react(id, 'doves');
      else react(id, anim === 'sway' ? 'rustle' : 'spark');
    }
    function sheepReact(mood = 'spark', line = '') {
      sheepMood = { kind: mood, start: performance.now() };
      if (line) say('sheep', line);
    }
    function applyDiscoverFrame(u, t, now) {
      if (sheepMood) {
        const age = (now - sheepMood.start) / 1000;
        if (age > 2.2) sheepMood = null;
        else if (!reduced) {
          const fade = Math.max(0, 1 - age / 2.2);
          if (sheepMood.kind === 'sniff') {
            u.head.rotation.x += .22 * fade;
            u.head.rotation.y = Math.sin(age * 16) * .18 * fade;
          } else if (sheepMood.kind === 'startle') {
            u.body.position.y += Math.abs(Math.sin(Math.min(age * 7, Math.PI))) * .22 * fade;
          } else if (sheepMood.kind === 'splash') {
            u.body.position.y += Math.abs(Math.sin(age * 11)) * .2 * fade;
          } else if (sheepMood.kind === 'cozy') {
            u.head.rotation.x += (.14 + Math.sin(age * 3.5) * .08) * fade;
          } else {
            u.body.position.y += Math.abs(Math.sin(age * 9)) * .16 * fade;
          }
        }
      }
      for (const [id, anim] of propAnims) {
        const age = (now - anim.start) / 1000;
        const entry = elements.get(id);
        const obj = entry?.sign || entry?.obj || world.residents?.get(id)?.actor;
        if (!obj || age > 2.2) {
          if (obj) { obj.rotation.z = 0; }
          propAnims.delete(id);
          continue;
        }
        if (reduced) continue;
        const fade = 1 - age / 2.2;
        if (anim.kind === 'spin') obj.rotation.y += .12 * fade;
        else if (anim.kind === 'sway') obj.rotation.z = Math.sin(age * 7) * .22 * fade;
        else if (anim.kind === 'donkey' || anim.kind === 'balance') obj.rotation.z = Math.sin(age * 10) * .12 * fade;
        else if (anim.kind === 'trumpet' || anim.kind === 'pray') obj.scale.setScalar(1 + Math.sin(age * 9) * .08 * fade);
      }
    }
    function applyInspectCamera(now, delta) {
      if (!inspectState) return false;
      const age = (now - inspectState.start) / 1000;
      const orbit = inspectState.baseAz + (reduced ? 0 : Math.sin(age * .45) * .42);
      const focus = inspectState.pos;
      spot.set(focus.x, focus.y + .72, focus.z);
      target.lerp(spot, reduced ? 1 : Math.min(1, delta * 5));
      camPosition.set(target.x + Math.sin(orbit) * 4.3, target.y + 1.7, target.z + Math.cos(orbit) * 4.3);
      camera.position.lerp(camPosition, reduced ? 1 : Math.min(1, delta * 5));
      aim.copy(target);
      camera.lookAt(aim); camera.updateMatrixWorld();
      return true;
    }
    function checkNearbyDiscover(p) {
      if (!handlers.onNearbyDiscover) return;
      let nearest = null, best = 6.2;
      for (const { marker } of elements.values()) {
        if (!marker.discoverId || marker.discovered || marker.hidden) continue;
        const d = Math.hypot(marker.pos[0] - p.x, marker.pos[1] - p.z);
        if (d < best) { best = d; nearest = marker; }
      }
      const nextId = nearest?.discoverId || '';
      if (nextId !== lastNearbyId) {
        lastNearbyId = nextId;
        handlers.onNearbyDiscover(nearest);
      }
    }
    function snapProp(id) {
      const entry = elements.get(id);
      const resident = world.residents?.get(id);
      const focus = entry?.obj?.position || resident?.actor?.position;
      if (!focus) return null;
      const oldPos = camera.position.clone(), oldQuat = camera.quaternion.clone();
      const hiddenObjs = [[player, player.visible]];
      player.visible = false;
      if (leader) { hiddenObjs.push([leader, leader.visible]); leader.visible = false; }
      for (const { ring } of elements.values()) { hiddenObjs.push([ring, ring.visible]); ring.visible = false; }
      camera.position.set(focus.x + 1.45, focus.y + 1.32, focus.z + 2.05);
      camera.lookAt(focus.x, focus.y + .48, focus.z);
      renderScene();
      const out = document.createElement('canvas');
      out.width = 220; out.height = 150;
      const cropW = Math.min(canvas.width, canvas.height * out.width / out.height);
      const cropH = cropW * out.height / out.width;
      out.getContext('2d').drawImage(canvas, (canvas.width - cropW) / 2, (canvas.height - cropH) / 2, cropW, cropH, 0, 0, out.width, out.height);
      camera.position.copy(oldPos); camera.quaternion.copy(oldQuat);
      for (const [obj, vis] of hiddenObjs) obj.visible = vis;
      renderScene();
      return out.toDataURL('image/jpeg', .78);
    }

    function frame(now) {
      if (stopped) return;
      raf = requestAnimationFrame(frame);
      if (!markerWidth || document.hidden) { lastFrame = now; return; }
      const elapsed = now - (lastFrame ?? now), delta = Math.min(.07, elapsed / 1000);
      lastFrame = now;
      const t = now / 1000, p = walkPosition(), u = player.userData, mover = leader || player;
      const fromX = p.x, fromZ = p.z;
      const requested = waitForTarget;
      revealFrame(now, p);
      const allowed = !crossing && !landmark && handlers.canInteract?.() !== false;
      const step = allowed ? route[0] : null;
      const running = region && joystick?.pointer != null && Math.hypot(joystick.x, joystick.y) >= .97;
      const walkSpeed = running ? 4.08 : 2.55;
      // 이동: 원하는 속도로 부드럽게 가속·감속(0.1초 남짓), 방향도 천천히 돈다
      const maxSpeed = adventure ? walkSpeed * (mounted ? 2 : 1) : 3.45;
      let wantX = 0, wantZ = 0;
      const sheepX = player.position.x, sheepZ = player.position.z;
      const stickOn = joystick && Math.hypot(joystick.x, joystick.y) > .14 && allowed;
      if (stickOn && route.length) { route.length = 0; waitForTarget = null; goal.visible = false; }
      if (step && !stickOn) {
        const dx = step[0] - p.x, dz = step[1] - p.z, dist = Math.hypot(dx, dz);
        const reach = Math.max(.05, leaderVel.length() * delta * 1.05);
        if (dist <= reach) { p.x = step[0]; p.z = step[1]; route.shift(); if (!route.length) leaderVel.multiplyScalar(.35); }
        else {
          const ease = route.length === 1 ? clamp(dist / .7, .3, 1) : 1;
          wantX = dx / dist * maxSpeed * ease; wantZ = dz / dist * maxSpeed * ease;
        }
      } else if (allowed && !step) { waitForTarget = null; goal.visible = false; }
      if (stickOn) {
        wantX = (Math.cos(az) * joystick.x + Math.sin(az) * joystick.y) * maxSpeed;
        wantZ = (Math.cos(az) * joystick.y - Math.sin(az) * joystick.x) * maxSpeed;
      }
      if (!allowed) wantX = wantZ = 0;
      const speeding = Math.hypot(wantX, wantZ) > leaderVel.length();
      const accel = Math.min(1, delta * (speeding ? 8 : 15));
      leaderVel.x += (wantX - leaderVel.x) * accel; leaderVel.y += (wantZ - leaderVel.y) * accel;
      if (leaderVel.lengthSq() < .0009 && !wantX && !wantZ) leaderVel.set(0, 0);
      const base = groundContact?.top ?? world.height(p.x, p.z);
      const lift = jump ? Math.max(0, jump.floor + jumpLift(now) - base) : 0;
      jumpMovement = leader && !mounted && !held && !crossing ? { height: base + lift, base: jump?.floor ?? base, surface: groundContact } : null;
      const mx = leaderVel.x * delta, mz = leaderVel.y * delta;
      if (mx || mz) {
        if (step && !stickOn) { p.x += mx; p.z += mz; }
        else if (open(p.x + mx, p.z + mz)) { p.x += mx; p.z += mz; }
        else if (open(p.x + mx, p.z)) { p.x += mx; leaderVel.y *= .4; }
        else if (open(p.x, p.z + mz)) { p.z += mz; leaderVel.x *= .4; }
        else leaderVel.multiplyScalar(.2);
      }
      jumpMovement = null;
      leaderSpeed = leaderVel.length();
      if (leaderSpeed > .08) {
        const turn = Math.atan2(leaderVel.x, leaderVel.y) - mover.rotation.y;
        mover.rotation.y += Math.atan2(Math.sin(turn), Math.cos(turn)) * Math.min(delta * (leaderSpeed > 1 ? 9 : 5), 1);
      }
      const walked = Math.hypot(p.x - fromX, p.z - fromZ);
      walking = leaderSpeed > .12 && walked > .0008; travel += walked;
      groundContact = leader && !mounted && !crossing ? surfaceAt(p.x, p.z) : null;
      p.y = groundContact?.top ?? world.height(p.x, p.z);
      if (!crossing && sheepHop && Math.hypot(p.x - sheepHop.marker.pos[0], p.z - sheepHop.marker.pos[1]) > 4) sheepHop = null;
      if (region && allowed && !held && !mounted && !sheepHop) {
        const shortcut = shortcutMarkers.find(marker => !previewedShortcuts.has(marker.id) &&
          Math.hypot(p.x - marker.pos[0], p.z - marker.pos[1]) < 2.95);
        if (shortcut) {
          const to = shortcutLanding(shortcut, p);
          previewedShortcuts.add(shortcut.id);
          if (to) {
            sheepHop = { start: now, from: player.position.clone(), to, marker: shortcut };
            say('sheep', '따라와!');
          }
        }
      }
      const sheepWalking = adventure ? !held && !sheepHop && !crossing && followLeader(p, t, now, delta) : !!step;
      if (adventure) {
        animateVillage(p, t, now, delta);
        const zone = moveInfo().zone;
        if (zone !== displayedZone) { displayedZone = zone; handlers.onZone?.(); }
        if (ceremony && now - ceremony > 6000) {
          ceremony = null;
          celebrationActors.splice(0).forEach(actor => { actor.removeFromParent(); disposeFigure(actor); });
        }
        if (leader) {
          gaitPerson(leader, Math.min(walked, delta * 6), delta, t, reduced);
          // 발이 땅에 닿는 순간에 발소리
          const foot = Math.floor(leader.userData.gait.phase / Math.PI + .5);
          if (foot !== footIndex) { footIndex = foot; if (walking && now > nextStepSound) { handlers.onFootstep?.(!!mounted); nextStepSound = now + (mounted ? 155 : 240); } }
        }
      }
      if (leader) animateTravel(p, walked, now, t);
      if (seated && walking) seated = kneeling = false;
      if (seated && guide) {
        const pose = leader.userData.gait;
        pose.rig.position.y = -.55;
        pose.feet.forEach(foot => { foot.position.z = .42; });
      }
      jumpPose(now, p);
      updateLandingEffect(now);
      if (step && requested !== 'photo' && requested !== 'activity') kneeling = false;
      const sleep = kneeling;
      if (world.rearPath) world.rearPath.visible = options.progress?.[options.place] === 'done';
      if (foundLamb) {
        const { lamb, origin, start } = foundLamb;
        const phase = Math.min(1, (now - start) / 850);
        lamb.position.lerpVectors(origin, p, phase);
        lamb.position.y = world.height(lamb.position.x, lamb.position.z) + Math.abs(Math.sin(phase * Math.PI * 2)) * .35;
        lamb.rotation.y = Math.atan2(p.x - origin.x, p.z - origin.z);
        if (phase >= 1) {
          lamb.removeFromParent(); disposeFigure(lamb); foundLamb = null;
        }
      }
      if (world.campfire) {
        const { flame, light, glow } = world.campfire;
        const flicker = reduced ? 1 : 1 + Math.sin(t * 12) * .09;
        flame.scale.set(.78 + fireStrength * .22, fireStrength * flicker, .78 + fireStrength * .22);
        light.intensity = 6 * fireStrength * flicker;
        glow.material.opacity = .55 * fireStrength;
      }
      const bounce = !reduced && reaction?.kind === 'spark' ? Math.max(0, 1 - (now - reaction.start) / 700) * .28 : 0;
      const sheepMoved = Math.min(Math.hypot(player.position.x - sheepX, player.position.z - sheepZ), delta * 6);
      u.body.position.y -= u.jumpLift || 0;
      const gs = sheepGait(player, sheepMoved, delta, t, sleep, reduced);
      u.body.position.y = lerp(u.body.position.y, sleep ? -.33 : gs.bob + bounce, .3);
      u.head.rotation.x = lerp(u.head.rotation.x, sleep ? .17 : gs.nod, .25);
      if (!reduced) animateWings(player, t);
      if (cinematic || now < lookUpUntil) u.head.rotation.x = lerp(u.head.rotation.x, -.34, cinematic ? .75 : .35);
      applyDiscoverFrame(u, t, now);
      updateScentEffect(now);
      if (sheepJumps.length) {
        let lift = 0;
        sheepJumps = sheepJumps.filter(hop => {
          const phase = (now - hop.start) / 300;
          if (phase >= 1) return false;
          if (phase >= 0) {
            lift = Math.max(lift, 2.1 * phase * (1 - phase));
            if (hop.heart && phase > .32) { say('sheep', '♥'); hop.heart = false; }
          }
          return true;
        });
        u.jumpLift = held || sheepHop || crossing ? 0 : lift;
        u.body.position.y += u.jumpLift;
      } else u.jumpLift = 0;
      if (region) {
        const next = world.viewpoints.find(({ pos }) => Math.hypot(pos[0] - p.x, pos[1] - p.z) < 2.0 &&
          Math.abs(world.height(...pos) - p.y) < .8);
        if (vista !== next) { vista = next; vistaSince = now; }
        const show = !!vista && !walking && now - vistaSince > 380;
        if (show && vistaBlend < .027 && activePointer == null) {
          const [lookX, lookZ] = vista.lookAt || region.origin.map(value => -value);
          const yaw = Math.atan2(p.x - lookX, p.z - lookZ);
          azWant = az + Math.atan2(Math.sin(yaw - az), Math.cos(yaw - az));
        }
        vistaBlend = reduced ? Number(show) : lerp(vistaBlend, Number(show), Math.min(1, delta * 1.8));
      }
      if (!applyInspectCamera(now, delta)) {
        const gazing = reaction?.kind === 'star' && now - reaction.start < 2800;
        const cameraYaw = az;
        const lead = room ? .25 : adventure ? 1.8 + vistaBlend * 3.2 : 1.36;
        spot.set(p.x - (adventure ? Math.sin(cameraYaw) : 0) * lead, p.y + (room ? .62 : gazing ? 3.55 : adventure ? 1.58 : 1.28),
          p.z - (adventure ? Math.cos(cameraYaw) * lead : lead));
        target.lerp(spot, firstFrame || reduced ? 1 : Math.min(1, delta * 3.6));
        az = lerp(az, azWant, Math.min(1, delta * 7));
        const distance = room ? 4.9 : adventure ? 9.6 + vistaBlend * 10.6 : 8;
        const vistaLift = vista?.lookAt ? 7 : 12;
        camPosition.set(target.x + Math.sin(az) * distance, target.y + (room ? 4.1 : gazing ? 2.1 : adventure ? 4.45 + vistaBlend * vistaLift : 3.85), target.z + Math.cos(az) * distance);
        camera.position.copy(camPosition);
        aim.copy(target);
        camera.lookAt(aim); camera.updateMatrixWorld();
      }
      useLandmarkCamera(now);
      for (const { axis, side, group } of world.walls || []) {
        group.visible = side * camera.position[axis] < world.bounds[axis] - .13;
      }
      firstFrame = false;
      const actions = [];
      for (const v of elements.values()) {
        const { marker, obj, label, item, ring } = v;
        const distance = Math.hypot(marker.pos[0] - p.x, marker.pos[1] - p.z);
        if (marker.moving) {
          const dx = marker.pos[0] - obj.position.x, dz = marker.pos[1] - obj.position.z;
          const step = reduced ? 1 : Math.min(1, delta * 1.9 / Math.max(.03, Math.hypot(dx, dz)));
          obj.position.x += dx * step; obj.position.z += dz * step;
          obj.position.y = world.height(obj.position.x, obj.position.z) + .10;
        }
        const visible = (!adventure || distance < (marker.priority === 'main' ? 16 : marker.priority === 'side' ? 7.7 : marker.discoverId ? (marker.discovered ? 3.2 : 6.6) : 5.6)) && (!(marker.type === 'secret' || marker.hidden) || distance < (adventure ? 2.65 : 1.85));
        if (marker.type === 'follow' && item && !reduced) {
          item.position.x = Math.sin(t * 2.1) * .36;
          item.position.z = Math.sin(t * 1.39) * .49;
        }
        if (adventure) {
          const resident = world.residents.get(marker.id);
          if (resident && !marker.moving && !marker.animal) obj.position.copy(resident.actor.position);
        }
        obj.visible = visible || marker.type === 'bush';
        ring.visible = visible && marker.type !== 'reflection' && !marker.quiet && (!adventure || distance < 8);
        if (reaction?.kind === 'rustle' && reaction.id === marker.id) {
          obj.rotation.z = Math.sin((now - reaction.start) * .046) * .16 * Math.max(0, 1 - (now - reaction.start) / 460);
        }
        const resident = world.residents?.get(marker.id);
        const door = marker.type === 'house-door';
        const actionable = allowed && !inspectState && visible && canActivate(v, p);
        const labelY = resident ? (marker.actor ? 2.05 * resident.actor.scale.y : .62) : v.sign ? 1.45 : .76;
        label.hidden = !(actionable || (door && allowed && !inspectState && visible)) || !project(label, obj.position, labelY);
        ring.visible ||= actionable && marker.type !== 'reflection';
        ring.material.opacity = actionable ? 1 : marker.discovered ? .32 : .58;
        ring.scale.setScalar(reduced ? 1 : 1 + Math.sin(t * 2.8 + obj.position.x) * .084);
        if (actionable) {
          elementPos.copy(obj.position); elementPos.y += labelY; elementPos.project(camera);
          const penalty = elementPos.z > 1 || elementPos.z < -1 ? 5 : Math.min(5, Math.abs(elementPos.x));
          v.actionRank = distance + penalty * 1.25;
          actions.push(v);
        }
        if (item && !reduced && marker.type !== 'reflection') { item.rotation.y = t * 1.6; item.position.y = .35 + Math.sin(t * 2.8) * .11; }
        if (distance >= enterDistance + .3) v.near = false;
        if (door && (step || walking || requested) && !marker.lit && !v.near && distance <= enterDistance && (!requested || requested === marker.id) && allowed) {
          v.near = true;
          waitForTarget = null;
          route = []; goal.visible = false;
          leaderVel.set(0, 0);
          handlers.onReach?.(marker.id);
          if (stopped) return;
          break;
        }
      }
      nearbyActions = actions.sort((a, b) => a.actionRank - b.actionRank);
      if (!manualAction || !nearbyActions.some(entry => entry.marker.id === chosenAction)) {
        manualAction = false;
        chosenAction = nearbyActions[0]?.marker.id || '';
      }
      renderActions();
      const viewX = cinematic ? camera.position.x : p.x, viewZ = cinematic ? camera.position.z : p.z;
      world.update?.(viewX, viewZ);
      world.temple?.update(viewX, viewZ, reduced ? 0 : t, cinematic);
      life?.update(p, t, mounted);
      pathPlay?.update(p, now, t);
      checkNearbyDiscover(p);
      handlers.onExploreTick?.(now);
      if (waypoint) {
        const [x, z] = bearingTarget(p);
        const dx = x - p.x, dz = z - p.z;
        handlers.onBearing?.(Math.atan2(dx, -dz) + az, Math.round(Math.hypot(waypoint[0] - p.x, waypoint[1] - p.z)));
      }
      if (carryLabel) carryLabel.hidden = !project(carryLabel, p, 1.48);
      if (talking) {
        if (now >= talking.until) { talking.label.remove(); talking = null; }
        else talking.label.hidden = !project(talking.label, talking.id === 'sheep' ? player.position : elements.get(talking.id)?.obj.position || p, talking.id === 'sheep' ? 1.28 : 2.05);
      }
      if (!reduced) for (const { cloud, x, z, base, i } of world.fx) {
        const phase = (t * .43 + i / 6) % 1;
        cloud.position.set(x + Math.sin(t * .95 + i) * .18 * phase, base + phase * 1.62, z);
        cloud.scale.setScalar(.7 + phase * 1.42);
        cloud.material.opacity = Math.sin(phase * Math.PI) * .24;
      }
      if (doveAt) for (const { bird, home, i } of world.birds) {
        const phase = Math.max(0, (now - doveAt) / 1000 - i * .095);
        bird.position.set(home.x + phase * (i * .31 - .6), home.y + phase * 1.55, home.z - phase * 2.23);
        bird.visible = phase < 2.5 && !reduced;
        bird.children.forEach((wing, n) => { wing.rotation.x = Math.sin(t * 20) * (n ? 1 : -1) * .7; });
      }
      for (const sprite of effectSprites) {
        const age = (now - sprite.userData.start) / 820;
        sprite.material.opacity = 1 - age;
        sprite.position.y += delta * .96;
        if (age >= 1) {
          sprite.removeFromParent(); sprite.material.map.dispose(); sprite.material.dispose(); effectSprites.delete(sprite);
        }
      }
      if (climate) weatherFrame(climate, p, t, small || resolution < pixelRatio);
      renderScene();
      if (elapsed > 0 && elapsed < 250) { frames++; frameTime += elapsed; }
      if (!lastMetric) lastMetric = now;
      if (now - lastMetric > 1400) {
        metrics = { fps: frameTime ? Math.round(frames * 1000 / frameTime) : 0, calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, ratio: resolution };
        if (metrics.fps < 48 && resolution > .75) sinceSlow++; else sinceSlow = 0;
        if (sinceSlow >= 2) { resolution = Math.max(.75, resolution * .83); renderer.setPixelRatio(resolution); resize(); renderScene(); sinceSlow = 0; }
        lastMetric = now; frames = 0; frameTime = 0;
      }
    }
    raf = requestAnimationFrame(frame);
    const destroy = () => {
      if (stopped) return;
      stopped = true; cancelAnimationFrame(raf); observer.disconnect();
      window.removeEventListener('keydown', jumpKey);
      jumpFX?.material.dispose();
      clearScent();
      climate?.material?.dispose();
      climate?.puddles?.dispose();
      climate?.rain?.material.dispose();
      for (const id of elements.keys()) removeMarker(id);
      groundRing.dispose(); crystal.dispose(); discoverPropMat.dispose();
      disposeFigure(scene); world.models?.dispose();
      if (world.dispose) world.dispose();
      else world.ground.material.dispose();
      world.dome?.material.dispose();
      scene.traverse(obj => { if (obj.isPoints || world.fx.some(f => f.cloud === obj)) obj.material.dispose(); });
      renderer.dispose(); renderer.forceContextLoss(); wrap.remove();
    };
    return { setMarkers, scenicMarkers, playAt, ride, holdLamb, takeShortcut, spawnPickup, react, say, setCarry, kneel, setWaypoint, setEscort, revealAbility, restoreAbility, moveAnimal, moveInfo,
      inspect, watch, endInspect, touchProp, sheepReact, snapProp, routeInfo, scentAngle, showScent,
      showResident(id, visible) { const resident = world.residents?.get(id); if (resident) resident.hidden = !visible; }, position: () => [walkPosition().x, walkPosition().z], tendFire(lit) { fireStrength = lit ? 1 : .3; }, photo(viewpoint, panorama = false) {
      const old = camera.position.clone();
      const oldQuaternion = camera.quaternion.clone();
      const oldSize = panorama ? renderer.getSize(new T.Vector2()) : null;
      const oldAspect = camera.aspect;
      if (panorama) {
        renderer.setSize(680, 386, false);
        camera.aspect = 680 / 386;
        camera.updateProjectionMatrix();
      }
      const p = player.position, oldFacing = player.rotation.y;
      const masks = Array.from(elements.values(), ({ obj }) => [obj, obj.visible]);
      if (leader) masks.push([leader, leader.visible]);
      for (const [obj] of masks) obj.visible = false;
      if (viewpoint) {
        const pos = panorama ? new T.Vector3(...onGround(...viewpoint.pos)) : walkPosition();
        const lookAt = viewpoint.lookAt || region?.origin.map(value => -value);
        const yaw = panorama && lookAt ? Math.atan2(pos.x - lookAt[0], pos.z - lookAt[1]) : az;
        if (panorama) {
          world.update?.(pos.x, pos.z);
          world.temple?.update(pos.x, pos.z, performance.now() / 1000, false);
        }
        aim.set(pos.x - Math.sin(yaw) * 6, pos.y + .4, pos.z - Math.cos(yaw) * 6);
        if (panorama && region?.index === 0 && viewpoint.title === '감람산 전망') aim.y += 3.45;
        camera.position.set(pos.x + Math.sin(yaw) * 15, pos.y + 12.6, pos.z + Math.cos(yaw) * 15);
        camera.lookAt(aim);
      } else if (layout.christmas) {
        camera.position.set(p.x + 4.15, p.y + 2.9, p.z + 4.1);
        camera.lookAt(p.x - .05, p.y + .9, p.z - 1.38);
      } else {
        camera.position.set(p.x + 2.42, p.y + 2.37, p.z + 4.23);
        camera.lookAt(p.x, p.y + .98, p.z);
        player.rotation.y = .17;
      }
      renderScene();
      const output = document.createElement('canvas');
      output.width = panorama ? 680 : 330;
      output.height = panorama ? 386 : 360;
      const crop = Math.min(canvas.width, canvas.height * output.width / output.height);
      const cropHeight = crop * output.height / output.width;
      output.getContext('2d').drawImage(canvas, (canvas.width - crop) / 2, (canvas.height - cropHeight) / 2, crop, cropHeight, 0, 0, output.width, output.height);
      camera.position.copy(old); camera.quaternion.copy(oldQuaternion);
      if (panorama) {
        renderer.setSize(oldSize.x, oldSize.y, false);
        camera.aspect = oldAspect;
        camera.updateProjectionMatrix();
        world.update?.(walkPosition().x, walkPosition().z);
        world.temple?.update(walkPosition().x, walkPosition().z, performance.now() / 1000, false);
      }
      player.rotation.y = oldFacing;
      for (const [obj, visible] of masks) obj.visible = visible;
      renderScene();
      return output.toDataURL('image/jpeg', .83);
    }, panorama() {
      const title = ['감람산 전망', '계단밭 비탈 전망', '갈릴리 호수 고개 전망', '베들레헴 언덕 전망'][region?.index];
      const viewpoint = world.viewpoints?.find(point => point.title === title);
      return viewpoint ? this.photo(viewpoint, true) : null;
    }, focus(id) {
      const marker = elements.get(id)?.marker;
      if (marker) moveTo(...marker.pos, id);
    }, destroy, metrics: () => ({ ...metrics, peakCalls }), _debug: { player, leader, camera, moveTo, markers: elements, blocks: world.blocks, actors: world.actors,
      destinationRoute, time: climate?.time, weather: climate?.weather, stalls: climate?.stalls, rainDraw: () => climate?.rain?.geometry.drawRange.count || 0, height: world.height, climbs: world.climbs || [], signs: world.signs || [], edge, enterDistance, region, viewpoints: world.viewpoints, vistaBlend: () => vistaBlend, seated: () => seated, speed: () => leaderSpeed, animals: pathPlay?.animals,
      jumpSurfaces: surfaces, jumping: () => !!jump, landing: () => landingEffect,
      riding: () => !!mounted, holdingLamb: () => held, crossing: () => !!crossing, sheepShortcut: () => sheepHop?.marker.id,
      turnCamera(radians) { azWant = radians; } } };
  }

  // ---------- 걸음새 (Claude) ----------
  // 사람: 걸은 거리만큼 phase가 늘고(한 걸음 STEP), 발은 앞으로 갈 때만 들리고, 팔은 반대 발과 함께,
  // 몸은 두 발이 모일 때 가장 높고 벌어질 때 낮다. 멈추면 두 발 모은 자세로 부드럽게 돌아온다.
  const STEP = .62;
  function gaitPerson(actor, moved, dt, t, reduced) {
    const g = actor.userData.gait; if (!g) return 0;
    dt = Math.max(dt, 1 / 240);
    const want = reduced ? 0 : Math.min(1, moved / dt / 2.1);
    g.amt += (want - g.amt) * Math.min(1, dt * (want > g.amt ? 9 : 6));
    g.phase += moved / (STEP * (actor.scale.x || 1)) * Math.PI;
    if (want < .05) {
      const rest = Math.round(g.phase / Math.PI) * Math.PI;
      g.phase += (rest - g.phase) * Math.min(1, dt * 7);
    }
    const a = g.amt, ph = g.phase, sw = Math.sin(ph), cw = Math.cos(ph), idle = 1 - a;
    g.feet.forEach((f, i) => {
      const k = i ? -1 : 1, lift = Math.max(0, cw * k);
      f.position.z = sw * k * .2 * a;
      f.position.y = .10 + lift * .085 * a;
      f.rotation.x = -lift * .35 * a + Math.max(0, -cw * k) * .12 * a;
    });
    g.waveAmt = (g.waveAmt || 0) + ((g.wave || 0) - (g.waveAmt || 0)) * Math.min(1, dt * 5);
    g.arms.forEach((arm, i) => {
      const k = i ? -1 : 1, held = g.holds && i === 0;
      let x = sw * k * (held ? .1 : .5) * a + (held ? -.18 : -.05) - Math.sin(t * 1.7 + g.seed) * .03 * idle;
      let z = (i ? 1 : -1) * (.04 + .05 * a);
      if (i === 1 && g.waveAmt > .01 && !reduced) {
        x = lerp(x, -2.35 + Math.sin(t * 2.2 + g.seed) * .1, g.waveAmt);
        z = lerp(z, .25 + Math.sin(t * 8 + g.seed) * .32, g.waveAmt);
      }
      arm.rotation.x = x; arm.rotation.z = z;
    });
    const r = g.rig;
    r.position.y = (.5 + .5 * Math.cos(2 * ph)) * .05 * a - .025 * a;
    r.rotation.x = .075 * a + (reduced ? 0 : Math.sin(t * .8 + g.seed) * .012 * idle);
    r.rotation.z = sw * .035 * a + (reduced ? 0 : Math.sin(t * .63 + g.seed * 2) * .018 * idle);
    r.rotation.y = sw * .07 * a;
    r.scale.y = 1 + (reduced ? 0 : Math.sin(t * 1.7 + g.seed) * .008 * idle);
    return a;
  }
  // 양: 대각선 두 다리씩(트롯). 다리는 앞으로 나갈 때 살짝 접히고, 몸은 한 걸음마다 한 번 들썩·끄덕.
  // 멈추면 고개를 이리저리 돌려 구경하고 가끔 귀를 턴다.
  function sheepGait(o, moved, dt, t, rest, reduced) {
    const u = o.userData;
    const g = u.gait || (u.gait = { phase: 0, amt: 0, look: 0, lookTo: 0, next: 0, flick: -9, ear: 0 });
    dt = Math.max(dt, 1 / 240);
    const want = rest || reduced ? 0 : Math.min(1, moved / dt / 2.4);
    g.amt += (want - g.amt) * Math.min(1, dt * (want > g.amt ? 10 : 6));
    g.phase += moved / (1.05 * (u.scale || 1)) * Math.PI * 2;
    if (want < .04) {
      const restPh = Math.round(g.phase / Math.PI) * Math.PI;
      g.phase += (restPh - g.phase) * Math.min(1, dt * 8);
    }
    const a = g.amt, ph = g.phase, sw = Math.sin(ph), cw = Math.cos(ph);
    const reach = .28 + .34 * a;
    u.legs.forEach((leg, i) => {
      const k = i === 0 || i === 3 ? 1 : -1, lift = Math.max(0, cw * k);
      leg.rotation.x = -sw * k * reach * a;
      leg.scale.y = lerp(leg.scale.y, rest ? .31 : 1 - lift * .2 * a, .35);
    });
    if (!rest && !reduced && a < .15 && t > g.next) {
      g.lookTo = Math.random() < .3 ? 0 : (Math.random() - .5) * 1.3;
      g.next = t + 1.6 + Math.random() * 3.2;
      if (Math.random() < .45) g.flick = t;
    }
    if (a > .15) g.lookTo = 0;
    g.look += (g.lookTo - g.look) * Math.min(1, dt * 3.2);
    if (u.head) u.head.rotation.y = g.look;
    if (u.ears) {
      const f = t - g.flick, flick = f >= 0 && f < .35 ? Math.sin(f / .35 * Math.PI) * .55 : 0;
      u.ears.forEach((ear, i) => { ear.rotation.x = .2 + (i ? flick : flick * .4) - a * .25 * (.5 + .5 * Math.cos(2 * ph)); });
    }
    if (u.body) {
      u.body.rotation.x = Math.sin(2 * ph) * .045 * a;
      u.body.rotation.z = (reduced ? 0 : Math.sin(t * 1.4) * .012) * (1 - a);
    }
    return {
      bob: (.5 + .5 * Math.cos(2 * ph)) * .07 * a + (reduced ? 0 : Math.sin(t * 1.9) * .006 * (1 - a)),
      nod: -Math.cos(2 * ph) * .07 * a + (rest ? 0 : Math.max(0, Math.sin(t * .37 + 1.3) - .86) * 1.6 * (1 - a))
    };
  }

  function legSwingExplore(legs, t, strength, rest) {
    for (const [i, leg] of legs.entries()) {
      leg.rotation.x = Math.sin(t * 13) * strength * (i === 0 || i === 3 ? .58 : -.58);
      leg.scale.y = lerp(leg.scale.y, rest ? .31 : 1, .17);
    }
  }

  // 캔버스 크기가 실제로 바뀔 때만 다시 잡는다. 같은 크기라도 width를 다시 넣으면 캔버스가 지워져
  // 다음 프레임까지 검게 보인다(카카오톡 인앱 브라우저에서 스크롤·확대·털 깎기 때 주소창이 움직이며 반복됨).
  function sizeChanged(renderer, w, h) {
    const pr = renderer.getPixelRatio(), c = renderer.domElement;
    return c.width !== Math.floor(w * pr) || c.height !== Math.floor(h * pr);
  }

  let webGLAvailable;
  function supported() {
    if (webGLAvailable != null) return webGLAvailable;
    try {
      const gl = window.WebGLRenderingContext && document.createElement('canvas').getContext('webgl2');
      webGLAvailable = !!gl;
      gl?.getExtension?.('WEBGL_lose_context')?.loseContext();
    } catch { webGLAvailable = false; }
    return webGLAvailable;
  }
  function load() {
    if (T) return Promise.resolve(T);
    if (!loading) loading = import(VENDOR).then(m => (T = m)).catch(e => { loading = null; throw e; });
    return loading;
  }

  let endingRenderer;
  async function endingSnapshot(options = {}) {
    if (!supported()) return null;
    await load();
    const { place = 'end', kit = 'stable', seed = 20261225, layout = { time: 'night', angle: 2, christmas: kit === 'stable' },
      sheep = { species: 'cotton', level: 10 }, kneeling = false, width = 640, height = 420 } = options;
    if (!endingRenderer) {
      endingRenderer = new T.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
      endingRenderer.outputColorSpace = T.SRGBColorSpace;
      endingRenderer.toneMapping = T.ACESFilmicToneMapping;
      endingRenderer.toneMappingExposure = 1.46;
    }
    endingRenderer.setPixelRatio(1);
    endingRenderer.setSize(width, height, false);
    const scene = new T.Scene(), camera = new T.PerspectiveCamera(50, width / height, .1, 105);
    const world = exploreWorld(scene, kit || place, seed, { ...layout, christmas: kit === 'stable' || layout.christmas });
    const models = adventureModels();
    const guide = models.person('여행자', 2, true)?.actor;
    const pz = kit === 'stable' ? -3.8 : -1.2;
    const px = kit === 'stable' ? -1.05 : -.85;
    if (guide && !kneeling) {
      guide.position.set(px, world.height(px, pz), pz);
      guide.rotation.y = Math.PI * .9;
      scene.add(guide);
    }
    const player = buildSheep(sheep.species || 'cotton', sheep.level || 6, sheep.wear, seed, sheep.wool ?? 1);
    const sx = kit === 'stable' ? (kneeling ? .12 : .38) : .65;
    const sz = kit === 'stable' ? (kneeling ? -4.35 : -4.1) : -.95;
    player.position.set(sx, world.height(sx, sz), sz);
    player.rotation.y = kit === 'stable' ? (kneeling ? .18 : Math.PI * .92) : -.28;
    if (kneeling && player.userData?.body) {
      player.userData.body.position.y = -.33;
      if (player.userData.head) player.userData.head.rotation.x = .17;
      legSwingExplore(player.userData.legs, 0, 0, true);
    }
    scene.add(player);
    if (kit === 'stable') {
      camera.position.set(kneeling ? 2.15 : 2.65, world.height(0, -4) + (kneeling ? 1.85 : 2.15), kneeling ? -.85 : -.35);
      camera.lookAt(0, world.height(0, -5.8) + (kneeling ? .68 : .85), -5.6);
    } else {
      const az = ([-.18, .19, -.31, .25][layout.angle || 0] || .15);
      camera.position.set(Math.sin(az) * 6.2, world.height(0, -2) + 2.55, pz + Math.cos(az) * 5.6);
      camera.lookAt(0, world.height(0, -3.5) + .95, -3.8);
    }
    endingRenderer.render(scene, camera);
    const url = endingRenderer.domElement.toDataURL('image/jpeg', .84);
    disposeFigure(scene);
    models.dispose();
    world.ground.material.dispose();
    world.dome?.material.dispose();
    scene.traverse(obj => { if (obj.isPoints || world.fx.some(f => f.cloud === obj)) obj.material.dispose(); });
    return url;
  }

  window.Field3D = { supported, load, mount, mountExplore, portrait, wearIcon, turntable, wardrobe, normalizeWear, SLOTS, stageOf, endingSnapshot };
})();
