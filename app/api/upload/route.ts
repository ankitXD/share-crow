import { NextRequest, NextResponse } from "next/server";
import { UploadApiResponse } from "cloudinary";
import cloudinary from "../../../config/cloudinary";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload to Cloudinary
    const result = await new Promise((resolve, reject) => {
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

    return NextResponse.json({
      secure_url: (result as UploadApiResponse).secure_url,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to upload image" },
      { status: 500 },
    );
  }
}
