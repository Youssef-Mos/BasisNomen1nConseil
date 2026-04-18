import { join } from "path";
import { existsSync } from "fs";

/**
 * Returns the absolute path to the Python executable inside the project's
 * `.venv`, falling back to the system `python3` if the venv does not exist.
 *
 * This ensures that Next.js API routes always use the project venv (which has
 * PyMuPDF and other deps installed) regardless of whether the venv is
 * activated in the shell that started the Next.js process.
 */
export function getPythonExecutable(): string {
  const venvUnix = join(process.cwd(), ".venv", "bin", "python3");
  if (existsSync(venvUnix)) return venvUnix;

  const venvWin = join(process.cwd(), ".venv", "Scripts", "python.exe");
  if (existsSync(venvWin)) return venvWin;

  return "python3";
}
