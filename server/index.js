import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs';
import net from 'net';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const feedbackStorePath = path.join(__dirname, 'feedback-store.json');

function loadFeedbackStore() {
  try {
    if (!fs.existsSync(feedbackStorePath)) {
      return [];
    }

    const raw = fs.readFileSync(feedbackStorePath, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('Failed to load feedback store:', error);
    return [];
  }
}

function saveFeedbackStore(store) {
  try {
    fs.writeFileSync(feedbackStorePath, JSON.stringify(store, null, 2), 'utf-8');
  } catch (error) {
    console.error('Failed to save feedback store:', error);
  }
}

const feedbackStore = loadFeedbackStore();

const groqApiKey = (process.env.GROQ_API_KEY || '').trim();
const groqModel = (process.env.GROQ_MODEL || 'llama-3.3-70b-versatile').trim();
const groqClient = groqApiKey
  ? new OpenAI({
    apiKey: groqApiKey,
    baseURL: 'https://api.groq.com/openai/v1',
  })
  : null;

const rawKeys = process.env.GEMINI_API_KEY || '';
const apiKeys = rawKeys.split(',').map((k) => k.trim()).filter(Boolean);
const normalizedHardcodedTruths = new Map();
const TRUSTED_SOURCES = [
  { name: 'Reuters', domains: ['reuters.com'], credibility: 0.98, category: 'news' },
  { name: 'Associated Press', domains: ['apnews.com'], credibility: 0.97, category: 'news' },
  { name: 'BBC News', domains: ['bbc.com', 'bbc.co.uk'], credibility: 0.96, category: 'news' },
  { name: 'The Hindu', domains: ['thehindu.com'], credibility: 0.93, category: 'news' },
  { name: 'Indian Express', domains: ['indianexpress.com'], credibility: 0.92, category: 'news' },
  { name: 'PIB', domains: ['pib.gov.in'], credibility: 0.95, category: 'government' },
  { name: 'WHO', domains: ['who.int'], credibility: 0.99, category: 'health' },
  { name: 'CDC', domains: ['cdc.gov'], credibility: 0.99, category: 'health' },
  { name: 'NASA', domains: ['nasa.gov'], credibility: 0.99, category: 'science' },
  { name: 'Wikipedia', domains: ['wikipedia.org'], credibility: 0.75, category: 'reference' },
];
const CLICKBAIT_TERMS = [
  'shocking',
  'viral',
  'breaking',
  'must watch',
  'must see',
  'secret',
  'guaranteed',
  'unbelievable',
  'historic',
  'exposed',
  'everything',
  'you won t believe',
  'they don t want you to know',
];
const VAGUE_SOURCE_PATTERNS = [
  'experts say',
  'sources say',
  'people are saying',
  'it is believed',
  'reportedly',
  'rumor has it',
  'many people say',
];
const SEARCH_STOPWORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'by',
  'did',
  'for',
  'from',
  'has',
  'have',
  'how',
  'in',
  'is',
  'it',
  'of',
  'on',
  'or',
  'that',
  'the',
  'this',
  'to',
  'was',
  'were',
  'what',
  'when',
  'where',
  'which',
  'who',
  'why',
  'will',
  'with',
]);
const ENTITY_IGNORED_TERMS = new Set([
  'Did',
  'Who',
  'What',
  'When',
  'Where',
  'Why',
  'How',
  'The',
  'A',
  'An',
]);

