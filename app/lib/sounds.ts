let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!audioCtx || audioCtx.state === 'closed') {
    audioCtx = new AudioContext();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function playTone(
  freq: number,
  duration: number,
  startTime: number,
  type: OscillatorType = 'sine',
  gain = 0.3
) {
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();

  osc.connect(gainNode);
  gainNode.connect(ctx.destination);

  osc.type = type;
  osc.frequency.setValueAtTime(freq, startTime);
  gainNode.gain.setValueAtTime(gain, startTime);
  gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

  osc.start(startTime);
  osc.stop(startTime + duration);
}

// Energetic double beep — exercise phase
export function playExerciseStart() {
  const ctx = getCtx();
  const t = ctx.currentTime;
  playTone(880, 0.12, t, 'square', 0.28);
  playTone(1100, 0.18, t + 0.16, 'square', 0.28);
}

// Calm single low tone — rest phase
export function playRestStart() {
  const ctx = getCtx();
  const t = ctx.currentTime;
  playTone(392, 0.5, t, 'sine', 0.3);
}

// Ascending triple tone — warm up
export function playWarmupStart() {
  const ctx = getCtx();
  const t = ctx.currentTime;
  playTone(523, 0.18, t, 'sine', 0.25);
  playTone(659, 0.18, t + 0.22, 'sine', 0.25);
  playTone(784, 0.28, t + 0.44, 'sine', 0.25);
}

// Descending triple tone — cool down
export function playCooldownStart() {
  const ctx = getCtx();
  const t = ctx.currentTime;
  playTone(784, 0.18, t, 'sine', 0.25);
  playTone(659, 0.18, t + 0.22, 'sine', 0.25);
  playTone(523, 0.28, t + 0.44, 'sine', 0.25);
}

// Subtle tick for last 3 seconds
export function playCountdownTick() {
  const ctx = getCtx();
  const t = ctx.currentTime;
  playTone(1320, 0.08, t, 'square', 0.15);
}

// Victory fanfare — workout complete
export function playComplete() {
  const ctx = getCtx();
  const t = ctx.currentTime;
  playTone(523, 0.12, t, 'sine', 0.3);
  playTone(659, 0.12, t + 0.15, 'sine', 0.3);
  playTone(784, 0.12, t + 0.3, 'sine', 0.3);
  playTone(1047, 0.45, t + 0.45, 'sine', 0.3);
}

export function playSoundForPhase(type: 'warmup' | 'exercise' | 'rest' | 'cooldown') {
  switch (type) {
    case 'warmup': playWarmupStart(); break;
    case 'exercise': playExerciseStart(); break;
    case 'rest': playRestStart(); break;
    case 'cooldown': playCooldownStart(); break;
  }
}
