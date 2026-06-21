'use client';

// Centralized LocalStorage Mock Database for offline/demo testing
export const isMockEnabled = typeof window !== 'undefined' && 
  (!process.env.NEXT_PUBLIC_SUPABASE_URL || 
   process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project') || 
   process.env.NEXT_PUBLIC_SUPABASE_URL === '');

// Helper to get/set data
const getStore = (key: string, fallback: any) => {
  if (typeof window === 'undefined') return fallback;
  const data = localStorage.getItem(key);
  if (!data) {
    localStorage.setItem(key, JSON.stringify(fallback));
    return fallback;
  }
  try {
    return JSON.parse(data);
  } catch {
    return fallback;
  }
};

const setStore = (key: string, data: any) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(key, JSON.stringify(data));
  }
};

// Seed initial tournaments if empty
const initialTournaments = [
  {
    id: 'bgmi-squad-1',
    title: 'Vortex BGMI Squad Showdown',
    game: 'BGMI',
    mode: 'Squad',
    entry_fee: 50,
    total_slots: 100,
    filled_slots: 64,
    start_time: new Date(Date.now() + 3600 * 4000).toISOString(),
    prize_pool: 2500,
    rules: 'Mobile only. No emulators. Level 40+ required.',
    status: 'Upcoming',
    room_published: false
  },
  {
    id: 'ff-solo-1',
    title: 'Free Fire Solo Clash Royale',
    game: 'Free Fire',
    mode: 'Solo',
    entry_fee: 30,
    total_slots: 50,
    filled_slots: 42,
    start_time: new Date(Date.now() + 3600 * 8000).toISOString(),
    prize_pool: 750,
    rules: 'Solo Rush Hour mode. All character skills allowed.',
    status: 'Upcoming',
    room_published: false
  },
  {
    id: 'bgmi-duo-1',
    title: 'BGMI Duo Marksman Cup',
    game: 'BGMI',
    mode: 'Duo',
    entry_fee: 40,
    total_slots: 50,
    filled_slots: 12,
    start_time: new Date(Date.now() + 3600 * 24000).toISOString(),
    prize_pool: 1000,
    rules: 'Duo TPP. Erangel map only. iPad allowed.',
    status: 'Upcoming',
    room_published: false
  }
];

// Seed initial announcements
const initialAnnouncements = [
  {
    id: 'ann-1',
    title: 'Vortex Pro Esports Arena Launching!',
    message: 'Welcome to the ultimate BGMI & Free Fire gaming tournament arena. Play matches, declare squad supremacy, and claim cash rewards.',
    priority: 'Low',
    type: 'New Feature Updates',
    published_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 3600 * 240000).toISOString()
  },
  {
    id: 'ann-2',
    title: 'Platform Maintenance Notification',
    message: 'Vortex services will undergo scheduled system upgrades on Saturday from 2:00 AM to 4:00 AM IST. Tournament registrations will remain active.',
    priority: 'High',
    type: 'Maintenance Alerts',
    published_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 3600 * 48000).toISOString()
  }
];

// Seed initial coupons
const initialCoupons = [
  {
    id: 'cp-vortex50',
    code: 'VORTEX50',
    type: 'Percentage',
    value: 50,
    expiry_date: new Date(Date.now() + 3600 * 240000).toISOString(),
    usage_limit: 100,
    times_used: 0
  },
  {
    id: 'cp-freeplay',
    code: 'FREEPLAY',
    type: 'Fixed',
    value: 30,
    expiry_date: new Date(Date.now() + 3600 * 240000).toISOString(),
    usage_limit: 50,
    times_used: 0
  }
];

