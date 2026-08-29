// Data source: Gupy public employability portal API (JSON).
// Unofficial endpoint used by portal.gupy.io — personal use only; respect rate limits.
// Reads are unauthenticated; browser-like headers are required.

export const DEFAULT_BASE_URL = "https://employability-portal.gupy.io"

/** API base URL (trailing slash stripped). */
export function baseUrl(): string {
  const raw = (process.env.GUPY_API_URL ?? "").trim()
  return (raw || DEFAULT_BASE_URL).replace(/\/+$/, "")
}

export function writeError(error: string, code: string): void {
  process.stderr.write(JSON.stringify({ error, code }) + "\n")
}

const UA = "Mozilla/5.0"
const REFERER = "https://portal.gupy.io/"

/**
 * GET JSON from the Gupy employability API. Retries 429/5xx with backoff;
 * returns `null` on 404. Connection failures fail fast (no retry).
 */
export async function apiGet<T>(path: string): Promise<T | null> {
  const url = `${baseUrl()}${path}`
  const maxRetries = 6
  let delay = 500

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    let response: Response
    try {
      response = await fetch(url, {
        headers: {
          Accept: "application/json",
          "User-Agent": UA,
          Referer: REFERER,
        },
        redirect: "follow",
        signal: AbortSignal.timeout(15000),
      })
    } catch (e) {
      throw new Error(
        `could not reach the Gupy API at ${baseUrl()} (${e instanceof Error ? e.message : String(e)})`,
      )
    }

    if (response.status === 429 || response.status >= 500) {
      if (attempt === maxRetries) {
        throw new Error(`Gupy API request failed: ${response.status} ${response.statusText}`)
      }
      await sleep(delay + Math.floor(Math.random() * 500))
      delay = Math.min(delay * 2, 8000)
      continue
    }
    if (response.status === 404) return null

    const body = (await response.json().catch(() => null)) as T | { error?: string } | null
    if (!response.ok) {
      const msg =
        body && typeof body === "object" && "error" in body && body.error
          ? String(body.error)
          : `Gupy API request failed: ${response.status} ${response.statusText}`
      throw new Error(msg)
    }
    if (body === null) throw new Error("Gupy API returned an unparseable response body")
    return body as T
  }
  throw new Error("Gupy API request failed after retries")
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

/** Wire shape of a Gupy job (fields this skill reads). */
export interface GupyJob {
  id: number | string
  name?: string
  description?: string | null
  careerPageName?: string | null
  careerPageUrl?: string | null
  publishedDate?: string | null
  applicationDeadline?: string | null
  isRemoteWork?: boolean
  city?: string | null
  state?: string | null
  country?: string | null
  jobUrl?: string | null
  workplaceType?: string | null
  skills?: string[] | null
}

/** Portal-skill contract search result. */
export interface JobResult {
  id: string
  title: string
  company: string | null
  location: string | null
  date: string | null
  url: string
  description: string | null
  workplace_type: string | null
  skills: string[]
}

export interface JobDetailResult extends JobResult {
  application_deadline: string | null
  is_remote: boolean | null
  career_page_url: string | null
}

/** Join city/state/country, or "Remoto" when remote and location parts are empty. */
export function formatLocation(j: GupyJob): string {
  const parts = [j.city, j.state, j.country]
    .map((p) => (typeof p === "string" ? p.trim() : ""))
    .filter(Boolean)
  if (parts.length > 0) return parts.join(", ")
  if (j.isRemoteWork || (j.workplaceType ?? "").toLowerCase() === "remote") return "Remoto"
  return "Remoto"
}

export function toResult(j: GupyJob): JobResult {
  const id = String(j.id)
  return {
    id,
    title: (j.name || "").trim() || "(untitled)",
    company: j.careerPageName?.trim() || null,
    location: formatLocation(j),
    date: j.publishedDate ?? null,
    url: j.jobUrl?.trim() || `${baseUrl()}/api/v1/jobs/${id}`,
    description: j.description ?? null,
    workplace_type: j.workplaceType ?? null,
    skills: Array.isArray(j.skills) ? j.skills : [],
  }
}

export function toDetail(j: GupyJob): JobDetailResult {
  return {
    ...toResult(j),
    description: cleanHtml(j.description),
    application_deadline: j.applicationDeadline ?? null,
    is_remote: typeof j.isRemoteWork === "boolean" ? j.isRemoteWork : null,
    career_page_url: j.careerPageUrl ?? null,
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

/** Strip light HTML from a description into readable prose. */
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

/** Keep jobs whose country is Brasil/Brazil when country is present; empty country kept. */
export function isBrazilScoped(j: GupyJob): boolean {
  const c = (j.country ?? "").trim()
  if (!c) return true
  return /^(brasil|brazil)$/i.test(c)
}

/** True when publishedDate is within the last `days` days (UTC). Undated → false. */
export function withinJobAge(publishedDate: string | null | undefined, days: number): boolean {
  if (!publishedDate) return false
  const t = Date.parse(publishedDate)
  if (Number.isNaN(t)) return false
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000
  return t >= cutoff
}

/** Case-insensitive substring match on city or state. */
export function matchesLocation(j: GupyJob, location: string): boolean {
  const needle = location.trim().toLowerCase()
  if (!needle) return true
  const city = (j.city ?? "").toLowerCase()
  const state = (j.state ?? "").toLowerCase()
  return city.includes(needle) || state.includes(needle)
}

/**
 * Decode a Gupy jobUrl path segment that is base64 JSON `{"jobId":N,...}`.
 */
export function decodeJobIdFromBase64(segment: string): string | null {
  try {
    const padded = segment.replace(/-/g, "+").replace(/_/g, "/")
    const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4))
    const json = Buffer.from(padded + pad, "base64").toString("utf8")
    const obj = JSON.parse(json) as { jobId?: number | string }
    if (obj.jobId != null && String(obj.jobId).trim() !== "") return String(obj.jobId)
  } catch {
    /* not a Gupy jobId payload */
  }
  return null
}

/**
 * Extract a numeric Gupy job id from a bare id, `/jobs/<id>` / `/job/<id>` path,
 * or a jobUrl whose path carries a base64 `jobId` payload. Prefers numeric forms.
 */
export function normalizeJobId(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed) return null
  if (/^\d+$/.test(trimmed)) return trimmed

  const pathNum = trimmed.match(/\/jobs?\/(\d+)(?:[/?#]|$)/i)
  if (pathNum) return pathNum[1]

  const pathB64 = trimmed.match(/\/jobs?\/([A-Za-z0-9_-]+=*)/i)
  if (pathB64) {
    const id = decodeJobIdFromBase64(pathB64[1])
    if (id) return id
  }

  for (const part of trimmed.split(/[/?#&=]/)) {
    if (part.length >= 8 && /^[A-Za-z0-9+/_-]+=*$/.test(part)) {
      const id = decodeJobIdFromBase64(part)
      if (id) return id
    }
  }
  return null
}
