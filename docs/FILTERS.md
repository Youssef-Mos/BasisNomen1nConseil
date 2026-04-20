# Dynamic Filters — Architecture and Usage

## Overview

The explore view (`/explore/{id}`) provides a filter sidebar that lets users narrow down rectangles within a document. Filters are **fully database-driven** and **manageable by an admin from the UI** — no code change is required to add, edit, or remove a filter.

Each norm has its own set of filter definitions stored in the `norm_filters` table. When a user opens a document in the explore view, the frontend fetches that norm's filter definitions and renders the sidebar dynamically. The API applies the filters server-side using the same definitions.

---

## Part 1 — How the system works (for admins and users)

### Architecture at a glance

```
Admin UI                          Database                         Explore view
(/admin/norms/:normId/filters)    (norm_filters table)             (/explore/:docId)
                                                                    
  Create / Edit / Delete  ───────>  NormFilter rows  ──────────>  FilterSidebar
  filter definitions                per norm                       renders dynamically
                                                                    
                                                                   User applies filters
                                                                         │
                                                                         ▼
                                                              GET /api/documents/:id/rectangles
                                                                   reads norm_filters,
                                                                   applies each filter
```

### Database model: `NormFilter`

Each row in `norm_filters` defines one filter control in the explore sidebar.

| Column | Type | Description |
|--------|------|-------------|
| `id` | `String` (cuid) | Primary key |
| `normId` | `String` | Foreign key to the `norms` table |
| `key` | `String` | Query parameter name (e.g. `buildingHeightType`). Must be unique per norm. |
| `label` | `String` | Display label shown in the sidebar (e.g. "Height type") |
| `section` | `String` | UI section grouping (e.g. "Building"). Filters with the same section appear in the same card. |
| `type` | `String` | One of: `select`, `text`, `multiselect`, `boolean` |
| `options` | `String[]` | For `select` and `multiselect`: the list of allowed values. Ignored for `text` and `boolean`. |
| `sortOrder` | `Int` | Controls display order (ascending). Filters with the same section are grouped together. |
| `createdAt` | `DateTime` | Auto-set on creation |

**Constraint:** `@@unique([normId, key])` — each key can only appear once per norm.

### Filter types

| Type | UI control | How it filters |
|------|-----------|----------------|
| `select` | Dropdown (`<select>`) with the defined options | Label match: the rectangle's effective labels (own + inherited) must contain the selected value |
| `text` | Free-text input | Case-insensitive `contains` search across `textFr`, `textEn`, `textNl` |
| `multiselect` | Checkboxes, one per option | Label match: effective labels must contain **all** selected values (AND logic) |
| `boolean` | Three-state dropdown: Any / Yes / No | "Yes" = effective labels must contain the filter's `label`. "No" = effective labels must NOT contain it. |

### Built-in filters (always present)

Two filters are always shown regardless of norm filter definitions:

1. **Keywords** (`search`) — free-text search across `textFr/En/Nl`
2. **Topic** (`topic`) — dropdown populated from all unique labels in the document

These are hardcoded in `FilterSidebar.tsx` inside the "Search" section because they are universal and not norm-specific.

### Label inheritance

Filter matching uses **inherited labels** per the project spec: a rectangle's effective labels are its own `labels` array merged with all ancestors' labels (recursive). This is computed at query time by `lib/labels.ts`.

This means: if an admin tags a parent section with `"High-rise (> 25 m)"`, all articles and paragraphs under it automatically match that filter without needing individual labels.

---

## Part 2 — How to manage filters (admin UI, no code needed)

### Accessing the filter management page

1. Go to `/admin` (the Documents list).
2. Hover over a document that belongs to a norm — a **Filters** link appears.
3. Click it to open `/admin/norms/{normId}/filters`.

Alternatively, navigate directly to `/admin/norms/{normId}/filters` if you know the norm ID.

### Creating a new filter

1. Click **New filter**.
2. Fill in the form:
   - **Key**: a unique identifier for this filter (e.g. `buildingHeightType`). This becomes the query parameter name. Use camelCase, no spaces.
   - **Label**: the display name shown to users (e.g. "Height type").
   - **Section**: the UI grouping (e.g. "Building"). Filters with the same section appear in the same card in the sidebar.
   - **Type**: choose `select`, `text`, `multiselect`, or `boolean`.
   - **Options** (only for `select` and `multiselect`): comma-separated list of allowed values (e.g. `Low-rise, Mid-rise, High-rise`). Each value must exactly match the label strings used on rectangles.
   - **Sort order**: a number to control display order (lower = higher in the sidebar).
3. Click **Create filter**.

The filter is immediately available in the explore view for all documents belonging to this norm.

### Editing a filter

1. On the filters table, click **Edit** next to the filter.
2. Modify any field.
3. Click **Update filter**.

Changes take effect immediately — users will see the updated filter on next page load.

### Deleting a filter

1. Click **Delete** next to the filter.
2. Confirm the deletion.

