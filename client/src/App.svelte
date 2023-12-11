<script lang="ts">
  import { nav, user } from "./stores"
  import Messages from "./Messages.svelte"
  import Settings from "./Settings.svelte"
  import Nav from "./ui/Nav.svelte"
  import Page from "./ui/Page.svelte"
  import Footer from "./Footer.svelte"
</script>

{#if $nav === "settings"}
  <Page>
    <Nav>Sign In</Nav>
    <Settings />
    <Footer />
  </Page>
{:else}
  <Page>
    <Nav
      showBack
      backText="Sign Out ({$user})"
      on:back={() => {
        $nav = "settings"
      }}
    >
      Messages
    </Nav>
    <Messages />
  </Page>
{/if}
