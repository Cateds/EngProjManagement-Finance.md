import puppeteer from "puppeteer";
import http from "node:http";
import { readFileSync, mkdirSync } from "node:fs";
import { resolve, join } from "node:path";
import { execSync } from "node:child_process";
import serveHandler from "serve-handler";

// ── Types ──
interface ArticleData {
  path: string;
  title: string;
  content: string;
  folder: string;
  sortKey: string;
}

// ── Configuration ──
const CONCURRENCY = 4;
const PUBLIC_DIR = resolve(process.cwd(), "public");
const SITEMAP_PATH = join(PUBLIC_DIR, "sitemap.xml");
const OUTPUT_DIR = resolve(process.cwd(), "pdf-output");
const SITE_TITLE = "工程项目管理与财务";
const SITE_URL = "https://cateds.github.io/EngProjManagement-Finance.md/";
const GITHUB_URL = "https://github.com/cateds/EngProjManagement-Finance.md";
const AUTHOR_URL = "https://cateds.github.io/";
const AUTHOR_NAME = "Cateds";

const SKIP_BUILD = process.argv.includes("--skip-build");
const CI = process.env.CI === "true";
const TAG = process.argv.find((a, i) => a === "--tag" && process.argv[i + 1])?.replace("--tag ", "") ||
  process.env.RELEASE_TAG ||
  "";
const OUTPUT_FILE = join(OUTPUT_DIR, TAG ? `工程项目管理与财务-${TAG}.pdf` : "工程项目管理与财务.pdf");

