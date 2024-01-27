import { QuartzConfig } from "./quartz/cfg"
import * as Plugin from "./quartz/plugins"

const nord = {
  nord0: "#2e3440",
  nord1: "#3b4252",
  nord2: "#434c5e",
  nord3: "#4c566a",
  nord4: "#d8dee9",
  nord5: "#e5e9f0",
  nord6: "#eceff4",
  nord7: "#8fbcbb",
  nord8: "#88c0d0",
  nord9: "#81a1c1",
  nord10: "#5e81ac",
  nord11: "#bf616a",
  nord12: "#d08770",
  nord13: "#ebcb8b",
  nord14: "#a3be8c",
  nord15: "#b48ead",
};

const nordName = {
  PolarNight0: nord.nord0,
  PolarNight1: nord.nord1,
  PolarNight2: nord.nord2,
  PolarNight3: nord.nord3,
  SnowStorm0: nord.nord4,
  SnowStorm1: nord.nord5,
  SnowStorm2: nord.nord6,
  Frost0: nord.nord7,
  Frost1: nord.nord8,
  Frost2: nord.nord9,
  Frost3: nord.nord10,
}

const config: QuartzConfig = {
  configuration: {
    pageTitle: "EupHgh's Blog",
    enableSPA: true,
    enablePopovers: true,
    analytics: {
      provider: "plausible",
    },
    baseUrl: "euphgh.github.io",
    ignorePatterns: ["private", "templates", ".obsidian"],
    defaultDateType: "created",
    theme: {
      typography: {
        header: "Noto Sans",
        body: "Noto Sans",
        code: "JetBrains Mono",
      },
      colors: {
        lightMode: {
          light: nordName.SnowStorm2,
          lightgray: nordName.SnowStorm0,
          gray: nordName.PolarNight3,
          darkgray: nordName.PolarNight1,
          dark: nordName.PolarNight0,
          secondary: nordName.Frost3,
          tertiary: nordName.Frost1,
          highlight: "rgba(143, 159, 169, 0.15)",
        },
        darkMode: {
          light: nordName.PolarNight0,
          lightgray: nordName.PolarNight1,
          gray: nordName.PolarNight3,
          darkgray: nordName.SnowStorm0,
          dark: nordName.SnowStorm2,
          secondary: nordName.Frost2,
          tertiary: nordName.Frost0,
          highlight: "rgba(143, 159, 169, 0.15)",
        },
      },
    },
  },
  plugins: {
    transformers: [
      Plugin.FrontMatter(),
      Plugin.TableOfContents(),
      Plugin.CreatedModifiedDate({
        // you can add 'git' here for last modified from Git
        // if you do rely on git for dates, ensure defaultDateType is 'modified'
        priority: ["frontmatter", "filesystem"],
      }),
      Plugin.Latex({ renderEngine: "katex" }),
      Plugin.SyntaxHighlighting(),
      Plugin.ObsidianFlavoredMarkdown({ enableInHtmlEmbed: false }),
      Plugin.GitHubFlavoredMarkdown(),
      Plugin.CrawlLinks({ markdownLinkResolution: "shortest" }),
      Plugin.Description(),
    ],
    filters: [Plugin.RemoveDrafts()],
    emitters: [
      Plugin.AliasRedirects(),
      Plugin.ComponentResources({ fontOrigin: "googleFonts" }),
      Plugin.ContentPage(),
      Plugin.FolderPage(),
      Plugin.TagPage(),
      Plugin.ContentIndex({
        enableSiteMap: true,
        enableRSS: true,
      }),
      Plugin.Assets(),
      Plugin.Static(),
      Plugin.NotFoundPage(),
    ],
  },
}

export default config
