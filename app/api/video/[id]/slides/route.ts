import { NextRequest } from 'next/server';
import { handleVideoSlides } from '@/server/routes/slides';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return handleVideoSlides(req, context);
}
