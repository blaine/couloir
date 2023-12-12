<script lang="ts">
  import { nav, user } from "./stores"
  import Input from "./ui/Input.svelte"
</script>

<main>
  <form
    on:submit|preventDefault={(e) => {
      if (!$user) return
      $nav = "messages"
    }}
  >
    <label id="name-label" for="">ENTER YOUR NICKNAME</label>
    <Input
      bind:value={$user}
      maxlength={50}
      placeholder="Steve Jobs"
      ariaLabelledBy="name-label"
    />
  </form>
</main>

<style>
  main {
    margin: auto 0;
  }

  form {
    padding: 2em;
  }

  label {
    padding: 1em;
    font-size: 14px;
  }
</style>
