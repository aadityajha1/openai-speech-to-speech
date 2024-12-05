import fs from "fs";
import OpenAI from "openai";
import path from "path";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  dangerouslyAllowBrowser: true,
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log(`CHROMA PORT: ${process.env.CHROMA_PORT}  `);
    // Access data from the parsed body
    const { audioFilePath } = body;
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(
        path.join(process.cwd(), "public", "uploads", "user", audioFilePath)
      ),
      model: "whisper-1",
    });

    console.log(transcription.text);
    return Response.json(
      { transcription: transcription.text },
      { status: 200 }
    );
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
