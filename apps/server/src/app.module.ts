import { Module } from '@nestjs/common';
import { SupabaseService, CloudinaryService } from './modules/common/infra.service.js';
import { DataStoreService } from './modules/common/datastore.service.js';
import { RolesGuard } from './modules/common/roles.guard.js';
import { AppGateway } from './modules/socket/socket.gateway.js';
import { MenuController } from './modules/menu/menu.controller.js';
import { OrdersController } from './modules/orders/orders.controller.js';
import { ProfileController } from './modules/profile/profile.controller.js';
import { SettingsController } from './modules/settings/settings.controller.js';
import { AuthController } from './modules/auth/auth.controller.js';
import { AdminController } from './modules/admin/admin.controller.js';

@Module({
  imports: [],
  controllers: [
    MenuController,
    OrdersController,
    ProfileController,
    SettingsController,
    AuthController,
    AdminController,
  ],
  providers: [
    SupabaseService,
    CloudinaryService,
    DataStoreService,
    RolesGuard,
    AppGateway,
  ],
  exports: [
    SupabaseService,
    CloudinaryService,
    DataStoreService,
    AppGateway,
  ],
})
export class AppModule {}

