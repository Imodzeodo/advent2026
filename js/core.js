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

  const WD = ['일', '월', '화', '수', '목', '금', '토'];
  function dateLabel(iso, withYear) {
    if (!iso) return '';
    const [y, m, d] = iso.split('-').map(Number);
    const wd = WD[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
    return (withYear ? y + '. ' : '') + m + '/' + d + ' (' + wd + ')';
  }

  /* ---------- 저장 ---------- */
  const KEY = IS_TEST ? 'geubam2026-test' : 'geubam2026';
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

  window.Core = {
    params, IS_TEST, PREVIEW_ALL, TEST_DATE,
    nowKST, isOpen, dateLabel,
    get data() { return data; },
    save, reset,
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
