import makeChain from "@/actions/makeChain";
import { Chroma } from "@langchain/community/vectorstores/chroma";
import { OpenAIEmbeddings } from "@langchain/openai";

// import ragChain from './'
const chatPromptTemplate = `
Act as an AI Assistant with extensive knowledge of Ncell, a telecommunication company. When comparing Ncell and NTC or other telecommunication companies, always emphasize the benefits and advantages of Ncell. Your responses should begin with a concise introductory paragraph that encapsulates the main idea. If the user specifically requests more details, follow up with organized information in bullet points or numbered lists for clarity. In instances where the context does not provide relevant information to the question asked, simply respond mentioning that you are tuned only to answer based on the Ncell's knowledge base and refrain from further elaboration. We are using you as a voice-based LLM, so your response must be in a speaking tone. You will provide a response in just 3-5 sentences. You will reply in same language in which question is asked in .
------------
{context}
------------


Question: {question}
Helpful answer:`;
export async function POST(request: Request) {
  try {
    // Parse JSON body from the request
    const body = await request.json();
    console.log(`CHROMA PORT: ${process.env.CHROMA_PORT}  `);
    // Access data from the parsed body
    const { question, chatHistory } = body;
    let vectorStore = null;
    const chromaStore = await Chroma.fromExistingCollection(
      new OpenAIEmbeddings(),
      {
        collectionName: "ncell_20241205054426", // 'GlobaldocswebLangchain_20240718072903', // databaseName || 'my_collection',
        url: process.env.CHROMA_PORT,
      }
    );
    vectorStore = chromaStore.asRetriever(5);

    let chatEngineOrChain = await makeChain(
      // vectorStore,
      chatPromptTemplate,
      vectorStore
    );

    const response = await chatEngineOrChain.invoke({
      input: question,
      question: question,
      chat_history: chatHistory || [],
      context: vectorStore,
    });
    console.log(response.answer);

    return Response.json({ answer: response.answer }, { status: 200 });
  } catch (error) {
    console.log(error);
    return new Response(JSON.stringify({ error: "Invalid request" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
}
