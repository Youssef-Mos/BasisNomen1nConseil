# How to configure filters for a new norm

## Overview

The filter sidebar on `/explore/{id}` lets users narrow down rectangles within a document. There are **7 filters** organized into three groups (Search, Project, Building). All filters are sent as query parameters to `GET /api/documents/{id}/rectangles`, which applies them server-side via Prisma queries. Because they are client-side state, no build step is required — changing a constant in the source and restarting the dev server (or rebuilding) is enough.

Filters are currently identical for all norms. There is no built-in norm-specific filter logic; this document explains how to add it.

---

## Current filters

### 1. Keywords (`search`)
- **Type:** free-text input
- **UI label:** "Search in content…" (placeholder)
- **Where it applies:** searches `textFr`, `textEn`, and `textNl` fields simultaneously (case-insensitive `contains`), server-side
- **File:** `components/explore/FilterSidebar.tsx` — the `<input>` inside `<Section title="Search">`
- **API param:** `keywords`

### 2. Topic (`topic`)
- **Type:** dynamic dropdown
- **UI label:** "Topic"
- **Where it applies:** `labels` array of the rectangle must contain the selected value — server-side (`labels: { has: topic }`)
- **Options source:** built dynamically from all unique labels across the document's rectangles (computed in `DocumentViewer.tsx`, passed as `allLabels` prop to `FilterSidebar`)
- **File:** `components/explore/FilterSidebar.tsx` — `<Field label="Topic">` inside `<Section title="Search">`
- **API param:** `topic`

### 3. Address (`projectAddress`)
- **Type:** free-text input
- **UI label:** "Address"
- **Where it applies:** merged into the same text search as `keywords` — searches `textFr`, `textEn`, `textNl` (case-insensitive `contains`)
- **File:** `components/explore/FilterSidebar.tsx` — `<Field label="Address">` inside `<Section title="Project">`
- **API param:** `projectAddress`

### 4. Permit applicable date (`permitDate`)
- **Type:** date picker (`<input type="date">`)
- **UI label:** "Permit applicable date"
- **Where it applies:** merged into the same text search as `keywords` — searches `textFr`, `textEn`, `textNl` as a string
- **File:** `components/explore/FilterSidebar.tsx` — `<Field label="Permit applicable date">` inside `<Section title="Project">`
- **API param:** `permitDate`

> Note: `projectAddress` and `permitDate` feed into a full-text `OR` search across the three text fields, not a dedicated metadata field. This is intentional for the current scope.

### 5. Building height type (`buildingHeightType`)
- **Type:** static dropdown
- **UI label:** "Height type"
- **Where it applies:** `labels` array must contain the selected value — server-side
- **Current options** (constant `BUILDING_HEIGHT_OPTIONS`, line 35–39 of `FilterSidebar.tsx`):
  - `Low-rise (≤ 10 m)`
  - `Mid-rise (10 – 25 m)`
  - `High-rise (> 25 m)`
- **File to modify:** `components/explore/FilterSidebar.tsx` → `BUILDING_HEIGHT_OPTIONS`
- **API param:** `buildingHeightType`

### 6. Compartment category (`compartmentCategory`)
- **Type:** static dropdown
- **UI label:** "Compartment category"
- **Where it applies:** `labels` array must contain the selected value — server-side
- **Current options** (constant `COMPARTMENT_OPTIONS`, line 41–47):
  - `Category A` … `Category E`
- **File to modify:** `components/explore/FilterSidebar.tsx` → `COMPARTMENT_OPTIONS`
- **API param:** `compartmentCategory`

### 7. Room category (`roomCategory`)
- **Type:** static dropdown
- **UI label:** "Room category"
- **Where it applies:** `labels` array must contain the selected value — server-side
- **Current options** (constant `ROOM_OPTIONS`, line 49–58):
  - `Living space`, `Bedroom`, `Office`, `Commercial`, `Industrial`, `Technical room`, `Common area`, `Circulation`
- **File to modify:** `components/explore/FilterSidebar.tsx` → `ROOM_OPTIONS`
- **API param:** `roomCategory`

---

## How to modify an existing filter

### Change the available options of a dropdown filter

Example: adding a new building height class to `BUILDING_HEIGHT_OPTIONS`.

1. Open `components/explore/FilterSidebar.tsx`.
2. Find the constant at the top of the file:
   ```ts
   const BUILDING_HEIGHT_OPTIONS = [
     "Low-rise (≤ 10 m)",
     "Mid-rise (10 – 25 m)",
     "High-rise (> 25 m)",
   ];
   ```
3. Add or edit entries. Each entry is a plain string — it is used as both the dropdown label and the value matched against rectangle labels.
   ```ts
   const BUILDING_HEIGHT_OPTIONS = [
     "Low-rise (≤ 10 m)",
     "Mid-rise (10 – 25 m)",
     "High-rise (> 25 m)",
     "Very high-rise (> 60 m)",   // ← new option
   ];
   ```
4. Save. In development the page hot-reloads. In production, rebuild with `npm run build`.
5. For the filter to actually return results, rectangle labels must contain the exact string — ensure that label values in the database match the option strings precisely.

The same pattern applies to `COMPARTMENT_OPTIONS` and `ROOM_OPTIONS`.

