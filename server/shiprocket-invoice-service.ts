import type { Response } from "express";
import ShiprocketService from "./shiprocket-service";

export class ShiprocketInvoiceService {
  private readonly shiprocketService: ShiprocketService;

  constructor(shiprocketService: ShiprocketService) {
    this.shiprocketService = shiprocketService;
  }

  async streamThermalInvoicePdf(
    res: Response,
    shiprocketOrderId: any,
    normalizedOrder: any,
    awb: string | null,
    filename: string
  ) {
    void shiprocketOrderId;
    void normalizedOrder;
    void awb;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename=\"${filename}\"`);

    const resp = await this.shiprocketService.generateInvoicePdfResponse(shiprocketOrderId);
    const buf = Buffer.from(await resp.arrayBuffer());
    res.end(buf);
  }

  async streamThermalLabelPdf(res: Response, shipmentId: any, filename: string) {
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename=\"${filename}\"`);

    const resp = await this.shiprocketService.generateLabelPdfResponse(shipmentId);
    const buf = Buffer.from(await resp.arrayBuffer());
    res.end(buf);
  }
}
