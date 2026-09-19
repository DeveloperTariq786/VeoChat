import { NextRequest } from 'next/server';
import { handleGetRecommendations } from '@/server/routes/recommendations';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return handleGetRecommendations(req, context);
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return handleGetRecommendations(req, context);
}
