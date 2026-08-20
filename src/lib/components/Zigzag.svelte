<!--
  The zellij banding. Written out three times in the artifact, identically.

  It drifts sideways forever, and consecutive bands run opposite ways so the page
  reads as woven rather than as everything sliding one direction. The inner strip
  overhangs by one pattern period at each end, so the loop point is invisible.

  The global prefers-reduced-motion rule in app.css stops the drift.
-->
<script>
  let { reverse = false } = $props();
</script>

<div class="relative h-[22px] shrink-0 overflow-hidden" role="presentation" aria-hidden="true">
  <div
    class="zigzag-band absolute inset-y-0 -left-[29px] -right-[29px]"
    style="animation: zigzag-drift 1.2s linear infinite {reverse ? 'reverse' : 'normal'}"
  ></div>
</div>
