/* 대본(텍스트)을 단계 목록으로 바꾸는 해석기. 문법은 story/대본-쓰는-법.md 참고 */
(function () {
  // 중괄호 { } 안의 | 는 건드리지 않고, 바깥의 " | " 로만 나눈다
  function splitBar(s) {
    const out = [];
    let depth = 0, cur = '';
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      if (c === '{') depth++;
      if (c === '}') depth = Math.max(0, depth - 1);
      if (c === '|' && depth === 0) { out.push(cur.trim()); cur = ''; continue; }
      cur += c;
    }
    out.push(cur.trim());
    return out.filter(x => x.length);
  }

  // "이름: 대사" 또는 "(해설) 문장"
  function parseSay(s) {
    s = s.trim();
    let m = s.match(/^\(해설\)\s*(.*)$/);
    if (m) return { t: 'say', who: null, text: m[1] };
    m = s.match(/^([^:：\[\]{}]{1,12})\s*[:：]\s*(.*)$/);
    if (m) return { t: 'say', who: m[1].trim(), text: m[2] };
    return { t: 'say', who: null, text: s };
  }

  function parse(src) {
    const lines = src.split('\n');
    const steps = [];
    let block = null; // 살펴보기/선택의 하위 줄을 모으는 중
    let n = 0;

    for (let raw of lines) {
      const line = raw.trim();
      if (!line || line.startsWith('//')) continue;

      // 하위 줄: "* 대상 | 줄 | 줄" (살펴보기), "- 선택지 -> 줄 | 줄" (선택)
      if (block && block.t === 'explore' && line.startsWith('*')) {
        const parts = splitBar(line.slice(1));
        block.spots.push({ name: parts[0], lines: parts.slice(1).map(parseSay) });
        continue;
      }
      if (block && block.t === 'choice' && line.startsWith('-')) {
        const [label, rest] = line.slice(1).split(/->|→/);
        block.options.push({ label: label.trim(), lines: rest ? splitBar(rest).map(parseSay) : [] });
        continue;
      }
      block = null;
      let m;

      if ((m = line.match(/^#\s*표제\s+(.*)$/))) { steps.push({ t: 'title', parts: splitBar(m[1]) }); continue; }
      if ((m = line.match(/^#\s*장면\s+(.*)$/))) { steps.push({ t: 'scene', name: m[1].trim() }); continue; }
      if ((m = line.match(/^말씀\s*\[([^\]]+)\]\s*(.*)$/))) { steps.push({ t: 'verse', ref: m[1].trim(), text: m[2].trim() }); continue; }
      if ((m = line.match(/^성경읽기\s*[:：]\s*(.*)$/))) { steps.push({ t: 'read', ref: m[1].trim() }); continue; }
      if ((m = line.match(/^메모\s*[:：]\s*(.*)$/))) { steps.push({ t: 'note', text: m[1].trim() }); continue; }
      if ((m = line.match(/^효과\s*[:：]\s*(.*)$/))) { steps.push({ t: 'fx', name: m[1].trim() }); continue; }
      if ((m = line.match(/^게임\s*[:：]\s*(.*)$/))) { const [name, ...arg] = m[1].trim().split(/\s+/); steps.push({ t: 'game', name, arg: arg.join(' ') }); continue; }
      if ((m = line.match(/^소리\s*[:：]\s*(.*)$/))) { steps.push({ t: 'sfx', name: m[1].trim() }); continue; }
      if ((m = line.match(/^미션\s*[:：]\s*(.*)$/))) { steps.push({ t: 'mission', text: m[1].trim() }); continue; }
      if (/^이름입력\s*[:：]?/.test(line)) { steps.push({ t: 'nickname' }); continue; }
      if (/^묵상\s*[:：]?\s*$/.test(line)) { steps.push({ t: 'meditate' }); continue; }
      if (/^안내\s*[:：]?/.test(line)) { steps.push({ t: 'rules' }); continue; }
      if ((m = line.match(/^질문\s*[:：]\s*(.*)$/))) {
        const parts = splitBar(m[1]);
        steps.push({ t: 'ask', text: parts[0], skip: parts[1] || '나중에 쓸래' });
        continue;
      }
      if ((m = line.match(/^살펴보기(?:\((\d+)\))?\s*[:：]\s*(.*)$/))) {
        block = { t: 'explore', need: m[1] ? Number(m[1]) : 0, prompt: m[2].trim(), spots: [] };
        steps.push(block);
        continue;
      }
      if ((m = line.match(/^선택\s*[:：]\s*(.*)$/))) {
        block = { t: 'choice', no: ++n, prompt: m[1].trim(), options: [] };
        steps.push(block);
        continue;
      }
      steps.push(parseSay(line));
    }
    return steps;
  }

  /* 대사 속 치환
     {이름}                → 닉네임
     {일기}                → 이 편의 일기 답
     {일기:1-0}            → 그 편의 일기 답
     {일기:1-0?A|B}        → 답이 있으면 A($ 자리에 답), 없으면 B
  */
  function fill(text, epId) {
    if (window.Bible) text = Bible.full(text);
    const d = window.Core.data;
    const clip = s => (s.length > 40 ? s.slice(0, 40) + '…' : s);
    return text.replace(/\{([^{}]*)\}/g, (all, inner) => {
      if (inner === '이름') return d.nickname || '친구';
      let m = inner.match(/^일기(?::([\w-]+))?(?:\?(.*))?$/);
      if (m) {
        const id = m[1] || epId;
        const a = (d.diary[id] && d.diary[id].a || '').trim();
        if (m[2] != null) {
          const [yes, no] = splitBarRaw(m[2]);
          return a ? yes.replace(/\$/g, () => clip(a)) : (no || '');
        }
        return clip(a);
      }
      return all;
    });
  }
  function splitBarRaw(s) {
    const i = s.indexOf('|');
    return i < 0 ? [s, ''] : [s.slice(0, i), s.slice(i + 1)];
  }

  window.Script = { parse, fill };
})();
