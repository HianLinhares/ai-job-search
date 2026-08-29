import {
  apiGet,
  idFromGuid,
  parseDetailInput,
  toResult,
  writeError,
  type HimalayasJob,
  type HimalayasSearchResponse,
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
    job.seniority?.length ? `Seniority: ${job.seniority.join(", ")}` : "",
    job.categories?.length ? `Categories: ${job.categories.join(", ")}` : "",
    "",
    job.description || "(no description)",
    "",
    `URL: ${job.url}`,
    `id: ${job.id}`,
  ].filter((l) => l !== "")
  return lines.join("\n")
}

function matches(job: HimalayasJob, parsed: NonNullable<ReturnType<typeof parseDetailInput>>): boolean {
  const guid = job.guid || ""
  if (parsed.guid && (guid === parsed.guid || guid.startsWith(parsed.guid))) return true
  const slug = idFromGuid(guid)
  if (parsed.jobSlug && (slug === parsed.jobSlug || guid.includes(`/jobs/${parsed.jobSlug}`))) return true
  if (parsed.companySlug && job.companySlug === parsed.companySlug && parsed.jobSlug) {
    return slug === parsed.jobSlug
  }
  return false
}

async function findJob(parsed: NonNullable<ReturnType<typeof parseDetailInput>>): Promise<HimalayasJob | null> {
  // Prefer search with slug-derived query; fall back to browse feed.
  const attempts: string[] = []
  if (parsed.query) {
    const p = new URLSearchParams({ q: parsed.query, limit: "50", offset: "0" })
    attempts.push(`/jobs/api/search?${p.toString()}`)
  }
  if (parsed.companySlug) {
    const p = new URLSearchParams({ q: parsed.companySlug, limit: "50", offset: "0" })
    attempts.push(`/jobs/api/search?${p.toString()}`)
  }
  attempts.push("/jobs/api?limit=100&offset=0")

  for (const path of attempts) {
    const body = await apiGet<HimalayasSearchResponse>(path)
    const hit = (body.jobs ?? []).find((j) => matches(j, parsed))
    if (hit) return hit
  }
  return null
}

export async function runDetail(opts: DetailOpts): Promise<number> {
  const parsed = parseDetailInput(opts.id)
  if (!parsed) {
    writeError(`could not parse a Himalayas job id/url from "${opts.id}"`, "BAD_ID")
    return 1
  }
  try {
    const found = await findJob(parsed)
    if (!found) {
      writeError("job not found", "NOT_FOUND")
      return 1
    }
    const job = toResult(found)
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
