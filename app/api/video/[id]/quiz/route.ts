import { NextRequest } from 'next/server';
import { handleVideoQuiz } from '@/server/routes/quiz';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return handleVideoQuiz(req, context);
}
