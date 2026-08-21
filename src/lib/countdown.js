/**
 * The countdown maths, kept out of the component so it can be asserted on
 * without a DOM. The component's only job is to hold `now` and re-render.
 */

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * Split a duration into whole days, hours and minutes.
 *
 * Clamped at zero rather than counting up: the day after the wedding this reads
 * "0 / 0 / 0", not a negative number, and the page needs no separate past-tense
 * branch to stay correct.
 *
 * @param {number} ms milliseconds remaining
 * @returns {{ days: number, hours: number, mins: number }}
 */
export function breakdown(ms) {
  const left = Math.max(0, ms);
  return {
    days: Math.floor(left / DAY),
    hours: Math.floor(left / HOUR) % 24,
    mins: Math.floor(left / MINUTE) % 60
  };
}
