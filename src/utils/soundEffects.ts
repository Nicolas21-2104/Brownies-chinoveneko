// Synthesized Web Audio sound effects:
// - Chinese mode ('zh'): East Asian traditional instruments (Guzheng, Erhu, Chao Gong,
//   Peking Opera cymbals/clapper, Tanggu drum, Muyu woodblock) with dark-humor twists.
// - Spanish mode ('es'): Clean, warm, modern tactile UI & celebration sounds.

const MUTE_STORAGE_KEY = 'brownie_sfx_muted';

let sharedCtx: AudioContext | null = null;
let mutedState =
  typeof window !== 'undefined' &&
  window.sessionStorage?.getItem(MUTE_STORAGE_KEY) === '1';

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AudioCtx) return null;
  if (!sharedCtx) {
    sharedCtx = new AudioCtx();
  }
  if (sharedCtx.state === 'suspended') {
    void sharedCtx.resume().catch(() => {});
  }
  return sharedCtx;
}

export function isSfxMuted(): boolean {
  return mutedState;
}

export function setSfxMuted(muted: boolean): void {
  mutedState = muted;
  if (typeof window !== 'undefined') {
    try {
      window.sessionStorage.setItem(MUTE_STORAGE_KEY, muted ? '1' : '0');
    } catch {
      // ignore storage quota errors
    }
  }
}

