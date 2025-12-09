import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { queryClient } from "./lib/queryClient";

// Global handler for module loading failures
let retryCount = 0;
const MAX_RETRIES = 3;

// Intercept unhandled rejections from import failures
const handleModuleError = (event: any) => {
	const error = event.reason || event.error || event.message;
	const errorStr = String(error || '').toLowerCase();
	
	if (errorStr.includes('failed to fetch') || errorStr.includes('dynamically') || errorStr.includes('cannot read')) {
		console.warn('[Module Load Error] Retrying...', error);
		retryCount++;
		if (retryCount < MAX_RETRIES) {
			// Reload to clear cached modules and retry
			setTimeout(() => {
				window.location.reload();
			}, 1000 * retryCount);
			event.preventDefault?.();
		} else {
			// Show error UI after max retries
			showModuleErrorUI();
		}
	}
};

const showModuleErrorUI = () => {
	const existing = document.getElementById('module-error-ui');
	if (existing) return;
	
	const errorDiv = document.createElement('div');
	errorDiv.id = 'module-error-ui';
	errorDiv.innerHTML = `
		<div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.5); z-index: 9999;">
			<div style="background: white; padding: 2rem; border-radius: 8px; text-align: center; max-width: 400px;">
				<h2 style="color: #e53e3e; margin-top: 0;">Loading Error</h2>
				<p>We're having trouble loading the page. Please clear your browser cache and try again.</p>
				<button onclick="location.reload()" style="padding: 0.5rem 1rem; background: #ed8936; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 1rem;">
					Reload Page
				</button>
			</div>
		</div>
	`;
	document.body.appendChild(errorDiv);
};

if (typeof window !== 'undefined') {
	window.addEventListener('unhandledrejection', handleModuleError);
	window.addEventListener('error', (event) => {
		if (event.filename?.includes('/assets/')) {
			console.error('[Asset Load Error]:', event.filename);
			handleModuleError(event);
		}
	});
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
const initAnnouncementsWS = () => {
	try {
		const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
		const hosts = [
			`${protocol}://${window.location.host}/ws/announcements`,
			`${protocol}://${window.location.hostname}:8085/ws/announcements`,
		];

		let ws: WebSocket | null = null;
		let idx = 0;
		
		const connect = () => {
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
		};

		connect();
	} catch (e) {
		console.warn('Failed to init announcements WS', e);
	}
};

if (typeof window !== 'undefined') {
	initAnnouncementsWS();
}
