import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { SupabaseService } from '../common/infra.service.js';

const STATIC_TOKENS = new Set([
  'bestcream-admin-session-token',
  'bestcream-sales-session-token',
  'bestcream-demo-session-token',
  'bestcream-session-token',
]);

@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
  },
})
export class AppGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(AppGateway.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  afterInit(server: Server) {
    this.logger.log('🔌 NestJS Socket.IO Gateway Initialized');

    // Attach authentication middleware
    server.use(async (socket: Socket, next) => {
      const token = socket.handshake.auth?.token as string | undefined;

      if (!token) {
        socket.data.role = 'guest';
        socket.data.userId = null;
        return next();
      }

      if (STATIC_TOKENS.has(token)) {
        if (token === 'bestcream-admin-session-token') {
          socket.data.role = 'admin';
          socket.data.userId = 'admin-1';
        } else if (token === 'bestcream-sales-session-token') {
          socket.data.role = 'sales';
          socket.data.userId = 'sales-1';
        } else {
          socket.data.role = 'customer';
          socket.data.userId = 'demo';
        }
        return next();
      }

      try {
        const { data: { user }, error } = await this.supabaseService.client.auth.getUser(token);
        if (!error && user) {
          const { role } = await this.supabaseService.getUserProfileAndRole(user);
          socket.data.role = role;
          socket.data.userId = user.id;
          socket.data.email = user.email;
          return next();
        }
      } catch {
        // Fall through
      }

      this.logger.warn(`🔌 Socket auth rejected (invalid token) from ${socket.handshake.address}`);
      return next(new Error('Authentication failed: invalid or expired token.'));
    });
  }

  handleConnection(socket: Socket) {
    const role = socket.data.role ?? 'guest';
    const userId = socket.data.userId ?? 'unknown';
    this.logger.log(`🔌 Socket connected [${role}] userId=${userId} id=${socket.id}`);

    socket.join('public');
    if (role === 'admin') socket.join('admin');
    if (role === 'sales') socket.join('sales');
    if (role === 'staff') socket.join('staff');
    if (role === 'customer' && userId) socket.join(`customer:${userId}`);
  }

  handleDisconnect(socket: Socket) {
    const role = socket.data.role ?? 'guest';
    this.logger.log(`🔌 Socket disconnected [${role}] id=${socket.id}`);
  }

  // Real-time broadcast helpers
  broadcastOrderCreated(order: any, allOrders: any[]) {
    this.server.emit('order:created', order);
    this.server.emit('orders:updated', allOrders);
  }

  broadcastOrderStatusUpdated(order: any, allOrders: any[]) {
    this.server.emit('order:status_updated', order);
    this.server.emit('orders:updated', allOrders);
  }

  broadcastSettingsUpdated(settings: any) {
    this.server.emit('settings:updated', settings);
  }
}

