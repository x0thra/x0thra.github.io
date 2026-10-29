let audioCtx = null;
let noiseBuffer = null;

function ensureContext() {
  if (typeof window === 'undefined') return null;

  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    audioCtx = new AudioContextClass();

    const bufferLength = Math.floor(audioCtx.sampleRate * 0.03);
    noiseBuffer = audioCtx.createBuffer(1, bufferLength, audioCtx.sampleRate);
    const channelData = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferLength; i++) {
      channelData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferLength * 0.35));
    }
  }

  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }

  return audioCtx;
}

export function unlockAudio() {
  ensureContext();
}

export function playTypeSound(char) {
  if (!char || char === ' ') return;
  const ctx = ensureContext();
  if (!ctx || !noiseBuffer) return;

  const now = ctx.currentTime;

  if (char === '\n') {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(65, now + 0.035);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.038);
    return;
  }

  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuffer;

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  const pitchJitter = (Math.random() - 0.5) * 320;
  filter.frequency.setValueAtTime(2100 + pitchJitter, now);
  filter.Q.setValueAtTime(3.2, now);

  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.11, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.022);

  noise.connect(filter);
  filter.connect(noiseGain);
  noiseGain.connect(ctx.destination);

  const clickOsc = ctx.createOscillator();
  const clickGain = ctx.createGain();
  clickOsc.type = 'sine';
  clickOsc.frequency.setValueAtTime(880 + pitchJitter * 0.5, now);
  clickOsc.frequency.exponentialRampToValueAtTime(220, now + 0.016);

  clickGain.gain.setValueAtTime(0.045, now);
  clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.016);

  clickOsc.connect(clickGain);
  clickGain.connect(ctx.destination);

  noise.start(now);
  noise.stop(now + 0.025);
  clickOsc.start(now);
  clickOsc.stop(now + 0.018);
}

export function playEraseSound() {
  const ctx = ensureContext();
  if (!ctx || !noiseBuffer) return;

  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sawtooth';
  const jitter = (Math.random() - 0.5) * 90;
  osc.frequency.setValueAtTime(420 + jitter, now);
  osc.frequency.exponentialRampToValueAtTime(110, now + 0.014);

  gain.gain.setValueAtTime(0.06, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.014);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.015);
}

export function playSelectSound() {
  const ctx = ensureContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(520, now);
  osc.frequency.exponentialRampToValueAtTime(280, now + 0.045);

  gain.gain.setValueAtTime(0.07, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.05);
}

export function playDistrustSound() {
  const ctx = ensureContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(110, now);
  osc.frequency.linearRampToValueAtTime(72, now + 0.35);

  gain.gain.setValueAtTime(0.08, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.4);
}
