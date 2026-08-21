import tailwindcss from '@tailwindcss/vite';
import adapter from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	// The port is pinned, not passed on the command line: playwright.config.js's
	// baseURL and the CI smoke loop both target :5188, and the --port flag that
	// used to carry it lived in dev-local.sh. strictPort so a busy port fails
	// loudly instead of silently serving on 5189 while the e2e run dials 5188.
	//
	// host: 0.0.0.0 so the site is reachable from a phone on the LAN — cookie
	// Secure comes from url.protocol, so plain http://192.168.x.x behaves
	// correctly there. See the deployment notes in README.md.
	server: { port: 5188, strictPort: true, host: true },
	plugins: [
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) => filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			adapter: adapter()
		})
	]
});
