import IthinkService from "./ithink-service";

class IthinkServiceAdapter {
  private readonly ithink: IthinkService;

  constructor() {
    this.ithink = new IthinkService();
  }

  convertToIthinkFormat(order: any, pickupLocation: string = "Primary") {
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

  async getServiceability(
    pickupPincode: string,
    deliveryPincode: string,
    weight: number,
    cod: boolean = false,
    productMrp?: number
  ) {
    return await this.ithink.getServiceability(pickupPincode, deliveryPincode, weight, cod, productMrp);
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

  async cancelOrdersByAwb(awbNumbers: string | string[]) {
    return await this.ithink.cancelOrdersByAwb(awbNumbers);
  }

  async updatePaymentByAwb(awbNumbers: string | string[]) {
    return await this.ithink.updatePaymentByAwb(awbNumbers);
  }

  async getAirwaybillList(params: { start_date_time: string; end_date_time: string }) {
    return await this.ithink.getAirwaybillList(params);
  }

  async generateManifestPdfResponse(awbNumbers: string | string[]) {
    return await this.ithink.generateManifestPdfResponse(awbNumbers);
  }

  async getStates(countryId: string | number = 101) {
    return await this.ithink.getStates(countryId);
  }

  async getCities(stateId: string | number) {
    return await this.ithink.getCities(stateId);
  }

  async addWarehouse(payload: any) {
    return await this.ithink.addWarehouse(payload);
  }

  async getWarehouse(warehouseId?: string | number) {
    return await this.ithink.getWarehouse(warehouseId);
  }

  async getZoneWiseRate(params: any) {
    return await this.ithink.getZoneWiseRate(params);
  }

  async getRemittance(remittanceDate: string) {
    return await this.ithink.getRemittance(remittanceDate);
  }

  async getRemittanceDetails(remittanceDate: string) {
    return await this.ithink.getRemittanceDetails(remittanceDate);
  }

  async getStore(storeId?: string | number) {
    return await this.ithink.getStore(storeId);
  }

  async getStoreOrderList(params: any) {
    return await this.ithink.getStoreOrderList(params);
  }

  async getStoreOrderDetails(params: any) {
    return await this.ithink.getStoreOrderDetails(params);
  }

  async addNdrReattemptOrRto(payload: any) {
    return await this.ithink.addNdrReattemptOrRto(payload);
  }
}

export default IthinkServiceAdapter;
