import { NextRequest, NextResponse } from 'next/server';
import { validateTelemetryPacket } from '@/security/iot_signature';
import { evaluateForestFireAlert } from '@/services/forest_fire_service';
import { evaluateHydroStationAlarm } from '@/services/hydro_service';
import { sendTelegramEmergencyAlert } from '@/services/telegramService';

export async function POST(req: NextRequest) {
  try {
    const signature = req.headers.get('x-iot-signature') || '';
    const secretKey = process.env.IOT_HMAC_SECRET || 'easup-iot-secret-2026';
    const body = await req.json();

    // 1. Kiểm tra xác thực chữ ký HMAC-SHA256
    const validation = validateTelemetryPacket(body, signature, secretKey);
    if (!validation.valid && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: validation.error }, { status: 401 });
    }

    const { stationId, stationType, airTempC, smokePpm, waterLevelM, riseRateCmPerHour } = body;

    // 2. Xử lý dữ liệu lâm nghiệp (Tiểu khu 277)
    if (stationType === 'FOREST_FIRE_LORAWAN' || (airTempC !== undefined && smokePpm !== undefined)) {
      const fireEvaluation = evaluateForestFireAlert({
        stationId,
        airTempC: Number(airTempC),
        smokePpm: Number(smokePpm),
      });

      if (fireEvaluation.requiresImmediateBroadcast) {
        // Đẩy thông báo khẩn cấp Telegram
        await sendTelegramEmergencyAlert({
          bulletinCode: `FIRE-ALERT-${Date.now()}`,
          category: 'FIRE_ALERT',
          severity: 'EMERGENCY_SOS',
          title: `BÁO ĐỘNG ĐỎ CHÁY RỪNG: Trạm ${stationId}`,
          summary: fireEvaluation.reason || 'Nhiệt độ/khói vượt ngưỡng nguy hiểm',
          targetVillages: ['Tiểu khu 277', 'Buôn A', 'Buôn B'],
        });
      }

      return NextResponse.json({
        success: true,
        stationId,
        alert: fireEvaluation,
      });
    }

    // 3. Xử lý dữ liệu thủy văn (Hồ Thượng, Hồ Hạ, Sông Ea Súp)
    if (stationType === 'HYDRO_ULTRASONIC_RADAR' || waterLevelM !== undefined) {
      const hydroEvaluation = evaluateHydroStationAlarm(
        stationId,
        Number(waterLevelM),
        Number(riseRateCmPerHour || 0)
      );

      return NextResponse.json({
        success: true,
        stationId,
        alert: hydroEvaluation,
      });
    }

    return NextResponse.json({ success: true, message: 'Đã nhận telemetry hợp lệ' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
