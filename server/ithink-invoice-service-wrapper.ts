import type { Response } from "express";
import IthinkServiceAdapter from "./ithink-service-adapter";

export class IthinkInvoiceService {
  private readonly ithinkService: IthinkServiceAdapter;

  constructor(ithinkService: IthinkServiceAdapter) {
    this.ithinkService = ithinkService;
  }

  async streamThermalInvoicePdf(
    res: Response,
    ithinkOrderId: any,
    normalizedOrder: any,
    awb: string | null,
    filename: string
  ) {
    void normalizedOrder;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename=\"${filename}\"`);

    const resp = await this.ithinkService.generateInvoicePdfResponse(ithinkOrderId, awb);
    const buf = Buffer.from(await resp.arrayBuffer());
    res.end(buf);
  }

  async streamThermalLabelPdf(res: Response, shipmentId: any, filename: string, awb?: string | null) {
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename=\"${filename}\"`);

    const resp = await this.ithinkService.generateLabelPdfResponse(shipmentId, awb);
    const buf = Buffer.from(await resp.arrayBuffer());
    res.end(buf);
  }
}
