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
    const margin = 14;
    const pageWidth = 288; // 4 inch * 72

    const badgeH = 30;

    const nameText = String(ctx.customerName || "").trim();
    const phoneText = String(ctx.customerPhone || "").trim();
    const addrText = String(ctx.shippingAddress || "").trim();
    const normalizedAddr = addrText.replace(/\s+/g, " ").trim();
    const shipToValue = [nameText, normalizedAddr, phoneText].filter(Boolean).join("\n") || "-";

    const shipTop = margin + badgeH + 28;
    const shipLineH = 13;
    const shipLines = shipToValue.split(/\n/).filter(Boolean).length || 1;
    const shipBlockH = shipLines * shipLineH;

    const footerGap = 36;
    const footerY = shipTop + shipBlockH + footerGap;

    // Approx footer height (company + 2 address lines + contact label + contact line + gaps)
    const footerBlockH = 78;
    const minHeight = 220;
    const maxHeight = 432;
    const pageHeight = Math.max(minHeight, Math.min(maxHeight, footerY + footerBlockH + margin));

    const doc = this.createThermalDocWithHeight(pageHeight);
    this.setPdfHeaders(res, filename);
    doc.pipe(res);

    const innerW = pageWidth - margin * 2;

    const badgeLine1 = "BNPL Account SPPED POST";
    const badgeLine2 = "NM/ROA-NM/1203/25-28";
    doc.font("Helvetica-Bold").fontSize(11);
    const w1 = doc.widthOfString(badgeLine1);
    doc.font("Helvetica").fontSize(10);
    const w2 = doc.widthOfString(badgeLine2);
    const badgePaddingX = 12;
    const badgeW = Math.min(innerW, Math.ceil(Math.max(w1, w2) + badgePaddingX * 2));
    const badgeX = margin + (innerW - badgeW) / 2;

    doc.rect(badgeX, margin, badgeW, badgeH).stroke();
    doc.font("Helvetica-Bold").fontSize(11).text(badgeLine1, badgeX, margin + 5, { width: badgeW, align: "center" });
    doc.font("Helvetica").fontSize(10).text(badgeLine2, badgeX, margin + 17, { width: badgeW, align: "center" });

    // Ship To (match reference: lots of whitespace, lighter label, dynamic value)
    const shipLabelW = 58;
    const shipValueX = margin + shipLabelW;
    const shipValueW = innerW - shipLabelW;

    doc.font("Helvetica").fontSize(12).fillColor("#666").text("Ship To:", margin, shipTop, { width: shipLabelW, align: "left" });
    doc.font("Helvetica").fontSize(11).fillColor("#000").text(shipToValue, shipValueX, shipTop, { width: shipValueW, align: "left" });

    // Footer (match reference: no box, light address, bold label)
    doc.font("Helvetica-Bold").fontSize(12).fillColor("#000").text("Poppik Lifestyle Private Limited", margin, footerY, { width: innerW, align: "center" });
    doc.font("Helvetica").fontSize(9).fillColor("#666").text(
      "Shop No. 06, Gauri Complex CHS, Sector No. 11, CBD Belapur,\nNavi Mumbai, MH, India - 400614",
      margin,
      doc.y + 6,
      { width: innerW, align: "center", lineGap: 0 }
    );
    doc.font("Helvetica-Bold").fontSize(9).fillColor("#000").text("Contact Details:", margin, doc.y + 8, { width: innerW, align: "center", lineGap: 0 });
    doc.font("Helvetica").fontSize(9).fillColor("#666").text("www.poppiklifestyle.com / info@poppik.in / 8976261444", margin, doc.y + 2, { width: innerW, align: "center", lineGap: 0 });

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

  private createThermalDocWithHeight(pageHeight: number) {
    return new PDFDocument({
      size: [288, pageHeight],
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
