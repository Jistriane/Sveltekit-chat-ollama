<script lang="ts">
  import { marked } from 'marked';
  import { writable } from 'svelte/store';

  const theme = writable('dark');
  const temperature = writable(0.7);
  const model = writable('gemma2:latest');
  const messages = writable([]);
  const input = writable('');
  const isLoading = writable(false);

  async function handleSubmit(event: Event) {
    event.preventDefault();
    if (!$input.trim() || $isLoading) return;

    const userMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: $input.trim()
    };

    // Adiciona a mensagem do usuário
    messages.update(msgs => [...msgs, userMessage]);
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

      // Adiciona a resposta do assistente
      messages.update(msgs => [...msgs, {
        id: Date.now().toString(),
        ...data
      }]);

    } catch (error) {
      console.error('Erro no chat:', error);
      messages.update(msgs => [...msgs, {
        id: Date.now().toString(),
        role: 'assistant',
        content: error instanceof Error ? error.message : 'Erro ao processar mensagem'
      }]);
    } finally {
      isLoading.set(false);
    }
  }

  function clearChat() {
    messages.set([]);
  }

  function exportChat() {
    const chatHistory = $messages.map((msg: { role: string; content: string }) => `${msg.role}: ${msg.content}`).join('\n\n');
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

  let scrollContainer: HTMLDivElement;
  let showSettings = false;

  $: if (scrollContainer && $messages.length > 0) {
    setTimeout(() => {
      scrollContainer.scrollTop = scrollContainer.scrollHeight;
    }, 0);
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
        messageBot: 'bg-gray-700 text-gray-100'
      }
    : {
        bg: 'bg-gray-100',
        header: 'bg-white',
        text: 'text-gray-900',
        input: 'bg-white',
        border: 'border-gray-200',
        hover: 'hover:bg-gray-100',
        messageUser: 'bg-blue-600 text-white',
        messageBot: 'bg-white text-gray-900'
      };
</script>

<div class="flex flex-col h-screen {themeClasses.bg} transition-colors duration-200">
  <!-- Header -->
  <header class="{themeClasses.header} p-4 border-b {themeClasses.border} transition-colors duration-200">
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-xl {themeClasses.text} font-semibold">Chat Dope</h1>
        {#if $isLoading}
          <div class="text-sm text-blue-400 animate-pulse">
            Pensando...
          </div>
        {/if}
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

  <!-- Chat Messages -->
  <div 
    bind:this={scrollContainer}
    class="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth"
  >
    {#if $messages.length === 0}
      <div class="flex items-center justify-center h-full">
        <p class="text-gray-500 text-center">
          Comece uma nova conversa digitando sua mensagem abaixo.
        </p>
      </div>
    {/if}
    {#each $messages as message}
      <div class="flex {message.role === 'user' ? 'justify-end' : 'justify-start'}">
        <div 
          class="{message.role === 'user' 
            ? themeClasses.messageUser
            : themeClasses.messageBot} 
            max-w-[80%] rounded-lg p-3 shadow-md transition-all duration-200 hover:shadow-lg prose prose-invert"
        >
          {#if message.role === 'assistant' && $isLoading}
            <div class="animate-pulse">...</div>
          {:else}
            {@html renderMarkdown(message.content)}
          {/if}
        </div>
      </div>
    {/each}
  </div>

  <!-- Input Area -->
  <div class="border-t {themeClasses.border} p-4 {themeClasses.header} transition-colors duration-200">
    <form on:submit|preventDefault={handleSubmit} class="flex gap-2">
      <input
        type="text"
        bind:value={$input}
        placeholder="Digite sua mensagem..."
        class="flex-1 {themeClasses.input} {themeClasses.text} rounded-lg px-4 py-2 border {themeClasses.border} focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
        disabled={$isLoading}
        aria-label="Mensagem"
      />
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
    </form>
  </div>
</div>

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