### Change the filter display label

The label shown above each input is the string passed to `<Field label="...">` in `FilterSidebar.tsx`. Find the relevant `<Field>` and change the `label` prop.

Example — rename "Permit applicable date" to "Permit date":
```tsx
// Before
<Field label="Permit applicable date">
// After
<Field label="Permit date">
```

The `FILTER_LABELS` record near line 115 controls labels shown in the **active filter pills**. Update it to match:
```ts
const FILTER_LABELS: Record<keyof FilterState, string> = {
  // ...
  permitDate: "Permit date",   // was "Date"
  // ...
};
```

### Make a filter visible only for a specific norm

There is no existing norm-conditional filter logic. To add it:

1. Pass the norm ID (or name) into `DocumentViewer` — it already receives `doc: { id, title, pageCount }`. Add `normId` to this object in `app/explore/[id]/page.tsx`.

2. Thread `normId` down to `FilterSidebar` as a prop:
   ```tsx
   // DocumentViewer.tsx
   <FilterSidebar
     pending={pendingFilters}
     applied={appliedFilters}
     allLabels={allLabels}
     normId={doc.normId}        // ← add
     onChange={handlePendingChange}
     onApply={handleApply}
     onClear={handleClear}
   />
   ```

3. In `FilterSidebar.tsx`, add `normId?: string | null` to `Props` and gate the relevant `<Section>` or `<Field>` with a condition:
   ```tsx
   {normId === "clxxxxxxxxxxxxxxxx" && (
     <Section title="Building">
       {/* ... */}
     </Section>
   )}
   ```

---

## How to add a new filter

### Step 1 — Add the filter field to `FilterState`

In `components/explore/FilterSidebar.tsx`, add a key to `FilterState` and `EMPTY_FILTERS`:

```ts
export type FilterState = {
  // ... existing fields ...
  floorCount: string;           // ← new
};

export const EMPTY_FILTERS: FilterState = {
  // ... existing fields ...
  floorCount: "",               // ← new
};
```

Also add the display label to `FILTER_LABELS`:
```ts
const FILTER_LABELS: Record<keyof FilterState, string> = {
  // ...
  floorCount: "Floor count",
};
```

### Step 2 — Add the UI field in `FilterSidebar.tsx`

**For a dropdown:**
```tsx
const FLOOR_COUNT_OPTIONS = ["1–3", "4–10", "10+"];

// Inside the relevant <Section>:
<Field label="Floor count">
  <SelectWrapper>
    <select
      value={pending.floorCount}
      onChange={(e) => onChange("floorCount", e.target.value)}
      className={SELECT}
    >
      <option value="">Any</option>
      {FLOOR_COUNT_OPTIONS.map((o) => (
        <option key={o} value={o}>{o}</option>
      ))}
    </select>
  </SelectWrapper>
</Field>
```

**For a text input:**
```tsx
<Field label="Floor count">
  <input
    type="text"
    value={pending.floorCount}
    onChange={(e) => onChange("floorCount", e.target.value)}
    onKeyDown={handleKeyDown}
    placeholder="e.g. 4"
    className={INPUT}
  />
</Field>
```

### Step 3 — Wire the filter in `DocumentViewer.tsx`

Add the new param to the `useEffect` that builds the API query:

```ts
// Around line 131 of DocumentViewer.tsx
if (appliedFilters.floorCount) params.set("floorCount", appliedFilters.floorCount);
```

### Step 4 — Handle the param in the API route

In `app/api/documents/[id]/rectangles/route.ts`:

```ts
const floorCount = searchParams.get("floorCount")?.trim();

// Then add to the filters array:
if (floorCount) filters.push({ labels: { has: floorCount } });
```

If the filter should search text fields instead of labels, use the `textSearch` pattern already in the file:
```ts
if (floorCount) {
  filters.push({
    OR: [
      { textFr: { contains: floorCount, mode: "insensitive" } },
      { textEn: { contains: floorCount, mode: "insensitive" } },
      { textNl: { contains: floorCount, mode: "insensitive" } },
    ],
  });
}
```

### Step 5 — Test

- Set the filter → click **Apply filters** → verify results appear.
- Clear the filter → verify all rectangles are shown again.
- Combine with another filter → verify both constraints are applied (AND logic).
- Leave the field empty → verify it has no effect on results.

---

## Adding filters for a new norm: summary checklist

1. Upload the PDF — see [docs/upload-pdf.md](upload-pdf.md).
2. Identify which metadata values will be used as labels on rectangles for this norm.
3. For each new filter needed:
   - Add the key to `FilterState` and `EMPTY_FILTERS` in `FilterSidebar.tsx`.
   - Add options constant (if dropdown) in `FilterSidebar.tsx`.
   - Add `<Field>` UI in `FilterSidebar.tsx`.
   - Add `params.set(...)` in `DocumentViewer.tsx`.
   - Add filter logic in `app/api/documents/[id]/rectangles/route.ts`.
4. If the filter should be norm-specific: add `normId` prop and conditional rendering (see [Make a filter visible only for a specific norm](#make-a-filter-visible-only-for-a-specific-norm)).
5. Tag the relevant rectangles in the admin editor with the matching label values.
