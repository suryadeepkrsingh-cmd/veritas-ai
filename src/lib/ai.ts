export interface VerificationResult {
  verdict: 'True' | 'False' | 'Unverified' | 'Insufficient Data';
  confidence: number;
  explanation: string;
  backendOffline?: boolean;
  sentiment: 'Neutral' | 'Biased' | 'Inflammatory';
  riskLevel: 'Low' | 'Medium' | 'High';
  scoreBreakdown: {
    sourceReliability: number;
    logicalConsistency: number;
    factualAlignment: number;
  };
  redFlags: string[];
  relatedClaims: { claim: string; verdict: string; url: string }[];
  sources: { name: string; url: string }[];
  evidenceSummary: {
    evidence: {
      type: string;
      hostname: string;
      title: string;
      label: string;
      category: string;
      score: number;
      trusted: boolean;
    }[];
    trustedCount: number;
    averageCredibility: number;
    claimSpecificity: number;
    sourceCoverage: number;
    trustSignal: number;
    credibilityScore: number;
    confidenceBand: 'High' | 'Medium' | 'Low';
    heuristicSummary: {
      signals: {
        key: string;
        label: string;
        weight: number;
        details: string[];
      }[];
      riskScore: number;
      uppercaseRatio: number;
      exclamationCount: number;
      questionCount: number;
    };
    crossCheckSummary: {
      query: string;
      status: 'strong' | 'moderate' | 'limited' | 'none';
      matchedReports: number;
      trustedDomains: number;
      agreementScore: number;
      latestReportAt: string;
      results: {
        title: string;
        url: string;
        sourceName: string;
        hostname: string;
        publishedAt: string;
        trusted: boolean;
        score: number;
      }[];
    };
    entityConsistency: {
      claimEntities: string[];
      matchedEntities: string[];
      unmatchedEntities: string[];
      matchScore: number;
    };
    statementBreakdown: {
      items: {
        text: string;
        status: 'supported' | 'contradicted' | 'unclear';
        supportScore: number;
        contradictionScore: number;
        reasons: string[];
      }[];
      supportedCount: number;
      contradictedCount: number;
      unclearCount: number;
      supportedShare: number;
      contradictedShare: number;
      unclearShare: number;
    };
  };
}

export interface UrlPreviewResult {
  url: string;
  title: string;
  excerpt: string;
  domain: string;
  scraped: boolean;
}

export interface FeedbackPayload {
  claim: string;
  verdict: VerificationResult['verdict'];
  confidence: number;
  helpful?: boolean;
  name: string;
  email: string;
  message: string;
}

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/$/, '') || 
  (import.meta.env.PROD ? 'https://veritas-ai-server.onrender.com' : 'http://127.0.0.1:3001');
