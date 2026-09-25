import { NextRequest, NextResponse } from 'next/server';
import {
  getOrGenerateInfographics,
  generateInfographicImage,
} from '@/server/services/infographics';
import { extractYouTubeId, getVideoById } from '@/server/services/serpapi';

export async function handleVideoInfographics(
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

export async function handleInfographicImage(
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
    const prompt = body.prompt || body.visualPrompt;
    const title = body.title || 'Infographic';
    const caption = body.caption || '';
    const stepNumber = body.stepNumber || 1;

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required for image generation' },
        { status: 400 }
      );
    }

    const result = await generateInfographicImage(prompt, title, caption, stepNumber);

    return NextResponse.json({
      imageUrl: result.imageUrl,
      source: result.source,
      model: result.model,
      status: 'success',
    });
  } catch (err) {
    console.error('Error generating infographic image:', err);
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : 'An unexpected error occurred while generating image with nano banana model.',
        status: 'error',
      },
      { status: 500 }
    );
  }
}