function playNoiseBurst(
  ctx: AudioContext,
  startTime: number,
  duration: number,
  filterFreqStart: number,
  filterFreqEnd: number,
  gainPeak: number,
  filterType: BiquadFilterType = 'bandpass',
  q = 2.5,
): void {
  const sampleCount = Math.max(1, Math.floor(ctx.sampleRate * duration));
  const buffer = ctx.createBuffer(1, sampleCount, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < sampleCount; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const src = ctx.createBufferSource();
  src.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = filterType;
  filter.frequency.setValueAtTime(filterFreqStart, startTime);
  filter.frequency.exponentialRampToValueAtTime(
    Math.max(40, filterFreqEnd),
    startTime + duration,
  );
  filter.Q.value = q;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.linearRampToValueAtTime(gainPeak, startTime + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  src.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  src.start(startTime);
  src.stop(startTime + duration + 0.02);
}

function playTone(
  ctx: AudioContext,
  options: {
    type: OscillatorType;
    freqStart: number;
    freqEnd?: number;
    startTime: number;
    duration: number;
    gainPeak: number;
    attack?: number;
  },
): void {
  const {
    type,
    freqStart,
    freqEnd,
    startTime,
    duration,
    gainPeak,
    attack = 0.01,
  } = options;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freqStart, startTime);
  if (freqEnd !== undefined && freqEnd !== freqStart) {
    osc.frequency.exponentialRampToValueAtTime(
      Math.max(20, freqEnd),
      startTime + duration,
    );
  }

  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.linearRampToValueAtTime(gainPeak, startTime + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(startTime);
  osc.stop(startTime + duration + 0.03);
}

// ============================================================================
// CHINESE / EAST ASIAN INSTRUMENTS (Dark-humor imperial theme)
// ============================================================================

// Guzheng / Pipa plucked string with authentic pitch-bend grace note (hua yin)
function playGuzhengPluck(
  ctx: AudioContext,
  startTime: number,
  targetFreq: number,
  duration = 0.55,
  bendRatio = 0.89,
  gainPeak = 0.16,
): void {
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(Math.min(7000, targetFreq * 6), startTime);
  filter.frequency.exponentialRampToValueAtTime(
    Math.max(300, targetFreq * 1.4),
    startTime + duration,
  );
  filter.Q.value = 1.8;

  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(0.0001, startTime);
  masterGain.gain.linearRampToValueAtTime(gainPeak, startTime + 0.005);
  masterGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  filter.connect(masterGain);
  masterGain.connect(ctx.destination);

  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const osc2Gain = ctx.createGain();

  osc1.type = 'triangle';
  osc2.type = 'sawtooth';
  osc2Gain.gain.value = 0.32;

  const startFreq = targetFreq * bendRatio;
  osc1.frequency.setValueAtTime(startFreq, startTime);
  osc1.frequency.exponentialRampToValueAtTime(targetFreq, startTime + 0.06);

  osc2.frequency.setValueAtTime(startFreq * 2, startTime);
  osc2.frequency.exponentialRampToValueAtTime(targetFreq * 2, startTime + 0.06);

  osc1.connect(filter);
  osc2.connect(osc2Gain);
  osc2Gain.connect(filter);

  osc1.start(startTime);
  osc2.start(startTime);
  osc1.stop(startTime + duration + 0.03);
  osc2.stop(startTime + duration + 0.03);

  // Subtle fingernail pluck transient
  playNoiseBurst(ctx, startTime, 0.022, 3400, 1500, gainPeak * 0.45, 'bandpass', 1.4);
}

// Erhu (two-string Chinese fiddle) with nasal formant & expressive vibrato slide
function playErhuPhrase(
  ctx: AudioContext,
  notes: Array<{ freq: number; offset: number; dur: number }>,
  gainPeak = 0.12,
): void {
  if (notes.length === 0) return;
  const startTime = notes[0].offset;
  const last = notes[notes.length - 1];
  const endTime = last.offset + last.dur;

  const osc = ctx.createOscillator();
  osc.type = 'sawtooth';

  const vibrato = ctx.createOscillator();
  const vibratoGain = ctx.createGain();
  vibrato.frequency.value = 5.8;
  vibratoGain.gain.value = 7.5;
  vibrato.connect(vibratoGain);
  vibratoGain.connect(osc.frequency);

  const formant = ctx.createBiquadFilter();
  formant.type = 'bandpass';
  formant.frequency.value = 1050;
  formant.Q.value = 2.4;

  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, startTime);
  env.gain.linearRampToValueAtTime(gainPeak, startTime + 0.06);
  env.gain.setValueAtTime(gainPeak * 0.9, Math.max(startTime + 0.07, endTime - 0.14));
  env.gain.exponentialRampToValueAtTime(0.0001, endTime);

  osc.frequency.setValueAtTime(notes[0].freq * 0.94, startTime);
  for (const n of notes) {
    osc.frequency.linearRampToValueAtTime(n.freq, n.offset + 0.08);
  }

  osc.connect(formant);
  formant.connect(env);
  env.connect(ctx.destination);

  vibrato.start(startTime);
  osc.start(startTime);
  vibrato.stop(endTime + 0.03);
  osc.stop(endTime + 0.03);
}

// Chao Gong (deep Chinese bronze gong with metallic shimmer bloom)
function playChaoGong(
  ctx: AudioContext,
  startTime: number,
  baseFreq = 98,
  duration = 2.2,
  gainScale = 1,
): void {
  const partials = [
    { ratio: 1, amp: 0.22 * gainScale, type: 'triangle' as OscillatorType },
    { ratio: 1.47, amp: 0.15 * gainScale, type: 'sine' as OscillatorType },
    { ratio: 2.13, amp: 0.11 * gainScale, type: 'sine' as OscillatorType },
    { ratio: 2.79, amp: 0.085 * gainScale, type: 'sine' as OscillatorType },
    { ratio: 3.68, amp: 0.06 * gainScale, type: 'sine' as OscillatorType },
  ];

  for (const p of partials) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = p.type;
    osc.frequency.setValueAtTime(baseFreq * p.ratio * 0.97, startTime);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * p.ratio * 1.01, startTime + 0.28);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * p.ratio * 0.985, startTime + duration);

    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(p.amp, startTime + 0.035);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.03);
  }

  playNoiseBurst(ctx, startTime, 0.45, 2200, 620, 0.14 * gainScale, 'bandpass', 1.8);
}

