/* 날짜별 성탄길. 장소 데이터와 대사는 story/explore.js에 있다. */
(function () {
  const regions = ['예루살렘', '유대 산골', '나사렛·갈릴리', '베들레헴'];
  const icons = { person: '●', quest: '♥', verse: '▤', secret: '⚿', photo: '◎', find: '✦', exit: '➜', event: '★', follow: '◇',
    light: '♨', clear: '◆', guard: '✶' };
  const mapPoints = [
    [72, 131], [239, 178], [88, 164], [61, 199], [114, 219], [259, 224], [306, 184],
    [290, 100], [237, 61], [265, 49], [294, 65], [316, 40], [329, 86], [241, 104],
    [228, 133], [265, 133], [210, 213], [232, 247], [300, 128], [286, 252], [318, 226],
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
    for (const key of ['found', 'quests', 'rewards', 'photos']) {
      if (!log[key] || Array.isArray(log[key]) || typeof log[key] !== 'object') log[key] = {};
    }
    return log;
  }
  const foundKey = (id, marker) => id + '/' + marker;
  function stars(id, log = Core.data.field?.explore) {
    if (!log?.found || !window.EXPLORE[id]) return { n: 0, max: 5 };
    const markers = window.EXPLORE[id].markers.filter(marker => !marker.extra);
    return { n: markers.filter(marker => log.found[foundKey(id, marker.id)]).length, max: markers.length };
  }
  const complete = id => !!Core.data.field?.explore?.found?.[foundKey(id, 'activity')];
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
    return String(text || '').replace(/\{(이름|양)\}/g, (_, key) => key === '양' ? sheep.name : Core.data.nickname || '친구야');
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
    const list = openList(), log = progress(), latest = list.at(-1), tally = counts();
    const event = todayEvent();
    const ball = (ep, i) => {
      const [x, y] = mapPoints[i], score = stars(ep.id, log);
      const secret = log.found[foundKey(ep.id, 'secret')], photo = log.photos[ep.id];
      const tags = (score.n === score.max ? '★' : '') + (secret ? ' ⚿' : '') + (photo ? ' ◎' : '');
      const current = ep.id === latest?.id && ep.date === date();
      return `<button class="explore-map-pin${current ? ' today' : ''}" data-place="${ep.id}" style="--x:${x / 3.7}%;--y:${y / 3.7}%"
        aria-label="${esc(window.EXPLORE[ep.id].title + (current ? ' · 오늘' : '') + (score.n === score.max ? ' · 전부 찾음' : '') + (secret ? ' · 비밀' : '') + (photo ? ' · 사진' : ''))}">
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
      ${first ? `<button type="button" class="btn explore-go" data-place="${first.id}">${esc(window.EXPLORE[first.id].title)}에 가 보자</button>` : '<p class="explore-map-event">첫 이야기가 열리는 날, 지도에 길이 생겨.</p>'}
      <button type="button" class="link explore-places-toggle" aria-expanded="false">장소 이름으로 보기</button>
      <div class="explore-places" hidden>${regions.map((region, i) => {
        const places = list.filter(ep => window.EXPLORE[ep.id].region === i);
        return places.length ? `<h2>${region}</h2>${places.map(ep => `<button type="button" data-place="${ep.id}">${esc(Core.dateLabel(ep.date))} · ${esc(window.EXPLORE[ep.id].title)}</button>`).join('')}` : '';
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
        tx.onerror = () => reject(tx.error);
      });
    } catch { return null; }
  }
  async function photoURL(id, photo) {
    return await photoFile(id, photo.token) || Field.portrait(photo.species, photo);
  }
  function album() {
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

  async function enter(id) {
    const ep = Core.epById(id), area = window.EXPLORE[id], care = Field.mainCare();
    if (!area || !isOpen(ep) || !care?.sheep) return map();
    if (!window.SHEEP_DEX) await Field.prepareDex();
    const log = progress(), record = Field.ensure();
    const sheep = { ...care.sheep, wool: care.sheep.shornOn === date() ? 0 : 1 };
    const day = date(), event = todayEvent(), act = area.activity, wool = Field.spec(sheep.species).wool || 'white';
    const christmas = day >= Core.XMAS || !!Core.data.done.end;
    const eve = day === Core.epById('4-4').date;
    const sameDay = event?.ep === id;
    const list = openList();
    const index = list.findIndex(ep => ep.id === id);
    const exits = [list[index - 1], list[index + 1]].map((ep, i) => ep && ({
      id: 'exit/' + ep.id, type: 'exit', place: ep.id, title: window.EXPLORE[ep.id].title, pos: [i ? 6.9 : -6.9, 7.45]
    })).filter(Boolean);
    log.lastPlace = id; Core.save();
    Sound.music('night'); Sound.ambience('나의 들판');
    const root = replace(`<header class="explore-head">${backButton('지도로')}<div><h1>${esc(area.title)}</h1><p>${esc(Core.dateLabel(ep.date))} · ${esc(regions[area.region])}</p></div><button class="explore-sub" type="button" data-field-return>들판</button></header>
      <div class="explore-location-main"><div class="explore-stage" aria-label="${esc(area.title)}" data-kit="${area.kit}"><p class="explore-loading">장소를 불러오는 중…</p></div>
      <p class="explore-status" role="status">바닥을 톡 누르면 ${esc(Core.josa(sheep.name, '이가'))} 걸어가.</p>
      <p class="explore-task-line"><span data-score></span><strong data-timer hidden></strong></p></div>
      <div class="explore-flat" hidden></div>
      <footer class="explore-foot"><button class="link explore-activity-link" type="button" data-activity-link>⭐ 오늘의 활동</button><button class="link" type="button" data-hints>이 장소에서 할 일</button>
      ${!Core.data.done[id] ? '<span>이야기를 더 보면 새 대화가 열려.</span>' : ''}</footer>
      <button class="btn" type="button" data-field-next hidden>🐑 내 양 돌보러 가기</button>`, 'explore-location');
    const stage = root.querySelector('.explore-stage'), status = root.querySelector('.explore-status');
    const fallback = root.querySelector('.explore-flat'), timer = root.querySelector('[data-timer]');
    const next = root.querySelector('[data-field-next]');
    let view, dead = false, flat = false, shown = [], task;
    let interval = 0, curtain = null, photoBusy = false;
    const observer = new MutationObserver(() => { if (!root.isConnected) dispose(); });
    observer.observe(root.parentElement, { childList: true });
    const fieldBack = () => Field.page({ tonight: id });
    root.querySelector('.explore-back').onclick = map;
    root.querySelector('[data-field-return]').onclick = fieldBack;
    next.onclick = fieldBack;
    root.querySelector('[data-hints]').onclick = showGuide;
    root.querySelector('[data-activity-link]').onclick = () => view ? view.focus('activity') : startActivity();
    function dispose() {
      if (dead) return;
      dead = true; observer.disconnect(); clearInterval(interval);
      view?.destroy(); view = null;
    }
    session = { dispose, get view() { return view; }, id };
    function feedback(text) { status.textContent = text; }
    function withSymbols(markers) { return markers.map(marker => ({ ...marker, symbol: marker.symbol || icons[marker.type] || '✦' })); }
    function refresh() {
      const score = stars(id, log);
      root.querySelector('[data-score]').textContent = (score.n === score.max ? '★ 전부 찾았어!' : `이 장소 ${score.n}/${score.max}`) + (task?.carrying ? ' · ' + task.carrying : '');
      next.hidden = !complete(id);
      root.querySelector('[data-activity-link]').hidden = complete(id) || !!(task && !task.done);
      const running = task && !task.done;
      let markers = [...area.markers, ...exits];
      if (id === '4-4' && (eve || christmas)) markers.push({ id: 'manger', title: '마구간 안', type: 'verse', pos: [0, -4.8] });
      if (sameDay) markers.push({ id: event.id, type: 'event', pos: [-5.15, 5.35], title: event.title,
        hidden: !!event.wool || event.title === '아이들의 숨바꼭질' });
      if (running) {
        if (task.phase === 'return') {
          markers = markers.map(marker => marker.id === 'activity' ? { ...marker, title: '돌려주기' } : marker);
        } else if (task.phase === 'guard') {
          markers.push(...guardMarkers());
        } else {
          task.pieces.forEach((piece, n) => {
            const light = act.kind === 'light' && n !== act.petals;
            const found = task.hits.has(n), lit = found && light;
            if (found && !lit || (act.kind === 'follow' || act.ordered || act.courier) && n !== task.hits.size) return;
            const type = light ? 'light' : { clear: 'clear', follow: 'follow', meet: 'person' }[act.kind] || 'find';
            markers.push({ ...piece, id: 'piece/' + n, type, lit,
              hidden: !!act.hidden, title: lit ? '켜진 등잔' : piece.title });
          });
        }
      }
      shown = withSymbols(markers);
      view?.setMarkers(shown);
      if (flat) renderFlat();
    }
    function renderFlat() {
      const rows = shown.filter(marker => !marker.hidden && marker.type !== 'secret' && !marker.lit);
      const mystery = shown.find(marker => marker.type === 'secret');
      const hidden = shown.filter(marker => marker.hidden);
      fallback.innerHTML = `<div class="explore-flat-markers">${rows.map(marker =>
        `<button type="button" data-mark="${esc(marker.id)}"><i>${marker.symbol}</i><b>${esc(marker.title)}</b></button>`).join('')}</div>
        ${hidden.length || mystery ? `<details class="explore-nooks"><summary>구석을 살펴보기</summary>
          <div>${hidden.map((marker, i) => `<button type="button" data-mark="${esc(marker.id)}">${marker.type === 'event' ? '✦ 수상한 곳' : (act.kind === 'hide' ? '🌿 덤불 ' : '👀 사람들 사이 ') + (i + 1)}</button>`).join('')}
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
      const dialog = Field.showSheet(root, title, `<div class="explore-talk">${who ? `<div class="explore-portrait">${Art.portrait(who)}<b>${esc(who)}</b></div>` : ''}
        ${text ? `<p>${esc(cueText(text, sheep))}</p>` : ''}${detail ? `<small>${esc(detail)}</small>` : ''}${word ? Field.wordMarkup(word) : ''}${extra}</div>
        <button type="button" class="btn" data-continue>${esc(button)}</button>`, 'explore-dialog', () => { if (curtain === dialog) curtain = null; done?.(); });
      curtain = dialog;
      dialog.querySelector('[data-continue]').onclick = () => {
        dialog.close(); dialog.remove(); curtain = null;
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
      const reward = first ? { oil: act.kind === 'guard' || act.wool ? 2 : 1, wool: act.wool || id === '1-0' ? 0 : act.kind === 'hide' ? 2 : 1 } : {};
      if (id === '1-2' || id === '4-2' || id === 'end') reward.item = act.exclusive;
      const item = grant(reward);
      statusChanged();
      refresh();
      Sound.sfx(first ? 'star' : 'pop');
      feedback(first ? '오늘의 활동 완료!' : '다시 해냈어!');
      card(act.title, act.done || (act.manger ? '구유 앞에 내 양이 조용히 무릎을 꿇었어.' : '함께 해냈어!'), {
        who: act.who || area.markers.find(m => m.type === 'person').name,
        word: act.manger ? '눅 2:7' : '',
        detail: [reward.oil && `기름 +${reward.oil}`, reward.wool && `털 +${reward.wool}`, item && '옷장 · ' + item].filter(Boolean).join(' · '),
        button: '계속 둘러보기'
      });
    }
    function initialTask(duration) {
      task = { pieces: act.pieces, hits: new Set(), phase: 'find', done: false, openedNooks: !!act.hidden, duration,
        hiddenIndex: hash(day + id) % Math.max(1, act.pieces.length) };
      if (act.courier) task.carrying = '';
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
      if (act.kind === 'order') act.pieces.forEach((_, i) => setTimeout(() => { if (!dead && task) Sound.sfx('exploreBell', i); }, i * 240));
      refresh();
      feedback(act.kind === 'order' ? act.pieces.map(x => x.title).join(' → ') :
        act.kind === 'follow' ? '빛이 이어지는 다음 자리까지 따라가 봐.' :
        act.courier ? '우물에서 받아 집으로 가져가 봐.' : `근처에서 ${act.pieces.length}개를 찾아봐.`);
    }
    function startActivity() {
      const who = act.who || area.markers.find(m => m.type === 'person').name;
      const prior = log.quests[id] === 'done';
      if (act.manger) {
        if (!christmas) return card(act.title, '문틈으로 따뜻한 빛이 새어 나와.');
        view?.react('sheep', 'sleep'); return win();
      }
      if (act.wool) {
        return card(act.title, act.intro, { who, button: act.button, action: () => {
          if (prior) return win();
          if ((record.woolBag[wool] || 0) < act.wool) return card(act.title, '털이 모이면 다시 와 줘', { who });
          record.woolBag[wool] -= act.wool;
          win();
        } });
      }
      if (task && !task.done) {
        if (task.phase === 'return') {
          if (act.courier && task.hits.size < act.pieces.length) {
            task.carrying = ''; task.phase = 'find'; refresh(); feedback('물동이를 내려놓았어. 우물로 돌아가 봐.'); return;
          }
          win(); return;
        }
        if (task.phase === 'guard') return feedback('늑대 그림자가 나타난 곳에 양을 데려가 봐.');
        return feedback(`${task.hits.size}/${task.pieces.length} 찾았어.`);
      }
      const duration = act.time || (prior && act.replayTime);
      const intro = act.intro || (act.kind === 'meet' ? '여기 있는 사람들 이야기를 들어 봐.' :
        act.kind === 'clear' ? '길을 막은 돌을 톡톡 눌러 치워 봐.' : '표시가 있는 곳을 차례로 살펴봐.');
      card(act.title, intro, { who, button: duration ? `${duration}초 찾기 시작` : '시작', action: () => initialTask(duration) });
    }
    function guardMarkers() {
      const positions = [[-4.8, -2.1], [4.5, -.6], [-1.5, 3.5]];
      return [{ id: 'wolf', title: '늑대 그림자', type: 'guard', pos: positions[task.wolves || 0] }];
    }
    function pickPiece(n) {
      if (!task || task.done || task.hits.has(n) || !task.pieces[n]) return;
      if (task.until && performance.now() > task.until) return;
      if (act.kind === 'hide' && n !== task.hiddenIndex) return feedback('이 덤불엔 없어. 다른 곳을 살펴봐.');
      if (act.kind === 'order' && n !== task.hits.size) {
        task.hits.clear(); refresh();
        Sound.sfx('tap'); feedback('처음부터 다시 · ' + task.pieces.map(piece => piece.title).join(' → ')); return;
      }
      if (act.kind === 'clear' && !task.rocks?.has(n)) {
        task.rocks ||= new Set(); task.rocks.add(n);
        feedback('돌이 흔들렸어. 한 번 더 톡!'); Sound.sfx('tap'); return;
      }
      const piece = task.pieces[n];
      task.hits.add(n);
      Sound.sfx(act.kind === 'order' ? 'exploreBell' : 'pop', n);
      navigator.vibrate?.(12);
      view?.react('piece/' + n);
      feedback((piece.text || (act.kind === 'light' && n !== act.petals ? '등불을 밝혔어.' : '찾았다!')) + ` · ${task.hits.size}/${task.pieces.length}`);
      if (act.kind === 'meet' && piece.text) {
        const last = task.hits.size === task.pieces.length;
        if (last) task.phase = 'return';
        refresh();
        return card(piece.title, piece.text, { who: id === '4-1' ? '여관 주인' : piece.title,
          button: '계속', action: last ? win : undefined });
      }
      if (act.courier) { task.carrying = '물동이'; task.phase = 'return'; }
      if (act.kind === 'hide' || task.hits.size === task.pieces.length) {
        clearInterval(interval); timer.hidden = true;
        if (act.kind === 'deliver' || act.kind === 'hide') {
          task.carrying = act.kind === 'hide' ? '새끼 양' : act.courier ? '물동이' : '물건을 들고 있어';
          task.phase = 'return';
          refresh(); return feedback('활동 자리로 돌아가자.');
        }
        if (act.kind === 'guard') {
          task.phase = 'guard';
          refresh(); return feedback('모닥불이 살아났어. 등불로 늑대 그림자 셋을 쫓아내자.');
        }
        return win();
      }
      refresh();
    }
    function showGuide() {
      const n = stars(id).n;
      const rows = area.markers.filter(m => m.type !== 'secret' && !m.extra);
      card('이 장소에서 할 일', flat ? '목록에서 골라 볼 수 있어.' : '바닥을 톡 눌러 걸어가. 화면을 밀면 방향을 둘러볼 수 있어.', {
        detail: `찾은 것 ${n}/${rows.length}`,
        extra: `<ul class="explore-checklist">${rows.map(m => `<li>${log.found[foundKey(id, m.id)] ? '✓' : icons[m.type]} ${esc(m.title)}</li>`).join('')}${area.markers.some(m => m.type === 'secret') ? '<li>⚿ 조용한 구석에도 들러 봐.</li>' : ''}</ul>`
      });
    }
    function photo() {
      if (photoBusy) return;
      card('포토 스팟', `${Core.josa(sheep.name, '과와')} 찍은 사진을 여정 앨범에 넣을까?`, {
        button: '📷 사진 찍기', action: async () => {
          if (photoBusy) return;
          photoBusy = true;
          let shot;
          try { shot = view?.photo?.(); } catch { /* 기기가 장면을 저장할 수 없으면 양의 초상으로 남김 */ }
          if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches &&
            !document.documentElement.classList.contains('no-motion')) {
            stage.animate([{ filter: 'brightness(2.45)' }, { filter: 'brightness(1)' }], { duration: 235 });
          }
          const data = { species: sheep.species, level: sheep.level, wear: sheep.wear, name: sheep.name, date: day,
            token: globalThis.crypto?.randomUUID?.() || String(Date.now()) };
          let url;
          try {
            url = shot || await Field.portrait(sheep.species, sheep);
            if (dead) return;
            const old = log.photos[id];
            log.photos[id] = data;
            mark(log, id, 'photo'); statusChanged(); refresh();
            if (shot) void photoFile(id, data.token, shot);
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
      if (marker.type === 'exit') return enter(marker.place);
      if (marker.id.startsWith('piece/')) return pickPiece(Number(marker.id.split('/')[1]));
      if (marker.id === 'wolf') {
        view?.react(marker.id, 'scare');
        Sound.sfx('patrolScare'); task.wolves = (task.wolves || 0) + 1;
        if (task.wolves >= 3) return win();
        feedback(`그림자가 물러갔어 · ${task.wolves}/3`); return refresh();
      }
      if (marker.type === 'quest') return startActivity();
      if (marker.type === 'person') {
        mark(log, id, marker.id); statusChanged(); refresh();
        const line = marker.lines.findLast(([seen]) => !seen || Core.data.done[seen]);
        return say(marker, line?.[1], line?.[2] || marker.name);
      }
      if (marker.type === 'secret') {
        mark(log, id, marker.id);
        const assigned = !['1-2', '4-2', 'end'].includes(id);
        if (id === '3-3') view?.react(marker.id, 'star');
        const item = assigned && act.exclusive ? grant({ item: act.exclusive }) : '';
        statusChanged(); refresh(); view?.react(marker.id);
        return card(marker.title, marker.text || (id === '3-3' ? '오늘따라 저 별이 밝다' : '걸음을 늦추니 숨어 있던 자리가 보였어.'), { detail: item ? '옷장 · ' + item : '비밀 장소를 찾았어!' });
      }
      if (marker.type === 'photo') return photo();
      if (marker.type === 'event') return smallEvent(marker);
      if (marker.id === 'manger') return christmas ? card('마구간', '별빛 아래에 구유가 있어.', { word: '눅 2:7' }) :
        card('마구간', eve ? '문틈으로 따뜻한 빛이 새어 나와.' : '소와 나귀가 자고 있다');
      if (marker.type === 'verse') {
        mark(log, id, marker.id); statusChanged(); refresh();
        return card('말씀 비석', '', { word: marker.ref, detail: '말씀 모음에 담았어.' });
      }
    }
    refresh();
    if (!Field3D.supported()) return no3D();
    try {
      const engine = await Field3D.mountExplore(stage, { place: id, kit: area.kit, seed: area.seed, layout: { ...area.layout, christmas, eve,
        blanket: record.woolGifts?.blanket && Object.keys(record.woolGifts.blanket.wool || {}).map(id => window.WOOL_TYPES?.[id]?.color).filter(Boolean) },
        progress: log.quests, found: log.found, sheep, markers: shown }, { canInteract: () => !curtain?.open, onReach: reach, onExit: place => { if (!curtain?.open) enter(place); }, onUnavailable: no3D });
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
