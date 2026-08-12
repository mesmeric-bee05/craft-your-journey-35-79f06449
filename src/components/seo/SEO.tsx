import { useEffect } from "react";
import { Helmet } from "react-helmet-async";

const SITE = "https://craft-your-journey-35.lovable.app";

interface SEOProps {
  title: string;
  description?: string;
  path?: string;
  image?: string;
  type?: "website" | "article" | "profile";
  noindex?: boolean;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
}

export function SEO({ title, description, path = "/", image, type = "website", noindex, jsonLd }: SEOProps) {
  const url = `${SITE}${path.startsWith("/") ? path : `/${path}`}`;
  const desc = description?.slice(0, 158);
  const ldArray = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];

  // index.html ships a baseline canonical for non-JS crawlers; drop it once a
  // route declares its own so a page never advertises two canonical URLs.
  useEffect(() => {
    document.getElementById("static-canonical")?.remove();
  }, []);


  return (
    <Helmet>
      <title>{title.slice(0, 60)}</title>
      {desc && <meta name="description" content={desc} />}
      <link rel="canonical" href={url} />
      {noindex && <meta name="robots" content="noindex, nofollow" />}
      <meta property="og:title" content={title} />
      {desc && <meta property="og:description" content={desc} />}
      <meta property="og:url" content={url} />
      <meta property="og:type" content={type} />
      {image && <meta property="og:image" content={image} />}
      <meta name="twitter:card" content={image ? "summary_large_image" : "summary"} />
      <meta name="twitter:title" content={title} />
      {desc && <meta name="twitter:description" content={desc} />}
      {ldArray.map((ld, i) => (
        <script key={i} type="application/ld+json">{JSON.stringify(ld)}</script>
      ))}
    </Helmet>
  );
}
