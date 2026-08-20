# wedding-2026

The wedding site for Leïla & Mohammad-Amine — 5 September 2026, Fosses.

Four languages (fr / en / ar / fa), a grounded AI chatbot for guest questions,
and RSVPs that persist. Deployed on ukubi-cluster at **wedding.bnei.dev**.

## How it works

| | |
|---|---|
| Framework | SvelteKit 2, Svelte 5 runes, `adapter-node` |
| Styling | Tailwind v4, CSS-first `@theme` tokens, light + dark |
| Database | Pigsty at `postgres.bnei.lan:5432` (**not** 6432 — pgbouncer's transaction pooling breaks prepared statements) |
| Chatbot | Any OpenAI-compatible endpoint, set entirely by env var |
| Deploy | buildah on the `build-runner` LXC → `registry.bnei.lan:5000` → ArgoCD |

### `src/lib/content/wedding.js` is the single source of truth

Every fact and all four locales live in that one file. The page renders from it
**and** the chatbot's system prompt is built from it, so the bot cannot
contradict the schedule printed above it. Change a time there and both change.

`src/lib/chat-prompt.test.js` asserts that coupling.

### Design tokens

Every colour lives in `@theme` in `src/app.css`. No component contains a raw hex
or a stock Tailwind palette colour. The check:

```sh
grep -rnE '#[0-9a-fA-F]{3,6}' src/lib src/routes   # must return nothing
```

Note that `--color-primary-surface` (the large green field: rail, footer) and
`--color-primary` (green as ink on paper) are deliberately separate tokens. Dark
mode lifts the second for contrast and leaves the first dark — collapsing them
turns the rail mint.

### The chatbot degrades instead of breaking

With no `OPENAI_API_KEY`, `/api/chat` answers from the canned FAQ in
`wedding.js`. The site works end to end with no provider configured.

Guardrails: answer only from the facts, otherwise say so and give the contact
numbers; decline anything off-topic; reply in the guest's language. Limits are
500 chars per message, 20 messages per visitor per hour, and 500 site-wide per
day — all enforced in SQL against `chat_message`, no Redis.

## Running it

```sh
docker run -d --name wedding-pg -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=weddingdb -p 55432:5432 postgres:16-alpine
cp .env.example .env      # point WEDDING_DB_PORT at 55432
bun install && bun run dev
```

Tables are created on boot (`src/lib/server/db.js`). There is no migration step.

```sh
bun test src        # prompt construction, guardrails, limits
bun run test:e2e    # 26 browser tests, needs the dev server on :5188
```

## Still to fill in

`src/lib/content/wedding.js` carries these as `PLACEHOLDER`:

- **phone numbers** — both are `06 00 00 00 00`
- **street number** — the address has none
- **`photoDropUrl`** — empty hides the photo link entirely
- **`gardenPlanImage`** — drop a drawing at `static/plan.jpg` and point at it;
  the four pins are positioned in percentages and scale over any image
