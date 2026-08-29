async function get(url, accept = "application/json") {
  const r = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; trampos-cli/1.0)",
      Accept: accept,
    },
  });
  return { status: r.status, text: await r.text(), ct: r.headers.get("content-type") };
}

// Trampos query quality + remote detection from HTML detail
{
  for (const q of ["desenvolvedor", "developer", "programador", "backend", "engenheiro de software"]) {
    const r = await get(`https://trampos.co/api/oportunidades?q=${encodeURIComponent(q)}`);
    const arr = JSON.parse(r.text);
    console.log(
      "q=",
      q,
      "n=",
      arr.length,
      arr.slice(0, 5).map((o) => o.opportunity?.name),
    );
  }

  // offset?
  const r = await get("https://trampos.co/api/oportunidades?q=desenvolvedor&offset=10");
  console.log("offset10", JSON.parse(r.text).slice(0, 2).map((o) => o.opportunity?.id));

  // HTML detail for remote + description
  const html = await get("https://trampos.co/oportunidades/774355-diretor-a-comercial", "text/html");
  console.log("html title", (html.text.match(/<title>([^<]+)/) || [])[1]);
  // look for remoto
  console.log("has remoto", /remoto|remote|home.?office/i.test(html.text));
  // description containers
  for (const re of [
    /id="opportunity-description"[^>]*>([\s\S]*?)<\/div>/i,
    /class="[^"]*description[^"]*"[^>]*>([\s\S]{0,400})/i,
    /itemprop="description"[^>]*>([\s\S]{0,400})/i,
  ]) {
    const m = html.text.match(re);
    if (m) console.log("desc hit", re.source.slice(0, 40), m[1].replace(/\s+/g, " ").slice(0, 200));
  }
  // find a tech job
  const search = await get("https://trampos.co/api/oportunidades?q=programador");
  const tech = JSON.parse(search.text).find((o) =>
    /desenvolv|program|engenh|software|backend|frontend|full.?stack|devops/i.test(o.opportunity?.name || ""),
  );
  console.log("tech hit", tech?.opportunity);
  if (tech) {
    const d = await get(tech.opportunity.permalink, "text/html");
    console.log("tech remoto?", /remoto|remote|home.?office/i.test(d.text));
    const loc = d.text.match(/Localidade[\s\S]{0,80}|Remoto|Híbrido|Presencial/i);
    console.log("loc hint", loc?.[0]?.replace(/\s+/g, " ").slice(0, 120));
    // extract more fields from page
    const meta = [...d.text.matchAll(/property="og:([^"]+)" content="([^"]+)"/g)].map((m) => [m[1], m[2]]);
    console.log("og", meta.slice(0, 8));
  }
}

// Programathor detail description
{
  const r = await fetch("https://programathor.com.br/jobs/33755-desenvolvedor-a-front-end-pleno", {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; programathor-cli/1.0)",
      Accept: "text/html",
      Referer: "https://programathor.com.br/jobs",
    },
  });
  const t = await r.text();
  console.log("pt status", r.status);
  // company
  console.log("company", (t.match(/alt="([^"]+)"[^>]*class='logo/) || t.match(/alt=([^\s>]+)[^>]*class='logo/) || [])[1]);
  const desc = t.match(/class="job-description[^"]*"[^>]*>([\s\S]*?)<\/div>/i)
    || t.match(/id="job-description"[^>]*>([\s\S]*?)<\/div>/i)
    || t.match(/<div class="panel-body">([\s\S]{200,2000}?)<\/div>/i);
  console.log("desc sample", desc?.[1]?.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 300));
  // find description-ish
  const idx = t.search(/Descrição|Sobre a vaga|Responsabilidades/i);
  console.log("around desc", t.slice(idx, idx + 400).replace(/\s+/g, " "));
}
