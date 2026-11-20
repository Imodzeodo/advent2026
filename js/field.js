/* 나의 들판 · 저장, 돌봄, 배치와 이야기 연출 */
(function () {
  const MAX_SHEEP = 12;
  const DAY_MS = 86400000;
  const names = ['솜이', '구름', '별이', '몽실', '하양', '보리', '콩이', '눈송이', '달래', '소망', '기쁨'];
  const market = [
    ['나무 울타리', 'ground', 2], ['올리브나무', 'ground', 3], ['돌 양 우리', 'ground', 4],
    ['모닥불', 'ground', 4], ['목자 천막', 'ground', 5], ['우물', 'ground', 5],
    ['등불 기둥', 'ground', 3], ['하늘 등', 'sky', 2], ['별똥별 비', 'sky', 8],
    ['빨간 목도리', 'wear', 3], ['꽃 화관', 'wear', 3]
  ];
  const specials = ['보라 방울', '은 종', '분홍 리본', '금빛 별 목걸이'];
  const catalog = Object.fromEntries([...market, ...specials.map(id => [id, 'wear'])].map(([id, kind]) => [id, kind]));
  const slots = [[39, 231], [118, 224], [241, 224], [321, 233], [40, 321], [117, 354], [243, 354], [319, 321], [53, 111], [308, 99]];
  const pasture = [[180, 306], [114, 283], [244, 277], [57, 277], [302, 276], [83, 371], [281, 369], [183, 383],
    [135, 251], [219, 327], [151, 337], [203, 251]];
  const feeding = ['잘 먹는구나.', '양은 목자 목소리를 안단다.', '오늘도 와 줬구나.'];
  const foundLine = '찾았구나! 아흔아홉 마리를 두고서라도 찾는 거란다.';
  const verse = '너희 중에 어떤 사람이 양 백 마리가 있는데 그 중의 하나를 잃으면 아흔아홉 마리를 들에 두고 그 잃은 것을 찾아내기까지 찾아다니지 아니하겠느냐';
  const date = () => Core.nowKST().date;
  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[c]);
  const daysBetween = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / DAY_MS);
  const field = () => Core.data.field;
  const has = () => !!field()?.sheep?.length;
  const stage = s => s.care >= 7 ? 2 : s.care >= 3 ? 1 : 0;
  const stageName = s => ['새끼 양', '어린 양', '큰 양'][stage(s)];
  const nameSheep = (name, fallback) => Array.from(name.trim()).slice(0, 8).join('') || fallback;
  const newSheep = (name, n) => ({ id: 'sheep-' + n, name, born: date(), care: 0, wear: null, lost: false });
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  const voice = name => { Sound.voice(name).catch(() => {}); };
  let artId = 0;
  const receiving = new WeakMap();

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
    if (changed) Core.save();
    return data.field;
  }

  function addOil(n, why) {
    if (Core.addOil) return Core.addOil(n, why);
    ensure();
    Core.data.oil = (Core.data.oil || 0) + n;
    Core.data.oilEarned += n;
    Core.save();
  }

  function spendOil(n) {
    if (Core.spendOil) return Core.spendOil(n);
    ensure();
    if ((Core.data.oil || 0) < n) return false;
    Core.data.oil -= n;
    Core.save();
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
    return { sheep: data?.sheep?.length || 0, careDays: data?.careDays || 0, found: data?.found || 0 };
  }

  function available(id) {
    const data = field();
    const used = Object.values(data.slots).filter(item => item === id).length +
      data.sheep.filter(sheep => sheep.wear === id).length;
    return Math.max(0, (data.items[id] || 0) - used);
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

  /* 들판과 인증 카드가 같은 SVG 조각을 사용한다. */
  function sheepArt(sheep) {
    const size = [0.72, 0.87, 1][stage(sheep)];
    const fluff = stage(sheep) === 2 ? '<circle cx="-23" cy="-20" r="8"/><circle cx="5" cy="-35" r="8"/><circle cx="16" cy="-28" r="9"/>' : '';
    return `<g transform="scale(${size})">
      <ellipse cy="1" rx="30" ry="5" fill="#081321" opacity=".48"/>
      <path d="M-16 -10v11m22-11v11m-28-12v8m34-8v8" fill="none" stroke="#303041" stroke-width="4" stroke-linecap="round"/>
      <g fill="#e8dfce"><ellipse cx="-5" cy="-16" rx="25" ry="15"/><circle cx="-19" cy="-25" r="10"/><circle cx="-7" cy="-29" r="10"/><circle cx="5" cy="-25" r="12"/>${fluff}</g>
      <path d="M-25 -23q6-10 14-6m3-4q7-4 13 2" stroke="#fff4dc" stroke-width="2" stroke-linecap="round" opacity=".7" fill="none"/>
      <path d="M17-23q-9-6-10 0q1 4 9 5m8-5q8-6 10-2q1 4-8 7" fill="#484454"/>
      <ellipse cx="23" cy="-18" rx="10" ry="10" fill="#343344"/><circle cx="27" cy="-20" r="1.35" fill="#fff0d7"/>
      ${wearArt[sheep.wear] || ''}
    </g>`;
  }

  const wearArt = {
    '빨간 목도리': '<path d="M13-13q4 6 10 7l-2 5m-2-7l6 5" stroke="#f78083" stroke-width="4" stroke-linecap="round" fill="none"/>',
    '꽃 화관': '<path d="M15-27q9-5 16 0" fill="none" stroke="#83bd89" stroke-width="2"/><circle cx="17" cy="-27" r="2.7" fill="#fff0a1"/><circle cx="23" cy="-29" r="2.8" fill="#f995b6"/><circle cx="29" cy="-27" r="2.7" fill="#e2bcf5"/>',
    '보라 방울': '<path d="M13-13l9 8 7-8" fill="none" stroke="#ac83f3" stroke-width="2"/><circle cx="22" cy="-4" r="4" fill="#c9a4ff"/>',
    '은 종': '<path d="M13-13l9 7 7-7" fill="none" stroke="#d1dff4" stroke-width="2"/><path d="M17-2q2-2 2-5q3-5 6 0q0 3 2 5zm4 2h2" fill="#e2e9f7" stroke="#c3cadd"/>',
    '분홍 리본': '<path d="M13-13l9 7 7-7" fill="none" stroke="#eeb7d2" stroke-width="2"/><path d="M22-4l-7-4v9l7-4 7 4v-9z" fill="#f89bbd"/>',
    '금빛 별 목걸이': '<path d="M13-13l9 7 7-7" fill="none" stroke="#ffcf70" stroke-width="2"/><path d="M22-9l1.5 4 4.5 0-3.5 2.5 1.5 4-4-2.5-4 2.5 1.5-4L16-5h4.5z" fill="#ffd778"/>'
  };

  const glow = '<circle class="field-glow" cy="-13" r="28" fill="#ffc372" opacity=".19"/><circle cy="-13" r="17" fill="#ffc372" opacity=".13"/>';
  const objects = {
    '나무 울타리': '<path d="M-24-6l48-5m-48-6l48-5" stroke="#ac815d" stroke-width="5"/><path d="M-21 0v-26m21 24v-26m21 24v-26" stroke="#dbaf7a" stroke-width="4" stroke-linecap="round"/>',
    '올리브나무': '<path d="M-2 0q6-15-2-30m3 19l12-15M0-12l-13-10" stroke="#9a795f" stroke-width="5" fill="none"/><path d="M-26-31q-4-12 10-13q6-12 20-6q14-1 17 9q12 3 8 13q-4 10-18 7q-8 8-22 1q-14 4-15-11z" fill="#547861"/><ellipse cx="-10" cy="-38" rx="14" ry="7" fill="#6a8c70"/>',
    '돌 양 우리': '<path d="M-28-5v-18h56v18H8v-8H-8v8Z" fill="#9d98a1"/><path d="M-27-14H27M-19-22v8M-8-22v8M4-22v8M16-22v8m-38 1v7m37-7v7" fill="none" stroke="#5b6072" stroke-width="2"/>',
    '모닥불': glow + '<path d="M-16 1l30-8M-15-8l30 10" stroke="#7c5240" stroke-width="5" stroke-linecap="round"/><path class="field-flame" d="M-11-6q-7-8 1-17q0 7 5 7q3-5 5-15q15 13 12 21q-3 9-23 4z" fill="#ff9855"/><path d="M-6-7q-1-6 7-14q8 10 3 14z" fill="#ffe18b"/>',
    '목자 천막': '<path d="M-29-4L-16-28L13-30L30-4z" fill="#b28e74"/><path d="M-29-4L-16-28L2-4z" fill="#d2ab87"/><path d="M-22-4L-16-23L-5-4z" fill="#4b3444"/><path d="M13-30l21 27m-50-25l-17 25" fill="none" stroke="#e7c9a2" stroke-width="1.4"/>',
    '우물': '<path d="M-18-5v-13h36v13q-18 9-36 0" fill="#aa97a0"/><ellipse cy="-18" rx="18" ry="6" fill="#413e55" stroke="#b9a6aa" stroke-width="3"/><path d="M-14-20v-17h28v17m-14-15v13" stroke="#cba47e" stroke-width="3" fill="none"/><path d="M-21-35L0-49l21 14z" fill="#8f635e"/>',
    '등불 기둥': '<g transform="translate(9,-24)">' + glow + '</g><path d="M-7 1v-41q0-7 8-7q8 0 8 7" stroke="#b38b61" stroke-width="4" fill="none"/><rect x="3" y="-38" width="12" height="14" rx="3" fill="#ffca73"/><path d="M2-37h14m-14 13h14m-7-13v13" stroke="#88583c" stroke-width="1.4"/>',
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
    const flock = demo ? [{ name: '', care: 0 }] : data?.sheep || [];
    return scenery() + slots.map(([x, y], i) => decor[i] ? at(x, y, objects[decor[i]] || '') : '').join('') +
      (data?.items?.['마구간'] ? at(184, 209, objects['마구간']) : '') +
      flock.slice(0, MAX_SHEEP).map((sheep, i) => {
        const [x, y] = pasture[i];
        if (sheep.lost) return '';
        return at(x, y, sheepArt(sheep) + (labels ? `<text x="0" y="14" text-anchor="middle" fill="#fff3d7" stroke="#14212f" stroke-width="3" paint-order="stroke" font-size="11" font-family="sans-serif">${esc(sheep.name)}</text>` : ''));
      }).join('');
  }

  function panelHTML() {
    const data = ensure();
    const open = has();
    const due = open && data.cared !== date();
    const episode = Core.epById('1-0');
    const remaining = daysBetween(date(), episode?.date || '2026-11-29');
    const notice = Core.REL ? '첫 번째 이야기가 열리면, 할아버지가 선물을 들고 와요 🎁' : '11/29 주일 예배 후, 들판의 할아버지가 선물을 들고 와요 🎁';
    return `<section class="field-panel">
      <div class="field-panel-picture">${svg(mapArt(data, false, !open))}</div>
      <div class="field-panel-copy"><h2>나의 들판</h2>
        <p>${open ? `${data.sheep.length}마리 · ${due ? '<span class="field-dot"></span> 오늘 꼴 주기 전' : '오늘 꼴 주기 완료'}` : esc(notice)}</p>
        ${open ? '<button type="button" class="btn small field-enter">들판 가기</button>' : `<small>${remaining > 0 ? 'D-' + remaining : '🔒 첫 이야기를 마치면 열려요'}</small>`}
        ${!open && Core.PREVIEW_ALL ? '<button type="button" class="btn small field-test-lamb">🧪 미리보기: 양 받기</button>' : ''}
      </div></section>`;
  }

  function bindPanel(root) {
    const button = root.querySelector('.field-enter');
    if (button) button.onclick = page;
    const test = root.querySelector('.field-test-lamb');
    if (test) test.onclick = async () => {
      const stage = document.createElement('div');
      stage.className = 'field-test-stage';
      stage.style.cssText = 'position:fixed;inset:0;z-index:70;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(4,5,16,.92)';
      document.body.append(stage);
      try { await receiveFirstLamb(stage); } finally { stage.remove(); }
      page();
    };
  }

  // 미리보기(?preview=all) 전용 시험 도구
  function testTools(data, rerender) {
    if (!Core.PREVIEW_ALL) return '';
    setTimeout(() => {
      const box = document.querySelector('.field-test-tools');
      if (!box) return;
      box.querySelector('[data-t=oil]').onclick = () => { addOil(20, 'test'); rerender('🧪 기름 +20'); };
      box.querySelector('[data-t=day]').onclick = () => { data.cared = ''; Core.save(); rerender('🧪 하루가 지났어요 · 다시 꼴을 줄 수 있어요'); };
      box.querySelector('[data-t=lost]').onclick = () => {
        const left = data.sheep.filter(s => !s.lost);
        if (!left.length) return rerender('🧪 길 잃을 양이 없어요');
        left[Math.floor(Math.random() * left.length)].lost = true; data.lostOn = date(); Core.save(); rerender('🧪 양 한 마리가 길을 잃었어요');
      };
    });
    return `<div class="field-test-tools" style="margin-top:14px;padding:10px;border:1px dashed rgba(255,210,122,.5);border-radius:12px">
      <small style="opacity:.8">🧪 미리보기 전용 시험 도구</small>
      <div class="row" style="margin-top:6px"><button type="button" class="btn ghost small" data-t="oil">기름 +20</button><button type="button" class="btn ghost small" data-t="day">하루 넘기기</button><button type="button" class="btn ghost small" data-t="lost">잃은 양 부르기</button></div></div>`;
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
      return `<button type="button" class="field-sheep" style="${position(x, y)};--delay:${-i * 1.47}s;--drift:${i % 2 ? -12 : 12}px" data-sheep="${i}" data-stage="${stage(sheep)}"
        aria-label="${esc(sheep.name)} · ${stageName(sheep)}" ${moving ? 'disabled' : ''}>${sprite(sheepArt(sheep), '-36 -45 72 52')}</button>`;
    }).join('');
    return `<div class="field-map">${svg(scenery())}
      ${data.items['마구간'] ? `<span class="field-stable" style="${position(184, 209)}" aria-label="마구간" role="img">${sprite(objects['마구간'], '-48 -73 96 83')}</span>` : ''}
      ${Object.values(data.slots).includes('별똥별 비') ? `<span class="field-meteor">${sprite(trail, '-56 -27 65 36')}</span>` : ''}
      ${slotsHTML}${flockHTML}</div>`;
  }

  function page() {
    if (!has()) return App.home();
    lostCheck();
    Sound.music('night');
    Sound.ambience(null);
    Sound.stopVoice();
    const app = document.getElementById('app');
    const root = document.createElement('main');
    root.id = 'field';
    root.className = 'screen page field-page';
    app.replaceChildren(root);
    window.scrollTo(0, 0);
    let moving = null;

    function render(message = '') {
      const data = ensure();
      const due = data.cared !== date();
      const missing = data.sheep.find(s => s.lost);
      root.innerHTML = `<header class="field-header"><button class="back" type="button" aria-label="홈으로">←</button>
        <div><h1>나의 들판</h1><p>${data.sheep.length}마리의 양</p></div>
        <span class="field-oil"><span aria-hidden="true">◕</span> 기름 ${Core.data.oil || 0}</span></header>
        ${mapMarkup(data, moving)}
        <div class="field-manage">
        ${missing ? `<aside class="field-lost"><span aria-hidden="true">🐑</span><div><strong>${esc(Core.josa(missing.name, '이가'))} 안 보여!</strong><button type="button" class="link field-find">찾으러 가자 →</button></div></aside>` : ''}
        ${moving ? `<p class="field-move-tip"><span>${esc(Core.josa(moving.item, '을를'))} 놓을 빈 칸을 골라 줘.</span><button type="button" class="link field-cancel-move">취소</button></p>` :
          `<button type="button" class="btn field-feed ${due ? 'due' : ''}" ${due ? '' : 'disabled'}>${due ? '🌾 꼴 주기' : '✓ 오늘 꼴 주기 완료'}</button>
            <div class="row"><button type="button" class="btn ghost field-market">들판 장터</button><button type="button" class="btn ghost field-card">들판 카드</button></div>`}
        <p class="field-feedback" role="status">${esc(message)}</p>
        ${moving ? '' : testTools(data, render)}</div>`;
      root.querySelector('.back').onclick = () => App.home();
      root.querySelector('.field-cancel-move')?.addEventListener('click', () => { moving = null; render(); });
      root.querySelector('.field-feed')?.addEventListener('click', feed);
      root.querySelector('.field-market')?.addEventListener('click', shop);
      root.querySelector('.field-card')?.addEventListener('click', cardPage);
      root.querySelector('.field-find')?.addEventListener('click', () => search(missing));
      root.querySelectorAll('[data-slot]').forEach(button => {
        button.onclick = () => selectSlot(Number(button.dataset.slot));
      });
      root.querySelectorAll('[data-sheep]').forEach(button => {
        button.onclick = () => pet(data.sheep[Number(button.dataset.sheep)], button);
      });
    }

    function sheet(title, body, className = '') {
      const previous = root.querySelector('.field-sheet');
      if (previous) { previous.close(); previous.remove(); }
      const modal = document.createElement('dialog');
      modal.className = 'field-sheet ' + className;
      modal.setAttribute('aria-labelledby', 'field-sheet-title');
      modal.innerHTML = `<header><h2 id="field-sheet-title">${esc(title)}</h2><button type="button" class="field-close" aria-label="닫기">×</button></header>${body}`;
      modal.querySelector('.field-close').onclick = () => modal.close();
      modal.addEventListener('close', () => modal.remove(), { once: true });
      root.append(modal);
      modal.showModal();
      return modal;
    }

    function feed() {
      const data = ensure();
      const today = date();
      if (data.cared === today) return;
      const grown = [];
      data.sheep.forEach(sheep => {
        const before = stage(sheep);
        sheep.care++;
        if (stage(sheep) !== before) grown.push(sheep.name);
      });
      data.cared = today;
      data.careDays = (data.careDays || 0) + 1;
      addOil(1, 'field-care');
      Core.save();
      const pick = Math.floor(Math.random() * feeding.length);
      Sound.sfx('mission');
      voice('field-' + (pick + 1));
      const grownLine = grown.length ? ` · ${Core.josa(grown.length === 1 ? grown[0] : `양 ${grown.length}마리`, '이가')} 한 뼘 자랐어!` : '';
      render(`${feeding[pick]} 기름 +1${grownLine}`);
      root.querySelector('.field-map').insertAdjacentHTML('beforeend', '<span class="field-hay" aria-hidden="true">🌾</span>');
    }

    function shop() {
      const count = stats().sheep;
      const price = count + 2;
      const oil = Core.data.oil || 0;
      const modal = sheet('들판 장터', `<p class="field-sheet-meta">기름 <strong>${oil}방울</strong> · 양 ${count}/${MAX_SHEEP}마리</p>
        <button type="button" class="field-buy-lamb" data-buy="양" ${oil < price || count >= MAX_SHEEP ? 'disabled' : ''}>${sprite(sheepArt({ care: 0 }))}<span>새 양 데려오기</span><b>${count >= MAX_SHEEP ? '최대 12마리' : price + '방울'}</b></button>
        <div class="field-shop-grid">${market.map(([id, kind, cost]) =>
          `<button type="button" data-buy="${id}" ${oil < cost ? 'disabled' : ''}>${icon(id, kind)}<span>${id}</span><b>${cost}방울</b></button>`).join('')}</div>`);
      modal.querySelectorAll('[data-buy]').forEach(button => {
        button.onclick = () => {
          const id = button.dataset.buy;
          if (id === '양') {
            const fallback = names[count - 1];
            const naming = sheet('새 양의 이름', nameForm('데려오기 · ' + price + '방울', fallback));
            naming.querySelector('form').onsubmit = event => {
              event.preventDefault();
              const data = field();
              if (data.sheep.length !== count || count >= MAX_SHEEP || !spendOil(price)) { naming.close(); return shop(); }
              const sheep = newSheep(nameSheep(naming.querySelector('input').value, fallback), count + 1);
              data.sheep.push(sheep);
              Core.save();
              naming.close();
              Sound.sfx('sheep');
              voice('field-4');
              render(`${Core.josa(sheep.name, '이가')} 왔어! 식구가 늘었구나.`);
            };
            return;
          }
          const [, , cost] = market.find(item => item[0] === id);
          if (spendOil(cost)) giveItem(id);
          modal.close();
          render();
          shop();
        };
      });
    }

    function selectSlot(index) {
      const data = field();
      if (moving) {
        if (data.slots[index] || data.slots[moving.index] !== moving.item) return;
        data.slots[index] = moving.item;
        delete data.slots[moving.index];
        moving = null;
        Core.save();
        return render('자리를 옮겼어.');
      }
      const id = data.slots[index];
      if (id) {
        const modal = sheet(id, `<div class="field-inventory-icon">${sprite(objects[id] || '')}</div>
          <div class="row"><button type="button" class="btn field-move">옮기기</button><button type="button" class="btn ghost field-remove">치우기</button></div>`);
        modal.querySelector('.field-move').onclick = () => {
          const kind = index < 8 ? 'ground' : 'sky';
          if (!slots.some((_, i) => !data.slots[i] && (i < 8 ? 'ground' : 'sky') === kind)) {
            modal.close();
            return render('옮겨 놓을 빈 칸이 없어.');
          }
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
        `<div class="field-shop-grid">${items.map(([item]) => `<button type="button" data-place="${item}">${icon(item, kind)}<span>${item}</span><b>${available(item)}개</b></button>`).join('')}</div>` :
        '<p class="field-sheet-meta">들판 장터에서 물건을 데려오면 이 칸에 놓을 수 있어.</p>');
      modal.querySelectorAll('[data-place]').forEach(button => {
        button.onclick = () => {
          const item = button.dataset.place;
          if (data.slots[index] || !available(item)) return;
          data.slots[index] = item;
          Core.save();
          modal.close();
          render(`${Core.josa(item, '을를')} 놓았어.`);
        };
      });
    }

    function pet(sheep, button) {
      Sound.sfx('sheep');
      button.animate?.([{ scale: '1' }, { scale: '1.1' }, { scale: '1' }], { duration: 400 });
      const modal = sheet(sheep.name, `<div class="field-pet-art">${sprite(sheepArt(sheep), '-42 -48 84 56')}<span aria-hidden="true">♥</span></div>
        <p class="field-pet-state">${stageName(sheep)} · 돌본 날 ${sheep.care}일${sheep.wear ? ' · ' + esc(sheep.wear) : ''}</p>
        <button type="button" class="btn field-wear">꾸미기</button>`);
      modal.querySelector('.field-wear').onclick = () => dress(sheep);
    }

    function dress(sheep) {
      const items = Object.keys(catalog).filter(id => catalog[id] === 'wear' && (available(id) || sheep.wear === id));
      const modal = sheet(sheep.name + ' 꾸미기', `<div class="field-pet-art">${sprite(sheepArt(sheep), '-42 -48 84 56')}</div>
        ${items.length ? `<div class="field-shop-grid">${items.map(id => `<button type="button" data-wear="${id}" aria-pressed="${sheep.wear === id}">${icon(id, 'wear')}<span>${id}</span><b>${sheep.wear === id ? '착용 중' : '달아 주기'}</b></button>`).join('')}</div>` : '<p class="field-sheet-meta">들판 장터에서 꾸미기를 고를 수 있어.</p>'}
        ${sheep.wear ? '<button type="button" class="btn ghost field-unwear">벗기기</button>' : ''}`);
      const wear = id => {
        if (id && sheep.wear !== id && !available(id)) return;
        sheep.wear = id;
        Core.save();
        Sound.sfx('pop');
        modal.close();
        render(id ? `${Core.josa(id, '을를')} 달았어.` : '꾸미기를 벗겼어.');
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
          addOil(2, 'field-found');
          Core.save();
          voice('field-5');
          modal.close();
          render(`${Core.josa(sheep.name, '이가')} 돌아왔어! 기름 +2`);
          const text = (window.BIBLE || {})['눅 15:4'] || verse;
          sheet('찾았어! · 기름 +2', `<p class="field-found-line">${foundLine}</p>
            <blockquote class="field-verse">${esc(Array.isArray(text) ? text[0] : text)}<cite>누가복음 15:4</cite></blockquote>`);
        }
      }, '양');
    }

    async function cardPage() {
      const modal = sheet('들판 카드', '<p class="field-sheet-meta" role="status">들판을 그리고 있어요…</p>', 'field-card-sheet');
      try {
        const canvas = await drawCard();
        const blob = await Card.toBlob(canvas);
        if (!modal.open) return;
        const url = URL.createObjectURL(blob);
        modal.addEventListener('close', () => URL.revokeObjectURL(url), { once: true });
        modal.querySelector('.field-sheet-meta').outerHTML = `<img class="field-card-preview" src="${url}" alt="양과 별이 그려진 나의 들판 카드">
          <div class="row"><button type="button" class="btn field-share">카톡으로 공유</button>
          <a class="btn ghost" href="${url}" download="${esc(Card.fileName?.('FIELD', true) || '그밤-들판.png')}">이미지 저장</a></div>
          <p class="field-save-note" role="status"></p>`;
        modal.querySelector('.field-share').onclick = async () => {
          try {
            if (await Card.share(canvas, 'FIELD') !== 'fallback') return;
          } catch { /* 이미지를 길게 눌러 저장하는 방법으로 안내한다. */ }
          modal.querySelector('.field-save-note').textContent = '이미지를 길게 누르거나 이미지 저장을 눌러 주세요.';
        };
      } catch {
        if (modal.open) modal.querySelector('.field-sheet-meta').textContent = '카드를 그리지 못했어. 다시 열어 봐.';
      }
    }

    render();
  }

  function icon(id, kind) {
    return sprite(kind === 'wear' ? sheepArt({ care: 3, wear: id }) : objects[id]);
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
    const content = box.querySelector('.field-story-content');
    const lines = ['오늘 새벽에 태어난 녀석이다.', '성탄까지 네가 맡아 주겠니? 이름을 지어 주렴.'];
    return new Promise(resolve => {
      let i = 0;
      const say = () => {
        content.querySelector('p').textContent = lines[i];
        voice('lamb-' + (i + 1));
      };
      say();
      content.querySelector('button').onclick = () => {
        if (++i < lines.length) return say();
        content.innerHTML = `<div class="field-story-lamb">${sprite(sheepArt({ care: 0 }), '-37 -43 74 51')}</div>${nameForm('이 이름으로 맡을게', '첫눈')}`;
        content.querySelector('form').onsubmit = async event => {
          event.preventDefault();
          const name = nameSheep(content.querySelector('input').value, '첫눈');
          if (!has()) {
            const data = ensure();
            data.since = date();
            data.sheep.push(newSheep(name, 1));
            Core.save();
          }
          Sound.sfx('star');
          content.innerHTML = `<div class="field-arrival"><div class="field-burst" aria-hidden="true">${Array.from({ length: 12 }, (_, i) => {
            const angle = i * Math.PI / 6;
            return `<span style="--dx:${Math.cos(angle) * 105}px;--dy:${Math.sin(angle) * 65}px;--delay:${i % 3 * .045}s">${i % 2 ? '✧' : '✦'}</span>`;
          }).join('')}</div><p>🐑 ${esc(Core.josa(name, '이가'))} 네 들판에 왔어!</p></div>`;
          await wait(950);
          resolve();
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
      data.sheep.push(newSheep('테스트양', 1));
      Core.save();
      return Promise.resolve();
    }
    const result = firstLamb(box).finally(() => { receiving.delete(box); });
    receiving.set(box, result);
    return result;
  }

  async function flockScene(box) {
    if (!has()) return;
    const data = field();
    const flock = data.sheep.slice(0, MAX_SHEEP);
    if (!window.__fast) {
      Art.setChapter(4);
      box.innerHTML = `<section class="field-story field-flock">
        <div class="field-story-art">${Art.render('마구간')}</div>
        <div class="field-procession">${flock.map((sheep, i) => `<div class="field-procession-sheep" style="--col:${12.5 + (i % 4) * 25}%;--row:${29 + Math.floor(i / 4) * 28}%;--arrival:${i * .25}s">
          ${sprite(sheepArt(sheep), '-36 -43 72 53')}<span>${esc(sheep.name)}</span></div>`).join('')}</div>
        <div class="field-story-content"><div class="field-story-talk"><p>네가 돌본 양들도, 그 밤 구유 곁에 있었다.</p>
          <button type="button" class="btn ghost" disabled>계속</button></div></div></section>`;
      const button = box.querySelector('.field-story-talk button');
      Sound.sfx('sheep');
      await wait(950 + (flock.length - 1) * 250);
      button.disabled = false;
      await new Promise(resolve => { button.onclick = resolve; });
    }
    data.items['마구간'] = 1;
    Core.save();
  }

  async function drawCard() {
    if (document.fonts) await Promise.race([document.fonts.ready, wait(550)]);
    const data = ensure();
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1350;
    const ctx = canvas.getContext('2d');
    const bg = ctx.createLinearGradient(0, 0, 0, 1350);
    bg.addColorStop(0, '#131734');
    bg.addColorStop(.68, '#1b263d');
    bg.addColorStop(1, '#0c1329');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 1080, 1350);
    ctx.strokeStyle = '#b5925a';
    ctx.lineWidth = 2;
    ctx.strokeRect(29, 29, 1022, 1292);
    ctx.strokeStyle = '#635b61';
    ctx.strokeRect(42, 42, 996, 1266);
    const write = (line, y, size, color, font, max = 912) => {
      ctx.fillStyle = color;
      ctx.font = font.replace('SIZE', size + 'px');
      ctx.textAlign = 'center';
      ctx.fillText(line, 540, y, max);
    };
    write('그 밤을 향하여', 111, 27, '#c3a36d', 'SIZE sans-serif');
    write((Core.data.nickname || '등불지기') + '의 들판', 204, 67, '#ffe5ab', 'bold SIZE "Gowun Batang", "AppleMyungjo", serif');
    write('양 ' + data.sheep.length + '마리', 268, 32, '#e1dbd9', 'SIZE sans-serif');
    const art = svg(mapArt(data, true));
    const url = URL.createObjectURL(new Blob([art], { type: 'image/svg+xml;charset=utf-8' }));
    try {
      const picture = new Image();
      picture.src = url;
      await picture.decode();
      ctx.drawImage(picture, 170, 302, 740, 822);
      ctx.strokeStyle = '#b5925a';
      ctx.strokeRect(170, 302, 740, 822);
    } finally {
      URL.revokeObjectURL(url);
    }
    write('모은 기름 ' + Core.data.oilEarned + '방울', 1200, 33, '#ffe5ab', 'SIZE sans-serif');
    write(window.SITE?.label || '그 밤을 향하여', 1270, 26, '#cec0af', 'SIZE sans-serif');
    return canvas;
  }

  window.Field = { ensure, has, panelHTML, bindPanel, page, receiveFirstLamb, flockScene, giveItem, drawCard, lostCheck, stats };
})();
