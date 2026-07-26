import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CATEGORIES } from "../../../src/core/model";
import { RSS_FEEDS } from "../../../src/config/rss-feeds";
import { fetchRssFeed } from "../../../src/providers/rss/client";
import { parseRssXml } from "../../../src/upstream/worldmonitor/rss-parser";

const now = new Date("2026-07-26T09:00:00Z");
const feed = RSS_FEEDS.find(({ id }) => id === "freightwaves")!;

describe("curated RSS collection", () => {
  it("covers every category with 30 to 60 unique HTTPS feeds", () => {
    expect(RSS_FEEDS).toHaveLength(40);
    expect(new Set(RSS_FEEDS.map(({ id }) => id)).size).toBe(RSS_FEEDS.length);
    expect(new Set(RSS_FEEDS.map(({ url }) => url)).size).toBe(RSS_FEEDS.length);
    expect(new Set(RSS_FEEDS.map(({ categoryHint }) => categoryHint)))
      .toEqual(new Set(CATEGORIES));
    expect(RSS_FEEDS.every(({ url }) => url.startsWith("https://"))).toBe(true);
  });

  it("parses RSS and Atom while dropping undated items", () => {
    const rss = parseRssXml(
      readFileSync(new URL("../../fixtures/rss/rss.xml", import.meta.url), "utf8"),
      feed,
      now,
    );
    const atom = parseRssXml(
      readFileSync(new URL("../../fixtures/rss/atom.xml", import.meta.url), "utf8"),
      feed,
      now,
    );
    expect(rss).toMatchObject({ parsedTotal: 2, droppedInvalid: 1 });
    expect(rss.items[0].description).toContain("rerouted vessels");
    expect(rss.items[0]).toMatchObject({
      authority: "specialist",
      imageUrl: "https://images.example.test/port.jpg",
      imageCredit: "Example Newsroom",
    });
    expect(atom.items[0]).toMatchObject({
      sourceId: "atom-1",
      link: "https://example.test/port-closure-update",
    });
  });

  it("normalizes CDATA and encoded HTML to readable plain text", () => {
    const parsed = parseRssXml(`
      <rss><channel><item>
        <title><![CDATA[Storm &amp; response]]></title>
        <link>https://example.test/storm</link>
        <guid>storm-1</guid>
        <pubDate>Sun, 26 Jul 2026 08:00:00 GMT</pubDate>
        <description><![CDATA[
          <p>Crews &amp; residents <a href="https://example.test">moved inland</a>.</p>
          <script>ignored()</script>
        ]]></description>
      </item></channel></rss>
    `, feed, now);

    expect(parsed.items[0]).toMatchObject({
      title: "Storm & response",
      description: "Crews & residents moved inland.",
    });
    expect(parsed.items[0].description).not.toMatch(/[<>]|ignored/);
  });

  it("sends conditional headers and accepts a 304 response", async () => {
    const fetcher = async (_url: string | URL | Request, init?: RequestInit) => {
      expect(new Headers(init?.headers).get("if-none-match")).toBe("\"v1\"");
      return new Response(null, { status: 304 });
    };
    await expect(fetchRssFeed(feed, {
      fetcher: fetcher as typeof fetch,
      previous: { etag: "\"v1\"" },
      now,
    })).resolves.toMatchObject({ status: "not_modified", etag: "\"v1\"" });
  });

  it("prefers Atom alternate links and keeps scanning until 30 valid items", () => {
    const invalid = Array.from({ length: 30 }, (_, index) =>
      `<entry><title>Invalid ${index}</title><link href="https://example.test/${index}"/></entry>`
    ).join("");
    const parsed = parseRssXml(`
      <feed>
        ${invalid}
        <entry>
          <title>Valid update</title>
          <link rel="self" href="https://example.test/api/item"/>
          <link rel="alternate" href="https://example.test/article"/>
          <id>valid-1</id>
          <updated>2026-07-26T08:00:00Z</updated>
        </entry>
      </feed>
    `, feed, now);
    expect(parsed).toMatchObject({ parsedTotal: 31, droppedInvalid: 30 });
    expect(parsed.items[0].link).toBe("https://example.test/article");
  });
});
