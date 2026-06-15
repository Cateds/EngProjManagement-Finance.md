export const PDF_STYLES = `
@page { size: A4; }

* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: "Inter", "Noto Sans SC", "Noto Sans CJK SC", "Helvetica Neue", sans-serif;
  font-size: 10pt;
  line-height: 1.7;
  color: #5a6a72;
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
  font-family: "Noto Serif SC", "Noto Serif CJK SC", serif;
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
.cover .license {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.7em;
  margin-top: 2em;
  font-size: 8pt;
  color: #8a9298;
}
.cover .license a {
  display: inline-flex;
  align-items: center;
  gap: 0.3em;
  color: #7a9aaa;
  text-decoration: none;
}
.cover .license svg {
  width: 14px;
  height: 14px;
  fill: none;
  stroke: #7a9aaa;
  stroke-width: 1.5;
  stroke-linecap: round;
  stroke-linejoin: round;
}

/* ── Part Label ── */
.part-label {
  font-size: 12pt;
  font-family: "Noto Serif SC", "Noto Serif CJK SC", serif;
  color: #7a9aaa;
  margin-bottom: 0.3em;
  font-weight: 600;
  letter-spacing: 0.02em;
}

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
  font-family: "Noto Serif SC", "Noto Serif CJK SC", serif;
  font-weight: 600;
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

/* ── Index page (single column) ── */
.index-content {
  column-count: 1;
  font-size: 9.2pt;
  line-height: 1.55;
}

/* ── Typography ── */
.a-content h1,
.index-content h1 { font-size: 14pt; font-family: "Noto Serif SC", "Noto Serif CJK SC", serif; font-weight: 600; margin: 1.2em 0 0.3em; color: #2a3840; break-inside: avoid; }
.a-content h2,
.index-content h2 {
  font-size: 12pt;
  font-family: "Noto Serif SC", "Noto Serif CJK SC", serif;
  font-weight: 600;
  margin: 1em 0 0.25em;
  color: #5a6a72;
  border-bottom: 1px solid #e8ecee;
  padding-bottom: 0.15em;
  break-inside: avoid;
}
.a-content h3,
.index-content h3 { font-size: 11pt; font-family: "Noto Serif SC", "Noto Serif CJK SC", serif; font-weight: 600; margin: 0.9em 0 0.2em; color: #5a6a72; break-inside: avoid; }
.a-content h4,
.index-content h4 { font-size: 10pt; font-family: "Noto Serif SC", "Noto Serif CJK SC", serif; font-weight: 600; margin: 0.8em 0 0.15em; break-inside: avoid; }
.a-content p,
.index-content p { margin: 0.6em 0; font-size: 10pt; }
.a-content a,
.index-content a { color: #4a7a9a; }
.a-content ul,
.index-content ul,
.a-content ol,
.index-content ol {
  margin: 0.5em 0;
  padding-left: 1.6em;
  font-size: 10pt;
}
.a-content li,
.index-content li { margin: 0.2em 0; font-size: 10pt; }

/* ── Compact home index ── */
.index-content h2 {
  margin: 0.65em 0 0.15em;
  font-size: 11.5pt;
  break-after: avoid;
}
.index-content p {
  margin: 0.35em 0;
  font-size: 9.2pt;
}
.index-content blockquote {
  margin: 0.4em 0;
  padding: 0.25em 0.7em;
}
.index-content blockquote p {
  font-size: 9.2pt;
}
.index-content ul,
.index-content ol {
  margin: 0.25em 0;
  padding-left: 1.35em;
  font-size: 9.2pt;
}
.index-content li {
  margin: 0.04em 0;
  font-size: 9.2pt;
}

/* ── Code ── */
.a-content pre,
.index-content pre {
  background: #f8fafb;
  padding: 0.6em 0.8em;
  border-radius: 8px;
  font-family: "Cascadia Code", "Fira Code", monospace;
  font-size: 7pt;
  line-height: 1.4;
  margin: 0.6em 0;
  border: 1px solid #d4dce2;
  break-inside: avoid;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}
.a-content code,
.index-content code {
  font-family: "Cascadia Code", "Fira Code", monospace;
  font-size: 7pt;
}
.a-content pre code,
.index-content pre code {
  font-size: 7pt;
  white-space: pre-wrap;
  word-break: break-word;
}
.a-content :not(pre) > code,
.index-content :not(pre) > code {
  background: #f2f4f6;
  padding: 0.1em 0.3em;
  border-radius: 4px;
  color: #c7254e;
  font-size: 7pt;
}

/* ── Tables ── */
.a-content table,
.index-content table {
  border-collapse: collapse;
  width: 100%;
  margin: 0.8em 0;
  font-size: 7pt;
  break-inside: avoid;
  border-radius: 8px;
  overflow: hidden;
}
.a-content th,
.index-content th,
.a-content td,
.index-content td {
  border: 1px solid #d4dce2;
  padding: 0.3em 0.5em;
  text-align: left;
}
.a-content th,
.index-content th { background: #f5f7f8; font-weight: 600; }
.a-content tr:nth-child(even) { background: #fafbfc; }

/* ── Blockquotes ── */
.a-content blockquote,
.index-content blockquote {
  border-left: 3px solid #7a9aaa;
  padding: 0.3em 0.8em;
  color: #5a6a72;
  margin: 0.6em 0;
  background: rgba(122, 154, 170, 0.06);
  border-radius: 0 8px 8px 0;
  break-inside: avoid;
}
.a-content blockquote p,
.index-content blockquote p { font-size: 10pt; }
.a-content blockquote p:first-child,
.index-content blockquote p:first-child { margin-top: 0; }
.a-content blockquote p:last-child,
.index-content blockquote p:last-child { margin-bottom: 0; }

/* ── Lists ── */
.a-content ul.contains-task-list,
.index-content ul.contains-task-list {
  list-style: none;
  padding-left: 0.5em;
}
.a-content .task-list-item { list-style: none; }

/* ── Images ── */
.a-content img,
.index-content img {
  max-width: 100%;
  max-height: 10cm;
  height: auto;
  display: block;
  margin-left: auto;
  margin-right: auto;
  break-inside: avoid;
}
.a-content p:has(img),
.index-content p:has(img) { text-align: center; }

/* ── KaTeX ── */
.a-content .katex,
.index-content .katex { font-size: 1em !important; }
.a-content .katex-display,
.index-content .katex-display { margin: 0.8em 0; overflow-x: auto; overflow-y: hidden; break-inside: avoid; }
.a-content .katex-display > .katex,
.index-content .katex-display > .katex { text-align: center; }

/* ── Mermaid ── */
.a-content .mermaid svg,
.index-content .mermaid svg {
  max-width: 100%;
  height: auto;
  break-inside: avoid;
}

/* ── Horizontal rules ── */
.a-content hr,
.index-content hr {
  border: none;
  border-top: 1px solid #d4dce2;
  margin: 1em 0;
}

/* ── Quiz cards ── */
.a-content .question-card,
.index-content .question-card {
  break-inside: auto;
  margin: 0.9em 0 1.1em;
  padding: 0.15em 0 0.15em 0.8em;
  border: none;
  border-left: 4px solid #7a9aaa;
  border-radius: 0;
  background: transparent;
}
.a-content .question-title,
.index-content .question-title {
  break-inside: avoid;
  margin: 0 0 0.6em;
  color: #2a3840;
  font-size: 9pt;
  line-height: 1.55;
}
.a-content .quiz-options,
.index-content .quiz-options {
  display: block;
  margin-top: 0.55em;
}
.a-content .quiz-option,
.index-content .quiz-option {
  appearance: none;
  break-inside: avoid;
  display: grid;
  grid-template-columns: 1.6em 1fr;
  gap: 0.45em;
  align-items: start;
  width: 100%;
  margin: 0.35em 0;
  padding: 0.45em 0.55em;
  border: 1px solid #d4dce2;
  border-radius: 7px;
  background: #ffffff;
  color: #5a6a72;
  font: inherit;
  font-size: 8.5pt;
  line-height: 1.45;
  text-align: left;
}
.a-content .quiz-option-letter,
.index-content .quiz-option-letter {
  display: inline-grid;
  place-items: center;
  width: 1.35em;
  height: 1.35em;
  border: 1px solid #7a9aaa;
  border-radius: 999px;
  color: #7a9aaa;
  font-size: 7pt;
  font-weight: 700;
  line-height: 1;
}
.a-content .quiz-card[data-answer="A"] .quiz-option[data-option="A"],
.a-content .quiz-card[data-answer="B"] .quiz-option[data-option="B"],
.a-content .quiz-card[data-answer="C"] .quiz-option[data-option="C"],
.a-content .quiz-card[data-answer="D"] .quiz-option[data-option="D"],
.a-content .quiz-card[data-answer="E"] .quiz-option[data-option="E"],
.index-content .quiz-card[data-answer="A"] .quiz-option[data-option="A"],
.index-content .quiz-card[data-answer="B"] .quiz-option[data-option="B"],
.index-content .quiz-card[data-answer="C"] .quiz-option[data-option="C"],
.index-content .quiz-card[data-answer="D"] .quiz-option[data-option="D"],
.index-content .quiz-card[data-answer="E"] .quiz-option[data-option="E"] {
  border-color: #2f9e63;
  background: #eef8f2;
  color: #2a3840;
}
.a-content .quiz-card[data-answer="A"] .quiz-option[data-option="A"] .quiz-option-letter,
.a-content .quiz-card[data-answer="B"] .quiz-option[data-option="B"] .quiz-option-letter,
.a-content .quiz-card[data-answer="C"] .quiz-option[data-option="C"] .quiz-option-letter,
.a-content .quiz-card[data-answer="D"] .quiz-option[data-option="D"] .quiz-option-letter,
.a-content .quiz-card[data-answer="E"] .quiz-option[data-option="E"] .quiz-option-letter,
.index-content .quiz-card[data-answer="A"] .quiz-option[data-option="A"] .quiz-option-letter,
.index-content .quiz-card[data-answer="B"] .quiz-option[data-option="B"] .quiz-option-letter,
.index-content .quiz-card[data-answer="C"] .quiz-option[data-option="C"] .quiz-option-letter,
.index-content .quiz-card[data-answer="D"] .quiz-option[data-option="D"] .quiz-option-letter,
.index-content .quiz-card[data-answer="E"] .quiz-option[data-option="E"] .quiz-option-letter {
  border-color: #2f9e63;
  background: #2f9e63;
  color: #ffffff;
}
.a-content .quiz-explanation,
.index-content .quiz-explanation {
  break-inside: avoid;
  display: block;
  margin-top: 0.6em;
  padding: 0.6em 0.7em;
  border: 1px solid #d4dce2;
  border-radius: 7px;
  background: #ffffff;
  color: #5a6a72;
  font-size: 8.5pt;
  line-height: 1.55;
}
.a-content .quiz-explanation p,
.index-content .quiz-explanation p {
  margin: 0.25em 0;
  font-size: 8.5pt;
}
.a-content .quiz-answer,
.index-content .quiz-answer {
  color: #2f9e63;
  font-weight: 700;
}

/* ── Strong / Emphasis ── */
.a-content strong,
.index-content strong { color: #2a3840; }

/* ── Obsidian callouts ── */
.a-content .callout,
.index-content .callout {
  border: 1px solid #d4dce2;
  background: rgba(122, 154, 170, 0.06);
  padding: 0 0.8em;
  margin: 0.8em 0;
  border-radius: 5px;
  break-inside: avoid;
}
.a-content .callout.is-collapsible .callout-content,
.index-content .callout.is-collapsible .callout-content {
  display: block !important;
  grid-template-rows: 1fr !important;
}
.a-content .callout-title,
.index-content .callout-title {
  font-weight: 600;
  display: flex;
  align-items: flex-start;
  gap: 5px;
  padding: 0.6em 0;
  color: #7a9aaa;
}
.a-content .callout-title-inner,
.index-content .callout-title-inner { font-weight: 600; }

/* ── Details / Summary (抽屉) ── */
.a-content details,
.index-content details {
  break-inside: avoid;
  margin: 0.8em auto;
  border: 1px solid #d4dce2;
  border-radius: 8px;
  background: #f8fafb;
  padding: 0;
}
.a-content details > summary,
.index-content details > summary {
  font-weight: 600;
  font-size: 0.95em;
  color: #2a3840;
  cursor: default;
  padding: 0.5em 0.8em 0.5em 2em;
  border-bottom: 1px solid transparent;
  border-radius: 8px;
  list-style: none;
  position: relative;
}
.a-content details > summary::-webkit-details-marker,
.index-content details > summary::-webkit-details-marker { display: none; }
.a-content details > summary::marker,
.index-content details > summary::marker { display: none; content: ""; }
.a-content details > summary::before,
.index-content details > summary::before {
  content: "\\25B6";
  position: absolute;
  left: 0.6em;
  top: 50%;
  transform: translateY(-50%);
  font-size: 0.7em;
  color: #7a9aaa;
  line-height: 1;
}
.a-content details[open],
.index-content details[open] {
  border-color: #b0c4d0;
}
.a-content details[open] > summary,
.index-content details[open] > summary {
  border-bottom-color: #d4dce2;
  border-radius: 8px 8px 0 0;
}
.a-content details[open] > summary::before,
.index-content details[open] > summary::before {
  content: "\\25B6";
  transform: translateY(-50%) rotate(90deg);
}
.a-content details[open] > :not(summary),
.index-content details[open] > :not(summary) {
  padding: 0.6em 0.8em 0.8em;
  color: #5a6a72;
  line-height: 1.6;
}
.a-content details details,
.index-content details details {
  margin-left: 1em;
  font-size: 0.95em;
}
.article-misc details,
.article-misc .callout.is-collapsible,
.article-misc .quiz-explanation {
  break-inside: auto;
  page-break-inside: auto;
}
.article-misc details > summary {
  break-inside: avoid;
  page-break-inside: avoid;
}
.article-misc table {
  break-inside: auto;
  page-break-inside: auto;
  overflow: visible;
}
.article-misc thead {
  display: table-header-group;
}
.article-misc tr {
  break-inside: avoid;
  page-break-inside: avoid;
}

/* ── Page break utility ── */
.page-break { page-break-before: always; }
`;
