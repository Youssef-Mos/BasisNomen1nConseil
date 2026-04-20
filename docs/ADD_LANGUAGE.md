# How to Add a New Language

## Overview

The system stores rectangle text in per-language columns: `textFr`, `textEn`, `textNl`. Adding a new language means adding a new column and updating every layer of the stack.

This document uses **Spanish (ES)** as a worked example. Replace `Es`/`es`/`ES`/`textEs` with the appropriate code for any other language (e.g., `Ru`/`ru`/`RU`/`textRu` for Russian).

---

## Step 1 — Database: Prisma schema

Edit `prisma/schema.prisma`. Add a new nullable field to the `Rectangle` model:

```diff
 model Rectangle {
   // ... existing fields ...
   textFr      String?
   textEn      String?
   textNl      String?
+  textEs      String?
   page        Int
   // ...
 }
```

Run the migration:

```bash
npx prisma migrate dev --name "add_language_es"
npx prisma generate
```

- `migrate dev` creates a migration file in `prisma/migrations/` and applies it to your local database.
- `generate` regenerates the Prisma Client so TypeScript recognizes the new field.

**What this does**: Adds a `"textEs" TEXT` nullable column to the `rectangles` table. Existing rows get `NULL` for this column. No data loss.

---

## Step 2 — Seed / backfill

Existing rectangles will have `textEs = null`. This is the expected initial state — the fallback logic (see Step 4) will display another language's text when `textEs` is empty.

To backfill specific rectangles with Spanish text, use Prisma:

```ts
await prisma.rectangle.update({
  where: { id: "rect_id_here" },
  data: { textEs: "Texto en espanol" },
});
```

Or in bulk via SQL:

```sql
UPDATE rectangles SET "textEs" = "textFr" WHERE "textEs" IS NULL;
```

(This copies French text as a starting point for translation — adjust as needed.)

---

## Step 3 — TypeScript types

### `lib/types.ts`

Add `textEs` to `RectangleData`, `RectangleCreateInput`, and `RectangleUpdateInput`:

```diff
 export type RectangleData = {
   // ...
   textFr: string | null;
   textEn: string | null;
   textNl: string | null;
+  textEs: string | null;
   // ...
 };

 export type RectangleCreateInput = {
   // ...
   textFr?: string | null;
   textEn?: string | null;
   textNl?: string | null;
+  textEs?: string | null;
 };

 export type RectangleUpdateInput = {
   // ...
   textFr?: string | null;
   textEn?: string | null;
   textNl?: string | null;
+  textEs?: string | null;
 };
```

### `components/explore/shared.ts`

Update `Lang`, `RectClient`, and `getText`:

```diff
-export type Lang = "fr" | "en" | "nl";
+export type Lang = "fr" | "en" | "nl" | "es";

 export type RectClient = {
   // ...
   textFr: string | null;
   textEn: string | null;
   textNl: string | null;
+  textEs: string | null;
   labels: string[];
   fatherId: string | null;
 };

 export function getText(rect: RectClient, lang: Lang): string {
   if (lang === "en") return rect.textEn || rect.textFr || rect.textNl || "";
   if (lang === "nl") return rect.textNl || rect.textFr || rect.textEn || "";
+  if (lang === "es") return rect.textEs || rect.textFr || rect.textEn || "";
   return rect.textFr || rect.textEn || rect.textNl || "";
 }
```

---

## Step 4 — End-user UI: language selector

In `components/explore/DocumentViewer.tsx`, find the language selector array (around line 212):

```diff
-{(["fr", "en", "nl"] as Lang[]).map((l) => (
+{(["fr", "en", "nl", "es"] as Lang[]).map((l) => (
```

The button label renders as `{l}` with Tailwind's `uppercase` class, so `"es"` displays as **ES** automatically.

**Fallback logic**: When ES is selected but `textEs` is null/empty, the `getText` function falls back to French, then English, then empty string. This is defined in `components/explore/shared.ts`.

---

## Step 5 — Admin UI: rectangle edit form

In `components/admin/PropertiesPanel.tsx`:

### Add state variable (alongside `textFr`, `textEn`, `textNl`):

```diff
 const [textNl, setTextNl] = useState("");
+const [textEs, setTextEs] = useState("");
```

### Initialize in the useEffect that syncs on rectangle change:

Find the block where `setTextFr`, `setTextEn`, `setTextNl` are called and add:

