# Chat-Ollama

Uma interface web moderna e responsiva para interagir com modelos de linguagem do Ollama, construída com SvelteKit e TailwindCSS.

## 🚀 Funcionalidades

- 💬 Chat em tempo real com modelos do Ollama
- 🌓 Tema claro/escuro
- 📝 Suporte a markdown nas mensagens
- 🎛️ Configurações ajustáveis:
  - Seleção de modelo (Gemma 2, Llama 2, Mistral, CodeLlama)
  - Temperatura de resposta
  - Tema da interface
- 💾 Exportação do histórico de conversa
- 🔄 Contexto mantido entre mensagens
- 🎨 Interface moderna e responsiva
- ♿ Acessibilidade aprimorada com ARIA labels

## 🛠️ Tecnologias Utilizadas

- **Frontend**:
  - SvelteKit
  - TailwindCSS
  - Marked (para renderização de markdown)
  - PostCSS
  - TypeScript

- **Backend**:
  - Ollama API
  - SvelteKit Server Routes

## 📋 Pré-requisitos

- Node.js (versão 18 ou superior)
- NPM ou Yarn
- Ollama instalado e configurado

## 🔧 Instalação

1. Clone o repositório:
```bash
git clone [url-do-repositorio]
cd sveltekit-chat-ollama
```

2. Instale as dependências:
```bash
cd my-app
npm install
```

3. Configure o Ollama:
- Instale o Ollama seguindo as instruções em https://ollama.ai
- Execute o servidor Ollama:
```bash
ollama serve
```
- Baixe os modelos necessários:
```bash
ollama pull gemma2:latest
ollama pull llama2:latest
ollama pull mistral:latest
ollama pull codellama:latest
```

4. Inicie o servidor de desenvolvimento:
```bash
npm run dev
```

## 🏗️ Estrutura do Projeto

```
my-app/
├── src/
│   ├── routes/
│   │   ├── +page.svelte       # Componente principal do chat
│   │   └── api/
│   │       └── chat/
│   │           └── +server.ts  # API endpoint para comunicação com Ollama
│   ├── app.css                 # Estilos globais
│   └── app.d.ts               # Declarações de tipos
├── static/                     # Arquivos estáticos
├── tailwind.config.js         # Configuração do Tailwind
├── postcss.config.js          # Configuração do PostCSS
└── package.json               # Dependências e scripts
```

## 📚 Componentes Principais

### Chat Interface (`+page.svelte`)

O componente principal que gerencia:
- Estado do chat usando Svelte stores
- Interação com a API
- Renderização de mensagens
- Configurações do usuário
- Temas e estilos

```typescript
// Stores principais
const theme = writable('dark');
const temperature = writable(0.7);
const model = writable('gemma2:latest');
const messages = writable([]);
const input = writable('');
const isLoading = writable(false);
```

### API Endpoint (`api/chat/+server.ts`)

Gerencia a comunicação com o Ollama:
- Processamento de mensagens
- Configuração do sistema
- Tratamento de erros
- Formatação de respostas

## 🔌 API

### Endpoint: POST `/api/chat`

**Corpo da requisição:**
```typescript
{
  messages: Array<{
    role: 'user' | 'assistant' | 'system',
    content: string
  }>,
  temperature?: number,
  model?: string
}
```

**Resposta:**
```typescript
{
  role: 'assistant',
  content: string
}
```

## 🎨 Temas

O aplicativo suporta dois temas:

### Tema Escuro
- Fundo principal: `bg-gray-800`
- Cabeçalho: `bg-gray-900`
- Texto: `text-white`
- Mensagens do usuário: `bg-blue-600`
- Mensagens do assistente: `bg-gray-700`

### Tema Claro
- Fundo principal: `bg-gray-100`
- Cabeçalho: `bg-white`
- Texto: `text-gray-900`
- Mensagens do usuário: `bg-blue-600`
- Mensagens do assistente: `bg-white`

## 🔒 Segurança

- Validação de entrada do usuário
- Tratamento seguro de erros
- Sanitização de saída markdown
- Proteção contra XSS via Svelte

## 🚀 Deploy

1. Construa o projeto:
```bash
npm run build
```

2. Inicie em produção:
```bash
npm run start
```

## 📝 Notas de Desenvolvimento

- O chat mantém as últimas 5 mensagens para contexto
- Suporte completo a markdown nas mensagens
- Animações suaves para melhor UX
- Design responsivo para todos os tamanhos de tela

## 🤝 Contribuindo

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

## 👥 Autores

- Seu Nome - Desenvolvimento inicial

## 🙏 Agradecimentos

- Equipe Ollama pelo excelente modelo de linguagem
- Comunidade Svelte pelo framework incrível
- Tailwind CSS pela biblioteca de estilos 
