import { QuartzConfig } from "./quartz/cfg";
import * as Plugin from "./quartz/plugins";

/**
 * Quartz 4 Configuration
 *
 * See https://quartz.jzhao.xyz/configuration for more information.
 */
const config: QuartzConfig = {
  configuration: {
    pageTitle: "工程项目管理与财务",
    pageTitleSuffix: "",
    enableSPA: true,
    enablePopovers: true,
    analytics: {
      provider: "plausible",
    },
    locale: "zh-CN",
    baseUrl: "https://cateds.github.io/EngProjManagement-Finance.md",
    ignorePatterns: ["private", "templates", ".obsidian"],
    defaultDateType: "modified",
    theme: {
      fontOrigin: "googleFonts",
      cdnCaching: true,
      typography: {
        header: "Noto Serif SC",
        body: "Inter",
        code: "Cascadia Code",
      },
      colors: {
        lightMode: {
          light: "#f8fafb",
          lightgray: "#d4dce2",
          gray: "#7a9aaa",
          darkgray: "#5a6a72",
          dark: "#2a3840",
          secondary: "#7a9aaa",
          tertiary: "#5a6a72",
          highlight: "rgba(122, 154, 170, 0.12)",
          textHighlight: "rgba(122, 154, 170, 0.3)",
        },
        darkMode: {
          light: "#1c2024",
          lightgray: "#3a3e44",
          gray: "#7a8a90",
          darkgray: "#8a9298",
          dark: "#d8dcde",
          secondary: "#7a8a90",
          tertiary: "#8a9298",
          highlight: "rgba(122, 138, 144, 0.18)",
          textHighlight: "rgba(122, 138, 144, 0.3)",
        },
      },
    },
  },
  plugins: {
    transformers: [
      Plugin.FrontMatter(),
      Plugin.CreatedModifiedDate({
        priority: ["frontmatter", "git", "filesystem"],
      }),
      Plugin.SyntaxHighlighting({
        theme: {
          light: "github-light",
          dark: "github-dark",
        },
        keepBackground: false,
      }),
      Plugin.ObsidianFlavoredMarkdown({ enableInHtmlEmbed: false }),
      Plugin.GitHubFlavoredMarkdown(),
      Plugin.TableOfContents(),
      Plugin.CrawlLinks({ markdownLinkResolution: "shortest" }),
      Plugin.Description(),
      Plugin.Latex({ renderEngine: "katex" }),
    ],
    filters: [Plugin.RemoveDrafts()],
    emitters: [
      Plugin.AliasRedirects(),
      Plugin.ComponentResources(),
      Plugin.ContentPage(),
      Plugin.FolderPage(),
      Plugin.TagPage(),
      Plugin.ContentIndex({
        enableSiteMap: true,
        enableRSS: true,
      }),
      Plugin.Assets(),
      Plugin.Static(),
      Plugin.Favicon(),
      Plugin.NotFoundPage(),
      // Comment out CustomOgImages to speed up build time
      Plugin.CustomOgImages(),
    ],
  },
};

export default config;
