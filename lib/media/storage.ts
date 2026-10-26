import path from "node:path";
import { dataPath } from "@/lib/db/paths";

/**
 * Where an uploaded file lives on disk: DATA_DIR/uploads/<key>. Kept apart from the upload code
 * so serving a file never loads sharp. Callers pass keys made of safe path segments only.
 */
export function uploadPath(key: string): string {
  return dataPath("uploads", ...key.split("/").filter((part) => part && part !== ".." && !part.includes(path.sep)));
}
