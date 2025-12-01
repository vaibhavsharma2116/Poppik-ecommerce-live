import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { queryClient } from "./lib/queryClient";

// If VITE_API_BASE is set, rewrite browser fetch calls that target '/api' to the backend origin.
(() => {
	try {
		const BASE = (import.meta as any).env?.VITE_API_BASE || "";
		if (BASE) {
			const baseClean = BASE.replace(/\/$/, "");
			const originalFetch = window.fetch.bind(window) as typeof fetch;
			// @ts-ignore - override global fetch
			window.fetch = (input: RequestInfo, init?: RequestInit) => {
				try {
					if (typeof input === 'string') {
						if (input.startsWith('/api')) {
							return originalFetch(baseClean + input, init);
						}
					} else if (input instanceof Request) {
						const url = new URL(input.url, window.location.origin);
						if (url.pathname.startsWith('/api')) {
							const newUrl = baseClean + url.pathname + url.search;
							const newReq = new Request(newUrl, input);
							return originalFetch(newReq, init);
						}
					}
				} catch (e) {
					// if anything fails, fall back to original fetch
				}
				return originalFetch(input, init);
			};
			console.log('[api base] fetch proxy enabled ->', baseClean);
		}
	} catch (err) {
		console.warn('Could not enable fetch proxy', err);
	}
})();

createRoot(document.getElementById("root")!).render(<App />);

// Global WebSocket to receive announcements broadcasts and invalidate queries
(() => {
	try {
		const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
		const hosts = [
			`${protocol}://${window.location.host}/ws/announcements`,
			`${protocol}://${window.location.hostname}:5000/ws/announcements`,
		];

		let ws: WebSocket | null = null;
		let idx = 0;
		function connect() {
			const url = hosts[Math.min(idx, hosts.length - 1)];
			ws = new WebSocket(url);
			ws.onopen = () => {
				console.log('[announcements-ws] connected to', url);
				idx = 0;
			};
			ws.onmessage = (ev) => {
				try {
					  const payload = JSON.parse(ev.data);
					  console.log('[announcements-ws] message', payload);
					  // Invalidate active announcements and sliders queries so UI updates everywhere
					  queryClient.invalidateQueries({ queryKey: ['/api/announcements'] });
					  queryClient.invalidateQueries({ queryKey: ['/api/admin/announcements'] });
					  queryClient.invalidateQueries({ queryKey: ['/api/sliders'] });
					  queryClient.invalidateQueries({ queryKey: ['/api/admin/sliders'] });
				} catch (e) {
					// ignore
				}
			};
			ws.onclose = () => {
				console.warn('[announcements-ws] disconnected, retrying...');
				idx += 1;
				setTimeout(connect, Math.min(3000 * idx, 10000));
			};
			ws.onerror = () => {
				try { ws?.close(); } catch (e) {}
			};
		}

		connect();
		// expose for debugging
		(window as any).__announcements_ws__ = ws;
	} catch (e) {
		console.warn('Failed to init announcements WS', e);
	}
})();
