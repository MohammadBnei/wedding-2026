<!--
  The rule-and-motif divider from the henna invitation, which separates its blocks
  with a small ornament flanked by hairlines rather than a plain line.

  Replaces the bare 1px rule the design used in three places.
-->
<script>
  let { width = 'w-28', tone = 'line' } = $props();

  const rule = { line: 'bg-line', soft: 'bg-primary-soft' };
  const mark = { line: 'text-accent', soft: 'text-blush' };
</script>

<div class="flex items-center justify-center gap-2 {width}" aria-hidden="true">
  <div class="h-px flex-1 {rule[tone]}"></div>
  <svg viewBox="0 0 24 12" class="h-2.5 w-6 {mark[tone]}" fill="currentColor">
    <!-- a small lozenge flanked by two dots — the henna's block separator -->
    <circle cx="2" cy="6" r="1.4" />
    <path d="M12 1 L17 6 L12 11 L7 6 Z" />
    <circle cx="22" cy="6" r="1.4" />
  </svg>
  <div class="h-px flex-1 {rule[tone]}"></div>
</div>
