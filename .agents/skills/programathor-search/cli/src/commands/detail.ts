import {
  DETAIL_UNAVAILABLE,
  fetchHtml,
  jobUrl,
  minimalFromInput,
  normalizeId,
  parseDetailHtml,
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
    job.work_mode ? `Work mode: ${job.work_mode}` : "",
    "",
    job.description || "(no description)",
    "",
    `URL: ${job.url}`,
    `id: ${job.id}`,
  ].filter((l) => l !== "")
  return lines.join("\n")
}

function emit(job: JobDetailResult, format: DetailOpts["format"]): number {
  if (format === "plain") {
    process.stdout.write(renderPlain(job) + "\n")
  } else {
    process.stdout.write(JSON.stringify(job, null, 2) + "\n")
  }
  return 0
}

export async function runDetail(opts: DetailOpts): Promise<number> {
  const key = normalizeId(opts.id)
  if (!key) {
    writeError(`could not parse a Programathor id from "${opts.id}"`, "BAD_ID")
    return 1
  }

  const fallback = minimalFromInput(opts.id) ?? {
    id: key.id,
    title: key.id,
    company: null,
    location: "Remoto",
    date: null,
    url: jobUrl(key.id, key.slug),
    description: DETAIL_UNAVAILABLE,
    work_mode: "remoto",
  }

  // Prefer slug URL when known; otherwise try /jobs/{id} (may redirect or 500)
  const candidates = key.slug
    ? [jobUrl(key.id, key.slug)]
    : [jobUrl(key.id), fallback.url]

  try {
    for (const url of candidates) {
      const res = await fetchHtml(url, { maxRetries: 2, throwOnServerError: false })
      if (res === null) continue
      if (res.status >= 500) {
        return emit({ ...fallback, url, description: DETAIL_UNAVAILABLE }, opts.format)
      }
      if (!res.text || res.text.length < 50) {
        return emit({ ...fallback, url, description: DETAIL_UNAVAILABLE }, opts.format)
      }
      const job = parseDetailHtml(res.text, { ...fallback, url, description: null })
      if (!job.title || job.title === key.id) {
        // Unparseable body — still exit 0 with what we have
        return emit(
          { ...job, description: job.description ?? DETAIL_UNAVAILABLE },
          opts.format,
        )
      }
      return emit(job, opts.format)
    }
    // All 404 — still return minimal if we have a parseable id
    return emit({ ...fallback, description: DETAIL_UNAVAILABLE }, opts.format)
  } catch (e) {
    // Network/unexpected: prefer graceful degrade over DETAIL_FAILED when id is known
    return emit(
      {
        ...fallback,
        description: DETAIL_UNAVAILABLE,
      },
      opts.format,
    )
  }
}
