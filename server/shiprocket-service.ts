import IthinkService from "./ithink-service";

class ShiprocketService {
  private readonly ithink: IthinkService;

  constructor() {
    this.ithink = new IthinkService();
  }

  convertToShiprocketFormat(order: any, pickupLocation: string = "Primary") {
    return this.ithink.convertToIthinkFormat(order, pickupLocation) as any;
  }

  async createOrder(orderData: any) {
    return await this.ithink.createOrder(orderData as any);
  }

  async trackOrder(orderId: string) {
    return await this.ithink.trackOrder(orderId);
  }

  async trackByAWB(awbCode: string) {
    return await this.ithink.trackByAWB(awbCode);
  }

  async getServiceability(pickupPincode: string, deliveryPincode: string, weight: number, cod: boolean = false) {
    return await this.ithink.getServiceability(pickupPincode, deliveryPincode, weight, cod);
  }

  async generateAWB(shipmentId: number, courierId: number) {
    return await this.ithink.generateAWB(shipmentId, courierId);
  }

  async getOrderDetails(orderId: string) {
    return await this.ithink.getOrderDetails(orderId);
  }

  async generateInvoicePdfResponse(orderId: string | number) {
    return await this.ithink.generateInvoicePdfResponse(orderId);
  }

  async generateLabelPdfResponse(shipmentId: number) {
    return await this.ithink.generateLabelPdfResponse(shipmentId);
  }

  async cancelOrder(orderId: string) {
    return await this.ithink.cancelOrder(orderId);
  }
}

export default ShiprocketService;
