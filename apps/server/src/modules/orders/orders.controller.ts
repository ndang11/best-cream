import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { ApiResponse, Order, OrderStatus, AdminNotification } from '@best-cream/shared';
import { DataStoreService } from '../common/datastore.service.js';
import { RolesGuard, Roles } from '../common/roles.guard.js';
import { AppGateway } from '../socket/socket.gateway.js';
import { SupabaseService } from '../common/infra.service.js';

const STATUS_MESSAGES: Record<OrderStatus, string> = {
  pending: 'Your order has been received and is awaiting confirmation.',
  accepted: '✅ Great news! Your order has been accepted and will be prepared shortly.',
  rejected: '❌ Unfortunately your order has been rejected. Please contact us for details.',
  cancelled: '🚫 Your order has been cancelled.',
  preparing: '👨‍🍳 Your order is now being prepared in the kitchen!',
  ready: '🎉 Your order is ready! Come pick it up at the counter.',
  'out-for-delivery': '🛵 Your order is on its way! Our delivery rider is heading to you.',
  completed: '✅ Order completed! Thank you for choosing Best Cream. Enjoy!',
  approved: '✅ Great news! Your order has been accepted and will be prepared shortly.',
  received: '✅ Order completed! Thank you for choosing Best Cream. Enjoy!',
};

@Controller('api')
@UseGuards(RolesGuard)
export class OrdersController {
  constructor(
    private readonly dataStore: DataStoreService,
    private readonly gateway: AppGateway,
    private readonly supabaseService: SupabaseService,
  ) {}

