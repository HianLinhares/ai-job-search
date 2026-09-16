// Data source: Wellfound public SSR landings (__NEXT_DATA__ / Apollo state).
// Personal use only — /search is robots-disallowed; GraphQL/Turnstile not used.

export const DEFAULT_BASE_URL = "https://wellfound.com"

/** Primary Brazil software-engineer landing (always fetched). */
export const BRAZIL_LANDING_PATH = "/role/l/software-engineer/brazil"

/** Extra remote landings; 404s are skipped. */
export const REMOTE_LANDING_PATHS = [
  "/role/l/software-engineer/remote",
  "/role/r/software-engineer/remote",
]

/** Site base URL (trailing slash stripped). Override via WELLFOUND_BASE_URL. */
export function baseUrl(): string {
  const raw = (process.env.WELLFOUND_BASE_URL ?? "").trim()
  return (raw || DEFAULT_BASE_URL).replace(/\/+$/, "")
}

export function writeError(error: string, code: string): void {
  process.stderr.write(JSON.stringify({ error, code }) + "\n")
}

const UA = "Mozilla/5.0 (compatible; wellfound-cli/1.0)"

/**
 * Portal-skill contract result. Missing values are `null`, never omitted.
 */
export interface JobResult {
  id: string
  title: string
  company: string | null
  location: string | null
  date: string | null
  url: string
  description: string | null
  work_mode: string | null
  slug: string | null
}

export interface JobDetailResult extends JobResult {}

/** Wire shape of a JobListingSearchResult in apolloState.data. */
export interface WellfoundJob {
  __typename?: string
  id?: string | number
  title?: string | null
  slug?: string | null
  description?: string | null
  liveStartAt?: string | number | null
  remote?: boolean | null
  locationNames?: string[] | null
  acceptedRemoteLocationNames?: string[] | null
}

interface ApolloRef {
  __ref?: string
}

interface WellfoundStartup {
  __typename?: string
  id?: string | number
  name?: string | null
  highlightedJobListings?: ApolloRef[] | null
}

type ApolloData = Record<string, unknown>

