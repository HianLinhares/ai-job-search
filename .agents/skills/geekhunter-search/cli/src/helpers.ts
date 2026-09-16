// Data source: GeekHunter public HTML board (JSON-LD ItemList / JobPosting).
// Personal use only — /api and /feeds are robots-disallowed; HTML board OK.

export const DEFAULT_BASE_URL = "https://www.geekhunter.com.br"
export const SEARCH_PATH = "/pt/vagas"

/** Site base URL (trailing slash stripped). */
export function baseUrl(): string {
  const raw = (process.env.GEEKHUNTER_BASE_URL ?? "").trim()
  return (raw || DEFAULT_BASE_URL).replace(/\/+$/, "")
}

export function writeError(error: string, code: string): void {
  process.stderr.write(JSON.stringify({ error, code }) + "\n")
}

const UA = "Mozilla/5.0 (compatible; geekhunter-cli/1.0)"

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
}

export interface JobDetailResult extends JobResult {}

export interface ListItem {
  url: string
  name: string
  position?: number
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
          Accept: "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
        },
        redirect: "follow",
        signal: AbortSignal.timeout(30000),
      })
    } catch (e) {
      throw new Error(
        `could not reach GeekHunter at ${url} (${e instanceof Error ? e.message : String(e)})`,
      )
    }

    if (response.status === 404) return null

    if (response.status === 429 || response.status >= 500) {
      if (attempt === maxRetries) {
        throw new Error(`GeekHunter request failed: ${response.status} ${response.statusText}`)
      }
      await sleep(delay + Math.floor(Math.random() * 500))
      delay = Math.min(delay * 2, 8000)
      continue
    }
    if (!response.ok) {
      throw new Error(`GeekHunter request failed: ${response.status} ${response.statusText}`)
    }
    return await response.text()
  }
  throw new Error("GeekHunter request failed after retries")
}

/** Extract and parse all application/ld+json script bodies. */
export function extractJsonLd(html: string): unknown[] {
  const out: unknown[] = []
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) {
    const raw = m[1].trim()
    if (!raw) continue
    try {
      out.push(JSON.parse(raw))
    } catch {
      /* ignore malformed blocks */
    }
  }
  return out
}

function asArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : v != null ? [v] : []
}

function typeOf(obj: Record<string, unknown>): string {
  const t = obj["@type"]
  if (Array.isArray(t)) return t.map(String).join(",")
  return t != null ? String(t) : ""
}

function walkNodes(nodes: unknown[]): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = []
  for (const n of nodes) {
    if (!n || typeof n !== "object") continue
    const obj = n as Record<string, unknown>
    out.push(obj)
    if (Array.isArray(obj["@graph"])) out.push(...walkNodes(obj["@graph"]))
  }
  return out
}

/** Find ItemList elements from JSON-LD documents. */
export function findItemList(html: string): ListItem[] {
  const docs = extractJsonLd(html)
  const items: ListItem[] = []
  for (const node of walkNodes(docs)) {
    if (!/@?ItemList/i.test(typeOf(node)) && !String(node["@type"] ?? "").includes("ItemList")) {
      // also accept when itemListElement is present
      if (!Array.isArray(node.itemListElement)) continue
    }
    const elements = asArray(node.itemListElement)
    for (const el of elements) {
      if (!el || typeof el !== "object") continue
      const e = el as Record<string, unknown>
      const url = String(e.url ?? e["@id"] ?? "").trim()
      const name = String(e.name ?? "").trim()
      if (!url || !name) continue
      items.push({
        url,
        name,
        position: typeof e.position === "number" ? e.position : undefined,
      })
    }
  }
  // Deduplicate by URL
  const seen = new Set<string>()
  return items.filter((i) => {
    if (seen.has(i.url)) return false
    seen.add(i.url)
    return true
  })
}

