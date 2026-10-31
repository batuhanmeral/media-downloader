const PLACEHOLDER = /\{(\w+)\}/g;

export function interpolate(
  template: string,
  values: Record<string, string>,
): string {
  return template.replace(
    PLACEHOLDER,
    (match, key: string) => values[key] ?? match,
  );
}
