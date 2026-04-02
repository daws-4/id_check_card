import { Membership } from '@/models/Membership';
import { Reader } from '@/models/Reader';
import { User } from '@/models/User';
import { BillingConfig, IBillingConfig } from '@/models/BillingConfig';
import { Organization } from '@/models/Organization';
import mongoose from 'mongoose';

export interface BillingPreview {
  organization_id: string;
  organization_name: string;
  organization_type: string;
  active_users_count: number;
  active_readers_count: number;
  cost_per_user: number;
  cost_per_reader: number;
  subtotal_users: number;
  subtotal_readers: number;
  total: number;
  currency: string;
}

/**
 * Obtiene las tarifas aplicables para un tipo de organización.
 * Si existe un rate_override para ese tipo, lo usa; si no, usa los defaults.
 */
export function getRatesForOrgType(config: IBillingConfig, orgType: string) {
  const override = config.rate_overrides?.find(r => r.org_type === orgType);
  return {
    cost_per_user: override ? override.cost_per_active_user : config.default_cost_per_active_user,
    cost_per_reader: override ? override.cost_per_active_reader : config.default_cost_per_active_reader,
  };
}

/**
 * Calcula el costo de facturación para una organización específica.
 * Solo cuenta usuarios con status: 'active' que tengan membership en la org.
 */
export async function calculateOrgBilling(orgId: string, config: IBillingConfig): Promise<BillingPreview> {
  const org = await Organization.findById(orgId).lean();
  if (!org) throw new Error(`Organization ${orgId} not found`);

  // Contar usuarios activos con membership en esta organización
  // Usamos aggregate para hacer join con la colección de users y filtrar por status
  const activeUsersResult = await Membership.aggregate([
    { $match: { organization_id: new mongoose.Types.ObjectId(orgId) } },
    {
      $lookup: {
        from: 'users',
        localField: 'user_id',
        foreignField: '_id',
        as: 'user',
      },
    },
    { $unwind: '$user' },
    { $match: { 'user.status': 'active' } },
    { $count: 'count' },
  ]);
  const activeUsersCount = activeUsersResult[0]?.count || 0;

  // Contar readers activos de esta organización
  const activeReadersCount = await Reader.countDocuments({
    organization_id: new mongoose.Types.ObjectId(orgId),
    status: 'active',
  });

  let rates = getRatesForOrgType(config, org.type);
  let currency = config.currency as 'USD' | 'VES';

  if (org.billing_plan === 'custom' && org.billing_rates) {
    rates = {
      cost_per_user: org.billing_rates.cost_per_active_user ?? rates.cost_per_user,
      cost_per_reader: org.billing_rates.cost_per_active_reader ?? rates.cost_per_reader,
    };
    if (org.billing_rates.currency) {
      currency = org.billing_rates.currency as 'USD' | 'VES';
    }
  }

  const subtotalUsers = activeUsersCount * rates.cost_per_user;
  const subtotalReaders = activeReadersCount * rates.cost_per_reader;
  const total = subtotalUsers + subtotalReaders;

  return {
    organization_id: orgId,
    organization_name: org.name,
    organization_type: org.type,
    active_users_count: activeUsersCount,
    active_readers_count: activeReadersCount,
    cost_per_user: rates.cost_per_user,
    cost_per_reader: rates.cost_per_reader,
    subtotal_users: Math.round(subtotalUsers * 100) / 100,
    subtotal_readers: Math.round(subtotalReaders * 100) / 100,
    total: Math.round(total * 100) / 100,
    currency: currency,
  };
}

/**
 * Obtiene o crea la configuración de facturación (singleton).
 */
export async function getOrCreateBillingConfig(): Promise<IBillingConfig> {
  let config = await BillingConfig.findOne();
  if (!config) {
    config = await BillingConfig.create({
      default_cost_per_active_user: 1.00,
      default_cost_per_active_reader: 5.00,
      currency: 'USD',
      billing_cycle: 'monthly',
    });
  }
  return config;
}