/** Find JobPosting from JSON-LD documents. */
export function findJobPosting(html: string): Record<string, unknown> | null {
  const docs = extractJsonLd(html)
  for (const node of walkNodes(docs)) {
    if (/JobPosting/i.test(typeOf(node))) return node
  }
  return null
}

/** Parse /pt/{company}/jobs/{job-slug} (or similar) from a GeekHunter URL. */
export function parseJobPath(urlOrPath: string): { company: string | null; slug: string; url: string } | null {
  const trimmed = urlOrPath.trim()
  if (!trimmed) return null

  let absolute = trimmed
  if (trimmed.startsWith("/")) absolute = `${baseUrl()}${trimmed}`
  else if (!/^https?:\/\//i.test(trimmed)) {
    // bare slug path like "acme/jobs/role" or just "role"
    if (trimmed.includes("/jobs/")) absolute = `${baseUrl()}/pt/${trimmed.replace(/^pt\//, "")}`
    else return null
  }

  let pathname: string
  try {
    pathname = new URL(absolute).pathname
  } catch {
    return null
  }

  const m = pathname.match(/\/pt\/([^/]+)\/jobs\/([^/?#]+)/i)
  if (m) {
    return { company: m[1], slug: m[2], url: absolute }
  }
  // Some ItemList URLs may use geekhunter.com without /pt/
  const m2 = pathname.match(/\/([^/]+)\/jobs\/([^/?#]+)/i)
  if (m2 && m2[1].toLowerCase() !== "pt") {
    return { company: m2[1], slug: m2[2], url: absolute }
  }
  return null
}

function humanizeSlug(slug: string): string {
  return slug
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export function listItemToResult(item: ListItem, remote: boolean): JobResult {
  const parsed = parseJobPath(item.url)
  const id = parsed?.slug || item.url
  return {
    id,
    title: item.name || "(untitled)",
    company: parsed?.company ? humanizeSlug(parsed.company) : null,
    location: remote ? "Remoto" : null,
    date: null,
    url: item.url.startsWith("http") ? item.url : `${baseUrl()}${item.url.startsWith("/") ? "" : "/"}${item.url}`,
    description: null,
    work_mode: remote ? "Remoto" : null,
  }
}

export function jobPostingToResult(
  posting: Record<string, unknown>,
  fallbackUrl: string,
): JobDetailResult {
  const parsed = parseJobPath(fallbackUrl)
  const org = posting.hiringOrganization
  let company: string | null = null
  if (typeof org === "string") company = org
  else if (org && typeof org === "object" && "name" in org) {
    company = String((org as { name?: unknown }).name ?? "").trim() || null
  }
  if (!company && parsed?.company) company = humanizeSlug(parsed.company)

  const locType = posting.jobLocationType != null ? String(posting.jobLocationType) : null
  const location =
    locType && /TELECOMMUTE|remote|remoto/i.test(locType)
      ? "Remoto"
      : locType || (parsed ? "Remoto" : null)

  return {
    id: parsed?.slug || fallbackUrl,
    title: String(posting.title ?? "").trim() || "(untitled)",
    company,
    location,
    date: posting.datePosted != null ? String(posting.datePosted) : null,
    url: fallbackUrl,
    description: cleanHtml(
      posting.description != null ? String(posting.description) : null,
    ),
    work_mode: locType,
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

/**
 * Posted within N days. Undated rows are KEPT when jobage is set
 * (search results often have null dates).
 */
export function matchesJobage(j: JobResult, jobage: number): boolean {
  if (!jobage || jobage >= 9999) return true
  if (!j.date) return true
  const t = Date.parse(j.date)
  if (Number.isNaN(t)) return true
  const cutoff = Date.now() - jobage * 24 * 60 * 60 * 1000
  return t >= cutoff
}

export function normalizeId(input: string): string | null {
  const parsed = parseJobPath(input)
  if (parsed) return parsed.url
  const trimmed = input.trim()
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return null
}
