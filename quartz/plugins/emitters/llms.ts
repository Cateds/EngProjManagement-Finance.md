import fs from "fs";
import path from "path";
import { BuildCtx } from "../../util/ctx";
import {
  FilePath,
  FullSlug,
  joinSegments,
  simplifySlug,
  slugifyFilePath,
} from "../../util/path";
import { ProcessedContent } from "../vfile";
import { QuartzEmitterPlugin } from "../types";
import { write } from "./helpers";

type SourceDoc = {
  relPath: FilePath;
  title: string;
  body: string;
  url: string;
};

const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;
const wikiLinkRegex = /!?\[\[([^\]]+)\]\]/g;

function stripQuotes(value: string): string {
  return value.trim().replace(/^(["'])(.*)\1$/, "$2");
}

function parseMarkdown(
  raw: string,
  fallbackTitle: string,
): { title: string; body: string } {
  const match = raw.match(frontmatterRegex);
  if (!match) {
    return { title: fallbackTitle, body: raw.trim() };
  }

  const title = match[1].match(/^title:\s*(.+?)\s*$/m)?.[1];
  return {
    title: title ? stripQuotes(title) : fallbackTitle,
    body: raw.slice(match[0].length).trim(),
  };
}

function toPublicUrl(ctx: BuildCtx, slug: string): string {
  const baseUrl = ctx.cfg.configuration.baseUrl ?? "";
  return `https://${joinSegments(baseUrl, encodeURI(slug))}`;
}

function docUrl(ctx: BuildCtx, relPath: FilePath): string {
  const slug = simplifySlug(slugifyFilePath(relPath, true));
  return toPublicUrl(ctx, slug);
}

function assetUrl(ctx: BuildCtx, relPath: FilePath): string {
  return toPublicUrl(ctx, slugifyFilePath(relPath));
}

function linkTarget(rawTarget: string): string {
  return rawTarget.split("|", 1)[0].split("#", 1)[0].trim();
}

function displayText(rawTarget: string): string {
  const parts = rawTarget.split("|");
  if (parts.length > 1) {
    return parts.slice(1).join("|").trim();
  }

  const target = rawTarget.split("#").pop() ?? rawTarget;
  return target.split("/").pop()?.replace(/\.md$/, "").trim() ?? rawTarget;
}

function resolveDocLink(
  docsByStem: Map<string, FilePath>,
  docsByBasename: Map<string, FilePath>,
  fromPath: FilePath,
  target: string,
): FilePath | undefined {
  const normalizedTarget = target
    .replace(/\.md$/, "")
    .replace(/^\/+/, "")
    .replace(/\/+$/, "");
  const fromDir = path.posix.dirname(fromPath);
  const relativeTarget =
    fromDir === "."
      ? normalizedTarget
      : joinSegments(fromDir, normalizedTarget);

  return (
    docsByStem.get(relativeTarget) ??
    docsByStem.get(normalizedTarget) ??
    docsByBasename.get(normalizedTarget)
  );
}

function orderedDocs(docs: SourceDoc[]): SourceDoc[] {
  const docsByPath = new Map(docs.map((doc) => [doc.relPath, doc]));
  const docsByStem = new Map(
    docs.map((doc) => [doc.relPath.replace(/\.md$/, ""), doc.relPath]),
  );
  const basenameCandidates = new Map<string, FilePath[]>();

  for (const doc of docs) {
    const basename = path.posix.basename(doc.relPath, ".md");
    basenameCandidates.set(basename, [
      ...(basenameCandidates.get(basename) ?? []),
      doc.relPath,
    ]);
  }

  const docsByBasename = new Map(
    Array.from(basenameCandidates.entries())
      .filter(([, paths]) => paths.length === 1)
      .map(([basename, paths]) => [basename, paths[0]]),
  );

  const ordered: SourceDoc[] = [];
  const seen = new Set<FilePath>();

  const visit = (relPath: FilePath) => {
    const doc = docsByPath.get(relPath);
    if (!doc || seen.has(relPath)) return;

    seen.add(relPath);
    ordered.push(doc);

    if (relPath === "index.md" || relPath.endsWith("/index.md")) {
      for (const match of doc.body.matchAll(wikiLinkRegex)) {
        const target = linkTarget(match[1]);
        const resolved = resolveDocLink(
          docsByStem,
          docsByBasename,
          relPath,
          target,
        );
        if (resolved) visit(resolved);
      }
    }
  };

  visit("index.md" as FilePath);

  for (const doc of docs.sort((left, right) =>
    left.relPath.localeCompare(right.relPath),
  )) {
    visit(doc.relPath);
  }

  return ordered;
}

function shiftHeadings(markdown: string): string {
  let inCodeBlock = false;
  return markdown
    .split("\n")
    .map((line) => {
      if (/^\s*(```|~~~)/.test(line)) {
        inCodeBlock = !inCodeBlock;
        return line;
      }

      if (inCodeBlock) return line;

      return line.replace(
        /^(#{1,6})(\s+)/,
        (_match, hashes: string, spacing: string) => {
          return `${"#".repeat(Math.min(hashes.length + 1, 6))}${spacing}`;
        },
      );
    })
    .join("\n");
}

function transformBody(
  ctx: BuildCtx,
  body: string,
  assetsByBasename: Map<string, FilePath>,
): string {
  const transformedLinks = body.replace(
    wikiLinkRegex,
    (match: string, rawTarget: string) => {
      if (match.startsWith("!")) {
        const target = linkTarget(rawTarget);
        const filename = path.posix.basename(target);
        const relPath =
          assetsByBasename.get(filename) ??
          (joinSegments("Assets", filename) as FilePath);
        return `[Image: ${filename}](${assetUrl(ctx, relPath)})`;
      }

      return displayText(rawTarget);
    },
  );

  return shiftHeadings(transformedLinks).trim();
}

async function collectDocs(
  ctx: BuildCtx,
  content: ProcessedContent[],
): Promise<SourceDoc[]> {
  const markdownPaths = content
    .map(([, file]) => file.data.relativePath)
    .filter((relPath): relPath is FilePath => Boolean(relPath))
    .sort((left, right) => left.localeCompare(right));

  const docs = await Promise.all(
    markdownPaths.map(async (relPath) => {
      const fullPath = joinSegments(ctx.argv.directory, relPath);
      const raw = await fs.promises.readFile(fullPath, "utf8");
      const parsed = parseMarkdown(raw, relPath);
      return {
        relPath,
        title: parsed.title,
        body: parsed.body,
        url: docUrl(ctx, relPath),
      };
    }),
  );

  return orderedDocs(docs);
}

function buildAssetsByBasename(ctx: BuildCtx): Map<string, FilePath> {
  const assets = ctx.allFiles.filter((fp) => !fp.endsWith(".md"));
  return new Map(assets.map((fp) => [path.posix.basename(fp), fp as FilePath]));
}

function sourceFileLabel(relPath: FilePath): string {
  return joinSegments("content", relPath);
}

function buildSourceMap(docs: SourceDoc[]): string {
  return docs
    .map(
      (doc) =>
        `- [${doc.title}](${doc.url}) — \`${sourceFileLabel(doc.relPath)}\``,
    )
    .join("\n");
}

function buildCourseOutline(docs: SourceDoc[]): string {
  const partDocs = docs.filter(
    (doc) => doc.relPath !== "index.md" && doc.relPath.endsWith("/index.md"),
  );

  return partDocs
    .map((part) => {
      const partDir = path.posix.dirname(part.relPath);
      const lectures = docs.filter(
        (doc) =>
          doc.relPath !== part.relPath && doc.relPath.startsWith(`${partDir}/`),
      );
      const lectureItems = lectures
        .map(
          (lecture) =>
            `  - [${lecture.title}](${lecture.url}): \`${sourceFileLabel(lecture.relPath)}\``,
        )
        .join("\n");

      return [
        `- [${part.title}](${part.url}): \`${sourceFileLabel(part.relPath)}\``,
        lectureItems,
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n");
}

function buildFullText(ctx: BuildCtx, docs: SourceDoc[]): string {
  const assetsByBasename = buildAssetsByBasename(ctx);
  const fullUrl = toPublicUrl(ctx, "llms-full.txt");
  const indexUrl = toPublicUrl(ctx, "llms.txt");
  const siteUrl = toPublicUrl(ctx, "/");
  const sections = docs.map((doc) => {
    const body = transformBody(ctx, doc.body, assetsByBasename);
    return [
      `# ${doc.title}`,
      `Source file: \`${sourceFileLabel(doc.relPath)}\``,
      `Canonical URL: ${doc.url}`,
      "",
      body,
    ].join("\n");
  });

  return [
    "# Engineering Project Management & Finance",
    "",
    "> Consolidated LLM-readable source generated from the Quartz course notes.",
    "",
    `Canonical site: ${siteUrl}`,
    `LLM index: ${indexUrl}`,
    `Full source: ${fullUrl}`,
    "",
    "## Source Map",
    "",
    buildSourceMap(docs),
    "",
    "---",
    "",
    sections.join("\n\n---\n\n"),
    "",
  ].join("\n");
}

function buildIndexText(ctx: BuildCtx, docs: SourceDoc[]): string {
  const siteUrl = toPublicUrl(ctx, "/");
  const fullUrl = toPublicUrl(ctx, "llms-full.txt");

  return [
    "# Engineering Project Management & Finance",
    "",
    "> Lecture notes for Engineering Project Management & Finance (EPM&F), Glasgow College, UESTC.",
    "",
    "This site is primarily written in Chinese and contains course notes on project management, design for manufacturing, engineering economics, and company management.",
    "",
    "## For LLMs",
    "",
    `- [Full LLM source](${fullUrl}): complete consolidated Markdown source for tools like NotebookLM or custom knowledge bases.`,
    `- [Canonical website](${siteUrl}): rendered Quartz site for human browsing.`,
    "",
    "## Course Sections",
    "",
    buildCourseOutline(docs),
    "",
  ].join("\n");
}

async function* emitLLMFiles(
  ctx: BuildCtx,
  content: ProcessedContent[],
): AsyncGenerator<FilePath> {
  const docs = await collectDocs(ctx, content);
  yield write({
    ctx,
    slug: "llms" as FullSlug,
    ext: ".txt",
    content: buildIndexText(ctx, docs),
  });
  yield write({
    ctx,
    slug: "llms-full" as FullSlug,
    ext: ".txt",
    content: buildFullText(ctx, docs),
  });
}

export const LLMFiles: QuartzEmitterPlugin = () => ({
  name: "LLMFiles",
  async *emit(ctx, content) {
    yield* emitLLMFiles(ctx, content);
  },
  async *partialEmit(ctx, content, _resources, changeEvents) {
    if (changeEvents.length > 0) {
      yield* emitLLMFiles(ctx, content);
    }
  },
});
