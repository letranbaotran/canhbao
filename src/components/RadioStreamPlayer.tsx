'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Hls from 'hls.js';
import { Play, Pause, Radio, Volume2, VolumeX, Settings, Check, ExternalLink } from 'lucide-react';

export interface RadioChannel {
  id: string;
  name: string;
  shortName: string;
  url: string;
  description: string;
  isCustom?: boolean;
}

export const PRESET_RADIO_CHANNELS: RadioChannel[] = [
  {
    id: 'vov1',
    name: 'VOV1 - Thời sự & Chính trị (Toàn quốc)',
    shortName: 'VOV1 Thời sự',
    url: 'https://str.vov.gov.vn/vovlive/vov1vov5Vietnamese.sdp_aac/playlist.m3u8',
    description: 'Kênh Thời sự - Chính trị Quốc gia phát sóng trực tuyến 24/7',
  },
  {
    id: 'vov2',
    name: 'VOV2 - Văn hóa & Đời sống',
    shortName: 'VOV2 Văn hóa',
    url: 'https://str.vov.gov.vn/vovlive/vov2Vietnamese.sdp_aac/playlist.m3u8',
    description: 'Kênh Văn hóa - Xã hội - Khoa giáo Đài Tiếng nói Việt Nam',
  },
  {
    id: 'vov-gt',
    name: 'VOV Giao Thông',
    shortName: 'VOV Giao thông',
    url: 'https://str.vov.gov.vn/vovlive/vovGtHn.sdp_aac/playlist.m3u8',
    description: 'Kênh Thông tin Giao thông & Cứu nạn khẩn cấp',
  },
  {
    id: 'daklak',
    name: 'Đài Phát thanh Đắk Lắk (DRT)',
    shortName: 'Đài Đắk Lắk',
    url: 'https://str.vov.gov.vn/vovlive/vov1vov5Vietnamese.sdp_aac/playlist.m3u8',
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

  // Modal / Popover Admin cấu hình URL đài Đắk Lắk
  const [showConfigModal, setShowConfigModal] = useState<boolean>(false);
  const [customDaklakUrl, setCustomDaklakUrl] = useState<string>('');
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);

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

  // Khởi tạo và gắn luồng HLS hoặc Native HLS (iOS Safari)
  const setupAudioStream = useCallback(
    (streamUrl: string, autoPlay: boolean = false) => {
      const audio = audioRef.current;
      if (!audio) return;

      setErrorMessage(null);
      setIsBuffering(true);

      // Dọn dẹp phiên Hls cũ nếu có
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }

      // 1. Kiểm tra hỗ trợ HLS.js (Chrome, Android, Edge, Firefox, Desktop PC)
      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          backBufferLength: 30,
          maxBufferLength: 30,
        });
        hlsRef.current = hls;

        hls.loadSource(streamUrl);
        hls.attachMedia(audio);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          setIsBuffering(false);
          if (autoPlay) {
            audio.play().then(() => {
              setIsPlaying(true);
              onPlayingChange?.(true);
            }).catch((err) => {
              console.warn('HLS Autoplay prevented:', err);
              setIsPlaying(false);
              onPlayingChange?.(false);
            });
          }
        });

        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal) {
            setIsBuffering(false);
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                console.warn('HLS Network error, attempting recovery...');
                hls.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                console.warn('HLS Media error, attempting recovery...');
                hls.recoverMediaError();
                break;
              default:
                console.error('HLS Fatal unrecoverable error:', data);
                hls.destroy();
                hlsRef.current = null;
                setIsPlaying(false);
                onPlayingChange?.(false);
                setErrorMessage('Không kết nối được luồng phát thanh này. Vui lòng thử kênh khác.');
                break;
            }
          }
        });
      }
      // 2. Tương thích Native HLS cho Safari trên iPhone / iPad / macOS
      else if (audio.canPlayType('application/vnd.apple.mpegurl')) {
        audio.src = streamUrl;
        const handleCanPlay = () => {
          setIsBuffering(false);
          if (autoPlay) {
            audio.play().then(() => {
              setIsPlaying(true);
              onPlayingChange?.(true);
            }).catch((err) => {
              console.warn('Safari Native HLS play prevented:', err);
              setIsPlaying(false);
              onPlayingChange?.(false);
            });
          }
          audio.removeEventListener('canplay', handleCanPlay);
        };
        audio.addEventListener('canplay', handleCanPlay);
        audio.load();
      }
      // 3. Fallback cho luồng MP3 trực tiếp
      else {
        audio.src = streamUrl;
        setIsBuffering(false);
        if (autoPlay) {
          audio.play().then(() => {
            setIsPlaying(true);
            onPlayingChange?.(true);
          }).catch(() => {
            setIsPlaying(false);
            onPlayingChange?.(false);
          });
        }
      }
    },
    [onPlayingChange]
  );

  // Khi đổi kênh
  const handleSelectChannel = (channelId: string) => {
    setSelectedChannelId(channelId);
    const target = channels.find((c) => c.id === channelId) || channels[0];
    const shouldPlay = isPlaying;
    setupAudioStream(target.url, shouldPlay);
  };

  // Nút Play / Pause
  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      onPlayingChange?.(false);
    } else {
      // Nếu chưa khởi tạo Hls thì khởi tạo
      if (!hlsRef.current && !audio.src) {
        setupAudioStream(activeChannel.url, true);
      } else {
        audio.play().then(() => {
          setIsPlaying(true);
          onPlayingChange?.(true);
        }).catch((err) => {
          console.warn('Play interrupted:', err);
          setupAudioStream(activeChannel.url, true);
        });
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

  // Xử lý Auto-Ducking: Khi có cảnh báo khẩn cấp từ Loa Xã
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isDucked && isPlaying) {
      audio.pause();
      // Giữ nguyên cờ isPlaying hoặc thông báo đang tạm dừng ưu tiên
    } else if (!isDucked && isPlaying) {
      audio.play().catch(() => {});
    }
  }, [isDucked, isPlaying]);

  // Lắng nghe sự kiện tắt khẩn cấp toàn hệ thống
  useEffect(() => {
    const handleStopAll = () => {
      const audio = audioRef.current;
      if (audio) {
        try {
          audio.pause();
        } catch {}
      }
      setIsPlaying(false);
      onPlayingChange?.(false);
    };

    window.addEventListener('MUTE_OR_STOP_ALL_ALERTS', handleStopAll);
    return () => {
      window.removeEventListener('MUTE_OR_STOP_ALL_ALERTS', handleStopAll);
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [onPlayingChange]);

  // Lưu URL Đài Đắk Lắk tùy chỉnh từ Admin
  const handleSaveDaklakUrl = () => {
    if (!customDaklakUrl.trim().startsWith('http')) {
      alert('Vui lòng nhập đường link URL hợp lệ (bắt đầu bằng http:// hoặc https://)');
      return;
    }

    try {
      window.localStorage.setItem(CUSTOM_DAKLAK_STORAGE_KEY, customDaklakUrl.trim());
      setChannels((prev) =>
        prev.map((ch) =>
          ch.id === 'daklak'
            ? { ...ch, url: customDaklakUrl.trim(), description: 'Luồng trực tuyến Đài Đắk Lắk tùy chỉnh' }
            : ch
        )
      );
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        setShowConfigModal(false);
      }, 1200);

      // Nếu đang chọn kênh Đắk Lắk, reload lại stream
      if (selectedChannelId === 'daklak') {
        setupAudioStream(customDaklakUrl.trim(), isPlaying);
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
      <audio
        ref={audioRef}
        playsInline
        preload="none"
        onWaiting={() => setIsBuffering(true)}
        onPlaying={() => setIsBuffering(false)}
      />

      {/* Dòng điều khiển chính: Nằm gọn trên 1 dòng linh hoạt */}
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
            } transition-all transform active:scale-95 shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0A4393] disabled:opacity-50`}
            aria-label={isPlaying ? 'Tạm dừng Radio' : 'Phát sóng Radio Thời sự'}
            title={isPlaying ? 'Tạm dừng tiếp sóng Radio' : 'Phát sóng trực tuyến Radio'}
          >
            {isPlaying ? (
              <Pause className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            ) : (
              <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-0.5" />
            )}
          </button>

          {/* Huy hiệu TRỰC TIẾP với đèn đỏ nhấp nháy */}
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

          {/* Biểu tượng sóng âm chuyển động (Equalizer animation) */}
          <div
            className="flex items-end gap-0.5 h-4 px-1"
            title={isPlaying ? 'Đang phát sóng âm trực tiếp' : 'Đang dừng'}
          >
            <span
              className={`w-0.5 sm:w-1 bg-[#0A4393] rounded-full transition-all duration-300 ${
                isPlaying ? 'animate-[pulse_0.6s_ease-in-out_infinite] h-3.5' : 'h-1 opacity-40'
              }`}
            />
            <span
              className={`w-0.5 sm:w-1 bg-[#0A4393] rounded-full transition-all duration-300 ${
                isPlaying ? 'animate-[pulse_0.9s_ease-in-out_infinite_0.2s] h-4' : 'h-1 opacity-40'
              }`}
            />
            <span
              className={`w-0.5 sm:w-1 bg-[#0A4393] rounded-full transition-all duration-300 ${
                isPlaying ? 'animate-[pulse_0.7s_ease-in-out_infinite_0.4s] h-2.5' : 'h-1 opacity-40'
              }`}
            />
            <span
              className={`w-0.5 sm:w-1 bg-[#0A4393] rounded-full transition-all duration-300 ${
                isPlaying ? 'animate-[pulse_0.8s_ease-in-out_infinite_0.1s] h-3.5' : 'h-1 opacity-40'
              }`}
            />
          </div>
        </div>

        {/* Nhóm giữa: Chọn kênh Radio (VOV1, VOV2, VOV GT, Đắk Lắk) */}
        <div className="flex-1 min-w-[200px] flex items-center gap-1 overflow-x-auto py-0.5 no-scrollbar">
          {channels.map((channel) => {
            const isSelected = channel.id === selectedChannelId;
            return (
              <button
                key={channel.id}
                type="button"
                onClick={() => handleSelectChannel(channel.id)}
                className={`px-2 py-0.5 text-[10px] sm:text-[11px] font-semibold rounded whitespace-nowrap transition-all border ${
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

        {/* Nhóm phải: Nút Mute & Nút Cấu hình Admin nếu có quyền */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={toggleMute}
            className="p-1 rounded text-[#0A4393]/80 hover:text-[#0A4393] hover:bg-white transition-colors"
            title={isMuted ? 'Bật âm thanh' : 'Tắt âm thanh'}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-600" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>

          {/* Nút cấu hình luồng Đài Đắk Lắk dành cho Admin */}
          {isAdmin && (
            <button
              type="button"
              onClick={() => setShowConfigModal(true)}
              className="p-1 rounded text-[#0A4393]/80 hover:text-[#0A4393] hover:bg-white transition-colors"
              title="Cấu hình URL luồng Đài Phát thanh Đắk Lắk"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Thông tin kênh đang phát & cảnh báo gián đoạn/buffering */}
      <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-[#0A4393]/80 border-t border-[#0A4393]/10 pt-1">
        <div className="flex items-center gap-1.5 truncate">
          <Radio className="w-3 h-3 text-[#0A4393] shrink-0" />
          <span className="truncate font-medium">{activeChannel.name}</span>
          {isBuffering && (
            <span className="text-amber-600 font-mono text-[9px] animate-pulse">
              [Đang kết nối luồng...]
            </span>
          )}
        </div>

        {isDucked && (
          <span className="text-rose-600 font-semibold text-[10px] bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200 animate-pulse">
            ⚠️ Tạm nhường loa cho Bản tin khẩn
          </span>
        )}
      </div>

      {/* Thông báo lỗi nếu có */}
      {errorMessage && (
        <div className="text-[10px] text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
          {errorMessage}
        </div>
      )}

      {/* Modal Admin Cấu hình URL luồng phát thanh Đài Đắk Lắk */}
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
                className="text-gray-400 hover:text-gray-600 text-lg leading-none p-1"
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
              <div className="text-[10px] text-gray-500 bg-gray-50 p-2 rounded border border-gray-200 space-y-1">
                <div>• Hỗ trợ luồng HLS m3u8 tiêu chuẩn hoặc luồng MP3 Icecast/Shoutcast.</div>
                <div>• Luồng mặc định hệ thống: Tiếp sóng VOV1 dự phòng khi chưa cấu hình.</div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={handleSaveDaklakUrl}
                className="px-3 py-1.5 text-xs font-bold text-white bg-[#0A4393] hover:bg-[#083576] rounded-lg flex items-center gap-1 shadow-sm"
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
