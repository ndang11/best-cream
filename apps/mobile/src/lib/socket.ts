/**
 * socket.ts — Best Cream Socket.IO client singleton
 *
 * Features:
 *  - Singleton: one connection shared across the whole app
 *  - Authenticated: passes auth token in socket.handshake.auth.token
 *  - Auto-reconnect: retries forever with exponential back-off
 *  - Typed helpers: onSocketEvent() returns a cleanup fn for useEffect
 *
 * Usage:
 *   // 1. Connect once after the user logs in (pass their token)
 *   connectSocket('http://192.168.x.x:5000', 'bestcream-admin-session-token');
 *
 *   // 2. Subscribe in a component
 *   useEffect(() => {
 *     return onSocketEvent('order:status_updated', (order) => {
 *       setOrder(order);
 *     });
 *   }, []);
 *
 *   // 3. Disconnect on logout
 *   disconnectSocket();
 */

import { io, Socket } from 'socket.io-client';

// ─── Singleton instance ───────────────────────────────────────────────────────
let _socket: Socket | null = null;

/**
 * Connect (or reconnect) the socket with an optional auth token.
 *
 * - If a socket already exists and is connected with the same token, it is
 *   returned as-is (idempotent).
 * - If the token changes (e.g. after re-login), the old socket is torn down
 *   and a fresh one is created.
 *
 * @param serverUrl  Full URL of the backend, e.g. "http://192.168.1.42:5000"
 * @param token      Auth token returned by /api/auth/login (access_token field).
 *                   Pass undefined for unauthenticated / guest connections.
 */
export function connectSocket(serverUrl: string, token?: string): Socket {
  // If already connected with the same identity, reuse the connection
  if (_socket && _socket.connected && _socket.auth && ((_socket.auth as Record<string, unknown>).token ?? undefined) === token) {
    return _socket;
  }

  // Tear down any stale / mismatched socket
  if (_socket) {
    _socket.removeAllListeners();
    _socket.disconnect();
    _socket = null;
  }

  _socket = io(serverUrl, {
    transports: ['websocket'],      // skip long-polling — faster for React Native
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1_000,
    reconnectionDelayMax: 10_000,
    timeout: 20_000,
    // ── Token-based auth ──────────────────────────────────────────────────────
    // Server reads this in io.use() middleware via socket.handshake.auth.token
    auth: token ? { token } : {},
  });

  _socket.on('connect', () => {
    console.log(`🔌 Socket connected → ${serverUrl} (id: ${_socket?.id})`);
  });

  _socket.on('disconnect', (reason) => {
    console.log(`🔌 Socket disconnected: ${reason}`);
  });

  _socket.on('connect_error', (err) => {
    // "Authentication failed" comes here when the server rejects the token
    console.warn(`🔌 Socket connect_error: ${err.message}`);
  });

  return _socket;
}

/**
 * Returns the current socket instance (or null if never connected).
 */
export function getSocket(): Socket | null {
  return _socket;
}

/**
 * Disconnect and clean up the socket.
 * Call this on logout so the old authenticated session is fully closed.
 */
export function disconnectSocket(): void {
  if (_socket) {
    _socket.removeAllListeners();
    _socket.disconnect();
    _socket = null;
    console.log('🔌 Socket disconnected and cleaned up.');
  }
}

// ─── Typed event helpers ──────────────────────────────────────────────────────

export type SocketEvent =
  | 'order:created'        // payload: Order  — a new order was placed
  | 'order:status_updated' // payload: Order  — an order status changed
  | 'orders:updated'       // payload: Order[] — full order list refresh
  | 'settings:updated';    // payload: BusinessSettings — admin updated settings

/**
 * Subscribe to a typed server event.
 * Returns an **unsubscribe** function — always use it as your useEffect return.
 *
 * @example
 *   useEffect(() => {
 *     return onSocketEvent('order:status_updated', (order) => {
 *       setTrackedOrder(order);
 *     });
 *   }, []);
 */
export function onSocketEvent<T = unknown>(
  event: SocketEvent,
  handler: (data: T) => void
): () => void {
  const socket = getSocket();
  if (!socket) {
    console.warn(`[socket] Cannot subscribe to "${event}" — socket not connected.`);
    return () => {};
  }
  socket.on(event, handler as (...args: unknown[]) => void);
  // Return a cleanup function that removes exactly this handler
  return () => socket.off(event, handler as (...args: unknown[]) => void);
}
