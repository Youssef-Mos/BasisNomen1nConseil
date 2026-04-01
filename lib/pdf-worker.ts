/**
 * PDF.js worker setup for client-side PDF rendering.
 * Worker file is copied to public/ from node_modules/pdfjs-dist/build/.
 */
import * as pdfjsLib from "pdfjs-dist";

if (typeof window !== "undefined") {
  pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
}

export { pdfjsLib };
