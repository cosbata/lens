/*
 * Adapted from World Monitor's list-feed-digest RSS parser at commit
 * d9ef780be65caf6669d352dade30fd2d777048eb.
 * Copyright (C) 2024-2026 Elie Habib. SPDX-License-Identifier: AGPL-3.0-only
 */
import type { RssFeed } from "../../config/rss-feeds";

export interface ParsedFeedItem {
  source: string;
  sourceId: string;
  authority: RssFeed["authority"];
  title: string;
  link: string;
  publishedAt: string;
  description: string;
  categoryHint: RssFeed["categoryHint"];
  language: string;
  imageUrl?: string;
  imageCredit?: string;
}

export interface ParsedFeed {
  items: ParsedFeedItem[];
  parsedTotal: number;
  droppedInvalid: number;
}

const MAX_ITEMS = 30;
const FUTURE_TOLERANCE_MS = 60 * 60_000;
const DESCRIPTION_TAGS = {
  rss: ["description", "content:encoded"],
  atom: ["summary", "content"],
} as const;
const DATE_TAGS = {
  rss: ["pubDate", "dc:date", "dc:Date.Issued", "published"],
  atom: ["published", "updated", "dc:date", "dc:Date.Issued"],
} as const;

function decodeXml(value: string) {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, number) => {
      const codePoint = Number(number);
      return Number.isInteger(codePoint) && codePoint <= 0x10ffff
        ? String.fromCodePoint(codePoint)
        : "";
    })
    .replace(/&#x([0-9a-f]+);/gi, (_, number) => {
      const codePoint = Number.parseInt(number, 16);
      return Number.isInteger(codePoint) && codePoint <= 0x10ffff
        ? String.fromCodePoint(codePoint)
        : "";
    })
    .replace(/&amp;/g, "&");
}

function plainText(value: string) {
  return decodeXml(value)
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\s+([.,!?;:])/g, "$1")
    .trim();
}

function tag(block: string, name: string) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const cdata = block.match(new RegExp(
    `<${escaped}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*<\\/${escaped}>`,
    "i",
  ));
  if (cdata) return cdata[1].trim();
  const plain = block.match(new RegExp(
    `<${escaped}[^>]*>([\\s\\S]*?)<\\/${escaped}>`,
    "i",
  ));
  return plain ? decodeXml(plain[1].replace(/<[^>]+>/g, " ").trim()) : "";
}

function firstTag(block: string, names: readonly string[]) {
  for (const name of names) {
    const value = tag(block, name);
    if (value) return value;
  }
  return "";
}

function attribute(block: string, tagName: string, attributeName: string) {
  const tagPattern = tagName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const attributePattern = attributeName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return block.match(new RegExp(
    `<${tagPattern}\\b[^>]*\\b${attributePattern}=["']([^"']+)["'][^>]*>`,
    "i",
  ))?.[1] ?? "";
}

function atomLink(block: string) {
  const links = [...block.matchAll(/<link\b([^>]*)>/gi)].map(([, attributes]) => ({
    href: attributes.match(/\bhref=["']([^"']+)["']/i)?.[1] ?? "",
    rel: attributes.match(/\brel=["']([^"']+)["']/i)?.[1]?.toLowerCase() ?? "",
  }));
  return links.find(({ href, rel }) => href && rel === "alternate")?.href
    ?? links.find(({ href, rel }) => href && (rel === "" || rel === "alternate"))?.href
    ?? "";
}

function imageUrl(block: string) {
  const candidates = [
    attribute(block, "media:content", "url"),
    attribute(block, "media:thumbnail", "url"),
    block.match(/<enclosure\b(?=[^>]*\btype=["']image\/)[^>]*\burl=["']([^"']+)["'][^>]*>/i)?.[1] ?? "",
  ];
  return candidates.map(decodeXml).find((value) => /^https?:\/\//i.test(value));
}

function cleanDescription(block: string, atom: boolean, title: string) {
  const candidates = DESCRIPTION_TAGS[atom ? "atom" : "rss"]
    .map((name) => plainText(tag(block, name)))
    .filter(Boolean)
    .sort((left, right) => right.length - left.length);
  const value = candidates[0] ?? "";
  return value.toLowerCase() === title.toLowerCase() ? "" : value.slice(0, 1_000);
}

export function looksLikeFeedXml(value: string) {
  const head = value.slice(0, 2_000).toLowerCase();
  return head.includes("<rss") || head.includes("<feed") || head.includes("<rdf:rdf");
}

export function parseRssXml(xml: string, feed: RssFeed, now: Date): ParsedFeed {
  if (!looksLikeFeedXml(xml)) throw new Error("rss_invalid_body");
  let blocks = [...xml.matchAll(/<item[\s>]([\s\S]*?)<\/item>/gi)];
  const atom = blocks.length === 0;
  if (atom) blocks = [...xml.matchAll(/<entry[\s>]([\s\S]*?)<\/entry>/gi)];

  const items: ParsedFeedItem[] = [];
  let droppedInvalid = 0;
  for (const match of blocks) {
    if (items.length >= MAX_ITEMS) break;
    const block = match[1];
    const title = plainText(tag(block, "title"));
    const href = atom
      ? atomLink(block)
      : tag(block, "link");
    const link = /^https?:\/\//i.test(href) ? decodeXml(href) : "";
    const published = firstTag(block, DATE_TAGS[atom ? "atom" : "rss"]);
    const publishedMs = Date.parse(published);
    if (!title || !link || !Number.isFinite(publishedMs)
      || publishedMs > now.getTime() + FUTURE_TOLERANCE_MS) {
      droppedInvalid += 1;
      continue;
    }
    items.push({
      source: feed.name,
      sourceId: tag(block, "guid") || tag(block, "id") || link,
      authority: feed.authority,
      title,
      link,
      publishedAt: new Date(publishedMs).toISOString(),
      description: cleanDescription(block, atom, title),
      categoryHint: feed.categoryHint,
      language: feed.language ?? "en",
      ...(imageUrl(block) ? { imageUrl: imageUrl(block) } : {}),
      ...(tag(block, "media:credit")
        ? { imageCredit: plainText(tag(block, "media:credit")) }
        : {}),
    });
  }
  return { items, parsedTotal: blocks.length, droppedInvalid };
}
