<script lang="ts">
  import Footer from "./Footer.svelte"
  import Messages from "./Messages.svelte"
  import Settings from "./Settings.svelte"
  import { nav, user } from "./stores"
  import Nav from "./ui/Nav.svelte"
  import Page from "./ui/Page.svelte"
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
