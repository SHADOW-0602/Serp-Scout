# Serp-Scout

> AI-powered competitive intelligence and SEO platform for small businesses.

## Implementation Plan

**Product name:** Serp-Scout  
**Document status:** Implementation-ready product and engineering plan  
**Primary data provider:** SerpApi  
**Target customer:** Small businesses and small marketing agencies  
**Recommended first market:** Local service businesses  

---

## 1. Product Definition

Build **Serp-Scout**, an AI-powered competitive intelligence and SEO platform
that discovers
competitors automatically, monitors search visibility, analyzes competitor
content and customer reviews, and gives small businesses a short, prioritized
weekly action plan.

The product should turn search data into business decisions. It should not be
positioned as a generic chatbot or a keyword-volume dashboard.

### Core product promise

> Discover who competes for your customers, understand why they are visible,
> and receive three practical SEO actions every week.

### Initial business outcomes

- More qualified calls and inquiries
- More bookings or quote requests
- Improved local search visibility
- Better service and location pages
- Better use of customer language in marketing
- Faster competitor and market research

---

## 2. Target Users

### Primary users

- Local business owners
- Small marketing agencies
- Freelance SEO consultants
- Small e-commerce brands
- Marketing managers at companies with limited SEO resources

### Best first verticals

- Dental clinics
- Medical and wellness practices
- Real-estate agencies
- Gyms and fitness studios
- Restaurants
- Home-service companies
- Coaching and consulting businesses
- Local professional services

### Why start with local services

- Competitors can be discovered through both Google Search and Google Maps.
- Search intent is easy to connect to calls, bookings, and inquiries.
- Businesses understand the value of local visibility.
- The first version can deliver value without requiring complex backlink data.

---

## 3. Product Scope

### In scope for the complete first release

1. Business onboarding
2. Website and business profile analysis
3. Automatic competitor discovery
4. Competitor confirmation and classification
5. Keyword and search-intent discovery
6. Organic search monitoring
7. Local Maps monitoring
8. Competitor content-gap analysis
9. Competitor messaging analysis
10. Customer-review analysis
11. SERP feature analysis
12. News and market monitoring
13. Opportunity scoring
14. Weekly recommendations
15. Historical changes
16. Evidence and source links
17. Dashboard and reports
18. PDF and CSV export
19. Scheduled refreshes
20. Usage, quota, and error handling

### Out of scope for the first release

- Automated publishing to the user's website
- Automated review generation or review manipulation
- Automated outreach or spam
- Guaranteed ranking improvements
- Paid advertising campaign management
- Full backlink-index replacement
- Scraping websites directly when an approved data source is available
- Financial, legal, or medical advice

---

## 4. Main User Journey

### Onboarding

The user enters:

- Business name
- Website URL
- Industry
- Country, city, and service area
- Main services or products
- Primary business objective
- Optional business profile URL

The system then:

1. Fetches and analyzes the public website.
2. Extracts services, locations, categories, and customer language.
3. Generates initial search concepts.
4. Searches Google Search and Google Maps through SerpApi.
5. Finds and scores potential competitors.
6. Presents the top candidates with evidence.
7. Lets the user confirm, reject, or add competitors.
8. Generates the first baseline report.

The user should not be required to know competitor names.

### Recurring experience

Each scheduled refresh should:

1. Run the configured searches.
2. Store new results and timestamps.
3. Compare the new baseline with prior results.
4. Detect important changes.
5. Recalculate opportunities.
6. Generate three to five prioritized actions.
7. Notify the user and update the dashboard.

---

## 5. Functional Requirements

## 5.1 Business workspace

Each workspace should support:

- One or more businesses
- Multiple locations
- Team members and roles
- Industry and service configuration
- Business objectives
- Search locations and languages
- Time zone
- Competitor list
- Keyword list
- Report settings

### Roles

- Owner: full access and billing
- Admin: manage configuration and team
- Analyst: view data and edit research settings
- Viewer: read-only reports

---

## 5.2 Website analysis

Analyze the user's public website and extract:

- Page titles and meta descriptions
- Headings
- Main services
- Product names
- Location names
- Calls to action
- Contact and booking links
- FAQ sections
- Pricing references
- Trust signals
- Internal links
- Last-modified signals where available

