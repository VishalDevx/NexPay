import { Router, Request, Response } from "express";
import { prisma } from "../../config/db";
import { redis } from "../../config/redis";
import { randomUUID } from "crypto";

const router = Router();

const ALLOWED_FILE_TYPES = ["pdf", "jpg", "png", "doc", "docx", "xls", "xlsx"];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

router.post("/", async (req: Request, res: Response) => {
  try {
    const { fileName, fileType, fileSize, fileData, category, refId, refType } = req.body;

    if (!fileName || !fileType || !fileSize || !fileData || !category) {
      return res.status(400).json({ error: "missing_fields", message: "fileName, fileType, fileSize, fileData, and category are required" });
    }

    if (!ALLOWED_FILE_TYPES.includes(fileType)) {
      return res.status(400).json({ error: "invalid_file_type", message: `Allowed types: ${ALLOWED_FILE_TYPES.join(", ")}` });
    }

    if (fileSize > MAX_FILE_SIZE) {
      return res.status(400).json({ error: "file_too_large", message: "Maximum file size is 10MB" });
    }

    const storageKey = `${req.merchant!.id}/${category}/${randomUUID()}-${fileName}`;

    const upload = await prisma.upload.create({
      data: {
        merchantId: req.merchant!.id,
        fileName,
        fileType,
        fileSize,
        storageKey,
        category,
        refId: refId || null,
        refType: refType || null,
        metadata: process.env.NODE_ENV === "production" ? undefined : { base64: fileData },
      },
    });

    res.status(201).json({
      id: upload.id,
      fileName: upload.fileName,
      storageKey: upload.storageKey,
      url: `/api/v1/uploads/${upload.id}`,
    });
  } catch (err: any) {
    res.status(422).json({ error: "upload_failed", message: err.message });
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const upload = await prisma.upload.findFirst({
      where: { id: req.params.id, merchantId: req.merchant!.id },
    });

    if (!upload) return res.status(404).json({ error: "not_found" });

    res.json({
      id: upload.id,
      fileName: upload.fileName,
      fileType: upload.fileType,
      fileSize: upload.fileSize,
      category: upload.category,
      createdAt: upload.createdAt,
    });
  } catch (err: any) {
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

router.get("/:id/download", async (req: Request, res: Response) => {
  try {
    const upload = await prisma.upload.findFirst({
      where: { id: req.params.id, merchantId: req.merchant!.id },
    });

    if (!upload) return res.status(404).json({ error: "not_found" });

    const metadata = upload.metadata as { base64?: string } | null;
    if (!metadata?.base64) {
      return res.status(404).json({ error: "file_data_not_available" });
    }

    const buffer = Buffer.from(metadata.base64, "base64");
    const mimeMap: Record<string, string> = {
      pdf: "application/pdf",
      jpg: "image/jpeg",
      png: "image/png",
      doc: "application/msword",
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      xls: "application/vnd.ms-excel",
      xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    };

    res.setHeader("Content-Type", mimeMap[upload.fileType] || "application/octet-stream");
    res.setHeader("Content-Disposition", `attachment; filename="${upload.fileName}"`);
    res.send(buffer);
  } catch (err: any) {
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

router.delete("/:id", async (req: Request, res: Response) => {
  try {
    await prisma.upload.deleteMany({
      where: { id: req.params.id, merchantId: req.merchant!.id },
    });

    res.json({ deleted: true });
  } catch (err: any) {
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

export default router;
