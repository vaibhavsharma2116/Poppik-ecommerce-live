import fetch from 'node-fetch';

interface ShiprocketConfig {
  email: string;
  password: string;
  baseUrl: string;
}

interface ShiprocketOrder {
  order_id: string;
  order_date: string;
  pickup_location: string;
  channel_id: string;
  comment: string;
  billing_customer_name: string;
  billing_last_name: string;
  billing_address: string;
  billing_address_2?: string;
  billing_city: string;
  billing_pincode: string;
  billing_state: string;
  billing_country: string;
  billing_email: string;
  billing_phone: string;
  shipping_is_billing: boolean;
  shipping_customer_name?: string;
  shipping_last_name?: string;
  shipping_address?: string;
  shipping_address_2?: string;
  shipping_city?: string;
  shipping_pincode?: string;
  shipping_country?: string;
  shipping_state?: string;
  order_items: Array<{
    name: string;
    sku: string;
    units: number;
    selling_price: number;
    discount?: number;
    tax?: number;
    hsn?: number;
  }>;
  payment_method: string;
  shipping_charges: number;
  giftwrap_charges: number;
  transaction_charges: number;
  total_discount: number;
  sub_total: number;
  length: number;
  breadth: number;
  height: number;
  weight: number;
}

class ShiprocketService {
  private config: ShiprocketConfig;
  private token: string | null = null;
  private tokenExpiry: number = 0;

  constructor() {
    this.config = {
      email: process.env.SHIPROCKET_EMAIL || '',
      password: process.env.SHIPROCKET_PASSWORD || '',
      baseUrl: process.env.SHIPROCKET_BASE_URL || 'https://apiv2.shiprocket.in/v1',
    };

    const preExistingToken = process.env.SHIPROCKET_TOKEN;
    if (preExistingToken) {
      this.token = preExistingToken;
      this.tokenExpiry = Date.now() + 365 * 24 * 60 * 60 * 1000; // far future expiry
      console.log('Using pre-existing Shiprocket token from environment');
    }
  }