The analysis should produce suggestions, not claim that technical SEO is
fully audited. A dedicated crawler can be added later if required.

### Website analysis output

- Detected business category
- Detected services
- Detected locations
- Missing obvious service pages
- Missing obvious location pages
- Existing conversion actions
- Candidate keywords
- Candidate competitor queries

---

## 5.3 Automatic competitor discovery

### Discovery inputs

- Business category
- Services and products
- Locations
- Website content
- Customer problem terms
- User-provided keywords

### Query groups

#### Service queries

- `best {service} in {location}`
- `{service} near {location}`
- `{service provider} {location}`

#### Local queries

- `{category} in {location}`
- `{category} near me`
- `top {category} {city}`

#### Commercial queries

- `affordable {service} {location}`
- `{service} pricing {location}`
- `{service} consultation {location}`

#### Problem-based queries

- `{customer problem} solution {location}`
- `where to get {service} {location}`

#### Comparison queries

- `{category} comparison {location}`
- `best alternatives to {service}`

### Discovery sources

- Google Search results
- Google Maps results
- Google News results where relevant
- Google Shopping results for product businesses
- Related questions and autocomplete-style signals where supported

### Candidate extraction

For each result, collect:

- Business or domain name
- URL
- Search query
- Search position
- Result type
- Location
- Category
- Review rating and count where available
- Services mentioned
- Number of appearances

### Candidate classification

Each candidate should be classified as:

- Direct competitor
- Geographic competitor
- Search competitor
- Indirect competitor
- Marketplace or directory
- Content publisher
- Irrelevant result

### Competitor confidence score

Use an internal score:

```text
Competitor Confidence =
30% service similarity
+ 25% location overlap
+ 20% repeated SERP appearances
+ 15% customer/search-intent overlap
+ 10% business-type similarity
```

This score is for prioritization and must not be presented as an objective
industry-standard measurement.

### User confirmation

The user must be able to:

- Confirm a competitor
- Reject a candidate
- Mark a candidate as indirect
- Add a competitor manually
- Change the competitor name or URL
- Stop monitoring a competitor

The system should show evidence for every candidate:

- Queries where it appeared
- Search position
- Location
- Relevant service overlap
- Maps or organic result source

---

## 5.4 Keyword and search-intent discovery

Generate keyword candidates from:

- Website services
- Website locations
- Competitor pages
- Search suggestions
- Related questions
- Search-result titles
- Customer reviews
- User-provided terms

### Intent categories

- Informational
- Commercial investigation
- Transactional
- Local
- Navigational
- Comparison
- Problem-based

### Keyword fields

- Keyword text
- Location
- Language
- Search intent
- Business relevance
- Commercial intent
- Current position
- Best competitor position
- SERP features
- Content opportunity
- Last checked date

### Opportunity score

```text
Keyword Opportunity =
30% business relevance
+ 25% commercial intent
+ 20% ranking potential
+ 15% local fit
+ 10% content gap
```

Each recommendation should explain the score with evidence.

---

## 5.5 Search visibility monitoring

For each approved keyword, store:

- Current ranking position
- Previous ranking position
- Ranking change
- Search result URL
- Competitor URLs
- SERP features
- Search location
- Device type
- Language and country
- Collection timestamp

Track:

- Top 3 keywords
- Top 10 keywords
- Top 100 keywords
- Average ranking position
- Share of tracked results
- Map Pack visibility
- Featured snippet visibility
- People Also Ask visibility
- Shopping visibility where relevant

Search results are volatile. Always display the search date and location.

---

## 5.6 Local SEO monitoring

For local businesses, track Google Maps separately from organic results.

### Local data

- Maps ranking
- Business category
- Address and distance
- Rating
- Review count
- Review freshness
- Listed services
- Business hours
- Website link
- Phone number
- Booking link
- Photos where available
- Competitor proximity

### Local recommendations

Examples:

- Improve business category selection
- Add missing service descriptions
- Add location-specific pages
- Improve booking visibility
- Address recurring review complaints
- Build a legitimate review-request process

Never recommend fake reviews, review gating, or review manipulation.

---

## 5.7 Content-gap analysis

