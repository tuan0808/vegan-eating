// src/app/robots.ts — served at /robots.txt.
import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: "*",
            allow: "/",
            // Keep app/auth/admin surfaces and API routes out of the index.
            disallow: ["/api/", "/admin/", "/dashboard", "/settings", "/messages", "/shopping-list", "/activity", "/submissions", "/login", "/register"],
        },
        sitemap: `${SITE_URL}/sitemap.xml`,
        host: SITE_URL,
    };
}
