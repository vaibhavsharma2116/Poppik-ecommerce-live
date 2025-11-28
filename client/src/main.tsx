import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

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
