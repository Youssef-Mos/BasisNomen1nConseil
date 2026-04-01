# Admin Guide — Basis Norm Explorer

## Overview

The Admin Back Office lets you upload PDFs and manually annotate them by drawing rectangles on each page. Each rectangle represents a structural element (article, section, paragraph, etc.) with metadata, labels, and multi-language text.

The User Interface at `/explore` displays only the validated content created by admins.

---

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL 14+
- Database configured in `.env` (`DATABASE_URL`)

### Setup

```bash
npm install
npx prisma migrate dev    # Create/update database tables
npm run dev               # Start dev server at http://localhost:3000
```

---

## How to Upload a PDF

1. Go to **http://localhost:3000/admin**
2. Click the **"Upload PDF"** button
3. Fill in:
   - **Document Title**: A descriptive name (e.g., "Code Civil 2024")
   - **PDF File**: Select a `.pdf` file from your computer
4. Click **"Upload"**

The system will:
- Compute a SHA-256 hash to prevent duplicate uploads
- Extract the page count
- Store the PDF in `uploads/pdfs/`
- Create a Document record in the database

> **Note**: If the same PDF has already been uploaded, the system will reject the duplicate.

---

## How to Annotate a Document

### Opening the Editor

1. From the admin dashboard (`/admin`), click on a document
2. The PDF editor opens with the first page displayed

### Navigation

- Use **Prev / Next** buttons in the toolbar to navigate pages
- Current page number is shown in the toolbar

### Drawing Modes

Switch between modes using the toolbar buttons or keyboard shortcuts:

| Mode | Button | Shortcut | Description |
|------|--------|----------|-------------|
| **Select** | Select | `V` | Click rectangles to select, drag to move, use handles to resize |
| **Full Width** | Full Width | `F` | Click twice to define top and bottom edges. Rectangle spans full page width. |
| **Free Rect** | Free Rect | `R` | Click once for top-left corner, click again for bottom-right corner. |

> **Tip**: Press `Esc` to cancel an in-progress drawing or deselect.

### Workflow (Recommended)

1. **Navigate** to the page you want to annotate
2. **Select a drawing mode** (Full Width for text blocks, Free Rect for figures/tables)
3. **Draw** the rectangle around the content
4. The **Properties Panel** opens automatically on the right
5. **Set the type** (article, section, paragraph, etc.)
6. **Set the parent** rectangle if this is a child element
7. **Add labels** (comma-separated) for classification
8. **Add text** in one or more languages (FR, EN, NL)
9. Click **"Save Changes"**
10. Repeat

### Editing Existing Rectangles

1. Switch to **Select** mode (`V`)
2. Click on a rectangle to select it
3. **Move**: Drag the rectangle
4. **Resize**: Drag the corner/edge handles
5. **Edit metadata**: Use the Properties Panel on the right
6. Click **"Save Changes"** after editing

### Deleting a Rectangle

1. Select the rectangle
2. Click **"Delete Rectangle"** in the Properties Panel
3. Confirm the deletion

> **Warning**: Deleting a parent rectangle does NOT delete its children — they become root-level rectangles.

---

## Rectangle Properties

Each rectangle has the following properties:

| Property | Description |
|----------|-------------|
| **Type** | `phrase`, `paragraph`, `article`, `section`, `figure`, `table`, `formula`, `annexe` |
| **Parent** | Another rectangle in the same document (creates hierarchy) |
| **Labels** | Comma-separated tags for classification. Labels are **inherited recursively** from parent. |
| **Text (FR)** | French text content |
| **Text (EN)** | English text content |
| **Text (NL)** | Dutch text content |
| **Page** | Page number (set automatically when drawing) |
| **Position** | x, y, width, height as percentages of page dimensions (set by drawing) |

### Overlap Rules

Rectangles on the same page **must not overlap**. The system will reject creation/movement that would cause overlap.

---

## User Interface

The user-facing interface is available at `/explore`. It displays:

- A list of all documents
- For each document: all annotated rectangles with their type, labels (including inherited), and text content
- Content is NOT displayed in PDF page order — future versions will use relevance-based ordering

---

## Using Prisma Studio (Alternative)

You can also manage data directly via Prisma Studio:

```bash
npx prisma studio
```

This opens a browser-based database editor at `http://localhost:5555` where you can:
- View and edit Document records
- View and edit Rectangle records
- Manage parent-child relationships
- Bulk edit labels and text content

---

## Architecture

```
Admin (/admin)                    User (/explore)
    │                                  │
    ├── Upload PDF                     ├── List documents
    ├── View PDF pages                 └── Display rectangle content
    ├── Draw rectangles                    (text, labels, hierarchy)
    ├── Edit metadata
    └── Save to DB
              │
              ▼
         PostgreSQL
         ├── documents
         └── rectangles (core entity)
```