  private async authenticate(forceRefresh: boolean = false): Promise<void> {
    console.log('Authenticating with Shiprocket...');

    if (this.token && Date.now() < this.tokenExpiry && !forceRefresh) return;

    if (process.env.SHIPROCKET_TOKEN && !forceRefresh) {
      this.token = process.env.SHIPROCKET_TOKEN;
      this.tokenExpiry = Date.now() + 365 * 24 * 60 * 60 * 1000;
      console.log('Using pre-existing Shiprocket token, skipping authentication');
      return;
    }

    if (!this.config.email || !this.config.password) {
      throw new Error('Shiprocket email and password are required');
    }

    const response = await fetch(`${this.config.baseUrl}/external/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: this.config.email, password: this.config.password }),
    });

    const data = await response.json().catch(() => {
      throw new Error('Invalid authentication response from Shiprocket');
    });

    if (!response.ok || !data.token) {
      throw new Error(`Authentication failed: ${JSON.stringify(data)}`);
    }

    this.token = data.token;
    this.tokenExpiry = Date.now() + 9 * 24 * 60 * 60 * 1000; // 9 days
    console.log('Shiprocket authentication successful');
  }

  private async makeRequest(endpoint: string, method: string = 'GET', data?: any) {
    if (!this.token) throw new Error('Shiprocket token not available');

    const response = await fetch(`${this.config.baseUrl}${endpoint}`, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.token}` },
      body: data ? JSON.stringify(data) : undefined,
    });

    const jsonData = await response.json().catch(() => {
      throw new Error(`Invalid response from Shiprocket: ${response.statusText}`);
    });

    if (!response.ok) {
      throw new Error(`Shiprocket API error: ${response.statusText} - ${JSON.stringify(jsonData)}`);
    }

    return jsonData;
  }

  async createOrder(orderData: ShiprocketOrder) {
    let attempts = 0;
    const maxAttempts = 2;

    while (attempts < maxAttempts) {
      try {
        await this.authenticate(attempts > 0);
        return await this.makeRequest('/external/orders/create/adhoc', 'POST', orderData);
      } catch (error: any) {
        attempts++;
        if (attempts < maxAttempts && error.message.includes('authentication')) {
          console.log('Retrying with fresh authentication...');
          this.token = null;
          continue;
        }
        throw error;
      }
    }
  }

  // Convert your internal order to Shiprocket format
  convertToShiprocketFormat(order: any, pickupLocation: string = 'Primary'): ShiprocketOrder {
    const items = order.items || [];
    const { firstName, lastName, email, phone } = order.customer || {};
    const { shippingAddress, totalAmount, paymentMethod, createdAt } = order;

    // Parse address
    let street = '', city = '', state = '', pincode = '';
    if (shippingAddress?.trim()) {
      const parts = shippingAddress.split(',').map(p => p.trim());
      street = parts[0] || '';
      city = parts[1] || '';
      const lastPart = parts[parts.length - 1] || '';
      const match = lastPart.match(/\b\d{6}\b/);
      if (match) {
        pincode = match[0];
        state = lastPart.replace(pincode, '').trim();
      } else state = lastPart;
    }

    // Validate minimal lengths
    if (street.length < 3) street = shippingAddress || 'Address Not Provided';
    if (city.length < 3) city = 'Mumbai';
    if (state.length < 3) state = 'Maharashtra';
    if (!/^\d{6}$/.test(pincode)) pincode = '400001';

    // Format phone
    let formattedPhone = (phone || '').replace(/\D/g, '');
    if (formattedPhone.length === 12 && formattedPhone.startsWith('91')) formattedPhone = formattedPhone.slice(2);
    if (formattedPhone.length === 11 && formattedPhone.startsWith('0')) formattedPhone = formattedPhone.slice(1);
    if (!/^\d{10}$/.test(formattedPhone)) formattedPhone = '9999999999';

    const billingEmail = (email || 'customer@example.com').trim();
    const billingFirstName = (firstName || 'Customer').trim();
    const billingLastName = (lastName || 'Name').trim();

    const orderDate = new Date(createdAt || new Date());
    const formattedDate = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}-${String(orderDate.getDate()).padStart(2, '0')} ${String(orderDate.getHours()).padStart(2, '0')}:${String(orderDate.getMinutes()).padStart(2, '0')}`;

    return {
      order_id: order.id,
      order_date: formattedDate,
      pickup_location: pickupLocation,
      channel_id: '',
      comment: 'Poppik Beauty Store Order',
      billing_customer_name: billingFirstName,
      billing_last_name: billingLastName,
      billing_address: street,
      billing_address_2: '',
      billing_city: city,
      billing_pincode: pincode,
      billing_state: state,
      billing_country: 'India',
      billing_email: billingEmail,
      billing_phone: formattedPhone,
      shipping_is_billing: true,
      order_items: items.map((item: any, index: number) => ({
        name: (item.productName || item.name || 'Product').substring(0, 50),
        sku: `SKU${item.productId || (Date.now() + index)}`,
        units: Number(item.quantity) || 1,
        selling_price: Number(item.price),
        discount: 0,
        tax: 0,
        hsn: 610910,
      })),
      payment_method: paymentMethod === 'Cash on Delivery' ? 'COD' : 'Prepaid',
      shipping_charges: 0,
      giftwrap_charges: 0,
      transaction_charges: 0,
      total_discount: 0,
      sub_total: items.reduce((sum: number, item: any) => sum + (Number(item.price) * (Number(item.quantity) || 1)), 0),
      length: 15,
      breadth: 10,
      height: 5,
      weight: items.reduce((total: number, item: any) => total + (0.5 * (Number(item.quantity) || 1)), 0),
    };
  }
}

export default ShiprocketService;
