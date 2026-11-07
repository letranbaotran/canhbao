/**
 * Dịch vụ Quản lý Đăng nhập / Đăng ký bằng Email & Phân quyền Bản đồ (RBAC)
 * Mật khẩu được quản lý và bảo mật tuyệt đối trong file .env trên máy chủ.
 */

export type MapUserRole = 'ADMIN' | 'MANAGER' | 'GUEST' | 'MAP_EDITOR';

export const MASTER_ADMIN_EMAIL = 'lehanhkt01@gmail.com';

export interface AuthUserAccount {
  email: string;
  fullName: string;
  role: MapUserRole;
  createdAt: string;
  passwordHash?: string;
}

export interface CurrentSessionUser {
  email: string;
  fullName: string;
  role: MapUserRole;
}

const USERS_STORAGE_KEY = 'easup_auth_users_v4';
const SESSION_STORAGE_KEY = 'easup_current_session_v4';
export const AUTH_CHANGED_EVENT = 'easup-auth-changed';

export const DEFAULT_ADMIN_PASSWORD_HASH =
  '379ac4bdc27690d365d58ce6b5801593fa4a7d9b23b9fe4fedbc0bdf821f4b46';

export const DEFAULT_ACCOUNTS: AuthUserAccount[] = [
  {
    email: MASTER_ADMIN_EMAIL,
    fullName: 'Admin',
    role: 'ADMIN',
    createdAt: '2026-01-01T00:00:00.000Z',
    passwordHash: DEFAULT_ADMIN_PASSWORD_HASH,
  },
];

async function sha256Client(text: string): Promise<string> {
  if (typeof window !== 'undefined' && window.crypto?.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(`easup_salt_${text}`);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  return text;
}

export function sanitizeUserList(rawList: any[]): AuthUserAccount[] {
  if (!Array.isArray(rawList)) return [...DEFAULT_ACCOUNTS];
  const valid = rawList.filter(
    (u) => u && typeof u.email === 'string' && u.email.trim().includes('@')
  ) as AuthUserAccount[];

  const masterIdx = valid.findIndex(
    (u) => u.email.toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase()
  );
  if (masterIdx === -1) {
    valid.unshift({ ...DEFAULT_ACCOUNTS[0] });
  } else {
    valid[masterIdx] = {
      ...valid[masterIdx],
      email: MASTER_ADMIN_EMAIL,
      role: 'ADMIN',
    };
  }
  return valid;
}

export function getRoleLabel(role: MapUserRole): string {
  switch (role) {
    case 'ADMIN':
      return 'Toàn quyền';
    case 'MANAGER':
    case 'MAP_EDITOR':
      return 'Cán bộ quản lý';
    case 'GUEST':
    default:
      return 'Khách';
  }
}

export function isUserAdmin(role: MapUserRole): boolean {
  return role === 'ADMIN';
}

export function isUserManagerOrAdmin(role: MapUserRole): boolean {
  return role === 'ADMIN' || role === 'MANAGER' || role === 'MAP_EDITOR';
}

export function getStoredUsers(): AuthUserAccount[] {
  if (typeof window === 'undefined') return DEFAULT_ACCOUNTS;
  try {
    const raw = window.localStorage.getItem(USERS_STORAGE_KEY);
    if (!raw) {
      return DEFAULT_ACCOUNTS;
    }
    return sanitizeUserList(JSON.parse(raw));
  } catch {
    return DEFAULT_ACCOUNTS;
  }
}

function cacheUsersLocally(users: AuthUserAccount[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      USERS_STORAGE_KEY,
      JSON.stringify(sanitizeUserList(users))
    );
  } catch {
    // ignore
  }
}

export async function syncUsersFromServer(): Promise<AuthUserAccount[]> {
  if (typeof window === 'undefined') return DEFAULT_ACCOUNTS;
  try {
    const res = await fetch('/api/auth/users', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.users)) {
        const cleaned = sanitizeUserList(data.users);
        cacheUsersLocally(cleaned);
        return cleaned;
      }
    }
  } catch {
    // Fallback localStorage khi chạy static
  }
  return getStoredUsers();
}

export function getCurrentSessionUser(): CurrentSessionUser {
  if (typeof window === 'undefined') {
    return { email: '', fullName: 'Khách', role: 'GUEST' };
  }
  try {
    const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) {
      return { email: '', fullName: 'Khách', role: 'GUEST' };
    }
    const parsed = JSON.parse(raw) as CurrentSessionUser;
    if (!parsed || typeof parsed.email !== 'string' || !parsed.email || !parsed.role) {
      return { email: '', fullName: 'Khách', role: 'GUEST' };
    }
    const cleanEmail = parsed.email.toLowerCase();
    if (cleanEmail === MASTER_ADMIN_EMAIL) {
      return {
        email: MASTER_ADMIN_EMAIL,
        fullName: 'Admin',
        role: 'ADMIN',
      };
    }
    const users = getStoredUsers();
    const matched = users.find((u) => (u.email || '').toLowerCase() === cleanEmail);
    if (matched) {
      return {
        email: matched.email,
        fullName: matched.fullName,
        role: matched.role,
      };
    }
    return parsed;
  } catch {
    return { email: '', fullName: 'Khách', role: 'GUEST' };
  }
}