For each approved competitor, compare relevant pages against the user's site.

Analyze:

- Page topics
- Headings
- FAQs
- Service coverage
- Location coverage
- Pricing information
- Trust signals
- Testimonials
- Calls to action
- Content freshness
- Internal linking patterns

### Content-gap output

Each gap should include:

- Missing topic
- Competing evidence
- Recommended page type
- Suggested title
- Suggested headings
- Suggested FAQs
- Target search intent
- Estimated impact
- Estimated effort
- Priority

The agent should not recommend longer content merely because a competitor page
is longer. Recommendations should be based on customer usefulness and search
intent.

---

## 5.8 Competitor messaging analysis

Compare competitor positioning:

- Main headline
- Primary offer
- Differentiator
- Price language
- Guarantees
- Service speed
- Customer segment
- Calls to action
- Trust signals

Detect repeated market patterns.

Example:

```text
Four of five competitors emphasize same-day service.
Three mention transparent pricing.
Only one has direct online booking.
```

The output should separate:

- Observed competitor language
- Agent interpretation
- Recommended business action

---

## 5.9 Customer-review analysis

Analyze public review data where available.

Extract:

- Common praise
- Common complaints
- Service-specific feedback
- Staff-related comments
- Pricing concerns
- Waiting-time concerns
- Frequently asked questions
- Natural customer vocabulary

Output:

- Review themes
- Theme frequency
- Positive and negative examples
- Website-copy opportunities
- Service improvement opportunities

Preserve source links and collection dates. Do not invent sentiment or quote
reviews that were not retrieved.

---

## 5.10 News and market monitoring

Monitor:

- New competitors
- New services
- Funding and expansion
- Local events
- Regulatory developments
- Seasonal demand
- Product launches
- Negative publicity
- Industry trends

Classify news as:

- Opportunity
- Competitive activity
- Market trend
- Reputation risk
- Regulatory signal
- Low relevance

News should be presented as a signal, not as guaranteed future demand.

---

## 5.11 SERP feature analysis

Track:

- Map Pack
- Featured snippets
- People Also Ask
- Image results
- Video results
- Shopping results
- Local services
- Reviews
- News results
- Sitelinks

Recommendations should match the feature:

- FAQ content for People Also Ask
- Concise answer blocks for featured snippets
- Local profile improvements for Map Pack
- Product data and comparison pages for Shopping results
- Image metadata and useful visuals for image results

---

## 5.12 Insight and recommendation engine

The recommendation engine should produce three to five actions per report.

Each action must include:

- Recommendation title
- Problem or opportunity
- Evidence
- Source URLs
- Search queries
- Collection date
- Expected impact
- Estimated effort
- Suggested owner
- Suggested deadline
- Priority
- Confidence

### Priority levels

- P0: High impact, low effort
- P1: High impact, medium effort
- P2: Medium impact, medium effort
- P3: Low impact, high effort

### Recommendation rules

A recommendation must be:

1. Evidence-backed
2. Relevant to the configured business
3. Actionable
4. Prioritized
5. Clear about uncertainty

The system should not generate recommendations when evidence is insufficient.

---

## 5.13 Weekly report

Each report should contain:

### Executive summary

- Important changes
- Main opportunity
- Main competitive threat
- Recommended focus for the week

### Visibility changes

- Keyword changes
- Maps changes
- SERP feature changes

### Competitor changes

- New competitors
- New pages or offers
- Pricing or messaging changes
- Review changes

### Content opportunities

- Missing pages
- Missing FAQs
- Weak existing pages

### Action plan

Limit to three to five actions.

### Evidence appendix

- Search query
- Source
- Date collected
- Result type

---

## 6. Suggested Technical Architecture

```text
React / Next.js Dashboard
          |
          v
Application API
          |
   -------------------------
   |           |           |
PostgreSQL  Job Queue   Auth/Billing
   |
   v
Research Orchestrator
   |
   |-- Website Analyzer
   |-- Query Planner
   |-- SerpApi Adapter
   |-- Result Normalizer
   |-- Competitor Classifier
   |-- Keyword Analyzer
   |-- Review Analyzer
   |-- Change Detector
   |-- Recommendation Engine
   |-- Report Generator
          |
          v
     Email / Dashboard / PDF
```

