import { spawn } from "bun";
import { join, normalize, extname } from "path";

const PORT = Number(process.env.PORT || 8080);
const HOST = process.env.HOST || "127.0.0.1";
const UI_DIR = import.meta.dir;
const ROOT_DIR = join(UI_DIR, "..", "..");
const REFRESH_SCRIPT = join(ROOT_DIR, "job_scraper", "refresh_jobs.js");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

let refreshing = false;
let lastRefresh = null;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function safeUiPath(urlPath) {
  const clean = decodeURIComponent(urlPath.split("?")[0] || "/");
  const rel = clean === "/" ? "index.html" : clean.replace(/^\/+/, "");
  const full = normalize(join(UI_DIR, rel));
  if (!full.startsWith(normalize(UI_DIR))) return null;
  return full;
}

async function runRefresh() {
  const proc = spawn({
    cmd: [process.execPath, "run", REFRESH_SCRIPT],
    cwd: ROOT_DIR,
    stdout: "pipe",
    stderr: "pipe",
  });

  const [stdout, stderr, code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);

  const output = `${stdout}\n${stderr}`.trim();
  let summary = null;
  const brace = stdout.lastIndexOf("{");
  if (brace >= 0) {
    try {
      summary = JSON.parse(stdout.slice(brace));
    } catch {
      summary = null;
    }
  }

  return { code, output, summary };
}

const server = Bun.serve({
  hostname: HOST,
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);

    if (url.pathname === "/api/refresh" && req.method === "POST") {
      if (refreshing) {
        return json({ ok: false, error: "Atualização já em andamento." }, 409);
      }

      refreshing = true;
      const startedAt = new Date().toISOString();
      try {
        const result = await runRefresh();
        lastRefresh = {
          startedAt,
          finishedAt: new Date().toISOString(),
          ok: result.code === 0,
          code: result.code,
          summary: result.summary,
        };

        if (result.code !== 0) {
          return json(
            {
              ok: false,
              error: "Falha ao atualizar vagas.",
              detail: result.output.slice(-2000),
              lastRefresh,
            },
            500,
          );
        }

        return json({
          ok: true,
          message: "Base de vagas atualizada.",
          count: result.summary?.total ?? null,
          byPortal: result.summary?.byPortal ?? null,
          lastRefresh,
        });
      } catch (err) {
        lastRefresh = {
          startedAt,
          finishedAt: new Date().toISOString(),
          ok: false,
          error: String(err?.message || err),
        };
        return json(
          { ok: false, error: "Erro ao executar refresh.", detail: String(err?.message || err) },
          500,
        );
      } finally {
        refreshing = false;
      }
    }

    if (url.pathname === "/api/refresh" && req.method === "GET") {
      return json({ refreshing, lastRefresh });
    }

    if (req.method !== "GET" && req.method !== "HEAD") {
      return json({ ok: false, error: "Método não suportado." }, 405);
    }

    const filePath = safeUiPath(url.pathname);
    if (!filePath) return new Response("Not found", { status: 404 });

    const file = Bun.file(filePath);
    if (!(await file.exists())) return new Response("Not found", { status: 404 });

    const type = MIME[extname(filePath)] || file.type || "application/octet-stream";
    return new Response(file, {
      headers: {
        "Content-Type": type,
        "Cache-Control": url.pathname.endsWith(".json") ? "no-store" : "no-cache",
      },
    });
  },
});

console.log(`UI + refresh API em http://${server.hostname}:${server.port}/`);