The filter disappears from the sidebar immediately. Existing rectangle labels are not affected.

### Reordering filters

Change the **Sort order** value of each filter. Lower numbers appear first. Filters are grouped by section, then ordered by sortOrder within each section.

### Example: adding a "Fire resistance" filter for NBN S21-201

1. Open `/admin/norms/{normId}/filters`.
2. Click **New filter**.
3. Fill in:
   - Key: `fireResistance`
   - Label: "Fire resistance"
   - Section: "Safety"
   - Type: `select`
   - Options: `Rf 1/2h, Rf 1h, Rf 2h`
   - Sort order: `10`
4. Click **Create filter**.
5. In the admin rectangle editor, tag the relevant sections/articles with the label `"Rf 1h"` (etc.). Children will inherit automatically.
6. Users can now filter by fire resistance in the explore view.

### Making filters work: tagging rectangles

For a filter to produce results, rectangles must have matching labels:

- For `select` and `multiselect` filters: the rectangle's labels (or inherited labels) must contain the exact option string.
- For `boolean` filters: the rectangle's labels must contain the filter's `label` string (for "Yes" to match).
- For `text` filters: no label needed — it searches the text content directly.

Tag labels in the admin rectangle editor (`/admin/documents/{docId}`). Thanks to label inheritance, tagging a parent section automatically applies the label to all its children.

---

## Part 3 — How to modify the code (for developers)

This section explains the code architecture for developers who need to add a new filter type, change the rendering logic, or modify the server-side filtering.

### File reference

| File | Role |
|------|------|
| `prisma/schema.prisma` | `NormFilter` model definition |
| `app/api/norms/[normId]/filters/route.ts` | `GET` (list) and `POST` (create) API for filter definitions |
| `app/api/norms/[normId]/filters/[filterId]/route.ts` | `PUT` (update) and `DELETE` API for individual filter definitions |
| `app/admin/norms/[normId]/filters/page.tsx` | Admin UI page for managing filters |
| `components/explore/FilterSidebar.tsx` | Dynamic filter rendering, types (`FilterState`, `NormFilterDef`) |
| `components/explore/DocumentViewer.tsx` | Fetches filter defs on mount, wires state to API query params |
| `app/api/documents/[id]/rectangles/route.ts` | Server-side filter application (reads norm_filters, applies dynamically) |
| `lib/labels.ts` | Recursive label inheritance (used by label-based filters) |
| `scripts/seed-filters.ts` | One-time seed script for migrating hardcoded filters to the database |
| `app/explore/[id]/page.tsx` | Server page that passes `normId` to `DocumentViewer` |

### How the frontend works

#### Types

```ts
// components/explore/FilterSidebar.tsx

type NormFilterDef = {
  id: string;
  key: string;
  label: string;
  section: string;
  type: string;       // "select" | "text" | "multiselect" | "boolean"
  options: string[];
  sortOrder: number;
};

type FilterState = Record<string, string | string[]>;
```

`FilterState` is a dynamic record, not a fixed type. Keys are `"search"`, `"topic"`, and whatever `key` values exist in the norm's filter definitions. Values are strings for most filter types, and `string[]` for `multiselect`.

#### Data flow

1. `app/explore/[id]/page.tsx` fetches the document with `normId` and passes it to `DocumentViewer`.
2. `DocumentViewer` calls `GET /api/norms/{normId}/filters` on mount to get filter definitions.
3. It initializes `FilterState` dynamically via `buildEmptyFilters(defs)`.
4. Filter definitions are passed to `FilterSidebar` as the `filterDefs` prop.
5. `FilterSidebar` groups definitions by `section` and renders each filter based on its `type`.
6. When the user clicks "Apply filters", `DocumentViewer` builds query params by iterating over `filterDefs` and reading the corresponding values from `appliedFilters`.

#### Rendering logic in FilterSidebar

The `renderFilterField(def)` function in `FilterSidebar.tsx` handles each filter type:

- `select` → `<select>` with `<option>` per value from `def.options`
- `text` → `<input type="text">`
- `multiselect` → checkboxes, one per value from `def.options`
- `boolean` → `<select>` with three options: Any / Yes / No

Filters are grouped by `def.section` — each unique section gets its own `<Section>` card.

### How the backend works

In `app/api/documents/[id]/rectangles/route.ts`, the GET handler:

1. Reads the document's `normId`.
2. Fetches all `NormFilter` definitions for that norm.
3. For each definition, reads the corresponding query parameter.
4. Applies the filter based on the definition's `type`:
   - `select`: adds the value to `labelFilters` array (inherited label matching).
   - `multiselect`: splits the comma-separated value, adds each to `labelFilters`.
   - `boolean` with value `"yes"`: adds `def.label` to `labelFilters`.
   - `boolean` with value `"no"`: excludes rectangles whose effective labels contain `def.label`.
   - `text`: applies case-insensitive `contains` on `textFr`, `textEn`, `textNl`.
