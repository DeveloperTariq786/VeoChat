import { NextRequest, NextResponse } from 'next/server';
import { chatWithVideo, streamChatWithVideo } from '@/server/services/gemini';
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
    const shouldStream = body.stream !== false;

    if (!message) {
      return NextResponse.json(
        { error: 'Message cannot be empty' },
        { status: 400 }
      );
    }

    const videoMetadata = await getVideoById(cleanId);

    if (!shouldStream) {
      const result = await chatWithVideo(cleanId, message, history, videoMetadata);
      return NextResponse.json(result);
    }

    // Return real-time streaming response using SSE
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of streamChatWithVideo(
            cleanId,
            message,
            history,
            videoMetadata
          )) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
            );
          }
        } catch (streamErr) {
          const errMsg =
            streamErr instanceof Error
              ? streamErr.message
              : 'Error during chat streaming';
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: 'error', error: errMsg })}\n\n`
            )
          );
        } finally {
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