// Peking Opera Cymbals (Bo / Xiaocha)
function playOperaCymbals(ctx: AudioContext, startTime: number, duration = 0.42, gainPeak = 0.16): void {
  playNoiseBurst(ctx, startTime, duration, 5800, 2900, gainPeak, 'highpass', 1.2);
  [1620, 2340, 3180, 4210].forEach((freq, idx) => {
    playTone(ctx, {
      type: 'sine',
      freqStart: freq,
      freqEnd: freq * 0.97,
      startTime,
      duration: duration * 0.8,
      gainPeak: gainPeak * (0.28 / (idx + 1)),
      attack: 0.004,
    });
  });
}

// Peking Opera wooden clapper (Ban)
function playOperaClapper(ctx: AudioContext, startTime: number, pitch = 1320): void {
  playTone(ctx, {
    type: 'triangle',
    freqStart: pitch,
    freqEnd: pitch * 0.52,
    startTime,
    duration: 0.045,
    gainPeak: 0.22,
    attack: 0.002,
  });
  playNoiseBurst(ctx, startTime, 0.03, 3200, 1400, 0.15, 'bandpass', 3.0);
}

// Buddhist temple woodblock (Muyu)
function playMuyu(ctx: AudioContext, startTime: number, pitch = 720): void {
  playTone(ctx, {
    type: 'sine',
    freqStart: pitch,
    freqEnd: pitch * 0.72,
    startTime,
    duration: 0.11,
    gainPeak: 0.21,
    attack: 0.003,
  });
  playTone(ctx, {
    type: 'sine',
    freqStart: pitch * 2.02,
    freqEnd: pitch * 1.5,
    startTime,
    duration: 0.055,
    gainPeak: 0.07,
    attack: 0.003,
  });
}

// Chinese Tanggu barrel drum thump
function playTangguDrum(ctx: AudioContext, startTime: number, gainPeak = 0.26): void {
  playTone(ctx, {
    type: 'sine',
    freqStart: 158,
    freqEnd: 64,
    startTime,
    duration: 0.19,
    gainPeak,
    attack: 0.004,
  });
  playNoiseBurst(ctx, startTime, 0.06, 650, 220, gainPeak * 0.4, 'lowpass', 1.2);
}

// 1. Entering Chinese mode: Tanggu drum + Chao Gong + Peking Opera clapper + descending Erhu & Guzheng doom phrase
export function playImperialEntryGong(): void {
  if (mutedState) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime + 0.02;

    playTangguDrum(ctx, now);
    playChaoGong(ctx, now + 0.04, 92, 2.4, 1.0);
    playOperaClapper(ctx, now + 0.18, 1380);

    // Classic Chinese pentatonic decree descending with dark-humor gravity
    const decree = [587.33, 493.88, 440.0, 392.0, 329.63, 293.66];
    decree.forEach((freq, idx) => {
      playGuzhengPluck(
        ctx,
        now + 0.24 + idx * 0.12,
        freq,
        idx === decree.length - 1 ? 0.9 : 0.35,
        0.9,
        0.13,
      );
    });
  } catch {
    // ignore audio errors
  }
}

