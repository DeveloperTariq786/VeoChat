import { NextRequest, NextResponse } from 'next/server';
import { getOrGenerateSlides } from '@/server/services/gemini';
import { extractYouTubeId, getVideoById } from '@/server/services/serpapi';

export async function handleVideoSlides(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const cleanId = extractYouTubeId(id);

    if (!cleanId) {
      return NextResponse.json(
        { error: 'Valid YouTube video ID or URL is required' },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const forceRegenerate = Boolean(body.forceRegenerate);

    const videoMetadata = await getVideoById(cleanId);
    const result = await getOrGenerateSlides(cleanId, videoMetadata, forceRegenerate);

    return NextResponse.json(result);
  } catch (err) {
    console.error('Error handling video slides:', err);
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : 'An unexpected error occurred while generating slides with Gemini.',
      },
      { status: 500 }
    );
  }
}
