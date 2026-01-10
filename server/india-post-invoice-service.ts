import type { Response } from "express";
import PDFDocument from "pdfkit";

type ThermalOrderItem = {
  productName?: string | null;
  quantity?: number | null;
  price?: any;
};

type ThermalOrderContext = {
  orderId: string;
  createdAt?: Date | string | null;
  paymentMethod?: string | null;
  totalAmount?: number | string | null;
  trackingNumber?: string | null;
  deliveryPartner?: string | null;
  shippingAddress?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  customerEmail?: string | null;
  items: ThermalOrderItem[];
};

export class IndiaPostInvoiceService {
  /**
   * Creates a thermal-friendly 4x6 PDF invoice.
   */
  async streamThermalInvoicePdf(res: Response, ctx: ThermalOrderContext, filename: string) {
    const doc = this.createThermalDoc();
    this.setPdfHeaders(res, filename);
    doc.pipe(res);

    const margin = 14;
    const pageWidth = 288; // 4 inch * 72

    const innerW = pageWidth - margin * 2;

    const badgeH = 38;
    doc.rect(margin, margin, innerW, badgeH).stroke();
    doc.fontSize(11).text("BNPL Account  SPEED POST", margin, margin + 7, { width: innerW, align: "center" });
    doc.fontSize(10).text("NMR/OA-NM/1203/25-28", margin, margin + 20, { width: innerW, align: "center" });

    const companyTop = margin + badgeH + 10;
    doc.fontSize(12).text("POPPiK LIFESTYLE PRIVATE LIMITED", margin, companyTop, { width: innerW, align: "center" });

    const shipTop = doc.y + 10;
    doc.fontSize(12).text("Ship To", margin, shipTop, { width: innerW, align: "left" });
    const fieldTop = shipTop + 20;
    const lineStartX = margin + 60;
    const lineW = innerW - 60;
    doc.fontSize(10).text("Name", margin, fieldTop, { width: 56, align: "left" });
    const lineY1 = fieldTop + 12;
    doc.moveTo(lineStartX, lineY1).lineTo(lineStartX + lineW, lineY1).stroke();

    const addrLabelY = fieldTop + 24;
    doc.fontSize(10).text("Address", margin, addrLabelY, { width: 56, align: "left" });
    const addrValueY1 = addrLabelY;
    const addrLineY1 = addrValueY1 + 12;
    const addrLineY2 = addrLineY1 + 12;
    const addrLineY3 = addrLineY2 + 12;
    doc.moveTo(lineStartX, addrLineY1).lineTo(lineStartX + lineW, addrLineY1).stroke();
    doc.moveTo(lineStartX, addrLineY2).lineTo(lineStartX + lineW, addrLineY2).stroke();
    doc.moveTo(lineStartX, addrLineY3).lineTo(lineStartX + lineW, addrLineY3).stroke();
    const lineY3 = addrLineY3 + 12;
    doc.moveTo(lineStartX, lineY3).lineTo(lineStartX + lineW, lineY3).stroke();

    const mobLabelY = lineY3 + 18;
    doc.fontSize(10).text("Mob No", margin, mobLabelY, { width: 56, align: "left" });
    const lineY4 = mobLabelY + 12;
    doc.moveTo(lineStartX, lineY4).lineTo(lineStartX + lineW, lineY4).stroke();

    doc.fontSize(9);
    const nameText = String(ctx.customerName || "").trim();
    const phoneText = String(ctx.customerPhone || "").trim();
    const addrText = String(ctx.shippingAddress || "").trim();
    if (nameText) doc.text(nameText, lineStartX + 2, lineY1 - 12, { width: lineW - 4, align: "left" });
    if (addrText) {
      const normalizedAddr = addrText.replace(/\s+/g, " ").trim();
      const words = normalizedAddr.split(" ").filter(Boolean);
      const addrLines: string[] = [];
      let current = "";
      const maxWidth = lineW - 4;
      for (const w of words) {
        const next = current ? `${current} ${w}` : w;
        if (doc.widthOfString(next) <= maxWidth) {
          current = next;
          continue;
        }
        if (current) addrLines.push(current);
        current = w;
        if (addrLines.length >= 3) break;
      }
      if (addrLines.length < 3 && current) addrLines.push(current);
      const rendered = addrLines.slice(0, 3);
      if (rendered[0]) doc.text(rendered[0], lineStartX + 2, addrValueY1, { width: maxWidth, align: "left" });
      if (rendered[1]) doc.text(rendered[1], lineStartX + 2, addrValueY1 + 12, { width: maxWidth, align: "left" });
      if (rendered[2]) doc.text(rendered[2], lineStartX + 2, addrValueY1 + 24, { width: maxWidth, align: "left" });
    }
    if (phoneText) doc.text(phoneText, lineStartX + 2, lineY4 - 12, { width: lineW - 4, align: "left" });

    const bottomBoxH = 88;
    const bottomY = 432 - margin - bottomBoxH;
    doc.rect(margin, bottomY, innerW, bottomBoxH).stroke();
    doc.fontSize(12).text("Poppik Lifestyle Private Limited", margin, bottomY + 8, { width: innerW, align: "center" });
    doc.fontSize(9);
    doc.text("Shop No. - 06 , Gauri Complex CHS , Sector No. - 11 ,CBD Belapur Navi Mumbai , Mn , India - 400614", margin, bottomY + 26, { width: innerW, align: "center", lineGap: 0 });
    doc.text("Contact Details - www.poppiklifestyle.com /info@poppik.in / 8976261444", margin, doc.y + 2, { width: innerW, align: "center", lineGap: 0 });
    doc.fontSize(7).text(`Order: ${ctx.orderId}`, margin, bottomY - 10, { width: innerW, align: "left" });

    doc.end();
  }

