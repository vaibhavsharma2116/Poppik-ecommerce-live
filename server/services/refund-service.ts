import { db } from "../storage";
import { ordersTable } from "../../shared/schema";
import { eq } from "drizzle-orm";

const CASHFREE_APP_ID = process.env.CASHFREE_APP_ID || 'cashfree_app_id';
const CASHFREE_SECRET_KEY = process.env.CASHFREE_SECRET_KEY || 'cashfree_secret_key';
const isProduction = process.env.CASHFREE_BASE_URL === 'production' ||
                    (process.env.CASHFREE_SECRET_KEY && process.env.CASHFREE_SECRET_KEY.includes('prod'));
const CASHFREE_BASE_URL = isProduction
  ? 'https://api.cashfree.com'
  : 'https://sandbox.cashfree.com';

export class RefundService {
  /**
   * Initiates a full refund for a given order using Cashfree Refund API.
   * @param orderId Internal order ID (e.g., 123)
   * @param cashfreeOrderId Cashfree order ID (e.g., ORD-123)
   * @param amount Refund amount
   * @param refundId A unique refund ID generated for this request
   */
  async initiateRefund(orderId: number, cashfreeOrderId: string, amount: number, refundId: string) {
    console.log(`[RefundService] Initiating refund for order ${orderId} (Cashfree ID: ${cashfreeOrderId}), amount: ${amount}, refundId: ${refundId}`);
    
    try {
      const response = await fetch(`${CASHFREE_BASE_URL}/pg/orders/${cashfreeOrderId}/refunds`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-version': '2023-08-01',
          'x-client-id': CASHFREE_APP_ID,
          'x-client-secret': CASHFREE_SECRET_KEY,
        },
        body: JSON.stringify({
          refund_amount: amount,
          refund_id: refundId,
          refund_note: `Refund for cancelled order ${cashfreeOrderId}`
        })
      });

      const result: any = await response.json();

      if (!response.ok) {
        console.error(`[RefundService] Cashfree refund API error for order ${orderId}:`, result);
        throw new Error(result.message || 'Failed to initiate Cashfree refund');
      }

      console.log(`[RefundService] Cashfree refund initiated successfully for order ${orderId}:`, result);

      // Update order with refund details
      await db.update(ordersTable)
        .set({
          refundId: result.refund_id,
          refundStatus: result.refund_status.toLowerCase() // pending/success/failed
        })
        .where(eq(ordersTable.id, orderId));

      return result;
    } catch (error) {
      console.error(`[RefundService] Error initiating refund for order ${orderId}:`, error);
      throw error;
    }
  }

  /**
   * Updates the refund status in the database based on webhook notification.
   */
  async updateRefundStatus(cashfreeOrderId: string, refundId: string, status: string) {
    console.log(`[RefundService] Updating refund status for Cashfree order ${cashfreeOrderId}, refundId ${refundId}: ${status}`);
    
    try {
      await db.update(ordersTable)
        .set({
          refundStatus: status.toLowerCase()
        })
        .where(eq(ordersTable.cashfreeOrderId, cashfreeOrderId));
    } catch (error) {
      console.error(`[RefundService] Error updating refund status for order ${cashfreeOrderId}:`, error);
      throw error;
    }
  }
}

export const refundService = new RefundService();
