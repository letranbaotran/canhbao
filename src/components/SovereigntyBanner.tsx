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
  LogIn,
  LogOut,
  ShieldCheck,
  UserPlus,
  Trash2,
  Eye,
  EyeOff,
  Mail,
} from 'lucide-react';
import {
  AuthUserAccount,
  CurrentSessionUser,
  MapUserRole,
  MASTER_ADMIN_EMAIL,
  AUTH_CHANGED_EVENT,
  adminDeleteUser,
  adminSetUserRole,
  getCurrentSessionUser,
  getRoleLabel,
  getStoredUsers,
  loginWithEmail,
  logoutSession,
  registerWithEmail,
  syncUsersFromServer,
} from '@/services/authRoleService';

export const SovereigntyBanner: React.FC = () => {
  const [activeMenu, setActiveMenu] = useState<string>('home');
  const [activeModal, setActiveModal] = useState<'guide' | 'contact' | 'stats' | 'auth' | null>(null);
  const [authTab, setAuthTab] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  const [bannerSrc, setBannerSrc] = useState<string>('/images/banner_easup_nature.jpg');
  const [logoSrc, setLogoSrc] = useState<string>('/images/logo_easup.png');

  const [currentUser, setCurrentUser] = useState<CurrentSessionUser>({
    email: '',
    fullName: 'Khách',
    role: 'GUEST',
  });
  const [usersList, setUsersList] = useState<AuthUserAccount[]>([]);
  const [emailInput, setEmailInput] = useState<string>('');
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState<string>('');
  const [showPass1, setShowPass1] = useState<boolean>(false);
  const [showPass2, setShowPass2] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Thêm/phân quyền nhanh dành cho Admin
  const [newEmail, setNewEmail] = useState<string>('');
  const [newRole, setNewRole] = useState<MapUserRole>('MAP_EDITOR');
  const [adminMessage, setAdminMessage] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (window.location.pathname.startsWith('/canhbao')) {
        setBannerSrc('/canhbao/images/banner_easup_nature.jpg');
        setLogoSrc('/canhbao/images/logo_easup.png');
      } else {
        setBannerSrc('/images/banner_easup_nature.jpg');
        setLogoSrc('/images/logo_easup.png');
      }

      setUsersList(getStoredUsers());
      setCurrentUser(getCurrentSessionUser());

      syncUsersFromServer().then((serverUsers) => {
        setUsersList(serverUsers);
        setCurrentUser(getCurrentSessionUser());
      });

      const handleAuthChanged = () => {
        setCurrentUser(getCurrentSessionUser());
        setUsersList(getStoredUsers());
      };
      window.addEventListener(AUTH_CHANGED_EVENT, handleAuthChanged);
      return () => {
        window.removeEventListener(AUTH_CHANGED_EVENT, handleAuthChanged);
      };
    }
  }, []);

  const openAuthModal = (tab: 'LOGIN' | 'REGISTER') => {
    setAuthTab(tab);
    setAuthError(null);
    setAdminMessage(null);
    setPasswordInput('');
    setConfirmPasswordInput('');
    setIsMobileMenuOpen(false);
    setActiveModal('auth');
  };

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

  const handleAuthSubmit = async () => {
    if (isSubmitting) return;
    setAuthError(null);
    setIsSubmitting(true);

    try {
      const res =
        authTab === 'LOGIN'
          ? await loginWithEmail(emailInput, passwordInput)
          : await registerWithEmail(emailInput, passwordInput, confirmPasswordInput);

      if (!res.ok || !res.user) {
        setAuthError(res.error || 'Thao tác thất bại!');
        setIsSubmitting(false);
        return;
      }

      setCurrentUser(res.user);
      setUsersList(getStoredUsers());
      setEmailInput('');
      setPasswordInput('');
      setConfirmPasswordInput('');
      setIsSubmitting(false);

      if (res.user.role !== 'ADMIN') {
        setActiveModal(null);
      }
    } catch {
      setAuthError('Có lỗi xảy ra, vui lòng thử lại!');
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => {
    logoutSession();
    setCurrentUser({ email: '', fullName: 'Khách', role: 'GUEST' });
    setAdminMessage(null);
  };

  const handleCreateOrAssignUser = async () => {
    setAdminMessage(null);
    const cleanEmail = newEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setAdminMessage('Email không hợp lệ!');
      return;
    }
    const res = await adminSetUserRole(cleanEmail, newRole);
    if (res.ok) {
      setUsersList(res.users);
      setNewEmail('');
      setAdminMessage(`Đã cấp quyền cho ${cleanEmail}`);
    } else {
      setAdminMessage(res.error || 'Lỗi cập nhật');
    }
  };

  const handleChangeUserRole = async (targetEmail: string, updatedRole: MapUserRole) => {
    if ((targetEmail || '').toLowerCase() === MASTER_ADMIN_EMAIL && updatedRole !== 'ADMIN') {
      return;
    }
    const res = await adminSetUserRole(targetEmail, updatedRole);
    if (res.ok) {
      setUsersList(res.users);
    }
  };

  const handleDeleteUser = async (targetEmail: string) => {
    if ((targetEmail || '').toLowerCase() === MASTER_ADMIN_EMAIL) {
      return;
    }
    const res = await adminDeleteUser(targetEmail);
    if (res.ok) {
      setUsersList(res.users);
      if ((currentUser.email || '').toLowerCase() === targetEmail.toLowerCase()) {
        handleLogout();
      }
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
          {/* Thanh trên cùng trên điện thoại */}
          <div className="flex sm:hidden items-center justify-between w-full py-0.5">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
              <span className="text-xs font-semibold text-white">Menu Điều hành</span>
            </div>

            <div className="flex items-center gap-1">
              {!currentUser.email ? (
                <>
                  <button
                    onClick={() => openAuthModal('LOGIN')}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold bg-amber-400 text-[#0A4393] hover:bg-amber-300 shadow-sm"
                  >
                    <LogIn className="w-3 h-3" />
                    <span>Đăng nhập</span>
                  </button>
                  <button
                    onClick={() => openAuthModal('REGISTER')}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold bg-white text-[#0A4393] hover:bg-blue-50 shadow-sm"
                  >
                    <UserPlus className="w-3 h-3" />
                    <span>Đăng ký</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={() => openAuthModal('LOGIN')}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold bg-emerald-500 text-white hover:bg-emerald-600 shadow-sm"
                >
                  <ShieldCheck className="w-3 h-3" />
                  <span className="max-w-[100px] truncate">{currentUser.email}</span>
                </button>
              )}

              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/15 border border-white/30 text-white hover:bg-white/25 focus:outline-none transition-all shadow-sm"
                aria-label="Mở menu công cụ điều hướng"
              >
                {isMobileMenuOpen ? <X className="w-4 h-4 text-white" /> : <Menu className="w-4 h-4 text-white" />}
              </button>
            </div>
          </div>

          {/* Danh sách các nút menu trên Máy tính & Tablet */}
          <div className="hidden sm:flex flex-wrap items-center justify-between w-full gap-2">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <button
                onClick={() => handleNavClick('home')}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                  activeMenu === 'home'
                    ? 'bg-white text-[#0A4393] shadow-sm font-bold'
                    : 'bg-white/15 text-white hover:bg-white/25 border border-white/25'
                }`}
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
              >
                <PhoneCall className="w-3.5 h-3.5" />
                <span>Liên hệ</span>
              </button>
            </div>

            {/* Cụm Nút Đăng Nhập & Đăng Ký bên phải thanh điều hướng */}
            <div className="flex items-center gap-1.5">
              {!currentUser.email ? (
                <>
                  <button
                    onClick={() => openAuthModal('LOGIN')}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-400 text-[#0A4393] hover:bg-amber-300 shadow-sm transition-all cursor-pointer"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Đăng nhập</span>
                  </button>
                  <button
                    onClick={() => openAuthModal('REGISTER')}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white text-[#0A4393] hover:bg-blue-50 shadow-sm transition-all cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Đăng ký</span>
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => openAuthModal('LOGIN')}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500 text-white hover:bg-emerald-600 border border-white/40 shadow-sm transition-all cursor-pointer"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>
                      {currentUser.email} ({getRoleLabel(currentUser.role)})
                    </span>
                  </button>
                  <button
                    onClick={handleLogout}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-600 text-white hover:bg-rose-700 border border-white/30 shadow-sm transition-all cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Thoát</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Menu xổ xuống trên điện thoại */}
          {isMobileMenuOpen && (
            <div className="sm:hidden w-full pt-2 pb-1 border-t border-white/20 flex flex-col gap-1.5 animate-fadeIn">
              <button
                onClick={() => handleNavClick('home')}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold bg-white/10 text-white hover:bg-white/20 text-left"
              >
                <Home className="w-4 h-4 shrink-0" />
                <span>Trang chủ</span>
              </button>
              <button
                onClick={() => handleNavClick('map', 'gis-map-section')}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold bg-white/10 text-white hover:bg-white/20 text-left"
              >
                <MapPin className="w-4 h-4 shrink-0" />
                <span>Bản đồ giám sát</span>
              </button>
              <button
                onClick={() => handleNavClick('alert', 'audio-alert-section')}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold bg-white/10 text-white hover:bg-white/20 text-left"
              >
                <BellRing className="w-4 h-4 shrink-0" />
                <span>Cảnh báo & Thông tin</span>
              </button>
              <button
                onClick={() => handleNavClick('stats', 'villages-matrix-section')}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold bg-white/10 text-white hover:bg-white/20 text-left"
              >
                <BarChart3 className="w-4 h-4 shrink-0" />
                <span>Thống kê</span>
              </button>
              <button
                onClick={() => handleNavClick('guide')}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold bg-white/10 text-white hover:bg-white/20 text-left"
              >
                <BookOpen className="w-4 h-4 shrink-0" />
                <span>Hướng dẫn</span>
              </button>
              <button
                onClick={() => handleNavClick('contact')}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold bg-white/10 text-white hover:bg-white/20 text-left"
              >
                <PhoneCall className="w-4 h-4 shrink-0" />
                <span>Liên hệ</span>
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* 2. HEADER BANNER */}
      <header className="relative w-full overflow-hidden border-b-2 border-[#0A4393] shadow-lg bg-[#0A4393] min-h-[145px] sm:min-h-[170px] flex items-center">
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
        <div className="absolute inset-0 bg-gradient-to-r from-[#0A4393]/85 via-[#0A4393]/45 to-transparent pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A4393]/80 via-transparent to-black/20 pointer-events-none" />

        <div className="relative z-10 max-w-7xl w-full mx-auto px-3 sm:px-5 py-4 sm:py-5 flex items-center justify-between gap-3 flex-1">
          <div className="flex items-center gap-3.5 sm:gap-4 text-center md:text-left">
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

            <div className="space-y-1">
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

      {/* 3. MODAL HƯỚNG DẪN */}
      {activeModal === 'guide' && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-[#0A4393]/60 backdrop-blur-sm animate-fadeIn"
          onClick={() => setActiveModal(null)}
        >
          <div
            className="relative max-w-xl w-full bg-white border-2 border-[#0A4393] rounded-2xl p-5 shadow-2xl text-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
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

      {/* 4. MODAL LIÊN HỆ */}
      {activeModal === 'contact' && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-[#0A4393]/60 backdrop-blur-sm animate-fadeIn"
          onClick={() => setActiveModal(null)}
        >
          <div
            className="relative max-w-lg w-full bg-white border-2 border-[#0A4393] rounded-2xl p-5 shadow-2xl text-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
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

      {/* 5. MODAL THỐNG KÊ */}
      {activeModal === 'stats' && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-[#0A4393]/60 backdrop-blur-sm animate-fadeIn"
          onClick={() => setActiveModal(null)}
        >
          <div
            className="relative max-w-xl w-full bg-white border-2 border-[#0A4393] rounded-2xl p-5 shadow-2xl text-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
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

      {/* 6. MODAL ĐĂNG NHẬP / ĐĂNG KÝ / PHÂN QUYỀN GỌN NHẸ (KHÔNG HƯỚNG DẪN, KHÔNG GỢI Ý) */}
      {activeModal === 'auth' && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-[#0A4393]/65 backdrop-blur-sm animate-fadeIn"
          onClick={() => setActiveModal(null)}
        >
          <div
            className="relative max-w-md w-full bg-white border-2 border-[#0A4393] rounded-2xl p-4 shadow-2xl text-slate-800 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setActiveModal(null)}
              className="absolute top-3.5 right-3.5 p-1 rounded-full bg-[#F0F6FF] text-[#0A4393] hover:bg-[#0A4393] hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            {!currentUser.email ? (
              <div
                className="space-y-3"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAuthSubmit();
                  }
                }}
              >
                {/* Chuyển tab Đăng nhập / Đăng ký */}
                <div className="flex items-center gap-1 p-1 bg-[#F0F6FF] rounded-xl mr-7">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthTab('LOGIN');
                      setAuthError(null);
                    }}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      authTab === 'LOGIN'
                        ? 'bg-[#0A4393] text-white shadow-sm'
                        : 'text-[#0A4393] hover:bg-white/60'
                    }`}
                  >
                    Đăng nhập
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthTab('REGISTER');
                      setAuthError(null);
                    }}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      authTab === 'REGISTER'
                        ? 'bg-[#0A4393] text-white shadow-sm'
                        : 'text-[#0A4393] hover:bg-white/60'
                    }`}
                  >
                    Đăng ký
                  </button>
                </div>

                {authError && (
                  <div className="p-2 rounded-lg bg-rose-50 border border-rose-300 text-rose-700 text-xs font-semibold">
                    {authError}
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      inputMode="email"
                      autoComplete="off"
                      data-lpignore="true"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      placeholder="Email"
                      className="w-full pl-9 pr-3 py-2 rounded-lg border border-[#0A4393]/40 text-xs focus:outline-none focus:ring-2 focus:ring-[#0A4393]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Mật khẩu
                  </label>
                  <div className="relative">
                    <input
                      type={showPass1 ? 'text' : 'password'}
                      autoComplete="new-password"
                      data-lpignore="true"
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      placeholder="Mật khẩu"
                      className="w-full pl-3 pr-9 py-2 rounded-lg border border-[#0A4393]/40 text-xs focus:outline-none focus:ring-2 focus:ring-[#0A4393]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass1(!showPass1)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-[#0A4393] p-0.5"
                    >
                      {showPass1 ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {authTab === 'REGISTER' && (
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Nhập lại mật khẩu
                    </label>
                    <div className="relative">
                      <input
                        type={showPass2 ? 'text' : 'password'}
                        autoComplete="new-password"
                        data-lpignore="true"
                        value={confirmPasswordInput}
                        onChange={(e) => setConfirmPasswordInput(e.target.value)}
                        placeholder="Nhập lại mật khẩu"
                        className="w-full pl-3 pr-9 py-2 rounded-lg border border-[#0A4393]/40 text-xs focus:outline-none focus:ring-2 focus:ring-[#0A4393]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass2(!showPass2)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-[#0A4393] p-0.5"
                      >
                        {showPass2 ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleAuthSubmit}
                  disabled={isSubmitting}
                  className="w-full py-2 rounded-lg bg-[#0A4393] text-white font-bold text-xs hover:bg-[#083576] shadow-sm transition-all cursor-pointer disabled:opacity-60"
                >
                  {authTab === 'LOGIN' ? 'Đăng nhập' : 'Đăng ký'}
                </button>
              </div>
            ) : (
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 mr-6">
                  <div className="text-xs text-emerald-900 truncate">
                    <strong>{currentUser.email}</strong> ({getRoleLabel(currentUser.role)})
                  </div>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 shrink-0 cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Thoát</span>
                  </button>
                </div>

                {/* BẢNG PHÂN QUYỀN GỌN DÀNH CHO ADMIN */}
                {currentUser.role === 'ADMIN' && (
                  <div className="space-y-2.5 pt-2 border-t border-[#0A4393]/20">
                    <div className="text-xs font-bold text-[#0A4393] flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4" />
                      <span>Phân quyền tài khoản</span>
                    </div>

                    {adminMessage && (
                      <div className="p-2 rounded-lg bg-blue-50 border border-blue-200 text-[#0A4393] text-xs font-semibold">
                        {adminMessage}
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row gap-1.5">
                      <input
                        type="text"
                        inputMode="email"
                        autoComplete="off"
                        data-lpignore="true"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        placeholder="Email"
                        className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs"
                      />
                      <select
                        value={newRole}
                        onChange={(e) => setNewRole(e.target.value as MapUserRole)}
                        className="px-2 py-1.5 rounded-lg border border-[#0A4393]/40 text-xs font-semibold text-[#0A4393] bg-white"
                      >
                        <option value="MAP_EDITOR">Quyền sửa/xóa bản đồ</option>
                        <option value="ADMIN">Toàn quyền</option>
                        <option value="GUEST">Khách</option>
                      </select>
                      <button
                        type="button"
                        onClick={handleCreateOrAssignUser}
                        className="px-3 py-1.5 rounded-lg bg-[#0A4393] text-white text-xs font-bold hover:bg-[#083576] cursor-pointer shrink-0"
                      >
                        Lưu
                      </button>
                    </div>

                    <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl overflow-hidden max-h-52 overflow-y-auto">
                      {usersList
                        .filter((acc) => acc && typeof acc.email === 'string' && acc.email)
                        .map((acc) => {
                          const isMaster =
                            (acc.email || '').toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase();
                          return (
                            <div
                              key={acc.email}
                              className="p-2 bg-white flex items-center justify-between gap-2 text-xs"
                            >
                              <span className="font-semibold text-slate-800 truncate">
                                {acc.email}
                              </span>

                              <div className="flex items-center gap-1 shrink-0">
                                <select
                                  value={acc.role}
                                  disabled={isMaster}
                                  onChange={(e) =>
                                    handleChangeUserRole(
                                      acc.email,
                                      e.target.value as MapUserRole
                                    )
                                  }
                                  className="px-2 py-1 rounded border border-[#0A4393]/30 text-[11px] font-semibold text-[#0A4393] bg-[#F0F6FF] disabled:opacity-60"
                                >
                                  <option value="ADMIN">Toàn quyền</option>
                                  <option value="MAP_EDITOR">Quyền sửa/xóa bản đồ</option>
                                  <option value="GUEST">Khách</option>
                                </select>

                                {!isMaster && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteUser(acc.email)}
                                    className="p-1 rounded border border-rose-200 text-rose-600 hover:bg-rose-600 hover:text-white transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
