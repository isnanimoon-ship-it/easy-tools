/** Share only public page URLs; never include form input, query strings, or fragments. */
export function publicPageUrl(origin: string, pathname: string): string {
  return new URL(pathname, origin).toString();
}

export function xShareUrl(url: string, title: string): string {
  const intent = new URL("https://twitter.com/intent/tweet");
  intent.searchParams.set("url", url);
  intent.searchParams.set("text", title);
  return intent.toString();
}

export function isShareablePath(pathname: string): boolean {
  return !pathname.startsWith("/t/") && pathname !== "/tools/p2p-file-transfer";
}
