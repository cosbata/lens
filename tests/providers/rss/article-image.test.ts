import { describe, expect, it } from "vitest";
import { fetchArticleImage } from "../../../src/providers/rss/article-image";

describe("article image fallback", () => {
  it("extracts a public Open Graph image and rejects private article URLs", async () => {
    const fetcher = async () => new Response(
      '<meta property="og:image" content="/media/report.jpg">',
      { headers: { "content-type": "text/html" } },
    );
    await expect(fetchArticleImage("https://news.example/report", fetcher as typeof fetch))
      .resolves.toBe("https://news.example/media/report.jpg");
    await expect(fetchArticleImage("http://127.0.0.1/private", fetcher as typeof fetch))
      .resolves.toBeUndefined();
  });
});
