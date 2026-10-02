import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { docsSchema } from "@astrojs/starlight/schema";
import { docsDir, docsFileMeta, docsPages } from "../docs-config.mjs";

const files = glob({
  base: docsDir,
  pattern: `{${docsPages.map(({ file }) => file).join(",")}}.md`,
  generateId: ({ entry }) => `docs/${entry.replace(/\.md$/, "")}`,
});

export const collections = {
  docs: defineCollection({
    loader: {
      name: "site:docs-files",
      // The files have no frontmatter: title and description come from their heading.
      load: (context) =>
        files.load({
          ...context,
          parseData: (props) => context.parseData({ ...props, data: { ...docsFileMeta(props.filePath!), ...props.data } }),
        }),
    },
    schema: docsSchema(),
  }),
};
