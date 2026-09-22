export interface QueryPlannerInput {
  businessName: string;
  category?: string;
  services: string[];
  city?: string;
  serviceArea?: string;
}

export interface PlannedQueries {
  serviceQueries: string[];
  localQueries: string[];
  commercialQueries: string[];
  problemBasedQueries: string[];
  comparisonQueries: string[];
  allQueries: string[];
}

export function planCompetitorQueries(input: QueryPlannerInput): PlannedQueries {
  const city = input.city || 'Austin';
  const category = input.category || (input.services[0] ? input.services[0] : 'local service');
  const primaryServices = input.services.length > 0 ? input.services.slice(0, 4) : [category];

  // 1. Service Queries
  const serviceQueries: string[] = [];
  for (const svc of primaryServices) {
    serviceQueries.push(`${svc} in ${city}`);
    serviceQueries.push(`best ${svc} ${city}`);
  }

  // 2. Local & Proximity Queries
  const localQueries: string[] = [
    `${category} near me`,
    `${category} in ${city}`,
    `${primaryServices[0]} ${input.serviceArea || city}`,
  ];

  // 3. Commercial & Intent Queries
  const commercialQueries: string[] = [
    `${primaryServices[0]} pricing ${city}`,
    `cost of ${primaryServices[0]} in ${city}`,
    `affordable ${category} ${city}`,
  ];

  // 4. Problem-based Queries
  const problemBasedQueries: string[] = [
    `emergency ${primaryServices[0]} ${city}`,
    `same day ${primaryServices[0]} ${city}`,
    `best rated ${category} in ${city}`,
  ];

  // 5. Comparison Queries
  const comparisonQueries: string[] = [
    `best ${category} in ${city}`,
    `top 10 ${category} ${city}`,
    `${category} reviews ${city}`,
  ];

  const uniqueAll = Array.from(
    new Set([
      ...serviceQueries,
      ...localQueries,
      ...commercialQueries,
      ...problemBasedQueries,
      ...comparisonQueries,
    ])
  );

  return {
    serviceQueries: Array.from(new Set(serviceQueries)),
    localQueries: Array.from(new Set(localQueries)),
    commercialQueries: Array.from(new Set(commercialQueries)),
    problemBasedQueries: Array.from(new Set(problemBasedQueries)),
    comparisonQueries: Array.from(new Set(comparisonQueries)),
    allQueries: uniqueAll,
  };
}
