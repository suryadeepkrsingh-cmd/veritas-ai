# Veritas AI

AI fact-checking dashboard for claims, questions, and article URLs.

Paste a claim or link, and the app returns:
- an assessment
- a confidence score
- an explanation
- cited sources
- related claims
- risk and sentiment signals

The project uses a React frontend and an Express backend with Gemini-assisted analysis, Wikipedia context, and lightweight page scraping.

## Features

- Verify short claims, questions, or article URLs
- Show URL preview before verification when possible
- Display confidence, explanation, sentiment, risk level, and score breakdown
- Display an evidence panel with deterministic credibility scoring
- Run a live trusted cross-check layer before final AI reasoning
- Show source citations and related claims
- Store recent checks in browser local storage
- Collect user feedback through a form
- Support dark and light mode
- Show verification progress while the request is running
- Use softer trust labels like `Likely true`, `Likely false`, and `Needs more evidence`
- Detect clickbait-like patterns before AI reasoning
- Score trusted-source coverage before AI reasoning

## Tech Stack

### Frontend

- React 19
- TypeScript
- Vite
- Tailwind CSS 4
- Three.js
- `@react-three/fiber`
- `@react-three/drei`
- `lucide-react`

### Backend

- Express 5
- `@google/generative-ai`
- Axios
- Cheerio
- dotenv
- CORS

### Tooling

- ESLint
- TypeScript
- PptxGenJS

## Project Structure

