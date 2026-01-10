import type { Response } from "express";
import ShiprocketService from "./shiprocket-service";
import { PDFDocument, rgb } from "pdf-lib";

export class ShiprocketInvoiceService {
  private shiprocket: ShiprocketService;

  constructor(shiprocket: ShiprocketService) {
    this.shiprocket = shiprocket;
  }

  /**
   * Streams Shiprocket generated invoice PDF to the client.
   * - Never exposes Shiprocket token or Shiprocket PDF URL to the caller.
   */
  async streamThermalInvoicePdf(
    res: Response,
    shiprocketOrderId: string | number,
    publicOrderId: string,
    awb: string | null,
    filename: string
  ) {
    void publicOrderId;
    const pdfResp = await this.shiprocket.generateInvoicePdfResponse(shiprocketOrderId);

    if (!pdfResp.ok) {
      const bodyText = await pdfResp.text().catch(() => "");
      const err: any = new Error(`Failed to fetch PDF: HTTP ${pdfResp.status}`);
      err.httpStatus = pdfResp.status;
      err.body = bodyText ? bodyText.slice(0, 500) : undefined;
      throw err;
    }

    const originalBytes = Buffer.from(await pdfResp.arrayBuffer());
    const mergedBytes = await this.overlayAwbAndMaskSignatureOnFirstPage(originalBytes, awb);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Content-Disposition", `inline; filename=\"${filename}\"`);
    res.send(Buffer.from(mergedBytes));
  }

  /**
   * Streams Shiprocket generated label PDF to the client.
   * - Never exposes Shiprocket token or Shiprocket PDF URL to the caller.
   */
  async streamThermalLabelPdf(res: Response, shipmentId: number, filename: string) {
    const pdfResp = await this.shiprocket.generateLabelPdfResponse(shipmentId);
    await this.streamPdfResponseToExpress(res, pdfResp, filename);
  }

  private async overlayAwbAndMaskSignatureOnFirstPage(originalPdfBytes: Buffer, awb: string | null) {
    const doc = await PDFDocument.load(originalPdfBytes);
    const pages = doc.getPages();
    const firstPage = pages[0];
    if (!firstPage) {
      return originalPdfBytes;
    }
    const { width, height } = firstPage.getSize();
    const maskX = 0;
    const maskY = 0;
    const maskW = width;
    const maskH = height * 0.58;
    firstPage.drawRectangle({ x: maskX, y: maskY, width: maskW, height: maskH, color: rgb(1, 1, 1) });

    const margin = 18;

    const awbText = String(awb || "").trim();
    if (awbText) {
      const bwip: any = await import("bwip-js");
      const bwipjs = bwip?.default || bwip;
      if (bwipjs?.toBuffer) {
        const barcodePng: Buffer = await bwipjs.toBuffer({
          bcid: "code128",
          text: awbText,
          scale: 3,
          height: 12,
          includetext: true,
          textxalign: "center",
          textsize: 10,
          paddingwidth: 0,
          paddingheight: 0,
          backgroundcolor: "FFFFFF",
        });

        const barcodeImage = await doc.embedPng(barcodePng);
        const barcodeWidth = Math.min(width * 0.5, 220);
        const barcodeHeight = barcodeWidth * 0.28;
        const bx = width - margin - barcodeWidth;
        const by = height - margin - barcodeHeight;
        firstPage.drawImage(barcodeImage, { x: bx, y: by, width: barcodeWidth, height: barcodeHeight });
      }
    }

    return await doc.save();
  }

  private async streamPdfResponseToExpress(res: Response, pdfResp: globalThis.Response, filename: string) {
    if (!pdfResp.ok) {
      const bodyText = await pdfResp.text().catch(() => "");
      const err: any = new Error(`Failed to fetch PDF: HTTP ${pdfResp.status}`);
      err.httpStatus = pdfResp.status;
      err.body = bodyText ? bodyText.slice(0, 500) : undefined;
      throw err;
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Content-Disposition", `inline; filename=\"${filename}\"`);

    const body = pdfResp.body;
    if (!body) {
      throw new Error("Shiprocket PDF response had no body");
    }

    // Node 18+ fetch gives a web ReadableStream; convert to Node stream if needed
    const nodeReadable: any = (body as any);
    if (typeof nodeReadable.pipe === "function") {
      nodeReadable.pipe(res);
      return;
    }

    const { Readable } = await import("stream");
    Readable.fromWeb(body as any).pipe(res);
  }
}