// 2. Scoring in Chinese mode (0..100): authentic Asian instrumentation with dark-humor reaction
export function playChineseScoreSfx(score: number): void {
  if (mutedState) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime + 0.01;

    if (score === 0) {
      // Zero points (零): Tragic weeping Erhu slide + funeral temple Muyu double-knock
      playMuyu(ctx, now, 340);
      playMuyu(ctx, now + 0.16, 290);
      playErhuPhrase(
        ctx,
        [
          { freq: 440.0, offset: now + 0.06, dur: 0.26 },
          { freq: 392.0, offset: now + 0.32, dur: 0.24 },
          { freq: 329.63, offset: now + 0.56, dur: 0.24 },
          { freq: 293.66, offset: now + 0.80, dur: 0.55 },
        ],
        0.13,
      );
      return;
    }

    if (score <= 30) {
      // Low score (10-30): Peking Opera clapper + cymbal slash + tense descending Pipa notes
      playOperaClapper(ctx, now, 1420);
      playOperaCymbals(ctx, now + 0.04, 0.26, 0.13);
      playGuzhengPluck(ctx, now + 0.09, 440, 0.35, 1.12, 0.14);
      playGuzhengPluck(ctx, now + 0.22, 329.63, 0.45, 1.1, 0.14);
      return;
    }

    if (score <= 70) {
      // Mid score (40-70): Temple Muyu knock + pentatonic Guzheng pluck with upward hua yin
      const pentatonic = [392.0, 440.0, 493.88, 587.33]; // G4, A4, B4, D5
      const freq = pentatonic[Math.floor((score - 40) / 10) % pentatonic.length];
      playMuyu(ctx, now, 710);
      playGuzhengPluck(ctx, now + 0.06, freq, 0.5, 0.88, 0.15);
      return;
    }

    if (score < 100) {
      // High score (80-90): Brisk upward Guzheng pentatonic sweep
      const notes = score === 80 ? [440.0, 587.33, 659.25] : [440.0, 587.33, 659.25, 783.99];
      notes.forEach((freq, idx) => {
        playGuzhengPluck(ctx, now + idx * 0.065, freq, 0.55, 0.9, 0.14);
      });
      return;
    }

    // 100 points (一百): Imperial Tanggu + Golden Gong + Peking Cymbals + cascading Guzheng glissando
    playTangguDrum(ctx, now, 0.24);
    playChaoGong(ctx, now + 0.02, 130.81, 1.6, 0.85);
    playOperaCymbals(ctx, now + 0.04, 0.45, 0.14);
    const sweep = [587.33, 659.25, 783.99, 880.0, 987.77, 1174.66];
    sweep.forEach((freq, idx) => {
      playGuzhengPluck(ctx, now + 0.06 + idx * 0.055, freq, 0.65, 0.92, 0.14);
    });
  } catch {
    // ignore audio errors
  }
}

// 3. Clicking "切换为西班牙语": Rapid Peking Opera clappers + eerie Erhu tritone warning
export function playChineseTrapWarning(): void {
  if (mutedState) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime + 0.01;

    playOperaClapper(ctx, now, 1360);
    playOperaClapper(ctx, now + 0.09, 1480);
    playErhuPhrase(
      ctx,
      [
        { freq: 440.0, offset: now + 0.04, dur: 0.22 },
        { freq: 311.13, offset: now + 0.26, dur: 0.34 },
      ],
      0.11,
    );
  } catch {
    // ignore audio errors
  }
}

// 4. Failing the Chinese escape verification: Peking Opera cymbal crash + mocking descending Erhu + drum slam
export function playChineseEscapeDenied(): void {
  if (mutedState) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime + 0.01;

    playTangguDrum(ctx, now, 0.28);
    playOperaCymbals(ctx, now + 0.02, 0.36, 0.16);
    playErhuPhrase(
      ctx,
      [
        { freq: 493.88, offset: now + 0.05, dur: 0.14 },
        { freq: 369.99, offset: now + 0.19, dur: 0.14 },
        { freq: 246.94, offset: now + 0.33, dur: 0.35 },
      ],
      0.12,
    );
  } catch {
    // ignore audio errors
  }
}

// 5. Escaping back to Spanish cleanly: gentle pentatonic release chime
export function playChineseEscapeSuccess(): void {
  if (mutedState) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime + 0.01;

    [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
      playTone(ctx, {
        type: 'sine',
        freqStart: freq,
        startTime: now + idx * 0.07,
        duration: 0.35,
        gainPeak: 0.11,
      });
    });
  } catch {
    // ignore audio errors
  }
}

