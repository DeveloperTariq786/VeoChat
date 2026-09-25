import { NextRequest, NextResponse } from 'next/server';
import { getOrGenerateInfographics, generateInfographicImage } from '@/server/services/gemini';
import { extractYouTubeId, getVideoById } from '@/server/services/serpapi';

export async function POST(
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
    const action = body.action || 'outline';

    // Sub-action: Generate individual image for a step
    if (action === 'generate-image') {
      const prompt = body.prompt;
      const title = body.title || 'Concept';
      if (!prompt) {
        return NextResponse.json(
          { error: 'Prompt is required for image generation' },
          { status: 400 }
        );
      }
      const imageResult = await generateInfographicImage(prompt, title);
      return NextResponse.json(imageResult);
    }

    // Default action: Generate or retrieve infographics storyboard outline
    const forceRegenerate = Boolean(body.forceRegenerate);
    const videoMetadata = await getVideoById(cleanId);
    const result = await getOrGenerateInfographics(cleanId, videoMetadata, forceRegenerate);

    return NextResponse.json(result);
  } catch (err) {
    console.error('Error handling video infographics:', err);
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : 'An unexpected error occurred while generating infographics with Gemini.',
      },
      { status: 500 }
    );
  }
}
