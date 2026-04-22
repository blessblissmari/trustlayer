// Minimal URL fetcher + HTML-to-text converter for the /analyze/url route.
// We deliberately avoid heavyweight dependencies so the Cloud Function
// package stays small and cold-starts fast.

export interface FetchedUrl {
  url: string;
  finalUrl: string;
  contentType: string;
  text: string;
  truncated: boolean;
}

export class UrlFetchError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

const BLOCKED_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "metadata.google.internal",
]);

function isPrivateHost(hostname: string): boolean {
  if (BLOCKED_HOSTS.has(hostname)) return true;
  // IPv4 private ranges.
  const ipv4 = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const [a, b] = ipv4.slice(1).map((n) => Number(n));
    if (a === 10) return true;
    if (a === 192 && b === 168) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 169 && b === 254) return true; // link-local
    if (a === 127) return true;
  }
  // IPv6 link-local / loopback.
  if (hostname.toLowerCase().startsWith("fe80") || hostname === "::1") {
    return true;
  }
  return false;
}

export async function fetchUrlAsText(
  rawUrl: string,
  maxBytes: number,
): Promise<FetchedUrl> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new UrlFetchError("Invalid URL.", 400);
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new UrlFetchError("Only http(s) URLs are supported.", 400);
  }
  if (isPrivateHost(parsed.hostname)) {
    throw new UrlFetchError(
      "URL host is not allowed (private or loopback address).",
      400,
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  let res: Response;
  try {
    res = await fetch(parsed.toString(), {
      method: "GET",
      redirect: "follow",
      headers: {
        "User-Agent": "TrustLayer/0.1 (+https://github.com/blessblissmari/trustlayer)",
        Accept: "text/html,text/plain;q=0.9,*/*;q=0.5",
      },
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeout);
    const msg = err instanceof Error ? err.message : String(err);
    throw new UrlFetchError(`Failed to fetch URL: ${msg}`, 502);
  }
  clearTimeout(timeout);

  if (!res.ok) {
    throw new UrlFetchError(
      `Upstream returned ${res.status} ${res.statusText}.`,
      502,
    );
  }

  const contentType = res.headers.get("content-type") ?? "";
  if (
    !/text\/html|text\/plain|application\/xhtml\+xml|application\/json/i.test(
      contentType,
    )
  ) {
    throw new UrlFetchError(
      `Unsupported content type: ${contentType || "unknown"}.`,
      415,
    );
  }

  // Stream up to maxBytes so we don't OOM on huge pages.
  const reader = res.body?.getReader();
  if (!reader) throw new UrlFetchError("Empty response body.", 502);

  const chunks: Uint8Array[] = [];
  let received = 0;
  let truncated = false;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > maxBytes) {
      truncated = true;
      const keep = maxBytes - (received - value.byteLength);
      if (keep > 0) chunks.push(value.slice(0, keep));
      try {
        await reader.cancel();
      } catch {
        /* ignore */
      }
      break;
    }
    chunks.push(value);
  }

  const raw = Buffer.concat(chunks.map((c) => Buffer.from(c))).toString("utf8");
  const text = /html|xhtml/i.test(contentType) ? htmlToText(raw) : raw;

  return {
    url: rawUrl,
    finalUrl: res.url || parsed.toString(),
    contentType,
    text,
    truncated,
  };
}

// Extremely small HTML-to-text extractor. We don't need perfect fidelity,
// just enough to feed the AI and pattern matchers.
export function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<template[\s\S]*?<\/template>/gi, " ")
    .replace(/<!--([\s\S]*?)-->/g, " ")
    .replace(/<\/(p|div|section|article|li|h[1-6]|br)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
