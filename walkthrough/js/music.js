/* Soft background music made entirely in code (Web Audio): no sound files.
   A slow four-chord pad with a quiet bass note, and a few gentle bell notes that
   are picked afresh each time, sent through an echo. It starts with the tour
   (browsers only allow sound after a click) and has a mute button. */
(function () {
  const A = (window.APP = window.APP || {});
  const LEVEL = 0.2;            // overall loudness (kept low: it sits under the visit)
  const BAR = 6.4;              // seconds per chord
  // A minor 9, F major 7, C major (add 9), G (add 6): calm, and it loops without a seam
  const CHORDS = [[45, 57, 60, 64, 71], [41, 57, 60, 64, 65], [36, 55, 60, 62, 64], [43, 55, 59, 62, 64]];
  const BELLS = [69, 72, 74, 76, 79, 81, 84]; // A minor pentatonic, upper octaves
  const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);

  let ctx = null, master = null, pad = null, echo = null, timer = null, next = 0, bar = 0, last = 3;
  const M = {
    on: false, muted: false, onChange: null,
    start() {
      if (M.on) return;
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        ctx = ctx || new AC();
        if (ctx.state === 'suspended') ctx.resume();
        if (!master) build();
      } catch (err) { return; }
      M.on = true;
      next = ctx.currentTime + 0.15;
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
      master.gain.linearRampToValueAtTime(M.muted ? 0 : LEVEL, ctx.currentTime + 2.5);
      schedule();
      timer = setInterval(schedule, 400);
      if (M.onChange) M.onChange();
    },
    stop() {
      if (!M.on) return;
      M.on = false;
      clearInterval(timer);
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
      master.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.5);
      if (M.onChange) M.onChange();
    },
    setMuted(m) {
      M.muted = !!m;
      if (master) {
        master.gain.cancelScheduledValues(ctx.currentTime);
        master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
        master.gain.linearRampToValueAtTime(M.muted || !M.on ? 0 : LEVEL, ctx.currentTime + 0.6);
      }
      if (M.onChange) M.onChange();
    },
  };

  function build() {
    master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);
    // the pad goes through a low-pass filter so it stays soft and warm
    pad = ctx.createBiquadFilter();
    pad.type = 'lowpass';
    pad.frequency.value = 1100;
    pad.Q.value = 0.4;
    pad.connect(master);
    // a simple echo for the bell notes
    echo = ctx.createGain();
    const delay = ctx.createDelay(1.5), fb = ctx.createGain(), wet = ctx.createGain();
    delay.delayTime.value = 0.42;
    fb.gain.value = 0.38;
    wet.gain.value = 0.5;
    echo.connect(master);
    echo.connect(delay);
    delay.connect(fb); fb.connect(delay);
    delay.connect(wet); wet.connect(master);
  }

  function tone(type, freq, t, attack, hold, release, level, out, detune) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    if (detune) o.detune.value = detune;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(level, t + attack);
    g.gain.setValueAtTime(level, t + attack + hold);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + hold + release);
    o.connect(g); g.connect(out);
    o.start(t);
    o.stop(t + attack + hold + release + 0.05);
  }

  function schedule() {
    if (!M.on || !ctx) return;
    while (next < ctx.currentTime + 1.2) {
      const ch = CHORDS[bar % CHORDS.length], t = next;
      // pad: each note twice, slightly detuned, swelling in and out across the bar
      ch.forEach((m, i) => {
        const lv = i === 0 ? 0.2 : 0.1;
        tone(i === 0 ? 'sine' : 'triangle', hz(m), t, 2.2, BAR - 2.4, 3.4, lv, pad, -5);
        if (i > 0) tone('sine', hz(m), t + 0.05, 2.6, BAR - 2.8, 3.2, lv * 0.8, pad, 6);
      });
      // bells: two to four soft notes per bar, moving by small steps
      const n = 2 + Math.floor(Math.random() * 3);
      for (let k = 0; k < n; k++) {
        last = Math.max(0, Math.min(BELLS.length - 1, last + Math.floor(Math.random() * 5) - 2));
        const bt = t + 0.4 + (k + Math.random() * 0.5) * ((BAR - 1) / n);
        tone('sine', hz(BELLS[last]), bt, 0.012, 0.02, 2.6, 0.085, echo, 0);
        tone('triangle', hz(BELLS[last]) * 2, bt, 0.008, 0.01, 0.9, 0.02, echo, 0);
      }
      next += BAR;
      bar++;
    }
  }

  // sound stops while the page is in the background, and picks up again after
  document.addEventListener('visibilitychange', () => {
    if (!ctx || !M.on) return;
    if (document.hidden) ctx.suspend(); else { ctx.resume(); next = Math.max(next, ctx.currentTime + 0.1); }
  });

  A.music = M;
})();