5. All label filters are combined with AND logic: a rectangle must match **all** of them.
6. Text filters are also ANDed: each text filter adds a separate `OR` clause across the three text columns.

### Adding a new filter type (code change)

If you need a filter type beyond `select`, `text`, `multiselect`, and `boolean` (e.g. `date`, `range`):

#### Step 1 — Update FilterSidebar rendering

In `components/explore/FilterSidebar.tsx`, add a new `case` in the `renderFilterField` switch:

```tsx
case "date":
  return (
    <Field key={def.key} label={def.label}>
      <input
        type="date"
        value={(val as string) ?? ""}
        onChange={(e) => onChange(def.key, e.target.value)}
        className={INPUT}
      />
    </Field>
  );
```

#### Step 2 — Update server-side filter application

In `app/api/documents/[id]/rectangles/route.ts`, add handling for the new type in the `for (const def of filterDefs)` loop:

```ts
case "date":
  // Example: search for the date string in text columns
  textSearchValues.push(paramVal);
  break;
```

#### Step 3 — Update validation

In both `app/api/norms/[normId]/filters/route.ts` and `app/api/norms/[normId]/filters/[filterId]/route.ts`, add the new type to the `validTypes` array:

```ts
const validTypes = ["select", "text", "multiselect", "boolean", "date"];
```

#### Step 4 — Update admin form

In `app/admin/norms/[normId]/filters/page.tsx`, add the new type to the `FILTER_TYPES` constant:

```ts
const FILTER_TYPES = ["select", "text", "multiselect", "boolean", "date"] as const;
```

#### Step 5 — Test

1. Create a filter of the new type via the admin UI.
2. Open the explore view for a document of that norm.
3. Verify the new filter type renders correctly.
4. Apply the filter and verify results are filtered correctly.
5. Combine with other filters and verify AND logic.

### Modifying built-in filters (search and topic)

The `search` (keywords) and `topic` filters are hardcoded in `FilterSidebar.tsx` inside the "Search" section because they are universal. To modify them:

- **Keywords input**: edit the first `<Section title="Search">` block in `FilterSidebar.tsx`.
- **Topic dropdown**: this is populated from `allLabels` (all unique labels in the document). It's rendered inside the same "Search" section, gated by `allLabels.length > 0`.
- **API handling**: `keywords` is handled directly in the GET handler of `app/api/documents/[id]/rectangles/route.ts` (not via norm filter definitions). `topic` is added to the `labelFilters` array.

### Seed script

The `scripts/seed-filters.ts` script migrates the 3 previously-hardcoded filters (`buildingHeightType`, `compartmentCategory`, `roomCategory`) into the `norm_filters` table for all existing norms. It uses `upsert` so it's safe to run multiple times.

```bash
npx tsx scripts/seed-filters.ts
```

---

## API reference

### Filter definitions

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/norms/{normId}/filters` | `GET` | List all filters for a norm (ordered by `sortOrder`) |
| `/api/norms/{normId}/filters` | `POST` | Create a new filter. Body: `{ key, label, section, type, options, sortOrder }` |
| `/api/norms/{normId}/filters/{filterId}` | `PUT` | Update a filter. Body: same fields, all optional. |
| `/api/norms/{normId}/filters/{filterId}` | `DELETE` | Delete a filter. |

### Applying filters (explore view)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/documents/{id}/rectangles` | `GET` | Returns rectangles with filters applied. Query params: `keywords`, `topic`, plus any dynamic filter `key` from the norm's filter definitions. Pagination: `page`, `pageSize`. |

---

## Concrete examples: Belgian fire safety norms

### Example 1: Building height type filter

**Filter definition** (created via admin UI):
- Key: `buildingHeightType`
- Label: "Height type"
- Section: "Building"
- Type: `select`
- Options: `Low-rise (<= 10 m), Mid-rise (10-25 m), High-rise (> 25 m)`

**Usage**: An admin tags an annex rectangle with the label `"High-rise (> 25 m)"`. All articles under that annex inherit this label. Users select "High-rise (> 25 m)" in the sidebar and see only relevant articles.

### Example 2: Egress requirements filter

**Filter definition** (created via admin UI):
- Key: `egressRequirement`
- Label: "Egress"
- Section: "Safety"
- Type: `select`
- Options: `Staircase design, Corridor width, Emergency exit signage, Fire door specifications, Smoke extraction`

**Usage**: Specific sections are tagged with `"Staircase design"`. A user working on staircase compliance selects that option and sees only relevant articles, including children that inherit the label from their parent section.

### Example 3: Boolean filter (has figure)

**Filter definition** (created via admin UI):
- Key: `hasFigure`
- Label: "Has figure"
- Section: "Content"
- Type: `boolean`
- Options: (empty)

**Usage**: An admin tags rectangles that contain figures with the label `"Has figure"`. Users can filter to "Yes" to see only rectangles with figures, or "No" to exclude them.
