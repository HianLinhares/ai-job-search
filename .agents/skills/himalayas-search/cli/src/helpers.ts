// Data source: Himalayas.app public JSON API (jobs search + browse).
// Reads are unauthenticated.

export const DEFAULT_BASE_URL = "https://himalayas.app"

/** API base URL: HIMALAYAS_API_URL override or the default. */
export function baseUrl(): string {
  const raw = (process.env.HIMALAYAS_API_URL ?? "").trim()
  return (raw || DEFAULT_BASE_URL).replace(/\/+$/, "")
}

export function writeError(error: string, code: string): void {
  process.stderr.write(JSON.stringify({ error, code }) + "\n")
}

const UA = "himalayas-search-skill/1.0 (+https://himalayas.app)"

export interface HimalayasJob {
  title?: string
  excerpt?: string
  companyName?: string
  companySlug?: string
  description?: string
  pubDate?: string | number
  expiryDate?: string | number
  applicationLink?: string
  guid?: string
  locationRestrictions?: string[]
  seniority?: string[]
  categories?: string[]
}

export interface HimalayasSearchResponse {
  jobs: HimalayasJob[]
  totalCount: number
  offset: number
  limit: number
}

/** Portal-skill contract result. Missing values are `null`, never omitted. */
export interface JobResult {
  id: string
  title: string
  company: string | null
  company_slug: string | null
  location: string | null
  date: string | null
  url: string
  description: string | null
  excerpt: string | null
  seniority: string[] | null
  categories: string[] | null
  application_link: string | null
  expiry_date: string | null
}

export interface JobDetailResult extends JobResult {}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

/**
 * GET JSON from Himalayas. Retries 429/5xx with exponential backoff; connection
 * failures fail fast.
 */
export async function apiGet<T>(path: string): Promise<T> {
  const url = path.startsWith("http") ? path : `${baseUrl()}${path}`
  const maxRetries = 6
  let delay = 500

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    let response: Response
    try {
      response = await fetch(url, {
        headers: { "User-Agent": UA, Accept: "application/json" },
        redirect: "follow",
        signal: AbortSignal.timeout(30000),
      })
    } catch (e) {
      throw new Error(
        `could not reach the Himalayas API at ${baseUrl()} (${e instanceof Error ? e.message : String(e)})`,
      )
    }

    if (response.status === 429 || response.status >= 500) {
      if (attempt === maxRetries) {
        throw new Error(`Himalayas API request failed: ${response.status} ${response.statusText}`)
      }
      await sleep(delay + Math.floor(Math.random() * 500))
      delay = Math.min(delay * 2, 8000)
      continue
    }
    if (!response.ok) {
      throw new Error(`Himalayas API request failed: ${response.status} ${response.statusText}`)
    }
    const body = (await response.json().catch(() => null)) as T | null
    if (body === null) throw new Error("Himalayas API returned an unparseable response body")
    return body
  }
  throw new Error("Himalayas API request failed after retries")
}

/** Slug from guid path `/companies/{company}/jobs/{jobSlug}` or the guid itself. */
export function idFromGuid(guid: string | undefined): string {
  if (!guid) return ""
  const m = guid.match(/\/jobs\/([^/?#]+)/)
  return m ? m[1] : guid
}

/** Normalize API date (ISO string or unix seconds/ms) to ISO string or null. */
export function normalizeDate(raw: string | number | null | undefined): string | null {
  if (raw == null || raw === "") return null
  if (typeof raw === "number") {
    // Himalayas serves pubDate as unix seconds; treat large values as ms.
    const ms = raw < 1e12 ? raw * 1000 : raw
    const d = new Date(ms)
    return Number.isNaN(d.getTime()) ? null : d.toISOString()
  }
  const t = Date.parse(String(raw))
  if (!Number.isNaN(t)) return new Date(t).toISOString()
  return String(raw)
}

export function toResult(j: HimalayasJob): JobResult {
  const guid = j.guid || ""
  const locs = Array.isArray(j.locationRestrictions) ? j.locationRestrictions : []
  return {
    id: idFromGuid(guid) || guid,
    title: j.title || "(untitled)",
    company: j.companyName || null,
    company_slug: j.companySlug || null,
    location: locs.length ? locs.join(", ") : "Remote",
    date: normalizeDate(j.pubDate as string | number | null | undefined),
    url: guid || (j.applicationLink ?? ""),
    description: cleanHtml(j.description) ?? (j.excerpt || null),
    excerpt: j.excerpt || null,
    seniority: Array.isArray(j.seniority) ? j.seniority : null,
    categories: Array.isArray(j.categories) ? j.categories : null,
    application_link: j.applicationLink || null,
    expiry_date: normalizeDate(j.expiryDate as string | number | null | undefined),
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

export function matchesJobage(j: JobResult, jobage: number): boolean {
  if (!jobage || jobage >= 9999) return true
  if (!j.date) return false
  const t = Date.parse(j.date)
  if (Number.isNaN(t)) return false
  const cutoff = Date.now() - jobage * 24 * 60 * 60 * 1000
  return t >= cutoff
}

/**
 * Parse a Himalayas job URL / guid / bare job slug into search hints.
 * Path form: /companies/{companySlug}/jobs/{jobSlug}
 */
export function parseDetailInput(input: string): {
  guid?: string
  companySlug?: string
  jobSlug?: string
  query: string
} | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  const pathMatch = trimmed.match(/\/companies\/([^/?#]+)\/jobs\/([^/?#]+)/i)
  if (pathMatch) {
    return {
      guid: trimmed.startsWith("http") ? trimmed.split(/[?#]/)[0] : undefined,
      companySlug: pathMatch[1],
      jobSlug: pathMatch[2],
      query: pathMatch[2].replace(/-/g, " "),
    }
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return { guid: trimmed.split(/[?#]/)[0], query: trimmed }
  }

  if (/^[a-z0-9][a-z0-9-]*$/i.test(trimmed)) {
    return { jobSlug: trimmed, query: trimmed.replace(/-/g, " ") }
  }

  return { query: trimmed }
}
