
interface IthinkConfig {
  email: string;
  password: string;
  baseUrl: string;
}

interface IthinkOrder {
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

interface IthinkTrackingResponse {
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

class IthinkService {
  private config: IthinkConfig;
  private token: string | null = null;
  private tokenExpiry: number = 0;
  private refreshInterval: NodeJS.Timeout | null = null;
  private isRefreshing: boolean = false;

  // iThink Logistics (ITL) config
  private itlBaseUrl: string;
  private itlAccessToken: string | null;
  private itlSecretKey: string | null;
  private useIthink: boolean;

  constructor() {
    this.config = {
      email: process.env.ITHINK_EMAIL || '',
      password: process.env.ITHINK_PASSWORD || '',
      baseUrl: process.env.ITHINK_EXTERNAL_BASE_URL || process.env.ITHINK_BASE_URL || 'https://api.ithinklogistics.com'
    };

    this.itlBaseUrl = String(process.env.ITHINK_BASE_URL || process.env.ITHINKLOGISTICS_BASE_URL || 'https://api.ithinklogistics.com').replace(/\/+$/, '');
    this.itlAccessToken = process.env.ITHINK_ACCESS_TOKEN || process.env.ITHINKLOGISTICS_ACCESS_TOKEN || null;
    this.itlSecretKey = process.env.ITHINK_SECRET_KEY || process.env.ITHINKLOGISTICS_SECRET_KEY || null;
    this.useIthink = Boolean(this.itlAccessToken && this.itlSecretKey);

    if (this.useIthink) {
      console.log('Using iThink Logistics as delivery partner');
      return;
    }

    // If a pre-existing token is provided in environment, use it
    const preExistingToken = process.env.ITHINK_TOKEN;
    if (preExistingToken) {
      this.token = preExistingToken;
      // Set expiry to 30 days for env tokens
      this.tokenExpiry = Date.now() + (30 * 24 * 60 * 60 * 1000);
      console.log('Using pre-existing token from environment');
      
      // Start background refresh for env token too
      this.startBackgroundRefresh();
    } else if (this.config.email && this.config.password) {
      // Initialize token on startup
      this.authenticate().catch(err => {
        console.error('Failed to initialize token:', err);
      });
    }

  }

