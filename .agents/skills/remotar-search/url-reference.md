# Remotar API reference

Endpoints and shapes this skill depends on. Base URL defaults to
`https://api.remotar.com.br` (overridable via `REMOTAR_API_URL`).

## Authentication

None. Unofficial public read-only JSON — personal use only; respect rate limits.

## `GET /jobs`

Query parameters:

| Param | Behavior |
|-------|----------|
| `search` | Keyword search |
| `type` | When `--remote` (default): `remote` |
| `page` | 1-indexed page |

Response envelope:

```jsonc
{
  "meta": {
    "total": 100,
    "per_page": 15,
    "current_page": 1,
    "last_page": 7
  },
  "data": [ /* jobs */ ]
}
```

Job object (fields this skill reads):

```jsonc
{
  "id": 12345,
  "title": "Desenvolvedor Full Stack",
  "description": "<p>…</p>",
  "type": "remote",
  "createdAt": "2026-08-01T12:00:00.000Z",
  "externalLink": "https://company.example/apply",
  "company": { "name": "Acme" },
  "companyDisplayName": "Acme",
  "city": "São Paulo",
  "state": "SP",
  "country": "Brasil",
  "jobTags": [{ "tag": { "name": "react" } }]
}
```

Public HTML page: `https://remotar.com.br/job/{id}`.

URL preference: `externalLink` if present, else the Remotar job page.

## `GET /jobs/{id}`

Returns the same job object (or wrapped — CLI accepts either).

## Client-side filters (CLI)

| Flag | Behavior |
|------|----------|
| `--jobage` | Keep postings with `createdAt` within N days |
| `--limit` | Slice the current page's `data` array |

## Networking

User-Agent `Mozilla/5.0 (compatible; remotar-cli/1.0)`, `Accept: application/json`,
exponential backoff with jitter on 429/5xx (max 6 retries). Connection errors fail fast.
