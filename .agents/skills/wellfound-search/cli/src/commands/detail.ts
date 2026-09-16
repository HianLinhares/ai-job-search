import {
  baseUrl,
  fetchHtml,
  fetchLandingJobs,
  findJobPosting,
  jobPostingToResult,
  looksBlocked,
  normalizeId,
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
    job.slug ? `Slug: ${job.slug}` : "",
    "",
    job.description || "(no description)",
    "",
    `URL: ${job.url}`,
    `id: ${job.id}`,
  ].filter((l) => l !== "")
  return lines.join("\n")
}

export async function runDetail(opts: DetailOpts): Promise<number> {
  const parsed = normalizeId(opts.id)
  if (!parsed) {
    writeError(`could not parse a Wellfound id from "${opts.id}"`, "BAD_ID")
    return 1
  }
  try {
    let landingJob: JobDetailResult | null = null
    const ensureLanding = async (): Promise<JobDetailResult | null> => {
      if (landingJob) return landingJob
      const jobs = await fetchLandingJobs()
      landingJob = jobs.find((j) => j.id === parsed.id) ?? null
      return landingJob
    }

    let detailUrl = parsed.url
    if (!detailUrl) {
      const fromLanding = await ensureLanding()
      if (fromLanding) detailUrl = fromLanding.url
    }

    let job: JobDetailResult | null = null

    if (detailUrl) {
      const html = await fetchHtml(detailUrl)
      if (html && !looksBlocked(html)) {
        const posting = findJobPosting(html)
        if (posting) {
          job = jobPostingToResult(posting, detailUrl, parsed.id)
          const fromLanding = await ensureLanding()
          if (fromLanding) {
            job = {
              ...job,
              company: job.company ?? fromLanding.company,
              location: fromLanding.location ?? job.location,
              work_mode: fromLanding.work_mode ?? job.work_mode,
              slug: job.slug ?? fromLanding.slug,
              date: job.date ?? fromLanding.date,
              description: job.description ?? fromLanding.description,
            }
          }
        }
      }
    }

    if (!job) {
      job = await ensureLanding()
    }

    if (!job) {
      writeError("job not found", "NOT_FOUND")
      return 1
    }

    if (!job.url.includes(`/${job.id}`) && job.slug) {
      job = { ...job, url: `${baseUrl()}/jobs/${job.id}-${job.slug}` }
    }

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