// 6. Vote submitted in Chinese mode: Peking Opera celebration + skeleton bone-rattle pentatonic dance
export function playChineseCelebrationSkeleton(): void {
  if (mutedState) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime + 0.02;

    playTangguDrum(ctx, now, 0.26);
    playChaoGong(ctx, now + 0.02, 110, 1.9, 0.9);
    playOperaCymbals(ctx, now + 0.04, 0.45, 0.13);

    // Playful East Asian minor-pentatonic skeleton dance riff (D-E-F-A-B-D style)
    const riff = [
      { freq: 587.33, t: 0.16, d: 0.22 }, // D5
      { freq: 659.25, t: 0.30, d: 0.22 }, // E5
      { freq: 783.99, t: 0.44, d: 0.22 }, // G5
      { freq: 880.0, t: 0.58, d: 0.24 },  // A5
      { freq: 783.99, t: 0.72, d: 0.22 }, // G5
      { freq: 659.25, t: 0.86, d: 0.22 }, // E5
      { freq: 587.33, t: 1.00, d: 0.22 }, // D5
      { freq: 440.0, t: 1.14, d: 0.22 },  // A4
      { freq: 587.33, t: 1.28, d: 0.24 }, // D5
      { freq: 880.0, t: 1.44, d: 0.24 },  // A5
      { freq: 1174.66, t: 1.60, d: 0.65 }, // D6
    ];

    riff.forEach((n, idx) => {
      playGuzhengPluck(ctx, now + n.t, n.freq, n.d + 0.15, 0.92, 0.13);
      // Synced skeleton bone-rattle percussion (Muyu + Opera Clapper)
      if (idx % 2 === 0) {
        playMuyu(ctx, now + n.t, 880 + (idx % 3) * 110);
      } else {
        playOperaClapper(ctx, now + n.t, 1280 + (idx % 2) * 180);
      }
    });

    // Finale Tanggu + Opera cymbals + confetti pop
    playTangguDrum(ctx, now + 1.60, 0.22);
    playOperaCymbals(ctx, now + 1.61, 0.5, 0.15);
  } catch {
    // ignore audio errors
  }
}

// ============================================================================
// SPANISH NORMAL UI & CELEBRATION SOUNDS (Clean, warm, modern)
// ============================================================================

// Soft, pleasant marimba/kalimba-style tap pitched up gently from 0 to 10
export function playSpanishScoreSfx(score: number): void {
  if (mutedState) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime + 0.01;

    // Warm C-major / pentatonic steps for 0..10
    const scale = [
      261.63, // 0: C4
      293.66, // 1: D4
      329.63, // 2: E4
      349.23, // 3: F4
      392.0,  // 4: G4
      440.0,  // 5: A4
      493.88, // 6: B4
      523.25, // 7: C5
      587.33, // 8: D5
      659.25, // 9: E5
      783.99, // 10: G5
    ];
    const clamped = Math.max(0, Math.min(10, Math.round(score)));
    const freq = scale[clamped];

    playTone(ctx, {
      type: 'sine',
      freqStart: freq,
      startTime: now,
      duration: 0.16,
      gainPeak: 0.14,
      attack: 0.005,
    });
    playTone(ctx, {
      type: 'triangle',
      freqStart: freq * 2,
      startTime: now,
      duration: 0.08,
      gainPeak: 0.035,
      attack: 0.004,
    });
  } catch {
    // ignore audio errors
  }
}

// Cheerful, clean celebratory chord + confetti pop when voting succeeds in Spanish
export function playSpanishCelebrationSfx(): void {
  if (mutedState) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime + 0.01;

    // Upbeat ascending major triad + octave (C5 -> E5 -> G5 -> C6)
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      playTone(ctx, {
        type: 'triangle',
        freqStart: freq,
        startTime: now + idx * 0.07,
        duration: idx === notes.length - 1 ? 0.55 : 0.28,
        gainPeak: 0.12,
        attack: 0.008,
      });
    });

    // Subtle crisp confetti pop
    playNoiseBurst(ctx, now + 0.18, 0.12, 3400, 1100, 0.09, 'highpass', 1.2);
  } catch {
    // ignore audio errors
  }
}

// Clean gentle two-tone warning for form validation / connection error in Spanish
export function playSpanishErrorSfx(): void {
  if (mutedState) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime + 0.01;

    playTone(ctx, {
      type: 'sine',
      freqStart: 329.63,
      startTime: now,
      duration: 0.12,
      gainPeak: 0.11,
      attack: 0.005,
    });
    playTone(ctx, {
      type: 'sine',
      freqStart: 246.94,
      startTime: now + 0.11,
      duration: 0.18,
      gainPeak: 0.11,
      attack: 0.005,
    });
  } catch {
    // ignore audio errors
  }
}
