import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const OLLAMA_URL = 'http://localhost:11434';
const SYSTEM_PROMPT = `Você é um assistente AI amigável e prestativo. Instruções importantes:
1. Responda SEMPRE em português do Brasil
2. Seja claro e natural
3. Mantenha um tom amigável e profissional
4. Use markdown quando apropriado
5. Mantenha o contexto da conversa`;

export const POST = (async ({ request }) => {
  try {
    const body = await request.json();
    
    if (!body || !Array.isArray(body.messages) || body.messages.length === 0) {
      return json(
        { error: 'Mensagens inválidas' },
        { status: 400 }
      );
    }

    // Prepara as mensagens incluindo o system prompt
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...body.messages.slice(-5) // Mantém apenas as últimas 5 mensagens
    ];

    console.log('Enviando requisição para Ollama:', {
      url: `${OLLAMA_URL}/api/chat`,
      model: body.model || 'gemma2:latest',
      messages: messages
    });

    const response = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: body.model || 'gemma2:latest',
        messages: messages,
        stream: false,
        options: {
          temperature: body.temperature || 0.7
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erro na resposta do Ollama:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      throw new Error(`Erro na API do Ollama: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('Resposta do Ollama:', data);
    
    if (!data.message?.content) {
      console.error('Resposta inválida do Ollama:', data);
      throw new Error('Resposta inválida do Ollama');
    }

    return json({
      role: 'assistant',
      content: data.message.content.trim()
    });

  } catch (error) {
    console.error('Erro ao processar requisição:', error);
    
    if (error instanceof Error && 
        (error.message.includes('ECONNREFUSED') || error.message.includes('Failed to fetch'))) {
      return json(
        { 
          role: 'assistant',
          content: 'Não foi possível conectar ao servidor Ollama. Por favor, verifique se:\n\n1. O Ollama está instalado\n2. O servidor está rodando (execute `ollama serve`)\n3. O servidor está acessível em http://localhost:11434\n4. O modelo selecionado está instalado (execute `ollama pull gemma2:latest`)'
        },
        { status: 503 }
      );
    }

    return json(
      { 
        role: 'assistant',
        content: `Desculpe, ocorreu um erro ao processar sua mensagem: ${error instanceof Error ? error.message : 'Erro desconhecido'}. Por favor, tente novamente.`
      },
      { status: 500 }
    );
  }
}) satisfies RequestHandler; 