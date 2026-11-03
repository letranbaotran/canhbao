import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { AuthUserAccount, MapUserRole, MASTER_ADMIN_EMAIL } from '@/services/authRoleService';

const ENV_FILE_PATH = path.join(process.cwd(), '.env');
// File .env phụ lưu bền vững trong volume được cấp quyền ghi cho container Docker (nextjs uid 1001)
const DOCKER_ENV_STORE_PATH = path.join(process.cwd(), 'public', 'storage', 'kml', '.env.auth');
const LEGACY_PUBLIC_FILE = path.join(process.cwd(), 'public', 'storage', 'auth', 'users.json');

interface EnvStoredUser extends AuthUserAccount {
  passwordHash?: string;
}

function hashPassword(raw: string): string {
  return crypto.createHash('sha256').update(`easup_salt_${raw}`).digest('hex');
}

// Mã băm mặc định của mật khẩu Admin (Hh@$123456) để không bao giờ bị lỗi biến môi trường $123456 trong Docker Compose
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

function readEnvMap(): Record<string, string> {
  removeLegacyPublicFile();
  let map: Record<string, string> = {};
  try {
    if (fs.existsSync(ENV_FILE_PATH)) {
      map = { ...map, ...parseEnvContent(fs.readFileSync(ENV_FILE_PATH, 'utf-8')) };
    }
  } catch {
    // Nếu container không có quyền đọc /app/.env của root
  }
  try {
    if (fs.existsSync(DOCKER_ENV_STORE_PATH)) {
      map = { ...map, ...parseEnvContent(fs.readFileSync(DOCKER_ENV_STORE_PATH, 'utf-8')) };
    }
  } catch {
    // ignore
  }
  return map;
}

function updateEnvKeys(updates: Record<string, string>) {
  for (const [key, value] of Object.entries(updates)) {
    process.env[key] = value;
  }

  // 1. Ghi vào file .env gốc (nếu có quyền ghi)
  try {
    let content = fs.existsSync(ENV_FILE_PATH)
      ? fs.readFileSync(ENV_FILE_PATH, 'utf-8')
      : '';
    for (const [key, value] of Object.entries(updates)) {
      // Dùng dấu nháy đơn để tránh Docker/Next.js tự nội suy ký tự $ trong mật khẩu
      const regex = new RegExp(`^${key}=.*$`, 'm');
      if (regex.test(content)) {
        content = content.replace(regex, `${key}='${value}'`);
      } else {
        content = `${content.trimEnd()}\n${key}='${value}'\n`;
      }
    }
    fs.writeFileSync(ENV_FILE_PATH, content, 'utf-8');
  } catch {
    // Container user nextjs có thể không ghi đè được file root .env
  }

  // 2. Luôn đồng bộ bản sao .env bảo mật vào volume Docker có quyền ghi bền vững
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
        storeContent = storeContent.replace(regex, `${key}='${value}'`);
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
  const envMap = readEnvMap();
  const adminEmail = (
    envMap.ADMIN_EMAIL ||
    process.env.ADMIN_EMAIL ||
    MASTER_ADMIN_EMAIL
  )
    .trim()
    .toLowerCase();

  const rawAdminPassFromEnv =
    envMap.ADMIN_PASSWORD ?? process.env.ADMIN_PASSWORD ?? '';
  const explicitHash =
    envMap.ADMIN_PASSWORD_HASH ?? process.env.ADMIN_PASSWORD_HASH ?? '';

  // Bỏ qua giá trị mẫu "your_secure_admin_password" hoặc giá trị bị cắt cụt "Hh@" do biến $123456 trong Docker Compose
  const isInvalidPlaceholder =
    !rawAdminPassFromEnv ||
    rawAdminPassFromEnv === 'your_secure_admin_password' ||
    rawAdminPassFromEnv === 'Hh@';

  const adminPasswordHash = explicitHash
    ? explicitHash
    : !isInvalidPlaceholder
    ? hashPassword(rawAdminPassFromEnv)
    : DEFAULT_ADMIN_PASSWORD_HASH;

  let list: EnvStoredUser[] = [];
  const rawJson = envMap.AUTH_USERS_ENV_JSON || process.env.AUTH_USERS_ENV_JSON || '[]';
  try {
    const normalizedJson = rawJson.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    const parsed = JSON.parse(normalizedJson);
    if (Array.isArray(parsed)) {
      list = parsed.filter(
        (u) => u && typeof u.email === 'string' && u.email.includes('@')
      );
    }
  } catch {
    list = [];
  }

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
