'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Hls from 'hls.js';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Mic,
  BookOpen,
  Car,
  RadioTower,
  MoreHorizontal,
  Settings,
  Check,
  Radio,
} from 'lucide-react';

export interface RadioChannel {
  id: string;
  name: string;
  shortName: string;
  url: string;
  backupUrl?: string;
  description: string;
  needlePercent: number;
  isCustom?: boolean;
}

export const PRESET_RADIO_CHANNELS: RadioChannel[] = [
  {
    id: 'vov1',
    name: 'VOV1 - Thời sự & Chính trị (Toàn quốc)',
    shortName: 'VOV1 Thời Sự',
    url: 'https://str.vov.gov.vn/vovlive/vov1vov5Vietnamese.sdp_aac/playlist.m3u8',
    backupUrl: 'https://audio-lss.vov.vn/live/vov1.m3u8',
    description: 'Kênh Thời sự - Chính trị Quốc gia phát sóng trực tuyến 24/7 (FM 100MHz)',
    needlePercent: 32,
  },
  {
    id: 'vov2',
    name: 'VOV2 - Văn hóa & Đời sống',
    shortName: 'VOV2 Văn Hóa',
    url: 'https://str.vov.gov.vn/vovlive/vov2.sdp_aac/playlist.m3u8',
    backupUrl: 'https://audio-lss.vov.vn/live/vov2.m3u8',
    description: 'Kênh Văn hóa - Xã hội - Khoa giáo Đài Tiếng nói Việt Nam (FM 96.5MHz)',
    needlePercent: 48,
  },
  {
    id: 'vov-gt',
    name: 'VOV Giao Thông (Hà Nội & Toàn quốc)',
    shortName: 'VOV Giao thông',
    url: 'https://str.vov.gov.vn/vovlive/vovGTHN.sdp_aac/playlist.m3u8',
    backupUrl: 'https://audio-lss.vov.vn/live/giao_thong_ha_noi.m3u8',
    description: 'Kênh Thông tin Giao thông & Cứu nạn khẩn cấp (FM 91MHz)',
    needlePercent: 64,
  },
  {
    id: 'daklak',
    name: 'Đài Phát thanh Đắk Lắk (DRT)',
    shortName: 'Đài Đắk Lắk',
    url: 'https://str.vov.gov.vn/vovlive/vov1vov5Vietnamese.sdp_aac/playlist.m3u8',
    backupUrl: 'https://audio-lss.vov.vn/live/vov1.m3u8',
    description: 'Tiếng nói Đảng bộ, Chính quyền & Nhân dân tỉnh Đắk Lắk (FM 94.7MHz)',
    needlePercent: 80,
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

  // Modal cấu hình URL đài Đắk Lắk & thông tin sóng
  const [showConfigModal, setShowConfigModal] = useState<boolean>(false);
  const [customDaklakUrl, setCustomDaklakUrl] = useState<string>('');
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const isUserPlayingRef = useRef<boolean>(false);
  const networkRetryCountRef = useRef<number>(0);
  const currentStreamUrlRef = useRef<string>('');

  // Giữ callback onPlayingChange trong ref để tránh re-render của component cha hủy phiên HLS
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
              ? {
                  ...ch,
                  url: savedUrl.trim(),
                  description: 'Luồng trực tuyến Đài Đắk Lắk do Ban Quản trị cấu hình',
                }
              : ch
          )
        );
      }
    } catch {}
  }, []);

  const activeChannel = channels.find((c) => c.id === selectedChannelId) || channels[0];

  // Khởi tạo luồng HLS hoặc Native HLS cho audio element
  const initStream = useCallback(
    (channel: RadioChannel, shouldAutoPlay: boolean = false, useBackup: boolean = false) => {
      const audio = audioRef.current;
      if (!audio) return;

      const targetUrl = useBackup && channel.backupUrl ? channel.backupUrl : channel.url;
      currentStreamUrlRef.current = targetUrl;
      networkRetryCountRef.current = 0;
      setErrorMessage(null);

      if (shouldAutoPlay) {
        setIsBuffering(true);
      }

      if (hlsRef.current) {
        try {
          hlsRef.current.destroy();
        } catch {}
        hlsRef.current = null;
      }

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
            audio
              .play()
              .then(() => {
                setIsPlaying(true);
                setIsBuffering(false);
                onPlayingChangeRef.current?.(true);
              })
              .catch((err) => {
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
                  hls.startLoad();
                } else if (channel.backupUrl && currentStreamUrlRef.current !== channel.backupUrl) {
                  currentStreamUrlRef.current = channel.backupUrl;
                  hls.loadSource(channel.backupUrl);
                  hls.startLoad();
                } else {
                  setIsBuffering(false);
                  setErrorMessage('Đang tự động dò lại tần số phát thanh...');
                  setTimeout(() => {
                    if (isUserPlayingRef.current && hlsRef.current) {
                      hlsRef.current.loadSource(channel.url);
                      hlsRef.current.startLoad();
                    }
                  }, 2500);
                }
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
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
      } else {
        audio.src = targetUrl;
        audio.load();
        if (shouldAutoPlay || isUserPlayingRef.current) {
          audio
            .play()
            .then(() => {
              setIsPlaying(true);
              setIsBuffering(false);
              onPlayingChangeRef.current?.(true);
            })
            .catch(() => {
              setIsBuffering(false);
            });
        } else {
          setIsBuffering(false);
        }
      }
    },
    []
  );

  // Khởi tạo sẵn luồng VOV1 ngay khi mount để bấm Play là nói ngay
  useEffect(() => {
    initStream(activeChannel, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Khi bấm chọn đài: Tự động phát luôn
  const handleSelectChannel = (channelId: string) => {
    setSelectedChannelId(channelId);
    const target = channels.find((c) => c.id === channelId) || channels[0];
    isUserPlayingRef.current = true;
    setIsPlaying(true);
    initStream(target, true);
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

      if (hlsRef.current || audio.src) {
        if (audio.readyState < 2) {
          setIsBuffering(true);
        }
        audio
          .play()
          .then(() => {
            setIsPlaying(true);
            setIsBuffering(false);
            onPlayingChangeRef.current?.(true);
          })
          .catch(() => {
            setIsBuffering(true);
          });
      } else {
        initStream(activeChannel, true);
      }
    }
  };

  // Nút "Bật âm thanh": Nếu đài đang tắt thì bật phát đài luôn; nếu đang phát thì chuyển đổi Bật/Tắt tiếng
  const handleSoundButtonClick = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!isPlaying) {
      audio.muted = false;
      setIsMuted(false);
      togglePlay();
      return;
    }

    const nextMuted = !isMuted;
    audio.muted = nextMuted;
    setIsMuted(nextMuted);
  };

  // Auto-Ducking: Tự động tạm dừng khi có thông báo khẩn cấp từ Loa Phóng Thanh
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isDucked && isPlaying) {
      audio.pause();
    } else if (!isDucked && isUserPlayingRef.current) {
      audio.play().catch(() => {});
    }
  }, [isDucked, isPlaying]);

  // Lắng nghe sự kiện tắt toàn bộ âm thanh cảnh báo từ hệ thống & Dọn dẹp duy nhất khi unmount
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
        ...PRESET_RADIO_CHANNELS[3],
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

  // Biểu tượng riêng phù hợp cho từng kênh Radio (Yêu cầu Ảnh 3)
  const renderChannelIcon = (channelId: string, isSelected: boolean) => {
    const iconColor = isSelected ? 'text-[#FFE7BA]' : 'text-[#5A2E0C]';
    switch (channelId) {
      case 'vov1':
        return <Mic className={`w-3.5 h-3.5 shrink-0 ${iconColor}`} />;
      case 'vov2':
        return <BookOpen className={`w-3.5 h-3.5 shrink-0 ${iconColor}`} />;
      case 'vov-gt':
        return <Car className={`w-3.5 h-3.5 shrink-0 ${iconColor}`} />;
      case 'daklak':
      default:
        return (
          <RadioTower
            className={`w-3.5 h-3.5 shrink-0 ${iconColor} ${
              isPlaying && selectedChannelId === 'daklak' && isBuffering ? 'animate-pulse' : ''
            }`}
          />
        );
    }
  };

  return (
    <div
      className={`relative select-none pt-5 pb-0.5 ${className}`}
      role="region"
      aria-label="Radio Thời Sự Trực Tuyến HLS"
    >
      {/* Audio element ẩn */}
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

      {/* 1. ĂNG-TEN ĐỒNG 3D KÉO NGHIÊNG (Mô phỏng chính xác Ảnh 2) */}
      <svg
        viewBox="0 0 180 34"
        className="pointer-events-none absolute top-0 left-4 sm:left-6 w-36 sm:w-44 h-7 z-20 overflow-visible"
        aria-hidden="true"
      >
        <defs>
          {/* Gradient thân đồng 3D có vệt sáng kim loại ở giữa */}
          <linearGradient id="brassRodGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#5C320E" />
            <stop offset="25%" stopColor="#D69E5C" />
            <stop offset="48%" stopColor="#FFF5E1" />
            <stop offset="72%" stopColor="#A96B2C" />
            <stop offset="100%" stopColor="#3E1E04" />
          </linearGradient>
          {/* Gradient khớp gắn chân ăng-ten */}
          <linearGradient id="brassBaseGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#F5D5A3" />
            <stop offset="35%" stopColor="#FFFFFF" />
            <stop offset="70%" stopColor="#9B5E24" />
            <stop offset="100%" stopColor="#3B1C04" />
          </linearGradient>
          {/* Gradient đầu bi tròn 3D ánh kim */}
          <radialGradient id="brassBallGrad" cx="35%" cy="32%" r="65%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="28%" stopColor="#F8DAB0" />
            <stop offset="68%" stopColor="#B2702D" />
            <stop offset="100%" stopColor="#422005" />
          </radialGradient>
        </defs>

        {/* Đế phẳng bắt sát lên thành máy */}
        <path
          d="M 8 33 C 10 29, 36 29, 40 33 Z"
          fill="url(#brassRodGrad)"
          stroke="#3B1C04"
          strokeWidth="0.9"
        />

        {/* Ống ăng-ten vươn chéo lên góc phải (2 bậc rút) */}
        <g transform="translate(24, 29) rotate(-14)">
          {/* Đốt ống lớn gốc */}
          <polygon
            points="0,-3.6 78,-2.5 78,2.5 0,3.6"
            fill="url(#brassRodGrad)"
            stroke="#3B1C04"
            strokeWidth="0.8"
          />
          {/* Khớp nối giữa 2 đốt */}
          <rect
            x="76.5"
            y="-2.7"
            width="2.5"
            height="5.4"
            rx="0.6"
            fill="url(#brassBaseGrad)"
            stroke="#3B1C04"
            strokeWidth="0.6"
          />
          {/* Đốt ống nhỏ ngọn */}
          <polygon
            points="79,-1.7 124,-1.3 124,1.3 79,1.7"
            fill="url(#brassRodGrad)"
            stroke="#3B1C04"
            strokeWidth="0.7"
          />
          {/* Khớp bầu giữ gốc ăng-ten (Knuckle cap) */}
          <path
            d="M -7 -3.5 C -7 -6, 4 -6.5, 6 -4.2 L 7 4.2 C 4 5.5, -7 5.5, -7 3.5 Z"
            fill="url(#brassBaseGrad)"
            stroke="#3B1C04"
            strokeWidth="0.9"
          />
          {/* Viền cổ khớp gốc */}
          <rect
            x="5"
            y="-4.4"
            width="2.6"
            height="8.8"
            rx="1"
            fill="url(#brassBaseGrad)"
            stroke="#3B1C04"
            strokeWidth="0.7"
          />
          {/* Đầu bi tròn đồng sáng bóng ở đỉnh ăng-ten */}
          <circle
            cx="128"
            cy="0"
            r="6.2"
            fill="url(#brassBallGrad)"
            stroke="#3B1C04"
            strokeWidth="0.9"
          />
        </g>
      </svg>

      {/* 2. VÒM LOA TRÊN ĐỈNH MÁY ĐÀI (Giữa đỉnh máy) */}
      <div
        className="relative z-10 mx-auto w-36 sm:w-48 h-3.5 -mb-[3px] rounded-t-xl bg-gradient-to-b from-[#E6B87D] via-[#A66830] to-[#63360F] px-3 pt-1 pb-0.5 border-t border-x border-[#592E0A] shadow-[0_-1px_3px_rgba(70,35,5,0.2)] flex flex-col justify-center gap-[2px]"
        aria-hidden="true"
      >
        <div className="w-full h-[2px] rounded-full bg-[#2B1203] opacity-90" />
        <div className="w-11/12 mx-auto h-[2px] rounded-full bg-[#2B1203] opacity-90" />
      </div>

      {/* 3. THÂN VỎ ĐÀI RADIO CỔ ĐIỂN VIỀN ĐỒNG GỖ SANG TRỌNG */}
      <div className="relative z-10 rounded-2xl p-[3.5px] bg-gradient-to-b from-[#E5B880] via-[#965A25] to-[#4E2808] shadow-[0_5px_12px_rgba(68,35,8,0.28),inset_0_1px_1px_rgba(255,242,218,0.75)] border border-[#4A2407]">
        <div className="rounded-[13px] bg-gradient-to-b from-[#5E320E] via-[#7A4519] to-[#3E1F05] p-[2px]">
          {/* MẶT ĐÀI KEM NGÀ CỔ ĐIỂN */}
          <div className="rounded-[11px] bg-gradient-to-b from-[#FFFDF8] via-[#FAF0DA] to-[#EFE0C2] px-2.5 py-2 sm:px-3 sm:py-2 border border-[#D7B788] shadow-inner">
            {/* BỐ CỤC CHÍNH: Đảm bảo hiển thị ĐẦY ĐỦ TÊN của cả 4 kênh + nút âm thanh */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
              {/* CỤM TRÁI: Núm xoay Play/Pause + Nhãn TRỰC TIẾP + Nút Bật âm thanh + Nút ••• (trên mobile) */}
              <div className="flex items-center justify-between md:justify-start gap-1.5 sm:gap-2 shrink-0">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  {/* Núm xoay tròn cổ điển kèm vạch chia khắc quanh viền phải */}
                  <div className="relative flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 shrink-0">
                    <svg
                      viewBox="0 0 60 60"
                      className="pointer-events-none absolute inset-0 w-full h-full"
                      aria-hidden="true"
                    >
                      {[-75, -55, -35, -15, 5, 25, 45, 65].map((angle, idx) => {
                        const rad = (angle * Math.PI) / 180;
                        const r1 = 24;
                        const r2 = idx % 2 === 0 ? 28.5 : 27;
                        const x1 = 30 + r1 * Math.cos(rad);
                        const y1 = 30 + r1 * Math.sin(rad);
                        const x2 = 30 + r2 * Math.cos(rad);
                        const y2 = 30 + r2 * Math.sin(rad);
                        return (
                          <line
                            key={angle}
                            x1={x1}
                            y1={y1}
                            x2={x2}
                            y2={y2}
                            stroke="#5B3210"
                            strokeWidth={idx % 2 === 0 ? '1.6' : '1.1'}
                            strokeLinecap="round"
                          />
                        );
                      })}
                    </svg>

                    <button
                      type="button"
                      onClick={togglePlay}
                      disabled={isDucked}
                      className="relative z-10 w-9 h-9 sm:w-10 sm:h-10 rounded-full p-[2.5px] bg-gradient-to-b from-[#ECC48E] via-[#A96C32] to-[#582E0A] shadow-[0_3px_6px_rgba(55,25,4,0.45),inset_0_1px_1px_#FFF6E6] active:scale-95 transition-transform cursor-pointer disabled:opacity-50"
                      aria-label={isPlaying ? 'Tạm dừng Radio' : 'Phát sóng Radio Thời sự'}
                      title={isPlaying ? 'Tạm dừng tiếp sóng Radio' : 'Bấm để nghe Radio Thời sự trực tiếp'}
                    >
                      <span className="flex items-center justify-center w-full h-full rounded-full bg-gradient-to-b from-[#5E3516] via-[#43220A] to-[#271102] border border-[#7C4B22] shadow-inner text-white">
                        {isPlaying ? (
                          <Pause className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-white text-white" />
                        ) : (
                          <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-white text-white ml-0.5" />
                        )}
                      </span>
                    </button>
                  </div>

                  {/* Huy hiệu nổi TRỰC TIẾP */}
                  <button
                    type="button"
                    onClick={togglePlay}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-b from-[#FFFFFF] via-[#FAF0DC] to-[#E5CCA3] border border-[#C6A06C] shadow-[0_2px_4px_rgba(75,40,8,0.22),inset_0_1px_0_#FFFFFF] cursor-pointer active:scale-98 transition-transform shrink-0"
                    title={
                      isBuffering
                        ? 'Đang kết nối luồng sóng...'
                        : isPlaying
                          ? `Đang phát trực tiếp: ${activeChannel.name}`
                          : 'Bấm để phát trực tiếp'
                    }
                  >
                    <span className="relative flex h-2 w-2">
                      {isPlaying && (
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                      )}
                      <span
                        className={`relative inline-flex rounded-full h-2 w-2 ${
                          isPlaying
                            ? 'bg-[#DC2626] shadow-[0_0_5px_#DC2626]'
                            : 'bg-[#C93B2B]/70'
                        }`}
                      />
                    </span>
                    <span className="text-[10px] sm:text-[11px] font-black tracking-tight text-[#C81E1E] uppercase whitespace-nowrap">
                      TRỰC TIẾP
                    </span>
                  </button>

                  {/* Nút Bật / Tắt âm thanh (Hiển thị đầy đủ chữ) */}
                  <button
                    type="button"
                    onClick={handleSoundButtonClick}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] sm:text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer border shrink-0 ${
                      isMuted
                        ? 'bg-gradient-to-b from-[#FDE8E8] to-[#F5C6C6] text-red-800 border-red-300 shadow-inner'
                        : 'bg-gradient-to-b from-[#FFFFFF] via-[#F9EFDB] to-[#E6CEAA] text-[#492508] border-[#C9A472] shadow-[0_2px_3px_rgba(80,45,10,0.2),inset_0_1px_0_#FFFFFF] hover:brightness-102'
                    }`}
                    title={isMuted ? 'Đang tắt tiếng - Bấm để bật âm thanh' : 'Bật / Tắt âm thanh Radio'}
                  >
                    {isMuted ? (
                      <VolumeX className="w-3.5 h-3.5 text-red-700 shrink-0" />
                    ) : (
                      <Volume2 className="w-3.5 h-3.5 text-[#5A2E0C] shrink-0" />
                    )}
                    <span>{isMuted ? 'Tắt âm thanh' : 'Bật âm thanh'}</span>
                  </button>
                </div>

                {/* Nút 3 chấm trên mobile */}
                <button
                  type="button"
                  onClick={() => setShowConfigModal(true)}
                  className="md:hidden p-1.5 rounded-lg text-[#4B2608] hover:bg-[#E7CFA8]/60 active:scale-95 transition-all cursor-pointer"
                  title="Thông tin tần số & Cấu hình luồng Đài Phát thanh Đắk Lắk"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </div>

              {/* CỤM GIỮA: 4 NÚT CỦA 4 KÊNH RADIO (Bố trí lưới 2x2 hoặc 4 cột rõ ràng, HIỆN ĐẦY ĐỦ TÊN KÊNH & BIỂU TƯỢNG PHÙ HỢP) */}
              <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-2 xl:grid-cols-4 gap-1.5">
                {channels.map((channel) => {
                  const isSelected = channel.id === selectedChannelId;
                  return (
                    <button
                      key={channel.id}
                      type="button"
                      onClick={() => handleSelectChannel(channel.id)}
                      className={`flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-gradient-to-b from-[#6B3B19] via-[#4A250A] to-[#2D1403] text-[#FFF9F0] border-2 border-[#C89456] shadow-[0_2px_5px_rgba(55,25,4,0.4),inset_0_1px_1px_rgba(255,225,185,0.35)]'
                          : 'bg-gradient-to-b from-[#FFFFFF] via-[#F9EFDB] to-[#E6CEAA] text-[#492508] border border-[#C9A472] shadow-[0_2px_3px_rgba(80,45,10,0.2),inset_0_1px_0_#FFFFFF] hover:brightness-102 active:translate-y-[0.5px]'
                      }`}
                      title={channel.description}
                    >
                      {renderChannelIcon(channel.id, isSelected)}
                      <span>{channel.shortName}</span>
                    </button>
                  );
                })}
              </div>

              {/* CỤM PHẢI: Vạch ngăn dọc & Nút 3 chấm (•••) trên màn hình Desktop */}
              <div className="hidden md:flex items-center pl-1.5 border-l border-[#D5B88E] self-stretch shrink-0">
                <button
                  type="button"
                  onClick={() => setShowConfigModal(true)}
                  className="p-1.5 rounded-lg text-[#4B2608] hover:bg-[#E7CFA8]/60 active:scale-95 transition-all cursor-pointer"
                  title="Thông tin tần số & Cấu hình luồng Đài Phát thanh Đắk Lắk"
                  aria-label="Tùy chọn cấu hình đài Radio"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* 4. DẢI KHE LOA ĐÁY & THƯỚC DÒ TẦN SỐ KIM ĐỎ CỔ ĐIỂN */}
            <div className="mt-2 pt-1 flex items-center gap-2">
              {/* Khe tản âm bên trái */}
              <div className="flex-1 flex flex-col gap-[2.5px]" aria-hidden="true">
                <div className="w-full h-[2px] rounded-full bg-[#522B0B]/85" />
                <div className="w-full h-[2px] rounded-full bg-[#522B0B]/85" />
                <div className="w-full h-[2px] rounded-full bg-[#522B0B]/85" />
              </div>

              {/* Thước dò tần số trung tâm với Kim Đỏ dịch chuyển theo kênh */}
              <div
                className="relative w-48 sm:w-64 h-5 rounded-full bg-gradient-to-b from-[#F5E4C5] via-[#FFFDF7] to-[#E8D0A7] border border-[#C6A06D] shadow-inner px-3 flex items-center justify-between overflow-hidden shrink-0"
                title={`Tần số kênh: ${activeChannel.name}`}
              >
                {Array.from({ length: 25 }).map((_, idx) => {
                  const isMajor = idx % 4 === 0;
                  return (
                    <span
                      key={idx}
                      className={`inline-block rounded-full bg-[#4E290B] ${
                        isMajor ? 'w-[1.5px] h-3 opacity-85' : 'w-[1px] h-1.5 opacity-55'
                      }`}
                    />
                  );
                })}

                {/* Kim chỉ tần số màu đỏ */}
                <div
                  className="pointer-events-none absolute top-0.5 bottom-0.5 w-[2.5px] rounded-full bg-[#D91B1B] shadow-[0_0_4px_rgba(217,27,27,0.8)] transition-all duration-500 ease-out"
                  style={{ left: `${activeChannel.needlePercent}%` }}
                />
              </div>

              {/* Khe tản âm bên phải */}
              <div className="flex-1 flex flex-col gap-[2.5px]" aria-hidden="true">
                <div className="w-full h-[2px] rounded-full bg-[#522B0B]/85" />
                <div className="w-full h-[2px] rounded-full bg-[#522B0B]/85" />
                <div className="w-full h-[2px] rounded-full bg-[#522B0B]/85" />
              </div>
            </div>

            {/* Thông báo lỗi nếu có */}
            {errorMessage && (
              <div className="mt-1 text-[10px] text-amber-900 bg-amber-100/80 px-2 py-0.5 rounded border border-amber-300 text-center">
                {errorMessage}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Thông tin kênh & Cấu hình URL luồng Đài Đắk Lắk */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-3">
          <div className="bg-[#FFFDF8] rounded-xl shadow-xl border-2 border-[#8F5522] max-w-md w-full p-4 space-y-3 text-[#3E1F05] animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[#E5CCA3] pb-2">
              <h4 className="font-bold text-sm text-[#5A2E0C] flex items-center gap-1.5">
                <Radio className="w-4 h-4 text-[#8F5522]" />
                <span>Thông tin Tần số & Cấu hình Đài Radio</span>
              </h4>
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="text-[#8F5522] hover:text-[#4A2508] text-lg leading-none p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="text-xs space-y-2">
              <div className="p-2.5 rounded-lg bg-[#FAF0DA] border border-[#D7B788] space-y-1">
                <div className="font-bold text-[#4A2508]">{activeChannel.name}</div>
                <div className="text-[11px] text-[#6E3F19]">{activeChannel.description}</div>
              </div>

              {isAdmin ? (
                <div className="space-y-2 pt-1">
                  <label className="block text-[11px] font-bold text-[#5A2E0C] flex items-center gap-1">
                    <Settings className="w-3.5 h-3.5" />
                    <span>Cấu hình đường dẫn luồng Đài Đắk Lắk (.m3u8 hoặc .mp3):</span>
                  </label>
                  <input
                    type="url"
                    placeholder="https://.../stream.m3u8"
                    value={customDaklakUrl}
                    onChange={(e) => setCustomDaklakUrl(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#C6A06C] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8F5522]"
                  />
                </div>
              ) : (
                <p className="text-[11px] text-[#6E3F19] italic">
                  Hệ thống tự động ưu tiên nhường loa cho Bản tin cảnh báo thiên tai khẩn cấp của xã Ea Súp khi có lệnh báo động mới.
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E5CCA3]">
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="px-3 py-1.5 text-xs font-semibold text-[#5A2E0C] hover:bg-[#FAF0DA] rounded-lg cursor-pointer"
              >
                Đóng
              </button>
              {isAdmin && (
                <button
                  type="button"
                  onClick={handleSaveDaklakUrl}
                  className="px-3 py-1.5 text-xs font-bold text-white bg-gradient-to-b from-[#6B3B19] to-[#3E1F05] hover:brightness-110 rounded-lg flex items-center gap-1 shadow-sm cursor-pointer"
                >
                  {saveSuccess ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-300" />
                      <span>Đã lưu thành công!</span>
                    </>
                  ) : (
                    <span>Lưu cấu hình</span>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
