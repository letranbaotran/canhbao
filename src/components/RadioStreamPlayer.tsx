'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Hls from 'hls.js';
import { Play, Pause, Radio, Volume2, VolumeX, Settings, Check } from 'lucide-react';

export interface RadioChannel {
  id: string;
  name: string;
  shortName: string;
  url: string;
  backupUrl?: string;
  description: string;
  isCustom?: boolean;
}

export const PRESET_RADIO_CHANNELS: RadioChannel[] = [
  {
    id: 'vov1',
    name: 'VOV1 - Thời sự & Chính trị (Toàn quốc)',
    shortName: 'VOV1 Thời sự',
    url: 'https://str.vov.gov.vn/vovlive/vov1vov5Vietnamese.sdp_aac/playlist.m3u8',
    backupUrl: 'https://audio-lss.vov.vn/live/vov1.m3u8',
    description: 'Kênh Thời sự - Chính trị Quốc gia phát sóng trực tuyến 24/7',
  },
  {
    id: 'vov2',
    name: 'VOV2 - Văn hóa & Đời sống',
    shortName: 'VOV2 Văn hóa',
    url: 'https://str.vov.gov.vn/vovlive/vov2.sdp_aac/playlist.m3u8',
    backupUrl: 'https://audio-lss.vov.vn/live/vov2.m3u8',
    description: 'Kênh Văn hóa - Xã hội - Khoa giáo Đài Tiếng nói Việt Nam',
  },
  {
    id: 'vov-gt',
    name: 'VOV Giao Thông (Hà Nội & Toàn quốc)',
    shortName: 'VOV Giao thông',
    url: 'https://str.vov.gov.vn/vovlive/vovGTHN.sdp_aac/playlist.m3u8',
    backupUrl: 'https://audio-lss.vov.vn/live/giao_thong_ha_noi.m3u8',
    description: 'Kênh Thông tin Giao thông & Cứu nạn khẩn cấp',
  },
  {
    id: 'daklak',
    name: 'Đài Phát thanh Đắk Lắk (DRT)',
    shortName: 'Đài Đắk Lắk',
    url: 'https://str.vov.gov.vn/vovlive/vov1vov5Vietnamese.sdp_aac/playlist.m3u8',
    backupUrl: 'https://audio-lss.vov.vn/live/vov1.m3u8',
    description: 'Tiếng nói Đảng bộ, Chính quyền & Nhân dân tỉnh Đắk Lắk (Admin có thể tùy chỉnh luồng .m3u8/.mp3)',
    isCustom: true,
  },
];

const CUSTOM_DAKLAK_STORAGE_KEY = 'easup_custom_radio_daklak_url';

export interface RadioStreamPlayerProps {
  isAdmin?: boolean;
  isDucked?: boolean;
  onPlayingChange?: (isPlaying: boolean) => void;
  className?: string;
}

