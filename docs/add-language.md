# How to add a new language

## Overview

The system currently supports three languages: **FR** (French), **EN** (English), and **NL** (Dutch). Each rectangle stores up to three text fields: `textFr`, `textEn`, `textNl`. The explore interface shows the appropriate field based on the user's language selection.

**Fallback logic** (implemented in `components/explore/shared.ts`, function `getText`):

| Selected language | Fallback order |
|-------------------|---------------|
| FR | `textFr` → `textEn` → `textNl` → `""` |
| EN | `textEn` → `textFr` → `textNl` → `""` |
| NL | `textNl` → `textFr` → `textEn` → `""` |

If the primary field is empty, the first non-empty fallback is used. If all three fields are empty, an empty string is returned and no text is displayed.

This procedure adds a fourth language. Use German (DE) as the example; replace `De`/`de`/`DE`/`textDe` with the equivalents for any other language.

---

## Example: adding German (DE)

### Step 1 — Prisma schema

In `prisma/schema.prisma`, add a new nullable field to the `Rectangle` model:

```prisma
model Rectangle {
  // ... existing fields ...
  textFr      String?
  textEn      String?
  textNl      String?
  textDe      String?    // ← add this line
  // ...
}
```

Then run the migration:

```bash
npx prisma migrate dev --name "add_language_de"
npx prisma generate
```

`migrate dev` creates a new migration file in `prisma/migrations/` and applies it to the local database. `generate` regenerates the Prisma client so TypeScript picks up the new field.

---

### Step 2 — TypeScript types

**`lib/types.ts`** — extend `RectangleData`, `RectangleCreateInput`, and `RectangleUpdateInput`:

```ts
export type RectangleData = {
  // ... existing fields ...
  textFr: string | null;
  textEn: string | null;
  textNl: string | null;
  textDe: string | null;   // ← add
  // ...
};

export type RectangleCreateInput = {
  // ... existing fields ...
  textFr?: string | null;
  textEn?: string | null;
  textNl?: string | null;
  textDe?: string | null;   // ← add
};

export type RectangleUpdateInput = {
  // ... existing fields ...
  textFr?: string | null;
  textEn?: string | null;
  textNl?: string | null;
  textDe?: string | null;   // ← add
};
```

**`components/explore/shared.ts`** — extend `Lang`, `RectClient`, and `getText`:

```ts
// 1. Extend the Lang union type
export type Lang = "fr" | "en" | "nl" | "de";

// 2. Add textDe to RectClient
export type RectClient = {
  // ... existing fields ...
  textFr: string | null;
  textEn: string | null;
  textNl: string | null;
  textDe: string | null;   // ← add
  // ...
};

// 3. Update getText to handle "de" with fallback to "fr"
export function getText(rect: RectClient, lang: Lang): string {
  if (lang === "en") return rect.textEn || rect.textFr || rect.textNl || "";
  if (lang === "nl") return rect.textNl || rect.textFr || rect.textEn || "";
  if (lang === "de") return rect.textDe || rect.textFr || "";   // ← add
  return rect.textFr || rect.textEn || rect.textNl || "";
}
```

---

### Step 3 — Language selector UI

In `components/explore/DocumentViewer.tsx`, find the language selector array (around line 212):

```tsx
{(["fr", "en", "nl"] as Lang[]).map((l) => (
```

Add `"de"`:

```tsx
{(["fr", "en", "nl", "de"] as Lang[]).map((l) => (
```

The button label is rendered as `{l}` uppercased via Tailwind's `uppercase` class, so `"de"` will display as **DE** automatically.

---

### Step 4 — Admin interface

In `components/admin/PropertiesPanel.tsx`, add a textarea for `textDe` alongside the existing FR/EN/NL textareas.

Find the NL textarea block (around line 395):

```tsx
<div>
  <label className="block text-xs font-semibold text-(--text-secondary) uppercase tracking-wide mb-1.5">
    Text (NL)
  </label>
  <textarea
    value={textNl}
    onChange={(e) => setTextNl(e.target.value)}
    rows={3}
    className="w-full px-3 py-2 border border-(--border-default) rounded-md text-sm ..."
  />
</div>
```

Add the DE block immediately after:

