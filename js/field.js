/* 나의 들판 · 내 양 돌보기 · 친구 양 · 밤 순찰 · 배치와 이야기 연출
   3D 화면은 js/field3d.js(window.Field3D)가 그리고, 없거나 안 되면 이 파일의 2D 그림으로 대신한다. */
(function () {
  const MAX_SHEEP = 24;
  const FLOCK_SHOW = 12;                 // 순찰·성탄 장면에 나오는 최대 마릿수
  const DAY_MS = 86400000;
  const VISIT_GAP = 3 * 3600e3;          // 방문 판정 간격
  const PET_MAX = 3;
  const VISIT_MILESTONES = [3, 7, 14];
  const PATROL_SECONDS = 40;
  const PATROL_CUES = {
    start: ['patrolStart', 25], pen: ['patrolPen', 14], scare: ['patrolScare', [18, 30, 24]],
    bump: ['patrolBump', 40], end: ['patrolEnd', 30]
  };
  const GAME_LINE = '대림절 27일 동안, 할아버지가 맡긴 새끼 양을 키워 성탄 밤 함께 구유로 가는 이야기.';
  const FIRST_STORY_HINT = '첫 이야기를 보면 할아버지가 양을 맡겨 줘.';
  const MAIN_STAGES = [
    { days: 0, level: 1, label: '새끼 양' }, { days: 3, level: 3, label: '어린 양' },
    { days: 8, level: 6, label: '큰 양' }, { days: 14, level: 10, label: '빛나는 양' }
  ];
  const GIFTS = [
    { id: 'scarf', title: '따뜻한 목도리', to: '사가랴', wool: { white: 4, brown: 2 },
      note: n => [`${n}, 네 목도리 덕분에 지붕 위 밤바람이 하나도 안 춥다.`, '아직 말은 못 하지만 서판에 적는다. 고맙다.'] },
    { id: 'cushion', title: '작업장 방석', to: '요셉', episode: '2-0', wool: { white: 5, black: 3, brown: 2 },
      note: n => ['작업장에 앉을 때마다 네 방석이 생각날 거야.', `손으로 만든 건 마음이 남지. 고마워, ${n}.`] },
    { id: 'swaddle', title: '아기 포대기', to: '마리아', episode: '3-0', wool: { white: 6, pink: 3, blue: 3 },
      note: n => ['이 포대기, 아기를 처음 안을 때 꼭 쓸게.', `하나님이 하실 일을 함께 기다려 줘서 고마워, ${n}.`] },
    { id: 'blanket', title: '구유 이불', to: '아기 예수님', episode: '4-0', wool: { white: 8, gold: 2 }, any: 6,
      note: n => ['구유에 네 이불을 깔아 두마.', `그 밤 오실 아기가 따뜻하시도록. 수고했다, ${n}.`] }
  ];
  const WOOL_IDS = ['white', 'black', 'brown', 'pink', 'blue', 'gold', 'green', 'purple'];
  const COLORED_WOOL = WOOL_IDS.slice(1);
  const BASIC_GUIDES = {
    wear: { title: '👗 옷장', hint: '여기를 눌러 내 양에게 옷을 골라 줘.', selector: '.field-wear-shop' },
    gift: { title: '🎁 선물 상자', hint: '여기를 눌러 양털로 만들 선물을 봐.', selector: '.field-gift-box' },
    flock: { title: '🐑 내 양', hint: '여기를 눌러 내 양과 놀러 온 친구들을 봐.', selector: '.field-flock' }
  };
  const SHEPHERD_VERSES = [
    { verse: '시 23:1' }, { verse: '시 23:2' }, { verse: '시 23:3' }, { verse: '시 23:4' },
    { verse: '요 10:3' }, { verse: '요 10:11' }, { verse: '요 10:14' }, { verse: '사 40:11' },
    { verse: '눅 15:4' }, { verse: '겔 34:12', label: '에스겔 34:12' }, { verse: '겔 34:16', label: '에스겔 34:16' },
    { verse: '시 100:3' }, { verse: '벧전 2:25', label: '베드로전서 2:25' }, { verse: '계 7:17', label: '요한계시록 7:17' }
  ];
  const CHAPTER_GUESTS = { '1-6': 'lantern', '2-6': 'camper', '3-6': 'flower', '4-4': 'stargazer' };
  const RARITY = { common: '일반', rare: '희귀', legend: '전설' };
  const DRAW_ODDS = { common: .72, rare: .25, legend: .03 };
  const REACT = {
    cotton: { line: '가장 흔하지만 가장 포근한 양', pet: ['좋아, 딱 거기!'], treat: ['한 입은 네 거야.'], shear: ['털은 가도 포근함은 남아.'], idle: ['오늘도 포근하게.'] },
    sleepy: { line: '어디서든 잠드는 양', pet: ['스르르… zZ'], treat: ['냠… zZ'], shear: ['이불 어디 갔지…'], idle: ['안 잤어. 눈만 감았어.'] },
    glutton: { line: '간식 소리부터 듣는 양', pet: ['간식 줄 거지?'], treat: ['더 없어?!'], shear: ['털 깎으면 배고픈데.'], idle: ['방금 사과 소리 났는데.'] },
    blackface: { line: '밤이면 눈만 반짝이는 양', pet: ['여기 있어. 눈 두 개 보여?'], treat: ['어둠 속에서 냠.'], shear: ['이젠 좀 잘 보여?'], idle: ['숨은 게 아니라 까만 거야.'] },
    tiny: { line: '작아도 제일 빠른 양', pet: ['살살, 나 콩알이야!'], treat: ['한입에 쏙!'], shear: ['더 가벼워졌어!'], idle: ['작다고 봐주기 없기!'] },
    curly: { line: '비 오면 털이 두 배로 부푸는 양', pet: ['이 곱슬은 자연산이야.'], treat: ['머리에 묻진 않았지?'], shear: ['곱슬은 곧 돌아와.'], idle: ['오늘 습도 몇 퍼센트야?'] },
    brown: { line: '갓 구운 빵 색을 닮은 양', pet: ['빵 냄새 난다고?'], treat: ['사과 곁들이면 딱이야.'], shear: ['따끈한 갈색 털 나왔어.'], idle: ['한 입만 달라는 말 금지.'] },
    spotty: { line: '얼룩이 매일 달라 보이는 양', pet: ['얼룩 세는 중이야?'], treat: ['사과에도 점이 있네!'], shear: ['점은 남겨 줘.'], idle: ['어제보다 점이 하나 늘었나?'] },
    shy: { line: '풀숲에 숨어도 꼬리가 보이는 양', pet: ['(부끄…)','이제 좀 편해.'], treat: ['고마워. 안 볼 때 먹을게.'], shear: ['다 깎았어? 나 봐도 돼?'], idle: ['…꼬리 보였어?'] },
    chatty: { line: '인사만 다섯 가지인 양', pet: ['이 얘기 몇 번 했더라?'], treat: ['냠, 그러니까 내 말은…'], shear: ['메에, 하나도 안 간지러워.'], idle: ['안녕, 내 얘기 들을래?', '메에에도 사투리가 있어.', '나 오늘 조용하지? 메에.', '잠깐, 아직 본론이야.', '내일 이야기까지 준비했어.'] },
    fire: { line: '모닥불 앞이 제일 좋은 양', pet: ['손이 따뜻하네.'], treat: ['구워 먹으면 더 맛있을까?'], shear: ['따뜻한 데 가고 싶어…'], idle: ['불 보고 싶다.'] },
    stargazer: { line: '별자리를 외우는 양', pet: ['방금 별 하나 셌어.'], treat: ['사과 씨도 별 모양이야.'], shear: ['별빛 받기 딱 좋은 길이야.'], idle: ['저 별 봤어? 오늘따라 밝아.'] },
    splash: { line: '우물에만 가면 첨벙하는 양', pet: ['나 아직 조금 젖었어.'], treat: ['우물물로 씻었지?'], shear: ['이젠 금방 마르겠다!'], idle: ['첨벙은 세 번까지 참았어.'] },
    flower: { line: '지나가면 꽃잎이 떨어지는 양', pet: ['꽃잎 하나 받아.'], treat: ['사과꽃도 예쁜데.'], shear: ['꽃잎은 내가 챙길게.'], idle: ['오늘은 무슨 꽃이 피었어?'] },
    olive: { line: '올리브 그늘을 좋아하는 양', pet: ['천천히 해도 돼.'], treat: ['그늘에서 같이 먹자.'], shear: ['바람이 더 잘 느껴져.'], idle: ['잠깐 쉬었다 가도 돼.'] },
    lantern: { line: '털끝으로 밤길을 비추는 양', pet: ['손끝도 살짝 밝아졌어.'], treat: ['사과가 반짝여!'], shear: ['이 털로 밤길을 밝혀 봐.'], idle: ['어두우면 내가 앞장설게.'] },
    camper: { line: '천막부터 찾는 양', pet: ['텐트 자리 맡아 놨어.'], treat: ['캠핑 간식 맛이다!'], shear: ['침낭은 아직 있지?'], idle: ['여기 오늘 숙소 맞지?'] },
    jumper: { line: '울타리만 보면 폴짝 뛰는 양', pet: ['폴짝! 한 번 더?'], treat: ['뛰고 나면 더 맛있어!'], shear: ['이제 더 높이 뛴다!'], idle: ['저 울타리 넘어도 돼?'] },
    meteor: { line: '별똥별이 떨어진 자리에서 온 양', pet: ['방금 소원 빌었어?'], treat: ['사과 하나만 소원 빌었는데!'], shear: ['별가루 묻었나 봐.'], idle: ['별똥별은 떨어지는 소리 안 나.'] },
    david: { line: '하프 선율을 기억하는 양', pet: ['♪ 이 곡, 들어 봤어?'], treat: ['연주 전에 한 입.'], shear: ['털 한 뭉치와 노래 한 소절.'], idle: ['오늘 밤엔 하프를 켜 볼까.'] },
    ninetynine: { line: '끝까지 찾아낸 그 한 마리의 친구', pet: ['여기서 함께 있자.'], treat: ['같이 먹으니 더 맛있어.'], shear: ['내 몫은 너한테 맡길게.'], idle: ['날 찾아 줘서 고마워.'] },
    fleece: { line: '털에만 이슬이 맺히는 양', pet: ['이슬이 손끝에 반짝여.'], treat: ['아침 이슬처럼 달다.'], shear: ['오늘 밤 몫은 금빛이야.'], idle: ['이슬 한 방울도 잘 보여.'] },
    jacob: { line: '얼룩 하나하나에 이야기가 있는 양', pet: ['얼룩에 불이 들어왔어!'], treat: ['사과 점도 나랑 닮았다.'], shear: ['얼룩은 그대로야.'], idle: ['이 무늬, 오늘 처음 봤지?'] },
    manger: { line: '구유 바로 옆에서 잠들었던 양', pet: ['쉿, 아기가 자고 있어.'], treat: ['별 하나가 반짝였어.'], shear: ['아기에게 따뜻한 밤이 되길.'], idle: ['그 밤의 숨소리가 기억나.'] }
  };
  const LEGEND_LINE = {
    david: '주의 종이 아버지의 양을 지킬 때에',
    ninetynine: '그 잃은 것을 찾아내기까지 찾아다니지 아니하겠느냐',
    fleece: '보소서 내가 양털 한 뭉치를 타작 마당에 두리니',
    jacob: '아롱진 것과 점 있는 것과 검은 것을 가려내며',
    manger: '첫아들을 낳아 강보로 싸서 구유에 뉘었으니'
  };
  const PATROL_TYPES = ['patrolTime', 'patrolSpeed', 'lamp'];
  const market = [
    ['나무 울타리', 'ground', 2], ['올리브나무', 'ground', 3], ['돌 양 우리', 'ground', 4],
    ['모닥불', 'ground', 4], ['목자 천막', 'ground', 5], ['우물', 'ground', 5],
    ['등불 기둥', 'ground', 3], ['들꽃 밭', 'ground', 2], ['하프', 'ground', 7],
    ['하늘 등', 'sky', 2], ['별똥별 비', 'sky', 8]
  ];
  const WEAR_LABELS = { head: '머리', face: '얼굴', neck: '목', back: '등', dye: '염색' };
  const wardrobe = window.Field3D?.wardrobe || [];
  const wearByName = new Map(wardrobe.map(item => [item.name, item]));
  const craftRecipes = new Map(Object.entries(window.DISCOVER_CRAFT || {}).map(([name, ids]) => {
    const materials = ids.map(id => ({
      ...window.DISCOVERIES[id].bag,
      place: Object.values(window.EXPLORE).find(area => area.discover?.items.some(entry => entry.id === id))?.title
    }));
    return [name, materials];
  }));
  const hasCraftMaterial = (bag, name) => Number.isSafeInteger(bag?.[name]?.count) && bag[name].count > 0;
  const normalizeWear = wear => window.Field3D?.normalizeWear(wear) ||
    Object.fromEntries(Object.keys(WEAR_LABELS).map(slot => [slot, null]));
  const wornNames = wear => Object.values(normalizeWear(wear)).filter(Boolean);
  const catalog = Object.fromEntries([...market, ...wardrobe.map(item => [item.name, 'wear'])].map(([id, kind]) => [id, kind]));
  const slots = [[39, 231], [118, 224], [241, 224], [321, 233], [40, 321], [117, 354], [243, 354], [319, 321], [53, 111], [308, 99]];
  const pasture = [[180, 306], [114, 283], [244, 277], [57, 277], [302, 276], [83, 371], [281, 369], [183, 383],
    [135, 251], [219, 327], [151, 337], [203, 251], [160, 284], [264, 314], [98, 318], [225, 368],
    [140, 384], [326, 362], [72, 247], [289, 247], [190, 342], [252, 395], [113, 395], [178, 258]];
  const gate = [[30, 392], [70, 396]];   // 2D 들판 입구(왼쪽 아래)
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
  const exploreReaction = sheep => (REACT[sheep.species]?.idle || ['낯선 발소리가 들려. 같이 가 볼까?'])[0];
  const voice = name => { Promise.resolve(Sound.voice(name)).catch(() => {}); };
  const pick = list => list[Math.floor(Math.random() * list.length)];
  const DEX = () => window.SHEEP_DEX || [FALLBACK];
  const spec = id => (window.SHEEP_DEX?.byId || {})[id] || window.SHEEP_DEX?.byId?.cotton || FALLBACK;
  const trait = species => REACT[species]?.line || spec(species).desc;
  // 주일 암호가 없는 판(main)에서는 금빛 양털(codes4)을 도감에서 뺀다
  const dexList = () => DEX().filter(s => s.attract !== 'cond:codes4' || (window.CODES || []).length);
  const dexTotal = () => window.SHEEP_DEX ? dexList().length : MAX_SHEEP - ((window.CODES || []).length ? 0 : 1);
  function rollFirstSheep(random = Math.random) {
    const chance = random();
    const rarity = chance < DRAW_ODDS.legend ? 'legend' : chance < DRAW_ODDS.legend + DRAW_ODDS.rare ? 'rare' : 'common';
    const pool = dexList().filter(sheep => sheep.rarity === rarity);
    return (pool[Math.floor(random() * pool.length)] || FALLBACK).id;
  }
  const fieldScript = new URL(document.currentScript.src);
  const dexScript = new URL('sheepdex.js' + fieldScript.search, fieldScript);
  const stage = s => { const lv = s.level || 1; return lv >= 10 ? 3 : lv >= 5 ? 2 : lv >= 2 ? 1 : 0; };
  function sheepSound(sheep) {
    const voice = DEX().findIndex(species => species.id === sheep.species);
    const size = spec(sheep.species).look.size || 1;
    const pitch = [540, 465, 385, 355][stage(sheep)] * Math.pow(size, -0.6) + Math.max(0, voice) * 5;
    Sound.sfx('sheep', pitch);
  }
  const nameSheep = (name, fallback) => Array.from(String(name || '').trim()).slice(0, 8).join('') || fallback;
  const hasSkill = sp => sp.skill && !['feedOil', 'feedExp'].includes(sp.skill.type);
  const woolType = id => window.WOOL_TYPES?.[id] || { name: '흰 털', color: '#f6f3ec' };
  const woolOf = sheep => spec(sheep?.species).wool || 'white';
  const woolLength = (sheep, today = date()) => Number(sheep.shornOn !== today);
  const mainSheep = (data = field()) => data?.sheep?.find(sheep => sheep.id === data.mainId) || data?.sheep?.[0];
  const nearbyIds = (data = field()) => Array.isArray(data?.nearby) ? data.nearby : [];
  function visibleSheep(data = field()) {
    if (!data?.sheep?.length) return [];
    const mine = mainSheep(data);
    const near = new Set(nearbyIds(data));
    const friends = data.sheep.filter(s => s.id !== mine?.id && near.has(s.id)).slice(0, 2);
    return mine ? [mine, ...friends] : friends;
  }
  const shearReady = (sheep, today = date()) => sheep.id === mainSheep()?.id && !sheep.lost && woolLength(sheep, today) === 1;
  const growthFor = days => MAIN_STAGES.findLast(item => days >= item.days) || MAIN_STAGES[0];
  const growthDays = data => (data.mainCareDays ?? data.careDays ?? 0) + Math.floor((data.mainAdventureDays || 0) / 3);
  const growthStage = (data, today) => today >= Core.XMAS ? MAIN_STAGES.at(-1) : growthFor(growthDays(data));
  const heartMarks = count => '♥'.repeat(count) + '♡'.repeat(3 - count);
  function mainCare(today = date(), data = field()) {
    const sheep = mainSheep(data);
    if (!sheep) return null;
    const pet = sheep.petDay === today && sheep.petCount > 0;
    const treat = data.mainTreatOn === today;
    const wool = woolLength(sheep, today) === 0;
    const adventure = data.mainAdventureOn === today;
    return { sheep, pet, treat, wool, adventure, hearts: Math.min(3, Number(pet) + Number(treat) + Number(wool) + Number(adventure)) };
  }
  function syncMainGrowth(data, today) {
    const sheep = mainSheep(data);
    if (!sheep) return;
    data.mainId = sheep.id;
    if (!Number.isSafeInteger(data.mainCareDays) || data.mainCareDays < 0) {
      data.mainCareDays = Number.isSafeInteger(data.careDays) ? Math.max(0, data.careDays) : 0;
      if (data.cared === today) data.mainCareOn = today;
      sheep.level = growthFor(data.mainCareDays).level;
    }
    const growth = growthStage(data, today);
    if (sheep.level < growth.level) data.mainGrowthNotice = growth.level;
    sheep.level = growth.level;
    sheep.exp = 0;
  }
  function completeMainCare(data, today) {
    if (data.mainCareOn === today || mainCare(today, data)?.hearts !== 3) return;
    data.mainCareOn = today;
    data.mainCareDays++;
    if (data.mainAdventureOn === today) data.mainAdventureDays = Math.max(0, (data.mainAdventureDays || 0) - 1);
    syncMainGrowth(data, today);
  }
  function adventureHeart(data, today) {
    if (data.mainAdventureOn === today || data.mainCareOn === today || !mainSheep(data)) return false;
    data.mainAdventureOn = today;
    data.mainAdventureDays = (data.mainAdventureDays || 0) + 1;
    completeMainCare(data, today);
    syncMainGrowth(data, today);
    return true;
  }
  function tutorialStep(data) {
    const sheep = mainSheep(data);
    const step = data.mainTutorialStep || 0;
    if (!sheep || sheep.lost || step >= 5) return 5;
    if (step === 0) return 0;
    if (!sheep.petDay) return 1;
    if (!data.mainTreatOn) return 2;
    if (!sheep.shornOn) return 3;
    return 4;
  }
  const shearRemaining = (today = date()) => Number(!!mainSheep() && shearReady(mainSheep(), today));
  const shearTonight = shearRemaining;
  const woolAmount = (bag, id) => Number.isSafeInteger(bag?.[id]) && bag[id] > 0 ? bag[id] : 0;
  const woolColors = wool => WOOL_IDS.filter(id => woolAmount(wool, id)).map(id => woolType(id).color);
  const addWool = (bag, id, count) => { if (count) bag[id] = woolAmount(bag, id) + count; };
  const giftOpen = (gift, preview) => preview || !gift.episode || !!Core.data.done[gift.episode];
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
    s.wear = normalizeWear(s.wear);
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
    if (!f.woolBag || typeof f.woolBag !== 'object' || Array.isArray(f.woolBag)) f.woolBag = {};
    if (!f.woolGifts || typeof f.woolGifts !== 'object' || Array.isArray(f.woolGifts)) f.woolGifts = {};
    if (f.careDays == null) f.careDays = 0;
    if (f.found == null) f.found = 0;
    f.sheep.forEach(normalizeSheep);
    const worn = {};
    for (const sheep of f.sheep) for (const name of Object.values(sheep.wear)) {
      if (name) worn[name] = (worn[name] || 0) + 1;
    }
    for (const [name, count] of Object.entries(worn)) {
      if (!(f.items[name] >= count)) f.items[name] = count;
    }
    if (!f.dex || typeof f.dex !== 'object') f.dex = {};
    f.sheep.forEach(s => { if (!f.dex[s.species]) f.dex[s.species] = s.born || f.since || date(); });
    const today = date();
    syncMainGrowth(f, today);
    if (!f.friendMet || typeof f.friendMet !== 'object' || Array.isArray(f.friendMet)) {
      const ownSpecies = mainSheep(f)?.species;
      f.friendMet = Object.fromEntries(Object.entries(f.dex).filter(([id]) => id !== ownSpecies));
      f.sheep.filter(sheep => sheep.id !== f.mainId).forEach(sheep => {
        f.friendMet[sheep.species] ||= sheep.born || f.since || today;
      });
    }
    if (!Number.isSafeInteger(f.friendVisits)) f.friendVisits = Math.max(f.sheep.length - 1, Object.keys(f.friendMet).length);
    if (!Array.isArray(f.visitors)) f.visitors = [];
    const seen = new Set();
    f.visitors = f.visitors.filter(v => v && (v.until >= today || ((v.chapterGift || v.helper) && !v.until)) &&
      (!window.SHEEP_DEX || Object.hasOwn(window.SHEEP_DEX.byId, v.species)) && !seen.has(v.species) && seen.add(v.species));
    if (typeof f.visitRoll !== 'number') f.visitRoll = 0;
    if (typeof f.patrolDay !== 'string') f.patrolDay = '';
    if (typeof f.patrolBest !== 'number') f.patrolBest = 0;
    if (!f.departed || typeof f.departed !== 'object' || Array.isArray(f.departed)) f.departed = {};
    if (typeof f.recalledOn !== 'string') f.recalledOn = '';
    const friends = f.sheep.filter(s => s.id !== f.mainId);
    const friendIdSet = new Set(friends.map(s => s.id));
    if (!Array.isArray(f.nearby)) {
      f.nearby = friends.map((s, idx) => ({ s, idx }))
        .sort((a, b) => String(b.s.born || '').localeCompare(String(a.s.born || '')) || (b.idx - a.idx))
        .slice(0, 2)
        .map(x => x.s.id);
    } else {
      const clean = [];
      for (const id of f.nearby) {
        if (friendIdSet.has(id) && !clean.includes(id)) clean.push(id);
      }
      f.nearby = clean.slice(0, 2);
    }
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
      sheep: data?.sheep?.length || 0, careDays: data?.mainCareDays ?? (data?.careDays || 0), found: data?.found || 0,
      friends: data?.friendVisits ?? Math.max(0, (data?.sheep?.length || 0) - 1),
      friendKinds: Object.keys(data?.friendMet || {}).length,
      dex: dex.length, legends: dex.filter(id => spec(id).rarity === 'legend' && spec(id).id === id).length
    };
  }

  function available(id) {
    const data = field();
    const used = Object.values(data.slots).filter(item => item === id).length +
      data.sheep.filter(sheep => wornNames(sheep.wear).includes(id)).length;
    return Math.max(0, (data.items[id] || 0) - used);
  }

  function nextId(data) {
    const n = Math.max(0, ...data.sheep.map(s => Number(String(s.id).match(/(\d+)$/)?.[1] || 0)));
    return 'sheep-' + (n + 1);
  }
  const newSheep = (data, name, species = 'cotton') => ({
    id: nextId(data), name, born: date(), care: 0, wear: normalizeWear(), lost: false,
    species, level: 1, exp: 0, petDay: '', petCount: 0, shornOn: ''
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
    if (type === 'rareVisit') sum = Math.min(0.3, sum);
    return Math.round(sum * 100) / 100;
  }
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
      case 'cond:harp8': return Object.values(data.slots).includes('하프') && (data.friendVisits >= 8 || data.sheep.length >= 8);
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
    const own = mainSheep(data)?.species;
    const waiting = new Set(data.visitors.map(v => v.species));
    const list = dexList().filter(s => s.id !== own && !waiting.has(s.id));
    const legend = list.find(s => s.rarity === 'legend' && !data.friendMet[s.id] && legendReady(s, data));
    if (legend && kind !== 'rare') return legend.id;
    const commons = list.filter(s => s.rarity === 'common');
    const placed = new Set(Object.values(data.slots));
    const rares = list.filter(s => s.rarity === 'rare' && placed.has(s.attract));
    if (kind === 'rare') return pick(rares.length ? rares : list.filter(s => s.rarity === 'rare'))?.id || null;
    const lures = [...placed].filter(item => lureOf(item).length).length;
    const chance = .25 + bonus('rareVisit') + Math.min(.2, .05 * lures);
    if (rares.length && Math.random() < chance) return pick(rares).id;
    return pick(commons.length ? commons : rares)?.id || null;
  }
  function addVisitor(data, species, today) {
    data.visitorSeq = (data.visitorSeq || 0) + 1;
    const visitor = { id: 'visit-' + Date.now().toString(36) + '-' + data.visitorSeq, species, until: today };
    data.visitors.push(visitor);
    return visitor;
  }
  function deliverChapterGuests(data) {
    const arrived = [];
    if (!window.SHEEP_DEX || !has() || !data.chapterGuestQueue?.length) return arrived;
    for (const episode of data.chapterGuestQueue) {
      const preferred = CHAPTER_GUESTS[episode];
      if (!preferred) continue;
      const current = data.visitors.find(v => v.species === preferred && !v.chapterGift);
      const species = current || !data.visitors.some(v => v.species === preferred) ? preferred :
        DEX().find(s => s.rarity === 'rare' && !data.visitors.some(v => v.species === s.id))?.id;
      if (!species) continue;
      const visitor = current || addVisitor(data, species, null);
      visitor.chapterGift = episode;
      visitor.until = null;   // 이야기에서 기다리는 손님은 들판에서 처음 만난 밤까지.
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
    const first = data.visitors.find(v => v.helper) || data.visitors.find(v => v.sunday || v.chapterGift);
    return first ? [first] : data.visitors.slice(0, 1);
  }
  function sundayGuestDue(data, today) {
    return isSunday(today) && data.sundayVisitDay !== today;
  }
  function welcomeSundayGuest(data, today) {
    if (!sundayGuestDue(data, today)) return null;
    const species = pickSpecies(data, 'rare');
    const waiting = data.visitors.find(v => !v.helper && !v.chapterGift && spec(v.species).rarity === 'rare');
    const visitor = waiting || (species && addVisitor(data, species, today));
    if (!visitor) return null;
    visitor.sunday = true;
    data.visitors = [visitor, ...data.visitors.filter(v => v !== visitor)];
    data.sundayVisitDay = today;
    data.visitRoll = nowMs();
    return visitor;
  }

  // 잠긴 선물의 색도 미리 준비할 수 있게, 아직 만들지 않은 선물의 필요량을 합친다.
  function woolNeed(data) {
    const pending = GIFTS.filter(gift => !data.woolGifts[gift.id]);
    const own = woolOf(mainSheep(data));
    const required = {};
    for (const gift of pending) for (const [id, need] of Object.entries(giftRecipe(gift, own))) {
      required[id] = (required[id] || 0) + need;
    }
    const colors = [...Object.keys(required).filter(id => id !== own), own];
    const missing = colors.find(id => woolAmount(data.woolBag, id) < required[id]);
    if (missing) return { wool: missing, gift: pending.find(gift => giftRecipe(gift, own)[missing]).id };
    const blanket = pending.find(gift => gift.any);
    const extra = COLORED_WOOL.reduce((sum, id) => sum + Math.max(0, woolAmount(data.woolBag, id) - (required[id] || 0)), 0);
    return blanket && extra < blanket.any ? { wool: own === 'white' ? 'brown' : own, gift: blanket.id } : null;
  }
  function welcomeHelper(data) {
    if (!window.SHEEP_DEX || !has()) return null;
    const today = date();
    const count = data.helperDay === today ? data.helperCount || 0 : 0;
    if (count >= (isSunday(today) ? 6 : 2)) return null;
    const existing = data.visitors.find(v => v.helper);
    if (existing) return existing;
    const need = woolNeed(data);
    if (!need) return null;
    const candidates = DEX().filter(s => s.wool === need.wool && s.rarity !== 'legend');
    const waiting = data.visitors.find(v => !v.sunday && !v.chapterGift && candidates.some(s => s.id === v.species));
    const options = candidates.filter(s => !data.visitors.some(v => v.species === s.id));
    const choice = options.find(s => s.id !== mainSheep(data)?.species && s.id !== data.lastHelper) || options[0];
    if (!waiting && !choice) return null;
    const visitor = waiting || addVisitor(data, choice.id, today);
    visitor.helper = need.gift;
    visitor.until = today;
    data.visitors = [visitor, ...data.visitors.filter(v => v !== visitor)];
    return visitor;
  }
  function giftReady(data = field()) {
    return !!data && GIFTS.some(gift => !data.woolGifts?.[gift.id] && giftOpen(gift) && giftMaterials(gift, data).ready);
  }
  function lostSheep() {
    const sheep = mainSheep();
    return sheep?.lost ? sheep : null;
  }
  function visitCheck(force) {
    if (!has()) return null;
    const data = ensure();
    deliverChapterGuests(data);
    const today = date();
    const legendDue = dexList().some(s => s.rarity === 'legend' && s.id !== mainSheep(data)?.species && !data.friendMet[s.id] &&
      !data.visitors.some(v => v.species === s.id) && legendReady(s, data));
    if (!force) {
      const sunday = welcomeSundayGuest(data, today);
      const helper = welcomeHelper(data);
      if (!legendDue && (data.visitors.length >= 2 || sunday || nowMs() - data.visitRoll < VISIT_GAP)) {
        if (sunday || helper) Core.save();
        return sunday || helper;
      }
      data.visitRoll = nowMs();
    }
    const species = pickSpecies(data, force === 'rare' ? 'rare' : null);
    const visitor = species ? addVisitor(data, species, today) : null;
    Core.save();
    return visitor;
  }
  function receiveFriend(id) {
    const data = ensure();
    const visitor = activeVisitors(data).find(v => v.id === id) || data.visitors.find(v => v.id === id);
    if (!visitor) return null;
    const today = date();
    const species = spec(visitor.species);
    const wool = species.wool || 'white';
    const count = visitor.helper ? 3 : visitor.sunday || visitor.chapterGift || species.rarity !== 'common' ? 2 : 1;
    data.visitors = data.visitors.filter(v => v !== visitor);
    addWool(data.woolBag, wool, count);
    data.friendMet[species.id] ||= today;
    data.dex[species.id] ||= today;
    data.friendVisits++;
    if (visitor.helper) {
      data.helperCount = (data.helperDay === today ? data.helperCount || 0 : 0) + 1;
      data.helperDay = today;
      data.lastHelper = species.id;
    }
    welcomeHelper(data);
    Core.save();
    return { species, wool, count };
  }

  function lostCheck(afterAbsence = false) {
    if (!has()) return null;
    const data = ensure();
    const sheep = mainSheep(data);
    const missing = sheep.lost ? sheep : null;
    const today = date();
    if (missing?.lostFromVisit) return missing;
    if (missing && data.lostOn && daysBetween(data.lostOn, today) >= 2) {
      // 못 찾고 이틀이 지나면 혼자 돌아온다. 선물 재료가 막히지 않게.
      missing.lost = false;
      data.selfReturn = { name: missing.name, day: today };
      if (!afterAbsence) { Core.save(); return null; }
    } else if (missing) {
      return missing;
    }
    if (data.lostOn === today) return null;
    let lost;
    if (afterAbsence) {
      lost = sheep;
      lost.lostFromVisit = true;
      if (lost === missing) delete data.selfReturn;
    } else {
      const forced = Core.IS_TEST && Core.params.get('lost') === '1';
      const hash = [...today].reduce((sum, char) => Math.imul(sum ^ char.charCodeAt(0), 16777619), 2166136261) >>> 0;
      if (!forced && (data.sheep.length < 2 || data.cared !== today ||
          (data.lostOn && daysBetween(data.lostOn, today) < 4) || hash % 100 >= 30)) return null;
      lost = sheep;
    }
    lost.lost = true;
    data.lostOn = today;
    Core.save();
    return lost;
  }

  function recordVisit(data, today) {
    const gap = daysBetween(data.lastVisit, today);
    lostCheck(gap >= 3);
    if (gap <= 0) return null;
    const previous = data.visitStreak;
    const streak = gap === 1 ? (Number.isSafeInteger(previous) && previous > 0 ? previous : 1) + 1 : 1;
    data.lastVisit = today;
    data.visitStreak = streak;
    if (today < Core.XMAS && VISIT_MILESTONES.includes(streak) && !data.visitRewards?.[streak]) {
      let wool = streak === 3 ? { white: 2 } : { gold: 1 };
      if (streak === 7) {
        const colors = [...new Set(data.sheep.map(woolOf))].slice(0, 2);
        wool = Object.fromEntries(colors.map(id => [id, colors.length === 1 ? 2 : 1]));
      }
      Object.entries(wool).forEach(([id, count]) => addWool(data.woolBag, id, count));
      (data.visitRewards ||= {})[streak] = { wool };
    }
    Core.save();
    return { gap };
  }

  /* ---------- 2D 그림 (3D가 안 될 때 · 초상 대체 · 카드) ---------- */
  const knitHat = (color, band) => `<path d="M13-28q0-13 10-13t10 13z" fill="${color}"/><path d="M13-28h20" stroke="${band}" stroke-width="4" stroke-linecap="round"/><circle cx="23" cy="-41" r="3.3" fill="${band}"/>`;
  const wearArt = {
    '빨간 목도리': '<path d="M13-13q4 6 10 7l-2 5m-2-7l6 5" stroke="#f78083" stroke-width="4" stroke-linecap="round" fill="none"/>',
    '꽃 화관': '<path d="M15-27q9-5 16 0" fill="none" stroke="#83bd89" stroke-width="2"/><circle cx="17" cy="-27" r="2.7" fill="#fff0a1"/><circle cx="23" cy="-29" r="2.8" fill="#f995b6"/><circle cx="29" cy="-27" r="2.7" fill="#e2bcf5"/>',
    '보라 방울': '<path d="M13-13l9 8 7-8" fill="none" stroke="#ac83f3" stroke-width="2"/><circle cx="22" cy="-4" r="4" fill="#c9a4ff"/>',
    '은 종': '<path d="M13-13l9 7 7-7" fill="none" stroke="#d1dff4" stroke-width="2"/><path d="M17-2q2-2 2-5q3-5 6 0q0 3 2 5zm4 2h2" fill="#e2e9f7" stroke="#c3cadd"/>',
    '분홍 리본': '<path d="M13-13l9 7 7-7" fill="none" stroke="#eeb7d2" stroke-width="2"/><path d="M22-4l-7-4v9l7-4 7 4v-9z" fill="#f89bbd"/>',
    '금빛 별 목걸이': '<path d="M13-13l9 7 7-7" fill="none" stroke="#ffcf70" stroke-width="2"/><path d="M22-9l1.5 4 4.5 0-3.5 2.5 1.5 4-4-2.5-4 2.5 1.5-4L16-5h4.5z" fill="#ffd778"/>',
    '빨간 털모자': knitHat('#d23c3c', '#ffaba1'),
    '초록 털모자': knitHat('#3f8a4a', '#b3dc99'),
    '밀짚모자': '<path d="M14-31l2-7h13l4 7z" fill="#e3b96d"/><path d="M14-31h19" stroke="#a57746" stroke-width="2"/><ellipse cx="23" cy="-29" rx="16" ry="2.6" fill="#f4d487"/>',
    '목자 두건': '<path d="M11-30q9-10 22-3l-2 6-8-3-7 5 1 8-7-1z" fill="#91acd5"/><path d="M12-30q7-4 17-2" fill="none" stroke="#dae6f7" stroke-width="2"/>',
    '별 머리띠': '<path d="M14-28q8-4 17 0" fill="none" stroke="#cfa45e" stroke-width="2"/><path d="M23-41l2 5 5 0-4 3 1 5-4-3-4 3 1-5-4-3h5z" fill="#ffda77"/>',
    '나비넥타이': '<path d="M22-8l-8-4v8l8-3 8 3v-8z" fill="#c94859"/><circle cx="22" cy="-8" r="2.5" fill="#ff8691"/>',
    '동그란 안경': '<g fill="none" stroke="#efcb87" stroke-width="1.7"><circle cx="29" cy="-20" r="4.6"/><circle cx="18" cy="-21" r="4.1"/><path d="M22-22l3 1m-11-1-5-2"/></g>',
    '망토': '<path d="M14-27q-22-2-42 11l-5 10q22 5 51-13z" fill="#8655cb"/><path d="M14-24q-21 0-38 13" fill="none" stroke="#c8a0f1" stroke-width="2"/><circle cx="16" cy="-20" r="2.8" fill="#ffd479"/>'
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
    const outfit = normalizeWear(sheep.wear);
    const wool = sil ? '#1b2340' : wearByName.get(outfit.dye)?.color || L.wool;
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
    const positions = { head: [22, -36, 15], face: [23, -17, 12], neck: [24, -1, 11], back: [-16, -25, 20] };
    const clothes = Object.entries(positions).map(([slot, [x, y, size]]) => {
      const item = wearByName.get(outfit[slot]);
      return item ? (wearArt[item.name] || `<text x="${x}" y="${y}" font-size="${size}" text-anchor="middle">${esc(item.symbol)}</text>`) : '';
    }).join('');
    const acc = sil || opt.noAcc ? '' : clothes || accArt[L.acc] || '';
    const sparkle = st === 3 && !sil ? '<path class="field-twinkle" d="M-30-44l1.5 4 4 1.5-4 1.5-1.5 4-1.5-4-4-1.5 4-1.5z" fill="#fff6d0"/><path class="field-twinkle" d="M33-46l1 3 3 1-3 1-1 3-1-3-3-1 3-1z" fill="#fff6d0"/>' : '';
    return `<g transform="scale(${k.toFixed(3)})">
      <ellipse cy="1" rx="30" ry="5" fill="#081321" opacity=".48"/>${glow}
      <path d="M-16 -10v11m22-11v11m-28-12v8m34-8v8" fill="none" stroke="${face}" stroke-width="4" stroke-linecap="round"/>
      ${opt.shorn ? `<ellipse cx="-5" cy="-14" rx="21" ry="10" fill="${wool}"/><ellipse cx="-5" cy="-16" rx="16" ry="4" fill="#fff" opacity=".22"/>` :
        `<g fill="${wool}"><ellipse cx="-5" cy="-16" rx="25" ry="15"/><circle cx="-19" cy="-25" r="10"/><circle cx="-7" cy="-29" r="10"/><circle cx="5" cy="-25" r="12"/>${puffs}</g>
        ${sil ? '' : '<path d="M-25 -23q6-10 14-6m3-4q7-4 13 2" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".35" fill="none"/>'}${curls}${spots}`}
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

  function giftRecipe(gift, own) {
    const { white, ...recipe } = gift.wool;
    recipe[own] = (recipe[own] || 0) + white;
    return recipe;
  }
  function giftMaterials(gift, data) {
    const bag = data.woolBag;
    const own = woolOf(mainSheep(data));
    const recipe = giftRecipe(gift, own);
    const used = {};
    const rows = [own, ...Object.keys(recipe).filter(id => id !== own)].map(id => {
      const need = recipe[id];
      const have = woolAmount(bag, id);
      used[id] = need;
      return { id, own: id === own, have, need, missing: Math.max(0, need - have) };
    });
    if (gift.any) {
      const remaining = id => Math.max(0, woolAmount(bag, id) - (recipe[id] || 0));
      const ranked = COLORED_WOOL.slice().sort((a, b) => remaining(b) - remaining(a));
      const have = ranked.reduce((sum, id) => sum + remaining(id), 0);
      let left = gift.any;
      for (const id of ranked) {
        const take = Math.min(remaining(id), left);
        if (take) used[id] = (used[id] || 0) + take;
        left -= take;
      }
      rows.push({ id: 'any', have, need: gift.any, missing: left });
    }
    return { used, rows, ready: rows.every(row => row.missing === 0) };
  }

  const giftShapes = {
    scarf: 'M60 29Q108 7 171 28L192 52L174 78L158 73L173 159L165 153L158 165L149 156L142 169L134 161L124 170L105 78L91 78L84 144L76 137L67 146L60 136L52 143L45 132L55 67L39 60Z',
    cushion: 'M41 37Q54 27 76 32Q120 22 162 32Q191 26 200 38Q208 51 202 70Q215 103 203 133Q208 154 192 156Q175 161 157 153Q121 165 79 153Q49 161 36 151Q30 139 37 125Q23 93 36 65Q29 50 41 37Z',
    swaddle: 'M115 21Q151 18 178 51Q197 78 169 116Q147 147 118 167Q86 152 57 115Q37 86 57 56Q80 22 115 21Z',
    blanket: 'M58 26H189L194 154L189 162L183 156L176 164L170 157L163 165L157 158L150 165L143 159L136 166L129 160L121 167L114 160L107 166L100 159L93 165L86 158L79 164L72 156L65 162L57 154L47 155Z'
  };
  function giftArt(id, colors, silhouette = false) {
    const shape = giftShapes[id];
    const clip = 'field-knit-' + (++artId);
    const stripes = Array.from({ length: 18 }, (_, i) =>
      `<rect x="-70" y="${i * 13 - 27}" width="380" height="13" fill="${colors[i % colors.length] || '#a8703f'}"/>`).join('');
    const detail = id === 'scarf' ? 'M47 62Q109 82 173 73' : id === 'cushion' ?
      'M54 54Q122 42 186 54L186 133Q121 147 53 132Z' : id === 'swaddle' ?
        'M60 61Q140 70 162 123M177 56Q120 111 70 114' : 'M67 41H177L182 143H64Z';
    return svg(silhouette ? `<path d="${shape}" fill="#ddd4f4" opacity=".22"/>` :
      `<defs><clipPath id="${clip}"><path d="${shape}"/></clipPath></defs>
      <ellipse cx="121" cy="161" rx="88" ry="13" fill="#080a1870"/>
      <g clip-path="url(#${clip})"><g transform="rotate(${id === 'swaddle' ? 33 : -9} 120 90)">${stripes}
      ${Array.from({ length: 38 }, (_, i) => `<path d="M-60 ${i * 6 - 25}h370" stroke="#302637" stroke-opacity=".25" stroke-dasharray="1.5 3" fill="none"/>`).join('')}</g></g>
      <path d="${shape}" fill="none" stroke="#e7bf8f" stroke-width="2" stroke-linejoin="round"/>
      <path d="${detail}" fill="none" stroke="#59373b" stroke-width="3" stroke-dasharray="2 4" stroke-linecap="round"/>`, 240, 180);
  }

  function giftCardData(id) {
    const gift = GIFTS.find(item => item.id === id);
    const made = gift && field()?.woolGifts?.[id];
    if (!made) return null;
    const colors = woolColors(made.wool);
    const note = gift.note(made.name);
    return { title: gift.title, to: gift.to, note: note.join(' '), quote: note[0], name: made.name, date: made.date, art: giftArt(id, colors) };
  }

  function woolUnit(id, count) {
    const type = woolType(id);
    return `<span class="field-wool-unit" data-wool="${id}" role="img" aria-label="${type.name} ${count}뭉치" title="${type.name}">
      <i style="--wool:${type.color}" aria-hidden="true"></i><b>${count}</b></span>`;
  }

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

  function mapArt(data, labels = false) {
    const decor = data?.slots || {};
    const flock = visibleSheep(data);
    return scenery() + slots.map(([x, y], i) => decor[i] ? at(x, y, objects[decor[i]] || '') : '').join('') +
      (data?.items?.['마구간'] ? at(184, 209, objects['마구간']) : '') +
      flock.slice(0, MAX_SHEEP).map((sheep, i) => {
        const [x, y] = pasture[i];
        if (sheep.lost && sheep.id === data.mainId) return '';
        return at(x, y, sheepArt(sheep, { shorn: !woolLength(sheep) }) + (labels ? `<text x="0" y="14" text-anchor="middle" fill="#fff3d7" stroke="#14212f" stroke-width="3" paint-order="stroke" font-size="11" font-family="sans-serif">${esc(sheep.name)}</text>` : ''));
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
    const viewBox = opts.level >= 10 ? '-56 -72 112 112' : '-42 -60 84 84';
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="${opts.px || 256}" height="${opts.px || 256}">${body}</svg>`;
  }
  async function portrait(species, opts = {}) {
    if (!opts.silhouette && window.SHEEP_DEX && await load3D() && typeof Field3D.portrait === 'function') {
      try {
        const url = await Field3D.portrait(species, { level: opts.level || 5, wear: opts.wear || null });
        if (url) return url;
      } catch { /* SVG로 대신 */ }
    }
    return svgURL(portraitSVG(species, opts));
  }
  function portraitHTML(species, opts = {}, cls = '') {
    return `<img class="field-portrait ${cls}" alt="" src="${svgURL(portraitSVG(species, opts))}" ${opts.silhouette ? '' : `data-portrait="${esc(species)}" data-level="${opts.level || 5}" data-outfit="${esc(JSON.stringify(normalizeWear(opts.wear)))}"`}>`;
  }
  function upgradePortraits(box) {
    if (!box || !can3D()) return;
    box.querySelectorAll('img[data-portrait]').forEach(img => {
      portrait(img.dataset.portrait, { level: Number(img.dataset.level) || 5, wear: JSON.parse(img.dataset.outfit) })
        .then(url => { if (img.isConnected) img.src = url; }).catch(() => {});
    });
  }

  function stateOf(data, extra = {}) {
    const moving = extra.moving || null;
    return {
      sheep: visibleSheep(data).map(s => ({ id: s.id, species: s.species, name: s.name, level: s.level, wear: s.wear || null, lost: s.id === data.mainId && !!s.lost && !extra.trial,
        wool: s.id === data.mainId && extra.trial ? Number(!extra.trial.shorn) : woolLength(s),
        highlight: s.id === extra.selected, miss: extra.miss?.has(s.id) || false })),
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
    const sheep = data.sheep.slice(0, MAX_SHEEP).map((entry, index) => {
      if (!entry || typeof entry !== 'object' || (entry.id === data.mainId && entry.lost)) return null;
      const species = DEX().find(s => s.id === entry.species)?.id || FALLBACK.id;
      return {
        id: 'guest-' + index, species, name: nameSheep(entry.name, spec(species).name),
        level: Number.isInteger(entry.level) ? Math.min(10, Math.max(1, entry.level)) : 1,
        wear: normalizeWear(entry.wear)
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
      ${count ? `<ul class="field-guest-flock">${data.sheep.map(s => `<li><b>${esc(s.name)}</b> <span>Lv${s.level}</span><small>${esc([spec(s.species).name, ...wornNames(s.wear).map(name => wearByName.get(name).label)].join(' · '))}</small></li>`).join('')}</ul>` : ''}`;
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
    const today = date();
    const thumb = homeThumb();
    const sundayNotice = data.visitors.some(v => v.sunday) || sundayGuestDue(data, today);
    return `<section class="field-panel">
      <div class="field-panel-picture">${thumb ? `<img src="${esc(thumb)}" alt="">` : svg(mapArt(data))}</div>
      <div class="field-panel-copy"><h2>나의 들판</h2>
        <p>내 양 ${esc(mainSheep(data).name)}${data.visitors.length ? ' · 친구가 왔어' : ''}</p>
        <button type="button" class="btn ghost small field-enter">들판 둘러보기</button>
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

  function drawVerse(species) {
    const quote = LEGEND_LINE[species.id];
    const verse = quote && window.Bible?.verses(species.verse).find(line => line.text.includes(quote));
    return verse ? `<blockquote class="field-verse">${esc(quote)}<cite>${esc(Bible.full(verse.ref))}</cite></blockquote>` : '';
  }

  function dailyWord(data) {
    const today = date();
    if (data.wordDay === today) return '';
    const index = Math.floor(Date.parse(today) / DAY_MS) % SHEPHERD_VERSES.length;
    const passage = SHEPHERD_VERSES.at(index);
    return passage ? verseHTML(passage.verse, passage.label) : '';
  }

  function tonightWord(episode) {
    const passage = Bible.verses(episode.card?.key)[0] || Bible.verses(episode.read)[0];
    return `<aside class="field-info-card field-tonight" aria-labelledby="field-tonight-title">
      <div class="field-info-head"><h2 id="field-tonight-title">오늘 밤 · 「${esc(episode.title)}」</h2>
        <button type="button" class="link field-info-close" aria-label="오늘 밤 카드 닫기">닫기</button></div>
      ${passage ? verseHTML(passage.ref, passage.label) : ''}
      <p>${mainCare()?.hearts === 3 ? '오늘 내 양 돌보기 끝!' : '내 양에게 하트 세 개를 채워 줘.'}</p>
    </aside>`;
  }

  function fieldSheet(root, title, body, className = '', onClose) {
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

  async function fieldCard(root, title, draw, fileId, alt, caption) {
    const modal = fieldSheet(root, title, '<p class="field-sheet-meta" role="status">카드를 그리는 중…</p>', 'field-card-sheet');
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


  /* ---------- 들판 화면 ---------- */
  async function page({ tonight, gift = false, flock = false, wardrobe: openWardrobe = false } = {}) {
    if (!has()) return App.home();
    const app = document.getElementById('app');
    if (!window.SHEEP_DEX) {
      const from = app.firstChild;
      await prepareDex();
      if (app.firstChild !== from) return;
    }
    current?.teardown();
    const data = ensure();
    const visit = recordVisit(data, date());
    const gap = visit?.gap;
    const greetIds = visit ? visibleSheep(data).filter(s => !s.lost).slice(0, gap === 1 ? 1 : gap === 2 ? 2 : 3).map(s => s.id) : [];
    const miss = new Set(gap === 1 || gap === 2 ? greetIds : []);
    visitCheck();
    Sound.music('night');
    Sound.ambience('나의 들판');
    Sound.stopVoice();
    const root = document.createElement('main');
    root.id = 'field';
    root.className = 'screen page field-page';
    root.innerHTML = `<div class="field-top"><header class="field-header">
        <button class="back" type="button" aria-label="홈으로">←</button>
        <div><h1>나의 들판</h1><button type="button" class="link field-count" aria-haspopup="dialog"></button></div><span class="field-oil"></span>
      </header><div class="field-info"></div><div class="field-main"></div></div>
      <div class="field-stage-wrap"><div class="field-stage"></div>
        <button type="button" class="field-visit-banner" hidden><span aria-hidden="true">🐑</span> <span class="field-visit-label"></span></button>
        <p class="field-hold-feedback" role="status"></p>
      </div><div class="field-care"></div><div class="field-manage"></div>`;
    app.replaceChildren(root);
    window.scrollTo(0, 0);
    const back = root.querySelector('.back');
    const count = root.querySelector('.field-count');
    const oil = root.querySelector('.field-oil');
    const info = root.querySelector('.field-info');
    const main = root.querySelector('.field-main');
    const care = root.querySelector('.field-care');
    const stageEl = root.querySelector('.field-stage');
    const visitButton = root.querySelector('.field-visit-banner');
    const visitLabel = root.querySelector('.field-visit-label');
    const holdFeedback = root.querySelector('.field-hold-feedback');
    const manage = root.querySelector('.field-manage');
    let moving = null, view = null, busy = false, selected = null, alive = true, thumbTimer = 0, holdTimer = 0;
    let mode = window.SHEEP_DEX && can3D() ? 'loading' : '2d';
    let guidedStep = -1, treating = false;
    let allGiftsOpen = false;
    let episode = tonight && Core.epById(tonight);
    let word = '';
    let unlock;
    let dismissedLost = null;
    let servedTonight = field().selfReturn?.day === date() ? `${josa(field().selfReturn.name, '이가')} 밤사이 돌아왔어.` : '';
    let greetTimer = 0, woolDayTimer = 0, woolBumpTimer = 0, woolGainTimer = 0, lastShearTick = -Infinity;
    let woolTouched = false, chatter = 0, trial = null;
    const greetedLegends = new Set();
    const api = { get view() { return view; }, teardown };
    current = api;
    const observer = new MutationObserver(() => { if (!root.isConnected) teardown(); });
    observer.observe(app, { childList: true });
    back.onclick = () => App.home({ top: true });
    count.onclick = flockSheet;
    visitButton.onclick = () => greetFriend(visitButton.dataset.visit);
    function restoreWoolAfterGesture() {
      if (!woolTouched) return;
      woolTouched = false;
      try { view?.update(state()); } catch { /* 다음 화면 갱신에서 다시 */ }
    }
    stageEl.addEventListener('pointerup', restoreWoolAfterGesture);
    stageEl.addEventListener('pointercancel', restoreWoolAfterGesture);

    function teardown() {
      if (!alive) return;
      alive = false;
      observer.disconnect();
      clearTimeout(thumbTimer);
      clearTimeout(holdTimer);
      clearTimeout(greetTimer);
      clearTimeout(woolDayTimer);
      clearTimeout(woolBumpTimer);
      clearTimeout(woolGainTimer);
      root.querySelectorAll('dialog[open]').forEach(d => d.close());
      try { view?.destroy(); } catch { /* 이미 정리됨 */ }
      view = null;
      if (current === api) current = null;
    }
    const state = () => stateOf(ensure(), { moving, selected, miss, trial });
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
        const sheep = field().sheep.find(s => s.id === id);
        if (!sheep || busy || moving) return;
        sheepSound(sheep);
        navigator.vibrate?.(10);
        showPersonality(sheep, 'idle');
      },
      onPetSheep(id) {
        if (!alive || busy || moving || root.querySelector('dialog[open]')) return;
        const sheep = mainSheep();
        if (sheep?.id === id && (!sheep.lost || trial)) pet(sheep, true);
      },
      onShear: shear,
      canShear: id => id === field().mainId,
      onShearTick(id) {
        if (!alive || busy || moving || root.querySelector('dialog[open]')) return;
        const sheep = field().sheep.find(s => s.id === id);
        if (!sheep || sheep.id !== field().mainId || (trial ? trial.shorn : !shearReady(sheep))) return;
        if (!woolTouched) navigator.vibrate?.(9);
        woolTouched = true;
        const now = performance.now();
        if (now - lastShearTick < 100) return;
        lastShearTick = now;
        Sound.sfx('shearTick');
      },
      onShearEmpty(id) {
        if (!alive || busy || moving) return;
        woolTouched = true;
        const sheep = field().sheep.find(s => s.id === id);
        if (sheep?.id === field().mainId && (trial ? trial.shorn : !shearReady(sheep))) {
          showHoldFeedback(trial ? '체험실에서 양을 다시 골라 봐.' : '내일 밤 다시 복슬해져.');
        }
      },
      onTapVisitor(id) { greetFriend(id); },
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
      if (selected) focus(selected);
      greetFlock();
      guideTargets(data, true);
      celebrateMainGrowth();
    }

    async function greetFlock() {
      if (!alive || !greetIds.length) return;
      const dialog = root.querySelector('dialog[open]');
      if (dialog) {
        dialog.addEventListener('close', greetFlock, { once: true });
        return;
      }
      const calm = document.documentElement.classList.contains('no-motion') || matchMedia('(prefers-reduced-motion: reduce)').matches;
      const quick = gap === 1;
      Sound.sfx('fieldGreet');
      try {
        if (view?.greet && !calm) {
          if (quick) greetTimer = setTimeout(() => {
            if (alive && !selected && !busy && !moving && !root.querySelector('dialog[open]')) focus(null);
          }, 1250);
          await view.greet(greetIds);
        } else {
          greetIds.forEach(id => react(id, 'heart'));
          await wait(quick ? 950 : 1400);
        }
      } catch { /* 반겨 주기 연출에 실패해도 들판은 계속 쓸 수 있다. */ }
      if (!alive) return;
      const missed = miss.size > 0;
      miss.clear();
      if (view) {
        try { view.update(state()); } catch { /* 다음 화면 갱신에서 다시 */ }
        if (selected) focus(selected);
        queueThumb();
      } else {
        stageEl.querySelectorAll('.field-miss').forEach(bubble => bubble.remove());
      }
      if (missed && !busy && !moving) showHoldFeedback('보고 싶었대!');
      guideTargets(data, true);
    }

    function infoCard(data) {
      if (moving) return '';
      const missing = lostSheep();
      if (missing && missing.id !== dismissedLost) return `<aside class="field-info-card field-lost" aria-labelledby="field-lost-title">
        <div class="field-info-head"><h2 id="field-lost-title">${esc(josa(missing.name, '이가'))} ${missing.lostFromVisit ? '기다리다 길을 잃었어.' : '안 보여!'}</h2>
          <button type="button" class="link field-info-close">나중에</button></div>
        <div class="field-info-actions"><button type="button" class="btn small field-find">🔦 찾으러 가자</button></div>
      </aside>`;
      const step = tutorialStep(data);
      if (step < 5) {
        const name = mainSheep(data).name;
        const titles = [`이 아이가 네 양 ${josa(name, ['이야', '야'])}`, mode === '2d' ? '쓰다듬기 버튼을 눌러 봐' : '꾹 눌러서 쓰다듬어 봐',
          '간식을 줘 볼까?', mode === '2d' ? '털 깎기 버튼을 눌러 봐' : '털이 복슬하지? 쓱쓱 문질러 깎아 봐', '하트가 차면 내 양이 자라'];
        return `<aside class="field-info-card field-coach" data-tutorial="${step}" aria-labelledby="field-coach-title">
          <div class="field-info-head"><small>첫 들판 안내 · ${step + 1}/5</small>
            <button type="button" class="link field-info-close field-coach-close">건너뛰기</button></div>
          <h2 id="field-coach-title">${esc(titles[step])}</h2>
          ${step === 0 ? `<p>${GAME_LINE}</p>` : step === 4 ? `<p>매일 밤 하트 3개를 채우면 ${esc(josa(name, '이가'))} 자라. 성탄 밤엔 빛나는 양이 되어 함께 구유로 가자!</p><p>장터·순찰·탐험·옷장도 언제든 즐겨 봐.</p>` : ''}
          ${step === 0 || step === 4 ? `<div class="field-info-actions"><button type="button" class="btn small field-coach-next">${step === 0 ? '다음' : '알겠어'}</button></div>` : ''}
        </aside>`;
      }
      if (!unlock) {
        unlock = Object.keys(BASIC_GUIDES).find(key => !data.featureIntro?.[key] &&
          (key !== 'wear' || !Object.keys(data.items).some(id => catalog[id] === 'wear')) &&
          (key !== 'gift' || !Object.keys(data.woolGifts).length));
        if (unlock) {
          (data.featureIntro ||= {})[unlock] = true;
          Core.save();
        }
      }
      if (unlock) {
        const feature = BASIC_GUIDES[unlock];
        return `<aside class="field-info-card field-guide" data-feature="${unlock}" aria-labelledby="field-guide-title">
          <div class="field-info-head"><h2 id="field-guide-title">${esc(feature.title)}</h2>
            <button type="button" class="link field-info-close">확인</button></div>
          <p>${esc(feature.hint)}</p>
          <div class="field-info-actions"><button type="button" class="btn small field-guide-try">👆 눌러 봐</button></div>
        </aside>`;
      }
      const streak = VISIT_MILESTONES.find(day => data.visitRewards?.[day] && !data.visitRewards[day].seen);
      if (streak) return `<aside class="field-info-card field-streak" data-streak="${streak}" aria-labelledby="field-streak-title">
        <div class="field-info-head"><h2 id="field-streak-title">${streak}일 연속! 양들이 너를 기다렸어</h2>
          <button type="button" class="link field-info-close">확인</button></div>
        <p class="field-streak-wool">보너스 털 ${Object.entries(data.visitRewards[streak].wool)
          .map(([id, count]) => `${esc(woolType(id).name)} +${count}`).join(' · ')}</p>
      </aside>`;
      if (episode) {
        if (data.wordDay !== date()) {
          data.wordDay = date();
          Core.save();
        }
        return tonightWord(episode);
      }
      if (!word) {
        word = dailyWord(data);
        if (word) {
          data.wordDay = date();
          Core.save();
        }
      }
      return word ? `<aside class="field-info-card field-daily-word" aria-labelledby="field-word-title">
        <div class="field-info-head"><h2 id="field-word-title">할아버지의 말씀 한 줄</h2>
          <button type="button" class="link field-info-close" aria-label="말씀 카드 닫기">닫기</button></div>
        ${word}</aside>` : '';
    }

    function renderInfo(data) {
      const markup = infoCard(data);
      info.innerHTML = markup;
      root.classList.toggle('has-field-info', Boolean(markup));
      const lostCard = info.querySelector('.field-lost');
      const streakCard = info.querySelector('.field-streak');
      lostCard?.querySelector('.field-find').addEventListener('click', () => search(lostSheep()));
      info.querySelector('.field-coach-next')?.addEventListener('click', () => advanceTour(tutorialStep(data) === 0 ? 1 : 5));
      info.querySelector('.field-info-close')?.addEventListener('click', () => {
        if (info.querySelector('.field-coach')) return advanceTour(5);
        if (lostCard) dismissedLost = lostSheep()?.id;
        else if (unlock) unlock = undefined;
        else if (streakCard) {
          data.visitRewards[streakCard.dataset.streak].seen = true;
          Core.save();
        }
        else if (episode) episode = null;
        else word = '';
        renderInfo(data);
        guideTargets(data);
        focusNext();
      });
      info.querySelector('.field-guide-try')?.addEventListener('click', () => {
        const open = { wear: () => dress(), gift: () => giftSheet(), flock: flockSheet }[unlock];
        unlock = undefined;
        renderInfo(data);
        guideTargets(data);
        focusNext();
        open();
      });
    }

    function focusNext() {
      const button = info.querySelector('.field-find, .field-coach-next') ||
        main.querySelector('.field-main-pet:not(:disabled), .field-main-treat:not(:disabled), .field-main-shear:not(:disabled)') ||
        info.querySelector('.field-info-close') || care.querySelector('.field-shear:not(:disabled)') || back;
      button.focus({ preventScroll: true });
    }

    function guideTargets(data, force = false) {
      const step = Number(info.querySelector('.field-coach')?.dataset.tutorial ?? -1);
      root.dataset.tutorial = step;
      if (view && (force || step !== guidedStep)) {
        if (!selected && !busy && !moving) {
          if ([0, 1, 3].includes(step)) focus(mainSheep(data)?.id);
          else if ([0, 1, 3].includes(guidedStep)) focus(null);
        }
        guidedStep = step;
      }
      manage.querySelectorAll('.field-guide-target').forEach(el => el.classList.remove('field-guide-target'));
      const key = info.querySelector('.field-guide')?.dataset.feature;
      const selector = BASIC_GUIDES[key]?.selector;
      if (selector) manage.querySelector(selector)?.classList.add('field-guide-target');
    }

    function renderMain(data, today) {
      const daily = mainCare(today, data);
      if (!daily) return;
      const { sheep } = daily;
      const growth = growthStage(data, today);
      const next = MAIN_STAGES[MAIN_STAGES.indexOf(growth) + 1];
      const daysLeft = next ? next.days - growthDays(data) : 0;
      const daysNeeded = next ? next.days - growth.days : 1;
      const name = esc(sheep.name);
      const step = tutorialStep(data);
      main.innerHTML = `<section class="field-main-card" aria-labelledby="field-main-title">
        <header><div><span class="field-main-tag">내 양</span> <button type="button" class="link field-main-name" id="field-main-title">${name}</button>
          <small>${growth.label}</small></div><b class="field-main-hearts" aria-label="오늘 하트 ${daily.hearts}/3">${heartMarks(daily.hearts)}</b></header>
        <div class="field-main-progress"><small>${next ? `다음 단계까지 ${daysLeft}일` : '성탄 밤 함께 구유로 가자'}</small>
          <progress aria-label="다음 성장 단계" max="${daysNeeded}" value="${daysNeeded - daysLeft}"></progress></div>
        <div class="field-main-actions">
          ${sheep.lost && !trial ? '<button type="button" class="btn small field-main-find">🔦 찾으러 가자</button>' : `
          ${mode === '2d' && (!daily.pet || trial) ? `<button type="button" class="btn small field-main-pet" ${step === 0 && !trial ? 'disabled' : ''}>🤲 쓰다듬기</button>` :
            `<span>${daily.pet ? '✓ 쓰다듬기' : '🤲 꾹 눌러 쓰다듬기'}</span>`}
          <button type="button" class="btn small field-main-treat" ${mode === 'loading' || treating || (!trial && (daily.treat || step < 2)) ? 'disabled' : ''}>${trial ? '🍎 간식 체험' : daily.treat ? '✓ 간식 주기' : '🍎 간식 주기'}</button>
          ${mode === '2d' ? `<button type="button" class="btn small field-main-shear" ${(trial ? trial.shorn : daily.wool || step < 3) ? 'disabled' : ''}>${trial ? '✂️ 털 깎기 체험' : daily.wool ? '✓ 털 깎기' : '✂️ 털 깎기'}</button>` :
            `<span>${daily.wool ? '✓ 털 깎기' : '✂️ 쓱쓱 털 깎기'}</span>`}`}
        </div>
        ${daily.hearts === 3 ? `<p class="field-main-happy" role="status">오늘 ${esc(josa(sheep.name, '이가'))} 행복해! 🌟</p>` :
          daily.wool ? '<p class="field-main-short-wool">오늘은 털이 아직 짧아.</p>' : ''}
      </section>`;
      main.querySelector('.field-main-name').onclick = () => sheepSheet(sheep);
      main.querySelector('.field-main-pet')?.addEventListener('click', () => pet(sheep, true));
      main.querySelector('.field-main-treat')?.addEventListener('click', giveTreat);
      main.querySelector('.field-main-shear')?.addEventListener('click', () => shear(sheep.id));
      main.querySelector('.field-main-find')?.addEventListener('click', () => search(sheep));
    }

    async function giveTreat() {
      const data = ensure();
      const today = date();
      const daily = mainCare(today, data);
      if (!alive || busy || moving || treating || !daily || (!trial && (daily.sheep.lost || daily.treat))) return;
      treating = true;
      if (!trial) {
        data.mainTreatOn = today;
        completeMainCare(data, today);
        Core.save();
      }
      const sheep = daily.sheep;
      Sound.sfx('fieldGreet');
      render();
      try {
        if (view?.treat) await view.treat(sheep.id);
        else { react(sheep.id, 'heart'); await wait(650); }
      } catch { /* 간식은 이미 기록됨 */ }
      treating = false;
      if (!alive) return;
      if (trial) render();
      guideTargets(data, true);
      showPersonality(sheep, 'treat');
      celebrateMainGrowth();
    }

    function render(message = servedTonight) {
      if (!alive) return;
      const data = ensure();
      const today = date();
      const visitors = activeVisitors(data);
      const justMet = mode === 'loading' ? [] : visitors.filter(v => (v.chapterGift || v.helper) && !v.until);
      if (justMet.length) {
        justMet.forEach(v => { v.until = today; });
        Core.save();
      }
      const mine = mainSheep(data);
      const shearable = shearReady(mine, today) ? [mine] : [];
      const tonightLeft = shearTonight(today);
      const hasSheepInField = !mine.lost;
      const mainShearGuide = mode === '2d' && tutorialStep(data) === 3 && shearable[0]?.id === data.mainId;
      const visitor = visitors[0];
      count.textContent = '내 양과 친구들';
      count.setAttribute('aria-label', '내 양과 친구들 보기');
      count.disabled = Boolean(moving);
      oil.innerHTML = `<span aria-hidden="true">◕</span> 기름 ${Core.data.oil || 0}`;
      renderInfo(data);
      renderMain(data, today);
      visitButton.hidden = !visitor || Boolean(moving);
      if (visitor && !moving) {
        visitButton.dataset.visit = visitor.id;
        visitLabel.textContent = visitor.helper ? '🎁 선물 친구 · 털 받기' : visitor.sunday ? '주일 손님 · 털 받기' : '친구가 왔어 · 털 받기';
      }
      care.innerHTML = `<section class="field-wool-bag" aria-label="털 바구니">
          <b>털 바구니</b><div class="field-wool-colors">${WOOL_IDS.filter(id => woolAmount(data.woolBag, id)).map(id => woolUnit(id, woolAmount(data.woolBag, id))).join('') || '<small>털을 깎으면 여기 모여</small>'}</div>
        </section>
        ${moving ? '' : `${mainShearGuide ? '' : mode === '2d' && hasSheepInField ?
          `<button type="button" class="btn field-shear${tonightLeft ? '' : ' ghost'}" ${shearable.length ? '' : 'disabled'}>${shearable.length ?
            `${tonightLeft ? '✂️ 털 깎기' : '✂️ 더 깎기'} <small>· ${esc(shearable[0].name)} · ${woolType(woolOf(shearable[0])).name}</small>` :
            '내일 밤 다시 복슬해져'}</button>` :
          hasSheepInField ? `<p class="field-shear-hint">${!shearable.length ? '✓ 오늘 밤엔 다 깎았어' : tonightLeft ? '✂️ 양을 쓱쓱 문질러 봐 · ' + tonightLeft + '마리 남음' : '✓ 오늘 밤 몫은 다 했어 · 더 깎아도 돼'}</p>` : ''}
          <p class="field-feedback" role="status">${esc(message)}</p>`}`;
      manage.innerHTML = `${moving ? `<p class="field-move-tip"><span>${esc(josa(moving.item, '을를'))} 놓을 빈 칸을 골라 줘.</span><button type="button" class="link field-cancel-move">취소</button></p>` :
          `${giftBox(data)}<div class="field-actions">
            <button type="button" class="field-act field-flock" aria-haspopup="dialog"><span aria-hidden="true">🐑</span>내 양</button>
            <button type="button" class="field-act field-explore"><span aria-hidden="true">🧭</span>탐험</button>
            <button type="button" class="field-act field-wear-shop" aria-haspopup="dialog"><span aria-hidden="true">👗</span>옷장</button>
            <button type="button" class="field-act field-market"><span aria-hidden="true">🏪</span>장터</button>
            <button type="button" class="field-act field-patrol"><span aria-hidden="true">🔦</span>밤 순찰${data.patrolDay !== today ? '<i class="field-dot" aria-label="오늘 보상 남음"></i>' : ''}</button>
            <button type="button" class="field-act field-dex"><span aria-hidden="true">📖</span>친구 양</button>
            <button type="button" class="field-act field-card"><span aria-hidden="true">🖼️</span>들판 카드</button>
          </div>`}
        ${moving ? '' : '<button type="button" class="btn ghost field-share-link">내 들판 자랑하기</button>'}
        ${moving ? `<p class="field-feedback" role="status">${esc(message)}</p>` : ''}
        ${moving ? '' : testTools(data)}`;
      manage.querySelector('.field-cancel-move')?.addEventListener('click', () => { moving = null; render(); });
      care.querySelector('.field-shear:not(:disabled)')?.addEventListener('click', () => shear(shearable[0].id));
      manage.querySelector('.field-gift-box')?.addEventListener('click', () => giftSheet());
      manage.querySelector('.field-flock')?.addEventListener('click', flockSheet);
      manage.querySelector('.field-explore')?.addEventListener('click', () => Explore.map());
      manage.querySelector('.field-patrol')?.addEventListener('click', patrolSheet);
      manage.querySelector('.field-dex')?.addEventListener('click', dexSheet);
      manage.querySelector('.field-market')?.addEventListener('click', () => shop());
      manage.querySelector('.field-wear-shop')?.addEventListener('click', () => dress());
      manage.querySelector('.field-card')?.addEventListener('click', () => cardSheet('들판 카드', () => Card.drawField(), 'FIELD', '양과 별이 그려진 나의 들판 카드'));
      manage.querySelector('.field-share-link')?.addEventListener('click', shareSheet);
      bindTestTools(data);
      if (mode === '2d') {
        stageEl.className = 'field-stage is-2d';
        stageEl.innerHTML = mapMarkup(data, moving, miss, trial);
        stageEl.querySelectorAll('[data-slot]').forEach(button => { button.onclick = () => selectSlot(Number(button.dataset.slot)); });
        stageEl.querySelectorAll('[data-sheep-id]').forEach(button => {
          button.onclick = () => handlers.onTapSheep(button.dataset.sheepId);
        });
        stageEl.querySelectorAll('[data-visitor]').forEach(button => { button.onclick = () => greetFriend(button.dataset.visitor); });
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
      guideTargets(data);
    }

    function advanceTour(next) {
      field().mainTutorialStep = next;
      Core.save();
      render();
      focusNext();
      celebrateMainGrowth();
    }

    const sheet = (title, body, className, onClose) => fieldSheet(root, title, body, className, onClose);

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

    function celebrateMainGrowth() {
      const data = field();
      const growth = MAIN_STAGES.find(stage => stage.level === data.mainGrowthNotice);
      const sheep = mainSheep(data);
      if (!growth || !sheep || sheep.lost || tutorialStep(data) < 5 || mode === 'loading' || treating || busy || moving ||
          root.querySelector('dialog[open]')) return;
      delete data.mainGrowthNotice;
      Core.save();
      react(sheep.id, 'grow');
      Sound.sfx('star');
      const title = `${josa(sheep.name, '이가')} ${growth.label}이 됐어!`;
      const modal = sheet(title, `<div class="field-grow ${growth.level === 10 ? 'shine' : ''}">
        ${portraitHTML(sheep.species, { level: growth.level, wear: sheep.wear }, 'big')}
        <p>함께 자란 기록 ${growthDays(data)}일</p></div>
        <button type="button" class="btn field-growth-card">성장 카드 저장·공유</button>`, 'field-grow-sheet field-main-growth');
      const portrait = { ...sheep };
      const days = growthDays(data);
      modal.querySelector('.field-growth-card').onclick = () => cardSheet('내 양 성장 카드',
        () => Card.drawGrowth(portrait, growth.label, days), 'GROWTH', title);
    }

    function shear(id) {
      if (!alive || busy || moving || root.querySelector('dialog[open]')) return;
      const data = ensure();
      const today = date();
      const sheep = data.sheep.find(s => s.id === id && (!s.lost || (trial && s.id === data.mainId)));
      if (!sheep) return;
      if (sheep.id !== data.mainId) {
        if (view) woolTouched = true;
        showHoldFeedback('친구 양이야. 털은 내 양만 깎을 수 있어.');
        return;
      }
      if (trial) {
        if (trial.shorn) return;
        trial.shorn = true;
        if (view) woolTouched = true;
        Sound.sfx('shearDone');
        render();
        showPersonality(sheep, 'shear');
        return;
      }
      if (!shearReady(sheep, today)) {
        try { view?.update(state()); } catch { /* 손을 떼면 다시 동기화 */ }
        if (view) woolTouched = true;
        showHoldFeedback('내일 밤 다시 복슬해져.');
        return;
      }
      const lastShear = sheep.shornOn || sheep.born;
      sheep.shornOn = today;
      if (view) woolTouched = true;
      const kind = woolOf(sheep);
      const base = sheep.level >= 10 ? 3 : sheep.level >= 3 ? 2 : 1;
      const elapsed = daysBetween(lastShear, today);
      // 이튿날 자란 털은 기본 몫에 들어가므로 건너뛴 날만 센다.
      const bonusWool = Number.isFinite(elapsed) ? Math.min(6, Math.max(0, elapsed - 1)) : 0;
      const bunches = base + bonusWool;
      addWool(data.woolBag, kind, bunches);
      sheep.care++;
      if (data.cared !== today) {
        data.cared = today;
        data.careDays++;
      }
      completeMainCare(data, today);
      welcomeHelper(data);
      Core.save();
      Sound.sfx('shearDone');
      navigator.vibrate?.(18);
      const woolGain = `${woolType(kind).name} +${bunches}뭉치`;
      servedTonight = bonusWool ? `털이 많이 자랐네! 밀린 털 +${bonusWool} · ${woolGain}` : woolGain;
      render();
      view?.say?.(id, `+${bunches}`, woolType(kind).color);
      // 날아간 털 뭉치가 바구니에 닿을 즈음 그 색 칸이 통 튄다.
      clearTimeout(woolBumpTimer);
      clearTimeout(woolGainTimer);
      woolBumpTimer = setTimeout(() => {
        const unit = care.querySelector(`.field-wool-unit[data-wool="${kind}"]`);
        if (!unit) return;
        unit.classList.add('bump');
        const bag = unit.closest('.field-wool-bag');
        bag.insertAdjacentHTML('beforeend', `<small class="field-wool-gain" aria-hidden="true">+${bunches}</small>`);
        woolGainTimer = setTimeout(() => {
          unit.classList.remove('bump');
          bag.querySelector('.field-wool-gain')?.remove();
        }, 920);
      }, view ? 650 : 120);
      if (!view) {
        const sheepButton = stageEl.querySelector(`[data-sheep-id="${CSS.escape(id)}"]`);
        sheepButton?.insertAdjacentHTML('beforeend', `<span class="field-wool-tuft" style="--wool:${woolType(kind).color}" aria-hidden="true"></span>`);
        setTimeout(() => sheepButton?.querySelector('.field-wool-tuft')?.remove(), 650);
      }
      showPersonality(sheep, 'shear');
      celebrateMainGrowth();
      badges();
    }

    function giftBox(data) {
      const count = GIFTS.filter(gift => data.woolGifts[gift.id]).length;
      const canMake = GIFTS.some(gift => !data.woolGifts[gift.id] && giftOpen(gift, allGiftsOpen) && giftMaterials(gift, data).ready);
      return `<button type="button" class="field-gift-box">
        <span class="field-gift-heading"><strong>🎁 선물 상자</strong><small>${canMake ? '<b>만들 수 있어!</b> · ' : ''}${count}/${GIFTS.length} 전달</small></span>
        <span class="field-gift-grid">${GIFTS.map(gift => {
          const made = data.woolGifts[gift.id];
          return `<span class="field-gift-slot${made ? ' made' : ''}">${giftArt(gift.id, woolColors(made?.wool), !made)}
            <small>${gift.to}${made ? ' ✓' : ''}</small></span>`;
        }).join('')}</span></button>`;
    }

    function woolHint(data, id, missing) {
      if (id === 'any') return `색 털이 ${missing}뭉치 모자라 · 흰 털은 여기에 쓸 수 없어.`;
      const sample = data.sheep.find(sheep => woolOf(sheep) === id);
      const kind = DEX().filter(species => species.wool === id);
      const name = sample?.name || (kind.find(species => species.rarity === 'common') || kind[0])?.name;
      const wool = woolType(id).name;
      return `${josa(wool, '이가')} ${missing}뭉치 모자라${id === woolOf(mainSheep(data)) ? ' · 내 양이나 친구 양에게서 얻어.' : name ? ` · ${name} 같은 친구 양이 선물해 줘.` : '.'}`;
    }

    function giftSheet(id) {
      const data = ensure();
      const pending = GIFTS.filter(item => !data.woolGifts[item.id] && giftOpen(item, allGiftsOpen));
      const first = pending.find(item => giftMaterials(item, data).ready) || pending[0];
      const modal = sheet('🎁 선물 상자', `
        <nav class="field-gift-tabs" aria-label="받는 사람">${GIFTS.map(gift =>
          `<button type="button" data-gift="${gift.id}" aria-pressed="false">${gift.to}${data.woolGifts[gift.id] ? ' ✓' : ''}</button>`).join('')}</nav>
        <div class="field-gift-detail"></div>`, 'field-gift-sheet');
      const tabs = [...modal.querySelectorAll('[data-gift]')];
      const panel = modal.querySelector('.field-gift-detail');
      function select(gift) {
        tabs.forEach(tab => tab.setAttribute('aria-pressed', String(tab.dataset.gift === gift.id)));
        const made = data.woolGifts[gift.id];
        const open = giftOpen(gift, allGiftsOpen);
        const materials = giftMaterials(gift, data);
        panel.innerHTML = `<div class="field-gift-hero">${giftArt(gift.id, woolColors(made?.wool || materials.used), !made && !open)}</div>
          <h3>${gift.title}</h3><p class="field-gift-to">받는 사람 · ${gift.to}</p>
          ${made ? '<button type="button" class="btn field-gift-letter">감사 쪽지 보기</button>' :
            !open ? `<p class="field-gift-lock">🔒 「${esc(Core.epById(gift.episode)?.title || '')}」 이야기를 마치면 열려.</p>` :
              `<ul class="field-gift-materials">${materials.rows.map(row => {
                const type = row.id === 'any' ? { name: '아무 색 털 (흰 털 제외)', color: '#c6a1e5' } : woolType(row.id);
                return `<li><label><span><i style="--wool:${type.color}"></i>${row.own ? `내 양 털 (${type.name})` : type.name}</span><b>${row.have} / ${row.need}</b>
                  <progress max="${row.need}" value="${Math.min(row.have, row.need)}"></progress></label>
                  ${row.missing ? `<small>${esc(woolHint(data, row.id, row.missing))}</small>` : ''}</li>`;
              }).join('')}</ul>
              <button type="button" class="btn field-gift-make" ${materials.ready ? '' : 'disabled'}>만들기</button>`}`;
        panel.querySelector('.field-gift-letter')?.addEventListener('click', () => giftNote(gift.id));
        panel.querySelector('.field-gift-make')?.addEventListener('click', () => makeGift(gift, modal));
      }
      tabs.forEach((tab, i) => tab.onclick = () => select(GIFTS[i]));
      select(GIFTS.find(gift => gift.id === id) || first || GIFTS.find(gift => !data.woolGifts[gift.id]) || GIFTS[0]);
    }

    async function makeGift(gift, modal) {
      const data = ensure();
      if (!modal.open || data.woolGifts[gift.id] || !giftOpen(gift, allGiftsOpen)) return;
      const { ready, used } = giftMaterials(gift, data);
      if (!ready) return;
      for (const [id, count] of Object.entries(used)) data.woolBag[id] -= count;
      data.woolGifts[gift.id] = { wool: used, date: date(), name: Core.data.nickname || '친구' };
      welcomeHelper(data);
      Core.save();
      render(`🎁 ${gift.to}에게 ${josa(gift.title, '을를')} 전했어!`);
      const colors = woolColors(used);
      modal.querySelector('.field-gift-tabs').hidden = true;
      modal.querySelector('.field-gift-detail').innerHTML = `<div class="field-knit" style="--thread-a:${colors[0]};--thread-b:${colors[1] || colors[0]}">
        <i aria-hidden="true"></i><p role="status">털실을 감아 선물을 만드는 중…</p></div>`;
      const calm = document.documentElement.classList.contains('no-motion') || matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (!calm) Sound.sfx('knit');
      await wait(calm ? 150 : 1500);
      if (alive && modal.open) {
        Sound.sfx('gift');
        giftNote(gift.id);
      }
    }

    function giftNote(id) {
      const gift = giftCardData(id);
      if (!gift) return;
      const modal = sheet('💌 감사 쪽지', `<div class="field-gift-hero">${gift.art}</div>
        <div class="field-gift-note"><p>${esc(gift.note)}</p><b>${gift.to === '아기 예수님' ? '할아버지' : esc(gift.to)}</b></div>
        <button type="button" class="btn field-gift-card">선물 카드 저장·공유</button>
        <button type="button" class="btn ghost field-gift-back">선물 상자로</button>`, 'field-gift-sheet');
      modal.querySelector('.field-gift-card').onclick = () => cardSheet(gift.title, () => Card.drawGift(id), 'GIFT:' + id, gift.to + '에게 전한 ' + gift.title);
      modal.querySelector('.field-gift-back').onclick = () => giftSheet(id);
    }

    function animateFriendLeave(friend, wasNear, farewell) {
      const calm = document.documentElement.classList.contains('no-motion') || matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (!wasNear || calm) {
        render(farewell);
        return;
      }
      if (view && view._debug?.sheepObjs) {
        const dbg = view._debug;
        const obj = dbg.sheepObjs.get(friend.id);
        if (obj) {
          dbg.sheepObjs.delete(friend.id);
          render(farewell);
          const x0 = obj.position.x, z0 = obj.position.z;
          const tx = -5.2, tz = 7.4;
          const start = performance.now();
          let lookedBack = false;
          const step = () => {
            if (!alive || !view) return;
            const elapsed = performance.now() - start;
            if (elapsed < 560) {
              const p = elapsed / 560;
              const nx = x0 + (tx - x0) * p;
              const nz = z0 + (tz - z0) * p;
              const gy = typeof dbg.groundAt === 'function' ? dbg.groundAt(nx, nz) : obj.position.y;
              obj.position.set(nx, gy + Math.abs(Math.sin(p * Math.PI * 3)) * 0.14, nz);
              obj.rotation.y = Math.atan2(tx - x0, tz - z0);
              requestAnimationFrame(step);
            } else if (elapsed < 980) {
              if (!lookedBack) {
                lookedBack = true;
                obj.rotation.y = Math.atan2(0 - obj.position.x, 2.2 - obj.position.z);
                obj.userData.hop = 0.65;
              }
              const fade = Math.max(0, 1 - (elapsed - 720) / 260);
              obj.scale.setScalar(0.85 + fade * 0.15);
              requestAnimationFrame(step);
            } else {
              dbg.scene?.remove(obj);
            }
          };
          requestAnimationFrame(step);
          return;
        }
      }
      render(farewell);
      const mapEl = stageEl.querySelector('.field-map');
      if (mapEl) {
        const leaveEl = document.createElement('div');
        leaveEl.className = 'field-sheep is-leaving';
        leaveEl.dataset.leavingSheep = friend.id;
        leaveEl.style.cssText = position(114, 340);
        leaveEl.innerHTML = `${sprite(sheepArt(friend), '-40 -50 80 58')}<span class="field-leave-bubble">${esc(farewell)}</span>`;
        mapEl.appendChild(leaveEl);
        setTimeout(() => leaveEl.classList.add('is-lookback'), 480);
        setTimeout(() => leaveEl.remove(), 980);
      }
    }

    function confirmLeaveFriend(friend) {
      const sp = spec(friend.species);
      const modal = sheet('친구 떠나보내기', `<div class="field-visitor-card ${sp.rarity}">
          ${portraitHTML(friend.species, { level: friend.level || 5, wear: friend.wear }, 'big')}
          <h3>${esc(friend.name || sp.name)} ${rarityBadge(sp)}</h3>
          <p class="field-visitor-desc" data-leave-prompt>${esc(josa(friend.name || sp.name, '을를'))} 들판 밖으로 보내 줄까? 도감 기록은 남아.</p>
        </div>
        <div class="row field-leave-actions">
          <button type="button" class="btn field-leave-confirm" data-leave-confirm="${esc(friend.id)}">떠나보내기</button>
          <button type="button" class="btn ghost field-leave-cancel" data-leave-cancel>그만두기</button>
        </div>`, 'field-leave-sheet');
      modal.querySelector('[data-leave-cancel]').onclick = () => flockSheet();
      modal.querySelector('[data-leave-confirm]').onclick = () => {
        const data = ensure();
        const target = data.sheep.find(s => s.id === friend.id && s.id !== data.mainId);
        if (!target) { modal.close(); return; }
        const today = date();
        const wasNear = nearbyIds(data).includes(target.id);
        data.friendMet[target.species] ||= target.born || data.since || today;
        data.dex[target.species] ||= target.born || data.since || today;
        (data.departed ||= {})[target.species] = {
          id: target.id, name: target.name, species: target.species,
          level: target.level || 5, born: target.born || today, care: target.care || 0
        };
        data.sheep = data.sheep.filter(s => s.id !== target.id);
        data.nearby = nearbyIds(data).filter(id => id !== target.id);
        if (data.leader === target.id) data.leader = data.mainId || data.sheep[0]?.id || null;
        Core.save();
        modal.close();
        const farewell = `잘 가, ${target.name || sp.name}`;
        servedTonight = farewell;
        Sound.sfx('select');
        showHoldFeedback(farewell, 2800);
        Player.toast?.(farewell);
        animateFriendLeave(target, wasNear, farewell);
      };
    }

    function flockSheet(notice = '') {
      if (busy || moving) return;
      const noticeText = typeof notice === 'string' ? notice : '';
      const data = ensure();
      const mine = mainSheep(data);
      const guests = activeVisitors(data);
      const legacy = data.sheep.filter(s => s.id !== mine.id);
      const near = nearbyIds(data);
      const card = (s, attr, caption) => {
        const sp = spec(s.species);
        return `<button type="button" class="field-flock-card" ${attr}="${esc(s.id)}">
          ${portraitHTML(s.species, { level: s.level || 5, wear: s.wear })}
          <strong>${esc(s.name || sp.name)}</strong><span class="field-flock-kind">${esc(sp.name)} ${rarityBadge(sp)}</span>
          <span class="field-flock-status">${esc(caption)}</span></button>`;
      };
      const friendCard = s => {
        const isNear = near.includes(s.id);
        const caption = isNear ? '🌿 곁에 둔 친구' : '🏠 우리에서 쉬는 중';
        return `<div class="field-flock-item ${isNear ? 'is-nearby' : 'is-resting'}" data-flock-item="${esc(s.id)}">
          ${card(s, 'data-flock-friend', caption)}
          <div class="field-flock-item-actions">
            <button type="button" class="btn small ${isNear ? 'ghost' : ''} field-flock-toggle" data-flock-toggle="${esc(s.id)}" aria-pressed="${isNear}">${isNear ? '우리로 보내기' : '곁에 두기'}</button>
            <button type="button" class="btn small ghost field-flock-leave" data-flock-leave="${esc(s.id)}">떠나보내기</button>
          </div>
        </div>`;
      };
      const modal = sheet('내 양', `${card(mine, 'data-flock-id', mine.lost ? '길을 잃었어' : growthStage(data, date()).label)}
        <h3 class="field-sub">놀러 온 친구들</h3>
        ${guests.length ? `<div class="field-flock-grid">${guests.map(v => card(v, 'data-flock-guest', '털 선물 받기')).join('')}</div>` :
          '<p class="field-sheet-meta">지금 놀러 온 친구가 없어.</p>'}
        ${legacy.length ? `<h3 class="field-sub">함께 지낸 친구들 <small class="field-sub-count">(곁에 ${near.length}/2)</small></h3>
          <p class="field-sheet-meta field-flock-notice" data-flock-notice role="status">${esc(noticeText || '들판에는 친구를 2마리까지 곁에 둘 수 있어. 나머지는 우리에서 쉬어.')}</p>
          <div class="field-flock-grid">${legacy.map(friendCard).join('')}</div>` : ''}`, 'field-flock-sheet');
      modal.querySelector('[data-flock-id]').onclick = () => {
        modal.close();
        if (!mine.lost && mode !== '2d') stageEl.scrollIntoView({ block: 'nearest' });
        sheepSheet(mine);
      };
      modal.querySelectorAll('[data-flock-guest]').forEach(button => {
        button.onclick = () => { modal.close(); greetFriend(button.dataset.flockGuest); };
      });
      modal.querySelectorAll('[data-flock-friend]').forEach(button => {
        button.onclick = () => {
          const friend = legacy.find(s => s.id === button.dataset.flockFriend);
          if (!friend) return;
          if (!nearbyIds(field()).includes(friend.id)) {
            const noticeEl = modal.querySelector('[data-flock-notice]');
            if (noticeEl) noticeEl.textContent = `${josa(friend.name, '이는은')} 지금 우리에서 쉬는 중이야. [곁에 두기]를 누르면 들판에 나와.`;
            return;
          }
          modal.close();
          focus(friend.id);
          showPersonality(friend, 'idle');
        };
      });
      modal.querySelectorAll('[data-flock-toggle]').forEach(button => {
        button.onclick = () => {
          const d = ensure();
          const friend = d.sheep.find(s => s.id === button.dataset.flockToggle && s.id !== d.mainId);
          if (!friend) return;
          const curNear = nearbyIds(d);
          if (curNear.includes(friend.id)) {
            d.nearby = curNear.filter(id => id !== friend.id);
            Core.save();
            Sound.sfx('select');
            const msg = `${josa(friend.name, '이가')} 우리에서 쉬러 갔어.`;
            render(msg);
            flockSheet(msg);
          } else if (curNear.length >= 2) {
            Sound.sfx('boop');
            const warn = '곁에 둘 수 있는 친구는 2마리까지야. 먼저 한 마리를 우리로 보내 줘.';
            const noticeEl = modal.querySelector('[data-flock-notice]');
            if (noticeEl) {
              noticeEl.textContent = warn;
              noticeEl.classList.add('is-warn');
            }
            showHoldFeedback(warn);
          } else {
            d.nearby = [...curNear, friend.id];
            Core.save();
            Sound.sfx('select');
            const msg = `${josa(friend.name, '이를')} 들판 곁에 두었어.`;
            render(msg);
            flockSheet(msg);
          }
        };
      });
      modal.querySelectorAll('[data-flock-leave]').forEach(button => {
        button.onclick = () => {
          const friend = legacy.find(s => s.id === button.dataset.flockLeave);
          if (friend) confirmLeaveFriend(friend);
        };
      });
    }

    function sheepSheet(sheep) {
      selected = sheep.lost ? null : sheep.id;
      if (view && selected) { focus(selected); try { view.update(state()); } catch { /* 무시 */ } }
      const data = field();
      const sp = spec(sheep.species);
      const today = date();
      const pets = sheep.petDay === today ? sheep.petCount : 0;
      const isLeader = data.leader === sheep.id;
      const wool = woolType(woolOf(sheep));
      const modal = sheet(sheep.name, `<div class="field-sheep-card">
          <div class="field-sheep-portrait ${sp.rarity}">${portraitHTML(sheep.species, { level: sheep.level, wear: sheep.wear })}</div>
          <div class="field-sheep-info">
            <p class="field-sheep-kind">${esc(sp.name)} ${rarityBadge(sp)}</p>
            <p class="field-sheep-stage"><i class="field-wool-dot" style="--wool:${wool.color}"></i> ${wool.name}${!woolLength(sheep) ? ' · 오늘 깎았어' : ''}</p>
            <span class="field-main-tag">내 양 · ${growthStage(data, today).label}</span>
            ${sheep.lost ? '' : '<button type="button" class="link field-rename">✎ 이름 바꾸기</button>'}
          </div></div>
        ${hasSkill(sp) ? '<small class="field-skill-level">✦ 특기 · Lv3부터</small>' : ''}
        ${sheep.lost ? '<p class="field-sheet-meta">길을 잃었어.</p><button type="button" class="btn field-find">찾으러 가자 →</button>' :
        `<div class="field-sheep-actions">
          ${mode === '2d' ? (shearReady(sheep, today) ? '<button type="button" class="btn field-shear">✂️ 털 깎기</button>' :
            '<button type="button" class="btn ghost field-shear" disabled>내일 밤 다시 복슬해져</button>') : ''}
          <button type="button" class="btn field-pet" ${pets >= PET_MAX ? 'disabled' : ''}>🤲 쓰다듬기 <small>(오늘 ${pets}/${PET_MAX})</small></button>
          <div class="row"><button type="button" class="btn ghost field-wear">꾸미기</button>
          <button type="button" class="btn ghost field-leader" ${isLeader ? 'disabled' : ''}>${isLeader ? '⭐ 순찰 대장' : '대장으로'}</button></div>
        <button type="button" class="btn ghost field-main-share-card">자랑 카드 저장·공유</button></div>`}`, 'field-sheep-sheet', () => {
        if (selected !== sheep.id) return;
        selected = null;
        focus(null);
        if (view) { try { view.update(state()); } catch { /* 무시 */ } }
        guideTargets(data, true);
      });
      if (sheep.lost) {
        modal.querySelector('.field-find').onclick = () => search(sheep);
        return;
      }
      modal.querySelector('.field-shear:not(:disabled)')?.addEventListener('click', () => { modal.close(); shear(sheep.id); });
      modal.querySelector('.field-pet').onclick = () => pet(sheep);
      modal.querySelector('.field-wear')?.addEventListener('click', () => dress(sheep));
      modal.querySelector('.field-main-share-card')?.addEventListener('click', () => ownCard(root, sheep));
      modal.querySelector('.field-rename').onclick = () => rename(sheep);
      modal.querySelector('.field-leader')?.addEventListener('click', () => {
        field().leader = sheep.id;
        Core.save();
        Sound.sfx('select');
        render(`${josa(sheep.name, '이가')} 순찰 대장이 됐어 ⭐`);
        sheepSheet(sheep);
      });
    }

    function showHoldFeedback(message, duration = 2700) {
      clearTimeout(holdTimer);
      holdFeedback.textContent = message;
      holdTimer = setTimeout(() => { holdFeedback.textContent = ''; }, duration);
    }

    function showPersonality(sheep, action, firstPet = false) {
      const { id, species } = sheep;
      const lines = REACT[species]?.[action];
      if (!lines?.length) return;
      const index = species === 'chatty' && action === 'idle' ? chatter++ % lines.length :
        species === 'shy' && action === 'pet' && !firstPet ? 1 : 0;
      showHoldFeedback(lines[index], 2000);
      if (species === 'sleepy' && ['pet', 'treat'].includes(action)) react(id, 'sleep');
      else if (species === 'jumper' || (species === 'glutton' && action === 'treat')) react(id, 'jump');
      else if (species === 'shy' && action === 'pet') react(id, firstPet ? 'shiver' : 'heart');
      else if (action === 'pet') react(id, 'heart');
      if (species === 'glutton' && action === 'treat') setTimeout(() => { if (alive) react(id, 'jump'); }, 420);
      if (species === 'david' && action === 'pet') {
        Sound.sfx('fieldHarp');
        view?.say?.(id, '♪ ✦', '#ffe08a');
      }
      if ((species === 'jacob' && action === 'pet') || (species === 'fleece' && action === 'shear')) react(id, 'grow');
      if (species === 'manger' && action === 'treat') view?.say?.(id, '✦', '#ffe393');
    }

    function pet(sheep, fromHold = false) {
      if (sheep.id !== mainSheep()?.id) return;
      if (trial) {
        showPersonality(sheep, 'pet', trial.pets++ === 0);
        return;
      }
      const today = date();
      const first = !sheep.petDay;
      if (sheep.petDay !== today) { sheep.petDay = today; sheep.petCount = 0; }
      if (sheep.petCount >= PET_MAX) {
        if (fromHold) showHoldFeedback('오늘은 충분히 쓰다듬었어.');
        return;
      }
      sheep.petCount++;
      const data = ensure();
      completeMainCare(data, today);
      Core.save();
      if (!fromHold) root.querySelector('dialog[open]')?.close();
      sheepSound(sheep);
      navigator.vibrate?.(15);
      render();
      showPersonality(sheep, 'pet', first);
      celebrateMainGrowth();
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

    function greetFriend(id) {
      if (!alive || busy || moving) return;
      const gift = receiveFriend(id);
      if (!gift) return;
      const receipt = `${josa(gift.species.name, '이가')} 털을 주고 갔어! ${woolType(gift.wool).name} +${gift.count}`;
      Sound.sfx('gift');
      render(receipt);
      showPersonality({ id, species: gift.species.id }, 'idle');
      Player.toast(receipt);
      badges();
    }

    function dexSheet() {
      const data = ensure();
      const mine = mainSheep(data);
      const modal = sheet('이런 양들도 있어', `<div class="field-dex-grid">${DEX().map(s => {
        const own = s.id === mine.species;
        const met = data.friendMet[s.id] || data.departed?.[s.id];
        return `<button type="button" class="field-dex-cell ${s.rarity} ${own || met ? 'got' : ''}" data-dex="${s.id}">
          ${portraitHTML(s.id, { level: own ? mine.level : 5, wear: own ? mine.wear : null })}
          <span>${esc(s.name)}</span>${own || met ? `<small>${own ? '내 양' : '만난 양'}</small>` : ''}</button>`;
      }).join('')}</div>`, 'field-dex-sheet');
      modal.querySelectorAll('[data-dex]').forEach(button => { button.onclick = () => dexDetail(button.dataset.dex); });
    }

    function dexDetail(speciesId, notice = '') {
      const data = ensure();
      const sp = spec(speciesId);
      const met = data.friendMet[sp.id] || data.departed?.[sp.id]?.born;
      const sheep = mainSheep(data);
      const own = sheep.species === sp.id;
      const inFlock = data.sheep.find(s => s.id !== sheep.id && s.species === sp.id);
      const parted = data.departed?.[sp.id];
      const canRecall = !own && !inFlock && Boolean(parted);   // 떠나보낸 양만(손님으로 만난 양까지 공짜로 데려오면 기름 경제가 무너짐)
      const today = date();
      const recalledToday = data.recalledOn === today;
      const condition = sp.attract === 'cond:harp8' ? '하프를 놓고 친구 양 8번 맞이하기' : sp.cond;
      const label = own ? '내 양' : met ? '만난 양' : '';
      const body = `<div class="field-visitor-card ${sp.rarity}">${portraitHTML(sp.id,
        { level: own ? sheep.level : (parted?.level || 5), wear: own ? sheep.wear : null }, 'big')}
        <h3>${esc(sp.name)} ${rarityBadge(sp)} ${label ? `<small class="field-main-tag">${label}</small>` : ''}</h3>
        <p class="field-visitor-desc">${esc(trait(sp.id))}</p>
        <p class="field-sheep-stage"><i class="field-wool-dot" style="--wool:${woolType(sp.wool).color}"></i> ${esc(woolType(sp.wool).name)}</p>
        ${sp.verse ? verseHTML(sp.verse) : ''}
        ${met ? `<p class="field-sheet-meta">처음 만난 날 ${esc(Core.dateLabel(met))}</p>` : ''}
        ${condition && (sp.attract !== 'cond:codes4' || (window.CODES || []).length) ?
          `<p class="field-sheet-meta">${esc(condition)}</p>` : ''}
        ${notice ? `<p class="field-sheet-meta field-recall-notice" data-recall-notice role="status">${esc(notice)}</p>` : ''}
        ${canRecall ? `<button type="button" class="btn field-dex-recall" data-dex-recall="${esc(sp.id)}" ${recalledToday ? 'disabled' : ''}>${recalledToday ? '오늘 다시 데려왔어 (하루 1번)' : '다시 데려오기 · 무료'}</button>` : ''}</div>`;
      const modal = sheet(sp.name, body + '<button type="button" class="btn ghost field-dex-back">둘러보기로</button>', 'field-dex-detail');
      modal.querySelector('.field-dex-back').onclick = dexSheet;
      modal.querySelector('[data-dex-recall]')?.addEventListener('click', () => {
        const d = ensure();
        if (d.recalledOn === today) return;
        const p = d.departed?.[sp.id];
        const restored = p
          ? { ...newSheep(d, p.name || sp.name, sp.id), level: p.level || 5, born: p.born || today, care: p.care || 0 }
          : { ...newSheep(d, sp.name, sp.id), level: 5 };
        d.sheep.push(restored);
        if (d.departed) delete d.departed[sp.id];
        d.recalledOn = today;
        Core.save();
        Sound.sfx('select');
        const msg = `${josa(restored.name, '이가')} 우리로 돌아왔어!`;
        servedTonight = msg;
        render(msg);
        showHoldFeedback(msg);
        Player.toast?.(msg);
        dexDetail(sp.id, `${msg} 양 목록에서 곁에 둘 수 있어.`);
      });
    }

    function shop(section = 'objects') {
      const oil = Core.data.oil || 0;
      const clothes = section === 'wear' || section in WEAR_LABELS;
      const slot = section in WEAR_LABELS ? section : 'head';
      const hint = id => {
        const want = lureOf(id);
        return want.length ? `<small class="field-lure">이걸 놓으면 ${esc(want.map(s => s.name).join('·'))}${Core.josa(want.at(-1).name, '이가').slice(-1)} 놀러 올지도 몰라.</small>` : '';
      };
      const objectsList = `<div class="field-shop-list">${market.map(([id, kind, cost]) => `<div class="field-shop-row">
        ${icon(id)}<div><b>${esc(id)}</b>${kind === 'sky' ? '<small>하늘 칸</small>' : ''}${hint(id)}
        ${available(id) ? `<button type="button" class="link" data-place="${esc(id)}">${available(id)}개 보유 · 놓기 ›</button>` : ''}</div>
        <button type="button" class="btn small" data-buy="${esc(id)}" ${oil < cost ? 'disabled' : ''}>${cost}방울</button></div>`).join('')}</div>`;
      const clothesList = () => `${wearTabs(slot)}<div class="field-shop-grid field-gear-grid">${wardrobe
        .filter(item => item.slot === slot && item.price != null).map(item => wearButton(item, {
          attr: 'data-buy', detail: item.price + '방울', disabled: oil < item.price
        })).join('')}</div>`;
      const modal = sheet('들판 장터', `<p class="field-sheet-meta">기름 <strong>${oil}방울</strong></p>
        <div class="field-shop-tabs"><button type="button" data-section="objects" aria-pressed="${!clothes}">들판 물건</button>
        <button type="button" data-section="wear" aria-pressed="${clothes}">꾸미기</button></div>
        ${clothes ? clothesList() : objectsList}`, 'field-shop-sheet');
      modal.querySelectorAll('[data-section], [data-wear-slot]').forEach(button => {
        button.onclick = () => shop(button.dataset.section || button.dataset.wearSlot);
      });
      modal.querySelectorAll('[data-buy]').forEach(button => {
        button.onclick = () => {
          const id = button.dataset.buy;
          const item = wearByName.get(id);
          const cost = item ? item.price : market.find(entry => entry[0] === id)?.[2];
          if (cost == null || !spendOil(cost)) return;
          giveItem(id);
          Sound.sfx('pop');
          if (item) {
            render();
            shop(slot);
            const next = root.querySelector('.field-shop-sheet .field-sheet-meta');
            next.insertAdjacentHTML('afterend', `<p class="field-shop-notice" role="status">${esc(josa(item.label, '을를'))} 샀어. 옷장에서 입혀 봐!</p>`);
            return;
          }
          modal.close();
          startPlacing(id, `${josa(id, '을를')} 샀어.`);
        };
      });
      modal.querySelectorAll('[data-place]').forEach(button => {
        button.onclick = () => { modal.close(); startPlacing(button.dataset.place); };
      });
      upgradeWearIcons(modal);
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

    function dress(sheep = mainSheep()) {
      if (!sheep) return;
      let saved = normalizeWear(sheep.wear);
      const draft = { ...saved };
      let slot = 'head', studio = null, spinPending = false;
      const modal = sheet('👗 옷장', `<div class="field-wardrobe-studio"><div class="field-wardrobe-name">
        <strong>${esc(sheep.name)}</strong><small>${esc(spec(sheep.species).name)}</small></div>
        <div class="field-wardrobe-preview" aria-label="${esc(sheep.name)} 착용 미리보기"></div>
        <span class="field-wardrobe-hint" hidden>← 밀어서 돌려 보기 →</span></div>
        <div class="field-wardrobe-options"></div>
        <div class="field-wardrobe-items field-shop-grid field-gear-grid"></div>
        <p class="field-wardrobe-status" role="status"></p>
        <div class="field-wardrobe-actions">
          <button class="btn ghost" type="button" data-outfit-action="remove">벗기</button>
          <button class="btn ghost" type="button" data-outfit-action="buy">사기</button>
          <button class="btn" type="button" data-outfit-action="save">저장</button>
        </div>
        <button class="btn ghost field-wardrobe-card" type="button">꾸민 모습 카드 저장·공유</button>`,
        'field-wardrobe-sheet', () => studio?.destroy());
      const host = modal.querySelector('.field-wardrobe-preview');
      const tabs = modal.querySelector('.field-wardrobe-options');
      const grid = modal.querySelector('.field-wardrobe-items');
      const buy = modal.querySelector('[data-outfit-action="buy"]');
      const remove = modal.querySelector('[data-outfit-action="remove"]');
      const save = modal.querySelector('[data-outfit-action="save"]');
      const share = modal.querySelector('.field-wardrobe-card');
      const status = modal.querySelector('.field-wardrobe-status');
      const canWear = name => !name || saved[wearByName.get(name).slot] === name || available(name) > 0;
      const outfit = () => ({ ...sheep, wear: draft });
      const dirty = () => Object.keys(draft).some(key => draft[key] !== saved[key]);
      function updateFigure() {
        if (studio) studio.update(outfit());
        else host.innerHTML = `<img alt="" class="field-wardrobe-fallback" src="${svgURL(portraitSVG(sheep.species, outfit()))}">`;
      }
      function craftOptions() {
        const data = field(), bag = data.explore?.discoverBag;
        return Array.from(craftRecipes, ([name, materials]) => {
          const item = wearByName.get(name);
          const ready = materials.every(({ name }) => hasCraftMaterial(bag, name));
          const owned = !!data.crafted?.[name];
          return `<article class="field-craft-recipe">
            <span class="field-craft-icon" aria-hidden="true">${esc(item.symbol)}</span>
            <div><strong>${esc(item.label)}</strong>${materials.map(({ name, icon, place }) =>
              `<small>${esc(icon)} ${esc(name)} · ${hasCraftMaterial(bag, name) ? '가방에 있어' : esc(place)}</small>`).join('')}</div>
            <button class="btn ghost" type="button" data-craft-item="${esc(name)}" aria-label="${esc(name)} ${owned ? '다시 만들기' : '만들기'}"
              ${ready ? '' : 'disabled'}>${owned ? '다시 만들기' : '만들기'}</button>
          </article>`;
        }).join('');
      }
      function makeOutfit(name) {
        const data = field(), bag = data.explore?.discoverBag, materials = craftRecipes.get(name);
        const wearer = data.sheep.find(entry => entry.id === sheep.id);
        const item = wearByName.get(name);
        if (!wearer || !materials?.every(({ name }) => hasCraftMaterial(bag, name))) return;
        for (const { name } of materials) if (--bag[name].count === 0) delete bag[name];
        (data.crafted ||= {})[name] = date();
        data.items[name] = 1;
        const equipped = wearer.wear[item.slot] === name || available(name) > 0;
        if (equipped) {
          wearer.wear = { ...normalizeWear(wearer.wear), [item.slot]: name };
          saved = normalizeWear(wearer.wear);
          draft[item.slot] = name;
        }
        Core.save();
        Sound.sfx('gift');
        render();
        if (equipped) {
          updateFigure();
          if (studio) studio.spin();
          else {
            spinPending = true;
            host.querySelector('img')?.classList.add('field-craft-spin');
          }
        }
        refresh(`${josa(item.label, '을를')} 만들었어. ${equipped ? '아래에서 카드로 저장할 수 있어!' : '다른 양이 입고 있어.'}`);
        share.focus({ preventScroll: true });
      }
      function refresh(message = '') {
        const making = slot === 'craft';
        const item = wearByName.get(draft[slot]);
        const oil = Core.data.oil || 0;
        const missing = Object.values(draft).filter(name => !canWear(name));
        const scroll = grid.scrollTop;
        tabs.innerHTML = wearTabs(slot, true);
        grid.classList.toggle('field-craft-list', making);
        grid.innerHTML = making ? craftOptions() : wardrobe.filter(entry => entry.slot === slot).map(entry => wearButton(entry, {
          attr: 'data-wear', pressed: item === entry,
          detail: canWear(entry.name) ? '보유' : craftRecipes.has(entry.name) ? '만들기에서 얻기' : entry.price == null ? '탐험에서 얻기' : entry.price + '방울'
        })).join('');
        grid.scrollTop = scroll;
        buy.hidden = !item || canWear(item.name) || item.price == null;
        remove.hidden = making;
        save.hidden = making && !dirty();
        modal.classList.toggle('field-craft-only', save.hidden);
        buy.disabled = buy.hidden || oil < item.price;
        buy.textContent = buy.hidden ? '사기' : `사기 · ${item.price}방울`;
        remove.disabled = !item;
        save.disabled = !dirty() || missing.length > 0;
        share.disabled = dirty();
        status.textContent = message || (missing.length ? '미리 입어 보는 중 · 가진 옷만 저장할 수 있어.' :
          making ? '탐험에서 ‘해 보기’로 모은 물건을 써.' : `기름 ${oil}방울`);
        if (!making) upgradeWearIcons(modal);
      }
      tabs.onclick = event => {
        const button = event.target.closest('[data-wear-slot]');
        if (!button) return;
        slot = button.dataset.wearSlot;
        grid.scrollTop = 0;
        refresh();
        tabs.querySelector('[aria-pressed="true"]')?.focus({ preventScroll: true });
      };
      grid.onclick = event => {
        const craft = event.target.closest('[data-craft-item]');
        if (craft) { makeOutfit(craft.dataset.craftItem); return; }
        const button = event.target.closest('[data-wear]');
        if (!button) return;
        draft[slot] = button.dataset.wear;
        updateFigure();
        refresh();
        grid.querySelector('[aria-pressed="true"]')?.focus({ preventScroll: true });
      };
      buy.onclick = () => {
        const item = wearByName.get(draft[slot]);
        if (!item || canWear(item.name) || item.price == null || !spendOil(item.price)) return;
        giveItem(item.name);
        Sound.sfx('pop');
        render();
        refresh(`${josa(item.label, '을를')} 샀어. 저장하면 들판에도 보여!`);
      };
      remove.onclick = () => { draft[slot] = null; updateFigure(); refresh(); };
      save.onclick = () => {
        if (Object.values(draft).some(name => !canWear(name))) return;
        saved = normalizeWear(draft);
        sheep.wear = saved;
        Core.save();
        Sound.sfx('pop');
        render('옷을 갈아입었어!');
        badges();
        refresh('들판에도 이 모습으로 나와!');
      };
      share.onclick = () => cardSheet('꾸민 모습 카드', () => Card.drawWardrobe(sheep, wornNames(saved)
        .map(name => wearByName.get(name).label)), 'WARDROBE', `${sheep.name}의 꾸민 모습`);
      updateFigure();
      refresh();
      if (can3D() && typeof Field3D.turntable === 'function') {
        Field3D.turntable(host, outfit()).then(result => {
          if (!modal.open || !modal.isConnected) { result.destroy(); return; }
          studio = result;
          host.querySelector('.field-wardrobe-fallback')?.remove();
          modal.querySelector('.field-wardrobe-hint').hidden = false;
          updateFigure();
          if (spinPending) studio.spin();
        }).catch(() => {});
      }
    }

    function search(sheep) {
      if (!sheep?.lost || busy || moving) return;
      const modal = sheet('잃은 양 찾기', '<div class="gamebox"></div>');
      Games.어둠찾기(modal.querySelector('.gamebox'), {
        done() {
          if (!modal.open || !sheep.lost) return;
          const reunion = sheep.lostFromVisit;
          sheep.lost = false;
          delete sheep.lostFromVisit;
          field().found = (field().found || 0) + 1;
          field().foundTotal = field().found;
          const oil = 2 + bonus('lostOil');
          addOil(oil, 'field-found');
          Core.save();
          voice('field-5');
          modal.close();
          render(`${josa(sheep.name, '이가')} 돌아왔어! 기름 +${oil}`);
          react(sheep.id, 'join');
          const text = (window.BIBLE || {})['눅 15:4'] || verse;
          sheet(reunion ? '다시 만났어!' : `찾았어! · 기름 +${oil}`, `<p class="field-found-line">${reunion ? `등불 기름 +${oil}` : foundLine}</p>
            <blockquote class="field-verse">${esc(Array.isArray(text) ? text[0] : text)}<cite>누가복음 15:4</cite></blockquote>`);
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
        <ul class="field-patrol-meta"><li>${rewarded ? '오늘 보상은 받았어 · 지금은 연습' : '오늘 첫 판 · 별 하나마다 흰 털 하나와 색 털 하나'}</li><li>최고 기록 ${data.patrolBest}마리</li></ul>
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
      const timeLeft = Math.max(0, Math.round(Number(result.timeLeft) || 0));
      const ratio = penned / total;
      const stars = penned === total || (ratio >= 7 / 8 && timeLeft >= 10) ? 3 : ratio >= 7 / 8 ? 2 : ratio >= 5 / 8 ? 1 : 0;
      const reward = {};
      if (first) {
        addWool(reward, 'white', stars);
        for (let i = 0; i < stars; i++) addWool(reward, pick(COLORED_WOOL), 1);
        for (const [id, count] of Object.entries(reward)) addWool(data.woolBag, id, count);
        data.patrolDay = today;
      }
      const best = penned > data.patrolBest;
      if (best) data.patrolBest = penned;
      if (stars === 3) data.patrolPerfect = (data.patrolPerfect || 0) + 1;
      Core.save();
      const record = { penned, total, scared, timeLeft, stars, leader: leader?.name || '', leaderSpecies: leader?.species || 'cotton', best, date: today };
      const rating = '★'.repeat(stars);
      const caption = `오늘 밤 순찰 ${rating ? rating + ' ' : ''}${penned}/${total}! 이길 수 있어?`;
      render(first ? (stars ? `순찰 끝! 털 +${stars * 2}뭉치` : '순찰 끝! 별을 얻으면 털을 받아.') : '연습 순찰 끝!');
      const modal = sheet('순찰 결과', `<div class="field-patrol-result">
          <div class="field-patrol-rating" role="img" aria-label="별 ${stars}/3"><span>${rating}</span><span class="empty-stars">${'☆'.repeat(3 - stars)}</span></div>
          <p class="field-patrol-score"><b>${penned}</b><span>/${total}</span></p><p>우리 안에 들어온 양</p>
          <ul>${timeLeft ? `<li>⏱ ${timeLeft}초 남음</li>` : ''}<li>🐺 쫓은 늑대 ${scared}</li>
          <li>${first ? (stars ? Object.entries(reward).map(([id, count]) => woolUnit(id, count)).join(' ') : '별을 얻으면 털을 받아.') : '오늘 보상은 이미 받았어 · 연습 순찰'}</li>
          ${best ? '<li class="best">🏆 최고 기록 갱신!</li>' : `<li>최고 기록 ${data.patrolBest}마리</li>`}</ul></div>
        <button type="button" class="btn field-patrol-card">순찰 도전장 저장·공유</button>
        <button type="button" class="btn ghost field-patrol-again">한 번 더</button>`, 'field-patrol-sheet');
      modal.querySelector('.field-patrol-card').onclick = () => cardSheet('순찰 도전장', () => Card.drawPatrol(record), 'PATROL', '밤 순찰 기록 카드', caption);
      modal.querySelector('.field-patrol-again').onclick = () => { modal.close(); patrolSheet(); };
      badges();
    }

    const cardSheet = (title, draw, fileId, alt, caption) => fieldCard(root, title, draw, fileId, alt, caption);

    // 미리보기(?preview=all) 전용 시험 도구
    function testTools() {
      if (!Core.PREVIEW_ALL) return '';
      const tools = [['oil', '기름 +20'], ['day', '하루 넘기기'], ['wool-add', '털 바구니 +10씩'], ['gifts-all', '선물 모두 열기'],
        ['visit-2', '방문 기록 2일 전으로'], ['visit-4', '방문 기록 4일 전으로'],
        ['lost', '잃은 양 부르기'], ['visit', '방문객 부르기'], ['rare', '희귀 부르기'],
        ['legend', '전설 조건 모두 채우기'], ['patrol', '순찰 보상 초기화'],
        ['reroll', '양 다시 뽑기'], ['sheep-lab', '🧪 양 체험실']];
      return `<div class="field-test-tools"><small>🧪 미리보기 전용 시험 도구${mode === '2d' ? ' · 2D 화면' : mode === '3d' ? ' · 3D 화면' : ''}</small>
        <div class="field-test-row">${tools.map(([k, label]) => `<button type="button" class="btn ghost small" data-t="${k}">${label}</button>`).join('')}</div></div>`;
    }
    function bindTestTools(data) {
      const box = manage.querySelector('.field-test-tools');
      if (!box) return;
      const on = (key, fn) => { const b = box.querySelector(`[data-t=${key}]`); if (b) b.onclick = fn; };
      on('oil', () => { addOil(20, 'test'); Core.save(); render('🧪 기름 +20'); });
      on('day', () => {
        const next = new URL(location.href);
        next.searchParams.set('date', new Date(Date.parse(date()) + DAY_MS).toISOString().slice(0, 10));
        next.searchParams.set('hour', Core.nowKST().hour);
        next.searchParams.set('field', '1');
        location.assign(next.href);
      });
      on('wool-add', () => {
        WOOL_IDS.forEach(id => addWool(data.woolBag, id, 10));
        Core.save();
        render('🧪 모든 털 +10뭉치');
      });
      on('gifts-all', () => { allGiftsOpen = true; render('🧪 선물을 모두 열었어.'); });
      [2, 4].forEach(days => on('visit-' + days, () => {
        data.lastVisit = new Date(Date.parse(date()) - days * DAY_MS).toISOString().slice(0, 10);
        Core.save();
        render(`🧪 방문 기록을 ${days}일 전으로 돌렸어. 홈에 갔다가 들판으로 와 봐.`);
      }));
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
      on('patrol', () => { data.patrolDay = ''; Core.save(); render('🧪 오늘 순찰 보상을 다시 받을 수 있어요'); });
      on('reroll', async () => {
        await previewLamb({ redraw: true });
        trial = null;
        render();
      });
      on('sheep-lab', sheepLab);
    }

    function sheepLab() {
      if (!Core.PREVIEW_ALL || !Core.IS_TEST || !window.SHEEP_DEX) return;
      const data = ensure();
      const sheep = mainSheep(data);
      const list = DEX();
      const modal = sheet('🧪 양 체험실', `<div class="field-lab-detail"></div>
        <div class="row field-lab-nav"><button type="button" class="btn ghost" data-lab-step="-1">◀ 이전</button>
        <button type="button" class="btn ghost" data-lab-step="1">다음 ▶</button></div>
        <div class="field-dex-grid field-lab-grid">${list.map(sp =>
          `<button type="button" class="field-dex-cell got ${sp.rarity}" data-lab-spec="${sp.id}" aria-pressed="false">
            ${portraitHTML(sp.id, { level: 1 })}<span>${esc(sp.name)}</span>${rarityBadge(sp)}</button>`).join('')}</div>`,
      'field-lab-sheet', () => focus(sheep.id));
      const detail = modal.querySelector('.field-lab-detail');
      const buttons = [...modal.querySelectorAll('[data-lab-spec]')];
      let index = Math.max(0, list.findIndex(sp => sp.id === sheep.species));
      function select(next, change = true) {
        index = (next + list.length) % list.length;
        const sp = list[index];
        if (change) {
          sheep.species = sp.id;
          data.dex[sp.id] ||= date();
          trial = { shorn: false, pets: 0 };
          Core.save();
          render();
        }
        const available = dexList();
        const share = 100 * DRAW_ODDS[sp.rarity];
        const odds = available.includes(sp) ? (share / available.filter(s => s.rarity === sp.rarity).length).toFixed(2) + '%' : '0% · 주일 암호가 있는 판에서만';
        const reactions = [['쓰다듬기', 'pet'], ['간식', 'treat'], ['털 깎기', 'shear'], ['탭', 'idle']];
        detail.innerHTML = `<h3>${esc(sp.name)} ${rarityBadge(sp)}</h3><p>${esc(trait(sp.id))}</p>
          <p><i class="field-wool-dot" style="--wool:${woolType(sp.wool).color}"></i> ${esc(woolType(sp.wool).name)} · 뽑기 ${odds}</p>
          <ul>${reactions.map(([label, action]) => `<li><b>${label}</b> ${esc(REACT[sp.id][action].join(' · '))}</li>`).join('')}</ul>
          <div class="row"><button type="button" class="btn small field-lab-play">들판에서 체험하기</button>
          <button type="button" class="btn ghost field-lab-replay">뽑기 연출 다시 보기</button></div>`;
        buttons.forEach((button, i) => button.setAttribute('aria-pressed', String(i === index)));
        detail.querySelector('.field-lab-play').onclick = () => {
          if (!trial) { trial = { shorn: false, pets: 0 }; render(); }
          modal.close();
          stageEl.scrollIntoView({ block: 'nearest' });
        };
        detail.querySelector('.field-lab-replay').onclick = async () => {
          modal.close();
          await previewLamb({ previewSpecies: sp.id });
        };
        if (change) modal.scrollTop = 0;
      }
      buttons.forEach((button, i) => button.onclick = () => select(i));
      modal.querySelectorAll('[data-lab-step]').forEach(button => button.onclick = () => select(index + Number(button.dataset.labStep)));
      select(index, false);
    }

    render();
    if (openWardrobe) dress();
    else if (flock) flockSheet();
    else if (typeof gift === 'string' || gift && giftReady()) giftSheet(gift);
    if (mode === 'loading') start3D();
    else { greetFlock(); celebrateMainGrowth(); }
    if (!Core.TEST_DATE) {
      const watchWoolDay = () => {
        const untilMidnight = DAY_MS - (Date.now() + 9 * 3600000) % DAY_MS;
        woolDayTimer = setTimeout(() => {
          servedTonight = '';
          if (!busy) { render(); celebrateMainGrowth(); }
          watchWoolDay();
        }, untilMidnight + 100);
      };
      watchWoolDay();
    }
  }

  function mapMarkup(data, moving, miss, trial) {
    const slotsHTML = slots.map(([x, y], i) => {
      const id = data.slots[i];
      const allowed = (!moving || (!id && catalog[moving.item] === (i < 8 ? 'ground' : 'sky')));
      return `<button type="button" class="field-slot ${id ? 'occupied' : ''} ${moving && allowed ? 'destination' : ''}" style="${position(x, y)}"
        aria-label="${id ? esc(id) : (i < 8 ? '들판 칸 ' + (i + 1) : '하늘 칸 ' + (i - 7))} 선택" data-slot="${i}" ${allowed ? '' : 'disabled'}>
        ${id ? sprite(objects[id] || '') : '<span aria-hidden="true">+</span>'}</button>`;
    }).join('');
    const flockHTML = visibleSheep(data).slice(0, MAX_SHEEP).map((sheep, i) => {
      const [x, y] = pasture[i];
      if (sheep.lost && sheep.id === data.mainId && !trial) return '';
      return `<button type="button" class="field-sheep" style="${position(x, y)};--delay:${-i * 1.47}s;--drift:${i % 2 ? -12 : 12}px;z-index:${3 + Math.round(y / 40)}" data-sheep-id="${esc(sheep.id)}" ${sheep.id === data.mainId ? 'data-main' : ''} data-stage="${stage(sheep)}"
        aria-label="${esc(sheep.name)} · ${woolType(woolOf(sheep)).name}" ${moving ? 'disabled' : ''}>${sprite(sheepArt(sheep, { shorn: trial && sheep.id === data.mainId ? trial.shorn : !woolLength(sheep) }), '-40 -50 80 58')}${miss?.has(sheep.id) ? '<span class="field-miss" aria-hidden="true">💭</span>' : ''}</button>`;
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

  function icon(id) {
    return sprite(objects[id]);
  }

  function wearTabs(slot, craft = false) {
    const labels = craft ? { ...WEAR_LABELS, craft: '🧵 만들기' } : WEAR_LABELS;
    return `<div class="field-wear-tabs" role="group" aria-label="꾸미기 종류">${Object.entries(labels).map(([key, label]) =>
      `<button type="button" data-wear-slot="${key}" aria-pressed="${key === slot}">${label}</button>`).join('')}</div>`;
  }

  function wearButton(item, { attr, detail, pressed, disabled }) {
    return `<button type="button" ${attr}="${esc(item.name)}" ${pressed == null ? '' : `aria-pressed="${pressed}"`} ${disabled ? 'disabled' : ''}>
      <span class="field-gear-icon" style="--gear-color:${esc(item.color)}" aria-hidden="true">
        <span>${esc(item.symbol)}</span><img alt="" data-gear-icon="${esc(item.name)}" hidden>
      </span><span>${esc(item.label)}</span><b>${esc(detail)}</b></button>`;
  }

  function upgradeWearIcons(root) {
    if (!can3D() || !window.Field3D?.wearIcon) return;
    const queue = Array.from(root.querySelectorAll('[data-gear-icon]'));
    async function next() {
      if (!root.isConnected || !root.open) return;
      const img = queue.shift();
      if (!img) return;
      if (img.isConnected) {
        try {
          img.src = await Field3D.wearIcon(img.dataset.gearIcon);
          if (img.src) { img.hidden = false; img.previousElementSibling.hidden = true; }
        } catch { /* 이모지 아이콘을 유지 */ }
      }
      if (queue.length) requestAnimationFrame(next);
    }
    requestAnimationFrame(next);
  }

  function nameForm(label, fallback) {
    return `<form class="field-name"><label>양 이름<input name="sheep-name" placeholder="${esc(fallback)}" maxlength="8" autocomplete="off" enterkeyhint="done"></label>
      <button class="btn" type="submit">${esc(label)}</button></form>`;
  }

  function firstLamb(box, { redraw = false, previewSpecies = '' } = {}) {
    Art.setChapter(4);
    box.innerHTML = `<section class="field-story field-first">
      <div class="field-story-art">${Art.render('들판').replace('0 0 360 540', '0 58 360 482').replace('xMidYMid slice', 'xMidYMax slice')}</div>
      <div class="field-draw-visual" aria-hidden="true"></div>
      <div class="field-story-content">
        <div class="field-story-talk"><strong>할아버지</strong><p></p><button type="button" class="btn ghost">계속</button></div>
      </div></section>`;
    const scene = box.querySelector('.field-first');
    const content = scene.querySelector('.field-story-content');
    const visual = scene.querySelector('.field-draw-visual');
    const viewport = window.visualViewport;
    const fit = () => {
      box.style.setProperty('--lamb-viewport', `${viewport?.height || window.innerHeight}px`);
      box.style.setProperty('--lamb-top', `${viewport?.offsetTop || 0}px`);
    };
    return new Promise(resolve => {
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
      function dialogue(line, cue, next) {
        content.innerHTML = `<div class="field-story-talk"><strong>할아버지</strong><p>${line}</p><button type="button" class="btn ghost">계속</button></div>`;
        content.querySelector('button').onclick = next;
        voice(cue);
      }
      function basket() {
        visual.innerHTML = '<span class="field-basket-icon">🧺</span>';
        content.innerHTML = '<div class="field-story-talk"><strong>할아버지</strong><p>이 바구니를 열어 보렴.</p><button type="button" class="btn field-open-basket">바구니 열기</button></div>';
        content.querySelector('button').onclick = reveal;
      }
      async function reveal(event) {
        event.currentTarget.disabled = true;
        await prepareDex();
        if (!active) return;
        const data = ensure();
        if (has() && !redraw && !previewSpecies) return finish();
        const drawn = previewSpecies || (redraw ? rollFirstSheep() : (data.firstDraw ||= rollFirstSheep()));
        if (!previewSpecies) {
          data.firstDraw = drawn;
          Core.save();
        }
        const sp = spec(drawn);
        const legend = sp.rarity === 'legend';
        const title = legend ? '✦ 전설의 양!' : sp.rarity === 'rare' ? '✧ 희귀 양!' : '🐑 네가 만날 양';
        scene.dataset.rarity = sp.rarity;
        visual.innerHTML = `<div class="field-draw-light"></div><div class="field-draw-portrait">${sprite(sheepArt({ species: sp.id, level: 1 }), '-42 -58 84 75')}</div>`;
        content.innerHTML = `<div class="field-story-talk field-draw-reveal" aria-live="polite">
          <strong>${title}</strong><h2>${esc(sp.name)}</h2><p>${esc(trait(sp.id))}</p>
          ${legend ? drawVerse(sp) : ''}
          <button type="button" class="btn field-draw-next" disabled>양이 오는 중…</button></div>`;
        Sound.sfx(sp.rarity === 'common' ? 'fieldGreet' : 'star');
        await Promise.race([opening, wait(3500)]);
        allow3D = false;
        if (!active) return;
        if (view) {
          try {
            const lamb = { id: 'welcome-lamb', name: sp.name, species: sp.id, level: 1, wool: 1 };
            view.update({ ...initial, sheep: [lamb] });
            const arrival = view.welcome(lamb.id);
            const follow = () => { try { view?.focus(lamb.id); } catch { /* 걷기 연출은 계속 */ } };
            follow();
            followTimer = setInterval(follow, 600);
            await Promise.race([arrival, wait(12000)]);
            if (active && legend) view?.react(lamb.id, 'legend');
          } catch { drop3D(); }
          finally { clearInterval(followTimer); }
        }
        if (!active) return;
        if (legend) {
          Sound.sfx('legendArrival');
          scene.classList.add('field-legend-arrived');
        }
        const button = content.querySelector('.field-draw-next');
        button.disabled = false;
        button.textContent = previewSpecies ? '들판으로' : '계속';
        button.onclick = () => previewSpecies ? finish() :
          dialogue('성탄까지 네가 맡아 주겠니? 이름을 지어 주렴.', 'lamb-2', () => naming(sp));
      }
      function naming(sp) {
        content.innerHTML = nameForm('이 이름으로 맡을게', sp.name);
        content.querySelector('form').onsubmit = event => {
          event.preventDefault();
          if (has() && !redraw) return finish();
          const data = ensure();
          const name = nameSheep(event.currentTarget.elements['sheep-name'].value, sp.name);
          const sheep = redraw && has() ? mainSheep(data) : newSheep(data, name, sp.id);
          sheep.name = name;
          sheep.species = sp.id;
          if (!has()) { data.since = date(); data.sheep.push(sheep); }
          data.dex[sp.id] ||= date();
          syncMainGrowth(data, date());
          Core.save();
          Sound.sfx('star');
          content.innerHTML = `<div class="field-arrival" role="status"><p>🐑 ${esc(name)} (${esc(sp.name)}), 네 들판에 왔어!</p>
            <button type="button" class="btn field-first-card">자랑 카드 저장·공유</button>
            <button type="button" class="btn ghost field-first-done">계속</button></div>`;
          content.querySelector('.field-first-card').onclick = () => ownCard(box, sheep);
          content.querySelector('.field-first-done').onclick = finish;
        };
      }
      dialogue('오늘 새벽에 태어난 녀석이다.', 'lamb-1', basket);
    });
  }

  function ownCard(root, sheep) {
    return fieldCard(root, '나의 양', () => Card.drawDiscover(sheep, { own: true, trait: trait(sheep.species) }),
      'SHEEP:' + sheep.species, sheep.name + ' 자랑 카드');
  }

  async function previewLamb(options) {
    if (!Core.IS_TEST) return;
    const box = document.createElement('div');
    box.className = 'field-test-stage';
    document.body.append(box);
    try { await firstLamb(box, options); }
    finally { box.remove(); }
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
    const blanket = data.woolGifts.blanket;
    const colors = woolColors(blanket?.wool);
    const talk = `<p>${line}</p>${blanket ? '<p class="field-blanket-line">(해설) 구유에는 네가 짠 이불이 깔려 있었다.</p>' : ''}`;
    if (!window.__fast) {
      let played = false;
      if (window.SHEEP_DEX && can3D() && await load3D()) {
        box.innerHTML = `<section class="field-story field-flock is-3d"><div class="field-story-3d"></div>
          <div class="field-story-content"><div class="field-story-talk">${talk}
          <button type="button" class="btn ghost" disabled>계속</button></div></div></section>`;
        let view = null;
        try {
          view = await Field3D.mount(box.querySelector('.field-story-3d'), stateOf(data), {});
          Sound.sfx('sheep');
          await view.procession(flock.map(s => ({ id: s.id, species: s.species, name: s.name, level: s.level, wear: s.wear || null,
            wool: woolLength(s) })), blanket ? { blanket: true, colors } : undefined);
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
          ${blanket ? `<div class="field-flock-blanket" role="img" aria-label="네가 짠 구유 이불">${giftArt('blanket', colors)}</div>` : ''}
          <div class="field-procession">${flock.map((sheep, i) => `<div class="field-procession-sheep" style="--col:${12.5 + (i % 4) * 25}%;--row:${29 + Math.floor(i / 4) * 28}%;--arrival:${i * .25}s">
            ${sprite(sheepArt(sheep), '-36 -43 72 53')}<span>${esc(sheep.name)}</span></div>`).join('')}</div>
          <div class="field-story-content"><div class="field-story-talk">${talk}
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
    return { sheep: data.sheep.length, dex: Object.keys(data.dex).length, dexTotal: dexTotal(),
      top: mainSheep(data) || null, friends: data.friendVisits, oilEarned: Core.data.oilEarned || 0 };
  }

  const drawCard = () => Card.drawField();

  window.Field = {
    ensure, has, panelHTML, bindPanel, page, receiveFirstLamb, flockScene, giveItem, drawCard, lostCheck, stats,
    showSheet: fieldSheet, showCard: fieldCard, wordMarkup: verseHTML,
    bonus, portrait, snapshot, summary, spec, dexList, visitCheck, awardChapterGuest, sheepArt, visitShared, prepareDex, prewarm, homeThumb,
    shearRemaining, shearTonight, giftCardData, giftReady, lostSheep, mainCare, adventureHeart, exploreReaction, heartMarks, rollFirstSheep, GAME_LINE, FIRST_STORY_HINT
  };
})();