// Seed initial withdrawals for homepage proof showcase
const initialWithdrawals = [
  {
    id: 'wdr-seeded-1',
    user_id: 'user-sumit903970gmailcom',
    upi_id: 'sumit@upi',
    amount: 500,
    status: 'Approved',
    proof_image_url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=400&auto=format&fit=crop',
    created_at: new Date(Date.now() - 3600 * 4000).toISOString()
  },
  {
    id: 'wdr-seeded-2',
    user_id: 'user-demo',
    upi_id: 'gamer@paytm',
    amount: 1250,
    status: 'Approved',
    proof_image_url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=400&auto=format&fit=crop',
    created_at: new Date(Date.now() - 3600 * 20000).toISOString()
  }
];

// Seed initial registrations
const initialRegistrations = [
  { id: 'reg-r1', tournament_id: 'bgmi-squad-1', user_id: 'user-raptor', game_id: '5129381', ign: 'Raptor_IGN', check_in_status: 'Checked In', created_at: new Date(Date.now() - 3600 * 6000).toISOString() },
  { id: 'reg-r2', tournament_id: 'bgmi-squad-1', user_id: 'user-sniper', game_id: '8294719', ign: 'SniperKing', check_in_status: 'Checked In', created_at: new Date(Date.now() - 3600 * 6000).toISOString() },
  { id: 'reg-r3', tournament_id: 'ff-solo-1', user_id: 'user-xenon', game_id: '7194827', ign: 'XenonFF', check_in_status: 'Checked In', created_at: new Date(Date.now() - 3600 * 10000).toISOString() },
  { id: 'reg-r4', tournament_id: 'bgmi-duo-1', user_id: 'user-ninja', game_id: '6193826', ign: 'Ninja_007', check_in_status: 'Checked In', created_at: new Date(Date.now() - 3600 * 25000).toISOString() },
  { id: 'reg-r5', tournament_id: 'bgmi-squad-1', user_id: 'user-hyper', game_id: '7291847', ign: 'HyperGamer', check_in_status: 'Checked In', created_at: new Date(Date.now() - 3600 * 6000).toISOString() },
  { id: 'reg-r6', tournament_id: 'bgmi-squad-1', user_id: 'user-spectre', game_id: '9182736', ign: 'SpectreBGMI', check_in_status: 'Checked In', created_at: new Date(Date.now() - 3600 * 6000).toISOString() },
  { id: 'reg-r7', tournament_id: 'ff-solo-1', user_id: 'user-viper', game_id: '8172635', ign: 'ViperSquad', check_in_status: 'Checked In', created_at: new Date(Date.now() - 3600 * 10000).toISOString() },
  { id: 'reg-r8', tournament_id: 'ff-solo-1', user_id: 'user-psycho', game_id: '6152437', ign: 'Psycho_01', check_in_status: 'Checked In', created_at: new Date(Date.now() - 3600 * 10000).toISOString() },
  { id: 'reg-r9', tournament_id: 'bgmi-duo-1', user_id: 'user-alpha', game_id: '5142376', ign: 'AlphaRider', check_in_status: 'Checked In', created_at: new Date(Date.now() - 3600 * 25000).toISOString() },
  { id: 'reg-r10', tournament_id: 'ff-solo-1', user_id: 'user-demo', game_id: '2719483', ign: 'Demo Player', check_in_status: 'Checked In', created_at: new Date(Date.now() - 3600 * 10000).toISOString() }
];

