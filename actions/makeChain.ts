import { ChatOpenAI } from "@langchain/openai";
import { createHistoryAwareRetriever } from "langchain/chains/history_aware_retriever";
import { createRetrievalChain } from "langchain/chains/retrieval";
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from "@langchain/core/prompts";

// import { Chroma } from 'langchain/vectorstores/chroma'
import { createStuffDocumentsChain } from "langchain/chains/combine_documents";
// import { WeaviateStore } from '@langchain/weaviate'
import { Runnable } from "@langchain/core/runnables";
// import { weaviateClient } from '../../../components/vectorstores/Weaviate/weaviateDB.ts'

// const QA_PROMPT_TEMPLATE = `You are a helpful AI assistant. Use the following pieces of context to answer the question at the end.
//  If you don't know the answer, just say you don't know politely. DO NOT try to make up an answer.
//  If the question is not related to the context, politely respond that you are tuned to only answer questions that are related to the context.

// {context}

//  Question: {question}
//  Helpful answer:`
const contextualizeQSystemPrompt = `
Given a chat history and the latest user question
which might reference context in the chat history,
formulate a standalone question which can be understood
without the chat history. Do NOT answer the question, just
reformulate it if needed and otherwise return it as is. Use the following pieces of context to answer the question at the end.
{context}

  Question: {question}
  Helpful answer:
`;
let tokenConsumed;

const makeChain = async (
  //   vectorstore: WeaviateStore,
  chatPromptTemplate: any,
  retriever: Runnable
  //   openAiApiKey: string,
  //   supportedModels?: string,
  //   stream?: boolean,
  // conversationId: string,
) => {
  const model = new ChatOpenAI({
    temperature: 0,
    modelName: "gpt-4o-mini-2024-07-18",
    // openAIApiKey: openAiApiKey,
    callbacks: [
      {
        handleLLMEnd: (output) => {
          console.info(output.llmOutput);
          tokenConsumed = output.llmOutput;
        },
      },
    ],
    // streaming: stream ?? false,
  });

  const contextualizeQPrompt = ChatPromptTemplate.fromMessages([
    ["system", contextualizeQSystemPrompt],
    new MessagesPlaceholder("chat_history"),
    ["human", "{input}"],
  ]);

  const historyAwareRetriever = await createHistoryAwareRetriever({
    llm: model,
    retriever,
    rephrasePrompt: contextualizeQPrompt,
    // streaming: stream ?? false,
    // stream_options: {
    //   include_usage: true,
    // },
  });

  const qaSystemPrompt = `
You are an assistant for question-answering tasks. Use
the following pieces of retrieved context to answer the
question. If you don't know the answer, just say you don't know politely. DO NOT try to make up an answer. If the question is not related to the context, politely respond that you are tuned to only answer questions that are related to the context. 

{context}`;
  const qaPrompt = ChatPromptTemplate.fromMessages([
    ["system", chatPromptTemplate || qaSystemPrompt],
    new MessagesPlaceholder("chat_history"),
    ["human", "{input}"],
  ]);
  // console.info('Conversation id is::', conversationId)

  const questionAnswerChain = await createStuffDocumentsChain({
    llm: model,
    prompt: qaPrompt,
    // streaming: stream ?? false,
    // stream_options: {
    //   include_usage: true,
    // },
  });
  const chain = await createRetrievalChain({
    retriever: historyAwareRetriever,
    combineDocsChain: questionAnswerChain,
  });
  return chain;
};
// const getTokenConsumed = () => {
//   console.info(tokenConsumed)
//   return tokenConsumed
// }
// getTokenConsumed()

export default makeChain;
