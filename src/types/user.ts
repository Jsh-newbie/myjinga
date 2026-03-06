export type SchoolLevel = 'middle' | 'high';
export type Grade = 1 | 2 | 3;
export type UserRole = 'student' | 'admin';
export type SubscriptionPlan = 'free' | 'premium';
export type SubscriptionStatus = 'active' | 'paused' | 'cancelled';

export type UserProfile = {
  uid: string;
  email: string;
  name: string;
  birthDate: string;
  schoolLevel: SchoolLevel;
  grade: Grade;
  role: UserRole;
  subscription: {
    plan: SubscriptionPlan;
    status: SubscriptionStatus;
  };
  createdAt?: string;
  updatedAt?: string;
};
