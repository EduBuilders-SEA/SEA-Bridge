/**
 * Development Authentication Utilities
 * Provides hardcoded admin accounts for testing purposes
 * Only works in development environment
 */

export interface DevAccount {
  username: string;
  phoneNumber: string;
  name: string;
  role: 'teacher' | 'parent';
  id: string;
}

export const DEV_ACCOUNTS: DevAccount[] = [
  {
    id: 'dev-teacher-admin',
    username: 'admin',
    phoneNumber: '+62000000000', // Indonesian format with all zeros
    name: 'Admin Teacher',
    role: 'teacher',
  },
  {
    id: 'dev-parent-admin', 
    username: 'admin',
    phoneNumber: '+62000000001', // Indonesian format with all zeros + 1
    name: 'Admin Parent',
    role: 'parent',
  },
];

export const isDevelopment = () => {
  return process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_DEV_MODE === 'true';
};

export const getDevAccount = (phoneNumber: string): DevAccount | null => {
  if (!isDevelopment()) return null;
  
  return DEV_ACCOUNTS.find(account => account.phoneNumber === phoneNumber) || null;
};

export const isDevAccount = (phoneNumber: string): boolean => {
  if (!isDevelopment()) return false;
  
  return DEV_ACCOUNTS.some(account => account.phoneNumber === phoneNumber);
};

export const createDevSession = async (account: DevAccount) => {
  if (!isDevelopment()) {
    throw new Error('Dev accounts only available in development');
  }

  // Mock session data structure similar to Supabase
  return {
    user: {
      id: account.id,
      phone: account.phoneNumber,
      user_metadata: {
        name: account.name,
      }
    },
    access_token: `dev-token-${account.id}`,
    refresh_token: `dev-refresh-${account.id}`,
    expires_at: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
    token_type: 'bearer',
  };
};

// Development account credentials for easy reference
export const DEV_CREDENTIALS = {
  teacher: {
    username: 'admin',
    phone: '+62000000000',
    displayName: 'Teacher Admin (Dev)',
  },
  parent: {
    username: 'admin', 
    phone: '+62000000001',
    displayName: 'Parent Admin (Dev)',
  },
} as const;

// Helper to get formatted phone number for display
export const formatDevPhone = (account: DevAccount) => {
  return account.phoneNumber; // Already formatted as +62000000000
};

// Development login bypass function that works with Supabase
export const attemptDevLogin = async (phoneNumber: string, otp: string, supabase: any) => {
  if (!isDevelopment()) return null;
  
  const account = getDevAccount(phoneNumber);
  if (!account) return null;
  
  // Accept any 6-digit OTP for dev accounts (or '000000' specifically)
  if (otp === '000000' || (otp.length === 6 && /^\d{6}$/.test(otp))) {
    try {
      // For dev mode, we'll skip database profile creation since we can't create fake auth.users
      // Instead, just create the local session
      console.log('Dev login: Skipping database profile creation, using local session only');
      
      // For dev mode, we'll simulate a successful auth by storing dev session data
      // This is a workaround since we can't create real Supabase sessions without proper phone auth
      if (typeof window !== 'undefined') {
        localStorage.setItem('dev_session', JSON.stringify({
          user: {
            id: account.id,
            phone: phoneNumber,
            user_metadata: {
              name: account.name,
            }
          },
          role: account.role,
          expires_at: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
        }));
      }

      return {
        user: {
          id: account.id,
          phone: phoneNumber,
          user_metadata: {
            name: account.name,
          }
        },
        role: account.role,
      };
    } catch (error) {
      console.error('Dev login error:', error);
      return null;
    }
  }
  
  return null;
};

// Check if there's a valid dev session
export const getDevSession = () => {
  if (!isDevelopment() || typeof window === 'undefined') return null;
  
  try {
    const devSession = localStorage.getItem('dev_session');
    if (!devSession) return null;
    
    const session = JSON.parse(devSession);
    
    // Check if session is expired
    if (session.expires_at && Date.now() > session.expires_at) {
      localStorage.removeItem('dev_session');
      return null;
    }
    
    return session;
  } catch (error) {
    return null;
  }
};

// Clear dev session (for logout)
export const clearDevSession = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('dev_session');
  }
};
