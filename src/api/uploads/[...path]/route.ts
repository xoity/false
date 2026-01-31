import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { join } from "path";
import { createReadStream, existsSync } from "fs";
import { stat } from "fs/promises";

/**
 * Serve uploaded files from the uploads directory
 * This endpoint serves static files that were uploaded via the file-local provider
 * Example: GET /uploads/product-images/abc123.jpg
 */
export async function GET(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  try {
    // Get the file path from the URL params
    const filePath = req.params.path;

    if (!filePath || typeof filePath !== "string") {
      res.status(400).json({ message: "Invalid file path" });
      return;
    }

    // Construct the absolute path to the file
    const uploadsDir = join(process.cwd(), "uploads");
    const absolutePath = join(uploadsDir, filePath);

    // Security: Ensure the requested file is within the uploads directory
    if (!absolutePath.startsWith(uploadsDir)) {
      res.status(403).json({ message: "Access denied" });
      return;
    }

    // Check if file exists
    if (!existsSync(absolutePath)) {
      res.status(404).json({ message: "File not found" });
      return;
    }

    // Get file stats
    const fileStats = await stat(absolutePath);

    if (!fileStats.isFile()) {
      res.status(400).json({ message: "Not a file" });
      return;
    }

    // Determine content type based on file extension
    const ext = filePath.split(".").pop()?.toLowerCase();
    const contentTypeMap: Record<string, string> = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      gif: "image/gif",
      webp: "image/webp",
      svg: "image/svg+xml",
      pdf: "application/pdf",
      json: "application/json",
    };

    const contentType = contentTypeMap[ext || ""] || "application/octet-stream";

    // Set headers
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Length", fileStats.size);
    res.setHeader("Cache-Control", "public, max-age=31536000"); // Cache for 1 year
    res.setHeader("ETag", `"${fileStats.mtime.getTime()}-${fileStats.size}"`);

    // Stream the file
    const fileStream = createReadStream(absolutePath);
    fileStream.pipe(res);
  } catch (error) {
    console.error("Error serving upload:", error);
    res.status(500).json({
      message: "Error serving file",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