async function main() {
  // 1. Build (skip if already done in CI)
  if (!SKIP_BUILD) {
    console.log("[1/5] Building site...");
    execSync("bun run build", { stdio: "inherit", cwd: process.cwd() });
  } else {
    console.log("[1/5] Build skipped (public dir already exists)");
    if (!readFileSync(SITEMAP_PATH, "utf-8").trim()) {
      console.error("❌ Sitemap is empty. Run build first or check public/ dir.");
      process.exit(1);
    }
  }

  if (!readFileSync(SITEMAP_PATH, "utf-8").trim()) {
    console.error("❌ Sitemap is empty. Build may have failed or enableSiteMap is off.");
    process.exit(1);
  }

  // 2. Parse sitemap
  console.log("[2/5] Parsing sitemap...");
  const sitemap = readFileSync(SITEMAP_PATH, "utf-8");
  const urlMatches = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)];
  const urls = urlMatches.map((m) => m[1]);

  if (urls.length === 0) {
    console.error("❌ No URLs found in sitemap.");
    process.exit(1);
  }

  const pathPrefix = getCommonPathPrefix(urls);
  console.log(`   Found ${urls.length} pages, path prefix: "${pathPrefix}"`);

  // 3. Start local static server (port 0 = OS auto-assign)
  const server = http.createServer((req, res) => {
    serveHandler(req, res, {
      public: PUBLIC_DIR,
      cleanUrls: true,
    });
  });

  const port = await new Promise<number>((resolveP, reject) => {
    server.listen(0, () => {
      const addr = server.address();
      if (addr && typeof addr === "object") resolveP(addr.port);
      else reject(new Error("Failed to get server port"));
    });
    server.on("error", reject);
  });
  console.log(`[3/5] Local server started on port ${port}`);

  // 4. Scrape pages in parallel with headless Chromium
  console.log(`[4/5] Extracting page content (${CONCURRENCY} workers)...`);
  const browser = await puppeteer.launch({
    headless: true,
    args: CI ? ["--no-sandbox", "--disable-setuid-sandbox"] : [],
  });
  const articles: ArticleData[] = [];

  try {
    // Prepare task queue: { url, localPath }
    interface Task {
      url: string;
      localPath: string;
    }
    const tasks: Task[] = urls.map((url) => {
      const localPath = new URL(url).pathname.replace(pathPrefix, "/") || "/";
      return { url, localPath };
    });
    const total = tasks.length;
    let done = 0;

    // Worker: takes tasks from queue, scrapes page, collects result
    async function scrapeWorker(workerId: number) {
      let task: Task | undefined;
      while ((task = tasks.shift())) {
        done++;
        const tag = `[${String(done).padStart(2)}/${total}] W${workerId}`;

        const page = await browser.newPage();
        try {
          await page.goto(`http://localhost:${port}${task.localPath}`, {
            waitUntil: "networkidle0",
            timeout: 30000,
          });

          await page
            .waitForFunction(
              () => {
                const pending = document.querySelectorAll(
                  'pre.mermaid:not([data-processed="true"])',
                );
                return pending.length === 0;
              },
              { timeout: 8000 },
            )
            .catch(() => {});

          await new Promise((r) => setTimeout(r, 400));

          const data = await page.evaluate(() => {
            const article = document.querySelector<HTMLElement>(
              "#quartz-body .center article",
            );
            if (!article) return null;

            const clone = article.cloneNode(true) as HTMLElement;

            clone.querySelectorAll("img[src]").forEach((img) => {
              const src = img.getAttribute("src");
              if (src && !src.startsWith("http") && !src.startsWith("data:")) {
                try {
                  img.setAttribute("src", new URL(src, document.baseURI).href);
                } catch {}
              }
            });

            clone.querySelectorAll("script").forEach((s) => s.remove());

            clone.querySelectorAll("details").forEach((d) => {
              d.setAttribute("open", "");
            });
            clone.querySelectorAll(".callout.is-collapsible.is-collapsed").forEach((c) => {
              c.classList.remove("is-collapsed");
              const content = c.querySelector(".callout-content") as HTMLElement;
              if (content) content.style.gridTemplateRows = "1fr";
            });

            const title =
              document.querySelector("h1.article-title")?.textContent?.trim() ||
              document.title ||
              "";

            return { title, content: clone.innerHTML };
          });

          if (data && data.content) {
            const parts = task.localPath.replace(/\/$/, "").split("/").filter(Boolean);
            const folder = parts.length > 0 ? parts[0] : ".";
            const fileName =
              parts.length > 1 ? parts[parts.length - 1] : "index";

            const sortKey =
              fileName === "index"
                ? `${folder}/__00_index`
                : `${folder}/${fileName}`;

            articles.push({
              path: task.localPath,
              title: data.title,
              content: data.content,
              folder,
              sortKey,
            });
            console.log(`${tag} ${task.localPath} ✓`);
          } else {
            console.log(`${tag} ${task.localPath} (empty)`);
          }
        } catch (err) {
          console.log(`${tag} ${task.localPath} ✗ ${(err as Error).message}`);
        } finally {
          await page.close();
        }
      }
    }

    // Launch parallel workers
    const workers = Array.from({ length: CONCURRENCY }, (_, i) =>
      scrapeWorker(i + 1),
    );
    await Promise.all(workers);

    articles.sort((a, b) =>
      a.sortKey.localeCompare(b.sortKey, undefined, { numeric: true }),
    );
    console.log(`\n   Extracted ${articles.length}/${urls.length} articles.`);

    // 5. Assemble HTML & print to PDF
    console.log("[5/5] Generating PDF...");
    const html = buildHtml(articles);
    mkdirSync(OUTPUT_DIR, { recursive: true });

    const pdfPage = await browser.newPage();
    await pdfPage.setContent(html, {
      waitUntil: "load",
      timeout: 60000,
    });

    // Wait for Google Fonts & KaTeX fonts to load
    await new Promise((r) => setTimeout(r, 2000));

    await pdfPage.pdf({
      path: OUTPUT_FILE,
      format: "A4",
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: "<div></div>",
      footerTemplate: `<div style="font-size:12px;text-align:center;width:100%;color:#a0a8ac;font-family:Inter,sans-serif;">
        - <span class="pageNumber"></span> -
      </div>`,
      margin: {
        top: "2cm",
        bottom: "2cm",
        left: "2cm",
        right: "2cm",
      },
    });

    await pdfPage.close();

    const size = (readFileSync(OUTPUT_FILE).byteLength / 1024 / 1024).toFixed(1);
    console.log(`\n✅ PDF saved: ${OUTPUT_FILE} (${size} MB)`);
  } finally {
    await browser.close();
    server.close();
  }
}

// ═══════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════

/** Detect the GitHub Pages path prefix from sitemap URLs */
function getCommonPathPrefix(urls: string[]): string {
  const paths = urls.map((u) => new URL(u).pathname);
  paths.sort((a, b) => a.length - b.length);
  return paths[0]; // shortest path = site root
}

