# VeoChat — Interactive AI YouTube Video Workspace

> Transform any YouTube video into an interactive learning and study studio. Chat with timestamp citations, generate 3D flippable flashcards, review visual summary slides, take comprehension quizzes, and discover curated related learning materials.

📖 **Looking for a full step-by-step tutorial?** Check out the [Complete Onboarding & Feature Walkthrough](WALKTHROUGH.md).

---

## 🌟 Key Features

### 1. Timestamp-Grounded AI Chat
- Ask specific, complex questions about any YouTube video.
- Real-time AI explanations powered by **Google Gemini**.
- Clickable timestamp citations (e.g., `[04:12]`) that instantly seek the embedded video player to the exact moment.
- Markdown rendering with mathematical equation support via **KaTeX**.

### 2. Spaced Repetition Flashcards
- Automatically extract key concepts, definitions, formulas, and insights into flashcards.
- Interactive 3D flip animation with question and answer sides.
- Spaced repetition mastery tracking (*Mastered* vs. *Needs Review*), card shuffling, and reset options.

### 3. Visual Summary Slide Decks
- Automatically structures video chapters into clean, presentation-ready slide decks.
- Highlights key takeaways, core bullets, and chapter milestones.
- Fullscreen and keyboard-friendly slide navigation.

### 4. AI Infographics & Multi-Image Storyboard (Nano Banana Model)
- Generates clean, crisp visual concept graphics and infographic slides summarizing the video.
- Powered by Google's **Nano Banana** vision model (`gemini-3.1-flash-lite-image`).
- Designed for pure graphic clarity: sleek 3D isometric structures, flow diagrams, and zero messy text.
- Full multi-slide carousel navigation, autoplay presentation mode, timestamp seeking, and high-res image download.

### 5. Comprehension Quizzes
- Dynamic multiple-choice questions testing comprehension of key topics covered in the video.
- Instant feedback with detailed explanations for correct and incorrect answers.
- Final score review, analytics, and retake functionality.

### 6. Related YouTube Video Recommendations
- Discover relevant YouTube videos on related topics to expand your knowledge.
- Filter by video duration (`< 10m`, `10m+`) and search query.

### 7. External Web Resources & Links
- Curated documentation, articles, cheat sheets, and official reference links.
- Search-grounded web links to deepen understanding beyond the video.

### 8. Google Authentication & Cloud Sync
- Sign in with Google via **Firebase Authentication**.
- Persistent search history and user session management via **Firebase Firestore**.
- Smooth theme toggle with Light and Dark mode support.

---

## 🚀 Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router, Server Components & Route Handlers)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **UI & Styling**: [Tailwind CSS](https://tailwindcss.com/), [Lucide React](https://lucide.dev/)
- **Math Formatting**: [KaTeX](https://katex.org/), `rehype-katex`, `remark-math`
- **AI Intelligence**: [Google GenAI SDK (`@google/genai`)](https://github.com/google/generative-ai-js) using server-side Gemini models
- **Database & Auth**: [Firebase](https://firebase.google.com/) (Firestore & Firebase Auth)
- **Search Ingestion**: YouTube search via SerpAPI with smart fallback to high-quality curated educational catalog

---

## 🔍 SEO & Search Optimization (100% Optimized)

VeoChat is engineered with complete search engine optimization (SEO) and social sharing readiness:

- **Next.js Metadata API**: Semantic, branded page titles and meta descriptions synchronized with application identity.
- **OpenGraph & Twitter Cards**: High-resolution social share cards (`summary_large_image`) for rich previews on X/Twitter, LinkedIn, Slack, Discord, and iMessage.
- **Schema.org Structured Data (JSON-LD)**:
  - `WebApplication` schema detailing features, category (`EducationalApplication`), and free pricing.
  - `FAQPage` schema enabling Google Rich Snippet FAQ accordions directly in search engine results.
- **Dynamic Sitemaps & Robots**:
  - Auto-generated `sitemap.xml` via `app/sitemap.ts` with priority ratings and change frequencies.
  - Search engine crawler directives via `app/robots.ts`.
- **Web App Manifest**: Complete PWA manifest via `app/manifest.ts` for home screen installability and mobile indexing.
- **Dynamic Video Metadata**: Dedicated server-side OpenGraph and Twitter tags for `/video/[id]` routes with custom video thumbnails.

---

## 📁 Project Structure

```
├── app/
│   ├── api/
│   │   ├── search/route.ts                 # YouTube video search & catalog API
│   │   ├── video/[id]/chat/route.ts        # Gemini AI timestamped Q&A
│   │   ├── video/[id]/flashcards/route.ts  # Flashcard deck generation
│   │   ├── video/[id]/slides/route.ts      # Presentation slide generator
│   │   ├── video/[id]/quiz/route.ts        # Comprehension quiz generator
│   │   ├── video/[id]/recommendations/route.ts # Related video recommendations
│   │   └── video/[id]/resources/route.ts   # Curated external web links
│   ├── video/[id]/
│   │   ├── layout.tsx                      # Dynamic SEO metadata for video studio
│   │   └── page.tsx                        # Video workspace (Player + Studio)
│   ├── layout.tsx                          # Root layout, JSON-LD, global SEO
│   ├── page.tsx                            # Landing & search home page
│   ├── robots.ts                           # Dynamic /robots.txt
│   ├── sitemap.ts                          # Dynamic /sitemap.xml
│   ├── manifest.ts                         # Web App Manifest
│   └── globals.css                         # Tailwind CSS imports
├── client/src/components/
│   ├── ChatPanel.tsx                       # Interactive AI chat with timestamp seek
│   ├── FlashcardDeck.tsx                   # 3D interactive flashcards
│   ├── SlideViewer.tsx                     # Presentation slide deck viewer
│   ├── QuizPanel.tsx                       # Interactive quiz module
│   ├── RecommendationsPanel.tsx            # Related YouTube videos panel
│   ├── ExternalResourcesPanel.tsx          # External links and documentation panel
│   └── WorkspaceTabs.tsx                   # Responsive studio navigation tabs
├── components/                             # Shared UI components & layouts
├── contexts/                               # AuthContext & Theme providers
├── lib/                                    # Firebase client, utilities, duration parsers
└── types/                                  # TypeScript data definitions
```

---

## 🛠️ Getting Started

### Prerequisites
- Node.js 20+ installed
- A Google Gemini API key from [Google AI Studio](https://aistudio.google.com/)

### 1. Clone & Install Dependencies
```bash
git clone <repository-url>
cd <repository-directory>
npm install
```

### 2. Configure Environment Variables
Create a `.env.local` file in the root directory:

```env
# Required for Gemini AI features (server-side only)
GEMINI_API_KEY="your_gemini_api_key"

# Application public URL
APP_URL="http://localhost:3000"

# Optional: SerpAPI key for live YouTube search
SERPAPI_KEY="your_serpapi_key"
```

### 3. Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to start studying with any YouTube video.

### 4. Build for Production
```bash
npm run build
npm start
```

---

## 📄 License
This project is open source and available under the [MIT License](LICENSE).