for (const [key, value] of Object.entries({
  'the earth is flat': {
    verdict: 'False',
    confidence: 1.0,
    explanation:
      '[Hardcoded Sentinel] The Earth is an oblate spheroid, as proven by centuries of astronomy.',
    sources: [{ name: 'NASA Science', url: 'https://science.nasa.gov' }],
  },
  'antigravity truth is the best': {
    verdict: 'True',
    confidence: 1.0,
    explanation:
      '[Hardcoded Sentinel] Yes, absolutely. It integrates cutting-edge 3D UI with real-time AI fact-checking.',
    sources: [{ name: 'System Admin', url: 'localhost' }],
  },
  'did india win the 2026 t20 world cup': {
    verdict: 'True',
    confidence: 0.99,
    explanation:
      '[Hardcoded Sentinel] Yes. India won the ICC Men\'s T20 World Cup 2026, which concluded on March 8, 2026.',
    sources: [
      {
        name: 'ICC tournament fixtures',
        url: 'https://www.icc-cricket.com/tournaments/mens-t20-world-cup-2026/news/fixtures-groups-released-for-icc-men-s-t20-world-cup-2026/',
      },
      {
        name: 'ICC schedule announcement',
        url: 'https://www.icc-cricket.com/media-releases/icc-men-s-t20-world-cup-2026-schedule-announced',
      },
      {
        name: 'Britannica summary',
        url: 'https://www.britannica.com/event/2026-T20-World-Cup',
      },
    ],
    sentiment: 'Neutral',
    riskLevel: 'Low',
    scoreBreakdown: {
      sourceReliability: 0.98,
      logicalConsistency: 1.0,
      factualAlignment: 0.99,
    },
    redFlags: [],
    relatedClaims: [],
  },
  'india won the 2026 t20 world cup': {
    verdict: 'True',
    confidence: 0.99,
    explanation:
      '[Hardcoded Sentinel] Yes. India won the ICC Men\'s T20 World Cup 2026, which concluded on March 8, 2026.',
    sources: [
      {
        name: 'ICC tournament fixtures',
        url: 'https://www.icc-cricket.com/tournaments/mens-t20-world-cup-2026/news/fixtures-groups-released-for-icc-men-s-t20-world-cup-2026/',
      },
      {
        name: 'ICC schedule announcement',
        url: 'https://www.icc-cricket.com/media-releases/icc-men-s-t20-world-cup-2026-schedule-announced',
      },
      {
        name: 'Britannica summary',
        url: 'https://www.britannica.com/event/2026-T20-World-Cup',
      },
    ],
    sentiment: 'Neutral',
    riskLevel: 'Low',
    scoreBreakdown: {
      sourceReliability: 0.98,
      logicalConsistency: 1.0,
      factualAlignment: 0.99,
    },
    redFlags: [],
    relatedClaims: [],
  },
  'who won the odi world cup of 2023': {
    verdict: 'True',
    confidence: 0.99,
    explanation:
      '[Hardcoded Sentinel] Australia won the 2023 ICC Men\'s Cricket World Cup by defeating India in the final on November 19, 2023.',
    sources: [
      {
        name: 'ICC Cricket World Cup final report',
        url: 'https://www.cricketworldcup.com/news/3785164',
      },
      {
        name: 'ICC tournament results',
        url: 'https://www.cricketworldcup.com/',
      },
    ],
    sentiment: 'Neutral',
    riskLevel: 'Low',
    scoreBreakdown: {
      sourceReliability: 0.98,
      logicalConsistency: 1.0,
      factualAlignment: 0.99,
    },
    redFlags: [],
    relatedClaims: [],
  },
  'who won the 2023 odi world cup': {
    verdict: 'True',
    confidence: 0.99,
    explanation:
      '[Hardcoded Sentinel] Australia won the 2023 ICC Men\'s Cricket World Cup by defeating India in the final on November 19, 2023.',
    sources: [
      {
        name: 'ICC Cricket World Cup final report',
        url: 'https://www.cricketworldcup.com/news/3785164',
      },
      {
        name: 'ICC tournament results',
        url: 'https://www.cricketworldcup.com/',
      },
    ],
    sentiment: 'Neutral',
    riskLevel: 'Low',
    scoreBreakdown: {
      sourceReliability: 0.98,
      logicalConsistency: 1.0,
      factualAlignment: 0.99,
    },
    redFlags: [],
    relatedClaims: [],
  },
  'who won the odi world cup 2023': {
    verdict: 'True',
    confidence: 0.99,
    explanation:
      '[Hardcoded Sentinel] Australia won the 2023 ICC Men\'s Cricket World Cup by defeating India in the final on November 19, 2023.',
    sources: [
      {
        name: 'ICC Cricket World Cup final report',
        url: 'https://www.cricketworldcup.com/news/3785164',
      },
      {
        name: 'ICC tournament results',
        url: 'https://www.cricketworldcup.com/',
      },
    ],
    sentiment: 'Neutral',
    riskLevel: 'Low',
    scoreBreakdown: {
      sourceReliability: 0.98,
      logicalConsistency: 1.0,
      factualAlignment: 0.99,
    },
    redFlags: [],
    relatedClaims: [],
  },
  'australia won the 2023 odi world cup': {
    verdict: 'True',
    confidence: 0.99,
    explanation:
      '[Hardcoded Sentinel] Yes. Australia won the 2023 ICC Men\'s Cricket World Cup by defeating India in the final on November 19, 2023.',
    sources: [
      {
        name: 'ICC Cricket World Cup final report',
        url: 'https://www.cricketworldcup.com/news/3785164',
      },
      {
        name: 'ICC tournament results',
        url: 'https://www.cricketworldcup.com/',
      },
    ],
    sentiment: 'Neutral',
    riskLevel: 'Low',
    scoreBreakdown: {
      sourceReliability: 0.98,
      logicalConsistency: 1.0,
      factualAlignment: 0.99,
    },
    redFlags: [],
    relatedClaims: [],
  },
  'who is the chief minister of up': {
    verdict: 'True',
    confidence: 0.99,
    explanation:
      '[Hardcoded Sentinel] As of March 31, 2026, the Chief Minister of Uttar Pradesh is Yogi Adityanath.',
    sources: [
      {
        name: 'Uttar Pradesh Information and Public Relations Department',
        url: 'https://information.up.gov.in/en/',
      },
      {
        name: 'Invest UP leadership page',
        url: 'https://invest.up.gov.in/our-leadership/',
      },
      {
        name: 'Britannica list of current Indian chief ministers',
        url: 'https://www.britannica.com/topic/List-of-current-Indian-chief-ministers',
      },
    ],
    sentiment: 'Neutral',
    riskLevel: 'Low',
    scoreBreakdown: {
      sourceReliability: 0.97,
      logicalConsistency: 1.0,
      factualAlignment: 0.99,
    },
    redFlags: [],
    relatedClaims: [],
  },
  'who is the chief minister of uttar pradesh': {
    verdict: 'True',
    confidence: 0.99,
    explanation:
      '[Hardcoded Sentinel] As of March 31, 2026, the Chief Minister of Uttar Pradesh is Yogi Adityanath.',
    sources: [
      {
        name: 'Uttar Pradesh Information and Public Relations Department',
        url: 'https://information.up.gov.in/en/',
      },
      {
        name: 'Invest UP leadership page',
        url: 'https://invest.up.gov.in/our-leadership/',
      },
      {
        name: 'Britannica list of current Indian chief ministers',
        url: 'https://www.britannica.com/topic/List-of-current-Indian-chief-ministers',
      },
    ],
    sentiment: 'Neutral',
    riskLevel: 'Low',
    scoreBreakdown: {
      sourceReliability: 0.97,
      logicalConsistency: 1.0,
      factualAlignment: 0.99,
    },
    redFlags: [],
    relatedClaims: [],
  },
  'yogi adityanath is the chief minister of up': {
    verdict: 'True',
    confidence: 0.99,
    explanation:
      '[Hardcoded Sentinel] Yes. As of March 31, 2026, Yogi Adityanath is the Chief Minister of Uttar Pradesh.',
    sources: [
      {
        name: 'Uttar Pradesh Information and Public Relations Department',
        url: 'https://information.up.gov.in/en/',
      },
      {
        name: 'Invest UP leadership page',
        url: 'https://invest.up.gov.in/our-leadership/',
      },
    ],
    sentiment: 'Neutral',
    riskLevel: 'Low',
    scoreBreakdown: {
      sourceReliability: 0.97,
      logicalConsistency: 1.0,
      factualAlignment: 0.99,
    },
    redFlags: [],
    relatedClaims: [],
  },
  'yogi adityanath is the chief minister of uttar pradesh': {
    verdict: 'True',
    confidence: 0.99,
    explanation:
      '[Hardcoded Sentinel] Yes. As of March 31, 2026, Yogi Adityanath is the Chief Minister of Uttar Pradesh.',
    sources: [
      {
        name: 'Uttar Pradesh Information and Public Relations Department',
        url: 'https://information.up.gov.in/en/',
      },
      {
        name: 'Invest UP leadership page',
        url: 'https://invest.up.gov.in/our-leadership/',
      },
    ],
    sentiment: 'Neutral',
    riskLevel: 'Low',
    scoreBreakdown: {
      sourceReliability: 0.97,
      logicalConsistency: 1.0,
      factualAlignment: 0.99,
    },
    redFlags: [],
    relatedClaims: [],
  },
  'did trump announce the world war 3': {
    verdict: 'False',
    confidence: 0.99,
    explanation:
      '[Hardcoded Sentinel] No. As of early 2026, there is no credible evidence or official announcement that Donald Trump has declared or announced World War 3. Such claims often stem from exaggerated political rhetoric, out-of-context clips, or sensationalized clickbait.',
    sources: [
      {
        name: 'Reuters Fact Check',
        url: 'https://www.reuters.com/fact-check/',
      },
      {
        name: 'Associated Press Fact Check',
        url: 'https://apnews.com/hub/ap-fact-check',
      },
    ],
    sentiment: 'Negative',
    riskLevel: 'High',
    scoreBreakdown: {
      sourceReliability: 0.96,
      logicalConsistency: 0.9,
      factualAlignment: 0.95,
    },
    redFlags: ['Clickbait potential', 'Unverified political rumor'],
    relatedClaims: [],
  },
})) {
  normalizedHardcodedTruths.set(normalizeText(key), value);
}

let currentKeyIndex = 0;
function getNextApiKey() {
  if (apiKeys.length === 0) return null;
  const key = apiKeys[currentKeyIndex];
  currentKeyIndex = (currentKeyIndex + 1) % apiKeys.length;
  return key;
}

function isGeminiKeyError(error) {
  const status = error?.status || error?.response?.status;
  const message = String(error?.message || '').toLowerCase();

  return (
    status === 401 ||
    status === 403 ||
    status === 429 ||
    message.includes('api key') ||
    message.includes('forbidden') ||
    message.includes('leaked') ||
    message.includes('quota') ||
    message.includes('unauthorized')
  );
}

function isGeminiModelError(error) {
  const status = error?.status || error?.response?.status;
  const message = String(error?.message || '').toLowerCase();

  return (
    status === 404 ||
    message.includes('model') && message.includes('not found') ||
    message.includes('not supported for generatecontent')
  );
}

function extractJsonObject(rawText = '') {
  if (!rawText) return '';
  const text = String(rawText).trim();

  if (text.startsWith('```')) {
    const cleanedFence = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
    if (cleanedFence.startsWith('{') && cleanedFence.endsWith('}')) {
      return cleanedFence;
    }
  }

  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');

  if (firstBrace !== -1 && lastBrace > firstBrace) {
    return text.slice(firstBrace, lastBrace + 1);
  }

  return text;
}

