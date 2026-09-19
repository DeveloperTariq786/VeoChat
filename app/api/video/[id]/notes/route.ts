import { NextRequest } from 'next/server';
import { handleVideoNotes } from '@/server/routes/notes';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return handleVideoNotes(req, context);
}
