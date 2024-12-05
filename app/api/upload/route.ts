import { aiResponseToAudio } from "@/actions/textToAudio";

export async function POST(request: Request) {
  try {
    // Parse JSON body from the request
    const body = await request.json();

    // Access data from the parsed body
    const { messageId, text } = body;
    console.log(`Received message: ${text} from ${messageId}`);
    const airesponseFile = await aiResponseToAudio(text, messageId);
    // Respond with a JSON message
    return Response.json(
      {
        // message: `Hello, ${name}!`,
        aiAudioFile: airesponseFile,
      },
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.log(error);
    return new Response(JSON.stringify({ error: "Invalid request" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
}
