const MAX_BYTES = 512 * 1024;
const TIMEOUT_MS = 5_000;

function safePublicUrl(value: string, base?: string) {
  try {
    const url = new URL(value, base);
    const host = url.hostname.toLowerCase();
    if (!["http:", "https:"].includes(url.protocol)
      || host === "localhost"
      || host.endsWith(".local")
      || /^127\./.test(host)
      || /^10\./.test(host)
      || /^192\.168\./.test(host)
      || /^169\.254\./.test(host)
      || /^172\.(1[6-9]|2\d|3[01])\./.test(host)
      || host === "::1") return null;
    return url;
  } catch {
    return null;
  }
}

async function limitedText(response: Response) {
  const declared = Number(response.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_BYTES) throw new Error("article_body_too_large");
  const reader = response.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BYTES) {
      await reader.cancel();
      throw new Error("article_body_too_large");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

export async function fetchArticleImage(
  articleUrl: string,
  fetcher: typeof fetch = fetch,
) {
  const article = safePublicUrl(articleUrl);
  if (!article) return undefined;
  const response = await fetcher(article, {
    headers: {
      accept: "text/html",
      "user-agent": "LENS/0.1 (+https://github.com/cosbata/lens)",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const finalUrl = safePublicUrl(response.url || article.href);
  if (!response.ok || !finalUrl || !response.headers.get("content-type")?.includes("text/html")) {
    return undefined;
  }
  const html = await limitedText(response);
  const raw = html.match(
    /<meta\b(?=[^>]*(?:property|name)=["'](?:og:image|twitter:image(?::src)?)["'])[^>]*content=["']([^"']+)["'][^>]*>/i,
  )?.[1];
  return raw ? safePublicUrl(raw.replace(/&amp;/g, "&"), finalUrl.href)?.href : undefined;
}
