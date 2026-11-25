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
import type {
  AdminNotification,
  SalesAnalytics,
  CustomerRecord,
  PaymentTransaction,
  DailyMenu,
  DailyMenuItemOverride,
  Order,
} from '@best-cream/shared';
import { DataStoreService } from '../common/datastore.service.js';
import { RolesGuard, Roles } from '../common/roles.guard.js';
import { CloudinaryService, SupabaseService } from '../common/infra.service.js';

@Controller('api')
@UseGuards(RolesGuard)
export class AdminController {
  constructor(
    private readonly dataStore: DataStoreService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly supabaseService: SupabaseService,
  ) {}

  // ── Image Upload (Cloudinary) ─────────────────────────────────────────────
  @Post('admin/upload-image')
  @Roles('admin', 'sales')
  async uploadImage(@Body() body: { image?: string; base64?: string }) {
    const raw = body.image || body.base64;
    if (!raw) {
      throw new HttpException({ success: false, message: 'Image data is required' }, HttpStatus.BAD_REQUEST);
    }

    try {
      const url = await this.cloudinaryService.uploadImage(raw, 'best-cream/menu');
      return {
        success: true,
        data: { url },
        message: 'Image uploaded successfully to Cloudinary',
        timestamp: new Date().toISOString(),
      };
    } catch (err: any) {
      throw new HttpException(
        { success: false, message: err?.message || 'Failed to upload image' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ── Admin Notifications ───────────────────────────────────────────────────
  @Get('admin/notifications')
  @Roles('admin', 'sales')
  getNotifications() {
    const unreadCount = this.dataStore.notifications.filter((n) => !n.read).length;
    return {
      success: true,
      data: {
        notifications: this.dataStore.notifications,
        unreadCount,
      },
      timestamp: new Date().toISOString(),
    };
  }

  @Patch('admin/notifications/:id/read')
  @Roles('admin', 'sales')
  markNotificationRead(@Param('id') id: string) {
    const notif = this.dataStore.notifications.find((n) => n.id === id);
    if (notif) notif.read = true;
    return {
      success: true,
      data: notif,
      message: `Notification ${id} marked as read`,
      timestamp: new Date().toISOString(),
    };
  }

  @Patch('admin/notifications/mark-all-read')
  @Roles('admin', 'sales')
  markAllNotificationsRead() {
    this.dataStore.notifications.forEach((n) => (n.read = true));
    return {
      success: true,
      data: { unreadCount: 0 },
      message: 'All notifications marked as read',
      timestamp: new Date().toISOString(),
    };
  }

  // ── Analytics ─────────────────────────────────────────────────────────────
  @Get('admin/analytics')
  @Roles('admin', 'sales')
  async getAnalytics(@Query('period') period: 'daily' | 'weekly' | 'monthly' = 'daily') {
    let allOrders = [...this.dataStore.orders];
    try {
      const { data: supaOrders } = await this.supabaseService.client.from('orders').select('*');
      if (supaOrders && Array.isArray(supaOrders) && supaOrders.length > 0) {
        const orderMap = new Map<string, Order>();
        allOrders.forEach((o) => orderMap.set(o.id, o));
        supaOrders.forEach((o: any) => orderMap.set(o.id, o as Order));
        allOrders = Array.from(orderMap.values());
      }
    } catch (_) {}

    let registeredCustomers = this.dataStore.users.filter((u) => u.role === 'customer').length + 18;
    try {
      const { count, error } = await this.supabaseService.client
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'customer');
      if (!error && typeof count === 'number' && count > 0) {
        registeredCustomers = Math.max(count, registeredCustomers);
      }
    } catch (_) {}

    const now = Date.now();
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const startOfTodayMs = startOfToday.getTime();
    const MS_PER_DAY = 24 * 60 * 60 * 1000;
    const sevenDaysAgoMs = now - 7 * MS_PER_DAY;
    const thirtyDaysAgoMs = now - 30 * MS_PER_DAY;

    const isPaid = (status: Order['status']) =>
      status === 'accepted' || status === 'preparing' || status === 'ready' ||
      status === 'out-for-delivery' || status === 'completed' ||
      (status as any) === 'approved' || (status as any) === 'received';

    const salesToday = allOrders
      .filter((o) => new Date(o.createdAt).getTime() >= startOfTodayMs && isPaid(o.status))
      .reduce((sum, o) => sum + o.totalAmount, 0);

    const salesThisWeek = allOrders
      .filter((o) => new Date(o.createdAt).getTime() >= sevenDaysAgoMs && isPaid(o.status))
      .reduce((sum, o) => sum + o.totalAmount, 0);

    const salesThisMonth = allOrders
      .filter((o) => new Date(o.createdAt).getTime() >= thirtyDaysAgoMs && isPaid(o.status))
      .reduce((sum, o) => sum + o.totalAmount, 0);

    const totalRevenue = allOrders
      .filter((o) => isPaid(o.status))
      .reduce((sum, o) => sum + o.totalAmount, 0);

    const totalOrders = allOrders.length;
    const pendingOrders = allOrders.filter((o) => o.status === 'pending').length;
    const completedOrders = allOrders.filter(
      (o) => o.status === 'completed' || (o.status as any) === 'received',
    ).length;

    const chartData = [];
    const daysToShow = period === 'daily' ? 7 : period === 'weekly' ? 14 : 30;

    for (let i = daysToShow - 1; i >= 0; i--) {
      const d = new Date(now - i * MS_PER_DAY);
      const dateStr = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' });

      const dayOrders = allOrders.filter((o) => o.createdAt.slice(0, 10) === dateStr);
      const dayPaid = dayOrders.filter((o) => isPaid(o.status));
      const revenue = dayPaid.reduce((sum, o) => sum + o.totalAmount, 0);

      chartData.push({
        label,
        fullDate: dateStr,
        revenue,
        ordersCount: dayOrders.length,
      });
    }

    const totalPeriodRevenue = chartData.reduce((sum, pt) => sum + pt.revenue, 0);
    const highestRevenueDay = chartData.reduce((prev, curr) => (curr.revenue > prev.revenue ? curr : prev), chartData[0])?.label;

    const analytics: SalesAnalytics = {
      statistics: {
        salesToday,
        salesThisWeek,
        salesThisMonth,
        totalRevenue,
        totalOrders,
        pendingOrders,
        completedOrders,
        registeredCustomers,
      },
      chart: {
        period,
        data: chartData,
        totalPeriodRevenue,
        highestRevenueDay,
      },
    };

    return {
      success: true,
      data: analytics,
      timestamp: new Date().toISOString(),
    };
  }

  // ── Daily Menu Management ─────────────────────────────────────────────────
  @Get('admin/daily-menu')
  @Roles('admin', 'sales')
  getAdminDailyMenus() {
    const sorted = [...this.dataStore.dailyMenus].sort((a, b) => b.date.localeCompare(a.date));
    return { success: true, data: sorted, timestamp: new Date().toISOString() };
  }

  @Get('menu/daily')
  getCustomerDailyMenu() {
    const today = new Date().toISOString().slice(0, 10);
    const menu = this.dataStore.dailyMenus.find((m) => m.date === today && m.isPublished);
    if (!menu) {
      return { success: true, data: null, timestamp: new Date().toISOString() };
    }

    const overrideMap = new Map<string, DailyMenuItemOverride>(
      (menu.items || []).map((it) => [it.menuItemId, it]),
    );

    const resolvedItems = this.dataStore.menuItems.map((base) => {
      const override = overrideMap.get(base.id);
      if (!override) return base;
      return {
        ...base,
        inStock: override.isAvailable !== undefined ? override.isAvailable : base.inStock,
        price: override.dailyPrice !== undefined ? override.dailyPrice : base.price,
      };
    });

    return {
      success: true,
      data: { menu, items: resolvedItems },
      timestamp: new Date().toISOString(),
    };
  }

  @Post('admin/daily-menu')
  @Roles('admin', 'sales')
  createDailyMenu(@Body() body: any) {
    const { date, title, isPublished, items, availableFlavors, notes } = body;
    if (!date) {
      throw new HttpException({ success: false, message: 'date is required' }, HttpStatus.BAD_REQUEST);
    }

    const existing = this.dataStore.dailyMenus.findIndex((m) => m.date === date);
    const now = new Date().toISOString();
    const menu: DailyMenu = {
      id: existing >= 0 ? this.dataStore.dailyMenus[existing].id : `menu-${Date.now()}`,
      date,
      title: title || `Menu for ${date}`,
      isPublished: Boolean(isPublished),
      items: Array.isArray(items) ? items : [],
      availableFlavors: Array.isArray(availableFlavors) ? availableFlavors : [],
      notes: notes || '',
      createdAt: existing >= 0 ? this.dataStore.dailyMenus[existing].createdAt : now,
      updatedAt: now,
    };

    if (existing >= 0) {
      this.dataStore.dailyMenus[existing] = menu;
    } else {
      this.dataStore.dailyMenus.push(menu);
    }

    return { success: true, data: menu, timestamp: now };
  }

  @Put('admin/daily-menu/:id')
  @Roles('admin', 'sales')
  updateDailyMenu(@Param('id') id: string, @Body() body: any) {
    const idx = this.dataStore.dailyMenus.findIndex((m) => m.id === id);
    if (idx < 0) {
      throw new HttpException({ success: false, message: 'Menu not found' }, HttpStatus.NOT_FOUND);
    }

    const now = new Date().toISOString();
    const updated: DailyMenu = {
      ...this.dataStore.dailyMenus[idx],
      ...body,
      id: this.dataStore.dailyMenus[idx].id,
      createdAt: this.dataStore.dailyMenus[idx].createdAt,
      updatedAt: now,
    };
    this.dataStore.dailyMenus[idx] = updated;

    return { success: true, data: updated, timestamp: now };
  }

  @Delete('admin/daily-menu/:id')
  @Roles('admin')
  deleteDailyMenu(@Param('id') id: string) {
    const idx = this.dataStore.dailyMenus.findIndex((m) => m.id === id);
    if (idx < 0) {
      throw new HttpException({ success: false, message: 'Menu not found' }, HttpStatus.NOT_FOUND);
    }
    this.dataStore.dailyMenus.splice(idx, 1);
    return { success: true, data: null, timestamp: new Date().toISOString() };
  }

  // ── Payments & Transactions ───────────────────────────────────────────────
  @Get('admin/payments')
  @Roles('admin', 'sales')
  async getPayments() {
    let sourceOrders: Order[] = [];
    try {
      const { data, error } = await this.supabaseService.client
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data && data.length > 0) {
        sourceOrders = data.map((row: any) => ({
          id: row.id,
          items: typeof row.items === 'string' ? JSON.parse(row.items) : (row.items || []),
          totalAmount: row.total_amount || 0,
          paymentMethod: row.payment_method || 'mtn-momo',
          phoneNumber: row.phone_number || '',
          customerName: row.customer_name || 'Customer',
          paymentStatus: row.payment_status || 'pending',
          status: row.status || 'pending',
          createdAt: row.created_at || new Date().toISOString(),
          deliveryAddress: row.delivery_address,
        }));
      }
    } catch (_) {}

    if (sourceOrders.length === 0) {
      sourceOrders = [...this.dataStore.orders];
    }

    const transactions: PaymentTransaction[] = sourceOrders.map((order) => ({
      id: `txn-${order.id}`,
      transactionRef: `TXN-${order.id}`,
      orderId: order.id,
      customerName: order.customerName || 'Customer',
      phoneNumber: order.phoneNumber || '',
      amount: order.totalAmount,
      paymentMethod: order.paymentMethod,
      status: (order.paymentStatus as PaymentTransaction['status']) || 'pending',
      providerRef: `REF-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
      createdAt: order.createdAt,
      fee: Math.round(order.totalAmount * 0.015),
    }));

    transactions.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    return {
      success: true,
      data: transactions,
      timestamp: new Date().toISOString(),
    };
  }

  // ── Customers ─────────────────────────────────────────────────────────────
  @Get('admin/customers')
  @Roles('admin', 'sales')
  async getCustomers() {
    const customerMap = new Map<string, CustomerRecord>();

    this.dataStore.users
      .filter((u) => u.role === 'customer')
      .forEach((u) => {
        customerMap.set(u.email.toLowerCase(), {
          id: u.id,
          name: u.name,
          email: u.email,
          phone: u.phone || '+237 670 000 000',
          role: 'customer',
          ordersCount: 0,
          totalSpent: 0,
          registeredAt: new Date(Date.now() - 30 * 86400000).toISOString(),
        });
      });

    try {
      const { data: profiles, error: profErr } = await this.supabaseService.client.from('profiles').select('*');
      if (!profErr && profiles && profiles.length > 0) {
        profiles.forEach((p: any) => {
          if (p.role === 'customer' || !p.role) {
            const email = (p.email || '').toLowerCase();
            const existing = customerMap.get(email);
            customerMap.set(email || p.id, {
              id: p.id,
              name: p.full_name || p.name || existing?.name || 'Customer',
              email: p.email || existing?.email || '',
              phone: p.phone || existing?.phone || '+237 670 000 000',
              role: 'customer',
              ordersCount: existing?.ordersCount || 0,
              totalSpent: existing?.totalSpent || 0,
              registeredAt: p.created_at || existing?.registeredAt || new Date().toISOString(),
            });
          }
        });
      }
    } catch (_) {}

    let allOrders: Order[] = [];
    try {
      const { data: dbOrders, error: orderErr } = await this.supabaseService.client.from('orders').select('*');
      if (!orderErr && dbOrders && dbOrders.length > 0) {
        allOrders = dbOrders.map((row: any) => ({
          id: row.id,
          customerName: row.customer_name || 'Customer',
          totalAmount: row.total_amount || 0,
          phoneNumber: row.phone_number || '',
          deliveryAddress: row.delivery_address,
          createdAt: row.created_at || new Date().toISOString(),
          items: [],
          paymentMethod: 'mtn-momo',
          status: row.status || 'pending',
        }));
      }
    } catch (_) {}

    if (allOrders.length === 0) {
      allOrders = [...this.dataStore.orders];
    }

    allOrders.forEach((ord) => {
      const cName = ord.customerName || 'Customer';
      const emailGuess = cName.toLowerCase().replace(/\s+/g, '.') + '@gmail.com';
      let match = Array.from(customerMap.values()).find(
        (c) => c.name.toLowerCase() === cName.toLowerCase(),
      );

      if (!match) {
        match = {
          id: `cust-${ord.id}`,
          name: cName,
          email: emailGuess,
          phone: ord.phoneNumber || '+237 670 000 000',
          role: 'customer',
          ordersCount: 0,
          totalSpent: 0,
          deliveryAddress: ord.deliveryAddress,
          registeredAt: ord.createdAt,
        };
        customerMap.set(match.email, match);
      }

      match.ordersCount = (match.ordersCount || 0) + 1;
      match.totalSpent = (match.totalSpent || 0) + ord.totalAmount;
      if (ord.phoneNumber) match.phone = ord.phoneNumber;
      if (ord.deliveryAddress) match.deliveryAddress = ord.deliveryAddress;
      if (!match.lastOrderDate || ord.createdAt > match.lastOrderDate) {
        match.lastOrderDate = ord.createdAt;
      }
    });

    const list = Array.from(customerMap.values());
    list.sort((a, b) => (b.ordersCount || 0) - (a.ordersCount || 0));

    return {
      success: true,
      data: list,
      total: list.length,
      timestamp: new Date().toISOString(),
    };
  }
}
