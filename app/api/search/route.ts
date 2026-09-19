import { NextRequest } from 'next/server';
import { handleSearch } from '@/server/routes/search';

export async function POST(req: NextRequest) {
  return handleSearch(req);
}