### Recommended stack

- Frontend: React with TypeScript
- Backend: Node.js with TypeScript
- API: Express, Fastify, or a Next.js API layer
- Database: PostgreSQL
- ORM: Drizzle or Prisma
- Queue: Redis-backed queue or managed job scheduler
- Authentication: Replit Auth or equivalent managed authentication
- Search data: SerpApi
- AI reasoning: Tool-calling language model
- PDF generation: HTML-to-PDF renderer
- Hosting: Replit Deployments or equivalent hosted deployment

Technical choices can change, but the module boundaries should remain.

---

## 7. Agent Design

Use a controlled multi-step workflow rather than an unrestricted autonomous
agent.

### Agent roles

#### 1. Intake Agent

Validates business information and identifies missing fields.

#### 2. Website Analysis Agent

Extracts services, locations, categories, and calls to action.

#### 3. Research Planner Agent

Creates bounded search tasks based on the business configuration.

#### 4. Search Tool Layer

Calls SerpApi and returns normalized search results.

#### 5. Competitor Discovery Agent

Extracts, deduplicates, scores, and classifies candidates.

#### 6. SEO Analysis Agent

Analyzes rankings, SERP features, intent, and content gaps.

#### 7. Market Intelligence Agent

Analyzes news, reviews, offers, and competitor changes.

#### 8. Recommendation Agent

Converts evidence into prioritized actions.

#### 9. Report Agent

Formats a concise report with citations and an evidence appendix.

### Tool boundaries

The model should not directly construct arbitrary external requests. Use
server-side typed tools such as:

- `analyzeWebsite`
- `generateSearchQueries`
- `searchGoogle`
- `searchGoogleMaps`
- `searchGoogleNews`
- `searchGoogleShopping`
- `normalizeSearchResults`
- `scoreCompetitor`
- `comparePages`
- `analyzeReviews`
- `detectChanges`
- `generateRecommendations`
- `createReport`

The server must validate all tool arguments and enforce workspace quotas.

---

## 8. Data Model

### Workspace

- id
- name
- owner_id
- timezone
- created_at

### User

- id
- workspace_id
- name
- email
- role
- created_at

### Business

- id
- workspace_id
- name
- website_url
- industry
- description
- country
- city
- service_area
- primary_goal
- timezone
- created_at
- updated_at

### BusinessLocation

- id
- business_id
- name
- address
- latitude
- longitude
- country
- city
- radius
- maps_profile_url

### Service

- id
- business_id
- name
- description
- priority

### Competitor

- id
- business_id
- name
- domain
- website_url
- maps_url
- category
- competitor_type
- confidence_score
- status
- user_notes
- created_at
- updated_at

### Keyword

- id
- business_id
- phrase
- location
- language
- intent
- status
- opportunity_score
- created_at

### SearchRun

- id
- business_id
- provider
- search_type
- query
- location
- language
- device
- requested_at
- completed_at
- status
- error_message
- cost_units

### SearchResult

- id
- search_run_id
- result_type
- rank
- title
- url
- domain
- business_name
- snippet
- rating
- review_count
- location_text
- raw_reference

Store only the raw data required for auditability and provider compliance.

### RankingObservation

- id
- business_id
- keyword_id
- domain
- url
- rank
- result_type
- serp_features
- search_run_id
- observed_at

### ContentGap

- id
- business_id
- competitor_id
- topic
- evidence
- recommended_page_type
- priority
- effort
- impact
- status

### ReviewTheme

- id
- competitor_id
- theme
- sentiment
- frequency
- examples
- source_reference
- observed_at

### Recommendation

- id
- business_id
- report_id
- title
- description
- evidence
- impact
- effort
- priority
- confidence
- status
- owner_id
- due_date

### SourceEvidence

- id
- business_id
- recommendation_id
- search_run_id
- source_url
- source_title
- claim
- collected_at

### Report

- id
- business_id
- period_start
- period_end
- summary
- generated_at
- status

---

## 9. API Design

### Business

```text
POST   /api/businesses
GET    /api/businesses/:businessId
PATCH  /api/businesses/:businessId
DELETE /api/businesses/:businessId
POST   /api/businesses/:businessId/analyze
```

