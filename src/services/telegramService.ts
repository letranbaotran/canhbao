/**
 * DỊCH VỤ ĐẨY CẢNH BÁO TELEGRAM ĐẾN BAN CHỈ HUY PCTT & 20 TRƯỞNG THÔN, BUÔN
 */

export interface TelegramAlertPayload {
  bulletinCode: string;
  category: 'FIRE_ALERT' | 'FOREST_ENCROACHMENT' | 'FLOOD_DISCHARGE' | 'DROUGHT_IRRIGATION';
  severity: 'INFO' | 'WARNING' | 'EMERGENCY_SOS';
  title: string;
  summary: string;
  targetVillages: string[];
  audioUrl?: string;
}

export async function sendTelegramEmergencyAlert(payload: TelegramAlertPayload): Promise<boolean> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  const severityIcon =
    payload.severity === 'EMERGENCY_SOS' ? '🚨🚨 KHẨN CẤP' : '⚠️ BÁO ĐỘNG';

  const messageText = `
${severityIcon}: ${payload.title}
Mã hiệu: ${payload.bulletinCode}
Loại hình: ${payload.category}
Địa bàn: ${payload.targetVillages.join(', ')}

Tóm tắt nội dung:
${payload.summary}

Hệ sinh thái Chuyển đổi số canhbao.easupso.com
  `.trim();

  if (!botToken || !chatId) {
    console.log('[MOCK TELEGRAM DISPATCH]', messageText);
    return true;
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: messageText,
        parse_mode: 'HTML',
      }),
    });
    return res.ok;
  } catch (err) {
    console.error('Lỗi khi gửi cảnh báo Telegram:', err);
    return false;
  }
}
