import { NextRequest, NextResponse } from 'next/server';
import { searchYouTube } from '../services/serpapi';

export async function handleSearch(req: NextRequest) {
  try {
    let body: { query?: string } = {};
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON request body. Expected { query: string }.' },
        { status: 400 }
      );
    }

    const { query } = body;

    if (!query || typeof query !== 'string' || !query.trim()) {
      return NextResponse.json(
        { error: 'A non-empty "query" parameter is required.' },
        { status: 400 }
      );
    }

    const result = await searchYouTube(query.trim());

    return NextResponse.json({
      videos: result.videos,
      query: query.trim(),
      source: result.source,
      message: result.message,
    });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json(
      { error: errorMsg },
      { status: 500 }
    );
  }
}
