import { writeFile } from "fs";
import path from "path";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return Response.json({ error: "No file uploaded" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const fileName = file.name;
    const filePath = path.join(
      process.cwd(),
      "public",
      "uploads",
      "user",
      fileName
    );

    await writeFile(filePath, buffer, (err) => {
      if (err) {
        console.error("Error writing file:", err);
      } else {
        console.log(`File saved at ${filePath}`);
      }
    });

    return Response.json({
      message: "File uploaded successfully",
      fileName: fileName,
      filePath: `/uploads/user/${fileName}`,
    });
  } catch (error) {
    console.error("Error uploading file:", error);
    return Response.json({ error: "Error uploading file" }, { status: 500 });
  }
}
