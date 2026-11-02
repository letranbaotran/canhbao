'use client';

import React, { useState } from 'react';
import {
  Home,
  MapPin,
  BellRing,
  BarChart3,
  BookOpen,
  PhoneCall,
  ShieldCheck,
  X,
  Radio,
} from 'lucide-react';

export const SovereigntyBanner: React.FC = () => {
  const [activeMenu, setActiveMenu] = useState<string>('home');
  const [activeModal, setActiveModal] = useState<'guide' | 'contact' | 'stats' | null>(null);

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
      {/* 1. HEADER BANNER - ẢNH THIÊN NHIÊN EA SÚP SẮC NÉT & BỐ CỤC CHUYÊN NGHIỆP */}
      <header className="relative w-full overflow-hidden border-b border-emerald-500/30 shadow-xl bg-slate-950">
        {/* Nền ảnh thiên nhiên Ea Súp chính xác từ ảnh người dùng tải lên */}
        <div
          className="absolute inset-0 bg-cover bg-center sm:bg-top filter contrast-[1.08] brightness-[0.98]"
          style={{
            backgroundImage: "url('/images/banner_easup_nature.jpg')",
          }}
        />

        {/* Lớp phủ gradient chuyển sắc tinh tế: làm nổi bật khối chữ bên trái và giữ trọn vẹn cảnh núi hồ, chòi canh bên phải */}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/60 to-slate-950/30" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-black/30 pointer-events-none" />

        {/* Bố cục nội dung trên banner */}
        <div className="relative max-w-7xl mx-auto px-4 py-4 sm:py-5 flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Cụm Trái: Quốc huy, Cơ quan / Đề tài, Tiêu đề chính & Khẩu hiệu */}
          <div className="flex items-center gap-3.5 sm:gap-4 text-center md:text-left">
            {/* Quốc huy Việt Nam trang nghiêm */}
            <div className="relative shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-tr from-rose-600 via-amber-500 to-rose-700 p-0.5 shadow-[0_0_15px_rgba(244,63,94,0.5)] flex items-center justify-center">
              <div className="w-full h-full rounded-full bg-rose-700 flex flex-col items-center justify-center border border-amber-300">
                <span className="text-amber-300 font-serif text-lg sm:text-xl font-bold leading-none">★</span>
                <span className="text-[7px] text-amber-200 font-bold uppercase tracking-tighter mt-0.5">VIỆT NAM</span>
              </div>
            </div>

            {/* Khối chữ Tiêu đề Banner */}
            <div>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                <span className="text-[10px] sm:text-[11px] font-bold tracking-wider uppercase text-amber-300 bg-amber-950/70 border border-amber-500/50 px-2 py-0.5 rounded font-mono shadow-sm">
                  ĐỀ TÀI NGHIÊN CỨU KHOA HỌC • TRƯỜNG THPT EA SÚP
                </span>
                <span className="hidden sm:inline-block text-[11px] text-slate-200 font-mono">
                  Bảo Trân (10a1) - Phương Trang (10a3)
                </span>
              </div>

              <h1 className="text-base sm:text-xl lg:text-2xl font-black tracking-tight text-white uppercase drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] mt-1">
                TRUNG TÂM ĐIỀU HÀNH CẢNH BÁO SỚM THIÊN TAI & GIÁM SÁT RỪNG
              </h1>

              <div className="flex items-center justify-center md:justify-start gap-2 text-xs sm:text-sm text-emerald-300 font-medium italic mt-0.5 drop-shadow-md">
                <span>"Vì một Ea Súp xanh – sạch – an toàn"</span>
                <span className="inline-block text-emerald-400 not-italic">🌿</span>
                <span className="text-slate-400 not-italic hidden lg:inline">• Xã Ea Súp, Tỉnh Đắk Lắk</span>
              </div>
            </div>
          </div>

          {/* Cụm Phải: Badge Trực chiến 24/7 & Tọa độ địa bàn */}
          <div className="hidden md:flex flex-col items-end gap-1.5 font-mono text-xs">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-950/80 border border-emerald-500/60 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.25)] backdrop-blur-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              <span className="font-semibold text-white">HỆ THỐNG TRỰC CHIẾN 24/7</span>
            </div>
            <span className="text-[11px] text-slate-300 bg-black/40 px-2 py-0.5 rounded border border-slate-700/60">
              Tọa độ: 13°15′B - 107°54′Đ • 20 Thôn Buôn
            </span>
          </div>
        </div>

        {/* 2. THANH MENU ĐIỀU HƯỚNG DẠNG PILL (NAVBAR) HÀI HÒA & CHUYÊN NGHIỆP */}
        <nav
          aria-label="Thanh điều hướng nhanh"
          className="relative w-full bg-slate-950/90 border-t border-slate-800/80 px-3 py-1.5 backdrop-blur-md"
        >
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
            {/* Danh sách các nút menu */}
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

            {/* Trạng thái mạng liên xã bên phải */}
            <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span className="hidden sm:inline">Trạm Ea Súp: Hoạt động bình thường</span>
            </div>
          </div>
        </nav>
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
