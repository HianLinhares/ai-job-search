// Data source: Programathor public HTML job board (https://programathor.com.br).
// Personal use only. Detail pages often return HTTP 500.

export const DEFAULT_BASE_URL = "https://programathor.com.br"
export const SEARCH_PATH = "/jobs"
export const DETAIL_UNAVAILABLE = "(detalhe indisponível no portal)"

/** Site base URL (trailing slash stripped). */
export function baseUrl(): string {
  const raw = (process.env.PROGRAMATHOR_BASE_URL ?? "").trim()
  return (raw || DEFAULT_BASE_URL).replace(/\/+$/, "")
}

export function writeError(error: string, code: string): void {
  process.stderr.write(JSON.stringify({ error, code }) + "\n")
}

const UA = "Mozilla/5.0 (compatible; programathor-cli/1.0)"

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

export interface ParsedCard {
  href: string
  id: string
  slug: string
  title: string
  company: string | null
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

export interface FetchResult {
  status: number
  text: string
}

/**
 * GET HTML. Retries 429/5xx up to maxRetries; on final 5xx returns status+body
 * instead of throwing (detail command needs graceful degrade). Connection
 * failures still throw. Returns null body marker via status 404.
 */
export async function fetchHtml(
  url: string,
  opts: { maxRetries?: number; throwOnServerError?: boolean } = {},
): Promise<FetchResult | null> {
  const maxRetries = opts.maxRetries ?? 6
  const throwOnServerError = opts.throwOnServerError ?? true
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
        `could not reach Programathor at ${url} (${e instanceof Error ? e.message : String(e)})`,
      )
    }

    if (response.status === 404) return null

    if (response.status === 429 || response.status >= 500) {
      if (attempt === maxRetries) {
        if (!throwOnServerError) {
          const text = await response.text().catch(() => "")
          return { status: response.status, text }
        }
        throw new Error(`Programathor request failed: ${response.status} ${response.statusText}`)
      }
      await sleep(delay + Math.floor(Math.random() * 500))
      delay = Math.min(delay * 2, 8000)
      continue
    }
    if (!response.ok) {
      throw new Error(`Programathor request failed: ${response.status} ${response.statusText}`)
    }
    return { status: response.status, text: await response.text() }
  }
  throw new Error("Programathor request failed after retries")
}

