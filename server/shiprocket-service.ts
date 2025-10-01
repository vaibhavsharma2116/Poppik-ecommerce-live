
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

interface ShiprocketTrackingResponse {
  tracking_data: {
    track_status: number;
    shipment_status: string;
    shipment_track: Array<{
      id: number;
      awb_code: string;
      courier_company_id: number;
      shipment_id: number;
      order_id: string;
      pickup_date: string;
      delivered_date: string;
      weight: string;
      packages: number;
      current_status: string;
      delivered_to: string;
      destination: string;
      consignee_name: string;
      origin: string;
      courier_agent_details: string;
      edd: string;
      shipment_track_activities: Array<{
        date: string;
        status: string;
        activity: string;
        location: string;
      }>;
    }>;
  };
}

class ShiprocketService {
  private config: ShiprocketConfig;
  private token: string | null = null;
  private tokenExpiry: number = 0;

  constructor() {
    this.config = {
      email: process.env.SHIPROCKET_EMAIL || '',
      password: process.env.SHIPROCKET_PASSWORD || '',
      baseUrl: process.env.SHIPROCKET_BASE_URL || 'https://apiv2.shiprocket.in/v1'
    };
  }

  private async authenticate(): Promise<string> {
    if (this.token && Date.now() < this.tokenExpiry) {
      return this.token;
    }

    // Clear existing token
    this.token = null;
    this.tokenExpiry = 0;

    try {
      console.log('Authenticating with Shiprocket...');
      console.log('Email:', this.config.email);
      console.log('Base URL:', this.config.baseUrl);

      const response = await fetch(`${this.config.baseUrl}/external/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: this.config.email,
          password: this.config.password,
        }),
      });

      const responseText = await response.text();
      console.log('Shiprocket auth response status:', response.status);
      console.log('Shiprocket auth response:', responseText);

      if (!response.ok) {
        throw new Error(`Shiprocket authentication failed: ${response.status} ${response.statusText} - ${responseText}`);
      }

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        throw new Error(`Invalid JSON response from Shiprocket: ${responseText}`);
      }

      if (!data.token) {
        throw new Error(`No token received from Shiprocket: ${JSON.stringify(data)}`);
      }

      this.token = data.token;
      // Set token expiry to 9 days (Shiprocket tokens are valid for 10 days)
      this.tokenExpiry = Date.now() + (9 * 24 * 60 * 60 * 1000);
      
      console.log('Shiprocket authentication successful');
      return this.token;
    } catch (error) {
      console.error('Shiprocket authentication error:', error);
      throw error;
    }
  }

  private async makeRequest(endpoint: string, method: string = 'GET', body?: any) {
    const token = await this.authenticate();
    
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    console.log('Making Shiprocket request:', {
      url: `${this.config.baseUrl}${endpoint}`,
      method,
      hasBody: !!body,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token.substring(0, 20)}...`
      }
    });

    const response = await fetch(`${this.config.baseUrl}${endpoint}`, options);
    const responseText = await response.text();
    
    console.log('Shiprocket response status:', response.status);
    console.log('Shiprocket response:', responseText);
    