### Competitors

```text
POST   /api/businesses/:businessId/competitors/discover
GET    /api/businesses/:businessId/competitors
PATCH  /api/competitors/:competitorId
DELETE /api/competitors/:competitorId
POST   /api/competitors/:competitorId/monitor
```

### Keywords

```text
POST   /api/businesses/:businessId/keywords/discover
GET    /api/businesses/:businessId/keywords
PATCH  /api/keywords/:keywordId
DELETE /api/keywords/:keywordId
POST   /api/businesses/:businessId/rankings/refresh
```

### Reports

```text
POST   /api/businesses/:businessId/reports/generate
GET    /api/businesses/:businessId/reports
GET    /api/reports/:reportId
GET    /api/reports/:reportId/pdf
GET    /api/reports/:reportId/csv
```

### Jobs

```text
GET    /api/jobs/:jobId
POST   /api/jobs/:jobId/cancel
```

All endpoints must enforce workspace authorization.

---

## 10. Dashboard Plan

### Page 1: Overview

Show:

- Business and location
- Visibility summary
- Ranking movement
- Confirmed competitors
- Top three recommendations
- Data freshness
- Last successful research run

### Page 2: Competitors

Show:

- Direct competitors
- Indirect competitors
- Search competitors
- Maps and organic visibility
- Review and rating comparison
- Messaging comparison
- New competitor activity

### Page 3: Keywords

Show:

- Keyword
- Intent
- Current position
- Best competitor position
- Position change
- Opportunity score
- SERP features
- Suggested action

### Page 4: Content Opportunities

Show:

- Missing service pages
- Missing location pages
- Missing FAQs
- Competitor topics
- Suggested content brief

### Page 5: Local SEO

Show:

- Maps visibility
- Rating and review counts
- Business profile fields
- Competitor distance
- Review themes

### Page 6: Reports

Show:

- Weekly reports
- Historical changes
- Completed recommendations
- PDF and CSV export

### Page 7: Settings

Allow users to manage:

- Business details
- Locations
- Competitors
- Keywords
- Search language and country
- Refresh schedule
- Notification preferences
- Team access

---

## 11. SerpApi Integration Requirements

Implement a server-side SerpApi adapter. Never expose the API key to the
browser.

### Adapter responsibilities

- Authenticate using a server-side secret
- Validate query arguments
- Set location, language, country, and device
- Request only required fields
- Normalize different result formats
- Record request status and timestamps
- Track usage units
- Handle retries and provider errors
- Cache repeated searches
- Enforce workspace quotas

### Search types

Implement only the provider engines needed by the configured business:

- Google Search
- Google Maps
- Google News
- Google Shopping for product businesses

The exact provider parameters should be verified against the current SerpApi
documentation during implementation.

### Resilience

- Retry transient errors with exponential backoff
- Do not blindly retry non-idempotent operations
- Mark incomplete runs clearly
- Preserve partial successful results
- Show the last successful data if a refresh fails
- Notify the user when data is stale

### Cost controls

- Cache identical queries by business, location, language, and date window
- Batch independent searches where supported
- Limit initial onboarding queries
- Let users choose refresh frequency
- Set per-workspace monthly quotas
- Display usage to workspace admins

---

## 12. Evidence and Trust Requirements

Every important claim should be traceable:

```text
Recommendation
  -> Claim
  -> Search query
  -> Source result
  -> Collection timestamp
  -> Search location
```

### Evidence rules

- Never invent rankings or review counts.
- Never present an unverified URL as a source.
- Display collection dates.
- Display search location and language.
- Distinguish observed facts from AI interpretation.
- Label incomplete data.
- Use confidence levels.
- Avoid claiming that a single result proves market demand.

### Confidence levels

- High: repeated evidence from multiple relevant searches
- Medium: useful evidence from one or two sources
- Low: limited, stale, or ambiguous evidence

Low-confidence findings should be labeled as hypotheses.

---

## 13. Security and Privacy

