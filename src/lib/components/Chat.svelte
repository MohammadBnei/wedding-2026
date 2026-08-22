<!--
  The chatbot. In the artifact this was theatre: it exact-string-matched the four
  suggestion chips, so anything a guest actually typed returned the fallback line.
  Here every message goes to the server, which answers from the LLM when one is
  configured and falls back to the canned chip answers when it isn't — either way
  the transcript is persisted against the visitor cookie and survives a reload.
-->
<script>
  import Chip from './Chip.svelte';
  import Bubble from './Bubble.svelte';

  let { t, messages: initial = [], lang } = $props();

  let messages = $state([...initial]);
  let draft = $state('');
  let pending = $state(false);
  let error = $state('');
  let log;

  // Keep the newest message in view without yanking the whole page around.
  // The first run is the restored transcript, not a new message: scrolling then
  // would drop an arriving visitor straight into the chat, past everything above.
  let restored = false;
  $effect(() => {
    void messages.length;
    if (!restored) {
      restored = true;
      return;
    }
    log?.lastElementChild?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  });

  async function ask(text) {
    const q = text.trim();
    if (!q || pending) return;
    draft = '';
    error = '';
    messages = [...messages, { role: 'user', content: q }];
    pending = true;
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message: q, lang })
      });
      const data = await res.json();
      if (!res.ok) {
        error = data.error ?? t.fallback;
        return;
      }
      messages = [...messages, { role: 'assistant', content: data.reply }];
    } catch {
      error = t.fallback;
    } finally {
      pending = false;
    }
  }
</script>

<!-- The transcript is the part that scrolls: once the section reaches its
     max-h-dvh cap, min-h-0 lets this shrink inside the flex column instead of
     pushing the composer off-screen. -->
<div class="flex flex-wrap gap-1.5">
  {#each t.chips as chip (chip.q)}
    <Chip onclick={() => ask(chip.q)} disabled={pending}>{chip.q}</Chip>
  {/each}
</div>

{#if messages.length || pending || error}
  <div
    bind:this={log}
    class="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto"
    role="log"
    aria-live="polite"
    aria-busy={pending}
  >
    {#each messages as m, i (i)}
      <Bubble role={m.role}>{m.content}</Bubble>
    {/each}
    {#if pending}
      <Bubble role="assistant"><span class="text-ink-muted">…</span></Bubble>
    {/if}
    {#if error}
      <Bubble role="assistant">{error}</Bubble>
    {/if}
  </div>
{/if}

<form
  class="flex border border-line bg-surface-raise"
  onsubmit={(e) => {
    e.preventDefault();
    ask(draft);
  }}
>
  <label class="sr-only" for="chat-input">{t.chatPlaceholder}</label>
  <input
    id="chat-input"
    bind:value={draft}
    maxlength="500"
    placeholder={t.chatPlaceholder}
    disabled={pending}
    class="flex-1 bg-transparent px-3.5 py-3.5 text-sm font-light text-ink placeholder:text-ink-muted focus:outline-none"
  />
  <button
    type="submit"
    disabled={pending || !draft.trim()}
    class="caps bg-primary px-4.5 text-[11px] font-semibold text-primary-ink disabled:opacity-50"
  >
    {t.send}
  </button>
</form>
