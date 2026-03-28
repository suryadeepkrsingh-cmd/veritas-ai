<div align="center">
  <img src="https://img.icons8.com/external-flat-icons-inmotus-design/128/external-Shield-cyber-security-flat-icons-inmotus-design.png" alt="Veritas AI Logo" width="80" />
  <h1>Veritas AI</h1>
  <p><strong>The Ultimate AI-Powered Misinformation Sentinel</strong></p>
  <p><em>Unveiling the truth in the digital age through cryptographic precision and advanced neural analysis.</em></p>
  <br />
  <a href="./README.md" download="Veritas-AI-Documentation.md">
    <img src="https://img.shields.io/badge/Download_README_(Markdown)-000000?style=for-the-badge&logo=markdown&logoColor=white" alt="Download README" />
  </a>
</div>

---

## 📖 Table of Contents
1. [Problem Statement](#problem-statement)
2. [Solution Overview](#solution-overview)
3. [Tech Stack](#tech-stack)
4. [Prerequisites](#prerequisites)
5. [Installation & Setup](#installation--setup)
6. [Environment Variables](#environment-variables)
7. [Project Structure](#project-structure)
8. [Core Functionality & API](#core-functionality--api)
9. [Usage Guide](#usage-guide)
10. [Screenshots & Workflow](#screenshots--workflow)
11. [Deployment Instructions](#deployment-instructions)
12. [Known Limitations](#known-limitations)
13. [Future Roadmap](#future-roadmap)
14. [Contribution Guidelines](#contribution-guidelines)
15. [License](#license)
16. [Frequently Asked Questions (FAQ)](#frequently-asked-questions-faq)
17. [Viva / Judge Panel Questions](#viva--judge-panel-questions)

---

## 🚨 Problem Statement
In today's fast-paced digital ecosystem, viral claims, deepfakes, and clickbait articles spread entirely unchecked. People consume news rapidly, often lacking the time or tools required to thoroughly cross-reference facts, identify linguistic bias, or evaluate source credibility. Misinformation scales instantly, but manual fact-checking takes hours. 

## 💡 Solution Overview
**Veritas AI** bridges this gap. By pasting a single URL, news headline, or random question into the dashboard, users instantly receive:
- A definitive **Verdict** (`True`, `False`, or `Unverified`).
- An exact **Neural Confidence Score**.
- A deterministic **Score Breakdown** covering *Logical Consistency*, *Source Reliability*, and *Factual Alignment*.
- Extracted **Red Flags** and linguistic **Sentiment** mapping.
- Automatically gathered **Referenced Citations**.

The robust architecture utilizes a "Hardcoded Truth Sentinel" for instant validation of known facts and heavily optimized API connections to large language models (LLMs) to scrape, process, and evaluate completely unknown claims. 

---

## 🛠 Tech Stack

This project utilizes a modern, decoupled architecture designed for speed, type safety, and 3D visual fidelity. Every dependency version is pinned below for full reproducibility.

### Frontend

| Technology | Version | Purpose |
|---|---|---|
| **React** | ^19.2.4 | UI framework with concurrent rendering features |
| **React DOM** | ^19.2.4 | DOM rendering for React |
| **TypeScript** | ~5.9.3 | Static type safety across the entire frontend |
| **Vite** | ^8.0.1 | Ultra-fast dev server (HMR) and production bundler |
| **Tailwind CSS** | ^4.0.0 | Utility-first CSS with v4's new `@import` syntax |
| **@tailwindcss/postcss** | ^4.2.2 | PostCSS integration for Tailwind v4 |
| **Three.js** | ^0.183.2 | WebGL 3D rendering engine |
| **@react-three/fiber** | ^9.5.0 | React reconciler for Three.js |
| **@react-three/drei** | ^10.7.7 | Helper abstractions (orbits, stars, effects) |
| **@types/three** | ^0.183.1 | TypeScript definitions for Three.js |
| **lucide-react** | ^0.577.0 | Crisp SVG icon library |
| **PostCSS** | ^8.5.8 | CSS transformation pipeline |
| **autoprefixer** | ^10.4.27 | Vendor prefix automation |
| **ESLint** | ^9.39.4 | Code linting (flat config format) |
| **typescript-eslint** | ^8.57.0 | TypeScript-specific lint rules |

### Backend

| Technology | Version | Purpose |
|---|---|---|
| **Express** | ^5.2.1 | HTTP server (major version 5 with async error handling) |
| **@google/generative-ai** | ^0.24.1 | Google Gemini AI SDK |
| **axios** | ^1.13.6 | HTTP client for scraping and Wikipedia API |
| **cheerio** | ^1.2.0 | Server-side HTML parsing and DOM traversal |
| **cors** | ^2.8.6 | Cross-Origin Resource Sharing middleware |
| **dotenv** | ^17.3.1 | `.env` file loader for environment variables |

### Fonts & Typography

| Font | Usage |
|---|---|
| **Orbitron** | Logo and heading text (futuristic tech aesthetic) |
| **Rajdhani** | Body text (clean, modern sans-serif) |

---

## ✅ Prerequisites

Before you begin, ensure you have the following installed:

| Requirement | Minimum Version | How to Verify |
|---|---|---|
| **Node.js** | v18.0.0 or higher | `node --version` |
| **npm** | v9.0.0 or higher (ships with Node.js) | `npm --version` |
| **Git** | Any recent version | `git --version` |
| **A code editor** | VS Code recommended | — |
| **Google Gemini API Key** | Free tier works | Get one at [Google AI Studio](https://aistudio.google.com/apikey) |

> **Note:** npm is the default package manager for this project. Yarn and pnpm are untested.

---

## 🚀 Installation & Setup

Follow these steps to get Veritas AI running locally on your machine.

### Option 1: Clone with Git (Recommended)
**1. Clone the repository**
```bash
git clone https://github.com/suryadeepkrsingh-cmd/fake-news.git
cd fake-news
```

### Option 2: Download ZIP File
**1. Download and extract**
- On GitHub, click **Code** then **Download ZIP**
- Extract the ZIP file to your desired location
- Open the extracted folder in your code editor

**2. Install frontend dependencies**
```bash
npm install
```

**3. Install backend dependencies**
```bash
npm install --prefix server
```

**4. Configure environment variables**

Copy the example env file and add your own Gemini key:
```powershell
Copy-Item server\.env.example server\.env
```
Then edit `server/.env` as described in [Environment Variables](#environment-variables) below.

**5. Start the backend server** (Terminal 1)
```bash
npm run server
```
You should see: `Fact Checker Backend listening at http://localhost:3001`

**7. Start the frontend dev server** (Terminal 2)
```bash
npm run dev
```
You should see: `Local: http://localhost:5173/`

**8. Open your browser** and navigate to `http://localhost:5173`.

**9. Verify the connection** — the top-right of the dashboard should show a green "Online" indicator. If you see an amber "Backend Offline" banner, confirm the server is running on port 3001.

---

## 🔐 Environment Variables

Create a file named `.env` inside the `server/` directory, or copy `server/.env.example` and fill in your values:

```env
# server/.env

# Port for the Express backend (default: 3001)
PORT=3001

# One or more Google Gemini API keys (comma-separated for key rotation)
GEMINI_API_KEY=your_first_gemini_api_key_here
```

### Key Rotation for Rate-Limit Resilience

If you hit rate limits during development or demo, you can supply multiple API keys separated by commas:

```env
GEMINI_API_KEY=key_one_here,key_two_here,key_three_here
```

The server cycles through keys round-robin style — when one key receives a `429 Too Many Requests` response, it automatically falls back to the next key in the rotation. This logic is implemented in `server/index.js:27-32`.

### How to Get a Gemini API Key

1. Visit [Google AI Studio](https://aistudio.google.com/apikey).
2. Sign in with your Google account.
3. Click **Create API Key** and copy the generated key.
4. Paste it into your `server/.env` file.

> **Security Warning:** Never commit your `.env` file to version control. This repo includes `server/.env.example` as a safe template, and `.gitignore` already excludes `server/.env`.

---

## 📂 Project Structure

```text
fake-news-app/
├── .gitignore                          # Git ignore rules
├── README.md                           # Project documentation (this file)
├── index.html                          # Vite HTML entry point
├── package.json                        # Frontend dependencies & npm scripts
├── package-lock.json                   # Dependency lockfile
├── vite.config.ts                      # Vite bundler configuration
├── tailwind.config.js                  # Tailwind CSS v4 configuration
├── postcss.config.js                   # PostCSS pipeline (Tailwind + autoprefixer)
├── tsconfig.json                       # TypeScript project references
├── tsconfig.app.json                   # TS config for src/ (ES2023, strict mode)
├── tsconfig.node.json                  # TS config for vite.config.ts
├── eslint.config.js                    # ESLint flat config
├── public/                             # Static assets served by Vite
│   ├── favicon.svg                     # Purple arrow/shield favicon
│   └── icons.svg                       # Icon sprite sheet
├── src/                                # Frontend React application
│   ├── main.tsx                        # React entry point (renders <App />)
│   ├── App.tsx                         # Main dashboard — all UI logic lives here
│   ├── index.css                       # Global styles (~1560 lines: Tailwind + custom CSS)
│   ├── App.css                         # Legacy Vite template CSS (unused)
│   ├── lib/
│   │   └── ai.ts                       # API client: verifyClaim, fetchUrlPreview, submitFeedback
│   ├── components/
│   │   ├── ThreeCanvas.tsx             # 3D WebGL globe background scene
│   │   ├── Hero.tsx                    # Placeholder (empty)
│   │   └── Scene.tsx                   # Placeholder (empty)
│   └── assets/
│       ├── hero.png                    # Hero section image
│       ├── vite.svg                    # Vite logo
│       └── react.svg                   # React logo
├── server/                             # Express.js backend
│   ├── .env                            # API keys & port config (git-ignored)
│   ├── index.js                        # Server entry: routes, AI pipeline, scraping
│   ├── package.json                    # Backend dependencies
│   └── package-lock.json               # Backend dependency lockfile
├── browser-extension/                  # Planned Chrome extension (placeholder)
│   ├── manifest.json                   # Empty — future development
│   ├── popup.html                      # Empty — future development
│   ├── popup.js                        # Empty — future development
│   └── popup.css                       # Empty — future development
└── dist/                               # Production build output (generated)
    ├── index.html
    ├── favicon.svg
    └── assets/
        ├── index-*.css                 # Bundled CSS
        └── index-*.js                  # Bundled JavaScript
```

### Key Files Explained

| File | What It Does |
|---|---|
| `server/index.js` | The heart of the backend. Contains the verification pipeline (sentinel matching, URL scraping, Wikipedia enrichment, Gemini AI prompting), all three API endpoints, and the rotating API key logic. |
| `src/App.tsx` | The heart of the frontend (~1130 lines). Handles the search input, verification flow, results dashboard, history panel, feedback modal, theme toggling, and all UI state. |
| `src/lib/ai.ts` | Thin API client layer. Exports three typed async functions (`verifyClaim`, `fetchUrlPreview`, `submitFeedback`) that talk to the backend. Includes `VerificationResult` and `UrlPreviewResult` TypeScript interfaces. |
| `src/components/ThreeCanvas.tsx` | The animated 3D globe background (~598 lines). Built with React Three Fiber. Contains rotating globe, city nodes, connection arcs, orbit rings, starfield, and light ribbon effects. Full dark/light theme support. |
| `src/index.css` | ~1560 lines of custom CSS. Includes Tailwind v4 import, glassmorphism effects, animated conic-gradient search input, verify button pencil animation, ambient orb drift, responsive breakpoints, and `prefers-reduced-motion` support. |

---

## 🔌 Core Functionality & API

The application follows a client-server architecture. The React frontend communicates with an Express backend that orchestrates the verification pipeline.

### API Endpoints

| Method | Endpoint | Description | Request Body |
|---|---|---|---|
| `GET` | `/` | Health check page showing server status, port, and keys loaded | — |
| `POST` | `/api/verify` | Main fact-check endpoint | `{ "claim": "string" }` |
| `POST` | `/api/scrape-preview` | Extract a preview (title, excerpt) from a URL | `{ "url": "https://..." }` |
| `POST` | `/api/feedback` | Submit user feedback on a verification result | See below |

### POST `/api/verify`

**Request:**
```json
{
  "claim": "Drinking bleach cures viruses"
}
```

**Response (`VerificationResult`):**
```json
{
  "verdict": "False",
  "confidence": 0.98,
  "explanation": "Drinking bleach is extremely dangerous and does not cure any viruses...",
  "sentiment": "Inflammatory",
  "riskLevel": "High",
  "scoreBreakdown": {
    "sourceReliability": 0.95,
    "logicalConsistency": 0.99,
    "factualAlignment": 0.97
  },
  "redFlags": ["Dangerous health misinformation", "Potential for real-world harm"],
  "relatedClaims": [
    {
      "claim": "Bleach is a disinfectant for surfaces",
      "verdict": "True",
      "url": "https://www.epa.gov"
    }
  ],
  "sources": [
    { "name": "WHO", "url": "https://www.who.int" },
    { "name": "CDC", "url": "https://www.cdc.gov" }
  ]
}
```

### POST `/api/scrape-preview`

**Request:**
```json
{
  "url": "https://www.bbc.com/news/article-123"
}
```

**Response:**
```json
{
  "url": "https://www.bbc.com/news/article-123",
  "title": "Breaking: Major Policy Announced",
  "excerpt": "First 260 characters of extracted page text...",
  "domain": "www.bbc.com",
  "scraped": true
}
```

### POST `/api/feedback`

**Request:**
```json
{
  "claim": "The Earth is flat",
  "verdict": "False",
  "confidence": 1.0,
  "helpful": true,
  "name": "Jane Doe",
  "email": "jane@example.com",
  "message": "Great analysis, very thorough."
}
```

### The Verification Pipeline (`server/index.js`)

When a claim arrives at `/api/verify`, it passes through a multi-stage pipeline:

1. **Input Normalization** — The claim is lowercased, punctuation is stripped, and whitespace is collapsed. This normalized text is matched against the `HARDCODED_TRUTHS` dictionary using token-based semantic matching.

2. **Hardcoded Sentinel Check** — If the normalized claim matches a known fact (e.g., "the earth is flat" → `False`), the server returns a deterministic response in milliseconds without calling the AI. This saves API costs and guarantees accuracy on known facts. The sentinel supports both direct substring matching and semantic token matching (e.g., "t20 world cup 2026" matches "t20 world cup of 2026").

3. **URL Scraping** — If the input starts with `http://` or `https://`, Axios fetches the page HTML and Cheerio extracts the `<title>` and `<p>` body text (capped at 3000 characters). If scraping fails (403, timeout, dynamic rendering), the system gracefully falls back to analyzing the URL string itself.

4. **Wikipedia Enrichment** — For non-URL claims under 1000 characters, the server queries the Wikipedia API search endpoint. The top search result's snippet is appended to the AI prompt as additional context.

5. **AI Analysis** — A structured prompt is sent to **Google Gemini 2.5 Flash** via `@google/generative-ai`. The prompt enforces JSON-only output with a strict schema requiring `verdict`, `confidence`, `explanation`, `sentiment`, `riskLevel`, `scoreBreakdown`, `redFlags`, `relatedClaims`, and `sources`.

6. **Response Parsing & Cleanup** — The AI response is stripped of markdown code fences (```` ```json ``` ````), parsed as JSON, and merged with default metric overlays before being sent to the frontend.

---

## 🎮 Usage Guide

### Step-by-Step

1. **Start the backend** (Terminal 1):
   ```bash
   npm run server
   ```
2. **Start the frontend** (Terminal 2):
   ```bash
   npm run dev
   ```
3. **Open** `http://localhost:5173` in your browser.
4. **Enter a claim or URL** in the search box. You can:
   - Type a direct claim: `"Drinking bleach cures viruses"`
   - Paste a news article URL: `"https://www.bbc.com/news/article-123"`
   - Ask a question: `"Who is the Prime Minister of India?"`
5. **Click VERIFY** (or press Enter) and wait for the analysis dashboard.
6. **Review the results** — verdict card, confidence bar, score breakdown, sentiment, risk level, red flags, cited sources, and related claims.
7. **Explore extras:**
   - Click **History** (top-right) to review past verifications in the session.
   - Toggle **Dark/Light mode** via the sun/moon icon.
   - Click **Copy** to copy the summary to clipboard, or **Share** to use the native Web Share API.
   - Click **Feedback** to submit a helpful/not-helpful rating with a message.
   - Click any of the **4 example prompts** for instant testing.

### Input Types the App Handles

| Input | Example | How It's Processed |
|---|---|---|
| **Direct claim** | `"The earth is flat"` | Sentinel check → Wikipedia → AI analysis |
| **URL** | `"https://example.com/news"` | URL scraping → AI analysis of extracted text |
| **Question** | `"Who is the president of the USA?"` | Sentinel check → Wikipedia → AI analysis |
| **Long text** | Paste an entire article | AI analysis of the full text |

### Highlighted Risk Terms

The UI automatically highlights potentially risky words in your input with an amber background. These include terms like `shocking`, `viral`, `breaking`, `sponsored`, `miracle`, `secret`, `exposed`, `unbelievable`, `conspiracy`, `cover-up`, `they don't want you to know`, and more. This gives an immediate visual signal before the AI even processes the claim.

---

## 📸 Screenshots & Workflow

> **Note:** Replace the placeholder paths below with actual screenshots of your running application.

### Dashboard — Dark Mode
![Dashboard Dark Mode](docs/screenshots/dashboard-dark.png)

### Verification Results
![Verification Results](docs/screenshots/verification-results.png)

### Light Mode with History Panel
![Light Mode with History](docs/screenshots/light-mode-history.png)

### Workflow Diagram

```
┌─────────────┐     ┌──────────────────┐     ┌───────────────────┐
│  User Input  │────▶│  POST /api/verify │────▶│  Sentinel Check   │
│ (claim/URL)  │     │  (Express Server) │     │ (hardcoded truths)│
└─────────────┘     └──────────────────┘     └─────────┬─────────┘
                                                       │
                                              ┌────────▼────────┐
                                              │  Match Found?    │
                                              └───┬─────────┬───┘
                                                  │ Yes     │ No
                                            ┌─────▼────┐ ┌──▼──────────────┐
                                            │ Return    │ │ URL? → Scrape   │
                                            │ Instantly │ │ Wiki Enrichment │
                                            └──────────┘ └────────┬────────┘
                                                                   │
                                                          ┌────────▼────────┐
                                                          │  Gemini 2.5     │
                                                          │  Flash (AI)     │
                                                          └────────┬────────┘
                                                                   │
                                                          ┌────────▼────────┐
                                                          │ Parse JSON      │
                                                          │ Return to UI    │
                                                          └─────────────────┘
```

---

## ☁️ Deployment Instructions

### Platform 1: Frontend on Vercel + Backend on Render (Recommended)

#### Deploy Frontend to Vercel
1. Push your code to a GitHub repository.
2. Sign in to [vercel.com](https://vercel.com) and click **Add New Project**.
3. Import your GitHub repository. Vite will be auto-detected as the framework preset.
4. Leave the build settings at their defaults:
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
5. Click **Deploy**.
6. After deployment, your frontend will be live at `https://your-app.vercel.app`.

#### Deploy Backend to Render
1. Sign in to [render.com](https://render.com).
2. Click **New** → **Web Service**.
3. Connect your GitHub repository.
4. Configure the service:
   - **Root Directory:** `server`
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `node index.js`
   - **Instance Type:** Free (sufficient for development/demos)
5. Under **Environment Variables**, add:
   - `GEMINI_API_KEY` — your Gemini API key(s)
   - `PORT` — `3001` (or omit; Render assigns its own port)
6. Click **Create Web Service**.
7. After deployment, note your backend URL (e.g., `https://veritas-ai-backend.onrender.com`).

#### Connect Frontend to Backend
Update `src/lib/ai.ts` — change all occurrences of `http://127.0.0.1:3001` to your live Render URL:
```typescript
// Before
const response = await fetch('http://127.0.0.1:3001/api/verify', {

// After
const response = await fetch('https://your-backend.onrender.com/api/verify', {
```

Redeploy the frontend after making this change.

---

### Platform 2: Full Stack on Railway

[Railway](https://railway.app) supports deploying both the frontend and backend from a single repository.

1. Sign in to [railway.app](https://railway.app) and click **New Project** → **Deploy from GitHub Repo**.
2. Select your repository. Railway will detect the project structure.
3. Add two services:
   - **Backend Service:**
     - Root Directory: `server`
     - Start Command: `node index.js`
     - Environment Variables: `GEMINI_API_KEY=your_key`, `PORT=3001`
   - **Frontend Service:**
     - Root Directory: `/` (root)
     - Build Command: `npm run build`
     - Start Command: `npx serve dist` (or install `serve` as a dependency)
     - Or use Railway's Nixpacks with a custom `Dockerfile`.
4. Railway provides a public URL for each service. Update `src/lib/ai.ts` to point to the backend's Railway URL.
5. Redeploy the frontend service.

### Build Commands Reference

```bash
# Production build (frontend)
npm run build          # Outputs to dist/

# Preview production build locally
npm run preview        # Serves dist/ on a local server

# Run backend in production mode
node server/index.js   # Reads PORT and GEMINI_API_KEY from environment
```

---

## 🚧 Known Limitations

| Limitation | Explanation |
|---|---|
| **Anti-bot walls** | Heavily secured websites (NYT, Twitter/X, paywalled sites) block Axios requests. The scraper cannot execute JavaScript or bypass Cloudflare/CAPTCHA protection. |
| **No database persistence** | Verification history is stored in React `useState` — it is lost on page refresh. Feedback is stored in a server-side in-memory array (max 500 entries, lost on restart). |
| **No authentication** | The app has no user accounts. Anyone can access the API endpoints directly. |
| **Rate limit vulnerability** | The Gemini API free tier has strict rate limits. Without server-side throttling, the endpoint can be abused. |
| **Hardcoded backend URL** | The frontend hardcodes `http://127.0.0.1:3001` in `src/lib/ai.ts`, requiring manual changes for deployment. |
| **Large file in single component** | `App.tsx` is ~1130 lines — a monolithic component that should be split into smaller, reusable pieces. |
| **Empty placeholder files** | `Hero.tsx`, `Scene.tsx`, and the entire `browser-extension/` directory are empty placeholders. |
| **3D performance on low-end hardware** | The Three.js globe may cause frame drops on devices without dedicated GPUs. |

## 🔮 Future Roadmap

### Short-Term (Next Release)
- [ ] **Environment-based API URL** — Use `VITE_API_URL` env var instead of hardcoded `http://127.0.0.1:3001`.
- [ ] **Server-side rate limiting** — Add `express-rate-limit` to protect API endpoints from abuse.
- [ ] **Extract components** — Break `App.tsx` into `SearchInput`, `ResultsDashboard`, `HistoryPanel`, `FeedbackModal`, etc.
- [ ] **Puppeteer fallback** — For scraping blocked sites, add a headless browser fallback with `puppeteer-extra` and stealth plugin.

### Medium-Term
- [ ] **PostgreSQL + Prisma** — Persistent storage for user accounts, query history, and cached source credibility scores.
- [ ] **User authentication** — OAuth via Supabase or Firebase. Per-user history and saved reports.
- [ ] **Browser extension** — Complete the Chrome extension to let users fact-check claims directly from any webpage.
- [ ] **Real-time streaming** — Use Server-Sent Events (SSE) or WebSockets to stream partial results as the AI generates them.

### Long-Term / Stretch Goals
- [ ] **Multi-model support** — Let users choose between Gemini, GPT-4, Claude, or a local Llama model.
- [ ] **Multilingual fact-checking** — Support claims in Hindi, Spanish, French, etc. via multilingual LLM prompts.
- [ ] **Source credibility database** — Maintain a shared database of media outlet reliability scores (inspired by Media Bias/Fact Check).
- [ ] **Mobile app** — React Native companion app for iOS and Android.
- [ ] **Fine-tuned model** — Train a custom classification model on labeled misinformation datasets for faster, cheaper verification.

---

## 🤝 Contribution Guidelines

Contributions are welcome. Please follow these steps:

1. **Fork** the repository.
2. **Create a feature branch:** `git checkout -b feature/your-feature-name`
3. **Make your changes** and ensure the code is clean.
4. **Commit** with a descriptive message: `git commit -m "Add: brief description"`
5. **Push** to your fork: `git push origin feature/your-feature-name`
6. **Open a Pull Request** against the `main` branch.

### Contribution Rules
- Follow the existing code style (TypeScript strict mode, Tailwind utility classes).
- Do not commit `.env` files, `node_modules/`, or build artifacts.
- Add comments only where the logic is non-obvious.
- Test your changes locally before submitting.

## 📜 License

This project is distributed under the **MIT License**. You are free to use, modify, distribute, and sublicense the code, provided you include the original copyright notice and license text. See the `LICENSE` file for the full license text.

---
---

## ❓ Frequently Asked Questions (FAQ)

### General Questions

**Q: What is Veritas AI?**
> Veritas AI is an AI-powered fact-checking web application. You paste a claim (text or URL), and the app returns a structured verification dashboard showing a verdict (True/False/Unverified), confidence score, score breakdown, sentiment analysis, risk level, red flags, related claims, and source citations.

**Q: Is it free to use?**
> Yes. The app uses the Google Gemini API free tier. You just need to create a free API key at [Google AI Studio](https://aistudio.google.com/apikey). There are no subscription fees.

**Q: Does it store my data?**
> No. Verification history is stored only in your browser's React state during your active session. When you refresh the page, the history is cleared. Feedback submissions are stored in a server-side in-memory array (max 500 entries) that resets on server restart. Nothing is persisted to a database.

**Q: Can I use a different AI model besides Gemini?**
> Yes. The backend is decoupled from the frontend. In `server/index.js:428`, change the model name from `'gemini-2.5-flash'` to any other Gemini model, or replace the `@google/generative-ai` SDK with the OpenAI SDK (`openai`), Anthropic SDK (`@anthropic-ai/sdk`), or any other LLM provider. The prompt and JSON schema would remain the same.

**Q: Why does the 3D globe lag on my old laptop?**
> The Three.js globe uses WebGL, which requires a decent GPU. If your hardware struggles, you can disable the globe by removing or conditionally rendering the `<ThreeCanvas />` component in `App.tsx`. The rest of the app will work fine without it. You can also add a WebGL capability check and render a static fallback background instead.

**Q: Is this app GDPR compliant?**
> The app does not collect personal data beyond what's explicitly provided in the feedback form (name, email). No cookies are set. No analytics are tracked. For full GDPR compliance in a production deployment, you would need to add a privacy policy, cookie consent, and data deletion mechanisms.

### Developer Questions

**Q: How do I change the backend URL for deployment?**
> Open `src/lib/ai.ts` and replace all three occurrences of `http://127.0.0.1:3001` with your deployed backend URL. Alternatively, you can use an environment variable like `import.meta.env.VITE_API_URL` with Vite's `.env` file support.

**Q: How do I run just the frontend without the backend?**
> Run `npm run dev`. The frontend will load, but verification calls will fail. The app handles this gracefully by showing an "Backend Offline" banner and returning an `Unverified` result.

**Q: Can I add more hardcoded sentinel truths?**
> Yes. In `server/index.js`, add new entries to the `HARDCODED_TRUTHS` object. Each key is a normalized string to match against, and the value is an object with `verdict`, `confidence`, `explanation`, and `sources`. The matching logic (`getHardcodedSentinelMatch`) supports both direct substring matching and semantic token matching.

**Q: How do I build for production?**
> Run `npm run build`. This creates a `dist/` folder with the compiled frontend. Serve it with any static file server (e.g., `npx serve dist`). The backend runs separately with `node server/index.js`.

**Q: Why are there TypeScript errors in the build?**
> Run `npm run lint` to check for issues. Known issues include 2 `@typescript-eslint/no-explicit-any` warnings in `App.tsx` (lines 84 and 104) and 1 react-hooks/immutability warning in `ThreeCanvas.tsx`. These are non-blocking for development but should be fixed for production.

---

## ⚖️ Viva / Judge Panel Questions

*(These are the most probable, realistic technical questions a judge or evaluator will ask about this specific project.)*

---

**1. What is the core flow of this application from the moment I click 'Verify'?**

The frontend sends the claim/URL to our Node.js Express backend. The backend first checks our "Hardcoded Truth Sentinel" for instant matches. If it's a URL, Cheerio scrapes the website's text. If it's a short text claim, the Wikipedia API triggers for context enrichment. Finally, the aggregated context is sent to the Gemini AI via a strict system prompt to evaluate and return a structured JSON response, which the React UI then visualizes.

---

**2. Why did you choose React + Vite instead of Next.js or Angular?**

This application holds fundamentally no SEO requirement because user generated dashboard configurations are meant to be private/ephemeral, which eliminates the core necessity for Server Side Rendering frameworks like Next.js. Vite provides instantaneous Hot Module Replacement (HMR). Furthermore, Angular heavily struggles to integrate advanced 3D WebGL scenes natively compared to React's `@react-three/fiber` ecosystem which drives our globe dashboard.

---

**3. I see no database. Where is the verification history stored?**

The history is intentionally stored entirely in client-side state (React `useState`) to prioritize absolute user privacy. Setting up a monolithic database for user queries adds unnecessary data-governance overhead for a hackathon. If scaling to production, I would utilize PostgreSQL with Prisma to map authenticated users via OAuth to their private saved verification reports.

---

**4. How do you prevent the AI from hallucinating or giving the wrong answer for obvious facts?**

I implemented a "Hardcoded Truth Sentinel." Before the claim ever reaches the AI, the backend normalizes the string and matches semantic tokens against a predefined dictionary of absolute truths. If a match occurs, it bypasses the API completely and returns a deterministic `False` or `True` instantly. This acts as a rigid, low-latency safety net and saves heavy API costs.

---

**5. What happens if a user submits a paywalled or heavily protected website URL?**

Tools like Axios and Cheerio cannot execute JavaScript to bypass Cloudflare captchas or subscription paywalls. If the initial scraping fetch fails with a 403 or Timeout, my backend catches the error gracefully. Instead of crashing, it forwards the *Base URL string* and the active domain name to the AI, instructing it to evaluate the general baseline credibility of that news source based on its historical training data.

---

**6. Why use Google Gemini 2.5 Flash over OpenAI's GPT-4?**

Three precise reasons: Incredible speed, structured data performance, and cost optimization. Gemini Flash is optimized for sub-second latency, prioritizing a fast user UX flow. It also natively supports phenomenal schema enforcement via `responseSchema`. This guarantees my Node server will receive highly structured JSON with exact nested keys (like `scoreBreakdown`) rather than unpredictable markdown text.

---

**7. How did you harden the backend against Prompt Injection?**

The Express architecture applies multiple layers of defense. First, it sanitizes inputs bounding character limits. The system prompt then leverages "Few-Shot Prompting" wrapped in a rigid system persona, exclusively demanding valid JSON mapping back. The AI analyzes the *nature* of the text instead of blindly executing it. Ultimately, if the AI is hijacked to return malformed nonsense, our rigorous `JSON.parse` `try-catch` block catches the syntax error and safely rejects the bad request rather than polluting the browser UI.

---

**8. How do you ensure the verification isn't biased by the AI itself?**

LLMs inherit baseline perspective biases from their training data. To explicitly suppress this, the prompt forces the AI into a deterministic evaluation loop, quantifying its decisions via a targeted "Score Breakdown" (Logical Consistency, Source Reliability, Factual Alignment). Furthermore, the required generation of "Referenced Citations" anchors the analysis in objective, external data rather than the model's latent sentiment.

---

**9. I noticed smooth scrolling despite the heavy 3D globe. How did you optimize the CSS and WebGL performance?**

The lag initially caused by blurring glass panels over shifting 3D pixels on every scroll tick was immense (the 10px blur filter triggered full-screen repaints). I completely mitigated this by converting the Three.js `<Canvas>` to `fixed` positioning, separating it from the layout reflow completely. I then applied localized hardware acceleration (`transform: translateZ(0)`) to the `.glass` cards, pushing them to completely independent rendering compositor layers on the GPU.

---

**10. What React anti-patterns did you accidentally hit while building the 3D background, and how did you resolve them?**

I originally mutated Three.js native objects (e.g. `mesh.rotation.x`) directly inside the functional component body rendering cycle. React Strict Mode rightly flagged this as a severe Hook Immutability violation. I resolved this by correctly adopting React Three Fiber rendering paradigms: instancing a primitive `useRef`, tying it to the mesh, and executing mutations exclusively inside the decoupled `useFrame` requestAnimationFrame engine loop, securing absolute pure React tree state.

---

**11. Why did you implement custom CSS instead of a component library like Material-UI or Bootstrap?**

Pre-built component libraries constrain design when targeting a highly bespoke "premium cyber-intelligence" aesthetic. The specific requirements for this app—spark-borders, complex ambient radial gradients on hover states, conic-gradient strokes, and seamless SVG validation animations—would have required aggressive `!important` overriding of a Material-UI theme. Tailwind CSS provided exacting, utility-level control over rendering paths without fighting preset framework assumptions.

---

**12. What was the hardest backend challenge to overcome?**

Resilient data alignment out of a Large Language Model. Generating an array of strings like `redFlags` sometimes results in an empty string, an improperly keyed array, or markdown tick wrapper overrides (` ```json `). Writing robust Node.js cleanup logic via regex stripping alongside aggressive default metric merging guarantees that even significantly malformed or incomplete AI responses fail softly, allowing the UI pipeline to extract what it can without crashing the final user view.
