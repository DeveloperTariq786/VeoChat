import { NextRequest, NextResponse } from 'next/server';
import { chatWithVideo, chatWithVideoStream } from '@/server/services/gemini';
import { extractYouTubeId, getVideoById } from '@/server/services/serpapi';
import { ChatMessage } from '@/types/video';

export async function handleVideoChat(
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
    const message = (body.message || '').trim();
    const history: ChatMessage[] = Array.isArray(body.history) ? body.history : [];
    const shouldStream = Boolean(body.stream);

    if (!message) {
      return NextResponse.json(
        { error: 'Message cannot be empty' },
        { status: 400 }
      );
    }

    const videoMetadata = await getVideoById(cleanId);

    if (shouldStream) {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          try {
            for await (const part of chatWithVideoStream(cleanId, message, history, videoMetadata)) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(part)}\n\n`));
            }
            controller.close();
          } catch (streamErr) {
            console.error('Error during video chat streaming:', streamErr);
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ error: streamErr instanceof Error ? streamErr.message : 'Stream error' })}\n\n`
              )
            );
            controller.close();
          }
        },
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
        },
      });
    }

    const result = await chatWithVideo(cleanId, message, history, videoMetadata);
    return NextResponse.json(result);
  } catch (err) {
    console.error('Error handling video chat:', err);
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : 'An unexpected error occurred while communicating with Gemini.',
      },
      { status: 500 }
    );
  }
}
