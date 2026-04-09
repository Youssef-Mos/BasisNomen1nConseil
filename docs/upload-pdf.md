# How to upload a new PDF norm

## Prerequisites

- Access to the admin interface at `/admin` (requires OTP login)
- The PDF file ready to upload (`.pdf` format only)
- The norm name and version string known in advance

---

## Step-by-step

1. Navigate to `/admin`.
2. Click **Upload PDF** (top-right of the Documents list).
   The upload form expands inline.
3. Fill in **Document Title** (required) — a human-readable name, e.g. `Code Civil 2024`.
4. Select the **PDF File** using the file picker. Only `application/pdf` files are accepted; the browser restricts the picker accordingly.
5. Select a **Norm** (optional):
   - Choose an existing norm from the dropdown, or
   - Choose `+ Create new norm` and fill in the **New norm name** field that appears.
   - Leave `— No norm —` to upload without a norm assignment.
6. Enter a **Version** string (optional) — see [Assigning a norm and version](#assigning-a-norm-and-version).
7. Click **Upload**.

### What happens automatically after upload

| Step | Detail |
|------|--------|
| **SHA-256 deduplication** | A SHA-256 hash of the file is computed. If an identical file was already uploaded, the request is rejected with a `409` error before any file is written to disk. |
| **File stored on disk** | The PDF is saved to `uploads/pdfs/{sha256hash}.pdf` relative to the project root. The filename is the hash itself — not the original filename. |
| **Page count extracted** | `pdf-lib` reads the PDF in memory and records the page count in the database. |
| **PNG pages rendered** | `python-pipeline/render_pages.py` is called synchronously. It writes one image per page to `public/pdf-pages/{documentId}/page-001.png`, `page-002.png`, etc. This runs before the upload response is returned (timeout: 5 minutes). |

### What is NOT automatic

- Rectangle creation. After upload the document contains zero rectangles. An admin must draw them manually in the editor, or use **Auto-Analyze** as a starting point.

---

## Assigning a norm and version

### Existing norm vs. new norm

- **Existing norm**: select it from the dropdown. The norm was created during a previous upload or directly via the API.
- **New norm**: select `+ Create new norm`. The app calls `POST /api/norms` to create the norm first, then proceeds with the upload. The new norm is saved with only a `name`; `description` and `country` can be set later directly in the database.

A document can also be uploaded with no norm at all (`— No norm —`). The norm can be assigned later by editing the document record directly in the database (no UI for post-upload norm reassignment exists currently).

### Version field

The version is a free-text string that identifies the edition of the norm. Examples:

| Input | Meaning |
|-------|---------|
| `2013` | Year edition |
| `2022-03` | Year + month |
| `v2` | Arbitrary version tag |
| `A1:2019` | Amendment label |

There is no enforced format — use whatever matches how the norm publisher identifies the edition.

---

## File format and size limits

| Constraint | Value |
|-----------|-------|
| Accepted format | `application/pdf` only |
| Maximum file size | No limit configured |
| Duplicate detection | Blocked — see below |

### Duplicate uploads

If you upload the same PDF a second time (identical bytes → same SHA-256 hash), the server returns:

```
409 Conflict
{ "error": "This PDF has already been uploaded as \"<existing title>\"." }
```

No file is written to disk, no database record is created. Upload a different PDF or delete the existing document first.

---

## After upload: next steps

1. **Verify that PNG pages were generated.**
   In the file system, check `public/pdf-pages/{documentId}/`. You should see `page-001.png`, `page-002.png`, etc. The document ID is shown in the URL when you open the document in the admin editor (`/admin/documents/{id}`).
   If the folder is empty or missing, page rendering failed — see [Troubleshooting](#troubleshooting).

2. **Open the document in the admin editor.**
   Click the document row in the `/admin` list. The PDF canvas loads the rendered PNG pages. Use the drawing tools to create rectangles.

3. **Optional — run Auto-Analyze.**
   The **Auto-Analyze** button in the editor runs `python-pipeline/smart_analyze.py` to detect rectangle candidates automatically.
   > **Warning:** auto-detected results must be reviewed manually. The algorithm can produce incorrect boundaries, wrong types, or missed content.

---

## Troubleshooting

### Pages not generated (blank canvas in admin editor)

**Symptom:** The document is listed in `/admin` but the canvas shows no page images.

**Probable cause:** `render_pages.py` failed or timed out. Common reasons: Python dependencies not installed, `poppler` not available on the server, or the PDF is password-protected.

**Action:**
- Check server logs for `Page rendering failed for doc {id}`.
- Run manually: `python3 python-pipeline/render_pages.py uploads/pdfs/{hash}.pdf public/pdf-pages/{id}/`
- Install missing Python dependencies: `pip install -r python-pipeline/requirements.txt`

### Upload rejected: "File must be a PDF"

**Symptom:** Upload fails immediately with a format error.

**Probable cause:** The selected file is not a PDF, or has a wrong MIME type (e.g. a `.pdf` that is actually an image).

**Action:** Verify the file opens correctly in a PDF viewer before uploading.

### Upload rejected: duplicate PDF

**Symptom:** `409` error — "This PDF has already been uploaded as…"

**Action:** Find the existing document in the `/admin` list. If you want to replace it, delete the old document first, then re-upload. Note that deleting a document also deletes all its rectangles and cannot be undone.

### Upload hangs for a long time

**Symptom:** The "Uploading…" spinner runs for more than 5 minutes.

**Probable cause:** Page rendering is synchronous and has a 5-minute timeout. A very large PDF (hundreds of pages) may hit this limit.

**Action:** Wait up to 5 minutes. If it fails, the document record is still created in the database but pages will be missing. Run the render script manually (see "Pages not generated" above).