```text
fake-news-app/
|-- browser-extension/          # Placeholder extension files
|-- public/                     # Static assets
|-- server/
|   |-- .env.example            # Backend env template
|   |-- index.js                # Express server and verification pipeline
|   |-- package.json            # Backend dependencies
|   `-- feedback-store.json     # Created at runtime when feedback is saved
|-- src/
|   |-- assets/                 # Frontend images
|   |-- components/             # Three.js and UI components
|   |-- lib/ai.ts               # Frontend API client
|   |-- App.tsx                 # Main UI
|   |-- index.css               # Global styles
|   `-- main.tsx                # App entry point
|-- package.json                # Frontend dependencies and scripts
|-- Veritas_AI_Presentation.pptx
`-- README.md
```

## Quick Setup

### Prerequisites

- Node.js 18 or newer
- npm
- A Google Gemini API key

### Installation

1. Clone the repo:

```bash
git clone https://github.com/suryadeepkrsingh-cmd/fake-news.git
cd fake-news
```

2. Install frontend dependencies:

```bash
npm install
```

3. Install backend dependencies:

```bash
npm install --prefix server
```

4. Create the backend env file:

```powershell
Copy-Item server\.env.example server\.env
```

5. Open `server/.env` and add your Gemini API key.

## Environment Variables

`server/.env`

```env
PORT=3001
GEMINI_API_KEY=your_gemini_api_key_here
```

You can provide multiple Gemini keys separated by commas:

```env
GEMINI_API_KEY=key_one,key_two,key_three
```

## Run Locally

Start the backend:

```bash
npm run server
```

Start the frontend in a second terminal:

```bash
npm run dev
```

Open:

```text
http://localhost:5173
```

If the backend is not running, the frontend still opens, but live verification and feedback submission will not work.

## Available Scripts

### Frontend

```bash
npm run dev
npm run build
npm run preview
npm run lint
npm run server
```

### Backend

There is no dedicated backend dev script yet. The current backend is started from the root with:

```bash
npm run server
```

## API Endpoints

### `GET /`

Returns a simple backend health page.

### `POST /api/verify`

Request:

```json
{
  "claim": "The earth is flat"
}
```

Response shape:

```json
{
  "verdict": "False",
  "confidence": 1,
  "explanation": "Fact-check explanation",
  "sentiment": "Neutral",
  "riskLevel": "Low",
  "scoreBreakdown": {
    "sourceReliability": 1,
    "logicalConsistency": 1,
    "factualAlignment": 1
  },
  "redFlags": [],
  "relatedClaims": [],
  "sources": [
    {
      "name": "NASA Science",
      "url": "https://science.nasa.gov"
    }
  ],
  "evidenceSummary": {
    "trustedCount": 1,
    "averageCredibility": 0.99,
    "claimSpecificity": 0.42,
    "sourceCoverage": 0.6,
    "trustSignal": 0.67,
    "credibilityScore": 0.83,
    "confidenceBand": "High",
    "crossCheckSummary": {
      "query": "india 2026 t20 world cup (site:reuters.com OR site:bbc.com)",
      "status": "moderate",
      "matchedReports": 2,
      "trustedDomains": 2,
      "agreementScore": 0.5,
      "latestReportAt": "Sun, 08 Mar 2026 18:30:00 GMT",
      "results": []
    }
  }
}
```

### `POST /api/scrape-preview`

Request:

```json
{
  "url": "https://example.com/article"
}
```

Response shape:

```json
{
  "url": "https://example.com/article",
  "title": "Example title",
  "excerpt": "Preview text",
  "domain": "example.com",
  "scraped": true
}
```

### `POST /api/feedback`

Request:

```json
{
  "claim": "The earth is flat",
  "verdict": "False",
  "confidence": 1,
  "helpful": true,
  "name": "Jane Doe",
  "email": "jane@example.com",
  "message": "Helpful result"
}
```

## Verification Flow

1. The user submits a claim or URL from the frontend.
2. The backend validates the input and blocks unsafe local/private URLs.
3. Exact sentinel matches can return a fast deterministic result for known demo claims.
4. If the input is a URL, the backend tries to scrape page title and paragraph text.
5. If the input is short text, the backend can fetch a Wikipedia snippet for extra context.
6. A deterministic evidence layer runs before the LLM:
   - trusted-source registry lookup
   - source credibility scoring
   - claim specificity scoring
   - clickbait and vague-sourcing heuristics
   - Google News RSS lookup filtered to trusted domains
   - cross-check agreement scoring from multiple trusted reports
   - deterministic credibility score and confidence band
7. Gemini receives both the input context and the deterministic evidence summary.
8. The frontend renders the result dashboard, evidence panel, citations, heuristic signals, and trusted cross-check cards.

## Current Safety Improvements

Compared to the earlier version of the project, the backend now includes:

- blocking for localhost and private-network URLs in scraping routes
- no redirect following during URL scraping
- exact sentinel matching instead of loose substring matching
- unique feedback IDs even after the feedback store is trimmed
- trusted-source registry and source credibility helpers
- fake-news heuristic detection for clickbait, vague sourcing, punctuation overuse, and all-caps emphasis
- deterministic evidence summaries before LLM reasoning
- live trusted cross-check retrieval through filtered news RSS results

The frontend now:

- shows verification progress while loading
- treats feedback submission failure as a real error
- uses more cautious result wording
- shows an evidence panel with credibility score, confidence band, heuristic signals, source evidence, and cross-check matches

## Current Limitations

- Scraping is basic and cannot bypass paywalls, heavy bot protection, or JavaScript-rendered pages.
- The app still depends on a single AI provider for live verification.
- Trusted cross-check retrieval is lightweight and depends on RSS/search availability, so some topics may still return limited matches.
- There is no authentication or user account system.
- Feedback is stored in a local JSON file on the server.
- History is stored only in browser local storage.
- `src/App.tsx` is still large and could be split into smaller components.
- The browser extension folder is still a placeholder.
- The 3D scene may be heavy on low-end devices.

## Deployment Notes

The frontend reads the backend URL from `VITE_API_BASE_URL` in `src/lib/ai.ts`.

If you deploy the backend, set the frontend environment variable to the deployed backend base URL, for example:

```env
VITE_API_BASE_URL=https://your-backend.example.com
```

Without that variable, the frontend defaults to:

```text
http://127.0.0.1:3001
```

## Suggested Next Improvements

If you only have limited time, the best next upgrades are:

- split `App.tsx` into smaller reusable components
- add server-side rate limiting
- add request logging and better monitoring
- move feedback and history into a database
- improve trusted cross-check query quality and claim matching
- build the browser extension
- add multilingual verification

## Troubleshooting

### Frontend opens but verification does not work

Make sure the backend is running:

```bash
npm run server
```

### PowerShell blocks `npm`

If PowerShell blocks `npm.ps1`, use:

```bash
npm.cmd run dev
npm.cmd run build
npm.cmd run lint
```

### URL preview says unavailable

That usually means:

- the backend is offline
- the site blocks scraping
- the site requires JavaScript rendering
- the URL is invalid or intentionally blocked for safety

## Presentation

The repo includes a generated presentation file:

- `Veritas_AI_Presentation.pptx`

This is a project presentation deck and is not used by the app runtime.

## License

This project currently does not include a dedicated `LICENSE` file in the repository root. If you plan to share or publish it widely, add one explicitly.
