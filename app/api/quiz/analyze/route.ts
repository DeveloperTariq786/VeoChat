import { NextRequest, NextResponse } from 'next/server';
import { analyzeQuizHistoryProgress } from '@/server/services/gemini';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const attempts = Array.isArray(body.attempts) ? body.attempts : [];
    const userName = typeof body.userName === 'string' ? body.userName : undefined;

    const analysis = await analyzeQuizHistoryProgress(attempts, userName);
    return NextResponse.json(analysis);
  } catch (err) {
    console.error('Error in /api/quiz/analyze route:', err);
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : 'An unexpected error occurred while analyzing quiz progress.',
      },
      { status: 500 }
    );
  }
}
