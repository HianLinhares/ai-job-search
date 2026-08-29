// Data source: Remote OK public JSON API (https://remoteok.com/api).
// Reads are unauthenticated. Attribution required per Remote OK API ToS.

export const DEFAULT_BASE_URL = "https://remoteok.com"
export const API_PATH = "/api"

/** API base URL: REMOTEOK_API_URL override or the default. */
export function baseUrl(): string {
  const raw = (process.env.REMOTEOK_API_URL ?? "").trim()
  return (raw || DEFAULT_BASE_URL).replace(/\/+$/, "")
}

export function writeError(error: string, code: string): void {
  process.stderr.write(JSON.stringify({ error, code }) + "\n")
}

const UA = "remoteok-search-skill/1.0 (+https://remoteok.com)"

/** Wire shape of a Remote OK job (legal-notice object lacks slug/position). */
export interface RemoteOkJob {
  id?: string | number
  slug?: string
  position?: string
  company?: string
  location?: string
  date?: string
  description?: string
  tags?: string[]
  url?: string
  epoch?: number
  legal?: string
}

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
  tags: string[] | null
  slug: string | null
}

export interface JobDetailResult extends JobResult {}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

/**
 * GET JSON from Remote OK. Retries 429/5xx with exponential backoff; connection
 * failures fail fast (graceful degradation).
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
        `could not reach the Remote OK API at ${baseUrl()} (${e instanceof Error ? e.message : String(e)})`,
      )
    }

    if (response.status === 429 || response.status >= 500) {
      if (attempt === maxRetries) {
        throw new Error(`Remote OK API request failed: ${response.status} ${response.statusText}`)
      }
      await sleep(delay + Math.floor(Math.random() * 500))
      delay = Math.min(delay * 2, 8000)
      continue
    }
    if (!response.ok) {
      throw new Error(`Remote OK API request failed: ${response.status} ${response.statusText}`)
    }
    const body = (await response.json().catch(() => null)) as T | null
    if (body === null) throw new Error("Remote OK API returned an unparseable response body")
    return body
  }
  throw new Error("Remote OK API request failed after retries")
}

/** True for real job objects (skip the legal-notice first element). */
export function isJob(j: RemoteOkJob): boolean {
  return Boolean(j && (j.slug || j.position) && !j.legal)
}

export function jobUrl(j: RemoteOkJob): string {
  if (j.url) return j.url
  const id = j.id != null ? String(j.id) : j.slug
  return `${DEFAULT_BASE_URL}/remote-jobs/${id}`
}

export function toResult(j: RemoteOkJob): JobResult {
  const id = j.id != null ? String(j.id) : j.slug || ""
  return {
    id,
    title: j.position || "(untitled)",
    company: j.company || null,
    location: j.location || null,
    date: j.date || (j.epoch ? new Date(j.epoch * 1000).toISOString() : null),
    url: jobUrl(j),
    description: cleanHtml(j.description),
    tags: Array.isArray(j.tags) ? j.tags : null,
    slug: j.slug || null,
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

const BR_RE = /\b(br|brazil|brasil)\b/i

/** Client-side Brazil relevance: location or tags mention BR/Brazil/Brasil. */
export function matchesCountry(j: JobResult, country: string | undefined): boolean {
  if (!country) return true
  const c = country.trim().toUpperCase()
  if (c !== "BR" && c !== "BRAZIL" && c !== "BRASIL") return true
  const loc = j.location ?? ""
  const tags = (j.tags ?? []).join(" ")
  return BR_RE.test(loc) || BR_RE.test(tags) || BR_RE.test(j.title) || BR_RE.test(j.company ?? "")
}

/** Client-side keyword filter over title, company, and tags (all tokens must match). */
export function matchesQuery(j: JobResult, query: string | undefined): boolean {
  if (!query) return true
  const tokens = query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
  if (!tokens.length) return true
  const hay = [j.title, j.company ?? "", ...(j.tags ?? [])].join(" ").toLowerCase()
  return tokens.every((t) => hay.includes(t))
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

/** Resolve id / slug / Remote OK URL to a lookup key. */
export function normalizeId(input: string): { id?: string; slug?: string } | null {
  const trimmed = input.trim()
  if (!trimmed) return null
  const urlMatch = trimmed.match(/remoteok\.com\/(?:remote-jobs|l)\/([^/?#]+)/i)
  if (urlMatch) {
    const key = urlMatch[1]
    if (/^\d+$/.test(key)) return { id: key }
    return { slug: key }
  }
  if (/^\d+$/.test(trimmed)) return { id: trimmed }
  if (/^[a-z0-9][a-z0-9-]*$/i.test(trimmed)) return { slug: trimmed }
  return null
}