// Seed initial profiles
const initialProfiles = {
  'user-raptor': { id: 'user-raptor', name: 'Raptor_IGN', email: 'raptor@vortex.com', role: 'Player', verification_status: 'Verified', bgmi_character_id: '5129381', bgmi_ign: 'Raptor_IGN' },
  'user-xenon': { id: 'user-xenon', name: 'XenonFF', email: 'xenon@vortex.com', role: 'Player', verification_status: 'Verified', freefire_uid: '7194827', freefire_ign: 'XenonFF' },
  'user-ninja': { id: 'user-ninja', name: 'Ninja_007', email: 'ninja@vortex.com', role: 'Player', verification_status: 'Verified', bgmi_character_id: '6193826', bgmi_ign: 'Ninja_007' },
  'user-sniper': { id: 'user-sniper', name: 'SniperKing', email: 'sniper@vortex.com', role: 'Player', verification_status: 'Verified', bgmi_character_id: '8294719', bgmi_ign: 'SniperKing' },
  'user-demo': { id: 'user-demo', name: 'Demo Player', email: 'demo@vortex.com', role: 'Player', verification_status: 'Verified', bgmi_character_id: '2719483', bgmi_ign: 'Demo Player', freefire_uid: '9988776', freefire_ign: 'Demo FF' },
  'user-hyper': { id: 'user-hyper', name: 'HyperGamer', email: 'hyper@vortex.com', role: 'Player', verification_status: 'Verified', bgmi_character_id: '7291847', bgmi_ign: 'HyperGamer' },
  'user-spectre': { id: 'user-spectre', name: 'SpectreBGMI', email: 'spectre@vortex.com', role: 'Player', verification_status: 'Verified', bgmi_character_id: '9182736', bgmi_ign: 'SpectreBGMI' },
  'user-viper': { id: 'user-viper', name: 'ViperSquad', email: 'viper@vortex.com', role: 'Player', verification_status: 'Verified', freefire_uid: '8172635', freefire_ign: 'ViperSquad' },
  'user-psycho': { id: 'user-psycho', name: 'Psycho_01', email: 'psycho@vortex.com', role: 'Player', verification_status: 'Verified', freefire_uid: '6152437', freefire_ign: 'Psycho_01' },
  'user-alpha': { id: 'user-alpha', name: 'AlphaRider', email: 'alpha@vortex.com', role: 'Player', verification_status: 'Verified', bgmi_character_id: '5142376', bgmi_ign: 'AlphaRider' },
  'user-sumit903970gmailcom': { id: 'user-sumit903970gmailcom', name: 'sumit903970', email: 'sumit903970@gmail.com', role: 'Super Admin', verification_status: 'Verified', bgmi_character_id: '90397098', bgmi_ign: 'VORTEX_BOSS' }
};

// Seed initial winners
const initialWinners = [
  { id: 'winner-1', tournament_id: 'bgmi-squad-1', user_id: 'user-raptor', rank: 1, prize_won: 1250, created_at: new Date(Date.now() - 3600 * 4000).toISOString() },
  { id: 'winner-2', tournament_id: 'bgmi-squad-1', user_id: 'user-sniper', rank: 3, prize_won: 300, created_at: new Date(Date.now() - 3600 * 4000).toISOString() },
  { id: 'winner-3', tournament_id: 'ff-solo-1', user_id: 'user-xenon', rank: 1, prize_won: 750, created_at: new Date(Date.now() - 3600 * 8000).toISOString() },
  { id: 'winner-4', tournament_id: 'bgmi-duo-1', user_id: 'user-ninja', rank: 2, prize_won: 500, created_at: new Date(Date.now() - 3600 * 24000).toISOString() },
  { id: 'winner-5', tournament_id: 'bgmi-squad-1', user_id: 'user-hyper', rank: 2, prize_won: 750, created_at: new Date(Date.now() - 3600 * 4000).toISOString() },
  { id: 'winner-6', tournament_id: 'ff-solo-1', user_id: 'user-spectre', rank: 2, prize_won: 500, created_at: new Date(Date.now() - 3600 * 8000).toISOString() },
  { id: 'winner-7', tournament_id: 'ff-solo-1', user_id: 'user-viper', rank: 3, prize_won: 300, created_at: new Date(Date.now() - 3600 * 8000).toISOString() },
  { id: 'winner-8', tournament_id: 'bgmi-duo-1', user_id: 'user-psycho', rank: 3, prize_won: 200, created_at: new Date(Date.now() - 3600 * 24000).toISOString() },
  { id: 'winner-9', tournament_id: 'bgmi-duo-1', user_id: 'user-alpha', rank: 1, prize_won: 1000, created_at: new Date(Date.now() - 3600 * 24000).toISOString() },
  { id: 'winner-10', tournament_id: 'ff-solo-1', user_id: 'user-demo', rank: 3, prize_won: 200, created_at: new Date(Date.now() - 3600 * 8000).toISOString() }
];

