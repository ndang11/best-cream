/**
 * socket.ts — Best Cream Socket.IO client singleton
 *
 * Usage:
 *   import { getSocket, connectSocket, disconnectSocket } from '../lib/socket';
 *
 *   // Connect once (e.g. in App.tsx or when the user logs in)
 *   connectSocket('http://192.168.x.x:5000');
 *
 *   // Inside a component / hook
 *   const socket = getSocket();
 *   socket?.on('order:status_updated', (order) => { ... });
 *
 *   // Disconnect on logout / app background
 *   disconnectSocket();
 */

import { io, Socket } from 'socket.io-client';

// ─── Singleton instance ───────────────────────────────────────────────────────
let _socket: Socket | null = null;

/**
 * Connect (or return an already-connected) socket.
 * Call this once from App.tsx after you have resolved the API_URL.
 */
export function connectSocket(serverUrl: string): Socket {
  if (_socket && _socket.connected) return _socket;

  // Tear down any stale disconnected socket before creating a fresh one
  if (_socket) {
    _socket.removeAllListeners();
    _socket.disconnect();
  }

  _socket = io(serverUrl, {
    transports: ['websocket'], // skip long-polling for React Native
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1_000,
    reconnectionDelayMax: 10_000,
    timeout: 20_000,
  });

  _socket.on('connect', () => {
    console.log(`🔌 Socket connected → ${serverUrl} (id: ${_socket?.id})`);
  });

  _socket.on('disconnect', (reason) => {
    console.log(`🔌 Socket disconnected: ${reason}`);
  });

  _socket.on('connect_error', (err) => {
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
 * Call on logout or when the user leaves the authenticated part of the app.
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
// These provide auto-complete for the events emitted by the server.

export type SocketEvent =
  | 'order:created'       // payload: Order
  | 'order:status_updated' // payload: Order
  | 'orders:updated'      // payload: Order[]
  | 'settings:updated';   // payload: BusinessSettings

/**
 * Subscribe to a typed server event.
 * Returns an unsubscribe function — call it in your useEffect cleanup.
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
  return () => socket.off(event, handler as (...args: unknown[]) => void);
}
