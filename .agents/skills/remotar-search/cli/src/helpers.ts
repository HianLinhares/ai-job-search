// Data source: Remotar public JSON API (https://api.remotar.com.br).
// Unofficial endpoint — personal use only; respect rate limits.

export const DEFAULT_BASE_URL = "https://api.remotar.com.br"
export const PUBLIC_SITE = "https://remotar.com.br"

/** API base URL: REMOTAR_API_URL override or the default. */
export function baseUrl(): string {
  const raw = (process.env.REMOTAR_API_URL ?? "").trim()
  return (raw || DEFAULT_BASE_URL).replace(/\/+$/, "")
}

export function writeError(error: string, code: string): void {
  process.stderr.write(JSON.stringify({ error, code }) + "\n")
}

const UA = "Mozilla/5.0 (compatible; remotar-cli/1.0)"

export interface RemotarCompany {
  name?: string | null
}

export interface RemotarJobTag {
  tag?: { name?: string | null } | null
}

/** Wire shape of a Remotar job. */
export interface RemotarJob {
  id?: string | number
  title?: string | null
  description?: string | null
  type?: string | null
  createdAt?: string | null
  externalLink?: string | null
  company?: RemotarCompany | string | null
  companyDisplayName?: string | null
  city?: string | null
  state?: string | null
  country?: string | null
  jobTags?: RemotarJobTag[] | null
}

export interface RemotarSearchMeta {
  total?: number
  per_page?: number
  current_page?: number
  last_page?: number
}

export interface RemotarSearchEnvelope {
  meta?: RemotarSearchMeta
  data?: RemotarJob[]
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
  work_mode: string | null
  tags: string[] | null
}

export interface JobDetailResult extends JobResult {}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

/**
 * GET JSON from Remotar. Retries 429/5xx with exponential backoff; connection
 * failures fail fast. Returns `null` on 404.
 */
export async function apiGet<T>(path: string): Promise<T | null> {
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
        `could not reach the Remotar API at ${baseUrl()} (${e instanceof Error ? e.message : String(e)})`,
      )
    }

    if (response.status === 404) return null

    if (response.status === 429 || response.status >= 500) {
      if (attempt === maxRetries) {
        throw new Error(`Remotar API request failed: ${response.status} ${response.statusText}`)
      }
      await sleep(delay + Math.floor(Math.random() * 500))
      delay = Math.min(delay * 2, 8000)
      continue
    }
    if (!response.ok) {
      throw new Error(`Remotar API request failed: ${response.status} ${response.statusText}`)
    }
    const body = (await response.json().catch(() => null)) as T | null
    if (body === null) throw new Error("Remotar API returned an unparseable response body")
    return body
  }
  throw new Error("Remotar API request failed after retries")
}

export function companyName(j: RemotarJob): string | null {
  if (typeof j.company === "string" && j.company.trim()) return j.company.trim()
  if (j.company && typeof j.company === "object" && j.company.name?.trim()) {
    return j.company.name.trim()
  }
  if (j.companyDisplayName?.trim()) return j.companyDisplayName.trim()
  return null
}

export function formatLocation(j: RemotarJob): string {
  const parts = [j.city, j.state]
    .map((p) => (typeof p === "string" ? p.trim() : ""))
    .filter(Boolean)
  if (parts.length > 0) return parts.join(", ")
  const type = (j.type ?? "").toLowerCase()
  if (type === "remote" || type === "remoto") return "Remoto · Brasil"
  return j.country?.trim() || "Remoto · Brasil"
}

export function jobUrl(j: RemotarJob): string {
  if (j.externalLink?.trim()) return j.externalLink.trim()
  const id = j.id != null ? String(j.id) : ""
  return `${PUBLIC_SITE}/job/${id}`
}

export function extractTags(j: RemotarJob): string[] | null {
  if (!Array.isArray(j.jobTags) || j.jobTags.length === 0) return null
  const names = j.jobTags
    .map((t) => t?.tag?.name?.trim())
    .filter((n): n is string => Boolean(n))
  return names.length ? names : null
}

export function toResult(j: RemotarJob): JobResult {
  const id = j.id != null ? String(j.id) : ""
  return {
    id,
    title: (j.title || "").trim() || "(untitled)",
    company: companyName(j),
    location: formatLocation(j),
    date: j.createdAt ?? null,
    url: jobUrl(j),
    description: cleanHtml(j.description),
    work_mode: j.type?.trim() || null,
    tags: extractTags(j),
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

/** Posted within N days (jobage); 9999 / unset = no filter. */
export function matchesJobage(j: JobResult, jobage: number): boolean {
  if (!jobage || jobage >= 9999) return true
  if (!j.date) return false
  const t = Date.parse(j.date)
  if (Number.isNaN(t)) return false
  const cutoff = Date.now() - jobage * 24 * 60 * 60 * 1000
  return t >= cutoff
}

/** Resolve id or Remotar URL to a numeric id string. */
export function normalizeId(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed) return null
  if (/^\d+$/.test(trimmed)) return trimmed
  const urlMatch = trimmed.match(/remotar\.com\.br\/job\/(\d+)/i)
  if (urlMatch) return urlMatch[1]
  const apiMatch = trimmed.match(/\/jobs\/(\d+)(?:[/?#]|$)/i)
  if (apiMatch) return apiMatch[1]
  return null
}

/** Unwrap detail responses that may be bare job or `{ data: job }`. */
export function unwrapJob(body: RemotarJob | { data?: RemotarJob } | null): RemotarJob | null {
  if (!body || typeof body !== "object") return null
  if ("data" in body && body.data && typeof body.data === "object") return body.data
  if ("id" in body || "title" in body) return body as RemotarJob
  return null
}
