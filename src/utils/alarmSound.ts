/**
 * BỘ TỔNG HỢP ÂM THANH CÒI HÚ BÁO ĐỘNG PCTT KHẨN CẤP (WEB AUDIO API + DỰ PHÒNG HTML5 AUDIO CHO IOS)
 * Tự động quét dải tần số 580Hz - 940Hz mô phỏng còi báo động thiên tai thực địa
 * Tương thích 100% Android Chrome & iOS Safari
 * Tự động mở khóa trên thiết bị di động ngay lần chạm đầu tiên
 */

const isIOS =
  typeof navigator !== 'undefined' &&
  /iPhone|iPad|iPod/i.test(navigator.userAgent);

/**
 * Sinh chuỗi Data URL chứa file WAV PCM 8000Hz mono để HTML5 Audio có thể phát dự phòng trên iOS Safari
 * Vượt qua nút gạt im lặng (Silent Switch) trên iPhone
 */
function createAlarmWavDataUrl(): string {
  const sampleRate = 8000;
  const numSamples = Math.floor(sampleRate * 0.8);
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  // RIFF Chunk Descriptor
  view.setUint32(0, 0x52494646, false); // "RIFF"
  view.setUint32(4, 36 + numSamples * 2, true);
  view.setUint32(8, 0x57415645, false); // "WAVE"

  // "fmt " sub-chunk
  view.setUint32(12, 0x666d7420, false);
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // Mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);

  // "data" sub-chunk
  view.setUint32(36, 0x64617461, false);
  view.setUint32(40, numSamples * 2, true);

  // Tạo âm còi hú quét tần số 650Hz -> 920Hz
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const freq = 740 + 180 * Math.sin(2 * Math.PI * 1.25 * t);
    const sample = Math.sin(2 * Math.PI * freq * t) * 0.45 * 32767;
    view.setInt16(44 + i * 2, Math.max(-32768, Math.min(32767, Math.floor(sample))), true);
  }

  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return 'data:audio/wav;base64,' + (typeof btoa !== 'undefined' ? btoa(binary) : '');
}

class EmergencyAlarmSystem {
  private audioCtx: AudioContext | null = null;
  private osc: OscillatorNode | null = null;
  private lfo: OscillatorNode | null = null;
  private gainNode: GainNode | null = null;
  private backupAudio: HTMLAudioElement | null = null;
  private isPlaying: boolean = false;
  private shouldBePlaying: boolean = false;
  private isMuted: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      const autoUnlock = () => {
        this.unlockAudio();
        ['touchstart', 'touchend', 'click', 'pointerdown'].forEach((evt) => {
          window.removeEventListener(evt, autoUnlock);
          document.removeEventListener(evt, autoUnlock);
        });
      };

      ['touchstart', 'touchend', 'click', 'pointerdown'].forEach((evt) => {
        window.addEventListener(evt, autoUnlock, { once: false, passive: true });
        document.addEventListener(evt, autoUnlock, { once: false, passive: true });
      });

