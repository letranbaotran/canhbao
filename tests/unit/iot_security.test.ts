import { describe, it, expect } from 'vitest';
import {
  generateIoTSignature,
  verifyIoTSignature,
  validateTelemetryPacket,
} from '@/security/iot_signature';

describe('PHẦN 5: An ninh Trạm IoT & Chữ ký HMAC-SHA256', () => {
  const secretKey = 'easup-iot-secret-2026';
  const samplePayload = {
    stationId: 'IOT-TK277-01',
    recordedAt: '2026-11-02T10:00:00.000Z',
    airTempC: 42.5,
    smokePpm: 25.0,
    timestamp: Date.now(),
  };

  it('phải tạo và xác minh thành công chữ ký HMAC-SHA256 hợp lệ', () => {
    const signature = generateIoTSignature(samplePayload, secretKey);
    expect(signature).toBeDefined();
    expect(typeof signature).toBe('string');
    expect(signature.length).toBe(64); // SHA-256 hex string length

    const isValid = verifyIoTSignature(samplePayload, signature, secretKey);
    expect(isValid).toBe(true);
  });

  it('phải từ chối chữ ký khi gói tin bị thay đổi dữ liệu (tampering)', () => {
    const signature = generateIoTSignature(samplePayload, secretKey);
    const tamperedPayload = { ...samplePayload, airTempC: 60.0 };

    const isValid = verifyIoTSignature(tamperedPayload, signature, secretKey);
    expect(isValid).toBe(false);
  });

  it('phải từ chối chữ ký khi sử dụng sai secret key', () => {
    const signature = generateIoTSignature(samplePayload, secretKey);
    const isValid = verifyIoTSignature(samplePayload, signature, 'wrong-secret-key');
    expect(isValid).toBe(false);
  });

  it('phải từ chối gói tin quá cũ (chống Replay Attack vượt quá 5 phút)', () => {
    const oldTimestamp = Date.now() - 6 * 60 * 1000; // 6 phút trước
    const oldPayload = { ...samplePayload, timestamp: oldTimestamp };
    const signature = generateIoTSignature(oldPayload, secretKey);

    const validationResult = validateTelemetryPacket(oldPayload, signature, secretKey);
    expect(validationResult.valid).toBe(false);
    expect(validationResult.error).toContain('Gói tin quá hạn');
  });
});
