import { NextRequest, NextResponse } from "next/server";
import { UploadApiResponse } from "cloudinary";
import cloudinary from "../../../config/cloudinary";
import { getServerSession } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(request.cookies);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();

    // Support multiple files via "files" field, fall back to single "file"
    const files = formData.getAll("files") as File[];
    const singleFile = formData.get("file") as File | null;

    const filesToUpload =
      files.length > 0 ? files : singleFile ? [singleFile] : [];

    if (filesToUpload.length === 0) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (filesToUpload.length > 10) {
      return NextResponse.json(
        { error: "Maximum 10 images allowed" },
        { status: 400 },
      );
    }

    const uploadFile = async (file: File): Promise<string> => {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const result = await new Promise<UploadApiResponse>((resolve, reject) => {
        cloudinary.uploader
          .upload_stream(
            {
              folder: "share-crow-memes",
              resource_type: "image",
            },
            (error, result) => {
              if (error) {
                reject(error);
              } else {
                resolve(result as UploadApiResponse);
              }
            },
          )
          .end(buffer);
      });

      return result.secure_url;
    };

    const urls: string[] = [];
    for (const file of filesToUpload) {
      const url = await uploadFile(file);
      urls.push(url);
    }

    // Return both formats for backward compat
    return NextResponse.json({
      secure_url: urls[0],
      secure_urls: urls,
    });
  } catch (error) {
    console.error("Upload error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to upload image";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
