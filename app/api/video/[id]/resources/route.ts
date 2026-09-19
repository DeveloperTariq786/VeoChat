import { NextRequest } from 'next/server';
import { handleGetResources } from '@/server/routes/resources';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return handleGetResources(req, context);
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return handleGetResources(req, context);
}