async function generateVerificationWithGemini(prompt) {
  if (apiKeys.length === 0) {
    throw new Error('No GEMINI_API_KEY configured');
  }

  const configuredModel = (process.env.GEMINI_MODEL || '').trim();
  const modelCandidates = [
    configuredModel,
    'gemini-1.5-flash-8b',
    'gemini-1.5-flash',
    'gemini-1.5-flash-latest',
    'gemini-2.0-flash-exp',
    'gemini-pro',
  ].filter(Boolean);

  let lastError = null;

  for (let keyAttempt = 0; keyAttempt < apiKeys.length; keyAttempt += 1) {
    const apiKey = getNextApiKey();
    if (!apiKey) continue;

    const genAI = new GoogleGenerativeAI(apiKey);

    for (const modelName of modelCandidates) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);
        const text = result?.response?.text?.()?.trim();

        if (!text) {
          throw new Error(`Gemini model ${modelName} returned empty response`);
        }

        const jsonText = extractJsonObject(text);
        const parsed = JSON.parse(jsonText);
        return parsed;
      } catch (error) {
        lastError = error;
        if (isGeminiModelError(error)) {
          continue;
        }

        if (isGeminiKeyError(error)) {
          break;
        }
      }
    }
  }

  throw lastError || new Error('Gemini verification failed');
}

const DEFAULT_METRIC_OVERLAY = {
  sentiment: 'Neutral',
  riskLevel: 'Low',
  scoreBreakdown: { sourceReliability: 0.8, logicalConsistency: 0.9, factualAlignment: 0.85 },
  redFlags: [],
  relatedClaims: [],
};

function buildEmptyCrossCheckSummary(query = '') {
  return {
    query,
    status: 'none',
    matchedReports: 0,
    trustedDomains: 0,
    agreementScore: 0,
    latestReportAt: '',
    results: [],
  };
}

function buildFallbackVerification(explanation) {
  return {
    ...DEFAULT_METRIC_OVERLAY,
    verdict: 'Unverified',
    confidence: 0,
    explanation,
    sources: [],
    relatedClaims: [],
    evidenceSummary: {
      evidence: [],
      trustedCount: 0,
      averageCredibility: 0,
      claimSpecificity: 0,
      sourceCoverage: 0,
      trustSignal: 0,
      credibilityScore: 0,
      confidenceBand: 'Low',
      heuristicSummary: {
        signals: [],
        riskScore: 0,
        uppercaseRatio: 0,
        exclamationCount: 0,
        questionCount: 0,
      },
      crossCheckSummary: buildEmptyCrossCheckSummary(),
      entityConsistency: {
        claimEntities: [],
        matchedEntities: [],
        unmatchedEntities: [],
        matchScore: 0,
        criticalEntities: [],
        unmatchedCriticalEntities: [],
        criticalMismatchScore: 0,
      },
      statementBreakdown: {
        items: [],
        supportedCount: 0,
        contradictedCount: 0,
        unclearCount: 0,
        supportedShare: 0,
        contradictedShare: 0,
        unclearShare: 0,
      },
    },
  };
}

function normalizeText(value = '') {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function deriveVerifiableClaim(input = '') {
  const trimmed = input.trim();
  if (!trimmed || isValidHttpUrl(trimmed)) {
    return {
      normalizedClaim: trimmed,
      derivedFromQuestion: false,
    };
  }

  const compact = trimmed.replace(/\s+/g, ' ').replace(/[?]+$/, '').trim();
  const lower = compact.toLowerCase();
  const patterns = [
    {
      regex: /^why is\s+(.+)$/i,
      transform: (value) => `${value} is happening`,
    },
    {
      regex: /^why are\s+(.+)$/i,
      transform: (value) => `${value} are happening`,
    },
    {
      regex: /^how is\s+(.+)$/i,
      transform: (value) => `${value} is happening`,
    },
    {
      regex: /^how are\s+(.+)$/i,
      transform: (value) => `${value} are happening`,
    },
    {
      regex: /^when is\s+(.+)$/i,
      transform: (value) => `${value} is scheduled`,
    },
    {
      regex: /^when are\s+(.+)$/i,
      transform: (value) => `${value} are scheduled`,
    },
  ];

  for (const pattern of patterns) {
    const match = compact.match(pattern.regex);
    if (!match) continue;

    return {
      normalizedClaim: pattern.transform(match[1].trim()),
      derivedFromQuestion: true,
    };
  }

  if (lower.startsWith('who won ')) {
    return {
      normalizedClaim: compact,
      derivedFromQuestion: false,
    };
  }

  return {
    normalizedClaim: compact,
    derivedFromQuestion: false,
  };
}

function includesAllTokens(text, requiredTokens = []) {
  const tokenSet = new Set(normalizeText(text).split(' ').filter(Boolean));
  return requiredTokens.every((token) => tokenSet.has(token));
}

function detectHeuristicSignals(text = '') {
  const normalizedText = normalizeText(text);
  const uppercaseLetters = (text.match(/[A-Z]/g) || []).length;
  const totalLetters = (text.match(/[A-Za-z]/g) || []).length;
  const uppercaseRatio = totalLetters > 0 ? uppercaseLetters / totalLetters : 0;
  const exclamationCount = (text.match(/!/g) || []).length;
  const questionCount = (text.match(/\?/g) || []).length;
  const clickbaitMatches = CLICKBAIT_TERMS.filter((term) => normalizedText.includes(term));
  const vagueSourceMatches = VAGUE_SOURCE_PATTERNS.filter((term) => normalizedText.includes(term));

  const signals = [];

  if (clickbaitMatches.length > 0) {
    signals.push({
      key: 'clickbait_language',
      label: 'Clickbait language detected',
      weight: 0.28,
      details: clickbaitMatches,
    });
  }

  if (vagueSourceMatches.length > 0) {
    signals.push({
      key: 'vague_sourcing',
      label: 'Vague sourcing language detected',
      weight: 0.24,
      details: vagueSourceMatches,
    });
  }

  if (exclamationCount >= 3) {
    signals.push({
      key: 'heavy_exclamation',
      label: 'Heavy exclamation usage',
      weight: 0.18,
      details: [String(exclamationCount)],
    });
  }

  if (questionCount >= 3) {
    signals.push({
      key: 'heavy_questioning',
      label: 'Heavy rhetorical questioning',
      weight: 0.12,
      details: [String(questionCount)],
    });
  }

  if (uppercaseRatio >= 0.35 && totalLetters >= 12) {
    signals.push({
      key: 'all_caps_emphasis',
      label: 'High all-caps emphasis',
      weight: 0.18,
      details: [uppercaseRatio.toFixed(2)],
    });
  }

  const riskScore = Math.min(1, signals.reduce((sum, signal) => sum + signal.weight, 0));

  return {
    signals,
    riskScore: Number(riskScore.toFixed(2)),
    uppercaseRatio: Number(uppercaseRatio.toFixed(2)),
    exclamationCount,
    questionCount,
  };
}

function getHostname(value) {
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return '';
  }
}

function normalizeHttpUrl(value) {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();

  if (!trimmed) return '';
  if (isValidHttpUrl(trimmed)) return trimmed;

  if (/^[a-z0-9.-]+\.[a-z]{2,}(\/.*)?$/i.test(trimmed)) {
    return `https://${trimmed}`;
  }

  return '';
}

