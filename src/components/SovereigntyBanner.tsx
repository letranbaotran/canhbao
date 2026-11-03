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
  Menu,
} from 'lucide-react';

export const SovereigntyBanner: React.FC = () => {
  const [activeMenu, setActiveMenu] = useState<string>('home');
  const [activeModal, setActiveModal] = useState<'guide' | 'contact' | 'stats' | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

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
    setIsMobileMenuOpen(false);
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
        className="relative z-30 w-full bg-[#0A4393] border-b border-white/20 px-3 py-1.5 shadow-md"
      >
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-1.5">
          {/* Thanh trên cùng trên điện thoại: Nút 3 gạch ngang (Hamburger) + Tiêu đề rút gọn */}
          <div className="flex sm:hidden items-center justify-between w-full py-0.5">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
              <span className="text-xs font-semibold text-white">Menu Điều hành</span>
            </div>

            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/15 border border-white/30 text-white hover:bg-white/25 focus:outline-none transition-all shadow-sm"
              aria-label="Mở menu công cụ điều hướng"
              title="Mở menu công cụ điều hướng"
            >
              {isMobileMenuOpen ? (
                <>
                  <X className="w-4 h-4 text-white" />
                  <span className="text-[11px] font-medium text-white">Đóng</span>
                </>
              ) : (
                <>
                  <Menu className="w-4 h-4 text-white" />
                  <span className="text-[11px] font-medium text-white">Công cụ</span>
                </>
              )}
            </button>
          </div>

          {/* Danh sách các nút menu trên Máy tính & Tablet (Ẩn trên điện thoại) */}
          <div className="hidden sm:flex flex-wrap items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => handleNavClick('home')}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                activeMenu === 'home'
                  ? 'bg-white text-[#0A4393] shadow-sm font-bold'
                  : 'bg-white/15 text-white hover:bg-white/25 border border-white/25'
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
                  ? 'bg-white text-[#0A4393] shadow-sm font-bold'
                  : 'bg-white/15 text-white hover:bg-white/25 border border-white/25'
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
                  ? 'bg-white text-[#0A4393] shadow-sm font-bold'
                  : 'bg-white/15 text-white hover:bg-white/25 border border-white/25'
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
                  ? 'bg-white text-[#0A4393] shadow-sm font-bold'
                  : 'bg-white/15 text-white hover:bg-white/25 border border-white/25'
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
                  ? 'bg-white text-[#0A4393] shadow-sm font-bold'
                  : 'bg-white/15 text-white hover:bg-white/25 border border-white/25'
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
                  ? 'bg-white text-[#0A4393] shadow-sm font-bold'
                  : 'bg-white/15 text-white hover:bg-white/25 border border-white/25'
              }`}
              title="Xem Thông tin Liên hệ Trực ban PCTT"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>Liên hệ</span>
            </button>
          </div>

          {/* Menu xổ xuống trên điện thoại khi bấm vào nút 3 gạch ngang */}
          {isMobileMenuOpen && (
            <div className="sm:hidden w-full pt-2 pb-1 border-t border-white/20 flex flex-col gap-1.5 animate-fadeIn">
              <button
                onClick={() => handleNavClick('home')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all text-left ${
                  activeMenu === 'home'
                    ? 'bg-white text-[#0A4393] shadow-md font-bold'
                    : 'bg-white/10 text-white hover:bg-white/20 border border-white/20'
                }`}
              >
                <Home className="w-4 h-4 shrink-0" />
                <span>Trang chủ</span>
              </button>

              <button
                onClick={() => handleNavClick('map', 'gis-map-section')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all text-left ${
                  activeMenu === 'map'
                    ? 'bg-white text-[#0A4393] shadow-md font-bold'
                    : 'bg-white/10 text-white hover:bg-white/20 border border-white/20'
                }`}
              >
                <MapPin className="w-4 h-4 shrink-0" />
                <span>Bản đồ giám sát</span>
              </button>

              <button
                onClick={() => handleNavClick('alert', 'audio-alert-section')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all text-left ${
                  activeMenu === 'alert'
                    ? 'bg-white text-[#0A4393] shadow-md font-bold'
                    : 'bg-white/10 text-white hover:bg-white/20 border border-white/20'
                }`}
              >
                <BellRing className="w-4 h-4 shrink-0" />
                <span>Cảnh báo & Thông tin</span>
              </button>

              <button
                onClick={() => handleNavClick('stats', 'villages-matrix-section')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all text-left ${
                  activeMenu === 'stats'
                    ? 'bg-white text-[#0A4393] shadow-md font-bold'
                    : 'bg-white/10 text-white hover:bg-white/20 border border-white/20'
                }`}
              >
                <BarChart3 className="w-4 h-4 shrink-0" />
                <span>Thống kê</span>
              </button>

              <button
                onClick={() => handleNavClick('guide')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all text-left ${
                  activeMenu === 'guide'
                    ? 'bg-white text-[#0A4393] shadow-md font-bold'
                    : 'bg-white/10 text-white hover:bg-white/20 border border-white/20'
                }`}
              >
                <BookOpen className="w-4 h-4 shrink-0" />
                <span>Hướng dẫn</span>
              </button>

              <button
                onClick={() => handleNavClick('contact')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all text-left ${
                  activeMenu === 'contact'
                    ? 'bg-white text-[#0A4393] shadow-md font-bold'
                    : 'bg-white/10 text-white hover:bg-white/20 border border-white/20'
                }`}
              >
                <PhoneCall className="w-4 h-4 shrink-0" />
                <span>Liên hệ</span>
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* 2. HEADER BANNER - ẢNH THIÊN NHIÊN EA SÚP VỚI LOGO TRUNG TÂM ĐIỀU HÀNH */}
      <header className="relative w-full overflow-hidden border-b-2 border-[#0A4393] shadow-lg bg-[#0A4393] min-h-[145px] sm:min-h-[170px] flex items-center">
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

        {/* Lớp phủ gradient xanh da trời làm nổi bật chữ trắng */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0A4393]/85 via-[#0A4393]/45 to-transparent pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A4393]/80 via-transparent to-black/20 pointer-events-none" />

        {/* Bố cục tiêu đề với Logo mới */}
        <div className="relative z-10 max-w-7xl w-full mx-auto px-3 sm:px-5 py-4 sm:py-5 flex items-center justify-between gap-3 flex-1">
          {/* Cụm Tiêu đề: Logo mới (Ảnh 5), Tên đề tài, Tiêu đề chính & Khẩu hiệu */}
          <div className="flex items-center gap-3.5 sm:gap-4 text-center md:text-left">
            {/* LOGO TIÊU ĐỀ WEBSITE (Ảnh 5) */}
            <div className="relative shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-full p-0.5 shadow-[0_0_20px_rgba(255,255,255,0.6)] flex items-center justify-center">
              <img
                src={logoSrc}
                alt="Logo Trung Tâm Điều Hành Cảnh Báo Sớm Thiên Tai & Giám Sát Rừng Xã Ea Súp"
                className="w-full h-full object-contain rounded-full border-2 border-white drop-shadow-md bg-white/95"
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
                <span className="text-[10px] sm:text-xs font-bold tracking-wider uppercase text-[#0A4393] bg-white border border-white px-2.5 py-0.5 rounded-full font-mono shadow-md">
                  ĐỀ TÀI NGHIÊN CỨU KHOA HỌC • TRƯỜNG THPT EA SÚP
                </span>
                <span className="text-[10px] sm:text-xs text-white font-mono bg-[#0A4393]/85 px-2.5 py-0.5 rounded-full border border-white/40 backdrop-blur-sm hidden sm:inline-block">
                  Nhóm thực hiện: Bảo Trân (10a1) - Phương Trang (10a3)
                </span>
              </div>

              <h1 className="text-base sm:text-xl lg:text-2xl font-black tracking-tight text-white uppercase drop-shadow-[0_2px_10px_rgba(0,0,0,0.85)]">
                TRUNG TÂM ĐIỀU HÀNH CẢNH BÁO SỚM THIÊN TAI & GIÁM SÁT RỪNG
              </h1>

              <div className="flex items-center justify-center md:justify-start gap-2 text-xs sm:text-sm text-white font-semibold italic drop-shadow-[0_1px_6px_rgba(0,0,0,0.8)]">
                <span>"Vì một Ea Súp xanh – sạch – an toàn"</span>
                <span className="inline-block not-italic">🌿</span>
                <span className="text-blue-100 not-italic hidden lg:inline font-sans font-normal">• Xã Ea Súp, Tỉnh Đắk Lắk</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* 3. MODAL HƯỚNG DẪN QUY TRÌNH PCTT */}
      {activeModal === 'guide' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A4393]/50 backdrop-blur-sm animate-fadeIn">
          <div className="relative max-w-xl w-full bg-white border-2 border-[#0A4393] rounded-2xl p-5 shadow-2xl text-slate-800">
            <button
              onClick={() => setActiveModal(null)}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-[#F0F6FF] text-[#0A4393] hover:bg-[#0A4393] hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 text-[#0A4393] font-bold text-base mb-3 border-b border-[#0A4393]/20 pb-2">
              <BookOpen className="w-5 h-5 text-[#0A4393]" />
              <span>HƯỚNG DẪN QUY TRÌNH VẬN HÀNH THÔNG MINH</span>
            </div>
            <div className="space-y-3 text-xs text-slate-700 leading-relaxed font-sans">
              <div className="p-3 rounded-lg bg-[#F0F6FF] border border-[#0A4393]/20">
                <strong className="text-[#0A4393] block mb-1">1. Giám sát Cháy rừng Vệ tinh FIRMS:</strong>
                Hệ thống thu nhận ảnh nhiệt vệ tinh VIIRS/MODIS. FRP &ge; 5.0 MW kích hoạt cảnh báo, trạm IoT TK-293 phát hiện khói &gt; 50 ppm lập tức chuyển báo động đỏ dưới 30 giây.
              </div>
              <div className="p-3 rounded-lg bg-[#F0F6FF] border border-[#0A4393]/20">
                <strong className="text-[#0A4393] block mb-1">2. Giám sát Thủy văn Hồ Đập:</strong>
                Radar siêu âm theo dõi cao trình Hồ Thượng (báo động khi &ge; 210.0m hoặc dâng &gt; 30cm/h). Hồ Hạ kiểm soát tuyệt đối cấm lồng bè bảo vệ nước sạch sinh hoạt.
              </div>
              <div className="p-3 rounded-lg bg-[#F0F6FF] border border-[#0A4393]/20">
                <strong className="text-[#0A4393] block mb-1">3. Cụm Loa Truyền Thanh Số:</strong>
                Phát thanh tự động đa kênh với máy đọc giọng nữ tiếng Việt chuẩn tốc độ 1.4X đọc nội dung cảnh báo chi tiết.
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-[#0A4393]/20 flex justify-end">
              <button
                onClick={() => setActiveModal(null)}
                className="px-4 py-1.5 rounded-lg bg-[#0A4393] text-white font-semibold text-xs hover:bg-[#083576]"
              >
                Đã hiểu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. MODAL THÔNG TIN LIÊN HỆ TRỰC CHIẾN */}
      {activeModal === 'contact' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A4393]/50 backdrop-blur-sm animate-fadeIn">
          <div className="relative max-w-lg w-full bg-white border-2 border-[#0A4393] rounded-2xl p-5 shadow-2xl text-slate-800">
            <button
              onClick={() => setActiveModal(null)}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-[#F0F6FF] text-[#0A4393] hover:bg-[#0A4393] hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 text-[#0A4393] font-bold text-base mb-3 border-b border-[#0A4393]/20 pb-2">
              <PhoneCall className="w-5 h-5 text-[#0A4393]" />
              <span>BAN CHỈ HUY PCTT & TKCN XÃ EA SÚP</span>
            </div>
            <div className="space-y-2.5 text-xs text-slate-700 font-sans">
              <div className="p-2.5 rounded-lg bg-[#F0F6FF] border border-[#0A4393]/20 flex justify-between items-center">
                <span>Trực ban PCTT UBND xã Ea Súp:</span>
                <strong className="text-[#0A4393] font-mono text-sm">0262.3688.114</strong>
              </div>
              <div className="p-2.5 rounded-lg bg-[#F0F6FF] border border-[#0A4393]/20 flex justify-between items-center">
                <span>Hạt Kiểm lâm / Tuần tra TK-293:</span>
                <strong className="text-[#0A4393] font-mono text-sm">0262.3688.225</strong>
              </div>
              <div className="p-2.5 rounded-lg bg-[#F0F6FF] border border-[#0A4393]/20 flex justify-between items-center">
                <span>Đội quản lý Thủy nông Hồ Ea Súp Thượng:</span>
                <strong className="text-[#0A4393] font-mono text-sm">0262.3688.336</strong>
              </div>
              <div className="p-2.5 rounded-lg bg-[#F0F6FF] border border-[#0A4393]/20 flex justify-between items-center">
                <span>Nhóm thực hiện Đề tài (THPT Ea Súp):</span>
                <strong className="text-[#0A4393] font-mono">Lê Trần Bảo Trân - Lê Phương Trang</strong>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-[#0A4393]/20 flex justify-end">
              <button
                onClick={() => setActiveModal(null)}
                className="px-4 py-1.5 rounded-lg bg-[#0A4393] text-white font-semibold text-xs hover:bg-[#083576]"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. MODAL THỐNG KÊ NHANH */}
      {activeModal === 'stats' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A4393]/50 backdrop-blur-sm animate-fadeIn">
          <div className="relative max-w-xl w-full bg-white border-2 border-[#0A4393] rounded-2xl p-5 shadow-2xl text-slate-800">
            <button
              onClick={() => setActiveModal(null)}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-[#F0F6FF] text-[#0A4393] hover:bg-[#0A4393] hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 text-[#0A4393] font-bold text-base mb-3 border-b border-[#0A4393]/20 pb-2">
              <BarChart3 className="w-5 h-5 text-[#0A4393]" />
              <span>TỔNG HỢP AN TOÀN ĐỊA BÀN XÃ EA SÚP</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs font-mono my-3">
              <div className="p-3 rounded-lg bg-[#F0F6FF] border border-[#0A4393]/30">
                <div className="text-xl font-bold text-[#0A4393]">20/20</div>
                <div className="text-[10px] text-slate-600 mt-0.5">Thôn Buôn Trực Tuyến</div>
              </div>
              <div className="p-3 rounded-lg bg-[#F0F6FF] border border-[#0A4393]/30">
                <div className="text-xl font-bold text-[#0A4393]">146M m³</div>
                <div className="text-[10px] text-slate-600 mt-0.5">Dung Tích Hồ Thượng</div>
              </div>
              <div className="p-3 rounded-lg bg-[#F0F6FF] border border-[#0A4393]/30">
                <div className="text-xl font-bold text-[#0A4393]">25 Năm</div>
                <div className="text-[10px] text-slate-600 mt-0.5">Chuỗi Ảnh Vệ Tinh</div>
              </div>
              <div className="p-3 rounded-lg bg-[#F0F6FF] border border-[#0A4393]/30">
                <div className="text-xl font-bold text-rose-600">&lt; 30s</div>
                <div className="text-[10px] text-slate-600 mt-0.5">Kích Hoạt Báo Động</div>
              </div>
            </div>
            <p className="text-xs text-slate-600 italic text-center">
              Dữ liệu được tích hợp đa tầng giữa ảnh viễn thám NASA và mạng cảm biến IoT môi trường xã Ea Súp.
            </p>
            <div className="mt-4 pt-3 border-t border-[#0A4393]/20 flex justify-end">
              <button
                onClick={() => setActiveModal(null)}
                className="px-4 py-1.5 rounded-lg bg-[#0A4393] text-white font-semibold text-xs hover:bg-[#083576]"
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
