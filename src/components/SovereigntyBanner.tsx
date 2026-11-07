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
  Lock,
  KeyRound,
  Satellite,
  Waves,
  Bell,
  Inbox,
  AlertCircle,
  CheckCircle2,
  Image as ImageIcon,
  ExternalLink,
  Clock,
} from 'lucide-react';
import {
  AuthUserAccount,
  CurrentSessionUser,
  MapUserRole,
  MASTER_ADMIN_EMAIL,
  AUTH_CHANGED_EVENT,
  adminDeleteUser,
  adminSetUserRole,
  changeUserPassword,
  getCurrentSessionUser,
  getRoleLabel,
  getStoredUsers,
  isUserManagerOrAdmin,
  loginWithEmail,
  logoutSession,
  registerWithEmail,
  syncUsersFromServer,
} from '@/services/authRoleService';
import {
  CommunityDisasterReport,
  getStoredCommunityReports,
  updateReportStatus,
  deleteCommunityReport,
  markAllReportsAsRead,
  markReportAsRead,
  COMMUNITY_REPORTS_CHANGED_EVENT,
} from '@/services/communityReportService';

export const SovereigntyBanner: React.FC = () => {
  const [activeMenu, setActiveMenu] = useState<string>('home');
  const [activeModal, setActiveModal] = useState<
    'guide' | 'contact' | 'stats' | 'auth' | 'role_management' | 'account_info' | 'report_management' | null
  >(null);
  const [authTab, setAuthTab] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState<boolean>(false);
  const [isReportMenuOpen, setIsReportMenuOpen] = useState<boolean>(false);
  const [reportsList, setReportsList] = useState<CommunityDisasterReport[]>([]);
  const [selectedReportDetail, setSelectedReportDetail] = useState<CommunityDisasterReport | null>(null);
  const [reportFilter, setReportFilter] = useState<'ALL' | 'PENDING' | 'INVESTIGATING' | 'RESOLVED'>('ALL');
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

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

  // Đổi mật khẩu tài khoản
  const [oldPasswordInput, setOldPasswordInput] = useState<string>('');
  const [newPasswordInput, setNewPasswordInput] = useState<string>('');
  const [confirmNewPasswordInput, setConfirmNewPasswordInput] = useState<string>('');
  const [showOldPass, setShowOldPass] = useState<boolean>(false);
  const [showNewPass, setShowNewPass] = useState<boolean>(false);
  const [showConfirmNewPass, setShowConfirmNewPass] = useState<boolean>(false);
  const [changePassError, setChangePassError] = useState<string | null>(null);
  const [changePassSuccess, setChangePassSuccess] = useState<string | null>(null);
  const [isChangingPass, setIsChangingPass] = useState<boolean>(false);

  // Thêm/phân quyền dành cho Admin
  const [newEmail, setNewEmail] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [newRole, setNewRole] = useState<MapUserRole>('MANAGER');
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
      setReportsList(getStoredCommunityReports());

      syncUsersFromServer().then((serverUsers) => {
        setUsersList(serverUsers);
        setCurrentUser(getCurrentSessionUser());
      });

      const handleAuthChanged = () => {
        setCurrentUser(getCurrentSessionUser());
        setUsersList(getStoredUsers());
      };
      window.addEventListener(AUTH_CHANGED_EVENT, handleAuthChanged);

      const handleReportsChanged = (e: any) => {
        if (e?.detail && Array.isArray(e.detail)) {
          setReportsList(e.detail);
        } else {
          setReportsList(getStoredCommunityReports());
        }
      };
      window.addEventListener(COMMUNITY_REPORTS_CHANGED_EVENT, handleReportsChanged);

      let bc: BroadcastChannel | null = null;
      try {
        if ('BroadcastChannel' in window) {
          bc = new BroadcastChannel('easup_community_reports_channel');
          bc.onmessage = () => {
            setReportsList(getStoredCommunityReports());
          };
        }
      } catch {}

      return () => {
        window.removeEventListener(AUTH_CHANGED_EVENT, handleAuthChanged);
        window.removeEventListener(COMMUNITY_REPORTS_CHANGED_EVENT, handleReportsChanged);
        if (bc) bc.close();
      };
    }
  }, []);

  const openReportManagementModal = (report?: CommunityDisasterReport) => {
    setIsUserMenuOpen(false);
    setIsReportMenuOpen(false);
    setIsMobileMenuOpen(false);
    if (report) {
      setSelectedReportDetail(report);
      markReportAsRead(report.id);
      setReportsList(getStoredCommunityReports());
    }
    setActiveModal('report_management');
  };

  const handleUpdateReportStatus = (
    id: string,
    status: 'PENDING' | 'INVESTIGATING' | 'RESOLVED'
  ) => {
    const updated = updateReportStatus(id, status);
    setReportsList(updated);
    if (selectedReportDetail && selectedReportDetail.id === id) {
      setSelectedReportDetail({ ...selectedReportDetail, status });
    }
  };

  const handleDeleteReport = (id: string) => {
    const updated = deleteCommunityReport(id);
    setReportsList(updated);
    if (selectedReportDetail && selectedReportDetail.id === id) {
      setSelectedReportDetail(null);
    }
  };

  const openAuthModal = (tab: 'LOGIN' | 'REGISTER') => {
    setAuthTab(tab);
    setAuthError(null);
    setAdminMessage(null);
    setPasswordInput('');
    setConfirmPasswordInput('');
    setIsMobileMenuOpen(false);
    setActiveModal('auth');
  };

  const openRoleManagementModal = () => {
    setAdminMessage(null);
    setNewEmail('');
    setNewPassword('');
    setNewRole('MANAGER');
    setIsMobileMenuOpen(false);
    setActiveModal('role_management');
  };

  const openAccountInfoModal = () => {
    setOldPasswordInput('');
    setNewPasswordInput('');
    setConfirmNewPasswordInput('');
    setShowOldPass(false);
    setShowNewPass(false);
    setShowConfirmNewPass(false);
    setChangePassError(null);
    setChangePassSuccess(null);
    setIsUserMenuOpen(false);
    setIsMobileMenuOpen(false);
    setActiveModal('account_info');
  };

  const handleChangePasswordSubmit = async () => {
    if (isChangingPass) return;
    setChangePassError(null);
    setChangePassSuccess(null);

    const oldP = oldPasswordInput.trim();
    const newP = newPasswordInput.trim();
    const confirmP = confirmNewPasswordInput.trim();

    if (!oldP) {
      setChangePassError('Vui lòng nhập mật khẩu cũ!');
      return;
    }
    if (!newP || !confirmP) {
      setChangePassError('Vui lòng nhập mật khẩu mới đủ 2 lần!');
      return;
    }
    if (newP !== confirmP) {
      setChangePassError('Mật khẩu mới nhập 2 lần không khớp!');
      return;
    }
    if (newP.length < 6) {
      setChangePassError('Mật khẩu mới phải có tối thiểu 6 ký tự!');
      return;
    }

    setIsChangingPass(true);
    try {
      const res = await changeUserPassword(
        currentUser.email,
        oldP,
        newP,
        confirmP
      );
      if (res.ok) {
        setChangePassSuccess(res.message || 'Đổi mật khẩu thành công và đã lưu an toàn!');
        setOldPasswordInput('');
        setNewPasswordInput('');
        setConfirmNewPasswordInput('');
      } else {
        setChangePassError(res.error || 'Đổi mật khẩu thất bại!');
      }
    } catch {
      setChangePassError('Lỗi kết nối máy chủ!');
    } finally {
      setIsChangingPass(false);
    }
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
    setIsUserMenuOpen(false);
  };

  const handleCreateOrAssignUser = async () => {
    setAdminMessage(null);
    const cleanEmail = newEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setAdminMessage('Email không hợp lệ!');
      return;
    }
    const res = await adminSetUserRole(cleanEmail, newRole, newPassword.trim() || undefined);
    if (res.ok) {
      setUsersList(res.users);
      setNewEmail('');
      setNewPassword('');
      setAdminMessage(`Đã cấp quyền (${getRoleLabel(newRole)}) cho ${cleanEmail}`);
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
              ) : null}

              {currentUser.email && isUserManagerOrAdmin(currentUser.role) && (
                <button
                  type="button"
                  onClick={() => openReportManagementModal()}
                  className="relative p-1.5 px-2 rounded-lg bg-white/15 border border-white/30 text-white hover:bg-white/25 transition-all shadow-sm flex items-center justify-center cursor-pointer"
                  title="Tin báo hiện trường từ người dân gửi về"
                >
                  <Bell className={`w-4 h-4 text-white ${reportsList.some((r) => !r.isRead) ? 'animate-bounce text-amber-300' : ''}`} />
                  {reportsList.filter((r) => r.status === 'PENDING').length > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-3.5 min-w-3.5 px-0.5 items-center justify-center rounded-full bg-rose-600 text-[8px] font-black text-white ring-1 ring-[#0A4393]">
                      {reportsList.filter((r) => r.status === 'PENDING').length}
                    </span>
                  )}
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
                <>
                  {/* ẢNH 1: NÚT CHUÔNG THÔNG BÁO BÁO TIN HIỆN TRƯỜNG TRÊN THANH TIÊU ĐỀ (CHO CÁN BỘ & ADMIN) */}
                  {isUserManagerOrAdmin(currentUser.role) && (
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => {
                          setIsReportMenuOpen(!isReportMenuOpen);
                          setIsUserMenuOpen(false);
                        }}
                        className="p-1.5 px-2.5 rounded-full bg-white/20 hover:bg-white/30 active:bg-white/40 text-white border border-white/40 shadow-sm transition-all flex items-center justify-center cursor-pointer focus:outline-none relative"
                        title="Tin báo hiện trường từ người dân gửi về"
                        aria-label="Thông báo tin báo"
                      >
                        <Bell
                          className={`w-5 h-5 text-white ${
                            reportsList.some((r) => !r.isRead) ? 'animate-bounce text-amber-300' : ''
                          }`}
                        />
                        {reportsList.filter((r) => r.status === 'PENDING').length > 0 && (
                          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-rose-600 text-[9px] font-black text-white ring-2 ring-[#0A4393] animate-pulse">
                            {reportsList.filter((r) => r.status === 'PENDING').length}
                          </span>
                        )}
                      </button>

                      {/* Popover danh sách tin báo nhanh khi click nút Chuông */}
                      {isReportMenuOpen && (
                        <>
                          <div
                            className="fixed inset-0 z-40"
                            onClick={() => setIsReportMenuOpen(false)}
                          />

                          <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-2xl border border-[#0A4393]/30 z-50 overflow-hidden animate-fadeIn font-sans text-slate-800">
                            <div className="p-3 bg-[#0A4393] text-white flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Bell className="w-4 h-4 text-amber-300" />
                                <span className="font-extrabold text-xs uppercase tracking-wide">
                                  Tin Báo Hiện Trường SOS ({reportsList.length})
                                </span>
                              </div>
                              {reportsList.some((r) => !r.isRead) && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    markAllReportsAsRead();
                                    setReportsList(getStoredCommunityReports());
                                  }}
                                  className="text-[10px] text-blue-200 hover:text-white underline cursor-pointer"
                                >
                                  Đánh dấu đã đọc
                                </button>
                              )}
                            </div>

                            <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                              {reportsList.length === 0 ? (
                                <div className="p-6 text-center text-xs text-slate-500">
                                  Chưa có tin báo hiện trường nào gửi về.
                                </div>
                              ) : (
                                reportsList.map((rep) => (
                                  <div
                                    key={rep.id}
                                    onClick={() => openReportManagementModal(rep)}
                                    className={`p-3 transition-colors hover:bg-blue-50/70 cursor-pointer ${
                                      !rep.isRead ? 'bg-amber-50/60' : 'bg-white'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between gap-1 mb-1">
                                      <span className="font-bold text-xs text-[#0A4393] truncate">
                                        {rep.villageName}
                                      </span>
                                      <span
                                        className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                                          rep.status === 'PENDING'
                                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                            : rep.status === 'INVESTIGATING'
                                            ? 'bg-blue-100 text-blue-800 border border-blue-300'
                                            : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                        }`}
                                      >
                                        {rep.status === 'PENDING'
                                          ? 'Chờ xử lý'
                                          : rep.status === 'INVESTIGATING'
                                          ? 'Đang xác minh'
                                          : 'Đã xử lý'}
                                      </span>
                                    </div>

                                    <div className="text-[11px] font-semibold text-slate-700 flex items-center gap-1 mb-1">
                                      <span>{rep.incidentLabel}</span>
                                      <span className="text-slate-400">•</span>
                                      <span className="text-[10px] text-slate-500 font-normal">
                                        {rep.timestamp}
                                      </span>
                                    </div>

                                    <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed font-sans mb-1.5">
                                      {rep.description}
                                    </p>

                                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-100">
                                      <span className="truncate">Người gửi: {rep.senderName}</span>
                                      <span className="text-[#0A4393] font-semibold flex items-center gap-0.5">
                                        Xem chi tiết &rarr;
                                      </span>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>

                            <div className="p-2.5 bg-slate-50 border-t border-slate-200 text-center">
                              <button
                                type="button"
                                onClick={() => openReportManagementModal()}
                                className="w-full py-1.5 px-3 rounded-lg bg-[#0A4393] hover:bg-[#083576] text-white text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                              >
                                <Inbox className="w-3.5 h-3.5" />
                                <span>Mở trang Quản lý tin báo chi tiết &rarr;</span>
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* Nút 3 dấu gạch ngang (Menu quản trị & tài khoản) */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(!isUserMenuOpen);
                        setIsReportMenuOpen(false);
                      }}
                      className="p-1.5 px-2.5 rounded-full bg-white/20 hover:bg-white/30 active:bg-white/40 text-white border border-white/40 shadow-sm transition-all flex items-center justify-center cursor-pointer focus:outline-none"
                      title="Menu quản trị & tài khoản"
                      aria-label="Menu tài khoản"
                    >
                      <Menu className="w-5 h-5 text-white" />
                    </button>

                    {isUserMenuOpen && (
                      <>
                        {/* Lớp nền trong suốt click ra ngoài để đóng menu */}
                        <div
                          className="fixed inset-0 z-40"
                          onClick={() => setIsUserMenuOpen(false)}
                        />

                        {/* Dropdown Menu nổi */}
                        <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-2xl border border-[#0A4393]/30 z-50 py-2 animate-fadeIn font-sans text-slate-800">
                          {/* 1. Header thông tin tài khoản */}
                          <div className="px-3.5 py-2 border-b border-slate-100 flex flex-col gap-0.5">
                            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                              Tài khoản đang đăng nhập
                            </span>
                            <span
                              className="text-xs font-extrabold text-[#0A4393] truncate"
                              title={currentUser.email}
                            >
                              {currentUser.email}
                            </span>
                            <div className="mt-1">
                              <span
                                className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                  currentUser.role === 'ADMIN'
                                    ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                    : currentUser.role === 'MANAGER' ||
                                      currentUser.role === 'MAP_EDITOR'
                                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                    : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                }`}
                              >
                                {getRoleLabel(currentUser.role)}
                              </span>
                            </div>
                          </div>

                          {/* 2. Danh mục chức năng đã gom lại (ẢNH 2) */}
                          <div className="p-1.5 space-y-1">
                            {currentUser.role === 'ADMIN' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setIsUserMenuOpen(false);
                                  openRoleManagementModal();
                                }}
                                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-bold text-amber-900 bg-amber-50 hover:bg-amber-100 transition-colors text-left cursor-pointer border border-amber-200"
                              >
                                <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
                                <span>🛡️ Quản lý phân quyền</span>
                              </button>
                            )}

                            {/* ẢNH 2: NÚT "QUẢN LÝ TIN BÁO" DÀNH CHO CÁN BỘ & ADMIN */}
                            {isUserManagerOrAdmin(currentUser.role) && (
                              <button
                                type="button"
                                onClick={() => {
                                  setIsUserMenuOpen(false);
                                  openReportManagementModal();
                                }}
                                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-bold text-blue-900 bg-blue-50 hover:bg-blue-100 transition-colors text-left cursor-pointer border border-blue-200"
                              >
                                <div className="flex items-center gap-2">
                                  <Inbox className="w-4 h-4 text-[#0A4393] shrink-0" />
                                  <span>Quản lý tin báo</span>
                                </div>
                                {reportsList.filter((r) => r.status === 'PENDING').length > 0 && (
                                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-600 text-white">
                                    {reportsList.filter((r) => r.status === 'PENDING').length} mới
                                  </span>
                                )}
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => {
                                setIsUserMenuOpen(false);
                                openAccountInfoModal();
                              }}
                              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:bg-[#F0F6FF] transition-colors text-left cursor-pointer"
                            >
                              <ShieldCheck className="w-4 h-4 text-[#0A4393] shrink-0" />
                              <span>Thông tin tài khoản</span>
                            </button>

                            <div className="border-t border-slate-100 my-1" />

                            <button
                              type="button"
                              onClick={() => {
                                setIsUserMenuOpen(false);
                                handleLogout();
                              }}
                              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors text-left cursor-pointer"
                            >
                              <LogOut className="w-4 h-4 text-rose-600 shrink-0" />
                              <span>Thoát</span>
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Menu xổ xuống trên điện thoại */}
          {isMobileMenuOpen && (
            <div className="sm:hidden w-full pt-2 pb-1 border-t border-white/20 flex flex-col gap-1.5 animate-fadeIn">
              {currentUser.email && (
                <div className="p-2.5 rounded-lg bg-white/10 border border-white/20 text-white space-y-1.5 mb-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold truncate max-w-[170px]">{currentUser.email}</span>
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-white text-[#0A4393]">
                      {getRoleLabel(currentUser.role)}
                    </span>
                  </div>
                </div>
              )}

              {currentUser.email && (
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    openAccountInfoModal();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold bg-white/10 text-white hover:bg-white/20 text-left cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4 shrink-0 text-amber-300" />
                  <span>Thông tin tài khoản &amp; Đổi mật khẩu</span>
                </button>
              )}

              {/* Nút Quản lý tin báo trên Menu Điện thoại */}
              {currentUser.email && isUserManagerOrAdmin(currentUser.role) && (
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    openReportManagementModal();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold bg-amber-400 text-[#0A4393] hover:bg-amber-300 text-left shadow-xs cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <Inbox className="w-4 h-4 shrink-0 text-[#0A4393]" />
                    <span>Quản lý tin báo hiện trường</span>
                  </div>
                  {reportsList.filter((r) => r.status === 'PENDING').length > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-600 text-white">
                      {reportsList.filter((r) => r.status === 'PENDING').length} mới
                    </span>
                  )}
                </button>
              )}

              {currentUser.role === 'ADMIN' && (
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    openRoleManagementModal();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold bg-amber-400 text-[#0A4393] hover:bg-amber-300 text-left shadow-xs"
                >
                  <ShieldCheck className="w-4 h-4 shrink-0 text-[#0A4393]" />
                  <span>🛡️ Quản lý phân quyền (3 cấp bậc)</span>
                </button>
              )}
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

              {currentUser.email && (
                <button
                  onClick={() => {
                    handleLogout();
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 text-left cursor-pointer"
                >
                  <LogOut className="w-4 h-4 shrink-0" />
                  <span>Thoát ({currentUser.email.split('@')[0]})</span>
                </button>
              )}
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
            className="relative max-w-xl w-full max-h-[90vh] overflow-y-auto bg-white border-2 border-[#0A4393] rounded-2xl p-5 shadow-2xl text-slate-800"
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

            {/* Ghép toàn bộ nội dung Nguồn dữ liệu & Kiểm định khoa học */}
            <div className="mt-4 pt-3 border-t border-[#0A4393]/20 space-y-3 text-xs leading-relaxed">
              <div className="flex items-center gap-2 font-bold text-[#0A4393] text-xs sm:text-sm">
                <ShieldCheck className="w-4 h-4 text-[#0A4393] shrink-0" />
                <span>NGUỒN DỮ LIỆU & KIỂM ĐỊNH KHOA HỌC</span>
              </div>

              {/* 1. NASA FIRMS */}
              <div className="p-3 rounded-xl bg-[#F4F8FD] border border-[#0A4393]/25">
                <div className="flex items-center gap-2 font-bold text-[#0A4393] mb-1">
                  <Satellite className="w-4 h-4 text-[#0A4393] shrink-0" />
                  <span>1. Dữ liệu Ảnh nhiệt Vệ tinh & Cảnh báo Cháy rừng</span>
                </div>
                <p className="text-slate-700">
                  Dữ liệu ảnh nhiệt được thu nhận từ hệ thống vệ tinh{' '}
                  <strong className="text-[#0A4393]">NASA FIRMS (VIIRS 375m / MODIS 1km)</strong>, tích hợp
                  đối sánh đa tầng với mạng lưới cảm biến IoT LoRaWAN đo nhiệt độ, độ ẩm và nồng độ khói CO
                  trực chiến tại <strong className="text-[#0A4393]">Lâm phần Tiểu khu 293</strong> (vùng rừng
                  khộp trọng điểm xã Ea Súp).
                </p>
              </div>

              {/* 2. MIKE FLOOD */}
              <div className="p-3 rounded-xl bg-[#F4F8FD] border border-[#0A4393]/25">
                <div className="flex items-center gap-2 font-bold text-[#0A4393] mb-1">
                  <Waves className="w-4 h-4 text-[#0A4393] shrink-0" />
                  <span>2. Dữ liệu Ngập lụt Hạ du & Thủy văn Hồ chứa</span>
                </div>
                <p className="text-slate-700">
                  Dữ liệu ngập lụt hạ du và kịch bản vận hành điều tiết nước Hồ Ea Súp Thượng, Hồ Ea Súp Hạ,
                  Hồ Trung Chuyển được chuẩn hóa từ{' '}
                  <strong className="text-[#0A4393]">
                    Báo cáo chuyên đề Mô hình thủy lực 2 chiều MIKE FLOOD (tích hợp MIKE 11 + MIKE 21 FM)
                  </strong>{' '}
                  đã được hiệu chỉnh và kiểm định thực tế qua{' '}
                  <strong className="text-rose-700 bg-rose-50 px-1 py-0.5 rounded border border-rose-200">
                    trận lũ lịch sử tháng 8/2022 và tháng 7/2023
                  </strong>{' '}
                  trên lưu vực sông Ea Súp.
                </p>
              </div>

              {/* 3. Đồng bộ Reactive State */}
              <div className="px-3 py-2 rounded-lg bg-[#E6F0FA] border border-[#0A4393]/30 text-[11px] font-mono text-[#0A4393] flex items-center justify-between">
                <span>Trạng thái đồng bộ Global Store:</span>
                <span className="font-bold">● Khớp 100% Thời gian thực</span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[#0A4393]/20 flex justify-end">
              <button
                onClick={() => setActiveModal(null)}
                className="px-4 py-1.5 rounded-lg bg-[#0A4393] text-white font-semibold text-xs hover:bg-[#083576]"
              >
                Đã hiểu & Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. MODAL ĐĂNG NHẬP / ĐĂNG KÝ / THÔNG TIN TÀI KHOẢN & ĐỔI MẬT KHẨU */}
      {(activeModal === 'auth' || activeModal === 'account_info') && (
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
              /* MODAL THÔNG TIN TÀI KHOẢN & ĐỔI MẬT KHẨU BẢO MẬT (ĐÁP ỨNG ẢNH 1 & ẢNH 2) */
              <div className="space-y-3.5 pt-1">
                {/* 1. Header Thông tin tài khoản & Vai trò người dùng */}
                <div className="flex items-center gap-2.5 pb-2.5 border-b border-[#0A4393]/20">
                  <div className="p-2 rounded-xl bg-[#0A4393] text-white shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-extrabold text-[#0A4393] uppercase tracking-wide">
                      Thông Tin Tài Khoản
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium truncate">
                      Hệ thống cảnh báo sớm thiên tai xã Ea Súp
                    </p>
                  </div>
                </div>

                {/* 2. Chi tiết người dùng & Quyền hạn */}
                <div className="p-3 rounded-xl bg-[#F0F6FF] border border-[#0A4393]/20 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold text-slate-600">Email đăng nhập:</span>
                    <span className="text-xs font-bold text-[#0A4393] truncate max-w-[220px]" title={currentUser.email}>
                      {currentUser.email}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#0A4393]/15">
                    <span className="text-[11px] font-semibold text-slate-600">Phân quyền sử dụng:</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                        currentUser.role === 'ADMIN'
                          ? 'bg-rose-100 text-rose-800 border border-rose-300'
                          : currentUser.role === 'MANAGER' || currentUser.role === 'MAP_EDITOR'
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      }`}
                    >
                      {getRoleLabel(currentUser.role)} ({currentUser.role})
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-600 bg-white/80 p-2 rounded-lg border border-slate-200 leading-relaxed font-sans">
                    {currentUser.role === 'ADMIN' && (
                      <span>
                        • <strong>Toàn quyền cao nhất</strong>: Thêm, sửa, xóa, nạp tải dữ liệu bản đồ .kml/.geojson; phân quyền và quản trị hệ thống.
                      </span>
                    )}
                    {(currentUser.role === 'MANAGER' || currentUser.role === 'MAP_EDITOR') && (
                      <span>
                        • <strong>Cán bộ quản lý</strong>: Điều chỉnh cảm biến IoT, gửi/tắt cảnh báo khẩn cấp, kích hoạt loa số AI và tiếp nhận tin báo người dân.
                      </span>
                    )}
                    {currentUser.role === 'GUEST' && (
                      <span>
                        • <strong>Khách</strong>: Thao tác giao diện bản đồ, nhận cảnh báo âm thanh và gửi tin phản ánh SOS hiện trường đến cán bộ.
                      </span>
                    )}
                  </div>

                  {currentUser.role === 'ADMIN' && (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveModal('role_management');
                      }}
                      className="w-full mt-1 flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg text-xs font-bold text-[#0A4393] bg-white hover:bg-blue-50 border border-[#0A4393]/30 transition-colors cursor-pointer shadow-xs"
                    >
                      <ShieldCheck className="w-4 h-4 text-[#0A4393]" />
                      <span>Mở trang Quản lý phân quyền hệ thống →</span>
                    </button>
                  )}
                </div>

                {/* 3. KHU VỰC ĐỔI MẬT KHẨU (ẢNH 2: NHẬP MẬT KHẨU CŨ, 2 LẦN MẬT KHẨU MỚI & LƯU BẢO MẬT) */}
                <div className="p-3 rounded-xl border border-[#0A4393]/25 bg-white space-y-2.5 shadow-xs">
                  <div className="flex items-center gap-1.5 pb-1 border-b border-slate-100">
                    <KeyRound className="w-4 h-4 text-[#0A4393]" />
                    <span className="text-xs font-bold text-[#0A4393] uppercase tracking-wide">
                      Đổi Mật Khẩu Đăng Nhập
                    </span>
                  </div>

                  {changePassSuccess && (
                    <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-semibold animate-fadeIn">
                      ✓ {changePassSuccess}
                    </div>
                  )}

                  {changePassError && (
                    <div className="p-2 rounded-lg bg-rose-50 border border-rose-300 text-rose-700 text-xs font-semibold animate-fadeIn">
                      ⚠ {changePassError}
                    </div>
                  )}

                  {/* 3.1. Mật khẩu cũ */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Mật khẩu cũ (hiện tại) <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type={showOldPass ? 'text' : 'password'}
                        autoComplete="current-password"
                        data-lpignore="true"
                        value={oldPasswordInput}
                        onChange={(e) => setOldPasswordInput(e.target.value)}
                        placeholder="Nhập mật khẩu hiện tại"
                        className="w-full pl-8 pr-8 py-1.5 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#0A4393]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowOldPass(!showOldPass)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-[#0A4393] p-0.5"
                      >
                        {showOldPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* 3.2. Mật khẩu mới */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Mật khẩu mới (tối thiểu 6 ký tự) <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type={showNewPass ? 'text' : 'password'}
                        autoComplete="new-password"
                        data-lpignore="true"
                        value={newPasswordInput}
                        onChange={(e) => setNewPasswordInput(e.target.value)}
                        placeholder="Nhập mật khẩu mới"
                        className="w-full pl-8 pr-8 py-1.5 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#0A4393]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPass(!showNewPass)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-[#0A4393] p-0.5"
                      >
                        {showNewPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* 3.3. Nhập lại mật khẩu mới */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Xác nhận mật khẩu mới <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type={showConfirmNewPass ? 'text' : 'password'}
                        autoComplete="new-password"
                        data-lpignore="true"
                        value={confirmNewPasswordInput}
                        onChange={(e) => setConfirmNewPasswordInput(e.target.value)}
                        placeholder="Nhập lại mật khẩu mới"
                        className="w-full pl-8 pr-8 py-1.5 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#0A4393]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmNewPass(!showConfirmNewPass)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-[#0A4393] p-0.5"
                      >
                        {showConfirmNewPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Nút thực hiện đổi mật khẩu */}
                  <button
                    type="button"
                    onClick={handleChangePasswordSubmit}
                    disabled={isChangingPass}
                    className="w-full py-2 rounded-lg bg-[#0A4393] text-white font-bold text-xs hover:bg-[#083576] shadow-sm transition-all cursor-pointer disabled:opacity-60 flex items-center justify-center gap-1.5"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>{isChangingPass ? 'Đang lưu trữ bảo mật...' : 'Lưu mật khẩu mới'}</span>
                  </button>

                  <div className="text-[10px] text-slate-500 italic text-center">
                    Mật khẩu được băm mã hóa SHA-256 an toàn và lưu trữ trong file cấu hình máy chủ.
                  </div>
                </div>

                {/* 4. Chân Modal: Nút Thoát và Đóng */}
                <div className="pt-2 border-t border-slate-200 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      handleLogout();
                      setActiveModal(null);
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-300 text-xs font-bold hover:bg-rose-100 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Thoát tài khoản</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200 transition-colors cursor-pointer"
                  >
                    Đóng
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 7. MODAL QUẢN LÝ PHÂN QUYỀN HỆ THỐNG DÀNH CHO ADMIN (3 LOẠI PHÂN QUYỀN CHÍNH) */}
      {activeModal === 'role_management' && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-[#0A4393]/70 backdrop-blur-sm animate-fadeIn"
          onClick={() => setActiveModal(null)}
        >
          <div
            className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border-2 border-[#0A4393] p-4 sm:p-5 max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Nút đóng modal */}
            <button
              onClick={() => setActiveModal(null)}
              className="absolute top-3.5 right-3.5 p-1.5 rounded-full bg-[#F0F6FF] text-[#0A4393] hover:bg-[#0A4393] hover:text-white transition-colors cursor-pointer"
              title="Đóng cửa sổ"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Tiêu đề Modal */}
            <div className="flex items-center gap-2.5 mb-3.5 pb-2.5 border-b border-[#0A4393]/20">
              <div className="p-2 rounded-xl bg-[#0A4393] text-white shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-[#0A4393] uppercase tracking-wide">
                  Trang Quản Lý Phân Quyền Hệ Thống
                </h3>
                <p className="text-[11px] text-slate-600 font-medium">
                  3 loại phân quyền trọng tâm - Vận hành hệ thống cảnh báo sớm thiên tai xã Ea Súp
                </p>
              </div>
            </div>

            {/* BẢNG GIẢI THÍCH 3 LOẠI PHÂN QUYỀN CHÍNH */}
            <div className="space-y-2 mb-4">
              <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                Quy chuẩn 3 tầng phân quyền vận hành:
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {/* 1. Toàn quyền (Admin) */}
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-300 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-rose-600 text-white">
                      Toàn quyền
                    </span>
                    <span className="text-[10px] font-mono text-rose-700 font-bold">ADMIN</span>
                  </div>
                  <div className="text-[11px] text-rose-950 leading-relaxed font-sans">
                    • <strong>Toàn quyền cao nhất</strong> hệ thống.<br />
                    • <strong>Thêm, sửa, xóa, nạp tải</strong> file .kml/.geojson.<br />
                    • <strong>Phân quyền &amp; quản trị</strong> mọi tài khoản.
                  </div>
                </div>

                {/* 2. Cán bộ quản lý (Manager) */}
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-300 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-amber-600 text-white">
                      Cán bộ quản lý
                    </span>
                    <span className="text-[10px] font-mono text-amber-800 font-bold">MANAGER</span>
                  </div>
                  <div className="text-[11px] text-amber-950 leading-relaxed font-sans">
                    • <strong>Điều chỉnh tab Cảm biến IoT</strong>.<br />
                    • <strong>Gửi / tắt cảnh báo</strong> khẩn cấp.<br />
                    • Gửi <strong>&quot;kiểm thử máy chủ&quot;</strong>, bật/tắt <strong>loa số AI</strong>.<br />
                    • <strong>Đọc tin báo</strong> người dân gửi đến.
                  </div>
                </div>

                {/* 3. Khách (Guest) */}
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-600 text-white">
                      Khách
                    </span>
                    <span className="text-[10px] font-mono text-emerald-800 font-bold">GUEST</span>
                  </div>
                  <div className="text-[11px] text-emerald-950 leading-relaxed font-sans">
                    • <strong>Thao tác các nút</strong> trên giao diện bản đồ.<br />
                    • <strong>Kiểm thử mô phỏng</strong> kịch bản lũ trên bản đồ.<br />
                    • <strong>Gửi tin báo SOS</strong> đến Admin &amp; Cán bộ.
                  </div>
                </div>
              </div>
              <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-600 flex items-center gap-1.5">
                <span className="text-slate-500 font-bold">ℹ️ Người dùng chưa đăng nhập:</span>
                <span>Thao tác các nút trên giao diện bản đồ, tiếp nhận cảnh báo âm thanh &amp; thông báo phát thanh AI.</span>
              </div>
            </div>

            {/* FORM THÊM / CẬP NHẬT PHÂN QUYỀN TÀI KHOẢN */}
            <div className="p-3 rounded-xl bg-[#F0F6FF] border border-[#0A4393]/30 mb-4 space-y-2.5">
              <div className="text-xs font-bold text-[#0A4393] flex items-center gap-1.5">
                <UserPlus className="w-4 h-4" />
                <span>Thêm tài khoản hoặc cập nhật phân quyền</span>
              </div>

              {adminMessage && (
                <div className="p-2 rounded-lg bg-white border border-[#0A4393]/30 text-[#0A4393] text-xs font-semibold">
                  {adminMessage}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                <input
                  type="text"
                  inputMode="email"
                  autoComplete="off"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="Email (VD: canbo@easupso.com)"
                  className="sm:col-span-5 px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#0A4393]"
                />
                <input
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mật khẩu (tùy chọn)"
                  className="sm:col-span-3 px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#0A4393]"
                />
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as MapUserRole)}
                  className="sm:col-span-3 px-2 py-1.5 rounded-lg border border-[#0A4393]/40 text-xs font-bold text-[#0A4393] bg-white cursor-pointer"
                >
                  <option value="ADMIN">🔴 Toàn quyền (Admin)</option>
                  <option value="MANAGER">🟡 Cán bộ quản lý</option>
                  <option value="GUEST">🟢 Khách</option>
                </select>
                <button
                  type="button"
                  onClick={handleCreateOrAssignUser}
                  className="sm:col-span-1 px-3 py-1.5 rounded-lg bg-[#0A4393] hover:bg-[#083576] text-white text-xs font-bold flex items-center justify-center cursor-pointer transition-colors"
                  title="Lưu phân quyền tài khoản"
                >
                  Lưu
                </button>
              </div>
            </div>

            {/* DANH SÁCH TẤT CẢ TÀI KHOẢN VÀ ĐIỀU CHỈNH PHÂN QUYỀN TRỰC TIẾP */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-800 flex items-center justify-between">
                <span>Danh sách tài khoản hệ thống ({usersList.length}):</span>
                <span className="text-[10px] text-slate-500 font-normal">Thay đổi vai trò có hiệu lực tức thì</span>
              </div>

              <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                {usersList
                  .filter((acc) => acc && typeof acc.email === 'string' && acc.email)
                  .map((acc) => {
                    const isMaster =
                      (acc.email || '').toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase();
                    return (
                      <div
                        key={acc.email}
                        className="p-2.5 bg-white hover:bg-slate-50 flex items-center justify-between gap-2 text-xs transition-colors"
                      >
                        <div className="min-w-0 flex-1 flex items-center gap-2">
                          <span className="font-semibold text-slate-800 truncate">
                            {acc.email}
                          </span>
                          {isMaster && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-100 text-rose-700 border border-rose-300 shrink-0">
                              Admin Tối Cao
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <select
                            value={acc.role === 'MAP_EDITOR' ? 'MANAGER' : acc.role}
                            disabled={isMaster}
                            onChange={(e) =>
                              handleChangeUserRole(
                                acc.email,
                                e.target.value as MapUserRole
                              )
                            }
                            className={`px-2 py-1 rounded border text-[11px] font-bold cursor-pointer disabled:opacity-60 ${
                              acc.role === 'ADMIN'
                                ? 'bg-rose-50 text-rose-700 border-rose-300'
                                : acc.role === 'MANAGER' || acc.role === 'MAP_EDITOR'
                                ? 'bg-amber-50 text-amber-800 border-amber-300'
                                : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            }`}
                          >
                            <option value="ADMIN">🔴 Toàn quyền (Admin)</option>
                            <option value="MANAGER">🟡 Cán bộ quản lý</option>
                            <option value="GUEST">🟢 Khách</option>
                          </select>

                          {!isMaster && (
                            <button
                              type="button"
                              onClick={() => handleDeleteUser(acc.email)}
                              className="p-1.5 rounded border border-rose-200 text-rose-600 hover:bg-rose-600 hover:text-white transition-colors cursor-pointer"
                              title={`Xóa tài khoản ${acc.email}`}
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

            <div className="pt-3 mt-3 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-4 py-1.5 rounded-lg bg-[#0A4393] hover:bg-[#083576] text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. MODAL QUẢN LÝ TIN BÁO HIỆN TRƯỜNG DÀNH CHO CÁN BỘ & ADMIN (ẢNH 1 & ẢNH 2) */}
      {activeModal === 'report_management' && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-[#0A4393]/70 backdrop-blur-sm animate-fadeIn"
          onClick={() => setActiveModal(null)}
        >
          <div
            className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border-2 border-[#0A4393] p-4 sm:p-5 max-h-[92vh] overflow-y-auto text-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Nút đóng modal */}
            <button
              onClick={() => setActiveModal(null)}
              className="absolute top-3.5 right-3.5 p-1.5 rounded-full bg-[#F0F6FF] text-[#0A4393] hover:bg-[#0A4393] hover:text-white transition-colors cursor-pointer"
              title="Đóng cửa sổ"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Tiêu đề Modal */}
            <div className="flex items-center gap-2.5 mb-3.5 pb-2.5 border-b border-[#0A4393]/20">
              <div className="p-2 rounded-xl bg-[#0A4393] text-white shrink-0">
                <Inbox className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-extrabold text-[#0A4393] uppercase tracking-wide truncate">
                  Quản Lý Tin Báo Hiện Trường &amp; SOS Cộng Đồng
                </h3>
                <p className="text-[11px] text-slate-600 font-medium">
                  Tiếp nhận phản ánh từ người dân, các tài khoản khách và tổ xung kích PCTT 20 thôn/buôn
                </p>
              </div>
            </div>

            {/* THANH BỘ LỌC TRẠNG THÁI */}
            <div className="flex items-center gap-1.5 mb-3 overflow-x-auto pb-1 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setReportFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                  reportFilter === 'ALL'
                    ? 'bg-[#0A4393] text-white shadow-xs font-bold'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Tất cả ({reportsList.length})
              </button>
              <button
                type="button"
                onClick={() => setReportFilter('PENDING')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                  reportFilter === 'PENDING'
                    ? 'bg-amber-500 text-white shadow-xs font-bold'
                    : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
                }`}
              >
                <span>Chờ xử lý</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white text-amber-800 font-bold">
                  {reportsList.filter((r) => r.status === 'PENDING').length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setReportFilter('INVESTIGATING')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                  reportFilter === 'INVESTIGATING'
                    ? 'bg-blue-600 text-white shadow-xs font-bold'
                    : 'bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200'
                }`}
              >
                <span>Đang xác minh</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white text-blue-800 font-bold">
                  {reportsList.filter((r) => r.status === 'INVESTIGATING').length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setReportFilter('RESOLVED')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                  reportFilter === 'RESOLVED'
                    ? 'bg-emerald-600 text-white shadow-xs font-bold'
                    : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                }`}
              >
                <span>Đã xử lý</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white text-emerald-800 font-bold">
                  {reportsList.filter((r) => r.status === 'RESOLVED').length}
                </span>
              </button>
            </div>

            {/* DANH SÁCH CÁC TIN BÁO */}
            <div className="space-y-2.5 max-h-[58vh] overflow-y-auto pr-1">
              {reportsList.filter((r) => reportFilter === 'ALL' || r.status === reportFilter).length === 0 ? (
                <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-xl text-slate-500 text-xs">
                  Không có tin báo nào trong danh mục này.
                </div>
              ) : (
                reportsList
                  .filter((r) => reportFilter === 'ALL' || r.status === reportFilter)
                  .map((rep) => (
                    <div
                      key={rep.id}
                      className={`p-3.5 rounded-xl border transition-all ${
                        rep.status === 'PENDING'
                          ? 'bg-amber-50/40 border-amber-300'
                          : rep.status === 'INVESTIGATING'
                          ? 'bg-blue-50/40 border-blue-300'
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200/80">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-sm text-[#0A4393]">
                            {rep.villageName}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-white text-slate-800 border border-slate-200 shadow-xs">
                            {rep.incidentLabel}
                          </span>
                          <span className="text-[11px] text-slate-500 font-mono">
                            [{rep.timestamp}]
                          </span>
                        </div>

                        {/* Dropdown thay đổi trạng thái xử lý */}
                        <div className="flex items-center gap-2 shrink-0">
                          <select
                            value={rep.status}
                            onChange={(e) =>
                              handleUpdateReportStatus(
                                rep.id,
                                e.target.value as 'PENDING' | 'INVESTIGATING' | 'RESOLVED'
                              )
                            }
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold border cursor-pointer ${
                              rep.status === 'PENDING'
                                ? 'bg-amber-100 text-amber-900 border-amber-300'
                                : rep.status === 'INVESTIGATING'
                                ? 'bg-blue-100 text-blue-900 border-blue-300'
                                : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                            }`}
                          >
                            <option value="PENDING">🟡 Chờ xử lý</option>
                            <option value="INVESTIGATING">🔵 Đang xác minh</option>
                            <option value="RESOLVED">🟢 Đã xử lý xong</option>
                          </select>

                          <button
                            type="button"
                            onClick={() => handleDeleteReport(rep.id)}
                            className="p-1 rounded-lg text-rose-500 hover:bg-rose-100 transition-colors cursor-pointer"
                            title="Xóa tin báo"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Nội dung mô tả */}
                      <p className="mt-2 text-xs text-slate-700 leading-relaxed font-sans">
                        {rep.description}
                      </p>

                      {/* Ảnh hiện trường nếu có */}
                      {rep.imageUrl && (
                        <div className="mt-2.5">
                          <span className="text-[11px] font-semibold text-slate-600 block mb-1">
                            Ảnh chụp hiện trường đính kèm:
                          </span>
                          <div
                            onClick={() => setZoomedImage(rep.imageUrl || null)}
                            className="inline-block relative rounded-lg overflow-hidden border border-slate-300 cursor-pointer group shadow-xs max-w-xs"
                          >
                            <img
                              src={rep.imageUrl}
                              alt="Ảnh hiện trường"
                              className="h-28 w-auto object-cover group-hover:scale-105 transition-transform"
                            />
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1">
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>Phóng to</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Thông tin tọa độ GPS & Người gửi */}
                      <div className="mt-2.5 pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-[#0A4393]" />
                          <span>
                            GPS: <strong>{rep.lat.toFixed(5)}, {rep.lng.toFixed(5)}</strong>
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span>
                            Người gửi: <strong>{rep.senderName}</strong>
                          </span>
                          {rep.senderEmail && (
                            <span className="text-slate-400">({rep.senderEmail})</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
              )}
            </div>

            {/* Chân Modal */}
            <div className="pt-3 mt-3 border-t border-slate-200 flex items-center justify-between">
              <span className="text-[11px] text-slate-500 italic">
                * Tin báo gửi về được lưu trữ và đồng bộ thời gian thực đến toàn bộ ban chỉ huy.
              </span>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-4 py-1.5 rounded-lg bg-[#0A4393] hover:bg-[#083576] text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PHÓNG TO ẢNH HIỆN TRƯỜNG */}
      {zoomedImage && (
        <div
          className="fixed inset-0 z-[10000] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setZoomedImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setZoomedImage(null)}
              className="absolute top-2 right-2 p-2 rounded-full bg-black/60 text-white hover:bg-black/90 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <img src={zoomedImage} alt="Hiện trường phóng to" className="max-h-[85vh] w-auto rounded-xl object-contain shadow-2xl" />
          </div>
        </div>
      )}
    </>
  );
};
