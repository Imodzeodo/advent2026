/* 인증 카드: 캔버스로 그려서 공유하거나 저장 */
(function () {
  const TONE = {
    ch1: ['#060a1c', '#1b2350', '#3a2f5a'],
    ch2: ['#1a1633', '#3d3561', '#7a5a78'],
    ch3: ['#3a2a4e', '#a0607a', '#f0b493'],
    ch4: ['#05060f', '#141a3a', '#5a4a2a'],
    end: ['#2a2140', '#c08a52', '#fbe7b8']
  };

  // 띄어쓰기 단위로 줄바꿈 (한 단어가 너무 길면 글자 단위)
  function wrap(ctx, text, maxW) {
    const lines = [];
    for (const para of String(text).split('\n')) {
      let cur = '';
      for (const word of para.split(' ')) {
        const next = cur ? cur + ' ' + word : word;
        if (ctx.measureText(next).width <= maxW) { cur = next; continue; }
        if (cur) lines.push(cur);
        cur = '';
        for (const ch of Array.from(word)) {
          if (ctx.measureText(cur + ch).width > maxW && cur) { lines.push(cur); cur = ch; }
          else cur += ch;
        }
      }
      lines.push(cur);
    }
    return lines.filter((l, i) => l || i < lines.length - 1);
  }

  function drawStar(ctx, x, y, b) {
    const R = 60 + 200 * b;
    const g = ctx.createRadialGradient(x, y, 0, x, y, R);
    g.addColorStop(0, `rgba(255,246,216,${0.3 + 0.6 * b})`);
    g.addColorStop(0.4, `rgba(255,210,122,${0.1 + 0.3 * b})`);
    g.addColorStop(1, 'rgba(255,210,122,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2); ctx.fill();
    const s = 0.7 + 1.1 * b;
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = b < 0.5 ? '#d6daf5' : '#fff3c4';
    ctx.beginPath();
    ctx.moveTo(0, -60); ctx.quadraticCurveTo(5, -5, 60, 0); ctx.quadraticCurveTo(5, 5, 0, 60);
    ctx.quadraticCurveTo(-5, 5, -60, 0); ctx.quadraticCurveTo(-5, -5, 0, -60); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, 7, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  async function draw(epId, opt) {
    const D = Core.data;
    const ep = Core.epById(epId);
    const chapter = CHAPTERS.find(c => c.n === ep.ch);
    const tone = TONE[chapter.tone] || TONE.ch1;
    const W = 1080, H = 1350;
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d');
    try {
      await Promise.all([
        document.fonts.load('700 60px "Gowun Batang"'),
        document.fonts.load('400 40px "Gowun Batang"'),
        document.fonts.load('400 40px "Gowun Dodum"')
      ]);
    } catch (e) { /* 글꼴이 없으면 기본 글꼴 */ }
    const SERIF = '"Gowun Batang", "AppleMyungjo", serif';
    const SANS = '"Gowun Dodum", "Apple SD Gothic Neo", "Noto Sans KR", sans-serif';

    // 배경
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, tone[0]); bg.addColorStop(0.6, tone[1]); bg.addColorStop(1, tone[2]);
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    // 잔별
    let seed = 42;
    const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 70; i++) {
      ctx.fillStyle = `rgba(255,255,255,${0.1 + r() * 0.4})`;
      ctx.beginPath(); ctx.arc(r() * W, r() * H * 0.6, 1 + r() * 2.2, 0, Math.PI * 2); ctx.fill();
    }
    // 테두리
    ctx.strokeStyle = 'rgba(255,240,200,.35)'; ctx.lineWidth = 3;
    ctx.strokeRect(40, 40, W - 80, H - 80);

    const b = Core.starCount() / Core.starTotal();
    drawStar(ctx, W / 2, 290, Math.max(0.05, b));

    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,244,220,.8)';
    ctx.font = `400 34px ${SANS}`;
    ctx.fillText('그 밤을 향하여', W / 2, 110);
    ctx.font = `400 30px ${SANS}`;
    ctx.fillStyle = 'rgba(255,244,220,.65)';
    ctx.fillText(`별빛 ${Core.starCount()} / ${Core.starTotal()}`, W / 2, 500);

    let y = 600;
    ctx.fillStyle = '#ffe3a3';
    ctx.font = `700 40px ${SANS}`;
    ctx.fillText(`${chapter.label} · ${ep.day}`, W / 2, y);
    y += 92;
    ctx.fillStyle = '#fff';
    ctx.font = `700 74px ${SERIF}`;
    for (const l of wrap(ctx, ep.title, W - 200)) { ctx.fillText(l, W / 2, y); y += 88; }
    y += 6;
    ctx.font = `400 40px ${SANS}`;
    ctx.fillStyle = 'rgba(255,255,255,.9)';
    ctx.fillText(`${D.nickname || '친구'}${D.ban ? ' · ' + D.ban : ''}`, W / 2, y);
    y += 70;

    // 묵상 한 줄 (학생이 고른 경우만)
    const ans = D.diary[epId] && D.diary[epId].a;
    if (opt.withDiary && ans) {
      ctx.font = `400 40px ${SERIF}`;
      ctx.fillStyle = '#fff8e6';
      const lines = wrap(ctx, '“' + ans + '”', W - 240).slice(0, 4);
      if (lines.length === 4) lines[3] = lines[3].slice(0, -1) + '…”';
      for (const l of lines) { ctx.fillText(l, W / 2, y); y += 58; }
      y += 14;
    }

    // 미션 박스
    const mission = D.mission[epId];
    if (mission) {
      ctx.font = `400 34px ${SANS}`;
      const ml = wrap(ctx, mission, W - 300).slice(0, 3);
      const boxH = 100 + ml.length * 48;
      const bx = 110, bw = W - 220, by = Math.min(y, H - 130 - boxH);
      ctx.fillStyle = 'rgba(0,0,0,.28)';
      roundRect(ctx, bx, by, bw, boxH, 28); ctx.fill();
      const done = opt.missionDone;
      ctx.textAlign = 'left';
      ctx.fillStyle = done ? '#9fe0a8' : '#ffd890';
      ctx.font = `700 34px ${SANS}`;
      ctx.fillText(done ? '☑ 오늘의 미션 완료' : '☐ 오늘의 미션 도전 중', bx + 40, by + 58);
      ctx.fillStyle = 'rgba(255,255,255,.92)';
      ctx.font = `400 34px ${SANS}`;
      let my = by + 108;
      for (const l of ml) { ctx.fillText(l, bx + 40, my); my += 48; }
      ctx.textAlign = 'center';
    }

    ctx.fillStyle = 'rgba(255,244,220,.6)';
    ctx.font = `400 28px ${SANS}`;
    ctx.fillText(`${Core.dateLabel(ep.date, true)} · 연동교회 고등부 대림절`, W / 2, H - 80);
    return cv;
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }

  const toBlob = cv => new Promise(res => cv.toBlob(res, 'image/png'));

  async function share(cv, epId) {
    const blob = await toBlob(cv);
    const file = new File([blob], `그밤-${epId}.png`, { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file] });
        return 'shared';
      } catch (e) {
        if (e && e.name === 'AbortError') return 'cancel';
      }
    }
    return 'fallback';
  }

  window.Card = { draw, share, toBlob };
})();
