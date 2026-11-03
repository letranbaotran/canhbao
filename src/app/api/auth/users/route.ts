import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { AuthUserAccount, MapUserRole, MASTER_ADMIN_EMAIL } from '@/services/authRoleService';

const ENV_FILE_PATH = path.join(process.cwd(), '.env');
const LEGACY_PUBLIC_FILE = path.join(process.cwd(), 'public', 'storage', 'auth', 'users.json');

interface EnvStoredUser extends AuthUserAccount {
  passwordHash?: string;
}

function hashPassword(raw: string): string {
  return crypto.createHash('sha256').update(`easup_salt_${raw}`).digest('hex');
}

function removeLegacyPublicFile() {
  try {
    if (fs.existsSync(LEGACY_PUBLIC_FILE)) {
      fs.unlinkSync(LEGACY_PUBLIC_FILE);
    }
  } catch {
    // ignore
  }
}

function readEnvMap(): Record<string, string> {
  removeLegacyPublicFile();
  const map: Record<string, string> = {};
  try {
    if (fs.existsSync(ENV_FILE_PATH)) {
      const content = fs.readFileSync(ENV_FILE_PATH, 'utf-8');
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
    }
  } catch {
    // ignore
  }
  return map;
}

function updateEnvKeys(updates: Record<string, string>) {
  try {
    let content = fs.existsSync(ENV_FILE_PATH)
      ? fs.readFileSync(ENV_FILE_PATH, 'utf-8')
      : '';

    for (const [key, value] of Object.entries(updates)) {
      const escapedVal = value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
      const regex = new RegExp(`^${key}=.*$`, 'm');
      if (regex.test(content)) {
        content = content.replace(regex, `${key}="${escapedVal}"`);
      } else {
        content = `${content.trimEnd()}\n${key}="${escapedVal}"\n`;
      }
      process.env[key] = value;
    }

    fs.writeFileSync(ENV_FILE_PATH, content, 'utf-8');
  } catch (err) {
    console.error('Failed to update .env:', err);
  }
}

function loadUsersFromEnv(): {
  adminEmail: string;
  adminPassword: string;
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
  const adminPassword =
    envMap.ADMIN_PASSWORD ?? process.env.ADMIN_PASSWORD ?? '';

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
    passwordHash: adminPassword ? hashPassword(adminPassword) : undefined,
  };

  if (masterIdx === -1) {
    list.unshift(masterObj);
  } else {
    list[masterIdx] = {
      ...list[masterIdx],
      email: adminEmail,
      role: 'ADMIN',
      passwordHash: adminPassword
        ? hashPassword(adminPassword)
        : list[masterIdx].passwordHash,
    };
  }

  return { adminEmail, adminPassword, users: list };
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
    const { adminEmail, adminPassword, users } = loadUsersFromEnv();

    if (action === 'login') {
      const email = String(body?.email || '').trim().toLowerCase();
      const password = String(body?.password || '').trim();

      if (!email || !email.includes('@') || !password) {
        return NextResponse.json(
          { ok: false, error: 'Vui lòng nhập Email và Mật khẩu!' },
          { status: 400 }
        );
      }

      if (email === adminEmail) {
        if (!adminPassword) {
          // Nếu trong .env chưa đặt mật khẩu, lưu mật khẩu lần đầu vào .env
          updateEnvKeys({ ADMIN_PASSWORD: password });
        } else if (adminPassword !== password) {
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

      const inputHash = hashPassword(password);
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

      if (email === adminEmail) {
        updateEnvKeys({ ADMIN_PASSWORD: password });
        return NextResponse.json({
          ok: true,
          user: { email: adminEmail, fullName: 'Admin', role: 'ADMIN' },
          users: stripPasswords(users),
        });
      }

      const existingIdx = users.findIndex((u) => u.email.toLowerCase() === email);
      const pwHash = hashPassword(password);
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
