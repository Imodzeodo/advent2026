/* 인증 카드: 편마다 다른 모양(번호·그림·상징·구절)으로 그려서 모으는 카드 */
(function () {
  // 장별 테두리(금속 느낌)와 배경
  const STYLE = {
    ch1: { frame: ['#f0c891', '#a8692e', '#5e3613'], bg: ['#070b1e', '#1c2452'], ink: '#ffe3a3', name: '청동' },
    ch2: { frame: ['#eef0ff', '#9aa0c8', '#4c5180'], bg: ['#16132f', '#3b3463'], ink: '#d9d4ff', name: '은' },
    ch3: { frame: ['#ffe1e8', '#e08aa0', '#8a3d55'], bg: ['#3a2347', '#a05a78'], ink: '#ffd5df', name: '장미' },
    ch4: { frame: ['#fff3c4', '#e0b44a', '#7a5414'], bg: ['#04050d', '#1a1d3e'], ink: '#ffe08a', name: '금' },
    end: { frame: ['#fff', '#ffd27a', '#ff9ac0', '#9ad8ff', '#fff'], bg: ['#2a2140', '#b98450'], ink: '#fff2c4', name: '빛' }
  };
  const SERIF = '"Gowun Batang", "AppleMyungjo", serif';
  const SANS = '"Gowun Dodum", "Apple SD Gothic Neo", "Noto Sans KR", sans-serif';
  const EMOJI = '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';

  // 띄어쓰기 단위 줄바꿈 (한 단어가 너무 길면 글자 단위)
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
          if (ctx.measureText(cur + ch).width > maxW && cur) { lines.push(cur); cur = ch; } else cur += ch;
        }
      }
      lines.push(cur);
    }
    return lines.filter(Boolean);
  }
  function clamp(lines, n) {
    if (lines.length <= n) return lines;
    const out = lines.slice(0, n);
    out[n - 1] = out[n - 1].replace(/.$/, '') + '…';
    return out;
  }
  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function grad(ctx, x0, y0, x1, y1, cols) {
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    cols.forEach((c, i) => g.addColorStop(i / (cols.length - 1), c));
    return g;
  }
  function loadImg(src) {
    return new Promise(res => {
      const im = new Image();
      im.onload = () => res(im);
      im.onerror = () => res(null);
      im.src = src;
    });
  }
  function seeded(seed) { return () => (seed = (seed * 16807) % 2147483647) / 2147483647; }

  // 장면 그림(SVG)을 이미지로
  async function sceneImage(name) {
    if (!name) return null;
    let svg = Art.render(name).replace('<svg ', '<svg width="900" height="1350" ');
    return loadImg('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg));
  }

  function cardNo(epId) {
    const i = Core.mainEpisodes().findIndex(e => e.id === epId);
    return String(i + 1).padStart(2, '0');
  }

  async function draw(epId, opt, noArt) {
    const D = Core.data;
    const ep = Core.epById(epId);
    const chapter = CHAPTERS.find(c => c.n === ep.ch);
    const S = STYLE[chapter.tone] || STYLE.ch1;
    const W = 1080, H = 1350, P = 34; // P: 테두리 두께
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d');
    try {
      await Promise.all([
        document.fonts.load(`700 60px ${SERIF}`), document.fonts.load(`400 40px ${SERIF}`), document.fonts.load(`400 40px ${SANS}`)
      ]);
    } catch (e) { /* 기본 글꼴 */ }

    // 1) 금속 테두리
    ctx.fillStyle = grad(ctx, 0, 0, W, H, S.frame);
    rr(ctx, 0, 0, W, H, 54); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 3;
    rr(ctx, 12, 12, W - 24, H - 24, 44); ctx.stroke();

    // 2) 안쪽 바탕
    ctx.save();
    rr(ctx, P, P, W - 2 * P, H - 2 * P, 32); ctx.clip();
    ctx.fillStyle = grad(ctx, 0, P, 0, H - P, S.bg);
    ctx.fillRect(0, 0, W, H);
    const r = seeded(ep.id.split('').reduce((a, c) => a + c.charCodeAt(0) * 7, 11));
    for (let i = 0; i < 90; i++) {
      ctx.fillStyle = `rgba(255,255,255,${0.08 + r() * 0.35})`;
      ctx.beginPath(); ctx.arc(r() * W, r() * H, 1 + r() * 2, 0, Math.PI * 2); ctx.fill();
    }

    // 3) 그림 창
    const ix = P + 34, iy = P + 92, iw = W - 2 * ix, ih = 560;
    ctx.save();
    rr(ctx, ix, iy, iw, ih, 26); ctx.clip();
    const img = noArt ? null : await sceneImage(ep.card && ep.card.scene);
    if (img) {
      const scale = Math.max(iw / img.width, ih / img.height);
      const dw = img.width * scale, dh = img.height * scale;
      const focus = ep.card && ep.card.focus != null ? ep.card.focus : 0.8; // 0 위쪽 ~ 1 아래쪽
      ctx.drawImage(img, ix + (iw - dw) / 2, iy + (ih - dh) * focus, dw, dh);
    } else {
      ctx.fillStyle = grad(ctx, 0, iy, 0, iy + ih, [S.bg[0], S.bg[1], 'rgba(0,0,0,.6)']);
      ctx.fillRect(ix, iy, iw, ih);
      const g = ctx.createRadialGradient(W / 2, iy + ih * 0.42, 0, W / 2, iy + ih * 0.42, 260);
      g.addColorStop(0, 'rgba(255,240,200,.35)'); g.addColorStop(1, 'rgba(255,240,200,0)');
      ctx.fillStyle = g; ctx.fillRect(ix, iy, iw, ih);
      ctx.font = `200px ${EMOJI}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(ep.card ? ep.card.emoji : '⭐', W / 2, iy + ih * 0.45);
      ctx.textBaseline = 'alphabetic';
    }
    // 그림 아래쪽을 살짝 어둡게
    ctx.fillStyle = grad(ctx, 0, iy + ih - 160, 0, iy + ih, ['rgba(0,0,0,0)', 'rgba(0,0,0,.55)']);
    ctx.fillRect(ix, iy + ih - 160, iw, 160);
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 3;
    rr(ctx, ix, iy, iw, ih, 26); ctx.stroke();

    // 4) 윗줄: 번호 · 장 · 이름
    ctx.textAlign = 'left';
    ctx.fillStyle = S.ink;
    ctx.font = `700 40px ${SANS}`;
    ctx.fillText(`No.${cardNo(epId)}`, ix + 4, P + 64);
    ctx.textAlign = 'right';
    ctx.font = `400 32px ${SANS}`;
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    ctx.fillText(`${chapter.label} · ${ep.day}`, W - ix - 4, P + 62);

    // 5) 상징 메달
    const mx = W - ix - 90, my = iy + ih;
    ctx.fillStyle = grad(ctx, mx - 70, my - 70, mx + 70, my + 70, S.frame);
    ctx.beginPath(); ctx.arc(mx, my, 70, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = S.bg[0];
    ctx.beginPath(); ctx.arc(mx, my, 58, 0, Math.PI * 2); ctx.fill();
    ctx.font = `64px ${EMOJI}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(ep.card ? ep.card.emoji : '⭐', mx, my + 4);
    ctx.textBaseline = 'alphabetic';

    // 6) 제목
    let y = iy + ih + 96;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#fff';
    ctx.font = `700 64px ${SERIF}`;
    for (const l of clamp(wrap(ctx, ep.title, iw - 190), 2)) { ctx.fillText(l, ix + 4, y); y += 76; }
    ctx.font = `400 30px ${SANS}`;
    ctx.fillStyle = 'rgba(255,255,255,.7)';
    ctx.fillText(Core.dateLabel(ep.date, true) + (ep.read ? '  ·  ' + ep.read : ''), ix + 4, y - 18);
    y += 34;

    // 7) 구절 (학생이 고른 구절, 없으면 이 편의 대표 구절)
    const picked = D.verse && D.verse[epId];
    const v = Bible.verses(picked || (ep.card && ep.card.key))[0];
    const ans = D.diary[epId] && D.diary[epId].a;
    const quote = opt.withDiary && ans ? { text: ans, label: '— 나의 묵상' } : v ? { text: v.text, label: (picked ? '내 마음에 남은 말씀 · ' : '') + v.label } : null;
    if (quote) {
      const boxY = y, maxH = H - P - 150 - boxY;
      ctx.font = `400 36px ${SERIF}`;
      const lines = clamp(wrap(ctx, '“' + quote.text + '”', iw - 70), Math.max(1, Math.floor((maxH - 80) / 52)));
      const boxH = Math.min(maxH, lines.length * 52 + 92);
      ctx.fillStyle = 'rgba(0,0,0,.28)';
      rr(ctx, ix, boxY, iw, boxH, 22); ctx.fill();
      ctx.fillStyle = '#fff8e6';
      let ly = boxY + 58;
      for (const l of lines) { ctx.fillText(l, ix + 34, ly); ly += 52; }
      ctx.font = `400 28px ${SANS}`;
      ctx.fillStyle = S.ink;
      ctx.textAlign = 'right';
      ctx.fillText(quote.label, W - ix - 30, boxY + boxH - 26);
      ctx.textAlign = 'left';
      y = boxY + boxH + 30;
    }

    // 7-2) 오늘의 미션 (남는 자리에)
    if (D.mission[epId]) {
      const room = H - P - 96 - y;
      ctx.font = `400 30px ${SANS}`;
      const ml = clamp(wrap(ctx, D.mission[epId], iw - 20), Math.max(0, Math.floor((room - 46) / 42)));
      if (ml.length) {
        ctx.fillStyle = S.ink;
        ctx.font = `700 28px ${SANS}`;
        ctx.fillText('오늘의 미션', ix + 6, y + 30);
        ctx.font = `400 30px ${SANS}`;
        ctx.fillStyle = 'rgba(255,255,255,.88)';
        let my2 = y + 74;
        for (const l of ml) { ctx.fillText(l, ix + 6, my2); my2 += 42; }
      }
    }

    // 8) 맨 아래: 닉네임 · 별빛
    ctx.font = `700 36px ${SANS}`;
    ctx.fillStyle = '#fff';
    ctx.fillText(`${D.nickname || '친구'}${D.ban ? ' · ' + D.ban : ''}`, ix + 4, H - P - 60);
    ctx.textAlign = 'right';
    ctx.font = `400 28px ${SANS}`;
    ctx.fillStyle = 'rgba(255,255,255,.7)';
    ctx.fillText(`그 밤을 향하여 · 별빛 ${Core.starCount()}/${Core.starTotal()}`, W - ix - 4, H - P - 62);
    ctx.restore();

    // 9) 도장들
    const missionOk = opt.missionDone;
    if (D.mission[epId]) stamp(ctx, ix + 150, iy + 120, missionOk ? '미션 완료' : '미션 도전 중', missionOk ? '#ff5a5a' : 'rgba(255,255,255,.75)', -12);
    if (Fame.onTime(ep)) ribbon(ctx, W - P, P + 120, '그날 완료', S);

    // 사파리에서 그림 때문에 이미지로 못 꺼내면, 그림 없이 다시 그린다
    if (!noArt) {
      try { cv.toDataURL('image/png').length; } catch (e) { return draw(epId, opt, true); }
    }
    return cv;
  }

  function stamp(ctx, x, y, text, color, deg) {
    ctx.save();
    ctx.translate(x, y); ctx.rotate(deg * Math.PI / 180);
    ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 6;
    ctx.globalAlpha = 0.92;
    ctx.beginPath(); ctx.arc(0, 0, 96, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(0, 0, 84, 0, Math.PI * 2); ctx.stroke();
    ctx.font = `700 34px ${SANS}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const sp = text.indexOf(' ');
    const a = sp < 0 ? text : text.slice(0, sp), b = sp < 0 ? '' : text.slice(sp + 1);
    ctx.fillText(a, 0, b ? -18 : 0);
    if (b) ctx.fillText(b, 0, 22);
    ctx.restore();
  }
  function ribbon(ctx, xRight, y, text, S) {
    ctx.save();
    ctx.fillStyle = grad(ctx, xRight - 260, y, xRight, y + 60, S.frame);
    ctx.beginPath();
    ctx.moveTo(xRight - 250, y); ctx.lineTo(xRight + 10, y); ctx.lineTo(xRight + 10, y + 60); ctx.lineTo(xRight - 250, y + 60); ctx.lineTo(xRight - 225, y + 30);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#2a1a05'; ctx.font = `700 30px ${SANS}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('✦ ' + text, xRight - 112, y + 31);
    ctx.restore();
  }

  const toBlob = cv => new Promise(res => cv.toBlob(res, 'image/png'));
  async function share(cv, epId) {
    const blob = await toBlob(cv);
    const file = new File([blob], `그밤-No${cardNo(epId)}.png`, { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file] }); return 'shared'; }
      catch (e) { if (e && e.name === 'AbortError') return 'cancel'; }
    }
    return 'fallback';
  }

  window.Card = { draw, share, toBlob, STYLE, cardNo };
})();
