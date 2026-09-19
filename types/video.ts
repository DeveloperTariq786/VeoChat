export interface VideoItem {
  id: string;
  title: string;
  thumbnail: string;
  channel: string;
  channelUrl?: string;
  views?: string | number;
  duration?: string;
  link: string;
  description?: string;
  publishedAt?: string;
}

export interface SearchApiResponse {
  videos: VideoItem[];
  query: string;
  source?: 'serpapi' | 'demo';
  message?: string;
  error?: string;
}

export interface VideoDetailApiResponse {
  video?: VideoItem;
  error?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp?: string;
  createdAt?: number;
  followUpQuestions?: string[];
  isStreaming?: boolean;
  statusMessage?: string;
}

export interface ChatApiResponse {
  response: string;
  history: ChatMessage[];
  groundedInVideo: boolean;
  model: string;
  followUpQuestions?: string[];
  error?: string;
}

export interface NotesData {
  title: string;
  summary: string;
  markdown: string;
  keyTakeaways: string[];
  timestamps: Array<{ time: string; seconds: number; label: string }>;
  generatedAt?: string;
}

export interface NotesApiResponse {
  notes: NotesData;
  source: 'gemini' | 'cache' | 'fallback';
  model: string;
  error?: string;
}

export interface FlashcardItem {
  id: string;
  question: string;
  answer: string;
  category?: string;
  timestamp?: string;
  seconds?: number;
}

export interface FlashcardsApiResponse {
  flashcards: FlashcardItem[];
  source: 'gemini' | 'cache' | 'fallback';
  model: string;
  error?: string;
}

export interface SlideItem {
  slideNumber: number;
  title: string;
  bullets: string[];
  keyTakeaway?: string;
  timestamp?: string;
  seconds?: number;
}

export interface SlidesApiResponse {
  slides: SlideItem[];
  source: 'gemini' | 'cache' | 'fallback';
  model: string;
  error?: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctOptionIndex: number;
  explanation: string;
  timestamp?: string;
  seconds?: number;
  hint?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
}

export interface QuizData {
  title: string;
  topic?: string;
  difficulty?: string;
  questions: QuizQuestion[];
  generatedAt?: string;
}

export interface QuizApiResponse {
  quiz: QuizData;
  source: 'gemini' | 'cache' | 'fallback';
  model: string;
  error?: string;
}

export interface RecommendationItem extends VideoItem {
  relevanceReason?: string;
  matchScore?: number;
}

export interface RecommendationsApiResponse {
  recommendations: RecommendationItem[];
  topic?: string;
  source?: 'serpapi' | 'demo';
  message?: string;
  error?: string;
}

export interface ExternalResourceItem {
  id: string;
  title: string;
  link: string;
  snippet: string;
  source?: string;
  domain?: string;
  category: 'article' | 'documentation' | 'video' | 'tutorial' | 'reference' | 'tool';
  publishedDate?: string;
  favicon?: string;
}

export interface ExternalResourcesApiResponse {
  resources: ExternalResourceItem[];
  topic?: string;
  source?: 'serpapi' | 'demo' | 'google';
  message?: string;
  error?: string;
}