function stripTags(html: string): string {
  return decodeHtmlEntities(html.replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim()
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

function humanizeSlug(slug: string): string {
  return slug
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

/** Parse href like /jobs/12345-senior-dev into id + slug. */
export function parseJobHref(href: string): { id: string; slug: string; path: string } | null {
  const m = href.match(/\/jobs\/(\d+)-([^/?#"'\s]+)/i)
  if (!m) return null
  return { id: m[1], slug: m[2], path: `/jobs/${m[1]}-${m[2]}` }
}

/**
 * Extract job cards from Programathor list HTML.
 * Prefer splitting on cell-list; also match /jobs/{id}-{slug} anchors.
 */
export function parseJobCards(html: string): ParsedCard[] {
  const cards: ParsedCard[] = []
  const seen = new Set<string>()

  // Prefer per-card blocks. Match `cell-list` but NOT `cell-list-content`.
  const chunks = /class="cell-list[\s"]/i.test(html)
    ? html.split(/(?=<div class="cell-list[\s"])/i).filter((c) => /class="cell-list[\s"]/i.test(c))
    : [html]

  for (const chunk of chunks.length ? chunks : [html]) {
    const linkRe = /<a[^>]+href=["'](\/jobs\/\d+-[^"'?#]+)/gi
    let lm: RegExpExecArray | null
    while ((lm = linkRe.exec(chunk)) !== null) {
      const href = lm[1]
      const parsed = parseJobHref(href)
      if (!parsed || seen.has(parsed.id)) continue

      // Forward-biased window: h3 sits after a long logo <img> URL.
      const start = Math.max(0, lm.index - 100)
      const end = Math.min(chunk.length, lm.index + 3500)
      const window = chunk.slice(start, end)

      let title = ""
      const h3 = window.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i)
      if (h3) title = stripTags(h3[1])

      let company: string | null = null
      const logoAlt = window.match(/<img[^>]+alt=["']([^"']+)["'][^>]*>/i)
      if (logoAlt) {
        const alt = logoAlt[1].trim()
        if (alt && (!title || alt.toLowerCase() !== title.toLowerCase())) {
          company = alt
        }
        if (!title) title = alt
      }

      if (!title) title = humanizeSlug(parsed.slug)

      seen.add(parsed.id)
      cards.push({
        href: parsed.path,
        id: parsed.id,
        slug: parsed.slug,
        title,
        company,
      })
    }
  }

  return cards
}

export function cardToResult(card: ParsedCard, remote: boolean): JobResult {
  return {
    id: card.id,
    title: card.title || "(untitled)",
    company: card.company,
    location: remote ? "Remoto" : null,
    date: null,
    url: `${baseUrl()}${card.href}`,
    description: null,
    work_mode: remote ? "remoto" : null,
  }
}

/** Build a minimal result from an id/url when detail HTML is unavailable. */
export function minimalFromInput(input: string, remote = true): JobResult | null {
  const key = normalizeId(input)
  if (!key) return null
  const href = key.slug ? `/jobs/${key.id}-${key.slug}` : `/jobs/${key.id}`
  return {
    id: key.id,
    title: key.slug ? humanizeSlug(key.slug) : key.id,
    company: null,
    location: remote ? "Remoto" : null,
    date: null,
    url: `${baseUrl()}${href.startsWith("/jobs/") ? href : `/jobs/${key.id}`}`,
    description: DETAIL_UNAVAILABLE,
    work_mode: remote ? "remoto" : null,
  }
}

/**
 * Try to enrich a detail page: title from h1/h3, company from logo, description
 * from common content wrappers.
 */
export function parseDetailHtml(html: string, fallback: JobResult): JobDetailResult {
  let title = fallback.title
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)
  if (h1) title = stripTags(h1[1]) || title
  else {
    const h3 = html.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i)
    if (h3) title = stripTags(h3[1]) || title
  }

  let company = fallback.company
  const logo = html.match(/<img[^>]+alt=["']([^"']+)["'][^>]*>/i)
  if (logo) {
    const alt = logo[1].trim()
    if (alt && alt.toLowerCase() !== title.toLowerCase()) company = alt
  }

  let description: string | null = null
  const descBlock =
    html.match(/<div[^>]+class=["'][^"']*(?:job-description|description|job_description)[^"']*["'][^>]*>([\s\S]*?)<\/div>/i) ||
    html.match(/<article[^>]*>([\s\S]*?)<\/article>/i)
  if (descBlock) description = cleanHtml(descBlock[1])

  return {
    ...fallback,
    title,
    company,
    description,
  }
}

/**
 * Posted within N days. Undated rows are KEPT when jobage is set.
 */
export function matchesJobage(j: JobResult, jobage: number): boolean {
  if (!jobage || jobage >= 9999) return true
  if (!j.date) return true
  const t = Date.parse(j.date)
  if (Number.isNaN(t)) return true
  const cutoff = Date.now() - jobage * 24 * 60 * 60 * 1000
  return t >= cutoff
}

/** Resolve id, /jobs/{id}-{slug}, or full URL. */
export function normalizeId(input: string): { id: string; slug?: string } | null {
  const trimmed = input.trim()
  if (!trimmed) return null
  if (/^\d+$/.test(trimmed)) return { id: trimmed }

  const fromHref = parseJobHref(trimmed)
  if (fromHref) return { id: fromHref.id, slug: fromHref.slug }

  try {
    const u = new URL(trimmed)
    const p = parseJobHref(u.pathname)
    if (p) return { id: p.id, slug: p.slug }
  } catch {
    /* not a URL */
  }
  return null
}

export function jobUrl(id: string, slug?: string): string {
  if (slug) return `${baseUrl()}/jobs/${id}-${slug}`
  return `${baseUrl()}/jobs/${id}`
}
