async function get(url) {
  const r = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; programathor-cli/1.0)",
      Accept: "text/html",
    },
  });
  const text = await r.text();
  const cards = [...text.matchAll(/<a href="(\/jobs\/(\d+)[^"]+)">\s*<div class="row">([\s\S]*?)<\/a>/g)];
  return {
    status: r.status,
    n: cards.length,
    titles: cards.slice(0, 5).map((m) => {
      const chunk = m[3];
      const title = (chunk.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i) || [])[1]?.replace(/<[^>]+>/g, "").trim();
      return title;
    }),
  };
}

for (const u of [
  "https://programathor.com.br/jobs?remote=true",
  "https://programathor.com.br/jobs?remote=true&search=desenvolvedor",
  "https://programathor.com.br/jobs?remote=true&q=desenvolvedor",
  "https://programathor.com.br/jobs?remote=true&palavra=backend",
  "https://programathor.com.br/jobs?remote=true&keyword=python",
  "https://programathor.com.br/jobs?utf8=%E2%9C%93&search=backend&remote=true",
  "https://programathor.com.br/jobs?search=frontend&remote=true",
  "https://programathor.com.br/jobs?page=2&remote=true",
]) {
  const r = await get(u);
  console.log(u.replace("https://programathor.com.br", ""), r.status, r.n, r.titles);
}

// Trampos: try more API shapes
for (const u of [
  "https://trampos.co/api/oportunidades?per_page=50",
  "https://trampos.co/api/oportunidades?limit=50",
  "https://trampos.co/api/v1/oportunidades?q=desenvolvedor",
  "https://trampos.co/api/search?q=desenvolvedor",
  "https://trampos.co/oportunidades/busca?q=desenvolvedor",
]) {
  try {
    const r = await fetch(u, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; trampos-cli/1.0)",
        Accept: "application/json",
      },
    });
    const t = await r.text();
    console.log("trampos", u.split(".co")[1], r.status, t.slice(0, 100).replace(/\s+/g, " "));
  } catch (e) {
    console.log("err", e.message);
  }
}
