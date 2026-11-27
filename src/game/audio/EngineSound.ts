// EngineSound — jet engine + fly-by SFX, all synthesised.
// Engine layers (fed by one thrust level 0..1):
//   roar   – looping noise through a band-pass whose centre rises with thrust
//   rumble – low-passed noise for body
//   whine  – quiet turbine tone that climbs in pitch
//   hum    – low triangle for weight on small speakers
// Whoosh (enemy jet passing): band-passed noise sweeping down, like a doppler fly-by.

import { getAudioCtx, getBus } from './audioCtx';

const NOISE_SECS = 2;

export class EngineSound {
  private nodes: {
    roarGain: GainNode; roarFilt: BiquadFilterNode;
    rumbleGain: GainNode;
    whine: OscillatorNode; whineGain: GainNode;
    hum: OscillatorNode; humGain: GainNode;
    src: AudioBufferSourceNode;
  } | null = null;
  private static noise: AudioBuffer | null = null;

  /** thrust: boolean (old API) or 0..1 intensity. */
  update(thrust: boolean | number): void {
    const ctx = getAudioCtx();
    if (!ctx) return;
    if (!this.nodes) this.build(ctx);
    const n = this.nodes!;
    const k = typeof thrust === 'number' ? Math.max(0, Math.min(1, thrust)) : thrust ? 1 : 0.25;
    const t = ctx.currentTime + 0.12;
    n.roarGain.gain.linearRampToValueAtTime(0.06 + 0.22 * k, t);
    n.roarFilt.frequency.linearRampToValueAtTime(380 + 900 * k, t);
    n.rumbleGain.gain.linearRampToValueAtTime(0.10 + 0.16 * k, t);
    n.whine.frequency.linearRampToValueAtTime(1500 + 1300 * k, t);
    n.whineGain.gain.linearRampToValueAtTime(0.008 + 0.018 * k, t);
    n.hum.frequency.linearRampToValueAtTime(55 + 25 * k, t);
    n.humGain.gain.linearRampToValueAtTime(0.05 + 0.05 * k, t);
  }

  playWhoosh(): void {
    const ctx = getAudioCtx();
    if (!ctx) return;
    const src = ctx.createBufferSource();
    src.buffer = EngineSound.getNoise(ctx);
    const filt = ctx.createBiquadFilter();
    filt.type = 'bandpass'; filt.Q.value = 1.4;
    const gain = ctx.createGain();
    const t0 = ctx.currentTime;
    filt.frequency.setValueAtTime(2400, t0);
    filt.frequency.exponentialRampToValueAtTime(320, t0 + 0.9);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(0.5, t0 + 0.18);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.95);
    src.connect(filt); filt.connect(gain); gain.connect(getBus('sfx') ?? ctx.destination);
    src.start(t0, Math.random() * 1.0);
    src.stop(t0 + 1.0);
  }

  stop(): void {
    const ctx = getAudioCtx();
    if (!ctx || !this.nodes) return;
    const n = this.nodes, t = ctx.currentTime + 0.2;
    for (const g of [n.roarGain, n.rumbleGain, n.whineGain, n.humGain]) g.gain.linearRampToValueAtTime(0, t);
  }

  dispose(): void {
    if (!this.nodes) return;
    for (const s of [this.nodes.src, this.nodes.whine, this.nodes.hum]) { try { s.stop(); } catch { /* stopped */ } }
    this.nodes = null;
  }

  private build(ctx: AudioContext): void {
    const out = getBus('sfx') ?? ctx.destination;
    const src = ctx.createBufferSource();
    src.buffer = EngineSound.getNoise(ctx); src.loop = true;

    const roarFilt = ctx.createBiquadFilter(); roarFilt.type = 'bandpass'; roarFilt.Q.value = 0.8; roarFilt.frequency.value = 500;
    const roarGain = ctx.createGain(); roarGain.gain.value = 0;
    src.connect(roarFilt); roarFilt.connect(roarGain); roarGain.connect(out);

    const rumbleFilt = ctx.createBiquadFilter(); rumbleFilt.type = 'lowpass'; rumbleFilt.frequency.value = 160;
    const rumbleGain = ctx.createGain(); rumbleGain.gain.value = 0;
    src.connect(rumbleFilt); rumbleFilt.connect(rumbleGain); rumbleGain.connect(out);

    const whine = ctx.createOscillator(); whine.type = 'sine'; whine.frequency.value = 1500;
    const whineGain = ctx.createGain(); whineGain.gain.value = 0;
    whine.connect(whineGain); whineGain.connect(out);

    const hum = ctx.createOscillator(); hum.type = 'triangle'; hum.frequency.value = 55;
    const humGain = ctx.createGain(); humGain.gain.value = 0;
    hum.connect(humGain); humGain.connect(out);

    src.start(); whine.start(); hum.start();
    this.nodes = { roarGain, roarFilt, rumbleGain, whine, whineGain, hum, humGain, src };
  }

  private static getNoise(ctx: AudioContext): AudioBuffer {
    if (!EngineSound.noise) {
      const len = Math.floor(ctx.sampleRate * NOISE_SECS);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = buf.getChannelData(0);
      // Audio-only noise (not game logic), so Math.random is fine here; brown-ish for warmth.
      let last = 0;
      for (let i = 0; i < len; i++) { last = (last + 0.06 * (Math.random() * 2 - 1)) / 1.06; d[i] = last * 3.2; }
      EngineSound.noise = buf;
    }
    return EngineSound.noise;
  }
}
