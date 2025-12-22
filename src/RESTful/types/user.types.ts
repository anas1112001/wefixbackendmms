export enum UserRoles {
  ADMIN = 'Admin',
  TEACHER = 'Teacher',
  STUDENT = 'Student',
  DOCTOR = 'Doctor',
}

export interface UserOrm {
  id: number;
  email: string | null;
  fullName: string;
  fullNameEnglish: string;
  userNumber: string;
  password: string;
  userRoleId: number;
  fcmToken: string;
  deviceId: string;
  mobileNumber: string | null;
  countryCode: string | null;
  username: string | null;
  companyId: number | null;
  profileImage: string | null;
  gender: string | null;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  isDeleted: boolean;
  token: string | null;
  tokenExpiresAt: Date | null;
}

export interface CreateUserInput {
  email: string;
  password: string;
  fullName: string;
  fullNameEnglish: string;
  userNumber?: string;
  userRoleId?: number;
  fcmToken?: string;
  deviceId?: string;
  mobileNumber?: string;
  countryCode?: string;
  username?: string;
  companyId?: number;
  profileImage?: string;
  gender?: string;
}

export interface UpdateUserInput {
  email?: string;
  password?: string;
  fullName?: string;
  fullNameEnglish?: string;
  userNumber?: string;
  userRoleId?: number;
  fcmToken?: string;
  deviceId?: string;
  mobileNumber?: string;
  countryCode?: string;
  username?: string;
  companyId?: number;
  profileImage?: string;
  gender?: string;
}

export interface LoginInput {
  email: string;
  password: string;
  deviceId: string;
  fcmToken: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
}


