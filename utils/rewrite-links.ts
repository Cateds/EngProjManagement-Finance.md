import { type ArticleData } from "./build-html";

function normalizePath(p: string): string {
  return p.replace(/\/+$/, "") || "/";
}

/**
 * Rewrite internal links so they work inside the single-page PDF.
 *
 * Link patterns found in Quartz output:
 *   ../Part3/lec.13               → cross-page relative
 *   ../Part1/lec.1#pmbok-指南      → cross-page + fragment
 *   #项目范围管理                   → same-page fragment
 *   ../Part1/                      → cross-page to folder index
 *   ..                             → parent directory
 *   ./Part1/lec.1                  → explicit relative
 *
 * External links (http, mailto) and resource links (/static/*, *.css) are kept.
 *
 * Heading ids are prefixed with page-N-- so fragments don't collide.
 */
export function rewriteInternalLinks(
  articles: ArticleData[],
  _pathPrefix: string, // unused but kept for API stability
): ArticleData[] {
  // ── 1. Build normalized path → pageIndex map ──
  const pathToIndex = new Map<string, number>();

  for (let i = 0; i < articles.length; i++) {
    const p = normalizePath(articles[i].path);
    pathToIndex.set(p, i);
    pathToIndex.set(p.slice(1) || "/", i);
    pathToIndex.set(p + "/", i);
  }

  // ── 2. Rewrite each article ──
  for (let i = 0; i < articles.length; i++) {
    let content = articles[i].content;
    const basePath = articles[i].path; // e.g. /Part1/lec.1

    // Step A: prefix all heading ids so they are unique across articles
    content = content.replace(
      /<(h[1-6])\b([^>]*?)\sid="([^"]*)"/gi,
      (_m, tag: string, before: string, id: string) => `<${tag}${before} id="page-${i}--${id}"`,
    );

    // Step B: rewrite all <a href>
    content = content.replace(/\shref="([^"]*)"/gi, (_m, rawHref: string) => {
      const newHref = resolveHref(rawHref, basePath, pathToIndex);
      return ` href="${newHref}"`;
    });

    articles[i].content = content;
  }

  return articles;
}

// ── helpers ────────────────────────────────────────────────────────

/** Resolve a relative or absolute internal href to a PDF #page anchor. */
function resolveHref(orig: string, basePath: string, pathToIndex: Map<string, number>): string {
  // Absolute (http, mailto, data, etc.)
  if (/^(https?:\/\/|mailto:|data:)/i.test(orig)) return orig;
  // Resource files
  if (/\.(css|js|png|ico|webp|svg|xml|woff|ttf|woff2)(\?|$)/i.test(orig)) return orig;

  // Split path / fragment
  const hashIdx = orig.indexOf("#");
  const relPath = hashIdx >= 0 ? orig.slice(0, hashIdx) : orig;
  const fragment = hashIdx >= 0 ? orig.slice(hashIdx + 1) : "";

  // Resolve relative → absolute
  const absPath = resolveRelative(basePath, relPath);

  // Try direct match
  let targetIndex = pathToIndex.get(absPath);
  // Also try without trailing slash variants
  if (targetIndex === undefined) targetIndex = pathToIndex.get(absPath.replace(/\/$/, ""));
  if (targetIndex === undefined) targetIndex = pathToIndex.get(absPath + "/");
  if (targetIndex === undefined) targetIndex = pathToIndex.get(absPath.slice(1));

  // Not a known page path → leave as-is
  if (targetIndex === undefined) return orig;

  return fragment ? `#page-${targetIndex}--${fragment}` : `#page-${targetIndex}`;
}

/** Resolve a relative URL string against a base path like /Part1/lec.1 → /Part3/lec.13 */
function resolveRelative(base: string, rel: string): string {
  if (!rel || rel === ".") return normalizePath(base);
  if (rel.startsWith("/")) return normalizePath(rel);

  // base directory: /Part1/lec.1 → /Part1/
  const baseDir = base.substring(0, base.lastIndexOf("/") + 1);
  const parts = baseDir.split("/").filter(Boolean);

  for (const seg of rel.split("/")) {
    if (seg === "..") {
      parts.pop();
    } else if (seg && seg !== ".") {
      parts.push(seg);
    }
  }

  return "/" + parts.join("/");
}
