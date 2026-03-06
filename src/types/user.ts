export type SchoolLevel = 'middle' | 'high';
export type Grade = 1 | 2 | 3;
export type UserRole = 'student' | 'admin';
export type SubscriptionPlan = 'free' | 'premium';
export type SubscriptionStatus = 'active' | 'paused' | 'cancelled';

export type Gender = 'male' | 'female';

export type UserProfile = {
  uid: string;
  email: string;
  name: string;
  nickname?: string;
  birthDate: string;
  gender?: Gender;
  schoolLevel: SchoolLevel;
  grade: Grade;
  role: UserRole;
  subscription: {
    plan: SubscriptionPlan;
    status: SubscriptionStatus;
  };
  schoolName?: string;
  interests?: string[];
  phoneNumber?: string;
  phoneVerified?: boolean;
  createdAt?: string;
  updatedAt?: string;
};