- Keep SerpApi credentials in server-side secrets.
- Do not put provider keys in frontend code.
- Encrypt sensitive configuration at rest where supported.
- Enforce workspace-level authorization on every request.
- Validate and sanitize URLs.
- Prevent server-side request forgery during website analysis.
- Restrict website fetches to safe protocols.
- Apply timeouts and response-size limits.
- Strip unnecessary personal information from stored results.
- Log access to workspace data.
- Provide account and workspace deletion paths.
- Do not store customer data from reviews beyond what is required for the
  analysis.

---

## 14. Milestone Plan

## Milestone 0: Product foundation

### Deliverables

- Product requirements
- Architecture decision record
- Initial UI wireframes
- Database schema
- SerpApi account and server-side secret configuration
- Development and production environments

### Acceptance criteria

- Core entities are documented.
- Workspace authorization strategy is defined.
- A safe SerpApi adapter interface exists.

---

## Milestone 1: Authentication and business onboarding

### Deliverables

- Authentication
- Workspace creation
- Business profile form
- Location configuration
- Services and goals form
- Website URL validation

### Acceptance criteria

- A user can create a workspace and business.
- Invalid URLs are rejected.
- Business configuration can be edited.
- Multiple locations are supported in the data model.

---

## Milestone 2: Website analyzer

### Deliverables

- Safe website fetcher
- Page parser
- Service extraction
- Location extraction
- Call-to-action extraction
- Candidate keyword generation

### Acceptance criteria

- The system can process a normal public business website.
- Fetch failures are reported clearly.
- Extracted evidence includes page URLs.
- Large or unsafe pages are rejected safely.

---

## Milestone 3: SerpApi adapter and search runs

### Deliverables

- Server-side provider adapter
- Google Search support
- Google Maps support
- Optional News and Shopping support
- Search run storage
- Usage accounting
- Error handling

### Acceptance criteria

- A validated search can be sent through the server.
- Results are normalized into internal models.
- Search location and timestamp are stored.
- Provider errors do not crash the application.
- API keys are not visible in browser responses or logs.

---

## Milestone 4: Competitor discovery

### Deliverables

- Query generator
- Search-result extractor
- Maps candidate extractor
- Domain and business deduplication
- Competitor scoring
- Competitor classification
- Confirmation interface

### Acceptance criteria

- A user can discover candidates without entering competitor names.
- Each candidate shows evidence.
- Direct, indirect, search, and directory candidates are separated.
- Users can confirm, reject, edit, and monitor candidates.

---

## Milestone 5: Keyword and ranking monitoring

### Deliverables

- Keyword discovery
- Intent classification
- Keyword editing
- Ranking observations
- Ranking history
- SERP feature storage
- Opportunity scoring

### Acceptance criteria

- Users can approve keywords.
- The system records ranking position and location.
- Historical comparisons work.
- The dashboard distinguishes organic results from Maps.

---

## Milestone 6: SEO and market analysis

### Deliverables

- Content-gap analyzer
- Competitor messaging analyzer
- Review-theme analyzer
- News monitor
- Market-change detector

### Acceptance criteria

- Each insight includes evidence.
- The system distinguishes facts from recommendations.
- Missing data is labeled rather than guessed.
- Review and news findings retain source references.

---

## Milestone 7: Recommendation and reporting engine

### Deliverables

- Recommendation scoring
- Priority and effort classification
- Weekly report generator
- Evidence appendix
- PDF export
- CSV export

### Acceptance criteria

- Reports contain no more than five primary actions.
- Every primary action has evidence.
- Reports display search dates and locations.
- Users can mark recommendations as planned, in progress, completed, or
  dismissed.

---

## Milestone 8: Scheduling, notifications, and history

### Deliverables

- Scheduled research jobs
- Weekly report schedule
- Email or in-app notifications
- Historical dashboards
- Stale-data indicators

### Acceptance criteria

- A workspace can choose a refresh schedule.
- Failed jobs are visible.
- Users receive only one notification per completed report.
- Historical changes are retained and viewable.

---

## Milestone 9: Quality, security, and launch

### Deliverables

- Authorization review
- Secrets review
- Usage-limit testing
- Error-state UX
- Accessibility review
- Performance optimization
- Backup and recovery plan
- Production deployment

### Acceptance criteria

