# Wellfound SSR landing reference

Endpoints and shapes this skill depends on. Base URL defaults to
`https://wellfound.com` (overridable via `WELLFOUND_BASE_URL`).

## Authentication

None. Public HTML SSR landings — personal use only; respect rate limits.

**Do not use:** `/search` (robots-disallowed) or GraphQL (behind Turnstile).

## Search landings (HTML)

Always fetched:

| Path | Role |
|------|------|
| `/role/l/software-engineer/brazil` | Brazil software-engineer corpus |

Also fetched when available (404 skipped silently):

| Path | Role |
|------|------|
| `/role/l/software-engineer/remote` | Broader remote software-engineer corpus |
| `/role/r/software-engineer/remote` | Alternate remote path (often 404) |

User-Agent: `Mozilla/5.0 (compatible; wellfound-cli/1.0)`.

### Parsing `__NEXT_DATA__`

```text
<script id="__NEXT_DATA__" type="application/json">…</script>
→ props.pageProps.apolloState.data
```

| Key prefix | Meaning |
|------------|---------|
| `JobListingSearchResult:*` | Job objects |
| `StartupResult:*` | Companies; `highlightedJobListings[].__ref` → job id → `name` |

Job fields this skill reads:

```jsonc
{
  "id": "4658959",
  "title": "Software Engineering Manager",
  "slug": "software-engineering-manager",
  "description": "…",
  "liveStartAt": 1788301391,
  "remote": true,
  "locationNames": ["São Paulo"],
  "acceptedRemoteLocationNames": ["Brazil"]
}
```

Public job URL: `https://wellfound.com/jobs/{id}-{slug}`.

## Detail pages

`GET /jobs/{id}-{slug}` HTML. Prefer schema.org `JobPosting` JSON-LD. If the
page is blocked / missing structured data, fall back to landing-page lookup by id.

## Client-side filters (CLI)

| Flag | Behavior |
|------|----------|
| `--query` / `-q` | All whitespace tokens must appear in title, company, or description |
| `--remote` (default true) | Keep `remote===true` OR locations mentioning Brazil/Brasil/Remote |
| `--country` | Optional: keep jobs whose location text matches the country token |
| `--jobage` | Keep postings with `liveStartAt` within N days |
| `--page` / `--limit` | Client pagination over the filtered set |

## Networking

User-Agent `Mozilla/5.0 (compatible; wellfound-cli/1.0)`, `Accept: text/html`,
exponential backoff with jitter on 429/5xx (max 6 retries). Connection errors fail fast.
