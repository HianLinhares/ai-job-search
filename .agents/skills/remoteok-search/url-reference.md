# Remote OK API reference

Endpoints and shapes this skill depends on. Base URL defaults to
`https://remoteok.com` (overridable via `REMOTEOK_API_URL`).

## Authentication

None. Public read-only JSON.

## Attribution

Remote OK requires credit + link-back to https://remoteok.com when using API data.

## `GET /api`

Optional query: `?tag=<tag>` (e.g. `dev`, `javascript`, `python`).

Response: a JSON **array**. Element `[0]` is a legal-notice object (`legal` field,
no `slug`/`position`) — **skip it**. Remaining elements are jobs:

```jsonc
{
  "id": "123456",
  "slug": "remote-company-role",
  "position": "Senior Engineer",
  "company": "Acme",
  "location": "Worldwide",
  "date": "2026-08-01T12:00:00+00:00",
  "epoch": 1722513600,
  "description": "<p>…</p>",
  "tags": ["dev", "javascript"],
  "url": "https://remoteok.com/l/…"
}
```

If `url` is absent, construct `https://remoteok.com/remote-jobs/{id}`.

## Client-side filters (CLI)

| Flag | Behavior |
|------|----------|
| `--query` | Substring match on title, company, tags |
| `--country BR` | Keep hits whose location/tags/title/company match BR/Brazil/Brasil |
| `--jobage` | Keep postings with `date` within N days |
| `--page` / `--limit` | Slice the filtered list |

## Detail

There is no per-job JSON endpoint. `detail` re-fetches `/api` and matches by
`id` / `slug` / URL path.

## Networking

Browser-ish User-Agent, `Accept: application/json`, exponential backoff with
jitter on 429/5xx (max 6 retries). Connection errors fail fast.
