async function get(url, extra = {}) {
  const r = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; programathor-cli/1.0)",
      Accept: "text/html,application/json",
      ...extra,
    },
    redirect: "follow",
  });
  const text = await r.text();
  return { status: r.status, url: r.url, text, ct: r.headers.get("content-type") };
}

// Programathor: parse listing cards more carefully
{
  const { text } = await get("https://programathor.com.br/jobs?remote=true&kind_id=1");
  // kind might filter? try without
  const cards = [...text.matchAll(/<a href="(\/jobs\/(\d+)[^"]+)">\s*<div class="row">([\s\S]*?)<\/a>/g)];
  console.log("programathor cards", cards.length);
  for (const m of cards.slice(0, 3)) {
    const chunk = m[3].replace(/\s+/g, " ");
    const company = (chunk.match(/alt="([^"]+)"/) || [])[1];
    const title = (chunk.match(/<h[23][^>]*>([\s\S]*?)<\/h[23]>/i) || [])[1]?.replace(/<[^>]+>/g, "").trim();
    const loc = (chunk.match(/fa-map[^<]*<\/i>\s*([^<]+)/i) || [])[1]?.trim();
    console.log({ id: m[2], href: m[1], company, title, loc, chunk: chunk.slice(0, 350) });
  }

  // try detail with Referer
  const href = cards[0]?.[1];
  if (href) {
    const d = await get("https://programathor.com.br" + href, {
      Referer: "https://programathor.com.br/jobs?remote=true",
    });
    console.log("detail status", d.status, "title", (d.text.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [])[1]?.replace(/<[^>]+>/g, "").trim()?.slice(0, 120));
    console.log("detail snippet", d.text.replace(/\s+/g, " ").slice(0, 300));
  }

  // robots
  const rob = await get("https://programathor.com.br/robots.txt");
  console.log("programathor robots", rob.text.slice(0, 500));
}

// GeekHunter robots + page param
{
  const rob = await get("https://www.geekhunter.com/robots.txt");
  console.log("geekhunter robots", rob.text.slice(0, 600));
  const p2 = await get(
    "https://www.geekhunter.com/pt/vagas?searchTerm=desenvolvedor&workModality=remote&page=2",
  );
  const ld = [...p2.text.matchAll(/application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)];
  for (const m of ld) {
    try {
      const j = JSON.parse(m[1]);
      if (j["@type"] === "ItemList") console.log("gh page2 items", j.numberOfItems, j.itemListElement?.[0]?.name);
    } catch {}
  }
}

// Trampos API guesses
{
  const urls = [
    "https://trampos.co/oportunidades.json?q=desenvolvedor",
    "https://api.trampos.co/oportunidades?q=desenvolvedor",
    "https://trampos.co/api/oportunidades?q=desenvolvedor",
    "https://developers.trampos.co/oportunidades?q=desenvolvedor",
    "https://trampos.co/oportunidades?q=desenvolvedor&formato=json",
  ];
  for (const u of urls) {
    try {
      const r = await get(u, { Accept: "application/json" });
      console.log("trampos try", u, r.status, r.ct, r.text.slice(0, 120).replace(/\s+/g, " "));
    } catch (e) {
      console.log("trampos err", u, e.message);
    }
  }
  const rob = await get("https://trampos.co/robots.txt");
  console.log("trampos robots", rob.text.slice(0, 400));
}