const DEFAULT_EVIDENCE_SUMMARY: VerificationResult['evidenceSummary'] = {
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
  crossCheckSummary: {
    query: '',
    status: 'none',
    matchedReports: 0,
    trustedDomains: 0,
    agreementScore: 0,
    latestReportAt: '',
    results: [],
  },
  entityConsistency: {
    claimEntities: [],
    matchedEntities: [],
    unmatchedEntities: [],
    matchScore: 0,
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
};

function apiUrl(path: string) {
  return API_BASE_URL ? `${API_BASE_URL}${path}` : path;
}

function normalizeVerificationResult(payload: Partial<VerificationResult>): VerificationResult {
  return {
    verdict: (payload.verdict as VerificationResult['verdict']) || 'Unverified',
    confidence: typeof payload.confidence === 'number' ? payload.confidence : 0,
    explanation: payload.explanation || 'No explanation returned.',
    backendOffline: payload.backendOffline,
    sentiment: payload.sentiment || 'Neutral',
    riskLevel: payload.riskLevel || 'Low',
    scoreBreakdown: {
      sourceReliability: payload.scoreBreakdown?.sourceReliability ?? 0,
      logicalConsistency: payload.scoreBreakdown?.logicalConsistency ?? 0,
      factualAlignment: payload.scoreBreakdown?.factualAlignment ?? 0,
    },
    redFlags: Array.isArray(payload.redFlags) ? payload.redFlags : [],
    relatedClaims: Array.isArray(payload.relatedClaims) ? payload.relatedClaims : [],
    sources: Array.isArray(payload.sources) ? payload.sources : [],
    evidenceSummary: {
      ...DEFAULT_EVIDENCE_SUMMARY,
      ...payload.evidenceSummary,
      heuristicSummary: {
        ...DEFAULT_EVIDENCE_SUMMARY.heuristicSummary,
        ...payload.evidenceSummary?.heuristicSummary,
        signals: Array.isArray(payload.evidenceSummary?.heuristicSummary?.signals)
          ? payload.evidenceSummary.heuristicSummary.signals
          : [],
      },
      crossCheckSummary: {
        ...DEFAULT_EVIDENCE_SUMMARY.crossCheckSummary,
        ...payload.evidenceSummary?.crossCheckSummary,
        results: Array.isArray(payload.evidenceSummary?.crossCheckSummary?.results)
          ? payload.evidenceSummary.crossCheckSummary.results
          : [],
      },
      entityConsistency: {
        ...DEFAULT_EVIDENCE_SUMMARY.entityConsistency,
        ...payload.evidenceSummary?.entityConsistency,
        claimEntities: Array.isArray(payload.evidenceSummary?.entityConsistency?.claimEntities)
          ? payload.evidenceSummary.entityConsistency.claimEntities
          : [],
        matchedEntities: Array.isArray(payload.evidenceSummary?.entityConsistency?.matchedEntities)
          ? payload.evidenceSummary.entityConsistency.matchedEntities
          : [],
        unmatchedEntities: Array.isArray(payload.evidenceSummary?.entityConsistency?.unmatchedEntities)
          ? payload.evidenceSummary.entityConsistency.unmatchedEntities
          : [],
      },
      statementBreakdown: {
        ...DEFAULT_EVIDENCE_SUMMARY.statementBreakdown,
        ...payload.evidenceSummary?.statementBreakdown,
        items: Array.isArray(payload.evidenceSummary?.statementBreakdown?.items)
          ? payload.evidenceSummary.statementBreakdown.items
          : [],
      },
      evidence: Array.isArray(payload.evidenceSummary?.evidence)
        ? payload.evidenceSummary.evidence
        : [],
    },
  };
}

function getOfflinePreview(url: string): UrlPreviewResult {
  let domain = 'local preview';

  try {
    domain = new URL(url).hostname;
  } catch {
    // Keep the fallback readable even if the input is only partially formed.
  }

  return {
    url,
    title: 'Preview unavailable offline',
    excerpt: 'Open the backend server to fetch a live article preview.',
    domain,
    scraped: false,
  };
}

export async function verifyClaim(input: string): Promise<VerificationResult> {
  try {
    const response = await fetch(apiUrl('/api/verify'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ claim: input }),
    });
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      if (payload && typeof payload === 'object') {
        return normalizeVerificationResult(payload as Partial<VerificationResult>);
      }

      throw new Error('Backend verification failed');
    }

    const result = normalizeVerificationResult(payload ?? {});
    if (result.verdict === 'Unverified' && result.explanation.toLowerCase().includes('need more evidence')) {
      result.verdict = 'Insufficient Data';
      result.explanation = result.explanation.replace(/need more evidence/gi, 'insufficient data available for verification');
    }
    return result;
  } catch (error) {
    console.error('API Error:', error);
    return normalizeVerificationResult({
      verdict: 'Unverified',
      confidence: 0,
      explanation: 'Backend offline. This shareable build still opens, but live verification needs the server running.',
      backendOffline: true,
      sentiment: 'Neutral',
      riskLevel: 'Low',
      scoreBreakdown: {
        sourceReliability: 0,
        logicalConsistency: 0,
        factualAlignment: 0,
      },
      redFlags: [],
      relatedClaims: [],
      sources: [],
    });
  }
}

export async function fetchUrlPreview(url: string): Promise<UrlPreviewResult> {
  try {
    const response = await fetch(apiUrl('/api/scrape-preview'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      const message =
        payload && typeof payload === 'object' && 'reason' in payload && typeof payload.reason === 'string'
          ? payload.reason
          : 'Failed to fetch URL preview';
      throw new Error(message);
    }

    return payload as UrlPreviewResult;
  } catch (error) {
    console.warn('Preview request failed, using offline fallback:', error);
    return getOfflinePreview(url);
  }
}

export async function submitFeedback(payload: FeedbackPayload): Promise<{ ok: boolean }> {
  const response = await fetch(apiUrl('/api/feedback'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error('Failed to submit feedback');
  }

  return response.json();
}
