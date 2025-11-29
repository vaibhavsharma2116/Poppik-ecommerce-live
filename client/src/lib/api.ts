export const apiUrl = (path: string) => {
  const base = (import.meta as any).env?.VITE_API_BASE || '';
  if (!base) return path;
  return `${base.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`;
};

export default apiUrl;
