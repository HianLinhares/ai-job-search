async function titles(url) {
  const r = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; programathor-cli/1.0)", Accept: "text/html" },
  });
  const t = await r.text();
  const cards = [...t.matchAll(/<a href="(\/jobs\/(\d+)[^"]+)">\s*<div class="row">([\s\S]*?)<\/a>/g)];
  return {
    status: r.status,
    n: cards.length,
    titles: cards.slice(0, 6).map((m) => {
      const chunk = m[3];
      const title = (chunk.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i) || [])[1]?.replace(/<[^>]+>/g, "").trim();
      const loc = (chunk.match(/fa-map[^<]*<\/i>\s*([^<]+)/i) || [])[1]?.trim();
      const company =
        (chunk.match(/alt="([^"]+)"/) || [])[1] ||
        (chunk.match(/alt=([^\s>]+(?:\s+[^\s>]+)*)\s+class=/i) || [])[1];
      return { id: m[2], title, loc, company };
    }),
  };
}

for (const u of [
  "https://programathor.com.br/jobs-front-end?place=Remoto",
  "https://programathor.com.br/jobs-python?place=Remoto",
  "https://programathor.com.br/jobs-java?place=Remoto",
  "https://programathor.com.br/jobs?place=Remoto&page=1",
  "https://programathor.com.br/jobs?place=Remoto&page=2",
]) {
  const r = await titles(u);
  console.log(u.replace("https://programathor.com.br", ""), r.status, r.n, r.titles);
}

// extract skill options from page
const page = await fetch("https://programathor.com.br/jobs", {
  headers: { "User-Agent": "Mozilla/5.0 (compatible; programathor-cli/1.0)", Accept: "text/html" },
});
const html = await page.text();
const opts = [...html.matchAll(/<option value="(\/jobs-[^"]+)">([^<]+)<\/option>/g)].map((m) => [m[1], m[2]]);
console.log("skills sample", opts.slice(0, 30));
console.log("skills count", opts.length);
