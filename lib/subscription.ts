import mongoose from 'mongoose';
import { Organization } from '@/models/Organization';
import { Membership } from '@/models/Membership';

export interface TierDetails {
  tier: number;
  name: string;
  maxUsers: number;
  monthlyCost: number;
}

// Configuración de los 4 Tiers por tipo de organización
export const SUBSCRIPTION_TIERS: Record<string, TierDetails[]> = {
  gym: [
    { tier: 1, name: 'Bronce', maxUsers: 50, monthlyCost: 25 },
    { tier: 2, name: 'Plata', maxUsers: 100, monthlyCost: 45 },
    { tier: 3, name: 'Oro', maxUsers: 200, monthlyCost: 100 },
    { tier: 4, name: 'Personalizado', maxUsers: 999999, monthlyCost: 0 },
  ],
  membership_venue: [
    { tier: 1, name: 'Bronce', maxUsers: 50, monthlyCost: 25 },
    { tier: 2, name: 'Plata', maxUsers: 100, monthlyCost: 45 },
    { tier: 3, name: 'Oro', maxUsers: 200, monthlyCost: 100 },
    { tier: 4, name: 'Personalizado', maxUsers: 999999, monthlyCost: 0 },
  ],
  school: [
    { tier: 1, name: 'Básico', maxUsers: 150, monthlyCost: 99 },
    { tier: 2, name: 'Avanzado', maxUsers: 200, monthlyCost: 149 },
    { tier: 3, name: 'Personalizado', maxUsers: 999999, monthlyCost: 0 },
    { tier: 4, name: 'Personalizado', maxUsers: 999999, monthlyCost: 0 },
  ],
  university: [
    { tier: 1, name: 'Básico', maxUsers: 150, monthlyCost: 99 },
    { tier: 2, name: 'Avanzado', maxUsers: 200, monthlyCost: 149 },
    { tier: 3, name: 'Personalizado', maxUsers: 999999, monthlyCost: 0 },
    { tier: 4, name: 'Personalizado', maxUsers: 999999, monthlyCost: 0 },
  ],
  company: [
    { tier: 1, name: 'Startup', maxUsers: 50, monthlyCost: 49 },
    { tier: 2, name: 'Pyme', maxUsers: 150, monthlyCost: 99 },
    { tier: 3, name: 'Corporativo', maxUsers: 200, monthlyCost: 149 },
    { tier: 4, name: 'Personalizado', maxUsers: 999999, monthlyCost: 0 },
  ],
  default: [
    { tier: 1, name: 'Nivel 1', maxUsers: 50, monthlyCost: 49 },
    { tier: 2, name: 'Nivel 2', maxUsers: 150, monthlyCost: 99 },
    { tier: 3, name: 'Nivel 3', maxUsers: 200, monthlyCost: 149 },
    { tier: 4, name: 'Personalizado', maxUsers: 999999, monthlyCost: 0 },
  ]
};

/**
 * Obtiene el límite de usuarios para un tipo de organización y tier específicos.
 */
export function getLimitForTier(orgType: string, tier: number): number {
  const typeKey = orgType.toLowerCase();
  const tiers = SUBSCRIPTION_TIERS[typeKey] || SUBSCRIPTION_TIERS['default'];
  const matched = tiers.find(t => t.tier === tier);
  return matched ? matched.maxUsers : 50; // Fallback
}

/**
 * Verifica si una organización ha alcanzado su límite de usuarios activos.
 */
export async function checkUserLimitReached(orgId: string): Promise<{
  limitReached: boolean;
  currentCount: number;
  limit: number;
}> {
  const org = await Organization.findById(orgId).lean();
  if (!org) {
    throw new Error(`Organization ${orgId} not found`);
  }

  // Contar usuarios activos en la organización
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
  const currentCount = activeUsersResult[0]?.count || 0;

  // Determinar el límite aplicable
  // Si no está definido en el modelo (organizaciones creadas previamente), calculamos en base a su tipo y tier por defecto
  const limit = org.max_users_limit ?? getLimitForTier(org.type, org.subscription_tier ?? 1);

  return {
    limitReached: currentCount >= limit,
    currentCount,
    limit,
  };
}
