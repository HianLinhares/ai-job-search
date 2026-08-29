const first = (
  await (
    await fetch(
      "https://employability-portal.gupy.io/api/v1/jobs?jobName=desenvolvedor&workplaceTypes=remote&limit=1",
      { headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0", Referer: "https://portal.gupy.io/" } },
    )
  ).json()
).data[0];

for (const u of [
  `https://employability-portal.gupy.io/api/v1/jobs?ids=${first.id}`,
  `https://employability-portal.gupy.io/api/v1/jobs/${first.id}`,
  first.jobUrl,
]) {
  const r = await fetch(u, {
    headers: { Accept: "application/json,text/html", "User-Agent": "Mozilla/5.0", Referer: "https://portal.gupy.io/" },
  });
  console.log(r.status, u.slice(0, 100), (await r.text()).slice(0, 200).replace(/\s+/g, " "));
}

const him = await (
  await fetch("https://himalayas.app/jobs/api/search?q=developer&country=BR&limit=1")
).json();
console.log("him job keys", Object.keys(him.jobs[0]));
console.log("slug?", him.jobs[0].slug, "guid?", him.jobs[0].guid, "url?", him.jobs[0].url, "id?", him.jobs[0].id);
