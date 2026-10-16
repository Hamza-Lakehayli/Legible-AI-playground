import type { MetadataRoute } from "next";
import { getOfferings } from "@/lib/data/offerings";
import { site } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const offerings = await getOfferings();
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${site.url}/`, lastModified: now, priority: 1 },
    { url: `${site.url}/offerings`, lastModified: now, priority: 0.9 },
    { url: `${site.url}/pricing`, lastModified: now, priority: 0.8 },
    { url: `${site.url}/about`, lastModified: now, priority: 0.6 },
    { url: `${site.url}/playground`, lastModified: now, priority: 0.8 },
  ];

  const offeringRoutes: MetadataRoute.Sitemap = offerings.map((o) => ({
    url: `${site.url}/offerings/${o.slug}`,
    lastModified: now,
    priority: 0.7,
  }));

  return [...staticRoutes, ...offeringRoutes];
}
