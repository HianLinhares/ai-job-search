const fs = require("fs");
const path = require("path");

const bun = process.execPath;
const outDir = "job_scraper";

const portals = {
  li: ".agents/skills/linkedin-search/cli/src/cli.ts",
  gupy: ".agents/skills/gupy-search/cli/src/cli.ts",
  rmt: ".agents/skills/remotar-search/cli/src/cli.ts",
};

const portalLabel = {
  li: "LinkedIn",
  gupy: "Gupy",
  rmt: "Remotar",
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

  // These portals are already called with their Brazil/remote filters.
  if (["LinkedIn", "Gupy", "Remotar"].includes(j.portal)) return true;

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

function isRelevant(j) {
  const title = j.title || "";
  return /psic[oó]log|psicoter|terapeuta|sa[uú]de mental|psicossocial|recrut|recruit|talent acquisition|talent partner|\bHRBP\b|business partner|people partner|recursos humanos|analista de RH|consultor(?:a)? de RH|gente (?:&|e) gest[aã]o|\bDHO\b|treinamento|desenvolvimento humano|desenvolvimento organizacional|learning (?:&|and) development|assessment|avalia[cç][aã]o psicol[oó]gica|teste psicol[oó]gico|\bEAP\b|employee assistance|sa[uú]de ocupacional/i.test(
    title,
  );
}

const offline = process.argv.includes("--offline");
const queries = [
  { slug: "psicologo", term: "psicólogo" },
  { slug: "talent_acquisition", term: "talent acquisition" },
  { slug: "hrbp", term: "HRBP" },
  { slug: "recrutamento_selecao", term: "recrutamento e seleção" },
  { slug: "avaliacao_psicologica", term: "avaliação psicológica" },
  { slug: "eap", term: "EAP" },
  { slug: "treinamento_desenvolvimento", term: "treinamento e desenvolvimento" },
  { slug: "consultor_rh", term: "consultor de RH" },
];

if (!offline) {
  for (const { slug, term } of queries) {
    await run(
      portals.li,
      ["search", "-q", term, "-l", "Brazil", "--remote", "remote", "--jobage", "14", "--limit", "12", "--format", "json"],
      `li_${slug}.json`,
    );
    await run(
      portals.gupy,
      ["search", "-q", term, "--remote", "remote", "--jobage", "14", "--limit", "12", "--format", "json"],
      `gupy_${slug}.json`,
    );
    await run(
      portals.rmt,
      ["search", "-q", term, "--jobage", "14", "--limit", "12", "--format", "json"],
      `rmt_${slug}.json`,
    );
  }
} else {
  console.log("offline: reusing existing portal json dumps");
}

const sourceFiles = queries.flatMap(({ slug }) => [
  [`li_${slug}.json`, "LinkedIn"],
  [`gupy_${slug}.json`, "Gupy"],
  [`rmt_${slug}.json`, "Remotar"],
]);

const byKey = new Map();
for (const [f, portal] of sourceFiles) {
  const sourcePath = path.join(outDir, f);
  if (!fs.existsSync(sourcePath)) continue;
  let data;
  try {
    data = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
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
    if (!isBrazilRemote(job) || !isRelevant(job)) continue;
    byKey.set(key, job);
  }
}

const jobs = [...byKey.values()].sort((a, b) => String(b.date).localeCompare(String(a.date)));
fs.writeFileSync(
  "job_scraper/ui/jobs.json",
  JSON.stringify(
    {
      generated_at: new Date().toISOString(),
      scope: "psychology-hr-remote-brazil",
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
