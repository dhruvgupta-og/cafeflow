import { CafePlan, PlanConfig } from '../types';

export const SUBSCRIPTION_PLANS: Record<CafePlan, PlanConfig> = {
  Starter: {
    id: 'Starter',
    displayName: 'Starter / Basic',
    priceFormatted: '$19',
    billingPeriod: '/month',
    description: 'Ideal for cozy boutique cafes, bakeries, and food trucks getting started with digital ordering.',
    maxTables: 8,
    maxMenuItems: 25,
    badgeBg: 'bg-stone-800 border-stone-700',
    badgeText: 'text-stone-300',
    features: [
      'Up to 8 Dining Tables',
      'Up to 25 Active Menu Items',
      'Mobile QR Customer Ordering',
      'Real-Time Kitchen Display (KDS)',
      'Digital POS & Bill Settlement',
      'Waiter Call Assistance Buzzer',
      'Email Support'
    ]
  },
  Pro: {
    id: 'Pro',
    displayName: 'Pro',
    priceFormatted: '$49',
    billingPeriod: '/month',
    description: 'Designed for high-volume coffee houses, bistros, and bustling restaurants requiring full analytics.',
    maxTables: 30,
    maxMenuItems: 150,
    badgeBg: 'bg-amber-500/10 border-amber-500/40',
    badgeText: 'text-amber-400',
    recommended: true,
    features: [
      'Up to 30 Dining Tables',
      'Up to 150 Menu Items & Add-ons',
      'Real-time Audio Bell Kitchen Chimes',
      'Hourly Sales Velocity & Revenue Analytics',
      'Custom Tax & Service Charge Configuration',
      'High-Resolution QR Code Standee Printables',
      'Customer Order History & Repeat Ordering',
      'Priority Email & Chat Support'
    ]
  },
  Enterprise: {
    id: 'Enterprise',
    displayName: 'Enterprise / Premium',
    priceFormatted: '$129',
    billingPeriod: '/month',
    description: 'Uncapped capability for restaurant groups, multi-station kitchens, and premium franchise establishments.',
    maxTables: 999,
    maxMenuItems: 999,
    badgeBg: 'bg-indigo-500/10 border-indigo-500/40',
    badgeText: 'text-indigo-400',
    features: [
      'Unlimited Dining Tables & Floor Plans',
      'Unlimited Catalog Items & Categories',
      'Multi-Staff Concurrent Terminal Access',
      'Full Custom Branding & White-Label Logo',
      'Advanced Customer Retention Analytics',
      'CSV / Excel Sales & POS Accounting Export',
      'Dedicated Account Manager & 24/7 SLA'
    ]
  }
};

export const getPlanConfig = (plan?: CafePlan | string): PlanConfig => {
  if (plan && plan in SUBSCRIPTION_PLANS) {
    return SUBSCRIPTION_PLANS[plan as CafePlan];
  }
  return SUBSCRIPTION_PLANS.Starter;
};

export const checkTableLimit = (currentTableCount: number, plan: CafePlan): {
  allowed: boolean;
  maxTables: number;
  remaining: number;
  message?: string;
} => {
  const config = getPlanConfig(plan);
  const allowed = currentTableCount < config.maxTables;
  const remaining = Math.max(0, config.maxTables - currentTableCount);
  return {
    allowed,
    maxTables: config.maxTables,
    remaining,
    message: allowed
      ? undefined
      : `Table limit reached (${currentTableCount}/${config.maxTables} tables). Upgrade to Pro or Enterprise for additional capacity.`
  };
};

export const checkMenuItemLimit = (currentItemCount: number, plan: CafePlan): {
  allowed: boolean;
  maxMenuItems: number;
  remaining: number;
  message?: string;
} => {
  const config = getPlanConfig(plan);
  const allowed = currentItemCount < config.maxMenuItems;
  const remaining = Math.max(0, config.maxMenuItems - currentItemCount);
  return {
    allowed,
    maxMenuItems: config.maxMenuItems,
    remaining,
    message: allowed
      ? undefined
      : `Menu item limit reached (${currentItemCount}/${config.maxMenuItems} items). Upgrade to Pro or Enterprise to add more dishes.`
  };
};
