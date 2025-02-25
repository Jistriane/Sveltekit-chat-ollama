import { createOllama } from "ollama-ai-provider";
import { streamText } from "ai";

const olama = createOllama();

export async function POST(req) {
    const { messages } = await req.json();

    const result = await streamText({
        model: olama("gemma2"),
        messages,
    });
    return result.toDataStreamResponse();
};

