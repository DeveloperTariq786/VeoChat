import { NextRequest, NextResponse } from 'next/server';
import { extractYouTubeId, getVideoById, getExternalResources } from '@/server/services/serpapi';

export async function handleGetResources(
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
    const result = await getExternalResources(cleanId, videoMetadata);

    return NextResponse.json(result);
  } catch (err) {
    console.error('Error handling external resources:', err);
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : 'An unexpected error occurred while fetching external resources.',
      },
      { status: 500 }
    );
  }
}
