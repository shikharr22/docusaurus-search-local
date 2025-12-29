import { PluginOptions, ProcessedPluginOptions } from "../../shared/interfaces";
import { processPluginOptions } from "./processPluginOptions";

describe("processPluginOptions", () => {
  const siteDir = "/tmp";

  test.each<[PluginOptions, Partial<ProcessedPluginOptions>]>([
    [
      {
        docsRouteBasePath: "docs",
        blogRouteBasePath: "/blog",
        docsDir: "docs",
        blogDir: "blog",
        language: "en",
        ignoreFiles: "test",
        ignoreCssSelectors: [],
        searchBarPosition: "auto",
      },
      {
        docsRouteBasePath: ["docs"],
        blogRouteBasePath: ["blog"],
        blogDir: [expect.toMatchPath("/tmp/blog")],
        docsDir: [expect.toMatchPath("/tmp/docs")],
        language: ["en"],
        ignoreFiles: ["test"],
        ignoreCssSelectors: [],
        searchBarPosition: "right",
        removeDefaultStopWordFilter: [],
        indexContentTypes: {
          title: true,
          heading: true,
          description: false,
          keywords: false,
          content: false,
        },
      },
    ],
    [
      {
        docsRouteBasePath: ["docs"],
        blogRouteBasePath: ["/blog"],
        docsDir: "docs",
        blogDir: "blog",
        language: ["en", "zh"],
        ignoreFiles: [/__meta__$/],
        ignoreCssSelectors: [],
        searchBarPosition: "left",
        removeDefaultStopWordFilter: true,
      },
      {
        docsRouteBasePath: ["docs"],
        blogRouteBasePath: ["blog"],
        blogDir: [expect.toMatchPath("/tmp/blog")],
        docsDir: [expect.toMatchPath("/tmp/docs")],
        language: ["en", "zh"],
        ignoreFiles: [/__meta__$/],
        ignoreCssSelectors: [],
        searchBarPosition: "left",
        removeDefaultStopWordFilter: ["en"],
      },
    ],
  ])("processPluginOptions(...) should work", (options, config) => {
    expect(
      processPluginOptions(options, {
        siteDir,
        siteConfig: {
          themeConfig: {},
        },
      })
    ).toEqual(config);
  });

  test("detect search bar position", () => {
    expect(
      processPluginOptions(
        {
          docsRouteBasePath: "docs",
          blogRouteBasePath: "/blog",
          docsDir: "docs",
          blogDir: "blog",
          language: "en",
          ignoreFiles: "test",
          ignoreCssSelectors: [],
          searchBarPosition: "auto",
          removeDefaultStopWordFilter: ["en", "zh"],
        },
        {
          siteDir,
          siteConfig: {
            themeConfig: {
              navbar: {
                items: [
                  {
                    type: "doc",
                    position: "right",
                  },
                  {
                    type: "search",
                    position: "left",
                  },
                ],
              },
            },
          },
        }
      )
    ).toEqual({
      docsRouteBasePath: ["docs"],
      blogRouteBasePath: ["blog"],
      blogDir: [expect.toMatchPath("/tmp/blog")],
      docsDir: [expect.toMatchPath("/tmp/docs")],
      language: ["en"],
      ignoreFiles: ["test"],
      ignoreCssSelectors: [],
      searchBarPosition: "left",
      removeDefaultStopWordFilter: ["en", "zh"],
    });
  });

  test("should set default indexContentTypes when not provided", () => {
    expect(
      processPluginOptions(
        {
          docsRouteBasePath: "docs",
          blogRouteBasePath: "blog",
          docsDir: "docs",
          blogDir: "blog",
          language: "en",
          ignoreFiles: [],
          ignoreCssSelectors: [],
        },
        {
          siteDir,
          siteConfig: {
            themeConfig: {},
          },
        }
      )
    ).toMatchObject({
      indexContentTypes: {
        title: true,
        heading: true,
        description: false,
        keywords: false,
        content: false,
      },
    });
  });

  test("should merge provided indexContentTypes with defaults", () => {
    expect(
      processPluginOptions(
        {
          docsRouteBasePath: "docs",
          blogRouteBasePath: "blog",
          docsDir: "docs",
          blogDir: "blog",
          language: "en",
          ignoreFiles: [],
          ignoreCssSelectors: [],
          indexContentTypes: {
            description: true,
            content: true,
          },
        },
        {
          siteDir,
          siteConfig: {
            themeConfig: {},
          },
        }
      )
    ).toMatchObject({
      indexContentTypes: {
        title: true,
        heading: true,
        description: true,
        keywords: false,
        content: true,
      },
    });
  });
});
