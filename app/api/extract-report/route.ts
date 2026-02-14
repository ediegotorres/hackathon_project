import { NextResponse } from "next/server";
import vision from "@google-cloud/vision";
import { extractBiomarkersFromText } from "@/src/lib/reportExtraction";
import type { ReportExtractionResponse, ReportUploadFileType } from "@/src/lib/types";

export const runtime = "nodejs";

const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;
const TEXT_MIME_TYPES = new Set([
  "text/plain",
  "text/csv",
  "application/csv",
  "application/json",
  "application/ld+json",
  "application/xml",
  "text/xml",
]);
const IMAGE_FILE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".bmp", ".gif", ".tif", ".tiff"]);
const TEXT_FILE_EXTENSIONS = new Set([".txt", ".csv", ".tsv", ".json", ".xml"]);

type VisionClient = InstanceType<typeof vision.ImageAnnotatorClient>;

let visionClient: VisionClient | null = null;

function getVisionClient() {
  if (!visionClient) {
    const keyFilename = process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.GCLOUD_VISION_KEY_FILE;
    visionClient = keyFilename
      ? new vision.ImageAnnotatorClient({ keyFilename })
      : new vision.ImageAnnotatorClient();
  }
  return visionClient;
}

function getExtension(fileName: string) {
  const index = fileName.lastIndexOf(".");
  if (index === -1) return "";
  return fileName.slice(index).toLowerCase();
}

function getFileType(fileName: string, mimeType: string): ReportUploadFileType {
  const extension = getExtension(fileName);
  if (mimeType === "application/pdf" || extension === ".pdf") {
    return "pdf";
  }
  if (mimeType.startsWith("image/") || IMAGE_FILE_EXTENSIONS.has(extension)) {
    return "image";
  }
  if (TEXT_MIME_TYPES.has(mimeType) || TEXT_FILE_EXTENSIONS.has(extension)) {
    return "text";
  }
  return "other";
}

async function extractImageText(content: Buffer) {
  const client = getVisionClient();
  const [result] = await client.documentTextDetection({
    image: { content },
  });
  return result.fullTextAnnotation?.text?.trim() ?? result.textAnnotations?.[0]?.description?.trim() ?? "";
}

async function extractPdfText(content: Buffer) {
  const client = getVisionClient();
  const [result] = await client.batchAnnotateFiles({
    requests: [
      {
        inputConfig: {
          mimeType: "application/pdf",
          content,
        },
        features: [{ type: "DOCUMENT_TEXT_DETECTION" }],
      },
    ],
  });

  const pages = result.responses?.[0]?.responses ?? [];
  return pages
    .map((page) => page.fullTextAnnotation?.text?.trim() ?? "")
    .filter((line) => line.length > 0)
    .join("\n");
}

function toMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "Failed to extract report text.";
}

function isCredentialError(message: string) {
  const lower = message.toLowerCase();
  return (
    lower.includes("credential") ||
    lower.includes("authentication") ||
    lower.includes("permission denied") ||
    lower.includes("could not load")
  );
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing file upload." }, { status: 400 });
    }

    const fileName = file.name || "upload";
    const fileType = getFileType(fileName, file.type);
    if (fileType === "other") {
      return NextResponse.json(
        { error: "Unsupported file type. Upload an image, PDF, TXT, CSV, TSV, JSON, or XML file." },
        { status: 400 },
      );
    }

    const content = Buffer.from(await file.arrayBuffer());
    if (content.byteLength === 0) {
      return NextResponse.json({ error: "Uploaded file is empty." }, { status: 400 });
    }
    if (content.byteLength > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: "Uploaded file is too large. Keep files under 12MB." },
        { status: 413 },
      );
    }

    let extractedText = "";
    if (fileType === "image") {
      extractedText = await extractImageText(content);
    } else if (fileType === "pdf") {
      extractedText = await extractPdfText(content);
    } else {
      extractedText = new TextDecoder("utf-8", { fatal: false }).decode(content);
    }

    const extraction = extractBiomarkersFromText(extractedText);
    const response: ReportExtractionResponse = {
      fileName,
      fileType,
      allBiomarkers: extraction.allBiomarkers,
      warnings: extraction.warnings,
    };

    return NextResponse.json(response);
  } catch (error) {
    const message = toMessage(error);
    const friendlyMessage = isCredentialError(message)
      ? "OCR failed. Configure Google Cloud Vision credentials using GOOGLE_APPLICATION_CREDENTIALS or GCLOUD_VISION_KEY_FILE."
      : message;
    return NextResponse.json({ error: friendlyMessage }, { status: 500 });
  }
}
