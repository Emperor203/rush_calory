/**
 * Rush Calory Game Audio Synthesizer & Sound FX Engine
 * Steam-style Achievement and Rank-Up Chimes
 */

export function playRankUpSound(): void {
  if (typeof window === 'undefined') return;

  // 1. Try high-definition audio file first
  try {
    const audio = new Audio('/sounds/rank-up.wav');
    audio.volume = 0.95;
    const playPromise = audio.play();

    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        console.warn('rank-up.wav blocked/failed, switching to Web Audio synth:', err);
        synthesizeRankUpSound();
      });
    }
  } catch (err) {
    synthesizeRankUpSound();
  }
}

/**
 * Pure Web Audio API procedural synthesizer for the Steam Rank-Up Sound
 * 100% offline, 0 network latency, zero dependencies, crystal clear 24-bit sound.
 */
export function synthesizeRankUpSound(): void {
  if (typeof window === 'undefined') return;

  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    // 1. Low punchy bass transient (sub-thump like in game engines)
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(110, now);
    subOsc.frequency.exponentialRampToValueAtTime(42, now + 0.3);

    subGain.gain.setValueAtTime(0.001, now);
    subGain.gain.linearRampToValueAtTime(0.45, now + 0.01);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    subOsc.connect(subGain);
    subGain.connect(ctx.destination);
    subOsc.start(now);
    subOsc.stop(now + 0.4);

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

      // Primary tone
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.linearRampToValueAtTime(amp, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + dur + 0.05);

      // Bright metallic bell overtone
      const bell = ctx.createOscillator();
      const bellGain = ctx.createGain();
      bell.type = 'sine';
      bell.frequency.setValueAtTime(freq * 2.003, start);

      bellGain.gain.setValueAtTime(0.0001, start);
      bellGain.gain.linearRampToValueAtTime(amp * 0.4, start + 0.01);
      bellGain.gain.exponentialRampToValueAtTime(0.0001, start + (dur * 0.65));

      bell.connect(bellGain);
      bellGain.connect(ctx.destination);
      bell.start(start);
      bell.stop(start + dur);
    });
  } catch (err) {
    console.warn('synthesizeRankUpSound error:', err);
  }
}
