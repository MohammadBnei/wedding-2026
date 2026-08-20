<!--
  One row of a labelled list. Serves BOTH the schedule (time + title + note) and
  the essentials list (label + value) — the artifact wrote these as two separate
  blocks that were structurally identical apart from the lead column width.

  Uses logical properties so it mirrors correctly in Arabic and Persian; the
  artifact used physical border-left and the rules stayed stubbornly on the left.
-->
<script>
  let { lead = '', leadWidth = 'time', title = '', children } = $props();

  const widths = { time: 'w-14', label: 'w-24' };
  // The lead column is centred on both axes within the row, so a one-line time
  // sits opposite the middle of a three-line note rather than at its top edge.
  const leadStyle = {
    time: 'text-[13px] font-semibold text-accent',
    label: 'text-[11px] font-light caps text-accent'
  };
</script>

<div class="flex gap-4">
  <div
    class="{widths[leadWidth]} flex shrink-0 items-center justify-center pb-4 text-center {leadStyle[
      leadWidth
    ]}"
  >
    {lead}
  </div>
  <div class="flex-1 border-b border-line-soft pb-4">
    {#if title}
      <p class="text-[15px] font-normal text-ink">{title}</p>
    {/if}
    {#if children}
      <div class="text-[13px] leading-relaxed font-light text-ink-muted">{@render children()}</div>
    {/if}
  </div>
</div>
