/* 성경 구절 꺼내기 + 나의 기록(배지·연속 기록·미션 기록) */
(function () {
  const BOOK = { '마': '마태복음', '막': '마가복음', '눅': '누가복음', '요': '요한복음', '사': '이사야', '시': '시편', '삼하': '사무엘하', '말': '말라기', '고전': '고린도전서', '벧후': '베드로후서', '살전': '데살로니가전서', '미': '미가', '롬': '로마서', '레': '레위기', '출': '출애굽기', '창': '창세기' };

  // "눅 1:5-7; 시 85:10" → [{ ref, label, v, text, heading }]
  function verses(refs) {
    const out = [];
    String(refs || '').split(';').forEach(part => {
      const m = part.trim().match(/^(\S+?)\s*(\d+):([\d,\s-]+)$/);
      if (!m) return;
      const [, book, ch, list] = m;
      list.split(',').forEach(seg => {
        const [a, b] = seg.trim().split('-').map(Number);
        for (let v = a; v <= (b || a); v++) {
          const key = `${book} ${ch}:${v}`;
          const raw = window.BIBLE && window.BIBLE[key];
          if (raw == null) continue;
          const [text, heading] = Array.isArray(raw) ? raw : [raw, null];
          out.push({ ref: key, label: `${BOOK[book] || book} ${ch}:${v}`, book, ch: +ch, v, text, heading });
        }
      });
    });
    return out;
  }
  // "눅 1:5-7; 시 85:10" → "누가복음 1:5-7; 시편 85:10" (대사 속 "(마 2장)"도)
  const ABBR = Object.keys(BOOK).sort((a, b) => b.length - a.length).join('|');
  const RE = new RegExp('(^|[^가-힣])(' + ABBR + ')\\s?(\\d+)(?=[:장])', 'g');
  function full(s) { return String(s == null ? '' : s).replace(RE, (m, pre, b, n) => pre + BOOK[b] + ' ' + n); }
  // 표시해 둔 구절(여러 개) — 예전 저장 형식(문자열)도 받아 준다
  function marks(epId) {
    const v = (Core.data.verse || {})[epId];
    return !v ? [] : Array.isArray(v) ? v : [v];
  }
  window.Bible = { verses, BOOK, full, marks };

  /* ---------- 기록 계산 ---------- */
  const main = () => Core.mainEpisodes();
  const D = () => Core.data;
  const onTime = e => D().doneOn && D().doneOn[e.id] === e.date;

  function streaks() {
    let cur = 0, best = 0;
    for (const e of main()) {
      if (!Core.isOpen(e) && !D().done[e.id]) break;
      if (onTime(e)) { cur++; best = Math.max(best, cur); } else if (Core.nowKST().date > e.date || D().done[e.id]) cur = 0;
    }
    return { cur, best };
  }
  const missionYes = () => main().filter(e => D().missionAns[e.id] === 'yes' || D().missionDone[e.id]).length;
  const chapterDone = n => main().filter(e => e.ch === n).every(e => D().done[e.id]);
  const count = obj => Object.values(obj || {}).filter(x => x && (x.a == null || x.a)).length;

  const BADGES = [
    { id: 'first', icon: '🪔', name: '첫 등불', desc: '첫 이야기를 끝냈어요', ok: () => Core.starCount() >= 1 },
    { id: 'ch1', icon: '🕯️', name: '문지기', desc: '1장 소망을 다 걸었어요', ok: () => chapterDone(1) },
    { id: 'ch2', icon: '⚖️', name: '의로운 사람', desc: '2장 평화를 다 걸었어요', ok: () => chapterDone(2) },
    { id: 'ch3', icon: '🎶', name: '기쁨의 노래', desc: '3장 기쁨을 다 걸었어요', ok: () => chapterDone(3) },
    { id: 'ch4', icon: '🐑', name: '들판의 목동', desc: '4장 사랑을 다 걸었어요', ok: () => chapterDone(4) },
    { id: 'end', icon: '⭐', name: '그 밤을 본 사람', desc: '성탄 엔딩을 봤어요', ok: () => !!D().done['end'] },
    { id: 'streak3', icon: '🔥', name: '사흘 연속', desc: '그날 편을 그날에, 3번 연속', ok: () => streaks().best >= 3 },
    { id: 'streak7', icon: '🏅', name: '한 주 개근', desc: '그날 편을 그날에, 7번 연속', ok: () => streaks().best >= 7 },
    { id: 'all', icon: '👑', name: '대림절 개근', desc: '27편 모두 그날에', ok: () => main().every(onTime) },
    { id: 'honest', icon: '🤍', name: '정직한 문지기', desc: '"못 했어"라고 정직하게 답했어요', ok: () => Object.values(D().missionAns).includes('no') },
    { id: 'm5', icon: '✅', name: '미션 다섯', desc: '미션 5개 완료', ok: () => missionYes() >= 5 },
    { id: 'm15', icon: '🏆', name: '미션 열다섯', desc: '미션 15개 완료', ok: () => missionYes() >= 15 },
    { id: 'diary10', icon: '📔', name: '일기 작가', desc: '일기 10편을 썼어요', ok: () => count(D().diary) >= 10 },
    { id: 'medi10', icon: '📖', name: '말씀 묵상가', desc: '말씀 묵상을 10번 적었어요', ok: () => Object.values(D().medi || {}).filter(m => m.a.some(Boolean)).length >= 10 },
    { id: 'codes4', icon: '🕯️', name: '네 개의 초', desc: '주일 암호 4개를 모두 찾았어요', ok: () => Object.keys(D().codes || {}).length >= 4 },
    { id: 'oil10', icon: '🫙', name: '기름 가득', desc: '등불 기름 10방울', ok: () => (D().oil || 0) >= 10 }
  ];

  // 새로 딴 배지 목록을 돌려주고 저장
  function checkNew() {
    const d = D();
    d.badges = d.badges || {};
    const got = [];
    for (const b of BADGES) {
      if (!d.badges[b.id] && b.ok()) { d.badges[b.id] = Date.now(); got.push(b); }
    }
    if (got.length) Core.save();
    return got;
  }

  function missionStatus(e) {
    const d = D();
    if (d.missionAns[e.id] === 'yes' || d.missionDone[e.id]) return 'yes';
    if (d.missionAns[e.id] === 'no') return 'no';
    if (d.mission[e.id]) return 'wait';
    return 'none';
  }

  // 주일 암호: 띄어쓰기·문장부호 무시, .dev/make-code.py 와 같은 방식
  function codeHash(s) {
    s = '그밤:' + String(s).normalize('NFC').toLowerCase().replace(/[\s.,!?~·\-'"]/g, '');
    let h = 0x811c9dc5;
    for (const b of new TextEncoder().encode(s)) { h ^= b; h = Math.imul(h, 0x01000193) >>> 0; }
    return h.toString(16).padStart(8, '0');
  }
  function tryCode(word) {
    const today = Core.nowKST().date;
    const h = codeHash(word);
    const c = (window.CODES || []).find(x => x.hash === h);
    if (!c) return { ok: false };
    if (!Core.PREVIEW_ALL && today < c.from) return { ok: false, early: c };
    const d = D(); d.codes = d.codes || {};
    const isNew = !d.codes[c.n];
    if (isNew) { d.codes[c.n] = Date.now(); Core.save(); }
    return { ok: true, code: c, isNew };
  }

  window.Fame = { BADGES, checkNew, streaks, missionYes, missionStatus, onTime, tryCode, codeHash };
})();