```tsx
<div>
  <label className="block text-xs font-semibold text-(--text-secondary) uppercase tracking-wide mb-1.5">
    Text (DE)
  </label>
  <textarea
    value={textDe}
    onChange={(e) => setTextDe(e.target.value)}
    rows={3}
    className="w-full px-3 py-2 border border-(--border-default) rounded-md text-sm bg-(--bg-surface) text-(--text-primary) focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow resize-y"
  />
</div>
```

Also add the corresponding state variable at the top of the component (alongside `textFr`, `textEn`, `textNl`):

```ts
const [textDe, setTextDe] = useState("");
```

And initialize it in the `useEffect` that syncs form state when `rectangle` changes:

```ts
setTextDe(rectangle.textDe || "");
```

And include it in the `handleSave` call:

```ts
const result = await onUpdate(rectangle!.id, {
  // ... existing fields ...
  textNl: textNl || null,
  textDe: textDe || null,   // ← add
});
```

---

### Step 5 — API routes

**`app/api/documents/[id]/rectangles/route.ts` — POST handler**

In the `body` destructuring, add `textDe`:

```ts
const { fatherId, type, labels, textFr, textEn, textNl, textDe, page, x, y, width, height } = body;
```

In the `prisma.rectangle.create` data object:

```ts
data: {
  // ...
  textFr: textFr || null,
  textEn: textEn || null,
  textNl: textNl || null,
  textDe: textDe || null,   // ← add
  // ...
},
```

**`app/api/rectangles/[id]/route.ts` — PUT handler**

In the `body` destructuring, add `textDe`:

```ts
const { fatherId, type, labels, textFr, textEn, textNl, textDe, page, x, y, width, height } = body;
```

In the update data builder:

```ts
if (textDe !== undefined) data.textDe = textDe;
```

**GET responses** (both route files) — if you use an explicit Prisma `select`, add `textDe: true` to the select. Both routes currently use `findMany` without a `select` on text fields, so `textDe` will be included automatically once the Prisma client is regenerated.

---

### Step 6 — Test

1. Open a document in the admin editor (`/admin/documents/{id}`).
2. Select a rectangle. A **Text (DE)** textarea should now appear in the Properties panel.
3. Enter some German text and click **Save Changes**.
4. Navigate to `/explore/{id}`. The language selector should now show **DE**.
5. Select **DE** — the rectangle's German text should appear in the result card.
6. Clear the `textDe` field for a rectangle in admin, save. In the explore view with DE selected, verify the fallback displays the French text instead.

---

## Fallback behavior

Fallback is implemented in `components/explore/shared.ts`, function `getText` (line 84).

| Condition | What is displayed |
|-----------|------------------|
| Selected language field is non-empty | That field's text |
| Selected language field is empty | First non-empty fallback (FR first for all non-FR languages) |
| All text fields are empty | Empty string — no text shown |

To change the fallback order for a language, edit the corresponding `return` line in `getText`. For example, to make DE fall back to EN before FR:

```ts
if (lang === "de") return rect.textDe || rect.textEn || rect.textFr || "";
```

---

## Checklist

- [ ] `prisma/schema.prisma` — `textDe String?` added to `Rectangle` model
- [ ] Migration run: `npx prisma migrate dev --name "add_language_de"`
- [ ] Client regenerated: `npx prisma generate`
- [ ] `lib/types.ts` — `textDe` added to `RectangleData`, `RectangleCreateInput`, `RectangleUpdateInput`
- [ ] `components/explore/shared.ts` — `Lang` type extended; `textDe` added to `RectClient`; `getText` updated
- [ ] `components/explore/DocumentViewer.tsx` — `"de"` added to language selector array
- [ ] `components/admin/PropertiesPanel.tsx` — `textDe` state, textarea, sync in `useEffect`, and `handleSave` updated
- [ ] `app/api/documents/[id]/rectangles/route.ts` (POST) — `textDe` included in destructuring and create data
- [ ] `app/api/rectangles/[id]/route.ts` (PUT) — `textDe` included in destructuring and update data
- [ ] Test: German text displays in `/explore` with DE selected
- [ ] Test: fallback to FR when `textDe` is empty
