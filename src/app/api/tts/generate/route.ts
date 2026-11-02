import { NextRequest, NextResponse } from 'next/server';
import { generateBulletinAudio } from '@/services/ttsService';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { bulletinId, title, content, voiceLabel } = body;

    if (!bulletinId || !title || !content) {
      return NextResponse.json(
        { error: 'Thiếu thông tin bulletinId, title hoặc content' },
        { status: 400 }
      );
    }

    const result = await generateBulletinAudio({
      bulletinId,
      title,
      content,
      voiceLabel,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
