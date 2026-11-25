import { Injectable, Logger } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { v2 as cloudinary } from 'cloudinary';
import type { UserRole } from '@best-cream/shared';

@Injectable()
export class SupabaseService {
  private readonly logger = new Logger(SupabaseService.name);
  public readonly client: SupabaseClient;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL || 'https://placeholder-domain.supabase.co';
    const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_KEY || 'placeholder-key';

    this.client = createClient(supabaseUrl, supabaseKey);
    if (!process.env.SUPABASE_URL) {
      this.logger.warn('⚠️ SUPABASE_URL not provided; running Supabase in offline placeholder mode.');
    }
  }

  async getUserProfileAndRole(user: { id: string; email?: string; user_metadata?: Record<string, any>; app_metadata?: Record<string, any> }): Promise<{ role: UserRole; name: string }> {
    let role: UserRole = 'customer';
    let name = user.user_metadata?.full_name || '';
    const email = (user.email || '').toLowerCase().trim();

    try {
      const { data: profile } = await this.client
        .from('profiles')
        .select('role, full_name')
        .eq('id', user.id)
        .maybeSingle();

      if (profile) {
        if (profile.role) role = profile.role as UserRole;
        if (profile.full_name) name = profile.full_name;
      }
    } catch {
      // Ignore schema cache or missing table error, fall back smoothly
    }

    if (role === 'customer') {
      if (user.app_metadata?.role) {
        role = user.app_metadata.role as UserRole;
      } else if (user.user_metadata?.role) {
        role = user.user_metadata.role as UserRole;
      } else if (email === 'admin@bestcream.com' || email === 'alex@bestcream.com' || email.includes('admin')) {
        role = 'admin';
      } else if (email === 'sales@bestcream.com' || email.includes('sales')) {
        role = 'sales';
      } else if (email === 'staff@bestcream.com') {
        role = 'staff';
      }
    }

    if (!name && email) {
      const base = email.split('@')[0].split(/[._-]/)[0];
      name = base ? base.charAt(0).toUpperCase() + base.slice(1) : 'Customer';
    }

    return { role, name };
  }
}

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);

  constructor() {
    const rawCloudinaryUrl = process.env.CLOUDINARY_URL || '';
    const uriMatch = rawCloudinaryUrl.match(/^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/);

    if (uriMatch && !uriMatch[1].includes('<') && !uriMatch[2].includes('<')) {
      cloudinary.config({
        cloud_name: uriMatch[3],
        api_key: uriMatch[1],
        api_secret: uriMatch[2],
        secure: true,
      });
      this.logger.log(`☁️ Cloudinary configured with live credentials for cloud "${uriMatch[3]}"`);
    } else if (process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dauivea1l',
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
        secure: true,
      });
      this.logger.log('☁️ Cloudinary configured via explicit API key & secret');
    } else {
      const cloudNameMatch = rawCloudinaryUrl.match(/@([^@/]+)$/);
      const defaultCloudName = cloudNameMatch ? cloudNameMatch[1] : (process.env.CLOUDINARY_CLOUD_NAME || 'dauivea1l');
      cloudinary.config({
        cloud_name: defaultCloudName,
        secure: true,
      });
      this.logger.log(`☁️ Cloudinary cloud initialized: ${defaultCloudName}`);
    }
  }

  async uploadImage(fileData: string, folder = 'best-cream'): Promise<string> {
    const uploadRes = await cloudinary.uploader.upload(fileData, {
      folder,
      resource_type: 'image',
    });
    return uploadRes.secure_url;
  }
}
