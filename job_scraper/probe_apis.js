async function get(url) {
  const r = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; trampos-cli/1.0)",
      Accept: "application/json, text/html",
    },
  });
  const text = await r.text();
  return { status: r.status, text, ct: r.headers.get("content-type") };
}

{
  const r = await get("https://trampos.co/api/oportunidades?q=desenvolvedor");
  console.log("status", r.status, "ct", r.ct);
  const data = JSON.parse(r.text);
  console.log("count", Array.isArray(data) ? data.length : typeof data);
  const first = Array.isArray(data) ? data[0] : data;
  console.log("first keys", Object.keys(first));
  console.log("opportunity keys", Object.keys(first.opportunity || {}));
  console.log(JSON.stringify(first, null, 2).slice(0, 2000));

  // remote filter?
  for (const q of [
    "https://trampos.co/api/oportunidades?q=desenvolvedor&remote=true",
    "https://trampos.co/api/oportunidades?q=desenvolvedor&remoto=1",
    "https://trampos.co/api/oportunidades?q=desenvolvedor&work_modality=remote",
    "https://trampos.co/api/oportunidades?q=remoto+desenvolvedor",
    "https://trampos.co/api/oportunidades?q=desenvolvedor&page=2",
  ]) {
    const x = await get(q);
    try {
      const j = JSON.parse(x.text);
      const n = Array.isArray(j) ? j.length : "?";
      const sample = Array.isArray(j) ? j.slice(0, 2).map((o) => ({
        id: o.opportunity?.id,
        name: o.opportunity?.name,
        city: o.opportunity?.city_name || o.opportunity?.location,
        remote: o.opportunity?.remote || o.opportunity?.is_remote || o.opportunity?.modality,
        keys: Object.keys(o.opportunity || {}).filter((k) => /remote|modal|city|local|place|home/i.test(k)),
      })) : x.text.slice(0, 100);
      console.log(q, x.status, "n=", n, JSON.stringify(sample));
    } catch {
      console.log(q, x.status, x.text.slice(0, 100));
    }
  }

  const id = first.opportunity?.id;
  if (id) {
    for (const u of [
      `https://trampos.co/api/oportunidades/${id}`,
      `https://trampos.co/oportunidades/${id}`,
      `https://trampos.co/api/oportunidade/${id}`,
    ]) {
      const d = await get(u);
      console.log("detail", u, d.status, d.ct, d.text.slice(0, 250).replace(/\s+/g, " "));
    }
  }
}

// Programathor detail other ids
{
  for (const path of [
    "/jobs/33755-desenvolvedor-a-front-end-pleno",
    "/jobs/33759-devops-pleno",
  ]) {
    const r = await fetch("https://programathor.com.br" + path, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; programathor-cli/1.0)",
        Accept: "text/html",
        Referer: "https://programathor.com.br/jobs",
      },
    });
    const t = await r.text();
    console.log("pt detail", path, r.status, (t.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [])[1]?.replace(/<[^>]+>/g, "").trim()?.slice(0, 80));
  }
}

// GeekHunter JobPosting full fields
{
  const r = await fetch(
    "https://www.geekhunter.com/pt/randstad-1/jobs/desenvolvedor-a--front-end-pleno-1",
    { headers: { "User-Agent": "Mozilla/5.0 (compatible; geekhunter-cli/1.0)", Accept: "text/html" } },
  );
  const t = await r.text();
  const m = [...t.matchAll(/application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)];
  for (const x of m) {
    try {
      const j = JSON.parse(x[1]);
      if (j["@type"] === "JobPosting") {
        console.log("JobPosting keys", Object.keys(j));
        console.log({
          title: j.title,
          datePosted: j.datePosted,
          hiringOrg: j.hiringOrganization,
          jobLocation: j.jobLocation,
          jobLocationType: j.jobLocationType,
          employmentType: j.employmentType,
          descLen: (j.description || "").length,
          identifier: j.identifier,
        });
      }
    } catch {}
  }
}
