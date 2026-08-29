async function fetchText(url) {
  const r = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; ai-job-search-probe/1.0)",
      Accept: "text/html",
    },
  });
  return { status: r.status, url: r.url, text: await r.text() };
}

function between(html, startMarker, endMarker, from = 0) {
  const s = html.indexOf(startMarker, from);
  if (s < 0) return null;
  const e = html.indexOf(endMarker, s + startMarker.length);
  if (e < 0) return html.slice(s, s + 800);
  return html.slice(s, e + endMarker.length);
}

// Programathor: grab one job card around a known link
{
  const { text } = await fetchText("https://programathor.com.br/jobs?remote=true");
  const idx = text.indexOf("/jobs/33724-");
  console.log("=== programathor card context ===");
  console.log(text.slice(Math.max(0, idx - 600), idx + 400).replace(/\s+/g, " "));
  const detail = await fetchText("https://programathor.com.br/jobs/33724-desenvolvedor-a-mobile-flutter-senior");
  const ld = [...detail.text.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  console.log("detail jsonld count", ld.length);
  for (const m of ld.slice(0, 2)) {
    try {
      console.log(JSON.stringify(JSON.parse(m[1])).slice(0, 700));
    } catch {}
  }
  console.log("detail title guess", (detail.text.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [])[1]?.replace(/<[^>]+>/g, "").trim());
}

// GeekHunter remote filter
{
  const url =
    "https://www.geekhunter.com/pt/vagas?searchTerm=desenvolvedor&workModality=remote";
  const { text, status } = await fetchText(url);
  const ld = [...text.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  console.log("=== geekhunter remote ===", status);
  for (const m of ld) {
    try {
      const j = JSON.parse(m[1]);
      if (j["@type"] === "ItemList") {
        console.log("items", j.numberOfItems, JSON.stringify(j.itemListElement?.slice(0, 3), null, 2));
      }
    } catch {}
  }
  // try detail
  let firstUrl = null;
  for (const m of ld) {
    try {
      const j = JSON.parse(m[1]);
      if (j["@type"] === "ItemList" && j.itemListElement?.[0]?.url) {
        firstUrl = j.itemListElement[0].url;
        break;
      }
    } catch {}
  }
  if (firstUrl) {
    const d = await fetchText(firstUrl);
    const dld = [...d.text.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
    console.log("gh detail jsonld", dld.length, firstUrl);
    for (const m of dld) {
      try {
        const j = JSON.parse(m[1]);
        console.log("dtype", j["@type"], JSON.stringify(j).slice(0, 600));
      } catch {}
    }
  }
}

// Trampos deeper
{
  const { text } = await fetchText("https://trampos.co/oportunidades?q=desenvolvedor");
  console.log("=== trampos ===");
  // look for opportunity cards
  const links = [...text.matchAll(/href="(\/oportunidades\/[^"]+)"/g)].map((m) => m[1]);
  console.log("opp links", [...new Set(links)].slice(0, 15));
  const company = [...text.matchAll(/class="[^"]*company[^"]*"/gi)].slice(0, 3);
  console.log("company classes", company.map((c) => c[0]));
  // look for JSON embedded
  const jsonHint = text.match(/oportunidades["']?\s*:\s*\[/);
  console.log("json array hint", !!jsonHint);
  const snippet = text.replace(/\s+/g, " ").slice(2000, 3500);
  console.log("body snippet", snippet);
}
