import { NextRequest } from 'next/server';
import { handleGetVideo } from '@/server/routes/video';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return handleGetVideo(req, context);
}
