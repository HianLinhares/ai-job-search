# Himalayas.app API reference

Endpoints and shapes this skill depends on. Base URL defaults to
`https://himalayas.app` (overridable via `HIMALAYAS_API_URL`).

## Authentication

None. Public read-only JSON.

## `GET /jobs/api/search`

Query params used by the skill:

| Param | Maps to CLI | Notes |
|-------|-------------|-------|
| `q` | `--query` / `-q` | Keyword search |
| `country` | `--country` | e.g. `BR` |
| `limit` | `--limit` | Page size |
| `offset` | (derived) | `(page - 1) * limit` |

## `GET /jobs/api`

Browse (no `q`). Same `limit` / `offset` / optional `country`.

## Response envelope

```jsonc
{
  "jobs": [ /* HimalayasJob */ ],
  "totalCount": 123,
  "offset": 0,
  "limit": 20
}
```

### Job object (fields the skill reads)

```jsonc
{
  "title": "Senior Engineer",
  "excerpt": "…",
  "companyName": "Acme",
  "companySlug": "acme",
  "description": "<p>…</p>",
  "pubDate": "2026-08-01T12:00:00.000Z",
  "expiryDate": "2026-09-01T12:00:00.000Z",
  "applicationLink": "https://…",
  "guid": "https://himalayas.app/companies/acme/jobs/senior-engineer",
  "locationRestrictions": ["Brazil", "Canada"],
  "seniority": ["senior"],
  "categories": ["Engineering"]
}
```

CLI mapping:
- `id` ← slug from `/jobs/{slug}` in `guid`, else `guid`
- `url` ← `guid`
- `company` ← `companyName`
- `location` ← `locationRestrictions.join(", ")` or `"Remote"`
- `date` ← `pubDate`

## Detail strategy

Job HTML pages are not JSON. `detail` extracts `companySlug` / `jobSlug` from
`/companies/{slug}/jobs/{jobSlug}`, calls search with a query derived from the
job slug, and matches the returned `guid`. Falls back to browse `/jobs/api`.

## Networking

Browser-ish User-Agent, `Accept: application/json`, exponential backoff with
jitter on 429/5xx (max 6 retries). Connection errors fail fast.
