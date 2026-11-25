export class MetroAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private motorOsc: OscillatorNode | null = null;
  private motorSubOsc: OscillatorNode | null = null;
  private motorGain: GainNode | null = null;
  private rumbleGain: GainNode | null = null;
  private rumbleSource: AudioBufferSourceNode | null = null;
  private muted = false;
  private initialized = false;

  public init(): void {
    if (this.initialized) {
      if (this.ctx && this.ctx.state === 'suspended') {
        void this.ctx.resume();
      }
      return;
    }

    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    this.ctx = new AudioCtx();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this.muted ? 0 : 0.35;
    this.masterGain.connect(this.ctx.destination);

    // Traction inverter PWM hum
    this.motorOsc = this.ctx.createOscillator();
    this.motorOsc.type = 'triangle';
    this.motorOsc.frequency.value = 110;

    this.motorSubOsc = this.ctx.createOscillator();
    this.motorSubOsc.type = 'sine';
    this.motorSubOsc.frequency.value = 55;

    this.motorGain = this.ctx.createGain();
    this.motorGain.gain.value = 0;

    this.motorOsc.connect(this.motorGain);
    this.motorSubOsc.connect(this.motorGain);
    this.motorGain.connect(this.masterGain);

    this.motorOsc.start();
    this.motorSubOsc.start();

    // Rolling rail noise loop
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    let lastOut = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      lastOut = (lastOut + 0.03 * white) / 1.03;
      data[i] = lastOut * 2.5;
    }

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 240;

    this.rumbleGain = this.ctx.createGain();
    this.rumbleGain.gain.value = 0;

    this.rumbleSource = this.ctx.createBufferSource();
    this.rumbleSource.buffer = noiseBuffer;
    this.rumbleSource.loop = true;
    this.rumbleSource.connect(filter);
    filter.connect(this.rumbleGain);
    this.rumbleGain.connect(this.masterGain);
    this.rumbleSource.start();

    this.initialized = true;
  }

  public setMuted(mute: boolean): void {
    this.muted = mute;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(mute ? 0 : 0.35, this.ctx.currentTime, 0.06);
    }
  }

  public updateMotion(speedKmh: number, throttleEffort: number): void {
    if (!this.initialized || !this.ctx || !this.motorOsc || !this.motorSubOsc || !this.motorGain || !this.rumbleGain) {
      return;
    }
    const now = this.ctx.currentTime;
    const speedRatio = Math.min(1, Math.max(0, speedKmh / 110));
    const freq = 95 + speedRatio * 340 + Math.abs(throttleEffort) * 45;
    this.motorOsc.frequency.setTargetAtTime(freq, now, 0.08);
    this.motorSubOsc.frequency.setTargetAtTime(freq * 0.5, now, 0.08);

    const motorLevel = speedKmh > 0.5 ? 0.03 + Math.abs(throttleEffort) * 0.055 + speedRatio * 0.03 : 0;
    this.motorGain.gain.setTargetAtTime(motorLevel, now, 0.08);

    const rumbleLevel = speedRatio * 0.18;
    this.rumbleGain.gain.setTargetAtTime(rumbleLevel, now, 0.08);
  }

  public playDoorChime(opening: boolean): void {
    if (!this.initialized || !this.ctx || !this.masterGain || this.muted) return;
    const now = this.ctx.currentTime;
    const notes = opening ? [523.25, 659.25, 783.99] : [783.99, 659.25, 523.25];
    notes.forEach((freq, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const start = now + idx * 0.14;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.16, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.34);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(start);
      osc.stop(start + 0.36);
    });
  }

  public playHorn(): void {
    if (!this.initialized || !this.ctx || !this.masterGain || this.muted) return;
    const now = this.ctx.currentTime;
    [349.23, 440.0].forEach((freq) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.value = freq;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 950;

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.12, now + 0.04);
      gain.gain.setValueAtTime(0.12, now + 0.32);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.46);
    });
  }

  public dispose(): void {
    try {
      this.motorOsc?.stop();
      this.motorSubOsc?.stop();
      this.rumbleSource?.stop();
      if (this.ctx && this.ctx.state !== 'closed') {
        void this.ctx.close();
      }
    } catch {
      // Ignore cleanup errors
    }
  }
}
