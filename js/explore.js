/* 날짜별 성탄길. 장소 데이터와 대사는 story/explore.js에 있다. */
(function () {
  const regions = ['예루살렘', '유대 산골', '나사렛·갈릴리', '베들레헴'];
  const icons = { person: '●', quest: '♥', verse: '▤', secret: '⚿', photo: '◎', find: '✦', exit: '➜', event: '★', follow: '◇',
    light: '♨', clear: '◆', guard: '✶', fragment: '✦', ability: '🐾', cache: '✧', door: '▣' };
  const mapPoints = [
    [72, 131], [239, 178], [88, 164], [61, 199], [114, 219], [259, 224], [306, 184],
    [290, 100], [237, 61], [265, 49], [294, 65], [316, 40], [329, 86], [241, 104],
    [228, 133], [265, 133], [210, 213], [232, 247], [273, 199], [286, 252], [318, 226],
    [111, 277], [134, 308], [111, 343], [79, 319], [47, 338], [42, 295]
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
  function progress() {
    const field = Field.ensure();
    if (!field.explore || Array.isArray(field.explore) || typeof field.explore !== 'object') field.explore = {};
    const log = field.explore;
    for (const key of ['found', 'quests', 'rewards', 'photos', 'adventures']) {
      if (!log[key] || Array.isArray(log[key]) || typeof log[key] !== 'object') log[key] = {};
    }
    return log;
  }
  const foundKey = (id, marker) => id + '/' + marker;
  function stars(id, log = Core.data.field?.explore) {
    if (window.EXPLORE[id]?.adventure) return { n: [1, 2, 3].filter(n => log?.found?.[foundKey(id, 'star-' + n)]).length, max: 3 };
    if (!log?.found || !window.EXPLORE[id]) return { n: 0, max: 5 };
    const markers = window.EXPLORE[id].markers.filter(marker => !marker.extra);
    return { n: markers.filter(marker => log.found[foundKey(id, marker.id)]).length, max: markers.length };
  }
  const complete = id => window.EXPLORE[id]?.adventure ? !!adventureLog(id)?.done : !!Core.data.field?.explore?.found?.[foundKey(id, 'activity')];
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
    session?.dispose?.();
    session = null;
    Sound.stopVoice?.();
    const app = document.querySelector('#app');
    app.innerHTML = `<main id="explore" class="explore ${className}">${content}</main>`;
    window.scrollTo(0, 0);
    return app.firstElementChild;
  }
  const backButton = label => `<button type="button" class="explore-back" aria-label="${label}" title="${label}">←</button>`;

  function map() {
    if (!Field.has()) return App.home();
    Sound.ambience(null);
    const list = openList(), log = progress(), latest = list.at(-1), tally = counts();
    const event = todayEvent();
    const placeStatus = ep => {
      const area = window.EXPLORE[ep.id], score = stars(ep.id, log);
      return area.adventure ? `별 ${score.n}/3 · 부탁 ${sideCount(area, adventureLog(ep.id, log))}/${area.adventure.sides.length} · 비밀 ${log.found[foundKey(ep.id, 'secret')] ? '✓' : '◇'}` : '';
    };
    const ball = (ep, i) => {
      const [x, y] = mapPoints[i], score = stars(ep.id, log);
      const secret = log.found[foundKey(ep.id, 'secret')], photo = log.photos[ep.id];
      const tags = (score.n === score.max ? '★' : '') + (secret ? ' ⚿' : '') + (photo ? ' ◎' : '');
      const current = ep.id === latest?.id && ep.date === date();
      return `<button class="explore-map-pin${current ? ' today' : ''}" data-place="${ep.id}" style="--x:${x / 3.7}%;--y:${y / 3.7}%"
        aria-label="${esc(window.EXPLORE[ep.id].title + (current ? ' · 오늘' : '') + (score.n === score.max ? ' · 전부 찾음' : '') + (secret ? ' · 비밀' : '') + (photo ? ' · 사진' : '') + (placeStatus(ep) ? ' · ' + placeStatus(ep) : ''))}">
        <b>${i + 1}</b>${tags ? `<small aria-hidden="true">${tags}</small>` : ''}</button>`;
    };
    const route = list.map((_, i) => mapPoints[i].join(',')).join(' ');
    const traveled = list.at(-1)?.id;
    const first = list.find(ep => ep.date === date()) || latest;
    const root = replace(`<header class="explore-head">${backButton('들판으로')}<div><h1>성탄 길 지도</h1><p>내 양과 걸어온 길</p></div><button class="explore-sub" type="button" data-album>사진 ${tally.photos}/27</button></header>
      <div class="explore-parchment">
        <svg viewBox="0 0 370 370" aria-hidden="true">
          <defs>
            <pattern id="mapgrain" width="15" height="15" patternUnits="userSpaceOnUse"><path d="M1 2h1m6 9h1m4-9h1m-8 5h2" stroke="#976c55" opacity=".18" stroke-width="1"/></pattern>
            <linearGradient id="mapland" x2=".8" y2="1"><stop stop-color="#f4e3b9"/><stop offset="1" stop-color="#dfbd89"/></linearGradient>
          </defs>
          <rect width="370" height="370" rx="16" fill="url(#mapland)"/><rect width="370" height="370" rx="16" fill="url(#mapgrain)"/>
          <path d="M236 0Q216 74 246 122Q212 157 236 181Q250 221 227 251Q263 280 245 370" fill="none" stroke="#859cb5" stroke-width="4" opacity=".48"/>
          <path d="M0 256Q98 264 159 243Q252 286 370 215M0 99Q113 73 192 130Q264 151 370 111" fill="none" stroke="#9b7757" stroke-dasharray="8 7" opacity=".33"/>
          <path d="M15 106l13-17 10 13 10-6 12 17m56 136 14-13 9 14 12-10 16 13m127-111 14-22 11 12 16-24 19 32m-322 94 14-15 8 9" fill="none" stroke="#9b7757" stroke-width="2" opacity=".57"/>
          <g fill="#745339" font-size="12" font-weight="700" font-family="sans-serif">
            <text x="23" y="79">예루살렘</text><text x="191" y="161">유대 산골</text>
            <text x="186" y="25">나사렛·갈릴리</text><text x="36" y="258">베들레헴</text>
          </g>
          ${route ? `<polyline points="${route}" stroke="#8c674a" stroke-width="2" fill="none"/><polyline points="${route}" stroke="#ffdf84" stroke-width="2.1" stroke-dasharray="3 7" stroke-linecap="round" fill="none"/>` : ''}
          <path d="M25 42l5-18 5 18-5-3zM18 40l12-5 11 5-11 5z" fill="#916848"/><text x="30" y="19" text-anchor="middle" fill="#916848" font-size="9">북</text>
        </svg>
        ${list.map(ball).join('')}
      </div>
      <div class="explore-map-stats"><span>장소 ${list.length}/27</span><span>★ ${tally.stars}곳</span><span>⚿ ${tally.secrets}곳</span></div>
      ${event ? `<p class="explore-map-event">★ 오늘 ${esc(window.EXPLORE[event.ep].title)}에 무슨 일이 생겼대.</p>` : ''}
      ${first ? `<button type="button" class="btn explore-go" data-place="${first.id}">${esc(window.EXPLORE[first.id].title)}에 가 보자</button>${placeStatus(first) ? `<p class="explore-place-status">${placeStatus(first)}</p>` : ''}` : '<p class="explore-map-event">첫 이야기가 열리는 날, 지도에 길이 생겨.</p>'}
      <button type="button" class="link explore-places-toggle" aria-expanded="false">장소 이름으로 보기</button>
      <div class="explore-places" hidden>${regions.map((region, i) => {
        const places = list.filter(ep => window.EXPLORE[ep.id].region === i);
        return places.length ? `<h2>${region}</h2>${places.map(ep => `<button type="button" data-place="${ep.id}">${esc(Core.dateLabel(ep.date))} · ${esc(window.EXPLORE[ep.id].title)}${placeStatus(ep) ? `<small>${placeStatus(ep)}</small>` : ''}</button>`).join('')}` : '';
      }).join('')}</div>
      ${traveled ? '<button type="button" class="btn ghost explore-challenge">탐험 도전장 저장·공유</button>' : ''}`, 'explore-map');
    root.querySelector('.explore-back').onclick = () => Field.page();
    root.querySelector('[data-album]').onclick = album;
    root.querySelector('.explore-challenge')?.addEventListener('click', () =>
      Field.showCard(root, '탐험 도전장', () => Card.drawExploreChallenge(tally), 'EXPLORE', '탐험 도전장', `내 탐험 기록은 ★ ${tally.stars}곳. 이길 수 있어?`));
    root.querySelectorAll('[data-place]').forEach(button => button.onclick = () => enter(button.dataset.place));
    root.querySelector('.explore-places-toggle').onclick = event => {
      const list = root.querySelector('.explore-places');
      list.hidden = !list.hidden;
      event.currentTarget.setAttribute('aria-expanded', String(!list.hidden));
    };
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
      ${photos.length && (date() >= Core.XMAS || Core.data.done.end) ? '<button class="btn" type="button" data-journey>27일의 여정 저장·공유</button>' : ''}`, 'explore-album');
    root.querySelector('.explore-back').onclick = map;
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
    let restored = false;
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
        state.done = true;
        mark(log, id, 'activity');
        log.quests[id] = 'done';
        const exclusive = id === '1-2' && area.activity.exclusive;
        const reward = { oil: 1, wool: 1, item: exclusive };
        grant(reward);
        const heart = Field.adventureHeart(record, day);
        feedback('오늘의 모험을 마쳤어.');
        Sound.sfx('star');
        return card(id === '1-6' ? '첫째 주 모험 완료' : '오늘의 모험 완료', id === '1-6'
          ? '일곱 날 동안 기다림의 길을 걸었어. 지도에서 걸어온 길을 볼 수 있어.'
          : '지도에 오늘 걸은 길을 기록했어. 별 조각과 마을의 부탁도 더 찾아볼 수 있어.', {
          detail: ['털 +1', '기름 +1', heart && '오늘의 하트 +1', exclusive && ('옷장 · ' + exclusive)].filter(Boolean).join(' · '),
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
          Core.save(); feedback('시간이 다 됐어. 기다리던 사람에게 다시 말을 걸면 재도전할 수 있어.'); refresh();
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
      if (step.type === 'light' && targets[key].type === 'light') { Sound.sfx('ignite'); view?.react(key, 'spark'); }
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
        objectives.animate?.([{ opacity: .65 }, { opacity: 1 }], { duration: 360 });
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
        return card('아이 셋 찾기', step.intro, { who: targets[key].actor, button: '30초 도전 시작', action: begin });
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
      const target = targets[key], line = step.lines?.[key] || (step.type === 'wait' ? '' : step.line);
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
      objectives.querySelector('[data-act-step]').textContent = step ? `모험 ${state.main.step + 1}/${steps.length}` : '모험 완료';
      objectives.querySelector('[data-act-goal]').textContent = step?.goal || '별 조각과 마을의 부탁을 더 찾아보자';
      const small = objectives.querySelector('[data-act-count]');
      small.textContent = step && counted(step).length > 1 ? progressLine(step, main.run) : '';
      bearing.hidden = !focusId || !!clock && clock.mode === 'wait';
      view?.setWaypoint(focusId ? targets[focusId].pos : null);
      if (view && !restored) {
        restored = true;
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
      const score = stars(id, log);
      root.querySelector('[data-score]').textContent = `✦ 별 ${score.n}/3 · 부탁 ${sideCount(area, state)}/${sides.length} · 비밀 ${done('secret') ? '✓' : '◇'}`;
      bagButton.querySelector('small').textContent = slotCount() + '/6';
      next.hidden = !state.done;
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
      if (id === '1-4') for (const key of ['sign1', 'sign2', 'sign3', 'zach']) view?.showResident?.(key, markers.has(key));
      if (id === '1-5') for (const key of ['start', 'bendSouth', 'bend', 'gate']) view?.showResident?.(key, markers.has(key));
      if (id === '1-1') view?.showResident?.('rooftop', markers.has('rooftop') || state.done);
      if (id === '1-6') view?.showResident?.('sunrise', markers.has('sunrise') || state.done);
      return [...markers.values()];
    }
    bagButton.onclick = () => card('모험 가방', '', { extra: bagMarkup(), button: '가방 닫기' });
    root.querySelector('[data-abilities]').onclick = () => abilitySheet();
    root.querySelector('[data-hints]').onclick = ledger;
    bearing.onclick = () => locate(focusId);
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
        bearing.querySelector('i').style.transform = `rotate(${radians.toFixed(2)}rad)`;
        const value = meters + ' m';
        if (bearing.querySelector('small').textContent !== value) bearing.querySelector('small').textContent = value;
      },
      zoneChanged() { const info = getView()?.moveInfo(); if (info) soundZone(info.zone); },
      reach(key) {
        if (clock?.mode === 'wait') return true;
        const track = clock?.mode === 'timed' ? (active(main).includes(key) ? main : null) : lines.find(track => active(track).includes(key));
        if (track) { action(track, key); return true; }
        if (clock?.mode === 'timed') return true;
        return discovered(key);
      }
    };
  }

  async function enter(id) {
    const ep = Core.epById(id), area = window.EXPLORE[id], care = Field.mainCare();
    if (!area || !isOpen(ep) || !care?.sheep) return map();
    if (!window.SHEEP_DEX) await Field.prepareDex();
    const log = progress(), record = Field.ensure();
    const sheep = { ...care.sheep, wool: care.sheep.shornOn === date() ? 0 : 1 };
    const day = date(), event = todayEvent(), act = area.activity, wool = Field.spec(sheep.species).wool || 'white';
    const enhanced = !!area.adventure;
    const christmas = id === 'end', eve = id === '4-4';
    const hasBlanket = !!record.woolGifts?.blanket;
    const npc = area.markers.find(marker => marker.id === 'person');
    const currentLine = marker => marker.lines.findLast(([seen]) => !seen || Core.data.done[seen]);
    const sameDay = event?.ep === id;
    const list = openList();
    const index = list.findIndex(ep => ep.id === id);
    const exits = [list[index - 1], list[index + 1]].map((ep, i) => ep && ({
      id: 'exit/' + ep.id, type: 'exit', place: ep.id, title: window.EXPLORE[ep.id].title, pos: [i ? 6.9 : -6.9, 7.45]
    })).filter(Boolean);
    log.lastPlace = id; Core.save();
    Sound.music('night');
    if (!enhanced) Sound.ambience('나의 들판');
    const root = replace(`<header class="explore-head">${backButton('지도로')}<div><h1>${esc(area.title)}</h1><p>${esc(Core.dateLabel(ep.date))} · ${esc(regions[area.region])}</p></div><button class="explore-sub" type="button" data-field-return>들판</button></header>
      ${enhanced ? `<section class="adventure-objective" aria-label="현재 모험 목표">
        <div><small data-act-step></small><span data-act-count></span><strong data-act-goal aria-live="polite"></strong></div>
        <button type="button" data-bearing aria-label="현재 목표로 걸어가기"><i>↑</i><small>길 찾기</small></button>
      </section>` : ''}
      <div class="explore-location-main"><div class="explore-stage" aria-label="${esc(area.title)}" data-kit="${area.kit}"><p class="explore-loading">장소를 불러오는 중…</p>
      ${enhanced ? '<button type="button" data-quest-map class="adventure-zone"><i aria-hidden="true">◇</i> <span data-zone></span></button>' : ''}</div>
      <p class="explore-status" role="status">${enhanced ? '조이스틱이나 바닥을 톡 눌러 이동해. 오른쪽 화면을 밀면 둘러볼 수 있어.' : `바닥을 톡 누르면 ${esc(Core.josa(sheep.name, '이가'))} 걸어가.`}</p>
      <p class="explore-task-line"><span data-score></span><strong data-timer hidden></strong></p></div>
      <div class="explore-flat" hidden></div>
      ${enhanced ? `<footer class="adventure-actions">
        <button type="button" data-abilities><i>🐑</i> 양 능력</button>
        <button type="button" data-bag><i>🎒</i> 가방 <small>0/6</small></button>
        <button type="button" data-hints><i>☷</i> 마을 일지</button></footer>` : `<footer class="explore-foot"><button class="link explore-activity-link" type="button" data-activity-link>⭐ 오늘의 활동</button><button class="link" type="button" data-hints>이 장소에서 할 일</button>
      ${act.sequence ? '<button class="link" type="button" data-melody hidden>🔔 힌트 다시 듣기</button>' : ''}
      ${act.manger ? '<button class="link" type="button" data-final-album hidden>여정 앨범 열기</button>' : ''}
      ${act.gift ? `<button class="link" type="button" data-gift-go hidden>🎁 ${esc(act.gift[1])}${record.woolGifts[act.gift[0]] ? ' ✓' : ''}</button>` : ''}
      ${!Core.data.done[id] ? '<span>이야기를 더 보면 새 대화가 열려.</span>' : ''}</footer>`}
      <button class="btn" type="button" data-field-next hidden>🐑 내 양 돌보러 가기</button>`, 'explore-location' + (enhanced ? ' adventure-location' : ''));
    const stage = root.querySelector('.explore-stage'), status = root.querySelector('.explore-status');
    const fallback = root.querySelector('.explore-flat'), timer = root.querySelector('[data-timer]');
    const next = root.querySelector('[data-field-next]');
    let view, dead = false, flat = false, shown = [], task;
    let interval = 0, hintTimers = [], curtain = null, photoBusy = false;
    const observer = new MutationObserver(() => { if (!root.isConnected) dispose(); });
    observer.observe(root.parentElement, { childList: true });
    const fieldBack = () => Field.page({ tonight: id });
    root.querySelector('.explore-back').onclick = map;
    root.querySelector('[data-field-return]').onclick = fieldBack;
    next.onclick = fieldBack;
    const melody = root.querySelector('[data-melody]'), finalAlbum = root.querySelector('[data-final-album]');
    if (melody) melody.onclick = playHint;
    if (finalAlbum) finalAlbum.onclick = album;
    const gift = root.querySelector('[data-gift-go]');
    if (gift) gift.onclick = () => Field.page({ tonight: id, gift: act.gift[0] });
    root.querySelector('[data-hints]').onclick = showGuide;
    if (!enhanced) root.querySelector('[data-activity-link]').onclick = () => view ? view.focus('activity') : startActivity();
    const adventure = enhanced ? createAdventure({ id, area, day, log, root, sheep, record, card, grant, feedback,
      refresh, getView: () => view, isFlat: () => flat }) : null;
    function dispose() {
      if (dead) return;
      dead = true; observer.disconnect(); clearInterval(interval); hintTimers.forEach(clearTimeout);
      adventure?.dispose();
      view?.destroy(); view = null;
    }
    session = { dispose, get view() { return view; }, id };
    function feedback(text) { status.textContent = cueText(text, sheep); }
    function withSymbols(markers) { return markers.map(marker => ({ ...marker, symbol: marker.symbol || icons[marker.type] || '✦' })); }
    function refresh() {
      if (adventure) {
        const markers = adventure.render();
        if (sameDay) markers.push({ id: event.id, type: 'event', pos: [-5.25, 20.4],
          title: event.title, hidden: !!event.wool || event.title === '아이들의 숨바꼭질' });
        shown = withSymbols(markers);
        view?.setMarkers(shown);
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
      let markers = [...area.markers, ...exits].filter(marker =>
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
      stage.hidden = true; fallback.hidden = false;
      feedback('목록에서 살펴볼 곳을 눌러 봐.');
      refresh();
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
    function photo() {
      if (photoBusy) return;
      card('포토 스팟', `${Core.josa(sheep.name, '과와')} 찍은 사진을 여정 앨범에 넣을까?`, {
        button: '📷 사진 찍기', action: async () => {
          if (photoBusy) return;
          photoBusy = true;
          let shot;
          try {
            if (act.manger) view?.kneel(false);
            shot = view?.photo();
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
            if (shot) await photoFile(id, data.token, shot);
            if (dead) {
              if (shot) void deletePhoto(id, data.token);
              return;
            }
            const old = log.photos[id];
            log.photos[id] = data;
            mark(log, id, 'photo'); statusChanged(); refresh();
            if (old?.token) void deletePhoto(id, old.token);
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
      if (dead || curtain?.open) return;
      const marker = shown.find(m => m.id === markerId);
      if (!marker) return;
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
    try {
      const engine = await Field3D.mountExplore(stage, { place: id, kit: area.kit, seed: area.seed, layout: { ...area.layout, christmas, eve,
        blanket: record.woolGifts?.blanket && Object.keys(record.woolGifts.blanket.wool || {}).map(id => window.WOOL_TYPES?.[id]?.color).filter(Boolean) },
        progress: log.quests, found: log.found, sheep, markers: shown, adventure: area.adventure }, {
        companionLine: enhanced ? Field.exploreReaction(sheep) : null,
        onFootstep: enhanced ? () => Sound.sfx('walkExplore') : null,
        onBearing: adventure?.onBearing, onZone: adventure?.zoneChanged,
        canInteract: () => !curtain?.open, onReach: reach, onExit: place => { if (!curtain?.open) enter(place); }, onUnavailable: no3D });
      if (dead || flat) { engine.destroy(); return; }
      view = engine;
      stage.querySelector('.explore-loading')?.remove();
      refresh();
    } catch (error) {
      if (Core.PREVIEW_ALL) console.warn('탐험 그래픽', error);
      no3D();
    }
  }

  function words() {
    const log = Core.data.field?.explore;
    return epList().flatMap(ep => window.EXPLORE[ep.id].markers
      .filter(marker => marker.type === 'verse' && log?.found?.[foundKey(ep.id, marker.id)])
      .map(marker => ({ title: window.EXPLORE[ep.id].title, ref: marker.ref })));
  }
  window.Explore = {
    map, enter, isOpen, complete, counts, todayEvent, words,
    title: id => window.EXPLORE[id]?.title,
    get current() { return Core.PREVIEW_ALL ? session : null; }
  };
})();
