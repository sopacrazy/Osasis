let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function playDiceRollSound(isCriticalSuccess?: boolean, isCriticalFail?: boolean) {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  const clicks = [0, 0.045, 0.095, 0.14];
  clicks.forEach((offset, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220 + idx * 45 + Math.random() * 60, now + offset);
    osc.frequency.exponentialRampToValueAtTime(95, now + offset + 0.035);

    gain.gain.setValueAtTime(0.06, now + offset);
    gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.04);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now + offset);
    osc.stop(now + offset + 0.045);
  });

  if (isCriticalSuccess) {
    const chime = ctx.createOscillator();
    const gain = ctx.createGain();
    chime.type = 'sine';
    chime.frequency.setValueAtTime(523.25, now + 0.17);
    chime.frequency.setValueAtTime(659.25, now + 0.24);
    gain.gain.setValueAtTime(0.07, now + 0.17);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    chime.connect(gain);
    gain.connect(ctx.destination);
    chime.start(now + 0.17);
    chime.stop(now + 0.46);
  } else if (isCriticalFail) {
    const thud = ctx.createOscillator();
    const gain = ctx.createGain();
    thud.type = 'sawtooth';
    thud.frequency.setValueAtTime(140, now + 0.17);
    thud.frequency.exponentialRampToValueAtTime(65, now + 0.38);
    gain.gain.setValueAtTime(0.05, now + 0.17);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    thud.connect(gain);
    gain.connect(ctx.destination);
    thud.start(now + 0.17);
    thud.stop(now + 0.41);
  }
}

interface AmbientEngine {
  masterGain: GainNode;
  stop: () => void;
}

let activeAmbient: AmbientEngine | null = null;

export function startBackgroundMusic(volume = 0.35) {
  const ctx = getAudioContext();
  if (!ctx) return;

  if (activeAmbient) {
    setBackgroundMusicVolume(volume);
    return;
  }

  const now = ctx.currentTime;
  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(0.0001, now);
  masterGain.gain.linearRampToValueAtTime(Math.max(0.01, volume * 0.22), now + 1.2);

  const masterFilter = ctx.createBiquadFilter();
  masterFilter.type = 'lowpass';
  masterFilter.frequency.setValueAtTime(420, now);

  masterFilter.connect(masterGain);
  masterGain.connect(ctx.destination);

  // Warm D-minor/Dorian tabletop drone oscillators
  const freqs = [73.42, 110.0, 146.83, 220.0]; // D2, A2, D3, A3
  const oscillators: OscillatorNode[] = [];
  const lfos: OscillatorNode[] = [];

  freqs.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
    osc.frequency.setValueAtTime(freq, now);

    const baseLevel = idx === 0 ? 0.35 : idx === 1 ? 0.24 : idx === 2 ? 0.14 : 0.08;
    oscGain.gain.setValueAtTime(baseLevel, now);

    // Slow breathing modulation per harmonic
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(0.07 + idx * 0.025, now);
    lfoGain.gain.setValueAtTime(baseLevel * 0.35, now);
    lfo.connect(lfoGain);
    lfoGain.connect(oscGain.gain);

    osc.connect(oscGain);
    oscGain.connect(masterFilter);

    osc.start(now);
    lfo.start(now);
    oscillators.push(osc);
    lfos.push(lfo);
  });

  // Subtle desert breeze / tavern air texture via filtered noise buffer
  const bufferSize = ctx.sampleRate * 3;
  const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  let lastOut = 0;
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    lastOut = (lastOut + 0.02 * white) / 1.02;
    data[i] = lastOut * 2.2;
  }

  const noiseSource = ctx.createBufferSource();
  noiseSource.buffer = noiseBuffer;
  noiseSource.loop = true;

  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = 'bandpass';
  noiseFilter.frequency.setValueAtTime(260, now);
  noiseFilter.Q.setValueAtTime(1.4, now);

  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.12, now);

  noiseSource.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(masterGain);
  noiseSource.start(now);

  // Subtle slow filter sweep on master
  const sweepLfo = ctx.createOscillator();
  const sweepGain = ctx.createGain();
  sweepLfo.frequency.setValueAtTime(0.045, now);
  sweepGain.gain.setValueAtTime(140, now);
  sweepLfo.connect(sweepGain);
  sweepGain.connect(masterFilter.frequency);
  sweepLfo.start(now);
  lfos.push(sweepLfo);

  activeAmbient = {
    masterGain,
    stop: () => {
      const stopTime = ctx.currentTime;
      masterGain.gain.cancelScheduledValues(stopTime);
      masterGain.gain.setValueAtTime(Math.max(masterGain.gain.value, 0.0001), stopTime);
      masterGain.gain.exponentialRampToValueAtTime(0.0001, stopTime + 0.5);
      setTimeout(() => {
        oscillators.forEach((o) => {
          try {
            o.stop();
            o.disconnect();
          } catch {
            // Already stopped
          }
        });
        lfos.forEach((l) => {
          try {
            l.stop();
            l.disconnect();
          } catch {
            // Already stopped
          }
        });
        try {
          noiseSource.stop();
          noiseSource.disconnect();
          masterGain.disconnect();
        } catch {
          // Already stopped
        }
      }, 550);
    },
  };
}

export function setBackgroundMusicVolume(volume: number) {
  const ctx = getAudioContext();
  if (!ctx || !activeAmbient) return;
  const now = ctx.currentTime;
  activeAmbient.masterGain.gain.cancelScheduledValues(now);
  activeAmbient.masterGain.gain.setTargetAtTime(Math.max(0.001, volume * 0.22), now, 0.15);
}

export function stopBackgroundMusic() {
  if (!activeAmbient) return;
  const current = activeAmbient;
  activeAmbient = null;
  current.stop();
}
