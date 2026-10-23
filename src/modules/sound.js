// Optional sound, off until asked for. Nothing is downloaded: a low drone, a breath of filtered
// noise when a transaction begins and a soft tick when it commits — all synthesised.

export function initSound() {
  // there's one in the nav and one in the phone menu
  const btns = [...document.querySelectorAll('[data-sound]')];
  if (!btns.length || !(window.AudioContext || window.webkitAudioContext)) {
    btns.forEach((b) => b.remove());
    return;
  }
  let ctx = null;
  let master = null;
  let on = false;
  let noise = null;

  const start = () => {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);

    // the drone: two detuned low oscillators through a slowly breathing low-pass
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 380;
    filter.Q.value = 0.8;
    const drone = ctx.createGain();
    drone.gain.value = 0.07;
    filter.connect(drone).connect(master);
    [
      ['sine', 55],
      ['triangle', 82.6],
      ['sine', 110.4],
    ].forEach(([type, f]) => {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = f;
      o.connect(filter);
      o.start();
    });
    const lfo = ctx.createOscillator();
    const depth = ctx.createGain();
    lfo.frequency.value = 0.07;
    depth.gain.value = 160;
    lfo.connect(depth).connect(filter.frequency);
    lfo.start();

    const buf = ctx.createBuffer(1, ctx.sampleRate * 1.5, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    noise = buf;
  };

  const whoosh = () => {
    if (!on) return;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = noise;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 1.4;
    bp.frequency.setValueAtTime(260, t);
    bp.frequency.exponentialRampToValueAtTime(2200, t + 0.9);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.08, t + 0.25);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
    src.connect(bp).connect(g).connect(master);
    src.start(t);
    src.stop(t + 1.3);
  };

  const tick = () => {
    if (!on) return;
    const t = ctx.currentTime;
    [880, 1320].forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(i ? 0.025 : 0.05, t + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
      o.connect(g).connect(master);
      o.start(t);
      o.stop(t + 0.2);
    });
  };

  const toggle = () => {
    if (!ctx) start();
    on = !on;
    ctx.resume?.();
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setTargetAtTime(on ? 0.5 : 0, ctx.currentTime, 0.4);
    btns.forEach((b) => {
      b.setAttribute('aria-pressed', String(on));
      const label = b.querySelector('[data-sound-label]');
      if (label) label.textContent = on ? 'Sound on' : 'Sound off';
    });
    if (on) tick();
  };
  btns.forEach((b) => b.addEventListener('click', toggle));

  addEventListener('tx', (e) => (e.detail.op === 'commit' ? tick() : whoosh()));
}
