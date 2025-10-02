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
    
    // If a pre-existing token is provided in environment, use it
    const preExistingToken = process.env.SHIPROCKET_TOKEN;
    if (preExistingToken) {
      this.token = preExistingToken;
      // Set a far future expiry since we don't know when the provided token expires
      this.tokenExpiry = Date.now() + (365 * 24 * 60 * 60 * 1000);
      console.log('Using pre-existing Shiprocket token from environment');
    }
  }

  private async authenticate(forceRefresh: boolean = false): Promise<void> {
    console.log('Authenticating with Shiprocket...');

    // Skip if we already have a valid token and not forcing refresh
    if (this.token && Date.now() < this.tokenExpiry && !forceRefresh) {
      return;
    }

    // If using pre-existing token from env, don't try to re-authenticate
    if (process.env.SHIPROCKET_TOKEN && !forceRefresh) {
      this.token = process.env.SHIPROCKET_TOKEN;
      this.tokenExpiry = Date.now() + (365 * 24 * 60 * 60 * 1000);
      console.log('Using pre-existing Shiprocket token, skipping authentication');
      return;
    }

    // Validate credentials
    if (!this.config.email || !this.config.password) {
      throw new Error('Shiprocket email and password are required');
    }

    try {
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

      const responseData = await response.text();
      let data;

      try {
        data = JSON.parse(responseData);
      } catch (parseError) {
        console.error('Failed to parse authentication response:', responseData);
        throw new Error('Invalid authentication response from Shiprocket');
      }

      if (!response.ok) {
        console.error('Authentication failed:', {
          status: response.status,
          statusText: response.statusText,
          response: data
        });
        
        if (response.status === 401) {
          throw new Error('Invalid Shiprocket credentials - check email and password');
        }
        
        throw new Error(`Authentication failed: ${response.statusText} - ${JSON.stringify(data)}`);
      }

      if (!data.token) {
        throw new Error('No token received from Shiprocket authentication');
      }

      this.token = data.token;
      // Set token expiry to 9 days (Shiprocket tokens are valid for 10 days)
      this.tokenExpiry = Date.now() + (9 * 24 * 60 * 60 * 1000);

      console.log('Shiprocket authentication successful');
    } catch (error) {
      console.error('Shiprocket authentication error:', error);
      this.token = null; // Clear invalid token
      this.tokenExpiry = 0;
      throw error;
    }
  }


  private async makeRequest(endpoint: string, method: string = 'GET', data?: any) {
    const url = `${this.config.baseUrl}${endpoint}`;

    try {
      // Validate token before making request
      if (!this.token) {
        throw new Error('Shiprocket token not available');
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: data ? JSON.stringify(data) : undefined
      });

      const responseData = await response.text();
      let jsonData;

      try {
        jsonData = JSON.parse(responseData);
      } catch (parseError) {
        console.error('Failed to parse Shiprocket response:', responseData);
        throw new Error(`Invalid response from Shiprocket: ${response.statusText}`);
      }

      if (!response.ok) {
        console.error('Shiprocket API error details:', {
          status: response.status,
          statusText: response.statusText,
          response: jsonData,
          endpoint,
          method
        });

        // Handle specific error cases
        if (response.status === 401) {
          throw new Error('Shiprocket authentication failed - token may be expired');
        } else if (response.status === 403) {
          throw new Error('Shiprocket access forbidden - check API permissions');
        } else if (response.status === 429) {
          throw new Error('Shiprocket rate limit exceeded - please try again later');
        }

        throw new Error(`Shiprocket API error: ${response.statusText} - ${JSON.stringify(jsonData)}`);
      }

      return jsonData;
    } catch (error) {
      console.error('Shiprocket API request failed:', error);
      throw error;
    }
  }

  async createOrder(orderData: ShiprocketOrder) {
    let attempts = 0;
    const maxAttempts = 2;

    while (attempts < maxAttempts) {
      try {
        await this.authenticate(attempts > 0); // Force refresh on retry
        return await this.makeRequest('/external/orders/create/adhoc', 'POST', orderData);
      } catch (error) {
        attempts++;

        // If it's an auth error and we haven't retried yet, try again with fresh token
        if (attempts < maxAttempts && (error.message.includes('401') || error.message.includes('authentication'))) {
          console.log('Retrying with fresh authentication...');
          this.token = null; // Clear token to force refresh
          continue;
        }

        throw error;
      }
    }
  }

  async trackOrder(orderId: string) {
    try {
      await this.authenticate();
      const response = await this.makeRequest(`/external/courier/track?order_id=${orderId}`);
      return response;
    } catch (error) {
      console.error('Error tracking Shiprocket order:', error);
      throw error;
    }
  }

  async trackByAWB(awbCode: string) {
    try {
      await this.authenticate();
      const response = await this.makeRequest(`/external/courier/track/awb/${awbCode}`);
      return response;
    } catch (error) {
      console.error('Error tracking by AWB:', error);
      throw error;
    }
  }

  async getServiceability(pickupPincode: string, deliveryPincode: string, weight: number, cod: boolean = false) {
    try {
      await this.authenticate();
      
      // Use GET method with query parameters for serviceability check
      const codValue = cod ? 1 : 0;
      const endpoint = `/external/courier/serviceability/?pickup_postcode=${pickupPincode}&delivery_postcode=${deliveryPincode}&weight=${weight}&cod=${codValue}`;
      
      console.log('Checking serviceability with GET request:', endpoint);
      
      const response = await this.makeRequest(endpoint, 'GET');
      return response;
    } catch (error) {
      console.error('Error checking serviceability:', error);
      throw error;
    }
  }

  async generateAWB(shipmentId: number, courierId: number) {
    try {
      await this.authenticate();
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
      await this.authenticate();
      const response = await this.makeRequest(`/external/orders/show/${orderId}`);
      return response;
    } catch (error) {
      console.error('Error getting order details:', error);
      throw error;
    }
  }

  async cancelOrder(orderId: string) {
    try {
      await this.authenticate();
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
    
    let streetAddress = "NA";
    let city = "NA";
    let state = "NA";
    let pincode = "000000";
    
    // First, try to extract 6-digit pincode
    const pincodeMatch = order.shippingAddress.match(/\b\d{6}\b/);
    if (pincodeMatch) {
      pincode = pincodeMatch[0];
    }
    
    // Parse address based on number of parts
    if (addressParts.length >= 3) {
      // Format: "street, city, state pincode"
      streetAddress = addressParts[0] || "NA";
      city = addressParts[1] || "NA";
      
      // Last part contains state and possibly pincode
      const lastPart = addressParts[2].trim();
      
      // Remove pincode from state if present
      if (lastPart.includes(pincode)) {
        state = lastPart.replace(pincode, '').trim() || "NA";
      } else {
        // Try to split by space to separate state and pincode
        const stateAndPin = lastPart.split(/\s+/);
        if (stateAndPin.length >= 2) {
          // Check if last element is pincode
          const lastElement = stateAndPin[stateAndPin.length - 1];
          if (/^\d{6}$/.test(lastElement)) {
            pincode = lastElement;
            state = stateAndPin.slice(0, -1).join(' ') || "NA";
          } else {
            state = lastPart;
          }
        } else {
          state = lastPart;
        }
      }
    } else if (addressParts.length === 2) {
      streetAddress = addressParts[0] || "NA";
      city = addressParts[1] || "NA";
      
      // Try to extract state from city part if it has pincode
      if (pincodeMatch && city.includes(pincode)) {
        state = city.replace(pincode, '').trim() || "NA";
      }
    } else if (addressParts.length === 1) {
      streetAddress = addressParts[0] || "NA";
    }
    
    // Clean and validate fields - Shiprocket doesn't accept empty or very short values
    streetAddress = streetAddress.trim() || "NA";
    city = city.trim() || "NA";
    state = state.trim() || "NA";
    
    // Ensure minimum length requirements
    if (streetAddress.length < 3) streetAddress = "Address Line 1";
    if (city.length < 3) city = "City";
    if (state.length < 3) state = "State";
    
    // Validate pincode is 6 digits
    if (!/^\d{6}$/.test(pincode)) {
      console.warn('Invalid pincode detected:', pincode);
      pincode = "110001"; // Default Delhi pincode
    }

    // Clean up phone number
    let phone = order.customer?.phone || "9999999999";
    phone = phone.replace(/\D/g, '');
    if (phone.length === 10) {
      phone = phone;
    } else if (phone.length === 12 && phone.startsWith('91')) {
      phone = phone.substring(2);
    } else {
      phone = "9999999999";
    }
    
    // Validate phone is 10 digits
    if (!/^\d{10}$/.test(phone)) {
      phone = "9999999999";
    }

    const shiprocketData = {
      order_id: order.id,
      order_date: new Date(order.createdAt).toISOString().split('T')[0],
      pickup_location: pickupLocation,
      channel_id: "",
      comment: "Poppik Beauty Store Order",
      billing_customer_name: (order.customer?.firstName || "Customer").trim(),
      billing_last_name: (order.customer?.lastName || "Name").trim(),
      billing_address: streetAddress,
      billing_address_2: "",
      billing_city: city,
      billing_pincode: pincode,
      billing_state: state,
      billing_country: "India",
      billing_email: (order.customer?.email || "customer@example.com").trim(),
      billing_phone: phone,
      shipping_is_billing: true,
      shipping_customer_name: (order.customer?.firstName || "Customer").trim(),
      shipping_last_name: (order.customer?.lastName || "Name").trim(),
      shipping_address: streetAddress,
      shipping_address_2: "",
      shipping_city: city,
      shipping_pincode: pincode,
      shipping_country: "India",
      shipping_state: state,
      order_items: items.map((item: any, index: number) => {
        const price = typeof item.price === 'string' 
          ? parseFloat(item.price.replace(/[₹,]/g, ''))
          : Number(item.price);
        
        return {
          name: (item.productName || item.name || 'Product').substring(0, 50),
          sku: `SKU${item.productId || (Date.now() + index)}`,
          units: Number(item.quantity) || 1,
          selling_price: price,
          discount: 0,
          tax: 0,
          hsn: 0,
        };
      }),
      payment_method: order.paymentMethod === 'Cash on Delivery' ? 'COD' : 'Prepaid',
      shipping_charges: 0,
      giftwrap_charges: 0,
      transaction_charges: 0,
      total_discount: 0,
      sub_total: Number(order.totalAmount),
      length: 15,
      breadth: 10,
      height: 5,
      weight: items.reduce((total: number, item: any) => total + (0.5 * (Number(item.quantity) || 1)), 0),
    };

    console.log('📦 Formatted Shiprocket order:', {
      order_id: shiprocketData.order_id,
      customer: `${shiprocketData.billing_customer_name} ${shiprocketData.billing_last_name}`,
      phone: shiprocketData.billing_phone,
      address: `${shiprocketData.billing_city}, ${shiprocketData.billing_state} - ${shiprocketData.billing_pincode}`,
      items: shiprocketData.order_items.length,
      weight: shiprocketData.weight
    });

    return shiprocketData;
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