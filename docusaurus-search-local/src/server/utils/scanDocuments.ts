import fs from "fs";
import path from "path";
import util from "util";
import {
  DocInfoWithFilePath,
  SearchDocument,
  ProcessedPluginOptions,
} from "../../shared/interfaces";
import { parse } from "./parse";
import { debugVerbose } from "./debug";

const readFileAsync = util.promisify(fs.readFile);

let nextDocId = 0;
const getNextDocId = () => {
  return (nextDocId += 1);
};

export async function scanDocuments(
  DocInfoWithFilePathList: DocInfoWithFilePath[],
  config: ProcessedPluginOptions
): Promise<SearchDocument[][]> {
  const titleDocuments: SearchDocument[] = [];
  const headingDocuments: SearchDocument[] = [];
  const descriptionDocuments: SearchDocument[] = [];
  const keywordsDocuments: SearchDocument[] = [];
  const contentDocuments: SearchDocument[] = [];
  const allDocuments = [
    titleDocuments,
    headingDocuments,
    descriptionDocuments,
    keywordsDocuments,
    contentDocuments,
  ];

  const { indexContentTypes = { title: true, heading: true, description: true, keywords: true, content: true } } = config;

  // Process documents in parallel but assign IDs deterministically based on input order
  const processedDocs = await Promise.all(
    DocInfoWithFilePathList.map(async ({ filePath, url, type }, index) => {
      debugVerbose(
        `parsing %s file %o of %o`,
        type,
        path.relative(process.cwd(), filePath),
        url
      );

      const html = await readFileAsync(filePath, { encoding: "utf8" });

      const parsed = parse(html, type, url, config);
      if (!parsed) {
        // Unlisted content
        return null;
      }
      return { parsed, url, index };
    })
  );

  // Process results in input order to ensure deterministic ID assignment
  for (let i = 0; i < processedDocs.length; i++) {
    const result = processedDocs[i];
    if (!result) continue;
    
    const { parsed, url } = result;
    const { pageTitle, description, keywords, sections, breadcrumb } = parsed;

    // Always generate a title ID for consistency, even if titles aren't indexed
    const titleId = getNextDocId();

    // Only process title documents if enabled
    if (indexContentTypes.title) {
      titleDocuments.push({
        i: titleId,
        t: pageTitle,
        u: url,
        b: breadcrumb,
      });
    }

    // Only process description if enabled
    if (indexContentTypes.description && description) {
      descriptionDocuments.push({
        i: getNextDocId(),
        t: description,
        s: pageTitle,
        u: url,
        p: titleId,
      });
    }

    // Only process keywords if enabled
    if (indexContentTypes.keywords && keywords) {
      keywordsDocuments.push({
        i: getNextDocId(),
        t: keywords,
        s: pageTitle,
        u: url,
        p: titleId,
      });
    }

    for (const section of sections) {
      const trimmedHash = getTrimmedHash(section.hash, url);

      if (section.title !== pageTitle) {
        if (trimmedHash === false) {
          continue;
        }

        // Only process heading documents if enabled
        if (indexContentTypes.heading) {
          headingDocuments.push({
            i: getNextDocId(),
            t: section.title,
            u: url,
            h: trimmedHash,
            p: titleId,
          });
        }
      }

      // Only process content documents if enabled
      if (indexContentTypes.content && section.content) {
        if (trimmedHash === false) {
          continue;
        }

        contentDocuments.push({
          i: getNextDocId(),
          t: section.content,
          s: section.title || pageTitle,
          u: url,
          h: trimmedHash,
          p: titleId,
        });
      }
    }
  }
  return allDocuments;
}

function getTrimmedHash(hash: string, url: string) {
  if (hash && !hash.startsWith("#") && hash.includes("#")) {
    // The hash link may contains URL path, we need to remove it.
    if (hash.startsWith(url) && hash[url.length] === "#") {
      return hash.slice(url.length);
    }

    // If the hash doesn't start with the URL, it's likely an external link.
    // Don't know this will happen or not, but just in case.
    return false;
  }

  return hash;
}
