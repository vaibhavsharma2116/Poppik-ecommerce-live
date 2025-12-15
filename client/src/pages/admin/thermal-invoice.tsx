import React, { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import apiUrl from '@/lib/api';
// Note: install these packages in your project:
// npm install jsbarcode react-qr-code
import JsBarcode from 'jsbarcode';
import QRCode from 'react-qr-code';

type Order = any;

const ReceiptLine = ({ left, right }: { left: React.ReactNode; right?: React.ReactNode }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
    <div style={{ flex: 1 }}>{left}</div>
    {right !== undefined && <div style={{ marginLeft: 10, textAlign: 'right' }}>{right}</div>}
  </div>
);

export default function AdminThermalInvoice() {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('orderId');

    if (!id) {
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const res = await fetch(apiUrl(`/api/orders/${id}`));
        if (res.ok) {
          const data = await res.json();
          setOrder(data);
        } else {
          const fallback = await res.json().catch(() => null);
          console.warn('Failed to fetch order for thermal invoice', fallback);
        }
      } catch (e) {
        console.error('Error fetching order', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Hide admin sidebar while this page is open so the printed view doesn't include it
  useEffect(() => {
    const sidebar = document.querySelector('[data-sidebar="sidebar"]') as HTMLElement | null;
    const prevDisplay = sidebar?.style.display ?? '';
    if (sidebar) sidebar.style.display = 'none';
    return () => {
      if (sidebar) sidebar.style.display = prevDisplay;
    };
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const sampleOrder: Order = {
    id: 'ORD-0001',
    awbCode: 'AWB123456789',
    date: new Date().toISOString(),
    customer: { name: 'Madhavi Mishra', phone: '9876543210', address: 'House# 120, Ground Floor 1st main road, New Baiyappanahalli Extension\nBENGALURU 560038\nKARNATAKA' },
    seller: { name: 'POPPIK LIFESTYLE PRIVATE LIMITED', address: 'Skylark, Pl No. 63 A-213, Belapur Node, Navi Mumbai Thane' },
    items: [
      { name: 'Nail Polish - Red', qty: 1, price: '₹99' },
    ],
    subtotal: '₹99',
    shipping: '₹0',
    total: '₹99'
  };

  const o = order || sampleOrder;

  // Resolve shipment/customer details from returned order shape
  const displayItems = o?.items && o.items.length ? o.items : [{ name: '—', quantity: 0, price: '₹0' }];
  const firstItem = displayItems[0] || {};
  const shipToName = o?.customer?.name || firstItem.recipientName || '-';
  const shipToAddress = o?.customer?.address || firstItem.deliveryAddress || o?.shippingAddress || '-';
  const displayPhone = o?.customer?.phone || firstItem.recipientPhone || '-';

  // Helpers to parse/format currency
  const parseNumber = (v: any) => {
    if (v === null || v === undefined) return 0;
    if (typeof v === 'number') return v;
    const s = String(v).replace(/[^0-9.-]/g, '');
    return Number(s) || 0;
  };

  const formatCurrency = (v: any) => {
    if (v === null || v === undefined) return '₹0';
    if (typeof v === 'number') return `₹${v}`;
    const s = String(v).trim();
    if (s.length === 0) return '₹0';
    if (s.startsWith('₹')) return s;
    if (/^[0-9,.]+$/.test(s.replace(/,/g, ''))) return `₹${s}`;
    const n = parseNumber(s);
    return `₹${n}`;
  };

  // Compute numeric subtotal from items
  const computeSubtotalNumber = () => {
    return (displayItems || []).reduce((acc: number, it: any) => {
      const qty = Number(it.quantity ?? it.qty ?? 1) || 0;
      const priceNum = parseNumber(it.price || it.price_text || 0);
      return acc + qty * priceNum;
    }, 0);
  };

  const displaySubtotal = o?.subtotal ? formatCurrency(o.subtotal) : formatCurrency(computeSubtotalNumber());
  const shippingNumber = o?.shipping ? parseNumber(o.shipping) : o?.shippingCharge ? parseNumber(o.shippingCharge) : 0;
  const displayShipping = o?.shipping || o?.shippingCharge ? formatCurrency(o.shipping ?? o.shippingCharge) : '₹0';
  const subtotalNumber = o?.subtotal ? parseNumber(o.subtotal) : computeSubtotalNumber();
  const displayTotal = o?.total ? formatCurrency(o.total) : formatCurrency(subtotalNumber + shippingNumber || o?.totalAmount || 0);
  const displayAWB = o?.awbCode || o?.trackingNumber || 'N/A';
  const displayWeight = o?.weight || o?.packageWeight || '0.00 kgs';

  // Parse shippingAddress (may be plain string, JSON object or array) to extract more details
  const parseShippingDetails = () => {
    const result: any = {
      name: shipToName,
      address: shipToAddress,
      phone: displayPhone,
      landmark: '-',
      ndl: '-',
      shipDate: o?.shipDate || o?.ship_date || o?.shippingDate || null,
    };

    const raw = o?.shippingAddress;
    if (!raw) return result;

    let parsed: any = raw;
    try {
      if (typeof raw === 'string') {
        parsed = JSON.parse(raw);
      }
    } catch (e) {
      parsed = raw;
    }

    if (Array.isArray(parsed)) parsed = parsed[0] || parsed;

    if (parsed && typeof parsed === 'object') {
      result.name = o?.customer?.name || parsed.recipientName || parsed.name || result.name;
      result.address = parsed.deliveryAddress || parsed.address || parsed.delivery_address || result.address;
      result.phone = o?.customer?.phone || parsed.recipientPhone || parsed.phone || result.phone;
      result.landmark = parsed.landmark || parsed.Landmark || parsed.near || result.landmark;
      result.ndl = parsed.ndl || parsed.NDL || parsed.ndl_flag || result.ndl;
      result.shipDate = result.shipDate || parsed.shipDate || parsed.ship_date || parsed.date || null;
    } else if (typeof parsed === 'string') {
      // keep as address string
      result.address = parsed;
    }

    return result;
  };

  const shipping = parseShippingDetails();

  const barcodeRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    try {
      if (barcodeRef.current && (displayAWB || o?.id)) {
        JsBarcode(barcodeRef.current as any, String(displayAWB || o.id), {
          format: 'CODE128',
          displayValue: true,
          fontSize: 16,
            height: 80,
            width: 1.6,
            margin: 6
        });
      }
    } catch (e) {
      console.warn('Barcode render failed', e);
    }
  }, [displayAWB, o?.id]);

  return (
    <div style={{ padding: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 8 }}>
        <Button onClick={() => window.close()} variant="ghost">Close</Button>
        <Button onClick={handlePrint}>Print / Save</Button>
      </div>

      <div className="receipt" style={{
        width: 420,
        fontFamily: 'monospace',
        color: '#000',
        background: '#fff',
        padding: '8px 6px'
      }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1 }}>
              <div style={{ textAlign: 'center', marginBottom: 6 }}>
                <div style={{ fontWeight: 900, fontSize: 16 }}>{o.seller?.name || 'Poppik Lifestyle Private Limited'}</div>
                <div style={{ fontSize: 11, whiteSpace: 'pre-wrap', marginTop: 4 }}>{o.seller?.address || 'Office No.- 213, A- Wing, Skylark Building,\nPlot No.- 63, Sector No.- 11, C.B.D. Belapur,\nNavi Mumbai- 400614'}</div>
                <div style={{ fontSize: 11, marginTop: 6 }}>GST: 27AAQCP0247B1ZK</div>

                <div style={{ fontWeight: 800, fontSize: 14, marginTop: 8 }}>INVOICE</div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginTop: 6 }}>
                  <div>Inv: {o.id}</div>
                  <div>{o.date ? new Date(o.date).toLocaleDateString() : ''}</div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <div>Status: {o.status}</div>
                  <div>{o.paymentMethod}</div>
                </div>
              </div>

            <div style={{ textAlign: 'center', marginBottom: 8 }}>
              <svg ref={barcodeRef as any} />
            </div>

            <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />

            <ReceiptLine left={<strong>Order Id</strong>} right={<strong>{o.id}</strong>} />
            <ReceiptLine left={'Date'} right={new Date(o.date).toLocaleString()} />
            <ReceiptLine left={'AWB'} right={displayAWB} />

            <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />

            <div style={{ fontWeight: 700, marginBottom: 6, fontSize: 14 }}>Ship To</div>
            <div style={{ whiteSpace: 'pre-wrap', fontSize: 13, marginBottom: 8 }}>{shipping.name}</div>
            <div style={{ whiteSpace: 'pre-wrap', fontSize: 13, marginBottom: 8 }}>{shipping.address}</div>
            {shipping.landmark && <div style={{ fontSize: 12, marginBottom: 6 }}>Landmark: {shipping.landmark}</div>}
            {shipping.ndl && <div style={{ fontSize: 12, marginBottom: 6 }}>NDL: {shipping.ndl}</div>}
            <div style={{ fontSize: 13, marginBottom: 8 }}>Phone: {shipping.phone}</div>
            {shipping.shipDate && <div style={{ fontSize: 12, marginBottom: 6 }}>Ship Date: {new Date(shipping.shipDate).toLocaleString()}</div>}

            <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />

            <div style={{ fontWeight: 700, marginBottom: 6, fontSize: 14 }}>Items</div>
            <div style={{ fontSize: 11 }}>
              <div style={{ display: 'flex', fontWeight: 800, marginBottom: 6 }}>
                <div style={{ width: 26 }}>Sl</div>
                <div style={{ flex: 1 }}>Description</div>
                <div style={{ width: 56, textAlign: 'right' }}>Unit</div>
                <div style={{ width: 56, textAlign: 'right' }}>Disc Qty</div>
                <div style={{ width: 64, textAlign: 'right' }}>Net</div>
                <div style={{ width: 44, textAlign: 'right' }}>Tax%</div>
                <div style={{ width: 48, textAlign: 'right' }}>Type</div>
                <div style={{ width: 64, textAlign: 'right' }}>Tax</div>
                <div style={{ width: 72, textAlign: 'right' }}>Total</div>
              </div>

              {displayItems.map((it: any, idx: number) => {
                const qty = Number(it.quantity ?? it.qty ?? 1) || 0;
                const unitPriceNum = parseNumber(it.unitPrice ?? it.unit_price ?? it.price ?? it.price_text ?? 0);
                const unitPriceDisplay = formatCurrency(unitPriceNum);
                const discountQty = Number(it.discountQty ?? it.discount_qty ?? 0) || 0;
                const discountAmount = parseNumber(it.discountAmount ?? it.discount_amount ?? it.discount ?? 0);
                const netNumber = Math.round((unitPriceNum * qty - discountAmount) * 100) / 100;
                const netDisplay = formatCurrency(netNumber);
                const taxRate = parseNumber(it.taxRate ?? it.tax_rate ?? 0);
                const taxType = it.taxType || it.tax_type || 'GST';
                const taxAmountNum = ('taxAmount' in it || 'tax_amount' in it)
                  ? parseNumber(it.taxAmount ?? it.tax_amount)
                  : Math.round((netNumber * (taxRate / 100)) * 100) / 100;
                const taxAmountDisplay = formatCurrency(taxAmountNum);
                const totalNumber = Math.round((netNumber + taxAmountNum) * 100) / 100;
                const totalDisplay = formatCurrency(totalNumber);

                return (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
                    <div style={{ width: 26 }}>{idx + 1}</div>
                    <div style={{ flex: 1 }}>{it.name}</div>
                    <div style={{ width: 56, textAlign: 'right' }}>{unitPriceDisplay}</div>
                    <div style={{ width: 56, textAlign: 'right' }}>{discountQty}</div>
                    <div style={{ width: 64, textAlign: 'right' }}>{netDisplay}</div>
                    <div style={{ width: 44, textAlign: 'right' }}>{taxRate}%</div>
                    <div style={{ width: 48, textAlign: 'right' }}>{taxType}</div>
                    <div style={{ width: 64, textAlign: 'right' }}>{taxAmountDisplay}</div>
                    <div style={{ width: 72, textAlign: 'right' }}>{totalDisplay}</div>
                  </div>
                );
              })}
            </div>

            <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />

            <ReceiptLine left={'Subtotal'} right={displaySubtotal} />
            <ReceiptLine left={'Shipping'} right={displayShipping} />
            <ReceiptLine left={<strong>Total</strong>} right={<strong>{displayTotal}</strong>} />

            <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />

            <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />

            <div style={{ fontSize: 12, marginTop: 8 }}>
              <div style={{ fontWeight: 800 }}>Ship From: {o.seller?.name || 'POPPIK LIFESTYLE PRIVATE LIMITED'}</div>
              {o.seller?.address && (
                <div style={{ fontSize: 11, marginTop: 4, whiteSpace: 'pre-wrap' }}>
                  <strong>Return Address:</strong> {o.seller.address}
                </div>
              )}
            </div>

            <div style={{ textAlign: 'center', fontSize: 10, marginTop: 8 }}>
              Thank you for shopping with POPPIK
            </div>
          </div>

          <div style={{ width: 150, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ border: '2px solid #000', padding: 6, textAlign: 'center', fontWeight: 800 }}>SUR</div>
            <div style={{ border: '2px solid #000', padding: 6, textAlign: 'center' }}>{displayWeight}</div>
            <div style={{ border: '2px solid #000', padding: 6, minHeight: 28 }} />
            <div style={{ border: '2px solid #000', padding: 6, textAlign: 'center' }}>11/12</div>
            <div style={{ border: '2px solid #000', padding: 6, textAlign: 'center', fontWeight: 700 }}>PREPAID</div>
            <div style={{ border: '1px solid #000', padding: 4, textAlign: 'center', fontSize: 12 }}>BOX 1 of 1</div>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div style={{ border: '2px solid #000', padding: 6, width: 70, textAlign: 'center', fontWeight: 800 }}>BLRB</div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 6 }}>
              <QRCode value={String(displayAWB || o.id || '')} size={140} />
            </div>
          </div>
        </div>
      </div>

      <style>{`@media print { body { margin:0 } /* hide everything except receipt */ body * { visibility: hidden !important; } .receipt, .receipt * { visibility: visible !important; } .receipt { position: absolute !important; left: 50% !important; transform: translateX(-50%) !important; top: 6mm !important; width: 100mm !important; font-size: 15px !important; padding: 8px !important; } @page { size: 100mm auto; margin: 0 } }`}</style>
    </div>
  );
}
