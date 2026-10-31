const LOCAL_HOST_PATTERN = /^(localhost|127\.0\.0\.1|\[::1\])(:\d{1,5})?$/i;

export function isLocalHost(host: string | null): boolean {
  if (!host) return false;
  return LOCAL_HOST_PATTERN.test(host);
}
