import crypto from 'crypto';

export interface TelemetryPayload {
  stationId: string;
  timestamp?: number;
  [key: string]: unknown;
}

/**
 * Chuẩn hóa payload thành chuỗi JSON sắp xếp theo key để bảo đảm tính tất định
 */
function serializePayload(payload: Record<string, unknown>): string {
  const sortedKeys = Object.keys(payload).sort();
  const sortedObj: Record<string, unknown> = {};
  for (const key of sortedKeys) {
    sortedObj[key] = payload[key];
  }
  return JSON.stringify(sortedObj);
}

/**
 * Tạo chữ ký HMAC-SHA256 cho gói tin IoT Telemetry
 */
export function generateIoTSignature(payload: Record<string, unknown>, secretKey: string): string {
  const serialized = serializePayload(payload);
  return crypto.createHmac('sha256', secretKey).update(serialized).digest('hex');
}

/**
 * Xác minh chữ ký X-IoT-Signature của trạm quan trắc
 */
export function verifyIoTSignature(
  payload: Record<string, unknown>,
  signature: string,
  secretKey: string
): boolean {
  if (!signature || !secretKey) return false;
  const expectedSignature = generateIoTSignature(payload, secretKey);
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  } catch {
    return false;
  }
}

/**
 * Kiểm tra tính hợp lệ toàn diện của gói tin: Chữ ký + Chống Replay (trong vòng 5 phút)
 */
export function validateTelemetryPacket(
  payload: TelemetryPayload,
  signature: string,
  secretKey: string,
  maxSkewMs: number = 5 * 60 * 1000
): { valid: boolean; error?: string } {
  // 1. Kiểm tra thời gian (Replay Attack)
  if (payload.timestamp) {
    const now = Date.now();
    const diff = Math.abs(now - payload.timestamp);
    if (diff > maxSkewMs) {
      return {
        valid: false,
        error: `Gói tin quá hạn (Lệch ${Math.round(diff / 1000)}s > tối đa ${maxSkewMs / 1000}s)`,
      };
    }
  }

  // 2. Kiểm tra chữ ký HMAC
  const isSignatureValid = verifyIoTSignature(payload, signature, secretKey);
  if (!isSignatureValid) {
    return {
      valid: false,
      error: 'Chữ ký X-IoT-Signature không hợp lệ hoặc dữ liệu bị sửa đổi',
    };
  }

  return { valid: true };
}
