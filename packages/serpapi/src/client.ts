export interface SerpApiRequestOptions {
  engine: string;
  params: Record<string, string | number | undefined>;
  apiKey: string;
  maxRetries?: number;
}

/**
 * Executes a SerpApi search request with automatic exponential backoff retries on transient errors.
 */
export async function executeSerpApiRequest<T = any>(
  options: SerpApiRequestOptions
): Promise<T> {
  const { engine, params, apiKey, maxRetries = 3 } = options;

  const url = new URL('https://serpapi.com/search.json');
  url.searchParams.set('engine', engine);
  url.searchParams.set('api_key', apiKey);

  for (const [key, val] of Object.entries(params)) {
    if (val !== undefined && val !== null && val !== '') {
      url.searchParams.set(key, String(val));
    }
  }

  let attempt = 0;
  let lastError: Error | null = null;

  while (attempt < maxRetries) {
    attempt++;
    try {
      const response = await fetch(url.toString(), {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'SerpScout/1.0',
        },
      });

      if (response.ok) {
        return (await response.json()) as T;
      }

      const status = response.status;
      const errorBody = await response.text();

      // Non-retryable client errors (e.g. 401 invalid API key, 400 bad query)
      if (status === 400 || status === 401 || status === 403) {
        throw new Error(`SerpApi client error (${status}): ${errorBody}`);
      }

      // Retryable errors: 429 (rate limit) or 5xx (server errors)
      const isRetryable = status === 429 || (status >= 500 && status <= 599);
      if (!isRetryable || attempt >= maxRetries) {
        throw new Error(`SerpApi failed with status ${status}: ${errorBody}`);
      }

      // Check Retry-After header
      const retryAfterHeader = response.headers.get('retry-after');
      let delayMs = Math.pow(2, attempt) * 1000;
      if (retryAfterHeader) {
        const parsedSeconds = parseInt(retryAfterHeader, 10);
        if (!isNaN(parsedSeconds)) {
          delayMs = parsedSeconds * 1000;
        }
      }

      console.warn(`[SerpApi] Transient error (${status}). Retrying in ${delayMs}ms (attempt ${attempt}/${maxRetries})...`);
      await new Promise((r) => setTimeout(r, delayMs));
    } catch (err: any) {
      lastError = err;
      if (attempt >= maxRetries || err.message?.includes('client error')) {
        throw err;
      }
      const delayMs = Math.pow(2, attempt) * 1000;
      console.warn(`[SerpApi] Network failure: ${err.message}. Retrying in ${delayMs}ms (attempt ${attempt}/${maxRetries})...`);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }

  throw lastError || new Error(`SerpApi request failed after ${maxRetries} attempts`);
}