export const RadioStreamPlayer: React.FC<RadioStreamPlayerProps> = ({
  isAdmin = false,
  isDucked = false,
  onPlayingChange,
  className = '',
}) => {
  const [channels, setChannels] = useState<RadioChannel[]>(PRESET_RADIO_CHANNELS);
  const [selectedChannelId, setSelectedChannelId] = useState<string>('vov1');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isBuffering, setIsBuffering] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modal Admin cấu hình URL đài Đắk Lắk
  const [showConfigModal, setShowConfigModal] = useState<boolean>(false);
  const [customDaklakUrl, setCustomDaklakUrl] = useState<string>('');
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const isUserPlayingRef = useRef<boolean>(false);
  const networkRetryCountRef = useRef<number>(0);
  const currentStreamUrlRef = useRef<string>('');

  // Giữ callback onPlayingChange trong ref để tránh việc re-render của component cha kích hoạt cleanup hủy Hls
  const onPlayingChangeRef = useRef(onPlayingChange);
  useEffect(() => {
    onPlayingChangeRef.current = onPlayingChange;
  }, [onPlayingChange]);

  // Nạp cấu hình kênh Đắk Lắk tùy chỉnh từ LocalStorage khi khởi tạo
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const savedUrl = window.localStorage.getItem(CUSTOM_DAKLAK_STORAGE_KEY);
      if (savedUrl && savedUrl.trim().startsWith('http')) {
        setCustomDaklakUrl(savedUrl.trim());
        setChannels((prev) =>
          prev.map((ch) =>
            ch.id === 'daklak'
              ? { ...ch, url: savedUrl.trim(), description: 'Luồng trực tuyến Đài Đắk Lắk do Ban Quản trị cấu hình' }
              : ch
          )
        );
      }
    } catch {}
  }, []);

  const activeChannel = channels.find((c) => c.id === selectedChannelId) || channels[0];

  // Khởi tạo luồng HLS hoặc Native HLS cho audio element
  const initStream = useCallback((channel: RadioChannel, shouldAutoPlay: boolean = false, useBackup: boolean = false) => {
    const audio = audioRef.current;
    if (!audio) return;

    const targetUrl = useBackup && channel.backupUrl ? channel.backupUrl : channel.url;
    currentStreamUrlRef.current = targetUrl;
    networkRetryCountRef.current = 0;
    setErrorMessage(null);

    if (shouldAutoPlay) {
      setIsBuffering(true);
    }

    // Hủy phiên Hls cũ nếu có
    if (hlsRef.current) {
      try {
        hlsRef.current.destroy();
      } catch {}
      hlsRef.current = null;
    }

    // 1. Kiểm tra hỗ trợ HLS.js (Chrome, Android, Edge, Firefox, Desktop PC)
    if (Hls.isSupported() && targetUrl.includes('.m3u8')) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 60,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        manifestLoadingTimeOut: 8000,
        manifestLoadingMaxRetry: 2,
        levelLoadingTimeOut: 8000,
        fragLoadingTimeOut: 10000,
      });
      hlsRef.current = hls;

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (shouldAutoPlay || isUserPlayingRef.current) {
          audio.play().then(() => {
            setIsPlaying(true);
            setIsBuffering(false);
            onPlayingChangeRef.current?.(true);
          }).catch((err) => {
            console.warn('HLS play waiting for user gesture or buffer:', err);
          });
        } else {
          setIsBuffering(false);
        }
      });

      hls.on(Hls.Events.FRAG_BUFFERED, () => {
        setIsBuffering(false);
        setErrorMessage(null);
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              networkRetryCountRef.current += 1;
              if (networkRetryCountRef.current <= 1) {
                console.warn('HLS Network error, retrying primary stream...');
                hls.startLoad();
              } else if (channel.backupUrl && currentStreamUrlRef.current !== channel.backupUrl) {
                console.info('Switching to backup CDN stream:', channel.backupUrl);
                currentStreamUrlRef.current = channel.backupUrl;
                hls.loadSource(channel.backupUrl);
                hls.startLoad();
              } else {
                setIsBuffering(false);
                setErrorMessage('Mạng đang nghẽn, đang tự động kết nối lại...');
                setTimeout(() => {
                  if (isUserPlayingRef.current && hlsRef.current) {
                    hlsRef.current.loadSource(channel.url);
                    hlsRef.current.startLoad();
                  }
                }, 2500);
              }
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.warn('HLS Media error, recovering...');
              hls.recoverMediaError();
              break;
            default:
              if (channel.backupUrl && currentStreamUrlRef.current !== channel.backupUrl) {
                currentStreamUrlRef.current = channel.backupUrl;
                hls.loadSource(channel.backupUrl);
                hls.startLoad();
              } else {
                setIsBuffering(false);
              }
              break;
          }
        }
      });

      hls.loadSource(targetUrl);
      hls.attachMedia(audio);
    }
    // 2. Tương thích Native HLS cho Safari trên iPhone / iPad / macOS hoặc luồng MP3 trực tiếp
    else {
      audio.src = targetUrl;
      audio.load();
      if (shouldAutoPlay || isUserPlayingRef.current) {
        audio.play().then(() => {
          setIsPlaying(true);
          setIsBuffering(false);
          onPlayingChangeRef.current?.(true);
        }).catch((err) => {
          console.warn('Native audio play error:', err);
          setIsBuffering(false);
        });
      } else {
        setIsBuffering(false);
      }
    }
  }, []);

  // Khởi tạo sẵn luồng VOV1 ngay khi mount để khi người dùng bấm Play là phát tiếng tức thì
  useEffect(() => {
    initStream(activeChannel, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tự động chuẩn bị luồng khi đổi kênh
  const handleSelectChannel = (channelId: string) => {
    setSelectedChannelId(channelId);
    const target = channels.find((c) => c.id === channelId) || channels[0];
    const shouldPlay = isUserPlayingRef.current;
    initStream(target, shouldPlay);
  };

  // Nút Play / Pause
  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      isUserPlayingRef.current = false;
      audio.pause();
      setIsPlaying(false);
      setIsBuffering(false);
      onPlayingChangeRef.current?.(false);
    } else {
      isUserPlayingRef.current = true;
      setIsPlaying(true);
      setErrorMessage(null);

      // Nếu luồng đã được gắn sẵn (pre-initialized), gọi audio.play() trực tiếp ngay trong click handler
      if (hlsRef.current || audio.src) {
        if (audio.readyState < 2) {
          setIsBuffering(true);
        }
        audio.play().then(() => {
          setIsPlaying(true);
          setIsBuffering(false);
          onPlayingChangeRef.current?.(true);
        }).catch((err) => {
          // Nếu bị gián đoạn do đang nạp manifest, Hls.Events.MANIFEST_PARSED sẽ tự gọi play() ngay khi nạp xong
          console.warn('Audio play waiting for stream buffer:', err);
          setIsBuffering(true);
        });
      } else {
        initStream(activeChannel, true);
      }
    }
  };

  // Nút Bật / Tắt âm
  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  // Auto-Ducking: Tự động tạm dừng khi có thông báo khẩn cấp từ Loa Xã
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isDucked && isPlaying) {
      audio.pause();
    } else if (!isDucked && isUserPlayingRef.current) {
      audio.play().catch(() => {});
    }
  }, [isDucked, isPlaying]);

  // Lắng nghe sự kiện tắt toàn bộ âm thanh cảnh báo từ hệ thống & Dọn dẹp duy nhất khi unmount (dependency [])
  useEffect(() => {
    const handleStopAll = () => {
      const audio = audioRef.current;
      if (audio) {
        try {
          audio.pause();
        } catch {}
      }
      isUserPlayingRef.current = false;
      setIsPlaying(false);
      setIsBuffering(false);
      onPlayingChangeRef.current?.(false);
    };

    window.addEventListener('MUTE_OR_STOP_ALL_ALERTS', handleStopAll);
    return () => {
      window.removeEventListener('MUTE_OR_STOP_ALL_ALERTS', handleStopAll);
      if (hlsRef.current) {
        try {
          hlsRef.current.destroy();
        } catch {}
        hlsRef.current = null;
      }
    };
  }, []);

  // Lưu cấu hình URL tùy chỉnh cho Đài Đắk Lắk
  const handleSaveDaklakUrl = () => {
    if (!customDaklakUrl.trim().startsWith('http')) {
      alert('Vui lòng nhập đường link URL hợp lệ (bắt đầu bằng http:// hoặc https://)');
      return;
    }

    try {
      const cleanUrl = customDaklakUrl.trim();
      window.localStorage.setItem(CUSTOM_DAKLAK_STORAGE_KEY, cleanUrl);
      const updatedDaklak: RadioChannel = {
        ... PRESET_RADIO_CHANNELS[3],
        url: cleanUrl,
        description: 'Luồng trực tuyến Đài Đắk Lắk tùy chỉnh',
      };
      setChannels((prev) => prev.map((ch) => (ch.id === 'daklak' ? updatedDaklak : ch)));
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        setShowConfigModal(false);
      }, 1200);

      if (selectedChannelId === 'daklak') {
        initStream(updatedDaklak, isUserPlayingRef.current);
      }
    } catch (e) {
      console.error('Failed to save custom radio url:', e);
    }
  };

  return (
    <div
      className={`flex flex-col gap-1.5 bg-[#F0F6FF] px-2.5 py-1.5 rounded-lg border border-[#0A4393]/25 text-[#0A4393] ${className}`}
      role="region"
      aria-label="Radio Thời Sự Trực Tuyến HLS"
    >
      {/* Audio element bắt các sự kiện chính xác */}
      <audio
        ref={audioRef}
        playsInline
        preload="auto"
        onPlay={() => {
          setIsPlaying(true);
          onPlayingChangeRef.current?.(true);
        }}
        onPlaying={() => {
          setIsPlaying(true);
          setIsBuffering(false);
          setErrorMessage(null);
          onPlayingChangeRef.current?.(true);
        }}
        onTimeUpdate={() => {
          if (isBuffering) setIsBuffering(false);
        }}
        onPause={() => {
          if (!isUserPlayingRef.current) {
            setIsPlaying(false);
            onPlayingChangeRef.current?.(false);
          }
        }}
        onWaiting={() => {
          if (isUserPlayingRef.current) setIsBuffering(true);
        }}
        onCanPlay={() => setIsBuffering(false)}
      />

      {/* Dòng điều khiển chính */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 sm:gap-2">
        {/* Nhóm trái: Play/Pause, Huy hiệu TRỰC TIẾP, Sóng âm */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={togglePlay}
            disabled={isDucked}
            className={`shrink-0 flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-full ${
              isPlaying
                ? 'bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white'
                : 'bg-[#0A4393] hover:bg-[#083576] active:bg-[#062859] text-white'
            } transition-all transform active:scale-95 shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0A4393] disabled:opacity-50 cursor-pointer`}
            aria-label={isPlaying ? 'Tạm dừng Radio' : 'Phát sóng Radio Thời sự'}
            title={isPlaying ? 'Tạm dừng tiếp sóng Radio' : 'Phát sóng trực tuyến Radio'}
          >
            {isPlaying ? (
              <Pause className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            ) : (
              <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-0.5" />
            )}
          </button>

          {/* Huy hiệu TRỰC TIẾP */}
          <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-rose-50 border border-rose-300 shadow-xs">
            <span className="relative flex h-2 w-2">
              {isPlaying && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
              )}
              <span className={`relative inline-flex rounded-full h-2 w-2 ${isPlaying ? 'bg-rose-600' : 'bg-gray-400'}`} />
            </span>
            <span className="text-[10px] sm:text-[11px] font-black tracking-wider text-rose-700 uppercase font-mono">
              TRỰC TIẾP
            </span>
          </div>

          {/* Sóng âm Equalizer */}
          <div
            className="flex items-end gap-0.5 h-4 px-1"
            title={isPlaying ? 'Đang phát sóng âm trực tiếp' : 'Đang dừng'}
          >
            <span
              className={`w-0.5 sm:w-1 bg-[#0A4393] rounded-full transition-all duration-300 ${
                isPlaying && !isBuffering ? 'animate-[pulse_0.6s_ease-in-out_infinite] h-3.5' : 'h-1 opacity-40'
              }`}
            />
            <span
              className={`w-0.5 sm:w-1 bg-[#0A4393] rounded-full transition-all duration-300 ${
                isPlaying && !isBuffering ? 'animate-[pulse_0.9s_ease-in-out_infinite_0.2s] h-4' : 'h-1 opacity-40'
              }`}
            />
            <span
              className={`w-0.5 sm:w-1 bg-[#0A4393] rounded-full transition-all duration-300 ${
                isPlaying && !isBuffering ? 'animate-[pulse_0.7s_ease-in-out_infinite_0.4s] h-2.5' : 'h-1 opacity-40'
              }`}
            />
            <span
              className={`w-0.5 sm:w-1 bg-[#0A4393] rounded-full transition-all duration-300 ${
                isPlaying && !isBuffering ? 'animate-[pulse_0.8s_ease-in-out_infinite_0.1s] h-3.5' : 'h-1 opacity-40'
              }`}
            />
          </div>
        </div>

        {/* Nhóm giữa: Chọn kênh (ẩn thanh cuộn ngang trên Windows) */}
        <div className="flex-1 min-w-[180px] flex flex-wrap items-center gap-1 py-0.5">
          {channels.map((channel) => {
            const isSelected = channel.id === selectedChannelId;
            return (
              <button
                key={channel.id}
                type="button"
                onClick={() => handleSelectChannel(channel.id)}
                className={`px-2 py-0.5 text-[10px] sm:text-[11px] font-semibold rounded whitespace-nowrap transition-all border cursor-pointer ${
                  isSelected
                    ? 'bg-[#0A4393] text-white border-[#0A4393] shadow-xs'
                    : 'bg-white text-[#0A4393] border-[#0A4393]/30 hover:bg-[#0A4393]/10'
                }`}
                title={channel.description}
              >
                {channel.shortName}
              </button>
            );
          })}
        </div>

        {/* Nhóm phải: Nút Mute & Cấu hình Admin */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={toggleMute}
            className="p-1 rounded text-[#0A4393]/80 hover:text-[#0A4393] hover:bg-white transition-colors cursor-pointer"
            title={isMuted ? 'Bật âm thanh' : 'Tắt âm thanh'}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-600" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>

          {isAdmin && (
            <button
              type="button"
              onClick={() => setShowConfigModal(true)}
              className="p-1 rounded text-[#0A4393]/80 hover:text-[#0A4393] hover:bg-white transition-colors cursor-pointer"
              title="Cấu hình URL luồng Đài Phát thanh Đắk Lắk"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Thông tin kênh đang phát & cảnh báo */}
      <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-[#0A4393]/80 border-t border-[#0A4393]/10 pt-1">
        <div className="flex items-center gap-1.5 truncate">
          <Radio className="w-3 h-3 text-[#0A4393] shrink-0" />
          <span className="truncate font-medium">{activeChannel.name}</span>
          {isBuffering ? (
            <span className="text-amber-600 font-mono text-[9px] animate-pulse">
              [Đang kết nối luồng...]
            </span>
          ) : isPlaying ? (
            <span className="text-emerald-700 font-mono text-[9px] font-semibold">
              [Đang phát trực tiếp]
            </span>
          ) : null}
        </div>

        {isDucked && (
          <span className="text-rose-600 font-semibold text-[10px] bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200 animate-pulse">
            ⚠️ Tạm nhường loa cho Bản tin khẩn
          </span>
        )}
      </div>

      {/* Thông báo lỗi nếu có */}
      {errorMessage && (
        <div className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
          {errorMessage}
        </div>
      )}

      {/* Modal Admin Cấu hình URL luồng */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-3">
          <div className="bg-white rounded-xl shadow-xl border border-[#0A4393]/30 max-w-md w-full p-4 space-y-3 text-slate-800 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <h4 className="font-bold text-sm text-[#0A4393] flex items-center gap-1.5">
                <Settings className="w-4 h-4" />
                <span>Cấu hình luồng Radio Đài Đắk Lắk</span>
              </h4>
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="text-gray-400 hover:text-gray-600 text-lg leading-none p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="text-xs text-gray-600 space-y-2">
              <p>
                Quản trị viên có thể dán đường dẫn trực tiếp định dạng <strong>.m3u8</strong> (HLS) hoặc{' '}
                <strong>.mp3</strong> của Đài Phát thanh & Truyền hình Đắk Lắk (DRT).
              </p>
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  Đường dẫn luồng trực tuyến (.m3u8 hoặc .mp3):
                </label>
                <input
                  type="url"
                  placeholder="https://.../stream.m3u8"
                  value={customDaklakUrl}
                  onChange={(e) => setCustomDaklakUrl(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A4393]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={handleSaveDaklakUrl}
                className="px-3 py-1.5 text-xs font-bold text-white bg-[#0A4393] hover:bg-[#083576] rounded-lg flex items-center gap-1 shadow-sm cursor-pointer"
              >
                {saveSuccess ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Đã lưu thành công!</span>
                  </>
                ) : (
                  <span>Lưu cấu hình</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