export const mockDb = {
  // Tournaments CRUD
  getTournaments: () => {
    const data = getStore('vortex_tournaments', initialTournaments);
    if (Array.isArray(data)) {
      let changed = false;
      const merged = [...data];
      for (const tourney of initialTournaments) {
        if (!merged.some((t: any) => t.id === tourney.id)) {
          merged.push(tourney);
          changed = true;
        }
      }
      if (changed) {
        setStore('vortex_tournaments', merged);
        return merged;
      }
    }
    return data;
  },
  saveTournaments: (data: any) => setStore('vortex_tournaments', data),
  
  // Tournament Rooms
  getRooms: () => getStore('vortex_rooms', {}),
  saveRooms: (data: any) => setStore('vortex_rooms', data),

  // Registrations
  getRegistrations: () => {
    const data = getStore('vortex_registrations', initialRegistrations);
    if (Array.isArray(data)) {
      let changed = false;
      const merged = [...data];
      for (const reg of initialRegistrations) {
        if (!merged.some((r: any) => r.id === reg.id)) {
          merged.push(reg);
          changed = true;
        }
      }
      if (changed) {
        setStore('vortex_registrations', merged);
        return merged;
      }
    }
    return data;
  },
  saveRegistrations: (data: any) => setStore('vortex_registrations', data),

  // Wallets
  getWallets: () => getStore('vortex_wallets', {}),
  saveWallets: (data: any) => setStore('vortex_wallets', data),

  // Transactions
  getTransactions: () => getStore('vortex_transactions', []),
  saveTransactions: (data: any) => setStore('vortex_transactions', data),

  // Withdrawals
  getWithdrawals: () => {
    const data = getStore('vortex_withdrawals', initialWithdrawals);
    if (Array.isArray(data)) {
      let changed = false;
      const merged = [...data];
      for (const wdr of initialWithdrawals) {
        if (!merged.some((w: any) => w.id === wdr.id)) {
          merged.push(wdr);
          changed = true;
        }
      }
      if (changed) {
        setStore('vortex_withdrawals', merged);
        return merged;
      }
    }
    return data;
  },
  saveWithdrawals: (data: any) => setStore('vortex_withdrawals', data),

  // Profiles
  getProfiles: () => {
    const data = getStore('vortex_profiles', initialProfiles);
    if (data && typeof data === 'object') {
      let changed = false;
      const merged = { ...data };
      for (const [key, val] of Object.entries(initialProfiles)) {
        if (!merged[key]) {
          merged[key] = val;
          changed = true;
        } else {
          const existingProfile = merged[key];
          const seedProfile = val as any;
          if (seedProfile.bgmi_character_id && !existingProfile.bgmi_character_id) {
            existingProfile.bgmi_character_id = seedProfile.bgmi_character_id;
            existingProfile.bgmi_ign = seedProfile.bgmi_ign;
            changed = true;
          }
          if (seedProfile.freefire_uid && !existingProfile.freefire_uid) {
            existingProfile.freefire_uid = seedProfile.freefire_uid;
            existingProfile.freefire_ign = seedProfile.freefire_ign;
            changed = true;
          }
          merged[key] = existingProfile;
        }
      }
      if (changed) {
        setStore('vortex_profiles', merged);
        return merged;
      }
    }
    return data;
  },
  saveProfiles: (data: any) => setStore('vortex_profiles', data),

  // Support Tickets
  getTickets: () => getStore('vortex_tickets', []),
  saveTickets: (data: any) => setStore('vortex_tickets', data),

  // Support Messages
  getMessages: () => getStore('vortex_messages', []),
  saveMessages: (data: any) => setStore('vortex_messages', data),

  // Notifications
  getNotifications: () => getStore('vortex_notifications', []),
  saveNotifications: (data: any) => setStore('vortex_notifications', data),

  // Announcements
  getAnnouncements: () => {
    const data = getStore('vortex_announcements', initialAnnouncements);
    if (Array.isArray(data)) {
      let changed = false;
      const merged = [...data];
      for (const ann of initialAnnouncements) {
        const existingIdx = merged.findIndex((a: any) => a.id === ann.id);
        if (existingIdx === -1) {
          merged.push(ann);
          changed = true;
        } else {
          if (merged[existingIdx].title !== ann.title) {
            merged[existingIdx].title = ann.title;
            changed = true;
          }
        }
      }
      if (changed) {
        setStore('vortex_announcements', merged);
        return merged;
      }
    }
    return data;
  },
  saveAnnouncements: (data: any) => setStore('vortex_announcements', data),

  // Banned Users
  getBannedUsers: () => getStore('vortex_banned_users', {}),
  saveBannedUsers: (data: any) => setStore('vortex_banned_users', data),

  // Ban Logs
  getBanLogs: () => getStore('vortex_ban_logs', []),
  saveBanLogs: (data: any) => setStore('vortex_ban_logs', data),

  // Match Proofs
  getMatchProofs: () => getStore('vortex_match_proofs', []),
  saveMatchProofs: (data: any) => setStore('vortex_match_proofs', data),

  // Teams
  getTeams: () => getStore('vortex_teams', []),
  saveTeams: (data: any) => setStore('vortex_teams', data),

  // Team Members
  getTeamMembers: () => getStore('vortex_team_members', []),
  saveTeamMembers: (data: any) => setStore('vortex_team_members', data),

  // Team Invites
  getTeamInvites: () => getStore('vortex_team_invites', []),
  saveTeamInvites: (data: any) => setStore('vortex_team_invites', data),

  // Coupons
  getCoupons: () => {
    const data = getStore('vortex_coupons', initialCoupons);
    if (Array.isArray(data)) {
      let changed = false;
      const merged = [...data];
      for (const coup of initialCoupons) {
        if (!merged.some((c: any) => c.id === coup.id)) {
          merged.push(coup);
          changed = true;
        }
      }
      if (changed) {
        setStore('vortex_coupons', merged);
        return merged;
      }
    }
    return data;
  },
  saveCoupons: (data: any) => setStore('vortex_coupons', data),

  // Coupon Usage
  getCouponUsage: () => getStore('vortex_coupon_usage', []),
  saveCouponUsage: (data: any) => setStore('vortex_coupon_usage', data),

  // Audit Logs
  getAuditLogs: () => getStore('vortex_audit_logs', []),
  saveAuditLogs: (data: any) => setStore('vortex_audit_logs', data),

  // Winners
  getWinners: () => {
    const data = getStore('vortex_winners', initialWinners);
    let changed = false;
    let merged = Array.isArray(data) ? [...data] : [];
    
    // 1. Seed initial winners if missing
    for (const win of initialWinners) {
      if (!merged.some((w: any) => w.id === win.id)) {
        merged.push(win);
        changed = true;
      }
    }

    // 2. Retroactive fix: Scan transaction logs for Prize Credits and reconstruct missing winner entries
    try {
      const txs = getStore('vortex_transactions', []);
      const wallets = getStore('vortex_wallets', {});
      
      // Create a map of wallet_id to user_id
      const walletToUser: Record<string, string> = {};
      Object.entries(wallets).forEach(([userId, w]: [string, any]) => {
        walletToUser[w.id] = userId;
      });

      txs.forEach((tx: any) => {
        if (tx.type === 'Prize Credit' && tx.reference_id && tx.reference_id.startsWith('winner-')) {
          // reference_id format: winner-[tournament_id]-[rank]
          const parts = tx.reference_id.split('-');
          if (parts.length >= 3) {
            const rank = Number(parts[parts.length - 1]);
            const tournamentId = parts.slice(1, parts.length - 1).join('-');
            const userId = walletToUser[tx.wallet_id] || tx.wallet_id.replace('w-', '');
            
            // Check if this winner entry already exists
            const exists = merged.some((w: any) => 
              w.tournament_id === tournamentId && 
              w.user_id === userId && 
              Number(w.rank) === rank
            );

            if (!exists) {
              merged.push({
                id: `winner-${tournamentId}-${rank}-${new Date(tx.created_at).getTime()}`,
                tournament_id: tournamentId,
                user_id: userId,
                rank: rank,
                prize_won: tx.amount,
                created_at: tx.created_at
              });
              changed = true;
            }
          }
        }
      });
    } catch (e) {
      console.error('Error in retroactive winners recovery:', e);
    }

    if (changed) {
      setStore('vortex_winners', merged);
    }
    return merged;
  },
  saveWinners: (data: any) => setStore('vortex_winners', data),

  // Leaderboard Overrides
  getLeaderboardOverrides: () => getStore('vortex_leaderboard_overrides', []),
  saveLeaderboardOverrides: (data: any) => setStore('vortex_leaderboard_overrides', data),

  // Leaderboard Hidden Players
  getLeaderboardHidden: () => getStore('vortex_leaderboard_hidden', []),
  saveLeaderboardHidden: (data: string[]) => setStore('vortex_leaderboard_hidden', data),

  // Payment QR Code Settings
  getPaymentQr: () => getStore('vortex_payment_qr', '/payment_qr.jpg'),
  savePaymentQr: (url: string) => setStore('vortex_payment_qr', url),
};

