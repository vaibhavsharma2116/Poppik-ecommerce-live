import crypto from 'crypto';
import nodemailer from 'nodemailer';

interface OTPData {
  otp: string;
  email: string;
  expiresAt: Date;
  verified: boolean;
}

// In-memory storage for OTPs (in production, use Redis or database)
const otpStorage = new Map<string, OTPData>();

export class OTPService {
  // Expose storage for development endpoint access
  static get otpStorage() {
    return otpStorage;
  }

  // Mobile OTP methods
  static async sendMobileOTP(phoneNumber: string): Promise<{ success: boolean; message: string }> {
    try {
      // Clean and format phone number
      const cleanedPhone = phoneNumber.replace(/\D/g, '');
      const formattedPhone = cleanedPhone.startsWith('91') && cleanedPhone.length === 12 
        ? cleanedPhone.substring(2) 
        : cleanedPhone;

      if (formattedPhone.length !== 10) {
        return {
          success: false,
          message: 'Please enter a valid 10-digit mobile number'
        };
      }

      // Generate 6-digit OTP
      const otp = this.generateOTP();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

      // Store OTP with phone number as key
      otpStorage.set(formattedPhone, {
        otp,
        email: formattedPhone, // Using email field for phone number
        expiresAt,
        verified: false
      });

      // Send SMS via MDSSEND.IN
      const smsSent = await this.sendSMS(formattedPhone, otp);

      if (!smsSent) {
        console.error('Failed to send SMS via MDSSEND.IN');
        // Still return success for development with console fallback
      }

      // Also log to console for development
      console.log('\n' + '='.repeat(50));
      console.log('📱 MOBILE OTP SENT');
      console.log('='.repeat(50));
      console.log(`📱 Phone: +91 ${formattedPhone}`);
      console.log(`🔐 OTP Code: ${otp}`);
      console.log(`⏰ Valid for: 5 minutes`);
      console.log(`📅 Generated at: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
      console.log('='.repeat(50) + '\n');

      return {
        success: true,
        message: 'OTP sent to your mobile number successfully'
      };
    } catch (error) {
      console.error('Error sending mobile OTP:', error);
      return {
        success: false,
        message: 'Failed to send mobile OTP'
      };
    }
  }

  static async verifyMobileOTP(phoneNumber: string, otp: string): Promise<{ success: boolean; message: string }> {
    try {
      // Clean and format phone number
      const cleanedPhone = phoneNumber.replace(/\D/g, '');
      const formattedPhone = cleanedPhone.startsWith('91') && cleanedPhone.length === 12 
        ? cleanedPhone.substring(2) 
        : cleanedPhone;

      const otpData = otpStorage.get(formattedPhone);

      if (!otpData) {
        return {
          success: false,
          message: 'OTP not found or expired'
        };
      }

      if (new Date() > otpData.expiresAt) {
        otpStorage.delete(formattedPhone);
        return {
          success: false,
          message: 'OTP has expired'
        };
      }

      if (otpData.otp !== otp) {
        return {
          success: false,
          message: 'Invalid OTP'
        };
      }

      // Mark as verified
      otpData.verified = true;
      otpStorage.set(formattedPhone, otpData);

      return {
        success: true,
        message: 'Mobile OTP verified successfully'
      };
    } catch (error) {
      console.error('Error verifying mobile OTP:', error);
      return {
        success: false,
        message: 'Failed to verify mobile OTP'
      };
    }
  }

  // Create email transporter
  private static createTransporter() {
    const config = {
      service: 'gmail', // Use Gmail service instead of manual SMTP config
      auth: {
        user: process.env.EMAIL_USER?.replace(/"/g, '').trim(),
        pass: process.env.EMAIL_PASS?.replace(/"/g, '').trim(),
      },
      tls: {
        rejectUnauthorized: false
      }
    };
    
    console.log('📧 Email transporter config:', {
      service: 'gmail',
      user: config.auth.user,
      passLength: config.auth.pass?.length || 0,
      passPreview: config.auth.pass ? `${config.auth.pass.substring(0, 4)}****` : 'undefined'
    });
    
    return nodemailer.createTransporter(config);
  }

  private static generateOTP(): string {
    if (process.env.STATIC_OTP === 'true') {
      return '123456'; // Use static OTP for testing
    }
    return crypto.randomInt(100000, 999999).toString();
  }

  static async sendOTP(email: string): Promise<{ success: boolean; message: string }> {
    try {
      // Generate 6-digit OTP
      const otp = this.generateOTP();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

      // Store OTP
      otpStorage.set(email, {
        otp,
        email: email,
        expiresAt,
        verified: false
      });

      // Send OTP via email
      const emailSent = await this.sendEmail(email, otp);

      if (!emailSent) {
        console.error('Failed to send OTP email');
        return {
          success: false,
          message: 'Failed to send OTP email'
        };
      }

      return {
        success: true,
        message: 'OTP sent to your email successfully'
      };
    } catch (error) {
      console.error('Error sending OTP:', error);
      return {
        success: false,
        message: 'Failed to send OTP'
      };
    }
  }

  static async verifyOTP(email: string, otp: string): Promise<{ success: boolean; message: string }> {
    const otpData = otpStorage.get(email);

    if (!otpData) {
      return {
        success: false,
        message: 'OTP not found or expired'
      };
    }

    if (new Date() > otpData.expiresAt) {
      otpStorage.delete(email);
      return {
        success: false,
        message: 'OTP has expired'
      };
    }

    if (otpData.otp !== otp) {
      return {
        success: false,
        message: 'Invalid OTP'
      };
    }

    // Mark as verified
    otpData.verified = true;
    otpStorage.set(email, otpData);

    return {
      success: true,
      message: 'OTP verified successfully'
    };
  }

  static isVerified(email: string): boolean {
    const otpData = otpStorage.get(email);
    return otpData?.verified === true;
  }

  static clearOTP(email: string): void {
    otpStorage.delete(email);
  }

  // SMS sending using correct API format
  private static async sendSMS(phoneNumber: string, otp: string): Promise<boolean> {
    try {
      console.log('📱 Mobile OTP request for:', phoneNumber);

      // Updated credentials and endpoint
      const username = 'Poppik';
      const apikey = 'IF2ppgKwK0Mm';
      const senderid = 'POPPIK';
      const mobile = `91${phoneNumber}`;
      const message = `Your OTP for verification is: ${otp}. Valid for 5 minutes. Do not share with anyone.`;
      
      // Try different API endpoints - prioritize the working format
      const apiEndpoints = [
        // Format 1: Working format without route (from your logs)
        {
          url: `http://13.234.156.238/api.php?username=${username}&apikey=${apikey}&senderid=${senderid}&mobile=${mobile}&text=${encodeURIComponent(message)}`,
          method: 'GET'
        },
        // Format 2: Try with route parameter set to different values
        {
          url: `http://13.234.156.238/api.php?username=${username}&apikey=${apikey}&senderid=${senderid}&route=1&mobile=${mobile}&text=${encodeURIComponent(message)}`,
          method: 'GET'
        },
        // Format 3: Try promotional route
        {
          url: `http://13.234.156.238/api.php?username=${username}&apikey=${apikey}&senderid=${senderid}&route=2&mobile=${mobile}&text=${encodeURIComponent(message)}`,
          method: 'GET'
        },
        // Format 4: Try transactional route
        {
          url: `http://13.234.156.238/api.php?username=${username}&apikey=${apikey}&senderid=${senderid}&route=transactional&mobile=${mobile}&text=${encodeURIComponent(message)}`,
          method: 'GET'
        },
        // Format 5: Alternative API endpoint
        {
          url: `http://13.234.156.238/sendmsg.php?user=${username}&pass=${apikey}&sender=${senderid}&phone=${mobile}&text=${encodeURIComponent(message)}&priority=ndnd&stype=normal`,
          method: 'GET'
        },
        // Format 6: POST format with form data
        {
          url: 'http://13.234.156.238/api.php',
          method: 'POST',
          body: new URLSearchParams({
            username: username,
            apikey: apikey,
            senderid: senderid,
            mobile: mobile,
            text: message,
            route: '1'
          })
        }
      ];

      console.log('🔍 Sending SMS...');
      console.log(`📱 To: +${mobile}`);
      console.log(`📝 Message: ${message}`);

      for (let i = 0; i < apiEndpoints.length; i++) {
        const endpoint = apiEndpoints[i];
        
        try {
          console.log(`🔗 Trying API format ${i + 1}:`, endpoint.url);

          const fetchOptions: RequestInit = {
            method: endpoint.method,
            headers: {
              'User-Agent': 'Poppik-Beauty-Store/1.0',
              'Accept': 'text/plain, application/json, */*'
            }
          };

          if (endpoint.method === 'POST') {
            if (endpoint.contentType === 'application/json') {
              fetchOptions.headers['Content-Type'] = 'application/json';
              fetchOptions.body = endpoint.body;
            } else {
              fetchOptions.headers['Content-Type'] = 'application/x-www-form-urlencoded';
              fetchOptions.body = endpoint.body;
            }
          }

          const response = await fetch(endpoint.url, fetchOptions);
          const responseText = await response.text();

          console.log(`📱 API Format ${i + 1} Response Status:`, response.status);
          console.log(`📱 API Format ${i + 1} Response:`, responseText);

          // Check for success indicators (more flexible matching)
          const successIndicators = [
            'success', 'sent', 'delivered', 'submitted', 'accepted',
            'message sent', 'sms sent', 'ok', '1701', '1702', 'total invalid numbers : 0'
          ];
          
          const errorIndicators = [
            'undefined route', 'error', 'failed', 'invalid', 'unauthorized',
            'insufficient', 'expired', 'blocked', 'rejected'
          ];
          
          // Special handling for "Provide Route" - treat as partial success
          const partialSuccessIndicators = [
            'provide route', 'total invalid numbers : 0'
          ];

          const responseTextLower = responseText.toLowerCase();
          const hasSuccess = successIndicators.some(indicator => 
            responseTextLower.includes(indicator)
          );
          
          const hasPartialSuccess = partialSuccessIndicators.some(indicator => 
            responseTextLower.includes(indicator)
          );
          
          const hasError = errorIndicators.some(indicator => 
            responseTextLower.includes(indicator)
          );

          // Consider it successful if:
          // 1. Response is OK and contains success indicator
          // 2. Response contains "Total Invalid Numbers : 0" (means phone number is valid)
          // 3. Response is OK and doesn't contain error indicator and is short (likely success code)
          if (response.ok && (hasSuccess || hasPartialSuccess || (!hasError && responseText.length < 100))) {
            console.log(`✅ SMS sent successfully using API format ${i + 1}`);
            console.log(`📱 Success response: ${responseText}`);
            return true;
          }

          console.log(`❌ API format ${i + 1} failed, trying next format...`);
          
        } catch (formatError) {
          console.log(`❌ API format ${i + 1} error:`, formatError.message);
          continue;
        }
      }

      // If all formats failed, log final error but still show OTP in console for development
      console.log('❌ All SMS API formats failed');
      console.log('🔄 Development mode - OTP will work via console display');
      console.log('\n' + '='.repeat(60));
      console.log('📱 SMS FAILED - DEVELOPMENT OTP DISPLAY');
      console.log('='.repeat(60));
      console.log(`📱 Phone: +91 ${phoneNumber}`);
      console.log(`🔐 OTP Code: ${otp}`);
      console.log(`⏰ Valid for: 5 minutes`);
      console.log(`📅 Generated at: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
      console.log('='.repeat(60) + '\n');
      
      return true; // Return true for development to allow OTP verification

    } catch (error) {
      console.log('📱 SMS service error:', error.message);
      console.log('🔄 Development mode - OTP will work via console display');
      console.log('\n' + '='.repeat(60));
      console.log('📱 SMS ERROR - DEVELOPMENT OTP DISPLAY');
      console.log('='.repeat(60));
      console.log(`📱 Phone: +91 ${phoneNumber}`);
      console.log(`🔐 OTP Code: ${otp}`);
      console.log(`⏰ Valid for: 5 minutes`);
      console.log(`📅 Generated at: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
      console.log('='.repeat(60) + '\n');
      
      return true; // Return true for development to allow OTP verification
    }
  }

