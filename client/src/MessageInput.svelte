<script lang="ts">
  import { SvelteComponent, createEventDispatcher } from "svelte"
  import Input from "./ui/Input.svelte"

  const dispatch = createEventDispatcher()
  let messageBody = ""
  let messageElement: SvelteComponent
  export let disabled: boolean
</script>

<div>
  <form
    method="get"
    autocomplete="off"
    on:submit|preventDefault={(e) => {
      if (!messageBody.trim()) return
      dispatch("message", messageBody)
      messageBody = ""
      messageElement.focus()
    }}
  >
    <Input
      multiline
      {disabled}
      maxRows={3}
      bind:value={messageBody}
      bind:this={messageElement}
      placeholder="Message"
      ariaLabel="Message"
    />
  </form>
</div>

<style>
  div {
    position: fixed;
    bottom: 0;
    left: 0;
    width: 100%;
  }

  form {
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    max-width: 640px;
    background-color: white;
    padding: 0.25em 1em;
  }
</style>
