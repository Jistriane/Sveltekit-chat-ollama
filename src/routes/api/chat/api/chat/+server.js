import { createOllama } from "ollama-ai-provider";
import { streamText } from "ai";

const olama = createOllama({
    apiKey: process.env.OLAMA_API_KEY,
});

export const POST = async (req) => {
    const { messages } = await req.json();
    const response = await olama.chat.completions.create({
        model: olama("gemma2:2b"),
        messages,
    });
    return new Response(JSON.stringify(response));
};

