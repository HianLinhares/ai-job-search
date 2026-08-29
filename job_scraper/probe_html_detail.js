async function extract(name, url) {
  const r = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; ai-job-search-probe/1.0)",
      Accept: "text/html",
    },
  });
  const t = await r.text();
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  const scripts = [...t.matchAll(re)];
  console.log("===", name, "status", r.status, "jsonld", scripts.length, "len", t.length);

  for (let i = 0; i < Math.min(scripts.length, 4); i++) {
    try {
      const j = JSON.parse(scripts[i][1]);
      const types = Array.isArray(j) ? j.map((x) => x["@type"]) : j["@type"];
      console.log("block", i, "type", JSON.stringify(types).slice(0, 160));
      console.log("sample", JSON.stringify(j).slice(0, 500));
    } catch (e) {
      console.log("parse fail", e.message, scripts[i][1].slice(0, 200));
    }
  }

  const jobLinks = [...t.matchAll(/href=["'](\/jobs\/[^"']+)["']/g)].map((m) => m[1]);
  console.log("job links", [...new Set(jobLinks)].slice(0, 10));

  const vaga = [...t.matchAll(/href=["']([^"']*\/vaga[^"']*)["']/gi)].map((m) => m[1]);
  console.log("vaga hrefs", [...new Set(vaga)].slice(0, 10));

  const opp = [...t.matchAll(/href=["']([^"']*oportunidad[^"']*)["']/gi)].map((m) => m[1]);
  console.log("oportunidade hrefs", [...new Set(opp)].slice(0, 10));

  const next = t.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (next) {
    console.log("NEXT_DATA", next[1].slice(0, 400));
  }

  // Rails / Stimulus data attributes common on Programathor
  const dataJobs = t.match(/data-jobs=["']([^"']+)["']/);
  if (dataJobs) console.log("data-jobs", dataJobs[1].slice(0, 300));

  const card = t.match(/class="[^"]*job[^"]*"[^>]{0,200}/i);
  if (card) console.log("job class sample", card[0].slice(0, 200));
}

await extract("programathor", "https://programathor.com.br/jobs?remote=true");
await extract("geekhunter", "https://www.geekhunter.com/pt/vagas");
await extract("trampos", "https://trampos.co/oportunidades?q=desenvolvedor");
