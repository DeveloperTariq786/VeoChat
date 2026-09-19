import { NextRequest } from 'next/server';
import { handleVideoFlashcards } from '@/server/routes/flashcards';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return handleVideoFlashcards(req, context);
}
