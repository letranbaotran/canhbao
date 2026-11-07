/**
 * BỘ TỔNG HỢP ÂM THANH CÒI HÚ BÁO ĐỘNG PCTT KHẨN CẤP (WEB AUDIO API + HTML5 AUDIO DÀNH CHO IOS SAFARI)
 * Tự động quét dải tần số 650Hz - 940Hz mô phỏng còi báo động thiên tai thực địa
 * Hỗ trợ 100% iOS Safari (tự động Unlock qua Touch/Click, phát qua Media Channel kể cả khi gạt nút Mute phần cứng)
 * Hoạt động 100% offline, không phụ thuộc tệp mp3 ngoài, không bị chặn tải
 */

/**
 * Sinh chuỗi Data URL chứa file WAV PCM chuẩn 8000Hz mono để HTML5 Audio có thể phát ngay lập tức
 * Kích hoạt kênh âm thanh Media trên iOS Safari để vượt qua nút gạt im lặng (Silent Switch)
 */
function createAlarmWavDataUrl(): string {
  const sampleRate = 8000;
  const numSamples = Math.floor(sampleRate * 0.8); // 0.8 giây chu kỳ
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  // RIFF Chunk Descriptor
  view.setUint32(0, 0x52494646, false); // "RIFF"
  view.setUint32(4, 36 + numSamples * 2, true);
  view.setUint32(8, 0x57415645, false); // "WAVE"

  // "fmt " sub-chunk
  view.setUint32(12, 0x666d7420, false); // "fmt "
  view.setUint32(16, 16, true); // SubChunk1Size (16 cho PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 = PCM)
  view.setUint16(22, 1, true); // NumChannels (1 = Mono)
  view.setUint32(24, sampleRate, true); // SampleRate (8000)
  view.setUint32(28, sampleRate * 2, true); // ByteRate (8000 * 1 * 16 / 8)
  view.setUint16(32, 2, true); // BlockAlign (1 * 16 / 8)
  view.setUint16(34, 16, true); // BitsPerSample (16-bit)

  // "data" sub-chunk
  view.setUint32(36, 0x64617461, false); // "data"
  view.setUint32(40, numSamples * 2, true);

  // Tạo âm thanh còi hú quét tần số 650Hz -> 920Hz (Siren Sweep)
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    // Tần số quét hình sin chu kỳ 1.25 Hz
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
  private isMuted: boolean = false;
  private isUnlocked: boolean = false;
  private speechUnlocked: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      // Tự động Unlock AudioContext trên iOS Safari ngay lần chạm/nhấp đầu tiên bất kỳ trên màn hình
      const autoUnlock = () => {
        this.unlockAudio();
        ['touchstart', 'touchend', 'click', 'pointerdown', 'keydown'].forEach((evt) => {
          window.removeEventListener(evt, autoUnlock);
          document.removeEventListener(evt, autoUnlock);
        });
      };

      ['touchstart', 'touchend', 'click', 'pointerdown', 'keydown'].forEach((evt) => {
        window.addEventListener(evt, autoUnlock, { once: false, passive: true });
        document.addEventListener(evt, autoUnlock, { once: false, passive: true });
      });

      // Tự động đánh thức AudioContext khi thiết bị iOS mở khóa màn hình hoặc quay lại Safari
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && this.audioCtx) {
          if (this.audioCtx.state === 'suspended' && !this.isMuted) {
            this.audioCtx.resume().catch(() => {});
          }
        }
      });

      window.addEventListener('pageshow', () => {
        if (this.audioCtx && this.audioCtx.state === 'suspended' && !this.isMuted) {
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
   * Kích hoạt mở khóa toàn diện AudioContext và SpeechSynthesis trên iOS Safari
   */
  public unlockAudio() {
    if (typeof window === 'undefined') return;
    try {
      this.initContext();
      if (!this.audioCtx) return;

      if (this.audioCtx.state === 'suspended') {
        this.audioCtx
          .resume()
          .then(() => {
            this.isUnlocked = true;
          })
          .catch(() => {});
      } else {
        this.isUnlocked = true;
      }

      // Phát 1 mẫu câm (silent buffer) để kích hoạt pipeline phần cứng âm thanh của iOS
      const silentBuffer = this.audioCtx.createBuffer(1, 1, 22050);
      const source = this.audioCtx.createBufferSource();
      source.buffer = silentBuffer;
      source.connect(this.audioCtx.destination);
      source.start(0);

      // Mở khóa giọng đọc Web Speech API trên iOS
      if ('speechSynthesis' in window && !this.speechUnlocked) {
        try {
          const warmUp = new SpeechSynthesisUtterance(' ');
          warmUp.volume = 0.01;
          window.speechSynthesis.speak(warmUp);
          this.speechUnlocked = true;
        } catch {}
      }

      // Khởi tạo trước thẻ audio dự phòng
      if (!this.backupAudio && typeof Audio !== 'undefined') {
        try {
          const wavData = createAlarmWavDataUrl();
          const audio = new Audio(wavData);
          audio.loop = true;
          audio.volume = 0.01;
          audio.preload = 'auto';
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
    } catch {
      // Safe fallback
    }
  }

  /**
   * Bật âm thanh còi hú khẩn cấp (Hỗ trợ kép Web Audio + HTML5 Audio cho iOS)
   */
  public play() {
    if (this.isMuted) return;
    this.initContext();

    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }

    if (this.isPlaying) return;

    // 1. Phát qua Web Audio Oscillator chính
    if (this.audioCtx) {
      try {
        const now = this.audioCtx.currentTime;

        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        const lfo = this.audioCtx.createOscillator();
        const lfoGain = this.audioCtx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(760, now);

        lfo.type = 'sine';
        lfo.frequency.setValueAtTime(0.85, now);
        lfoGain.gain.setValueAtTime(180, now);

        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);

        gain.gain.setValueAtTime(0.15, now);
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.start(now);
        lfo.start(now);

        this.osc = osc;
        this.lfo = lfo;
        this.gainNode = gain;
        this.isPlaying = true;
      } catch (err) {
        console.warn('Web Audio alarm play error:', err);
      }
    }

    // 2. Kích hoạt thêm kênh HTML5 Audio dự phòng (Vượt qua nút Mute phần cứng của iPhone)
    if (!this.isPlaying || (typeof navigator !== 'undefined' && /iPhone|iPad|iPod/i.test(navigator.userAgent))) {
      try {
        if (!this.backupAudio && typeof Audio !== 'undefined') {
          const wavData = createAlarmWavDataUrl();
          this.backupAudio = new Audio(wavData);
          this.backupAudio.loop = true;
          this.backupAudio.volume = 0.6;
        }
        if (this.backupAudio) {
          this.backupAudio.currentTime = 0;
          const playPromise = this.backupAudio.play();
          if (playPromise && typeof playPromise.catch === 'function') {
            playPromise.catch(() => {});
          }
          this.isPlaying = true;
        }
      } catch {}
    }
  }

  /**
   * Dừng còi hú trên cả hai kênh Web Audio & HTML5 Audio
   */
  public stop() {
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
 * 1. Tắt còi hú Web Audio & HTML5 Audio trên iOS
 * 2. Dừng triệt để giọng đọc phát thanh AI (SpeechSynthesis) trên iOS Safari
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

    // 2. Dừng triệt để giọng đọc phát thanh AI trên iOS Safari
    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        window.speechSynthesis.pause();
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

    // 5. Đồng bộ qua localStorage cho Safari iOS
    try {
      localStorage.setItem('EASUP_LAST_STOP_ALERTS', String(Date.now()));
    } catch {}
  } catch (err) {
    console.warn('stopAllEmergencyAlerts error:', err);
  }
}
