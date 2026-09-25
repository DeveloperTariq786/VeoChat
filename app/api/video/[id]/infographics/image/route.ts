import { NextRequest } from 'next/server';
import { handleInfographicImage } from '@/server/routes/infographics';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return handleInfographicImage(req, context);
}
