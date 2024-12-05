"use server";

import path from "path";
import fs from "fs";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  dangerouslyAllowBrowser: true,
});
export const aiResponseToAudio = async (text: string, messageId: string) => {
  console.log("Env: ", process.env.OPENAI_API_KEY);
  const speechFile = path.join(
    process.cwd(),
    "public",
    "uploads",
    `${messageId}-speech.wav`
  ); //  path.resolve("./speech.mp3");
  const mp3 = await openai.audio.speech.create({
    model: "tts-1",
    voice: "alloy",
    input: text || "Today is a wonderful day to build something people love!",
  });
  console.log(speechFile);
  const buffer = Buffer.from(await mp3.arrayBuffer());
  await fs.promises.writeFile(speechFile, buffer);
  return speechFile;
};
