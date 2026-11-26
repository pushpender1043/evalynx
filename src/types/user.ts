export type UserRole = 'professor' | 'student' | 'admin';

export interface UserProfile {
  uid: string;
  name: string;
  firstName: string;
  email: string;
  role: UserRole;
  department: string;
  institution: string;
  enrollmentId?: string;
  photoURL?: string;
  avatarUrl?: string;
  preferredLanguage: 'en' | 'hi';
  createdAt: string;
}

export interface PendingOAuthUser {
  uid: string;
  name: string;
  email: string;
  photoURL?: string | null;
}

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface SignupPayload extends AuthCredentials {
  name: string;
  role: 'professor' | 'student';
  department?: string;
}