/** Build the aggregated HTML document */
function buildHtml(articles: ArticleData[]): string {
  const tocItems = articles
    .map(
      (a, i) =>
        `<li><a href="#page-${i}">${escapeHtml(a.title || "(无标题)")}</a></li>`,
    )
    .join("\n");

  const articlesHtml = articles
    .map(
      (a, i) => `
  <div class="article" id="page-${i}">
    <h1 class="a-title">${escapeHtml(a.title || "")}</h1>
    <div class="a-content">
      ${a.content}
    </div>
  </div>`,
    )
    .join("\n");

  const date = new Date().toISOString().split("T")[0];

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>${escapeHtml(SITE_TITLE)}</title>
<style>
  @page { size: A4; }

  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: "Noto Serif SC", Inter, "Helvetica Neue", sans-serif;
    font-size: 10pt;
    line-height: 1.7;
    color: #2a3840;
  }

  /* ── Cover ── */
  .cover {
    page-break-after: always;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    min-height: 90vh;
    text-align: center;
  }
  .cover h1 {
    font-size: 24pt;
    font-family: "Noto Serif SC", serif;
    color: #2a3840;
    margin-bottom: 0.3em;
    letter-spacing: 0.06em;
  }
  .cover .sub {
    font-size: 12pt;
    color: #7a9aaa;
    margin-bottom: 2em;
  }
  .cover .date {
    font-size: 9pt;
    color: #b0b8bc;
  }
  .cover .version {
    font-size: 9pt;
    color: #7a9aaa;
    margin-top: 0.5em;
  }
  .cover .links {
    margin-top: 3em;
    display: flex;
    justify-content: center;
    gap: 1.2em;
    font-size: 8pt;
    color: #a0aab4;
  }
  .cover .links a {
    display: flex;
    align-items: center;
    gap: 0.3em;
    color: #7a9aaa;
    text-decoration: none;
  }
  .cover .links svg {
    width: 14px;
    height: 14px;
    fill: none;
    stroke: #7a9aaa;
    stroke-width: 1.5;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .cover .author {
    margin-top: 2em;
    font-size: 11pt;
    color: #5a6a72;
    font-family: "Inter", sans-serif;
  }

  /* ── TOC ── */
  .toc {
    page-break-after: always;
  }
  .toc h2 {
    font-size: 16pt;
    color: #2a3840;
    margin-bottom: 0.8em;
    padding-bottom: 0.25em;
    border-bottom: 2px solid #7a9aaa;
  }
  .toc ul { list-style: none; }
  .toc li {
    padding: 0.4em 0;
    font-size: 9pt;
    border-bottom: 1px dotted #d4dce2;
  }
  .toc a { color: #2a3840; text-decoration: none; }

  /* ── Articles ── */
  .article {
    page-break-before: always;
  }
  .article:first-of-type {
    page-break-before: auto;
  }
  .a-title {
    font-size: 16pt;
    color: #2a3840;
    margin-bottom: 0.6em;
    padding-bottom: 0.25em;
    border-bottom: 2px solid #7a9aaa;
    font-family: "Noto Serif SC", serif;
    column-span: all;
  }

  /* ── Two-column content ── */
  .a-content {
    column-count: 2;
    column-gap: 1.5cm;
    column-rule: 1px solid #e0e6e9;
    column-fill: auto;
    font-size: 10pt;
  }

  /* ── Typography ── */
  .a-content h1 { font-size: 14pt; margin: 1.2em 0 0.3em; color: #2a3840; break-inside: avoid; }
  .a-content h2 {
    font-size: 12pt;
    margin: 1em 0 0.25em;
    color: #5a6a72;
    border-bottom: 1px solid #e8ecee;
    padding-bottom: 0.15em;
    break-inside: avoid;
  }
  .a-content h3 { font-size: 11pt; margin: 0.9em 0 0.2em; color: #5a6a72; break-inside: avoid; }
  .a-content h4 { font-size: 10pt; margin: 0.8em 0 0.15em; break-inside: avoid; }
  .a-content p { margin: 0.6em 0; font-size: 10pt; }
  .a-content a { color: #4a7a9a; }
  .a-content ul,
  .a-content ol {
    margin: 0.5em 0;
    padding-left: 1.6em;
    font-size: 10pt;
  }
  .a-content li { margin: 0.2em 0; font-size: 10pt; }

  /* ── Code ── */
  .a-content pre {
    background: #f8fafb;
    padding: 0.6em 0.8em;
    border-radius: 3px;
    font-family: "Cascadia Code", "Fira Code", monospace;
    font-size: 7pt;
    line-height: 1.4;
    margin: 0.6em 0;
    border: 1px solid #e0e6e9;
    break-inside: avoid;
  }
  .a-content code {
    font-family: "Cascadia Code", "Fira Code", monospace;
    font-size: 7pt;
  }
  .a-content pre code {
    font-size: 7pt;
    white-space: pre-wrap;
    word-break: break-word;
  }
  .a-content :not(pre) > code {
    background: #f2f4f6;
    padding: 0.1em 0.3em;
    border-radius: 3px;
    color: #c7254e;
    font-size: 7pt;
  }

  /* ── Tables ── */
  .a-content table {
    border-collapse: collapse;
    width: 100%;
    margin: 0.8em 0;
    font-size: 7pt;
    break-inside: avoid;
  }
  .a-content th,
  .a-content td {
    border: 1px solid #d4dce2;
    padding: 0.3em 0.5em;
    text-align: left;
  }
  .a-content th { background: #f5f7f8; font-weight: 600; }
  .a-content tr:nth-child(even) { background: #fafbfc; }

  /* ── Blockquotes ── */
  .a-content blockquote {
    border-left: 3px solid #7a9aaa;
    padding: 0.3em 0.8em;
    color: #5a6a72;
    margin: 0.6em 0;
    background: rgba(122, 154, 170, 0.06);
    border-radius: 0 4px 4px 0;
    break-inside: avoid;
  }
  .a-content blockquote p { font-size: 10pt; }
  .a-content blockquote p:first-child { margin-top: 0; }
  .a-content blockquote p:last-child { margin-bottom: 0; }

  /* ── Lists ── */
  .a-content ul.contains-task-list {
    list-style: none;
    padding-left: 0.5em;
  }
  .a-content .task-list-item { list-style: none; }

  /* ── Images ── */
  .a-content img {
    max-width: 100%;
    max-height: 10cm;
    height: auto;
    display: block;
    margin-left: auto;
    margin-right: auto;
    break-inside: avoid;
  }
  .a-content p:has(img) { text-align: center; }

  /* ── KaTeX ── */
  .a-content .katex { font-size: 1em !important; }
  .a-content .katex-display { margin: 0.8em 0; overflow-x: auto; overflow-y: hidden; break-inside: avoid; }
  .a-content .katex-display > .katex { text-align: center; }

  /* ── Mermaid ── */
  .a-content .mermaid svg {
    max-width: 100%;
    height: auto;
    break-inside: avoid;
  }

  /* ── Horizontal rules ── */
  .a-content hr {
    border: none;
    border-top: 1px solid #d4dce2;
    margin: 1em 0;
  }

  /* ── Strong / Emphasis ── */
  .a-content strong { color: #2a3840; }

  /* ── Obsidian callouts ── */
  .a-content .callout {
    border-left: 4px solid #7a9aaa;
    background: rgba(122, 154, 170, 0.08);
    padding: 0.5em 0.8em;
    margin: 0.6em 0;
    border-radius: 4px;
    break-inside: avoid;
  }
  .a-content .callout-title { font-weight: 600; }

  /* ── Details / collapsible ── */
  .a-content details {
    break-inside: avoid;
    margin: 0.5em 0;
    border-left: 4px solid #7a9aaa;
    background: rgba(122, 154, 170, 0.06);
    border-radius: 4px;
    padding: 0.3em 0.8em;
  }
  .a-content details > summary {
    font-weight: 600;
    color: #5a6a72;
    cursor: default;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 0.3em 0;
    list-style: none;
  }
  .a-content details > summary::-webkit-details-marker { display: none; }
  .a-content details > summary::before {
    content: "";
    display: inline-block;
    width: 14px;
    height: 14px;
    flex: 0 0 14px;
    background-color: #7a9aaa;
    mask-image: url('data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"%3E%3Cpolyline points="6 9 12 15 18 9"%3E%3C/polyline%3E%3C/svg%3E');
    mask-size: 14px 14px;
    mask-position: center;
    mask-repeat: no-repeat;
    transform: rotate(0deg);
    opacity: 0.8;
  }

  /* ── Page break utility ── */
  .page-break { page-break-before: always; }
</style>
<link
  rel="stylesheet"
  href="https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;600;700&amp;family=Inter:wght@400;500;600&amp;display=swap"
/>
<link
  rel="stylesheet"
  href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css"
/>
</head>
<body>
  <div class="cover">
    <h1>${escapeHtml(SITE_TITLE)}</h1>
    <p class="sub">课程笔记${TAG ? ` · ${escapeHtml(TAG)}` : ""}</p>
    <p class="author">by ${escapeHtml(AUTHOR_NAME)}</p>
    <p class="date">${date}</p>
    <div class="links">
      <a href="${SITE_URL}">
        <svg viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
        在线阅读
      </a>
      <a href="${GITHUB_URL}">
        <svg viewBox="0 0 24 24"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg>
        GitHub
      </a>
      <a href="${AUTHOR_URL}">
        <svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        Cateds
      </a>
    </div>
  </div>

  <div class="toc">
    <h2>目录</h2>
    <ul>${tocItems}</ul>
  </div>

  ${articlesHtml}
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

main().catch((err) => {
  console.error("\n❌ Fatal:", err);
  process.exit(1);
});
