const targets = [
  ["programathor", "https://programathor.com.br/jobs?remote=true"],
  ["programathor2", "https://programathor.com.br/jobs"],
  ["geekhunter", "https://www.geekhunter.com.br/vagas"],
  ["trampos", "https://trampos.co/oportunidades?q=desenvolvedor"],
  ["trampos_dev", "https://developers.trampos.co/"],
];
for (const [name, u] of targets) {
  try {
    const r = await fetch(u, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; ai-job-search-probe/1.0)",
        Accept: "text/html,application/json",
      },
      redirect: "follow",
    });
    const t = await r.text();
    const hasJsonLd = /application\/ld\+json/i.test(t);
    const hasApi = /\/api\//i.test(t);
    const jobish = (t.match(/vaga|job|oportunidade/gi) || []).length;
    console.log(
      JSON.stringify({
        name,
        status: r.status,
        finalUrl: r.url,
        len: t.length,
        hasJsonLd,
        hasApiHint: hasApi,
        jobish,
        snippet: t.replace(/\s+/g, " ").slice(0, 180),
      }),
    );
  } catch (e) {
    console.log(JSON.stringify({ name, error: e.message }));
  }
}
