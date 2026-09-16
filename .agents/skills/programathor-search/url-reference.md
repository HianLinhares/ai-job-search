# Programathor HTML reference

Endpoints this skill depends on. Base site defaults to `https://programathor.com.br`.

## Authentication

None. Public HTML — personal use only.

## Search page

```
GET https://programathor.com.br/jobs?search=<q>&remoto=true
```

Job cards appear in `cell-list` blocks or as anchors:

```html
<a href="/jobs/{id}-{slug}">…</a>
```

Per-card extraction:

| Field | Source |
|-------|--------|
| `id` | numeric prefix of `/jobs/{id}-{slug}` |
| `title` | nearby `h3` text, or `img` alt, or link text |
| `company` | logo `img` alt when present |
| `location` | `"Remoto"` when `remoto=true` |
| `date` | often missing → `null` |
| `url` | absolute `https://programathor.com.br/jobs/{id}-{slug}` |

## Detail page

```
GET https://programathor.com.br/jobs/{id}-{slug}
```

Detail pages **often return HTTP 500**. The CLI retries briefly, then returns a
minimal result from the URL (title/slug parse) with
`description: "(detalhe indisponível no portal)"` and exit `0`.

`NOT_FOUND` only when the id/URL is completely unparseable.

## Client-side filters (CLI)

| Flag | Behavior |
|------|----------|
| `--jobage` | Filter by date when present; **keep null dates** |
| `--page` / `--limit` | Client slice of parsed cards |

## Networking

User-Agent `Mozilla/5.0 (compatible; programathor-cli/1.0)`, Accept HTML,
short retry on 429/5xx for search; detail degrades on persistent 5xx.
