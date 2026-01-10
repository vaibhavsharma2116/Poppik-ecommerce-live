
interface ShiprocketConfig {
  email: string;
  password: string;
  baseUrl: string;
}

interface ShiprocketOrder {
  order_id: string;
  order_date: string;
  pickup_location: string;
  channel_id?: string;
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
  private refreshInterval: NodeJS.Timeout | null = null;
  private isRefreshing: boolean = false;

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
      // Set expiry to 30 days for env tokens
      this.tokenExpiry = Date.now() + (30 * 24 * 60 * 60 * 1000);
      console.log('Using pre-existing Shiprocket token from environment');
      
      // Start background refresh for env token too
      this.startBackgroundRefresh();
    } else if (this.config.email && this.config.password) {
      // Initialize token on startup
      this.authenticate().catch(err => {
        console.error('Failed to initialize Shiprocket token:', err);
      });
    }
  }

  private startBackgroundRefresh(): void {
    // Clear any existing interval
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }

    // Refresh token every 8 days (tokens valid for 10 days, refresh at 8 days for safety)
    const refreshIntervalMs = 8 * 24 * 60 * 60 * 1000; // 8 days
    
    this.refreshInterval = setInterval(async () => {
      try {
        console.log('Background token refresh triggered');
        await this.authenticate(true);
      } catch (error) {
        console.error('Background token refresh failed:', error);
      }
    }, refreshIntervalMs);

    console.log('Background token refresh scheduled every 8 days');
  }

  private async authenticate(forceRefresh: boolean = false): Promise<void> {
    // Prevent multiple simultaneous refresh attempts
    if (this.isRefreshing && !forceRefresh) {
      console.log('Token refresh already in progress, waiting...');
      // Wait for ongoing refresh to complete
      await new Promise(resolve => setTimeout(resolve, 2000));
      return;
    }

    console.log('Authenticating with Shiprocket...');

    // Check if token is about to expire (within 12 hours) and refresh it proactively
    const tokenExpiresIn = this.tokenExpiry - Date.now();
    const twelveHours = 12 * 60 * 60 * 1000;

    // Skip if we have a valid token that won't expire soon and not forcing refresh
    if (this.token && tokenExpiresIn > twelveHours && !forceRefresh) {
      const hoursRemaining = Math.floor(tokenExpiresIn / (60 * 60 * 1000));
      console.log(`Shiprocket token valid for ${hoursRemaining} more hours`);
      return;
    }

    // If token is about to expire or expired, refresh it
    if (this.token && tokenExpiresIn <= twelveHours && tokenExpiresIn > 0) {
      console.log('Shiprocket token expiring soon, proactively refreshing...');
      forceRefresh = true;
    }

    // If using pre-existing token from env, don't try to re-authenticate unless forcing refresh or expired
    if (process.env.SHIPROCKET_TOKEN && !forceRefresh && tokenExpiresIn > 0) {
      this.token = process.env.SHIPROCKET_TOKEN;
      this.tokenExpiry = Date.now() + (30 * 24 * 60 * 60 * 1000);
      console.log('Using pre-existing Shiprocket token from environment');
      return;
    }

    // Validate credentials
    if (!this.config.email || !this.config.password) {
      throw new Error('Shiprocket email and password are required');
    }

    this.isRefreshing = true;

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
      // This gives us a 1-day buffer to refresh before actual expiry
      this.tokenExpiry = Date.now() + (9 * 24 * 60 * 60 * 1000);

      const expiryDate = new Date(this.tokenExpiry);
      console.log(`✅ Shiprocket authentication successful. Token valid until: ${expiryDate.toLocaleString()}`);
      
      // Start background refresh scheduler if not already running
      if (!this.refreshInterval) {
        this.startBackgroundRefresh();
      }
    } catch (error) {
      console.error('Shiprocket authentication error:', error);
      this.token = null;
      this.tokenExpiry = 0;
      throw error;
    } finally {
      this.isRefreshing = false;
    }
  }

  private async makeRequest(endpoint: string, method: string = 'GET', data?: any, retryCount: number = 0) {
    const url = `${this.config.baseUrl}${endpoint}`;
    const maxRetries = 2;

    try {
      // Ensure we have a valid token before making request
      await this.authenticate();

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
          method,
          retryCount
        });

        // Handle specific error cases
        if (response.status === 401) {
          // Token expired or invalid - retry with fresh token
          if (retryCount < maxRetries) {
            console.log(`🔄 Token expired (attempt ${retryCount + 1}/${maxRetries}), refreshing and retrying...`);
            this.token = null;
            this.tokenExpiry = 0;
            await this.authenticate(true);
            // Add small delay before retry
            await new Promise(resolve => setTimeout(resolve, 1000));
            return this.makeRequest(endpoint, method, data, retryCount + 1);
          }
          throw new Error('Shiprocket authentication failed after retries - token may be permanently invalid');
        } else if (response.status === 403) {
          throw new Error('Shiprocket access forbidden - check API permissions');
        } else if (response.status === 429) {
          throw new Error('Shiprocket rate limit exceeded - please try again later');
        }

        const err: any = new Error(`Shiprocket API error: ${response.statusText} - ${JSON.stringify(jsonData)}`);
        err.status = response.status;
        err.statusText = response.statusText;
        err.response = jsonData;
        err.endpoint = endpoint;
        err.method = method;
        throw err;
      }

      return jsonData;
    } catch (error) {
      console.error('Shiprocket API request failed:', error);
      throw error;
    }
  }

  async createOrder(orderData: ShiprocketOrder) {
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        await this.authenticate(attempts > 0);
        return await this.makeRequest('/external/orders/create/adhoc', 'POST', orderData);
      } catch (error: any) {
        attempts++;

        // If Shiprocket reports invalid pickup location, pick a valid one and retry once
        const msg = String(error?.response?.message || error?.message || '');
        const pickupList = error?.response?.data?.data;
        if (
          attempts < maxAttempts &&
          msg.toLowerCase().includes('wrong pickup location') &&
          Array.isArray(pickupList) &&
          pickupList.length > 0
        ) {
          const active = pickupList.find((p: any) => Number(p?.status) === 1) || pickupList[0];
          const suggested = String(active?.pickup_location || '').trim();
          if (suggested && suggested !== orderData.pickup_location) {
            console.warn(`⚠️ Shiprocket pickup_location '${orderData.pickup_location}' invalid. Retrying with '${suggested}'.`);
            orderData = { ...orderData, pickup_location: suggested };
            continue;
          }
        }

        // If it's an auth error and we haven't maxed out retries, try again with fresh token
        if (attempts < maxAttempts && (error.message.includes('401') || error.message.includes('authentication'))) {
          console.log(`🔄 Retrying order creation with fresh authentication (${attempts}/${maxAttempts})...`);
          this.token = null;
          this.tokenExpiry = 0;
          await new Promise(resolve => setTimeout(resolve, 2000));
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

  async generateInvoicePdfResponse(shiprocketOrderId: string | number) {
    // Shiprocket API (apiv2) uses this endpoint to print invoice and returns a PDF URL.
    // Ref: https://support.shiprocket.in/support/solutions/articles/43000337456-shiprocket-api-document-helpsheet
    const data = await this.makeRequest('/external/orders/print/invoice', 'POST', {
      ids: [String(shiprocketOrderId)],
    });

    const url =
      (data && (data.invoice_url || data.invoiceUrl || data.url)) ||
      (data && Array.isArray(data.invoice_url) ? data.invoice_url[0] : null) ||
      (data && Array.isArray(data.invoiceUrl) ? data.invoiceUrl[0] : null) ||
      (data && Array.isArray(data.url) ? data.url[0] : null);

    if (!url) {
      throw new Error('Shiprocket invoice URL missing in response');
    }

    return await fetch(String(url), {
      method: 'GET',
    });
  }

  async generateLabelPdfResponse(shipmentId: number) {
    const data = await this.makeRequest('/external/courier/generate/label', 'POST', {
      shipment_id: [shipmentId],
    });

    const url =
      (data && (data.label_url || data.labelUrl)) ||
      (data && Array.isArray(data.label_url) ? data.label_url[0] : null) ||
      (data && Array.isArray(data.labelUrl) ? data.labelUrl[0] : null);

    if (!url) {
      throw new Error('Shiprocket label URL missing in response');
    }

    return await fetch(String(url), {
      method: 'GET',
    });
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

  convertToShiprocketFormat(order: any, pickupLocation: string = "Primary"): ShiprocketOrder {
    const items = order.items || [];
    const { firstName, lastName, email, phone } = order.customer || {};
    const { shippingAddress, totalAmount, paymentMethod, createdAt } = order;

    const normalizeAddressText = (raw: any): string => {
      if (!raw) return '';
      if (typeof raw !== 'string') return String(raw);
      const trimmed = raw.trim();
      // If address is JSON/multi-address payload, pick the first concrete address string
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        try {
          const parsed = JSON.parse(trimmed);
          if (parsed && typeof parsed === 'object') {
            if (Array.isArray((parsed as any).items) && (parsed as any).items.length > 0) {
              const first = (parsed as any).items[0];
              return String(first?.deliveryAddress || first?.address || '').trim();
            }
            return String((parsed as any).shippingAddress || (parsed as any).address || '').trim();
          }
        } catch {
          // fall back to raw string below
        }
      }
      return trimmed;
    };

    const shippingAddressText = normalizeAddressText(shippingAddress);

    let street = '';
    let city = '';
    let state = '';
    let pincode = '';

    if (shippingAddressText && typeof shippingAddressText === 'string') {
      const parts = shippingAddressText.split(',').map(p => p.trim()).filter(p => p.length > 0);
      
      console.log('📍 Parsing address parts:', parts);
      
      if (parts.length >= 3) {
        street = parts[0];
        city = parts[1];
        
        const lastPart = parts[parts.length - 1];
        const pincodeMatch = lastPart.match(/\b\d{6}\b/);
        
        if (pincodeMatch) {
          pincode = pincodeMatch[0];
          state = lastPart.replace(pincode, '').trim().replace(/\s*-\s*/g, ' ');
        } else {
          state = lastPart;
        }
        
      } else if (parts.length === 2) {
        street = parts[0];
        city = parts[1];
      } else if (parts.length === 1) {
        street = parts[0];
      }
    }

    const billingFirstName = (firstName || 'Customer').trim();
    const billingLastName = (lastName || 'Name').trim();
    
    street = street.trim();
    if (!street || street.length < 3) {
      console.error('❌ Invalid street address:', street);
      street = shippingAddressText || 'Address Not Provided';
    }
    street = street.substring(0, 100);
    
    city = city.trim();
    if (!city || city.length < 3) {
      console.error('❌ Invalid city:', city);
      city = 'Mumbai';
    }
    
    state = state.trim();
    if (!state || state.length < 3) {
      console.error('❌ Invalid state:', state);
      state = 'Maharashtra';
    }
    state = state.split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ').replace(/_/g, ' ');
    
    if (!pincode || !/^\d{6}$/.test(pincode)) {
      console.error('❌ Invalid pincode:', pincode);
      pincode = '400001';
    }

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

    const orderDate = new Date(createdAt);
    const formattedDate = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}-${String(orderDate.getDate()).padStart(2, '0')} ${String(orderDate.getHours()).padStart(2, '0')}:${String(orderDate.getMinutes()).padStart(2, '0')}`;

    const shiprocketData = {
      order_id: String(order.id),
      order_date: formattedDate,
      pickup_location: pickupLocation,
      ...(process.env.SHIPROCKET_CHANNEL_ID ? { channel_id: String(process.env.SHIPROCKET_CHANNEL_ID) } : {}),
      comment: "Poppik Beauty Store Order",
      billing_customer_name: billingFirstName,
      billing_last_name: billingLastName,
      billing_address: street,
      billing_address_2: "",
      billing_city: city,
      billing_pincode: pincode,
      billing_state: state,
      billing_country: "India",
      billing_email: billingEmail,
      billing_phone: formattedPhone,
      shipping_is_billing: true,
      order_items: (() => {
        const usedSkus = new Set<string>();

        const slugify = (v: any) =>
          String(v || '')
            .trim()
            .toUpperCase()
            .replace(/\s+/g, '-')
            .replace(/[^A-Z0-9\-]/g, '')
            .slice(0, 18);

        const extractShade = (item: any): string | undefined => {
          // 1) from explicit selectedShades / variants
          const ss = (item as any).selectedShades;
          if (typeof ss === 'string' && ss.trim()) return ss.trim();
          if (ss && typeof ss === 'object') {
            if (Array.isArray(ss) && ss.length > 0) {
              const first = ss[0];
              if (typeof first === 'string') return first;
              if (first && typeof first === 'object') return (first.name || first.shade || first.value || first.label) as any;
            }
            return (ss.name || ss.shade || ss.value || ss.label) as any;
          }

          // 2) from product name "(Shade: xxx)" pattern
          const name = String(item?.productName || item?.name || '');
          const m = name.match(/\(\s*shade\s*:\s*([^\)]+)\)/i);
          if (m && m[1]) return m[1].trim();
          return undefined;
        };

        const makeUniqueSku = (baseSku: string, shade?: string, index?: number) => {
          let sku = baseSku;
          const shadeSlug = shade ? slugify(shade) : '';
          if (shadeSlug) sku = `${baseSku}-${shadeSlug}`;

          if (!usedSkus.has(sku)) {
            usedSkus.add(sku);
            return sku;
          }

          // final fallback: append incremental suffix
          const seed = String(index ?? 0).padStart(2, '0');
          let attempt = `${sku}-${seed}`;
          let ctr = 0;
          while (usedSkus.has(attempt) && ctr < 50) {
            ctr += 1;
            attempt = `${sku}-${seed}-${ctr}`;
          }
          usedSkus.add(attempt);
          return attempt;
        };

        return items.map((item: any, index: number) => {
        const price = typeof item.price === 'string'
          ? parseFloat(item.price.replace(/[₹,]/g, ''))
          : Number(item.price);

        const baseId = item.productId || item.comboId || item.offerId || (Date.now() + index);
        const baseSku = `SKU${baseId}`;
        const shade = extractShade(item);

        return {
          name: (item.productName || item.name || 'Product').substring(0, 50),
          sku: makeUniqueSku(baseSku, shade, index),
          units: Number(item.quantity) || 1,
          selling_price: price,
          discount: 0,
          tax: 0,
          hsn: 610910,
        };
        });
      })(),
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

  // Cleanup method for graceful shutdown
  destroy(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
      console.log('Shiprocket background refresh stopped');
    }
  }
}

export default ShiprocketService;
