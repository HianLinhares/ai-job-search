const fs = require("fs");
const path = require("path");

const bun = process.execPath;
const outDir = "job_scraper";

const portals = {
  li: ".agents/skills/linkedin-search/cli/src/cli.ts",
  fh: ".agents/skills/freehire-search/cli/src/cli.ts",
  gupy: ".agents/skills/gupy-search/cli/src/cli.ts",
  rok: ".agents/skills/remoteok-search/cli/src/cli.ts",
  him: ".agents/skills/himalayas-search/cli/src/cli.ts",
  wwr: ".agents/skills/weworkremotely-search/cli/src/cli.ts",
};

const portalLabel = {
  li: "LinkedIn",
  fh: "Freehire",
  gupy: "Gupy",
  rok: "RemoteOK",
  him: "Himalayas",
  wwr: "WeWorkRemotely",
};

async function run(cmd, args, outFile) {
  const proc = Bun.spawn([bun, "run", cmd, ...args], {
    stdout: "pipe",
    stderr: "pipe",
    cwd: process.cwd(),
  });
  const [stdout, stderr, code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  if (code !== 0) {
    console.error("FAIL", outFile, stderr || stdout);
    return null;
  }
  const i = stdout.indexOf("{");
  if (i < 0) {
    console.error("NO JSON", outFile);
    return null;
  }
  const data = JSON.parse(stdout.slice(i));
  fs.writeFileSync(path.join(outDir, outFile), JSON.stringify(data, null, 2), "utf8");
  console.log("ok", outFile, data.results?.length ?? 0);
  return data;
}

function isBrazilRemote(j) {
  const title = j.title || "";
  const location = (j.location || "").trim();
  const company = j.company || "";
  const url = j.url || "";
  const blob = `${title} ${location} ${company} ${url}`;

  const foreignGeo =
    /\b(argentina|mexico|méxico|colombia|chile|peru|usa|united states|portugal|spain|españa|germany|india|philippines|filipinas|canada)\b/i.test(
      location,
    );
  const mentionsBrazil =
    /\b(brazil|brasil)\b/i.test(blob) || /\.br\b/i.test(url);

  if (foreignGeo && !mentionsBrazil) return false;

  // Portals already scoped to BR/remote in this refresh script
  if (["LinkedIn", "Gupy", "Freehire", "Himalayas", "RemoteOK"].includes(j.portal)) {
    if (j.portal === "RemoteOK" && !mentionsBrazil && !/brazil|brasil|latam|south america/i.test(blob)) {
      // RemoteOK --country BR may still return empty; keep only BR-ish hits
      return mentionsBrazil;
    }
    if (j.portal === "WeWorkRemotely") {
      return mentionsBrazil || /brazil|brasil|latam/i.test(blob);
    }
    return true;
  }

  if (j.portal === "WeWorkRemotely") {
    return mentionsBrazil || /brazil|brasil|latam|latin america/i.test(blob);
  }

  const brEligible =
    mentionsBrazil ||
    /^(br|brazil|brasil)$/i.test(location) ||
    /\b(gupy|inhire|solides)\b/i.test(blob);
  if (!brEligible) return false;

  if (j.work_mode === "remote") return true;
  return /remoto|remote|home\s*office|trabalho remoto|100%\s*remoto|work from home|\bwfh\b/i.test(
    `${title} ${location}`,
  );
}

const offline = process.argv.includes("--offline");
const queries = [
  "desenvolvedor",
  "engenheiro de software",
  "backend",
  "frontend",
  "fullstack",
];

if (!offline) {
  for (const q of queries) {
    const slug = q.replaceAll(" ", "_");
    await run(
      portals.li,
      ["search", "-q", q, "-l", "Brazil", "--remote", "remote", "--jobage", "14", "--limit", "12", "--format", "json"],
      `li_${slug}.json`,
    );
    await run(
      portals.gupy,
      ["search", "-q", q, "--remote", "remote", "--jobage", "14", "--limit", "12", "--format", "json"],
      `gupy_${slug}.json`,
    );
  }

  await run(
    portals.fh,
    ["search", "-q", "desenvolvedor", "--country", "BR", "--remote", "remote", "--jobage", "14", "--limit", "20", "--no-description", "--format", "json"],
    "fh_desenvolvedor.json",
  );
  await run(
    portals.fh,
    ["search", "--category", "backend,frontend,fullstack", "--country", "BR", "--remote", "remote", "--jobage", "14", "--limit", "20", "--no-description", "--format", "json"],
    "fh_categories.json",
  );

  await run(
    portals.rok,
    ["search", "-q", "developer", "--country", "BR", "--jobage", "14", "--limit", "20", "--format", "json"],
    "rok_developer.json",
  );
  await run(
    portals.him,
    ["search", "-q", "developer", "--country", "BR", "--jobage", "14", "--limit", "20", "--format", "json"],
    "him_developer.json",
  );
  await run(
    portals.him,
    ["search", "-q", "desenvolvedor", "--country", "BR", "--jobage", "14", "--limit", "15", "--format", "json"],
    "him_desenvolvedor.json",
  );
  await run(
    portals.wwr,
    ["search", "-q", "developer", "--jobage", "14", "--limit", "25", "--format", "json"],
    "wwr_developer.json",
  );
} else {
  console.log("offline: reusing existing portal json dumps");
}

const prefixToPortal = [
  ["li_", "LinkedIn"],
  ["fh_", "Freehire"],
  ["gupy_", "Gupy"],
  ["rok_", "RemoteOK"],
  ["him_", "Himalayas"],
  ["wwr_", "WeWorkRemotely"],
];

const byKey = new Map();
for (const f of fs.readdirSync(outDir)) {
  if (!f.endsWith(".json")) continue;
  const hit = prefixToPortal.find(([p]) => f.startsWith(p));
  if (!hit) continue;
  const [, portal] = hit;
  let data;
  try {
    data = JSON.parse(fs.readFileSync(path.join(outDir, f), "utf8"));
  } catch {
    continue;
  }
  if (!data.results) continue;
  for (const r of data.results) {
    const url = r.url || "";
    const key = url || `${r.company}|${r.title}`;
    if (!key || byKey.has(key)) continue;
    const job = {
      id: r.id || key,
      title: r.title || "",
      company: r.company || "—",
      location: r.location || "Remoto · Brasil",
      date: String(r.date || "").slice(0, 10),
      url,
      portal,
      work_mode: r.work_mode || null,
      remote: true,
    };
    if (!isBrazilRemote(job)) continue;
    byKey.set(key, job);
  }
}

const jobs = [...byKey.values()].sort((a, b) => String(b.date).localeCompare(String(a.date)));
fs.writeFileSync(
  "job_scraper/ui/jobs.json",
  JSON.stringify(
    {
      generated_at: new Date().toISOString(),
      scope: "remote-brazil-only",
      sources: Object.values(portalLabel),
      count: jobs.length,
      jobs,
    },
    null,
    2,
  ),
  "utf8",
);

const byPortal = jobs.reduce((a, j) => {
  a[j.portal] = (a[j.portal] || 0) + 1;
  return a;
}, {});
console.log(JSON.stringify({ total: jobs.length, byPortal, sample: jobs.slice(0, 5) }, null, 2));
