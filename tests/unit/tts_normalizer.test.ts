import { describe, it, expect } from 'vitest';
import {
  normalizeTextForTTS,
  generateBulletinHash,
} from '@/utils/tts_normalizer';

describe('PHẦN 6: Tiền xử lý & Chuẩn hóa Từ điển Hành chính cho AI TTS', () => {
  it('phải tự động bung toàn bộ các từ viết tắt hành chính và quân sự', () => {
    const raw = 'UBMTTQ và UBND xã Ea Súp cùng HĐND, BCHQS và Ban chỉ huy PCTT & TKCN.';
    const normalized = normalizeTextForTTS(raw);

    expect(normalized).toContain('Ủy ban Mặt trận Tổ quốc');
    expect(normalized).toContain('Ủy ban nhân dân');
    expect(normalized).toContain('Hội đồng nhân dân');
    expect(normalized).toContain('Ban Chỉ huy Quân sự');
    expect(normalized).toContain('Phòng chống thiên tai và Tìm kiếm cứu nạn');
    expect(normalized).not.toContain('UBMTTQ');
    expect(normalized).not.toContain('UBND');
  });

  it('phải chuyển đổi định dạng ngày dd/mm/yyyy sang ngày tiếng Việt chuẩn', () => {
    const raw = 'Thông báo phát lệnh từ 02/11/2026.';
    const normalized = normalizeTextForTTS(raw);

    expect(normalized).toContain('ngày 02 tháng 11 năm 2026');
  });

  it('phải bung chuẩn các thuật ngữ địa bàn như TK 277 và DTTS', () => {
    const raw = 'Tuần tra tại TK 277 hỗ trợ đồng bào DTTS Buôn A.';
    const normalized = normalizeTextForTTS(raw);

    expect(normalized).toContain('Tiểu khu 277');
    expect(normalized).toContain('dân tộc thiểu số');
  });

  it('phải lọc sạch các thẻ HTML và ký tự đặc biệt nguy hại', () => {
    const raw = '<p>Báo động khẩn: <b>Hồ Thượng xả lũ</b>! &lt;script&gt;</p>';
    const normalized = normalizeTextForTTS(raw);

    expect(normalized).not.toContain('<p>');
    expect(normalized).not.toContain('<b>');
    expect(normalized).not.toContain('script');
    expect(normalized).toContain('Báo động khẩn: Hồ Thượng xả lũ!');
  });

  it('phải tạo mã băm SHA-256 nhất quán cho nội dung bản tin (contentHash)', () => {
    const text1 = 'Nội dung kiểm tra bản tin A';
    const text2 = 'Nội dung kiểm tra bản tin A';
    const text3 = 'Nội dung kiểm tra bản tin B';

    const hash1 = generateBulletinHash(text1);
    const hash2 = generateBulletinHash(text2);
    const hash3 = generateBulletinHash(text3);

    expect(hash1).toBe(hash2);
    expect(hash1).not.toBe(hash3);
    expect(hash1.length).toBe(64);
  });
});
