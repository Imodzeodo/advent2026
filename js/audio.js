/* 배경음악·효과음: 녹음 파일 없이 코드로 직접 연주한다(저작권 문제 없음).
   곡은 모두 저작권이 끝난 옛 찬송 선율:
   - 「곧 오소서 임마누엘」(Veni Emmanuel, 15세기 선율)  → 1장
   - 「기쁘다 구주 오셨네」(Antioch, 1836 편곡 선율)      → 3장
   - 「고요한 밤 거룩한 밤」(Gruber, 1818)                 → 4장·성탄
   - 그 밖: 종소리가 드문드문 울리는 잔잔한 배경(직접 만든 것) */
(function () {
  let ctx = null, master, musicBus, sfxBus, reverb;
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
  function unlock() {
    if (!on()) return;
    init();
    if (ctx && ctx.state !== 'running') ctx.resume();
    if (wanted && !current) startMusic(wanted);
  }
  ['pointerdown', 'touchend', 'keydown'].forEach(ev => window.addEventListener(ev, unlock, { passive: true }));
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) ctx.suspend(); else if (on()) ctx.resume();
  });

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
        if (n.c) { flushPad(next); chord = n.c; chordStart = next; }
        else {
          if (n[0]) musicBox(n[0], next, song.vol);
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
    tap: t => musicBox(91, t, 0.025, sfxBus)
  };
  function sfx(name) {
    if (!on() || !ctx || ctx.state !== 'running' || !FX[name]) return;
    try { FX[name](ctx.currentTime + 0.01); } catch (e) { /* 무시 */ }
  }

  function music(name) {
    wanted = name;
    if (!on() || !ctx || ctx.state !== 'running') return;
    if (current !== name) startMusic(name);
  }
  function setOn(v) {
    Core.data.sound = v;
    Core.save();
    if (!v) { stopMusic(); if (ctx) ctx.suspend(); }
    else { init(); ctx && ctx.resume().then(() => { if (wanted) startMusic(wanted); }); }
  }

  // 장 분위기 → 곡
  const TONE_SONG = { ch0: 'night', ch1: 'veni', ch2: 'calm', ch3: 'joy', ch4: 'silent', end: 'silent', home: 'night' };
  window.Sound = { sfx, music, setOn, get on() { return on(); }, get state() { return (ctx ? ctx.state : 'none') + ' · ' + (current || '-'); }, forTone: t => TONE_SONG[t] || 'calm' };
})();
