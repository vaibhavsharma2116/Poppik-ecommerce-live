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
    const { firstName, lastName, email, phone } = order.customer || {};
    const { shippingAddress, totalAmount, paymentMethod, createdAt } = order;

    // Parse the full shipping address to extract components
    // Expected format: "street, city, state pincode"
    let street = '';
    let city = '';
    let state = '';
    let pincode = '';

    if (shippingAddress && typeof shippingAddress === 'string') {
      // Split by comma and clean parts
      const parts = shippingAddress.split(',').map(p => p.trim()).filter(p => p.length > 0);
      
      console.log('📍 Parsing address parts:', parts);
      
      if (parts.length >= 3) {
        // Format: "street, city, state pincode"
        street = parts[0];
        city = parts[1];
        
        // Parse last part for state and pincode
        const lastPart = parts[parts.length - 1];
        const pincodeMatch = lastPart.match(/\b\d{6}\b/);
        
        if (pincodeMatch) {
          pincode = pincodeMatch[0];
          state = lastPart.replace(pincode, '').trim().replace(/\s*-\s*/g, ' ');
        } else {
          state = lastPart;
        }
        
      } else if (parts.length === 2) {
        // Format: "street, city"
        street = parts[0];
        city = parts[1];
      } else if (parts.length === 1) {
        street = parts[0];
      }
    }

    // Normalize and validate customer name
    const billingFirstName = (firstName || 'Customer').trim();
    const billingLastName = (lastName || 'Name').trim();
    
    // Normalize and validate street address - MUST BE AT LEAST 3 CHARACTERS
    street = street.trim();
    if (!street || street.length < 3) {
      console.error('❌ Invalid street address:', street);
      street = shippingAddress || 'Address Not Provided';
    }
    street = street.substring(0, 100);
    
    // Normalize and validate city - MUST BE AT LEAST 3 CHARACTERS
    city = city.trim();
    if (!city || city.length < 3) {
      console.error('❌ Invalid city:', city);
      city = 'Mumbai'; // Use a common fallback
    }
    
    // Normalize and validate state - MUST BE AT LEAST 3 CHARACTERS
    state = state.trim();
    if (!state || state.length < 3) {
      console.error('❌ Invalid state:', state);
      state = 'Maharashtra'; // Use a common fallback
    }
    // Capitalize state name properly
    state = state.split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ').replace(/_/g, ' ');
    
    // Validate pincode - MUST BE EXACTLY 6 DIGITS
    if (!pincode || !/^\d{6}$/.test(pincode)) {
      console.error('❌ Invalid pincode:', pincode);
      pincode = '400001'; // Mumbai pincode as fallback
    }

    // Clean up phone number to 10 digits
    let formattedPhone = (phone || '').replace(/\D/g, '');
    if (formattedPhone.length === 12 && formattedPhone.startsWith('91')) {
      formattedPhone = formattedPhone.substring(2);
    } else if (formattedPhone.length === 11 && formattedPhone.startsWith('0')) {
      formattedPhone = formattedPhone.substring(1);
    }
    if (!/^\d{10}$/.test(formattedPhone)) {
      console.error('❌ Invalid phone:', phone);
      formattedPhone = '9999999999';
    }
    
    // Validate email
    const billingEmail = (email || 'customer@example.com').trim();

    console.log('✅ Final validated address for Shiprocket:', {
      customer: `${billingFirstName} ${billingLastName}`,
      email: billingEmail,
      phone: formattedPhone,
      street: street,
      city: city,
      state: state,
      pincode: pincode,
      country: 'India'
    });

    const shiprocketData = {
      order_id: order.id,
      order_date: new Date(createdAt).toISOString().split('T')[0],
      pickup_location: pickupLocation,
      channel_id: "",
      comment: "Poppik Beauty Store Order",
      billing_customer_name: billingFirstName,
      billing_last_name: billingLastName,
      billing_address: street,
      billing_city: city,
      billing_pincode: pincode,
      billing_state: state,
      billing_country: "India",
      billing_email: billingEmail,
      billing_phone: formattedPhone,
      shipping_is_billing: true,
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
      payment_method: paymentMethod === 'Cash on Delivery' ? 'COD' : 'Prepaid',
      shipping_charges: 0,
      giftwrap_charges: 0,
      transaction_charges: 0,
      total_discount: 0,
      sub_total: Number(totalAmount),
      length: 15,
      breadth: 10,
      height: 5,
      weight: items.reduce((total: number, item: any) => total + (0.5 * (Number(item.quantity) || 1)), 0),
    };

    console.log('📦 Complete Shiprocket order payload:', JSON.stringify(shiprocketData, null, 2));

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