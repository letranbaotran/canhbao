'use client';

import React, { useState, useEffect } from 'react';
import {
  Home,
  MapPin,
  BellRing,
  BarChart3,
  BookOpen,
  PhoneCall,
  X,
} from 'lucide-react';

export const SovereigntyBanner: React.FC = () => {
  const [activeMenu, setActiveMenu] = useState<string>('home');
  const [activeModal, setActiveModal] = useState<'guide' | 'contact' | 'stats' | null>(null);

  // Tự động nhận diện đường dẫn ảnh banner và logo phù hợp với cả Localhost và GitHub Pages (/canhbao)
  const [bannerSrc, setBannerSrc] = useState<string>('/images/banner_easup_nature.jpg');
  const [logoSrc, setLogoSrc] = useState<string>('/images/logo_easup.png');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (window.location.pathname.startsWith('/canhbao')) {
        setBannerSrc('/canhbao/images/banner_easup_nature.jpg');
        setLogoSrc('/canhbao/images/logo_easup.png');
      } else {
        setBannerSrc('/images/banner_easup_nature.jpg');
        setLogoSrc('/images/logo_easup.png');
      }
    }
  }, []);

  const handleNavClick = (menuKey: string, targetId?: string) => {
    setActiveMenu(menuKey);
    if (menuKey === 'guide') {
      setActiveModal('guide');
      return;
    }
    if (menuKey === 'contact') {
      setActiveModal('contact');
      return;
    }
    if (menuKey === 'stats') {
      setActiveModal('stats');
      return;
    }
    if (targetId) {
      const el = document.getElementById(targetId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <>
      {/* 1. THANH NÚT CÔNG CỤ ĐIỀU HƯỚNG TRÊN CÙNG CỦA TRANG WEB */}
      <nav
        aria-label="Thanh điều hướng nhanh trên cùng trang web"
        className="relative z-20 w-full bg-slate-950/95 border-b border-slate-800/90 px-3 py-1.5 backdrop-blur-md shadow-md"
      >
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-start gap-2">
          {/* Danh sách các nút menu dạng pill */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => handleNavClick('home')}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                activeMenu === 'home'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700/60'
              }`}
              title="Về đầu trang chủ"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Trang chủ</span>
            </button>

            <button
              onClick={() => handleNavClick('map', 'gis-map-section')}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                activeMenu === 'map'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700/60'
              }`}
              title="Cuộn tới Bản đồ Giám sát WebGIS"
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Bản đồ giám sát</span>
            </button>

            <button
              onClick={() => handleNavClick('alert', 'audio-alert-section')}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                activeMenu === 'alert'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700/60'
              }`}
              title="Cuộn tới Bản tin Cảnh báo Phát thanh"
            >
              <BellRing className="w-3.5 h-3.5" />
              <span>Cảnh báo & Thông tin</span>
            </button>

            <button
              onClick={() => handleNavClick('stats', 'villages-matrix-section')}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                activeMenu === 'stats'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700/60'
              }`}
              title="Xem Thống kê An toàn 20 Thôn Buôn"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Thống kê</span>
            </button>

            <button
              onClick={() => handleNavClick('guide')}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                activeMenu === 'guide'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700/60'
              }`}
              title="Xem Hướng dẫn Quy trình Vận hành PCTT"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Hướng dẫn</span>
            </button>

            <button
              onClick={() => handleNavClick('contact')}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                activeMenu === 'contact'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700/60'
              }`}
              title="Xem Thông tin Liên hệ Trực ban PCTT"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>Liên hệ</span>
            </button>
          </div>
        </div>
      </nav>

      {/* 2. HEADER BANNER - ẢNH THIÊN NHIÊN EA SÚP VỚI LOGO TRUNG TÂM ĐIỀU HÀNH */}
      <header className="relative w-full overflow-hidden border-b border-emerald-600/40 shadow-2xl bg-[#0a192f] min-h-[145px] sm:min-h-[170px] flex items-center">
        {/* Thẻ ảnh <img> toàn cảnh thiên nhiên Ea Súp */}
        <img
          src={bannerSrc}
          alt="Toàn cảnh thiên nhiên núi rừng, hồ Ea Súp và chòi quan sát canh rừng"
          className="absolute inset-0 w-full h-full object-cover object-center select-none"
          onError={(e) => {
            const currentSrc = e.currentTarget.src;
            if (!currentSrc.includes('/canhbao/')) {
              e.currentTarget.src = '/canhbao/images/banner_easup_nature.jpg';
            } else {
              e.currentTarget.src = 'images/banner_easup_nature.jpg';
            }
          }}
        />

        {/* Lớp phủ gradient nhẹ nhàng làm nổi bật chữ */}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/75 via-slate-950/35 to-transparent pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-black/25 pointer-events-none" />

        {/* Bố cục tiêu đề với Logo mới */}
        <div className="relative z-10 max-w-7xl w-full mx-auto px-3 sm:px-5 py-4 sm:py-5 flex items-center justify-between gap-3 flex-1">
          {/* Cụm Tiêu đề: Logo mới (Ảnh 5), Tên đề tài, Tiêu đề chính & Khẩu hiệu */}
          <div className="flex items-center gap-3.5 sm:gap-4 text-center md:text-left">
            {/* LOGO TIÊU ĐỀ WEBSITE (Ảnh 5) */}
            <div className="relative shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-full p-0.5 shadow-[0_0_20px_rgba(0,168,120,0.6)] flex items-center justify-center">
              <img
                src={logoSrc}
                alt="Logo Trung Tâm Điều Hành Cảnh Báo Sớm Thiên Tai & Giám Sát Rừng Xã Ea Súp"
                className="w-full h-full object-contain rounded-full border-2 border-emerald-400 drop-shadow-md bg-slate-950/40"
                onError={(e) => {
                  const currentSrc = e.currentTarget.src;
                  if (!currentSrc.includes('/canhbao/')) {
                    e.currentTarget.src = '/canhbao/images/logo_easup.png';
                  } else {
                    e.currentTarget.src = 'images/logo_easup.png';
                  }
                }}
              />
            </div>

            {/* Khối chữ Tiêu đề Banner */}
            <div className="space-y-1">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-1.5 sm:gap-2">
                <span className="text-[10px] sm:text-xs font-bold tracking-wider uppercase text-amber-300 bg-slate-950/80 border border-amber-400/60 px-2.5 py-0.5 rounded-full font-mono shadow-md backdrop-blur-sm">
                  ĐỀ TÀI NGHIÊN CỨU KHOA HỌC • TRƯỜNG THPT EA SÚP
                </span>
                <span className="text-[10px] sm:text-xs text-slate-100 font-mono bg-black/50 px-2 py-0.5 rounded-full border border-white/20 backdrop-blur-sm hidden sm:inline-block">
                  Nhóm thực hiện: Bảo Trân (10a1) - Phương Trang (10a3)
                </span>
              </div>

              <h1 className="text-base sm:text-xl lg:text-2xl font-black tracking-tight text-white uppercase drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)] drop-shadow-[0_4px_20px_rgba(0,0,0,0.85)]">
                TRUNG TÂM ĐIỀU HÀNH CẢNH BÁO SỚM THIÊN TAI & GIÁM SÁT RỪNG
              </h1>

              <div className="flex items-center justify-center md:justify-start gap-2 text-xs sm:text-sm text-emerald-300 font-semibold italic drop-shadow-[0_1px_8px_rgba(0,0,0,0.9)]">
                <span>"Vì một Ea Súp xanh – sạch – an toàn"</span>
                <span className="inline-block text-emerald-400 not-italic">🌿</span>
                <span className="text-slate-200 not-italic hidden lg:inline font-sans font-normal">• Xã Ea Súp, Tỉnh Đắk Lắk</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* 3. MODAL HƯỚNG DẪN QUY TRÌNH PCTT */}
      {activeModal === 'guide' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="relative max-w-xl w-full bg-slate-900 border border-emerald-500/50 rounded-2xl p-5 shadow-2xl text-slate-100">
            <button
              onClick={() => setActiveModal(null)}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-base mb-3 border-b border-slate-800 pb-2">
              <BookOpen className="w-5 h-5 text-emerald-400" />
              <span>HƯỚNG DẪN QUY TRÌNH VẬN HÀNH THÔNG MINH</span>
            </div>
            <div className="space-y-3 text-xs text-slate-300 leading-relaxed font-sans">
              <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800">
                <strong className="text-amber-300 block mb-1">1. Giám sát Cháy rừng Vệ tinh FIRMS:</strong>
                Hệ thống thu nhận ảnh nhiệt vệ tinh VIIRS/MODIS. FRP &ge; 5.0 MW kích hoạt cảnh báo, trạm IoT TK-293 phát hiện khói &gt; 50 ppm lập tức chuyển báo động đỏ dưới 30 giây.
              </div>
              <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800">
                <strong className="text-blue-300 block mb-1">2. Giám sát Thủy văn Hồ Đập:</strong>
                Radar siêu âm theo dõi cao trình Hồ Thượng (báo động khi &ge; 210.0m hoặc dâng &gt; 30cm/h). Hồ Hạ kiểm soát tuyệt đối cấm lồng bè bảo vệ nước sạch sinh hoạt.
              </div>
              <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800">
                <strong className="text-emerald-300 block mb-1">3. Cụm Loa Truyền Thanh Số:</strong>
                Phát thanh tự động đa kênh với máy đọc giọng nữ tiếng Việt chuẩn tốc độ 1.4X đọc nội dung cảnh báo chi tiết.
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setActiveModal(null)}
                className="px-4 py-1.5 rounded-lg bg-emerald-600 text-white font-semibold text-xs hover:bg-emerald-500"
              >
                Đã hiểu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. MODAL THÔNG TIN LIÊN HỆ TRỰC CHIẾN */}
      {activeModal === 'contact' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="relative max-w-lg w-full bg-slate-900 border border-blue-500/50 rounded-2xl p-5 shadow-2xl text-slate-100">
            <button
              onClick={() => setActiveModal(null)}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 text-blue-400 font-bold text-base mb-3 border-b border-slate-800 pb-2">
              <PhoneCall className="w-5 h-5 text-blue-400" />
              <span>BAN CHỈ HUY PCTT & TKCN XÃ EA SÚP</span>
            </div>
            <div className="space-y-2.5 text-xs text-slate-300 font-sans">
              <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 flex justify-between items-center">
                <span>Trực ban PCTT UBND xã Ea Súp:</span>
                <strong className="text-emerald-400 font-mono text-sm">0262.3688.114</strong>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 flex justify-between items-center">
                <span>Hạt Kiểm lâm / Tuần tra TK-293:</span>
                <strong className="text-amber-400 font-mono text-sm">0262.3688.225</strong>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 flex justify-between items-center">
                <span>Đội quản lý Thủy nông Hồ Ea Súp Thượng:</span>
                <strong className="text-blue-400 font-mono text-sm">0262.3688.336</strong>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 flex justify-between items-center">
                <span>Nhóm thực hiện Đề tài (THPT Ea Súp):</span>
                <strong className="text-purple-300 font-mono">Lê Trần Bảo Trân - Lê Phương Trang</strong>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setActiveModal(null)}
                className="px-4 py-1.5 rounded-lg bg-blue-600 text-white font-semibold text-xs hover:bg-blue-500"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. MODAL THỐNG KÊ NHANH */}
      {activeModal === 'stats' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="relative max-w-xl w-full bg-slate-900 border border-amber-500/50 rounded-2xl p-5 shadow-2xl text-slate-100">
            <button
              onClick={() => setActiveModal(null)}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 text-amber-400 font-bold text-base mb-3 border-b border-slate-800 pb-2">
              <BarChart3 className="w-5 h-5 text-amber-400" />
              <span>TỔNG HỢP AN TOÀN ĐỊA BÀN XÃ EA SÚP</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs font-mono my-3">
              <div className="p-3 rounded-lg bg-slate-950/80 border border-emerald-500/40">
                <div className="text-xl font-bold text-emerald-400">20/20</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Thôn Buôn Trực Tuyến</div>
              </div>
              <div className="p-3 rounded-lg bg-slate-950/80 border border-blue-500/40">
                <div className="text-xl font-bold text-blue-400">146M m³</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Dung Tích Hồ Thượng</div>
              </div>
              <div className="p-3 rounded-lg bg-slate-950/80 border border-amber-500/40">
                <div className="text-xl font-bold text-amber-400">25 Năm</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Chuỗi Ảnh Vệ Tinh</div>
              </div>
              <div className="p-3 rounded-lg bg-slate-950/80 border border-rose-500/40">
                <div className="text-xl font-bold text-rose-400">&lt; 30s</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Kích Hoạt Báo Động</div>
              </div>
            </div>
            <p className="text-xs text-slate-300 italic text-center">
              Dữ liệu được tích hợp đa tầng giữa ảnh viễn thám NASA và mạng cảm biến IoT môi trường xã Ea Súp.
            </p>
            <div className="mt-4 pt-3 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setActiveModal(null)}
                className="px-4 py-1.5 rounded-lg bg-amber-600 text-white font-semibold text-xs hover:bg-amber-500"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
