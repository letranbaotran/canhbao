import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { AuthUserAccount, MapUserRole, MASTER_ADMIN_EMAIL } from '@/services/authRoleService';

const ENV_FILE_PATH = path.join(process.cwd(), '.env');
// Bản sao đối xứng bảo mật trong volume bền vững (tự động khôi phục chéo nếu file .env bị ghi đè khi upload mới)
const DOCKER_ENV_STORE_PATH = path.join(process.cwd(), 'public', 'storage', 'kml', '.env.auth');
const LEGACY_PUBLIC_FILE = path.join(process.cwd(), 'public', 'storage', 'auth', 'users.json');

interface EnvStoredUser extends AuthUserAccount {
  passwordHash?: string;
}

function hashPassword(raw: string): string {
  return crypto.createHash('sha256').update(`easup_salt_${raw}`).digest('hex');
}

const DEFAULT_ADMIN_PASSWORD_HASH = hashPassword('Hh@$123456');

function removeLegacyPublicFile() {
  try {
    if (fs.existsSync(LEGACY_PUBLIC_FILE)) {
      fs.unlinkSync(LEGACY_PUBLIC_FILE);
    }
  } catch {
    // ignore
  }
}

function parseEnvContent(content: string): Record<string, string> {
  const map: Record<string, string> = {};
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx > 0) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      map[key] = val;
    }
  }
  return map;
}

function parseUserJsonList(rawJson?: string): EnvStoredUser[] {
  if (!rawJson) return [];
  try {
    const normalizedJson = rawJson.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    const parsed = JSON.parse(normalizedJson);
    if (Array.isArray(parsed)) {
      return parsed.filter(
        (u) => u && typeof u.email === 'string' && u.email.includes('@')
      );
    }
  } catch {
    // ignore
  }
  return [];
}

