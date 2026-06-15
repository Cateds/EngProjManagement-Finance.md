import puppeteer from "puppeteer";
import http from "node:http";
import { readFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";
import { execSync } from "node:child_process";
import serveHandler from "serve-handler";
import { buildHtml, type ArticleData } from "./build-html";
import { rewriteInternalLinks } from "./rewrite-links";

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
const LICENSE_URL = "https://creativecommons.org/licenses/by-sa/4.0/";

const SKIP_BUILD = process.argv.includes("--skip-build");
const CI = process.env.CI === "true";
const TAG =
  process.argv
    .find((a, i) => a === "--tag" && process.argv[i + 1])
    ?.replace("--tag ", "") ||
  process.env.RELEASE_TAG ||
  "";
const OUTPUT_FILE = join(OUTPUT_DIR, "EngProjManagement-Finance.pdf");

async function main() {
  // 1. Build (skip if already done in CI)
  if (!SKIP_BUILD) {
    console.log("[1/5] Building site...");
    execSync("bun run build", { stdio: "inherit", cwd: process.cwd() });
  } else {
    console.log("[1/5] Build skipped (public dir already exists)");
    if (!readFileSync(SITEMAP_PATH, "utf-8").trim()) {
      console.error(
        "❌ Sitemap is empty. Run build first or check public/ dir.",
      );
      process.exit(1);
    }
  }

  if (!readFileSync(SITEMAP_PATH, "utf-8").trim()) {
    console.error(
      "❌ Sitemap is empty. Build may have failed or enableSiteMap is off.",
    );
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
  const partTitles = extractPartTitles();
  console.log(
    `   Part titles: ${JSON.stringify(Object.fromEntries(partTitles))}`,
  );

  try {
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
            clone
              .querySelectorAll(".callout.is-collapsible.is-collapsed")
              .forEach((c) => {
                c.classList.remove("is-collapsed");
                const content = c.querySelector(
                  ".callout-content",
                ) as HTMLElement;
                if (content) content.style.gridTemplateRows = "1fr";
              });

            const title =
              document.querySelector("h1.article-title")?.textContent?.trim() ||
              document.title ||
              "";

            return { title, content: clone.innerHTML };
          });

          if (data && data.content) {
            const parts = task.localPath
              .replace(/\/$/, "")
              .split("/")
              .filter(Boolean);
            const folder = parts.length > 0 ? parts[0] : ".";
            const fileName =
              parts.length > 1 ? parts[parts.length - 1] : "index";

            // Skip Part index pages (Part1/index.md, Part2/index.md, etc.)
            if (folder.startsWith("Part") && fileName === "index") {
              console.log(`${tag} ${task.localPath} (skipped - part index)`);
              continue;
            }

            const sortKey = pdfSortKey(folder, fileName);

            // Determine part title for articles in Part directories
            const partTitle = partTitles.get(folder) || undefined;

            articles.push({
              path: task.localPath,
              title: data.title,
              content: data.content,
              folder,
              sortKey,
              partTitle,
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

    const workers = Array.from({ length: CONCURRENCY }, (_, i) =>
      scrapeWorker(i + 1),
    );
    await Promise.all(workers);

    articles.sort((a, b) =>
      a.sortKey.localeCompare(b.sortKey, undefined, { numeric: true }),
    );
    console.log(`\n   Extracted ${articles.length}/${urls.length} articles.`);

    // Rewrite internal links for PDF
    rewriteInternalLinks(articles, pathPrefix);

    // 5. Assemble HTML & print to PDF
    console.log("[5/5] Generating PDF...");
    const html = buildHtml(articles, {
      siteTitle: SITE_TITLE,
      tag: TAG,
      siteUrl: SITE_URL,
      githubUrl: GITHUB_URL,
      authorUrl: AUTHOR_URL,
      authorName: AUTHOR_NAME,
      licenseUrl: LICENSE_URL,
    });
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
      footerTemplate: `<div style="font-size:10px;text-align:center;width:100%;color:#a0a8ac;font-family:Inter,sans-serif;">
        <span class="pageNumber"></span>
      </div>`,
      margin: {
        top: "2cm",
        bottom: "2cm",
        left: "2cm",
        right: "2cm",
      },
    });

    await pdfPage.close();

    const size = (readFileSync(OUTPUT_FILE).byteLength / 1024 / 1024).toFixed(
      1,
    );
    console.log(`\n✅ PDF saved: ${OUTPUT_FILE} (${size} MB)`);
  } finally {
    await browser.close();
    server.close();
  }
}

function getCommonPathPrefix(urls: string[]): string {
  const paths = urls.map((u) => new URL(u).pathname);
  paths.sort((a, b) => a.length - b.length);
  return paths[0];
}

function pdfSortKey(folder: string, fileName: string): string {
  if (folder === ".") return "00-root/__00_index";
  if (folder.startsWith("Part")) {
    return fileName === "index"
      ? `${folder}/__00_index`
      : `${folder}/${fileName}`;
  }
  const pageKey = fileName === "index" ? "__00_index" : fileName;
  return `ZZ-${folder}/${pageKey}`;
}

function extractPartTitles(): Map<string, string> {
  const partTitles = new Map<string, string>();
  const contentDir = resolve(process.cwd(), "content");
  const partDirs = ["Part1", "Part2", "Part3", "Part4"];

  for (const partDir of partDirs) {
    const indexPath = join(contentDir, partDir, "index.md");
    if (existsSync(indexPath)) {
      const content = readFileSync(indexPath, "utf-8");
      const titleMatch = content.match(/^title:\s*(.+)$/m);
      if (titleMatch) {
        partTitles.set(partDir, titleMatch[1].trim());
      }
    }
  }

  return partTitles;
}

main().catch((err) => {
  console.error("\n❌ Fatal:", err);
  process.exit(1);
});
