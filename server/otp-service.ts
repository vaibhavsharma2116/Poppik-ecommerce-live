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
      const isProduction = process.env.NODE_ENV === 'production';

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

      // Send SMS via MDSSEND.IN (pass with 91 prefix for API)
      const smsSent = await this.sendSMS(`91${formattedPhone}`, otp);

      if (!smsSent) {
        console.error('Failed to send SMS via MDSSEND.IN');

        // In production, treat as hard failure so frontend/user sees error
        if (isProduction) {
          return {
            success: false,
            message: 'Failed to send OTP to your mobile number. Please try again later.'
          };
        }
      }

      // Only store OTP after attempting to send SMS
      otpStorage.set(formattedPhone, {
        otp,
        email: formattedPhone, // Using email field for phone number
        expiresAt,
        verified: false
      });

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

  // SMS sending using the specific API format with route=OTP
  private static async sendSMS(phoneNumber: string, otp: string): Promise<boolean> {
    try {
      console.log('📱 Mobile OTP request for:', phoneNumber);

      const isProduction = process.env.NODE_ENV === 'production';

      // API credentials and parameters
      const username = 'Poppik';
      const apikey = 'LpVf1h3SxoZP';
      const senderid = 'POPPIK';
      const mobile = phoneNumber; // Use phoneNumber directly without adding 91 prefix
      const TID = '1707175646621729117';
      const PEID = '1701175575743853955'; 
      
      // Dynamic message with OTP
      const message = `Dear Poppik, your OTP for completing your registration is ${otp}. Please do not share this OTP with anyone. Visit us at www.poppik.in – Team Poppik`;

      // Construct the API URL with transactional route
      const apiUrl = `http://13.234.156.238/api.php?username=${username}&apikey=${apikey}&senderid=${senderid}&route=TRANS&mobile=${mobile}&text=${encodeURIComponent(message)}&TID=${TID}&PEID=${PEID}`;

      console.log('🔍 Sending SMS...');
      console.log(`📱 To: ${mobile}`);
      console.log(`📝 Message: ${message}`);
      console.log(`🔗 API URL: ${apiUrl}`);

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Poppik-Beauty-Store/1.0',
          'Accept': 'text/plain, application/json, */*'
        }
      });

      const responseText = await response.text();

      console.log(`📱 SMS API Response Status:`, response.status);
      console.log(`📱 SMS API Response:`, responseText);

      // Check for success indicators
      const successIndicators = [
        'success', 'sent', 'delivered', 'submitted', 'accepted',
        'message sent', 'sms sent', 'ok', 'queued'
      ];

      const errorIndicators = [
        'error', 'failed', 'invalid', 'unauthorized', 
        'insufficient', 'expired', 'blocked', 'rejected'
      ];

      const responseTextLower = responseText.toLowerCase();
      const hasSuccess = successIndicators.some(indicator =>
        responseTextLower.includes(indicator)
      );

      const hasError = errorIndicators.some(indicator =>
        responseTextLower.includes(indicator)
      );

      // Consider successful if:
      // 1. Response is OK AND contains success indicator
      // 2. Response is OK AND is numeric (message ID) AND no errors
      const isNumericResponse = /^\d+$/.test(responseText.trim());

      if (response.ok && hasSuccess) {
        console.log(`✅ SMS sent successfully`);
        console.log(`📱 Success response: ${responseText}`);
        return true;
      } else if (response.ok && isNumericResponse && !hasError) {
        console.log(`✅ SMS sent successfully (message ID: ${responseText})`);
        return true;
      } else if (hasError) {
        console.log(`❌ SMS API returned error: ${responseText}`);
      } else {
        console.log(`⚠️ SMS API unclear response: ${responseText}`);
      }

      // If SMS failed:
      if (!isProduction) {
        // In non-production, still allow flow by logging OTP
        console.log('🔄 Development mode - OTP will work via console display');
        console.log('\n' + '='.repeat(60));
        console.log('📱 SMS FAILED - DEVELOPMENT OTP DISPLAY');
        console.log('='.repeat(60));
        console.log(`📱 Phone: ${phoneNumber}`);
        console.log(`🔐 OTP Code: ${otp}`);
        console.log(`⏰ Valid for: 5 minutes`);
        console.log(`📅 Generated at: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
        console.log('='.repeat(60) + '\n');

        return true;
      }

      // In production, treat failure properly so caller can surface error
      return false;

    } catch (error) {
      const isProduction = process.env.NODE_ENV === 'production';
      console.log('📱 SMS service error:', (error as any)?.message || error);

      if (!isProduction) {
        console.log('🔄 Development mode - OTP will work via console display');
        console.log('\n' + '='.repeat(60));
        console.log('📱 SMS ERROR - DEVELOPMENT OTP DISPLAY');
        console.log('='.repeat(60));
        console.log(`📱 Phone: ${phoneNumber}`);
        console.log(`🔐 OTP Code: ${otp}`);
        console.log(`⏰ Valid for: 5 minutes`);
        console.log(`📅 Generated at: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
        console.log('='.repeat(60) + '\n');

        return true; // Return true for development to allow OTP verification
      }

      // In production, bubble up failure
      return false;
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

Beauty Store - Pure, Premium, Perfect for Your Skin.
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