const tries = [
  "https://portal.api.gupy.io/api/job?name=desenvolvedor&isRemoteWork=true&offset=0&limit=5",
  "https://portal.api.gupy.io/api/job?name=desenvolvedor&badges=Brasil&isRemoteWork=true&limit=5",
  "https://employability-portal.gupy.io/api/v1/jobs?jobName=desenvolvedor&offset=0&limit=5",
  "https://employability-portal.gupy.io/api/v1/jobs?jobName=desenvolvedor&workplaceTypes=remote&limit=5",
];
for (const u of tries) {
  try {
    const r = await fetch(u, {
      headers: {
        Accept: "application/json",
        "User-Agent": "Mozilla/5.0",
        Referer: "https://portal.gupy.io/",
      },
    });
    const t = await r.text();
    console.log("\nSTATUS", r.status, u);
    console.log(t.slice(0, 500));
  } catch (e) {
    console.log("ERR", u, e.message);
  }
}
