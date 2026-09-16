# GeekHunter HTML / JSON-LD reference

Endpoints this skill depends on. Base site defaults to `https://www.geekhunter.com.br`
(HTML board). Prefer absolute URLs as returned by ItemList (often `www.geekhunter.com`).

## Authentication

None. Public HTML — personal use only.

## Robots

`/api` and `/feeds` are disallowed. This skill only fetches HTML listing/detail pages.

## Search page

```
GET https://www.geekhunter.com.br/pt/vagas?searchTerm=<q>&workModality=Remoto&page=<n>
```

Parse `<script type="application/ld+json">` for an `ItemList`:

```jsonc
{
  "@type": "ItemList",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "url": "https://www.geekhunter.com/pt/{company-slug}/jobs/{job-slug}",
      "name": "Job title"
    }
  ]
}
```

Search-level mapping (no per-item detail fetch):

| Field | Source |
|-------|--------|
| `id` | job slug from URL path |
| `title` | `name` |
| `company` | `{company-slug}` from `/pt/{company}/jobs/{job}` |
| `location` | `"Remoto"` when remote filter is on |
| `date` | `null` (unless available cheaply) |
| `url` | absolute ItemList URL |

## Detail page

Fetch the job URL; parse JSON-LD `JobPosting` for `title`,
`hiringOrganization.name`, `datePosted`, `description`, `jobLocationType`.

## Client-side filters (CLI)

| Flag | Behavior |
|------|----------|
| `--jobage` | Filter by date when present; **keep rows with null date** |
| `--page` / `--limit` | Board page + client slice |

## Networking

User-Agent `Mozilla/5.0 (compatible; geekhunter-cli/1.0)`, Accept HTML,
exponential backoff with jitter on 429/5xx (max 6 retries).
