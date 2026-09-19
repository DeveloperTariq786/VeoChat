import Link from 'next/link';
import { ArrowLeft, VideoOff } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-zinc-50 dark:bg-zinc-950 text-center">
      <div className="w-14 h-14 rounded-2xl bg-red-600/10 text-red-600 flex items-center justify-center mb-4">
        <VideoOff className="w-7 h-7" />
      </div>
      <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
        Page Not Found
      </h1>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-sm mb-6">
        The video or page you are looking for does not exist or may have been moved.
      </p>
      <Link
        href="/"
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-700 text-white transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Return to Home</span>
      </Link>
    </div>
  );
}
