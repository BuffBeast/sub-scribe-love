export type SubscriptionStatus = 'active' | 'trial' | 'expired' | 'cancelled' | 'expiring';

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  subscriptionStatus: SubscriptionStatus;
  subscriptionPlan: string;
  subscriptionStartDate: string;
  subscriptionEndDate: string;
  lastContactDate: string;
  totalSpent: number;
  avatar?: string;
}
