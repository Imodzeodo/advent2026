/* 저장(localStorage), 한국 시간 날짜 잠금, 테스트 모드 */
(function () {
  const params = new URLSearchParams(location.search);
  const TEST_DATE = params.get('date');            // ?date=2026-12-10
  const TEST_HOUR = params.get('hour');            // ?hour=10 (선택)
  const PREVIEW_ALL = params.get('preview') === 'all';
  const IS_TEST = !!(TEST_DATE || PREVIEW_ALL);

  /* ---------- 시계 ---------- */
  function nowKST() {
    if (TEST_DATE && /^\d{4}-\d{2}-\d{2}$/.test(TEST_DATE)) {
      return { date: TEST_DATE, hour: TEST_HOUR != null ? Number(TEST_HOUR) : 23 };
    }
    const d = new Date(Date.now() + 9 * 3600 * 1000);
    return { date: d.toISOString().slice(0, 10), hour: d.getUTCHours() };
  }

  function isOpen(ep) {
    if (!ep.date) return true;
    if (PREVIEW_ALL) return true;
    const n = nowKST();
    if (ep.date < n.date) return true;
    if (ep.date > n.date) return false;
    return ep.openHour == null || n.hour >= ep.openHour;
  }

  /* ---------- 성탄절 기준 날짜 (story/site.js의 relative: true) ----------
     episodes.js의 날짜는 2026년 달력으로 적혀 있다. relative면 그해 성탄절에 맞춰 옮기고,
     화면에는 날짜 대신 'D-26'처럼 성탄까지 남은 날을 보여 준다. 해마다 그대로 쓸 수 있다. */
  const REL = !!(window.SITE && window.SITE.relative);
  const toDays = iso => { const [y, m, d] = iso.split('-').map(Number); return Date.UTC(y, m - 1, d) / 864e5; };
  const fromDays = n => new Date(n * 864e5).toISOString().slice(0, 10);
  const SEASON = (() => { const [y, m] = nowKST().date.split('-').map(Number); return REL ? (m === 1 ? y - 1 : y) : 2026; })();
  const XMAS = SEASON + '-12-25';
  if (REL) {
    const shift = toDays(XMAS) - toDays('2026-12-25');
    (window.EPISODES || []).forEach(e => { if (e.date) e.date = fromDays(toDays(e.date) + shift); delete e.openHour; });
    // 요일이 해마다 달라지니 '주일'을 전제한 문구를 바꾼다
    const S = window.STORY || {};
    for (const k in S) S[k] = S[k].replace(/오늘 주일 말씀/g, '이번 주 말씀')
      .replace('첫 번째 초가 켜지는 11월 29일 주일, 예배 끝나고 만나자.', '성탄 26일 전, 첫 번째 이야기가 열리는 날 만나자.');
  }

  const WD = ['일', '월', '화', '수', '목', '금', '토'];
  function dateLabel(iso, withYear) {
    if (!iso) return '';
    if (REL) { const n = toDays(XMAS) - toDays(iso); return n > 0 ? 'D-' + n : n === 0 ? '성탄절' : '성탄 +' + (-n); }
    const [y, m, d] = iso.split('-').map(Number);
    const wd = WD[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
    return (withYear ? y + '. ' : '') + m + '/' + d + ' (' + wd + ')';
  }

  /* ---------- 저장 ---------- */
  const KEY = REL ? 'geubam-' + SEASON + (IS_TEST ? '-test' : '') : (IS_TEST ? 'geubam2026-test' : 'geubam2026');
  const blank = () => ({
    v: 1,
    nickname: '',
    ban: '',
    done: {},        // { epId: timestamp }
    diary: {},       // { epId: { q, a } }
    choice: {},      // { epId: { stepNo: label } }
    mission: {},     // { epId: 미션 문장 }
    missionAns: {},  // { epId: 'yes' | 'no' }  다음 편 시작에서 답한 것
    missionDone: {}, // { epId: true } 카드에서 '완료'로 표시
    doneOn: {},      // { epId: 'YYYY-MM-DD' } 처음 끝낸 날(한국 시간)
    verse: {},       // { epId: '눅 1:6' } 말씀 묵상에서 표시한 구절
    medi: {},        // { epId: { q: [...], a: [...] } } 말씀 묵상 질문에 적은 답
    badges: {},      // { badgeId: timestamp }
    codes: {},       // { 1~4: timestamp } 찾은 주일 암호
    sound: true,
    oil: 0
  });

  let data = blank();
  let canSave = true;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) data = Object.assign(blank(), JSON.parse(raw));
    localStorage.setItem(KEY + '-ping', '1');
    localStorage.removeItem(KEY + '-ping');
  } catch (e) {
    canSave = false;
  }

  function save() {
    if (!canSave) return;
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { canSave = false; }
  }
  function reset() {
    data = blank();
    save();
  }
  // 백업 불러오기
  function replace(obj) {
    const keepSound = data.sound;
    data = Object.assign(blank(), obj);
    if (keepSound != null) data.sound = keepSound;
    save();
  }
  // 브라우저가 저장 공간을 함부로 비우지 않게 부탁 (안드로이드 크롬 등)
  try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch (e) { /* 무시 */ }

  window.Core = {
    params, IS_TEST, PREVIEW_ALL, TEST_DATE,
    nowKST, isOpen, dateLabel, REL, SEASON, XMAS,
    get data() { return data; },
    save, reset, replace,
    get canSave() { return canSave; },
    epById: id => window.EPISODES.find(e => e.id === id),
    // 인트로를 뺀 본편(별 계산용)
    mainEpisodes: () => window.EPISODES.filter(e => e.id !== '0'),
    starCount() { return this.mainEpisodes().filter(e => data.done[e.id]).length; },
    starTotal() { return this.mainEpisodes().length; },
    // 바로 앞 편(인트로 제외)
    prevEpisode(id) {
      const list = this.mainEpisodes();
      const i = list.findIndex(e => e.id === id);
      return i > 0 ? list[i - 1] : null;
    },
    isKakao: /KAKAOTALK/i.test(navigator.userAgent),
    isIOS: /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  };
})();
