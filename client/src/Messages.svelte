<script lang="ts">
  import { beforeUpdate, afterUpdate, onMount, onDestroy } from "svelte"
  import { user, getMessageStore } from "./stores"
  import ScrollToBottom from "./ScrollToBottom.svelte"
  import MessageInput from "./MessageInput.svelte"
  import MessageList from "./MessageList.svelte"
  import Spinner from "./ui/Spinner.svelte"
  import { derived, get, readable } from "svelte/store"

  const ADD_ON_SCROLL = 50 // messages to add when scrolling to the top
  let showMessages = 100 // initial messages to load

  let autoscroll
  let showScrollToBottom
  let main
  let isLoading = false

  const messages = getMessageStore()

  onMount(async () => {
    await messages.init()
    messages.poll()
  })

  const displayMessages = derived(messages, ($messages) => {
    const arr = Object.values($messages)
    return arr
      .sort((a, b) => b.time - a.time)
      .slice(0, showMessages)
      .reverse()
  })

  function scrollToBottom() {
    main.scrollTo({ left: 0, top: main.scrollHeight })
  }

  function handleScroll(e) {
    showScrollToBottom =
      main.scrollHeight - main.offsetHeight > main.scrollTop + 300
    if (!isLoading && main.scrollTop <= main.scrollHeight / 10) {
      const totalMessages = $messages.length - 1
      if (showMessages >= totalMessages) return
      isLoading = true
      setTimeout(() => {
        showMessages += ADD_ON_SCROLL
        if (main.scrollTop === 0) main.scrollTop = 1
        isLoading = false
      }, 200)
    }
  }

  function handleNewMessage(msg) {
    const now = new Date().getTime()
    const message = { message: msg, user: $user, time: `${now}` }
    messages.send(message)
  }

  function handleDelete(msgId) {
    db.get(msgId).put(null)
  }

  beforeUpdate(() => {
    autoscroll =
      main && main.offsetHeight + main.scrollTop > main.scrollHeight - 50
  })

  afterUpdate(() => {
    if (autoscroll) main.scrollTo(0, main.scrollHeight)
  })

  onDestroy(() => {
    // remove db listeners
    db.off()
  })
</script>

<main bind:this={main} on:scroll={handleScroll}>
  {#if isLoading}
    <Spinner />
  {/if}
  <MessageList
    messages={displayMessages}
    on:delete={(e) => {
      handleDelete(e.detail)
    }}
  />
</main>

<MessageInput
  on:message={(e) => {
    handleNewMessage(e.detail)
    scrollToBottom()
  }}
/>

{#if showScrollToBottom}
  <ScrollToBottom onScroll={scrollToBottom} />
{/if}

<style>
  main {
    margin: auto 0 3em 0;
    padding: 0.5em 1em 0.5em 1em;
    overflow-y: auto;
  }
</style>
