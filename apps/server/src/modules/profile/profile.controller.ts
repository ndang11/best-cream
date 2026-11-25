import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Query,
  UseGuards,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { DataStoreService, UserProfileData } from '../common/datastore.service.js';
import { CloudinaryService, SupabaseService } from '../common/infra.service.js';

@Controller('api/profile')
export class ProfileController {
  constructor(
    private readonly dataStore: DataStoreService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly supabaseService: SupabaseService,
  ) {}

  @Get()
  async getProfile(@Query('email') rawEmail?: string) {
    const email = (rawEmail || '').toLowerCase().trim();
    if (!email) {
      throw new HttpException({ success: false, message: 'Email query parameter is required' }, HttpStatus.BAD_REQUEST);
    }

    let profile = this.dataStore.userProfiles.get(email);

    // Try Supabase profiles table
    try {
      const { data, error } = await this.supabaseService.client
        .from('profiles')
        .select('*')
        .eq('email', email)
        .maybeSingle();

      if (!error && data) {
        profile = {
          email,
          name: data.full_name || profile?.name,
          phone: data.phone || profile?.phone,
          avatarUrl: data.avatar_url || profile?.avatarUrl,
        };
        this.dataStore.userProfiles.set(email, profile);
      }
    } catch (_) {}

    if (!profile) {
      const matchedUser = this.dataStore.users.find((u) => u.email.toLowerCase() === email);
      profile = {
        email,
        name: matchedUser?.name || 'Valued Customer',
        phone: matchedUser?.phone || '+237 600 000 000',
        avatarUrl: matchedUser?.avatarUrl,
      };
      this.dataStore.userProfiles.set(email, profile);
    }

    return {
      success: true,
      data: profile,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('upload-avatar')
  async uploadAvatar(@Body() body: { email?: string; image?: string; base64?: string; avatarUrl?: string }) {
    const { email, image, base64, avatarUrl } = body || {};
    const cleanEmail = (email || '').toLowerCase().trim();
    if (!cleanEmail) {
      throw new HttpException({ success: false, message: 'User email is required' }, HttpStatus.BAD_REQUEST);
    }

    let target = avatarUrl || image || base64;
    if (!target) {
      throw new HttpException({ success: false, message: 'No avatar image data provided' }, HttpStatus.BAD_REQUEST);
    }

    if (typeof target === 'string' && !target.startsWith('data:') && !target.startsWith('http://') && !target.startsWith('https://')) {
      target = `data:image/jpeg;base64,${target}`;
    }

    let finalAvatarUrl = target;

    try {
      finalAvatarUrl = await this.cloudinaryService.uploadImage(target, 'best-cream/avatars');
    } catch (err) {
      // Keep base64 / target if cloud fails
    }

    const existing: UserProfileData = this.dataStore.userProfiles.get(cleanEmail) || { email: cleanEmail };
    existing.avatarUrl = finalAvatarUrl;
    this.dataStore.userProfiles.set(cleanEmail, existing);

    const matchedUser = this.dataStore.users.find((u) => u.email.toLowerCase() === cleanEmail);
    if (matchedUser) {
      matchedUser.avatarUrl = finalAvatarUrl;
    }

    try {
      await this.supabaseService.client
        .from('profiles')
        .update({ avatar_url: finalAvatarUrl, updated_at: new Date().toISOString() })
        .eq('email', cleanEmail);
    } catch (_) {}

    return {
      success: true,
      data: { avatarUrl: finalAvatarUrl },
      message: 'Profile picture uploaded and saved successfully',
      timestamp: new Date().toISOString(),
    };
  }

  @Put()
  async updateProfile(@Body() body: { email?: string; name?: string; phone?: string; avatarUrl?: string }) {
    const { email, name, phone, avatarUrl } = body || {};
    const cleanEmail = (email || '').toLowerCase().trim();
    if (!cleanEmail) {
      throw new HttpException({ success: false, message: 'Email is required' }, HttpStatus.BAD_REQUEST);
    }

    const existing: UserProfileData = this.dataStore.userProfiles.get(cleanEmail) || { email: cleanEmail };
    if (name !== undefined) existing.name = String(name).trim();
    if (phone !== undefined) existing.phone = String(phone).trim();
    if (avatarUrl !== undefined) existing.avatarUrl = avatarUrl;
    this.dataStore.userProfiles.set(cleanEmail, existing);

    try {
      await this.supabaseService.client.from('profiles').upsert({
        email: cleanEmail,
        full_name: existing.name,
        phone: existing.phone,
        avatar_url: existing.avatarUrl,
        updated_at: new Date().toISOString(),
      });
    } catch (_) {}

    return {
      success: true,
      data: existing,
      message: 'Profile updated successfully',
      timestamp: new Date().toISOString(),
    };
  }
}

