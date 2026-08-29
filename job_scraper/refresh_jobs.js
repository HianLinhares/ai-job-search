const fs = require("fs");
const path = require("path");

const bun = process.execPath;
const li = ".agents/skills/linkedin-search/cli/src/cli.ts";
const fh = ".agents/skills/freehire-search/cli/src/cli.ts";
const outDir = "job_scraper";

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

/** Keep only remote roles that look Brazil-eligible. */
function isBrazilRemote(j) {
  const blob = `${j.title || ""} ${j.location || ""} ${j.company || ""} ${j.url || ""}`.toLowerCase();

  // Explicit non-Brazil geographies without BR mention
  const foreignOnly =
    /\b(argentina|mexico|méxico|colombia|chile|peru|usa|united states|portugal|spain|españa|germany|india|philippines|filipinas)\b/i.test(
      j.location || "",
    ) && !/\b(brazil|brasil|br)\b/i.test(blob);
  if (foreignOnly) return false;

  // LinkedIn run already used -l Brazil --remote remote
  if (j.portal === "LinkedIn") return true;

  // Freehire run already used --country BR --remote remote
  const remoteHint = /remoto|remote|home\s*office|trabalho remoto|100%\s*remoto/.test(blob);
  const brHint =
    /\b(brazil|brasil|\.br\b|gupy|inhire|vagas\.solides)\b/i.test(blob) ||
    /brazil|brasil|^br$/i.test(j.location || "") ||
    !j.location;
  return brHint && (remoteHint || !j.location || /brazil|brasil|^br$/i.test(j.location || ""));
}

const liQueries = [
  "engenheiro de software",
  "desenvolvedor de software",
  "backend",
  "frontend",
  "fullstack",
  "desenvolvedor junior",
  "desenvolvedor pleno",
  "desenvolvedor senior",
];

for (const q of liQueries) {
  const slug = q.replaceAll(" ", "_");
  await run(
    li,
    ["search", "-q", q, "-l", "Brazil", "--remote", "remote", "--jobage", "14", "--limit", "15", "--format", "json"],
    `li_${slug}.json`,
  );
}

await run(
  fh,
  ["search", "--category", "backend,frontend,fullstack", "--country", "BR", "--remote", "remote", "--jobage", "14", "--limit", "25", "--no-description", "--format", "json"],
  "fh_categories.json",
);
await run(
  fh,
  ["search", "-q", "software engineer", "--country", "BR", "--remote", "remote", "--jobage", "14", "--limit", "20", "--no-description", "--format", "json"],
  "fh_software_engineer.json",
);
await run(
  fh,
  ["search", "-q", "desenvolvedor", "--country", "BR", "--remote", "remote", "--jobage", "14", "--limit", "20", "--no-description", "--format", "json"],
  "fh_desenvolvedor.json",
);
await run(
  fh,
  ["search", "--seniority", "junior,middle,senior", "--category", "backend,frontend,fullstack", "--country", "BR", "--remote", "remote", "--jobage", "14", "--limit", "25", "--no-description", "--format", "json"],
  "fh_seniority.json",
);

const byKey = new Map();
for (const f of fs.readdirSync(outDir)) {
  if (!f.startsWith("li_") && !f.startsWith("fh_")) continue;
  const data = JSON.parse(fs.readFileSync(path.join(outDir, f), "utf8"));
  if (!data.results) continue;
  const portal = f.startsWith("li_") ? "LinkedIn" : "Freehire";
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
      count: jobs.length,
      jobs,
    },
    null,
    2,
  ),
  "utf8",
);

console.log(JSON.stringify({ total: jobs.length, sample: jobs.slice(0, 5).map((j) => ({ title: j.title, location: j.location, portal: j.portal })) }, null, 2));
