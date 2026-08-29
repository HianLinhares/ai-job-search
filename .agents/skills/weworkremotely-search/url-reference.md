# We Work Remotely RSS reference

Feeds and parsing notes this skill depends on. Base URL defaults to
`https://weworkremotely.com` (overridable via `WWR_BASE_URL`).

## Authentication

None. Public RSS / HTML.

## Feeds

| Feed | URL |
|------|-----|
| All remote jobs | `https://weworkremotely.com/remote-jobs.rss` |
| Programming | `https://weworkremotely.com/categories/remote-programming-jobs.rss` |
| Full-stack | `…/remote-full-stack-programming-jobs.rss` |
| Back-end | `…/remote-back-end-programming-jobs.rss` |
| Front-end | `…/remote-front-end-programming-jobs.rss` |
| DevOps | `…/remote-devops-sysadmin-jobs.rss` |
| Design | `…/remote-design-jobs.rss` |
| Product | `…/remote-product-jobs.rss` |
| Marketing | `…/remote-sales-and-marketing-jobs.rss` |
| Customer support | `…/remote-customer-support-jobs.rss` |
| Management | `…/remote-management-and-finance-jobs.rss` |

CLI `--category` aliases: `programming`, `full-stack`, `back-end`, `front-end`,
`devops`, `design`, `product`, `marketing`, `customer-support`, `management`, `all`.

## Item fields (regex-parsed)

From each `<item>`:

| RSS tag | CLI field |
|---------|-----------|
| `title` | Split on first `:` → `company` + `title` |
| `link` | `url`; trailing path segment → `id` |
| `description` | HTML stripped → `description` |
| `pubDate` | ISO → `date` |

`location` is always `"Remote"` (WWR is remote-first; geo is free text in the body).

## Client-side filters

| Flag | Behavior |
|------|----------|
| `--query` | Substring on title / company / description |
| `--country BR` | Keep hits mentioning Brazil / Brasil / LATAM |
| `--jobage` | Keep items with `pubDate` within N days |
| `--page` / `--limit` | Slice the filtered list |

## Detail

1. Scan common category RSS feeds for a matching `link`
2. Else `GET` the job HTML and strip text from listing/article markup

## Networking

Browser-ish User-Agent, exponential backoff with jitter on 429/5xx (max 6 retries).
Connection errors fail fast. No XML library — items extracted with regex.
