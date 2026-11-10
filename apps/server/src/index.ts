import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import type { ApiResponse, MenuItem, User } from '@best-cream/shared';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Sample in-memory ice cream shop data
const menuItems: MenuItem[] = [
  { id: '1', name: 'Vanilla Bean Bliss', flavor: 'Vanilla', price: 4.5, inStock: true },
  { id: '2', name: 'Dark Chocolate Fudge', flavor: 'Chocolate', price: 5.0, inStock: true },
  { id: '3', name: 'Strawberry Swirl', flavor: 'Strawberry', price: 4.75, inStock: false },
  { id: '4', name: 'Pistachio Crunch', flavor: 'Pistachio', price: 5.5, inStock: true },
];

const users: User[] = [
  { id: '1', name: 'Alex Johnson', email: 'alex@bestcream.com', role: 'admin' },
  { id: '2', name: 'Sam Rivera', email: 'sam@bestcream.com', role: 'customer' },
];

app.get('/api/health', (_req: Request, res: Response<ApiResponse<{ status: string; esm: boolean }>>) => {
  res.json({
    success: true,
    data: {
      status: 'Server is running smoothly',
      esm: true,
    },
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/menu', (_req: Request, res: Response<ApiResponse<MenuItem[]>>) => {
  res.json({
    success: true,
    data: menuItems,
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/users', (_req: Request, res: Response<ApiResponse<User[]>>) => {
  res.json({
    success: true,
    data: users,
    timestamp: new Date().toISOString(),
  });
});

app.listen(PORT, () => {
  console.log(`🍦 Best Cream API running on http://localhost:${PORT}`);
});