  private buildTrackOrderUrl(orderId: string) {
    const baseUrl = (process.env.APP_BASE_URL || process.env.APP_URL || process.env.SITE_URL || "https://poppik.in").replace(/\/$/, "");
    return `${baseUrl}/track-order?orderId=${encodeURIComponent(String(orderId || "").trim())}`;
  }

  private async tryRenderQr(doc: InstanceType<typeof PDFDocument>, url: string) {
    try {
      // qrcode is an optional runtime dependency; if missing, invoice still renders.
      const qrcodeMod: any = await import('qrcode');
      const qrcode = qrcodeMod?.default || qrcodeMod;
      if (!qrcode?.toBuffer) return;

      const png: Buffer = await qrcode.toBuffer(String(url), {
        errorCorrectionLevel: 'M',
        type: 'png',
        margin: 1,
        scale: 6,
      });

      // 4x6 is 288x432; place QR at top-right area.
      const qrSize = 78;
      const x = 288 - 14 - qrSize;
      const y = 14;
      doc.image(png, x, y, { width: qrSize, height: qrSize });
      doc.fontSize(7).text('Scan to track', x, y + qrSize + 2, { width: qrSize, align: 'center' });
    } catch {
      // Ignore QR rendering errors
    }
  }

  /**
   * Creates a thermal-friendly 4x6 PDF label.
   */
  async streamThermalLabelPdf(res: Response, ctx: ThermalOrderContext, filename: string) {
    const doc = this.createThermalDoc();
    this.setPdfHeaders(res, filename);
    doc.pipe(res);

    const margin = 14;
    const pageWidth = 288;

    doc.fontSize(12).text("SHIPPING LABEL", margin, margin);
    doc.moveDown(0.6);

    doc.fontSize(10).text(`Order: ${ctx.orderId}`, margin);
    doc.moveDown(0.4);

    doc.fontSize(12).text("TO:", margin);
    doc.fontSize(11);
    if (ctx.customerName) doc.text(String(ctx.customerName), margin);
    if (ctx.customerPhone) doc.text(String(ctx.customerPhone), margin);
    if (ctx.shippingAddress) {
      doc.text(String(ctx.shippingAddress), margin, doc.y, { width: pageWidth - margin * 2 });
    }

    doc.moveDown(1.2);
    doc.fontSize(10).text("FROM:", margin);
    doc.fontSize(10).text("Poppik", margin);
    doc.fontSize(9).text("India", margin);

    doc.end();
  }

  private createThermalDoc() {
    // 4x6 inches => 288 x 432 points
    return new PDFDocument({
      size: [288, 432],
      margins: { top: 14, bottom: 14, left: 14, right: 14 },
      compress: true,
    });
  }

  private setPdfHeaders(res: Response, filename: string) {
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Content-Disposition", `inline; filename=\"${filename}\"`);
  }

  private formatDate(d: any) {
    try {
      const dt = d instanceof Date ? d : new Date(d);
      if (Number.isNaN(dt.getTime())) return String(d);
      return dt.toISOString().replace('T', ' ').slice(0, 16);
    } catch {
      return String(d);
    }
  }

  private formatMoney(v: any) {
    if (v === null || v === undefined) return "0";
    const s = String(v).trim();
    const n = Number(s.replace(/[₹,\s]/g, ""));
    if (Number.isFinite(n)) return n.toFixed(2);
    return s || "0";
  }
}
