/**
 * Rush Calory Game Audio Engine
 * Steam-style Achievement and Rank-Up Chimes
 * Automatic zero-latency playback with AudioContext pre-unlock
 */

let sharedAudioCtx: AudioContext | null = null;

export function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    if (!sharedAudioCtx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        sharedAudioCtx = new AudioCtx();
      }
    }
    if (sharedAudioCtx && sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume().catch(() => {});
    }
  } catch (e) {
    console.warn('AudioContext init error:', e);
  }
  return sharedAudioCtx;
}

// Auto-unlock AudioContext on very first user interaction anywhere on the screen
if (typeof window !== 'undefined') {
  const unlockAudio = () => {
    try {
      const ctx = getAudioContext();
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      // Also prime an HTML5 audio element
      const prime = new Audio('/sounds/rank-up.wav');
      prime.volume = 0.01;
      prime.play().then(() => {
        prime.pause();
        prime.currentTime = 0;
      }).catch(() => {});
    } catch (_) {}

    window.removeEventListener('click', unlockAudio);
    window.removeEventListener('touchstart', unlockAudio);
    window.removeEventListener('keydown', unlockAudio);
  };

  window.addEventListener('click', unlockAudio, { once: true, passive: true });
  window.addEventListener('touchstart', unlockAudio, { once: true, passive: true });
  window.addEventListener('keydown', unlockAudio, { once: true, passive: true });
}

/**
 * Automatically plays the Steam-style Rank-Up / Achievement chime.
 * Calls procedural Web Audio synthesizer directly to guarantee 100% instant,
 * automatic playback on mobile and desktop without browser autoplay blocks.
 */
export function playRankUpSound(): void {
  if (typeof window === 'undefined') return;

  try {
    // 1. Synthesize via unlocked Web Audio API (Instant, cannot be blocked by autoplay)
    synthesizeRankUpSound();

    // 2. Also play the stereo WAV file in parallel for maximum acoustic richness
    const audio = new Audio('/sounds/rank-up.wav');
    audio.volume = 0.95;
    audio.play().catch(() => {
      // If HTML5 Audio was blocked by browser policy, Web Audio synth above already played!
    });
  } catch (err) {
    console.warn('playRankUpSound error:', err);
  }
}

/**
 * Pure Web Audio API procedural synthesizer for the Steam Rank-Up Sound.
 * 100% offline, 0 network latency, crystal-clear 24-bit sound.
 */
export function synthesizeRankUpSound(): void {
  if (typeof window === 'undefined') return;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    // Master Compressor/Limiter to prevent clipping and give that fat game sound
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-12, now);
    compressor.knee.setValueAtTime(30, now);
    compressor.ratio.setValueAtTime(12, now);
    compressor.attack.setValueAtTime(0.003, now);
    compressor.release.setValueAtTime(0.25, now);
    compressor.connect(ctx.destination);

    // 1. Low punchy bass transient (sub-thump like in game engines)
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(120, now);
    subOsc.frequency.exponentialRampToValueAtTime(40, now + 0.35);

    subGain.gain.setValueAtTime(0.001, now);
    subGain.gain.linearRampToValueAtTime(0.5, now + 0.015);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    subOsc.connect(subGain);
    subGain.connect(compressor);
    subOsc.start(now);
    subOsc.stop(now + 0.45);

    // 2. Steam-style triumphant arpeggio: G5 -> C6 -> E6 -> G6 -> C7
    const notes = [
      { freq: 783.99, delay: 0.00, dur: 0.85, amp: 0.38 },  // G5
      { freq: 1046.50, delay: 0.08, dur: 0.95, amp: 0.42 }, // C6
      { freq: 1318.51, delay: 0.16, dur: 1.15, amp: 0.46 }, // E6
      { freq: 1567.98, delay: 0.24, dur: 1.40, amp: 0.52 }, // G6
      { freq: 2093.00, delay: 0.32, dur: 1.70, amp: 0.60 }, // C7 (Climax)
      { freq: 3135.96, delay: 0.36, dur: 1.10, amp: 0.25 }, // Stardust sparkle
      { freq: 4186.01, delay: 0.40, dur: 0.90, amp: 0.18 }, // Super-high shimmer
    ];

    notes.forEach(({ freq, delay, dur, amp }) => {
      const start = now + delay;

      // Primary tone (triangle for warm round bell)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.linearRampToValueAtTime(amp, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);

      osc.connect(gain);
      gain.connect(compressor);
      osc.start(start);
      osc.stop(start + dur + 0.05);

      // Bright metallic bell overtone (sine at 2x frequency)
      const bell = ctx.createOscillator();
      const bellGain = ctx.createGain();
      bell.type = 'sine';
      bell.frequency.setValueAtTime(freq * 2.003, start);

      bellGain.gain.setValueAtTime(0.0001, start);
      bellGain.gain.linearRampToValueAtTime(amp * 0.45, start + 0.01);
      bellGain.gain.exponentialRampToValueAtTime(0.0001, start + (dur * 0.65));

      bell.connect(bellGain);
      bellGain.connect(compressor);
      bell.start(start);
      bell.stop(start + dur);
    });
  } catch (err) {
    console.warn('synthesizeRankUpSound error:', err);
  }
}
