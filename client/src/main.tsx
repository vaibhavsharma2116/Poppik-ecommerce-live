import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { queryClient } from "./lib/queryClient";

// Handle module loading errors globally
if (typeof window !== 'undefined') {
	// Track failed chunk loads and retry with full page reload
	let failedLoadAttempts = 0;
	const maxRetries = 3;

	const handleChunkLoadError = (error: unknown) => {
		failedLoadAttempts++;
		console.error('[Chunk Load Error]', error, `Attempt ${failedLoadAttempts}/${maxRetries}`);
		
		if (failedLoadAttempts < maxRetries) {
			// Retry after a delay
			setTimeout(() => {
				window.location.reload();
			}, 1000 * failedLoadAttempts);
		} else {
			// Show error message after max retries
			const errorDiv = document.createElement('div');
			errorDiv.id = 'chunk-load-error';
			errorDiv.innerHTML = `
				<div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.5); z-index: 9999;">
					<div style="background: white; padding: 2rem; border-radius: 8px; text-align: center; max-width: 400px;">
						<h2 style="color: #e53e3e; margin-top: 0;">Loading Error</h2>
						<p>We're having trouble loading the page. Please clear your browser cache and try again.</p>
						<button onclick="window.location.href = window.location.pathname" style="padding: 0.5rem 1rem; background: #ed8936; color: white; border: none; border-radius: 4px; cursor: pointer;">
							Try Again
						</button>
					</div>
				</div>
			`;
			document.body.appendChild(errorDiv);
		}
	};

	// Catch import errors
	window.addEventListener('error', (event) => {
		if (event.message && event.message.includes('Failed to fetch dynamically imported module')) {
			handleChunkLoadError(event.message);
		}
	});

	// Catch unhandled promise rejections from dynamic imports
	window.addEventListener('unhandledrejection', (event) => {
		if (event.reason && typeof event.reason === 'object') {
			const errorMsg = String(event.reason.message || event.reason);
			if (errorMsg.includes('Failed to fetch') || errorMsg.includes('dynamically')) {
				handleChunkLoadError(event.reason);
			}
		}
	});

	// Store failed attempts in sessionStorage for recovery
	const failedChunks = sessionStorage.getItem('failedChunks');
	if (failedChunks) {
		try {
			failedLoadAttempts = JSON.parse(failedChunks).attempts || 0;
		} catch (e) {
			// ignore
		}
	}

	// Update sessionStorage with current attempt count
	sessionStorage.setItem('failedChunks', JSON.stringify({ attempts: failedLoadAttempts }));
}

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
			`${protocol}://${window.location.hostname}:8085/ws/announcements`,
		];

		let ws: WebSocket | null = null;
		let idx = 0;
		function connect() {
			const url = hosts[Math.min(idx, hosts.length - 1)];
			ws = new WebSocket(url);
			// expose current ws for other components to reuse
			try { (window as any).__announcements_ws__ = ws; } catch (e) {}
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
	} catch (e) {
		console.warn('Failed to init announcements WS', e);
	}
})();
