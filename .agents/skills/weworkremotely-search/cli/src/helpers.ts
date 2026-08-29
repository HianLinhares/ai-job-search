// Data source: We Work Remotely public RSS feeds.
// Parsed with regex — zero XML dependencies.

export const DEFAULT_BASE_URL = "https://weworkremotely.com"
export const DEFAULT_FEED = `${DEFAULT_BASE_URL}/remote-jobs.rss`

/** Map --category aliases to WWR category RSS paths. */
export const CATEGORY_FEEDS: Record<string, string> = {
  programming: "/categories/remote-programming-jobs.rss",
  "full-stack": "/categories/remote-full-stack-programming-jobs.rss",
  "back-end": "/categories/remote-back-end-programming-jobs.rss",
  "front-end": "/categories/remote-front-end-programming-jobs.rss",
  devops: "/categories/remote-devops-sysadmin-jobs.rss",
  design: "/categories/remote-design-jobs.rss",
  product: "/categories/remote-product-jobs.rss",
  marketing: "/categories/remote-sales-and-marketing-jobs.rss",
  "customer-support": "/categories/remote-customer-support-jobs.rss",
  management: "/categories/remote-management-and-finance-jobs.rss",
  "all": "/remote-jobs.rss",
}

export function baseUrl(): string {
  const raw = (process.env.WWR_BASE_URL ?? "").trim()
  return (raw || DEFAULT_BASE_URL).replace(/\/+$/, "")
}

export function writeError(error: string, code: string): void {
  process.stderr.write(JSON.stringify({ error, code }) + "\n")
}

const UA = "weworkremotely-search-skill/1.0 (+https://weworkremotely.com)"

export interface RssItem {
  title: string
  link: string
  description: string
  pubDate: string | null
}

/** Portal-skill contract result. Missing values are `null`, never omitted. */
export interface JobResult {
  id: string
  title: string
  company: string | null
  location: string | null
  date: string | null
  url: string
  description: string | null
}

export interface JobDetailResult extends JobResult {}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

/**
 * GET text (RSS/HTML). Retries 429/5xx with exponential backoff; connection
 * failures fail fast.
 */
export async function fetchText(url: string): Promise<string> {
  const maxRetries = 6
  let delay = 500

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    let response: Response
    try {
      response = await fetch(url, {
        headers: { "User-Agent": UA, Accept: "application/rss+xml, application/xml, text/xml, text/html, */*" },
        redirect: "follow",
        signal: AbortSignal.timeout(30000),
      })
    } catch (e) {
      throw new Error(
        `could not reach We Work Remotely at ${url} (${e instanceof Error ? e.message : String(e)})`,
      )
    }

    if (response.status === 429 || response.status >= 500) {
      if (attempt === maxRetries) {
        throw new Error(`WWR request failed: ${response.status} ${response.statusText}`)
      }
      await sleep(delay + Math.floor(Math.random() * 500))
      delay = Math.min(delay * 2, 8000)
      continue
    }
    if (!response.ok) {
      throw new Error(`WWR request failed: ${response.status} ${response.statusText}`)
    }
    return await response.text()
  }
  throw new Error("WWR request failed after retries")
}

function tagContent(block: string, tag: string): string {
  const cdata = block.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, "i"))
  if (cdata) return cdata[1].trim()
  const plain = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"))
  return plain ? plain[1].trim() : ""
}

/** Parse RSS `<item>` blocks with regex (no XML deps). */
export function parseRssItems(xml: string): RssItem[] {
  const items: RssItem[] = []
  const re = /<item\b[^>]*>([\s\S]*?)<\/item>/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(xml)) !== null) {
    const block = m[1]
    const title = decodeXml(tagContent(block, "title"))
    const link = decodeXml(tagContent(block, "link"))
    const description = decodeXml(tagContent(block, "description"))
    const pubDate = decodeXml(tagContent(block, "pubDate")) || null
    if (!title && !link) continue
    items.push({ title, link, description, pubDate })
  }
  return items
}

function decodeXml(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&#[xX]([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
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

/** WWR titles are often `Company: Role`. */
export function splitTitle(raw: string): { company: string | null; title: string } {
  const idx = raw.indexOf(":")
  if (idx > 0 && idx < raw.length - 1) {
    return {
      company: raw.slice(0, idx).trim() || null,
      title: raw.slice(idx + 1).trim() || raw,
    }
  }
  return { company: null, title: raw || "(untitled)" }
}

/** Stable id from the job URL path's last segment. */
export function idFromUrl(url: string): string {
  const m = url.match(/\/([^/?#]+)\/?$/)
  return m ? m[1] : url
}

export function toResult(item: RssItem): JobResult {
  const { company, title } = splitTitle(item.title)
  return {
    id: idFromUrl(item.link) || item.link,
    title,
    company,
    location: "Remote",
    date: item.pubDate ? new Date(item.pubDate).toISOString() : null,
    url: item.link,
    description: cleanHtml(item.description),
  }
}

export function feedUrl(category?: string): string {
  if (!category) return `${baseUrl()}/remote-jobs.rss`
  const key = category.trim().toLowerCase()
  const path = CATEGORY_FEEDS[key]
  if (path) return `${baseUrl()}${path}`
  // Allow a raw path fragment like "remote-programming-jobs"
  if (/^[a-z0-9-]+$/i.test(key)) {
    return `${baseUrl()}/categories/${key.startsWith("remote-") ? key : `remote-${key}`}.rss`
  }
  return `${baseUrl()}/remote-jobs.rss`
}

export function matchesQuery(j: JobResult, query: string | undefined): boolean {
  if (!query) return true
  const q = query.trim().toLowerCase()
  if (!q) return true
  const hay = [j.title, j.company ?? "", j.description ?? ""].join(" ").toLowerCase()
  return hay.includes(q)
}

const BR_RE = /\b(brazil|brasil|latam|latin\s*america)\b/i

/** Client-side Brazil/LATAM filter when --country BR. */
export function matchesCountry(j: JobResult, country: string | undefined): boolean {
  if (!country) return true
  const c = country.trim().toUpperCase()
  if (c !== "BR" && c !== "BRAZIL" && c !== "BRASIL") return true
  const hay = [j.title, j.company ?? "", j.description ?? "", j.location ?? ""].join(" ")
  return BR_RE.test(hay)
}

export function matchesJobage(j: JobResult, jobage: number): boolean {
  if (!jobage || jobage >= 9999) return true
  if (!j.date) return false
  const t = Date.parse(j.date)
  if (Number.isNaN(t)) return false
  const cutoff = Date.now() - jobage * 24 * 60 * 60 * 1000
  return t >= cutoff
}

export function normalizeJobUrl(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed) return null
  if (/^https?:\/\/(?:www\.)?weworkremotely\.com\//i.test(trimmed)) {
    return trimmed.split(/[?#]/)[0]
  }
  if (/^[a-z0-9][a-z0-9-]*$/i.test(trimmed)) {
    return `${baseUrl()}/remote-jobs/${trimmed}`
  }
  return null
}
