import { OLLAMA_HOST } from '$env/static/private';
import { StreamingTextResponse, type Message } from '@vercel/ai';
import type { RequestEvent } from '@sveltejs/kit';

export async function POST({ request }: RequestEvent) {
  const { messages } = await request.json();
  
  const response = await fetch(`${OLLAMA_HOST}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama2',
      messages: messages.map((message: Message) => ({
        role: message.role,
        content: message.content,
      })),
      stream: true,
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama API error: ${response.statusText}`);
  }

  return new StreamingTextResponse(response.body);
} 