```diff
 setTextNl(rectangle.textNl || "");
+setTextEs(rectangle.textEs || "");
```

(This appears twice — once for "same rectangle updated" and once for "different rectangle selected".)

### Add textarea in the text content section (after the NL textarea):

```tsx
<div>
  <label className="block text-xs font-semibold text-(--text-secondary) uppercase tracking-wide mb-1.5">
    Text (ES)
  </label>
  <textarea
    value={textEs}
    onChange={(e) => setTextEs(e.target.value)}
    rows={3}
    className="w-full px-3 py-2 border border-(--border-default) rounded-md text-sm bg-(--bg-surface) text-(--text-primary) focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow resize-y"
  />
</div>
```

### Include in handleSave:

```diff
 const result = await onUpdate(rectangle!.id, {
   type,
   fatherId: fatherId || null,
   labels,
   textFr: textFr || null,
   textEn: textEn || null,
   textNl: textNl || null,
+  textEs: textEs || null,
 });
```

---

## Step 6 — API routes

### `app/api/documents/[id]/rectangles/route.ts` — POST handler

Add `textEs` to the body destructuring and create data:

```diff
-const { fatherId, type, labels, textFr, textEn, textNl, page, x, y, width, height } = body;
+const { fatherId, type, labels, textFr, textEn, textNl, textEs, page, x, y, width, height } = body;
```

```diff
 data: {
   // ...
   textNl: textNl || null,
+  textEs: textEs || null,
   // ...
 },
```

### `app/api/rectangles/[id]/route.ts` — PUT handler

Add `textEs` to the body destructuring:

```diff
-const { fatherId, type, labels, textFr, textEn, textNl, page, x, y, width, height } = body;
+const { fatherId, type, labels, textFr, textEn, textNl, textEs, page, x, y, width, height } = body;
```

Add to the update data builder:

```diff
 if (textNl !== undefined) data.textNl = textNl;
+if (textEs !== undefined) data.textEs = textEs;
```

### Text search filter

In the GET handler, add the new field to text search queries so Spanish content is searchable:

```diff
 { textFr: { contains: textSearch, mode: "insensitive" } },
 { textEn: { contains: textSearch, mode: "insensitive" } },
 { textNl: { contains: textSearch, mode: "insensitive" } },
+{ textEs: { contains: textSearch, mode: "insensitive" } },
```

### Explore page select

In `app/explore/[id]/page.tsx`, add `textEs` to the select clause:

```diff
 select: {
   // ...
   textFr: true,
   textEn: true,
   textNl: true,
+  textEs: true,
   labels: true,
   fatherId: true,
 },
```

---

## Step 7 — i18n config (if using next-intl)

The current project does not use next-intl or a dedicated i18n framework. The language is a simple client-side state (`Lang` type) that controls which text field to display.

If next-intl is added in the future:

1. Add the locale to `i18n/config.ts`:
   ```ts
   export const locales = ["fr", "en", "nl", "es"] as const;
   ```

2. Create message files: `messages/es.json`.

3. Update `middleware.ts` locale detection.

Currently, no i18n config files need updating.

---

## Summary checklist

- [ ] `prisma/schema.prisma` — `textEs String?` added to `Rectangle` model
- [ ] Migration: `npx prisma migrate dev --name "add_language_es"`
- [ ] Client generated: `npx prisma generate`
- [ ] `lib/types.ts` — `textEs` added to `RectangleData`, `RectangleCreateInput`, `RectangleUpdateInput`
- [ ] `components/explore/shared.ts` — `Lang` extended, `textEs` in `RectClient`, `getText` updated
- [ ] `components/explore/DocumentViewer.tsx` — `"es"` added to language selector
- [ ] `components/admin/PropertiesPanel.tsx` — state, textarea, sync, and save updated
- [ ] `app/api/documents/[id]/rectangles/route.ts` (POST) — `textEs` in destructuring and create data
- [ ] `app/api/documents/[id]/rectangles/route.ts` (GET) — `textEs` in text search OR clause
- [ ] `app/api/rectangles/[id]/route.ts` (PUT) — `textEs` in destructuring and update data
- [ ] `app/explore/[id]/page.tsx` — `textEs` in select clause
- [ ] Test: Spanish text displays in `/explore` with ES selected
- [ ] Test: fallback to FR when `textEs` is empty
- [ ] Test: keyword search finds Spanish text content
