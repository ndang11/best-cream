import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { ApiResponse, MenuItem, ProductTopping, ProductReview } from '@best-cream/shared';
import { DataStoreService } from '../common/datastore.service.js';
import { RolesGuard, Roles } from '../common/roles.guard.js';
import { SupabaseService } from '../common/infra.service.js';

@Controller('api')
@UseGuards(RolesGuard)
export class MenuController {
  constructor(
    private readonly dataStore: DataStoreService,
    private readonly supabaseService: SupabaseService,
  ) {}

  @Get('health')
  getHealth() {
    return {
      success: true,
      data: { status: 'healthy', framework: 'NestJS' },
      message: 'Best Cream NestJS API is up and running!',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('menu')
  getMenu(): ApiResponse<MenuItem[]> {
    return {
      success: true,
      data: this.dataStore.menuItems,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('menu')
  @Roles('admin')
  createMenuItem(@Body() body: any): ApiResponse<MenuItem> {
    const { name, category, flavor, description, price, imageUrl, rating, isSpecialOffer, offerTag, isActive, isArchived } = body;
    if (!name || !category || !price) {
      throw new HttpException(
        {
          success: false,
          data: null,
          message: 'Missing required fields: name, category, and price are required',
          timestamp: new Date().toISOString(),
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const newItem: MenuItem = {
      id: String(Date.now()),
      name,
      category,
      flavor: flavor || name,
      description: description || '',
      price: Number(price),
      inStock: true,
      rating: rating ? Number(rating) : 5.0,
      imageUrl: imageUrl || 'https://images.unsplash.com/photo-1570197788417-0e82375c9371?w=500&auto=format&fit=crop&q=80',
      isSpecialOffer: Boolean(isSpecialOffer),
      offerTag: offerTag || undefined,
      isActive: isActive !== undefined ? Boolean(isActive) : true,
      isArchived: isArchived !== undefined ? Boolean(isArchived) : false,
    };

    this.dataStore.menuItems.unshift(newItem);

    return {
      success: true,
      data: newItem,
      message: `Product "${newItem.name}" created successfully`,
      timestamp: new Date().toISOString(),
    };
  }

  @Patch('menu/:id')
  @Roles('admin', 'sales')
  updateMenuItem(@Param('id') id: string, @Body() body: Partial<MenuItem>): ApiResponse<MenuItem> {
    const item = this.dataStore.menuItems.find((m) => m.id === id);
    if (!item) {
      throw new HttpException(
        {
          success: false,
          data: null,
          message: 'Menu item not found',
          timestamp: new Date().toISOString(),
        },
        HttpStatus.NOT_FOUND,
      );
    }

    if (body.name !== undefined) item.name = body.name;
    if (body.flavor !== undefined) item.flavor = body.flavor;
    if (body.description !== undefined) item.description = body.description;
    if (body.price !== undefined) item.price = Number(body.price);
    if (body.inStock !== undefined) item.inStock = Boolean(body.inStock);
    if (body.isSpecialOffer !== undefined) item.isSpecialOffer = Boolean(body.isSpecialOffer);
    if (body.offerTag !== undefined) item.offerTag = body.offerTag;
    if (body.imageUrl !== undefined) item.imageUrl = body.imageUrl;
    if (body.category !== undefined) item.category = body.category;
    if (body.isActive !== undefined) item.isActive = Boolean(body.isActive);
    if (body.isArchived !== undefined) item.isArchived = Boolean(body.isArchived);

    return {
      success: true,
      data: item,
      message: `Menu item "${item.name}" updated successfully`,
      timestamp: new Date().toISOString(),
    };
  }

  @Delete('menu/:id')
  @Roles('admin')
  deleteMenuItem(@Param('id') id: string): ApiResponse<{ id: string }> {
    const index = this.dataStore.menuItems.findIndex((m) => m.id === id);
    if (index === -1) {
      throw new HttpException(
        {
          success: false,
          data: null,
          message: 'Menu item not found',
          timestamp: new Date().toISOString(),
        },
        HttpStatus.NOT_FOUND,
      );
    }

    const removed = this.dataStore.menuItems.splice(index, 1)[0];
    return {
      success: true,
      data: { id: removed.id },
      message: `Menu item "${removed.name}" deleted successfully`,
      timestamp: new Date().toISOString(),
    };
  }

  // ── Toppings ───────────────────────────────────────────────────────────────
  @Get('toppings')
  getToppings() {
    return {
      success: true,
      data: this.dataStore.liveToppings,
      timestamp: new Date().toISOString(),
    };
  }

  @Patch('toppings/:id/toggle')
  @Roles('admin', 'sales')
  toggleToppingStock(@Param('id') id: string, @Body() body: { inStock?: boolean }) {
    const topping = this.dataStore.liveToppings.find((t) => t.id === id);
    if (!topping) {
      throw new HttpException(
        { success: false, message: 'Topping not found' },
        HttpStatus.NOT_FOUND,
      );
    }
    topping.inStock = body.inStock !== undefined ? Boolean(body.inStock) : !topping.inStock;
    return {
      success: true,
      data: topping,
      message: `Topping "${topping.name}" is now ${topping.inStock ? 'in stock' : 'out of stock'}`,
      timestamp: new Date().toISOString(),
    };
  }

  // ── Favorites ─────────────────────────────────────────────────────────────
  @Get('favorites')
  getFavorites(@Body() body: any) {
    const email = (body?.email || 'customer@bestcream.com').toLowerCase().trim();
    const set = this.dataStore.liveFavorites.get(email) || new Set<string>();
    return {
      success: true,
      favorites: Array.from(set),
      timestamp: new Date().toISOString(),
    };
  }

  @Post('favorites/toggle')
  toggleFavorite(@Body() body: { email?: string; productId?: string }) {
    const { email: rawEmail, productId } = body;
    if (!productId) {
      throw new HttpException(
        { success: false, message: 'productId is required' },
        HttpStatus.BAD_REQUEST,
      );
    }
    const email = (rawEmail || 'customer@bestcream.com').toLowerCase().trim();
    let set = this.dataStore.liveFavorites.get(email);
    if (!set) {
      set = new Set<string>();
      this.dataStore.liveFavorites.set(email, set);
    }
    const isFavorite = set.has(productId);
    if (isFavorite) {
      set.delete(productId);
    } else {
      set.add(productId);
    }
    return {
      success: true,
      isFavorite: !isFavorite,
      favorites: Array.from(set),
      message: !isFavorite ? 'Added to favorites' : 'Removed from favorites',
      timestamp: new Date().toISOString(),
    };
  }

  // ── Reviews ───────────────────────────────────────────────────────────────
  @Get('products/:id/reviews')
  getProductReviews(@Param('id') id: string) {
    const productReviews = this.dataStore.liveReviews.filter((r) => r.productId === id);
    const avgRating = productReviews.length
      ? Number((productReviews.reduce((sum, r) => sum + r.rating, 0) / productReviews.length).toFixed(1))
      : 5.0;

    return {
      success: true,
      productId: id,
      averageRating: avgRating,
      totalReviews: productReviews.length,
      reviews: productReviews,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('products/:id/reviews')
  addProductReview(
    @Param('id') id: string,
    @Body() body: { userName?: string; rating?: number; comment?: string },
  ) {
    const { userName, rating, comment } = body;
    if (!rating || !comment?.trim()) {
      throw new HttpException(
        { success: false, message: 'Rating (1-5) and comment are required.' },
        HttpStatus.BAD_REQUEST,
      );
    }
    const newRev: ProductReview = {
      id: `rev-${Date.now()}`,
      productId: id,
      userName: userName?.trim() || 'Sweet Tooth Customer',
      rating: Math.min(5, Math.max(1, Math.round(Number(rating)))),
      comment: comment.trim(),
      createdAt: new Date().toISOString(),
    };
    this.dataStore.liveReviews.unshift(newRev);

    return {
      success: true,
      data: newRev,
      message: 'Thank you for your delicious review! ⭐',
      timestamp: new Date().toISOString(),
    };
  }
}
