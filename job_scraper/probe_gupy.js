const r = await fetch("https://portal.gupy.io/job-search/term=desenvolvedor", {
  headers: { "User-Agent": "Mozilla/5.0" },
});
console.log("status", r.status, "url", r.url);
const t = await r.text();
const apis = [...t.matchAll(/https?:\/\/[^\s"'<>]+gupy[^\s"'<>]*/gi)].map((m) => m[0]);
console.log("urls sample", [...new Set(apis)].slice(0, 30));
const nd = t.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
if (nd) {
  const j = JSON.parse(nd[1]);
  console.log("next keys", Object.keys(j.props?.pageProps || {}));
  console.log(JSON.stringify(j.props?.pageProps || {}).slice(0, 1500));
} else {
  console.log("no next, len", t.length);
  // look for job json blobs
  const m = t.match(/"data"\s*:\s*\[\s*\{/);
  console.log("has data array", !!m);
}
