import { db } from "../storage";
import { ordersTable } from "../../shared/schema";
import { eq, and, or } from "drizzle-orm";
import { refundService } from "./refund-service";
import { logisticsService } from "./logistics-service";

export class CancelService {
  /**
   * Cancels an order and handles refund and logistics.
   */
  async cancelOrder(orderId: number, reason: string) {
    console.log(`[CancelService] Request to cancel order ${orderId}. Reason: ${reason}`);

    // 1. Fetch order details
    const orders = await db
      .select()
      .from(ordersTable)
      .where(eq(ordersTable.id, orderId))
      .limit(1);

    if (orders.length === 0) {
      throw new Error(`Order ${orderId} not found`);
    }

    const order = orders[0];

    // 2. Validate status for cancellation
    const allowedStatuses = ['pending', 'placed', 'processing'];
    if (!allowedStatuses.includes(order.status.toLowerCase())) {
      throw new Error(`Order ${orderId} cannot be cancelled because its status is '${order.status}'`);
    }

    // 3. Handle Logistics
    try {
      await logisticsService.handleLogisticsCancellation(
        String(order.id),
        order.trackingNumber || undefined
      );
    } catch (logisticsError) {
      console.error(`[CancelService] Logistics cancellation failed for order ${orderId}:`, logisticsError);
      // We continue even if logistics cancellation fails, but we log it.
    }

    // 4. Handle Refund if ONLINE payment
    if (order.paymentMethod.toUpperCase() === 'CASHFREE' || order.paymentMethod.toUpperCase() === 'ONLINE') {
      if (order.cashfreeOrderId) {
        try {
          const refundRequestId = `REFUND-${order.id}-${Date.now()}`;
          await refundService.initiateRefund(
            order.id,
            order.cashfreeOrderId,
            order.totalAmount,
            refundRequestId
          );
        } catch (refundError) {
          console.error(`[CancelService] Refund initiation failed for order ${orderId}:`, refundError);
          // Depending on requirements, we might want to still mark the order as cancelled
          // and handle the refund manually or retry later.
        }
      } else {
        console.warn(`[CancelService] Order ${orderId} is online but missing Cashfree order ID. Skipping refund.`);
      }
    }

    // 5. Update Order status in DB
    const [updatedOrder] = await db
      .update(ordersTable)
      .set({
        status: 'cancelled',
        cancelReason: reason,
        cancelledAt: new Date()
      })
      .where(eq(ordersTable.id, orderId))
      .returning();

    console.log(`[CancelService] Order ${orderId} marked as cancelled in database.`);

    return updatedOrder;
  }
}

export const cancelService = new CancelService();