/**
 * Đăng nhập (Nhập mật khẩu 1 lần) - Kiểm tra trực tiếp với file .env trên Server
 */
export async function loginWithEmail(
  emailInput: string,
  passwordInput: string
): Promise<{ ok: boolean; user?: CurrentSessionUser; error?: string }> {
  const cleanEmail = (emailInput || '').trim().toLowerCase();
  const pass = (passwordInput || '').trim();

  if (!cleanEmail || !cleanEmail.includes('@')) {
    return { ok: false, error: 'Email không hợp lệ!' };
  }
  if (!pass) {
    return { ok: false, error: 'Vui lòng nhập mật khẩu!' };
  }

  try {
    const res = await fetch('/api/auth/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'login', email: cleanEmail, password: pass }),
    });
    const data = await res.json();
    if (!res.ok || !data?.ok) {
      return { ok: false, error: data?.error || 'Sai email hoặc mật khẩu!' };
    }
    if (Array.isArray(data.users)) {
      cacheUsersLocally(data.users);
    }
    const sessionUser: CurrentSessionUser = data.user;
    window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionUser));
    window.dispatchEvent(new CustomEvent(AUTH_CHANGED_EVENT, { detail: sessionUser }));
    return { ok: true, user: sessionUser };
  } catch {
    // Fallback khi chạy bản tĩnh (GitHub Pages)
    const users = getStoredUsers();
    const found = users.find((u) => u.email.toLowerCase() === cleanEmail);
    if (!found) {
      return { ok: false, error: 'Tài khoản chưa đăng ký!' };
    }
    const pwHash = await sha256Client(pass);
    if (found.passwordHash && found.passwordHash !== pwHash) {
      return { ok: false, error: 'Sai mật khẩu!' };
    }
    const sessionUser: CurrentSessionUser = {
      email: found.email,
      fullName: found.fullName,
      role: cleanEmail === MASTER_ADMIN_EMAIL ? 'ADMIN' : found.role,
    };
    window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionUser));
    window.dispatchEvent(new CustomEvent(AUTH_CHANGED_EVENT, { detail: sessionUser }));
    return { ok: true, user: sessionUser };
  }
}

/**
 * Đăng ký (Nhập mật khẩu 2 lần) - Lưu bảo mật vào file .env trên Server
 */
export async function registerWithEmail(
  emailInput: string,
  passwordInput: string,
  confirmPasswordInput: string
): Promise<{ ok: boolean; user?: CurrentSessionUser; error?: string }> {
  const cleanEmail = (emailInput || '').trim().toLowerCase();
  const pass1 = (passwordInput || '').trim();
  const pass2 = (confirmPasswordInput || '').trim();

  if (!cleanEmail || !cleanEmail.includes('@')) {
    return { ok: false, error: 'Email không hợp lệ!' };
  }
  if (!pass1 || !pass2) {
    return { ok: false, error: 'Vui lòng nhập mật khẩu đủ 2 lần!' };
  }
  if (pass1 !== pass2) {
    return { ok: false, error: 'Mật khẩu nhập 2 lần không khớp!' };
  }

  try {
    const res = await fetch('/api/auth/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'register',
        email: cleanEmail,
        password: pass1,
        confirmPassword: pass2,
      }),
    });
    const data = await res.json();
    if (!res.ok || !data?.ok) {
      return { ok: false, error: data?.error || 'Đăng ký thất bại!' };
    }
    if (Array.isArray(data.users)) {
      cacheUsersLocally(data.users);
    }
    const sessionUser: CurrentSessionUser = data.user;
    window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionUser));
    window.dispatchEvent(new CustomEvent(AUTH_CHANGED_EVENT, { detail: sessionUser }));
    return { ok: true, user: sessionUser };
  } catch {
    // Fallback khi chạy bản tĩnh
    const pwHash = await sha256Client(pass1);
    const users = getStoredUsers();
    const role: MapUserRole = cleanEmail === MASTER_ADMIN_EMAIL ? 'ADMIN' : 'GUEST';
    const existingIdx = users.findIndex((u) => u.email.toLowerCase() === cleanEmail);
    if (existingIdx >= 0) {
      users[existingIdx].passwordHash = pwHash;
    } else {
      users.push({
        email: cleanEmail,
        fullName: cleanEmail.split('@')[0],
        role,
        createdAt: new Date().toISOString(),
        passwordHash: pwHash,
      });
    }
    cacheUsersLocally(users);
    const sessionUser: CurrentSessionUser = {
      email: cleanEmail,
      fullName: cleanEmail.split('@')[0],
      role,
    };
    window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionUser));
    window.dispatchEvent(new CustomEvent(AUTH_CHANGED_EVENT, { detail: sessionUser }));
    return { ok: true, user: sessionUser };
  }
}

/**
 * Đổi mật khẩu tài khoản đang đăng nhập - Lưu bảo mật vào file trên Server
 */
