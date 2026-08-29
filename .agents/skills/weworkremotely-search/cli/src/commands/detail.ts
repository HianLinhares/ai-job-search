import {
  cleanHtml,
  feedUrl,
  fetchText,
  idFromUrl,
  normalizeJobUrl,
  parseRssItems,
  splitTitle,
  toResult,
  writeError,
  type JobDetailResult,
} from "../helpers.js"

export interface DetailOpts {
  id: string
  format: "json" | "plain"
}

function renderPlain(job: JobDetailResult): string {
  const lines = [
    job.title,
    `${job.company ?? "—"} · ${job.location ?? "—"}`,
    job.date ? `Posted: ${job.date.slice(0, 10)}` : "",
    "",
    job.description || "(no description)",
    "",
    `URL: ${job.url}`,
    `id: ${job.id}`,
  ].filter((l) => l !== "")
  return lines.join("\n")
}

async function detailFromRss(url: string): Promise<JobDetailResult | null> {
  // Search common feeds for the item first (keeps description from RSS).
  const feeds = [feedUrl(), feedUrl("programming"), feedUrl("devops"), feedUrl("design")]
  for (const feed of feeds) {
    try {
      const xml = await fetchText(feed)
      const hit = parseRssItems(xml).find((i) => i.link.split(/[?#]/)[0] === url || i.link.includes(idFromUrl(url)))
      if (hit) return toResult(hit)
    } catch {
      // try next feed
    }
  }
  return null
}

async function detailFromHtml(url: string): Promise<JobDetailResult> {
  const html = await fetchText(url)
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  const rawTitle = titleMatch ? titleMatch[1].replace(/\s*[|\-–].*$/, "").trim() : ""
  const { company, title } = splitTitle(rawTitle || "(untitled)")
  // Prefer the listing body region when present; otherwise strip whole page.
  const listing =
    html.match(/<div[^>]*class="[^"]*listing-container[^"]*"[^>]*>([\s\S]*?)<\/div>/i)?.[1] ??
    html.match(/<article[^>]*>([\s\S]*?)<\/article>/i)?.[1] ??
    html
  return {
    id: idFromUrl(url),
    title,
    company,
    location: "Remote",
    date: null,
    url,
    description: cleanHtml(listing),
  }
}

export async function runDetail(opts: DetailOpts): Promise<number> {
  const url = normalizeJobUrl(opts.id)
  if (!url) {
    writeError(`could not parse a We Work Remotely URL from "${opts.id}"`, "BAD_ID")
    return 1
  }
  try {
    let job = await detailFromRss(url)
    if (!job) job = await detailFromHtml(url)

    if (opts.format === "plain") {
      process.stdout.write(renderPlain(job) + "\n")
    } else {
      process.stdout.write(JSON.stringify(job, null, 2) + "\n")
    }
    return 0
  } catch (e) {
    writeError(e instanceof Error ? e.message : String(e), "DETAIL_FAILED")
    return 1
  }
}
