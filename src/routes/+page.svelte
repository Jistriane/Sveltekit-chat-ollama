<script lang="ts">
  import { useChat } from '@vercel/ai/svelte';

  const { messages, input, handleSubmit, isLoading } = useChat();
</script>

<div class="flex flex-col h-screen bg-gray-800">
  <!-- Header -->
  <header class="bg-gray-900 p-4 border-b border-gray-700">
    <h1 class="text-xl text-white font-semibold">Chat Dope</h1>
  </header>

  <!-- Chat Messages -->
  <div class="flex-1 overflow-y-auto p-4 space-y-4">
    {#each $messages as message}
      <div class="flex {message.role === 'user' ? 'justify-end' : 'justify-start'}">
        <div class="{message.role === 'user' 
          ? 'bg-blue-600 text-white' 
          : 'bg-gray-700 text-gray-100'} 
          max-w-[80%] rounded-lg p-3 shadow-md">
          {message.content}
        </div>
      </div>
    {/each}
  </div>

  <!-- Input Area -->
  <div class="border-t border-gray-700 p-4 bg-gray-900">
    <form on:submit|preventDefault={$handleSubmit} class="flex gap-2">
      <input
        type="text"
        bind:value={$input}
        placeholder="Digite sua mensagem..."
        class="flex-1 bg-gray-800 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        disabled={$isLoading}
      />
      <button
        type="submit"
        class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        disabled={$isLoading}
      >
        Enviar
      </button>
    </form>
  </div>
</div>

<style lang="postcss">
  @reference "tailwindcss/theme";
  :global(html) {
    background-color: theme(--color-gray-100);
  }
</style>