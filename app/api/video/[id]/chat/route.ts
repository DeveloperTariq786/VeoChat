import { NextRequest } from 'next/server';
import { handleVideoChat } from '@/server/routes/chat';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return handleVideoChat(req, context);
}
