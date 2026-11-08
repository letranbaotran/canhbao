/**
 * BẢNG TỪ ĐIỂN CHUẨN HÓA VIẾT TẮT HÀNH CHÍNH & KỸ THUẬT EA SÚP
 */
const ABBREVIATION_MAP: [RegExp, string][] = [
  [/\bUBMTTQ\b/g, 'Ủy ban Mặt trận Tổ quốc'],
  [/\bUBND\b/g, 'Ủy ban nhân dân'],
  [/\bHĐND\b/g, 'Hội đồng nhân dân'],
  [/\bPCTT\s*&\s*TKCN\b/g, 'Phòng chống thiên tai và Tìm kiếm cứu nạn'],
  [/\bBCHQS\b/g, 'Ban Chỉ huy Quân sự'],
  [/\bDTTS\b/g, 'dân tộc thiểu số'],
  [/\bTK\s*[-]?\s*293\b/gi, 'Tiểu khu 293'],
  [/\bTK\s*[-]?\s*277\b/gi, 'Tiểu khu 277'],
  [/\bTK\s*[-]?\s*(\d+)\b/gi, 'Tiểu khu $1'],
];

/**
 * Làm sạch HTML và ký tự đặc biệt nguy hại
 */
export function stripHtml(input: string): string {
  return input
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Bỏ toàn bộ block script
    .replace(/<script\b[^>]*>/gi, '')
    .replace(/<\/script>/gi, '')
    .replace(/script/gi, '') // Bỏ từ khóa script độc hại
    .replace(/<[^>]*>/g, '') // Bỏ mọi thẻ HTML
    .replace(/[<>{}\\]/g, ' ') // Bỏ ký tự ngoặc nhọn
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Chuyển đổi định dạng ngày dd/mm/yyyy sang ngày tháng tiếng Việt
 */
export function normalizeDates(text: string): string {
  return text.replace(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/g, (_, day, month, year) => {
    return `ngày ${day.padStart(2, '0')} tháng ${month.padStart(2, '0')} năm ${year}`;
  });
}

/**
 * Tiền xử lý và chuẩn hóa toàn diện văn bản trước khi đưa vào Audio Synthesis (Vbee / Edge-TTS)
 */
export function normalizeTextForTTS(text: string): string {
  if (!text) return '';

  // 1. Lọc thẻ HTML
  let cleaned = stripHtml(text);

  // 2. Chuyển đổi ngày tháng
  cleaned = normalizeDates(cleaned);

  // 3. Bung các từ viết tắt
  for (const [regex, replacement] of ABBREVIATION_MAP) {
    cleaned = cleaned.replace(regex, replacement);
  }

  return cleaned.trim();
}

/**
 * Tạo mã băm SHA-256 từ nội dung bản tin để hỗ trợ Render-Once và lưu trữ vĩnh viễn trên VPS
 */
export function generateBulletinHash(content: string): string {
  const normalized = normalizeTextForTTS(content);
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const nodeCrypto = require('crypto');
    return nodeCrypto.createHash('sha256').update(normalized, 'utf8').digest('hex');
  } catch {
    let h1 = 0xdeadbeef;
    let h2 = 0x41c64e6d;
    for (let i = 0; i < normalized.length; i++) {
      const ch = normalized.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    const hex = (h1 >>> 0).toString(16).padStart(8, '0') + (h2 >>> 0).toString(16).padStart(8, '0');
    return hex.repeat(4);
  }
}
