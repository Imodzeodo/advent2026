/* 날짜별 성탄길. 장소 데이터와 대사는 story/explore.js에 있다. */
(function () {
  const regions = ['예루살렘', '유대 산골', '나사렛·갈릴리', '베들레헴'];
  const icons = { person: '●', quest: '♥', verse: '▤', secret: '⚿', photo: '◎', find: '✦', exit: '➜', event: '★', follow: '◇',
    light: '♨', clear: '◆', guard: '✶', fragment: '✦', ability: '🐾', cache: '✧', door: '▣', look: '👀', touch: '✋', try: '🛠' };
  const mapPoints = [
    [165, 222], [110, 236], [181, 211], [192, 228], [172, 244], [138, 252], [98, 250],
    [266, 258], [180, 62], [199, 50], [216, 62], [238, 86], [164, 80], [198, 84],
    [182, 100], [210, 104], [150, 198], [118, 270], [146, 278], [98, 288], [126, 296],
    [176, 302], [192, 314], [216, 322], [234, 338], [180, 334], [198, 348]
  ];
  const events = [
    { title: '별똥별', clue: '짧게 빛나고 간 별똥별을 찾아봐.', result: '별빛이 땅에 잠깐 내려앉았어.', oil: 1 },
    { title: '길 잃은 비둘기', clue: '돌담 가까이에서 날갯짓이 들려.', result: '비둘기가 다시 하늘로 올라갔어.', wool: 1 },
    { title: '떠돌이 상인', clue: '골목 쪽에 작은 짐 보따리가 보여.', result: '여기서 만났으니 오늘은 조금 싸게 줄게.', merchant: true },
    { title: '아이들의 숨바꼭질', clue: '누가 소리 내어 웃다 숨었어.', result: '찾았다! 내일 또 숨을 거야.', oil: 1 }
  ];
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const date = () => Core.nowKST().date;
  const hash = str => [...str].reduce((value, letter) => (Math.imul(value, 31) + letter.charCodeAt(0)) >>> 0, 17);
  const epList = () => Core.mainEpisodes().filter(ep => window.EXPLORE[ep.id]);
  function isOpen(ep) {
    if (!ep || !Core.isOpen(ep)) return false;
    if (!Core.PREVIEW_ALL || !Core.TEST_DATE || !ep.date) return true;
    const now = Core.nowKST();
    const hour = ep.openHour ?? window.EXPLORE[ep.id]?.openHour;
    return ep.date < now.date || (ep.date === now.date && (hour == null || hour <= now.hour));
  }
  const openList = () => epList().filter(isOpen);
  const roomExitPos = [0, 4.86];
  function placeDoors(id, area) {
    const positions = {
      '1-1': [-7.2, 6.64], '1-5': [-16.6, -13.06], '1-6': [7.5, 6.44],
      '2-1': [1.9, -3.76], '2-2': [.4, -20.06], '2-3': [.4, -20.06],
      '2-5': [0, -19.06], '2-6': [4.7, -18.36],
    };
    const names = {
      roof: '사가랴의 집', temple: '성전 곁 방', sanctuary: '성전 곁 방',
      hillpath: id.startsWith('1-') ? '사가랴의 집' : '산골집',
      nazareth: id === '2-5' ? '요셉과 마리아의 새집' : '나사렛 집',
      workshop: '요셉의 작업장', well: id === '2-6' ? '요셉과 마리아의 집' : '우물가 집',
      elizabeth: '엘리사벳의 집', inn: '여관', stable: '마구간'
    };
    const defaults = {
      temple: [-16.5, -18.76], sanctuary: [-16.5, -18.76],
      nazareth: [-5.4, -6.06], well: [-5.4, -6.06], inn: [-5.4, -6.06],
      hillpath: [0, -7.25], elizabeth: [0, -6.57], stable: [.05, -5.75]
    };
    const indoor = area.discover?.items.filter(entry => entry.indoor) || [];
    const explicit = [...new Set(indoor.map(entry => entry.house).filter(Boolean))].slice(0, 2);
    const pos = positions[id] || (area.layout.variant !== 'dry' ? defaults[area.kit] : null);
    if (!pos && !indoor.length) return [];
    if (!explicit.length) explicit.push(names[area.kit] || '쉼터');
    return explicit.map((title, i) => ({
      id: 'house/' + i, title, style: /작업장|목공/.test(title) ? 'workshop' : area.kit,
      pos: i ? (area.adventure ? [13.4, 5.02] : [5.7, -6.28]) : pos || (area.adventure ? [-10, 13] : [-4, 2.1]),
      standAlone: !pos && i === 0
    }));
  }
  const REGION_LAYOUTS = [
    { title: '예루살렘 성전', bounds: [82, 75], sites: [
      ['temple', '성전 뜰', -28, -12], ['sanctuary', '성소 앞', 28, -12],
      ['outer-court', '이방인의 뜰', 0, 24, 11],
      ['south-steps', '남쪽 큰 계단과 정결례 웅덩이', 0, 42, 7, '남쪽 큰 계단'],
      ['sheep-gate', '양문과 베데스다 못', 5, -49, 11, '양문·베데스다'],
      ['wall-walk', '성벽 위 길', 43, -47, 10],
      ['lower-town', '아랫마을 골목', -18, 49, 9],
      ['siloam', '실로암 못', -10, 65, 7],
      ['olives', '감람산 비탈', 68, 10, 13, '감람산'],
      ['herod-palace', '헤롯의 궁 앞 광장', -61, 27, 13, '헤롯의 궁'],
    ], routes: [
      [[-28, -12], [-28, 0], [0, 0], [28, 0], [28, -12]],
      [[0, 0], [0, 42], [-10, 49], [-18, 49], [-18, 60], [-10, 65]],
      [[0, 0], [0, -39], [5, -49], [16, -49], [43, -47]],
      [[43, -47], [55, -43], [55, -5], [59, 8], [68, 10]],
      [[28, 0], [51, 0], [55, -5]],
      [[-28, 0], [-46, 8], [-61, 16], [-61, 27], [-43, 37], [-18, 49]],
    ] },
    { title: '유대 산골과 빈 들', bounds: [125, 65], sites: [
      ['roof', '사가랴의 집', -29, -27], ['hillpath', '산골 길', 28, -27],
      ['elizabeth', '엘리사벳 집과 포도밭', 12, 32],
      ['judean-terraces', '계단밭 비탈', -63, -26, 10],
      ['village-threshing', '마을 우물과 타작마당', -43, 19, 11, '우물과 타작마당'],
      ['valley-stream', '골짜기 시냇가', -20, 44, 11],
      ['wilderness-edge', '빈 들 가장자리', 62, 22, 14, '빈 들'],
      ['wilderness-vista', '광야 길 전망 자리', 102, 32, 15, '광야 길 전망'],
      ['desert', '광야 길', 96, -27],
    ], routes: [
      [[-63, -26], [-29, -27], [-29, 0], [28, 0], [28, -27]],
      [[-29, 0], [-43, 19], [-20, 44], [12, 32], [28, 0]],
      [[28, 0], [48, 8], [62, 22], [83, 33], [102, 32], [96, 0], [96, -27]],
      [[28, -27], [60, -21], [77, -13], [96, -27]],
    ] },
    { title: '나사렛·갈릴리', bounds: [111, 85], sites: [
      ['nazareth', '나사렛 골목', -51, 28], ['workshop', '요셉의 작업장', 0, 28],
      ['well', '마을 우물', 51, 28], ['galilee', '갈릴리 언덕', 0, -28],
      ['south-road', '남쪽으로 가는 길 어귀', -20, 72, 7, '예루살렘·유대 산골 ↓'],
      ['nazareth-cliff', '산 위 마을 가장자리 낭떠러지', -55, 68, 11, '나사렛 낭떠러지'],
      ['synagogue-yard', '회당 앞 마당', -53, -10, 9, '회당'],
      ['grain-yard', '타작마당과 곡식 창고', 15, 67, 10, '곡식 창고'],
      ['olive-cave', '올리브 짜는 틀 동굴', -84, -31, 9, '올리브 틀 동굴'],
      ['tabor-vista', '다볼산 보이는 언덕 전망', 90, 54, 13, '다볼산 전망'],
      ['lake-pass', '갈릴리 호수가 보이는 고개', 62, -54, 14, '호수 고개'],
    ], routes: [
      [[-51, 28], [-51, 0], [0, 0], [51, 0], [51, 28]],
      [[-51, 0], [-53, -10], [-62, -23], [-84, -31]],
      [[0, 28], [0, 0], [0, -28], [36, -24], [51, 0]],
      [[36, -24], [49, -41], [62, -54]],
      [[-51, 28], [-51, 50], [-55, 68], [-20, 72], [15, 67], [40, 54], [51, 28]],
      [[40, 54], [70, 54], [90, 54]],
    ] },
    { title: '베들레헴', bounds: [83, 73], sites: [
      ['gate', '베들레헴 성문', -25, -25], ['inn', '여관 골목', 25, -25],
      ['field', '들판과 양 우리', 25, 25], ['stable', '마구간', -25, 25],
      ['rachel-tomb', '라헬의 무덤 길가', -51, -42, 10, '라헬의 무덤'],
      ['david-well', '다윗의 우물', -25, -42, 7],
      ['boaz-field', '보아스의 밭', 52, 13, 12],
      ['eder-tower', '에델 망대 언덕', 53, 48, 12, '에델 망대'],
      ['shepherd-cave', '목자들의 동굴 우리', 5, 49, 9, '동굴 우리'],
      ['bethlehem-vista', '베들레헴 언덕 전망', -40, 49, 13, '언덕 전망'],
    ], routes: [
      [[-51, -42], [-25, -42], [-25, -25], [-25, 0], [25, 0], [25, -25]],
      [[-25, 0], [-25, 25], [-34, 36], [-40, 49]],
      [[25, 0], [25, 25], [15, 39], [5, 49], [-40, 49]],
      [[25, 25], [42, 24], [52, 13]],
      [[42, 24], [53, 37], [53, 48]],
    ] },
  ];

  const siteKey = id => id === '2-0' ? 'desert' : window.EXPLORE[id].kit;
  const regionForSite = key => REGION_LAYOUTS.findIndex(region => region.sites.some(([site]) => site === key));
  const regionCollections = [
    ['1-0', '예루살렘 성곽지기'], ['1-1', '유대 산골 길잡이'], ['2-1', '갈릴리 길잡이'], ['4-0', '베들레헴 들판지기']
  ];
  let regionCatalog;
  function regionCollection(index, log = progress()) {
    regionCatalog ||= (() => {
      const lists = REGION_LAYOUTS.map(() => new Set());
      for (const [episode, area] of Object.entries(window.EXPLORE)) {
        for (const entry of area.discover?.items || []) {
          lists[regionForSite(entry.site || siteKey(episode))]?.add(entry.id);
        }
      }
      return lists.map(list => [...list]);
    })();
    const ids = regionCatalog[index], [rep, badge] = regionCollections[index];
    const found = ids.filter(id => log.discoveries?.[id]).length;
    return { ids, rep, badge, title: regions[index], found, done: ids.length > 0 && found === ids.length };
  }
  const regionCell = 6;
  function makeRegion(id, log) {
    const currentKey = siteKey(id);
    const index = regionForSite(currentKey);
    if (index < 0) return null;
    const { title, bounds, sites: layout, routes } = REGION_LAYOUTS[index];
    const [, , ox, oz] = layout.find(([key]) => key === currentKey);
    const visibleEpisodes = openList();
    const sites = layout.map(([key, name, x, z, extension, label]) => {
      const primary = key === currentKey;
      const ep = primary ? Core.epById(id) : visibleEpisodes.findLast(ep => siteKey(ep.id) === key);
      const episode = ep?.id;
      const area = window.EXPLORE[episode];
      const offset = [x - ox, z - oz];
      const translate = ([px, pz]) => [px + offset[0], pz + offset[1]];
      const markerId = key => primary ? key : episode + ':' + key;
      const houses = area ? placeDoors(episode, area).map(house => ({
        ...house, id: markerId(house.id), pos: translate(house.pos), episode
      })) : [];
      if (key === 'lower-town') houses.push({
        id: 'house/lower-town', title: '아랫마을 돌집', style: 'nazareth', pos: translate([-4.9, .56]), episode: id
      });
      if (key === 'shepherd-cave') houses.push({
        id: 'house/shepherd-cave', title: '목자들의 동굴 우리', style: 'stable', pos: translate([0, -2.35]), episode: id
      });
      if (key === 'olive-cave') houses.push({
        id: 'house/olive-cave', title: '올리브 짜는 틀 동굴', style: 'workshop', pos: translate([0, -2.4]), episode: id
      });
      if (episode === '1-1') houses.push({
        id: 'house/roof-store', title: '돌담 뒤 작업방', style: 'workshop', pos: translate([9.75, -20.45]), episode, standAlone: true
      });
      return { key, name, label: label || (key === 'elizabeth' ? '엘리사벳 집' : name), x, z, primary, episode, area,
        offset, translate, markerId, houses, extension: !!extension, edge: extension || (area?.adventure || index === 0 ? 23.5 : 8) };
    });
    const main = sites.find(site => site.primary);
    const visited = new Set(Array.isArray(log.regionWalk[index]) ? log.regionWalk[index] : []);
    let dirty = false, savedAt = performance.now();
    const canonical = ([x, z]) => [x + ox, z + oz];
    const nearSite = ([x, z]) => sites.find(site => Math.abs(x - site.offset[0]) <= site.edge + .4 &&
      Math.abs(z - site.offset[1]) <= site.edge + .4);
    function visit(pos) {
      const [x, z] = canonical(pos);
      const cell = Math.floor(x / regionCell) + ',' + Math.floor(z / regionCell);
      if (!visited.has(cell)) { visited.add(cell); dirty = true; }
      if (dirty && performance.now() - savedAt > 8000) save();
    }
    function save() {
      if (!dirty) return;
      log.regionWalk[index] = [...visited];
      dirty = false; savedAt = performance.now();
      Core.save();
    }
    const paths = routes.flatMap(points => points.slice(1).map((point, i) => [points[i], point]));
    const placesToPlay = [
      [['pigeons', -3, 5.5]], [['chickens', -9, 3], ['bush', -20, 4]],
      [['stones', 26, 0], ['bush', 37, 4]], [['game', -4, 7], ['chickens', 10, 4]],
    ][index].map(([type, x, z]) => ({ type, pos: [x - ox, z - oz] }));
    const sources = sites.filter(site => site.area?.discover).map(site => ({ site, taggedOnly: false }));
    // Shared discoveries stay in their districts when another episode takes over the starting site.
    const registered = new Set(sources.map(({ site }) => site.episode));
    const districts = new Set(sites.map(site => site.key));
    const districtEpisodes = visibleEpisodes.map(ep => ep.id);
    if (index === 0 && date() >= '2026-12-19' && !districtEpisodes.includes('4-0')) districtEpisodes.push('4-0');
    for (const episode of districtEpisodes.reverse()) {
      if (registered.has(episode)) continue;
      const area = window.EXPLORE[episode];
      if (area.discover?.items.some(entry => districts.has(entry.site))) {
        sources.push({ site: { episode, area, markerId: key => episode + ':' + key }, taggedOnly: true });
      }
    }
    return { index, title, bounds, sites, sources, main, origin: [ox, oz], canonical, nearSite, visited, visit, save, paths, placesToPlay };
  }

  function regionMapMarkup(region, position, scent, log, entries) {
    region.visit(position);
    region.save();
    const { title, bounds: [w, h], sites, paths, visited, canonical } = region;
    const [px, pz] = canonical(position);
    const [sx, sz] = scent ? canonical(scent) : [];
    const { found, ids } = regionCollection(region.index, log);
    const visitedCount = sites.filter(site => log.visitedSites?.[site.key] || visited.has(Math.floor(site.x / regionCell) + ',' + Math.floor(site.z / regionCell))).length;
    const legends = ids.filter(id => log.discoveries[id] && discoverRarity(window.DISCOVERIES[id], id) === 'legend').length;
    const siteIcons = { temple: '🏛️', sanctuary: '🕎', roof: '🏠', well: '🪣', 'david-well': '🪣', 'village-threshing': '🌾',
      gate: '🚪', 'sheep-gate': '🐑', 'wall-walk': '🏰', 'herod-palace': '🏰', 'eder-tower': '🏰', 'shepherd-cave': '🐑',
      'olive-cave': '🫒', 'boaz-field': '🌾', 'grain-yard': '🌾', 'rachel-tomb': '🪨', 'lake-pass': '🌊', siloam: '💧', 'valley-stream': '💧' };
    const reveal = [...visited].map(cell => {
      const [x, z] = cell.split(',').map(Number);
      return `<rect x="${x * regionCell}" y="${z * regionCell}" width="${regionCell}" height="${regionCell}" fill="white"/>`;
    }).join('');
    const pins = sites.map(site => {
      const walked = visited.has(Math.floor(site.x / regionCell) + ',' + Math.floor(site.z / regionCell)) || !!log.visitedSites?.[site.key];
      const litPulse = region.newlyLit === site.key
        ? `<circle class="region-site-pulse" cx="${site.x}" cy="${site.z}" r="5.6" fill="none" stroke="#ffd86b" stroke-width="1.4" data-lit-site="${esc(site.key)}"/>`
        : '';
      return `${litPulse}<circle cx="${site.x}" cy="${site.z}" r="3.3" fill="${walked ? '#ffdaa0' : '#9a8696'}" data-site-pin="${esc(site.key)}" data-site-walked="${walked}"/>
        <text x="${site.x}" y="${site.z + 1.65}" text-anchor="middle" fill="#372839" font-size="4.7">${siteIcons[site.key] || '◆'}</text>
        <text x="${site.x}" y="${site.z + 7.8}" text-anchor="middle" fill="#f5debd" font-size="4.2">${esc(site.label)}</text>`;
    }).join('');
    return `<svg class="region-chart" viewBox="${-w} ${-h} ${w * 2} ${h * 2}" role="img" aria-label="${esc(title)} 지도">
      <defs><mask id="region-walk-mask">${reveal}</mask></defs>
      <rect x="${-w}" y="${-h}" width="${w * 2}" height="${h * 2}" fill="#322c44"/>
      <text x="${w - 5}" y="${-h + 7.5}" text-anchor="end" fill="#f5debd" font-size="5">N↑</text>
      <rect x="${-w}" y="${-h}" width="${w * 2}" height="${h * 2}" fill="#817056" mask="url(#region-walk-mask)"/>
      <g fill="none" stroke="#b5a079" stroke-width="1.5" stroke-linecap="round" mask="url(#region-walk-mask)">
        ${paths.map(([[x, z], [tx, tz]]) => `<path d="M${x} ${z}L${tx} ${tz}"/>`).join('')}
      </g>${pins}
      ${scent ? `<circle cx="${sx}" cy="${sz}" r="2.5" fill="#ffc36b" stroke="#36233d" data-region-scent/>` : ''}
      <circle cx="${px}" cy="${pz}" r="2.6" fill="#d5fbff" stroke="#254861" data-region-player/>
    </svg>
    <p class="region-map-key">● 지금 위치 ${scent ? ' · 🟠 양이 맡은 냄새' : ''}</p>
    <p class="region-map-key" data-region-progress>가 본 곳 ${visitedCount}/${sites.length} · 발견 ${found}/${ids.length} · 전설 ${legends}</p>
    <ul class="region-places">${sites.map(site => {
      const dc = site.extension || region.index === 0 && site.episode
        ? countAtSite(site, entries, log)
        : site.episode ? discoverCount(site.episode, log) : null;
      return `<li><b>${esc(site.name)}</b><span>${dc?.max ? `발견 ${dc.n}/${dc.max}` : site.extension ? '둘러볼 수 있어' : '아직 이야기가 열리지 않았어'}</span></li>`;
    }).join('')}</ul>`;
  }

  function countAtSite(site, entries, log) {
    const items = new Set(entries.filter(entry => entry.location === site).map(entry => entry.id));
    return { n: [...items].filter(key => log.discoveries[key]).length, max: items.size };
  }

  function progress() {
    const field = Field.ensure();
    if (!field.explore || Array.isArray(field.explore) || typeof field.explore !== 'object') field.explore = {};
    const log = field.explore;
    for (const key of ['found', 'quests', 'rewards', 'photos', 'adventures', 'discoveries', 'discoverBag', 'discoverUnlock', 'themeRewards', 'narrated', 'visits', 'friendHints', 'regionWalk', 'visitedSites']) {
      if (!log[key] || Array.isArray(log[key]) || typeof log[key] !== 'object') log[key] = {};
    }
    if (!log.discoverOil || typeof log.discoverOil !== 'object') log.discoverOil = { date: '', count: 0 };
    if (!log.friendCodeDay || typeof log.friendCodeDay !== 'object') log.friendCodeDay = { date: '', count: 0 };
    if (!Number.isSafeInteger(log.sniffCount) || log.sniffCount < 0) log.sniffCount = 0;
    return log;
  }

  function ensureV68Styles() {
    if (document.getElementById('explore-v68-styles')) return;
    const style = document.createElement('style');
    style.id = 'explore-v68-styles';
    style.textContent = `
      .explore-narr-btn {
        display: inline-flex; align-items: center; justify-content: center;
        margin-left: 6px; padding: 2px 8px; border-radius: 999px;
        border: 1px solid rgba(255, 217, 145, .45); background: rgba(255, 217, 145, .14);
        color: #ffe3a3; font-size: 13px; line-height: 1.2; vertical-align: middle; cursor: pointer;
      }
      .explore-narr-btn:active { transform: scale(.95); }
      .explore-narr-caption {
        margin: 0 0 8px; padding: 9px 14px; border-radius: 14px;
        background: rgba(16, 14, 36, .92); border: 1px solid rgba(255, 217, 145, .5);
        color: #fff6e0; font-size: 13.5px; line-height: 1.45; text-align: center;
        box-shadow: 0 6px 18px rgba(0, 0, 0, .38); pointer-events: none;
        transition: opacity .25s ease;
      }
      .explore-narr-caption i { font-style: normal; margin-right: 5px; color: #ffd991; }
      .notebook-friend-box {
        margin: 8px 0 12px; padding: 10px 12px; border-radius: 14px;
        background: rgba(34, 29, 62, .75); border: 1px solid rgba(255, 217, 145, .28);
      }
      .notebook-friend-top {
        display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap;
      }
      .notebook-friend-toggle {
        padding: 5px 11px; border-radius: 999px; border: 1px solid rgba(255, 217, 145, .45);
        background: rgba(255, 217, 145, .14); color: #ffe5a8; font-size: 12.5px; font-weight: 700; cursor: pointer;
      }
      .notebook-friend-quota { font-size: 12px; color: #d6c8eb; }
      .notebook-friend-form {
        display: flex; gap: 6px; margin-top: 8px; align-items: center;
      }
      .notebook-friend-form[hidden] { display: none !important; }
      .notebook-friend-input {
        flex: 1; min-width: 0; padding: 7px 10px; border-radius: 10px;
        border: 1px solid rgba(255, 217, 145, .4); background: rgba(15, 13, 32, .85);
        color: #fff5dc; font-size: 13.5px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase;
      }
      .notebook-friend-submit {
        padding: 7px 14px; border-radius: 10px; border: none;
        background: #e5b869; color: #231829; font-size: 13px; font-weight: 700; cursor: pointer; white-space: nowrap;
      }
      .notebook-friend-msg {
        margin: 6px 0 0; font-size: 12.5px; color: #ffe3a3; line-height: 1.4;
      }
      .notebook-code-bar {
        display: flex; align-items: center; justify-content: space-between; gap: 6px;
        margin-top: 6px; padding: 5px 9px; border-radius: 10px;
        background: rgba(255, 217, 145, .1); border: 1px dashed rgba(255, 217, 145, .35);
        font-size: 12px; color: #ffe3a3;
      }
      .notebook-code-copy {
        padding: 2px 8px; border-radius: 8px; border: 1px solid rgba(255, 217, 145, .4);
        background: rgba(255, 217, 145, .16); color: #fff4d4; font-size: 11.5px; font-weight: 700; cursor: pointer;
      }
      .notebook-friend-hint {
        display: block; margin-top: 5px; padding: 4px 8px; border-radius: 8px;
        background: rgba(255, 217, 145, .16); color: #ffe3a3; font-size: 12px; font-weight: 700;
      }
      .explore-ending-btn {
        margin-top: 8px; width: 100%;
      }
      .walked-ending {
        display: flex; flex-direction: column; gap: 9px; padding-bottom: 18px;
      }
      .walked-stage-card {
        position: relative; border-radius: 18px; overflow: hidden;
        background: linear-gradient(180deg, #12112a 0%, #261f47 100%);
        border: 1px solid rgba(255, 217, 145, .42); box-shadow: 0 8px 22px rgba(0, 0, 0, .42);
      }
      .walked-visual {
        position: relative; width: 100%; height: 182px; background: #15132c;
        display: flex; align-items: center; justify-content: center; overflow: hidden;
      }
      .walked-visual img {
        width: 100%; height: 100%; object-fit: cover; display: block;
      }
      .walked-flat-art {
        position: relative; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;
      }
      .walked-flat-bg { position: absolute; inset: 0; opacity: .78; }
      .walked-flat-bg svg { width: 100%; height: 100%; object-fit: cover; }
      .walked-flat-sheep {
        position: relative; z-index: 2; width: 104px; height: 94px;
        filter: drop-shadow(0 6px 14px rgba(0, 0, 0, .6));
      }
      .walked-overlay-top {
        position: absolute; top: 8px; left: 10px; right: 10px; z-index: 3;
        display: flex; align-items: center; justify-content: space-between; gap: 8px;
      }
      .walked-step-pill {
        padding: 3px 9px; border-radius: 999px; background: rgba(13, 12, 30, .82);
        border: 1px solid rgba(255, 217, 145, .45); color: #ffe3a3; font-size: 11.5px; font-weight: 700;
      }
      .walked-skip-btn {
        padding: 3px 9px; border-radius: 999px; background: rgba(13, 12, 30, .82);
        border: 1px solid rgba(255, 255, 255, .28); color: #f3e8ff; font-size: 11.5px; cursor: pointer;
      }
      .walked-caption-box {
        padding: 9px 12px; background: rgba(18, 15, 38, .94); text-align: center;
      }
      .walked-caption-box h2 {
        margin: 0 0 3px; font-size: 16.5px; color: #fff4d8;
      }
      .walked-caption-box p {
        margin: 0; font-size: 12.5px; color: #dfd3f2; line-height: 1.38;
      }
      .walked-dots {
        display: flex; justify-content: center; gap: 5px; flex-wrap: wrap; margin-top: 7px;
      }
      .walked-dot {
        padding: 2.5px 7.5px; border-radius: 999px; border: 1px solid rgba(255, 217, 145, .28);
        background: rgba(255, 255, 255, .06); color: #cbbde0; font-size: 11px; cursor: pointer;
      }
      .walked-dot.active {
        background: rgba(255, 217, 145, .24); border-color: #ffd991; color: #fff6e0; font-weight: 700;
      }
      .walked-record-card {
        padding: 11px 12px; border-radius: 16px;
        background: linear-gradient(180deg, rgba(35, 30, 64, .92), rgba(22, 19, 44, .95));
        border: 1px solid rgba(255, 217, 145, .38);
      }
      .walked-record-head {
        display: flex; align-items: center; gap: 10px; padding-bottom: 8px;
        border-bottom: 1px solid rgba(255, 217, 145, .2); margin-bottom: 8px;
      }
      .walked-sheep-avatar {
        width: 54px; height: 54px; border-radius: 14px; background: rgba(15, 13, 32, .7);
        border: 1px solid rgba(255, 217, 145, .35); object-fit: contain; flex-shrink: 0;
      }
      .walked-sheep-meta h3 { margin: 0 0 2px; font-size: 15px; color: #fff4d6; }
      .walked-sheep-meta p { margin: 0; font-size: 12px; color: #e2d4f4; line-height: 1.3; }
      .walked-record-grid {
        display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px;
      }
      .walked-stat {
        padding: 7px 9px; border-radius: 10px; background: rgba(15, 13, 32, .65);
        border: 1px solid rgba(255, 217, 145, .18);
      }
      .walked-stat small { display: block; font-size: 11px; color: #cbbde0; margin-bottom: 1px; }
      .walked-stat b { display: block; font-size: 13px; color: #fff4d8; word-break: keep-all; }
      .walked-thanks-banner {
        margin-top: 8px; padding: 8px 10px; border-radius: 12px;
        background: rgba(255, 217, 145, .13); border: 1px solid rgba(255, 217, 145, .38);
        color: #fff6e0; font-size: 13.5px; font-weight: 700; text-align: center;
      }
    `;
    document.head.appendChild(style);
  }
  const foundKey = (id, marker) => id + '/' + marker;
  function discoverCount(id, log = Core.data.field?.explore) {
    const spec = window.EXPLORE[id]?.discover;
    if (!spec) return { n: 0, max: 0, newLeft: 0 };
    const seen = log?.discoveries || {};
    const n = spec.items.filter(entry => seen[entry.id]).length;
    const newLeft = spec.newIds.filter(did => !seen[did]).length;
    return { n, max: spec.items.length, newLeft };
  }
  function newCount(id, log = Core.data.field?.explore) { return discoverCount(id, log).newLeft; }
  function stars(id, log = Core.data.field?.explore) {
    if (window.EXPLORE[id]?.discover) {
      const dc = discoverCount(id, log);
      return { n: dc.n, max: dc.max };
    }
    if (window.EXPLORE[id]?.adventure) return { n: [1, 2, 3].filter(n => log?.found?.[foundKey(id, 'star-' + n)]).length, max: 3 };
    if (!log?.found || !window.EXPLORE[id]) return { n: 0, max: 5 };
    const markers = window.EXPLORE[id].markers.filter(marker => !marker.extra);
    return { n: markers.filter(marker => log.found[foundKey(id, marker.id)]).length, max: markers.length };
  }
  function complete(id) {
    if (adventureLog(id)?.done || Core.data.field?.explore?.found?.[foundKey(id, 'activity')]) return true;
    const spec = window.EXPLORE[id]?.discover;
    if (!spec) return false;
    return discoverCount(id).n >= Math.min(2, spec.newIds.length || 2);
  }
  function counts() {
    const log = Core.data.field?.explore;
    const ids = epList().map(ep => ep.id);
    let words = 0;
    for (const id of ids) for (const marker of window.EXPLORE[id].markers) {
      if (marker.type === 'verse' && log?.found?.[foundKey(id, marker.id)]) {
        words++;
      }
    }
    return { stars: ids.filter(id => { const s = stars(id, log); return s.n === s.max; }).length,
      places: ids.filter(id => complete(id)).length, secrets: ids.filter(id => log?.found?.[foundKey(id, 'secret')]).length,
      words, photos: ids.filter(id => log?.photos?.[id]).length };
  }
  function todayEvent() {
    const list = openList(), day = date(), key = hash(day.split('-').reverse().join('-'));
    if (!list.length || day > Core.XMAS) return null;
    return { ...events[key % events.length], ep: list[(Math.imul(key, 2053) >>> 0) % list.length].id, id: 'event:' + day };
  }
  function cueText(text, sheep) {
    const particles = { 이랑: '이랑', 이: '이가', 과: '과와' };
    return String(text || '').replace(/\{양\}(이랑|이|과)?|\{이름\}/g, (token, particle) => {
      if (token === '{이름}') return Core.data.nickname || '친구';
      if (particle === '이랑') return Core.josa(sheep.name, particles[particle]).replace(/이$/, '이랑');
      return particle ? Core.josa(sheep.name, particles[particle]) : sheep.name;
    });
  }
  function statusChanged() { Core.save(); Fame.checkNew(); }
  function mark(log, ep, marker) { log.found[foundKey(ep, marker)] ||= date(); }

  let session;
  function replace(content, className = '') {
    ensureV68Styles();
    session?.dispose?.();
    session = null;
    Sound.stopVoice?.();
    const app = document.querySelector('#app');
    app.innerHTML = `<main id="explore" class="explore ${className}">${content}</main>`;
    window.scrollTo(0, 0);
    return app.firstElementChild;
  }
  const backButton = label => `<button type="button" class="explore-back" aria-label="${label}" title="${label}">←</button>`;
  const canWatchEnding = () => !!(Core.PREVIEW_ALL || date() >= Core.XMAS || Core.data.done?.end);

  function geographyMap({ highlight, journeys = [] } = {}) {
    const scope = highlight ? 'mini-geography' : 'world-geography';
    return `<svg viewBox="0 0 370 370" class="explore-geography" role="${journeys.length ? 'group' : 'img'}" aria-label="갈릴리에서 유대까지 지리 약도">
      <defs>
        <pattern id="${scope}-relief" width="27" height="14" patternUnits="userSpaceOnUse">
          <path d="M-6 5Q5 -2 13 5T32 5m-38 7q11-7 19 0t19 0" fill="none" stroke="#a8875d" opacity=".32"/>
        </pattern>
        <linearGradient id="${scope}-land" x2=".8" y2="1"><stop stop-color="#f1e2b9"/><stop offset="1" stop-color="#e4c18b"/></linearGradient>
      </defs>
      <rect width="370" height="370" rx="16" fill="url(#${scope}-land)"/>
      <path d="M140 0Q106 51 131 91Q153 121 112 163Q87 204 112 235Q132 260 86 298Q65 338 99 370H238Q263 326 238 289Q215 264 247 227Q266 199 237 162Q219 136 255 98Q267 70 247 0Z" fill="url(#${scope}-relief)"/>
      <path d="M253 181Q271 191 300 197L316 346 246 370H220Q253 340 241 306T239 250Q249 220 253 181Z" fill="#dcaa6d" opacity=".58"/>
      <path d="M297 67C278 113 309 137 299 162S304 208 319 255" fill="none" stroke="#9aab79" stroke-width="20" opacity=".62"/>
      <g fill="#89adb5" stroke="#65949c" stroke-width="1.5">
        <path d="M0 0H100Q95 17 84 33Q69 47 78 63Q73 75 65 77Q73 86 65 93Q53 111 51 132Q43 177 20 209L0 233Z"/>
        <path d="M289 51Q302 47 307 60Q311 68 299 82Q292 88 285 78Q283 69 287 65Q280 56 289 51Z"/>
        <path d="M319 237Q333 235 335 250Q332 264 338 276L334 292Q339 307 328 328Q316 332 314 315L319 297Q307 281 312 268Q305 247 319 237Z"/>
      </g>
      <path d="M296 79C289 114 309 135 301 159S304 207 319 241" fill="none" stroke="#65949c" stroke-width="2.7"/>
      <path d="M226 115q7-14 12-16q6 1 13 16z" fill="#ac8e65" stroke="#87684d"/>
      <g fill="#60482f" font-family="sans-serif" font-weight="700" font-size="12">
        <text x="13" y="116" fill="#284d56">지중해</text>
        <text x="322" y="72" text-anchor="middle" fill="#284d56" font-size="10">갈릴리 호수</text>
        <text x="311" y="155" fill="#284d56" font-size="10">요단강</text>
        <text x="344" y="274" fill="#284d56" font-size="10">사해</text>
        <text x="313" y="343" fill="#284d56" font-size="10">-430m</text>
        <text x="223" y="126" font-size="10">다볼산</text>
        <text x="139" y="30">갈릴리</text><text x="119" y="152">사마리아</text>
        <text x="103" y="216">유대</text><text x="260" y="242">광야</text>
        <text x="342" y="24">N↑</text>
      </g>
      ${journeys.map(([key, journey]) => `<g data-journey="${key}" role="button" tabindex="0" aria-label="${esc(journey.title)}">
        <path d="${journey.path}" fill="none" stroke="transparent" stroke-width="17" pointer-events="stroke"/>
        <path d="${journey.path}" fill="none" stroke="${journey.color}" stroke-width="2.35" stroke-dasharray="2 5" stroke-linecap="round" pointer-events="none"/>
      </g>`).join('')}
      ${highlight ? `<circle cx="${highlight[0]}" cy="${highlight[1]}" r="14" fill="#ffef93" stroke="#a56943" stroke-width="1.5"/>
        <circle cx="${highlight[0]}" cy="${highlight[1]}" r="5" fill="#a44b64"/>` : ''}
    </svg>`;
  }

  function map() {
    if (!Field.has()) return App.home();
    Sound.ambience(null);
    const episodes = epList(), list = episodes.filter(isOpen), log = progress(), latest = list.at(-1), tally = counts();
    const event = todayEvent(), day = date();
    const pinStatus = ep => {
      const area = window.EXPLORE[ep.id];
      if (area.discover) {
        const dc = discoverCount(ep.id, log);
        return `발견 ${dc.n}/${dc.max}${dc.newLeft ? ` · 새 발견 ${dc.newLeft}` : ''}`;
      }
      const score = stars(ep.id, log);
      return area.adventure ? `별 ${score.n}/3 · 부탁 ${sideCount(area, adventureLog(ep.id, log))}/${area.adventure.sides.length} · 비밀 ${log.found[foundKey(ep.id, 'secret')] ? '✓' : '◇'}` : '';
    };
    const dateText = iso => {
      const [, month, day] = iso.split('-').map(Number);
      return `${month}/${day}`;
    };
    const weekday = new Intl.DateTimeFormat('ko-KR', { weekday: 'short', timeZone: 'UTC' });
    const row = (ep, i, featured = false) => {
      const available = isOpen(ep), score = stars(ep.id, log);
      const status = !available ? `🔒 ${dateText(ep.date)}에 열려` : score.max > 0 && score.n === score.max ? '✓ 다 찾음' : '열림';
      return `<button type="button" class="explore-place-row${featured ? ' explore-place-today' : ''}" data-place="${ep.id}"${available ? '' : ' aria-disabled="true"'}>
        <span class="explore-place-number" aria-hidden="true">${i + 1}</span>
        <span class="explore-place-name">${esc(window.EXPLORE[ep.id].title)}
          <small>${dateText(ep.date)} ${weekday.format(new Date(ep.date))} · 발견 ${score.n}/${score.max}</small>
        </span>
        <span class="explore-place-state">${featured ? '가 보자' : status}</span>
      </button>`;
    };
    const featured = episodes.findIndex(ep => ep.date === day && isOpen(ep));
    const headings = ['예루살렘', '유대 산골', '빈 들', '나사렛·갈릴리', '베들레헴'];
    const groups = headings.map(() => []);
    episodes.forEach((ep, i) => {
      const key = siteKey(ep.id), region = regionForSite(key);
      const group = region === 1 && key === 'desert' ? 2 : region >= 2 ? region + 1 : region;
      groups[group]?.push(row(ep, i));
    });
    const ball = (ep, i) => {
      const [x, y] = mapPoints[i], score = stars(ep.id, log);
      const secret = log.found[foundKey(ep.id, 'secret')], photo = log.photos[ep.id];
      const tags = (score.n === score.max ? '★' : '') + (secret ? ' ⚿' : '') + (photo ? ' ◎' : '');
      const current = ep.id === latest?.id && ep.date === date();
      const status = pinStatus(ep);
      return `<button class="explore-map-pin${current ? ' today' : ''}" data-place="${ep.id}" style="--x:${x / 3.7}%;--y:${y / 3.7}%"
        aria-label="${esc(window.EXPLORE[ep.id].title + (current ? ' · 오늘' : '') + (score.n === score.max ? ' · 전부 찾음' : '') + (secret ? ' · 비밀' : '') + (photo ? ' · 사진' : '') + (status ? ' · ' + status : ''))}">
        <b>${i + 1}</b>${tags ? `<small aria-hidden="true">${tags}</small>` : ''}</button>`;
    };
    const journeys = Object.entries(window.EXPLORE_JOURNEYS).filter(([key]) =>
      key === 'mary' ? list.some(ep => ep.id === '3-2') : date() >= '2026-12-19');
    const traveled = list.at(-1)?.id;
    const discoveredCount = Object.keys(log.discoveries || {}).length;
    const totalDiscoveries = Object.keys(window.DISCOVERIES || {}).length;
    const root = replace(`<header class="explore-head">${backButton('들판으로')}<div><h1>성탄 길 지도</h1><p>내 양과 걸어온 길</p></div><div class="explore-head-btns"><button class="explore-sub" type="button" data-notebook>📓 ${discoveredCount}/${totalDiscoveries}</button><button class="explore-sub" type="button" data-album>사진 ${tally.photos}/27</button></div></header>
      <div class="explore-parchment">
        ${geographyMap({ journeys })}
        ${episodes.map((ep, i) => isOpen(ep) ? ball(ep, i) : '').join('')}
      </div>
      <p class="explore-map-scale">지도는 줄여서 그렸어. 실제로는 나사렛에서 예루살렘까지 약 100km, 걸어서 4~5일 걸려.</p>
      <div class="explore-geography-links" aria-label="지역 소개">${Object.entries(window.EXPLORE_GEOGRAPHY).map(([key, place]) =>
        `<button class="btn ghost" type="button" data-geography="${key}">${esc(place.title)}</button>`).join('')}</div>
      <div class="explore-map-stats"><span>장소 ${list.length}/27</span><span>★ ${tally.stars}곳</span><span>⚿ ${tally.secrets}곳</span></div>
      ${event ? `<p class="explore-map-event">★ 오늘 ${esc(window.EXPLORE[event.ep].title)}에 무슨 일이 생겼대.</p>` : ''}
      <div class="explore-places">
        ${featured >= 0 ? `<h2>오늘의 장소</h2>${row(episodes[featured], featured, true)}` : ''}
        ${groups.map((places, i) => places.length ? `<h2>${headings[i]}</h2>${places.join('')}` : '').join('')}
      </div>
      ${traveled ? '<button type="button" class="btn ghost explore-challenge">탐험 도전장 저장·공유</button>' : ''}
      ${canWatchEnding() ? '<button type="button" class="btn ghost explore-ending-btn" data-walked-ending>🌟 성탄 엔딩 · 그 길을 함께 걸었어</button>' : ''}`, 'explore-map');
    root.querySelector('.explore-back').onclick = () => Field.page();
    root.querySelector('[data-notebook]')?.addEventListener('click', () => openNotebook(root, Field.mainCare()?.sheep));
    root.querySelector('[data-album]').onclick = album;
    const showGeography = (place, map = '') => Field.showSheet(root, place.title,
      `${map}<p class="discover-fact">${esc(place.fact)}</p>${place.ref ? Field.wordMarkup(place.ref) : ''}`);
    root.querySelectorAll('[data-geography]').forEach(button => button.onclick = () => {
      const place = window.EXPLORE_GEOGRAPHY[button.dataset.geography];
      showGeography(place, geographyMap({ highlight: place.point }));
    });
    root.querySelectorAll('[data-journey]').forEach(button => {
      const open = () => showGeography(window.EXPLORE_JOURNEYS[button.dataset.journey]);
      button.addEventListener('click', open);
      button.addEventListener('keydown', event => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        open();
      });
    });
    root.querySelector('[data-walked-ending]')?.addEventListener('click', () => ending());
    root.querySelector('.explore-challenge')?.addEventListener('click', () =>
      Field.showCard(root, '탐험 도전장', () => Card.drawExploreChallenge(tally), 'EXPLORE', '탐험 도전장', `내 탐험 기록은 ★ ${tally.stars}곳. 이길 수 있어?`));
    const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.classList.contains('no-motion');
    const rows = new Map([...root.querySelectorAll('.explore-place-row:not(.explore-place-today)')].map(button => [button.dataset.place, button]));
    const pins = new Map([...root.querySelectorAll('.explore-map-pin')].map(button => [button.dataset.place, button]));
    let enterTimer, selectedRow;
    for (const [id, pin] of pins) pin.onclick = () => {
      const target = rows.get(id);
      if (!target) return;
      selectedRow?.classList.remove('is-highlighted');
      selectedRow = target;
      target.classList.add('is-highlighted');
      target.focus({ preventScroll: true });
      target.scrollIntoView({ block: 'center', behavior: reduceMotion ? 'instant' : 'smooth' });
    };
    root.querySelectorAll('.explore-place-row:not([aria-disabled])').forEach(button => button.onclick = () => {
      if (enterTimer) return;
      const id = button.dataset.place, pin = pins.get(id);
      pin?.classList.add('is-selected');
      if (reduceMotion) return enter(id);
      pin?.scrollIntoView({ block: 'nearest', behavior: 'instant' });
      enterTimer = setTimeout(() => { if (root.isConnected) enter(id); }, 190);
    });
  }

  // 사진은 기기 안의 앨범에만 둔다. 백업에는 날짜와 촬영 당시의 양만 기록한다.
  let gallery;
  function photoDB() {
    gallery ||= new Promise((resolve, reject) => {
      if (!window.indexedDB) return reject(new Error('앨범 저장 불가'));
      const request = indexedDB.open('advent-explore-gallery', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('photos');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error('앨범을 여는 중 다른 창에서 사용 중'));
    });
    return gallery;
  }
  async function photoFile(id, token, data) {
    try {
      const db = await photoDB(), key = `${Core.IS_TEST ? 'test' : 'student'}:${id}:${token}`;
      return await new Promise((resolve, reject) => {
        const tx = db.transaction('photos', data ? 'readwrite' : 'readonly');
        const store = tx.objectStore('photos'), req = data ? store.put(data, key) : store.get(key);
        tx.oncomplete = () => resolve(req.result);
        tx.onabort = tx.onerror = () => reject(tx.error);
      });
    } catch { return null; }
  }
  async function photoURL(id, photo) {
    return await photoFile(id, photo.token) || Field.portrait(photo.species, photo);
  }
  function album() {
    Sound.ambience(null);
    const photos = Object.entries(progress().photos);
    const root = replace(`<header class="explore-head">${backButton('지도로')}<div><h1>여정 앨범</h1><p>내 양과 찍은 사진 ${photos.length}/27장</p></div></header>
      ${!photos.length ? '<p class="explore-map-event">포토 스팟에 다가가 사진을 찍어 봐.</p>' : ''}
      <div class="explore-album-grid">${epList().filter(ep => photos.some(([id]) => id === ep.id)).map(ep =>
        `<figure><img data-photo="${ep.id}" alt="${esc(window.EXPLORE[ep.id].title)}에서 찍은 양 사진"><figcaption><b>${esc(window.EXPLORE[ep.id].title)}</b><small>${esc(Core.dateLabel(ep.date))}</small></figcaption></figure>`).join('')}</div>
      ${photos.length && (date() >= Core.XMAS || Core.data.done.end) ? '<button class="btn" type="button" data-journey>27일의 여정 저장·공유</button>' : ''}
      ${canWatchEnding() ? '<button class="btn ghost explore-ending-btn" type="button" data-walked-ending>🌟 성탄 엔딩 · 그 길을 함께 걸었어</button>' : ''}`, 'explore-album');
    root.querySelector('.explore-back').onclick = map;
    root.querySelector('[data-walked-ending]')?.addEventListener('click', () => ending());
    root.querySelector('[data-journey]')?.addEventListener('click', () => {
      const sequence = epList().map(ep => [ep.id, progress().photos[ep.id]]);
      Field.showCard(root, '27일의 여정', () => Card.drawJourney(sequence, photoURL), 'JOURNEY', '내 양과 함께한 27일의 여정');
    });
    for (const img of root.querySelectorAll('img[data-photo]')) {
      const id = img.dataset.photo;
      photoURL(id, progress().photos[id]).then(url => { if (img.isConnected) img.src = url; });
    }
  }

  const ABILITIES = [
    { id: 'smell', icon: '🐽', title: '냄새 맡기', level: 1, detail: '숨은 물건 쪽으로 발자국이 3초 동안 반짝여.' },
    { id: 'jump', icon: '🦘', title: '뛰어넘기', level: 3, stage: '어린 양', detail: '낮은 담에서 사용해 높은 곳으로 건너가.' },
    { id: 'push', icon: '💪', title: '밀기', level: 6, stage: '큰 양', detail: '수레 가까이에서 사용해 뒤쪽을 살펴봐.' },
    { id: 'shine', icon: '✨', title: '빛내기', level: 10, stage: '빛나는 양', detail: '어두운 틈에서 사용해 안쪽을 밝혀.' }
  ];
  const adventureLog = (id, log = Core.data.field?.explore) => log?.adventures?.[id];
  const sideCount = (area, state) => area.adventure.sides.filter((side, i) => state?.side?.[i]?.step >= side.steps.length).length;
  const newRun = () => ({ step: 0, hits: [] });

  function createAdventure(context) {
    const { id, area, day, log, root, sheep, record, card, feedback, grant, refresh, getView, isFlat } = context;
    const adventure = area.adventure, { targets, steps, sides, zones } = adventure;
    const state = log.adventures[id] ||= { main: newRun(), side: sides.map(newRun), bag: {}, unlocked: {}, done: false };
    state.side = sides.map((_, i) => state.side[i] || newRun());
    if (steps[state.main.step]?.type === 'timed') state.main.hits = [];
    const objectives = root.querySelector('.adventure-objective'), bearing = root.querySelector('[data-bearing]');
    const zoneText = root.querySelector('[data-zone]'), timerEl = root.querySelector('[data-timer]');
    const bagButton = root.querySelector('[data-bag]'), next = root.querySelector('[data-field-next]');
    let clock = null, interval = 0, zone = -1, focusId;
    let restoredView;
    const lines = [{ run: state.main, steps, id: 'main' }, ...sides.map((side, i) => ({ ...side, run: state.side[i], id: 'side/' + i }))];
    const main = lines[0];
    const count = run => run.hits.length;
    const stepFor = track => track.steps[track.run.step];
    const firstOnly = new Set(['escort', 'follow']);
    const here = () => getView()?.position() || adventure.spawn;
    const proximity = pos => Math.hypot(here()[0] - pos[0], here()[1] - pos[1]);
    const slotCount = () => Object.keys(state.bag).length;
    const done = key => log.found[foundKey(id, key)];
    const active = track => {
      const step = stepFor(track);
      if (!step) return [];
      if (step.type === 'timed' && !clock) return [step.approach && !track.run.approached ? step.approach : step.start];
      const remaining = step.nodes.filter(node => !track.run.hits.includes(node));
      return firstOnly.has(step.type) || step.type === 'wait' || step.type === 'scene' || step.first && !track.run.hits.includes(step.first)
        ? remaining.slice(0, 1) : remaining;
    };
    function soundZone(index) {
      if (index === zone) return;
      zone = index;
      zoneText.textContent = zones[zone];
      Sound.ambience(adventure.ambience[zone]);
    }
    soundZone(0);
    function finish(track) {
      if (track === main) {
        const first = !complete(id) && log.quests[id] !== 'done';
        state.done = true;
        mark(log, id, 'activity');
        log.quests[id] = 'done';
        const exclusive = id === '1-2' && area.activity.exclusive;
        const item = grant({ oil: first ? 1 : 0, wool: first ? 1 : 0, item: exclusive });
        const heart = first && Field.adventureHeart(record, day);
        feedback('오늘의 모험을 마쳤어.');
        Sound.sfx('star');
        return card(id === '1-6' ? '첫째 주 모험 완료' : '오늘의 모험 완료', id === '1-6'
          ? '일곱 날 동안 기다림의 길을 걸었어. 지도에서 걸어온 길을 볼 수 있어.'
          : '지도에 오늘 걸은 길을 기록했어. 별 조각과 마을의 부탁도 더 찾아볼 수 있어.', {
          detail: [first && '털 +1', first && '기름 +1', heart && '오늘의 하트 +1', item && ('옷장 · ' + item)].filter(Boolean).join(' · '),
          button: '마을 더 둘러보기'
        });
      }
      grant({ wool: 1 });
      Sound.sfx('mission');
      feedback(track.title + ' · 부탁을 마쳤어. 털 +1');
    }
    function bagMarkup() {
      const entries = Object.values(state.bag);
      return '<ul class="adventure-bag">' + Array.from({ length: 6 }, (_, i) => {
        const item = entries[i];
        return item ? `<li><i>${item.icon}</i><b>${esc(item.name)}</b><small>×${item.count}</small></li>` : '<li class="empty-slot" aria-label="빈 칸">·</li>';
      }).join('') + '</ul>';
    }
    function updateBag(step, key, last) {
      const rule = { ...step, ...step.at?.[key] };
      const give = rule.giveAtEnd && !last ? null : rule.give;
      const take = rule.takeAtEnd && !last ? null : rule.take;
      const bag = state.bag;
      if (take && (!bag[take.name] || bag[take.name].count < (rule.takeCount || 1))) { feedback(take.name + '부터 챙겨 보자.'); return false; }
      if (give && !bag[give.name] && slotCount() >= 6 && !(take && bag[take.name].count === 1)) {
        feedback('가방이 가득 찼어. 가지고 있는 물건부터 전해 주자.');
        return false;
      }
      if (take) {
        bag[take.name].count -= rule.takeCount || 1;
        if (bag[take.name].count <= 0) delete bag[take.name];
      }
      if (give) (bag[give.name] ||= { ...give, count: 0 }).count += rule.amount || 1;
      return true;
    }
    function stopClock() {
      const saved = clock;
      clock = null; clearInterval(interval); timerEl.hidden = true;
      return saved;
    }
    function startClock(track, key, mode, seconds) {
      const start = performance.now();
      const movement = getView()?.moveInfo().travel || 0;
      clock = { start, track, key, mode, seconds, movement };
      timerEl.hidden = false;
      timerEl.textContent = seconds + '초';
      interval = setInterval(() => {
        if (!clock) return;
        const left = Math.max(0, Math.ceil(seconds - (performance.now() - start) / 1000));
        if (mode === 'wait' && ((getView()?.moveInfo().travel || 0) - movement > .45 || document.hidden)) {
          stopClock(); feedback('발걸음을 멈추고 다시 함께 기도해 보자.'); refresh(); return;
        }
        timerEl.textContent = left + '초';
        if (left) return;
        stopClock();
        if (mode === 'wait') advance(track, key);
        else {
          track.run.hits = [];
          Core.save(); feedback('시간이 다 됐어. ' + targets[key].title + '에게 다시 말을 걸면 재도전할 수 있어.'); refresh();
        }
      }, 100);
      refresh();
    }
    const counted = step => step.type === 'light' ? step.nodes.filter(key => targets[key].type === 'light') : step.nodes;
    const progressLine = (step, run) => {
      const nodes = counted(step);
      return `${run.hits.filter(key => nodes.includes(key)).length}/${nodes.length}`;
    };
    function advance(track, key, skipBag = false) {
      const step = stepFor(track);
      if (!step || (!skipBag && !updateBag(step, key, count(track.run) + 1 === step.nodes.length))) return;
      const view = getView();
      track.run.hits.push(key);
      if (step.type === 'escort') {
        const passenger = step.passenger || step.nodes[0];
        if (key === passenger) view?.setEscort(key);
        if (key === step.nodes.at(-1)) view?.setEscort(null);
      }
      if (step.type === 'clear') { Sound.sfx('thump'); view?.react(key, 'spark'); }
      else if (step.type === 'light' && targets[key].type === 'light') { Sound.sfx('ignite'); view?.react(key, 'spark'); }
      else if (step.type === 'order') {
        Sound.sfx('exploreBell', count(track.run) - 1);
        view?.react(key, 'note');
      } else {
        Sound.sfx(step.type === 'scene' ? 'star' : 'pop');
        const effect = step.effects?.[key] || (step.type !== 'scene' && step.effect);
        if (effect) view?.react(key, effect);
        if (targets[key]?.animal === '비둘기' && step.type === 'collect') view?.moveAnimal?.(key, targets.keeper.pos);
      }
      const finished = count(track.run) >= step.nodes.length || skipBag;
      if (!finished) {
        feedback(`${targets[key]?.title || step.goal} · ${progressLine(step, track.run)}`);
        Core.save(); refresh(); return;
      }
      if (step.alternative === 'push' && targets.mule) view?.moveAnimal('mule', [-7.7, 4.45], 0);
      if (clock?.track === track) stopClock();
      track.run.step++;
      track.run.hits = [];
      focusId = null;
      if (!stepFor(track)) finish(track);
      else {
        objectives?.animate?.([{ opacity: .65 }, { opacity: 1 }], { duration: 360 });
        Sound.sfx('exploreBell', 2);
        const upcoming = stepFor(track);
        feedback(upcoming.intro || '한 단계 마쳤어.');
      }
      statusChanged(); refresh();
    }
    function action(track, key) {
      const step = stepFor(track);
      if (!step) return;
      if (step.type === 'timed' && key === step.approach) {
        const from = targets[key];
        return card(from.title, step.lines[key], { who: from.actor, action: () => {
          track.run.approached = true;
          statusChanged(); refresh();
        } });
      }
      if (step.type === 'timed' && key === step.start) {
        const begin = () => startClock(track, key, 'timed', step.seconds);
        return card(step.title || '아이 셋 찾기', step.intro, { who: targets[key].actor, button: step.seconds + '초 도전 시작', action: begin });
      }
      if (step.type === 'wait' && key === (step.waitAt || step.nodes[0])) {
        if (clock) return;
        return card(targets[key].title, step.line, { who: targets[key].actor, button: '조용히 서 있기', action: () => {
          feedback('기도하는 동안 여기서 발걸음을 멈추자.');
          startClock(track, key, 'wait', step.seconds);
        } });
      }
      if (step.type === 'order' && step.nodes[count(track.run)] !== key) {
        track.run.hits = []; Core.save(); refresh();
        Sound.sfx('tap'); feedback(step.intro);
        return;
      }
      if (clock?.mode === 'timed' && performance.now() - clock.start >= clock.seconds * 1000) return;
      const target = targets[key];
      if (step.type === 'clear') {
        getView()?.react(key, 'rustle');
        Sound.sfx('tap');
        return card(target.title, '돌이 조금 움직였어.', { button: '길 가장자리로 밀기', action: () => advance(track, key) });
      }
      const line = step.lines?.[key] || (step.type === 'wait' ? '' : step.line);
      if (key === 'word' || key === 'secret') {
        mark(log, id, key); statusChanged();
        return card(target.title, target.text || '', { word: target.ref, button: '계속', action: () => advance(track, key) });
      }
      if (step.type === 'scene' && step.effect && key === step.nodes.at(-1)) getView()?.react(key, step.effect);
      if (line) {
        getView()?.say(key, cueText(line, sheep));
        return card(target.title, line, { who: target.actor, button: '계속', action: () => advance(track, key) });
      }
      advance(track, key);
    }
    function discovered(key) {
      const target = targets[key];
      if (!target) return false;
      if (target.type === 'fragment' || target.type === 'cache') {
        if (clock?.mode === 'wait') return true;
        if (!done(key)) {
          mark(log, id, key);
          if (target.type === 'cache') grant({ oil: 1 });
          feedback(target.type === 'cache' ? '작은 기름병을 찾았어. 기름 +1' : `별 조각을 찾았어 · ${stars(id, log).n}/3`);
          getView()?.react(key, 'spark'); Sound.sfx('gem');
          statusChanged(); refresh();
        }
        return true;
      }
      if (target.feature) { abilitySheet(target.feature); return true; }
      return false;
    }
    function applyAbility(kind) {
      if (clock) return feedback('지금 하던 일을 끝낸 다음 양과 둘러보자.');
      const view = getView();
      if (kind === 'smell') {
        const nearby = ['star-1', 'star-2', 'star-3', 'secret'].filter(key => !done(key))
          .sort((a, b) => proximity(targets[a].pos) - proximity(targets[b].pos));
        const key = nearby[0];
        if (!key) return feedback('이 장소의 별 조각과 비밀을 모두 찾았어.');
        const dist = proximity(targets[key].pos);
        if (!isFlat() && dist > 15) {
          const [x, z] = targets[key].pos;
          const [px, pz] = here();
          view?.revealAbility('smell', [px + (x - px) * 9 / dist, pz + (z - pz) * 9 / dist]);
          return feedback('아주 희미한 냄새가 나. 발자국이 가리키는 쪽으로 조금 더 걸어 봐.');
        }
        view?.revealAbility('smell', targets[key].pos);
        feedback(isFlat() ? targets[key].clue || '조용한 구석에 냄새가 남아 있어.' : '반짝이는 발자국을 따라가 봐.');
        Sound.sfx('sheep'); refresh();
        return;
      }
      if (state.unlocked[kind]) return feedback('이 장소에서 이미 사용했어.');
      if (!isFlat() && proximity(targets[kind].pos) > 2.2) return feedback(targets[kind].title + ' 가까이에서 써 보자.');
      state.unlocked[kind] = true;
      const destination = kind === 'jump' ? targets['star-2'].pos : null;
      view?.revealAbility(kind, destination);
      const shortcut = lines.find(track => stepFor(track)?.alternative === kind);
      if (shortcut && count(shortcut.run) === 0) advance(shortcut, stepFor(shortcut).nodes[0], true);
      feedback({ jump: '낮은 담을 폴짝 넘었어. 담 너머를 살펴봐.', push: '수레를 밀어 길을 열었어.', shine: '양의 빛이 어두운 틈을 비췄어.' }[kind]);
      Sound.sfx(kind === 'push' ? 'thump' : 'gem');
      statusChanged(); refresh();
    }
    function abilitySheet(kind) {
      const abilities = kind ? ABILITIES.filter(ability => ability.id === kind) : ABILITIES;
      const dialog = card('양 능력', '', {
        extra: `<div class="adventure-abilities">${abilities.map(ability => {
          const ready = Field.mainCare()?.sheep.level >= ability.level || ability.id === 'shine' && day >= '2026-12-20';
          return `<button type="button" data-ability="${ability.id}" ${ready ? '' : 'disabled'}><i>${ability.icon}</i><b>${ability.title}</b><small>${ready ? ability.detail : ability.stage + '부터 쓸 수 있어.'}</small></button>`;
        }).join('')}</div>`, button: '돌아가기'
      });
      dialog?.querySelectorAll('[data-ability]').forEach(button => button.onclick = () => {
        dialog.querySelector('[data-continue]').click();
        applyAbility(button.dataset.ability);
      });
    }
    function locate(key) {
      if (!key || !targets[key]) return;
      const view = getView();
      if (!view) {
        const button = [...root.querySelectorAll('[data-mark]')].find(el => el.dataset.mark === key);
        if (button) { if (button.closest('details')) button.closest('details').open = true; button.focus(); button.scrollIntoView({ block: 'nearest' }); }
        return;
      }
      view.focus(key);
    }
    function ledger() {
      const score = stars(id, log);
      const items = lines.slice(1).map((track, i) => {
        const target = active(track)[0], step = stepFor(track);
        return `<li><b>${step ? '◇' : '✓'} ${esc(sides[i].title)}</b>${step ? `<p>${esc(step.goal)}</p><button type="button" data-locate="${target}">길 찾기</button>` : ''}</li>`;
      }).join('');
      const dialog = card('마을 일지', '', { extra: `<div class="adventure-ledger">
        <ul>${items}</ul><h3>별 조각 ${score.n}/3</h3>
        <ul>${['star-1', 'star-2', 'star-3'].map(key => `<li>${done(key) ? '✓ ' + esc(targets[key].title) : '✧ ' + esc(targets[key].clue)}</li>`).join('')}</ul>
        <ul>${['word', 'photo', 'secret'].map(key => `<li>${done(key) ? '✓' : '◇'} ${key === 'secret' ? '비밀 장소' : esc(targets[key].title)}${key === 'secret' ? '' : ` <button type="button" data-locate="${key}">길 찾기</button>`}</li>`).join('')}</ul>
        </div>`, button: '마을로' });
      dialog?.querySelectorAll('[data-locate]').forEach(button => button.onclick = () => {
        dialog.querySelector('[data-continue]').click();
        locate(button.dataset.locate);
      });
    }
    function render() {
      const step = stepFor(main), view = getView();
      const currentNodes = active(main);
      const p = here();
      const nearest = currentNodes.reduce((best, key) => !best || Math.hypot(targets[key].pos[0] - p[0], targets[key].pos[1] - p[1])
        < Math.hypot(targets[best].pos[0] - p[0], targets[best].pos[1] - p[1]) ? key : best, null);
      focusId = currentNodes.includes(focusId) ? focusId : step?.type === 'order' ? currentNodes[0] : nearest;
      if (objectives) {
        objectives.querySelector('[data-act-step]').textContent = step ? `모험 ${state.main.step + 1}/${steps.length}` : '모험 완료';
        objectives.querySelector('[data-act-goal]').textContent = step?.goal || '별 조각과 마을의 부탁을 더 찾아보자';
        const small = objectives.querySelector('[data-act-count]');
        small.textContent = step && counted(step).length > 1 ? progressLine(step, main.run) : '';
      }
      if (bearing) bearing.hidden = !focusId || !!clock && clock.mode === 'wait';
      view?.setWaypoint(bearing && focusId ? targets[focusId].pos : null);
      if (view && view !== restoredView) {
        restoredView = view;
        for (const kind of ['jump', 'push']) if (state.unlocked[kind]) view.restoreAbility(kind);
        const escortTrack = lines.find(track => {
          const step = stepFor(track);
          return step?.type === 'escort' && track.run.hits.includes(step.passenger || step.nodes[0]);
        });
        if (escortTrack) {
          const step = stepFor(escortTrack);
          view.setEscort(step.passenger || step.nodes[0]);
        }
      }
      if (adventure.carry) view?.setCarry(state.bag[adventure.carry] ? '🏺' : '');
      const score = stars(id, log);
      root.querySelector('[data-score]').textContent = `✦ 별 ${score.n}/3 · 부탁 ${sideCount(area, state)}/${sides.length} · 비밀 ${done('secret') ? '✓' : '◇'}`;
      bagButton.querySelector('small').textContent = slotCount() + '/6';
      next.hidden = !complete(id);
      const markers = new Map();
      const add = (key, extra = {}) => {
        const target = targets[key];
        markers.set(key, { ...target, id: key, ...extra });
      };
      for (const key of ['word', 'photo', 'secret']) {
        if (targets[key] && !(id === '1-3' && key === 'secret' && state.main.step < 2)) add(key);
      }
      for (const key of ['star-1', 'star-2', 'star-3']) if (!done(key)) add(key, {
        hidden: !(key === 'star-2' && state.unlocked.jump)
      });
      for (const kind of ['jump', 'push', 'shine']) if (!state.unlocked[kind]) add(kind);
      if (state.unlocked.push && !done('cart-cache')) add('cart-cache', { hidden: false });
      if (state.unlocked.shine && !done('light-cache')) add('light-cache', { hidden: false });
      for (const track of clock?.mode === 'timed' ? [main] : lines) for (const key of active(track)) {
        const step = stepFor(track);
        add(key, { hidden: step.type === 'timed' && step.nodes.includes(key), priority: track === main ? 'main' : 'side' });
      }
      const lights = steps.findIndex(step => step.type === 'light');
      if (lights >= 0 && state.main.step >= lights) {
        for (const key of steps[lights].nodes) if (targets[key].type === 'light' && (state.main.step > lights || state.main.hits.includes(key))) add(key, { lit: true });
      }
      for (const [key, target] of Object.entries(targets)) {
        if (target.onlyWhenActive) view?.showResident(key, markers.has(key) || state.done);
      }
      if (id === '1-4') for (const key of ['sign1', 'sign2', 'sign3', 'zach']) view?.showResident?.(key, markers.has(key));
      if (id === '1-5') for (const key of ['start', 'bendSouth', 'bend', 'gate']) view?.showResident?.(key, markers.has(key));
      if (id === '1-1') view?.showResident?.('rooftop', markers.has('rooftop') || state.done);
      if (id === '1-6') view?.showResident?.('sunrise', markers.has('sunrise') || state.done);
      return [...markers.values()];
    }
    bagButton.onclick = () => card('모험 가방', '', { extra: bagMarkup(), button: '가방 닫기' });
    root.querySelector('[data-abilities]').onclick = () => abilitySheet();
    root.querySelector('[data-notebook]')?.addEventListener('click', () => openNotebook(root, sheep, id));
    root.querySelector('[data-hints]').onclick = ledger;
    if (bearing) bearing.onclick = () => locate(focusId);
    root.querySelector('[data-quest-map]').onclick = () => {
      const nodes = active(main);
      const mapDialog = card('이 장소의 길', '', { extra: `<ol class="adventure-zones">${zones.map((name, i) => `<li>${i === zone ? '●' : '○'} ${esc(name)}</li>`).join('')}</ol>
        <ul class="adventure-checks">${nodes.map(key => `<li><button type="button" data-locate="${key}">${esc(targets[key].title)}</button></li>`).join('')}</ul>`, button: '돌아가기' });
      mapDialog?.querySelectorAll('[data-locate]').forEach(button => button.onclick = () => {
        mapDialog.querySelector('[data-continue]').click();
        locate(button.dataset.locate);
      });
    };
    return {
      render, dispose: stopClock, onBearing(radians, meters) {
        const info = getView()?.moveInfo();
        if (info) soundZone(info.zone);
        if (!bearing) return;
        bearing.querySelector('i').style.transform = `rotate(${radians.toFixed(2)}rad)`;
        const value = meters + ' m';
        if (bearing.querySelector('small').textContent !== value) bearing.querySelector('small').textContent = value;
      },
      zoneChanged() { const info = getView()?.moveInfo(); if (info) soundZone(info.zone); },
      sceneChanged() { zone = -1; soundZone(getView()?.moveInfo().zone || 0); },
      reach(key) {
        if (clock?.mode === 'wait') return true;
        const track = clock?.mode === 'timed' ? (active(main).includes(key) ? main : null) : lines.find(track => active(track).includes(key));
        if (track) { action(track, key); return true; }
        if (clock?.mode === 'timed') return true;
        return discovered(key);
      }
    };
  }

  /* ---------- 발견 탐험 엔진 · 손가락 체험 8종 · 발견 노트 ---------- */
  const KIND_META = {
    look: { icon: '👀', label: '살펴보기' },
    touch: { icon: '✋', label: '만져 보기' },
    try: { icon: '🛠', label: '해 보기' }
  };
  const CUE_MOOD = { food: 'sniff', water: 'splash', fire: 'cozy', animal: 'startle', wool: 'sniff', worship: 'spark', craft: 'spark', road: 'spark', baby: 'cozy', quiet: 'cozy' };
  const SPECIES_CUE = {
    glutton: { food: '킁킁! 맛있는 냄새야! 한 입만 주면 안 돼?', water: '물 마시면 또 배고파지는데.' },
    sleepy: { fire: '따뜻하니까 눈이 스르르… 꾸벅.', baby: '포근한 요람 보니까 나도 졸려…', quiet: '조용해서 잠깐 눈 붙여도 되겠다.' },
    splash: { water: '첨벙! 물만 보면 발부터 담그고 싶어.' },
    curly: { water: '물 튀면 내 곱슬털이 두 배로 부푸는데!' },
    fire: { fire: '따뜻해… 불 옆이 제일 좋아.' },
    shy: { animal: '움찔! 생각보다 크네… 네 뒤에 잠깐 숨을래.' },
    jumper: { animal: '나도 저렇게 폴짝 뛰어 볼까!', road: '저 앞까지 단숨에 뛰어갈 수 있어!' },
    flower: { road: '꽃잎이 보여! 내 털에도 한 송이 꽂아 줘.' },
    olive: { road: '그늘 시원하다. 여기서 잠깐 쉬었다 갈래?' },
    lantern: { fire: '내 털끝 빛이랑 불빛이 닮았지?' },
    stargazer: { worship: '불빛이 별처럼 반짝여. 오래 보고 싶어.' },
    cotton: { wool: '어? 저 실, 내 털처럼 폭신해 보여!' },
    brown: { food: '어, 내 털 색이랑 똑같은 구운 빵 냄새야! 킁킁.' },
    david: { worship: '♪ 소리 들으니까 하프가 생각나.' },
    manger: { baby: '조용히… 아기가 자고 있을 것만 같아.' },
    fleece: { water: '물방울이 이슬처럼 반짝여.' },
    camper: { road: '짐 보니까 당장 길 떠나고 싶어졌어!' },
    tiny: { animal: '나보다 훨씬 크네! 그래도 안 무서워.' },
    chatty: { worship: '우와, 이거 나한테도 자세히 설명해 줘!' }
  };
  function sheepReaction(item, sheep) {
    const mood = CUE_MOOD[item.cue] || 'spark';
    const custom = sheep && SPECIES_CUE[sheep.species]?.[item.cue];
    return { mood, line: custom || item.sheep || '신기한 걸 찾았네! 같이 더 보자.' };
  }
  function fallbackThumbSVG(item) {
    const colors = { temple: ['#3c2e56', '#76577f'], home: ['#4a323e', '#865b4c'], work: ['#36384e', '#6f6254'], road: ['#2e3e44', '#5d765a'], field: ['#2b3450', '#5a6380'], christmas: ['#1f2347', '#5c4b7d'] };
    const [a, b] = colors[item.theme] || ['#31294b', '#655178'];
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 150"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="220" height="150" rx="14" fill="url(#g)"/><circle cx="110" cy="74" r="44" fill="#fff2cc22"/><text x="110" y="92" text-anchor="middle" font-size="54">${item.icon || '✦'}</text></svg>`;
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }
  const CODE_CHARS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  function encodeDiscoverCode(itemId) {
    const keys = Object.keys(window.DISCOVERIES || {});
    const idx = keys.indexOf(itemId);
    if (idx < 0) return '';
    let h = hash('geubam-share:' + itemId);
    let out = 'GB' + CODE_CHARS[idx % CODE_CHARS.length] + CODE_CHARS[Math.floor(idx / CODE_CHARS.length) % CODE_CHARS.length];
    for (let i = 0; i < 3; i++) {
      out += CODE_CHARS[h % CODE_CHARS.length];
      h = Math.floor(h / CODE_CHARS.length);
    }
    return out;
  }
  function decodeDiscoverCode(raw) {
    const clean = String(raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (clean.length < 6 || clean.length > 8) return null;
    for (const id of Object.keys(window.DISCOVERIES || {})) {
      if (encodeDiscoverCode(id) === clean) return id;
    }
    return null;
  }
  function placeForDiscovery(itemId) {
    const eps = epList();
    const byNew = eps.find(ep => window.EXPLORE[ep.id]?.discover?.newIds?.includes(itemId));
    if (byNew) return byNew.id;
    const byItem = eps.find(ep => window.EXPLORE[ep.id]?.discover?.items?.some(e => e.id === itemId));
    return byItem?.id || '1-0';
  }

  async function discoverThumbURL(itemId) {
    const item = window.DISCOVERIES?.[itemId];
    const saved = await photoFile('discover', itemId);
    return saved || (item ? fallbackThumbSVG(item) : '');
  }

  const LEGEND_DISCOVER_IDS = new Set([
    'menorah', 'sheep-gate', 'wilderness-road', 'eder-tower',
    'stone-manger', 'great-star', 'mount-of-olives', 'incense-altar'
  ]);
  const RARE_DISCOVER_IDS = new Set([
    'empty-cradle', 'wax-tablet', 'david-well', 'rachel-tomb',
    'bethesda', 'siloam', 'barren-country', 'scroll-synagogue', 'swaddle-wrap'
  ]);
  const RARITY_META = {
    legend: { id: 'legend', label: '✦ 전설', short: '전설', duration: 3500 },
    rare: { id: 'rare', label: '✧ 희귀', short: '희귀', duration: 2000 },
    common: { id: 'common', label: '일반', short: '일반', duration: 1200 }
  };
  function discoverRarity(item, itemId = '') {
    if (!item) return 'common';
    const raw = item.rarity;
    if (raw === 'legend' || raw === 'legendary' || LEGEND_DISCOVER_IDS.has(itemId)) return 'legend';
    if (raw === 'rare' || item.kind === 'try' || RARE_DISCOVER_IDS.has(itemId)) return 'rare';
    return 'common';
  }
  function rarityBadgeHTML(rarity) {
    const meta = RARITY_META[rarity] || RARITY_META.common;
    return `<span class="discover-rarity-badge is-${meta.id}" data-rarity-badge="${meta.id}">${esc(meta.label)}</span>`;
  }
  function isReducedMotion() {
    return !!(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ||
      document.documentElement.classList.contains('no-motion'));
  }
  function vibrateDevice(pattern) {
    if (!Sound.on || isReducedMotion()) return;
    try { navigator.vibrate?.(pattern); } catch { /* 기기 미지원 무시 */ }
  }
  function visitedSiteStats(log = progress()) {
    const seenSites = new Map();
    REGION_LAYOUTS.forEach((reg, rIdx) => {
      const walkedSet = new Set(Array.isArray(log.regionWalk?.[rIdx]) ? log.regionWalk[rIdx] : []);
      for (const [key, name, x, z] of reg.sites) {
        const cell = Math.floor(x / regionCell) + ',' + Math.floor(z / regionCell);
        const isVis = !!(log.visitedSites?.[key] || walkedSet.has(cell) ||
          epList().some(ep => siteKey(ep.id) === key && (log.visits?.[ep.id] > 0 || log.narrated?.[ep.id])));
        seenSites.set(key, seenSites.get(key) || isVis);
      }
    });
    const total = seenSites.size;
    const visited = [...seenSites.values()].filter(Boolean).length;
    return { visited, total };
  }

  let activeRevealCleanup = null;
  function dismissDiscoverReveal() {
    if (activeRevealCleanup) {
      const fn = activeRevealCleanup;
      activeRevealCleanup = null;
      fn();
    }
  }

  function cardBackEmblemSVG() {
    return `<svg class="reveal-back-emblem" viewBox="0 0 120 120" aria-hidden="true">
      <defs>
        <radialGradient id="rev-star-g" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#fff9e2"/>
          <stop offset="55%" stop-color="#ffd269"/>
          <stop offset="100%" stop-color="#a86d19" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <circle cx="60" cy="60" r="52" fill="none" stroke="#ffd875" stroke-width="1.6" stroke-dasharray="4 3" opacity=".75"/>
      <circle cx="60" cy="60" r="42" fill="url(#rev-star-g)" opacity=".35"/>
      <polygon points="60,12 69,46 104,46 75,66 85,100 60,79 35,100 45,66 16,46 51,46" fill="none" stroke="#ffe59e" stroke-width="1.8" opacity=".55"/>
      <path d="M60 10 L67 48 L106 60 L67 72 L60 110 L53 72 L14 60 L53 48 Z" fill="#ffe79e"/>
      <circle cx="60" cy="60" r="7" fill="#ffffff"/>
    </svg>`;
  }

  function playDiscoverReveal({ root, item, itemId, sheep, res, shotUrl = null }) {
    dismissDiscoverReveal();
    if (!root || !item) return null;
    const rarity = discoverRarity(item, itemId);
    const rMeta = RARITY_META[rarity] || RARITY_META.common;
    const isFirst = res?.isFirst !== false;
    const reduced = isReducedMotion();
    const totalMs = isFirst ? rMeta.duration : 420;
    const meta = KIND_META[item.kind] || KIND_META.look;
    const react = sheepReaction(item, sheep);
    const thumb = shotUrl || fallbackThumbSVG(item);
    const chargeMs = rarity === 'legend' ? 1150 : rarity === 'rare' ? 620 : 320;
    const flipAt = !isFirst ? 90 : rarity === 'legend' ? 1750 : rarity === 'rare' ? 1080 : 680;
    const burstAt = rarity === 'legend' ? 1180 : rarity === 'rare' ? 760 : 0;
    const sparkCount = rarity === 'legend' ? 24 : rarity === 'rare' ? 14 : 8;

    const sparksHTML = Array.from({ length: sparkCount }, (_, i) => {
      const ang = (i / sparkCount) * Math.PI * 2;
      const dist = (rarity === 'legend' ? 136 : rarity === 'rare' ? 108 : 86) + (i % 3) * 26;
      const tx = Math.round(Math.cos(ang) * dist) + 'px';
      const ty = Math.round(Math.sin(ang) * dist) + 'px';
      const delay = ((i % 4) * 0.035).toFixed(2) + 's';
      return `<i class="discover-reveal-spark" style="--tx:${tx};--ty:${ty};--d:${delay}">${i % 2 ? '✦' : '★'}</i>`;
    }).join('');

    const titleCharsHTML = [...String(item.title || '')].map((ch, i) =>
      `<span class="reveal-char" style="--ci:${i}">${esc(ch)}</span>`).join('');
    const sheepSvg = window.Field?.sheepArt ? `<svg class="reveal-sheep-svg" viewBox="-42 -56 84 75" aria-hidden="true">${Field.sheepArt(sheep)}</svg>` : '<span class="reveal-sheep-svg">🐑</span>';
    const overlay = document.createElement('div');
    overlay.className = `discover-reveal rarity-${rarity}${reduced ? ' is-reduced' : ''}`;
    overlay.dataset.revealRarity = rarity;
    overlay.dataset.revealMode = isFirst ? 'first' : 'replay';
    overlay.dataset.revealDuration = String(totalMs);
    overlay.dataset.revealPhase = (reduced || !isFirst) ? 'front' : 'orb';
    overlay.dataset.frontStage = (reduced || !isFirst) ? 'details' : 'tada';
    overlay.style.setProperty('--charge-ms', chargeMs + 'ms');

    overlay.innerHTML = `
      <div class="discover-reveal-backdrop"></div>
      <div class="discover-reveal-rays"></div>
      <div class="discover-reveal-orb" data-reveal-orb></div>
      <div class="discover-reveal-burst" data-reveal-burst></div>
      <div class="discover-reveal-sparks" data-reveal-sparks>${sparksHTML}</div>
      <div class="discover-reveal-flash" data-reveal-flash></div>
      <div class="discover-reveal-stage" data-reveal-stage>
        <div class="discover-reveal-card" data-reveal-card>
          <div class="reveal-card-face reveal-card-back" data-reveal-back>
            <div class="reveal-charge-frame"></div>
            <div class="reveal-card-back-inner">
              ${cardBackEmblemSVG()}
              <p class="reveal-back-sub">ADVENT DISCOVERY</p>
              <h3 class="reveal-back-title">그 밤을 향하여</h3>
              <span class="discover-rarity-badge is-${rarity}">${esc(rMeta.label)}</span>
              <div class="reveal-charge-bar"><i></i></div>
            </div>
          </div>
          <div class="reveal-card-face reveal-card-front" data-reveal-front>
            <div class="reveal-holo-sheen"></div>
            <div class="reveal-front-top">
              <span class="reveal-kind-tag">${meta.icon} ${esc(meta.label)}</span>
              ${rarityBadgeHTML(rarity)}
            </div>
            <div class="reveal-art-frame">
              <img data-reveal-img src="${esc(thumb)}" alt="${esc(item.title)}">
              ${isFirst ? `<span class="reveal-new-ribbon">✨ 처음 발견${res?.oilBonus ? ' · 기름 +1' : ''}</span>` : ''}
            </div>
            <div class="reveal-front-body">
              <h3 class="reveal-front-title" data-reveal-title>${titleCharsHTML}</h3>
              <div class="reveal-front-details" data-reveal-details>
                <p class="reveal-front-fact" data-reveal-fact>${esc(item.fact)}</p>
                ${item.ref ? `<span class="reveal-front-ref" data-reveal-ref>📖 ${esc(Bible.full(item.ref))}</span>` : ''}
              </div>
            </div>
            <div class="reveal-sheep-row" data-reveal-sheep>
              <div class="reveal-sheep-avatar-wrap">
                ${sheepSvg}
                ${rarity === 'legend' ? '<span class="reveal-sheep-hearts" data-reveal-hearts>♥ ♥</span>' : ''}
              </div>
              <div class="reveal-sheep-bubble"><b>${esc(sheep?.name || '내 양')}</b>${esc(react.line)}</div>
            </div>
          </div>
        </div>
        <p class="discover-reveal-hint" data-reveal-hint>${(reduced || !isFirst) ? '화면을 톡 누르면 닫혀요' : '화면을 톡 누르면 바로 앞면으로'}</p>
      </div>`;

    root.appendChild(overlay);
    if (!shotUrl) {
      discoverThumbURL(itemId).then(url => {
        const img = overlay.querySelector('[data-reveal-img]');
        if (img && img.isConnected && url) img.src = url;
      });
    }

    const timers = [];
    const schedule = (fn, ms) => { const id = setTimeout(fn, ms); timers.push(id); return id; };
    let finishTimer = 0;

    function cleanup() {
      timers.forEach(clearTimeout);
      clearTimeout(finishTimer);
      overlay.remove();
    }
    activeRevealCleanup = cleanup;

    function scheduleFinish(ms) {
      clearTimeout(finishTimer);
      finishTimer = setTimeout(() => {
        if (overlay.dataset.revealHold === 'true') return;
        dismissDiscoverReveal();
      }, ms);
    }

    function showFrontFace(skipped = false) {
      timers.forEach(clearTimeout);
      timers.length = 0;
      overlay.dataset.revealPhase = 'front';
      if (skipped) overlay.dataset.revealSkipped = 'true';
      if (reduced || !isFirst) {
        overlay.dataset.frontStage = 'details';
        overlay.classList.remove('is-shaking', 'is-flashing', 'is-bursting', 'is-tada');
      } else {
        overlay.dataset.frontStage = 'tada';
        overlay.classList.remove('is-shaking', 'is-flashing', 'is-bursting', 'is-tada');
        void overlay.offsetWidth;
        overlay.classList.add('is-flashing', 'is-bursting', 'is-tada');
        schedule(() => {
          if (!overlay.isConnected || overlay.dataset.tadaHold === 'true') return;
          overlay.dataset.frontStage = 'details';
        }, 700);
      }
      const hintEl = overlay.querySelector('[data-reveal-hint]');
      if (hintEl) hintEl.textContent = '화면을 톡 누르면 계속 둘러봐요';
      Sound.sfx('revealFlip', rarity);
      vibrateDevice(rarity === 'legend' ? [25, 35, 45] : 16);
      const stayMs = skipped ? 950 : Math.max(1350, totalMs - flipAt);
      scheduleFinish(stayMs);
    }

    if (reduced || !isFirst) {
      Sound.sfx('revealFlip', rarity);
      scheduleFinish(totalMs);
    } else {
      // 1단계: 빛 구슬 상승 (0 ~ 0.4초)
      Sound.sfx('revealOrb', rarity);
      vibrateDevice(14);
      // 2단계: 첫 프레임(orb)이 그려진 뒤 카드 뒷면 회전 & 등급 테두리 차오름 (0.4초~)
      requestAnimationFrame(() => {
        if (!overlay.isConnected || overlay.dataset.revealPhase === 'front') return;
        schedule(() => {
          if (!overlay.isConnected || overlay.dataset.revealPhase === 'front') return;
          overlay.dataset.revealPhase = 'back';
          Sound.sfx('revealCharge', rarity);
          if (burstAt > 400) {
            schedule(() => {
              if (!overlay.isConnected || overlay.dataset.revealPhase === 'front') return;
              overlay.classList.add('is-bursting');
              if (rarity === 'legend') {
                overlay.classList.add('is-shaking', 'is-flashing');
                vibrateDevice([30, 45, 25, 45, 55]);
              } else {
                vibrateDevice([22, 40, 30]);
              }
            }, burstAt - 400);
          }
          // 3단계: 카드 앞면 뒤집기
          requestAnimationFrame(() => {
            if (!overlay.isConnected || overlay.dataset.revealPhase === 'front') return;
            schedule(() => {
              if (!overlay.isConnected || overlay.dataset.revealPhase === 'front') return;
              showFrontFace(false);
            }, Math.max(200, flipAt - 400));
          });
        }, 400);
      });
      scheduleFinish(totalMs + 900);
    }

    overlay.addEventListener('click', e => {
      // 하단 도킹 카드의 [계속 둘러보기]나 다이얼로그 닫기 버튼 위치 클릭 시 즉시 전달
      for (const sel of ['[data-close-inspect]', '[data-open-nb]', '[data-retouch]', 'dialog[open] [data-continue]', 'dialog[open] [data-try-cancel]']) {
        const targetBtn = document.querySelector(sel);
        if (targetBtn) {
          const r = targetBtn.getBoundingClientRect();
          if (r.width > 0 && e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) {
            dismissDiscoverReveal();
            targetBtn.click();
            return;
          }
        }
      }
      if (overlay.dataset.revealPhase !== 'front') {
        showFrontFace(true);
      } else {
        dismissDiscoverReveal();
      }
    });

    return overlay;
  }

  function openNotebook(root, sheep, placeId = null) {
    ensureV68Styles();
    const log = progress(), seen = log.discoveries || {}, day = date();
    const all = window.DISCOVERIES || {}, themes = window.DISCOVER_THEMES || [];
    const allKeys = Object.keys(all);
    const total = allKeys.length, found = Object.keys(seen).filter(k => all[k]).length;
    const legendKeys = allKeys.filter(k => discoverRarity(all[k], k) === 'legend');
    const rareKeys = allKeys.filter(k => discoverRarity(all[k], k) === 'rare');
    const legendFound = legendKeys.filter(k => seen[k]).length;
    const rareFound = rareKeys.filter(k => seen[k]).length;
    const siteStats = visitedSiteStats(log);
    const oilUsed = log.discoverOil?.date === day ? log.discoverOil.count : 0;
    const friendQuotaUsed = () => log.friendCodeDay?.date === day ? (log.friendCodeDay.count || 0) : 0;
    const hasPlace = !!(placeId && window.EXPLORE[placeId]?.discover);
    let tab = hasPlace ? 'place' : 'themes';

    function cardHTML(itemId, entry = null) {
      const item = all[itemId];
      if (!item) return '';
      const rarity = discoverRarity(item, itemId);
      if (!seen[itemId]) {
        const meta = KIND_META[item.kind] || KIND_META.look;
        const area = placeId && window.EXPLORE[placeId];
        const zone = area?.adventure?.crossings.filter(([, z]) => entry?.pos[1] < z).length;
        const hint = entry?.indoor ? (entry.house ? entry.house + ' 안' : '집 안') : entry && area
          ? (area.adventure?.zones[zone] || (entry.pos[1] < 0 ? area.title + ' 안쪽' : area.title + ' 입구')) + ' 근처' : '';
        const friendPlaceId = log.friendHints?.[itemId];
        const friendPlace = friendPlaceId && window.EXPLORE[friendPlaceId]?.title;
        return `<article class="notebook-card locked${friendPlace ? ' has-friend-hint' : ''}" data-locked-item="${esc(itemId)}" data-rarity="${rarity}">🔒 아직 만나지 못한 발견 · ${meta.icon} ${meta.label} ${rarityBadgeHTML(rarity)}${hint ? `<small class="notebook-hint">${esc(hint)}</small>` : ''}${friendPlace ? `<small class="notebook-friend-hint" data-friend-hint="${esc(itemId)}">🤝 친구가 먼저 찾았어: ${esc(friendPlace)}</small>` : ''}</article>`;
      }
      const meta = KIND_META[item.kind] || KIND_META.look;
      const react = sheepReaction(item, sheep);
      const shareCode = encodeDiscoverCode(itemId);
      return `<article class="notebook-card rarity-${rarity}" data-note-item="${esc(itemId)}" data-rarity="${rarity}">
        <img class="notebook-thumb" data-note-thumb="${esc(itemId)}" src="${esc(fallbackThumbSVG(item))}" alt="${esc(item.title)}">
        <div class="notebook-body">
          <h4>${meta.icon} ${esc(item.title)} ${rarityBadgeHTML(rarity)}</h4>
          <p>${esc(item.fact)}</p>
          ${item.ref ? `<div class="notebook-verse">📖 ${esc(Bible.full(item.ref))}</div>` : ''}
          <div class="notebook-sheep">🐑 <b>${esc(sheep?.name || '내 양')}</b>: ${esc(react.line)}</div>
          <div class="notebook-code-bar">
            <span>🤝 나눔 코드 <b data-share-code="${esc(itemId)}">${esc(shareCode)}</b></span>
            <button type="button" class="notebook-code-copy" data-copy-code="${esc(shareCode)}">코드 복사</button>
          </div>
          <button type="button" class="notebook-share-btn" data-share-note="${esc(itemId)}">📤 오늘 알게 된 것 카드 · ${esc(shareCode)}</button>
        </div>
      </article>`;
    }

    function bodyHTML() {
      if (tab.startsWith('region-')) {
        const index = Number(tab.slice(7));
        const { ids, found, title, badge, done } = regionCollection(index, log);
        return `<section class="notebook-theme" data-region-collection="${index}">
          <div class="notebook-theme-head"><h3>📍 ${esc(title)}</h3><span>${found}/${ids.length}</span></div>
          <p class="notebook-theme-reward${done ? ' done' : ''}">${done ? '✓ 칭호 획득' : '다 모으면 받을 칭호'} · ${esc(badge)}</p>
          ${done ? `<button type="button" class="btn ghost" data-region-card="${index}">📷 전경 카드 저장</button>` : ''}
          <div class="notebook-grid">${ids.map(id => cardHTML(id)).join('')}</div>
        </section>`;
      }
      if (tab === 'place' && hasPlace) {
        const spec = window.EXPLORE[placeId].discover;
        const dc = discoverCount(placeId, log);
        return `<section class="notebook-theme">
          <div class="notebook-theme-head"><h3>🧭 ${esc(window.EXPLORE[placeId].title)}</h3><span>${dc.n}/${dc.max}</span></div>
          <div class="notebook-grid">${spec.items.map(entry => cardHTML(entry.id, entry)).join('')}</div>
        </section>`;
      }
      return themes.map(theme => {
        const ids = Object.keys(all).filter(k => all[k].theme === theme.id);
        const got = ids.filter(k => seen[k]).length;
        const done = got >= ids.length && ids.length > 0;
        return `<section class="notebook-theme">
          <div class="notebook-theme-head"><h3>${theme.icon} ${esc(theme.name)}</h3><span>${got}/${ids.length}</span></div>
          <p class="notebook-theme-reward${done ? ' done' : ''}">${done ? `✓ 칭호 획득: ${esc(theme.badge)} · 🎁 ${esc(theme.item)}` : `다 모으면 칭호 「${esc(theme.badge)}」 · 🎁 ${esc(theme.item)}`}</p>
          <div class="notebook-grid">${ids.map(key => cardHTML(key)).join('')}</div>
        </section>`;
      }).join('');
    }

    const dialog = Field.showSheet(root, '📓 발견 노트', `<div class="notebook-head-bar">
      <span>모은 발견 <b>${found}/${total}</b></span>
      <span>오늘 발견 기름 ${Math.min(5, oilUsed)}/5</span>
    </div>
    <div class="notebook-rarity-bar">
      <span data-notebook-rarity>전설 <b>${legendFound}/${legendKeys.length}</b> · 희귀 <b>${rareFound}/${rareKeys.length}</b></span>
      <span data-notebook-sites>가 본 곳 <b>${siteStats.visited}/${siteStats.total}</b></span>
    </div>
    <div class="notebook-friend-box">
      <div class="notebook-friend-top">
        <button type="button" class="notebook-friend-toggle" data-friend-code-toggle>🤝 친구 코드 넣기</button>
        <span class="notebook-friend-quota" data-friend-code-quota>오늘 남은 힌트 ${Math.max(0, 3 - friendQuotaUsed())}/3</span>
      </div>
      <div class="notebook-friend-form" data-friend-code-form hidden>
        <input type="text" class="notebook-friend-input" data-friend-code-input maxlength="8" placeholder="나눔 코드 (예: GB...)" autocomplete="off">
        <button type="button" class="notebook-friend-submit" data-friend-code-submit>확인</button>
      </div>
      <p class="notebook-friend-msg" data-friend-code-msg hidden></p>
    </div>
    <div class="notebook-tabs notebook-regions">
      ${hasPlace ? '<button type="button" data-nb-tab="place" class="active">이 장소</button>' : ''}
      <button type="button" data-nb-tab="themes"${hasPlace ? '' : ' class="active"'}>주제별 (6)</button>
      ${regions.map((title, index) => `<button type="button" data-nb-tab="region-${index}">${esc(title)}</button>`).join('')}
    </div>
    <div data-nb-content>${bodyHTML()}</div>
    <button type="button" class="btn" data-continue>닫기</button>`, 'discover-notebook-dialog');

    async function copyShareCode(code, btn) {
      let copied = false;
      try {
        if (window.Note?.copyText) copied = await window.Note.copyText(code);
        else if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(code); copied = true; }
      } catch { copied = false; }
      if (btn) {
        const old = btn.textContent;
        btn.textContent = copied ? '복사됨 ✓' : code;
        setTimeout(() => { if (btn.isConnected) btn.textContent = old; }, 1600);
      }
      window.Player?.toast?.(`나눔 코드 ${code} 복사 완료!`);
    }

    function hydrate() {
      dialog.querySelector('[data-region-card]')?.addEventListener('click', async event => {
        const button = event.currentTarget, index = Number(button.dataset.regionCard);
        const collection = regionCollection(index, log);
        if (!collection.done) return;
        button.disabled = true;
        let view = session?.view;
        if (!view || session.room || regionForSite(siteKey(session.id)) !== index) {
          await enter(collection.rep);
          view = session?.view;
        }
        const host = document.querySelector('#app main');
        const image = view?.panorama();
        if (!image) {
          Field.showSheet(host, collection.title, '<p class="discover-fact">전경을 찍으려면 3D 탐험을 열어 줘.</p>');
          return;
        }
        Fame.checkNew();
        Field.showCard(host, collection.title + ' 전경 카드',
          () => Card.drawRegionPanorama(collection, image, collection.ids.map(id => all[id].title)),
          'REGION-' + index, collection.title + ' 전경과 발견 목록');
      });
      dialog.querySelectorAll('img[data-note-thumb]').forEach(img => {
        const key = img.dataset.noteThumb;
        discoverThumbURL(key).then(url => { if (img.isConnected && url) img.src = url; });
      });
      dialog.querySelectorAll('[data-copy-code]').forEach(btn => btn.onclick = () => copyShareCode(btn.dataset.copyCode, btn));
      dialog.querySelectorAll('[data-share-note]').forEach(btn => btn.onclick = async () => {
        const key = btn.dataset.shareNote, item = all[key];
        const shareCode = encodeDiscoverCode(key);
        const thumb = await discoverThumbURL(key);
        const react = sheepReaction(item, sheep);
        dialog.close(); dialog.remove();
        const cardModal = Field.showCard(root, `오늘 알게 된 것 · 코드 ${shareCode}`, () => Card.drawDiscoverNote(item, sheep, thumb, react.line, shareCode),
          'DISCOVER-' + key, item.title, `오늘 알게 된 것 · ${item.title}: ${item.fact} (나눔 코드: ${shareCode})`);
        if (cardModal) {
          const codeBar = document.createElement('div');
          codeBar.className = 'notebook-code-bar';
          codeBar.style.margin = '8px 0 10px';
          codeBar.innerHTML = `<span>🤝 친구와 발견 나누기 코드 <b>${esc(shareCode)}</b></span><button type="button" class="notebook-code-copy" data-modal-copy="${esc(shareCode)}">코드 복사</button>`;
          const firstBtn = cardModal.querySelector('button.btn');
          if (firstBtn) firstBtn.before(codeBar);
          else cardModal.appendChild(codeBar);
          codeBar.querySelector('[data-modal-copy]')?.addEventListener('click', e => copyShareCode(shareCode, e.currentTarget));
        }
      });
    }
    hydrate();

    const toggleBtn = dialog.querySelector('[data-friend-code-toggle]');
    const formEl = dialog.querySelector('[data-friend-code-form]');
    const inputEl = dialog.querySelector('[data-friend-code-input]');
    const submitBtn = dialog.querySelector('[data-friend-code-submit]');
    const msgEl = dialog.querySelector('[data-friend-code-msg]');
    const quotaEl = dialog.querySelector('[data-friend-code-quota]');

    function showFriendMsg(text) {
      if (!msgEl) return;
      msgEl.textContent = text;
      msgEl.hidden = !text;
    }

    toggleBtn?.addEventListener('click', () => {
      formEl.hidden = !formEl.hidden;
      if (!formEl.hidden) inputEl?.focus();
    });

    function submitFriendCode() {
      const raw = inputEl?.value?.trim() || '';
      if (!raw) return showFriendMsg('친구에게 받은 나눔 코드를 입력해 줘.');
      const targetId = decodeDiscoverCode(raw);
      if (!targetId || !all[targetId]) {
        Sound.sfx('boop');
        return showFriendMsg('없는 나눔 코드야. 카톡이나 카드에 적힌 코드를 확인해 봐.');
      }
      if (seen[targetId]) {
        return showFriendMsg(`이미 내가 찾은 발견이야! (${all[targetId].title})`);
      }
      if (log.friendHints[targetId]) {
        const pTitle = window.EXPLORE[log.friendHints[targetId]]?.title || '';
        return showFriendMsg(`이미 힌트를 받았어 · 🤝 친구가 먼저 찾았어: ${pTitle}`);
      }
      if (friendQuotaUsed() >= 3) {
        Sound.sfx('boop');
        return showFriendMsg('오늘 친구 코드는 3개까지 넣을 수 있어. 내일 또 넣어 봐!');
      }
      if (log.friendCodeDay.date !== day) log.friendCodeDay = { date: day, count: 0 };
      log.friendCodeDay.count++;
      const hintPlaceId = placeForDiscovery(targetId);
      log.friendHints[targetId] = hintPlaceId;
      Core.save();
      Sound.sfx('gem');
      const hintPlaceTitle = window.EXPLORE[hintPlaceId]?.title || hintPlaceId;
      if (quotaEl) quotaEl.textContent = `오늘 남은 힌트 ${Math.max(0, 3 - friendQuotaUsed())}/3`;
      if (tab === 'place' && hasPlace && !window.EXPLORE[placeId].discover.items.some(e => e.id === targetId)) {
        tab = 'themes';
        dialog.querySelectorAll('[data-nb-tab]').forEach(b => b.classList.toggle('active', b.dataset.nbTab === 'themes'));
      }
      dialog.querySelector('[data-nb-content]').innerHTML = bodyHTML();
      hydrate();
      showFriendMsg(`🤝 친구가 먼저 찾았어: ${hintPlaceTitle} (그 장소에서 냄새 길잡이로 찾아봐!)`);
      const targetCard = dialog.querySelector(`[data-locked-item="${targetId}"]`);
      targetCard?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
      if (inputEl) inputEl.value = '';
    }

    submitBtn?.addEventListener('click', submitFriendCode);
    inputEl?.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); submitFriendCode(); } });

    dialog.querySelectorAll('[data-nb-tab]').forEach(btn => btn.onclick = () => {
      tab = btn.dataset.nbTab;
      dialog.querySelectorAll('[data-nb-tab]').forEach(b => b.classList.toggle('active', b === btn));
      dialog.querySelector('[data-nb-content]').innerHTML = bodyHTML();
      hydrate();
    });
    dialog.querySelector('[data-continue]').onclick = () => { dialog.close(); dialog.remove(); };
    return dialog;
  }

  function runTryExperience({ root, item, sheep, flat, onComplete, onClose }) {
    const mode = item.tryMode || 'spin';
    const grain = item.prop === 'grain' || item.prop === 'winnow';
    const react = sheepReaction(item, sheep);
    let pct = 0, finished = false, holdRaf = 0, holding = false, lastHold = 0;

    function stageMarkup() {
      if (mode === 'spin') {
        const cls = item.prop === 'olivepress' ? ' is-olive' : item.prop === 'loom' ? ' is-loom' : '';
        return `<div class="try-wheel${cls}" data-wheel><div class="try-wheel-core"></div><div class="try-wheel-knob"></div></div>`;
      }
      if (mode === 'pull') {
        return `<div class="try-pull-well" data-pull><div class="try-rope"></div><div class="try-bucket" data-bucket>🪣</div></div>`;
      }
      if (mode === 'rub') {
        return `<div class="try-plank" data-rub><div class="try-plane-tool" data-plane>🪵</div><span>나무 위를 좌우로 문질러 봐</span></div>`;
      }
      if (mode === 'hold') {
        return `<button type="button" class="try-hold-btn" data-hold><i>🌿</i><span>길게 누르기</span></button>`;
      }
      if (mode === 'tap') {
        if (grain) return `<div class="try-grain-tray"><button type="button" class="try-dough" data-dough><span aria-hidden="true">🌾</span>${esc(item.tryBtn)}</button></div>`;
        return '<div class="try-oven-wrap"><button type="button" class="try-dough" data-dough>반죽 톡톡</button></div>';
      }
      if (mode === 'wrap') {
        return `<div class="try-wrap-pad" data-wrap><div class="try-wrap-bundle" data-bundle>강보 감기</div></div>`;
      }
      if (mode === 'order') {
        return `<div class="try-order-row">
          <button type="button" class="try-order-btn" data-ord="0"><i>🫒</i><span>1. 기름 붓기</span></button>
          <button type="button" class="try-order-btn" data-ord="1"><i>🧵</i><span>2. 심지 놓기</span></button>
          <button type="button" class="try-order-btn" data-ord="2"><i>🔥</i><span>3. 불 붙이기</span></button>
        </div>`;
      }
      return `<div class="try-stomp-row">
        <button type="button" class="try-foot-btn next" data-foot="0"><i>🦶</i><span>왼발</span></button>
        <button type="button" class="try-foot-btn" data-foot="1"><i>🦶</i><span>오른발</span></button>
      </div>`;
    }

    const dialog = Field.showSheet(root, `🛠 ${item.title}`, `<div class="discover-try-body" data-try-body>
      <p class="try-hint" data-try-hint>${esc(item.tryPrompt || '손가락으로 체험해 봐!')}</p>
      <div class="try-meter"><i data-try-bar></i></div>
      <div class="try-stage" data-try-stage>${stageMarkup()}</div>
      <div class="discover-sheep-box"><i>🐑</i><span><b>${esc(sheep.name)}</b>${esc(react.line)}</span></div>
      <button type="button" class="btn ghost try-fallback-btn" data-try-step>${esc(item.tryBtn || '체험 진행하기')}</button>
      <button type="button" class="link" data-try-cancel style="display:block;margin:6px auto 0">그만하기</button>
    </div>`, 'discover-try-dialog', () => { cancelAnimationFrame(holdRaf); onClose?.(); });

    const body = dialog.querySelector('[data-try-body]');
    const bar = dialog.querySelector('[data-try-bar]');
    const hint = dialog.querySelector('[data-try-hint]');

    function setProgress(next, sfx = 'tap') {
      if (finished) return;
      pct = Math.min(100, Math.max(0, next));
      if (bar) bar.style.width = pct + '%';
      if (sfx) Sound.sfx(sfx);
      if (pct >= 100) {
        finished = true;
        cancelAnimationFrame(holdRaf);
        const res = onComplete?.() || {};
        body.innerHTML = `
          ${item.bag ? `<div class="try-bag-reward"><i>${item.bag.icon}</i><span>가방에 담았어 · ${esc(item.bag.name)}</span></div>` : ''}
          ${res.isFirst ? `<span class="discover-pill is-new">✨ 처음 발견${res.oilBonus ? ' · 기름 +1' : ''}</span>` : ''}
          <p class="discover-fact">${esc(item.fact)}</p>
          ${item.ref ? Field.wordMarkup(item.ref) : ''}
          <div class="discover-sheep-box"><i>🐑</i><span><b>${esc(sheep.name)}</b>${esc(react.line)}</span></div>
          <button type="button" class="btn" data-continue>가방에 담고 돌아가기</button>`;
        body.querySelector('[data-continue]').onclick = () => { dialog.close(); dialog.remove(); onClose?.(); };
      }
    }

    dialog.querySelector('[data-try-cancel]').onclick = () => { dialog.close(); dialog.remove(); onClose?.(); };

    // 1) 돌리기 (spin)
    if (mode === 'spin') {
      const wheel = dialog.querySelector('[data-wheel]');
      let angle = 0, lastAngle = null, drag = false, tickAcc = 0;
      const getAng = e => {
        const r = wheel.getBoundingClientRect();
        return Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2));
      };
      wheel.onpointerdown = e => { wheel.setPointerCapture?.(e.pointerId); drag = true; lastAngle = getAng(e); };
      wheel.onpointermove = e => {
        if (!drag || finished) return;
        const a = getAng(e);
        let d = a - lastAngle;
        if (d > Math.PI) d -= Math.PI * 2;
        if (d < -Math.PI) d += Math.PI * 2;
        lastAngle = a;
        angle += d;
        wheel.style.transform = `rotate(${(angle * 180 / Math.PI).toFixed(1)}deg)`;
        tickAcc += Math.abs(d);
        const step = Math.abs(d) * 5.2;
        if (tickAcc > 1.35) { tickAcc = 0; setProgress(pct + step, 'grind'); }
        else setProgress(pct + step, null);
      };
      wheel.onpointerup = wheel.onpointercancel = () => { drag = false; };
      dialog.querySelector('[data-try-step]').onclick = () => {
        angle += Math.PI * 0.65;
        wheel.style.transform = `rotate(${(angle * 180 / Math.PI).toFixed(1)}deg)`;
        setProgress(pct + 25, 'grind');
      };
    }

    // 2) 당기기 (pull)
    if (mode === 'pull') {
      const pad = dialog.querySelector('[data-pull]'), bucket = dialog.querySelector('[data-bucket]');
      let startY = null;
      const updateBucket = p => { bucket.style.bottom = (16 + p * 1.25) + 'px'; };
      pad.onpointerdown = e => { pad.setPointerCapture?.(e.pointerId); startY = e.clientY; };
      pad.onpointermove = e => {
        if (startY == null || finished) return;
        const dy = e.clientY - startY;
        if (dy >= 42) {
          startY = e.clientY;
          updateBucket(Math.min(100, pct + 20));
          setProgress(pct + 20, 'oil');
        }
      };
      pad.onpointerup = pad.onpointercancel = () => { startY = null; };
      dialog.querySelector('[data-try-step]').onclick = () => {
        updateBucket(Math.min(100, pct + 25));
        setProgress(pct + 25, 'oil');
      };
    }

    // 3) 문지르기 (rub)
    if (mode === 'rub') {
      const plank = dialog.querySelector('[data-rub]'), plane = dialog.querySelector('[data-plane]');
      let lastX = null, acc = 0;
      plank.onpointerdown = e => { plank.setPointerCapture?.(e.pointerId); lastX = e.clientX; };
      plank.onpointermove = e => {
        if (lastX == null || finished) return;
        const r = plank.getBoundingClientRect();
        const xPct = Math.max(4, Math.min(78, ((e.clientX - r.left) / r.width) * 82));
        plane.style.left = xPct + '%';
        const dx = Math.abs(e.clientX - lastX);
        lastX = e.clientX;
        acc += dx;
        if (acc >= 38) { acc = 0; setProgress(pct + 12.5, 'plane'); }
      };
      plank.onpointerup = plank.onpointercancel = () => { lastX = null; };
      dialog.querySelector('[data-try-step]').onclick = () => {
        plane.style.left = ((pct % 50) + 18) + '%';
        setProgress(pct + 25, 'plane');
      };
    }

    // 4) 길게 누르기 (hold)
    if (mode === 'hold') {
      const btn = dialog.querySelector('[data-hold]');
      const loop = now => {
        if (!holding || finished) return;
        const dt = Math.min(80, now - lastHold);
        lastHold = now;
        setProgress(pct + dt * 0.036, null);
        if (!finished) holdRaf = requestAnimationFrame(loop);
      };
      btn.onpointerdown = e => {
        btn.setPointerCapture?.(e.pointerId);
        holding = true; lastHold = performance.now();
        btn.classList.add('holding');
        Sound.sfx('ignite');
        holdRaf = requestAnimationFrame(loop);
      };
      btn.onpointerup = btn.onpointercancel = () => { holding = false; btn.classList.remove('holding'); cancelAnimationFrame(holdRaf); };
      dialog.querySelector('[data-try-step]').onclick = () => setProgress(pct + 25, 'ignite');
    }

    // 5) 톡톡 (tap)
    if (mode === 'tap') {
      const dough = dialog.querySelector('[data-dough]');
      let taps = 0;
      const labels = ['반죽 펴기 톡!', '납작하게 톡!', '화덕 벽에 착!', '익는 중… 톡!', '노릇하게 뒤집기!', '완성!'];
      const doTap = () => {
        taps++;
        if (grain) {
          dough.textContent = taps < 5 ? `${item.tryBtn} ${taps}/5` : '완성!';
          setProgress(taps * 20, 'pop');
          return;
        }
        dough.textContent = labels[Math.min(taps, labels.length - 1)];
        dough.style.transform = `scale(${1 + Math.min(taps, 3) * 0.08}, ${1 - Math.min(taps, 2) * 0.04})`;
        if (taps >= 3) dough.classList.add('baked');
        setProgress(taps * 20, taps >= 3 ? 'ignite' : 'pop');
      };
      dough.onclick = doTap;
      dialog.querySelector('[data-try-step]').onclick = doTap;
    }

    // 6) 감기 (wrap)
    if (mode === 'wrap') {
      const pad = dialog.querySelector('[data-wrap]'), bundle = dialog.querySelector('[data-bundle]');
      let startX = null, wraps = 0;
      const doWrap = () => {
        wraps++;
        bundle.style.transform = `rotate(${wraps % 2 ? -5 : 5}deg) scale(${1 + wraps * 0.03})`;
        bundle.textContent = wraps >= 4 ? '단단히 감김!' : `천 감기 ${wraps}/4`;
        setProgress(wraps * 25, 'knit');
      };
      pad.onpointerdown = e => { pad.setPointerCapture?.(e.pointerId); startX = e.clientX; };
      pad.onpointermove = e => {
        if (startX == null || finished) return;
        if (Math.abs(e.clientX - startX) >= 48) { startX = e.clientX; doWrap(); }
      };
      pad.onpointerup = pad.onpointercancel = () => { startX = null; };
      dialog.querySelector('[data-try-step]').onclick = doWrap;
    }

    // 7) 순서 누르기 (order)
    if (mode === 'order') {
      let stepIdx = 0;
      const btns = [...dialog.querySelectorAll('[data-ord]')];
      const hints = ['먼저 올리브기름부터 부어 볼까?', '이제 심지를 끼워 봐!', '마지막으로 불을 붙여 봐!'];
      const press = i => {
        if (finished) return;
        if (i !== stepIdx) { Sound.sfx('boop'); hint.textContent = hints[stepIdx]; return; }
        btns[i].classList.add('done');
        stepIdx++;
        if (stepIdx < hints.length) hint.textContent = hints[stepIdx];
        setProgress(Math.round(stepIdx / 3 * 100), stepIdx === 3 ? 'ignite' : 'oil');
      };
      btns.forEach((b, i) => b.onclick = () => press(i));
      dialog.querySelector('[data-try-step]').onclick = () => press(stepIdx);
    }

    // 8) 밟기 (stomp)
    if (mode === 'stomp') {
      let expect = 0, stomps = 0;
      const feet = [...dialog.querySelectorAll('[data-foot]')];
      const pressFoot = side => {
        if (finished) return;
        if (side !== expect) { Sound.sfx('tap'); return; }
        stomps++;
        expect = 1 - expect;
        feet.forEach((f, idx) => f.classList.toggle('next', idx === expect));
        setProgress(stomps * 12.5, 'thump');
      };
      feet.forEach((f, idx) => f.onclick = () => pressFoot(idx));
      dialog.querySelector('[data-try-step]').onclick = () => pressFoot(expect);
    }
    return dialog;
  }

  function createDiscovery(context) {
    const { id, area, day, log, root, sheep, record, card, feedback, grant, refresh, getView, isFlat, currentLine, say,
      houses, getRoom, changeRoom, region } = context;
    const spec = area.discover, catalog = window.DISCOVERIES || {};
    const adv = area.adventure || {
      zones: [area.title], ambience: [{ stable: '마구간', well: '모험 우물', field: '모험 산길',
        nazareth: '모험 뜰', gate: '모험 장터', inn: '모험 뜰' }[area.kit] || '모험 산길'],
      spawn: [0, 6.2], targets: Object.fromEntries(area.markers.map(marker => [marker.id, marker]))
    };
    const { zones } = adv;
    const zoneText = root.querySelector('[data-zone]');
    const countEl = root.querySelector('[data-discover-count]');
    const compass = root.querySelector('[data-scent-compass]');
    const newEl = root.querySelector('[data-discover-new]');
    const nearbyBtn = root.querySelector('[data-nearby]');
    const inspectBox = root.querySelector('[data-inspect]');
    const bagButton = root.querySelector('[data-bag]');
    const nbButton = root.querySelector('[data-notebook]');
    const next = root.querySelector('[data-field-next]');
    let zone = -1, restoredView, activeInspectId = null, nearbyMarker = null;
    let scent = null, scentTimer, lastSniff = -Infinity;
    const nextHintDelay = () => (60 + Math.random() * 60) * 1000;
    let nextHint = performance.now() + nextHintDelay();

    const slots = [[-2.1, 2.75], [2.1, 2.6], [-3.55, .65], [3.55, .8], [-3.6, -1.8],
      [3.6, -1.65], [-1.85, -3.55], [1.85, -3.65], [-3.9, -3.25], [3.9, -3.25]];
    const places = region?.sites.filter(site => site.area?.discover) || [{
      episode: id, primary: true, area, houses, translate: pos => pos, markerId: key => key
    }];
    const sources = region?.sources || places.map(site => ({ site, taggedOnly: false }));
    const placed = new Set(), roomCount = new Map();
    const entries = [...sources].sort((a, b) => Number(!!b.site.primary) - Number(!!a.site.primary)).flatMap(({ site, taggedOnly }) => {
      const { episode } = site;
      return site.area.discover.items.flatMap(entry => {
        if (taggedOnly && !entry.site) return [];
        const location = entry.site ? region?.sites.find(point => point.key === entry.site) : site;
        if (!location || entry.site && !location.extension && !location.area) return [];
        const key = site.markerId(entry.residentKey || ('disc/' + entry.id));
        const placement = location.key + '/' + entry.id;
        if (entry.site && placed.has(placement)) return [];
        if (entry.site) placed.add(placement);
        const houses = location.houses;
        if (!entry.indoor || !houses.length) return [{ ...entry, site, location, episode, key, pos: location.translate(entry.pos) }];
        const house = houses.find(h => h.id === entry.houseDoor || h.title === entry.house) || houses[0];
        const count = roomCount.get(house.id) || 0;
        roomCount.set(house.id, count + 1);
        return [{ ...entry, site, location, episode, key, room: house, pos: slots[count] }];
      });
    });
    let activeSite = region?.main, noticedFlock = false, noticedOven = false;
    const localEntries = () => {
      const room = getRoom();
      if (room?.id === 'house/lower-town') return entries.filter(entry => entry.room === room);
      if (activeSite?.extension && !room) return entries.filter(entry => entry.location === activeSite);
      return entries.filter(entry => entry.episode === (room?.episode || activeSite?.episode || id));
    };

    const here = () => getView()?.position() || adv.spawn;
    const proximity = pos => Math.hypot(here()[0] - pos[0], here()[1] - pos[1]);
    const isUnlocked = (kind, episode = activeSite?.episode || id) => !!log.discoverUnlock[episode + '/' + kind];
    const doneFound = key => log.found[foundKey(id, key)];
    const templeAmbience = site => {
      if (site?.key === 'temple' || site?.key === 'sanctuary') return id === '1-0' || area.layout.time === 'night' ? '탐험 밤의 성전' : '탐험 성전 뜰';
      if (id === '1-0' && ['outer-court', 'south-steps'].includes(site?.key)) return '탐험 밤의 성전';
      return null;
    };

    function soundZone(index) {
      const room = getRoom();
      if (room) {
        zone = -1;
        if (zoneText) zoneText.textContent = room.title + ' 안';
        Sound.ambience(room.style === 'stable' ? '마구간' : '집안');
        return;
      }
      if (index === zone) return;
      zone = index;
      if (zoneText) zoneText.textContent = zones[zone];
      Sound.ambience(templeAmbience(activeSite || region?.main) || adv.ambience[zone]);
    }
    soundZone(0);

    function closeInspect() {
      dismissDiscoverReveal();
      if (!activeInspectId && inspectBox.hidden) return;
      activeInspectId = null;
      inspectBox.hidden = true;
      inspectBox.innerHTML = '';
      inspectBox.className = 'discover-inspect';
      root.classList.remove('is-inspecting');
      getView()?.endInspect?.();
    }

    let zoneBannerTimer = 0, mapLitTimer = 0, zoneNarrationTimer = 0;
    function showZoneDiscoverBanner(site) {
      if (!site || !site.key) return;
      const isNewSite = !log.visitedSites[site.key];
      log.visitedSites[site.key] = log.visitedSites[site.key] || day;
      if (region) {
        const cell = Math.floor(site.x / regionCell) + ',' + Math.floor(site.z / regionCell);
        if (!region.visited.has(cell)) {
          region.visited.add(cell);
          log.regionWalk[region.index] = [...region.visited];
        }
        region.newlyLit = site.key;
      }
      Core.save();
      if (!isNewSite) return;
      Sound.sfx('zoneDiscover');
      const placeNarr = root.querySelector('[data-narr-caption]');
      if (placeNarr) placeNarr.hidden = true;
      const banner = root.querySelector('[data-zone-banner]');
      const zoneBtn = root.querySelector('[data-quest-map]');
      if (zoneBtn) {
        zoneBtn.classList.add('is-newly-lit');
        clearTimeout(mapLitTimer);
        mapLitTimer = setTimeout(() => zoneBtn.classList.remove('is-newly-lit'), 2200);
      }
      if (!banner) return;
      clearTimeout(zoneBannerTimer);
      banner.classList.toggle('is-flat-banner', !!isFlat());
      banner.dataset.discoveredSite = site.key;
      banner.innerHTML = `<span class="zone-banner-line"></span><strong class="zone-banner-text" data-zone-banner-text>📍 새 장소 발견 — ${esc(site.name)}</strong><span class="zone-banner-line"></span>`;
      banner.hidden = false;
      const line = window.EXPLORE_ZONE_NARRATION?.[site.key];
      const caption = root.querySelector('[data-zone-narration]');
      clearTimeout(zoneNarrationTimer);
      if (caption) {
        caption.hidden = !line;
        caption.textContent = line || '';
        if (line) {
          zoneNarrationTimer = setTimeout(() => { caption.hidden = true; }, 4700);
          if (Sound.on) void Sound.voice('zone-' + site.key);
        }
      }
      zoneBannerTimer = setTimeout(() => {
        if (banner.isConnected) banner.hidden = true;
      }, 1600);
    }
    if (region?.main) {
      log.visitedSites[region.main.key] ||= day;
      Core.save();
    }

    function recordDiscovery(entry, markerId) {
      const { id: itemId, episode } = entry;
      const item = catalog[itemId];
      if (!item) return { isFirst: false };
      const isFirst = !log.discoveries[itemId];
      let oilBonus = false, themeReward = null, shot = null;
      if (isFirst) {
        try { shot = getView()?.snapProp?.(markerId); } catch { /* 2D 또는 스냅숏 생략 */ }
        if (shot) void photoFile('discover', itemId, shot);
        log.discoveries[itemId] = { date: day, place: episode, thumb: !!shot };
        if (log.discoverOil.date !== day) log.discoverOil = { date: day, count: 0 };
        if (log.discoverOil.count < 5) {
          log.discoverOil.count++;
          grant({ oil: 1 });
          oilBonus = true;
        }
        const dc = discoverCount(episode, log);
        if (dc.n >= Math.min(2, window.EXPLORE[episode].discover.newIds.length || 2)) {
          Field.adventureHeart(record, day);
        }
        // 주제 완성 확인
        const theme = (window.DISCOVER_THEMES || []).find(t => t.id === item.theme);
        if (theme && !log.themeRewards[theme.id]) {
          const themeIds = Object.keys(catalog).filter(k => catalog[k].theme === theme.id);
          if (themeIds.length && themeIds.every(k => log.discoveries[k])) {
            log.themeRewards[theme.id] = day;
            const gotItem = grant({ item: theme.item });
            themeReward = { theme, gotItem };
          }
        }
        statusChanged();
        refresh();
      }
      return { isFirst, oilBonus, themeReward, shot };
    }

    function maybeShowThemeReward(res) {
      if (!res?.themeReward) return;
      const { theme, gotItem } = res.themeReward;
      Sound.sfx('badge');
      card(`${theme.icon} 「${theme.name}」 주제 완성!`, `칭호 「${theme.badge}」를 얻었어!`, {
        detail: gotItem ? `옷장 · ${gotItem}` : `칭호 · ${theme.badge}`,
        button: '좋아!'
      });
    }

    function openLookOrTouch(entry, item, markerId) {
      const react = sheepReaction(item, sheep);
      const view = getView();
      if (item.kind === 'look') {
        view?.inspect?.(markerId);
        Sound.sfx('verse');
      } else {
        view?.touchProp?.(markerId, item.anim || 'spark');
        const sfxMap = { trumpet: 'trumpet', sway: 'exploreBell', scribe: 'plane', balance: 'oil', donkey: 'thump', doves: 'pop', pray: 'verse' };
        Sound.sfx(sfxMap[item.anim] || 'pop');
      }
      view?.sheepReact?.(react.mood, react.line);
      const res = recordDiscovery(entry, markerId);
      const rarity = discoverRarity(item, entry.id);
      activeInspectId = markerId;
      const meta = KIND_META[item.kind] || KIND_META.look;
      root.classList.add('is-inspecting');
      inspectBox.className = `discover-inspect rarity-${rarity}`;
      inspectBox.hidden = false;
      inspectBox.innerHTML = `<div class="discover-inspect-head">
          <h2>${meta.icon} ${esc(item.title)} ${rarityBadgeHTML(rarity)}</h2>
          <span class="discover-pill${res.isFirst ? ' is-new' : ''}">${res.isFirst ? `✨ 처음 발견${res.oilBonus ? ' · 기름 +1' : ''}` : meta.label}</span>
        </div>
        ${item.touchLine ? `<p class="discover-touch-line">${esc(item.touchLine)}</p>` : ''}
        <p class="discover-fact">${esc(item.fact)}</p>
        ${item.ref ? Field.wordMarkup(item.ref) : ''}
        <div class="discover-sheep-box"><i>🐑</i><span><b>${esc(sheep.name)}</b>${esc(react.line)}</span></div>
        <div class="discover-inspect-actions">
          ${item.kind === 'touch' ? '<button type="button" class="btn ghost" data-retouch>한 번 더 만져 보기</button>' : '<button type="button" class="btn ghost" data-open-nb>📓 발견 노트</button>'}
          <button type="button" class="btn" data-close-inspect>계속 둘러보기</button>
        </div>`;
      inspectBox.querySelector('[data-close-inspect]').onclick = () => { closeInspect(); maybeShowThemeReward(res); };
      inspectBox.querySelector('[data-open-nb]')?.addEventListener('click', () => { closeInspect(); openNotebook(root, sheep, id); });
      inspectBox.querySelector('[data-retouch]')?.addEventListener('click', () => {
        view?.touchProp?.(markerId, item.anim || 'spark');
        const sfxMap = { trumpet: 'trumpet', sway: 'exploreBell', scribe: 'plane', balance: 'oil', donkey: 'thump', doves: 'pop', pray: 'verse' };
        Sound.sfx(sfxMap[item.anim] || 'pop');
        view?.sheepReact?.(react.mood, react.line);
      });
      playDiscoverReveal({ root, item, itemId: entry.id, sheep, res, shotUrl: res.shot });
      feedback(`${sheep.name}: ${react.line}`);
      window.scrollTo(0, 0);
    }

    function openTry(entry, item, markerId) {
      closeInspect();
      const view = getView();
      view?.inspect?.(markerId);
      let res = null;
      runTryExperience({
        root, item, sheep, flat: isFlat(),
        onComplete() {
          if (item.bag) {
            const slot = log.discoverBag[item.bag.name] ||= { ...item.bag, count: 0 };
            slot.count++;
          }
          const react = sheepReaction(item, sheep);
          view?.touchProp?.(markerId, item.tryMode === 'spin' ? 'spin' : 'spark');
          view?.sheepReact?.(react.mood, react.line);
          Sound.sfx('mission');
          res = recordDiscovery(entry, markerId);
          playDiscoverReveal({ root, item, itemId: entry.id, sheep, res, shotUrl: res.shot });
          statusChanged(); refresh();
          feedback(`${sheep.name}: ${react.line}`);
          return res;
        },
        onClose() {
          dismissDiscoverReveal();
          view?.endInspect?.();
          if (res) maybeShowThemeReward(res);
        }
      });
    }

    function clearCompass() {
      clearTimeout(scentTimer);
      scent = null;
      compass.hidden = true;
    }
    function showCompass(now = performance.now()) {
      if (!scent) return;
      if (log.discoveries[scent.entry.id] || now >= scent.until) return clearCompass();
      const view = getView();
      const position = view?.position();
      if (position && now - scent.updated > 500 && Math.hypot(position[0] - scent.origin[0], position[1] - scent.origin[1]) > .26) {
        scent.route = view.routeInfo(scent.pos);
        scent.origin = position;
        scent.updated = now;
      }
      const info = scent.route;
      const direction = view ? view.scentAngle(info.facing) : 0;
      const meters = Math.max(1, Math.round(info.meters));
      compass.querySelector('i').style.transform = `rotate(${direction}rad)`;
      const caption = (scent.through === 'in' ? '집 안 ' : scent.through === 'out' ? '문 밖 ' : '') + meters + ' m';
      const distanceText = compass.querySelector('small');
      if (distanceText.textContent !== caption) distanceText.textContent = caption;
      compass.style.setProperty('--near-scent', Math.max(.48, Math.min(1, 1.12 - meters / 45)));
      compass.hidden = false;
    }
    function sniff() {
      const view = getView(), now = performance.now();
      const canReach = entry => {
        if (!entry.ability || entry.ability === 'smell' || isUnlocked(entry.ability, entry.episode)) return true;
        if (entry.ability === 'jump') return isFlat();
        const ability = ABILITIES.find(a => a.id === entry.ability);
        return ability && (Field.mainCare()?.sheep.level >= ability.level || ability.id === 'shine' && day >= '2026-12-20');
      };
      const unseen = localEntries().filter(entry => !log.discoveries[entry.id]);
      if (!unseen.length) { clearCompass(); return feedback('여긴 다 찾았어! 🌟'); }
      if (now - lastSniff < 4000) return feedback('잠깐 숨을 고르고 다시 냄새를 맡아 보자.');
      const room = getRoom();
      const candidates = unseen.filter(canReach).map(entry => {
        const through = entry.room === (room || undefined) ? null : room ? 'out' : 'in';
        const feature = !isUnlocked(entry.ability, entry.episode) && !room ? entry.site.area.adventure?.targets[entry.ability] : null;
        const pos = through === 'out' ? roomExitPos : through === 'in' ? entry.room.pos : feature?.feature ? entry.site.translate(feature.pos) : entry.pos;
        const route = view?.routeInfo(pos) || { meters: proximity(pos), reachable: true, facing: pos, path: [pos] };
        return { entry, through, pos, route };
      }).filter(x => x.route.reachable);
      const current = candidates.filter(x => !x.through);
      const pool = room && current.length ? current : candidates;
      const pick = pool.sort((a, b) => a.route.meters - b.route.meters)[0];
      if (!pick) return feedback('양이 더 자라면 닿을 수 있는 곳이 남았어.');
      lastSniff = now;
      log.sniffCount = (log.sniffCount || 0) + 1;
      if (pick.entry.hidden) log.discoverUnlock[pick.entry.episode + '/smell-' + pick.entry.id] = true;
      clearTimeout(scentTimer);
      scent = { ...pick, origin: here(), updated: now, until: now + 10000 };
      const angle = view ? view.scentAngle(pick.route.facing) : 0;
      const direction = Math.abs(angle) <= Math.PI / 4 ? '앞' :
        Math.abs(angle) >= Math.PI * .75 ? '뒤' : angle < 0 ? '왼쪽' : '오른쪽';
      const distance = pick.route.meters <= 7 ? '꽤 가까워' : '좀 멀어';
      const location = pick.through === 'in' ? '집 안에서' : pick.through === 'out' ? '문 밖에서' : direction + '쪽에서';
      const line = `킁킁… ${location} 냄새가 나. ${distance}.`;
      view?.showScent(pick.route.path, line);
      Sound.sfx('sheep');
      showCompass(now);
      scentTimer = setTimeout(clearCompass, 10000);
      statusChanged(); refresh(); feedback(line);
    }

    function sheepHint(now, view, pos) {
      if (now < nextHint || view.moveInfo().walking || scent || root.querySelector('dialog[open]') || !inspectBox.hidden) return;
      nextHint = now + nextHintDelay();
      const candidates = entries.filter(entry => !entry.room && !entry.hidden && !entry.ability && !log.discoveries[entry.id])
        .map(entry => ({ entry, distance: Math.hypot(pos[0] - entry.pos[0], pos[1] - entry.pos[1]) }))
        .filter(({ distance }) => distance > 2.6 && distance < 11).sort((a, b) => a.distance - b.distance);
      for (const { entry } of candidates) {
        const route = view.routeInfo(entry.pos);
        if (!route.reachable || route.meters > 14) continue;
        scent = { entry, pos: entry.pos, route, origin: pos, updated: now, until: now + 10000 };
        view.showScent(route.path, '메에! ❗');
        Sound.sfx('sheep');
        feedback(`${sheep.name}: 메에! ❗`);
        showCompass(now);
        break;
      }
    }

    function applyAbility(kind, atSite) {
      const view = getView();
      if (kind === 'smell') return sniff();
      const site = atSite || places.find(site => site.episode === (getRoom()?.episode || activeSite?.episode)) || places[0];
      const scope = site.markerId(kind);
      if (isUnlocked(kind, site.episode)) return feedback('이 장소에서 이미 사용했어.');
      const featTarget = getRoom() ? null : site.area.adventure?.targets[kind];
      if (featTarget && !isFlat() && proximity(site.translate(featTarget.pos)) > 3.2) {
        view?.focus?.(scope);
        return feedback(featTarget.title + ' 쪽으로 다가간 뒤 다시 써 보자.');
      }
      log.discoverUnlock[site.episode + '/' + kind] = true;
      const gated = entries.find(e => e.episode === site.episode && e.ability === kind && e.room === (getRoom() || undefined));
      view?.revealAbility?.(kind, kind === 'jump' && gated ? gated.pos : null, scope);
      Sound.sfx(kind === 'push' ? 'thump' : 'gem');
      feedback({ jump: '낮은 담을 폴짝 넘었어! 지붕 끝을 살펴봐.', push: '수레를 밀어 길을 열었어! 안쪽을 살펴봐.', shine: '양의 빛이 어두운 틈을 환하게 비췄어.' }[kind]);
      statusChanged(); refresh();
    }

    function abilitySheet(kind, site) {
      const abilities = ABILITIES.filter(a => a.id !== 'jump' && (!kind || a.id === kind));
      const dialog = card('양 능력', '', {
        extra: `<div class="adventure-abilities">${abilities.map(ability => {
          const ready = Field.mainCare()?.sheep.level >= ability.level || ability.id === 'shine' && day >= '2026-12-20';
          return `<button type="button" data-ability="${ability.id}" ${ready ? '' : 'disabled'}><i>${ability.icon}</i><b>${ability.title}</b><small>${ready ? ability.detail : ability.stage + '부터 쓸 수 있어.'}</small></button>`;
        }).join('')}</div><p class="discover-fact">🐑 낮은 돌담에서는 양이 지름길을 먼저 보여 줘.</p>`, button: '돌아가기'
      });
      dialog?.querySelectorAll('[data-ability]').forEach(button => button.onclick = () => {
        dialog.querySelector('[data-continue]').click();
        applyAbility(button.dataset.ability, site);
      });
    }

    function bagMarkup() {
      const entries = Object.values(log.discoverBag || {});
      if (!entries.length) return '<p class="discover-fact" style="text-align:center">아직 만든 물건이 없어. <b>🛠 해 보기</b>로 빵·물동이·밀가루를 만들어 담아 봐!</p>';
      return '<ul class="adventure-bag">' + entries.map(item =>
        `<li><i>${item.icon}</i><b>${esc(item.name)}</b><small>×${item.count}</small></li>`).join('') + '</ul>';
    }

    function render() {
      const view = getView();
      if (view && view !== restoredView) {
        restoredView = view;
        for (const site of places) {
          for (const kind of ['jump', 'push']) if (isUnlocked(kind, site.episode)) view.restoreAbility(kind, site.markerId(kind));
        }
      }
      const room = getRoom();
      const dc = !room && activeSite?.extension ? countAtSite(activeSite, entries, log) :
        discoverCount(room?.episode || activeSite?.episode || id, log);
      if (countEl) countEl.textContent = dc.max ? `발견 ${dc.n}/${dc.max}` : '둘러보기';
      if (newEl) {
        newEl.hidden = !dc.newLeft || !!(region && !getRoom() && !activeSite?.primary);
        newEl.textContent = `오늘 새 발견 ${dc.newLeft}개`;
      }
      const totalGot = Object.keys(log.discoveries || {}).filter(k => catalog[k]).length;
      if (nbButton) nbButton.querySelector('small').textContent = totalGot;
      const bagTotal = Object.values(log.discoverBag || {}).reduce((s, x) => s + (x.count || 0), 0);
      if (bagButton) bagButton.querySelector('small').textContent = bagTotal;
      if (next) next.hidden = discoverCount(id, log).n < 1;

      const markers = discoveryMarkers(entries.filter(entry => entry.room === (room || undefined) &&
        (!isFlat() || room || entry.episode === id || entry.location.key === 'herod-palace')));
      if (room) return markers;
      for (const npc of spec.storyPeople || []) {
        markers.push({ id: npc.id, type: 'person', actor: npc.actor, pos: npc.pos, title: npc.actor, symbol: '💬', storyNpc: npc });
      }
      for (const key of ['word', 'photo', 'secret']) {
        if (adv.targets[key]) markers.push({ ...adv.targets[key], id: key });
      }
      for (const site of places.filter(site => !isFlat() || site.primary)) {
        for (const kind of ['push']) {
          const target = site.area.adventure?.targets[kind];
          if (target && entries.some(e => e.episode === site.episode && e.ability === kind) && !isUnlocked(kind, site.episode)) {
            markers.push({ ...target, pos: site.translate(target.pos), id: site.markerId(kind) });
          }
        }
      }
      return markers;
    }

    function discoveryMarkers(items) {
      const markers = [];
      for (const entry of items) {
        const item = catalog[entry.id];
        if (!item) continue;
        const seen = !!log.discoveries[entry.id];
        const isNew = entry.episode === id && spec.newIds.includes(entry.id);
        const hidden = !!entry.hidden && !seen && !log.discoverUnlock[entry.episode + '/smell-' + entry.id];
        const markerId = entry.key;
        markers.push({
          id: markerId, discoverId: entry.id, type: item.kind, prop: entry.residentKey ? null : item.prop,
          pos: entry.pos, title: (seen ? '✓ ' : '') + item.title, symbol: KIND_META[item.kind].icon,
          discovered: seen, isNew, hidden, ability: entry.ability, room: entry.room
        });
      }
      return markers;
    }

    function renderFlat(fallback, shown, reachFn) {
      const room = getRoom();
      const btn = m => `<button type="button" data-mark="${esc(m.id)}"${m.room && m.room !== room ? ` data-in-room="${m.room.id}"` : ''} class="${m.discovered ? 'is-done' : ''}${m.isNew && !m.discovered ? ' is-new' : ''}"><i>${m.symbol}</i><b>${esc(m.title)}</b></button>`;
      const newItems = shown.filter(m => m.discoverId && m.isNew && !m.hidden && !m.room);
      const otherItems = shown.filter(m => m.discoverId && !m.isNew && !m.hidden && !m.room);
      const people = shown.filter(m => m.storyNpc);
      const extras = shown.filter(m => !m.discoverId && !m.storyNpc && !m.hidden && m.type !== 'house-door');
      const hidden = shown.filter(m => m.hidden);
      const doors = shown.filter(m => m.type === 'house-door');
      const roomGroups = (room ? [room] : houses).map(house => {
        const discoveries = discoveryMarkers(entries.filter(e => e.room === house)).filter(m => !m.hidden);
        const door = doors.find(m => room || m.id === house.id);
        return `<details class="explore-nooks"${room ? ' open' : ''}><summary>🚪 ${esc(house.title)} · 집 안</summary>
          <div>${door ? btn(door) : ''}${discoveries.map(btn).join('')}</div></details>`;
      }).join('');
      fallback.innerHTML = `
        ${newItems.length ? `<div class="discover-flat-section"><h3>✨ 오늘의 새 발견</h3><div class="explore-flat-markers">${newItems.map(btn).join('')}</div></div>` : ''}
        ${otherItems.length ? `<div class="discover-flat-section"><h3>🧭 이 장소에서 만나는 것</h3><div class="explore-flat-markers">${otherItems.map(btn).join('')}</div></div>` : ''}
        ${people.length ? `<div class="discover-flat-section"><h3>💬 만날 수 있는 사람</h3><div class="explore-flat-markers">${people.map(btn).join('')}</div></div>` : ''}
        ${extras.length ? `<div class="discover-flat-section"><h3>📜 말씀 · 사진 · 길</h3><div class="explore-flat-markers">${extras.map(btn).join('')}</div></div>` : ''}
        ${roomGroups}
        ${hidden.length ? `<details class="explore-nooks"><summary>🐽 숨은 발견 (${hidden.length})</summary><div>${hidden.map(btn).join('')}</div></details>` : ''}`;
      fallback.querySelectorAll('[data-mark]').forEach(el => el.onclick = () => el.dataset.inRoom
        ? changeRoom(houses.find(h => h.id === el.dataset.inRoom), el.dataset.mark) : reachFn(el.dataset.mark));
    }

    bagButton.onclick = () => card('탐험 가방', '', { extra: bagMarkup(), button: '가방 닫기' });
    root.querySelector('[data-abilities]').onclick = () => abilitySheet();
    nbButton.onclick = () => { closeInspect(); openNotebook(root, sheep, id); };
    root.querySelector('[data-quest-map]')?.addEventListener('click', () => {
      const room = getRoom(), view = getView();
      if (region && view) {
        const palaceLink = region.index === 3 && date() >= '2026-12-19' ?
          '<button class="btn ghost" type="button" data-palace-travel>🧭 예루살렘 · 헤롯의 궁</button>' : '';
        const dlg = card(region.title, '', {
          extra: regionMapMarkup(region, room?.pos || here(), scent && (room?.pos || scent.pos), log, entries) + palaceLink,
          button: '지도 닫기'
        });
        dlg?.querySelector('[data-palace-travel]')?.addEventListener('click', async () => {
          await enter('1-0');
          session?.view?.focus('4-0:disc/herod-palace');
        });
        return dlg;
      }
      const unfound = entries.filter(e => !log.discoveries[e.id] && !e.hidden && e.room === (room || undefined));
      const dlg = card('이 장소 둘러보기', '', {
        extra: `<ol class="adventure-zones">${zones.map((name, i) => `<li>${i === zone ? '●' : '○'} ${esc(name)}</li>`).join('')}</ol>
          ${unfound.length ? `<ul class="adventure-checks">${unfound.slice(0, 5).map(e => `<li><button type="button" data-loc="${esc(e.residentKey || 'disc/' + e.id)}">${KIND_META[catalog[e.id].kind].icon} ${esc(catalog[e.id].title)}</button></li>`).join('')}</ul>` : '<p class="discover-fact">이 장소의 보이는 발견을 모두 살펴봤어!</p>'}`,
        button: '돌아가기'
      });
      dlg?.querySelectorAll('[data-loc]').forEach(b => b.onclick = () => {
        dlg.querySelector('[data-continue]').click();
        getView()?.focus?.(b.dataset.loc);
      });
    });
    nearbyBtn?.addEventListener('click', () => {
      if (nearbyMarker) getView()?.focus?.(nearbyMarker.id);
    });

    return {
      render, renderFlat,
      sceneChanged() {
        clearCompass();
        zone = -1;
        if (region && !getRoom()) activeSite = null;
        onNearby(null);
        soundZone(getView()?.moveInfo().zone || 0);
      },
      dispose() { clearTimeout(zoneBannerTimer); clearTimeout(mapLitTimer); clearTimeout(zoneNarrationTimer); clearCompass(); closeInspect(); region?.save(); },
      discoverSite: showZoneDiscoverBanner,
      finishWatching(marker) {
        if (typeof marker.observe !== 'string') return false;
        const matches = entries.filter(e => e.id === marker.observe && !e.hidden && (!e.ability || isUnlocked(e.ability, e.episode)));
        const entry = matches.find(e => e.location === region.nearSite(marker.pos)) || matches[0];
        if (!entry || log.discoveries[entry.id]) return false;
        const item = catalog[entry.id];
        if (item.kind === 'try') openTry(entry, item, marker.id);
        else openLookOrTouch(entry, item, marker.id);
        return true;
      },
      crossedShortcut(episode) {
        if (episode && !isUnlocked('jump', episode)) {
          log.discoverUnlock[episode + '/jump'] = true;
          statusChanged();
          refresh();
        }
      },
      tick(now) {
        showCompass(now);
        if (!region || !getView() || getRoom()) return;
        const pos = here();
        region.visit(pos);
        sheepHint(now, getView(), pos);
        const site = region.nearSite(pos);
        if (site === activeSite) return;
        activeSite = site;
        if (site) showZoneDiscoverBanner(site);
        zone = -1;
        if (site?.primary) soundZone(getView().moveInfo().zone);
        else {
          if (zoneText) zoneText.textContent = site?.name || region.title;
          const ambience = { 'outer-court': '모험 장터', 'south-steps': '모험 뜰', 'sheep-gate': '모험 우물',
            'lower-town': '모험 뜰', siloam: '모험 우물', 'david-well': '모험 우물',
            'village-threshing': '모험 뜰', 'shepherd-cave': '마구간', 'valley-stream': '모험 우물' };
          Sound.ambience(templeAmbience(site) || site?.area?.adventure?.ambience[0] || ambience[site?.key] || '모험 산길');
        }
        const dc = site?.extension ? countAtSite(site, entries, log) : discoverCount(site?.episode || id, log);
        countEl.textContent = dc.max ? `발견 ${dc.n}/${dc.max}` : '둘러보기';
        newEl.hidden = !site?.primary || !dc.newLeft;
        if (site?.key === 'sheep-gate' && !noticedFlock) {
          noticedFlock = true;
          const route = getView().routeInfo(site.translate([-5.7, -2.55]));
          const line = '메에! 저 양들 곁에 가 보고 싶어!';
          if (route.reachable && route.meters > .6) getView().showScent(route.path, line);
          else getView().sheepReact('animal', line);
          Sound.sfx('sheep');
          feedback(`${sheep.name}: ${line}`);
        } else if (site?.key === 'lower-town' && !noticedOven) {
          noticedOven = true;
          feedback('화덕에서 갓 구운 빵 냄새가 나.');
        }
      },
      zoneChanged() {
        const info = getView()?.moveInfo();
        if (info && (!region || activeSite?.primary || getRoom())) soundZone(info.zone);
      },
      onNearby,
      reach(key) {
        const entry = entries.find(e => e.room === (getRoom() || undefined) && e.key === key);
        if (entry) {
          if (entry.location && entry.location !== region?.main) showZoneDiscoverBanner(entry.location);
          const item = catalog[entry.id];
          if (entry.ability === 'jump' && !isUnlocked('jump', entry.episode)) {
            if (isFlat()) {
              card(item.title, '양이 먼저 폴짝 넘었어. 낮은 담 너머로 가 보자.', {
                button: '🐑 담 넘기', action: () => {
                  log.discoverUnlock[entry.episode + '/jump'] = true;
                  statusChanged();
                  if (item.kind === 'try') openTry(entry, item, key);
                  else openLookOrTouch(entry, item, key);
                }
              });
            } else {
              feedback('🐑 양이 지름길을 보여 주는 낮은 담을 찾아봐.');
              if (!getRoom()) getView()?.focus('shortcut/' + entry.episode);
            }
            return true;
          }
          if (entry.ability && entry.ability !== 'smell' && !isUnlocked(entry.ability, entry.episode)) {
            const ab = ABILITIES.find(a => a.id === entry.ability);
            const ready = Field.mainCare()?.sheep.level >= ab.level;
            card(item.title, `${ab.icon} ${ab.title} 능력이 있으면 여기까지 닿을 수 있어.${ready ? '' : ` (${ab.stage}부터 가능)`}`, {
              button: ready ? `${ab.icon} 양 능력 쓰기` : '알겠어',
              action: ready ? () => applyAbility(entry.ability, entry.site) : undefined
            });
            return true;
          }
          if (item.kind === 'try') openTry(entry, item, key);
          else openLookOrTouch(entry, item, key);
          return true;
        }
        const npc = (spec.storyPeople || []).find(p => p.id === key);
        if (npc) {
          const line = currentLine(npc);
          say({ id: key, title: npc.actor }, line?.[1] || '', line?.[2] || npc.actor);
          return true;
        }
        const feature = ['jump', 'push'].find(kind => places.some(site => site.markerId(kind) === key));
        if (feature) {
          abilitySheet(feature, places.find(site => site.markerId(feature) === key));
          return true;
        }
        return false;
      }
    };
    function onNearby(marker) {
      nearbyMarker = marker;
      if (!nearbyBtn) return;
      nearbyBtn.hidden = !marker;
      if (marker) nearbyBtn.querySelector('span').textContent = marker.title.replace(/^✓\s*/, '');
    }
  }

  async function enter(id) {
    const ep = Core.epById(id), area = window.EXPLORE[id], care = Field.mainCare();
    if (!area || !isOpen(ep) || !care?.sheep) return map();
    if (!window.SHEEP_DEX) await Field.prepareDex();
    const log = progress(), record = Field.ensure();
    const sheep = { ...care.sheep, wool: care.sheep.shornOn === date() ? 0 : 1 };
    const day = date(), event = todayEvent(), act = area.activity, wool = Field.spec(sheep.species).wool || 'white';
    const hasDiscover = !!area.discover;
    const enhanced = hasDiscover || !!area.adventure;
    const region = hasDiscover ? makeRegion(id, log) : null;
    if (region) window.addEventListener('pagehide', region.save);
    const mainHouses = region?.main.houses || placeDoors(id, area);
    const regionHouses = region ? region.sites.flatMap(site => site.houses) : mainHouses;
    const houses = region?.index === 0 ? regionHouses.filter(house => house.episode === id) : mainHouses;
    const outsideDoors = regionHouses.map(house => ({
      id: house.id, type: 'house-door', pos: house.pos, title: house.title + ' 문', symbol: '🚪', house
    }));
    const insideDoor = { id: 'house/out', type: 'house-door', pos: roomExitPos, title: '밖으로 나가는 문', symbol: '🚪' };
    const christmas = id === 'end', eve = id === '4-4';
    const hasBlanket = !!record.woolGifts?.blanket;
    const npc = area.markers.find(marker => marker.id === 'person');
    const currentLine = marker => marker.lines.findLast(([seen]) => !seen || Core.data.done[seen]);
    const sameDay = event?.ep === id;
    const giftLink = act.gift ? `<button class="link" type="button" data-gift-go hidden>🎁 ${esc(act.gift[1])}${record.woolGifts[act.gift[0]] ? ' ✓' : ''}</button>` : '';
    const list = openList();
    const index = list.findIndex(ep => ep.id === id);
    const exits = [list[index - 1], list[index + 1]].map((ep, i) => ep && ({
      id: 'exit/' + ep.id, type: 'exit', place: ep.id, title: window.EXPLORE[ep.id].title, pos: [i ? 6.9 : -6.9, 7.45]
    })).filter(Boolean);
    log.lastPlace = id;
    log.visits[id] = (log.visits[id] || 0) + 1;
    Core.save();
    Sound.music('night');
    if (!enhanced) Sound.ambience('나의 들판');
    const narrLine = area.narration || window.PLACE_NARRATION?.[id] || '';
    const root = replace(`<header class="explore-head">${backButton('지도로')}<div><h1>${esc(area.title)}${narrLine ? ' <button type="button" class="explore-narr-btn" data-place-voice aria-label="장소 소개 다시 듣기" title="장소 소개 다시 듣기">🔈</button>' : ''}</h1><p data-place-caption>${esc(Core.dateLabel(ep.date))} · ${esc(region?.title || regions[area.region])}</p></div><button class="explore-sub" type="button" data-field-return>들판</button></header>
      ${hasDiscover ? `<section class="discover-bar" aria-label="발견 현황">
        <div class="discover-bar-left"><span class="discover-count" data-discover-count>발견 0/0</span><span class="scent-compass" aria-label="냄새 방향과 거리" data-scent-compass hidden><i aria-hidden="true">↑</i><small></small></span><span class="discover-new-badge" data-discover-new hidden></span></div>
        <button type="button" class="discover-nearby" data-nearby hidden>✨ <span></span></button>
      </section>` : ''}
      <div class="explore-location-main">${narrLine ? `<p class="explore-narr-caption" data-narr-caption hidden aria-live="polite"><i aria-hidden="true">🔈</i><span>${esc(narrLine)}</span></p>` : ''}<div class="explore-stage" aria-label="${esc(area.title)}" data-kit="${area.kit}"><p class="explore-loading">장소를 불러오는 중…</p><div class="explore-room-veil" aria-hidden="true" hidden></div>
      ${enhanced ? '<button type="button" data-quest-map class="adventure-zone"><i aria-hidden="true">' + (region ? '📍' : '◇') + '</i> <span data-zone></span></button>' : ''}</div><div class="explore-zone-banner" data-zone-banner hidden aria-live="polite"></div>
      ${region ? '<p class="explore-zone-caption" data-zone-narration hidden aria-live="polite"></p>' : ''}
      ${hasDiscover ? '<section class="discover-inspect" data-inspect hidden aria-live="polite"></section>' : ''}
      <p class="explore-status" role="status">${hasDiscover ? `조이스틱이나 바닥을 톡 눌러 ${esc(Core.josa(sheep.name, '이랑'))} 천천히 둘러봐.` : enhanced ? '조이스틱이나 바닥을 톡 눌러 이동해. 오른쪽 화면을 밀면 둘러볼 수 있어.' : `바닥을 톡 누르면 ${esc(Core.josa(sheep.name, '이가'))} 걸어가.`}</p>
      ${hasDiscover ? '' : '<p class="explore-task-line"><span data-score></span><strong data-timer hidden></strong></p>'}</div>
      <div class="explore-flat" hidden></div>
      ${region ? `<div class="explore-travel-controls">
        <button class="btn ghost" type="button" data-dismount hidden>🫏 내리기</button>
        ${(sheep.level || 1) >= 2 && sheep.level < 5 ? '<button class="btn ghost" type="button" data-hold-lamb aria-pressed="false" hidden>🤲 안아 주기</button>' : ''}
      </div>` : ''}
      ${hasDiscover ? `<footer class="adventure-actions">
        <button type="button" data-abilities><i>🐑</i> 양 능력</button>
        <button type="button" data-notebook><i>📓</i> 발견 노트 <small>0</small></button>
        <button type="button" data-bag><i>🎒</i> 가방 <small>0</small></button></footer>` : enhanced ? `<footer class="adventure-actions four-col">
        <button type="button" data-abilities><i>🐑</i> 양 능력</button>
        <button type="button" data-notebook><i>📓</i> 노트</button>
        <button type="button" data-bag><i>🎒</i> 가방 <small>0/6</small></button>
        <button type="button" data-hints><i>☷</i> 일지</button></footer>` : `<footer class="explore-foot"><button class="link explore-activity-link" type="button" data-activity-link>⭐ 오늘의 활동</button><button class="link" type="button" data-hints>이 장소에서 할 일</button>
      ${act.sequence ? '<button class="link" type="button" data-melody hidden>🔔 힌트 다시 듣기</button>' : ''}
      ${act.manger ? '<button class="link" type="button" data-final-album hidden>여정 앨범 열기</button>' : ''}
      ${giftLink}
      ${!Core.data.done[id] ? '<span>이야기를 더 보면 새 대화가 열려.</span>' : ''}</footer>`}
      ${enhanced ? giftLink : ''}
      ${(christmas || canWatchEnding() && id === '4-4') ? '<button class="btn ghost explore-ending-btn" type="button" data-walked-ending>🌟 성탄 엔딩 · 그 길을 함께 걸었어</button>' : ''}
      <button class="btn" type="button" data-field-next hidden>🐑 내 양 돌보러 가기</button>`, 'explore-location' + (enhanced ? ' adventure-location' : ''));
    const stage = root.querySelector('.explore-stage'), status = root.querySelector('.explore-status');
    const fallback = root.querySelector('.explore-flat'), timer = root.querySelector('[data-timer]');
    const next = root.querySelector('[data-field-next]');
    const veil = root.querySelector('.explore-room-veil'), caption = root.querySelector('[data-place-caption]');
    const narrEl = root.querySelector('[data-narr-caption]');
    const dismountButton = root.querySelector('[data-dismount]');
    const holdButton = root.querySelector('[data-hold-lamb]');
    const outdoorCaption = caption.textContent;
    let view, dead = false, flat = false, shown = [], task;
    let room = null, changingRoom = false, watching = 0, holdingLamb = false;
    let interval = 0, hintTimers = [], curtain = null, photoBusy = false, narrTimer = 0;
    const observer = new MutationObserver(() => { if (!root.isConnected) dispose(); });
    observer.observe(root.parentElement, { childList: true });
    const fieldBack = () => Field.page({ tonight: id });
    root.querySelector('.explore-back').onclick = map;
    root.querySelector('[data-field-return]').onclick = fieldBack;
    root.querySelector('[data-walked-ending]')?.addEventListener('click', () => ending());
    next.onclick = fieldBack;
    if (dismountButton) dismountButton.onclick = () => view?.ride();
    if (holdButton) holdButton.onclick = () => {
      if (watching || !view?.holdLamb(!holdingLamb)) return;
      holdingLamb = !holdingLamb;
      holdButton.setAttribute('aria-pressed', String(holdingLamb));
      holdButton.textContent = holdingLamb ? '🤲 내려놓기' : '🤲 안아 주기';
      if (holdingLamb && !log.carriedLamb) {
        log.carriedLamb = day;
        Core.save();
        feedback('“어린 양을 그 팔로 모아 품에 안으시며” (' + window.EXPLORE_CARRY_WORD + ')');
      }
    };
    function playPlaceNarration() {
      if (!narrLine || dead) return;
      clearTimeout(narrTimer);
      if (narrEl) {
        narrEl.innerHTML = `<i aria-hidden="true">🔈</i><span>${esc(narrLine)}</span>`;
        narrEl.hidden = false;
      }
      const vName = area.voice || ('place-' + id);
      if (Sound.on) {
        Sound.preload?.(vName);
        Promise.resolve(Sound.voice?.(vName)).then(dur => {
          if (dur && dur > 1 && !dead && narrEl && !narrEl.hidden) {
            clearTimeout(narrTimer);
            narrTimer = setTimeout(() => { if (narrEl) narrEl.hidden = true; }, Math.round(dur * 1000) + 500);
          }
        }).catch(() => {});
      }
      narrTimer = setTimeout(() => { if (narrEl) narrEl.hidden = true; }, 4600);
    }
    root.querySelector('[data-place-voice]')?.addEventListener('click', () => playPlaceNarration());
    if (narrLine && !log.narrated[id]) {
      log.narrated[id] = day;
      Core.save();
      playPlaceNarration();
    }
    const melody = root.querySelector('[data-melody]'), finalAlbum = root.querySelector('[data-final-album]');
    if (melody) melody.onclick = playHint;
    if (finalAlbum) finalAlbum.onclick = album;
    const gift = root.querySelector('[data-gift-go]');
    if (gift) gift.onclick = () => Field.page({ tonight: id, gift: act.gift[0] });
    const hintsBtn = root.querySelector('[data-hints]');
    if (hintsBtn) hintsBtn.onclick = showGuide;
    if (!enhanced) root.querySelector('[data-activity-link]').onclick = () => view ? view.focus('activity') : startActivity();
    const discovery = hasDiscover ? createDiscovery({ id, area, day, log, root, sheep, record, card, grant, feedback,
      refresh, getView: () => view, isFlat: () => flat, currentLine, say, houses, getRoom: () => room, changeRoom, region }) : null;
    const adventure = enhanced && !hasDiscover ? createAdventure({ id, area, day, log, root, sheep, record, card, grant, feedback,
      refresh, getView: () => view, isFlat: () => flat }) : null;
    function dispose() {
      if (dead) return;
      dead = true; observer.disconnect(); clearInterval(interval); clearTimeout(narrTimer); clearTimeout(watching); hintTimers.forEach(clearTimeout);
      if (region) window.removeEventListener('pagehide', region.save);
      discovery?.dispose();
      adventure?.dispose();
      view?.destroy(); view = null;
    }
    session = { dispose, get view() { return view; }, get room() { return room?.id || null; }, id, region, discoverSite: site => discovery?.discoverSite?.(site) };
    function feedback(text) { status.textContent = cueText(text, sheep); }
    function withSymbols(markers) { return markers.map(marker => ({ ...marker, symbol: marker.symbol || icons[marker.type] || '✦' })); }
    function refresh() {
      if (discovery) {
        const markers = discovery.render();
        markers.push(...(room ? [insideDoor] : flat ? outsideDoors.filter(door => houses.includes(door.house)) : outsideDoors));
        if (!room && !flat && view) markers.push(...view.scenicMarkers);
        if (!room && sameDay) markers.push({ id: event.id, type: 'event', pos: area.adventure ? [-5.25, 20.4] : [-5.15, 5.35],
          title: event.title, hidden: !!event.wool || event.title === '아이들의 숨바꼭질' });
        shown = withSymbols(markers);
        view?.setMarkers(shown);
        if (gift) gift.hidden = !complete(id);
        if (flat) discovery.renderFlat(fallback, shown, reach);
        return;
      }
      if (room) {
        shown = [insideDoor];
        view?.setMarkers(shown);
        if (flat) renderFlat();
        return;
      }
      if (adventure) {
        const markers = adventure.render();
        markers.push(...outsideDoors);
        if (sameDay) markers.push({ id: event.id, type: 'event', pos: [-5.25, 20.4],
          title: event.title, hidden: !!event.wool || event.title === '아이들의 숨바꼭질' });
        shown = withSymbols(markers);
        view?.setMarkers(shown);
        if (gift) gift.hidden = !complete(id);
        if (flat) renderAdventureFlat();
        return;
      }
      const score = stars(id, log);
      root.querySelector('[data-score]').textContent = (score.n === score.max ? '★ 전부 찾았어!' : `이 장소 ${score.n}/${score.max}`) + (task?.carrying ? ' · ' + task.carrying : '');
      next.hidden = !complete(id);
      root.querySelector('[data-activity-link]').hidden = complete(id) || !!(task && !task.done);
      const running = task && !task.done;
      if (melody) melody.hidden = !running;
      if (finalAlbum) finalAlbum.hidden = !log.photos[id];
      if (gift) gift.hidden = !complete(id);
      let markers = [...area.markers, ...exits, ...outsideDoors].filter(marker =>
        !(act.secretAfter && marker.type === 'secret' && !complete(id)) &&
        !(act.manger && marker.type === 'photo' && !complete(id)));
      if (sameDay) markers.push({ id: event.id, type: 'event', pos: [-5.15, 5.35], title: event.title,
        hidden: !!event.wool || event.title === '아이들의 숨바꼭질' });
      if (running && task.phase === 'return') {
        if (act.handoff) {
          const [title, pos] = act.handoff;
          markers.push({ id: 'handoff', title, pos, type: 'quest' });
        } else {
          markers = markers.map(marker => marker.id === 'activity' ? { ...marker, title: act.kind === 'hide' ? '새끼 양 데려가기' : '건네주기' } : marker);
        }
      }
      if (running && task.phase === 'guard') markers.push(guardMarker());
      if ((running && task.phase === 'find') || (eve && complete(id))) {
        act.pieces.forEach((piece, n) => {
          const type = piece.type || { light: 'light', clear: 'clear', follow: 'follow', meet: 'person' }[act.kind] || 'find';
          const found = task?.hits.has(n) || !running;
          const lit = found && type === 'light';
          if (lit || (!found && (!(act.kind === 'follow' || act.ordered || act.courier) || n === task.hits.size))) {
            markers.push({ ...piece, id: 'piece/' + n, type, lit, moving: act.kind === 'follow',
              hidden: !!act.hidden || type === 'reflection',
              title: lit ? '켜진 등잔' : piece.title });
          }
        });
      }
      view?.setCarry(task?.carrying ? act.kind === 'hide' ? '🐑' : act.symbol : '');
      shown = withSymbols(markers);
      view?.setMarkers(shown);
      if (flat) renderFlat();
    }
    function renderAdventureFlat() {
      const nooksOpen = fallback.querySelector('details')?.open;
      const button = marker => `<button type="button" data-mark="${esc(marker.id)}"><i>${marker.symbol}</i><b>${esc(marker.title)}</b></button>`;
      const pins = shown.filter(m => !m.hidden && !m.lit && (m.type !== 'secret' || m.priority === 'main'));
      const nooks = shown.filter(m => (m.hidden || m.type === 'secret') && m.priority !== 'main');
      const urgent = shown.filter(m => m.priority === 'main' && m.hidden);
      fallback.innerHTML = `<div class="explore-flat-markers">${[...pins, ...urgent].sort((a, b) => Number(b.priority === 'main') - Number(a.priority === 'main')).map(button).join('')}</div>
        ${nooks.length ? `<details class="explore-nooks" ${nooksOpen ? 'open' : ''}><summary>구석과 숨은 단서</summary><div>${nooks.map(button).join('')}</div></details>` : ''}`;
      fallback.querySelectorAll('[data-mark]').forEach(el => el.onclick = () => reach(el.dataset.mark));
    }
    function renderFlat() {
      const rows = shown.filter(marker => !marker.hidden && marker.type !== 'secret' && !marker.lit);
      const mystery = shown.find(marker => marker.type === 'secret');
      const hidden = shown.filter(marker => marker.hidden);
      fallback.innerHTML = `<div class="explore-flat-markers">${rows.map(marker =>
        `<button type="button" data-mark="${esc(marker.id)}"><i>${marker.symbol}</i><b>${esc(marker.title)}</b></button>`).join('')}</div>
        ${hidden.length || mystery ? `<details class="explore-nooks"><summary>구석을 살펴보기</summary>
          <div>${hidden.map((marker, i) => `<button type="button" data-mark="${esc(marker.id)}">${marker.type === 'event' ? '✦ 수상한 곳' : marker.type === 'reflection' || marker.type === 'bush' ? esc(marker.title) : '👀 사람들 사이 ' + (i + 1)}</button>`).join('')}
          ${mystery ? [0, 1, 2].map(n => `<button type="button" data-secret-try="${n}">${['왼쪽 구석', '돌 뒤', '오른쪽 구석'][n]}</button>`).join('') : ''}</div></details>` : ''}`;
      const nooks = fallback.querySelector('details');
      if (nooks && (task?.openedNooks || log.found[foundKey(id, 'secret')])) nooks.open = true;
      if (nooks) nooks.ontoggle = () => { if (task) task.openedNooks = nooks.open; };
      fallback.querySelectorAll('[data-mark]').forEach(button => button.onclick = () => reach(button.dataset.mark));
      fallback.querySelectorAll('[data-secret-try]').forEach(button => button.onclick = () => {
        if (Number(button.dataset.secretTry) === hash(id) % 3) reach('secret');
        else feedback('여기는 조용해. 다른 구석을 찾아봐.');
      });
    }
    function no3D() {
      if (dead || flat) return;
      view?.destroy(); view = null; flat = true;
      if (holdButton) holdButton.hidden = true;
      if (dismountButton) dismountButton.hidden = true;
      stage.hidden = true; fallback.hidden = false;
      feedback('목록에서 살펴볼 곳을 눌러 봐.');
      refresh();
    }
    async function changeRoom(nextRoom, pendingItem) {
      if (dead || changingRoom || curtain?.open) return;
      const previous = room;
      if (previous === nextRoom) return;
      if (nextRoom && view && dismountButton && !dismountButton.hidden) view.ride();
      const useFade = !flat && !matchMedia('(prefers-reduced-motion: reduce)').matches;
      changingRoom = true;
      if (useFade) {
        veil.hidden = false;
        await veil.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, fill: 'forwards' }).finished.catch(() => {});
      }
      if (dead) return;
      view?.destroy(); view = null;
      room = nextRoom;
      stage.setAttribute('aria-label', room ? room.title + ' 안' : area.title);
      caption.textContent = room ? room.title + ' · 집 안' : outdoorCaption;
      if (room) stage.dataset.room = room.id;
      else delete stage.dataset.room;
      const spawn = previous && !room ? [previous.pos[0], previous.pos[1] + 1.84] : undefined;
      refresh();
      if (!flat) await mountScene(spawn);
      if (dead) return;
      discovery?.sceneChanged();
      if (!discovery) {
        if (room) Sound.ambience(room.style === 'stable' ? '마구간' : '집안');
        else if (adventure) adventure.sceneChanged();
        else Sound.ambience('나의 들판');
      }
      if (useFade && !flat) await veil.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, fill: 'forwards' }).finished.catch(() => {});
      veil.hidden = true;
      veil.getAnimations().forEach(animation => animation.cancel());
      changingRoom = false;
      feedback(room ? room.title + ' 안이야. 문으로 가면 밖으로 나갈 수 있어.' : '문 밖으로 나왔어.');
      if (pendingItem) reach(pendingItem);
    }
    function card(title, text, { who, word, action, button = '계속', extra = '', done, detail = '' } = {}) {
      if (dead || (curtain?.open && !action)) return;
      if (who && enhanced) Sound.blip(who);
      const dialog = Field.showSheet(root, title, `<div class="explore-talk">${who ? `<div class="explore-portrait">${Art.portrait(who)}<b>${esc(who)}</b></div>` : ''}
        ${text ? `<p>${esc(cueText(text, sheep))}</p>` : ''}${detail ? `<small>${esc(detail)}</small>` : ''}${word ? Field.wordMarkup(word) : ''}${extra}</div>
        <button type="button" class="btn" data-continue>${esc(button)}</button>`, 'explore-dialog', () => { if (curtain === dialog) curtain = null; done?.(); });
      curtain = dialog;
      dialog.querySelector('[data-continue]').onclick = () => {
        dialog.close(); dialog.remove();
        if (curtain === dialog) curtain = null;
        action?.();
      };
      return dialog;
    }
    function say(marker, line, who) {
      Sound.sfx('pop');
      view?.say(marker.id, cueText(line, sheep));
      card(marker.title, line, { who });
    }
    function grant(reward) {
      if (reward.oil) Core.addOil(reward.oil, 'explore');
      if (reward.wool) record.woolBag[wool] = (record.woolBag[wool] || 0) + reward.wool;
      if (reward.item && !log.rewards[reward.item]) {
        log.rewards[reward.item] = day;
        if (!record.items[reward.item]) record.items[reward.item] = 1;
        return reward.item;
      }
      return '';
    }
    function win() {
      if (task?.done) return;
      if (task) task.done = true;
      clearInterval(interval); timer.hidden = true;
      const first = !log.quests[id];
      log.quests[id] = 'done';
      mark(log, id, 'activity');
      const reward = first ? { oil: act.kind === 'guard' || id === '3-3' ? 2 : 1, wool: id === '1-0' ? 0 : act.kind === 'hide' ? 2 : 1 } : {};
      if (id === '1-2' || id === '4-2' || id === 'end') reward.item = act.exclusive;
      const item = grant(reward);
      const heart = first && Field.adventureHeart(record, day);
      if (act.manger) {
        sheep.wear = { ...sheep.wear, back: '금빛 천사 날개' };
        view?.kneel();
      }
      statusChanged();
      refresh();
      Sound.sfx(first ? 'star' : 'pop');
      feedback(first ? '오늘의 활동 완료!' : '다시 해냈어!');
      card(act.title, act.done, {
        who: act.finishWho || (act.manger ? '' : npc.name),
        word: act.manger ? '눅 2:7' : '',
        detail: [act.manger && hasBlanket && '구유에는 네가 짠 이불이 깔려 있어.', reward.oil && `기름 +${reward.oil}`, reward.wool && `털 +${reward.wool}`, heart && '오늘의 하트 +1', item && '옷장 · ' + item].filter(Boolean).join(' · '),
        button: act.manger ? '📷 마지막 사진 남기기' : '계속 둘러보기',
        action: act.manger ? photo : undefined
      });
    }
    function initialTask(duration) {
      task = { pieces: act.pieces, hits: new Set(), phase: 'find', done: false, openedNooks: !!act.hidden, duration,
        hiddenIndex: hash(day + id) % Math.max(1, act.pieces.length) };
      if (act.kind === 'guard') view?.tendFire(false);
      if (duration) {
        task.until = performance.now() + duration * 1000;
        timer.hidden = false; timer.textContent = duration + '초';
        clearInterval(interval);
        interval = setInterval(() => {
          const remaining = Math.max(0, Math.ceil((task.until - performance.now()) / 1000));
          timer.textContent = remaining + '초';
          if (!remaining) {
            clearInterval(interval); task = null; timer.hidden = true;
            feedback('시간이 다 됐어. 활동 자리에서 다시 해 볼 수 있어.');
            Sound.sfx('tap'); refresh();
          }
        }, 120);
      }
      if (act.kind === 'follow' && id === '1-2') view?.react('activity', 'doves');
      refresh();
      if (act.kind === 'order') playHint();
      else feedback(act.courier ? '우물에서 물동이를 받아 보자.' : `${act.title} · 0/${act.pieces.length}`);
    }
    function playHint() {
      hintTimers.forEach(clearTimeout);
      const order = act.sequence || act.pieces.map((_, n) => n);
      // 소리를 끈 기기와 2D에서도 순서를 확인할 수 있다.
      feedback('힌트 · ' + order.map(n => act.pieces[n].title).join(' → '));
      hintTimers = order.map((n, beat) => setTimeout(() => {
        if (dead || task?.done) return;
        Sound.sfx('exploreBell', n);
        if (act.sequence) view?.react('piece/' + n, 'note');
      }, beat * 420));
    }
    function startActivity() {
      const prior = log.quests[id] === 'done';
      if ((act.requiresStory || act.manger) && !Core.data.done[id]) {
        return card(act.title, '오늘 이야기를 마친 뒤 여기서 이어갈 수 있어.', {
          button: '오늘 이야기 보기', action: () => App.go(id)
        });
      }
      if (act.manger) {
        return card(act.title, act.intro, { who: npc.name, button: '구유 앞에 머물기', action: () => {
          task = { done: false };
          win();
        } });
      }
      if (task && !task.done) {
        if (task.phase === 'return' && !act.handoff) return handOver();
        if (task.phase === 'guard') return feedback('늑대 그림자 곁으로 등불을 가져가 봐.');
        if (task.phase === 'return') return feedback(task.carrying + ' · ' + act.handoff[0]);
        return feedback(`${task.hits.size}/${task.pieces.length} · ${act.title}`);
      }
      const duration = act.time || (prior && act.replayTime);
      const start = () => initialTask(duration);
      if (act.meetFirst) {
        const [, line, who] = currentLine(npc);
        mark(log, id, npc.id); statusChanged();
        return card(npc.title, line, { who: who || npc.name, action: () => card(act.title, act.intro, { who: npc.name, button: '깃털 찾기', action: start }) });
      }
      card(act.title, act.intro, { who: npc.name, button: duration ? `${duration}초 도전 시작` : '시작', action: start });
    }
    function guardMarker() {
      const index = task.wolves || 0;
      return { id: 'wolf/' + index, title: '늑대 그림자', type: 'guard', pos: act.wolves[index] };
    }
    function handOver() {
      task.carrying = '';
      if (act.courier && task.hits.size < act.pieces.length) {
        task.phase = 'find'; refresh(); return feedback(`물동이를 내려놓았어 · ${task.hits.size}/3. 우물로 돌아가자.`);
      }
      if (act.kind === 'guard') {
        task.phase = 'guard';
        view?.tendFire(true);
        Sound.sfx('star');
        refresh(); return feedback('불이 다시 타올라! 등불을 켜고 늑대 그림자 셋을 쫓아내자.');
      }
      win();
    }
    function pickPiece(n) {
      if (!task || task.done || task.hits.has(n) || !task.pieces[n]) return;
      if (task.until && performance.now() > task.until) return;
      const piece = task.pieces[n];
      if (act.kind === 'hide' && n !== task.hiddenIndex) {
        view?.react('piece/' + n, 'rustle');
        Sound.sfx('tap'); return feedback('잎사귀만 바스락거려. 다른 덤불을 살펴보자.');
      }
      const expected = act.sequence?.[task.hits.size] ?? task.hits.size;
      if (act.kind === 'order' && n !== expected) {
        task.hits.clear(); refresh();
        Sound.sfx('tap'); playHint(); return;
      }
      if (act.kind === 'clear' && !task.rocks?.has(n)) {
        task.rocks ||= new Set(); task.rocks.add(n);
        view?.react('piece/' + n, 'rustle');
        feedback('돌이 흔들렸어. 한 번 더 톡!'); Sound.sfx('tap'); return;
      }
      task.hits.add(n);
      Sound.sfx(act.kind === 'hide' ? 'sheep' : act.kind === 'order' ? 'exploreBell' : 'pop', n);
      navigator.vibrate?.(12);
      view?.react('piece/' + n, act.kind === 'hide' ? 'lamb' : undefined);
      const last = task.hits.size === task.pieces.length;
      const progress = ` · ${task.hits.size}/${task.pieces.length}`;
      const prompts = { light: '등불을 밝혔어.', clear: '돌을 길 밖으로 굴렸어.', bell: '음이 이어졌어.', door: '마구간 문에 닿았어.' };
      feedback((prompts[piece.type || act.kind] || (act.ordered ? '길 표지를 지났어.' : '찾았다!')) + progress);
      if (act.kind === 'meet' && piece.text) {
        if (last) task.phase = 'heard';
        refresh();
        return card(piece.title, piece.text, { who: piece.type === 'door' ? '' : piece.title,
          button: '계속', done: last ? win : undefined });
      }
      if (act.courier || act.kind === 'hide' || (last && (act.kind === 'deliver' || act.kind === 'guard'))) {
        task.carrying = act.kind === 'hide' ? '새끼 양' : act.cargo;
        task.phase = 'return';
        refresh(); return feedback(task.carrying + ' · ' + (act.handoff?.[0] || '활동을 시작한 자리로 돌아가자.'));
      }
      if (last) return win();
      refresh();
    }
    function showGuide() {
      const { n, max } = stars(id);
      const rows = area.markers.filter(m => m.type !== 'secret' && !m.extra);
      const secret = area.markers.find(m => m.type === 'secret');
      card('이 장소에서 할 일', flat ? '목록에서 골라 볼 수 있어.' : '바닥을 톡 눌러 걸어가. 화면을 밀면 방향을 둘러볼 수 있어.', {
        detail: `찾은 것 ${n}/${max}`,
        extra: `<ul class="explore-checklist">${rows.map(m => `<li>${log.found[foundKey(id, m.id)] ? '✓' : icons[m.type]} ${esc(m.title)}</li>`).join('')}${secret ? `<li>${log.found[foundKey(id, secret.id)] ? '✓ ' + esc(secret.title) : '⚿ 조용한 구석에도 들러 봐.'}</li>` : ''}</ul>`
      });
    }
    function photo(viewpoint) {
      if (photoBusy) return;
      const place = viewpoint?.episode || id;
      card('포토 스팟', `${Core.josa(sheep.name, '과와')} 찍은 사진을 여정 앨범에 넣을까?`, {
        button: '📷 사진 찍기', action: async () => {
          if (photoBusy) return;
          photoBusy = true;
          let shot;
          try {
            if (act.manger && !viewpoint) view?.kneel(false);
            shot = view?.photo(viewpoint);
          } catch { /* 기기가 장면을 저장할 수 없으면 양의 초상으로 남김 */ }
          if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches &&
            !document.documentElement.classList.contains('no-motion')) {
            stage.animate([{ filter: 'brightness(2.45)' }, { filter: 'brightness(1)' }], { duration: 235 });
          }
          const data = { species: sheep.species, level: sheep.level, wear: sheep.wear, name: sheep.name, date: day,
            token: globalThis.crypto?.randomUUID?.() || String(Date.now()) };
          let url;
          try {
            url = shot || await Field.portrait(sheep.species, sheep);
            if (shot) await photoFile(place, data.token, shot);
            if (dead) {
              if (shot) void deletePhoto(place, data.token);
              return;
            }
            const old = log.photos[place];
            log.photos[place] = data;
            mark(log, place, 'photo'); statusChanged(); refresh();
            if (old?.token) void deletePhoto(place, old.token);
            Sound.sfx('exploreBell', 3);
            card('찰칵!', '여정 앨범에 사진을 담았어.', { extra: `<img class="explore-photo-preview" alt="${esc(sheep.name)}의 기념사진" src="${esc(url)}">` });
          } finally { photoBusy = false; }
        }
      });
    }
    async function deletePhoto(id, token) {
      try {
        const db = await photoDB(), key = `${Core.IS_TEST ? 'test' : 'student'}:${id}:${token}`;
        db.transaction('photos', 'readwrite').objectStore('photos').delete(key);
      } catch { /* 다음 장면에 영향 없음 */ }
    }
    function smallEvent(marker) {
      if (log.found[marker.id]) return card(event.title, event.result);
      if (event.merchant) {
        const choices = ['보라 방울', '밀짚모자', '나비넥타이'];
        const item = choices.find(name => !record.items[name]) || choices[hash(day) % choices.length];
        return card(event.title, event.result, { who: '떠돌이 상인', button: `${item} · 기름 2방울`, action: () => {
          if (log.found[marker.id]) return;
          if (!Core.spendOil(2)) return card(event.title, '기름이 모이면 다시 와.');
          Field.giveItem(item);
          log.found[marker.id] = day; statusChanged();
          card(event.title, '마음에 들면 옷장에서 입혀 봐!', { detail: item });
        } });
      }
      grant(event); log.found[marker.id] = day; statusChanged();
      card(event.title, event.result, { detail: event.oil ? '기름 +1' : '털 +1' });
    }
    function reach(markerId) {
      if (dead || changingRoom || watching || curtain?.open) return;
      const marker = shown.find(m => m.id === markerId);
      if (!marker) return;
      if (marker.type === 'house-door') return changeRoom(marker.house || null);
      if (marker.viewpoint) return photo(marker.viewpoint);
      if (marker.pathPlay) return view?.playAt(marker.id);
      if (marker.ride) {
        if (view?.ride(marker.id) && dismountButton && !dismountButton.hidden) {
          discovery?.finishWatching({ ...marker, observe: 'donkey' });
        }
        return;
      }
      if (marker.shortcut) {
        if (view?.takeShortcut(marker)) {
          Sound.sfx('pop');
          discovery?.crossedShortcut(marker.episode);
        } else if (holdingLamb) feedback('양을 내려놓은 뒤 함께 담을 넘어 보자.');
        return;
      }
      if (marker.observe && view) {
        const scene = view;
        scene.watch(marker.id);
        feedback('👀 ' + marker.title);
        watching = setTimeout(() => {
          watching = 0;
          if (dead || scene !== view) return;
          scene.endInspect();
          discovery?.finishWatching(marker);
        }, 3400);
        return;
      }
      if (discovery?.reach(markerId)) return;
      if (adventure?.reach(markerId)) return;
      if (marker.type === 'exit') return enter(marker.place);
      if (marker.id.startsWith('piece/')) return pickPiece(Number(marker.id.split('/')[1]));
      if (marker.type === 'guard') {
        view?.react(marker.id, 'scare');
        Sound.sfx('patrolScare'); task.wolves = (task.wolves || 0) + 1;
        if (task.wolves >= act.wolves.length) return win();
        feedback(`그림자가 물러갔어 · ${task.wolves}/${act.wolves.length}`); return refresh();
      }
      if (marker.id === 'handoff' && task?.phase === 'return') return handOver();
      if (marker.type === 'quest') return startActivity();
      if (marker.type === 'person') {
        mark(log, id, marker.id); statusChanged(); refresh();
        const line = currentLine(marker);
        return say(marker, line?.[1], line?.[2] || marker.name);
      }
      if (marker.type === 'secret') {
        mark(log, id, marker.id);
        const assigned = !['1-2', '4-2', 'end'].includes(id);
        const item = assigned && act.exclusive ? grant({ item: act.exclusive }) : '';
        statusChanged(); refresh(); view?.react(marker.id, marker.effect);
        return card(marker.title, marker.text, { detail: item ? '옷장 · ' + item : '비밀 장소를 찾았어!' });
      }
      if (marker.type === 'photo') return photo();
      if (marker.type === 'event') return smallEvent(marker);
      if (marker.type === 'verse') {
        const extraWord = enhanced && area.markers.find(entry => entry.id === 'extra-word');
        mark(log, id, marker.id);
        if (extraWord) mark(log, id, extraWord.id);
        statusChanged(); refresh();
        return card('말씀 비석', '', { word: marker.ref, extra: extraWord ? Field.wordMarkup(extraWord.ref) : '', detail: '말씀 모음에 담았어.' });
      }
    }
    if (act.manger && complete(id)) sheep.wear = { ...sheep.wear, back: '금빛 천사 날개' };
    refresh();
    if (!Field3D.supported()) return no3D();
    await mountScene();
    async function mountScene(spawn) {
      try {
        const engine = await Field3D.mountExplore(stage, { place: id, kit: area.kit, seed: area.seed,
          room, spawn, region: room ? null : region, houses: room ? [] : regionHouses, discovery: hasDiscover, layout: { ...area.layout, christmas: christmas && !room, eve: eve && !room,
            blanket: record.woolGifts?.blanket && Object.keys(record.woolGifts.blanket.wool || {}).map(id => window.WOOL_TYPES?.[id]?.color).filter(Boolean) },
          progress: log.quests, found: log.found, sheep, markers: shown, adventure: area.adventure }, {
          companionLine: enhanced ? Field.exploreReaction(sheep) : null,
          onFootstep: enhanced || room ? mounted => Sound.sfx(mounted ? 'hoofExplore' : 'walkExplore') : null,
          onLand: splash => Sound.sfx(splash ? 'jumpSplash' : 'jumpLand'),
          onRide: mounted => { if (dismountButton) dismountButton.hidden = !mounted; },
          onBearing: room ? null : adventure?.onBearing,
          onZone: discovery?.zoneChanged || (room ? null : adventure?.zoneChanged),
          onNearbyDiscover: discovery?.onNearby,
          onExploreTick: discovery?.tick,
          canInteract: () => !changingRoom && !watching && !curtain?.open && (!hasDiscover || root.querySelector('[data-inspect]')?.hidden !== false),
          onReach: reach, onUnavailable: no3D
        });
        if (dead || flat) { engine?.destroy(); return; }
        view = engine;
        if (holdButton) holdButton.hidden = false;
        if (holdingLamb) view.holdLamb(true);
        stage.querySelector('.explore-loading')?.remove();
        refresh();
      } catch (error) {
        if (Core.PREVIEW_ALL) console.warn('탐험 그래픽', error);
        no3D();
      }
    }
  }

  const WALKED_STOPS = [
    { key: 'temple', label: '성전', ids: ['1-0', '1-2', '1-3', '1-4'], rep: '1-0', kit: 'temple', scene: '성전뜰', line: '성전 뜰에서 첫 등불을 밝히며 시작된 걸음' },
    { key: 'hill', label: '산골', ids: ['1-1', '1-5', '1-6', '3-2'], rep: '1-1', kit: 'roof', scene: '지붕', line: '유대 산골 지붕 위에서 새벽별을 올려다보던 밤' },
    { key: 'nazareth', label: '나사렛', ids: ['2-0', '2-1', '2-2', '2-3', '2-4', '2-5', '3-0'], rep: '2-1', kit: 'nazareth', scene: '나사렛길', line: '나사렛 골목과 나무 향기 가득하던 작업장' },
    { key: 'well', label: '우물', ids: ['2-6', '3-1'], rep: '3-1', kit: 'well', scene: '길', line: '맑은 물이 고인 우물가에서 잠시 쉬어 가던 길' },
    { key: 'elizabeth', label: '엘리사벳 집', ids: ['3-3', '3-4', '3-5', '3-6'], rep: '3-3', kit: 'elizabeth', scene: '유대집', line: '반가운 인사와 노래가 울려 퍼지던 엘리사벳의 집' },
    { key: 'bethlehem', label: '베들레헴', ids: ['4-0', '4-1'], rep: '4-0', kit: 'gate', scene: '베들레헴', line: '사람들로 북적이던 다윗의 동네 베들레헴 성문과 골목' },
    { key: 'field', label: '들판', ids: ['4-2', '4-3'], rep: '4-2', kit: 'field', scene: '들판', line: '모닥불 곁에서 밤새 양 떼를 지키며 깨어 있던 들판' },
    { key: 'stable', label: '마구간', ids: ['4-4', 'end'], rep: 'end', kit: 'stable', scene: '마구간', line: '큰 별 아래 따뜻한 빛이 새어 나오던 마구간 구유 앞' }
  ];

  function hasVisitedPlace(epId, log) {
    if (!log) return false;
    if (log.visits?.[epId] > 0 || log.narrated?.[epId] || log.lastPlace === epId) return true;
    if (log.quests?.[epId] || log.photos?.[epId] || log.adventures?.[epId]) return true;
    if (Object.keys(log.found || {}).some(k => k.startsWith(epId + '/'))) return true;
    if (Object.values(log.discoveries || {}).some(d => d && d.place === epId)) return true;
    return false;
  }

  function buildEndingSummary(log, record, sheep) {
    const all = window.DISCOVERIES || {};
    const themes = window.DISCOVER_THEMES || [];
    const total = Object.keys(all).length || 52;
    const seen = log.discoveries || {};
    const found = Object.keys(seen).filter(k => all[k]).length;
    const doneThemes = themes.filter(t => {
      const ids = Object.keys(all).filter(k => all[k].theme === t.id);
      return ids.length > 0 && ids.every(k => seen[k]);
    });
    const days = Math.max(1, record.mainCareDays || record.careDays || Object.keys(Core.data.done || {}).filter(k => k !== '0').length || 1);
    const craftedSet = new Set();
    if (record.crafted && typeof record.crafted === 'object') {
      const keys = Array.isArray(record.crafted) ? record.crafted : Object.keys(record.crafted).filter(k => record.crafted[k]);
      keys.forEach(k => craftedSet.add(k));
    }
    if (window.DISCOVER_CRAFT && record.items) {
      for (const name of Object.keys(window.DISCOVER_CRAFT)) {
        if (record.items[name]) craftedSet.add(name);
      }
    }
    for (const k of Object.keys(record.woolGifts || {})) {
      if (record.woolGifts[k]) craftedSet.add({ scarf: '따뜻한 목도리', cushion: '작업장 방석', swaddle: '아기 포대기', blanket: '구유 이불' }[k] || k);
    }
    const craftedList = [...craftedSet];
    const craftedText = craftedList.length ? `${craftedList.length}개 (${craftedList.slice(0, 2).join('·')}${craftedList.length > 2 ? ' 등' : ''})` : '0개';
    const unlockSniffs = Object.keys(log.discoverUnlock || {}).filter(k => k.includes('/smell-')).length;
    const sniffCount = Math.max(log.sniffCount || 0, unlockSniffs);

    const visitScores = {};
    for (const ep of epList()) {
      const id = ep.id;
      let score = Number(log.visits?.[id] || 0) * 3;
      if (log.narrated?.[id]) score += 1;
      if (log.photos?.[id]) score += 2;
      if (log.quests?.[id]) score += 2;
      score += Object.values(seen).filter(d => d && d.place === id).length;
      if (score > 0) visitScores[id] = score;
    }
    const topId = Object.entries(visitScores).sort((a, b) => b[1] - a[1])[0]?.[0] || log.lastPlace || '1-0';
    const topPlace = window.EXPLORE[topId]?.title || '밤의 성전 뜰';
    const sp = Field.spec(sheep.species);
    const worn = Object.values(sheep.wear || {}).filter(Boolean);
    const wearText = worn.length ? worn.join(' · ') : '복슬복슬 기본 털';
    return {
      sheep,
      speciesName: sp?.name || '양',
      wearText,
      days,
      found,
      total,
      themesDone: doneThemes.length,
      themesLabel: doneThemes.length ? `${doneThemes.length}/6 (${doneThemes.map(t => t.icon).join('')})` : '0/6',
      craftedCount: craftedList.length,
      craftedText,
      sniffCount,
      topPlace,
      topPlaceId: topId
    };
  }

  async function ending() {
    if (!Field.has()) return App.home();
    if (!window.SHEEP_DEX) await Field.prepareDex();
    Sound.ambience('마구간');
    Sound.music('silent');
    const log = progress(), record = Field.ensure(), care = Field.mainCare();
    const baseSheep = care?.sheep || record.sheep[0];
    const sheep = { ...baseSheep, wool: baseSheep.shornOn === date() ? 0 : 1 };
    const visited = WALKED_STOPS.filter(s => s.ids.some(id => hasVisitedPlace(id, log)));
    const stops = visited.length ? visited : WALKED_STOPS;
    const summary = buildEndingSummary(log, record, sheep);
    const use3D = Field3D.supported() && typeof Field3D.endingSnapshot === 'function';
    const shots = {};
    let portraitUrl = '';
    try { portraitUrl = await Field.portrait(sheep.species, sheep); } catch { portraitUrl = ''; }

    const root = replace(`<header class="explore-head">${backButton('지도로')}<div><h1>그 길을 함께 걸었어</h1><p>성탄 엔딩 · ${esc(Core.josa(sheep.name, '과와'))} 걸어온 길</p></div></header>
      <div class="walked-ending">
        <section class="walked-stage-card" aria-live="polite">
          <div class="walked-overlay-top">
            <span class="walked-step-pill" data-walked-pill>여정 1/${stops.length}</span>
            <button type="button" class="walked-skip-btn" data-walked-skip>마구간으로 ›</button>
          </div>
          <div class="walked-visual" data-walked-visual></div>
          <div class="walked-caption-box">
            <h2 data-walked-title>${esc(stops[0].label)}</h2>
            <p data-walked-line>${esc(stops[0].line)}</p>
            <div class="walked-dots" role="tablist" aria-label="지나온 장소 장면">
              ${stops.map((s, i) => `<button type="button" class="walked-dot${i === 0 ? ' active' : ''}" data-walked-idx="${i}">${i + 1}. ${esc(s.label)}</button>`).join('')}
              <button type="button" class="walked-dot" data-walked-idx="final">🌟 구유 앞</button>
            </div>
          </div>
        </section>

        <section class="walked-record-card" aria-label="함께 걸은 기록 한 장">
          <div class="walked-record-head">
            ${portraitUrl ? `<img class="walked-sheep-avatar" src="${esc(portraitUrl)}" alt="${esc(sheep.name)}">` : `<div class="walked-sheep-avatar"><svg viewBox="-42 -56 84 75">${Field.sheepArt(sheep)}</svg></div>`}
            <div class="walked-sheep-meta">
              <h3>🐑 ${esc(sheep.name)} <small>(${esc(summary.speciesName)})</small></h3>
              <p>입은 옷 · ${esc(summary.wearText)}</p>
            </div>
          </div>
          <div class="walked-record-grid">
            <div class="walked-stat"><small>함께한 날 수</small><b data-stat="days">${summary.days}일</b></div>
            <div class="walked-stat"><small>모은 발견 수</small><b data-stat="found">${summary.found}/${summary.total}</b></div>
            <div class="walked-stat"><small>주제별 완성</small><b data-stat="themes">${esc(summary.themesLabel)}</b></div>
            <div class="walked-stat"><small>만든 꾸미기</small><b data-stat="crafted">${esc(summary.craftedText)}</b></div>
            <div class="walked-stat"><small>냄새 맡은 횟수</small><b data-stat="sniff">${summary.sniffCount}번</b></div>
            <div class="walked-stat"><small>가장 많이 들른 장소</small><b data-stat="topPlace">${esc(summary.topPlace)}</b></div>
          </div>
          <div class="walked-thanks-banner" data-walked-thanks>그 밤을 향하여 — 함께 걸어 줘서 고마워</div>
        </section>

        <button type="button" class="btn" data-walked-save>📷 사진으로 저장</button>
        <button type="button" class="btn ghost" data-walked-replay>🎬 지나온 장소 다시 이어 보기</button>
      </div>`, 'explore-walked-ending');

    const visualEl = root.querySelector('[data-walked-visual]');
    const pillEl = root.querySelector('[data-walked-pill]');
    const titleEl = root.querySelector('[data-walked-title]');
    const lineEl = root.querySelector('[data-walked-line]');
    const skipBtn = root.querySelector('[data-walked-skip]');
    const dotBtns = [...root.querySelectorAll('[data-walked-idx]')];
    let stepTimer = 0, disposed = false, currentIdx = 0;

    session = {
      id: 'ending',
      dispose() {
        disposed = true;
        clearTimeout(stepTimer);
      }
    };

    async function getStopShot(key, spec) {
      if (shots[key]) return shots[key];
      if (!use3D) return null;
      try {
        const area = window.EXPLORE[spec.rep] || window.EXPLORE.end;
        const url = await Field3D.endingSnapshot({
          place: spec.rep,
          kit: spec.kit,
          seed: area?.seed || 20261225,
          layout: { ...(area?.layout || { time: 'night', angle: 2 }), christmas: spec.kit === 'stable' },
          sheep,
          kneeling: !!spec.kneeling
        });
        if (url) shots[key] = url;
        return url;
      } catch {
        return null;
      }
    }

    function renderFlatScene(sceneName) {
      Art.setChapter(4);
      return `<div class="walked-flat-art">
        <div class="walked-flat-bg">${Art.render(sceneName || '마구간')}</div>
        <svg class="walked-flat-sheep" viewBox="-42 -56 84 75" aria-label="${esc(sheep.name)}">${Field.sheepArt(sheep)}</svg>
      </div>`;
    }

    async function showStep(idx, autoAdvance = false) {
      if (disposed || !root.isConnected) return;
      clearTimeout(stepTimer);
      currentIdx = idx;
      dotBtns.forEach(b => b.classList.toggle('active', b.dataset.walkedIdx === String(idx)));
      if (idx === 'final') {
        pillEl.textContent = '성탄의 밤 · 마구간 앞';
        titleEl.textContent = '그 밤을 향하여 — 함께 걸어 줘서 고마워';
        lineEl.textContent = `${Core.josa(sheep.name, '이가')} 마구간 구유 앞에 조용히 앉았어.`;
        skipBtn.hidden = true;
        const shot = await getStopShot('final', { rep: 'end', kit: 'stable', kneeling: true });
        if (disposed || currentIdx !== 'final') return;
        summary.stableShot = shot || null;
        visualEl.innerHTML = shot
          ? `<img src="${esc(shot)}" alt="마구간 앞에 앉은 ${esc(sheep.name)}">`
          : renderFlatScene('마구간');
        Sound.sfx('star');
        return;
      }
      const stop = stops[idx];
      if (!stop) return;
      skipBtn.hidden = false;
      pillEl.textContent = `지나온 길 ${idx + 1}/${stops.length}`;
      titleEl.textContent = `${stop.label} · ${window.EXPLORE[stop.rep]?.title || stop.label}`;
      lineEl.textContent = stop.line;
      const shot = await getStopShot(stop.key, stop);
      if (disposed || currentIdx !== idx) return;
      visualEl.innerHTML = shot
        ? `<img src="${esc(shot)}" alt="${esc(stop.label)} 장면">`
        : renderFlatScene(stop.scene);
      if (autoAdvance) {
        stepTimer = setTimeout(() => {
          if (disposed) return;
          if (idx + 1 < stops.length) showStep(idx + 1, true);
          else showStep('final', false);
        }, 1500);
      }
    }

    root.querySelector('.explore-back').onclick = map;
    skipBtn.onclick = () => showStep('final', false);
    dotBtns.forEach(btn => btn.onclick = () => {
      const v = btn.dataset.walkedIdx;
      showStep(v === 'final' ? 'final' : Number(v), false);
    });
    root.querySelector('[data-walked-replay]').onclick = () => showStep(0, true);
    root.querySelector('[data-walked-save]').onclick = async () => {
      if (!summary.stableShot && use3D) {
        summary.stableShot = await getStopShot('final', { rep: 'end', kit: 'stable', kneeling: true });
      }
      Field.showCard(root, '그 길을 함께 걸었어', () => Card.drawWalkedTogether(summary),
        'WALKED', '그 길을 함께 걸었어', '그 밤을 향하여 — 함께 걸어 줘서 고마워');
    };

    await showStep(0, true);
  }

  function words() {
    const log = Core.data.field?.explore;
    return epList().flatMap(ep => window.EXPLORE[ep.id].markers
      .filter(marker => marker.type === 'verse' && log?.found?.[foundKey(ep.id, marker.id)])
      .map(marker => ({ title: window.EXPLORE[ep.id].title, ref: marker.ref })));
  }
  window.Explore = {
    map, enter, ending, isOpen, complete, counts, todayEvent, words, newCount, discoverCount, regionCollection,
    encodeDiscoverCode, decodeDiscoverCode,
    notebook: (placeId = null) => openNotebook(document.querySelector('#app main') || document.body, Field.mainCare()?.sheep, placeId),
    title: id => window.EXPLORE[id]?.title,
    get current() { return Core.PREVIEW_ALL ? session : null; }
  };
})();
