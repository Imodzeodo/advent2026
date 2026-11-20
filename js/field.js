/* 나의 들판 · 양 수집(도감 24종) · 레벨 · 방문객 · 밤 순찰 · 배치와 이야기 연출
   3D 화면은 js/field3d.js(window.Field3D)가 그리고, 없거나 안 되면 이 파일의 2D 그림으로 대신한다. */
(function () {
  const MAX_SHEEP = 24;
  const FLOCK_SHOW = 12;                 // 순찰·성탄 장면에 나오는 최대 마릿수
  const DAY_MS = 86400000;
  const VISIT_GAP = 3 * 3600e3;          // 방문 판정 간격
  const NEED = [20, 30, 40, 50, 60, 70, 80, 90, 100];   // Lv1→2 … Lv9→10
  const PET_MAX = 3;
  const PATROL_SECONDS = 40;
  const PATROL_CUES = {
    start: ['patrolStart', 25], pen: ['patrolPen', 14], scare: ['patrolScare', [18, 30, 24]],
    bump: ['patrolBump', 40], end: ['patrolEnd', 30]
  };
  const FIELD_TOUR = [
    { target: '.field-feed', title: '🌾 꼴 주기', text: '하루에 한 번 꼴을 주면 양이 자라고 기름도 받아.', action: '꼴 주기' },
    { target: '.field-market', title: '🏪 장터', text: '장터 물건을 놓으면 새 양이 찾아올 수 있어.', action: '장터 보기' },
    { target: '.field-patrol', title: '🔦 밤 순찰', text: '등불로 양을 우리까지 데려가 봐.', action: '순찰 보기' }
  ];
  const SHEPHERD_VERSES = [
    { verse: '시 23:1' }, { verse: '시 23:2' }, { verse: '시 23:3' }, { verse: '시 23:4' },
    { verse: '요 10:3' }, { verse: '요 10:11' }, { verse: '요 10:14' }, { verse: '사 40:11' },
    { verse: '눅 15:4' }, { verse: '겔 34:12', label: '에스겔 34:12' }, { verse: '겔 34:16', label: '에스겔 34:16' },
    { verse: '시 100:3' }, { verse: '벧전 2:25', label: '베드로전서 2:25' }, { verse: '계 7:17', label: '요한계시록 7:17' }
  ];
  const PRICE = { common: 3, rare: 6, legend: 0 };
  const CHAPTER_GUESTS = { '1-6': 'lantern', '2-6': 'camper', '3-6': 'flower', '4-4': 'stargazer' };
  const RARITY = { common: '일반', rare: '희귀', legend: '전설' };
  const PATROL_TYPES = ['patrolTime', 'patrolSpeed', 'lamp'];
  const STAGES = ['새끼 양', '어린 양', '큰 양', '빛나는 양'];
  const market = [
    ['나무 울타리', 'ground', 2], ['올리브나무', 'ground', 3], ['돌 양 우리', 'ground', 4],
    ['모닥불', 'ground', 4], ['목자 천막', 'ground', 5], ['우물', 'ground', 5],
    ['등불 기둥', 'ground', 3], ['들꽃 밭', 'ground', 2], ['하프', 'ground', 7],
    ['하늘 등', 'sky', 2], ['별똥별 비', 'sky', 8],
    ['빨간 목도리', 'wear', 3], ['꽃 화관', 'wear', 3]
  ];
  const specials = ['보라 방울', '은 종', '분홍 리본', '금빛 별 목걸이'];
  const catalog = Object.fromEntries([...market, ...specials.map(id => [id, 'wear'])].map(([id, kind]) => [id, kind]));
  const slots = [[39, 231], [118, 224], [241, 224], [321, 233], [40, 321], [117, 354], [243, 354], [319, 321], [53, 111], [308, 99]];
  const pasture = [[180, 306], [114, 283], [244, 277], [57, 277], [302, 276], [83, 371], [281, 369], [183, 383],
    [135, 251], [219, 327], [151, 337], [203, 251], [160, 284], [264, 314], [98, 318], [225, 368],
    [140, 384], [326, 362], [72, 247], [289, 247], [190, 342], [252, 395], [113, 395], [178, 258]];
  const gate = [[30, 392], [70, 396]];   // 2D 들판 입구(왼쪽 아래)
  const feeding = ['잘 먹는구나.', '양은 목자 목소리를 안단다.', '오늘도 와 줬구나.'];
  const foundLine = '찾았구나! 아흔아홉 마리를 두고서라도 찾는 거란다.';
  const verse = '너희 중에 어떤 사람이 양 백 마리가 있는데 그 중의 하나를 잃으면 아흔아홉 마리를 들에 두고 그 잃은 것을 찾아내기까지 찾아다니지 아니하겠느냐';
  const FALLBACK = { id: 'cotton', name: '솜뭉치', rarity: 'common', desc: '', skill: null,
    look: { wool: '#f4f1ea', face: '#2b2730', ear: '#e9a8a8', size: 1, curl: 0.2, spots: null, horns: false, glow: null, acc: null } };
  const THUMB = 'geubam-field-thumb' + (Core.IS_TEST ? '-test' : '');
  const VIEW_LIMIT = 16384;             // 공개 들판 한 장의 최대 바이트

  const date = () => Core.nowKST().date;
  const isSunday = day => new Date(day).getUTCDay() === 0;
  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[c]);
  const daysBetween = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / DAY_MS);
  const field = () => Core.data.field;
  const has = () => !!field()?.sheep?.length;
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  const voice = name => { Promise.resolve(Sound.voice(name)).catch(() => {}); };
  const pick = list => list[Math.floor(Math.random() * list.length)];
  const DEX = () => window.SHEEP_DEX || [FALLBACK];
  const spec = id => (window.SHEEP_DEX?.byId || {})[id] || window.SHEEP_DEX?.byId?.cotton || FALLBACK;
  // 주일 암호가 없는 판(main)에서는 금빛 양털(codes4)을 도감에서 뺀다
  const dexList = () => DEX().filter(s => s.attract !== 'cond:codes4' || (window.CODES || []).length);
  const dexTotal = () => window.SHEEP_DEX ? dexList().length : MAX_SHEEP - ((window.CODES || []).length ? 0 : 1);
  const fieldScript = new URL(document.currentScript.src);
  const dexScript = new URL('sheepdex.js' + fieldScript.search, fieldScript);
  const stage = s => { const lv = s.level || 1; return lv >= 10 ? 3 : lv >= 5 ? 2 : lv >= 2 ? 1 : 0; };
  const stageName = s => STAGES[stage(s)];
  function sheepSound(sheep) {
    const voice = DEX().findIndex(species => species.id === sheep.species);
    const size = spec(sheep.species).look.size || 1;
    const pitch = [540, 465, 385, 355][stage(sheep)] * Math.pow(size, -0.6) + Math.max(0, voice) * 5;
    Sound.sfx('sheep', pitch);
  }
  const nameSheep = (name, fallback) => Array.from(String(name || '').trim()).slice(0, 8).join('') || fallback;
  const needFor = level => level >= 10 ? 0 : NEED[level - 1];
  const josa = (word, pair) => Core.josa(String(word), pair);
  let artId = 0;
  const receiving = new WeakMap();
  let current = null;   // 열려 있는 들판 화면 { view, teardown }

  /* ---------- 저장 · 이전 기록 호환 ---------- */
  function normalizeSheep(s) {
    if (!s.species || !(window.SHEEP_DEX?.byId || {})[s.species]) s.species = s.species && !window.SHEEP_DEX ? s.species : 'cotton';
    if (!Number.isInteger(s.care)) s.care = Number(s.care) || 0;
    if (!Number.isInteger(s.level)) s.level = Math.min(4, 1 + Math.floor(s.care / 3));
    s.level = Math.max(1, Math.min(10, s.level));
    if (typeof s.exp !== 'number' || !isFinite(s.exp) || s.exp < 0) s.exp = 0;
    if (s.level >= 10) s.exp = 0;
    if (typeof s.petDay !== 'string') s.petDay = '';
    if (!Number.isInteger(s.petCount)) s.petCount = 0;
    if (s.wear === undefined) s.wear = null;
    s.lost = !!s.lost;
  }

  function ensure() {
    const data = Core.data;
    let changed = false;
    if (!data.field) {
      data.field = { since: '', sheep: [], cared: '', items: {}, slots: {}, lostOn: null, careDays: 0, found: 0 };
      changed = true;
    }
    if (data.oilEarned == null) {
      data.oilEarned = data.oil || 0;
      changed = true;
    }
    const f = data.field;
    const before = JSON.stringify(f);
    if (!Array.isArray(f.sheep)) f.sheep = [];
    if (!f.items || typeof f.items !== 'object') f.items = {};
    if (!f.slots || typeof f.slots !== 'object') f.slots = {};
    if (f.careDays == null) f.careDays = 0;
    if (f.found == null) f.found = 0;
    f.sheep.forEach(normalizeSheep);
    if (!f.dex || typeof f.dex !== 'object') f.dex = {};
    f.sheep.forEach(s => { if (!f.dex[s.species]) f.dex[s.species] = s.born || f.since || date(); });
    const today = date();
    if (!Array.isArray(f.visitors)) f.visitors = [];
    const seen = new Set();
    f.visitors = f.visitors.filter(v => v && (v.until >= today || (v.chapterGift && !v.until)) && (!window.SHEEP_DEX || Object.hasOwn(window.SHEEP_DEX.byId, v.species)) &&
      !f.dex[v.species] && !seen.has(v.species) && seen.add(v.species));
    if (typeof f.visitRoll !== 'number') f.visitRoll = 0;
    if (typeof f.patrolDay !== 'string') f.patrolDay = '';
    if (typeof f.patrolBest !== 'number') f.patrolBest = 0;
    if (!f.sheep.some(s => s.id === f.leader)) f.leader = f.sheep[0]?.id || null;
    f.foundTotal = f.found;
    if (changed || JSON.stringify(f) !== before) Core.save();
    return f;
  }

  function addOil(n, why) {
    if (Core.addOil) return Core.addOil(n, why);
    ensure();
    Core.data.oil = (Core.data.oil || 0) + n;
    Core.data.oilEarned += n;
  }

  function spendOil(n) {
    if (Core.spendOil) return Core.spendOil(n);
    ensure();
    if ((Core.data.oil || 0) < n) return false;
    Core.data.oil -= n;
    return true;
  }

  function giveItem(id, n = 1) {
    if ((!Object.hasOwn(catalog, id) && id !== '마구간') || !Number.isInteger(n) || n < 1) return;
    const { items } = ensure();
    items[id] = (items[id] || 0) + n;
    Core.save();
  }

  function stats() {
    const data = field();
    const dex = Object.keys(data?.dex || {});
    return {
      sheep: data?.sheep?.length || 0, careDays: data?.careDays || 0, found: data?.found || 0,
      dex: dex.length, legends: dex.filter(id => spec(id).rarity === 'legend' && spec(id).id === id).length
    };
  }

  function available(id) {
    const data = field();
    const used = Object.values(data.slots).filter(item => item === id).length +
      data.sheep.filter(sheep => sheep.wear === id).length;
    return Math.max(0, (data.items[id] || 0) - used);
  }

  function nextId(data) {
    const n = Math.max(0, ...data.sheep.map(s => Number(String(s.id).match(/(\d+)$/)?.[1] || 0)));
    return 'sheep-' + (n + 1);
  }
  const newSheep = (data, name, species = 'cotton') => ({
    id: nextId(data), name, born: date(), care: 0, wear: null, lost: false,
    species, level: 1, exp: 0, petDay: '', petCount: 0
  });

  /* ---------- 레벨 · 특기 ---------- */
  const active = s => (s.level || 1) >= 3 && !s.lost;
  function own(s, type) {
    const skill = spec(s.species).skill;
    return active(s) && skill?.type === type ? skill.v : 0;
  }
  function leaderSheep(data = field()) {
    return data?.sheep?.find(s => s.id === data.leader) || data?.sheep?.[0] || null;
  }
  function bonus(type) {
    const data = field();
    if (!data?.sheep?.length) return 0;
    if (PATROL_TYPES.includes(type)) { const leader = leaderSheep(data); return leader ? own(leader, type) : 0; }
    let sum = data.sheep.reduce((total, s) => total + own(s, type), 0);
    if (type === 'feedOil') sum = Math.min(3, sum);
    if (type === 'rareVisit') sum = Math.min(0.3, sum);
    return Math.round(sum * 100) / 100;
  }
  // 경험치를 더하고 레벨이 오르면 { sheep, from, to } 를 돌려준다
  function gainExp(sheep, amount) {
    if (sheep.level >= 10 || !(amount > 0)) return null;
    const from = sheep.level;
    sheep.exp += Math.round(amount);
    while (sheep.level < 10 && sheep.exp >= needFor(sheep.level)) {
      sheep.exp -= needFor(sheep.level);
      sheep.level++;
    }
    if (sheep.level >= 10) sheep.exp = 0;
    return sheep.level > from ? { sheep, from, to: sheep.level } : null;
  }
  const careExp = (s, base) => base * (1 + own(s, 'exp'));

  /* ---------- 방문객(수집) ---------- */
  function nowMs() {
    if (Core.TEST_DATE && /^\d{4}-\d{2}-\d{2}$/.test(Core.TEST_DATE)) {
      const n = Core.nowKST();
      return Date.parse(`${n.date}T${String(Math.min(23, n.hour)).padStart(2, '0')}:00:00+09:00`);
    }
    return Date.now();
  }
  function legendReady(s, data) {
    if (Core.IS_TEST && data.testLegends) return true;
    switch (s.attract) {
      case 'cond:harp8': return Object.values(data.slots).includes('하프') && data.sheep.length >= 8;
      case 'cond:found3': return (data.found || 0) >= 3;
      case 'cond:codes4': return !!(window.CODES || []).length && Object.keys(Core.data.codes || {}).length >= 4;
      case 'cond:spotty10': return data.sheep.some(x => x.species === 'spotty' && x.level >= 10);
      case 'cond:end': return !!Core.data.done?.end || !!data.items['마구간'];
      default: return false;
    }
  }
  function lureOf(item) {
    return DEX().filter(s => s.rarity === 'rare' && s.attract === item);
  }
  function pickSpecies(data, kind) {
    const taken = new Set([...Object.keys(data.dex), ...data.visitors.map(v => v.species)]);
    const list = dexList().filter(s => !taken.has(s.id));
    const legend = list.find(s => s.rarity === 'legend' && legendReady(s, data));
    if (legend && kind !== 'rare') return legend.id;
    const placed = new Set(Object.values(data.slots));
    const rares = list.filter(s => s.rarity === 'rare' && placed.has(s.attract));
    const commons = list.filter(s => s.rarity === 'common');
    if (kind === 'rare') return (pick(rares.length ? rares : list.filter(s => s.rarity === 'rare')) || null)?.id || null;
    const lures = [...placed].filter(item => lureOf(item).length).length;
    const chance = 0.25 + bonus('rareVisit') + Math.min(0.2, 0.05 * lures);
    if (rares.length && Math.random() < chance) return pick(rares).id;
    if (commons.length) return pick(commons).id;
    return rares.length ? pick(rares).id : null;   // 일반 종을 다 모았으면 유인된 희귀 종이라도
  }
  function addVisitor(data, species, today) {
    const visitor = { id: 'visit-' + Date.now().toString(36) + Math.floor(Math.random() * 1e4), species, until: today };
    data.visitors.push(visitor);
    return visitor;
  }
  function deliverChapterGuests(data) {
    const arrived = [];
    if (!window.SHEEP_DEX || !has() || !data.chapterGuestQueue?.length) return arrived;
    for (const episode of data.chapterGuestQueue) {
      const preferred = CHAPTER_GUESTS[episode];
      if (!preferred || data.sheep.length >= MAX_SHEEP) continue;
      const available = DEX().filter(s => s.rarity === 'rare' && !data.dex[s.id] &&
        !data.visitors.some(v => v.species === s.id && v.chapterGift));
      const choice = available.find(s => s.id === preferred) || available.find(s => !data.visitors.some(v => v.species === s.id)) || available[0];
      if (!choice) continue;
      const visitor = data.visitors.find(v => v.species === choice.id) || addVisitor(data, choice.id, null);
      visitor.chapterGift = episode;
      visitor.until = null;   // 처음 직접 만나는 날까지 기다린다.
      data.visitors = [visitor, ...data.visitors.filter(v => v !== visitor)];
      arrived.push(episode);
    }
    delete data.chapterGuestQueue;
    Core.save();
    return arrived;
  }
  async function awardChapterGuest(episode) {
    if (!Object.hasOwn(CHAPTER_GUESTS, episode)) return false;
    const data = ensure();
    (data.chapterGuestQueue ||= []).push(episode);
    Core.save();
    if (!has() || !await Promise.race([prepareDex(), wait(2500)]) || data !== field()) return false;
    return deliverChapterGuests(ensure()).includes(episode);
  }
  function activeVisitors(data) {
    return data.visitors.slice(0, 2);
  }
  function sundayGuestDue(data, today) {
    return isSunday(today) && data.sundayVisitDay !== today && data.sheep.length < MAX_SHEEP &&
      (!window.SHEEP_DEX || DEX().some(s => s.rarity === 'rare' && !data.dex[s.id]));
  }
  function welcomeSundayGuest(data, today) {
    if (!sundayGuestDue(data, today)) return null;
    let visitor = data.visitors.find(v => spec(v.species).rarity === 'rare');
    if (!visitor) {
      const species = pickSpecies(data, 'rare');
      if (!species) return null;
      // 이미 입구가 꽉 찼다면 전설 손님은 기다리게 두고 일반 손님의 자리를 내 준다.
      if (data.visitors.length >= 2) {
        const ordinary = data.visitors.findIndex(v => spec(v.species).rarity === 'common');
        if (ordinary !== -1) data.visitors.splice(ordinary, 1);
      }
      visitor = addVisitor(data, species, today);
    }
    visitor.sunday = true;
    data.visitors = [visitor, ...data.visitors.filter(v => v !== visitor)];
    data.sundayVisitDay = today;
    data.visitRoll = nowMs();
    Core.save();
    return visitor;
  }
  function visitCheck(force) {
    if (!has()) return null;
    const data = ensure();
    deliverChapterGuests(data);
    if (data.sheep.length >= MAX_SHEEP) return null;
    const today = date();
    const legendDue = dexList().some(s => s.rarity === 'legend' && !data.dex[s.id] &&
      !data.visitors.some(v => v.species === s.id) && legendReady(s, data));
    let sundayGuest = null;
    if (!force) {
      sundayGuest = welcomeSundayGuest(data, today);
      const now = nowMs();
      if (data.visitors.length >= 2 || (!legendDue && (sundayGuest || now - (data.visitRoll || 0) < VISIT_GAP))) return sundayGuest;
      data.visitRoll = now;
    }
    const species = pickSpecies(data, force === 'rare' ? 'rare' : null);
    const visitor = species ? addVisitor(data, species, today) : sundayGuest;
    Core.save();
    return visitor;
  }
  function adopt(visitorId, name) {
    const data = ensure();
    const visitor = data.visitors.find(v => v.id === visitorId);
    if (!visitor) return { ok: false, why: 'gone' };
    const sp = spec(visitor.species);
    if (data.dex[sp.id]) { data.visitors = data.visitors.filter(v => v !== visitor); Core.save(); return { ok: false, why: 'gone' }; }
    if (data.sheep.length >= MAX_SHEEP) return { ok: false, why: 'full' };
    const price = PRICE[sp.rarity] ?? 3;
    if (price && !spendOil(price)) return { ok: false, why: 'oil' };
    const sheep = newSheep(data, nameSheep(name, sp.name), sp.id);
    data.sheep.push(sheep);
    data.dex[sp.id] = date();
    data.visitors = data.visitors.filter(v => v !== visitor);
    Core.save();
    return { ok: true, sheep, sp, price };
  }

  function lostCheck() {
    if (!has()) return null;
    const data = ensure();
    const missing = data.sheep.find(s => s.lost);
    if (missing) return missing;
    const today = date();
    if (data.lostOn === today) return null;
    const forced = Core.IS_TEST && Core.params.get('lost') === '1';
    const hash = [...today].reduce((sum, char) => Math.imul(sum ^ char.charCodeAt(0), 16777619), 2166136261) >>> 0;
    if (!forced && (data.sheep.length < 2 || data.cared !== today ||
        (data.lostOn && daysBetween(data.lostOn, today) < 4) || hash % 100 >= 30)) return null;
    const lost = data.sheep[(hash >>> 8) % data.sheep.length];
    lost.lost = true;
    data.lostOn = today;
    Core.save();
    return lost;
  }

  /* ---------- 2D 그림 (3D가 안 될 때 · 초상 대체 · 카드) ---------- */
  const wearArt = {
    '빨간 목도리': '<path d="M13-13q4 6 10 7l-2 5m-2-7l6 5" stroke="#f78083" stroke-width="4" stroke-linecap="round" fill="none"/>',
    '꽃 화관': '<path d="M15-27q9-5 16 0" fill="none" stroke="#83bd89" stroke-width="2"/><circle cx="17" cy="-27" r="2.7" fill="#fff0a1"/><circle cx="23" cy="-29" r="2.8" fill="#f995b6"/><circle cx="29" cy="-27" r="2.7" fill="#e2bcf5"/>',
    '보라 방울': '<path d="M13-13l9 8 7-8" fill="none" stroke="#ac83f3" stroke-width="2"/><circle cx="22" cy="-4" r="4" fill="#c9a4ff"/>',
    '은 종': '<path d="M13-13l9 7 7-7" fill="none" stroke="#d1dff4" stroke-width="2"/><path d="M17-2q2-2 2-5q3-5 6 0q0 3 2 5zm4 2h2" fill="#e2e9f7" stroke="#c3cadd"/>',
    '분홍 리본': '<path d="M13-13l9 7 7-7" fill="none" stroke="#eeb7d2" stroke-width="2"/><path d="M22-4l-7-4v9l7-4 7 4v-9z" fill="#f89bbd"/>',
    '금빛 별 목걸이': '<path d="M13-13l9 7 7-7" fill="none" stroke="#ffcf70" stroke-width="2"/><path d="M22-9l1.5 4 4.5 0-3.5 2.5 1.5 4-4-2.5-4 2.5 1.5-4L16-5h4.5z" fill="#ffd778"/>'
  };
  // 종의 기본 장식(look.acc)
  const accArt = {
    scarf: wearArt['빨간 목도리'], flower: wearArt['꽃 화관'], bell: wearArt['은 종'], star: wearArt['금빛 별 목걸이'],
    leaf: '<path d="M18-29q4-8 11-6q-2 8-11 6z" fill="#8fbf6a"/><path d="M19-29l8-5" stroke="#5f8a45" stroke-width="1"/>',
    lantern: '<path d="M13-13l8 6" stroke="#b38b61" stroke-width="2"/><rect x="18" y="-8" width="8" height="9" rx="2" fill="#ffca73"/><circle cx="22" cy="-3.5" r="7" fill="#ffd27a" opacity=".25"/>',
    harp: '<path d="M-31-30q-2-12 8-14q4 8-2 16z" fill="none" stroke="#e8be6a" stroke-width="2"/><path d="M-28-41v10m3-11v12" stroke="#fff1c7" stroke-width=".8"/>'
  };

  function sheepArt(sheep, opt = {}) {
    const sp = spec(sheep.species);
    const L = sp.look || FALLBACK.look;
    const st = stage(sheep);
    const k = [0.72, 0.87, 1, 1.04][st] * Math.max(0.75, Math.min(1.2, L.size || 1));
    const sil = !!opt.silhouette;
    const wool = sil ? '#1b2340' : L.wool;
    const face = sil ? '#10162c' : L.face;
    const ear = sil ? '#10162c' : L.ear;
    const curl = L.curl || 0;
    const extra = Math.min(6, (st >= 2 ? 3 : st === 1 ? 1 : 0) + Math.round(curl * 3));
    const puffs = [[-23, -20, 8], [5, -35, 8], [16, -28, 9], [-14, -34, 8], [-29, -12, 7], [-8, -7, 9]].slice(0, extra)
      .map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r - curl * 1.5}"/>`).join('');
    const curls = curl >= 0.5 && !sil ? Array.from({ length: 7 }, (_, i) =>
      `<circle cx="${-24 + i * 7}" cy="${-22 - (i % 3) * 5}" r="3.4" fill="none" stroke="#00000018" stroke-width="1.4"/>`).join('') : '';
    const spots = L.spots && !sil ? `<g fill="${L.spots}" opacity=".88"><ellipse cx="-15" cy="-21" rx="6.5" ry="4.6"/><ellipse cx="1" cy="-13" rx="5" ry="3.6"/><circle cx="-3" cy="-31" r="3.4"/></g>` : '';
    const glowColor = sil ? null : L.glow || (st === 3 ? '#fff1c0' : null);
    const glow = glowColor ? `<ellipse class="field-glow" cx="-2" cy="-18" rx="${st === 3 ? 42 : 35}" ry="${st === 3 ? 31 : 25}" fill="${glowColor}" opacity="${st === 3 ? .3 : .2}"/>` : '';
    const horns = L.horns ? `<path d="M15-27q-8-8 0-12q7-1 5 6" fill="none" stroke="${sil ? face : '#dcc9a2'}" stroke-width="3.2" stroke-linecap="round"/><path d="M30-26q8-6 2-11q-6-1-5 5" fill="none" stroke="${sil ? face : '#cdb98f'}" stroke-width="3" stroke-linecap="round"/>` : '';
    const acc = sil || opt.noAcc ? '' : (wearArt[sheep.wear] || accArt[L.acc] || '');
    const sparkle = st === 3 && !sil ? '<path class="field-twinkle" d="M-30-44l1.5 4 4 1.5-4 1.5-1.5 4-1.5-4-4-1.5 4-1.5z" fill="#fff6d0"/><path class="field-twinkle" d="M33-46l1 3 3 1-3 1-1 3-1-3-3-1 3-1z" fill="#fff6d0"/>' : '';
    return `<g transform="scale(${k.toFixed(3)})">
      <ellipse cy="1" rx="30" ry="5" fill="#081321" opacity=".48"/>${glow}
      <path d="M-16 -10v11m22-11v11m-28-12v8m34-8v8" fill="none" stroke="${face}" stroke-width="4" stroke-linecap="round"/>
      <g fill="${wool}"><ellipse cx="-5" cy="-16" rx="25" ry="15"/><circle cx="-19" cy="-25" r="10"/><circle cx="-7" cy="-29" r="10"/><circle cx="5" cy="-25" r="12"/>${puffs}</g>
      ${sil ? '' : '<path d="M-25 -23q6-10 14-6m3-4q7-4 13 2" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".35" fill="none"/>'}${curls}${spots}
      <path d="M17-23q-9-6-10 0q1 4 9 5m8-5q8-6 10-2q1 4-8 7" fill="${face}"/>
      <path d="M15-22q-5-3-6 0q1 2 5 3m11-3q5-3 6-1q0 2-5 4" fill="${ear}"/>
      <ellipse cx="23" cy="-18" rx="10" ry="10" fill="${face}"/>${sil ? '' : '<circle cx="27" cy="-20" r="1.5" fill="#fff0d7"/>'}
      ${horns}${acc}${sparkle}
    </g>`;
  }

  const glow = '<circle class="field-glow" cy="-13" r="28" fill="#ffc372" opacity=".19"/><circle cy="-13" r="17" fill="#ffc372" opacity=".13"/>';
  const objects = {
    '나무 울타리': '<path d="M-24-6l48-5m-48-6l48-5" stroke="#ac815d" stroke-width="5"/><path d="M-21 0v-26m21 24v-26m21 24v-26" stroke="#dbaf7a" stroke-width="4" stroke-linecap="round"/>',
    '올리브나무': '<path d="M-2 0q6-15-2-30m3 19l12-15M0-12l-13-10" stroke="#9a795f" stroke-width="5" fill="none"/><path d="M-26-31q-4-12 10-13q6-12 20-6q14-1 17 9q12 3 8 13q-4 10-18 7q-8 8-22 1q-14 4-15-11z" fill="#547861"/><ellipse cx="-10" cy="-38" rx="14" ry="7" fill="#6a8c70"/>',
    '돌 양 우리': '<path d="M-28-5v-18h56v18H8v-8H-8v8Z" fill="#9d98a1"/><path d="M-27-14H27M-19-22v8M-8-22v8M4-22v8M16-22v8m-38 1v7m37-7v7" fill="none" stroke="#5b6072" stroke-width="2"/>',
    '모닥불': glow + '<path d="M-16 1l30-8M-15-8l30 10" stroke="#7c5240" stroke-width="5" stroke-linecap="round"/><path class="field-flame" d="M-11-6q-7-8 1-17q0 7 5 7q3-5 5-15q15 13 12 21q-3 9-23 4z" fill="#ff9855"/><path d="M-6-7q-1-6 7-14q8 10 3 14z" fill="#ffe18b"/>',
    '목자 천막': '<path d="M-29-4L-16-28L13-30L30-4z" fill="#b28e74"/><path d="M-29-4L-16-28L2-4z" fill="#d2ab87"/><path d="M-22-4L-16-23L-5-4z" fill="#4b3444"/><path d="M13-30l21 27m-50-25l-17 25" fill="none" stroke="#e7c9a2" stroke-width="1.4"/>',
    '우물': '<path d="M-18-5v-13h36v13q-18 9-36 0" fill="#aa97a0"/><ellipse cy="-18" rx="18" ry="6" fill="#413e55" stroke="#b9a6aa" stroke-width="3"/><path d="M-14-20v-17h28v17m-14-15v13" stroke="#cba47e" stroke-width="3" fill="none"/><path d="M-21-35L0-49l21 14z" fill="#8f635e"/>',
    '등불 기둥': '<g transform="translate(9,-24)">' + glow + '</g><path d="M-7 1v-41q0-7 8-7q8 0 8 7" stroke="#b38b61" stroke-width="4" fill="none"/><rect x="3" y="-38" width="12" height="14" rx="3" fill="#ffca73"/><path d="M2-37h14m-14 13h14m-7-13v13" stroke="#88583c" stroke-width="1.4"/>',
    '들꽃 밭': '<ellipse cy="-3" rx="27" ry="7" fill="#2f5446"/><path d="M-20-4v-7m8 8v-10m9 9v-8m9 8v-11m9 10v-7" stroke="#6f9a6c" stroke-width="1.6"/><g><circle cx="-20" cy="-12" r="3.2" fill="#f7a3c0"/><circle cx="-12" cy="-14" r="3" fill="#fff0a1"/><circle cx="-3" cy="-12" r="3.3" fill="#d9c2ff"/><circle cx="6" cy="-15" r="3" fill="#f7a3c0"/><circle cx="15" cy="-12" r="3.2" fill="#fff6e0"/><circle cx="-7" cy="-6" r="2.4" fill="#ffd1a1"/><circle cx="11" cy="-6" r="2.4" fill="#f995b6"/></g>',
    '하프': '<g transform="translate(0,1)">' + glow.replace(/#ffc372/g, '#ffe2a0') + '<path d="M-12 0V-38q14-6 22 6q6 10-2 20q-6 8-6 12z" fill="none" stroke="#e2b562" stroke-width="4" stroke-linejoin="round"/><path d="M-8-35V-2M-3-37V-1M2-35V-3M7-30v-1" stroke="#fff3cf" stroke-width="1"/><path d="M-15 1h14" stroke="#a87b3e" stroke-width="4" stroke-linecap="round"/></g>',
    '하늘 등': '<g class="field-float">' + glow + '<path d="M-11-23q11-5 22 0l-4 19H-7z" fill="#f6b367"/><path d="M-1-24h6L2-5h-4z" fill="#ffdf9b"/><ellipse cy="-4" rx="7" ry="2" fill="#a35f48"/></g>',
    '별똥별 비': '<path d="M-25-27l27 15-11-13z" fill="#9fa6cc"/><path d="M2-22l2 8 9 2-9 2-2 8-2-8-9-2 9-2z" fill="#ffeac1"/><circle cx="17" cy="-31" r="2" fill="#e1d5fa"/>',
    '마구간': '<g transform="scale(1.4)">' + glow + '<path d="M-23 0v-22H23V0z" fill="#95715c"/><path d="M-30-20L0-40l30 20" stroke="#d2a282" stroke-width="5" fill="#614956" stroke-linejoin="round"/><path d="M-9 0v-16H9V0z" fill="#ffd58f"/><path d="M-4-7l8 3m-9-1l10-2" stroke="#ac7046" stroke-width="2"/><path d="M0-51l2 5 5 1-5 1-2 5-2-5-5-1 5-1z" fill="#ffe7a7"/></g>'
  };

  const svg = (body, width = 360, height = 400) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" aria-hidden="true">${body}</svg>`;
  const sprite = (body, view = '-36 -53 72 62') => `<svg viewBox="${view}" aria-hidden="true">${body}</svg>`;
  const position = (x, y) => `--x:${x / 3.6}%;--y:${y / 4}%`;
  const at = (x, y, body) => `<g transform="translate(${x} ${y})">${body}</g>`;
  const star = (x, y, r) => at(x, y, `<path d="M0 -${r}Q1 -1 ${r} 0Q1 1 0 ${r}Q-1 1 -${r} 0Q-1 -1 0 -${r}Z" fill="#ffedc4"/>`);
  const trail = '<path d="M-55-25L0 0l-13-13z" fill="#d6bbad" opacity=".56"/>' + star(0, 0, 5);
  const svgURL = text => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(text);

  function scenery() {
    const id = 'field-sky-' + (++artId);
    return `<defs><linearGradient id="${id}" x2="0" y2="1"><stop stop-color="#0b102b"/><stop offset=".55" stop-color="#28335b"/><stop offset="1" stop-color="#3b5460"/></linearGradient></defs>
      <rect width="360" height="400" fill="url(#${id})"/>
      ${Array.from({ length: 64 }, (_, i) => `<circle cx="${(i * 137 + 23) % 358}" cy="${(i * i * 13 + i * 29 + 13) % 180}" r="${i % 9 === 0 ? 1.3 : .65}" fill="#f7e6c5" opacity="${.23 + i % 5 * .13}"/>`).join('')}
      <circle cx="179" cy="80" r="39" fill="#f2d1a2" opacity=".06"/><circle cx="179" cy="80" r="23" fill="#f2d1a2" opacity=".09"/>${star(179, 80, 9)}
      <path d="M0 188Q71 132 164 174T360 154V400H0Z" fill="#354564"/>
      <path d="M0 196Q54 163 139 192T360 176V400H0Z" fill="#2a3d53"/>
      <path d="M0 211Q128 163 233 204T360 187V400H0Z" fill="#253e44"/>
      <path d="M0 268Q95 210 183 230T360 216V400H0Z" fill="#2d474b"/>
      <path d="M0 339Q117 270 202 309T360 272V400H0Z" fill="#243d43"/>
      <path d="M0 374q113-42 184-8t176-29v63H0z" fill="#213440"/>
      ${Array.from({ length: 95 }, (_, i) => {
        const y = 210 + (i * i * 11 + i * 17) % 187;
        return at((i * 113 + 19) % 360, y, '<path d="M-3 0l-2-4m5 4 1-6m2 6 3-3" fill="none" stroke="#73907e" opacity=".32" stroke-linecap="round"/>');
      }).join('')}`;
  }

  function mapArt(data, labels = false, demo = false) {
    const decor = data?.slots || {};
    const flock = demo ? [{ name: '', species: 'cotton', level: 1 }] : data?.sheep || [];
    return scenery() + slots.map(([x, y], i) => decor[i] ? at(x, y, objects[decor[i]] || '') : '').join('') +
      (data?.items?.['마구간'] ? at(184, 209, objects['마구간']) : '') +
      flock.slice(0, MAX_SHEEP).map((sheep, i) => {
        const [x, y] = pasture[i];
        if (sheep.lost) return '';
        return at(x, y, sheepArt(sheep) + (labels ? `<text x="0" y="14" text-anchor="middle" fill="#fff3d7" stroke="#14212f" stroke-width="3" paint-order="stroke" font-size="11" font-family="sans-serif">${esc(sheep.name)}</text>` : ''));
      }).join('');
  }

  /* ---------- 초상 (3D가 되면 Field3D.portrait, 아니면 SVG) ---------- */
  let loadingDex = null;
  function prepareDex() {
    if (window.SHEEP_DEX) return Promise.resolve(true);
    if (!loadingDex) {
      loadingDex = new Promise(resolve => {
        const script = document.createElement('script');
        script.src = dexScript.href;
        script.onload = script.onerror = () => {
          script.remove();
          resolve(!!window.SHEEP_DEX);
        };
        document.head.append(script);
      }).then(ready => {
        loadingDex = null;
        const home = document.getElementById('home');
        const panel = home?.querySelector('.field-panel');
        if (ready && panel && !panel.contains(document.activeElement)) {
          panel.outerHTML = panelHTML();
          bindPanel(home);
        }
        return ready;
      });
    }
    return loadingDex;
  }

  function can3D() {
    try { return !!(window.Field3D && typeof Field3D.supported === 'function' && Field3D.supported()); } catch { return false; }
  }
  let loading = null;
  function load3D() {
    if (loading) return loading;
    if (!can3D()) return Promise.resolve(false);
    loading = Promise.resolve().then(() => Field3D.load()).then(() => true, () => {
      loading = null;
      return false;
    });
    return loading;
  }
  function prewarm(root) {
    const saveData = () => navigator.connection?.saveData || window.matchMedia('(prefers-reduced-data: reduce)').matches;
    if (saveData()) return;
    setTimeout(() => {
      const warm = () => {
        if (!root.isConnected || document.hidden || saveData()) return;
        prepareDex();
        load3D();
      };
      if (window.requestIdleCallback) requestIdleCallback(warm);
      else warm();
    }, 2000);
  }
  function portraitSVG(species, opts = {}) {
    const body = sheepArt({ species, level: opts.level || 5, wear: opts.wear || null }, { silhouette: opts.silhouette });
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-42 -60 84 84" width="${opts.px || 256}" height="${opts.px || 256}">${body}</svg>`;
  }
  async function portrait(species, opts = {}) {
    if (!opts.silhouette && window.SHEEP_DEX && can3D() && await load3D() && typeof Field3D.portrait === 'function') {
      try {
        const url = await Field3D.portrait(species, { level: opts.level || 5, wear: opts.wear || null });
        if (url) return url;
      } catch { /* SVG로 대신 */ }
    }
    return svgURL(portraitSVG(species, opts));
  }
  function portraitHTML(species, opts = {}, cls = '') {
    return `<img class="field-portrait ${cls}" alt="" src="${svgURL(portraitSVG(species, opts))}" ${opts.silhouette ? '' : `data-portrait="${esc(species)}" data-level="${opts.level || 5}" data-wear="${esc(opts.wear || '')}"`}>`;
  }
  function upgradePortraits(box) {
    if (!can3D() || !box) return;
    load3D().then(ok => {
      if (!ok || typeof Field3D.portrait !== 'function') return;
      box.querySelectorAll('img[data-portrait]').forEach(img => {
        Promise.resolve(Field3D.portrait(img.dataset.portrait, { level: Number(img.dataset.level) || 5, wear: img.dataset.wear || null }))
          .then(url => { if (url && img.isConnected) img.src = url; }).catch(() => {});
      });
    });
  }

  function stateOf(data, extra = {}) {
    const moving = extra.moving || null;
    return {
      sheep: data.sheep.map(s => ({ id: s.id, species: s.species, name: s.name, level: s.level, wear: s.wear || null, lost: !!s.lost, highlight: s.id === extra.selected })),
      slots: Object.fromEntries(Object.entries(data.slots).filter(([, v]) => v)),
      visitors: activeVisitors(data).map(v => ({ id: v.id, species: v.species })),
      stable: !!data.items['마구간'],
      moving: moving ? { item: moving.item, allowed: allowedSlots(data, moving) } : null
    };
  }
  function allowedSlots(data, moving) {
    const kind = catalog[moving.item];
    return slots.map((_, i) => i).filter(i => !data.slots[i] && kind === (i < 8 ? 'ground' : 'sky'));
  }
  function readThumb() {
    try { const url = localStorage.getItem(THUMB); return url && url.startsWith('data:image/') ? url : null; } catch { return null; }
  }
  function saveThumb(url) {
    if (typeof url !== 'string' || !url.startsWith('data:image/')) return;
    try { localStorage.setItem(THUMB, url); } catch { /* 저장 공간이 부족하면 건너뜀 */ }
  }
  const homeThumb = () => has() ? readThumb() : null;

  /* ---------- 친구 들판 링크 ---------- */
  function publicField(data, nickname) {
    const wearItems = new Set([...market.filter(([, kind]) => kind === 'wear').map(([item]) => item), ...specials]);
    const sheep = data.sheep.slice(0, MAX_SHEEP).map((entry, index) => {
      if (!entry || typeof entry !== 'object' || entry.lost) return null;
      const species = DEX().find(s => s.id === entry.species)?.id || FALLBACK.id;
      return {
        id: 'guest-' + index, species, name: nameSheep(entry.name, spec(species).name),
        level: Number.isInteger(entry.level) ? Math.min(10, Math.max(1, entry.level)) : 1,
        wear: wearItems.has(entry.wear) ? entry.wear : null
      };
    }).filter(Boolean);
    const placement = slots.flatMap((_, index) => {
      const item = data.slots?.[index];
      return typeof item === 'string' && catalog[item] === (index < 8 ? 'ground' : 'sky') ? [[index, item]] : [];
    });
    return {
      nickname: typeof nickname === 'string' ? Array.from(nickname.trim()).slice(0, 10).join('') : '',
      sheep, slots: Object.fromEntries(placement), visitors: [], items: { '마구간': data.items?.['마구간'] === true }
    };
  }

  async function fieldLink(data, includeNickname) {
    const snapshot = publicField(data, includeNickname ? Core.data.nickname : '');
    const payload = {
      ...(snapshot.nickname ? { n: snapshot.nickname } : {}),
      s: snapshot.sheep.map(s => [s.species, s.name, s.level, s.wear]),
      p: snapshot.slots, ...(data.items['마구간'] ? { b: true } : {})
    };
    let bytes = new TextEncoder().encode(JSON.stringify(payload)), format = '1';
    if (window.CompressionStream) {
      try {
        bytes = new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer());
        format = '1z';
      } catch { /* 압축 없이도 링크를 열 수 있음 */ }
    }
    const code = btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    return location.origin + location.pathname + '#v=' + format + '.' + code;
  }

  async function readFieldLink(hash) {
    const match = /^#v=1(z?)\.([A-Za-z0-9_-]+)$/.exec(hash);
    if (!match || match[2].length > Math.ceil(VIEW_LIMIT * 4 / 3)) throw new Error('잘못된 들판 링크');
    const bytes = Uint8Array.from(atob(match[2].replace(/-/g, '+').replace(/_/g, '/')), char => char.charCodeAt(0));
    const decoder = new TextDecoder('utf-8', { fatal: true });
    let json = '';
    if (match[1]) {
      const reader = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip')).getReader();
      let size = 0;
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          size += value.length;
          if (size > VIEW_LIMIT) throw new Error('들판 링크가 너무 큼');
          json += decoder.decode(value, { stream: true });
        }
        json += decoder.decode();
      } finally { await reader.cancel().catch(() => {}); }
    } else {
      json = decoder.decode(bytes);
    }
    const payload = JSON.parse(json);
    if (!Array.isArray(payload?.s) || payload.s.length > MAX_SHEEP || !payload.s.every(s =>
      Array.isArray(s) && s.length === 4 && typeof s[0] === 'string' && typeof s[1] === 'string'
    )) throw new Error('잘못된 양 정보');
    await prepareDex();
    return publicField({
      sheep: payload.s.map(([species, name, level, wear]) => ({ species, name, level, wear })),
      slots: payload.p, items: { '마구간': payload.b }
    }, payload.n);
  }

  async function visitShared(hash, root) {
    root.innerHTML = `<header class="field-header"><div><h1>친구의 들판</h1></div></header>
      <div class="field-guest-content" aria-live="polite"><p>들판을 불러오는 중…</p></div>
      <button type="button" class="btn field-guest-start">나도 시작하기</button>`;
    root.querySelector('.field-guest-start').onclick = () => {
      history.replaceState(history.state, '', location.pathname + location.search);
      App.home();
    };
    const content = root.querySelector('.field-guest-content');
    let data;
    try { data = await readFieldLink(hash); } catch {
      content.textContent = '들판이 열리지 않아. 친구에게 링크를 다시 받아 봐.';
      return;
    }
    if (!root.isConnected) return;
    root.querySelector('h1').textContent = (data.nickname || '친구') + '의 들판';
    const count = data.sheep.length;
    content.innerHTML = `<div class="field-stage is-2d"><div class="field-map" role="img" aria-label="별이 뜬 들판">${svg(mapArt(data, true))}</div></div>
      <p class="field-guest-count">🐑 양 ${count}마리</p>
      ${count ? `<ul class="field-guest-flock">${data.sheep.map(s => `<li><b>${esc(s.name)}</b> <span>Lv${s.level}</span><small>${esc(spec(s.species).name)}${s.wear ? ' · ' + esc(s.wear) : ''}</small></li>`).join('')}</ul>` : ''}`;
    if (!window.SHEEP_DEX || !can3D() || !await load3D() || !root.isConnected) return;
    const stageEl = root.querySelector('.field-stage');
    const fallback = stageEl.firstElementChild;
    const host = document.createElement('div');
    host.className = 'field3d-host';
    stageEl.classList.replace('is-2d', 'is-3d');
    stageEl.replaceChildren(host);
    let view;
    try { view = await Field3D.mount(host, stateOf(data)); } catch {
      stageEl.classList.replace('is-3d', 'is-2d');
      stageEl.replaceChildren(fallback);
      return;
    }
    if (!root.isConnected) { view.destroy(); return; }
    const observer = new MutationObserver(() => {
      if (root.isConnected) return;
      observer.disconnect();
      view.destroy();
    });
    observer.observe(root.parentElement, { childList: true });
  }

  /* ---------- 홈 패널 ---------- */
  function panelHTML() {
    const data = ensure();
    const open = has();
    const today = date();
    const episode = Core.epById('1-0');
    const remaining = daysBetween(today, episode?.date || '2026-11-29');
    const notice = Core.REL ? '첫 이야기가 열리면 할아버지가 선물을 들고 와 🎁' : '11/29 주일 예배 후에 할아버지가 선물을 들고 와 🎁';
    const thumb = homeThumb();
    const sundayNotice = open && (data.visitors.some(v => v.sunday) || sundayGuestDue(data, today));
    const dots = open ? [
      data.cared !== today && '꼴 주기',
      data.visitors.length && '손님 만나기',
      data.patrolDay !== today && '밤 순찰'
    ].filter(Boolean) : [];
    return `<section class="field-panel">
      <div class="field-panel-picture">${thumb ? `<img src="${thumb}" alt="">` : svg(mapArt(data, false, !open))}</div>
      <div class="field-panel-copy"><h2>나의 들판</h2>
        ${open ? `<p>양 ${data.sheep.length}마리 · 도감 ${Object.keys(data.dex).length}/${dexTotal()}</p>
          <div class="field-today"><strong>오늘 할 일</strong>${dots.length ? `<ul>${dots.map(t => `<li>${t}</li>`).join('')}</ul>` : '<span>모두 완료 ✓</span>'}</div>` : `<p>${esc(notice)}</p>`}
        ${open ? '<button type="button" class="btn small field-enter">들판 가기</button>' : `<small>${remaining > 0 ? 'D-' + remaining : '🔒 첫 이야기를 마치면 열려'}</small>`}
        ${!open && Core.PREVIEW_ALL ? '<button type="button" class="btn small field-test-lamb">🧪 미리보기: 양 받기</button>' : ''}
      </div>${sundayNotice ? '<p class="field-sunday-strip">✦ 오늘은 주일 손님이 와!</p>' : ''}</section>`;
  }

  function bindPanel(root) {
    const button = root.querySelector('.field-enter');
    if (button) button.onclick = page;
    const test = root.querySelector('.field-test-lamb');
    if (test) test.onclick = async () => {
      const box = document.createElement('div');
      box.className = 'field-test-stage';
      box.style.cssText = 'position:fixed;inset:0;z-index:70;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(4,5,16,.92)';
      document.body.append(box);
      try { await receiveFirstLamb(box); } finally { box.remove(); }
      page();
    };
  }

  function rarityBadge(sp) {
    return `<span class="field-rarity ${sp.rarity}">${RARITY[sp.rarity] || '일반'}</span>`;
  }
  function verseHTML(ref, label) {
    const list = window.Bible ? Bible.verses(ref) : [];
    if (!list.length) return '';
    return `<blockquote class="field-verse">${esc(list.map(v => v.text).join(' '))}<cite>${esc(label || Bible.full(ref))}</cite></blockquote>`;
  }

  function dailyWord(data) {
    const today = date();
    if (data.wordDay === today) return '';
    const index = Math.floor(Date.parse(today) / DAY_MS) % SHEPHERD_VERSES.length;
    const passage = SHEPHERD_VERSES.at(index);
    if (!passage) return '';
    const markup = verseHTML(passage.verse, passage.label);
    if (markup) {
      data.wordDay = today;
      Core.save();
    }
    return markup;
  }

  /* ---------- 들판 화면 ---------- */
  async function page() {
    if (!has()) return App.home();
    const app = document.getElementById('app');
    if (!window.SHEEP_DEX) {
      const from = app.firstChild;
      await prepareDex();
      if (app.firstChild !== from) return;
    }
    current?.teardown();
    lostCheck();
    visitCheck();
    Sound.music('night');
    Sound.ambience('나의 들판');
    Sound.stopVoice();
    const root = document.createElement('main');
    root.id = 'field';
    root.className = 'screen page field-page';
    root.innerHTML = '<div class="field-top"></div><div class="field-stage-wrap"><div class="field-stage"></div><p class="field-hold-feedback" role="status"></p></div><div class="field-manage"></div>';
    app.replaceChildren(root);
    window.scrollTo(0, 0);
    const top = root.querySelector('.field-top');
    const stageEl = root.querySelector('.field-stage');
    const holdFeedback = root.querySelector('.field-hold-feedback');
    const manage = root.querySelector('.field-manage');
    let moving = null, view = null, busy = false, selected = null, alive = true, thumbTimer = 0, holdTimer = 0;
    let mode = window.SHEEP_DEX && can3D() ? 'loading' : '2d';
    let tourStep = field().tourSeen ? FIELD_TOUR.length : 0;
    let word = dailyWord(field());
    const greetedLegends = new Set();
    const api = { get view() { return view; }, teardown };
    current = api;
    const observer = new MutationObserver(() => { if (!root.isConnected) teardown(); });
    observer.observe(app, { childList: true });

    function teardown() {
      if (!alive) return;
      alive = false;
      observer.disconnect();
      clearTimeout(thumbTimer);
      clearTimeout(holdTimer);
      root.querySelectorAll('dialog[open]').forEach(d => d.close());
      try { view?.destroy(); } catch { /* 이미 정리됨 */ }
      view = null;
      if (current === api) current = null;
    }
    const state = () => stateOf(ensure(), { moving, selected });
    const react = (id, kind) => {
      if (view) { try { view.react(id, kind); } catch { /* 연출 실패는 무시 */ } return; }
      const escaped = CSS.escape(id);
      const el = stageEl.querySelector(`[data-sheep-id="${escaped}"], [data-visitor="${escaped}"]`);
      if (!el) return;
      el.classList.remove('react-' + kind);
      void el.offsetWidth;
      el.classList.add('react-' + kind);
      setTimeout(() => el.classList.remove('react-' + kind), 1400);
    };
    const focus = id => { try { view?.focus(id); } catch { /* 무시 */ } };
    function queueThumb(delay = 1400) {
      if (!view || typeof view.snapshot !== 'function') return;
      clearTimeout(thumbTimer);
      thumbTimer = setTimeout(() => {
        if (!alive || !view) return;
        Promise.resolve().then(() => view.snapshot(360, 400)).then(url => {
          if (alive) saveThumb(url);
        }).catch(() => {});
      }, delay);
    }
    const handlers = {
      onTapSheep(id) {
        const sheep = field().sheep.find(s => s.id === id && !s.lost);
        if (!sheep || busy || moving) return;
        sheepSound(sheep);
        navigator.vibrate?.(10);
        if (!view) react(id, 'jump');
        sheepSheet(sheep);
      },
      onPetSheep(id) {
        if (!alive || busy || moving || root.querySelector('dialog[open]')) return;
        const sheep = field().sheep.find(s => s.id === id && !s.lost);
        if (sheep) pet(sheep, true);
      },
      onTapVisitor(id) { if (!busy && !moving) visitorSheet(id); },
      onTapSlot(n) { if (!busy) selectSlot(Number(n)); },
      onReady() { queueThumb(400); }
    };

    async function start3D() {
      stageEl.className = 'field-stage is-3d loading';
      stageEl.innerHTML = '<p class="field-stage-wait">들판에 밤이 내려앉는 중…</p>';
      const ok = await load3D();
      if (!alive) return;
      if (ok) {
        try {
          const host = document.createElement('div');
          host.className = 'field3d-host';
          stageEl.replaceChildren(host);
          view = await Field3D.mount(host, state(), handlers);
        } catch { view = null; }
      }
      if (!alive) { try { view?.destroy(); } catch { /* 무시 */ } view = null; return; }
      mode = view ? '3d' : '2d';
      stageEl.classList.remove('loading');
      render();
    }

    function render(message = '') {
      if (!alive) return;
      const data = ensure();
      const today = date();
      const visitors = activeVisitors(data);
      const justMet = mode === 'loading' ? [] : visitors.filter(v => v.chapterGift && !v.until);
      if (justMet.length) {
        justMet.forEach(v => { v.until = today; });
        Core.save();
      }
      const due = data.cared !== today;
      const tip = !moving && FIELD_TOUR[tourStep];
      const missing = data.sheep.find(s => s.lost);
      const visitor = visitors[0];
      top.innerHTML = `<header class="field-header"><button class="back" type="button" aria-label="홈으로">←</button>
        <div><h1>나의 들판</h1><p>양 ${data.sheep.length}마리</p></div>
        <span class="field-oil"><span aria-hidden="true">◕</span> 기름 ${Core.data.oil || 0}</span></header>
        ${tip ? `<aside class="field-coach" aria-labelledby="field-coach-title">
          <div class="field-coach-head"><small>첫 들판 안내 · ${tourStep + 1}/${FIELD_TOUR.length}</small><button type="button" class="link field-coach-close" aria-label="첫 들판 안내 닫기">닫기</button></div>
          <b id="field-coach-title">${tip.title}</b><p>${tip.text}</p>
          ${tourStep === 0 && mode === '3d' ? '<p>양을 꾹 눌러 쓰다듬어 봐.</p>' : ''}
          <div class="field-coach-actions"><button type="button" class="btn small field-coach-try" ${tourStep === 0 && !due ? 'hidden' : ''} ${tourStep === 2 && mode === 'loading' ? 'disabled' : ''}>${tip.action}</button>
          <button type="button" class="link field-coach-next">${tourStep === FIELD_TOUR.length - 1 ? '마치기' : '다음'}</button></div></aside>` : ''}
        ${visitor && !moving ? `<button type="button" class="field-visit-banner" data-visit="${esc(visitor.id)}"><span aria-hidden="true">🐑</span> ${visitor.sunday ? '주일 손님이 왔어!' : '들판에 손님이 왔어!'}<b>보러 가기 ›</b></button>` : ''}
        ${word ? `<aside class="field-daily-word" aria-labelledby="field-word-title">
          <div class="field-word-head"><h2 id="field-word-title">할아버지의 말씀 한 줄</h2><button type="button" class="link field-word-close" aria-label="말씀 카드 닫기">닫기</button></div>
          ${word}</aside>` : ''}`;
      const dex = Object.keys(data.dex).length;
      manage.innerHTML = `${missing ? `<aside class="field-lost"><span aria-hidden="true">🐑</span><div><strong>${esc(josa(missing.name, '이가'))} 안 보여!</strong><button type="button" class="link field-find">찾으러 가자 →</button></div></aside>` : ''}
        ${moving ? `<p class="field-move-tip"><span>${esc(josa(moving.item, '을를'))} 놓을 빈 칸을 골라 줘.</span><button type="button" class="link field-cancel-move">취소</button></p>` :
          `<button type="button" class="btn field-feed ${due ? 'due' : ''}" ${due ? '' : 'disabled'}>${due ? '🌾 꼴 주기' : '✓ 오늘 꼴 주기 완료'}</button>
          <div class="field-actions">
            <button type="button" class="field-act field-patrol"><span aria-hidden="true">🔦</span>밤 순찰${data.patrolDay !== today ? '<i class="field-dot" aria-label="오늘 보상 남음"></i>' : ''}</button>
            <button type="button" class="field-act field-dex"><span aria-hidden="true">📖</span>도감 <small>${dex}/${dexTotal()}</small></button>
            <button type="button" class="field-act field-market"><span aria-hidden="true">🏪</span>장터</button>
            <button type="button" class="field-act field-card"><span aria-hidden="true">🖼️</span>들판 카드</button>
          </div>`}
        ${moving ? '' : '<button type="button" class="btn ghost field-share-link">내 들판 자랑하기</button>'}
        <p class="field-feedback" role="status">${esc(message)}</p>
        ${moving ? '' : testTools(data)}`;
      top.querySelector('.back').onclick = () => App.home();
      top.querySelector('.field-word-close')?.addEventListener('click', event => {
        word = '';
        event.currentTarget.closest('.field-daily-word').remove();
        top.querySelector('.back').focus({ preventScroll: true });
      });
      top.querySelector('.field-visit-banner')?.addEventListener('click', event => {
        const id = event.currentTarget.dataset.visit;
        if (view) { focus(id); setTimeout(() => alive && visitorSheet(id), 650); } else visitorSheet(id);
      });
      manage.querySelector('.field-cancel-move')?.addEventListener('click', () => { moving = null; render(); });
      manage.querySelector('.field-feed')?.addEventListener('click', feed);
      manage.querySelector('.field-patrol')?.addEventListener('click', patrolSheet);
      manage.querySelector('.field-dex')?.addEventListener('click', dexSheet);
      manage.querySelector('.field-market')?.addEventListener('click', shop);
      manage.querySelector('.field-card')?.addEventListener('click', () => cardSheet('들판 카드', () => Card.drawField(), 'FIELD', '양과 별이 그려진 나의 들판 카드'));
      manage.querySelector('.field-share-link')?.addEventListener('click', shareSheet);
      manage.querySelector('.field-find')?.addEventListener('click', () => search(missing));
      if (tip) {
        manage.querySelector(tip.target)?.classList.add('field-tour-target');
        top.querySelector('.field-coach-close').onclick = () => advanceTour(FIELD_TOUR.length);
        top.querySelector('.field-coach-next').onclick = () => advanceTour(tourStep + 1);
        top.querySelector('.field-coach-try').onclick = () => {
          if (busy) return;
          advanceTour(tourStep + 1, false);
          manage.querySelector(tip.target)?.click();
        };
      }
      bindTestTools(data);
      if (mode === '2d') {
        stageEl.className = 'field-stage is-2d';
        stageEl.innerHTML = mapMarkup(data, moving);
        stageEl.querySelectorAll('[data-slot]').forEach(button => { button.onclick = () => selectSlot(Number(button.dataset.slot)); });
        stageEl.querySelectorAll('[data-sheep-id]').forEach(button => {
          button.onclick = () => handlers.onTapSheep(button.dataset.sheepId);
        });
        stageEl.querySelectorAll('[data-visitor]').forEach(button => { button.onclick = () => visitorSheet(button.dataset.visitor); });
      } else if (view) {
        try { view.update(state()); } catch { /* 다음 갱신에서 다시 */ }
        queueThumb();
      }
      if (mode !== 'loading') {
        for (const guest of visitors) {
          if (spec(guest.species).rarity !== 'legend' || greetedLegends.has(guest.id)) continue;
          greetedLegends.add(guest.id);
          react(guest.id, 'legend');
          Sound.sfx('legendArrival');
        }
      }
    }

    function advanceTour(next, focus = true) {
      tourStep = next;
      if (next === FIELD_TOUR.length) {
        field().tourSeen = true;
        Core.save();
      }
      render();
      if (focus) {
        const button = top.querySelector('.field-coach-next') || top.querySelector('.back');
        button.focus({ preventScroll: true });
      }
    }

    function sheet(title, body, className = '', onClose) {
      const previous = root.querySelector('.field-sheet');
      if (previous) { previous.close(); previous.remove(); }
      const modal = document.createElement('dialog');
      modal.className = 'field-sheet ' + className;
      modal.setAttribute('aria-labelledby', 'field-sheet-title');
      modal.innerHTML = `<header><h2 id="field-sheet-title">${esc(title)}</h2><button type="button" class="field-close" aria-label="닫기">×</button></header>${body}`;
      modal.querySelector('.field-close').onclick = () => modal.close();
      modal.addEventListener('close', () => { modal.remove(); onClose?.(); }, { once: true });
      root.append(modal);
      modal.showModal();
      upgradePortraits(modal);
      return modal;
    }

    function shareSheet() {
      const modal = sheet('내 들판 자랑하기', `<p class="field-sheet-meta">링크를 보내면 친구가 양과 장식을 볼 수 있어.</p>
        ${Core.data.nickname ? '<label class="field-share-option"><input type="checkbox"> 내 닉네임도 보여 주기</label>' : ''}
        <label class="field-share-url">들판 링크<input type="url" readonly></label>
        <div class="row"><button type="button" class="btn field-copy" disabled>링크 복사</button>
        ${navigator.share ? '<button type="button" class="btn ghost field-share-native" disabled>공유</button>' : ''}</div>
        <p class="field-sheet-meta field-share-status" role="status"></p>`, 'field-share-sheet');
      const checkbox = modal.querySelector('input[type="checkbox"]');
      const input = modal.querySelector('input[type="url"]');
      const copy = modal.querySelector('.field-copy');
      const share = modal.querySelector('.field-share-native');
      const status = modal.querySelector('.field-share-status');
      let generation = 0;
      async function refresh() {
        const request = ++generation;
        input.value = '';
        copy.disabled = true;
        if (share) share.disabled = true;
        status.textContent = '';
        try {
          const url = await fieldLink(field(), checkbox?.checked);
          if (request !== generation) return;
          input.value = url;
          copy.disabled = false;
          if (share) share.disabled = false;
        } catch { if (request === generation) status.textContent = '링크를 만들지 못했어. 다시 열어 봐.'; }
      }
      if (checkbox) checkbox.onchange = refresh;
      input.onclick = () => input.select();
      copy.onclick = async () => {
        try {
          await navigator.clipboard.writeText(input.value);
          status.textContent = '링크를 복사했어!';
        } catch {
          input.focus();
          input.select();
          status.textContent = '선택한 링크를 복사해 줘.';
        }
      };
      if (share) share.onclick = async () => {
        try { await navigator.share({ title: '내 들판 구경할래?', url: input.value }); }
        catch (error) { if (error.name !== 'AbortError') status.textContent = '링크를 복사해서 보내 줘.'; }
      };
      refresh();
    }

    function badges() {
      const got = window.Fame ? Fame.checkNew() : [];
      if (got.length) App.notifyBadges?.(got);
    }

    // 레벨업 연출: 반응 + 효과음 + 토스트, Lv5·Lv10은 커지는 연출과 축하 카드
    function celebrate(ups, showGrowthSheet = true) {
      ups = ups.filter(Boolean);
      if (!ups.length) return;
      ups.forEach(u => react(u.sheep.id, 'levelup'));
      Sound.sfx('star');
      navigator.vibrate?.(30);
      const [first] = ups;
      if (showGrowthSheet) Player.toast(`${first.sheep.name} Lv${first.to}!${ups.length > 1 ? ` 외 ${ups.length - 1}마리` : ''}`);
      const grown = ups.filter(u => (u.from < 5 && u.to >= 5) || (u.from < 10 && u.to >= 10));
      if (!grown.length) return;
      setTimeout(() => {
        if (!alive) return;
        grown.forEach(u => react(u.sheep.id, 'grow'));
        if (!showGrowthSheet) return;
        voice('field-7');
        const g = grown[0];
        const big = g.to >= 10;
        const line = `${josa(g.sheep.name, '이가')} ${big ? '빛나는 양이 됐어!' : '큰 양이 됐어!'}`;
        sheet(big ? '빛나는 양' : '큰 양', `<div class="field-grow ${big ? 'shine' : ''}">${portraitHTML(g.sheep.species, { level: g.to, wear: g.sheep.wear }, 'big')}
          <p>${esc(line)}</p>${grown.length > 1 ? `<small>${grown.slice(1).map(u => esc(u.sheep.name)).join(' · ')}도 함께 자랐어</small>` : ''}
          <small>많이 컸구나.</small></div>`, 'field-grow-sheet');
      }, view ? 1100 : 500);
    }

    async function feed() {
      const data = ensure();
      const today = date();
      if (data.cared === today || busy) return;
      const ups = [];
      data.sheep.forEach(sheep => {
        sheep.care++;
        if (sheep.lost) return;
        ups.push(gainExp(sheep, careExp(sheep, 15) + own(sheep, 'feedExp')));
      });
      data.cared = today;
      data.careDays = (data.careDays || 0) + 1;
      const extra = bonus('feedOil');
      addOil(1 + extra, 'field-care');
      Core.save();
      const pickLine = Math.floor(Math.random() * feeding.length);
      Sound.sfx('mission');
      voice('field-' + (pickLine + 1));
      render(`${feeding[pickLine]} 기름 +${1 + extra} · 모두 경험치 +15`);
      if (view && typeof view.feed === 'function') {
        busy = true;
        root.classList.add('is-busy');
        try { await Promise.race([view.feed(), wait(4500)]); } catch { /* 연출 실패 */ }
        busy = false;
        root.classList.remove('is-busy');
      } else {
        stageEl.querySelector('.field-map')?.insertAdjacentHTML('beforeend', '<span class="field-hay" aria-hidden="true">🌾</span>');
        data.sheep.forEach(s => react(s.id, 'eat'));
        await wait(700);
      }
      if (!alive) return;
      celebrate(ups);
      badges();
    }

    function sheepSheet(sheep) {
      selected = sheep.id;
      if (view) { focus(sheep.id); try { view.update(state()); } catch { /* 무시 */ } }
      const data = field();
      const sp = spec(sheep.species);
      const today = date();
      const pets = sheep.petDay === today ? sheep.petCount : 0;
      const need = needFor(sheep.level);
      const pct = sheep.level >= 10 ? 100 : Math.round(100 * sheep.exp / need);
      const isLeader = data.leader === sheep.id;
      const modal = sheet(sheep.name, `<div class="field-sheep-card">
          <div class="field-sheep-portrait ${sp.rarity}">${portraitHTML(sheep.species, { level: sheep.level, wear: sheep.wear })}</div>
          <div class="field-sheep-info">
            <p class="field-sheep-kind">${esc(sp.name)} ${rarityBadge(sp)}</p>
            <p class="field-sheep-stage">${stageName(sheep)}${sheep.wear ? ' · ' + esc(sheep.wear) : ''}${isLeader ? ' · ⭐ 순찰 대장' : ''}</p>
            <div class="field-level"><b>Lv ${sheep.level}</b><span class="field-exp"><i style="width:${pct}%"></i></span><small>${sheep.level >= 10 ? 'MAX' : `${sheep.exp}/${need}`}</small></div>
            <button type="button" class="link field-rename">✎ 이름 바꾸기</button>
          </div></div>
        ${sp.skill ? `<p class="field-skill ${active(sheep) ? '' : 'locked'}">${active(sheep) ? '✦ 특기' : '🔒 Lv3에 열림'} · ${esc(sp.skill.label)}</p>` : ''}
        <div class="field-sheep-actions">
          <button type="button" class="btn field-pet" ${pets >= PET_MAX ? 'disabled' : ''}>🤲 쓰다듬기 <small>(오늘 ${pets}/${PET_MAX})</small></button>
          <div class="row"><button type="button" class="btn ghost field-wear">꾸미기</button>
          <button type="button" class="btn ghost field-leader" ${isLeader ? 'disabled' : ''}>${isLeader ? '⭐ 순찰 대장' : '대장으로'}</button></div>
        </div>`, 'field-sheep-sheet', () => {
        if (selected === sheep.id) { selected = null; focus(null); if (view) { try { view.update(state()); } catch { /* 무시 */ } } }
      });
      modal.querySelector('.field-pet').onclick = () => pet(sheep);
      modal.querySelector('.field-wear').onclick = () => dress(sheep);
      modal.querySelector('.field-rename').onclick = () => rename(sheep);
      modal.querySelector('.field-leader').onclick = () => {
        field().leader = sheep.id;
        Core.save();
        Sound.sfx('select');
        render(`${josa(sheep.name, '이가')} 순찰 대장이 됐어 ⭐`);
        sheepSheet(sheep);
      };
    }

    function showHoldFeedback(message) {
      clearTimeout(holdTimer);
      holdFeedback.textContent = message;
      holdTimer = setTimeout(() => { holdFeedback.textContent = ''; }, 2700);
    }

    function pet(sheep, fromHold = false) {
      const today = date();
      if (sheep.petDay !== today) { sheep.petDay = today; sheep.petCount = 0; }
      if (sheep.petCount >= PET_MAX) {
        if (fromHold) showHoldFeedback('오늘은 충분히 쓰다듬었어.');
        return;
      }
      sheep.petCount++;
      const exp = sheep.level >= 10 ? 0 : Math.round(careExp(sheep, 3) + own(sheep, 'petExp'));
      const up = gainExp(sheep, exp);
      Core.save();
      sheepSound(sheep);
      navigator.vibrate?.(15);
      if (fromHold) {
        try { view?.update(state()); } catch { /* 다음 화면 갱신 때 다시 */ }
        queueThumb();
        const reward = exp ? ` · 경험치 +${exp}` : '';
        const level = up ? ` · Lv${sheep.level}!` : '';
        showHoldFeedback(`${josa(sheep.name, '이가')} 좋아해!${reward}${level} · 오늘 ${sheep.petCount}/${PET_MAX}`);
        if (up) celebrate([up], false);
        return;
      }
      render(`${josa(sheep.name, '이가')} 좋아해 ♥`);
      react(sheep.id, 'heart');
      sheepSheet(sheep);
      root.querySelector('.field-sheep-portrait')?.insertAdjacentHTML('beforeend', '<span class="field-heart" aria-hidden="true">♥</span>');
      if (up) celebrate([up]);
    }

    function rename(sheep) {
      const modal = sheet('이름 바꾸기', nameForm('이 이름으로', sheep.name));
      const input = modal.querySelector('input');
      input.value = sheep.name;
      modal.querySelector('form').onsubmit = event => {
        event.preventDefault();
        sheep.name = nameSheep(input.value, sheep.name);
        Core.save();
        modal.close();
        render(`이제 ${josa(sheep.name, '이라고는라고').replace(/이라고는라고$|라고$/, '')}`.trim() ? `이름을 바꿨어 · ${sheep.name}` : '');
        sheepSheet(sheep);
      };
    }

    function visitorSheet(id) {
      const data = ensure();
      const visitor = data.visitors.find(v => v.id === id);
      if (!visitor) return render('그 양은 벌써 떠났어.');
      const sp = spec(visitor.species);
      if (sp.id !== visitor.species) return render('손님 정보를 불러오지 못했어. 들판에 다시 들어와 봐.');
      const price = PRICE[sp.rarity] ?? 3;
      const oil = Core.data.oil || 0;
      const full = data.sheep.length >= MAX_SHEEP;
      const short = price > oil;
      if (view) focus(id);
      const modal = sheet(sp.rarity === 'legend' ? '전설의 양이 찾아왔어' : visitor.sunday ? '주일 손님' : '들판 입구의 손님', `<div class="field-visitor-card ${sp.rarity}">
          ${portraitHTML(sp.id, { level: 5 }, 'big')}
          <h3>${esc(sp.name)} ${rarityBadge(sp)}</h3>
          <p class="field-visitor-desc">${esc(sp.desc)}</p>
          ${sp.skill ? `<p class="field-skill">✦ 특기 (Lv3부터) · ${esc(sp.skill.label)}</p>` : ''}
          ${sp.rarity === 'legend' && sp.verse ? verseHTML(sp.verse) : ''}
        </div>
        <button type="button" class="btn field-adopt" ${full || short ? 'disabled' : ''}>데려오기 · ${price ? `기름 ${price}` : '무료'}</button>
        ${full ? `<p class="field-sheet-meta">들판이 가득 찼어. 최대 ${MAX_SHEEP}마리까지 키울 수 있어.</p>` : short ? `<p class="field-sheet-meta">기름 ${price - oil}방울이 더 필요해. 손님은 오늘 밤까지 기다려.</p>` : ''}
        <button type="button" class="btn ghost field-later">다음에</button>`, 'field-visitor-sheet', () => focus(null));
      modal.querySelector('.field-later').onclick = () => modal.close();
      modal.querySelector('.field-adopt').onclick = () => {
        const naming = sheet('이름 지어 주기', `<div class="field-name-art">${portraitHTML(sp.id, { level: 1 })}</div>${nameForm(`데려오기 · ${price ? '기름 ' + price : '무료'}`, sp.name)}`);
        naming.querySelector('form').onsubmit = event => {
          event.preventDefault();
          const result = adopt(id, naming.querySelector('input').value);
          naming.close();
          if (!result.ok) return render({ oil: '기름이 모자라.', full: '들판이 가득 찼어.', gone: '그 양은 벌써 떠났어.' }[result.why] || '');
          Sound.sfx('sheep');
          setTimeout(() => Sound.sfx('star'), 250);
          voice('field-6');
          render(`${josa(result.sheep.name, '이가')} 들판 식구가 됐어!${result.price ? ` 기름 -${result.price}` : ''}`);
          react(result.sheep.id, 'join');
          badges();
          if (sp.rarity !== 'common') {
            setTimeout(() => alive && cardSheet(sp.rarity === 'legend' ? '전설의 양 발견!' : '희귀 양 발견!',
              () => Card.drawDiscover(result.sheep), 'SHEEP:' + sp.id, `${sp.name} 발견 카드`), view ? 1300 : 300);
          }
        };
      };
    }

    function dexSheet() {
      const data = ensure();
      const list = dexList();
      const got = list.filter(s => data.dex[s.id]).length;
      const modal = sheet('양 도감', `<p class="field-sheet-meta">모은 양 <strong>${got}/${list.length}</strong> · 찾아온 양을 데려오면 도감이 채워져.</p>
        <div class="field-dex-grid">${list.map(s => {
          const mine = data.dex[s.id];
          const sheep = data.sheep.find(x => x.species === s.id);
          return `<button type="button" class="field-dex-cell ${s.rarity} ${mine ? 'got' : ''}" data-dex="${s.id}">
            ${mine ? portraitHTML(s.id, { level: sheep?.level || 5, wear: sheep?.wear }) : s.rarity === 'legend' ? '<span class="field-dex-q">???</span>' : portraitHTML(s.id, { level: 5, silhouette: true })}
            <span>${mine ? esc(s.name) : s.rarity === 'legend' ? '전설' : '?'}</span></button>`;
        }).join('')}</div>`, 'field-dex-sheet');
      modal.querySelectorAll('[data-dex]').forEach(button => { button.onclick = () => dexDetail(button.dataset.dex); });
    }

    function dexDetail(speciesId) {
      const data = field();
      const sp = spec(speciesId);
      const met = data.dex[sp.id];
      const sheep = data.sheep.find(x => x.species === sp.id);
      let body;
      if (met) {
        body = `<div class="field-visitor-card ${sp.rarity}">${portraitHTML(sp.id, { level: sheep?.level || 5, wear: sheep?.wear }, 'big')}
          <h3>${esc(sp.name)} ${rarityBadge(sp)}</h3>
          <p class="field-visitor-desc">${esc(sp.desc)}</p>
          ${sp.skill ? `<p class="field-skill">✦ 특기 · ${esc(sp.skill.label)}</p>` : ''}
          ${sp.verse ? verseHTML(sp.verse) : ''}
          <p class="field-sheet-meta">처음 만난 날 ${esc(Core.dateLabel(met))}${sheep ? ` · 「${esc(sheep.name)}」 Lv${sheep.level}` : ''}</p></div>`;
      } else if (sp.rarity === 'legend') {
        body = `<div class="field-visitor-card legend"><span class="field-dex-q big">???</span>
          <h3>전설의 양 ${rarityBadge(sp)}</h3><p class="field-visitor-desc">조건: ${esc(sp.cond || '')}</p>
          <p class="field-sheet-meta">조건을 채우면 한 번 찾아와.</p></div>`;
      } else {
        body = `<div class="field-visitor-card ${sp.rarity}">${portraitHTML(sp.id, { level: 5, silhouette: true }, 'big')}
          <h3>? ${rarityBadge(sp)}</h3>
          <p class="field-visitor-desc">${sp.rarity === 'rare' ? `들판에 「${esc(sp.attract)}」${Core.josa(sp.attract, '이가').slice(-1)} 있으면…` : '아직 못 만난 양이야. 언젠가 들판에 찾아와.'}</p></div>`;
      }
      const modal = sheet(met ? sp.name : '도감', body + '<button type="button" class="btn ghost field-dex-back">도감으로</button>', 'field-dex-detail');
      modal.querySelector('.field-dex-back').onclick = dexSheet;
    }

    function shop() {
      const data = ensure();
      const oil = Core.data.oil || 0;
      const hint = id => {
        const want = lureOf(id).filter(s => !data.dex[s.id]);
        return want.length ? `<small class="field-lure">이걸 놓으면 ${esc(want.map(s => s.name).join('·'))}${Core.josa(want[want.length - 1].name, '이가').slice(-1)} 올지도 몰라.</small>` : '';
      };
      const places = market.filter(([, kind]) => kind !== 'wear');
      const wears = market.filter(([, kind]) => kind === 'wear');
      const modal = sheet('들판 장터', `<p class="field-sheet-meta">기름 <strong>${oil}방울</strong> · 새 양은 들판 입구에서 만날 수 있어.</p>
        <div class="field-shop-list">${places.map(([id, kind, cost]) => `<div class="field-shop-row">
          ${icon(id, kind)}<div><b>${esc(id)}</b>${kind === 'sky' ? '<small>하늘 칸</small>' : ''}${hint(id)}
          ${available(id) ? `<button type="button" class="link" data-place="${esc(id)}">${available(id)}개 보유 · 놓기 ›</button>` : ''}</div>
          <button type="button" class="btn small" data-buy="${esc(id)}" ${oil < cost ? 'disabled' : ''}>${cost}방울</button></div>`).join('')}</div>
        <h3 class="field-sub">꾸미기</h3>
        <div class="field-shop-grid">${wears.map(([id, kind, cost]) =>
          `<button type="button" data-buy="${esc(id)}" ${oil < cost ? 'disabled' : ''}>${icon(id, kind)}<span>${esc(id)}</span><b>${cost}방울</b></button>`).join('')}</div>`, 'field-shop-sheet');
      modal.querySelectorAll('[data-buy]').forEach(button => {
        button.onclick = () => {
          const id = button.dataset.buy;
          const [, kind, cost] = market.find(item => item[0] === id);
          if (!spendOil(cost)) return;
          giveItem(id);
          Sound.sfx('pop');
          modal.close();
          if (kind === 'wear') { render(`${josa(id, '을를')} 샀어. 양을 눌러 달아 줘.`); return shop(); }
          startPlacing(id, `${josa(id, '을를')} 샀어.`);
        };
      });
      modal.querySelectorAll('[data-place]').forEach(button => {
        button.onclick = () => { modal.close(); startPlacing(button.dataset.place); };
      });
    }

    function startPlacing(item, prefix = '') {
      const data = field();
      if (!allowedSlots(data, { item }).length) return render(`${prefix} 놓을 자리가 없어. 들판에 있는 물건을 눌러 치워 봐.`.trim());
      moving = { index: null, item };
      render(prefix);
    }

    function selectSlot(index) {
      const data = field();
      if (!Number.isInteger(index) || index < 0 || index >= slots.length) return;
      if (moving) {
        if (!allowedSlots(data, moving).includes(index)) return;
        const { item, index: from } = moving;
        if (from != null) {
          if (data.slots[from] !== item) { moving = null; return render(); }
          delete data.slots[from];
        } else if (!available(item)) { moving = null; return render(); }
        data.slots[index] = item;
        moving = null;
        Core.save();
        Sound.sfx('pop');
        render(from != null ? '자리를 옮겼어.' : `${josa(item, '을를')} 놓았어.${lureOf(item).some(s => !data.dex[s.id]) ? ' 누가 찾아올지도 몰라.' : ''}`);
        return badges();
      }
      const id = data.slots[index];
      if (id) {
        const modal = sheet(id, `<div class="field-inventory-icon">${sprite(objects[id] || '')}</div>
          <div class="row"><button type="button" class="btn field-move">옮기기</button><button type="button" class="btn ghost field-remove">치우기</button></div>`);
        modal.querySelector('.field-move').onclick = () => {
          if (!allowedSlots(data, { item: id }).length) { modal.close(); return render('옮길 자리가 없어.'); }
          moving = { index, item: id };
          modal.close();
          render();
        };
        modal.querySelector('.field-remove').onclick = () => {
          delete data.slots[index];
          Core.save();
          modal.close();
          render('물건을 보관했어.');
        };
        return;
      }
      const kind = index < 8 ? 'ground' : 'sky';
      const items = market.filter(([item, itemKind]) => itemKind === kind && available(item));
      const modal = sheet(kind === 'sky' ? '하늘에 놓기' : '들판에 놓기', items.length ?
        `<div class="field-shop-grid">${items.map(([item]) => `<button type="button" data-place="${esc(item)}">${icon(item, kind)}<span>${esc(item)}</span><b>${available(item)}개</b></button>`).join('')}</div>` :
        '<p class="field-sheet-meta">들판 장터에서 물건을 사면 이 칸에 놓을 수 있어.</p>');
      modal.querySelectorAll('[data-place]').forEach(button => {
        button.onclick = () => {
          const item = button.dataset.place;
          if (data.slots[index] || !available(item)) return;
          data.slots[index] = item;
          Core.save();
          modal.close();
          render(`${josa(item, '을를')} 놓았어.`);
          badges();
        };
      });
    }

    function dress(sheep) {
      const items = Object.keys(catalog).filter(id => catalog[id] === 'wear' && (available(id) || sheep.wear === id));
      const modal = sheet(sheep.name + ' 꾸미기', `<div class="field-pet-art">${portraitHTML(sheep.species, { level: sheep.level, wear: sheep.wear })}</div>
        ${items.length ? `<div class="field-shop-grid">${items.map(id => `<button type="button" data-wear="${esc(id)}" aria-pressed="${sheep.wear === id}">${icon(id, 'wear')}<span>${esc(id)}</span><b>${sheep.wear === id ? '착용 중' : '달아 주기'}</b></button>`).join('')}</div>` : '<p class="field-sheet-meta">장터에서 꾸미기 아이템을 골라 봐.</p>'}
        ${sheep.wear ? '<button type="button" class="btn ghost field-unwear">벗기기</button>' : ''}`);
      const wear = id => {
        if (id && sheep.wear !== id && !available(id)) return;
        sheep.wear = id;
        Core.save();
        Sound.sfx('pop');
        modal.close();
        render(id ? `${josa(id, '을를')} 달았어.` : '장식을 벗겼어.');
        dress(sheep);
      };
      modal.querySelectorAll('[data-wear]').forEach(button => { button.onclick = () => wear(button.dataset.wear); });
      modal.querySelector('.field-unwear')?.addEventListener('click', () => wear(null));
    }

    function search(sheep) {
      const modal = sheet('잃은 양 찾기', '<div class="gamebox"></div>');
      Games.어둠찾기(modal.querySelector('.gamebox'), {
        done() {
          if (!modal.open || !sheep.lost) return;
          sheep.lost = false;
          field().found = (field().found || 0) + 1;
          field().foundTotal = field().found;
          const oil = 2 + bonus('lostOil');
          addOil(oil, 'field-found');
          const up = gainExp(sheep, 20);
          Core.save();
          voice('field-5');
          modal.close();
          render(`${josa(sheep.name, '이가')} 돌아왔어! 기름 +${oil} · 경험치 +20`);
          react(sheep.id, 'join');
          const text = (window.BIBLE || {})['눅 15:4'] || verse;
          sheet(`찾았어! · 기름 +${oil}`, `<p class="field-found-line">${foundLine}</p>
            <blockquote class="field-verse">${esc(Array.isArray(text) ? text[0] : text)}<cite>누가복음 15:4</cite></blockquote>`);
          if (up) setTimeout(() => celebrate([up]), 600);
          badges();
        }
      }, '양');
    }

    /* 밤 순찰 */
    function patrolSheet() {
      const data = ensure();
      const leader = leaderSheep(data);
      if (!leader) return;
      const sp = spec(leader.species);
      const today = date();
      const rewarded = data.patrolDay === today;
      const ok3d = !!view && typeof view.patrol === 'function';
      const skill = sp.skill && PATROL_TYPES.includes(sp.skill.type) ? sp.skill : null;
      const effect = skill ? (active(leader) ? `✦ ${skill.label}` : `🔒 Lv3에 열림 · ${skill.label}`) : '순찰 특기 없음 · 꾸벅이, 까망이, 콩알이를 대장으로 세워 봐.';
      const modal = sheet('🔦 밤 순찰', `<div class="field-patrol-head">
          <div class="field-sheep-portrait ${sp.rarity}">${portraitHTML(leader.species, { level: leader.level, wear: leader.wear })}</div>
          <div><small>순찰 대장 ⭐</small><b>${esc(leader.name)} · Lv${leader.level}</b><p class="field-skill ${skill && active(leader) ? '' : 'locked'}">${esc(effect)}</p></div></div>
        <p class="field-patrol-how">등불을 비추면 양이 우리로 걸어가. 늑대 그림자도 빛으로 쫓아내 봐.</p>
        <ul class="field-patrol-meta"><li>${rewarded ? '오늘 보상은 받았어 · 지금은 연습' : '오늘 첫 판 보상 · 기름 최대 5방울 + 대장 경험치'}</li><li>최고 기록 ${data.patrolBest}마리</li></ul>
        ${ok3d ? '<button type="button" class="btn field-patrol-go">🔦 순찰 시작</button>' :
          `<p class="field-sheet-meta field-patrol-no">${mode === 'loading' ? '들판을 불러오는 중이야. 잠깐 뒤에 다시 눌러 줘.' : '이 기기에서는 3D 순찰을 할 수 없어.'}</p>`}
        <small class="field-sheet-tip">양을 눌러 순찰 대장을 바꿀 수 있어.</small>`, 'field-patrol-sheet');
      modal.querySelector('.field-patrol-go')?.addEventListener('click', () => { modal.close(); runPatrol(); });
    }

    async function runPatrol() {
      if (!view || busy) return;
      const data = ensure();
      const leader = leaderSheep(data);
      busy = true;
      root.classList.add('is-busy', 'patrolling');
      holdFeedback.textContent = '';
      stageEl.scrollIntoView?.({ block: 'start', behavior: 'smooth' });
      Sound.music('patrol');
      Sound.ambience(null);
      const lastCue = new Map();
      const params = {
        seconds: PATROL_SECONDS + bonus('patrolTime'),
        flock: data.sheep.filter(s => !s.lost).slice(0, FLOCK_SHOW).map(s => ({ id: s.id, species: s.species, level: s.level, wear: s.wear || null, name: s.name })),
        fillTo: 8,
        lampBonus: bonus('lamp'),
        speedBonus: bonus('patrolSpeed'),
        wolfRate: leader?.species === 'david' && active(leader) ? 0.7 : 1,
        onSfx(kind) {
          const cue = PATROL_CUES[kind];
          if (!alive || !Array.isArray(cue)) return;
          const now = performance.now();
          if (now - (lastCue.get(kind) ?? -Infinity) < 110) return;
          lastCue.set(kind, now);
          Sound.sfx(cue[0]);
          navigator.vibrate?.(cue[1]);
          if (kind === 'end') Sound.music('night');
        }
      };
      let result = null;
      try { result = await view.patrol(params); } catch { result = null; }
      busy = false;
      root.classList.remove('is-busy', 'patrolling');
      if (!alive) return;
      Sound.music('night');
      Sound.ambience('나의 들판');
      if (!result) return render('순찰을 마치지 못했어. 다시 해 볼까?');
      const total = Math.max(1, Number(result.total) || 1);
      const penned = Math.max(0, Math.min(total, Number(result.penned) || 0));
      const scared = Math.max(0, Number(result.scared) || 0);
      const today = date();
      const first = data.patrolDay !== today;
      let oil = 0, exp = 0, up = null;
      if (first) {
        oil = Math.min(5, 1 + Math.floor(4 * penned / total));
        exp = 10 + penned * 3;
        addOil(oil, 'patrol');
        if (leader) up = gainExp(leader, exp);
        data.patrolDay = today;
      }
      const best = penned > data.patrolBest;
      if (best) data.patrolBest = penned;
      Core.save();
      const timeLeft = Math.max(0, Math.round(Number(result.timeLeft) || 0));
      const ratio = penned / total;
      const stars = penned === total || (ratio >= 7 / 8 && timeLeft >= 10) ? 3 : ratio >= 7 / 8 ? 2 : ratio >= 5 / 8 ? 1 : 0;
      const record = { penned, total, scared, timeLeft, stars, leader: leader?.name || '', leaderSpecies: leader?.species || 'cotton', best, date: today };
      const rating = '★'.repeat(stars);
      const caption = `오늘 밤 순찰 ${rating ? rating + ' ' : ''}${penned}/${total}! 너도 해 봐`;
      render(first ? `순찰 끝! 기름 +${oil}` : '연습 순찰 끝!');
      const modal = sheet('순찰 결과', `<div class="field-patrol-result">
          <div class="field-patrol-rating" role="img" aria-label="별 ${stars}/3"><span>${rating}</span><span class="empty-stars">${'☆'.repeat(3 - stars)}</span></div>
          <p class="field-patrol-score"><b>${penned}</b><span>/${total}</span></p><p>우리 안에 들어온 양</p>
          <ul>${timeLeft ? `<li>⏱ ${timeLeft}초 남음</li>` : ''}<li>🐺 쫓은 늑대 ${scared}</li>${first ? `<li>◕ 기름 +${oil}</li><li>⭐ ${esc(leader?.name || '')} 경험치 +${exp}</li>` : '<li>오늘 보상은 이미 받았어 · 연습 순찰</li>'}
          ${best ? '<li class="best">🏆 최고 기록 갱신!</li>' : `<li>최고 기록 ${data.patrolBest}마리</li>`}</ul></div>
        <button type="button" class="btn field-patrol-card">순찰 기록 카드 공유</button>
        <button type="button" class="btn ghost field-patrol-again">한 번 더</button>`, 'field-patrol-sheet');
      modal.querySelector('.field-patrol-card').onclick = () => cardSheet('순찰 기록 카드', () => Card.drawPatrol(record), 'PATROL', '밤 순찰 기록 카드', caption);
      modal.querySelector('.field-patrol-again').onclick = () => { modal.close(); patrolSheet(); };
      if (up) setTimeout(() => celebrate([up]), 500);
      badges();
    }

    async function cardSheet(title, draw, fileId, alt, caption) {
      const modal = sheet(title, '<p class="field-sheet-meta" role="status">카드를 그리는 중…</p>', 'field-card-sheet');
      try {
        const canvas = await draw();
        const blob = await Card.toBlob(canvas);
        if (!modal.open) return;
        const url = URL.createObjectURL(blob);
        modal.addEventListener('close', () => URL.revokeObjectURL(url), { once: true });
        modal.querySelector('.field-sheet-meta').outerHTML = `<img class="field-card-preview" src="${url}" alt="${esc(alt)}">
          ${caption ? `<label class="field-share-url">공유 문구<input type="text" readonly value="${esc(caption)}"></label>
          <button type="button" class="btn ghost field-caption-copy">공유 문구 복사</button>` : ''}
          <div class="row"><button type="button" class="btn field-share">카톡으로 공유</button>
          <a class="btn ghost" href="${url}" download="${esc(Card.fileName?.(fileId, true) || '그밤-들판.png')}">이미지 저장</a></div>
          <p class="field-save-note" role="status"></p>`;
        const status = modal.querySelector('.field-save-note');
        const copy = modal.querySelector('.field-caption-copy');
        if (copy) copy.onclick = async () => {
          const input = modal.querySelector('.field-share-url input');
          try {
            await navigator.clipboard.writeText(caption);
            status.textContent = '공유 문구를 복사했어!';
          } catch {
            input.focus();
            input.select();
            status.textContent = '선택한 문구를 복사해 줘.';
          }
        };
        modal.querySelector('.field-share').onclick = async () => {
          try {
            if (await Card.share(canvas, fileId, caption, blob) !== 'fallback') return;
          } catch { /* 이미지를 길게 눌러 저장하는 방법으로 안내한다. */ }
          status.textContent = '이미지를 꾹 누르거나 「이미지 저장」을 눌러 줘.';
        };
      } catch {
        if (modal.open) modal.querySelector('.field-sheet-meta').textContent = '카드를 그리지 못했어. 다시 열어 봐.';
      }
    }

    // 미리보기(?preview=all) 전용 시험 도구
    function testTools() {
      if (!Core.PREVIEW_ALL) return '';
      const tools = [['oil', '기름 +20'], ['day', '하루 넘기기'], ['lost', '잃은 양 부르기'], ['visit', '방문객 부르기'], ['rare', '희귀 부르기'],
        ['legend', '전설 조건 모두 채우기'], ['exp', '모든 양 +100 경험치'], ['patrol', '순찰 보상 초기화']];
      return `<div class="field-test-tools"><small>🧪 미리보기 전용 시험 도구${mode === '2d' ? ' · 2D 화면' : mode === '3d' ? ' · 3D 화면' : ''}</small>
        <div class="field-test-row">${tools.map(([k, label]) => `<button type="button" class="btn ghost small" data-t="${k}">${label}</button>`).join('')}</div></div>`;
    }
    function bindTestTools(data) {
      const box = manage.querySelector('.field-test-tools');
      if (!box) return;
      const on = (key, fn) => { const b = box.querySelector(`[data-t=${key}]`); if (b) b.onclick = fn; };
      on('oil', () => { addOil(20, 'test'); Core.save(); render('🧪 기름 +20'); });
      on('day', () => {
        data.cared = '';
        data.sheep.forEach(s => { s.petDay = ''; s.petCount = 0; });
        data.visitRoll = 0;
        Core.save();
        render('🧪 하루가 지났어요 · 꼴 주기·쓰다듬기를 다시 할 수 있어요');
      });
      on('lost', () => {
        const left = data.sheep.filter(s => !s.lost);
        if (!left.length) return render('🧪 길 잃을 양이 없어요');
        left[Math.floor(Math.random() * left.length)].lost = true; data.lostOn = date(); Core.save(); render('🧪 양 한 마리가 길을 잃었어요');
      });
      const call = kind => {
        const v = visitCheck(kind || true);
        render(v ? `🧪 ${spec(v.species).name}${Core.josa(spec(v.species).name, '이가').slice(-1)} 들판 입구에 왔어요` : '🧪 부를 수 있는 양이 없어요');
        if (v && view && spec(v.species).rarity !== 'legend') focus(v.id);
      };
      on('visit', () => call());
      on('rare', () => call('rare'));
      on('legend', () => { data.testLegends = true; Core.save(); render('🧪 전설 조건을 모두 채웠어요 · 방문객 부르기를 눌러 봐'); });
      on('exp', () => {
        const ups = data.sheep.map(s => gainExp(s, 100));
        Core.save();
        render('🧪 모든 양 경험치 +100');
        celebrate(ups);
        badges();
      });
      on('patrol', () => { data.patrolDay = ''; Core.save(); render('🧪 오늘 순찰 보상을 다시 받을 수 있어요'); });
    }

    render();
    if (mode === 'loading') start3D();
  }

  function mapMarkup(data, moving) {
    const slotsHTML = slots.map(([x, y], i) => {
      const id = data.slots[i];
      const allowed = !moving || (!id && catalog[moving.item] === (i < 8 ? 'ground' : 'sky'));
      return `<button type="button" class="field-slot ${id ? 'occupied' : ''} ${moving && allowed ? 'destination' : ''}" style="${position(x, y)}"
        aria-label="${id ? esc(id) : (i < 8 ? '들판 칸 ' + (i + 1) : '하늘 칸 ' + (i - 7))} 선택" data-slot="${i}" ${allowed ? '' : 'disabled'}>
        ${id ? sprite(objects[id] || '') : '<span aria-hidden="true">+</span>'}</button>`;
    }).join('');
    const flockHTML = data.sheep.slice(0, MAX_SHEEP).map((sheep, i) => {
      const [x, y] = pasture[i];
      if (sheep.lost) return '';
      return `<button type="button" class="field-sheep" style="${position(x, y)};--delay:${-i * 1.47}s;--drift:${i % 2 ? -12 : 12}px;z-index:${3 + Math.round(y / 40)}" data-sheep-id="${esc(sheep.id)}" data-stage="${stage(sheep)}"
        aria-label="${esc(sheep.name)} · Lv${sheep.level}" ${moving ? 'disabled' : ''}>${sprite(sheepArt(sheep), '-40 -50 80 58')}</button>`;
    }).join('');
    const visitorsHTML = activeVisitors(data).map((v, i) => {
      const [x, y] = gate[i];
      return `<button type="button" class="field-visitor" style="${position(x, y)}" data-visitor="${esc(v.id)}" aria-label="들판 입구에 온 양" ${moving ? 'disabled' : ''}>
        ${sprite(sheepArt({ species: v.species, level: 5 }), '-40 -50 80 58')}<i aria-hidden="true">!</i></button>`;
    }).join('');
    return `<div class="field-map">${svg(scenery())}
      ${data.items['마구간'] ? `<span class="field-stable" style="${position(184, 209)}" aria-label="마구간" role="img">${sprite(objects['마구간'], '-48 -73 96 83')}</span>` : ''}
      ${Object.values(data.slots).includes('별똥별 비') ? `<span class="field-meteor">${sprite(trail, '-56 -27 65 36')}</span>` : ''}
      ${slotsHTML}${flockHTML}${visitorsHTML}</div>`;
  }

  function icon(id, kind) {
    return sprite(kind === 'wear' ? sheepArt({ species: 'cotton', level: 3, wear: id }, { noAcc: false }) : objects[id]);
  }

  function nameForm(label, fallback) {
    return `<form class="field-name"><label>양 이름<input name="sheep-name" placeholder="${esc(fallback)}" maxlength="8" autocomplete="off" enterkeyhint="done"></label>
      <button class="btn" type="submit">${esc(label)}</button></form>`;
  }

  function firstLamb(box) {
    Art.setChapter(4);
    box.innerHTML = `<section class="field-story field-first">
      <div class="field-story-art">${Art.render('들판').replace('0 0 360 540', '0 58 360 482').replace('xMidYMid slice', 'xMidYMax slice')}</div>
      <div class="field-story-content">
        <div class="field-story-talk"><strong>할아버지</strong><p></p><button type="button" class="btn ghost">계속</button></div>
      </div></section>`;
    const scene = box.querySelector('.field-first');
    const content = scene.querySelector('.field-story-content');
    const lines = ['오늘 새벽에 태어난 녀석이다.', '성탄까지 네가 맡아 주겠니? 이름을 지어 주렴.'];
    const viewport = window.visualViewport;
    const fit = () => {
      box.style.setProperty('--lamb-viewport', `${viewport?.height || window.innerHeight}px`);
      box.style.setProperty('--lamb-top', `${viewport?.offsetTop || 0}px`);
    };
    return new Promise(resolve => {
      let i = 0;
      let active = true, allow3D = true, view = null, followTimer = 0;
      const observer = new MutationObserver(() => {
        if (!scene.isConnected) finish();
      });
      // Canvas 안의 이름표는 매 프레임 바뀌므로 오버레이를 떼는 부모만 관찰한다.
      for (let node = scene.parentElement; node; node = node.parentElement) observer.observe(node, { childList: true });

      function drop3D() {
        clearInterval(followTimer);
        viewport?.removeEventListener('resize', fit);
        viewport?.removeEventListener('scroll', fit);
        window.removeEventListener('resize', fit);
        box.style.removeProperty('--lamb-viewport');
        box.style.removeProperty('--lamb-top');
        box.classList.remove('field-welcome-overlay');
        scene.classList.remove('is-3d');
        try { view?.destroy(); } catch { /* 이미 정리됨 */ }
        view = null;
        scene.querySelector('.field-story-3d')?.remove();
      }
      function finish() {
        if (!active) return;
        active = false;
        observer.disconnect();
        drop3D();
        resolve();
      }

      const initial = { ...stateOf(ensure()), sheep: [], visitors: [] };
      const supports3D = can3D();
      const opening = (async () => {
        if (!supports3D || !await prepareDex() || !await load3D() || !active || !allow3D) return;
        const host = document.createElement('div');
        host.className = 'field-story-3d';
        host.style.visibility = 'hidden';
        scene.insertBefore(host, content);
        let mounted;
        try {
          mounted = await Field3D.mount(host, initial);
          if (!active || !allow3D || typeof mounted.welcome !== 'function') {
            mounted.destroy();
            host.remove();
            return;
          }
          view = mounted;
          fit();
          viewport?.addEventListener('resize', fit);
          viewport?.addEventListener('scroll', fit);
          window.addEventListener('resize', fit);
          box.classList.add('field-welcome-overlay');
          scene.classList.add('is-3d');
          host.style.visibility = '';
        } catch { host.remove(); }
      })();
      const say = () => {
        content.querySelector('p').textContent = lines[i];
        voice('lamb-' + (i + 1));
      };
      say();
      content.querySelector('button').onclick = () => {
        if (++i < lines.length) return say();
        content.innerHTML = `<div class="field-story-lamb">${sprite(sheepArt({ species: 'cotton', level: 1 }), '-37 -43 74 51')}</div>${nameForm('이 이름으로 맡을게', '첫눈')}`;
        content.querySelector('form').onsubmit = async event => {
          event.preventDefault();
          if (has()) return finish();
          const name = nameSheep(event.currentTarget.elements['sheep-name'].value, '첫눈');
          const data = ensure();
          data.since = date();
          const sheep = newSheep(data, name, 'cotton');
          data.sheep.push(sheep);
          data.dex.cotton = data.dex.cotton || date();
          Core.save();
          if (supports3D) content.innerHTML = '<div class="field-arrival field-welcome-progress" role="status">🐑 오솔길에서 이쪽으로 오고 있어…</div>';
          await Promise.race([opening, wait(3500)]);
          allow3D = false;
          if (!active) return;
          if (view) {
            try {
              view.update(stateOf(data));
              const arrival = view.welcome(sheep.id);
              const follow = () => { try { view?.focus(sheep.id); } catch { /* 걷기 연출은 계속 */ } };
              follow();
              followTimer = setInterval(follow, 600);
              await Promise.race([arrival, wait(12000)]);
            } catch { drop3D(); }
            finally { clearInterval(followTimer); }
          }
          if (!active) return;
          if (view) {
            try {
              const thumb = await view.snapshot(360, 400);
              if (active) saveThumb(thumb);
            } catch { /* 썸네일 없이도 도착 표시 */ }
            if (!active) return;
          }
          Sound.sfx('star');
          content.innerHTML = `<div class="field-arrival" role="status">${view ? '' : `<div class="field-burst" aria-hidden="true">${Array.from({ length: 12 }, (_, i) => {
            const angle = i * Math.PI / 6;
            return `<span style="--dx:${Math.cos(angle) * 105}px;--dy:${Math.sin(angle) * 65}px;--delay:${i % 3 * .045}s">${i % 2 ? '✧' : '✦'}</span>`;
          }).join('')}</div>`}<p>🐑 ${esc(josa(name, '이가'))} 네 들판에 왔어!</p></div>`;
          await wait(view ? 1700 : 950);
          finish();
        };
      };
    });
  }

  function receiveFirstLamb(box) {
    if (receiving.has(box)) return receiving.get(box);
    if (has()) return Promise.resolve();
    if (window.__fast) {
      const data = ensure();
      data.since = date();
      data.sheep.push(newSheep(data, '테스트양', 'cotton'));
      data.dex.cotton = data.dex.cotton || date();
      Core.save();
      return Promise.resolve();
    }
    const result = firstLamb(box).finally(() => { receiving.delete(box); });
    receiving.set(box, result);
    return result;
  }

  async function flockScene(box) {
    if (!has()) return;
    if (!window.__fast) await prepareDex();
    const data = ensure();
    const flock = data.sheep.slice(0, FLOCK_SHOW);
    const line = '네가 돌본 양들도, 그 밤 구유 곁에 있었다.';
    if (!window.__fast) {
      let played = false;
      if (window.SHEEP_DEX && can3D() && await load3D()) {
        box.innerHTML = `<section class="field-story field-flock is-3d"><div class="field-story-3d"></div>
          <div class="field-story-content"><div class="field-story-talk"><p>${line}</p>
          <button type="button" class="btn ghost" disabled>계속</button></div></div></section>`;
        let view = null;
        try {
          view = await Field3D.mount(box.querySelector('.field-story-3d'), stateOf(data), {});
          Sound.sfx('sheep');
          await view.procession(flock.map(s => ({ id: s.id, species: s.species, name: s.name, level: s.level, wear: s.wear || null })));
          played = true;
        } catch { played = false; }
        if (played) {
          const button = box.querySelector('.field-story-talk button');
          button.disabled = false;
          await new Promise(resolve => { button.onclick = resolve; });
        }
        try { view?.destroy(); } catch { /* 무시 */ }
      }
      if (!played) {
        Art.setChapter(4);
        box.innerHTML = `<section class="field-story field-flock">
          <div class="field-story-art">${Art.render('마구간')}</div>
          <div class="field-procession">${flock.map((sheep, i) => `<div class="field-procession-sheep" style="--col:${12.5 + (i % 4) * 25}%;--row:${29 + Math.floor(i / 4) * 28}%;--arrival:${i * .25}s">
            ${sprite(sheepArt(sheep), '-36 -43 72 53')}<span>${esc(sheep.name)}</span></div>`).join('')}</div>
          <div class="field-story-content"><div class="field-story-talk"><p>${line}</p>
            <button type="button" class="btn ghost" disabled>계속</button></div></div></section>`;
        const button = box.querySelector('.field-story-talk button');
        Sound.sfx('sheep');
        await wait(950 + (flock.length - 1) * 250);
        button.disabled = false;
        await new Promise(resolve => { button.onclick = resolve; });
      }
    }
    data.items['마구간'] = 1;
    Core.save();
  }

  // 들판 카드·홈 썸네일용 그림: 열려 있는 3D 들판 → 저장된 썸네일 → 2D 그림
  async function snapshot(w = 960, h = 1000) {
    const view = current?.view;
    if (view && typeof view.snapshot === 'function') {
      try { const url = await view.snapshot(w, h); if (typeof url === 'string' && url.startsWith('data:image/')) return url; } catch { /* 다음 방법 */ }
    }
    return readThumb() || svgURL(svg(mapArt(ensure(), true)));
  }

  function summary() {
    const data = ensure();
    const top = data.sheep.slice().sort((a, b) => b.level - a.level || b.exp - a.exp)[0] || null;
    return { sheep: data.sheep.length, dex: Object.keys(data.dex).length, dexTotal: dexTotal(), top, oilEarned: Core.data.oilEarned || 0 };
  }

  const drawCard = () => Card.drawField();

  window.Field = {
    ensure, has, panelHTML, bindPanel, page, receiveFirstLamb, flockScene, giveItem, drawCard, lostCheck, stats,
    bonus, portrait, snapshot, summary, spec, dexList, visitCheck, awardChapterGuest, gainExp, sheepArt, visitShared, prepareDex, prewarm, homeThumb
  };
})();
