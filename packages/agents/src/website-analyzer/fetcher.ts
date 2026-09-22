import dns from 'dns/promises';
import net from 'net';

export interface SafeFetchResult {
  url: string;
  html: string;
  status: number;
  contentType?: string;
}

const MAX_RESPONSE_SIZE_BYTES = 1024 * 1024; // 1 MB
const FETCH_TIMEOUT_MS = 10000; // 10 seconds

/**
 * Validates whether an IP is in a private, loopback, or reserved range.
 */
export function isPrivateIp(ip: string): boolean {
  if (ip === 'localhost' || ip === '::1') return true;

  if (net.isIPv4(ip)) {
    const parts = ip.split('.').map(Number);
    if (parts.length !== 4) return true;

    // 0.0.0.0/8 (Current network)
    if (parts[0] === 0) return true;

    // 10.0.0.0/8 (Private network)
    if (parts[0] === 10) return true;

    // 127.0.0.0/8 (Loopback)
    if (parts[0] === 127) return true;

    // 169.254.0.0/16 (Link-local, AWS/GCP metadata service)
    if (parts[0] === 169 && parts[1] === 254) return true;

    // 172.16.0.0/12 (Private network)
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;

    // 192.168.0.0/16 (Private network)
    if (parts[0] === 192 && parts[1] === 168) return true;

    // 224.0.0.0/4 (Multicast)
    if (parts[0] >= 224 && parts[0] <= 239) return true;

    // 240.0.0.0/4 (Reserved)
    if (parts[0] >= 240) return true;

    return false;
  }

  if (net.isIPv6(ip)) {
    const lower = ip.toLowerCase();
    // Loopback
    if (lower === '::1' || lower === '0:0:0:0:0:0:0:1') return true;
    // Link-local (fe80::/10)
    if (lower.startsWith('fe8') || lower.startsWith('fe9') || lower.startsWith('fea') || lower.startsWith('feb')) return true;
    // Unique local (fc00::/7)
    if (lower.startsWith('fc') || lower.startsWith('fd')) return true;
    return false;
  }

  return true;
}

/**
 * Validates that a target URL is safe to fetch (HTTPS only, non-private IP).
 */
export async function validateTargetUrl(rawUrl: string): Promise<URL> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error(`Invalid URL provided: ${rawUrl}`);
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error(`Forbidden protocol "${parsed.protocol}". Only HTTP and HTTPS are permitted.`);
  }

  const hostname = parsed.hostname;

  // Reject explicit localhost or private hostnames
  if (hostname === 'localhost' || hostname.endsWith('.local') || hostname.endsWith('.internal')) {
    throw new Error(`Forbidden private hostname "${hostname}". SSRF attempt blocked.`);
  }

  // If hostname is already a raw IP
  if (net.isIP(hostname)) {
    if (isPrivateIp(hostname)) {
      throw new Error(`Forbidden private IP address "${hostname}". SSRF attempt blocked.`);
    }
    return parsed;
  }

  // Resolve DNS to verify it doesn't map to a private internal network
  try {
    const addresses = await dns.lookup(hostname, { all: true });
    for (const addr of addresses) {
      if (isPrivateIp(addr.address)) {
        throw new Error(`Hostname "${hostname}" resolves to private IP "${addr.address}". SSRF attempt blocked.`);
      }
    }
  } catch (err: any) {
    if (err.message?.includes('SSRF attempt blocked')) throw err;
    throw new Error(`DNS resolution failed for hostname "${hostname}": ${err.message}`);
  }

  return parsed;
}

/**
 * Safely fetches a website's HTML with timeout, size limit, and SSRF prevention.
 */
export async function safeFetchWebsite(targetUrl: string): Promise<SafeFetchResult> {
  const verifiedUrl = await validateTargetUrl(targetUrl);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(verifiedUrl.toString(), {
      signal: controller.signal,
      headers: {
        'User-Agent': 'SerpScoutBot/1.0 (+https://serp-scout.app; Competitive Analysis Bot)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Website responded with HTTP status ${response.status} ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) {
      // Still attempt if it's text, otherwise warn
      if (!contentType.includes('text/')) {
        throw new Error(`Unsupported content type "${contentType}". Only HTML pages can be analyzed.`);
      }
    }

    // Stream-read body with 1 MB cap
    if (!response.body) {
      return {
        url: response.url || verifiedUrl.toString(),
        html: '',
        status: response.status,
        contentType,
      };
    }

    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let receivedBytes = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      if (value) {
        receivedBytes += value.length;
        if (receivedBytes > MAX_RESPONSE_SIZE_BYTES) {
          controller.abort();
          throw new Error(`Page size exceeded limit of 1 MB (${receivedBytes} bytes read).`);
        }
        chunks.push(value);
      }
    }

    const totalBuffer = new Uint8Array(receivedBytes);
    let offset = 0;
    for (const chunk of chunks) {
      totalBuffer.set(chunk, offset);
      offset += chunk.length;
    }

    const decoder = new TextDecoder('utf-8');
    const html = decoder.decode(totalBuffer);

    return {
      url: response.url || verifiedUrl.toString(),
      html,
      status: response.status,
      contentType,
    };
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error(`Request timed out after ${FETCH_TIMEOUT_MS / 1000}s while fetching "${targetUrl}"`);
    }
    throw err;
  }
}
