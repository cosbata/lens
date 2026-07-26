import type { RssFeed } from "../../config/rss-feeds";
import {
  parseRssXml,
  type ParsedFeedItem,
} from "../../upstream/worldmonitor/rss-parser";

export interface PreviousFeedState {
  etag?: string;
  lastModified?: string;
}

export interface FeedFetchResult {
  feed: RssFeed;
  status: "success" | "not_modified" | "failed";
  items: ParsedFeedItem[];
  etag?: string;
  lastModified?: string;
  errorClass?: string;
}

const MAX_BYTES = 2 * 1024 * 1024;
const TIMEOUT_MS = 10_000;
const CONCURRENCY = 6;

async function limitedText(response: Response) {
  const declared = Number(response.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_BYTES) throw new Error("rss_body_too_large");
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > MAX_BYTES) {
      await reader.cancel();
      throw new Error("rss_body_too_large");
    }
    chunks.push(value);
  }
  const body = new Uint8Array(bytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(body);
}

export async function fetchRssFeed(
  feed: RssFeed,
  {
    fetcher = fetch,
    previous,
    now = new Date(),
  }: {
    fetcher?: typeof fetch;
    previous?: PreviousFeedState;
    now?: Date;
  } = {},
): Promise<FeedFetchResult> {
  const url = new URL(feed.url);
  if (url.protocol !== "https:") throw new Error("rss_https_required");
  const headers: Record<string, string> = {
    accept: "application/rss+xml, application/atom+xml, application/xml, text/xml",
    "user-agent": "LENS/0.1 (+https://github.com/cosbata/lens)",
  };
  if (previous?.etag) headers["if-none-match"] = previous.etag;
  if (previous?.lastModified) headers["if-modified-since"] = previous.lastModified;

  try {
    const response = await fetcher(feed.url, {
      headers,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (response.status === 304) {
      return { feed, status: "not_modified", items: [], ...previous };
    }
    if (!response.ok) throw new Error(`rss_http_${response.status}`);
    const parsed = parseRssXml(await limitedText(response), feed, now);
    return {
      feed,
      status: "success",
      items: parsed.items,
      etag: response.headers.get("etag") ?? previous?.etag,
      lastModified: response.headers.get("last-modified") ?? previous?.lastModified,
    };
  } catch (error) {
    return {
      feed,
      status: "failed",
      items: [],
      ...previous,
      errorClass: error instanceof Error ? error.message : "rss_unknown",
    };
  }
}

export async function collectRssFeeds(
  feeds: RssFeed[],
  options: {
    fetcher?: typeof fetch;
    stateForFeed?: (id: string) => PreviousFeedState | undefined;
    now?: Date;
    concurrency?: number;
  } = {},
) {
  const results = new Array<FeedFetchResult>(feeds.length);
  let cursor = 0;
  const concurrency = Math.max(
    1,
    Math.min(feeds.length || 1, options.concurrency ?? CONCURRENCY),
  );
  await Promise.all(Array.from({ length: concurrency }, async () => {
    while (cursor < feeds.length) {
      const index = cursor++;
      const feed = feeds[index];
      results[index] = await fetchRssFeed(feed, {
        fetcher: options.fetcher,
        previous: options.stateForFeed?.(feed.id),
        now: options.now,
      });
    }
  }));
  return results;
}
