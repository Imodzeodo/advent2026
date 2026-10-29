/* 묵상 노트 내보내기: 예쁜 노트 이미지(장별) · 글 복사 · .txt 파일 */
(function () {
  const SERIF = '"Gowun Batang", "AppleMyungjo", serif';
  const SANS = '"Gowun Dodum", "Apple SD Gothic Neo", "Noto Sans KR", sans-serif';
  const INK = { ch1: '#a8692e', ch2: '#5a5f9a', ch3: '#c06080', ch4: '#b8901e', end: '#c07a30' };
  const ST = { yes: '✅ 했어', no: '🤍 못 했어(정직)', wait: '⏳ 다음 편에서 확인', none: '' };

  // 한 편에 남긴 기록 모으기
  function entry(e) {
    const D = Core.data;
    const vs = Bible.marks(e.id).map(r => Bible.verses(r)[0]).filter(Boolean);
    const qa = [];
    if (D.diary[e.id] && D.diary[e.id].a) qa.push({ who: e.host || '', q: D.diary[e.id].q, a: D.diary[e.id].a });
    const M = (D.medi || {})[e.id];
    if (M) M.q.forEach((q, i) => { if (M.a[i]) qa.push({ who: '말씀 묵상', q: Bible.full(q), a: M.a[i] }); });
    const has = !!(D.done[e.id] || qa.length || vs.length);
    return has ? { e, ch: CHAPTERS.find(c => c.n === e.ch), vs, read: Bible.full(e.read || ''), qa, mission: Bible.full(D.mission[e.id] || ''), st: Fame.missionStatus(e) } : null;
  }
  const entries = () => Core.mainEpisodes().map(entry).filter(Boolean);

  /* ---------- 글로 ---------- */
  function text() {
    const D = Core.data;
    let out = `그 밤을 향하여 · 나의 대림절 묵상 노트\n${D.nickname || ''}${D.ban ? ' · ' + D.ban : ''}\n2026 연동교회 고등부 대림절\n`;
    let lastCh = null;
    for (const x of entries()) {
      if (x.ch !== lastCh) { out += `\n━━━━━━━━━━━━━━━━\n${x.ch.label} 「${x.ch.title}」\n━━━━━━━━━━━━━━━━\n`; lastCh = x.ch; }
      out += `\n▸ ${Core.dateLabel(x.e.date)} ${x.e.day} · ${x.e.title}\n  본문: ${x.read}\n`;
      for (const v of x.vs) out += `  마음에 남은 말씀: "${v.text}" (${v.label})\n`;
      for (const q of x.qa) out += `  Q. ${q.q}\n  A. ${q.a}\n`;
      if (x.mission) out += `  미션: ${x.mission}${ST[x.st] ? ' — ' + ST[x.st] : ''}\n`;
    }
    out += `\n성경 본문: 성경전서 개역개정판 © 대한성서공회\n`;
    return out;
  }
  async function copy() {
    const t = text();
    try { await navigator.clipboard.writeText(t); return true; }
    catch (e) {
      const ta = document.createElement('textarea');
      ta.value = t; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      let ok = false; try { ok = document.execCommand('copy'); } catch (e2) { /* 무시 */ }
      ta.remove(); return ok;
    }
  }
  function txtUrl() {
    return URL.createObjectURL(new Blob(['﻿' + text()], { type: 'text/plain;charset=utf-8' }));
  }

  /* ---------- 노트 이미지 ---------- */
  function wrap(ctx, s, maxW) {
    const lines = [];
    for (const para of String(s).split('\n')) {
      let cur = '';
      for (const word of para.split(' ')) {
        const next = cur ? cur + ' ' + word : word;
        if (ctx.measureText(next).width <= maxW) { cur = next; continue; }
        if (cur) lines.push(cur);
        cur = '';
        for (const ch of Array.from(word)) { if (ctx.measureText(cur + ch).width > maxW && cur) { lines.push(cur); cur = ch; } else cur += ch; }
      }
      lines.push(cur);
    }
    return lines;
  }

  // 장 하나 = 이미지 한 장. draw=false 이면 높이만 잰다.
  function layout(ctx, chap, list, draw) {
    const D = Core.data, W = 1080, L = 120, R = 70, TW = W - L - R;
    const ink = INK[chap.tone] || '#8a5a1c';
    let y = 0;
    const text = (s, font, color, x, lh, maxW) => {
      ctx.font = font;
      const ls = wrap(ctx, s, maxW || TW);
      for (const l of ls) { y += lh; if (draw) { ctx.fillStyle = color; ctx.fillText(l, x || L, y); } }
      return ls.length;
    };
    // 머리
    y = 70;
    if (draw) { ctx.fillStyle = ink; ctx.font = `700 30px ${SANS}`; ctx.fillText('그 밤을 향하여 · 나의 묵상 노트', L, y); }
    y += 26;
    text(`${chap.label} 「${chap.title}」`, `700 64px ${SERIF}`, '#2d2010', L, 80);
    text(`${D.nickname || ''}${D.ban ? ' · ' + D.ban : ''}`, `400 32px ${SANS}`, '#7a6548', L, 50);
    y += 30;
    for (const x of list) {
      y += 34;
      // 날짜 띠
      if (draw) {
        ctx.fillStyle = ink; ctx.globalAlpha = 0.12;
        ctx.fillRect(L - 20, y, TW + 40, 58); ctx.globalAlpha = 1;
        ctx.fillStyle = ink; ctx.font = `700 30px ${SANS}`;
        ctx.fillText(`${Core.dateLabel(x.e.date)} · ${x.e.day}`, L, y + 40);
        ctx.textAlign = 'right'; ctx.font = `400 26px ${SANS}`; ctx.fillStyle = '#7a6548';
        ctx.fillText(x.read.split(';')[0], W - R, y + 40); ctx.textAlign = 'left';
      }
      y += 58;
      text(x.e.title, `700 46px ${SERIF}`, '#2d2010', L, 70);
      for (const v of x.vs) {
        y += 12;
        const y0 = y;
        text(`“${v.text}”`, `400 34px ${SERIF}`, '#4a3418', L + 30, 52, TW - 40);
        text(v.label, `400 26px ${SANS}`, ink, L + 30, 40);
        if (draw) { ctx.fillStyle = ink; ctx.fillRect(L + 6, y0 + 16, 6, y - y0 - 6); }
        y += 6;
      }
      for (const q of x.qa) {
        y += 18;
        text(`Q. ${q.q}`, `700 30px ${SANS}`, '#6b5536', L, 44);
        text(q.a, `400 36px ${SERIF}`, '#1f160b', L + 20, 54, TW - 20);
      }
      if (x.mission) {
        y += 18;
        text(`미션 · ${x.mission}${ST[x.st] ? '  ' + ST[x.st] : ''}`, `400 28px ${SANS}`, '#7a6548', L, 42);
      }
      y += 26;
      if (draw) { ctx.strokeStyle = 'rgba(90,60,30,.25)'; ctx.setLineDash([6, 8]); ctx.beginPath(); ctx.moveTo(L, y); ctx.lineTo(W - R, y); ctx.stroke(); ctx.setLineDash([]); }
    }
    y += 90;
    if (draw) {
      ctx.font = `400 24px ${SANS}`; ctx.fillStyle = '#9a8566';
      ctx.fillText('2026 연동교회 고등부 대림절 · 성경 본문: 개역개정판 © 대한성서공회', L, y - 40);
    }
    return y;
  }

  async function pages() {
    try { await Promise.all([document.fonts.load(`700 60px ${SERIF}`), document.fonts.load(`400 40px ${SERIF}`), document.fonts.load(`400 30px ${SANS}`)]); } catch (e) { /* 기본 글꼴 */ }
    const all = entries();
    const out = [];
    for (const chap of CHAPTERS.filter(c => c.n > 0)) {
      const list = all.filter(x => x.ch === chap);
      if (!list.length) continue;
      const probe = document.createElement('canvas').getContext('2d');
      const H = Math.ceil(layout(probe, chap, list, false));
      const cv = document.createElement('canvas');
      cv.width = 1080; cv.height = Math.min(H, 16000);
      const ctx = cv.getContext('2d');
      // 종이
      ctx.fillStyle = '#f8f1e0'; ctx.fillRect(0, 0, cv.width, cv.height);
      ctx.strokeStyle = 'rgba(120,150,190,.18)'; ctx.lineWidth = 1;
      for (let y = 140; y < cv.height; y += 54) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(1080, y); ctx.stroke(); }
      ctx.strokeStyle = 'rgba(200,80,80,.35)'; ctx.beginPath(); ctx.moveTo(90, 0); ctx.lineTo(90, cv.height); ctx.stroke();
      ctx.fillStyle = INK[chap.tone] || '#8a5a1c'; ctx.fillRect(0, 0, 22, cv.height);
      for (let y = 60; y < cv.height; y += 120) { ctx.fillStyle = '#e8dcc0'; ctx.beginPath(); ctx.arc(52, y, 12, 0, Math.PI * 2); ctx.fill(); }
      layout(ctx, chap, list, true);
      out.push({ chap, cv });
    }
    return out;
  }

  window.Note = { entries, text, copy, txtUrl, pages };
})();