export interface LeaderboardPlayer {
  name: string;
  wins: number;
  earnings: number;
  matches: number;
  avatar: string;
  user_id?: string;
  is_override?: boolean;
}

export interface LeaderboardOverride {
  id: string; // unique ID: name or user_id + tab + game
  username: string;
  user_id?: string;
  game: 'All' | 'BGMI' | 'Free Fire';
  tab: 'weekly' | 'monthly' | 'allTime';
  wins: number;
  earnings: number;
  matches: number;
  avatar?: string;
}

export const calculateLeaderboard = (
  tab: 'weekly' | 'monthly' | 'allTime',
  gameFilter: 'All' | 'BGMI' | 'Free Fire',
  winnersList: any[],
  regsList: any[],
  profilesList: any,
  tournamentsList: any[],
  overridesList: LeaderboardOverride[] = [],
  hiddenList: string[] = []
): LeaderboardPlayer[] => {
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;
  let cutoff = 0;
  if (tab === 'weekly') {
    cutoff = now - 7 * oneDay;
  } else if (tab === 'monthly') {
    cutoff = now - 30 * oneDay;
  }

  // Create a tournament map: id -> game
  const tournamentGameMap: Record<string, string> = {};
  tournamentsList.forEach((t: any) => {
    tournamentGameMap[t.id] = t.game;
  });

  const userStats: Record<string, { wins: number; earnings: number; matches: number; user_id: string }> = {};

  // Aggregate matches from registrations
  regsList.forEach((r: any) => {
    const regTime = new Date(r.created_at).getTime();
    if (tab !== 'allTime' && regTime < cutoff) return;
    
    // Filter by game
    const game = tournamentGameMap[r.tournament_id];
    if (gameFilter !== 'All' && game !== gameFilter) return;

    if (!userStats[r.user_id]) {
      userStats[r.user_id] = { wins: 0, earnings: 0, matches: 0, user_id: r.user_id };
    }
    userStats[r.user_id].matches += 1;
  });

  // Aggregate wins and earnings from winners
  winnersList.forEach((w: any) => {
    const winTime = new Date(w.created_at).getTime();
    if (tab !== 'allTime' && winTime < cutoff) return;

    // Filter by game
    const game = tournamentGameMap[w.tournament_id];
    if (gameFilter !== 'All' && game !== gameFilter) return;

    if (!userStats[w.user_id]) {
      userStats[w.user_id] = { wins: 0, earnings: 0, matches: 0, user_id: w.user_id };
    }
    userStats[w.user_id].earnings += Number(w.prize_won || 0);
    if (Number(w.rank) >= 1 && Number(w.rank) <= 3) {
      userStats[w.user_id].wins += 1;
    }
  });

  // Convert profile mapping helper
  const getProfileName = (userId: string) => {
    if (Array.isArray(profilesList)) {
      const profile = profilesList.find((p: any) => p.id === userId);
      return profile?.name || profile?.email?.split('@')[0] || `Gamer_${userId.slice(0, 5)}`;
    } else {
      const profile = (profilesList as any)[userId];
      return profile?.name || profile?.email?.split('@')[0] || `Gamer_${userId.slice(0, 5)}`;
    }
  };

  // Convert to array
  const playersMap: Record<string, LeaderboardPlayer> = {};

  Object.values(userStats)
    .filter(stat => stat.matches > 0 || stat.earnings > 0)
    .forEach(stat => {
      const name = getProfileName(stat.user_id);
      playersMap[stat.user_id] = {
        name,
        wins: stat.wins,
        earnings: stat.earnings,
        matches: stat.matches,
        avatar: '🔥',
        user_id: stat.user_id,
        is_override: false
      };
    });

  // Merge overrides
  if (Array.isArray(overridesList)) {
    overridesList.forEach((ov: LeaderboardOverride) => {
      // Check if override matches current tab
      if (ov.tab !== tab) return;
      
      // Check game filter
      if (gameFilter !== 'All' && ov.game !== gameFilter) return;
      if (gameFilter === 'All' && ov.game !== 'All') return;

      if (ov.user_id && playersMap[ov.user_id]) {
        // Edit existing player stats
        playersMap[ov.user_id] = {
          ...playersMap[ov.user_id],
          wins: ov.wins,
          earnings: ov.earnings,
          matches: ov.matches,
          is_override: true
        };
      } else {
        // Custom synthetic player or override mapping by username
        // Find if a player with this name already exists in the dynamic list
        const existingKey = Object.keys(playersMap).find(k => playersMap[k].name === ov.username);
        if (existingKey) {
          playersMap[existingKey] = {
            ...playersMap[existingKey],
            wins: ov.wins,
            earnings: ov.earnings,
            matches: ov.matches,
            is_override: true
          };
        } else {
          // Completely new manual player row
          const tempId = ov.user_id || `manual-${ov.username}`;
          playersMap[tempId] = {
            name: ov.username,
            wins: ov.wins,
            earnings: ov.earnings,
            matches: ov.matches,
            avatar: ov.avatar || '🔥',
            user_id: ov.user_id || undefined,
            is_override: true
          };
        }
      }
    });
  }

  // Convert playersMap back to array, filtering out hidden players
  const players = Object.values(playersMap).filter((p) => {
    const key = `${p.name}-${gameFilter}-${tab}`;
    return !hiddenList.includes(key);
  });

  // Sort: earnings DESC, wins DESC, matches DESC
  players.sort((a, b) => {
    if (b.earnings !== a.earnings) return b.earnings - a.earnings;
    if (b.wins !== a.wins) return b.wins - a.wins;
    return b.matches - a.matches;
  });

  // Assign avatars based on rank
  return players.map((p, idx) => {
    let avatar = p.avatar || '🔥';
    if (p.avatar === '🔥' || !p.avatar) {
      if (idx === 0) avatar = '👑';
      else if (idx === 1) avatar = '🥈';
      else if (idx === 2) avatar = '🥉';
      else if (idx === 3) avatar = '⚡';
    }
    return { ...p, avatar };
  });
};

