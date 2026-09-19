import { NextRequest, NextResponse } from 'next/server';
import { extractYouTubeId, getVideoById, getRelatedRecommendations } from '@/server/services/serpapi';

export async function handleGetRecommendations(
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

    const videoMetadata = await getVideoById(cleanId);
    const result = await getRelatedRecommendations(cleanId, videoMetadata);

    return NextResponse.json(result);
  } catch (err) {
    console.error('Error handling recommendations:', err);
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : 'An unexpected error occurred while fetching video recommendations.',
      },
      { status: 500 }
    );
  }
}
