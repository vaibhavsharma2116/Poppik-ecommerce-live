import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import apiUrl from '@/lib/api';

type PendingResp = {
  status?: string;
  message?: string;
};

export default function AdminThermalPrint() {
  const [phase, setPhase] = useState<'idle' | 'polling' | 'ready' | 'error'>('idle');
  const [message, setMessage] = useState<string>('');
  const [attempt, setAttempt] = useState<number>(0);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const orderId = String(params.get('orderId') || '').trim();
  const tokenFromQs = String(params.get('token') || '').trim();

  const token = useMemo(() => {
    const ls = localStorage.getItem('token') || localStorage.getItem('adminToken') || '';
    return tokenFromQs || ls;
  }, [tokenFromQs]);

  useEffect(() => {
    const sidebar = document.querySelector('[data-sidebar="sidebar"]') as HTMLElement | null;
    const prevDisplay = sidebar?.style.display ?? '';
    if (sidebar) sidebar.style.display = 'none';
    return () => {
      if (sidebar) sidebar.style.display = prevDisplay;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [pdfUrl]);

  useEffect(() => {
    if (!orderId) {
      setPhase('error');
      setMessage('Missing orderId');
      return;
    }

    let cancelled = false;

    const maxAttempts = 12;
    const delayMs = 5000;

    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

    const buildEndpoint = () => {
      const qs = token ? `?token=${encodeURIComponent(token)}` : '';
      return apiUrl(`/api/admin/print-thermal-invoice/${encodeURIComponent(orderId)}${qs}`);
    };

    const poll = async () => {
      setPhase('polling');
      setMessage('Generating AWB…');

      for (let i = 1; i <= maxAttempts; i++) {
        if (cancelled) return;
        setAttempt(i);

        let res: Response;
        try {
          res = await fetch(buildEndpoint(), {
            method: 'GET',
            headers: {
              Accept: 'application/pdf,application/json',
            },
          });
        } catch (e: any) {
          if (cancelled) return;
          setPhase('error');
          setMessage(String(e?.message || e || 'Network error'));
          return;
        }

        if (cancelled) return;

        if (res.status === 202) {
          const body: PendingResp | null = await res.json().catch(() => null);
          setMessage(body?.message || 'AWB not available yet. Retrying…');
          await sleep(delayMs);
          continue;
        }

        if (!res.ok) {
          const txt = await res.text().catch(() => '');
          setPhase('error');
          setMessage(txt || `Request failed (${res.status})`);
          return;
        }

        const contentType = String(res.headers.get('content-type') || '').toLowerCase();
        if (contentType.includes('application/pdf')) {
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          setPdfUrl(url);
          setPhase('ready');
          setMessage('Ready');
          return;
        }

        const fallbackText = await res.text().catch(() => '');
        setPhase('error');
        setMessage(fallbackText || 'Unexpected response type');
        return;
      }

      setPhase('error');
      setMessage('Still pending. Please retry after a few minutes.');
    };

    void poll();

    return () => {
      cancelled = true;
    };
  }, [orderId, token]);

  useEffect(() => {
    if (phase !== 'ready' || !pdfUrl) return;
    const iframe = iframeRef.current;
    if (!iframe) return;

    const t = window.setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch {
      }
    }, 400);

    return () => window.clearTimeout(t);
  }, [phase, pdfUrl]);

  return (
    <div style={{ padding: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif' }}>
          <div style={{ fontWeight: 700 }}>Thermal Print</div>
          <div style={{ fontSize: 13, color: '#475569' }}>{orderId}</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="ghost" onClick={() => window.close()}>Close</Button>
          {phase === 'error' && (
            <Button onClick={() => window.location.reload()}>Retry</Button>
          )}
        </div>
      </div>

      {phase !== 'ready' && (
        <div style={{ fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif' }}>
          <div style={{ fontSize: 14 }}>{message || 'Working…'}</div>
          {phase === 'polling' && (
            <div style={{ fontSize: 13, color: '#64748b', marginTop: 6 }}>
              Attempt {attempt} / 12
            </div>
          )}
          {phase === 'error' && (
            <div style={{ fontSize: 13, color: '#b91c1c', marginTop: 6 }}>
              {message}
            </div>
          )}
        </div>
      )}

      {phase === 'ready' && pdfUrl && (
        <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
          <iframe
            ref={iframeRef}
            src={pdfUrl}
            style={{ width: '100%', height: '80vh', border: 'none' }}
            title="Thermal Invoice"
          />
        </div>
      )}
    </div>
  );
}