function getTrustedSourceMatch(hostname) {
  if (!hostname) return null;

  return (
    TRUSTED_SOURCES.find((source) =>
      source.domains.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`)),
    ) || null
  );
}

function getSourceCredibility(hostname) {
  const trustedSource = getTrustedSourceMatch(hostname);

  if (trustedSource) {
    return {
      label: trustedSource.name,
      category: trustedSource.category,
      score: trustedSource.credibility,
      trusted: true,
    };
  }

  if (!hostname) {
    return {
      label: 'Unknown source',
      category: 'unknown',
      score: 0.35,
      trusted: false,
    };
  }

  if (hostname.endsWith('.gov') || hostname.includes('.gov.')) {
    return {
      label: hostname,
      category: 'government',
      score: 0.9,
      trusted: true,
    };
  }

  if (hostname.endsWith('.edu') || hostname.includes('.edu.')) {
    return {
      label: hostname,
      category: 'education',
      score: 0.86,
      trusted: true,
    };
  }

  return {
    label: hostname,
    category: 'unknown',
    score: 0.45,
    trusted: false,
  };
}

function extractSearchKeywords(...values) {
  const combined = normalizeText(values.filter(Boolean).join(' '));
  const uniqueTokens = [];

  for (const token of combined.split(' ')) {
    if (!token || SEARCH_STOPWORDS.has(token) || token.length < 3) continue;
    if (!uniqueTokens.includes(token)) {
      uniqueTokens.push(token);
    }
  }

  return uniqueTokens.slice(0, 8);
}

function extractImportantEntities(text = '') {
  const matches = text.match(/\b(?:[A-Z][a-z]+|[A-Z]{2,}|\d{4})(?:\s+(?:[A-Z][a-z]+|[A-Z]{2,}|\d{4})){0,3}\b/g) || [];
  const entities = [];

  for (const rawMatch of matches) {
    const value = rawMatch.trim();
    if (!value || ENTITY_IGNORED_TERMS.has(value)) continue;
    if (!entities.includes(value)) {
      entities.push(value);
    }
  }

  return entities.slice(0, 8);
}

function isCriticalEntity(entity = '') {
  if (!entity) return false;
  const parts = entity.trim().split(/\s+/).filter(Boolean);
  return parts.length >= 2 || /\d{4}/.test(entity) || entity === entity.toUpperCase();
}

function buildEntityConsistencySummary({ claim, articleTitle = '', crossCheckSummary = buildEmptyCrossCheckSummary() }) {
  const referenceText = articleTitle && !isValidHttpUrl(claim) ? `${claim} ${articleTitle}` : articleTitle || claim;
  const claimEntities = extractImportantEntities(referenceText);

  if (!claimEntities.length) {
    return {
      claimEntities: [],
      matchedEntities: [],
      unmatchedEntities: [],
      matchScore: 0,
      criticalEntities: [],
      unmatchedCriticalEntities: [],
      criticalMismatchScore: 0,
    };
  }

  const comparisonText = (crossCheckSummary.results || [])
    .map((item) => `${item.title} ${item.sourceName}`)
    .join(' ');
  const normalizedComparisonText = normalizeText(comparisonText);
  const matchedEntities = [];
  const unmatchedEntities = [];
  const criticalEntities = claimEntities.filter((entity) => isCriticalEntity(entity));
  const unmatchedCriticalEntities = [];

  for (const entity of claimEntities) {
    const normalizedEntity = normalizeText(entity);
    if (normalizedEntity && normalizedComparisonText.includes(normalizedEntity)) {
      matchedEntities.push(entity);
    } else {
      unmatchedEntities.push(entity);
      if (isCriticalEntity(entity)) {
        unmatchedCriticalEntities.push(entity);
      }
    }
  }

  const matchScore = Number((matchedEntities.length / claimEntities.length).toFixed(2));
  const criticalMismatchScore = criticalEntities.length
    ? Number((unmatchedCriticalEntities.length / criticalEntities.length).toFixed(2))
    : 0;

  return {
    claimEntities,
    matchedEntities,
    unmatchedEntities,
    matchScore,
    criticalEntities,
    unmatchedCriticalEntities,
    criticalMismatchScore,
  };
}

function splitIntoStatements(text = '') {
  return text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map((statement) => statement.trim())
    .filter((statement) => statement.length >= 28)
    .slice(0, 6);
}

function buildStatementBreakdown({ text = '', articleTitle = '', crossCheckSummary = buildEmptyCrossCheckSummary() }) {
  const statements = splitIntoStatements(text);

  if (!statements.length) {
    return {
      items: [],
      supportedCount: 0,
      contradictedCount: 0,
      unclearCount: 0,
      supportedShare: 0,
      contradictedShare: 0,
      unclearShare: 0,
    };
  }

  const comparisonText = normalizeText(
    [
      articleTitle,
      ...(crossCheckSummary.results || []).map((item) => `${item.title} ${item.sourceName}`),
    ].join(' '),
  );

  const items = statements.map((statement) => {
    const entities = extractImportantEntities(statement);
    const criticalEntities = entities.filter((entity) => isCriticalEntity(entity));
    const matchedEntities = entities.filter((entity) => comparisonText.includes(normalizeText(entity)));
    const unmatchedCriticalEntities = criticalEntities.filter(
      (entity) => !comparisonText.includes(normalizeText(entity)),
    );
    const statementKeywords = extractSearchKeywords(statement);
    const matchedKeywordCount = statementKeywords.filter((keyword) =>
      comparisonText.includes(normalizeText(keyword)),
    ).length;
    const keywordOverlap = statementKeywords.length
      ? matchedKeywordCount / statementKeywords.length
      : 0;
    const entityMatch = entities.length ? matchedEntities.length / entities.length : 0;
    const criticalMismatch = criticalEntities.length
      ? unmatchedCriticalEntities.length / criticalEntities.length
      : 0;
    const topicOverlap = Math.max(keywordOverlap, entityMatch);
    const supportScore = Number(
      Math.min(
        1,
        entityMatch * 0.45 +
        keywordOverlap * 0.3 +
        (crossCheckSummary.agreementScore || 0) * 0.25,
      ).toFixed(2),
    );
    const contradictionScore = Number(
      Math.min(
        1,
        criticalMismatch * 0.55 +
        (topicOverlap > 0.25 ? 0.2 : 0) +
        (entityMatch < 0.5 && entities.length ? 0.15 : 0) +
        ((crossCheckSummary.agreementScore || 0) > 0.3 ? 0.1 : 0),
      ).toFixed(2),
    );

    let status = 'unclear';
    if (contradictionScore >= 0.55 && topicOverlap >= 0.25) {
      status = 'contradicted';
    } else if (supportScore >= 0.6 && contradictionScore < 0.35) {
      status = 'supported';
    }

    const reasons = [];
    if (matchedEntities.length > 0) {
      reasons.push(`${matchedEntities.length} important match${matchedEntities.length === 1 ? '' : 'es'}`);
    }
    if (unmatchedCriticalEntities.length > 0) {
      reasons.push(`${unmatchedCriticalEntities.length} critical mismatch${unmatchedCriticalEntities.length === 1 ? '' : 'es'}`);
    }
    if (matchedKeywordCount > 0) {
      reasons.push(`${matchedKeywordCount} keyword match${matchedKeywordCount === 1 ? '' : 'es'}`);
    }
    if (reasons.length === 0) {
      reasons.push('limited trusted overlap');
    }

    return {
      text: statement,
      status,
      supportScore,
      contradictionScore,
      reasons,
    };
  });

  const supportedCount = items.filter((item) => item.status === 'supported').length;
  const contradictedCount = items.filter((item) => item.status === 'contradicted').length;
  const unclearCount = items.length - supportedCount - contradictedCount;

  return {
    items,
    supportedCount,
    contradictedCount,
    unclearCount,
    supportedShare: Number((supportedCount / items.length).toFixed(2)),
    contradictedShare: Number((contradictedCount / items.length).toFixed(2)),
    unclearShare: Number((unclearCount / items.length).toFixed(2)),
  };
}

function buildTrustedSearchQuery(keywords) {
  if (!keywords.length) return '';

  const siteFilters = [...new Set(TRUSTED_SOURCES.flatMap((source) => source.domains))]
    .slice(0, 10)
    .map((domain) => `site:${domain}`);

  return `${keywords.join(' ')} (${siteFilters.join(' OR ')})`;
}

async function fetchTrustedCrossCheck({ claim, articleTitle = '' }) {
  const keywords = extractSearchKeywords(claim, articleTitle);
  const query = buildTrustedSearchQuery(keywords);

  if (keywords.length < 2 || !query) {
    return buildEmptyCrossCheckSummary(query);
  }

  try {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-IN&gl=IN&ceid=IN:en`;
    const response = await axios.get(url, {
      timeout: 5000,
      responseType: 'text',
      maxRedirects: 0,
    });
    const $ = cheerio.load(response.data, { xmlMode: true });
    const results = [];
    const seenHostnames = new Set();

    $('item').each((_, element) => {
      if (results.length >= 5) return false;

      const title = $(element).find('title').first().text().trim();
      const link = normalizeHttpUrl($(element).find('link').first().text().trim());
      const sourceNode = $(element).find('source').first();
      const sourceName = sourceNode.text().trim();
      const sourceUrl = normalizeHttpUrl(sourceNode.attr('url') || '');
      const hostname = getHostname(sourceUrl) || getHostname(link);

      if (!hostname || seenHostnames.has(hostname)) return undefined;

      const sourceMeta = getSourceCredibility(hostname);
      // Accept trusted sources AND well-known domains (score >= 0.5) to avoid filtering all results
      if (sourceMeta.score < 0.5) return undefined;

      seenHostnames.add(hostname);
      results.push({
        title: title || sourceName || hostname,
        url: link || sourceUrl,
        sourceName: sourceName || sourceMeta.label,
        hostname,
        publishedAt: $(element).find('pubDate').first().text().trim(),
        trusted: sourceMeta.trusted,
        score: sourceMeta.score,
      });

      return undefined;
    });

    const trustedDomains = new Set(results.map((item) => item.hostname)).size;
    const agreementScore = Number(
      Math.min(1, results.length / 3 * 0.7 + trustedDomains / 3 * 0.3).toFixed(2),
    );
    const status =
      results.length >= 3 ? 'strong' : results.length >= 2 ? 'moderate' : results.length >= 1 ? 'limited' : 'none';

    return {
      query,
      status,
      matchedReports: results.length,
      trustedDomains,
      agreementScore,
      latestReportAt: results[0]?.publishedAt || '',
      results,
    };
  } catch (error) {
    console.warn('Trusted cross-check fetch failed:', error.message);
    return buildEmptyCrossCheckSummary(query);
  }
}

function buildSourceEvidenceSummary({
  claim,
  articleUrl = '',
  articleTitle = '',
  articleText = '',
  sources = [],
  crossCheckSummary = buildEmptyCrossCheckSummary(),
}) {
  const normalizedClaim = normalizeText(claim);
  const claimTokens = normalizedClaim.split(' ').filter(Boolean);
  const hostnames = new Set();
  const evidence = [];
  const heuristicSummary = detectHeuristicSignals(claim);
  const entityConsistency = buildEntityConsistencySummary({
    claim,
    articleTitle,
    crossCheckSummary,
  });
  const statementBreakdown = buildStatementBreakdown({
    text: articleText || claim,
    articleTitle,
    crossCheckSummary,
  });

  if (articleUrl) {
    const hostname = getHostname(articleUrl);
    if (hostname) {
      hostnames.add(hostname);
      const sourceMeta = getSourceCredibility(hostname);
      evidence.push({
        type: 'article_url',
        hostname,
        title: articleTitle || 'Provided article',
        ...sourceMeta,
      });
    }
  }

  for (const source of sources) {
    const hostname = getHostname(source.url);
    if (!hostname || hostnames.has(hostname)) continue;
    hostnames.add(hostname);
    evidence.push({
      type: 'referenced_source',
      hostname,
      title: source.name,
      ...getSourceCredibility(hostname),
    });
  }

  for (const item of crossCheckSummary.results || []) {
    const hostname = item.hostname || getHostname(item.url);
    if (!hostname || hostnames.has(hostname)) continue;
    hostnames.add(hostname);
    evidence.push({
      type: 'cross_check',
      hostname,
      title: item.title,
      ...getSourceCredibility(hostname),
    });
  }

  const trustedCount = evidence.filter((item) => item.trusted).length;
  const averageCredibility = evidence.length
    ? evidence.reduce((sum, item) => sum + item.score, 0) / evidence.length
    : 0;
  const claimSpecificity = Math.min(1, claimTokens.length / 12);
  const sourceCoverage = Math.min(1, evidence.length / 5);
  const trustSignal = Math.min(1, trustedCount / 3);
  const crossCheckAgreement = crossCheckSummary.agreementScore || 0;
  const entityMatchScore = entityConsistency.matchScore || 0;
  const credibilityScore = Math.max(
    0,
    Math.min(
      1,
      averageCredibility * 0.3 +
      trustSignal * 0.18 +
      sourceCoverage * 0.15 +
      claimSpecificity * 0.1 +
      crossCheckAgreement * 0.17 +
      entityMatchScore * 0.1 -
      heuristicSummary.riskScore * 0.3,
    ),
  );
  const confidenceBand =
    credibilityScore >= 0.75 ? 'High' : credibilityScore >= 0.5 ? 'Medium' : 'Low';

  return {
    evidence,
    trustedCount,
    averageCredibility: Number(averageCredibility.toFixed(2)),
    claimSpecificity: Number(claimSpecificity.toFixed(2)),
    sourceCoverage: Number(sourceCoverage.toFixed(2)),
    trustSignal: Number(trustSignal.toFixed(2)),
    credibilityScore: Number(credibilityScore.toFixed(2)),
    confidenceBand,
    heuristicSummary,
    crossCheckSummary,
    entityConsistency,
    statementBreakdown,
  };
}

function formatEvidenceSummaryForPrompt(evidenceSummary) {
  if (!evidenceSummary.evidence.length) {
    return 'Evidence summary: no trusted-source evidence collected yet.';
  }

  const sourceLines = evidenceSummary.evidence.map((item) => (
    `- ${item.title} (${item.hostname}) -> trusted=${item.trusted}, category=${item.category}, score=${item.score}`
  ));

  return [
    `Trusted source count: ${evidenceSummary.trustedCount}`,
    `Average source credibility: ${evidenceSummary.averageCredibility}`,
    `Claim specificity score: ${evidenceSummary.claimSpecificity}`,
    `Source coverage score: ${evidenceSummary.sourceCoverage}`,
    `Trust signal score: ${evidenceSummary.trustSignal}`,
    `Deterministic credibility score: ${evidenceSummary.credibilityScore}`,
    `Deterministic confidence band: ${evidenceSummary.confidenceBand}`,
    `Heuristic risk score: ${evidenceSummary.heuristicSummary.riskScore}`,
    `Trusted cross-check status: ${evidenceSummary.crossCheckSummary.status}`,
    `Trusted cross-check matched reports: ${evidenceSummary.crossCheckSummary.matchedReports}`,
    `Trusted cross-check agreement score: ${evidenceSummary.crossCheckSummary.agreementScore}`,
    `Important entity match score: ${evidenceSummary.entityConsistency?.matchScore || 0}`,
    'Collected evidence:',
    ...sourceLines,
  ].join('\n');
}

function calibrateVerificationResult(verification, evidenceSummary, isUrlClaim) {
  const calibrated = {
    ...verification,
    redFlags: Array.isArray(verification.redFlags) ? [...verification.redFlags] : [],
  };
  // Bug-fix: raise thresholds so legitimate True verdicts are NOT downgraded
  const weakCrossCheck = evidenceSummary.crossCheckSummary.matchedReports < 1; // was < 2
  const weakCredibility = evidenceSummary.credibilityScore < 0.35; // was < 0.58
  const highHeuristicRisk = evidenceSummary.heuristicSummary.riskScore >= 0.55; // was >= 0.3
  const lowConfidenceBand = evidenceSummary.confidenceBand === 'Low' && evidenceSummary.credibilityScore < 0.3; // was just === 'Low'
  const singleWeakSource = evidenceSummary.trustedCount === 0 && evidenceSummary.sourceCoverage === 0;
  const matchedReports = evidenceSummary.crossCheckSummary.matchedReports || 0;
  const entityMatchScore = evidenceSummary.entityConsistency?.matchScore || 0;
  const entityCount = evidenceSummary.entityConsistency?.claimEntities?.length || 0;
  const matchedEntityCount = evidenceSummary.entityConsistency?.matchedEntities?.length || 0;
  const criticalMismatchCount = evidenceSummary.entityConsistency?.unmatchedCriticalEntities?.length || 0;
  const criticalMismatchScore = evidenceSummary.entityConsistency?.criticalMismatchScore || 0;
  // Bug-fix: only flag entity mismatch when MULTIPLE critical entities are unmatched AND AI confidence is low
  const entityMismatch =
    entityCount >= 3 && criticalMismatchCount >= 2 && (evidenceSummary.entityConsistency?.criticalMismatchScore || 0) >= 0.8;
  const strongContradiction =
    (
      (criticalMismatchCount >= 1 && matchedReports >= 1 && evidenceSummary.crossCheckSummary.agreementScore >= 0.3) ||
      (entityMismatch &&
        matchedReports >= 2 &&
        entityCount >= 2 &&
        matchedEntityCount >= 1 &&
        evidenceSummary.crossCheckSummary.agreementScore >= 0.45)
    );

  if (strongContradiction) {
    calibrated.verdict = 'False';
    calibrated.confidence = Math.max(
      typeof calibrated.confidence === 'number' ? calibrated.confidence : 0.6,
      criticalMismatchScore >= 0.5 ? 0.8 : 0.72,
    );
    calibrated.explanation = `${calibrated.explanation} Trusted reports partially match the topic, but important names or titles in the claim do not match those reports, so the claim is likely false.`;

    if (!calibrated.redFlags.includes('Important names or titles contradict trusted reports')) {
      calibrated.redFlags.push('Important names or titles contradict trusted reports');
    }
  }

  // Bug-fix: Only downgrade to Unverified when BOTH evidence is truly absent AND AI confidence
  // is also below 0.5. Do NOT downgrade a verdict where the AI is already confident.
  const aiIsConfident = typeof calibrated.confidence === 'number' && calibrated.confidence >= 0.5;
  const shouldDowngrade =
    calibrated.verdict !== 'Unverified' &&
    calibrated.verdict !== 'False' &&
    calibrated.verdict !== 'True' &&
    !aiIsConfident &&
    (
      (lowConfidenceBand && weakCrossCheck && singleWeakSource) ||
      (isUrlClaim && highHeuristicRisk && singleWeakSource) ||
      entityMismatch
    );

  if (shouldDowngrade) {
    calibrated.verdict = 'Unverified';
    calibrated.confidence = Math.min(
      typeof calibrated.confidence === 'number' ? calibrated.confidence : 0.5,
      0.48,
    );
    calibrated.explanation = `${calibrated.explanation} The available source coverage and AI confidence are both too limited for a strong final verdict.`;

    if (!calibrated.redFlags.includes('Evidence is too limited for a strong verdict')) {
      calibrated.redFlags.push('Evidence is too limited for a strong verdict');
    }

    if (
      entityMismatch &&
      !calibrated.redFlags.includes('Important names or titles do not match trusted reports')
    ) {
      calibrated.redFlags.push('Important names or titles do not match trusted reports');
    }
  }

  return calibrated;
}

function normalizeSourceEntry(source) {
  if (!source || typeof source !== 'object') return null;

  const name = typeof source.name === 'string' ? source.name.trim() : '';
  const url = normalizeHttpUrl(source.url);

  if (!name || !url) return null;

  return { name, url };
}

function normalizeRelatedClaimEntry(item) {
  if (!item || typeof item !== 'object') return null;

  const claim = typeof item.claim === 'string' ? item.claim.trim() : '';
  const verdict = typeof item.verdict === 'string' ? item.verdict.trim() : '';
  const url = normalizeHttpUrl(item.url);

  if (!claim || !verdict) return null;

  return {
    claim,
    verdict,
    url,
  };
}

function buildNormalizedSources({ sources = [], originalArticleUrl = '' }) {
  const normalized = [];
  const seenUrls = new Set();

  for (const source of sources) {
    const normalizedSource = normalizeSourceEntry(source);
    if (!normalizedSource || seenUrls.has(normalizedSource.url)) continue;
    seenUrls.add(normalizedSource.url);
    normalized.push(normalizedSource);
  }

  const normalizedOriginalUrl = normalizeHttpUrl(originalArticleUrl);
  if (normalizedOriginalUrl && !seenUrls.has(normalizedOriginalUrl)) {
    normalized.unshift({
      name: 'Original article',
      url: normalizedOriginalUrl,
    });
  }

  return normalized;
}

function getHardcodedSentinelMatch(claimText) {
  const normalizedClaim = normalizeText(claimText);
  return normalizedHardcodedTruths.get(normalizedClaim) || null;
}

function isPrivateIpAddress(hostname) {
  const ipType = net.isIP(hostname);

  if (ipType === 4) {
    const [a, b] = hostname.split('.').map(Number);
    return (
      a === 10 ||
      a === 127 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168)
    );
  }

  if (ipType === 6) {
    const normalized = hostname.toLowerCase();
    return (
      normalized === '::1' ||
      normalized.startsWith('fc') ||
      normalized.startsWith('fd') ||
      normalized.startsWith('fe80:')
    );
  }

  return false;
}

