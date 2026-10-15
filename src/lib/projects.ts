import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeShiki from "@shikijs/rehype";
import rehypeStringify from "rehype-stringify";

const contentDir = path.join(process.cwd(), "content", "projects");

export type ProjectMeta = {
  slug: string;
  title: string;
  tagline: string;
  summary: string;
  date: string;
  tags: string[];
  cover?: string;
  repo?: string;
  demo?: string;
  featured: boolean;
  order: number;
};

function readRaw(slug: string): { data: Record<string, unknown>; content: string } {
  const file = path.join(contentDir, `${slug}.md`);
  if (!fs.existsSync(file)) {
    throw new Error(`Unknown project: ${slug} (missing ${file})`);
  }
  const parsed = matter(fs.readFileSync(file, "utf8"));
  return { data: parsed.data as Record<string, unknown>, content: parsed.content };
}

function requiredString(data: Record<string, unknown>, key: string, slug: string): string {
  const value = data[key];
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Project "${slug}" is missing required front-matter field: ${key}`);
  }
  return value;
}

export function getProjectMeta(slug: string): ProjectMeta {
  const { data } = readRaw(slug);
  return {
    slug,
    title: requiredString(data, "title", slug),
    tagline: requiredString(data, "tagline", slug),
    summary: requiredString(data, "summary", slug),
    date: requiredString(data, "date", slug),
    tags: Array.isArray(data.tags) ? (data.tags as string[]) : [],
    cover: typeof data.cover === "string" ? data.cover : undefined,
    repo: typeof data.repo === "string" ? data.repo : undefined,
    demo: typeof data.demo === "string" ? data.demo : undefined,
    featured: data.featured === true,
    order: typeof data.order === "number" ? data.order : 99,
  };
}

export function getFeaturedProjects(): ProjectMeta[] {
  return fs
    .readdirSync(contentDir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => getProjectMeta(f.replace(/\.md$/, "")))
    .filter((p) => p.featured)
    .sort((a, b) => a.order - b.order);
}

export function getAllProjectSlugs(): string[] {
  return fs
    .readdirSync(contentDir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => f.replace(/\.md$/, ""));
}

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype, { allowDangerousHtml: true })
  .use(rehypeShiki, { theme: "vesper" })
  .use(rehypeStringify, { allowDangerousHtml: true });

const htmlCache = new Map<string, Promise<string>>();

export function getProjectHtml(slug: string): Promise<string> {
  let cached = htmlCache.get(slug);
  if (!cached) {
    const { content } = readRaw(slug);
    cached = processor.process(content).then((r) => String(r));
    htmlCache.set(slug, cached);
  }
  return cached;
}