  @Get('orders')
  async getOrders(): Promise<ApiResponse<Order[]>> {
    // Sync with Supabase if table exists
    try {
      const { data: supaOrders } = await this.supabaseService.client
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (supaOrders && supaOrders.length > 0) {
        for (const row of supaOrders) {
          const exists = this.dataStore.orders.find((o) => o.id === row.id);
          if (!exists) {
            this.dataStore.orders.push({
              id: row.id,
              customerName: row.customer_name,
              items: row.items || [],
              totalAmount: row.total_amount,
              paymentMethod: row.payment_method,
              phoneNumber: row.phone_number,
              paymentStatus: row.payment_status || 'paid',
              status: row.status,
              statusHistory: row.status_history || [{ status: row.status, changedAt: row.created_at }],
              createdAt: row.created_at,
              deliveryAddress: row.delivery_address,
              distanceKm: row.distance_km,
              deliveryFee: row.delivery_fee,
              latitude: row.latitude,
              longitude: row.longitude,
            });
          }
        }
      }
    } catch (_) {}

    return {
      success: true,
      data: this.dataStore.orders,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('orders')
  async createOrder(@Body() body: any): Promise<ApiResponse<Order>> {
    const {
      customerName,
      items,
      paymentMethod,
      phoneNumber,
      deliveryAddress,
      distanceKm,
      deliveryFee,
      latitude,
      longitude,
    } = body;

    if (!items || !items.length) {
      throw new HttpException(
        {
          success: false,
          data: null,
          message: 'Order must contain at least one item',
          timestamp: new Date().toISOString(),
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const subtotal = items.reduce((sum: number, item: any) => sum + item.price * item.quantity, 0);
    const calculatedDeliveryFee = deliveryAddress ? (Number(deliveryFee) || 0) : 0;
    const finalTotal = subtotal + calculatedDeliveryFee;
    const nowIso = new Date().toISOString();

    const newOrder: Order = {
      id: `ORD-${Date.now().toString().slice(-4)}`,
      customerName: customerName || 'Valued Guest',
      items,
      totalAmount: finalTotal,
      paymentMethod: paymentMethod || 'mtn-momo',
      phoneNumber: phoneNumber || '+237 670 000 000',
      paymentStatus: 'pending',
      status: 'pending',
      statusHistory: [{ status: 'pending', changedAt: nowIso }],
      createdAt: nowIso,
      deliveryAddress: deliveryAddress || undefined,
      distanceKm: distanceKm ? Number(distanceKm) : undefined,
      deliveryFee: calculatedDeliveryFee || undefined,
      latitude: latitude ? Number(latitude) : undefined,
      longitude: longitude ? Number(longitude) : undefined,
    };

    this.dataStore.orders.unshift(newOrder);

    // Save to Supabase
    try {
      await this.supabaseService.client.from('orders').insert({
        id: newOrder.id,
        customer_name: newOrder.customerName,
        items: newOrder.items,
        total_amount: newOrder.totalAmount,
        payment_method: newOrder.paymentMethod,
        phone_number: newOrder.phoneNumber,
        status: newOrder.status,
        payment_status: newOrder.paymentStatus,
        status_history: newOrder.statusHistory,
        delivery_address: newOrder.deliveryAddress,
        distance_km: newOrder.distanceKm,
        delivery_fee: newOrder.deliveryFee,
        latitude: newOrder.latitude,
        longitude: newOrder.longitude,
        created_at: nowIso,
      });
    } catch (_) {}

    // Admin notification
    const newNotif: AdminNotification = {
      id: `notif-${Date.now()}`,
      title: 'New Order Placed',
      message: `Order ${newOrder.id} placed by ${newOrder.customerName} for ${newOrder.totalAmount.toLocaleString()} XAF.`,
      type: 'order',
      read: false,
      createdAt: nowIso,
      orderId: newOrder.id,
    };
    this.dataStore.notifications.unshift(newNotif);

    // 🔴 Real-time WebSocket broadcast
    this.gateway.broadcastOrderCreated(newOrder, this.dataStore.orders);

    return {
      success: true,
      data: newOrder,
      message: 'Order placed successfully! Waiting for admin approval.',
      timestamp: nowIso,
    };
  }

  @Patch('orders/:id/status')
  async updateOrderStatus(
    @Param('id') id: string,
    @Body() body: { status: OrderStatus; note?: string },
  ): Promise<ApiResponse<Order>> {
    const { status, note } = body;
    const validStatuses: OrderStatus[] = [
      'pending',
      'accepted',
      'rejected',
      'cancelled',
      'preparing',
      'ready',
      'out-for-delivery',
      'completed',
    ];

    if (!validStatuses.includes(status)) {
      throw new HttpException(
        {
          success: false,
          data: null,
          message: `Invalid status: "${status}". Valid statuses: ${validStatuses.join(', ')}`,
          timestamp: new Date().toISOString(),
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const order = this.dataStore.orders.find((o) => o.id === id);
    if (!order) {
      throw new HttpException(
        {
          success: false,
          data: null,
          message: 'Order not found',
          timestamp: new Date().toISOString(),
        },
        HttpStatus.NOT_FOUND,
      );
    }

    const changedAt = new Date().toISOString();
    order.status = status;
    order.statusHistory = order.statusHistory || [];
    order.statusHistory.push({ status, changedAt, note });

    if (status === 'accepted' || status === 'completed') {
      order.paymentStatus = 'paid';
    }

    // Sync status with Supabase
    try {
      await this.supabaseService.client
        .from('orders')
        .update({
          status,
          payment_status: order.paymentStatus,
          status_history: order.statusHistory,
        })
        .eq('id', id);
    } catch (_) {}

    // Customer notification
    const customerNotif: AdminNotification = {
      id: `notif-status-${id}-${Date.now()}`,
      title: `Order ${id} → ${status.replace(/-/g, ' ').toUpperCase()}`,
      message: STATUS_MESSAGES[status],
      type: 'order',
      read: false,
      createdAt: changedAt,
      orderId: id,
    };
    this.dataStore.notifications.unshift(customerNotif);

    // 🔴 Real-time WebSocket broadcast
    this.gateway.broadcastOrderStatusUpdated(order, this.dataStore.orders);

    return {
      success: true,
      data: order,
      message: `Order ${id} updated to "${status}"`,
      timestamp: changedAt,
    };
  }

  @Patch('orders/:id/approve')
  approveOrder(@Param('id') id: string): Promise<ApiResponse<Order>> {
    return this.updateOrderStatus(id, { status: 'accepted' });
  }

  @Patch('orders/:id/receive')
  receiveOrder(@Param('id') id: string): Promise<ApiResponse<Order>> {
    return this.updateOrderStatus(id, { status: 'completed' });
  }

  @Delete('orders/:id')
  deleteOrder(@Param('id') id: string): ApiResponse<{ id: string }> {
    const index = this.dataStore.orders.findIndex((o) => o.id === id);
    if (index === -1) {
      throw new HttpException(
        {
          success: false,
          data: null,
          message: 'Order not found',
          timestamp: new Date().toISOString(),
        },
        HttpStatus.NOT_FOUND,
      );
    }

    const removed = this.dataStore.orders.splice(index, 1)[0];
    return {
      success: true,
      data: { id: removed.id },
      message: `Order ${id} deleted successfully`,
      timestamp: new Date().toISOString(),
    };
  }
}

