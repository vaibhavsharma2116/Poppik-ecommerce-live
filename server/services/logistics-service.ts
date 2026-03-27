import IthinkServiceAdapter from "../ithink-service-adapter";

export class LogisticsService {
  private ithinkAdapter: IthinkServiceAdapter;

  constructor() {
    this.ithinkAdapter = new IthinkServiceAdapter();
  }

  /**
   * Handle order cancellation in logistics based on current shipment status.
   * If shipment not created: cancel directly.
   * If shipment created but not picked: send cancel request.
   * If shipment already picked: initiate RTO (Return to Origin).
   */
  async handleLogisticsCancellation(orderId: string, trackingNumber?: string) {
    console.log(`[LogisticsService] Handling logistics cancellation for order ${orderId} (tracking: ${trackingNumber})`);
    
    try {
      // 1. Get tracking info from iThink to determine status
      let trackingInfo: any = null;
      if (trackingNumber) {
        trackingInfo = await this.ithinkAdapter.trackByAWB(trackingNumber);
      } else {
        // Try both ORD- prefix and numeric ID if trackingNumber is missing
        trackingInfo = await this.ithinkAdapter.trackOrder(orderId);
        if (!trackingInfo || !trackingInfo.data) {
          const numericId = orderId.replace(/\D/g, '');
          if (numericId !== orderId) {
            trackingInfo = await this.ithinkAdapter.trackOrder(numericId);
          }
        }
      }

      let shipmentStatus = '';
      if (trackingInfo?.data) {
        const data = trackingInfo.data;
        if (typeof data === 'object') {
          // iThink V3 often returns data keyed by AWB or as an array
          let row: any = null;
          if (Array.isArray(data)) {
            row = data[0];
          } else if (trackingNumber && data[trackingNumber]) {
            row = data[trackingNumber];
          } else {
            // Take first key
            const keys = Object.keys(data);
            if (keys.length > 0) row = data[keys[0]];
          }
          shipmentStatus = row?.shipment_status || row?.status || '';
        }
      }
      
      if (!shipmentStatus) {
        shipmentStatus = trackingInfo?.tracking_data?.shipment_status || trackingInfo?.data?.status || '';
      }

      console.log(`[LogisticsService] Shipment status for order ${orderId}: ${shipmentStatus}`);

      // 2. Decide action based on status
      if (!shipmentStatus || shipmentStatus.toLowerCase() === 'unshipped' || shipmentStatus.toLowerCase().includes('pending') || shipmentStatus.toLowerCase().includes('manifested')) {
        // Shipment not created or in early stage - try to cancel
        console.log(`[LogisticsService] Shipment unshipped or manifested. Attempting to cancel.`);
        
        // Use tracking number if available
        const awb = trackingNumber || trackingInfo?.tracking_data?.awb_no || trackingInfo?.data?.awb_no || trackingInfo?.data?.awb;
        if (awb) {
          console.log(`[LogisticsService] Using AWB ${awb} for cancellation of order ${orderId}`);
          return await this.ithinkAdapter.cancelOrder(orderId, awb);
        }
        
        return await this.ithinkAdapter.cancelOrder(orderId);
      } else if (shipmentStatus.toLowerCase().includes('picked') || shipmentStatus.toLowerCase().includes('transit')) {
        // Shipment picked or in transit - initiate RTO
        console.log(`[LogisticsService] Shipment picked or in transit. Initiating RTO.`);
        
        // Use tracking number from tracking info if missing
        const awb = trackingNumber || trackingInfo?.tracking_data?.awb_no || trackingInfo?.data?.awb_no;
        if (!awb) {
          throw new Error('AWB (tracking number) required to initiate RTO');
        }

        const rtoPayload = {
          shipments: [
            {
              awb_numbers: awb,
              ndr_action: '3', // RTO action
              rto_remark: `RTO requested due to order cancellation for ${orderId}`
            }
          ]
        };

        return await this.ithinkAdapter.addNdrReattemptOrRto(rtoPayload);
      } else {
        // Unknown or other status - attempt standard cancellation as fallback
        console.warn(`[LogisticsService] Unknown shipment status '${shipmentStatus}' for order ${orderId}. Attempting standard cancellation.`);
        return await this.ithinkAdapter.cancelOrder(orderId);
      }
    } catch (error: any) {
      console.error(`[LogisticsService] Error handling logistics cancellation for order ${orderId}:`, error);
      // We don't want to block the entire cancellation flow if logistics fail, 
      // but we should inform that it might need manual check.
      return { error: true, message: error.message };
    }
  }
}

export const logisticsService = new LogisticsService();
