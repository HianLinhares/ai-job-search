const r = await fetch("https://programathor.com.br/jobs?remote=true", {
  headers: { "User-Agent": "Mozilla/5.0 (compatible; programathor-cli/1.0)", Accept: "text/html" },
});
const t = await r.text();

// skill checkboxes / links
const skills = [...t.matchAll(/choose_skill[^>]{0,200}|name="choose_skill[^"]*"|href="[^"]*skill[^"]*"|data-skill[^>]{0,80}/gi)];
console.log("skill hits", skills.slice(0, 20).map((m) => m[0].slice(0, 150)));

const skillLinks = [...t.matchAll(/href="(\/jobs\?[^"]*skill[^"]*)"/gi)].map((m) => m[1]);
console.log("skill links", [...new Set(skillLinks)].slice(0, 15));

const checkboxes = [...t.matchAll(/<input[^>]*choose_skill[^>]*>/gi)];
console.log("checkboxes", checkboxes.slice(0, 10).map((c) => c[0]));

// look around "Backend" text
const idx = t.indexOf("Backend");
console.log("around Backend", t.slice(idx - 100, idx + 150).replace(/\s+/g, " "));

const idx2 = t.search(/name=["']choose_skill/);
console.log("around choose_skill name", t.slice(idx2, idx2 + 300).replace(/\s+/g, " "));

// try skill_id / skills[]
for (const u of [
  "https://programathor.com.br/jobs?remote=true&choose_skill[]=1",
  "https://programathor.com.br/jobs?remote=true&skills=backend",
  "https://programathor.com.br/jobs?remote=true&skill=backend",
  "https://programathor.com.br/jobs?remote=true&place=Remoto",
]) {
  const x = await fetch(u, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; programathor-cli/1.0)", Accept: "text/html" },
  });
  const xt = await x.text();
  const cards = [...xt.matchAll(/<a href="(\/jobs\/(\d+)[^"]+)">\s*<div class="row">([\s\S]*?)<\/a>/g)];
  const titles = cards.slice(0, 3).map((m) =>
    (m[3].match(/<h3[^>]*>([\s\S]*?)<\/h3>/i) || [])[1]?.replace(/<[^>]+>/g, "").trim(),
  );
  console.log(u.split(".br")[1], cards.length, titles);
}