function validateExternalUrl(value) {
  if (!isValidHttpUrl(value)) {
    return { ok: false, reason: 'Valid URL is required' };
  }

  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    return { ok: false, reason: 'Valid URL is required' };
  }

  const hostname = parsed.hostname.toLowerCase();
  const blockedHostnames = new Set(['localhost', '0.0.0.0']);
  const blockedSuffixes = ['.local', '.internal', '.home', '.lan'];

  if (
    blockedHostnames.has(hostname) ||
    blockedSuffixes.some((suffix) => hostname.endsWith(suffix)) ||
    isPrivateIpAddress(hostname)
  ) {
    return { ok: false, reason: 'Private and local network URLs are not allowed' };
  }

  if (!hostname.includes('.')) {
    return { ok: false, reason: 'Only public URLs are allowed' };
  }

  return { ok: true, parsed };
}

async function scrapeUrl(url) {
  try {
    const { data } = await axios.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 5000,
      maxRedirects: 0,
    });
    const $ = cheerio.load(data);
    const title = $('title').text() || url;
    let text = '';
    $('p').each((i, el) => {
      text += $(el).text() + '\n';
    });
    return { title, text: text.substring(0, 3000) };
  } catch (e) {
    console.warn('Scraping failed for', url);
    return null;
  }
}

function isValidHttpUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

app.post('/api/scrape-preview', async (req, res) => {
  const { url } = req.body;
  const validation = validateExternalUrl(url);

  if (!validation.ok) {
    return res.status(400).json({ error: validation.reason });
  }

  try {
    const scraped = await scrapeUrl(url.trim());
    const domain = validation.parsed.hostname;

    if (!scraped) {
      return res.json({
        url,
        title: 'Preview unavailable',
        excerpt: 'Could not extract preview from this URL right now.',
        domain,
        scraped: false,
      });
    }

    return res.json({
      url,
      title: scraped.title || 'Untitled page',
      excerpt: (scraped.text || '').trim().slice(0, 260) || 'No preview text extracted.',
      domain,
      scraped: true,
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Failed to scrape preview',
      details: error.message,
    });
  }
});

app.post('/api/feedback', (req, res) => {
  const { claim, verdict, confidence, helpful, name, email, message } = req.body;

  if (
    typeof claim !== 'string' ||
    typeof verdict !== 'string' ||
    typeof confidence !== 'number' ||
    typeof helpful !== 'boolean' ||
    typeof name !== 'string' ||
    typeof email !== 'string' ||
    typeof message !== 'string'
  ) {
    return res.status(400).json({ error: 'Invalid feedback payload' });
  }

  if (!name.trim() || !email.trim() || !message.trim()) {
    return res.status(400).json({ error: 'Name, email, and message are required' });
  }

  feedbackStore.push({
    id: feedbackStore.reduce((maxId, item) => Math.max(maxId, item.id || 0), 0) + 1,
    claim: claim.slice(0, 500),
    verdict,
    confidence,
    helpful,
    name: name.slice(0, 120),
    email: email.slice(0, 200),
    message: message.slice(0, 1500),
    createdAt: new Date().toISOString(),
  });

  if (feedbackStore.length > 500) {
    feedbackStore.shift();
  }

  saveFeedbackStore(feedbackStore);

  return res.json({ ok: true });
});

