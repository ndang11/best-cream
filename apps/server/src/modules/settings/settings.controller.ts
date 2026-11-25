import {
  Controller,
  Get,
  Put,
  Body,
  UseGuards,
} from '@nestjs/common';
import type { BusinessSettings } from '@best-cream/shared';
import { DataStoreService } from '../common/datastore.service.js';
import { RolesGuard, Roles } from '../common/roles.guard.js';
import { AppGateway } from '../socket/socket.gateway.js';
import { SupabaseService } from '../common/infra.service.js';

@Controller('api')
@UseGuards(RolesGuard)
export class SettingsController {
  constructor(
    private readonly dataStore: DataStoreService,
    private readonly gateway: AppGateway,
    private readonly supabaseService: SupabaseService,
  ) {}

  @Get('settings')
  async getSettings() {
    try {
      const { data, error } = await this.supabaseService.client.from('settings').select('*').limit(1).single();
      if (!error && data) {
        this.dataStore.businessSettings = {
          ...this.dataStore.businessSettings,
          businessName: data.business_name || this.dataStore.businessSettings.businessName,
          logoUrl: data.logo_url || this.dataStore.businessSettings.logoUrl,
          phone: data.phone || this.dataStore.businessSettings.phone,
          email: data.email || this.dataStore.businessSettings.email,
          address: data.address || this.dataStore.businessSettings.address,
          openingTime: data.opening_time || this.dataStore.businessSettings.openingTime,
          closingTime: data.closing_time || this.dataStore.businessSettings.closingTime,
          operatingDays: data.operating_days || this.dataStore.businessSettings.operatingDays,
          isDeliveryAvailable: data.is_delivery_available ?? this.dataStore.businessSettings.isDeliveryAvailable,
          baseDeliveryFee: data.base_delivery_fee ?? this.dataStore.businessSettings.baseDeliveryFee,
          minOrderAmount: data.min_order_amount ?? this.dataStore.businessSettings.minOrderAmount,
          isPickupAvailable: data.is_pickup_available ?? this.dataStore.businessSettings.isPickupAvailable,
          tagline: data.tagline || this.dataStore.businessSettings.tagline,
          updatedAt: data.updated_at || this.dataStore.businessSettings.updatedAt,
        };
      }
    } catch (_) {}

    return {
      success: true,
      data: this.dataStore.businessSettings,
      timestamp: new Date().toISOString(),
    };
  }

  @Put('admin/settings')
  @Roles('admin')
  async updateSettings(@Body() incoming: Partial<BusinessSettings>) {
    const now = new Date().toISOString();

    this.dataStore.businessSettings = {
      ...this.dataStore.businessSettings,
      businessName: incoming.businessName !== undefined ? String(incoming.businessName).trim() : this.dataStore.businessSettings.businessName,
      logoUrl: incoming.logoUrl !== undefined ? String(incoming.logoUrl).trim() : this.dataStore.businessSettings.logoUrl,
      phone: incoming.phone !== undefined ? String(incoming.phone).trim() : this.dataStore.businessSettings.phone,
      email: incoming.email !== undefined ? String(incoming.email).trim().toLowerCase() : this.dataStore.businessSettings.email,
      address: incoming.address !== undefined ? String(incoming.address).trim() : this.dataStore.businessSettings.address,
      openingTime: incoming.openingTime !== undefined ? String(incoming.openingTime).trim() : this.dataStore.businessSettings.openingTime,
      closingTime: incoming.closingTime !== undefined ? String(incoming.closingTime).trim() : this.dataStore.businessSettings.closingTime,
      operatingDays: Array.isArray(incoming.operatingDays) && incoming.operatingDays.length > 0 ? incoming.operatingDays : this.dataStore.businessSettings.operatingDays,
      isDeliveryAvailable: incoming.isDeliveryAvailable !== undefined ? Boolean(incoming.isDeliveryAvailable) : this.dataStore.businessSettings.isDeliveryAvailable,
      baseDeliveryFee: incoming.baseDeliveryFee !== undefined ? Math.max(0, Number(incoming.baseDeliveryFee)) : this.dataStore.businessSettings.baseDeliveryFee,
      minOrderAmount: incoming.minOrderAmount !== undefined ? Math.max(0, Number(incoming.minOrderAmount)) : this.dataStore.businessSettings.minOrderAmount,
      isPickupAvailable: incoming.isPickupAvailable !== undefined ? Boolean(incoming.isPickupAvailable) : this.dataStore.businessSettings.isPickupAvailable,
      tagline: incoming.tagline !== undefined ? String(incoming.tagline).trim() : this.dataStore.businessSettings.tagline,
      updatedAt: now,
    };

    try {
      await this.supabaseService.client.from('settings').upsert({
        id: '1',
        business_name: this.dataStore.businessSettings.businessName,
        logo_url: this.dataStore.businessSettings.logoUrl,
        phone: this.dataStore.businessSettings.phone,
        email: this.dataStore.businessSettings.email,
        address: this.dataStore.businessSettings.address,
        opening_time: this.dataStore.businessSettings.openingTime,
        closing_time: this.dataStore.businessSettings.closingTime,
        operating_days: this.dataStore.businessSettings.operatingDays,
        is_delivery_available: this.dataStore.businessSettings.isDeliveryAvailable,
        base_delivery_fee: this.dataStore.businessSettings.baseDeliveryFee,
        min_order_amount: this.dataStore.businessSettings.minOrderAmount,
        is_pickup_available: this.dataStore.businessSettings.isPickupAvailable,
        tagline: this.dataStore.businessSettings.tagline,
        updated_at: now,
      });
    } catch (_) {}

    // 🔴 Real-time WebSocket broadcast
    this.gateway.broadcastSettingsUpdated(this.dataStore.businessSettings);

    return {
      success: true,
      data: this.dataStore.businessSettings,
      message: 'Business settings updated successfully',
      timestamp: now,
    };
  }
}

