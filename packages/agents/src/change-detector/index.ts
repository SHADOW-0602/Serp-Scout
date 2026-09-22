export interface SearchResultSnapshot {
  rank: number;
  domain: string;
  url: string;
  title: string;
  rating?: number;
  reviewsCount?: number;
}

export interface SearchRunDiffInput {
  query: string;
  previousResults: SearchResultSnapshot[];
  currentResults: SearchResultSnapshot[];
  userDomain?: string;
}

export interface RankShift {
  domain: string;
  previousRank: number;
  currentRank: number;
  delta: number; // positive = climbed, negative = dropped
  url: string;
}

export interface SearchRunDiffResult {
  query: string;
  rankShifts: RankShift[];
  newEntrants: SearchResultSnapshot[]; // newly entered top 10
  droppedOut: SearchResultSnapshot[];  // fell out of top 10
  newUrlsForExistingDomains: Array<{ domain: string; oldUrl: string; newUrl: string }>;
  ratingChanges: Array<{ domain: string; oldRating?: number; newRating?: number; oldReviews?: number; newReviews?: number }>;
  summary: string;
}

export function detectSearchRunChanges(input: SearchRunDiffInput): SearchRunDiffResult {
  const { query, previousResults, currentResults, userDomain } = input;

  const prevMap = new Map<string, SearchResultSnapshot>();
  for (const item of previousResults) {
    prevMap.set(item.domain.toLowerCase(), item);
  }

  const currMap = new Map<string, SearchResultSnapshot>();
  for (const item of currentResults) {
    currMap.set(item.domain.toLowerCase(), item);
  }

  const rankShifts: RankShift[] = [];
  const newUrls: Array<{ domain: string; oldUrl: string; newUrl: string }> = [];
  const ratingChanges: Array<{ domain: string; oldRating?: number; newRating?: number; oldReviews?: number; newReviews?: number }> = [];

  for (const curr of currentResults) {
    const domainKey = curr.domain.toLowerCase();
    const prev = prevMap.get(domainKey);

    if (prev) {
      if (prev.rank !== curr.rank) {
        rankShifts.push({
          domain: curr.domain,
          previousRank: prev.rank,
          currentRank: curr.rank,
          delta: prev.rank - curr.rank, // positive = climbed
          url: curr.url,
        });
      }

      if (prev.url !== curr.url) {
        newUrls.push({
          domain: curr.domain,
          oldUrl: prev.url,
          newUrl: curr.url,
        });
      }

      if (
        (prev.rating !== undefined && curr.rating !== undefined && prev.rating !== curr.rating) ||
        (prev.reviewsCount !== undefined && curr.reviewsCount !== undefined && prev.reviewsCount !== curr.reviewsCount)
      ) {
        ratingChanges.push({
          domain: curr.domain,
          oldRating: prev.rating,
          newRating: curr.rating,
          oldReviews: prev.reviewsCount,
          newReviews: curr.reviewsCount,
        });
      }
    }
  }

  // Top 10 new entrants and drop-outs
  const prevTop10Domains = new Set(
    previousResults.filter((r) => r.rank <= 10).map((r) => r.domain.toLowerCase())
  );
  const currTop10Domains = new Set(
    currentResults.filter((r) => r.rank <= 10).map((r) => r.domain.toLowerCase())
  );

  const newEntrants = currentResults.filter(
    (r) => r.rank <= 10 && !prevTop10Domains.has(r.domain.toLowerCase())
  );

  const droppedOut = previousResults.filter(
    (r) => r.rank <= 10 && !currTop10Domains.has(r.domain.toLowerCase())
  );

  // Generate clear summary
  const summaryParts: string[] = [];
  if (userDomain) {
    const userShift = rankShifts.find((s) => s.domain.toLowerCase().includes(userDomain.toLowerCase()));
    if (userShift) {
      const dir = userShift.delta > 0 ? `climbed +${userShift.delta}` : `slipped ${userShift.delta}`;
      summaryParts.push(`Your website ${dir} to #${userShift.currentRank}.`);
    }
  }

  if (newEntrants.length > 0) {
    summaryParts.push(`${newEntrants.length} new competitor(s) broke into the top 10.`);
  }

  if (rankShifts.length > 0) {
    summaryParts.push(`${rankShifts.length} position change(s) detected.`);
  } else {
    summaryParts.push('SERP rankings remained stable.');
  }

  return {
    query,
    rankShifts: rankShifts.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)),
    newEntrants,
    droppedOut,
    newUrlsForExistingDomains: newUrls,
    ratingChanges,
    summary: summaryParts.join(' '),
  };
}