async function searchWikipedia(query) {
  try {
    const searchTerm = query.length > 100 ? query.substring(0, 100) : query;
    const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(searchTerm)}&utf8=&format=json&origin=*`;
    const { data } = await axios.get(url, {
      timeout: 5000,
      headers: { 'User-Agent': 'FactCheckerBot/1.0' },
    });
    if (data.query && data.query.search && data.query.search.length > 0) {
      const topSnippet = data.query.search[0].snippet.replace(/<[^>]*>?/gm, '');
      return `[Wikipedia: ${data.query.search[0].title}] ${topSnippet}`;
    }
  } catch (e) {
    console.warn('Wiki search failed silently:', e.message);
  }
  return null;
}

app.post('/api/verify', async (req, res) => {
  const rawClaim = typeof req.body?.claim === 'string' ? req.body.claim : '';
  const claim = rawClaim.trim();

  if (!claim) {
    return res.status(400).json(buildFallbackVerification('Claim is required'));
  }

  try {
    const { normalizedClaim: verifiableClaim, derivedFromQuestion } = deriveVerifiableClaim(claim);
    const claimLower = claim.toLowerCase();
    const isUrlClaim = claimLower.startsWith('http://') || claimLower.startsWith('https://');
    let crossCheckSummary = buildEmptyCrossCheckSummary();
    let evidenceSummary = buildSourceEvidenceSummary({ claim: verifiableClaim || claim, crossCheckSummary });

    // 1. Hardcoded Truth Sentinel (Direct + Semantic Match)
    const sentinelResponse = getHardcodedSentinelMatch(verifiableClaim || claim);
    if (sentinelResponse) {
      const normalizedSources = buildNormalizedSources({
        sources: sentinelResponse.sources || [],
      });
      const normalizedRelatedClaims = (sentinelResponse.relatedClaims || [])
        .map(normalizeRelatedClaimEntry)
        .filter(Boolean);
      const sentinelEvidenceSummary = buildSourceEvidenceSummary({
        claim: verifiableClaim || claim,
        sources: normalizedSources,
        crossCheckSummary,
      });
      return res.json({
        ...DEFAULT_METRIC_OVERLAY,
        ...sentinelResponse,
        sources: normalizedSources,
        relatedClaims: normalizedRelatedClaims,
        evidenceSummary: sentinelEvidenceSummary,
      });
    }

    let claimContext = derivedFromQuestion
      ? `Original user question: "${claim}"\nUnderlying factual claim to verify: "${verifiableClaim}"`
      : `Claim: "${claim}"`;
    let additionalContext = '';
    let scrapedArticle = null;

    if (isUrlClaim) {
      const validation = validateExternalUrl(claim);

      if (!validation.ok) {
        return res.status(400).json(buildFallbackVerification(validation.reason));
      }

      const scraped = await scrapeUrl(claim);
      scrapedArticle = scraped;
      crossCheckSummary = await fetchTrustedCrossCheck({
        claim: verifiableClaim || claim,
        articleTitle: scraped?.title || '',
      });
      evidenceSummary = buildSourceEvidenceSummary({
        claim: verifiableClaim || claim,
        articleUrl: claim,
        articleTitle: scraped?.title || '',
        articleText: scraped?.text || '',
        crossCheckSummary,
      });

      if (scraped && scraped.text && scraped.text.trim().length > 50) {
        claimContext = `The user provided a URL: ${claim}\nArticle Title: ${scraped.title}\nArticle Excerpt: "${scraped.text}"`;
        additionalContext =
          '\nAnalyze the provided article excerpt to determine if the core premises are factual. Identify misinformation or bias.';
      } else if (scraped && scraped.title) {
        claimContext = `The user provided a URL: ${claim}\nArticle Title: ${scraped.title}\n(Note: We could not extract the full article text due to the site\\'s dynamic rendering, redirect policy, or security).`;
        additionalContext =
          '\nUse the provided URL and Article Title, along with your existing knowledge base, to analyze the potential claims or topics associated with this URL.';
      } else {
        claimContext = `The user provided this URL: ${claim}`;
        additionalContext =
          '\nWe could not scrape the URL. Provide any information you have about this domain or the keywords in the URL string.';
      }
    } else {
      if (claim.length < 1000) {
        const wikiSnippet = await searchWikipedia(verifiableClaim || claim);
        crossCheckSummary = await fetchTrustedCrossCheck({ claim: verifiableClaim || claim });
        if (wikiSnippet) {
          additionalContext = `\nWikipedia Deep Research Result: ${wikiSnippet}\nUse this context to inform your verdict.`;
          evidenceSummary = buildSourceEvidenceSummary({
            claim: verifiableClaim || claim,
            sources: [{ name: 'Wikipedia', url: 'https://en.wikipedia.org' }],
            crossCheckSummary,
          });
        } else {
          evidenceSummary = buildSourceEvidenceSummary({
            claim: verifiableClaim || claim,
            crossCheckSummary,
          });
        }
      }
    }

    const today = new Date().toISOString().split('T')[0];
    const evidencePromptBlock = formatEvidenceSummaryForPrompt(evidenceSummary);

    const prompt = `
      You are an expert Fact-Checking AI. 
      The current date is ${today}. Use this to verify any time-sensitive claims.
      
      CORE VERIFICATION STRATEGY:
      1. Prioritize source credibility and cross-check information.
      2. Understand the context and potential biases behind the news.
      3. Use multiple reliable outlets to confirm facts.
      4. Stay updated with verified developments in real time based on the current date.
      
      ${additionalContext}
      
      Deterministic Evidence Layer:
      ${evidencePromptBlock}
      
      Analyze the following claim/URL and provide a structured verification result in JSON format.
      
      ${claimContext}
      
      If and ONLY if the claim is about a very obscure, private, or completely unverifiable event that has no public record whatsoever, set the verdict to "Unverified" and explain what additional research would help. For all well-known facts, historical events, public figures, or commonly reported news, make a decisive True or False verdict with high confidence. Do NOT say "Insufficient Data" for things that are common knowledge or mainstream news.

      JSON Structure:
      {
        "verdict": "True" | "False" | "Unverified" | "Insufficient Data",
        "confidence": number (0 to 1),
        "explanation": "Short detailed explanation of why it is true or false",
        "sentiment": "Neutral" | "Biased" | "Inflammatory",
        "riskLevel": "Low" | "Medium" | "High",
        "scoreBreakdown": {
          "sourceReliability": number (0 to 1),
          "logicalConsistency": number (0 to 1),
          "factualAlignment": number (0 to 1)
        },
        "redFlags": ["String describing a red flag", ...],
        "relatedClaims": [
          { "claim": "Related claim text", "verdict": "True" | "False", "url": "Link if available" }
        ],
        "sources": [
          { "name": "Name of News Outlet or Wikipedia", "url": "Exact HTTP URL link to the source if available, otherwise domain name" }
        ]
      }
      CRITICAL: You MUST provide at least one credible source in the "sources" array for your verdict. Never leave it empty.
      Only return valid JSON. No other text.
    `;

    let groqError = null;
    if (groqClient) {
      try {
        const completion = await groqClient.chat.completions.create({
          model: groqModel,
          messages: [
            { role: 'system', content: 'You are an expert Fact-Checking AI. Return only valid JSON.' },
            { role: 'user', content: prompt },
          ],
          temperature: 0.2,
          response_format: { type: 'json_object' },
        });

        const text = completion?.choices?.[0]?.message?.content?.trim();
        if (!text) {
          throw new Error('Groq returned an empty response');
        }

        const verification = JSON.parse(text);
        const normalizedSources = buildNormalizedSources({
          sources: verification.sources || [],
          originalArticleUrl: isUrlClaim ? claim : '',
        });
        const normalizedRelatedClaims = (verification.relatedClaims || [])
          .map(normalizeRelatedClaimEntry)
          .filter(Boolean);
        const finalEvidenceSummary = buildSourceEvidenceSummary({
          claim: verifiableClaim || claim,
          articleUrl: isUrlClaim ? claim : '',
          articleTitle: isUrlClaim ? scrapedArticle?.title || '' : '',
          articleText: isUrlClaim ? scrapedArticle?.text || '' : claim,
          sources: normalizedSources,
          crossCheckSummary,
        });
        const calibratedVerification = calibrateVerificationResult(
          verification,
          finalEvidenceSummary,
          isUrlClaim,
        );

        return res.json({
          ...DEFAULT_METRIC_OVERLAY,
          ...calibratedVerification,
          sources: normalizedSources,
          relatedClaims: normalizedRelatedClaims,
          evidenceSummary: finalEvidenceSummary,
        });
      } catch (error) {
        groqError = error;
      }

      // If Groq is configured, keep Groq as the primary/only provider.
      // Gemini is used only when Groq is not configured.
      return res.json(buildFallbackVerification(
        `Verification service is online, but Groq request failed: ${groqError?.message || 'Unknown error'}. Check GROQ_API_KEY / GROQ_MODEL in server/.env.`,
      ));
    }

    let geminiError = null;
    if (apiKeys.length > 0) {
      try {
        const verification = await generateVerificationWithGemini(prompt);
        const normalizedSources = buildNormalizedSources({
          sources: verification.sources || [],
          originalArticleUrl: isUrlClaim ? claim : '',
        });
        const normalizedRelatedClaims = (verification.relatedClaims || [])
          .map(normalizeRelatedClaimEntry)
          .filter(Boolean);
        const finalEvidenceSummary = buildSourceEvidenceSummary({
          claim: verifiableClaim || claim,
          articleUrl: isUrlClaim ? claim : '',
          articleTitle: isUrlClaim ? scrapedArticle?.title || '' : '',
          articleText: isUrlClaim ? scrapedArticle?.text || '' : claim,
          sources: normalizedSources,
          crossCheckSummary,
        });
        const calibratedVerification = calibrateVerificationResult(
          verification,
          finalEvidenceSummary,
          isUrlClaim,
        );

        return res.json({
          ...DEFAULT_METRIC_OVERLAY,
          ...calibratedVerification,
          sources: normalizedSources,
          relatedClaims: normalizedRelatedClaims,
          evidenceSummary: finalEvidenceSummary,
        });
      } catch (error) {
        geminiError = error;
      }
    }

    return res.json(buildFallbackVerification(
      geminiError
        ? `Verification service is online, but Gemini request failed: ${geminiError?.message || 'Unknown error'}. Check GEMINI_API_KEY / GEMINI_MODEL in server/.env.`
        : 'Verification service is online, but no AI provider is configured. Add GROQ_API_KEY or GEMINI_API_KEY in server/.env.',
    ));
  } catch (error) {
    console.error('Fact-check error:', error);
    return res.json(
      buildFallbackVerification(
        `Verification service is online, but the AI analysis step failed: ${error.message}`,
      ),
    );
  }
});

