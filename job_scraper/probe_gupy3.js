const u =
  "https://employability-portal.gupy.io/api/v1/jobs?jobName=desenvolvedor&workplaceTypes=remote&offset=0&limit=3";
const r = await fetch(u, {
  headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0", Referer: "https://portal.gupy.io/" },
});
const j = await r.json();
console.log("keys meta", Object.keys(j));
console.log("count", j.data?.length, "total?", j.pagination || j.meta || j.total);
const first = j.data?.[0];
console.log("job keys", Object.keys(first || {}));
console.log(JSON.stringify(first, null, 2).slice(0, 2000));

// detail-like: single job via career page often embeds; try id filter
const u2 = `https://employability-portal.gupy.io/api/v1/jobs?jobId=${first.id}`;
const r2 = await fetch(u2, {
  headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0", Referer: "https://portal.gupy.io/" },
});
console.log("\ndetail-ish status", r2.status, (await r2.text()).slice(0, 300));
