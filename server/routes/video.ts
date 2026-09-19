import { NextRequest, NextResponse } from 'next/server';
import { getVideoById } from '../services/serpapi';

export async function handleGetVideo(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const params = await context.params;
    const { id } = params;

    if (!id || typeof id !== 'string' || !id.trim()) {
      return NextResponse.json(
        { error: 'Invalid or missing video ID.' },
        { status: 400 }
      );
    }

    const video = await getVideoById(id.trim());

    if (!video) {
      return NextResponse.json(
        { error: `Video with ID "${id}" could not be found.` },
        { status: 404 }
      );
    }

    return NextResponse.json({ video });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json(
      { error: errorMsg },
      { status: 500 }
    );
  }
}
