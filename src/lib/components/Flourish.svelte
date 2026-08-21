<!--
  The rule-and-motif divider from the henna invitation, which separates its blocks
  with a small ornament flanked by hairlines rather than a plain line.

  Replaces the bare 1px rule the design used in three places. The motif used to be
  a lozenge between two dots, invented here and drawn nowhere else on the page;
  it is the eight-point star now, like every other mark.
-->
<script>
  import { star } from '$lib/tracery.js';

  let { width = 'w-28', tone = 'line' } = $props();

  const rule = { line: 'bg-line', soft: 'bg-primary-soft' };
  const mark = { line: 'text-accent', soft: 'text-blush' };
</script>

<div class="flex items-center justify-center gap-2 {width}" aria-hidden="true">
  <div class="h-px flex-1 {rule[tone]}"></div>
  <svg viewBox="0 0 12 12" class="h-2.5 w-2.5 {mark[tone]}" fill="none">
    <path
      d={star(6, 6, 5.4)}
      stroke="currentColor"
      stroke-width="1.1"
      vector-effect="non-scaling-stroke"
    />
  </svg>
  <div class="h-px flex-1 {rule[tone]}"></div>
</div>
