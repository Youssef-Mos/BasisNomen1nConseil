/**
 * lib/labels.ts — Recursive label inheritance for the Rectangle tree.
 *
 * Per spec (Jalon 2, Change 1): "Labels are a combination of those inherited
 * from the father and those defined specifically for this article (this is
 * recursive: the grandchild inherits from the grandparent)."
 *
 * Strategy: compute at query time rather than storing a denormalized column.
 * Rationale: the rectangle tree is per-document and shallow enough that
 * walking ancestors is cheap, and this avoids cascading updates when a
 * parent's labels change.
 */

type HasLabelsAndParent = {
  id: string;
  labels: string[];
  fatherId: string | null;
};

/**
 * Build a map: rectangleId → effective labels (own + all ancestors').
 * Walks up the parent chain for each rectangle, deduplicating.
 */
export function buildEffectiveLabelsMap<T extends HasLabelsAndParent>(
  rectangles: T[],
): Map<string, string[]> {
  const byId = new Map(rectangles.map((r) => [r.id, r]));
  const cache = new Map<string, string[]>();

  function resolve(id: string): string[] {
    if (cache.has(id)) return cache.get(id)!;

    const rect = byId.get(id);
    if (!rect) {
      cache.set(id, []);
      return [];
    }

    const own = rect.labels;
    if (!rect.fatherId || !byId.has(rect.fatherId)) {
      cache.set(id, own);
      return own;
    }

    const parentLabels = resolve(rect.fatherId);
    const merged = [...new Set([...parentLabels, ...own])];
    cache.set(id, merged);
    return merged;
  }

  for (const rect of rectangles) {
    resolve(rect.id);
  }

  return cache;
}

/**
 * Return effective labels for a single rectangle, given the full set.
 * Convenience wrapper around buildEffectiveLabelsMap.
 */
export function getEffectiveLabels<T extends HasLabelsAndParent>(
  rectId: string,
  allRectangles: T[],
): string[] {
  const map = buildEffectiveLabelsMap(allRectangles);
  return map.get(rectId) ?? [];
}
