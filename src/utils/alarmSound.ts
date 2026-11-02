/**
 * BỘ TỔNG HỢP ÂM THANH CÒI HÚ BÁO ĐỘNG PCTT KHẨN CẤP (WEB AUDIO API)
 * Tự động quét dải tần số 650Hz - 920Hz mô phỏng còi báo động thiên tai thực địa
 * Hoạt động 100% offline, không phụ thuộc tệp mp3 ngoài, không bị chặn tải
 */

class EmergencyAlarmSystem {
  private audioCtx: AudioContext | null = null;
  private osc: OscillatorNode | null = null;
  private lfo: OscillatorNode | null = null;
  private gainNode: GainNode | null = null;
  private isPlaying: boolean = false;
  private isMuted: boolean = false;

  private initContext() {
    if (typeof window === 'undefined') return;
    if (!this.audioCtx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.audioCtx = new AudioCtx();
      }
    }
  }

  /**
   * Bật âm thanh còi hú khẩn cấp
   */
  public play() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.audioCtx) return;

    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }

    if (this.isPlaying) return;

    try {
      const now = this.audioCtx.currentTime;

      // 1. Oscillator chính phát âm còi báo động
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      // 2. LFO (Low Frequency Oscillator) điều chế tần số quét chu kỳ còi hú
      const lfo = this.audioCtx.createOscillator();
      const lfoGain = this.audioCtx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(760, now);

      // Quét tần số hình sin chu kỳ 1.2 giây (0.83 Hz)
      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(0.85, now);
      lfoGain.gain.setValueAtTime(180, now); // Dao động +/- 180Hz (580Hz -> 940Hz)

      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);

      // Âm lượng vừa phải, rõ ràng nhưng êm tai
      gain.gain.setValueAtTime(0.12, now);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(now);
      lfo.start(now);

      this.osc = osc;
      this.lfo = lfo;
      this.gainNode = gain;
      this.isPlaying = true;
    } catch (err) {
      console.warn('Alarm audio error:', err);
    }
  }

  /**
   * Dừng âm thanh còi hú
   */
  public stop() {
    if (!this.isPlaying) return;
    try {
      if (this.osc) {
        this.osc.stop();
        this.osc.disconnect();
        this.osc = null;
      }
      if (this.lfo) {
        this.lfo.stop();
        this.lfo.disconnect();
        this.lfo = null;
      }
      if (this.gainNode) {
        this.gainNode.disconnect();
        this.gainNode = null;
      }
    } catch (err) {
      console.warn('Alarm stop error:', err);
    }
    this.isPlaying = false;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted) {
      this.stop();
    }
  }

  public isMute(): boolean {
    return this.isMuted;
  }

  public active(): boolean {
    return this.isPlaying;
  }
}

export const alarmSystem = new EmergencyAlarmSystem();
