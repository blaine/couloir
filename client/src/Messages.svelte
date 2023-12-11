<script lang="ts">
  import { afterUpdate, beforeUpdate, onDestroy, onMount } from "svelte"
  import { derived } from "svelte/store"
  import MessageInput from "./MessageInput.svelte"
  import MessageList from "./MessageList.svelte"
  import ScrollToBottom from "./ScrollToBottom.svelte"
  import { getMessageStore, user } from "./stores"
  import Spinner from "./ui/Spinner.svelte"

  const ADD_ON_SCROLL = 50 // messages to add when scrolling to the top
  let showMessages = 100 // initial messages to load

  let autoscroll = true
  let showScrollToBottom = true
  let main: HTMLElement
  let isLoading = false

  const messages = getMessageStore()

  onMount(async () => {
    await messages.init()
    messages.poll()
  })

  const displayMessages = derived(messages, ($messages) => {
    const arr = Object.values($messages)
    return arr
      .sort((a, b) => Number(b.time) - Number(a.time)) // TODO: just use numbers!?
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
    alert("Delete not yet supported by the server!")
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
    // db.off()
    // TODO: stop messageStore from polling the server?
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
