import * as cheerio from 'cheerio';

export interface ExtractedPageElements {
  title?: string;
  metaDescription?: string;
  h1: string[];
  h2: string[];
  h3: string[];
  internalLinks: string[];
  externalLinks: string[];
  callsToAction: string[];
  phones: string[];
  emails: string[];
  bookingUrls: string[];
  mainTextSnippet: string;
}

const CTA_KEYWORDS = [
  'book',
  'schedule',
  'call',
  'contact',
  'appointment',
  'quote',
  'consultation',
  'get started',
  'request',
  'inquire',
  'order',
];

export function parseWebsiteHtml(html: string, baseUrl: string): ExtractedPageElements {
  const $ = cheerio.load(html);

  // 1. Meta & Title
  const title = $('title').first().text().trim() || $('meta[property="og:title"]').attr('content')?.trim();
  const metaDescription =
    $('meta[name="description"]').attr('content')?.trim() ||
    $('meta[property="og:description"]').attr('content')?.trim();

  // 2. Headings
  const h1: string[] = [];
  $('h1').each((_, el) => {
    const text = $(el).text().replace(/\s+/g, ' ').trim();
    if (text && !h1.includes(text)) h1.push(text);
  });

  const h2: string[] = [];
  $('h2').each((_, el) => {
    const text = $(el).text().replace(/\s+/g, ' ').trim();
    if (text && !h2.includes(text)) h2.push(text);
  });

  const h3: string[] = [];
  $('h3').each((_, el) => {
    const text = $(el).text().replace(/\s+/g, ' ').trim();
    if (text && !h3.includes(text)) h3.push(text);
  });

  // 3. Links & CTAs
  const internalLinks: string[] = [];
  const externalLinks: string[] = [];
  const callsToAction: string[] = [];
  const phones: string[] = [];
  const emails: string[] = [];
  const bookingUrls: string[] = [];

  let baseHost = '';
  try {
    baseHost = new URL(baseUrl).hostname.replace(/^www\./, '');
  } catch {
    // fallback
  }

  $('a').each((_, el) => {
    const href = $(el).attr('href')?.trim();
    const text = $(el).text().replace(/\s+/g, ' ').trim();

    if (!href) return;

    // Telephone links
    if (href.startsWith('tel:')) {
      const phone = href.replace(/^tel:/, '').trim();
      if (phone && !phones.includes(phone)) phones.push(phone);
      return;
    }

    // Email links
    if (href.startsWith('mailto:')) {
      const email = href.replace(/^mailto:/, '').split('?')[0].trim();
      if (email && !emails.includes(email)) emails.push(email);
      return;
    }

    // Call to action detection
    const lowerText = text.toLowerCase();
    const isCta = CTA_KEYWORDS.some((kw) => lowerText.includes(kw));
    if (isCta && text.length > 2 && text.length < 50 && !callsToAction.includes(text)) {
      callsToAction.push(text);
    }

    // Booking URLs
    if (
      lowerText.includes('book') ||
      href.includes('calendly') ||
      href.includes('schedule') ||
      href.includes('booking')
    ) {
      if (!bookingUrls.includes(href)) bookingUrls.push(href);
    }

    // URL resolution
    try {
      const resolved = new URL(href, baseUrl);
      const linkHost = resolved.hostname.replace(/^www\./, '');
      if (linkHost === baseHost || linkHost.endsWith(`.${baseHost}`)) {
        if (!internalLinks.includes(resolved.pathname)) internalLinks.push(resolved.pathname);
      } else if (resolved.protocol.startsWith('http')) {
        if (!externalLinks.includes(resolved.href)) externalLinks.push(resolved.href);
      }
    } catch {
      // ignore invalid relative urls
    }
  });

  // Also check buttons for CTAs
  $('button, input[type="submit"], input[type="button"]').each((_, el) => {
    const text = ($(el).text() || $(el).attr('value') || '').replace(/\s+/g, ' ').trim();
    const lowerText = text.toLowerCase();
    const isCta = CTA_KEYWORDS.some((kw) => lowerText.includes(kw));
    if (isCta && text.length > 2 && text.length < 50 && !callsToAction.includes(text)) {
      callsToAction.push(text);
    }
  });

  // 4. Extract clean body text for AI context (strip scripts, styles, nav)
  $('script, style, noscript, svg, iframe').remove();
  const rawBodyText = $('body').text().replace(/\s+/g, ' ').trim();
  // Take first 5,000 characters to keep LLM context clean and efficient
  const mainTextSnippet = rawBodyText.substring(0, 5000);

  return {
    title,
    metaDescription,
    h1,
    h2,
    h3,
    internalLinks: internalLinks.slice(0, 50),
    externalLinks: externalLinks.slice(0, 20),
    callsToAction,
    phones,
    emails,
    bookingUrls,
    mainTextSnippet,
  };
}
