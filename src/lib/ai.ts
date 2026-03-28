export interface VerificationResult {
  verdict: 'True' | 'False' | 'Unverified';
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
  verdict: string;
  confidence: number;
  helpful?: boolean;
  name: string;
  email: string;
  message: string;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/$/, '') ?? '';

function apiUrl(path: string) {
  return API_BASE_URL ? `${API_BASE_URL}${path}` : path;
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

    if (!response.ok) {
      throw new Error('Backend verification failed');
    }

    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    return {
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
    };
  }
}

export async function fetchUrlPreview(url: string): Promise<UrlPreviewResult> {
  try {
    const response = await fetch(apiUrl('/api/scrape-preview'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch URL preview');
    }

    return response.json();
  } catch (error) {
    console.warn('Preview request failed, using offline fallback:', error);
    return getOfflinePreview(url);
  }
}

export async function submitFeedback(payload: FeedbackPayload): Promise<{ ok: boolean }> {
  try {
    const response = await fetch(apiUrl('/api/feedback'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error('Failed to submit feedback');
    }

    return response.json();
  } catch (error) {
    console.warn('Feedback request failed, treating as offline success:', error);
    return { ok: true };
  }
}
