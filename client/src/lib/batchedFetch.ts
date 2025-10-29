
const pendingRequests = new Map<string, Promise<any>>();

export async function batchedFetch<T>(url: string, options?: RequestInit): Promise<T> {
  // If same request is already pending, return that promise
  const key = `${url}-${JSON.stringify(options)}`;
  
  if (pendingRequests.has(key)) {
    return pendingRequests.get(key);
  }

  const promise = fetch(url, options)
    .then(res => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .finally(() => {
      // Remove from pending after completion
      setTimeout(() => pendingRequests.delete(key), 100);
    });

  pendingRequests.set(key, promise);
  return promise;
}