  private async makeIthinkRequest(path: string, data?: any) {
    if (!this.useIthink) {
      throw new Error('iThink request called but iThink credentials are not configured');
    }
    const url = `${this.itlBaseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
    const payload = {
      data: {
        ...(data || {}),
        access_token: this.itlAccessToken,
        secret_key: this.itlSecretKey,
      },
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    let json: any;
    try {
      json = JSON.parse(responseText);
    } catch (e) {
      console.error('Failed to parse iThink response:', responseText);
      throw new Error(`Invalid response from iThink Logistics: HTTP ${response.status}`);
    }

    if (!response.ok) {
      const err: any = new Error(`iThink API error: HTTP ${response.status} - ${response.statusText}`);
      err.status = response.status;
      err.statusText = response.statusText;
      err.response = json;
      throw err;
    }

    // iThink returns status_code (number) and/or status (string)
    const statusCode = Number(json?.status_code);
    if (Number.isFinite(statusCode) && statusCode !== 200) {
      const err: any = new Error(`iThink API status_code=${statusCode}`);
      err.status_code = statusCode;
      err.response = json;
      throw err;
    }

    return json;
  }

  private formatIthinkOrderDate(orderDate: string): string {
    // Accepts format: YYYY-MM-DD HH:mm OR ISO-ish; returns: DD-MM-YYYY HH:mm:ss
    const tryDate = new Date(orderDate);
    const d = isNaN(tryDate.getTime()) ? new Date() : tryDate;
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = String(d.getFullYear());
    const HH = String(d.getHours()).padStart(2, '0');
    const MM = String(d.getMinutes()).padStart(2, '0');
    const SS = String(d.getSeconds()).padStart(2, '0');
    return `${dd}-${mm}-${yyyy} ${HH}:${MM}:${SS}`;
  }

  private coercePublicOrderNoFromNumeric(orderId: string | number): string {
    const raw = String(orderId ?? '').trim();
    if (raw.toUpperCase().startsWith('ORD-')) return raw;
    const digits = raw.replace(/\D/g, '');
    if (digits) return `ORD-${digits}`;
    return raw || 'ORD-0';
  }

  private async itlGetAwbForOrder(orderNo: string): Promise<string | null> {
    try {
      const today = new Date();
      const start = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const yyyy1 = start.getFullYear();
      const mm1 = String(start.getMonth() + 1).padStart(2, '0');
      const dd1 = String(start.getDate()).padStart(2, '0');
      const yyyy2 = today.getFullYear();
      const mm2 = String(today.getMonth() + 1).padStart(2, '0');
      const dd2 = String(today.getDate()).padStart(2, '0');

      const details: any = await this.makeIthinkRequest('/api_v3/order/get_details.json', {
        awb_number_list: '',
        order_no: orderNo,
        start_date: `${yyyy1}-${mm1}-${dd1}`,
        end_date: `${yyyy2}-${mm2}-${dd2}`,
      });

      const data = details?.data;
      if (!data || typeof data !== 'object') return null;
      const firstKey = Object.keys(data)[0];
      if (!firstKey) return null;
      const row = (data as any)[firstKey];
      const awb = String(row?.awb_no || row?.awb || '').trim();
      return awb || null;
    } catch (e) {
      console.warn('iThink get_details (awb lookup) failed:', (e as any)?.message || e);
      return null;
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
    if (this.useIthink) {
      return;
    }

    // Prevent multiple simultaneous refresh attempts
    if (this.isRefreshing && !forceRefresh) {
      console.log('Token refresh already in progress, waiting...');
      // Wait for ongoing refresh to complete
      await new Promise(resolve => setTimeout(resolve, 2000));
      return;
    }

    console.log('Authenticating...');

    // Check if token is about to expire (within 12 hours) and refresh it proactively
    const tokenExpiresIn = this.tokenExpiry - Date.now();
    const twelveHours = 12 * 60 * 60 * 1000;

    // Skip if we have a valid token that won't expire soon and not forcing refresh
    if (this.token && tokenExpiresIn > twelveHours && !forceRefresh) {
      const hoursRemaining = Math.floor(tokenExpiresIn / (60 * 60 * 1000));
      console.log(`Delivery partner token valid for ${hoursRemaining} more hours`);
      return;
    }

    // If token is about to expire or expired, refresh it
    if (this.token && tokenExpiresIn <= twelveHours && tokenExpiresIn > 0) {
      console.log('Delivery partner token expiring soon, proactively refreshing...');
      forceRefresh = true;
    }

    // If using pre-existing token from env, don't try to re-authenticate unless forcing refresh or expired
    if (process.env.ITHINK_TOKEN && !forceRefresh && tokenExpiresIn > 0) {
      this.token = process.env.ITHINK_TOKEN;
      this.tokenExpiry = Date.now() + (30 * 24 * 60 * 60 * 1000);
      console.log('Using pre-existing token from environment');
      return;
    }

    // Validate credentials
    if (!this.config.email || !this.config.password) {
      throw new Error('Email and password are required');
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
        throw new Error('Invalid authentication response');
      }

      if (!response.ok) {
        console.error('Authentication failed:', {
          status: response.status,
          statusText: response.statusText,
          response: data
        });

        if (response.status === 401) {
          throw new Error('Invalid credentials - check email and password');
        }

        throw new Error(`Authentication failed: ${response.statusText} - ${JSON.stringify(data)}`);
      }

      if (!data.token) {
        throw new Error('No token received from authentication');
      }

      this.token = data.token;
      // Set token expiry to 9 days (tokens are valid for 10 days)
      // This gives us a 1-day buffer to refresh before actual expiry
      this.tokenExpiry = Date.now() + (9 * 24 * 60 * 60 * 1000);

      const expiryDate = new Date(this.tokenExpiry);
      console.log(`✅ Authentication successful. Token valid until: ${expiryDate.toLocaleString()}`);
      
      // Start background refresh scheduler if not already running
      if (!this.refreshInterval) {
        this.startBackgroundRefresh();
      }
    } catch (error) {
      console.error('Authentication error:', error);
      this.token = null;
      this.tokenExpiry = 0;
      throw error;
    } finally {
      this.isRefreshing = false;
    }
  }

  private async makeRequest(endpoint: string, method: string = 'GET', data?: any, retryCount: number = 0) {
    if (this.useIthink) {
      throw new Error('Request called while iThink Logistics mode is active');
    }
    const url = `${this.config.baseUrl}${endpoint}`;
    const maxRetries = 2;

    try {
      // Ensure we have a valid token before making request
      await this.authenticate();

      // Validate token before making request
      if (!this.token) {
        throw new Error('Token not available');
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
        console.error('Failed to parse response:', responseData);
        const snippet = String(responseData || '').slice(0, 200);
        throw new Error(`Invalid response: ${response.statusText} (${response.status}) from ${url}. Body: ${snippet}`);
      }

      if (!response.ok) {
        console.error('API error details:', {
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
          throw new Error('Authentication failed after retries - token may be permanently invalid');
        } else if (response.status === 403) {
          throw new Error('Access forbidden - check API permissions');
        } else if (response.status === 429) {
          throw new Error('Rate limit exceeded - please try again later');
        }

        const err: any = new Error(`API error: ${response.statusText} - ${JSON.stringify(jsonData)}`);
        err.status = response.status;
        err.statusText = response.statusText;
        err.response = jsonData;
        err.endpoint = endpoint;
        err.method = method;
        throw err;
      }

      return jsonData;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  async createOrder(orderData: IthinkOrder) {
    if (this.useIthink) {
      // Map existing delivery partner payload to iThink Logistics Sync Order (v3)
      const orderNo = String(orderData.order_id);
      const itlOrderDate = this.formatIthinkOrderDate(orderData.order_date);
      const isCOD = String(orderData.payment_method || '').toUpperCase() === 'COD';

      const computedTotalAmount = (orderData.order_items || []).reduce((sum, it) => {
        const units = Number((it as any)?.units ?? 1) || 1;
        const price = Number((it as any)?.selling_price ?? 0) || 0;
        const discount = Number((it as any)?.discount ?? 0) || 0;
        const lineTotal = (price * units) - discount;
        return sum + (Number.isFinite(lineTotal) ? lineTotal : 0);
      }, 0);

      const totalAmountForITL = Number.isFinite(computedTotalAmount)
        ? computedTotalAmount
        : Number(orderData.sub_total ?? 0) || 0;

      const shipments = [
        {
          order: orderNo,
          sub_order: '',
          order_date: itlOrderDate,
          total_amount: String(totalAmountForITL),
          name: String(orderData.billing_customer_name || 'Customer'),
          company_name: 'Poppik',
          add: String(orderData.billing_address || ''),
          add2: String(orderData.billing_address_2 || ''),
          add3: '',
          pin: String(orderData.billing_pincode || ''),
          city: String(orderData.billing_city || ''),
          state: String(orderData.billing_state || ''),
          country: String(orderData.billing_country || 'India'),
          phone: String(orderData.billing_phone || ''),
          alt_phone: String(orderData.billing_phone || ''),
          email: String(orderData.billing_email || ''),
          is_billing_same_as_shipping: 'yes',
          billing_name: String(orderData.billing_customer_name || 'Customer'),
          billing_company_name: 'Poppik',
          billing_add: String(orderData.billing_address || ''),
          billing_add2: String(orderData.billing_address_2 || ''),
          billing_add3: '',
          billing_pin: String(orderData.billing_pincode || ''),
          billing_city: String(orderData.billing_city || ''),
          billing_state: String(orderData.billing_state || ''),
          billing_country: String(orderData.billing_country || 'India'),
          billing_phone: String(orderData.billing_phone || ''),
          billing_alt_phone: String(orderData.billing_phone || ''),
          billing_email: String(orderData.billing_email || ''),
          products: (orderData.order_items || []).map((it) => ({
            product_name: String(it?.name || 'Product'),
            product_sku: String(it?.sku || ''),
            product_quantity: String(it?.units ?? 1),
            product_price: String(it?.selling_price ?? 0),
            product_tax_rate: String(it?.tax ?? ''),
            product_hsn_code: String(it?.hsn ?? ''),
            product_discount: String(it?.discount ?? 0),
          })),
          shipment_length: String(orderData.length ?? 0),
          shipment_width: String(orderData.breadth ?? 0),
          shipment_height: String(orderData.height ?? 0),
          weight: String(orderData.weight ?? 0.5),
          shipping_charges: String(orderData.shipping_charges ?? 0),
          giftwrap_charges: String(orderData.giftwrap_charges ?? 0),
          transaction_charges: String(orderData.transaction_charges ?? 0),
          total_discount: String(orderData.total_discount ?? 0),
          first_attemp_discount: '0',
          cod_charges: '0',
          advance_amount: '0',
          cod_amount: isCOD ? String(totalAmountForITL) : '0',
          payment_mode: isCOD ? 'COD' : 'Prepaid',
          reseller_name: '',
          eway_bill_number: '',
          gst_number: '',
        },
      ];

      const resp: any = await this.makeIthinkRequest('/api_v3/order/sync.json', { shipments });
      const status = String(resp?.data?.['1']?.status || resp?.data?.[1]?.status || '').toLowerCase();
      if (status && status !== 'success') {
        throw new Error(`iThink order sync failed: ${resp?.data?.['1']?.remark || resp?.html_message || 'Unknown error'}`);
      }

      // Try to fetch AWB (may take time; we'll keep it optional)
      const awb = await this.itlGetAwbForOrder(orderNo);

      // Keep response shape expected by routes.ts
      return {
        order_id: Number(String(orderNo).replace(/\D/g, '')) || orderNo,
        shipment_id: Number(String(orderNo).replace(/\D/g, '')) || null,
        awb_code: awb || null,
      };
    }

    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        await this.authenticate(attempts > 0);
        return await this.makeRequest('/external/orders/create/adhoc', 'POST', orderData);
      } catch (error: any) {
        attempts++;

        // If delivery partner reports invalid pickup location, pick a valid one and retry once
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
            console.warn(`⚠️ pickup_location '${orderData.pickup_location}' invalid. Retrying with '${suggested}'.`);
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
      if (this.useIthink) {
        const orderNo = this.coercePublicOrderNoFromNumeric(orderId);
        const awb = await this.itlGetAwbForOrder(orderNo);
        if (!awb) {
          throw new Error('AWB not available for this order yet');
        }
        const response = await this.makeIthinkRequest('/api_v2/order/track.json', {
          awb_number_list: awb,
        });
        return response;
      }

      await this.authenticate();
      const response = await this.makeRequest(`/external/courier/track?order_id=${orderId}`);
      return response;
    } catch (error) {
      console.error('Error tracking order:', error);
      throw error;
    }
  }

  async trackByAWB(awbCode: string) {
    try {
      if (this.useIthink) {
        const response = await this.makeIthinkRequest('/api_v2/order/track.json', {
          awb_number_list: String(awbCode),
        });
        return response;
      }

      await this.authenticate();
      const response = await this.makeRequest(`/external/courier/track/awb/${awbCode}`);
      return response;
    } catch (error) {
      console.error('Error tracking by AWB:', error);
      throw error;
    }
  }

  private async itlGetRates(params: {
    fromPincode: string;
    toPincode: string;
    weightKg: number;
    isCOD: boolean;
    productMrp: number;
    lengthCm?: number;
    widthCm?: number;
    heightCm?: number;
  }): Promise<any[] | null> {
    try {
      const lengthCm = Number(params.lengthCm ?? process.env.ITHINK_DEFAULT_LENGTH_CM ?? 22);
      const widthCm = Number(params.widthCm ?? process.env.ITHINK_DEFAULT_WIDTH_CM ?? 12);
      const heightCm = Number(params.heightCm ?? process.env.ITHINK_DEFAULT_HEIGHT_CM ?? 12);

      const payload = {
        from_pincode: String(params.fromPincode),
        to_pincode: String(params.toPincode),
        shipping_length_cms: String(Number.isFinite(lengthCm) ? lengthCm : 22),
        shipping_width_cms: String(Number.isFinite(widthCm) ? widthCm : 12),
        shipping_height_cms: String(Number.isFinite(heightCm) ? heightCm : 12),
        shipping_weight_kg: String(Math.max(0.01, Number(params.weightKg) || 0.01)),
        order_type: 'forward',
        payment_method: params.isCOD ? 'cod' : 'prepaid',
        product_mrp: String(Math.max(0, Number(params.productMrp) || 0)),
      };

      const resp: any = await this.makeIthinkRequest('/api_v3/rate/check.json', payload);
      const rates = resp?.data;
      if (Array.isArray(rates)) return rates;
      return null;
    } catch (e) {
      console.warn('iThink rate check failed:', (e as any)?.message || e);
      return null;
    }
  }

  async getServiceability(
    pickupPincode: string,
    deliveryPincode: string,
    weight: number,
    cod: boolean = false,
    productMrp?: number
  ) {
    try {
      if (this.useIthink) {
        const pickup = String(pickupPincode || process.env.ITHINK_PICKUP_PINCODE || '400001');
        const delivery = String(deliveryPincode);
        const weightKg = Math.max(0.01, Number(weight) || 0.01);

        const resp: any = await this.makeIthinkRequest('/api_v3/pincode/check.json', {
          pincode: delivery,
        });

        const courierMap = resp?.data?.[delivery];
        const available: any[] = [];
        if (courierMap && typeof courierMap === 'object') {
          let idx = 1;
          for (const [name, details] of Object.entries<any>(courierMap)) {
            const prepaidOk = String((details as any)?.prepaid || '').toUpperCase() === 'Y';
            const codOk = String((details as any)?.cod || '').toUpperCase() === 'Y';
            const pickupOk = String((details as any)?.pickup || '').toUpperCase() === 'Y';
            const ok = pickupOk && (cod ? codOk : prepaidOk);
            if (ok) {
              available.push({
                courier_company_id: idx,
                courier_name: name,
                rate: undefined,
              });
              idx += 1;
            }
          }
        }

        const mrpFallback = Number.isFinite(Number(productMrp)) ? Number(productMrp) : 0;
        const rateRows = await this.itlGetRates({
          fromPincode: pickup,
          toPincode: delivery,
          weightKg,
          isCOD: Boolean(cod),
          productMrp: mrpFallback,
        });

        if (Array.isArray(rateRows) && rateRows.length > 0) {
          const rateMap = new Map<string, number>();
          for (const row of rateRows) {
            const name = String((row as any)?.logistic_name || (row as any)?.logistics_name || '').trim();
            const r = Number((row as any)?.rate);
            if (name && Number.isFinite(r)) {
              const key = name.toLowerCase();
              if (!rateMap.has(key) || r < (rateMap.get(key) as number)) {
                rateMap.set(key, r);
              }
            }
          }

          const minRate = rateMap.size > 0
            ? Math.min(...Array.from(rateMap.values()).filter(v => Number.isFinite(v)))
            : NaN;

          for (const c of available) {
            const key = String(c?.courier_name || '').toLowerCase().trim();
            if (rateMap.has(key)) {
              c.rate = rateMap.get(key);
            } else if (Number.isFinite(minRate)) {
              c.rate = minRate;
            }
          }
        }

        return {
          data: {
            available_courier_companies: available,
          },
        };
      }

      await this.authenticate();

      const codValue = cod ? 1 : 0;
      const endpoint = `/external/courier/serviceability?pickup_postcode=${pickupPincode}&delivery_postcode=${deliveryPincode}&weight=${weight}&cod=${codValue}`;

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
      if (this.useIthink) {
        void courierId;
        const orderNo = this.coercePublicOrderNoFromNumeric(shipmentId);
        const awb = await this.itlGetAwbForOrder(orderNo);
        if (!awb) {
          throw new Error('AWB not available for this order yet');
        }
        return {
          awb_code: awb,
        };
      }

      await this.authenticate();
      const response = await this.makeRequest('/external/courier/assign/awb', 'POST', {
        shipment_id: shipmentId,
        courier_id: courierId,
      });
      return response;
    } catch (error) {
      const msg = String((error as any)?.message || error || '');
      if (!msg.toLowerCase().includes('awb not available')) {
        console.error('Error generating AWB:', error);
      }
      throw error;
    }
  }

  async getOrderDetails(orderId: string) {
    try {
      if (this.useIthink) {
        const orderNo = this.coercePublicOrderNoFromNumeric(orderId);
        const details: any = await this.makeIthinkRequest('/api_v3/order/get_details.json', {
          awb_number_list: '',
          order_no: orderNo,
          start_date: '',
          end_date: '',
        });
        return details;
      }

      await this.authenticate();
      const response = await this.makeRequest(`/external/orders/show/${orderId}`);
      return response;
    } catch (error) {
      console.error('Error getting order details:', error);
      throw error;
    }
  }

  async generateInvoicePdfResponse(ithinkOrderId: string | number) {
    if (this.useIthink) {
      const orderNo = this.coercePublicOrderNoFromNumeric(ithinkOrderId);
      const awb = await this.itlGetAwbForOrder(orderNo);
      if (!awb) {
        throw new Error('AWB not available for this order yet');
      }

      const data: any = await this.makeIthinkRequest('/api_v2/shipping/invoice.json', {
        awb_numbers: awb,
      });

      const url = String(data?.file_name || '').trim();
      if (!url) {
        throw new Error('iThink invoice URL missing in response');
      }

      return await fetch(url, { method: 'GET' });
    }

    // API (apiv2) uses this endpoint to print invoice and returns a PDF URL.
    const data = await this.makeRequest('/external/orders/print/invoice', 'POST', {
      ids: [String(ithinkOrderId)],
    });

    const url =
      (data && (data.invoice_url || data.invoiceUrl || data.url)) ||
      (data && Array.isArray(data.invoice_url) ? data.invoice_url[0] : null) ||
      (data && Array.isArray(data.invoiceUrl) ? data.invoiceUrl[0] : null) ||
      (data && Array.isArray(data.url) ? data.url[0] : null);

    if (!url) {
      throw new Error('Invoice URL missing in response');
    }

    return await fetch(String(url), {
      method: 'GET',
    });
  }

  async generateLabelPdfResponse(shipmentId: number) {
    if (this.useIthink) {
      const orderNo = this.coercePublicOrderNoFromNumeric(shipmentId);
      const awb = await this.itlGetAwbForOrder(orderNo);
      if (!awb) {
        throw new Error('AWB not available for this order yet');
      }

      const data: any = await this.makeIthinkRequest('/api_v2/shipping/label.json', {
        awb_numbers: awb,
        page_size: 'A4',
      });

      const url = String(data?.file_name || '').trim();
      if (!url) {
        throw new Error('iThink label URL missing in response');
      }

      return await fetch(url, { method: 'GET' });
    }

    const data = await this.makeRequest('/external/courier/generate/label', 'POST', {
      shipment_id: [shipmentId],
    });

    const url =
      (data && (data.label_url || data.labelUrl)) ||
      (data && Array.isArray(data.label_url) ? data.label_url[0] : null) ||
      (data && Array.isArray(data.labelUrl) ? data.labelUrl[0] : null);

    if (!url) {
      throw new Error('Label URL missing in response');
    }

    return await fetch(String(url), {
      method: 'GET',
    });
  }

  async cancelOrder(orderId: string) {
    try {
      if (this.useIthink) {
        throw new Error('Order cancellation not implemented for iThink Logistics in this integration');
      }

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

  convertToIthinkFormat(order: any, pickupLocation: string = "Primary"): IthinkOrder {
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

    console.log('✅ Final validated address:', {
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

    const ithinkData = {
      order_id: String(order.id),
      order_date: formattedDate,
      pickup_location: pickupLocation,
      ...(process.env.ITHINK_CHANNEL_ID ? { channel_id: String(process.env.ITHINK_CHANNEL_ID) } : {}),
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

    console.log('📦 Complete order payload:', JSON.stringify(ithinkData, null, 2));

    return ithinkData;
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
      console.log('Background refresh stopped');
    }
  }
}

export default IthinkService;
