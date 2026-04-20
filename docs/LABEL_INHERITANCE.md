# Recursive Label Inheritance

## Overview

Per the functional specification (Jalon 2, Change 1):

> "Labels are a combination of those inherited from the 'father' and those defined specifically for this article (this is recursive: the grandchild inherits from the grandparent)."

Each rectangle has its own `labels` array stored in the database. The **effective labels** for any rectangle are its own labels merged (union) with those of every ancestor up to the root. This inheritance is computed at runtime, not stored.

---

## How it works

### Data model

The `Rectangle` model has a self-referencing tree via `fatherId`:

```
Root (labels: ["fire-safety"])
  Child A (labels: ["high-rise"])        -> effective: ["fire-safety", "high-rise"]
    Grandchild (labels: ["egress"])      -> effective: ["fire-safety", "high-rise", "egress"]
  Child B (labels: ["low-rise"])         -> effective: ["fire-safety", "low-rise"]
```

The `labels` column in the database stores **only the rectangle's own labels**. Inherited labels are never persisted; they are computed from the tree structure.

### Strategy: compute at query time

We chose to compute inherited labels on-the-fly rather than storing a denormalized `effectiveLabels` column. Rationale:

- **Consistency**: changing a parent's labels immediately affects all descendants without cascading updates.
- **Simplicity**: no triggers, no background jobs, no stale data risk.
- **Performance**: the tree is per-document and typically shallow (5-8 levels max). Walking ancestors is negligible.

### Implementation files

| File | Role |
|------|------|
| `lib/labels.ts` | `buildEffectiveLabelsMap()` — server-side utility. Builds a `Map<rectId, effectiveLabels[]>` for all rectangles in one pass with memoization. |
| `components/explore/shared.ts` | `getEffectiveLabels()` — client-side utility. Walks the `buildPath` chain and collects all labels. |
| `app/api/documents/[id]/rectangles/route.ts` | GET handler. When label-based filters are active, loads all document rectangles, builds the effective labels map, and filters by inherited labels before paginating. |
| `components/explore/ResultCard.tsx` | Displays effective labels on result cards. Own labels are styled normally; inherited labels are shown in blue italic with a tooltip. |
| `components/explore/TreeNode.tsx` | Displays effective labels in the expanded tree view with the same own/inherited distinction. |
| `components/explore/DocumentViewer.tsx` | Computes `allLabels` for the topic filter dropdown using effective labels, so inherited labels appear as filterable options. |
| `components/admin/PropertiesPanel.tsx` | Shows inherited labels in the admin panel (read-only display below the labels input). |

### Algorithm (server-side, `lib/labels.ts`)

```ts
function resolve(id): string[] {
  if (cached) return cache[id];
  rect = byId[id];
  if (!rect.fatherId) return rect.labels;  // root — own labels only
  parentLabels = resolve(rect.fatherId);    // recurse up
  return deduplicate([...parentLabels, ...rect.labels]);
}
```

The function uses memoization (`cache` map) so each rectangle is resolved exactly once, giving O(n) total time for a document with n rectangles.

### Algorithm (client-side, `components/explore/shared.ts`)

```ts
function getEffectiveLabels(rect, rectById): string[] {
  path = buildPath(rect, rectById);  // [root, ..., rect]
  return deduplicate(path.flatMap(node => node.labels));
}
```

---

## Visual distinction

In both `ResultCard` and `TreeNode`, labels are displayed with two styles:

- **Own labels**: default background, normal text — the rectangle's directly assigned labels.
- **Inherited labels**: blue tinted background, italic text, with a tooltip "Inherited from parent".

This lets users immediately see which labels come from the rectangle itself and which are inherited from ancestors.

---

## Impact on filtering

When a user selects a label filter (topic, building height, compartment, room), the API now matches against **effective labels**, not just own labels. This means:

- If a parent has label "fire-safety" and a child has label "egress", filtering by "fire-safety" will return **both** the parent and the child.
- All label filters use AND logic: every selected filter must be present in the effective labels.

---

## Admin workflow

In the admin Properties Panel, the label input field stores the rectangle's **own** labels only. Below it, a read-only display shows "Inherited:" labels from the parent chain. Admins should:

1. Set labels on parent/ancestor rectangles for broad categorization (e.g., "fire-safety" on an annex).
2. Set labels on child rectangles only for labels specific to that child (e.g., "egress" on a particular article).
3. Avoid duplicating parent labels on children — inheritance handles it automatically.
