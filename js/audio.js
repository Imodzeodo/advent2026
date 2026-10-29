/* 배경음악·효과음: 녹음 파일 없이 코드로 직접 연주한다(저작권 문제 없음).
   곡은 모두 저작권이 끝난 옛 찬송 선율:
   - 「곧 오소서 임마누엘」(Veni Emmanuel, 15세기 선율)  → 1장
   - 「기쁘다 구주 오셨네」(Antioch, 1836 편곡 선율)      → 3장
   - 「고요한 밤 거룩한 밤」(Gruber, 1818)                 → 4장·성탄
   - 그 밖: 종소리가 드문드문 울리는 잔잔한 배경(직접 만든 것) */
(function () {
  let ctx = null, master, musicBus, sfxBus, ambBus, reverb;
  let current = null, wanted = null, timer = null;
  const on = () => Core.data.sound !== false;

  function init() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) { /* 무음 스위치 무시 시도 */ }
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0.9;
    const comp = ctx.createDynamicsCompressor();
    master.connect(comp); comp.connect(ctx.destination);
    musicBus = ctx.createGain(); musicBus.gain.value = 0.5; musicBus.connect(master);
    ambBus = ctx.createGain(); ambBus.gain.value = 0.55; ambBus.connect(master);
    sfxBus = ctx.createGain(); sfxBus.gain.value = 0.7; sfxBus.connect(master);
    // 잔향
    reverb = ctx.createConvolver();
    const len = ctx.sampleRate * 2.6, ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = ir.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.4);
    }
    reverb.buffer = ir;
    const wet = ctx.createGain(); wet.gain.value = 0.35;
    reverb.connect(wet); wet.connect(master);
    return ctx;
  }

  // 첫 터치에서 소리를 깨운다 (모바일 브라우저 규칙)
  // 다른 앱에 다녀오면 아이폰은 소리 장치가 '멈춘 채 살아 있는' 경우가 있어서, 다음 터치 때 새로 만든다
  let stale = false, lastWake = 0;
  function rebuild() {
    stopAmb();
    for (const k in vcache) delete vcache[k];
    if (timer) clearInterval(timer);
    timer = null; current = null;
    try { ctx && ctx.close(); } catch (e) { /* 무시 */ }
    ctx = null;
  }
  function unlock() {
    if (!on()) return;
    if (stale) { stale = false; rebuild(); }
    const wasRunning = ctx && ctx.state === 'running';
    init();
    if (!ctx) return;
    const go = () => {
      if (!ctx || ctx.state !== 'running') return;
      if (wanted && !current) startMusic(wanted);
      if (ambWanted && !ambCur) startAmb(ambWanted);
    };
    if (!wasRunning) lastWake = Date.now();
    if (ctx.state !== 'running') ctx.resume().then(go).catch(() => {}); else go();
  }
  ['pointerdown', 'touchend', 'keydown'].forEach(ev => window.addEventListener(ev, unlock, { passive: true, capture: true }));
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) {
      stopMusic(); stopAmb();
      try { ctx.suspend(); } catch (e) { /* 무시 */ }
      if (Core.isIOS) stale = true;
    } else if (on() && !stale) {
      ctx.resume().then(() => { if (wanted && !current) startMusic(wanted); if (ambWanted && !ambCur) startAmb(ambWanted); }).catch(() => {});
    }
  });
  window.addEventListener('pageshow', e => { if (e.persisted) stale = true; });

  const hz = m => 440 * Math.pow(2, (m - 69) / 12);

  /* ---------- 악기 ---------- */
  function out(bus, dry, wetAmt) {
    const g = ctx.createGain(); g.gain.value = dry;
    g.connect(bus);
    if (wetAmt) { const w = ctx.createGain(); w.gain.value = wetAmt; g.connect(w); w.connect(reverb); }
    return g;
  }
  // 오르골 소리
  function musicBox(m, t, vol, bus) {
    const dest = out(bus || musicBus, 1, 0.8);
    [[1, 1], [2, 0.25], [3, 0.08], [4.2, 0.04]].forEach(([mul, a]) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = hz(m) * mul;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vol * a, t + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.8 / Math.sqrt(mul));
      o.connect(g); g.connect(dest);
      o.start(t); o.stop(t + 2);
    });
  }
  // 종소리(배음이 어긋난 맑은 소리)
  function bell(m, t, vol, bus) {
    const dest = out(bus || sfxBus, 1, 0.9);
    [[1, 1, 2.6], [2.76, 0.35, 1.4], [5.4, 0.12, 0.7]].forEach(([mul, a, dec]) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = hz(m) * mul;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vol * a, t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dec);
      o.connect(g); g.connect(dest);
      o.start(t); o.stop(t + dec + 0.1);
    });
  }
  // 은은한 화음 바탕
  function pad(notes, t, dur, vol) {
    const dest = out(musicBus, 1, 0.6);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; lp.connect(dest);
    notes.forEach(m => [-6, 6].forEach(det => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'triangle'; o.frequency.value = hz(m); o.detune.value = det;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vol, t + Math.min(1.2, dur / 3));
      g.gain.setValueAtTime(vol, t + dur);
      g.gain.linearRampToValueAtTime(0, t + dur + 1.4);
      o.connect(g); g.connect(lp);
      o.start(t); o.stop(t + dur + 1.5);
    }));
  }
  // 부드러운 베이스
  function bass(m, t, vol) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.value = hz(m);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.03); g.gain.exponentialRampToValueAtTime(0.001, t + 2.4);
    o.connect(g); g.connect(out(musicBus, 1, 0.3)); o.start(t); o.stop(t + 2.5);
  }
  function noise(t, dur, vol, from, to) {
    const len = Math.floor(ctx.sampleRate * dur), b = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = b.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const s = ctx.createBufferSource(); s.buffer = b;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 0.8;
    f.frequency.setValueAtTime(from, t); f.frequency.exponentialRampToValueAtTime(to, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + dur * 0.3); g.gain.linearRampToValueAtTime(0, t + dur);
    s.connect(f); f.connect(g); g.connect(out(sfxBus, 1, 0.5));
    s.start(t);
  }

  /* ---------- 곡 ---------- */
  // [음높이(MIDI), 길이(박)] / { c: [화음] } 은 그 자리에서 바탕 화음이 바뀜
  const Em = [40, 52, 55, 59], D = [38, 50, 54, 57], C = [36, 48, 52, 55], G = [43, 50, 55, 59], F = [41, 48, 53, 57];
  const SONGS = {
    veni: { beat: 0.78, vol: 0.13, notes: [
      { c: Em }, [64, 1], [67, 1], [71, 1], [71, 1], [71, 1], [69, 1], [72, 1], [71, 1], [69, 1], [67, 2],
      [69, 1], [71, 1], [67, 1], [64, 1], [67, 1], [69, 1], [66, 1], [64, 1], { c: D }, [62, 2],
      { c: Em }, [64, 1], [67, 1], [71, 1], [71, 1], [71, 1], [69, 1], [72, 1], [71, 1], [69, 1], [67, 2],
      [69, 1], [71, 1], [67, 1], [64, 1], [67, 1], [69, 1], [66, 1], { c: Em }, [64, 3], [0, 3]] },
    joy: { beat: 0.3, vol: 0.12, notes: [
      { c: C }, [72, 2], [71, 1.5], [69, 0.5], [67, 3], { c: F }, [65, 1], [64, 2], { c: G }, [62, 2], { c: C }, [60, 3],
      [67, 1], { c: F }, [69, 3], [69, 1], { c: G }, [71, 3], [71, 1], { c: C }, [72, 6], [0, 2],
      { c: C }, [72, 2], [71, 1.5], [69, 0.5], [67, 3], { c: F }, [65, 1], [64, 2], { c: G }, [62, 2], { c: C }, [60, 6], [0, 4]] },
    silent: { beat: 0.3, vol: 0.12, notes: [
      { c: C }, [67, 3], [69, 1], [67, 2], [64, 6], [67, 3], [69, 1], [67, 2], [64, 6],
      { c: G }, [74, 4], [74, 2], [71, 6], { c: C }, [72, 4], [72, 2], [67, 6],
      { c: F }, [69, 4], [69, 2], [72, 3], [71, 1], [69, 2], { c: C }, [67, 3], [69, 1], [67, 2], [64, 6],
      { c: F }, [69, 4], [69, 2], [72, 3], [71, 1], [69, 2], { c: C }, [67, 3], [69, 1], [67, 2], [64, 6],
      { c: G }, [74, 4], [74, 2], [77, 3], [74, 1], [71, 2], { c: C }, [72, 6], [76, 6],
      [72, 3], [67, 1], [64, 2], { c: G }, [67, 3], [65, 1], [62, 2], { c: C }, [60, 9], [0, 6]] }
  };

  function startMusic(name) {
    stopMusic();
    if (!ctx || !on()) return;
    current = name;
    if (name === 'calm' || name === 'night') return startAmbient(name);
    const song = SONGS[name];
    if (!song) return;
    let i = 0, next = ctx.currentTime + 0.4, chord = null, chordStart = next;
    const flushPad = until => { if (chord && until > chordStart) pad(chord, chordStart, until - chordStart, 0.022); };
    timer = setInterval(() => {
      while (next < ctx.currentTime + 0.6) {
        const n = song.notes[i];
        if (n.c) {
          flushPad(next); chord = n.c; chordStart = next;
          bass(n.c[0] + 12, next, 0.07);
        } else {
          if (n[0]) {
            musicBox(n[0], next, song.vol);
            // 길게 끄는 음에는 3도 아래 화음을 살짝
            if (n[1] >= 1 && chord) {
              const pcs = chord.map(c => c % 12);
              const h = [3, 4, 5].map(d => n[0] - d).find(x => pcs.includes(x % 12));
              if (h) musicBox(h, next + 0.012, song.vol * 0.42);
            }
          }
          next += n[1] * song.beat;
        }
        i++;
        if (i >= song.notes.length) { flushPad(next); chord = null; i = 0; next += song.beat * 2; }
      }
    }, 120);
  }
  // 잔잔한 배경: 낮은 화음 위로 종소리가 가끔
  function startAmbient(name) {
    const scale = name === 'night' ? [62, 64, 67, 69, 71, 74, 76] : [60, 62, 64, 67, 69, 72, 74];
    const base = name === 'night' ? [38, 50, 57] : [36, 48, 55];
    let next = ctx.currentTime + 0.3, padNext = next;
    timer = setInterval(() => {
      const now = ctx.currentTime;
      if (padNext < now + 0.5) { pad(base, padNext, 8, 0.02); padNext += 8; }
      if (next < now + 0.5) {
        bell(scale[Math.floor(Math.random() * scale.length)] + 12, next, 0.05, musicBus);
        next += 1.6 + Math.random() * 2.6;
      }
    }, 200);
  }
  /* ---------- 장면별 배경 소리 ---------- */
  const AMB = {
    '밤하늘': 'night', '지붕': 'night', '지붕새벽': 'night', '새벽집': 'night', '새집': 'night', '들판': 'field', '들판새벽': 'day',
    '성소': 'temple', '성소천사': 'temple', '성전뜰': 'crowd', '성전': 'crowd', '베들레헴': 'crowd',
    '나사렛길': 'day', '마리아집': 'day', '유대집': 'day', '할례': 'crowd', '산길': 'wind', '길': 'day', '언덕노을': 'wind',
    '집안': 'room', '요셉밤': 'room', '작업장': 'room', '마구간': 'stable', '꿈': 'dream'
  };
  let ambTimer = null, ambNodes = [], ambWanted = null, ambCur = null;
  function loopNoise(vol, type, freq, q) {
    const len = ctx.sampleRate * 3, b = ctx.createBuffer(1, len, ctx.sampleRate), d = b.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; d[i] = type === 'brown' ? last * 3.5 : w; }
    const s = ctx.createBufferSource(); s.buffer = b; s.loop = true;
    const f = ctx.createBiquadFilter(); f.type = type === 'brown' ? 'lowpass' : 'bandpass'; f.frequency.value = freq; f.Q.value = q || 0.7;
    const g = ctx.createGain(); g.gain.value = vol;
    const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 0.07 + Math.random() * 0.08; lg.gain.value = vol * 0.6;
    lfo.connect(lg); lg.connect(g.gain);
    s.connect(f); f.connect(g); g.connect(ambBus); s.start(); lfo.start();
    ambNodes.push(s, lfo);
  }
  function chirp(t, f0, f1, dur, vol) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0005, t + dur);
    o.connect(g); g.connect(ambBus); o.start(t); o.stop(t + dur + 0.02);
  }
  function startAmb(kind) {
    stopAmb();
    if (!ctx || !on() || !kind) return;
    ambCur = kind;
    const beds = { night: [0.05, 'brown', 380], field: [0.05, 'brown', 360], temple: [0.04, 'brown', 160], crowd: [0.05, 'pink', 700, 0.6], day: [0.03, 'brown', 500], wind: [0.07, 'pink', 520, 0.5], room: [0.03, 'brown', 220], stable: [0.035, 'brown', 240], dream: [0.02, 'brown', 300] };
    const bd = beds[kind]; if (bd) loopNoise(bd[0], bd[1], bd[2], bd[3]);
    if (kind === 'temple') {
      // 성소의 낮은 울림 (장면이 바뀌면 같이 멈춤)
      [110, 165].forEach(f => { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = f; g.gain.value = 0.008; o.connect(g); g.connect(ambBus); o.start(); ambNodes.push(o); });
    }
    let next = ctx.currentTime + 0.5;
    ambTimer = setInterval(() => {
      const now = ctx.currentTime;
      if (next > now + 0.6) return;
      const t = Math.max(next, now + 0.05);
      if (kind === 'night' || kind === 'field') { for (let k = 0; k < 3; k++) chirp(t + k * 0.07, 4300, 4100, 0.04, 0.012); next = t + 0.5 + Math.random() * 1.1; }
      if (kind === 'field') { if (Math.random() < 0.25) for (let k = 0; k < 6; k++) noise(t + Math.random() * 0.8, 0.04, 0.03, 2600, 1300); if (Math.random() < 0.05) FX.sheep(t + 0.3); }
      if (kind === 'day' || kind === 'wind') { if (Math.random() < 0.55) { const f = 2400 + Math.random() * 1600; chirp(t, f, f * 1.4, 0.07, 0.014); chirp(t + 0.11, f * 1.1, f * 1.5, 0.06, 0.012); } next = t + 1.6 + Math.random() * 2.8; }
      if (kind === 'crowd') { noise(t, 0.9, 0.025, 500 + Math.random() * 500, 700); next = t + 0.6 + Math.random() * 0.8; }
      if (kind === 'room' || kind === 'stable') { if (Math.random() < 0.3) noise(t, 0.05, 0.02, 2200, 1200); if (kind === 'stable' && Math.random() < 0.06) thud(t, 80, 0.06, 0.2); next = t + 1 + Math.random() * 2; }
      if (kind === 'temple' || kind === 'dream') { bell((kind === 'dream' ? 84 : 76) + [0, 3, 7, 10][Math.floor(Math.random() * 4)], t, 0.018, ambBus); next = t + 3 + Math.random() * 4; }
    }, 200);
  }
  function stopAmb() {
    if (ambTimer) clearInterval(ambTimer);
    ambTimer = null; ambCur = null;
    ambNodes.forEach(n => { try { n.stop(); } catch (e) { /* 무시 */ } });
    ambNodes = [];
  }
  function ambience(scene) {
    ambWanted = AMB[scene] || null;
    if (!on() || !ctx || ctx.state !== 'running') return;
    if (ambCur !== ambWanted) startAmb(ambWanted);
  }

  function stopMusic() {
    if (timer) clearInterval(timer);
    timer = null; current = null;
  }

  /* ---------- 효과음 ---------- */
  const FX = {
    select: t => musicBox(79, t, 0.08, sfxBus),
    page: t => noise(t, 0.35, 0.05, 600, 2400),
    verse: t => { bell(84, t, 0.07); bell(88, t + 0.12, 0.05); },
    mission: t => { musicBox(72, t, 0.12, sfxBus); musicBox(79, t + 0.12, 0.12, sfxBus); musicBox(84, t + 0.24, 0.1, sfxBus); },
    oil: t => { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(900, t); o.frequency.exponentialRampToValueAtTime(380, t + 0.18); g.gain.setValueAtTime(0.12, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.25); o.connect(g); g.connect(out(sfxBus, 1, 0.4)); o.start(t); o.stop(t + 0.3); },
    ignite: t => { noise(t, 0.6, 0.12, 300, 3000); bell(76, t + 0.35, 0.06); },
    star: t => [72, 76, 79, 84, 88].forEach((m, i) => bell(m, t + i * 0.11, 0.07)),
    badge: t => [67, 72, 76, 79].forEach((m, i) => musicBox(m, t + i * 0.09, 0.12, sfxBus)),
    pop: t => musicBox(84, t, 0.09, sfxBus),
    boop: t => { musicBox(55, t, 0.1, sfxBus); musicBox(54, t + 0.12, 0.08, sfxBus); },
    title: t => { bell(64, t, 0.05); bell(71, t + 0.25, 0.04); },
    tap: t => musicBox(91, t, 0.025, sfxBus),
    gem: t => { bell(93, t, 0.08); bell(98, t + 0.07, 0.06); bell(100, t + 0.14, 0.04); },
    thump: t => thud(t, 70, 0.35, 0.4),
    heart: t => { thud(t, 55, 0.3, 0.25); thud(t + 0.22, 50, 0.22, 0.25); },
    door: t => { thud(t, 90, 0.25, 0.3); noise(t + 0.02, 0.25, 0.08, 400, 200); },
    knock: t => [0, 0.18, 0.36].forEach(d => thud(t + d, 180, 0.2, 0.08)),
    steps: t => [0, 0.35, 0.7, 1.05].forEach(d => { thud(t + d, 110, 0.12, 0.1); noise(t + d, 0.08, 0.03, 900, 500); }),
    crowd: t => { noise(t, 2.2, 0.06, 500, 900); noise(t + 0.3, 1.8, 0.04, 1200, 700); },
    wind: t => noise(t, 2.6, 0.07, 300, 1400),
    fire: t => { for (let i = 0; i < 9; i++) noise(t + Math.random() * 1.4, 0.05, 0.05, 2500, 1200); noise(t, 1.5, 0.03, 300, 500); },
    hammer: t => { thud(t, 220, 0.25, 0.06); bell(76, t, 0.03); },
    plane: t => noise(t, 0.45, 0.09, 2600, 900),
    sheep: t => { const o = ctx.createOscillator(), v = ctx.createOscillator(), vg = ctx.createGain(), g = ctx.createGain(), f = ctx.createBiquadFilter(); o.type = 'sawtooth'; o.frequency.value = 420; v.frequency.value = 22; vg.gain.value = 18; v.connect(vg); vg.connect(o.frequency); f.type = 'bandpass'; f.frequency.value = 1100; f.Q.value = 2; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.07, t + 0.05); g.gain.linearRampToValueAtTime(0.05, t + 0.4); g.gain.linearRampToValueAtTime(0, t + 0.6); o.connect(f); f.connect(g); g.connect(out(sfxBus, 1, 0.3)); o.start(t); v.start(t); o.stop(t + 0.65); v.stop(t + 0.65); },
    angel: t => { pad([72, 76, 79, 84], t, 2.2, 0.03); [84, 88, 91, 96].forEach((m, i) => bell(m, t + 0.15 * i, 0.05)); },
    baby: t => { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'triangle'; o.frequency.setValueAtTime(520, t); o.frequency.linearRampToValueAtTime(660, t + 0.25); o.frequency.linearRampToValueAtTime(480, t + 0.7); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.05, t + 0.08); g.gain.linearRampToValueAtTime(0, t + 0.75); o.connect(g); g.connect(out(sfxBus, 1, 0.5)); o.start(t); o.stop(t + 0.8); }
  };
  function thud(t, f, vol, dur) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(f * 1.6, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.05);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(out(sfxBus, 1, 0.3)); o.start(t); o.stop(t + dur + 0.05);
  }

  // 대사 말소리: 인물마다 높이가 다른 짧은 '톡'
  const VOICE = { '사가랴': 150, '엘리사벳': 330, '요셉': 190, '마리아': 420, '할아버지': 135, '제사장': 170, '젊은 제사장': 230, '꼬마': 520, '이웃': 360, '천사': 600, '가브리엘': 600, '목자': 175, '여관 주인': 210, '랍비': 160, '친척': 260, '나': 440 };
  let lastBlip = 0;
  function blip(who) {
    if (!on() || !ctx || ctx.state !== 'running') return;
    const t = ctx.currentTime;
    if (t - lastBlip < 0.045) return;
    lastBlip = t;
    try {
      if (!who || /서판$/.test(who)) { noise(t, 0.035, 0.035, 2800, 1800); return; }
      const f = (VOICE[who] || 280) * (0.94 + Math.random() * 0.12);
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = who === '천사' || who === '가브리엘' ? 'sine' : 'triangle';
      o.frequency.value = f;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.045, t + 0.006); g.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
      o.connect(g); g.connect(sfxBus); o.start(t); o.stop(t + 0.07);
    } catch (e) { /* 무시 */ }
  }
  function sfx(name) {
    if (!on() || !ctx || ctx.state !== 'running' || !FX[name]) return;
    try { FX[name](ctx.currentTime + 0.01); } catch (e) { /* 무시 */ }
  }

  function music(name) {
    wanted = name;
    if (!on() || !ctx || ctx.state !== 'running') return;
    if (current !== name) startMusic(name);
  }
  // 🔊 버튼: 방금 그 터치로 소리가 깨어난 거라면 끄지 않는다
  function toggle() {
    if (on() && Date.now() - lastWake < 700) return true;
    setOn(!on());
    return on();
  }
  function setOn(v) {
    Core.data.sound = v;
    Core.save();
    if (!v) { stopMusic(); stopAmb(); if (ctx) ctx.suspend(); }
    else { init(); ctx && ctx.resume().then(() => { if (wanted) startMusic(wanted); if (ambWanted) startAmb(ambWanted); }); }
  }

  // 장 분위기 → 곡
  const TONE_SONG = { ch0: 'night', ch1: 'veni', ch2: 'calm', ch3: 'joy', ch4: 'silent', end: 'silent', home: 'night' };
  /* ---------- 핵심 장면 음성 (audio/*.mp3, 잔향을 입혀서) ---------- */
  const vcache = {};
  function preload(name) {
    if (!ctx) return Promise.resolve(null);
    if (!vcache[name]) {
      vcache[name] = fetch('audio/' + name + '.mp3').then(r => r.ok ? r.arrayBuffer() : null)
        .then(b => b && new Promise((res, rej) => ctx.decodeAudioData(b, res, rej))).catch(() => null);
    }
    return vcache[name];
  }
  async function voice(name) {
    if (!on() || !ctx || ctx.state !== 'running') return;
    const buf = await preload(name);
    if (!buf || !ctx) return;
    const s = ctx.createBufferSource(); s.buffer = buf;
    const g = ctx.createGain(); g.gain.value = 1.1;
    // 천사·천군은 성전처럼 크게 울리고, 사람 목소리는 살짝만
    const heavenly = /^v-(1-3|1-4|2-3|3-0|3-1|4-4|4-4c)$/.test(name);
    const w = ctx.createGain(); w.gain.value = heavenly ? 0.45 : 0.12;
    s.connect(g); g.connect(master); g.connect(w); w.connect(reverb);
    const t = ctx.currentTime;
    musicBus.gain.cancelScheduledValues(t); musicBus.gain.setTargetAtTime(0.14, t, 0.3);
    musicBus.gain.setTargetAtTime(0.5, t + buf.duration + 0.3, 0.8);
    s.start(t + 0.05);
  }
  window.Sound = { sfx, blip, music, ambience, voice, preload: n => preload(n), setOn, toggle, get on() { return on(); }, get state() { return (ctx ? ctx.state : 'none') + ' · ' + (current || '-'); }, forTone: t => TONE_SONG[t] || 'calm' };
})();
