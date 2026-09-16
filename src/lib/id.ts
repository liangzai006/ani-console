type IdSegment = string | number | boolean | null | undefined;

export function withId(base: string, ...segments: IdSegment[]): string {
  const suffix = segments
    .filter((segment): segment is string | number | boolean => {
      return segment !== null && segment !== undefined && String(segment).trim().length > 0;
    })
    .map((segment) => encodeURIComponent(String(segment).trim()));

  return [base, ...suffix].join(":");
}