- Users cannot access another workspace's data.
- Provider keys are not exposed.
- Search failures show useful recovery states.
- Critical workflows have automated tests.
- A complete onboarding-to-report flow works in production.

---

## 15. Testing Strategy

### Unit tests

Test:

- Query generation
- Intent classification
- URL normalization
- Domain deduplication
- Competitor scoring
- Opportunity scoring
- Priority assignment
- Report formatting

### Integration tests

Test:

- SerpApi adapter with mocked responses
- Search-run persistence
- Website analysis pipeline
- Competitor discovery pipeline
- Recommendation generation
- PDF and CSV export

### End-to-end tests

Test:

1. Create workspace.
2. Add business.
3. Analyze website.
4. Discover competitors.
5. Confirm candidates.
6. Add keywords.
7. Run ranking research.
8. Generate report.
9. Export report.

### Failure cases

Test:

- Invalid website
- Website timeout
- Empty search results
- SerpApi quota error
- Provider rate limit
- Duplicate businesses
- Search location unavailable
- AI response with unsupported claims
- Partial research run
- Unauthorized workspace access

### Quality gates

- No critical authorization defects
- No secrets in client bundles
- Every report claim has evidence or is labeled as a hypothesis
- No unhandled provider error in the primary workflow
- No recommendation generated from empty evidence

---

## 16. Analytics and Success Metrics

### Product metrics

- Onboarding completion rate
- Number of confirmed competitors
- Number of tracked keywords
- Reports opened
- Recommendations marked complete
- Weekly active workspaces
- Report retention
- Time saved per report
- Percentage of insights with valid evidence

### Customer outcome metrics

- Ranking improvements
- Increase in organic clicks
- Increase in calls
- Increase in booking requests
- Increase in qualified leads
- Increase in store visits
- Increase in sales attributed to SEO

The visibility score is not the primary success metric. The product succeeds
when recommendations lead to measurable business activity.

---

## 17. Monetization Direction

Use usage-based limits rather than unlimited searching.

### Possible plans

#### Starter

- One business
- One location
- Limited competitors
- Limited tracked keywords
- Monthly report

#### Growth

- Multiple locations
- More keywords
- Weekly reports
- Competitor monitoring
- PDF exports

#### Agency

- Multiple businesses
- White-label reports
- Team access
- Higher research quota
- Client management

Pricing and limits should be finalized after measuring SerpApi costs,
research frequency, and report-generation costs.

---

## 18. Example First Report

### Executive summary

```text
Your business ranks on page two for "dentist in Koramangala".
Three competitors appear above you and all have dedicated treatment pages.
Customers frequently mention friendly staff in reviews, but this message is
not visible on the homepage.
```

### Top actions

1. Improve the dentist-in-Koramangala page.
   - Impact: High
   - Effort: Low
   - Evidence: Position 14; stronger competitor location pages

2. Create a dental implant pricing and insurance FAQ.
   - Impact: High
   - Effort: Medium
   - Evidence: Competitor coverage and related search questions

3. Add a visible online booking call to action.
   - Impact: Medium
   - Effort: Low
   - Evidence: Three monitored competitors offer direct booking

### Evidence

Each action should link to:

- Search query
- Search result
- Competitor page
- Collection date
- Search location

---

## 19. Final Definition of Done

The complete product is ready for an initial production launch when:

- A business can be created and configured.
- The system can analyze its website safely.
- Competitors can be discovered without prior competitor knowledge.
- Users can confirm and manage competitor candidates.
- Keywords can be generated, edited, and monitored.
- Google Search and Google Maps data are stored with timestamps.
- Content, messaging, review, and market insights are generated from evidence.
- Weekly reports contain three to five prioritized actions.
- Every important claim has source evidence.
- Historical changes are visible.
- Scheduled research and notifications work.
- Usage limits and provider errors are handled.
- Workspace data is isolated securely.
- PDF and CSV reports can be exported.
- The complete workflow has been tested from onboarding through reporting.

The strongest first implementation is a focused local-business product with
Google Search, Google Maps, competitor discovery, keyword monitoring, content
gaps, and weekly recommendations. News, Shopping, advanced review analysis,
and agency features can be added after the core workflow proves that the
recommendations create measurable customer outcomes.