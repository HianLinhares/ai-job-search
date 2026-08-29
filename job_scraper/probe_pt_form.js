const r = await fetch("https://programathor.com.br/jobs?remote=true", {
  headers: { "User-Agent": "Mozilla/5.0 (compatible; programathor-cli/1.0)", Accept: "text/html" },
});
const t = await r.text();
const form = t.match(/<form[^>]*action="\/jobs"[^>]*>([\s\S]*?)<\/form>/i);
console.log("form found", !!form);
if (form) {
  const inputs = [...form[1].matchAll(/<(?:input|select)[^>]*(?:name|id)=["']([^"']+)["'][^>]*>/gi)];
  console.log(
    "fields",
    inputs.map((m) => m[0].slice(0, 120)),
  );
}
// look for name= near search
const names = [...t.matchAll(/name="([a-zA-Z0-9_\[\]]+)"/g)].map((m) => m[1]);
console.log("unique names", [...new Set(names)].slice(0, 40));

// try POST search?
const csrf = (t.match(/name="csrf-token" content="([^"]+)"/) || [])[1];
console.log("csrf", csrf?.slice(0, 20));

const body = new URLSearchParams({
  utf8: "✓",
  authenticity_token: csrf || "",
  "search[keyword]": "backend",
  remote: "true",
});
// try common rails patterns
for (const payload of [
  { utf8: "✓", authenticity_token: csrf || "", keyword: "backend", remote: "true" },
  { utf8: "✓", authenticity_token: csrf || "", "q[title_cont]": "backend", remote: "true" },
  { utf8: "✓", authenticity_token: csrf || "", "filter[skill]": "backend", remote: "true" },
]) {
  const pr = await fetch("https://programathor.com.br/jobs", {
    method: "POST",
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; programathor-cli/1.0)",
      Accept: "text/html",
      "Content-Type": "application/x-www-form-urlencoded",
      Referer: "https://programathor.com.br/jobs",
    },
    body: new URLSearchParams(payload),
    redirect: "follow",
  });
  const pt = await pr.text();
  const cards = [...pt.matchAll(/<a href="(\/jobs\/(\d+)[^"]+)">\s*<div class="row">([\s\S]*?)<\/a>/g)];
  const titles = cards.slice(0, 3).map((m) =>
    (m[3].match(/<h3[^>]*>([\s\S]*?)<\/h3>/i) || [])[1]?.replace(/<[^>]+>/g, "").trim(),
  );
  console.log("POST", Object.keys(payload).join(","), pr.status, pr.url, cards.length, titles);
}
