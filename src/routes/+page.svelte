<script lang="ts">
  import { marked } from 'marked';
  import { writable } from 'svelte/store';
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';

  interface Message {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
  }

  // Stores principais
  const theme = writable(browser ? localStorage.getItem('theme') || 'dark' : 'dark');
  const temperature = writable(browser ? Number(localStorage.getItem('temperature')) || 0.7 : 0.7);
  const model = writable(browser ? localStorage.getItem('model') || 'gemma2:latest' : 'gemma2:latest');
  const messages = writable<Message[]>([]);
  const input = writable('');
  const isLoading = writable(false);
  const showSidebar = writable(true);
  const searchQuery = writable('');
  const showSearch = writable(false);

  // Persistência local
  theme.subscribe(value => {
    if (browser) {
      localStorage.setItem('theme', value);
    }
  });
  temperature.subscribe(value => {
    if (browser) {
      localStorage.setItem('temperature', value.toString());
    }
  });
  model.subscribe(value => {
    if (browser) {
      localStorage.setItem('model', value);
    }
  });

  // Histórico de conversas
  interface ChatHistory {
    id: string;
    title: string;
    messages: Message[];
    createdAt: Date;
    model: string;
    favorite: boolean;
  }

  const chatHistory = writable<ChatHistory[]>([]);
  const currentChatId = writable<string | null>(null);

  // Carregar histórico do localStorage
  onMount(() => {
    if (browser) {
      const savedHistory = localStorage.getItem('chatHistory');
      if (savedHistory) {
        const parsed = JSON.parse(savedHistory, (key, value) => {
          if (key === 'createdAt') return new Date(value);
          return value;
        });
        chatHistory.set(parsed);
      }
    }
  });

  // Salvar histórico no localStorage
  chatHistory.subscribe(value => {
    if (browser) {
      localStorage.setItem('chatHistory', JSON.stringify(value));
    }
  });

  // Pesquisa de mensagens
  $: filteredHistory = $chatHistory.filter(chat => {
    if (!$searchQuery) return true;
    const query = $searchQuery.toLowerCase();
    return (
      chat.title.toLowerCase().includes(query) ||
      chat.messages.some(msg => msg.content.toLowerCase().includes(query))
    );
  });

  function toggleFavorite(chatId: string, event: MouseEvent) {
    event.stopPropagation();
    chatHistory.update(history =>
      history.map(chat =>
        chat.id === chatId ? { ...chat, favorite: !chat.favorite } : chat
      )
    );
  }

  function copyMessage(content: string) {
    navigator.clipboard.writeText(content);
    // Feedback visual temporário
    const toast = document.createElement('div');
    toast.textContent = 'Mensagem copiada!';
    toast.className = 'fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
  }

  function createNewChat() {
    const newChat: ChatHistory = {
      id: Date.now().toString(),
      title: 'Nova Conversa',
      messages: [],
      createdAt: new Date(),
      model: $model,
      favorite: false
    };
    chatHistory.update(history => [newChat, ...history]);
    currentChatId.set(newChat.id);
    messages.set([]);
    input.set('');
    showSearch.set(false);
  }

  function loadChat(chatId: string) {
    const chat = $chatHistory.find(c => c.id === chatId);
    if (chat) {
      currentChatId.set(chatId);
      messages.set(chat.messages);
    }
  }

  function updateChatTitle(chatId: string) {
    chatHistory.update(history => {
      return history.map(chat => {
        if (chat.id === chatId && chat.messages.length > 0) {
          // Usa a primeira mensagem do usuário como título
          const firstUserMessage = chat.messages.find(m => m.role === 'user');
          if (firstUserMessage) {
            const title = firstUserMessage.content.slice(0, 30) + (firstUserMessage.content.length > 30 ? '...' : '');
            return { ...chat, title };
          }
        }
        return chat;
      });
    });
  }

  async function handleSubmit(event: Event) {
    event.preventDefault();
    if (!$input.trim() || $isLoading) return;

    // Cria um novo chat se não houver nenhum
    if (!$currentChatId) {
      createNewChat();
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: $input.trim()
    };

    // Adiciona a mensagem do usuário
    messages.update(msgs => [...msgs, userMessage]);
    
    // Atualiza o histórico
    chatHistory.update(history => {
      return history.map(chat => {
        if (chat.id === $currentChatId) {
          return { ...chat, messages: [...chat.messages, userMessage] };
        }
        return chat;
      });
    });

    input.set(''); // Limpa o input
    isLoading.set(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: $messages,
          temperature: $temperature,
          model: $model
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Erro ao processar mensagem');
      }

      const assistantMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: data.content
      };

      // Adiciona a resposta do assistente
      messages.update(msgs => [...msgs, assistantMessage]);

      // Atualiza o histórico
      chatHistory.update(history => {
        return history.map(chat => {
          if (chat.id === $currentChatId) {
            const updatedChat = { 
              ...chat, 
              messages: [...chat.messages, assistantMessage]
            };
            return updatedChat;
          }
          return chat;
        });
      });

      // Atualiza o título do chat após a primeira mensagem
      if ($messages.length === 2) {
        updateChatTitle($currentChatId!);
      }

    } catch (error) {
      console.error('Erro no chat:', error);
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: error instanceof Error ? error.message : 'Erro ao processar mensagem'
      };
      messages.update(msgs => [...msgs, errorMessage]);
      
      // Atualiza o histórico com a mensagem de erro
      chatHistory.update(history => {
        return history.map(chat => {
          if (chat.id === $currentChatId) {
            return { ...chat, messages: [...chat.messages, errorMessage] };
          }
          return chat;
        });
      });
    } finally {
      isLoading.set(false);
    }
  }

  function clearChat() {
    messages.set([]);
    if ($currentChatId) {
      chatHistory.update(history => {
        return history.filter(chat => chat.id !== $currentChatId);
      });
    }
    currentChatId.set(null);
  }

  function exportChat() {
    const chatToExport = $currentChatId 
      ? $chatHistory.find(c => c.id === $currentChatId)?.messages || $messages
      : $messages;

    const chatHistory = chatToExport
      .map((msg: { role: string; content: string }) => `${msg.role}: ${msg.content}`)
      .join('\n\n');
    
    const blob = new Blob([chatHistory], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'chat-history.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function renderMarkdown(content: string) {
    try {
      return marked(content);
    } catch (error) {
      console.error('Erro ao renderizar markdown:', error);
      return content;
    }
  }

  function formatDate(date: Date) {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }

  let scrollContainer: HTMLDivElement;
  let showSettings = false;
  let userHasScrolled = false;
  let unreadMessages = 0;

  function handleScroll() {
    const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
    const isAtTop = scrollTop < 50;
    userHasScrolled = !isAtTop;
    if (isAtTop) {
      unreadMessages = 0;
    }
  }

  $: if (scrollContainer && $messages.length > 0) {
    if (!userHasScrolled || $messages[$messages.length - 1]?.role === 'assistant') {
      setTimeout(() => {
        scrollContainer.scrollTop = 0;
      }, 0);
    } else if ($messages[$messages.length - 1]?.role === 'assistant') {
      unreadMessages++;
    }
  }

  $: themeClasses = $theme === 'dark' 
    ? {
        bg: 'bg-gray-800',
        header: 'bg-gray-900',
        text: 'text-white',
        input: 'bg-gray-800',
        border: 'border-gray-700',
        hover: 'hover:bg-gray-700',
        messageUser: 'bg-blue-600 text-white',
        messageBot: 'bg-gray-700 text-gray-100',
        sidebar: 'bg-gray-900',
        sidebarHover: 'hover:bg-gray-800'
      }
    : {
        bg: 'bg-gray-100',
        header: 'bg-white',
        text: 'text-gray-900',
        input: 'bg-white',
        border: 'border-gray-200',
        hover: 'hover:bg-gray-100',
        messageUser: 'bg-blue-600 text-white',
        messageBot: 'bg-white text-gray-900',
        sidebar: 'bg-gray-50',
        sidebarHover: 'hover:bg-gray-100'
      };

  // Adiciona atalhos de teclado
  function handleKeyPress(event: KeyboardEvent) {
    if (event.ctrlKey || event.metaKey) {
      switch(event.key) {
        case 'n':
          event.preventDefault();
          createNewChat();
          break;
        case '/':
          event.preventDefault();
          document.querySelector<HTMLInputElement>('input[type="text"]')?.focus();
          break;
        case 'b':
          event.preventDefault();
          showSidebar.update(v => !v);
          break;
        case 'f':
          event.preventDefault();
          showSearch.update(v => !v);
          break;
        case 'End':
          event.preventDefault();
          scrollToBottom();
          break;
      }
    }
  }

  // Função para deletar um chat específico
  function deleteChat(chatId: string, event: MouseEvent) {
    event.stopPropagation();
    chatHistory.update(history => history.filter(chat => chat.id !== chatId));
    if (chatId === $currentChatId) {
      currentChatId.set(null);
      messages.set([]);
    }
  }

  // Função para renomear um chat
  function renameChat(chatId: string, event: MouseEvent) {
    event.stopPropagation();
    const chat = $chatHistory.find(c => c.id === chatId);
    if (chat) {
      const newTitle = prompt('Digite o novo título:', chat.title);
      if (newTitle?.trim()) {
        chatHistory.update(history => 
          history.map(c => 
            c.id === chatId ? { ...c, title: newTitle.trim() } : c
          )
        );
      }
    }
  }

  function scrollToBottom() {
    userHasScrolled = false;
    unreadMessages = 0;
    scrollContainer.scrollTop = 0;
  }
</script>

<div class="flex h-screen overflow-hidden">
  <!-- Sidebar com pesquisa -->
  {#if $showSidebar}
    <div class="w-64 flex flex-col {themeClasses.sidebar} border-r {themeClasses.border} overflow-hidden">
      <!-- Novo Chat e Pesquisa -->
      <div class="p-4 space-y-2">
        <button
          on:click={createNewChat}
          class="w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200"
        >
          <span>➕</span>
          Novo Chat
          <span class="text-xs opacity-75">(Ctrl+N)</span>
        </button>
        
        <div class="relative">
          <input
            type="text"
            bind:value={$searchQuery}
            placeholder="Pesquisar conversas..."
            class="w-full {themeClasses.input} {themeClasses.text} rounded-lg px-4 py-2 border {themeClasses.border} focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {#if $searchQuery}
            <button
              on:click={() => searchQuery.set('')}
              class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
            >
              ❌
            </button>
          {/if}
        </div>
      </div>

      <!-- Lista de Chats com Favoritos -->
      <div class="flex-1 overflow-y-auto">
        {#if filteredHistory.length === 0}
          <div class="p-4 text-center text-gray-500">
            {$searchQuery ? 'Nenhuma conversa encontrada.' : 'Nenhuma conversa ainda.'}
            <br>
            {!$searchQuery && 'Crie um novo chat para começar!'}
          </div>
        {/if}

        <!-- Favoritos -->
        {#if filteredHistory.some(chat => chat.favorite)}
          <div class="px-4 py-2 text-sm text-gray-500 font-medium">Favoritos</div>
          {#each filteredHistory.filter(chat => chat.favorite) as chat}
            <div 
              class="group relative w-full text-left p-4 {themeClasses.text} {themeClasses.sidebarHover} transition-colors duration-200 {chat.id === $currentChatId ? 'bg-blue-600' : ''}"
            >
              <button
                class="w-full text-left"
                on:click={() => loadChat(chat.id)}
              >
                <div class="font-medium truncate flex items-center gap-2">
                  <span>⭐</span>
                  {chat.title}
                </div>
                <div class="text-sm text-gray-500">{formatDate(chat.createdAt)}</div>
                <div class="text-xs text-gray-500 flex items-center gap-2">
                  <span>{chat.messages.length} mensagem{chat.messages.length !== 1 ? 'ns' : ''}</span>
                  <span>•</span>
                  <span>{chat.model}</span>
                </div>
              </button>
              
              <!-- Botões de ação -->
              <div class="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-1">
                <button
                  on:click={(e) => toggleFavorite(chat.id, e)}
                  class="p-1 hover:bg-yellow-500 rounded"
                  title="Remover dos favoritos"
                >
                  ⭐
                </button>
                <button
                  on:click={(e) => renameChat(chat.id, e)}
                  class="p-1 hover:bg-blue-500 rounded"
                  title="Renomear conversa"
                >
                  ✏️
                </button>
                <button
                  on:click={(e) => deleteChat(chat.id, e)}
                  class="p-1 hover:bg-red-500 rounded"
                  title="Deletar conversa"
                >
                  🗑️
                </button>
              </div>
            </div>
          {/each}
          <div class="border-t {themeClasses.border} my-2"></div>
        {/if}

        <!-- Outras Conversas -->
        <div class="px-4 py-2 text-sm text-gray-500 font-medium">Todas as Conversas</div>
        {#each filteredHistory.filter(chat => !chat.favorite) as chat}
          <div 
            class="group relative w-full text-left p-4 {themeClasses.text} {themeClasses.sidebarHover} transition-colors duration-200 {chat.id === $currentChatId ? 'bg-blue-600' : ''}"
          >
            <button
              class="w-full text-left"
              on:click={() => loadChat(chat.id)}
            >
              <div class="font-medium truncate">{chat.title}</div>
              <div class="text-sm text-gray-500">{formatDate(chat.createdAt)}</div>
              <div class="text-xs text-gray-500 flex items-center gap-2">
                <span>{chat.messages.length} mensagem{chat.messages.length !== 1 ? 'ns' : ''}</span>
                <span>•</span>
                <span>{chat.model}</span>
              </div>
            </button>
            
            <!-- Botões de ação -->
            <div class="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-1">
              <button
                on:click={(e) => toggleFavorite(chat.id, e)}
                class="p-1 hover:bg-yellow-500 rounded"
                title="Adicionar aos favoritos"
              >
                ☆
              </button>
              <button
                on:click={(e) => renameChat(chat.id, e)}
                class="p-1 hover:bg-blue-500 rounded"
                title="Renomear conversa"
              >
                ✏️
              </button>
              <button
                on:click={(e) => deleteChat(chat.id, e)}
                class="p-1 hover:bg-red-500 rounded"
                title="Deletar conversa"
              >
                🗑️
              </button>
            </div>
          </div>
        {/each}
      </div>

      <!-- Atalhos e Estatísticas -->
      <div class="p-4 border-t {themeClasses.border} space-y-4">
        <div class="text-sm text-gray-500">
          <div class="font-medium mb-2">Atalhos de Teclado:</div>
          <div class="grid grid-cols-2 gap-2">
            <div>Ctrl+N</div><div>Novo Chat</div>
            <div>Ctrl+/</div><div>Foco no Input</div>
            <div>Ctrl+B</div><div>Toggle Sidebar</div>
            <div>Ctrl+F</div><div>Pesquisar</div>
            <div>Ctrl+End</div><div>Rolar para Baixo</div>
          </div>
        </div>
        
        <div class="text-sm text-gray-500">
          <div class="font-medium mb-2">Estatísticas:</div>
          <div class="grid grid-cols-2 gap-2">
            <div>Total de Chats:</div>
            <div>{$chatHistory.length}</div>
            <div>Favoritos:</div>
            <div>{$chatHistory.filter(c => c.favorite).length}</div>
            <div>Mensagens:</div>
            <div>{$chatHistory.reduce((acc, chat) => acc + chat.messages.length, 0)}</div>
          </div>
        </div>
      </div>
    </div>
  {/if}

  <!-- Chat Area com mensagens copiáveis -->
  <div class="flex-1 flex flex-col {themeClasses.bg} transition-colors duration-200 overflow-hidden">
    <!-- Header -->
    <header class="{themeClasses.header} p-4 border-b {themeClasses.border} transition-colors duration-200 flex-shrink-0">
      <div class="flex justify-between items-center">
        <div class="flex items-center gap-4">
          <button
            on:click={() => showSidebar.update(v => !v)}
            class="p-2 text-gray-500 {themeClasses.hover} rounded-lg transition-all duration-200"
            title="Toggle Sidebar"
            aria-label="Toggle Sidebar"
          >
            {$showSidebar ? '◀️' : '▶️'}
          </button>
          <div>
            <h1 class="text-xl {themeClasses.text} font-semibold">Chat-Ollama</h1>
            {#if $isLoading}
              <div class="text-sm text-blue-400 animate-pulse">
                Pensando...
              </div>
            {/if}
          </div>
        </div>
        <div class="flex gap-2">
          <button
            on:click={() => showSettings = !showSettings}
            class="p-2 text-gray-500 {themeClasses.hover} rounded-lg transition-all duration-200"
            title="Configurações"
            aria-label="Abrir configurações"
          >
            ⚙️
          </button>
          <button
            on:click={clearChat}
            class="p-2 text-gray-500 {themeClasses.hover} rounded-lg transition-all duration-200"
            title="Limpar conversa"
            aria-label="Limpar conversa"
          >
            🗑️
          </button>
          <button
            on:click={exportChat}
            class="p-2 text-gray-500 {themeClasses.hover} rounded-lg transition-all duration-200"
            title="Exportar conversa"
            aria-label="Exportar conversa"
          >
            📥
          </button>
        </div>
      </div>

      {#if showSettings}
        <div class="mt-4 p-4 {themeClasses.bg} rounded-lg border {themeClasses.border}">
          <h2 class="{themeClasses.text} font-semibold mb-4">Configurações</h2>
          <div class="space-y-4">
            <div class="flex flex-col gap-2">
              <label for="theme" class="text-gray-500">Tema</label>
              <select 
                id="theme"
                bind:value={$theme}
                class="{themeClasses.input} {themeClasses.text} rounded px-3 py-2 border {themeClasses.border}"
              >
                <option value="dark">Escuro</option>
                <option value="light">Claro</option>
              </select>
            </div>
            
            <div class="flex flex-col gap-2">
              <label for="model" class="text-gray-500">Modelo</label>
              <select 
                id="model"
                bind:value={$model}
                class="{themeClasses.input} {themeClasses.text} rounded px-3 py-2 border {themeClasses.border}"
              >
                <option value="gemma2:latest">Gemma 2</option>
                <option value="llama2:latest">Llama 2</option>
                <option value="mistral:latest">Mistral</option>
                <option value="codellama:latest">CodeLlama</option>
              </select>
            </div>

            <div class="flex flex-col gap-2">
              <label for="temperature" class="text-gray-500">
                Temperatura: {$temperature}
              </label>
              <input 
                id="temperature"
                type="range" 
                bind:value={$temperature} 
                min="0" 
                max="1" 
                step="0.1"
                class="w-full"
              />
              <div class="text-sm text-gray-500">
                Valores mais baixos = respostas mais consistentes<br>
                Valores mais altos = respostas mais criativas
              </div>
            </div>
          </div>
        </div>
      {/if}
    </header>

    <!-- Chat Messages com ações -->
    <div class="flex-1 flex flex-col relative overflow-hidden">
      <div 
        bind:this={scrollContainer}
        on:scroll={handleScroll}
        class="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth flex flex-col-reverse"
      >
        {#if $messages.length === 0}
          <div class="flex items-center justify-center h-full flex-col gap-4">
            <p class="text-gray-500 text-center">
              Comece uma nova conversa digitando sua mensagem abaixo.<br>
              <span class="text-sm">Pressione Ctrl+/ para focar no campo de mensagem</span>
            </p>
            {#if $model}
              <div class="text-sm text-gray-500">
                Modelo atual: <span class="font-medium">{$model}</span>
              </div>
            {/if}
          </div>
        {:else}
          {#each [...$messages].reverse() as message}
            <div class="flex {message.role === 'user' ? 'justify-end' : 'justify-start'} group">
              <div class="flex flex-col {message.role === 'user' ? 'items-end' : 'items-start'} relative">
                <div class="text-xs text-gray-500 mb-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  {message.role === 'user' ? 'Você' : 'Assistente'} • {new Date(parseInt(message.id)).toLocaleTimeString()}
                </div>
                <div 
                  class="{message.role === 'user' 
                    ? themeClasses.messageUser
                    : themeClasses.messageBot} 
                    max-w-[80%] rounded-lg p-3 shadow-md transition-all duration-200 hover:shadow-lg prose prose-invert relative group"
                >
                  {#if message.role === 'assistant' && $isLoading}
                    <div class="animate-pulse">...</div>
                  {:else}
                    {@html renderMarkdown(message.content)}
                  {/if}
                  
                  <!-- Botões de ação da mensagem -->
                  <div class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-1">
                    <button
                      on:click={() => copyMessage(message.content)}
                      class="p-1 bg-gray-800 hover:bg-gray-700 rounded text-white text-xs"
                      title="Copiar mensagem"
                    >
                      📋
                    </button>
                  </div>
                </div>
              </div>
            </div>
          {/each}
        {/if}
      </div>

      {#if userHasScrolled && $messages.length > 0}
        <button
          on:click={scrollToBottom}
          class="absolute top-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-full shadow-lg hover:bg-blue-700 transition-all duration-200 flex items-center gap-2 group"
          title="Rolar para cima (Ctrl+End)"
        >
          <span class="transform transition-transform group-hover:-translate-y-1">⬆️</span>
          <span class="text-sm">
            {#if unreadMessages > 0}
              {unreadMessages} nova{unreadMessages !== 1 ? 's' : ''} mensage{unreadMessages !== 1 ? 'ns' : 'm'}
            {:else}
              Rolar para cima
            {/if}
          </span>
        </button>
      {/if}
    </div>

    <!-- Input Area com sugestões -->
    <div class="border-t {themeClasses.border} p-4 {themeClasses.header} transition-colors duration-200 flex-shrink-0">
      <form on:submit|preventDefault={handleSubmit} class="flex flex-col gap-2">
        <div class="flex gap-2">
          <div class="flex-1 relative">
            <input
              type="text"
              bind:value={$input}
              placeholder="Digite sua mensagem... (Ctrl+/ para focar)"
              class="w-full {themeClasses.input} {themeClasses.text} rounded-lg px-4 py-2 border {themeClasses.border} focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
              disabled={$isLoading}
              aria-label="Mensagem"
            />
            {#if !$input && !$isLoading}
              <div class="absolute top-full left-0 mt-2 w-full p-2 {themeClasses.bg} rounded-lg border {themeClasses.border} text-sm">
                <div class="text-gray-500 mb-2">Sugestões:</div>
                <div class="flex flex-wrap gap-2">
                  <button
                    type="button"
                    class="px-2 py-1 bg-blue-600 text-white rounded-full text-xs hover:bg-blue-700"
                    on:click={() => input.set("Explique como funciona o modelo " + $model)}
                  >
                    Sobre o modelo
                  </button>
                  <button
                    type="button"
                    class="px-2 py-1 bg-blue-600 text-white rounded-full text-xs hover:bg-blue-700"
                    on:click={() => input.set("Quais são suas principais capacidades?")}
                  >
                    Capacidades
                  </button>
                  <button
                    type="button"
                    class="px-2 py-1 bg-blue-600 text-white rounded-full text-xs hover:bg-blue-700"
                    on:click={() => input.set("Me ajude com um exemplo de código")}
                  >
                    Exemplo de código
                  </button>
                </div>
              </div>
            {/if}
          </div>
          <button
            type="submit"
            class="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            disabled={$isLoading || !$input.trim()}
            aria-label="Enviar mensagem"
          >
            {#if $isLoading}
              <span class="animate-spin" aria-hidden="true">⟳</span>
            {/if}
            Enviar
          </button>
        </div>
        {#if $input.length > 0}
          <div class="text-xs text-gray-500 text-right">
            {$input.length} caractere{$input.length !== 1 ? 's' : ''}
          </div>
        {/if}
      </form>
    </div>
  </div>
</div>

<svelte:window on:keydown={handleKeyPress} />

<style lang="postcss">
  :global(html) {
    @apply transition-colors duration-200;
  }

  :global(.prose) {
    @apply max-w-none;
  }

  :global(.prose pre) {
    @apply bg-gray-800 text-gray-100 p-4 rounded-lg overflow-x-auto;
  }

  :global(.prose code) {
    @apply bg-gray-800 text-gray-100 px-1 py-0.5 rounded;
  }

  :global(.prose a) {
    @apply text-blue-500 hover:text-blue-600;
  }

  :global(.prose ul) {
    @apply list-disc list-inside;
  }

  :global(.prose ol) {
    @apply list-decimal list-inside;
  }
</style>