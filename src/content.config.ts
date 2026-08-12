// src/content.config.ts
import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const technicalCollection = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/technical" }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    pubDate: z.date(),
    tags: z.array(z.string()).optional(),
  }),
});

export const collections = {
  technical: technicalCollection,
};
