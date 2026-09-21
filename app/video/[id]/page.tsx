'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { VideoItem, ChatMessage } from '@/types/video';
import { recordWatchedVideo } from '@/lib/watchedVideosStore';
import { ThemeToggle } from '@/components/ThemeToggle';
import { UserProfileMenu } from '@/components/UserProfileMenu';
import { Logo } from '@/components/Logo';
import { WorkspaceTabs, WorkspaceTabType } from '@/client/src/components/WorkspaceTabs';
import { ChatPanel } from '@/client/src/components/ChatPanel';
import { FlashcardDeck } from '@/client/src/components/FlashcardDeck';
import { SlideViewer } from '@/client/src/components/SlideViewer';
import { QuizPanel } from '@/client/src/components/QuizPanel';
import { RecommendationsPanel } from '@/client/src/components/RecommendationsPanel';
import { ExternalResourcesPanel } from '@/client/src/components/ExternalResourcesPanel';
import { AuthGuard } from '@/components/AuthGuard';
import {
  ArrowLeft,
  Youtube,
  Eye,
  Clock,
  Check,
  Copy,
  Play,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Share2,
  Maximize2,
  Minimize2,
  X,
  User,
} from 'lucide-react';

interface Chapter {
  time: string;
  seconds: number;
  title: string;
}

const isRealDuration = (dur?: string) => {
  if (!dur) return false;
  const d = dur.trim().toLowerCase();
  return d !== '' && d !== 'available on youtube' && d !== 'full video';
};

const isRealViews = (v?: string) => {
  if (!v) return false;
  const lower = v.trim().toLowerCase();
  return lower !== '' && !lower.includes('youtube video') && !lower.includes('youtube stream');
};

const isRealDescription = (desc?: string) => {
  if (!desc) return false;
  const d = desc.trim();
  if (d.length < 5) return false;
  const lower = d.toLowerCase();
  return (
    !lower.includes('enjoy the videos and music that you love') &&
    !lower.includes('enjoy the videos and music you love') &&
    !lower.includes('upload original content and share it all') &&
    !lower.includes('friends, family and the world on youtube') &&
    !lower.includes('in phase 2') &&
    !lower.includes('ask veochat ai questions') &&
    !lower.includes('embedded youtube video') &&
    lower !== 'youtube'
  );
};