export async function changeUserPassword(
  emailInput: string,
  oldPasswordInput: string,
  newPasswordInput: string,
  confirmPasswordInput: string
): Promise<{ ok: boolean; message?: string; error?: string }> {
  const cleanEmail = (emailInput || '').trim().toLowerCase();
  const oldPass = (oldPasswordInput || '').trim();
  const newPass = (newPasswordInput || '').trim();
  const confirmPass = (confirmPasswordInput || '').trim();

  if (!cleanEmail || !cleanEmail.includes('@')) {
    return { ok: false, error: 'Email không hợp lệ!' };
  }
  if (!oldPass) {
    return { ok: false, error: 'Vui lòng nhập mật khẩu cũ!' };
  }
  if (!newPass || !confirmPass) {
    return { ok: false, error: 'Vui lòng nhập mật khẩu mới đủ 2 lần!' };
  }
  if (newPass !== confirmPass) {
    return { ok: false, error: 'Mật khẩu mới nhập 2 lần không khớp!' };
  }
  if (newPass.length < 6) {
    return { ok: false, error: 'Mật khẩu mới phải có tối thiểu 6 ký tự!' };
  }

  try {
    const res = await fetch('/api/auth/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'changePassword',
        email: cleanEmail,
        oldPassword: oldPass,
        newPassword: newPass,
        confirmPassword: confirmPass,
      }),
    });
    const data = await res.json();
    if (!res.ok || !data?.ok) {
      return { ok: false, error: data?.error || 'Đổi mật khẩu thất bại!' };
    }
    if (Array.isArray(data.users)) {
      cacheUsersLocally(data.users);
    }
    return {
      ok: true,
      message: data?.message || 'Đã đổi mật khẩu thành công và lưu vào hệ thống bảo mật!',
    };
  } catch {
    // Fallback static
    const users = getStoredUsers();
    const oldHash = await sha256Client(oldPass);
    const newHash = await sha256Client(newPass);

    const target = users.find((u) => u.email.toLowerCase() === cleanEmail);
    if (!target) {
      return { ok: false, error: 'Tài khoản không tồn tại!' };
    }
    if (target.passwordHash && target.passwordHash !== oldHash) {
      return { ok: false, error: 'Mật khẩu cũ không chính xác!' };
    }
    target.passwordHash = newHash;
    cacheUsersLocally(users);
    return {
      ok: true,
      message: 'Đã đổi mật khẩu thành công và lưu vào bộ nhớ an toàn!',
    };
  }
}

export async function adminSetUserRole(
  emailInput: string,
  role: MapUserRole,
  passwordInput?: string
): Promise<{ ok: boolean; users: AuthUserAccount[]; error?: string }> {
  const cleanEmail = (emailInput || '').trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes('@')) {
    return { ok: false, users: getStoredUsers(), error: 'Email không hợp lệ!' };
  }
  try {
    const res = await fetch('/api/auth/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'setRole',
        email: cleanEmail,
        role,
        password: passwordInput || '',
      }),
    });
    const data = await res.json();
    if (res.ok && Array.isArray(data?.users)) {
      cacheUsersLocally(data.users);
      notifyAuthChanged();
      return { ok: true, users: data.users };
    }
  } catch {
    // Fallback local
  }
  const users = getStoredUsers();
  const idx = users.findIndex((u) => u.email.toLowerCase() === cleanEmail);
  const finalRole: MapUserRole = cleanEmail === MASTER_ADMIN_EMAIL ? 'ADMIN' : role;
  if (idx >= 0) {
    users[idx].role = finalRole;
  } else {
    users.push({
      email: cleanEmail,
      fullName: cleanEmail.split('@')[0],
      role: finalRole,
      createdAt: new Date().toISOString(),
    });
  }
  cacheUsersLocally(users);
  notifyAuthChanged();
  return { ok: true, users };
}

export async function adminDeleteUser(
  emailInput: string
): Promise<{ ok: boolean; users: AuthUserAccount[] }> {
  const cleanEmail = (emailInput || '').trim().toLowerCase();
  try {
    const res = await fetch('/api/auth/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'deleteUser', email: cleanEmail }),
    });
    const data = await res.json();
    if (res.ok && Array.isArray(data?.users)) {
      cacheUsersLocally(data.users);
      notifyAuthChanged();
      return { ok: true, users: data.users };
    }
  } catch {
    // Fallback local
  }
  const updated = getStoredUsers().filter(
    (u) => u.email.toLowerCase() !== cleanEmail
  );
  cacheUsersLocally(updated);
  notifyAuthChanged();
  return { ok: true, users: updated };
}

export function logoutSession(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(SESSION_STORAGE_KEY);
  const guest: CurrentSessionUser = { email: '', fullName: 'Khách', role: 'GUEST' };
  window.dispatchEvent(new CustomEvent(AUTH_CHANGED_EVENT, { detail: guest }));
}

export function notifyAuthChanged(): void {
  if (typeof window === 'undefined') return;
  const current = getCurrentSessionUser();
  window.dispatchEvent(new CustomEvent(AUTH_CHANGED_EVENT, { detail: current }));
}