interface NextData {
  props?: {
    pageProps?: {
      apolloState?: {
        data?: ApolloData
      }
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

/**
 * GET HTML text. Retries 429/5xx with exponential backoff; connection failures
 * fail fast. Returns `null` on 404.
 */
export async function fetchHtml(url: string): Promise<string | null> {
  const maxRetries = 6
  let delay = 500

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    let response: Response
    try {
      response = await fetch(url, {
        headers: {
          "User-Agent": UA,
          Accept: "text/html,application/xhtml+xml,*/*;q=0.8",
        },
        redirect: "follow",
        signal: AbortSignal.timeout(30000),
      })
    } catch (e) {
      throw new Error(
        `could not reach Wellfound at ${url} (${e instanceof Error ? e.message : String(e)})`,
      )
    }

    if (response.status === 404) return null

    if (response.status === 429 || response.status >= 500) {
      if (attempt === maxRetries) {
        throw new Error(`Wellfound request failed: ${response.status} ${response.statusText}`)
      }
      await sleep(delay + Math.floor(Math.random() * 500))
      delay = Math.min(delay * 2, 8000)
      continue
    }
    if (!response.ok) {
      throw new Error(`Wellfound request failed: ${response.status} ${response.statusText}`)
    }
    return await response.text()
  }
  throw new Error("Wellfound request failed after retries")
}

/** Extract and parse `__NEXT_DATA__` JSON from an HTML document. */
export function extractNextData(html: string): NextData | null {
  const m = html.match(/id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i)
  if (!m?.[1]) return null
  try {
    return JSON.parse(m[1]) as NextData
  } catch {
    return null
  }
}

function isJobListing(v: unknown): v is WellfoundJob {
  return Boolean(v && typeof v === "object" && (v as WellfoundJob).__typename === "JobListingSearchResult")
}

function isStartup(v: unknown): v is WellfoundStartup {
  return Boolean(v && typeof v === "object" && (v as WellfoundStartup).__typename === "StartupResult")
}

function jobIdFromRef(ref: string | undefined): string | null {
  if (!ref) return null
  const m = ref.match(/^JobListingSearchResult:(.+)$/)
  return m ? m[1] : null
}

/** Build id → company name from StartupResult highlightedJobListings refs. */
export function buildCompanyMap(data: ApolloData): Map<string, string> {
  const map = new Map<string, string>()
  for (const value of Object.values(data)) {
    if (!isStartup(value)) continue
    const name = value.name?.trim()
    if (!name || !Array.isArray(value.highlightedJobListings)) continue
    for (const listing of value.highlightedJobListings) {
      const id = jobIdFromRef(listing?.__ref)
      if (id) map.set(id, name)
    }
  }
  return map
}

/** Parse all JobListingSearchResult entries from apolloState.data. */
export function parseJobsFromApollo(data: ApolloData): WellfoundJob[] {
  const out: WellfoundJob[] = []
  for (const [key, value] of Object.entries(data)) {
    if (!key.startsWith("JobListingSearchResult:")) continue
    if (isJobListing(value)) out.push(value)
  }
  return out
}

export function parseJobsFromHtml(html: string): { jobs: WellfoundJob[]; companies: Map<string, string> } {
  const next = extractNextData(html)
  const data = next?.props?.pageProps?.apolloState?.data
  if (!data || typeof data !== "object") return { jobs: [], companies: new Map() }
  return { jobs: parseJobsFromApollo(data), companies: buildCompanyMap(data) }
}

/** Landing paths to fetch (Brazil always; remote extras optional). */
export function landingPaths(): string[] {
  return [BRAZIL_LANDING_PATH, ...REMOTE_LANDING_PATHS]
}

/**
 * Fetch Brazil + remote landings, merge/dedupe by job id.
 * Remote landing 404s are ignored.
 */
export async function fetchLandingJobs(): Promise<JobResult[]> {
  const byId = new Map<string, JobResult>()
  for (const path of landingPaths()) {
    const url = `${baseUrl()}${path}`
    const html = await fetchHtml(url)
    if (html === null) continue
    const { jobs, companies } = parseJobsFromHtml(html)
    for (const j of jobs) {
      const result = toResult(j, companies)
      if (!result.id) continue
      if (!byId.has(result.id)) byId.set(result.id, result)
    }
  }
  return [...byId.values()]
}

export function formatLocation(j: WellfoundJob): string | null {
  const names = [
    ...(Array.isArray(j.locationNames) ? j.locationNames : []),
    ...(Array.isArray(j.acceptedRemoteLocationNames) ? j.acceptedRemoteLocationNames : []),
  ]
    .map((n) => (typeof n === "string" ? n.trim() : ""))
    .filter(Boolean)
  const unique = [...new Set(names)]
  const parts = [...unique]
  if (j.remote === true && !parts.some((p) => /remote|remoto/i.test(p))) {
    parts.push("Remote")
  }
  return parts.length ? parts.join(", ") : j.remote === true ? "Remote" : null
}

export function jobUrl(j: WellfoundJob): string {
  const id = j.id != null ? String(j.id) : ""
  const slug = j.slug?.trim()
  if (id && slug) return `${baseUrl()}/jobs/${id}-${slug}`
  if (id) return `${baseUrl()}/jobs/${id}`
  return baseUrl()
}

/** Normalize liveStartAt (unix seconds/ms or ISO string) to ISO-8601 or null. */
export function normalizeDate(raw: string | number | null | undefined): string | null {
  if (raw == null) return null
  if (typeof raw === "number" && Number.isFinite(raw)) {
    const ms = raw < 1e12 ? raw * 1000 : raw
    const d = new Date(ms)
    return Number.isNaN(d.getTime()) ? null : d.toISOString()
  }
  if (typeof raw === "string") {
    const trimmed = raw.trim()
    if (!trimmed) return null
    if (/^\d+$/.test(trimmed)) return normalizeDate(Number(trimmed))
    const t = Date.parse(trimmed)
    return Number.isNaN(t) ? trimmed : new Date(t).toISOString()
  }
  return null
}

export function toResult(j: WellfoundJob, companies: Map<string, string>): JobResult {
  const id = j.id != null ? String(j.id) : ""
  return {
    id,
    title: (j.title || "").trim() || "(untitled)",
    company: companies.get(id) ?? null,
    location: formatLocation(j),
    date: normalizeDate(j.liveStartAt),
    url: jobUrl(j),
    description: cleanText(j.description),
    work_mode: j.remote === true ? "remote" : null,
    slug: j.slug?.trim() || null,
  }
}

function numericEntity(cp: number): string {
  return cp >= 0 && cp <= 0x10ffff ? String.fromCodePoint(cp) : ""
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, dec) => numericEntity(parseInt(dec, 10)))
    .replace(/&#[xX]([0-9a-fA-F]+);/g, (_, hex) => numericEntity(parseInt(hex, 16)))
    .replace(/&nbsp;/g, " ")
}

export function cleanHtml(html: string | null | undefined): string | null {
  if (!html) return null
  const withBreaks = html
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/(p|li|ul|ol|div|h\d)>/gi, "\n")
  const text = decodeHtmlEntities(withBreaks.replace(/<[^>]+>/g, " "))
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
  return text || null
}

/** Markdown/plain description cleaner (strips HTML if present). */
export function cleanText(text: string | null | undefined): string | null {
  if (!text) return null
  if (/<[a-z][\s\S]*>/i.test(text)) return cleanHtml(text)
  const trimmed = text.replace(/\r\n/g, "\n").trim()
  return trimmed || null
}

/** Posted within N days (jobage); 9999 / unset = no filter. */
export function matchesJobage(j: JobResult, jobage: number): boolean {
  if (!jobage || jobage >= 9999) return true
  if (!j.date) return false
  const t = Date.parse(j.date)
  if (Number.isNaN(t)) return false
  const cutoff = Date.now() - jobage * 24 * 60 * 60 * 1000
  return t >= cutoff
}

/**
 * When remote=true: keep jobs with remote work_mode OR location mentioning
 * Brazil/Brasil/Remote.
 */
