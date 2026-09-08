<!--
  One route, two screens.

  The projector ran the wall on the night; the gallery is what the same posts
  became afterwards. They are separate components rather than one component with
  branches because the projector starts timers, a poll and window listeners on
  mount — an `{#if}` around its markup alone would leave all of that running
  behind the gallery, advancing slides nobody is watching and polling an
  endpoint whose answer is thrown away.

  `data.over` comes from +layout.server.js (WEDDING_OVER, see
  $lib/server/mode.js) and +page.server.js branches its query on the same flag,
  so each component is handed only what it actually reads.
-->
<script>
  import Projector from '$lib/components/Projector.svelte';
  import Gallery from '$lib/components/Gallery.svelte';

  let { data } = $props();
</script>

{#if data.over}
  <Gallery t={data.t} items={data.items} up={data.up} />
{:else}
  <Projector {data} />
{/if}
