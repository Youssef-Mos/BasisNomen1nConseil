"use client";

import { useState, useEffect } from "react";
import type { DocumentListItem } from "@/lib/types";

export default function DocumentList() {
  const [documents, setDocuments] = useState<DocumentListItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function fetchDocuments() {
    setLoading(true);
    try {
      const res = await fetch("/api/documents");
      const data = await res.json();
      setDocuments(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchDocuments();
  }, []);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !title.trim()) return;

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", title.trim());

    try {
      const res = await fetch("/api/documents", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Upload failed.");
        return;
      }

      setTitle("");
      setFile(null);
      setShowUpload(false);
      fetchDocuments();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(e: React.MouseEvent, docId: string, docTitle: string) {
    e.preventDefault(); // Don't navigate to the document
    e.stopPropagation();

    if (!confirm(`Delete "${docTitle}" and all its rectangles?\n\nThis cannot be undone.`)) return;

    const res = await fetch(`/api/documents/${docId}`, { method: "DELETE" });
    if (res.ok) {
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
    } else {
      alert("Failed to delete document.");
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto w-full">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Documents</h1>
        <button
          onClick={() => setShowUpload(!showUpload)}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
        >
          {showUpload ? "Cancel" : "Upload PDF"}
        </button>
      </div>

      {/* Upload form */}
      {showUpload && (
        <form
          onSubmit={handleUpload}
          className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-3"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Document Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Code Civil 2024"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              PDF File
            </label>
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              required
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={uploading || !file || !title.trim()}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {uploading ? "Uploading..." : "Upload"}
          </button>
        </form>
      )}

      {/* Document list */}
      {loading ? (
        <div className="text-sm text-gray-500">Loading documents...</div>
      ) : documents.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg mb-2">No documents yet</p>
          <p className="text-sm">Upload a PDF to get started.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => (
            <a
              key={doc.id}
              href={`/admin/documents/${doc.id}`}
              className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all group"
            >
              <div>
                <h2 className="font-medium text-gray-900 group-hover:text-blue-600">
                  {doc.title}
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  {doc.pageCount} pages &middot; {doc.rectangleCount} rectangles &middot;{" "}
                  {new Date(doc.createdAt).toLocaleDateString("en-US")}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={(e) => handleDelete(e, doc.id, doc.title)}
                  className="px-2 py-1 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-all"
                  title="Delete document"
                >
                  Delete
                </button>
                <span className="text-gray-400 group-hover:text-blue-500 text-sm">
                  Open &rarr;
                </span>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