export function matchesRemote(j: JobResult, remote: boolean): boolean {
  if (!remote) return true
  if (j.work_mode === "remote") return true
  const loc = (j.location ?? "").toLowerCase()
  return /brazil|brasil|\bbr\b|remote|remoto/i.test(loc)
}

/** Optional country client filter (BR / Brazil / Brasil → location match). */
export function matchesCountry(j: JobResult, country?: string): boolean {
  if (!country?.trim()) return true
  const token = country.trim().toLowerCase()
  const aliases =
    token === "br" || token === "brazil" || token === "brasil"
      ? ["brazil", "brasil", "br"]
      : [token]
  const hay = `${j.location ?? ""} ${j.title} ${j.company ?? ""}`.toLowerCase()
  return aliases.some((a) => {
    if (a === "br") return /\bbr\b/.test(hay) || hay.includes("brazil") || hay.includes("brasil")
    return hay.includes(a)
  })
}

/** All query tokens must appear in title, company, or description. */
export function matchesQuery(j: JobResult, query?: string): boolean {
  if (!query?.trim()) return true
  const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
  if (tokens.length === 0) return true
  const hay = `${j.title} ${j.company ?? ""} ${j.description ?? ""}`.toLowerCase()
  return tokens.every((t) => hay.includes(t))
}

/** Detect Cloudflare Turnstile / challenge pages. */
export function looksBlocked(html: string): boolean {
  return /cf-challenge|cf-browser-verification|Just a moment|turnstile/i.test(html) &&
    !html.includes("__NEXT_DATA__") &&
    !/JobPosting/i.test(html)
}

interface JsonLdJobPosting {
  "@type"?: string | string[]
  title?: string
  description?: string
  datePosted?: string
  identifier?: { value?: string; name?: string } | string
  hiringOrganization?: { name?: string } | string
  jobLocationType?: string
  applicantLocationRequirements?: { name?: string } | Array<{ name?: string }>
}

function typeIncludes(t: string | string[] | undefined, name: string): boolean {
  if (!t) return false
  if (typeof t === "string") return t === name
  return t.includes(name)
}

/** Extract schema.org JobPosting from JSON-LD script tags. */
export function findJobPosting(html: string): JsonLdJobPosting | null {
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) {
    const raw = m[1].trim()
    if (!raw) continue
    try {
      const parsed = JSON.parse(raw) as unknown
      const candidates = Array.isArray(parsed) ? parsed : [parsed]
      for (const c of candidates) {
        if (c && typeof c === "object" && typeIncludes((c as JsonLdJobPosting)["@type"], "JobPosting")) {
          return c as JsonLdJobPosting
        }
      }
    } catch {
      /* ignore malformed blocks */
    }
  }
  return null
}

export function jobPostingToResult(posting: JsonLdJobPosting, url: string, fallbackId?: string): JobResult {
  let id = fallbackId ?? ""
  if (typeof posting.identifier === "object" && posting.identifier?.value) {
    id = String(posting.identifier.value)
  } else if (typeof posting.identifier === "string" && posting.identifier.trim()) {
    id = posting.identifier.trim()
  }
  if (!id) {
    const fromUrl = url.match(/\/jobs\/(\d+)/)
    if (fromUrl) id = fromUrl[1]
  }
  const company =
    typeof posting.hiringOrganization === "string"
      ? posting.hiringOrganization.trim()
      : posting.hiringOrganization?.name?.trim() || null
  const remote =
    /TELECOMMUTE/i.test(posting.jobLocationType ?? "") ||
    /remote/i.test(url)
  const slugMatch = url.match(/\/jobs\/\d+-([^/?#]+)/)
  return {
    id,
    title: (posting.title || "").trim() || "(untitled)",
    company,
    location: remote ? "Remote" : null,
    date: posting.datePosted ?? null,
    url,
    description: cleanText(posting.description),
    work_mode: remote ? "remote" : null,
    slug: slugMatch?.[1] ?? null,
  }
}

export interface ParsedId {
  id: string
  url: string | null
  slug: string | null
}

/** Resolve id or Wellfound URL to a numeric id (+ optional full URL/slug). */
export function normalizeId(input: string): ParsedId | null {
  const trimmed = input.trim()
  if (!trimmed) return null
  if (/^\d+$/.test(trimmed)) {
    return { id: trimmed, url: null, slug: null }
  }
  const urlMatch = trimmed.match(/wellfound\.com\/jobs\/(\d+)(?:-([^/?#]+))?/i)
  if (urlMatch) {
    const id = urlMatch[1]
    const slug = urlMatch[2] ?? null
    const url = slug ? `${baseUrl()}/jobs/${id}-${slug}` : null
    return { id, url, slug }
  }
  const pathMatch = trimmed.match(/\/jobs\/(\d+)(?:-([^/?#]+))?/i)
  if (pathMatch) {
    const id = pathMatch[1]
    const slug = pathMatch[2] ?? null
    const url = slug ? `${baseUrl()}/jobs/${id}-${slug}` : null
    return { id, url, slug }
  }
  return null
}
