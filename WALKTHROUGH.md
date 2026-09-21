# VeoChat — Complete Onboarding & Feature Walkthrough

Welcome to **VeoChat**, an intelligent, interactive AI video learning studio. VeoChat transforms standard YouTube videos into structured, conversational learning environments where you can chat with videos, jump to exact timestamps, practice with 3D flashcards, review summary slide decks, test your knowledge with quizzes, and track your learning progress over time.

This guide provides an end-to-end walkthrough of everything you can do in VeoChat, from your first login to mastering advanced learning analytics.

---

## 📑 Table of Contents

1. [Quick Overview](#1-quick-overview)
2. [Step 1: Signing In & Account Setup](#step-1-signing-in--account-setup)
3. [Step 2: Exploring & Searching Videos](#step-2-exploring--searching-videos)
   - [Conversational Search](#conversational-search)
   - [Personalized "Suggested for You" Topics](#personalized-suggested-for-you-topics)
   - [Popular & Trending Topics](#popular--trending-topics)
   - [Search Threads & Multi-Turn Conversations](#search-threads--multi-turn-conversations)
4. [Step 3: Opening a Video in the Interactive Studio](#step-3-opening-a-video-in-the-interactive-studio)
5. [Step 4: Chatting with the Video (AI Q&A)](#step-4-chatting-with-the-video-ai-qa)
   - [Interactive Timestamp Citations](#interactive-timestamp-citations)
   - [Mathematical Formula Rendering (KaTeX)](#mathematical-formula-rendering-katex)
   - [Full-Screen Focus Mode](#full-screen-focus-mode)
6. [Step 5: Master Concepts with 3D Flashcards](#step-5-master-concepts-with-3d-flashcards)
7. [Step 6: Visual Presentation Slides & Summary Decks](#step-6-visual-presentation-slides--summary-decks)
8. [Step 7: Taking Comprehension Quizzes](#step-7-taking-comprehension-quizzes)
9. [Step 8: Expanding Knowledge with Related Videos & Web Docs](#step-8-expanding-knowledge-with-related-videos--web-docs)
   - [Curated Related YouTube Videos](#curated-related-youtube-videos)
   - [Authoritative External Web Resources](#authoritative-external-web-resources)
10. [Step 9: Your Profile, Search History & Quiz Analytics](#step-9-your-profile-search-history--quiz-analytics)
    - [User Profile Dropdown](#user-profile-dropdown)
    - [Search History Synchronization](#search-history-synchronization)
    - [Quiz History & AI Performance Mastery](#quiz-history--ai-performance-mastery)
11. [Pro-Tips for Power Learners](#pro-tips-for-power-learners)

---

## 1. Quick Overview

```text
[ Home Workspace ]  ──▶  [ Conversational Search & Suggestions ]
         │
         ▼
[ Video Studio ]    ──▶  [ YouTube Player + 6 Interactive AI Tools ]
         │               ├── 💬 Chat with Timestamp Citations
         │               ├── 🗂️ 3D Interactive Flashcards
         │               ├── 📊 Chapter Slide Decks & Summary
         │               ├── 📝 Comprehension Quizzes
         │               ├── 🎥 Related Video Recommendations
         │               └── 🌐 External Web Documentation & Guides
         │
         ▼
[ User Profile ]    ──▶  [ Cloud History, Mastery Analytics & Radar Insights ]
```

---

## Step 1: Signing In & Account Setup

### How to Sign In
1. Navigate to the top-right corner of the VeoChat navigation header.
2. Click the **"Sign In"** button with the Google icon.
3. Authenticate with your Google account through the secure **Firebase Authentication** popup.
4. Once signed in, your Google profile avatar and name will appear in the top-right corner.

### Why Sign In?
- **Cloud History**: Automatically preserves your searched topics and queries in Firebase Firestore.
- **Smart Recommendations**: Personalizes homepage suggestions based on videos you've watched and searched.
- **Quiz Performance Tracking**: Saves your quiz attempts, accuracy rates, and generates AI mastery analysis across all subjects.
- **Cross-Session Persistence**: Resume video chats and study decks on any device without losing progress.

> **Note**: You can also use VeoChat as a guest! Your session chats and recent queries will still be cached locally in your browser.

---

## Step 2: Exploring & Searching Videos

The VeoChat home page is designed as a conversational research studio.

### Conversational Search
1. In the bottom search bar, type what you would like to learn (e.g., `"Machine learning transformers explained"` or `"How does the Rust borrow checker work?"`).
2. Press **Enter** or click the red **Send** button.
3. VeoChat retrieves high-quality YouTube videos matching your topic, displaying their duration, channel name, views, and thumbnail.

### Personalized "Suggested for You" Topics
- After you've performed a few searches or watched videos, VeoChat's AI analyzes your learning patterns.
- An intelligent **"Suggested for you"** shelf automatically recommends relevant next steps (e.g., if you explored Next.js, it will suggest Next.js App Router tutorials, Server Actions guides, or full-stack project courses).
- Quick video cards from your recent sessions are displayed directly on the home screen for instant one-click access.

### Popular & Trending Topics
- If you're exploring new domains, switch the tab to **"Popular topics"** to browse curated, high-demand topics like:
  - *Transformer architecture explained*
  - *Next.js 15 complete course*
  - *System design interview guide*
  - *Deep learning with PyTorch*
  - *Learn Rust in 1 hour*

### Search Threads & Multi-Turn Conversations
- VeoChat supports conversational searching: each search query is preserved as an active **turn** in your scrollable session feed.
- You can review previously returned video sets, compare different search iterations, or click **"Clear Thread"** whenever you wish to start a fresh exploration session.

---

## Step 3: Opening a Video in the Interactive Studio

1. In any search result grid or suggestion card, click on a video.
2. VeoChat immediately loads the **Video Studio**:
   - **Left Column**: The synchronized YouTube video player with high-definition playback, volume controls, and title/creator metadata.
   - **Right Column**: The 6-in-1 AI Learning Workspace panel.
3. The metadata, chapter bookmarks, and chat history are primed instantly.

---

## Step 4: Chatting with the Video (AI Q&A)

Select the **"Chat"** tab (the speech bubble icon) in the workspace.

### Interactive Timestamp Citations
- Type any question about the video's content (e.g., *"What is the difference between supervised and unsupervised learning?"* or *"Can you summarize the 3 key takeaways from minute 5?"*).
- VeoChat's Google Gemini model analyzes the video transcript and concepts to deliver clear, structured responses.
- Every response includes **clickable timestamp badges** (e.g., `[03:45]`). Clicking any timestamp automatically seeks the YouTube player directly to that second!

### Mathematical Formula Rendering (KaTeX)
- Technical formulas, calculus expressions, and machine learning equations are beautifully rendered using LaTeX/KaTeX (e.g., $E = mc^2$, $\sigma(z) = \frac{1}{1 + e^{-z}}$).

### Full-Screen Focus Mode
- Need more room to read and take notes? Click the **Maximize** icon in the top header of the workspace.
- The studio smoothly expands into a dedicated distraction-free environment with a vertical sidebar and enlarged chat interface. Press `Esc` or click **Minimize** to return.

---

## Step 5: Master Concepts with 3D Flashcards

Select the **"Flashcards"** tab in the workspace.

1. **AI-Generated Cards**: VeoChat extracts definitions, key formulas, and foundational concepts from the video into a deck of cards.
2. **Interactive 3D Flip**: Click any flashcard to flip between the Question/Concept front and the Answer/Explanation back.
3. **Spaced Repetition Mastery**:
   - Click **"Mastered"** (Green checkmark) if you know the concept.
   - Click **"Needs Review"** (Orange bookmark) to keep it in your study queue.
4. **Deck Controls**:
   - Use the **Previous** and **Next** arrows to navigate.
   - Use **Shuffle** to randomize the question order.
   - Use **Reset** to reset mastery scores when re-studying before an exam.

---

## Step 6: Visual Presentation Slides & Summary Decks

Select the **"Slides"** tab in the workspace.

1. **Structured Chapter Breakdown**: VeoChat analyzes the video timeline to generate presentation slides corresponding to each major chapter or theme.
2. **Slide Content**:
   - **Slide Header**: Chapter title and timecode range.
   - **Core Takeaways**: High-impact bullet points summarizing the discussion.
   - **Key Definitions**: Essential terminology defined concisely.
3. **Navigation**: Use the left/right arrow buttons or thumbnail dots to step through the entire lecture in minutes.

---

## Step 7: Taking Comprehension Quizzes

Select the **"Quiz"** tab in the workspace.

1. **Dynamic Generation**: VeoChat generates multiple-choice questions tailored to the specific topics explained in the video.
2. **Interactive Answering**:
   - Select your answer from options **A**, **B**, **C**, or **D**.
   - Click **"Submit Answer"**.
3. **Instant Educational Feedback**:
   - If correct: Marked with a green highlight and an explanation of why the answer is right.
   - If incorrect: Reveals the correct option along with an explanation of where the misconception occurred.
4. **Score & Cloud Saving**:
   - At the end of the quiz, your percentage score and mastery grade are calculated.
   - For signed-in users, your attempt is automatically saved to your Firestore profile for historical learning analysis.
   - Click **"Retake Quiz"** to attempt a fresh set of questions.

---

## Step 8: Expanding Knowledge with Related Videos & Web Docs

### Curated Related YouTube Videos
Select the **"Recommendations"** tab in the workspace.
- Browse companion videos related to the topic you just studied.
- Each recommendation displays a **Relevance Score** and brief explanation of why it will expand your understanding.
- Filter videos by duration (`< 10 min` for quick refreshers, or `10+ min` for deep-dive lectures).
- Click any video to open it directly in the VeoChat studio.

### Authoritative External Web Resources
Select the **"Resources"** tab in the workspace.
- Access curated documentation, GitHub repositories, official cheat sheets, and technical blogs relevant to the video topic.
- Click any resource card to launch the documentation in a new browser tab.

---

## Step 9: Your Profile, Search History & Quiz Analytics

### User Profile Dropdown
Click your user avatar in the top-right corner to open your profile menu:
- **Account Info**: Displays your verified Google account name and email.
- **Quick Links**: Jump between the Video Studio and Quiz History.
- **Sign Out**: Safely sign out of your account.

### Search History Synchronization
- All previous searches conducted while signed in are saved to your account.
- When you return to the home screen, your previous searches appear as interactive shortcuts, allowing you to re-open previous discovery threads with a single click.

### Quiz History & AI Performance Mastery
Click **"Quiz History & Analysis"** from your profile dropdown (or navigate to `/quiz-history`):
1. **Mastery Score & Grade**: An aggregate calculation of your test performance across all video subjects.
2. **Visual Performance Charts**:
   - **Accuracy Over Time**: Tracks whether your retention is improving.
   - **Topic Mastery Breakdown**: Visual bars showing which subjects you have *Mastered*, which are *In Progress*, and which *Need Review*.
3. **AI Strengths & Weaknesses Assessment**:
   - **Key Strengths**: Highlighted conceptual areas where you consistently score 100%.
   - **Areas for Improvement**: Pinpointed topics where extra review is recommended.
   - **Personalized Learning Velocity & Study Tips**: Custom AI suggestions on how to optimize your study sessions.
4. **Attempt Archive**: Review every past quiz attempt with question-by-question answer breakdowns, timestamps, and direct links back to the original videos.

---

## Pro-Tips for Power Learners

| Action | Shortcut / Pro-Tip |
| :--- | :--- |
| **Seek Player via Chat** | Click any blue or purple timestamp citation (e.g. `[05:22]`) in AI responses. |
| **Toggle Dark / Light Mode** | Click the Moon/Sun icon in the top header to protect your eyes during late-night study sessions. |
| **Full-Screen Workspace** | Click the Expand icon at the top right of the workspace panel, or press `Esc` to exit. |
| **Filter Recommendations** | Toggle between `< 10m` and `10m+` to find quick summaries or comprehensive deep dives. |
| **Share Video** | Click the **Share** button next to the video title to copy the direct VeoChat link to your clipboard. |

---

*VeoChat — Learn Faster, Retain More.*
