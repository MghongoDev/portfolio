import { describe, expect, it } from "vitest";
import { getAllProjectSlugs, getFeaturedProjects, getProjectHtml, getProjectMeta } from "../src/lib/projects";

const EXPECTED_FEATURED = [
  "marketfeed-lakehouse",
  "fineract-analytics-platform",
  "signaltel-churn-intelligence",
  "tembo-hotel-analysis",
];

// A distinctive string that must survive compilation into each case study's HTML.
const MARKERS: Record<string, string> = {
  "marketfeed-lakehouse": "medallion",
  "fineract-analytics-platform": "diagram",
  "signaltel-churn-intelligence": "0.6129",
  "tembo-hotel-analysis": "Power BI",
};

describe("content pipeline", () => {
  it("exposes exactly the four featured case studies in display order", () => {
    expect(getFeaturedProjects().map((p) => p.slug)).toEqual(EXPECTED_FEATURED);
  });

  it("throws loudly for an unknown project", () => {
    expect(() => getProjectMeta("does-not-exist")).toThrow();
  });

  it.each(getAllProjectSlugs())("%s has complete, valid front-matter", (slug) => {
    const meta = getProjectMeta(slug);
    expect(meta.title.length).toBeGreaterThan(0);
    expect(meta.tagline.length).toBeGreaterThan(0);
    expect(meta.summary.length).toBeGreaterThan(0);
    expect(meta.date).toMatch(/^\d{4}-\d{2}$/);
    expect(meta.tags.length).toBeGreaterThan(0);
    expect(meta.repo).toMatch(/^https:\/\/github\.com\//);
  });

  it.each(getAllProjectSlugs())("%s compiles to article HTML with template sections", async (slug) => {
    const html = await getProjectHtml(slug);
    expect(html).toContain("<h2");
    expect(html).toContain("Context");
    expect(html).toContain("Results");
    expect(html).toContain(MARKERS[slug]);
    expect(html).not.toContain("[object Object]");
  });
});