function updateEnvKeys(updates: Record<string, string>) {
  for (const [key, value] of Object.entries(updates)) {
    process.env[key] = value;
  }

  // 1. Ghi vào file .env gốc (dùng callback () => ... trong replace để bảo toàn tuyệt đối ký tự $ trong mật khẩu)
  try {
    let content = fs.existsSync(ENV_FILE_PATH)
      ? fs.readFileSync(ENV_FILE_PATH, 'utf-8')
      : '';
    for (const [key, value] of Object.entries(updates)) {
      const regex = new RegExp(`^${key}=.*$`, 'm');
      if (regex.test(content)) {
        content = content.replace(regex, () => `${key}='${value}'`);
      } else {
        content = `${content.trimEnd()}\n${key}='${value}'\n`;
      }
    }
    fs.writeFileSync(ENV_FILE_PATH, content, 'utf-8');
  } catch {
    // ignore if read-only mount
  }

  // 2. Luôn đồng bộ bản sao đối xứng vào volume bền vững (.env.auth) để nếu up đè file .env mới vẫn không bao giờ mất tài khoản đã đăng ký
  try {
    const dir = path.dirname(DOCKER_ENV_STORE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    let storeContent = fs.existsSync(DOCKER_ENV_STORE_PATH)
      ? fs.readFileSync(DOCKER_ENV_STORE_PATH, 'utf-8')
      : '';
    for (const [key, value] of Object.entries(updates)) {
      const regex = new RegExp(`^${key}=.*$`, 'm');
      if (regex.test(storeContent)) {
        storeContent = storeContent.replace(regex, () => `${key}='${value}'`);
      } else {
        storeContent = `${storeContent.trimEnd()}\n${key}='${value}'\n`;
      }
    }
    fs.writeFileSync(DOCKER_ENV_STORE_PATH, storeContent, 'utf-8');
  } catch {
    // ignore
  }
}

function loadUsersFromEnv(): {
  adminEmail: string;
  adminPasswordHash: string;
  rawAdminPassword: string;
  users: EnvStoredUser[];
} {
  removeLegacyPublicFile();

  let mainEnvMap: Record<string, string> = {};
  let backupEnvMap: Record<string, string> = {};

  try {
    if (fs.existsSync(ENV_FILE_PATH)) {
      mainEnvMap = parseEnvContent(fs.readFileSync(ENV_FILE_PATH, 'utf-8'));
    }
  } catch {}

  try {
    if (fs.existsSync(DOCKER_ENV_STORE_PATH)) {
      backupEnvMap = parseEnvContent(fs.readFileSync(DOCKER_ENV_STORE_PATH, 'utf-8'));
    }
  } catch {}

  const envMap = { ...backupEnvMap, ...mainEnvMap };

  const adminEmail = (
    envMap.ADMIN_EMAIL ||
    process.env.ADMIN_EMAIL ||
    MASTER_ADMIN_EMAIL
  )
    .trim()
    .toLowerCase();

  const rawAdminPassFromEnv =
    mainEnvMap.ADMIN_PASSWORD ||
    backupEnvMap.ADMIN_PASSWORD ||
    process.env.ADMIN_PASSWORD ||
    '';
  const explicitHash =
    backupEnvMap.ADMIN_PASSWORD_HASH ||
    mainEnvMap.ADMIN_PASSWORD_HASH ||
    process.env.ADMIN_PASSWORD_HASH ||
    '';

  const isInvalidPlaceholder =
    !rawAdminPassFromEnv ||
    rawAdminPassFromEnv === 'your_secure_admin_password' ||
    rawAdminPassFromEnv === 'Hh@';

  const adminPasswordHash = explicitHash
    ? explicitHash
    : !isInvalidPlaceholder
    ? hashPassword(rawAdminPassFromEnv)
    : DEFAULT_ADMIN_PASSWORD_HASH;

  // GỘP BẢO TOÀN DANH SÁCH NGƯỜI DÙNG ĐĂNG KÝ TỪ CẢ .env VÀ .env.auth (nếu up lại file .env mới có AUTH_USERS_ENV_JSON='[]' thì vẫn tự khôi phục từ .env.auth)
  const listFromMain = parseUserJsonList(mainEnvMap.AUTH_USERS_ENV_JSON);
  const listFromBackup = parseUserJsonList(backupEnvMap.AUTH_USERS_ENV_JSON);
  const listFromProc = parseUserJsonList(process.env.AUTH_USERS_ENV_JSON);

  const mergedMap = new Map<string, EnvStoredUser>();
  for (const srcList of [listFromProc, listFromBackup, listFromMain]) {
    for (const u of srcList) {
      const key = u.email.toLowerCase();
      const prev = mergedMap.get(key);
      if (!prev) {
        mergedMap.set(key, { ...u, email: key });
      } else {
        mergedMap.set(key, {
          ...prev,
          ...u,
          email: key,
          role: u.role && u.role !== 'GUEST' ? u.role : prev.role,
          passwordHash: u.passwordHash || prev.passwordHash,
        });
      }
    }
  }

  const list = Array.from(mergedMap.values());

  const masterIdx = list.findIndex((u) => u.email.toLowerCase() === adminEmail);
  const masterObj: EnvStoredUser = {
    email: adminEmail,
    fullName: 'Admin',
    role: 'ADMIN',
    createdAt: '2026-01-01T00:00:00.000Z',
    passwordHash: adminPasswordHash,
  };

  if (masterIdx === -1) {
    list.unshift(masterObj);
  } else {
    list[masterIdx] = {
      ...list[masterIdx],
      email: adminEmail,
      role: 'ADMIN',
      passwordHash: adminPasswordHash,
    };
  }

  // Nếu file .env mới được up lên mà bị thiếu danh sách user đã có trong bản sao .env.auth, tự động đồng bộ ngược lại vào .env
  if (listFromBackup.length > listFromMain.length) {
    updateEnvKeys({ AUTH_USERS_ENV_JSON: JSON.stringify(list) });
  }

  return {
    adminEmail,
    adminPasswordHash,
    rawAdminPassword: isInvalidPlaceholder ? '' : rawAdminPassFromEnv,
    users: list,
  };
}

function stripPasswords(users: EnvStoredUser[]): AuthUserAccount[] {
  return users.map(({ email, fullName, role, createdAt }) => ({
    email,
    fullName,
    role,
    createdAt,
  }));
}

export async function GET() {
  const { users } = loadUsersFromEnv();
  return NextResponse.json({ ok: true, users: stripPasswords(users) });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const action = body?.action || 'sync';
    const { adminEmail, adminPasswordHash, rawAdminPassword, users } = loadUsersFromEnv();

    if (action === 'login') {
      const email = String(body?.email || '').trim().toLowerCase();
      const password = String(body?.password || '').trim();

      if (!email || !email.includes('@') || !password) {
        return NextResponse.json(
          { ok: false, error: 'Vui lòng nhập Email và Mật khẩu!' },
          { status: 400 }
        );
      }

      const inputHash = hashPassword(password);

      if (email === adminEmail) {
        const isMatch =
          inputHash === adminPasswordHash ||
          inputHash === DEFAULT_ADMIN_PASSWORD_HASH ||
          (rawAdminPassword && password === rawAdminPassword);

        if (!isMatch) {
          return NextResponse.json(
            { ok: false, error: 'Sai mật khẩu!' },
            { status: 401 }
          );
        }
        return NextResponse.json({
          ok: true,
          user: { email: adminEmail, fullName: 'Admin', role: 'ADMIN' },
          users: stripPasswords(users),
        });
      }

      const found = users.find((u) => u.email.toLowerCase() === email);
      if (!found) {
        return NextResponse.json(
          { ok: false, error: 'Tài khoản chưa đăng ký!' },
          { status: 404 }
        );
      }

      if (found.passwordHash && found.passwordHash !== inputHash) {
        return NextResponse.json(
          { ok: false, error: 'Sai mật khẩu!' },
          { status: 401 }
        );
      }

      if (!found.passwordHash) {
        found.passwordHash = inputHash;
        updateEnvKeys({ AUTH_USERS_ENV_JSON: JSON.stringify(users) });
      }

      return NextResponse.json({
        ok: true,
        user: {
          email: found.email,
          fullName: found.fullName || found.email,
          role: found.role,
        },
        users: stripPasswords(users),
      });
    }

    if (action === 'register') {
      const email = String(body?.email || '').trim().toLowerCase();
      const password = String(body?.password || '').trim();
      const confirmPassword = String(body?.confirmPassword || '').trim();

      if (!email || !email.includes('@')) {
        return NextResponse.json(
          { ok: false, error: 'Email không hợp lệ!' },
          { status: 400 }
        );
      }
      if (!password || !confirmPassword) {
        return NextResponse.json(
          { ok: false, error: 'Vui lòng nhập mật khẩu đủ 2 lần!' },
          { status: 400 }
        );
      }
      if (password !== confirmPassword) {
        return NextResponse.json(
          { ok: false, error: 'Mật khẩu nhập 2 lần không khớp!' },
          { status: 400 }
        );
      }

      const pwHash = hashPassword(password);

      if (email === adminEmail) {
        updateEnvKeys({
          ADMIN_PASSWORD: password,
          ADMIN_PASSWORD_HASH: pwHash,
        });
        return NextResponse.json({
          ok: true,
          user: { email: adminEmail, fullName: 'Admin', role: 'ADMIN' },
          users: stripPasswords(users),
        });
      }

      const existingIdx = users.findIndex((u) => u.email.toLowerCase() === email);
      let registeredUser: EnvStoredUser;

      if (existingIdx >= 0) {
        users[existingIdx].passwordHash = pwHash;
        registeredUser = users[existingIdx];
      } else {
        registeredUser = {
          email,
          fullName: email.split('@')[0],
          role: 'GUEST',
          createdAt: new Date().toISOString(),
          passwordHash: pwHash,
        };
        users.push(registeredUser);
      }

      updateEnvKeys({ AUTH_USERS_ENV_JSON: JSON.stringify(users) });

      return NextResponse.json({
        ok: true,
        user: {
          email: registeredUser.email,
          fullName: registeredUser.fullName,
          role: registeredUser.role,
        },
        users: stripPasswords(users),
      });
    }

    if (action === 'changePassword') {
      const email = String(body?.email || '').trim().toLowerCase();
      const oldPassword = String(body?.oldPassword || '').trim();
      const newPassword = String(body?.newPassword || '').trim();
      const confirmPassword = String(body?.confirmPassword || '').trim();

      if (!email || !email.includes('@')) {
        return NextResponse.json(
          { ok: false, error: 'Email không hợp lệ!' },
          { status: 400 }
        );
      }
      if (!oldPassword) {
        return NextResponse.json(
          { ok: false, error: 'Vui lòng nhập mật khẩu cũ!' },
          { status: 400 }
        );
      }
      if (!newPassword || !confirmPassword) {
        return NextResponse.json(
          { ok: false, error: 'Vui lòng nhập mật khẩu mới đủ 2 lần!' },
          { status: 400 }
        );
      }
      if (newPassword !== confirmPassword) {
        return NextResponse.json(
          { ok: false, error: 'Mật khẩu mới nhập 2 lần không khớp!' },
          { status: 400 }
        );
      }
      if (newPassword.length < 6) {
        return NextResponse.json(
          { ok: false, error: 'Mật khẩu mới phải có tối thiểu 6 ký tự!' },
          { status: 400 }
        );
      }

      const oldInputHash = hashPassword(oldPassword);
      const newHash = hashPassword(newPassword);

      if (email === adminEmail) {
        const isMatch =
          oldInputHash === adminPasswordHash ||
          oldInputHash === DEFAULT_ADMIN_PASSWORD_HASH ||
          (rawAdminPassword && oldPassword === rawAdminPassword);

        if (!isMatch) {
          return NextResponse.json(
            { ok: false, error: 'Mật khẩu cũ không chính xác!' },
            { status: 401 }
          );
        }

        const masterIdx = users.findIndex((u) => u.email.toLowerCase() === adminEmail);
        if (masterIdx >= 0) {
          users[masterIdx].passwordHash = newHash;
        }
        updateEnvKeys({
          ADMIN_PASSWORD: newPassword,
          ADMIN_PASSWORD_HASH: newHash,
          AUTH_USERS_ENV_JSON: JSON.stringify(users),
        });
        return NextResponse.json({
          ok: true,
          message: 'Đã đổi mật khẩu Admin thành công và lưu vào hệ thống bảo mật!',
          users: stripPasswords(users),
        });
      }

      const userIdx = users.findIndex((u) => u.email.toLowerCase() === email);
      if (userIdx === -1) {
        return NextResponse.json(
          { ok: false, error: 'Tài khoản không tồn tại!' },
          { status: 404 }
        );
      }

      const targetUser = users[userIdx];
      if (targetUser.passwordHash && targetUser.passwordHash !== oldInputHash) {
        return NextResponse.json(
          { ok: false, error: 'Mật khẩu cũ không chính xác!' },
          { status: 401 }
        );
      }

      targetUser.passwordHash = newHash;
      updateEnvKeys({ AUTH_USERS_ENV_JSON: JSON.stringify(users) });

      return NextResponse.json({
        ok: true,
        message: 'Đã đổi mật khẩu thành công và lưu vào hệ thống bảo mật!',
        users: stripPasswords(users),
      });
    }

    if (action === 'setRole') {
      const targetEmail = String(body?.email || '').trim().toLowerCase();
      const role = (body?.role || 'MAP_EDITOR') as MapUserRole;
      const password = String(body?.password || '').trim();

      if (!targetEmail || !targetEmail.includes('@')) {
        return NextResponse.json({ ok: false, error: 'Email không hợp lệ!' }, { status: 400 });
      }

      const finalRole: MapUserRole = targetEmail === adminEmail ? 'ADMIN' : role;
      const idx = users.findIndex((u) => u.email.toLowerCase() === targetEmail);
      if (idx >= 0) {
        users[idx].role = finalRole;
        if (password) {
          users[idx].passwordHash = hashPassword(password);
        }
      } else {
        users.push({
          email: targetEmail,
          fullName: targetEmail.split('@')[0],
          role: finalRole,
          createdAt: new Date().toISOString(),
          passwordHash: password ? hashPassword(password) : undefined,
        });
      }

      if (targetEmail === adminEmail && password) {
        updateEnvKeys({
          ADMIN_PASSWORD: password,
          ADMIN_PASSWORD_HASH: hashPassword(password),
          AUTH_USERS_ENV_JSON: JSON.stringify(users),
        });
      } else {
        updateEnvKeys({ AUTH_USERS_ENV_JSON: JSON.stringify(users) });
      }

      return NextResponse.json({ ok: true, users: stripPasswords(users) });
    }

    if (action === 'deleteUser') {
      const targetEmail = String(body?.email || '').trim().toLowerCase();
      if (targetEmail === adminEmail) {
        return NextResponse.json(
          { ok: false, error: 'Không thể xóa Admin gốc!' },
          { status: 400 }
        );
      }
      const filtered = users.filter((u) => u.email.toLowerCase() !== targetEmail);
      updateEnvKeys({ AUTH_USERS_ENV_JSON: JSON.stringify(filtered) });
      return NextResponse.json({ ok: true, users: stripPasswords(filtered) });
    }

    return NextResponse.json({ ok: true, users: stripPasswords(users) });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || 'Lỗi máy chủ' },
      { status: 500 }
    );
  }
}
