import { NextRequest } from 'next/server';
import { handleSuggestions } from '@/server/routes/suggestions';

export async function POST(req: NextRequest) {
  return handleSuggestions(req);
}