      // Đánh thức AudioContext khi thiết bị mở khóa hoặc quay lại trình duyệt
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          if (this.audioCtx && this.audioCtx.state === 'suspended' && this.shouldBePlaying && !this.isMuted) {
            this.audioCtx.resume().catch(() => {});
          }
        }
      });

      window.addEventListener('pageshow', () => {
        if (this.audioCtx && this.audioCtx.state === 'suspended' && this.shouldBePlaying && !this.isMuted) {
          this.audioCtx.resume().catch(() => {});
        }
      });
    }
  }

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
   * Mở khóa AudioContext cho thiết bị di động (Android & iOS)
   */
  public unlockAudio() {
    if (typeof window === 'undefined') return;
    try {
      this.initContext();
      if (!this.audioCtx) return;

      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().then(() => {
          if (this.shouldBePlaying && !this.isPlaying && !this.isMuted) {
            this.startNodes();
          }
        }).catch(() => {});
      } else {
        if (this.shouldBePlaying && !this.isPlaying && !this.isMuted) {
          this.startNodes();
        }
      }

      // Phát 1 mẫu câm ngắn để kích hoạt AudioContext
      const silentBuffer = this.audioCtx.createBuffer(1, 1, 22050);
      const source = this.audioCtx.createBufferSource();
      source.buffer = silentBuffer;
      source.connect(this.audioCtx.destination);
      source.start(0);

      // Riêng trên iOS, khởi tạo thẻ Audio dự phòng để vượt qua nút gạt rung im lặng
      if (isIOS && !this.backupAudio && typeof Audio !== 'undefined') {
        try {
          const wavData = createAlarmWavDataUrl();
          const audio = new Audio(wavData);
          audio.loop = true;
          audio.volume = 0.01;
          const p = audio.play();
          if (p && typeof p.then === 'function') {
            p.then(() => {
              audio.pause();
              audio.volume = 0.6;
              audio.currentTime = 0;
            }).catch(() => {});
          }
          this.backupAudio = audio;
        } catch {}
      }
    } catch {}
  }

  /**
   * Khởi tạo và kết nối các node âm thanh Web Audio
   */
  private startNodes() {
    if (!this.audioCtx || this.isPlaying || this.isMuted) return;

    try {
      const now = this.audioCtx.currentTime;

      // 1. Oscillator chính (Sawtooth mô phỏng còi công nghiệp)
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      // 2. LFO (Low Frequency Oscillator) điều chế tần số quét chu kỳ còi hú
      const lfo = this.audioCtx.createOscillator();
      const lfoGain = this.audioCtx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(760, now);

      // Quét tần số hình sin chu kỳ 1.2 giây (0.85 Hz) dao động +/- 180Hz (580Hz -> 940Hz)
      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(0.85, now);
      lfoGain.gain.setValueAtTime(180, now);

      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);

      gain.gain.setValueAtTime(0.18, now);
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(now);
      lfo.start(now);

      this.osc = osc;
      this.lfo = lfo;
      this.gainNode = gain;
      this.isPlaying = true;
    } catch (err) {
      console.warn('Web Audio startNodes error:', err);
    }
  }

  /**
   * Bật âm thanh còi hú khẩn cấp
   */
  public play() {
    this.shouldBePlaying = true;
    if (this.isMuted) return;

    this.initContext();
    if (!this.audioCtx) return;

    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().then(() => {
        if (this.shouldBePlaying && !this.isPlaying && !this.isMuted) {
          this.startNodes();
        }
      }).catch(() => {});
    }

    if (!this.isPlaying) {
      this.startNodes();
    }

    // Riêng trên iOS Safari: hỗ trợ thêm kênh Audio dự phòng để vượt qua nút Mute phần cứng
    if (isIOS) {
      try {
        if (!this.backupAudio && typeof Audio !== 'undefined') {
          const wavData = createAlarmWavDataUrl();
          this.backupAudio = new Audio(wavData);
          this.backupAudio.loop = true;
          this.backupAudio.volume = 0.6;
        }
        if (this.backupAudio && this.backupAudio.paused) {
          this.backupAudio.currentTime = 0;
          const p = this.backupAudio.play();
          if (p && typeof p.catch === 'function') {
            p.catch(() => {});
          }
        }
      } catch {}
    }
  }

  /**
   * Dừng còi hú
   */
  public stop() {
    this.shouldBePlaying = false;

    // Dừng Web Audio
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

    // Dừng HTML5 Audio dự phòng trên iOS
    try {
      if (this.backupAudio) {
        this.backupAudio.pause();
        this.backupAudio.currentTime = 0;
      }
    } catch {}

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

/**
 * Tắt toàn bộ cảnh báo trên hệ thống:
 * 1. Tắt còi hú Web Audio & HTML5 Audio
 * 2. Dừng triệt để giọng đọc phát thanh AI (chỉ dùng cancel(), TUYỆT ĐỐI không gọi pause() tránh treo Android)
 * 3. Tạm dừng tất cả thẻ <audio> đang phát
 * 4. Phát sự kiện toàn cục MUTE_OR_STOP_ALL_ALERTS
 * 5. Lưu mốc thời gian vào localStorage để đồng bộ tức thì trên iOS giữa các tab / PWA
 */
export function stopAllEmergencyAlerts() {
  if (typeof window === 'undefined') return;

  try {
    // 1. Tắt còi hú
    alarmSystem.stop();
    alarmSystem.setMuted(true);

    // 2. Dừng giọng đọc phát thanh AI
    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }

    // 3. Tắt tất cả thẻ audio
    document.querySelectorAll('audio').forEach((audio) => {
      try {
        audio.pause();
        audio.currentTime = 0;
      } catch {}
    });

    // 4. Phát sự kiện toàn cục
    window.dispatchEvent(new CustomEvent('MUTE_OR_STOP_ALL_ALERTS'));

    // 5. Đồng bộ qua localStorage cho Safari iOS & các tab
    try {
      localStorage.setItem('EASUP_LAST_STOP_ALERTS', String(Date.now()));
    } catch {}
  } catch (err) {
    console.warn('stopAllEmergencyAlerts error:', err);
  }
}
