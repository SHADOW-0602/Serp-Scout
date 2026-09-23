import * as cheerio from 'cheerio';
import { CompetitorExtractedProfile } from '@serp-scout/types';
import { safeFetchWebsite } from '../website-analyzer/fetcher.js';

const KNOWN_BOOKING_TECH: Array<{ name: string; pattern: RegExp }> = [
  { name: 'Practo', pattern: /practo\.com/i },
  { name: 'Calendly', pattern: /calendly\.com/i },
  { name: 'Acuity Scheduling', pattern: /acuityscheduling\.com/i },
  { name: 'Zocdoc', pattern: /zocdoc\.com/i },
  { name: 'Doctolib', pattern: /doctolib\./i },
  { name: 'NexHealth', pattern: /nexhealth\.com/i },
  { name: 'Jane App', pattern: /jane\.app/i },
  { name: 'Mindbody', pattern: /mindbodyonline\.com/i },
  { name: 'Booksy', pattern: /booksy\.com/i },
  { name: 'Square Appointments', pattern: /squareup\.com\/appointments/i },
  { name: 'Phorest', pattern: /phorest\.com/i },
  { name: 'Fresha', pattern: /fresha\.com/i },
  { name: 'LocalMed', pattern: /localmed\.com/i },
  { name: 'HubSpot Meetings', pattern: /meetings\.hubspot\.com/i },
  { name: 'OnceHub', pattern: /oncehub\.com|scheduleonce\.com/i },
];

const OFFER_PATTERNS = [
  /\b(?:free\s+(?:consultation|exam|checkup|quote|estimate|trial|screening|first\s+visit))\b/i,
  /\b(?:\$|₹|£|€)\s*\d+(?:\s*(?:exam|clean(?:ing)?|consultation|special|starting))\b/i,
  /\b\d{1,2}%\s*(?:off|discount)\b/i,
  /\b(?:emi\s+options?|no[\s-]cost\s+emi|0%\s+financing|flexible\s+payment\s+plans?)\b/i,
  /\b(?:same[\s-]day\s+(?:appointments?|emergency|treatment|service))\b/i,
  /\b(?:100%\s+satisfaction\s+guarantee|warranty|guaranteed)\b/i,
];

const PRIMARY_CTA_KEYWORDS = [
  'book online',
  'book appointment',
  'schedule online',
  'schedule appointment',
  'request appointment',
  'book now',
  'schedule a visit',
  'get a quote',
  'free consultation',
  'call now',
  'emergency care',
];

/**
 * Scrapes and profiles a competitor's homepage to extract booking capabilities,
 * promotional offers, CTAs, and contact signals.
 * Fails safely without throwing.
 */
export async function profileCompetitorWebsite(
  websiteUrl: string
): Promise<CompetitorExtractedProfile> {
  const result: CompetitorExtractedProfile = {
    bookingTech: [],
    offers: [],
    callsToAction: [],
    hasOnlineBooking: false,
  };

  try {
    const fetched = await safeFetchWebsite(websiteUrl);
    if (!fetched.html) return result;

    const $ = cheerio.load(fetched.html);

    // 1. Detect Booking Tech (scripts, links, iframes)
    const pageHtml = fetched.html;
    for (const tech of KNOWN_BOOKING_TECH) {
      if (tech.pattern.test(pageHtml)) {
        result.bookingTech!.push(tech.name);
      }
    }

    // Check for inline booking form or widgets
    const hasFormWithBooking = $('form').filter((_, form) => {
      const text = $(form).text().toLowerCase();
      return (
        text.includes('appointment') ||
        text.includes('book') ||
        text.includes('schedule') ||
        text.includes('preferred date')
      );
    }).length > 0;

    if (hasFormWithBooking && !result.bookingTech!.includes('Custom Booking Engine')) {
      result.bookingTech!.push('Custom Booking Engine');
    }

    result.hasOnlineBooking = (result.bookingTech?.length ?? 0) > 0;

    // 2. Detect CTAs
    const seenCtas = new Set<string>();
    $('a, button, input[type="submit"], input[type="button"]').each((_, el) => {
      const text = ($(el).text() || $(el).attr('value') || '').replace(/\s+/g, ' ').trim();
      if (!text || text.length > 40) return;

      const lower = text.toLowerCase();
      const matched = PRIMARY_CTA_KEYWORDS.some((kw) => lower.includes(kw));
      if (matched && !seenCtas.has(lower)) {
        seenCtas.add(lower);
        result.callsToAction!.push(text);
      }
    });

    // 3. Detect Offers / Specials in text
    $('script, style, noscript').remove();
    const bodyText = $('body').text().replace(/\s+/g, ' ');
    const seenOffers = new Set<string>();

    for (const pattern of OFFER_PATTERNS) {
      const match = bodyText.match(pattern);
      if (match && match[0]) {
        const clean = match[0].trim();
        const lower = clean.toLowerCase();
        if (!seenOffers.has(lower)) {
          seenOffers.add(lower);
          // Capitalize first letter
          result.offers!.push(clean.charAt(0).toUpperCase() + clean.slice(1));
        }
      }
    }

    // 4. Extract primary telephone
    const telLink = $('a[href^="tel:"]').first().attr('href');
    if (telLink) {
      result.phone = telLink.replace(/^tel:/, '').trim();
    }

    // Limit array sizes
    result.offers = result.offers!.slice(0, 4);
    result.callsToAction = result.callsToAction!.slice(0, 4);
    result.bookingTech = result.bookingTech!.slice(0, 4);

    return result;
  } catch (err: any) {
    // Fail silently with default empty profile
    return result;
  }
}