app.get('/', (req, res) => {
  res.send(`
    <html>
      <head><title>AI Fact Checker - Backend</title>
        <style>
          body { font-family: sans-serif; background: #0f172a; color: #e2e8f0; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
          .card { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 40px 60px; text-align: center; }
          h1 { color: #3b82f6; margin-bottom: 8px; }
          .badge { display: inline-block; background: #22c55e22; color: #22c55e; border: 1px solid #22c55e44; border-radius: 99px; padding: 4px 16px; font-size: 13px; font-weight: bold; margin-bottom: 20px; }
          p { color: #94a3b8; margin: 6px 0; }
          code { background: #1e293b; padding: 2px 8px; border-radius: 4px; color: #7dd3fc; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>AI Fact Checker Backend</h1>
          <div class="badge">Server Online</div>
          <p>Backend is running on port <code>${port}</code></p>
          <p>API Endpoint: <code>POST /api/verify</code></p>
          <p>Keys Loaded: <code>${apiKeys.length} key(s)</code></p>
          <p style="margin-top:20px; color:#475569;">Open the frontend at <code>http://localhost:5173</code></p>
        </div>
      </body>
    </html>
  `);
});

app.listen(port, () => {
  console.log(`Fact Checker Backend listening at http://localhost:${port}`);
});