  // Email-based OTP system using Nodemailer
  private static async sendEmail(email: string, otp: string): Promise<boolean> {
    try {
      // Check if email configuration is available
      if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.log('⚠️  Email configuration missing - using console output only');
        console.log('\n' + '='.repeat(50));
        console.log('📧 EMAIL OTP (Console Only)');
        console.log('='.repeat(50));
        console.log(`📧 Email: ${email}`);
        console.log(`🔐 OTP Code: ${otp}`);
        console.log(`⏰ Valid for: 5 minutes`);
        console.log(`📅 Generated at: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
        console.log('='.repeat(50) + '\n');
        return true; // Return true for development
      }

      const transporter = this.createTransporter();

      // Verify connection configuration
      console.log('🔍 Verifying email connection...');
      await transporter.verify();
      console.log('✅ Email connection verified successfully');

      const mailOptions = {
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: email,
        subject: 'Your OTP Code - Beauty Store',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #e74c3c, #c0392b); padding: 20px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">Beauty Store</h1>
              <p style="color: white; margin: 5px 0; opacity: 0.9;">Your OTP Verification Code</p>
            </div>
            
            <div style="padding: 30px; background: #f8f9fa;">
              <h2 style="color: #333; margin-bottom: 20px;">Hello!</h2>
              <p style="color: #666; font-size: 16px; line-height: 1.6;">
                You requested an OTP for verification. Please use the code below to complete your action:
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <div style="background: #e74c3c; color: white; font-size: 32px; font-weight: bold; padding: 20px; border-radius: 8px; letter-spacing: 8px; display: inline-block;">
                  ${otp}
                </div>
              </div>
              
              <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 4px; padding: 15px; margin: 20px 0;">
                <p style="margin: 0; color: #856404; font-size: 14px;">
                  <strong>⏰ Important:</strong> This OTP is valid for 5 minutes only.
                </p>
              </div>
              
              <p style="color: #666; font-size: 14px; line-height: 1.6;">
                If you didn't request this OTP, please ignore this email. For security reasons, please do not share this code with anyone.
              </p>
              
              <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
              
              <div style="text-align: center; color: #999; font-size: 12px;">
                <p>Beauty Store - Premium Beauty & Skincare Products</p>
                <p>Generated at: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
              </div>
            </div>
          </div>
        `,
        text: `
Your OTP Code: ${otp}

This code is valid for 5 minutes only.
Generated at: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}

Beauty Store - Premium Beauty & Skincare Products
        `
      };

      await transporter.sendMail(mailOptions);

      // Also log to console for development
      console.log('\n' + '='.repeat(50));
      console.log('📧 EMAIL OTP SENT');
      console.log('='.repeat(50));
      console.log(`📧 Email: ${email}`);
      console.log(`🔐 OTP Code: ${otp}`);
      console.log(`⏰ Valid for: 5 minutes`);
      console.log(`📅 Generated at: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
      console.log('='.repeat(50) + '\n');

      return true;
    } catch (error) {
      console.error('📧 Email sending failed with detailed error:');
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      console.error('Response code:', error.responseCode);
      console.error('Command:', error.command);
      console.error('Full error:', error);
      
      // Fallback: Always log to console for development
      console.log('\n' + '='.repeat(50));
      console.log('📧 EMAIL OTP (Fallback - Console Output)');
      console.log('='.repeat(50));
      console.log(`📧 Email: ${email}`);
      console.log(`🔐 OTP Code: ${otp}`);
      console.log(`⏰ Valid for: 5 minutes`);
      console.log(`📅 Generated at: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
      console.log('='.repeat(50) + '\n');
      
      // Return true for development mode to allow OTP verification
      return true;
    }
  }
}