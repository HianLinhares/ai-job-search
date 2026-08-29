# Gupy employability API reference

The endpoints, parameters, and response shapes this skill depends on. Update this
file if the Gupy portal API changes.

Base URL: `https://employability-portal.gupy.io`

This is the **unofficial public employability endpoint** used by
[portal.gupy.io](https://portal.gupy.io/). Not a documented partner API. Personal
use only; respect rate limits.

## Authentication

None. Reads are public JSON. Required request headers (the portal rejects bare
fetches without them):

| Header | Value |
|--------|-------|
| `Accept` | `application/json` |
| `User-Agent` | `Mozilla/5.0` (browser-like) |
| `Referer` | `https://portal.gupy.io/` |

## `GET /api/v1/jobs`

Full-text-ish search by job name with workplace-type and pagination.

| Param | Maps to CLI flag | Notes |
|-------|------------------|-------|
| `jobName` | `--query` / `-q` | **Required** by the API and by this CLI. |
| `workplaceTypes` | `--remote` | `remote` (default) \| `hybrid` \| `onsite`. Omit when `--remote all`. |
| `offset` | (derived) | `offset = (page - 1) * limit`. |
| `limit` | `--limit` / `-n` | Page size. Default 10 in the CLI. |

There is **no** server-side `posted_within_days` or free-text location param.
`--jobage` and `--location` are applied client-side after the response. Country
scope (Brasil/Brazil) is also client-side.

### Response envelope

```jsonc
{
  "data": [ /* Job, … */ ],
  "pagination": { "total": 319, "limit": 10, "offset": 0 }
}
```

### Job object (fields the skill reads)

```jsonc
{
  "id": 12341691,                          // -> result.id (String)
  "name": "Desenvolvedor Full Stack",      // -> title
  "description": "…",                      // HTML-ish / plain; included in search JSON
  "careerPageName": "Acme",                // -> company
  "careerPageUrl": "https://acme.gupy.io/…",
  "publishedDate": "2026-08-28T21:43:42.781Z", // -> date; --jobage filter
  "applicationDeadline": "2026-09-18",
  "isRemoteWork": true,
  "city": "",
  "state": "",
  "country": "Brasil",                     // client Brazil filter when present
  "jobUrl": "https://acme.gupy.io/job/eyJqb2JJZCI6MTIzNDE2OTEsInNvdXJjZSI6Imd1cHlfcG9ydGFsIn0=?jobBoardSource=gupy_portal",
  "workplaceType": "remote",
  "skills": []
}
```

`jobUrl` path segment after `/job/` is often **base64url JSON**
`{"jobId":12341691,"source":"gupy_portal"}` — `detail` can decode that when given
a full URL instead of a numeric id.

## `GET /api/v1/jobs/{id}`

Single job by numeric id. Returns the **job object directly** (not wrapped in
`{ data: … }`). Missing id → 404. The skill's `detail` command maps 404 to
`NOT_FOUND` on stderr.

## Client-side filters

| Filter | Rule |
|--------|------|
| Brazil scope | If `country` is non-empty, keep only when it matches `/brasil|brazil/i`. Empty country → keep. |
| `--jobage N` | Keep when `publishedDate` is within the last N days (UTC). Undated → drop when jobage is set. |
| `--location X` | Case-insensitive substring match on `city` or `state`. |

## Parsing / fetch notes

- Search returns an envelope; detail returns a bare object — the CLI handles both.
- Fetch retries 429/5xx with exponential backoff + jitter (max 6 retries), same
  pattern as freehire helpers. Connection failures fail fast (no retry).
- Descriptions may contain HTML entities / light markup; `detail` strips tags via
  `cleanHtml` for plain output.
