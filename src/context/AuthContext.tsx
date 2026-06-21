'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { isMockEnabled, mockDb } from '@/lib/mockDb';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone_number: string | null;
  bgmi_character_id: string | null;
  bgmi_ign: string | null;
  freefire_uid: string | null;
  freefire_ign: string | null;
  profile_picture: string | null;
  is_admin: boolean;
  role?: 'Player' | 'Super Admin' | 'Tournament Admin' | 'Support Admin' | 'Moderator';
  created_at: string;
}

export interface UserWallet {
  id: string;
  user_id: string;
  deposit_balance: number;
  winning_balance: number;
  bonus_balance: number;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  wallet: UserWallet | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  refreshWallet: () => Promise<void>;
  signOut: () => Promise<void>;
  loginMockUser: (email: string) => Promise<void>;
  registerMockUser: (fields: any) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [wallet, setWallet] = useState<UserWallet | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = async (userId?: string) => {
    const targetId = userId || user?.id;
    if (!targetId) return;

    if (isMockEnabled) {
      const profilesMap = mockDb.getProfiles();
      const prof = profilesMap[targetId];
      if (prof) {
        // Force admin check for the administrator email
        const isSuperAdminEmail = prof.email.toLowerCase() === 'sumit903970@gmail.com';
        prof.is_admin = isSuperAdminEmail;
        if (isSuperAdminEmail) {
          prof.role = 'Super Admin';
        } else if (prof.role === 'Super Admin' || prof.role === 'Tournament Admin' || prof.role === 'Support Admin' || prof.role === 'Moderator') {
          prof.role = 'Player';
        }
        setProfile(prof);
      }
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', targetId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
      } else {
        const profileData = data as UserProfile;
        const isSuperAdminEmail = profileData.email.toLowerCase() === 'sumit903970@gmail.com';
        profileData.is_admin = isSuperAdminEmail;
        if (isSuperAdminEmail) {
          profileData.role = 'Super Admin';
        } else if (profileData.role === 'Super Admin' || profileData.role === 'Tournament Admin' || profileData.role === 'Support Admin' || profileData.role === 'Moderator') {
          profileData.role = 'Player';
        }
        setProfile(profileData);
      }
    } catch (err) {
      console.error('Failed to refresh profile:', err);
    }
  };

  const refreshWallet = async (userId?: string) => {
    const targetId = userId || user?.id;
    if (!targetId) return;

    if (isMockEnabled) {
      const walletsMap = mockDb.getWallets();
      let userWallet = walletsMap[targetId];
      if (!userWallet) {
        userWallet = {
          id: `w-${targetId}`,
          user_id: targetId,
          deposit_balance: 0,
          winning_balance: 0,
          bonus_balance: 0,
          created_at: new Date().toISOString()
        };
        walletsMap[targetId] = userWallet;
        mockDb.saveWallets(walletsMap);
      }
      setWallet(userWallet);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', targetId)
        .single();

      if (error) {
        console.error('Error fetching wallet:', error);
      } else {
        setWallet(data as UserWallet);
      }
    } catch (err) {
      console.error('Failed to refresh wallet:', err);
    }
  };

  useEffect(() => {
    let authSubscription: any;

    const initAuth = async () => {
      if (isMockEnabled) {
        const storedUser = localStorage.getItem('vortex_session_user');
        if (storedUser) {
          const parsed = JSON.parse(storedUser);
          setUser(parsed);
          await Promise.all([
            refreshProfile(parsed.id),
            refreshWallet(parsed.id)
          ]);
        }
        setLoading(false);
        return;
      }

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
          await Promise.all([
            refreshProfile(session.user.id),
            refreshWallet(session.user.id)
          ]);
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
      } finally {
        setLoading(false);
      }

      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if (session?.user) {
            setUser(session.user);
            await Promise.all([
              refreshProfile(session.user.id),
              refreshWallet(session.user.id)
            ]);
          } else {
            setUser(null);
            setProfile(null);
            setWallet(null);
          }
          setLoading(false);
        }
      );
      authSubscription = subscription;
    };

    initAuth();

    return () => {
      if (authSubscription) {
        authSubscription.unsubscribe();
      }
    };
  }, []);

  const loginMockUser = async (email: string) => {
    const id = `user-${email.replace(/[^a-zA-Z0-9]/g, '')}`;
    const mockUser = {
      id,
      email,
      app_metadata: {},
      user_metadata: {},
      aud: 'authenticated',
      created_at: new Date().toISOString()
    } as User;

    localStorage.setItem('vortex_session_user', JSON.stringify(mockUser));
    
    // Check/create profile
    const profilesMap = mockDb.getProfiles();
    if (!profilesMap[id]) {
      profilesMap[id] = {
        id,
        name: email.split('@')[0],
        email,
        phone_number: null,
        bgmi_character_id: null,
        bgmi_ign: null,
        freefire_uid: null,
        freefire_ign: null,
        profile_picture: null,
        is_admin: email.toLowerCase() === 'sumit903970@gmail.com',
        role: email.toLowerCase() === 'sumit903970@gmail.com' ? 'Super Admin' : 'Player',
        created_at: new Date().toISOString()
      };
      mockDb.saveProfiles(profilesMap);
    }

    setUser(mockUser);
    await Promise.all([
      refreshProfile(id),
      refreshWallet(id)
    ]);
  };

  const registerMockUser = async (fields: any) => {
    const id = `user-${fields.email.replace(/[^a-zA-Z0-9]/g, '')}`;
    const mockUser = {
      id,
      email: fields.email,
      app_metadata: {},
      user_metadata: {},
      aud: 'authenticated',
      created_at: new Date().toISOString()
    } as User;

    localStorage.setItem('vortex_session_user', JSON.stringify(mockUser));
    
    const profilesMap = mockDb.getProfiles();
    profilesMap[id] = {
      id,
      name: fields.name,
      email: fields.email,
      phone_number: fields.phone || null,
      bgmi_character_id: fields.bgmiCharId || null,
      bgmi_ign: fields.bgmiIgn || null,
      freefire_uid: fields.ffUid || null,
      freefire_ign: fields.ffIgn || null,
      profile_picture: null,
      is_admin: fields.email.toLowerCase() === 'sumit903970@gmail.com',
      role: fields.email.toLowerCase() === 'sumit903970@gmail.com' ? 'Super Admin' : 'Player',
      created_at: new Date().toISOString()
    };
    mockDb.saveProfiles(profilesMap);

    setUser(mockUser);
    await Promise.all([
      refreshProfile(id),
      refreshWallet(id)
    ]);
  };

  const signOut = async () => {
    if (isMockEnabled) {
      localStorage.removeItem('vortex_session_user');
      setUser(null);
      setProfile(null);
      setWallet(null);
      return;
    }
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setWallet(null);
  };

  // Re-fetch profile and wallet when user changes
  useEffect(() => {
    if (user?.id) {
      refreshProfile(user.id);
      refreshWallet(user.id);
    }
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        wallet,
        loading,
        refreshProfile,
        refreshWallet,
        signOut,
        loginMockUser,
        registerMockUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