    if (!response.ok) {
      // If forbidden, try to re-authenticate once
      if (response.status === 403 && this.token) {
        console.log('Got 403, clearing token and retrying...');
        this.token = null;
        this.tokenExpiry = 0;
        
        // Retry once with fresh authentication
        const newToken = await this.authenticate();
        const retryOptions: RequestInit = {
          method,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${newToken}`,
          },
        };

        if (body) {
          retryOptions.body = JSON.stringify(body);
        }

        const retryResponse = await fetch(`${this.config.baseUrl}${endpoint}`, retryOptions);
        const retryResponseText = await retryResponse.text();
        
        console.log('Retry response status:', retryResponse.status);
        console.log('Retry response:', retryResponseText);
        
        if (!retryResponse.ok) {
          throw new Error(`Shiprocket API error: ${retryResponse.status} ${retryResponse.statusText} - ${retryResponseText}`);
        }

        try {
          return JSON.parse(retryResponseText);
        } catch (parseError) {
          throw new Error(`Invalid JSON response: ${retryResponseText}`);
        }
      }
      
      throw new Error(`Shiprocket API error: ${response.status} ${response.statusText} - ${responseText}`);
    }

    try {
      return JSON.parse(responseText);
    } catch (parseError) {
      throw new Error(`Invalid JSON response: ${responseText}`);
    }
  }

  async createOrder(orderData: ShiprocketOrder) {
    try {
      const response = await this.makeRequest('/external/orders/create/adhoc', 'POST', orderData);
      return response;
    } catch (error) {
      console.error('Error creating Shiprocket order:', error);
      throw error;
    }
  }

  async trackOrder(orderId: string) {
    try {
      const response = await this.makeRequest(`/external/courier/track?order_id=${orderId}`);
      return response;
    } catch (error) {
      console.error('Error tracking Shiprocket order:', error);
      throw error;
    }
  }

  async trackByAWB(awbCode: string) {
    try {
      const response = await this.makeRequest(`/external/courier/track/awb/${awbCode}`);
      return response;
    } catch (error) {
      console.error('Error tracking by AWB:', error);
      throw error;
    }
  }

  async getServiceability(pickupPincode: string, deliveryPincode: string, weight: number, cod: boolean = false) {
    try {
      const response = await this.makeRequest(
        `/external/courier/serviceability/?pickup_postcode=${pickupPincode}&delivery_postcode=${deliveryPincode}&weight=${weight}&cod=${cod ? 1 : 0}`
      );
      return response;
    } catch (error) {
      console.error('Error checking serviceability:', error);
      throw error;
    }
  }

  async generateAWB(shipmentId: number, courierId: number) {
    try {
      const response = await this.makeRequest('/external/courier/assign/awb', 'POST', {
        shipment_id: shipmentId,
        courier_id: courierId,
      });
      return response;
    } catch (error) {
      console.error('Error generating AWB:', error);
      throw error;
    }
  }

  async getOrderDetails(orderId: string) {
    try {
      const response = await this.makeRequest(`/external/orders/show/${orderId}`);
      return response;
    } catch (error) {
      console.error('Error getting order details:', error);
      throw error;
    }
  }

  async cancelOrder(orderId: string) {
    try {
      const response = await this.makeRequest('/external/orders/cancel', 'POST', {
        ids: [orderId]
      });
      return response;
    } catch (error) {
      console.error('Error cancelling order:', error);
      throw error;
    }
  }

  // Convert your order format to Shiprocket format
  convertToShiprocketFormat(order: any, pickupLocation: string = "Primary"): ShiprocketOrder {
    const items = order.items || [];
    
    // Extract city, state, and pincode from shipping address
    const addressParts = order.shippingAddress.split(',').map((part: string) => part.trim());
    let city = "Mumbai";
    let state = "Maharashtra"; 
    let pincode = "400001";
    
    // Try to extract pincode (6 digits)
    const pincodeMatch = order.shippingAddress.match(/\b\d{6}\b/);
    if (pincodeMatch) {
      pincode = pincodeMatch[0];
    }
    
    // Try to extract city and state from address parts
    if (addressParts.length >= 2) {
      city = addressParts[addressParts.length - 3] || "Mumbai";
      state = addressParts[addressParts.length - 2] || "Maharashtra";
    }
    
    return {
      order_id: order.id,
      order_date: new Date(order.createdAt).toISOString().split('T')[0],
      pickup_location: pickupLocation,
      channel_id: "5433",
      comment: "Beauty Store Order",
      billing_customer_name: order.customer?.firstName || order.customer?.name?.split(' ')[0] || "Customer",
      billing_last_name: order.customer?.lastName || order.customer?.name?.split(' ').slice(1).join(' ') || "",
      billing_address: order.shippingAddress,
      billing_city: city,
      billing_pincode: pincode,
      billing_state: state,
      billing_country: "India",
      billing_email: order.customer?.email || "customer@example.com",
      billing_phone: order.customer?.phone || "9999999999",
      shipping_is_billing: true,
      order_items: items.map((item: any, index: number) => ({
        name: item.productName || item.name,
        sku: `SKU${item.productId || index + 1}`,
        units: item.quantity,
        selling_price: parseFloat(item.price.replace(/[₹,]/g, '')),
        discount: 0,
        tax: 0,
        hsn: 0,
      })),
      payment_method: order.paymentMethod === 'Cash on Delivery' ? 'COD' : 'Prepaid',
      shipping_charges: 0,
      giftwrap_charges: 0,
      transaction_charges: 0,
      total_discount: 0,
      sub_total: order.totalAmount,
      length: 15,
      breadth: 10,
      height: 5,
      weight: 0.5,
    };
  }

  // Convert Shiprocket tracking to your timeline format
  convertTrackingToTimeline(trackingData: any) {
    if (!trackingData.tracking_data?.shipment_track?.[0]?.shipment_track_activities) {
      return [];
    }

    const activities = trackingData.tracking_data.shipment_track[0].shipment_track_activities;
    
    return activities.map((activity: any) => ({
      step: activity.status,
      status: this.getTimelineStatus(activity.status),
      date: new Date(activity.date).toISOString().split('T')[0],
      time: new Date(activity.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      description: `${activity.activity} - ${activity.location}`,
    }));
  }

  private getTimelineStatus(status: string): 'completed' | 'active' | 'pending' {
    const completedStatuses = ['Delivered', 'delivered', 'Out for Delivery', 'Shipped'];
    const activeStatuses = ['In Transit', 'Picked Up', 'Out for pickup'];
    
    if (completedStatuses.some(s => status.toLowerCase().includes(s.toLowerCase()))) {
      return 'completed';
    }
    if (activeStatuses.some(s => status.toLowerCase().includes(s.toLowerCase()))) {
      return 'active';
    }
    return 'pending';
  }
}

export default ShiprocketService;