function VideoDetailContent() {
  const params = useParams();
  const router = useRouter();
  const rawId = params?.id;
  const videoId = Array.isArray(rawId) ? rawId[0] : (rawId as string);

  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/');
    }
  }, [user, authLoading, router]);

  // Initialize video from sessionStorage cache (populated on video card click) or search state
  const [video, setVideo] = useState<VideoItem | null>(() => {
    if (typeof window !== 'undefined' && videoId) {
      try {
        const cached = sessionStorage.getItem(`askthevideo_video_${videoId}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed) {
            if (!isRealDescription(parsed.description)) {
              parsed.description = '';
            }
            return parsed;
          }
        }
        const searchState = sessionStorage.getItem('askthevideo_search_state');
        if (searchState) {
          const parsed = JSON.parse(searchState);
          const match = parsed.videos?.find((v: VideoItem) => v.id === videoId);
          if (match) {
            if (!isRealDescription(match.description)) {
              match.description = '';
            }
            return match;
          }
        }
      } catch (e) {
        console.warn('Unable to load cached video metadata', e);
      }
    }
    return null;
  });
  const [error, setError] = useState<string | null>(null);
  const [isDescExpanded, setIsDescExpanded] = useState<boolean>(false);
  const [isChatFullScreen, setIsChatFullScreen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<WorkspaceTabType>('chat');
  const [seekSeconds, setSeekSeconds] = useState<number | null>(null);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  // Persistent chat state across collapse/expand modes and tab switching
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => {
    if (typeof window !== 'undefined' && videoId) {
      try {
        const saved = sessionStorage.getItem(`askthevideo_chat_${videoId}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) return parsed;
        }
      } catch (e) {
        console.warn('Failed to load chat from storage', e);
      }
    }
    return [];
  });
  const [chatInputValue, setChatInputValue] = useState<string>('');
  const [chatIsLoading, setChatIsLoading] = useState<boolean>(false);

  // Persist chatMessages to sessionStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && videoId) {
      try {
        if (chatMessages.length > 0) {
          sessionStorage.setItem(`askthevideo_chat_${videoId}`, JSON.stringify(chatMessages));
        } else {
          sessionStorage.removeItem(`askthevideo_chat_${videoId}`);
        }
      } catch (e) {
        // ignore
      }
    }
  }, [chatMessages, videoId]);

  // Close full screen on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isChatFullScreen) {
        setIsChatFullScreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isChatFullScreen]);

  // Lock body scroll when in full screen
  useEffect(() => {
    if (isChatFullScreen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isChatFullScreen]);

  // Tab badge trackers
  const [flashcardCount, setFlashcardCount] = useState<number>(0);
  const [slideCount, setSlideCount] = useState<number>(0);
  const [quizCount, setQuizCount] = useState<number>(0);
  const [recommendationCount, setRecommendationCount] = useState<number>(0);
  const [resourceCount, setResourceCount] = useState<number>(0);

  // Ensure window is at top when navigating to video detail screen
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
  }, [videoId]);

  useEffect(() => {
    if (!videoId || !user) return;

    let isMounted = true;

    fetch(`/api/video/${videoId}`)
      .then(async (res) => {
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Failed to retrieve video details (${res.status})`);
        }
        return res.json();
      })
      .then((data) => {
        if (isMounted && data.video) {
          setVideo((prev) => {
            if (!prev) return data.video;
            const newDesc = isRealDescription(data.video.description)
              ? data.video.description
              : (isRealDescription(prev.description) ? prev.description : data.video.description || prev.description || '');

            return {
              ...prev,
              ...data.video,
              description: newDesc,
              channel: data.video.channel || prev.channel || '',
              views: data.video.views || prev.views || '',
              duration: data.video.duration || prev.duration || '',
              publishedAt: data.video.publishedAt || prev.publishedAt || '',
            };
          });
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          const msg = err instanceof Error ? err.message : 'Failed to load video';
          setError(msg);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [videoId, user]);

  // Record watched video into history for personalized recommendations
  useEffect(() => {
    if (video && video.id) {
      recordWatchedVideo(video);
    }
  }, [video]);

  // Extract or synthesize clean timecode chapters from video metadata
  const chapters: Chapter[] = useMemo(() => {
    if (!video) return [];

    const extracted: Chapter[] = [];
    if (video.description) {
      const lines = video.description.split('\n');
      for (const line of lines) {
        const match = line.match(/(?:(?:(\d{1,2}):)?(\d{1,2}):(\d{2}))\s*[-–—:]?\s*(.+)/);
        if (match) {
          const hours = match[1] ? parseInt(match[1], 10) : 0;
          const mins = parseInt(match[2], 10);
          const secs = parseInt(match[3], 10);
          const totalSecs = hours * 3600 + mins * 60 + secs;
          const timeStr = match[0].split(/\s+/)[0];
          const titleStr = match[4]?.trim() || 'Chapter';
          extracted.push({
            time: timeStr,
            seconds: totalSecs,
            title: titleStr.slice(0, 40),
          });
        }
      }
    }

    if (extracted.length >= 2) {
      return extracted.slice(0, 6);
    }

    return [
      { time: '00:00', seconds: 0, title: 'Introduction' },
      { time: '02:15', seconds: 135, title: 'Key Methods' },
      { time: '05:40', seconds: 340, title: 'Step-by-Step' },
      { time: '08:20', seconds: 500, title: 'Tips & Nuances' },
    ];
  }, [video]);

  const handleSeek = (seconds: number) => {
    setSeekSeconds(seconds);
  };

  const handleCopyShareLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
        <div className="flex flex-col items-center gap-3">
          <Logo size={42} className="animate-pulse" priority />
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
            Verifying access...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans antialiased">
      {/* Clean Top Navigation Bar */}
      <header
        id="detail-header"
        className="sticky top-0 z-30 w-full border-b border-zinc-200/80 dark:border-zinc-800/80 bg-white/85 dark:bg-zinc-950/85 backdrop-blur-md"
      >
        <div className="w-full max-w-[1720px] mx-auto px-3 sm:px-6 lg:px-8 xl:px-10 h-14 flex items-center justify-between gap-2.5 sm:gap-4">
          {/* Left: Brand logo, Back button & Breadcrumb */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Link
              href="/"
              id="detail-home-link"
              className="flex items-center gap-2 shrink-0 group hover:opacity-90 transition-opacity"
              title="Return to VeoChat Home"
            >
              <Logo size={28} className="rounded-lg" />
              <span className="font-bold text-sm text-zinc-900 dark:text-white hidden sm:inline tracking-tight">
                VeoChat
              </span>
            </Link>

            <div className="h-3.5 w-px bg-zinc-200 dark:bg-zinc-800 shrink-0" />

            <button
              id="back-to-search-btn"
              type="button"
              onClick={() => router.back()}
              className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors cursor-pointer shrink-0"
              title="Return to search"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Search</span>
            </button>

            <div className="h-3.5 w-px bg-zinc-200 dark:bg-zinc-800 hidden md:block shrink-0" />

            <div className="flex items-center gap-2 min-w-0">
              <span className="font-semibold text-xs sm:text-sm text-zinc-900 dark:text-white truncate max-w-[120px] xs:max-w-[180px] sm:max-w-xs md:max-w-sm lg:max-w-md">
                {video?.title || 'Video Intelligence'}
              </span>
            </div>
          </div>

          {/* Right: Clean Actions */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {/* Expand Full Screen Studio Toggle */}
            <button
              id="expand-fullscreen-btn"
              type="button"
              onClick={() => setIsChatFullScreen(true)}
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Expand studio over video on full screen"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Full Screen</span>
            </button>

            <UserProfileMenu id="detail-profile-menu" />
            <ThemeToggle id="detail-theme-toggle" />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-[1720px] mx-auto px-2.5 sm:px-6 lg:px-8 xl:px-10 py-4 sm:py-6">
        {error && !video ? (
          <div className="max-w-md mx-auto my-16 p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-red-200 dark:border-red-900/50 text-center space-y-3">
            <AlertCircle className="w-8 h-8 text-red-600 mx-auto" />
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Video Unavailable
            </h2>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">{error}</p>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-zinc-900 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Return to Search
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-start">
            {/* Left Column: Video Player, Metadata & Timeline */}
            <div className="lg:col-span-7 xl:col-span-7 2xl:col-span-8 flex flex-col gap-4 transition-all duration-300">
              {/* Cinematic 16:9 Video Player Container */}
              <div
                id="video-player-container"
                className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black shadow-md border border-zinc-200/80 dark:border-zinc-800"
              >
                <iframe
                  key={seekSeconds !== null ? `video-${seekSeconds}` : 'video-default'}
                  id="youtube-iframe"
                  src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1${
                    seekSeconds !== null ? `&start=${seekSeconds}` : ''
                  }`}
                  title={video?.title || 'YouTube video player'}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  className="w-full h-full border-0"
                />
              </div>

              {/* Compact Video Title and Metadata Section (Clean, unboxed) */}
              <div className="space-y-2 pt-1 px-1">
                {/* Title */}
                <h1
                  id="video-title"
                  className="text-base sm:text-lg lg:text-xl font-bold text-zinc-900 dark:text-zinc-100 leading-snug tracking-tight"
                >
                  {video?.title || (
                    <span className="inline-block h-6 w-3/4 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
                  )}
                </h1>

                {/* Creator & Statistics Row (Compact, Clean) */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 font-medium">
                  {video?.channel && (
                    <div className="flex items-center gap-1.5 text-zinc-900 dark:text-zinc-100 font-semibold">
                      <User className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
                      <span>{video.channel}</span>
                    </div>
                  )}

                  {isRealDuration(video?.duration) && (
                    <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
                      <Clock className="w-4 h-4 text-zinc-400 shrink-0" />
                      <span>{video!.duration}</span>
                    </div>
                  )}

                  {isRealViews(String(video?.views ?? '')) && (
                    <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
                      <Eye className="w-4 h-4 text-zinc-400 shrink-0" />
                      <span>
                        {String(video!.views).toLowerCase().includes('views')
                          ? String(video!.views)
                          : `${video!.views} views`}
                      </span>
                    </div>
                  )}
                </div>

                {/* Description Snippet */}
                {isRealDescription(video?.description) && (
                  <div className="pt-0.5 text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed font-normal">
                    <p className="line-clamp-3 sm:line-clamp-4 hover:line-clamp-none transition-all cursor-pointer">
                      {video!.description}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Studio / AI Workspace (Seamlessly switches between Side-by-Side and Full Screen without unmounting) */}
            <div
              id="studio-workspace-panel"
              className={
                isChatFullScreen
                  ? 'fixed inset-0 z-50 bg-white dark:bg-zinc-950 flex flex-col animate-in fade-in duration-150'
                  : 'lg:col-span-5 xl:col-span-5 2xl:col-span-4 lg:sticky lg:top-[4.5rem] rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-sm overflow-hidden flex flex-col min-h-[520px] h-[580px] sm:h-[640px] lg:h-[calc(100vh-6rem)]'
              }
            >
              {/* Clean Workspace Top Header */}
              {isChatFullScreen ? (
                <header className="h-14 px-4 sm:px-6 border-b border-zinc-200/90 dark:border-zinc-800/90 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md flex items-center justify-between gap-4 shrink-0 shadow-2xs">
                  {/* Brand Logo & Name */}
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <Link
                      href="/"
                      id="fullscreen-home-link"
                      className="flex items-center gap-2 shrink-0 group hover:opacity-90 transition-opacity"
                      title="Return to VeoChat Home"
                    >
                      <Logo size={28} className="rounded-lg" />
                      <span className="font-bold text-sm text-zinc-900 dark:text-white tracking-tight">
                        VeoChat
                      </span>
                    </Link>
                  </div>

                  {/* Top Right Controls */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <ThemeToggle id="fullscreen-theme-toggle" variant="ghost" />
                    <button
                      id="exit-fullscreen-btn"
                      type="button"
                      onClick={() => setIsChatFullScreen(false)}
                      className="p-2 rounded-xl text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-500/40"
                      title="Exit full screen (Esc)"
                      aria-label="Exit full screen"
                    >
                      <Minimize2 className="w-4 h-4" />
                    </button>
                  </div>
                </header>
              ) : null}

              {/* Workspace Body: Responsive Layout Preserving Active View */}
              <div
                className={`flex-1 flex overflow-hidden min-h-0 ${
                  isChatFullScreen ? 'flex-col lg:flex-row' : 'flex-col'
                }`}
              >
                {isChatFullScreen ? (
                  <>
                    {/* Left Navigation Sidebar for Large Screens in Full Screen */}
                    <aside
                      id="expanded-workspace-sidebar"
                      className="hidden lg:flex w-64 xl:w-72 border-r border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/70 flex-col justify-between shrink-0 overflow-hidden"
                    >
                      <div className="h-11 px-3.5 border-b border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between shrink-0 bg-zinc-50/60 dark:bg-zinc-950/40">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                          Workspace Tools
                        </span>
                        <span className="text-[10px] font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50 px-1.5 py-0.5 rounded">
                          6 Active
                        </span>
                      </div>

                      <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin">
                        <WorkspaceTabs
                          activeTab={activeTab}
                          onTabChange={setActiveTab}
                          flashcardCount={flashcardCount}
                          slideCount={slideCount}
                          quizCount={quizCount}
                          recommendationCount={recommendationCount}
                          resourceCount={resourceCount}
                          orientation="vertical"
                          showDescriptions={true}
                        />
                      </div>

                      {/* Video Info Card at Bottom of Sidebar (aligned with Chat input bar) */}
                      <div className="h-[70px] px-3 border-t border-zinc-200/80 dark:border-zinc-800 flex items-center bg-zinc-50/70 dark:bg-zinc-950/70 shrink-0">
                        <div
                          id="expanded-sidebar-video-card"
                          className="w-full flex items-center gap-2.5 p-2 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 shadow-2xs min-w-0"
                        >
                          <div className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-lg overflow-hidden shrink-0 bg-zinc-100 dark:bg-zinc-800">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={video?.thumbnail || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`}
                              alt={video?.title || 'Video thumbnail'}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover rounded-lg"
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p
                              className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate"
                              title={video?.title}
                            >
                              {video?.title || 'Interactive Video'}
                            </p>
                            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                              {video?.channel || 'YouTube Creator'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </aside>

                    {/* Mobile & Tablet Fullscreen Workspace Tabs (Horizontal on < lg screens) */}
                    <div className="lg:hidden p-1.5 sm:p-2 border-b border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shrink-0">
                      <WorkspaceTabs
                        activeTab={activeTab}
                        onTabChange={setActiveTab}
                        flashcardCount={flashcardCount}
                        slideCount={slideCount}
                        quizCount={quizCount}
                        recommendationCount={recommendationCount}
                        resourceCount={resourceCount}
                        orientation="horizontal"
                      />
                    </div>
                  </>
                ) : (
                  /* Workspace Navigation Tabs in Side-by-Side Mode */
                  <div className="p-1.5 sm:p-2 border-b border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shrink-0 flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <WorkspaceTabs
                        activeTab={activeTab}
                        onTabChange={setActiveTab}
                        flashcardCount={flashcardCount}
                        slideCount={slideCount}
                        quizCount={quizCount}
                        recommendationCount={recommendationCount}
                        resourceCount={resourceCount}
                        orientation="horizontal"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsChatFullScreen(true)}
                      className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer shrink-0"
                      title="Expand studio to full screen"
                      aria-label="Expand to full screen"
                    >
                      <Maximize2 className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Main Workspace Active View - PRESERVED ACROSS COLLAPSE / EXPAND TOGGLE */}
                <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden bg-white dark:bg-zinc-900">
                  {activeTab === 'chat' && (
                    <ChatPanel
                      videoId={videoId}
                      video={video}
                      onSeekToTime={handleSeek}
                      isFullScreen={isChatFullScreen}
                      onToggleFullScreen={() => setIsChatFullScreen(!isChatFullScreen)}
                      messages={chatMessages}
                      onMessagesChange={setChatMessages}
                      inputValue={chatInputValue}
                      onInputChange={setChatInputValue}
                      isLoading={chatIsLoading}
                      onLoadingChange={setChatIsLoading}
                    />
                  )}

                  {activeTab === 'flashcards' && (
                    <div className="flex-1 flex flex-col min-h-0 w-full h-full overflow-hidden">
                      <FlashcardDeck
                        videoId={videoId}
                        video={video}
                        onSeekToTime={handleSeek}
                        onFlashcardsLoaded={(count) => setFlashcardCount(count)}
                      />
                    </div>
                  )}

                  {activeTab === 'slides' && (
                    <div className="flex-1 flex flex-col min-h-0 w-full h-full overflow-hidden">
                      <SlideViewer
                        videoId={videoId}
                        video={video}
                        onSeekToTime={handleSeek}
                        onSlidesLoaded={(count) => setSlideCount(count)}
                      />
                    </div>
                  )}

                  {activeTab === 'quiz' && (
                    <div className="flex-1 flex flex-col min-h-0 w-full h-full overflow-hidden">
                      <QuizPanel
                        videoId={videoId}
                        video={video}
                        onSeekToTime={handleSeek}
                        onQuizLoaded={(count) => setQuizCount(count)}
                      />
                    </div>
                  )}

                  {activeTab === 'recommendations' && (
                    <RecommendationsPanel
                      videoId={videoId}
                      video={video}
                      onRecommendationsLoaded={(count) => setRecommendationCount(count)}
                    />
                  )}

                  {activeTab === 'resources' && (
                    <ExternalResourcesPanel
                      videoId={videoId}
                      video={video}
                      onResourcesLoaded={(count) => setResourceCount(count)}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function VideoDetailPage() {
  return (
    <AuthGuard
      title="Video Workspace Protected"
      description="You must be signed in with your Google account to access interactive video workspaces, timestamped chat, and study tools."
    >
      <VideoDetailContent />
    </AuthGuard>
  );
}

