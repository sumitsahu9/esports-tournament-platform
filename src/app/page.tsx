'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { isMockEnabled, mockDb, calculateLeaderboard, type LeaderboardOverride } from '@/lib/mockDb';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, Users, Award, Play, Calendar, Zap, 
  ChevronDown, HelpCircle, Gamepad2, ArrowRight, Star,
  ArrowUpRight, CheckCircle2, Image as ImageIcon, Flame, TrendingUp,
  X, ChevronLeft, ChevronRight
} from 'lucide-react';

interface Tournament {
  id: string;
  title: string;
  game: 'BGMI' | 'Free Fire';
  mode: string;
  entry_fee: number;
  total_slots: number;
  filled_slots: number;
  start_time: string;
  prize_pool: number;
  rules: string;
  status: 'Upcoming' | 'Live' | 'Completed';
}

const mockTournaments: Tournament[] = [
  {
    id: 'bgmi-squad-1',
    title: 'Mash Arena BGMI Squad Showdown',
    game: 'BGMI',
    mode: 'Squad',
    entry_fee: 50,
    total_slots: 100,
    filled_slots: 64,
    start_time: new Date(Date.now() + 3600 * 4000).toISOString(),
    prize_pool: 2500,
    rules: 'Mobile only. No emulators. Level 40+ required.',
    status: 'Upcoming',
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
  }
];

const mockWinners = [
  { name: 'Raptor_IGN', amount: 1250, tournament: 'Mash Arena BGMI Squad Showdown', game: 'BGMI', rank: 1 },
  { name: 'XenonFF', amount: 750, tournament: 'Free Fire Solo Clash Royale', game: 'Free Fire', rank: 1 },
  { name: 'Ninja_007', amount: 500, tournament: 'BGMI Duo Marksman Cup', game: 'BGMI', rank: 2 },
  { name: 'SniperKing', amount: 300, tournament: 'Mash Arena BGMI Squad Showdown', game: 'BGMI', rank: 3 },
];

const mockLeaderboard = {
  weekly: [
    { name: 'Raptor_IGN', wins: 12, earnings: 4200, matches: 15, avatar: '👑' },
    { name: 'XenonFF', wins: 9, earnings: 2750, matches: 12, avatar: '🥈' },
    { name: 'Ninja_007', wins: 8, earnings: 1800, matches: 10, avatar: '🥉' },
    { name: 'SniperKing', wins: 5, earnings: 1200, matches: 8, avatar: '⚡' },
    { name: 'ApexPredator', wins: 4, earnings: 900, matches: 7, avatar: '🔥' },
    { name: 'HyperGamer', wins: 3, earnings: 750, matches: 6, avatar: '🔥' },
    { name: 'SpectreBGMI', wins: 2, earnings: 500, matches: 5, avatar: '🔥' },
    { name: 'ViperSquad', wins: 2, earnings: 450, matches: 4, avatar: '🔥' },
    { name: 'Psycho_01', wins: 1, earnings: 300, matches: 3, avatar: '🔥' },
    { name: 'AlphaRider', wins: 1, earnings: 250, matches: 3, avatar: '🔥' }
  ],
  monthly: [
    { name: 'Raptor_IGN', wins: 38, earnings: 14200, matches: 45, avatar: '👑' },
    { name: 'XenonFF', wins: 28, earnings: 9500, matches: 38, avatar: '🥈' },
    { name: 'Ninja_007', wins: 22, earnings: 6800, matches: 31, avatar: '🥉' },
    { name: 'SniperKing', wins: 18, earnings: 4500, matches: 25, avatar: '⚡' },
    { name: 'GhostRider', wins: 15, earnings: 3200, matches: 22, avatar: '🔥' },
    { name: 'HyperGamer', wins: 12, earnings: 2500, matches: 18, avatar: '🔥' },
    { name: 'SpectreBGMI', wins: 10, earnings: 2100, matches: 15, avatar: '🔥' },
    { name: 'ViperSquad', wins: 8, earnings: 1750, matches: 12, avatar: '🔥' },
    { name: 'Psycho_01', wins: 6, earnings: 1300, matches: 10, avatar: '🔥' },
    { name: 'AlphaRider', wins: 5, earnings: 1100, matches: 9, avatar: '🔥' }
  ],
  allTime: [
    { name: 'Raptor_IGN', wins: 245, earnings: 84000, matches: 320, avatar: '👑' },
    { name: 'XenonFF', wins: 198, earnings: 62000, matches: 270, avatar: '🥈' },
    { name: 'Ninja_007', wins: 142, earnings: 44000, matches: 200, avatar: '🥉' },
    { name: 'SniperKing', wins: 110, earnings: 31000, matches: 155, avatar: '⚡' },
    { name: 'GamerGod', wins: 89, earnings: 24000, matches: 120, avatar: '🔥' },
    { name: 'HyperGamer', wins: 76, earnings: 19500, matches: 110, avatar: '🔥' },
    { name: 'SpectreBGMI', wins: 68, earnings: 17000, matches: 98, avatar: '🔥' },
    { name: 'ViperSquad', wins: 54, earnings: 13500, matches: 82, avatar: '🔥' },
    { name: 'Psycho_01', wins: 42, earnings: 10500, matches: 68, avatar: '🔥' },
    { name: 'AlphaRider', wins: 35, earnings: 8900, matches: 58, avatar: '🔥' }
  ]
};

const mockActivities = [
  'Player Raptor_IGN just registered for Mash Arena BGMI Squad Showdown',
  'Withdrawal of ₹500 successfully approved for user sumit903970@gmail.com',
  'Gamer XenonFF secured Rank 1 in Free Fire Solo Clash Royale winning ₹750',
  'New tournament "Free Fire Duo Rush" created by administrator',
  'Player Ninja_007 check-in completed for BGMI Duo Marksman Cup',
  'Withdrawal of ₹1,200 processed instantly to UPI ID gamer@paytm'
];

const faqs = [
  {
    question: 'How do I join a tournament?',
    answer: 'Simply sign up, add mock deposits to your wallet from the Wallet section in your dashboard, select an upcoming tournament from the list, input your Game ID and IGN, and click "Join". The entry fee will be deducted directly from your wallet balance.'
  },
  {
    question: 'Where do I get the Room ID and Password?',
    answer: 'Once you register for a tournament, the Match Details tab will display a countdown. Roughly 15 minutes before the match start time, the admin will publish the Room ID and Password. You will see it directly on the tournament details page in your dashboard. Only registered players can see these details.'
  },
  {
    question: 'How is the prize pool distributed?',
    answer: 'We operate on a 50/50 model: 50% of total entry fees go to the platform revenue, and 50% form the tournament prize pool. The prize pool is distributed as follows: Rank 1 wins 50%, Rank 2 wins 30%, and Rank 3 wins 20%.'
  },
  {
    question: 'How do I withdraw my winnings?',
    answer: 'Head to your dashboard, click on the Wallet balance card, select "Withdraw Winnings", input your UPI ID and the withdrawal amount (minimum withdrawal limit is ₹100), and submit. The admin will review and approve your withdrawal shortly.'
  }
];

interface LeaderboardPlayer {
  name: string;
  wins: number;
  earnings: number;
  matches: number;
  avatar: string;
}

interface TutorialSlide {
  step: string;
  heading: string;
  hinglishScript: string;
  hindiScript: string;
  component: React.ReactNode;
}

const tutorialSlides: TutorialSlide[] = [
  {
    step: '1',
    heading: '🎬 Introduction: Mash Arena Platform Kya Hai?',
    hinglishScript: "Hey gamers! Mash Arena par aapka swagat hai. Aaj hum iss video guide me dekhenge ki platform par kya cheez kahan hai, aur aap matches join karke wallet balance kaise jeet sakte hain.",
    hindiScript: "हे गेमर्स! मैश एरिना पर आपका स्वागत है। आज हम इस वीडियो गाइड में देखेंगे कि प्लेटफॉर्म पर क्या चीज़ कहां है, और आप मैचेस जॉइन करके वॉलेट बैलेंस कैसे जीत सकते हैं।",
    component: (
      <div className="flex flex-col items-center justify-center space-y-4">
        <div className="w-20 h-20 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400 animate-pulse">
          <Gamepad2 className="w-10 h-10" />
        </div>
        <h4 className="text-xl font-extrabold text-white tracking-tight">Mash Arena Walkthrough</h4>
        <p className="text-xs text-zinc-400 max-w-sm">Welcome to India's Premium Esports Tournament Platform</p>
      </div>
    )
  },
  {
    step: '2',
    heading: '👤 Profile Setup: Game IDs & UID Details',
    hinglishScript: "Sabse pehle top menu me 'Dashboard' par click karein. Dashboard page ke bottom me aapko Profile settings milegi. Yahan apna BGMI aur Free Fire ka IGN (In-Game Name) aur UID set karein takki register karte waqt aapki details automatic verify ho sakein.",
    hindiScript: "सबसे पहले टॉप मेनू में 'डैशबोर्ड' पर क्लिक करें। डैशबोर्ड पेज के बॉटम में आपको प्रोफाइल सेटिंग्स मिलेगी। यहां अपना BGMI और Free Fire का IGN (इन-गेम नाम) और यूआईडी (UID) सेट करें ताकि रजिस्टर करते समय आपकी डिटेल्स आटोमेटिक वेरीफाई हो सकें।",
    component: (
      <div className="w-full max-w-sm p-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-left space-y-3">
        <h5 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Profile Configuration</h5>
        <div className="space-y-2">
          <div>
            <label className="text-[10px] text-zinc-500 block mb-1">BGMI IN-GAME IGN</label>
            <div className="px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 font-mono">djyfd</div>
          </div>
          <div>
            <label className="text-[10px] text-zinc-500 block mb-1">BGMI CHARACTER ID</label>
            <div className="px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 font-mono">5523991203</div>
          </div>
        </div>
      </div>
    )
  },
  {
    step: '3',
    heading: '💳 Wallet System: Deposits & Withdrawal Management',
    hinglishScript: "Dashboard ya Wallet balance card par click karke aap funds manage kar sakte hain. 'Add Cash' par click karke payments QR Code display hoga jise scan karke cash deposit request bhej sakte hain. Apni winnings ko instantly nikalne ke liye bas upi ID enter karke request withdraw kar sakte hain.",
    hindiScript: "डैशबोर्ड या वॉलेट बैलेंस कार्ड पर क्लिक करके आप फंड्स मैनेज कर सकते हैं। 'ऐड कैश' पर क्लिक करके पेमेंट्स क्यूआर कोड डिस्प्ले होगा जिसे स्कैन करके कैश डिपाजिट रिक्वेस्ट भेज सकते हैं। अपनी विन्निंग्स को इंस्टेंटली निकालने के लिए बस यूपीआई आईडी एंटर करके रिक्वेस्ट विथड्रॉ कर सकते हैं।",
    component: (
      <div className="w-full max-w-xs p-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-left space-y-3">
        <h5 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Mash Arena Wallet</h5>
        <div className="p-3 bg-zinc-950 border border-zinc-850 rounded-xl space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-zinc-500">Deposit Balance:</span>
            <span className="text-zinc-200 font-bold">₹100.00</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-zinc-500">Winnings Balance:</span>
            <span className="text-emerald-400 font-extrabold">₹350.00</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 text-[10px] font-bold">
          <div className="py-1.5 bg-purple-950/45 border border-purple-500/20 text-purple-400 rounded-lg text-center">Add Cash</div>
          <div className="py-1.5 bg-emerald-950/45 border border-emerald-500/20 text-emerald-400 rounded-lg text-center">Withdraw</div>
        </div>
      </div>
    )
  },
  {
    step: '4',
    heading: '🏆 Tournaments: Pay Entry Fee & Join Lobby',
    hinglishScript: "Homepage par tournaments cards par entry fee, prize pool aur slots details dekh sakte hain. 'View Details' par click karke rules read karein aur 'Pay & Register' button se register karein. Agar aapke pass coupon code hai, toh extra discount ke liye add kar sakte hain.",
    hindiScript: "होमपेज पर टूर्नामेंट्स कार्ड्स पर एंट्री फीस, प्राइज पूल और स्लॉट्स डिटेल्स देख सकते हैं। 'व्यू डिटेल्स' पर क्लिक करके रूल्स रीड करें और 'पे एंड रजिस्टर' बटन से रजिस्टर करें। अगर आपके पास कूपन कोड है, तो एक्स्ट्रा डिस्काउंट के लिए ऐड कर सकते हैं।",
    component: (
      <div className="w-full max-w-xs p-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-left space-y-3">
        <h5 className="text-xs font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping" />
          Active Lobby
        </h5>
        <div className="text-sm font-black text-zinc-200">Erangle Squad Clash</div>
        <div className="grid grid-cols-2 gap-3 text-xs bg-zinc-950 p-2.5 rounded-xl border border-zinc-850">
          <div>
            <span className="text-zinc-500 block text-[9px] uppercase font-bold">Entry Fee</span>
            <span className="text-zinc-200 font-black">₹10.00</span>
          </div>
          <div>
            <span className="text-zinc-500 block text-[9px] uppercase font-bold">Slots</span>
            <span className="text-zinc-200 font-black">1/100</span>
          </div>
        </div>
      </div>
    )
  },
  {
    step: '5',
    heading: '🔑 Room Credentials: Get Room ID & Password',
    hinglishScript: "Match ke start time se thik 15 minutes pehle, aapko dashboard par active match detail page par aana hoga. Yahan screen par Room ID aur Password live show ho jayega. Use copy karein aur game app me room join karein.",
    hindiScript: "मैच के स्टार्ट टाइम से ठीक 15 मिनट पहले, आपको डैशबोर्ड पर एक्टिव मैच डिटेल पेज पर आना होगा। यहां स्क्रीन पर रूम आईडी और पासवर्ड लाइव शो हो जाएगा। उसे कॉपी करें और गेम ऐप में रूम ज्वाइन करें।",
    component: (
      <div className="w-full max-w-sm p-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-left space-y-3">
        <h5 className="text-xs font-bold text-yellow-500 uppercase tracking-widest">Match Credentials</h5>
        <div className="p-3 bg-zinc-950 border border-zinc-850 rounded-xl space-y-2 font-mono text-xs">
          <div className="flex justify-between">
            <span className="text-zinc-500">ROOM ID:</span>
            <span className="text-yellow-500 font-black">887201</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">PASSWORD:</span>
            <span className="text-yellow-500 font-black">mash123</span>
          </div>
        </div>
      </div>
    )
  },
  {
    step: '6',
    heading: '💰 Winning Payouts: Automatic 50/30/20 Distribution',
    hinglishScript: "Match complete hone par admin results publish karega. Humare automatic prize distribution system ke anusaar, winners ki list final hote hi Rank 1 (50%), Rank 2 (30%), aur Rank 3 (20%) ka prize money direct unke wallet me credit ho jata hai jise instantly withdraw kar sakte hain.",
    hindiScript: "मैच कम्पलीट होने पर एडमिन रिजल्ट्स पब्लिश करेगा। हमारे ऑटोमेटिक प्राइज डिस्ट्रीब्यूशन सिस्टम के अनुसार, विनर्स की लिस्ट फाइनल होते ही रैंक 1 (50%), रैंक 2 (30%), और रैंक 3 (20%) का प्राइज मनी डायरेक्ट उनके वॉलेट में क्रेडिट हो जाता है जिसे इंस्टेंटली विथड्रॉ कर सकते हैं।",
    component: (
      <div className="flex flex-col items-center justify-center space-y-3 text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
          <Trophy className="w-8 h-8" />
        </div>
        <div className="text-sm font-bold text-zinc-200">Congratulations!</div>
        <div className="px-3 py-1 bg-emerald-950/50 border border-emerald-500/30 rounded-full text-emerald-400 text-xs font-mono font-black">
          + ₹250.00 Credited
        </div>
      </div>
    )
  }
];

export default function LandingPage() {
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialIndex, setTutorialIndex] = useState(0);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [leaderboardTab, setLeaderboardTab] = useState<'weekly' | 'monthly' | 'allTime'>('weekly');
  const [leaderboardGame, setLeaderboardGame] = useState<'All' | 'BGMI' | 'Free Fire'>('All');
  const [liveActivities, setLiveActivities] = useState<string[]>(mockActivities);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<any | null>(null);
  
  // Dynamic mock withdrawals state
  const [withdrawals, setWithdrawals] = useState<any[]>([]);

  // Raw data for leaderboard calculations
  const [rawWinners, setRawWinners] = useState<any[]>([]);
  const [rawRegistrations, setRawRegistrations] = useState<any[]>([]);
  const [rawProfiles, setRawProfiles] = useState<any>([]);
  const [rawOverrides, setRawOverrides] = useState<LeaderboardOverride[]>([]);
  const [rawHidden, setRawHidden] = useState<string[]>([]);

  // Calculate filtered leaderboard data on the fly
  const leaderboardData = React.useMemo(() => {
    const weekly = calculateLeaderboard('weekly', leaderboardGame, rawWinners, rawRegistrations, rawProfiles, tournaments, rawOverrides, rawHidden);
    const monthly = calculateLeaderboard('monthly', leaderboardGame, rawWinners, rawRegistrations, rawProfiles, tournaments, rawOverrides, rawHidden);
    const allTime = calculateLeaderboard('allTime', leaderboardGame, rawWinners, rawRegistrations, rawProfiles, tournaments, rawOverrides, rawHidden);
    return { weekly, monthly, allTime };
  }, [rawWinners, rawRegistrations, rawProfiles, leaderboardGame, tournaments, rawOverrides, rawHidden]);

  const loadLeaderboardAndActivities = async (currentTourneys: Tournament[]) => {
    try {
      let winnersList: any[] = [];
      let regsList: any[] = [];
      let profilesList: any = [];
      let withdrawalsList: any[] = [];
      let overridesList: LeaderboardOverride[] = [];
      let hiddenList: string[] = [];

      if (isMockEnabled) {
        winnersList = mockDb.getWinners();
        regsList = mockDb.getRegistrations();
        profilesList = mockDb.getProfiles();
        withdrawalsList = mockDb.getWithdrawals();
        overridesList = mockDb.getLeaderboardOverrides();
        hiddenList = mockDb.getLeaderboardHidden();
      } else {
        const { data: winData } = await supabase.from('winners').select('*');
        const { data: regData } = await supabase.from('registrations').select('*');
        const { data: profData } = await supabase.from('profiles').select('id, name, email');
        const { data: wdrData } = await supabase.from('withdrawals').select('*');
        
        winnersList = winData || [];
        regsList = regData || [];
        profilesList = profData || [];
        withdrawalsList = wdrData || [];

        try {
          const { data: ovData } = await supabase.from('leaderboard_overrides').select('*');
          overridesList = ovData as any[] || [];
        } catch {
          overridesList = mockDb.getLeaderboardOverrides();
        }

        try {
          const { data: hidData } = await supabase.from('leaderboard_hidden').select('id');
          hiddenList = hidData?.map((h: any) => h.id) || [];
        } catch {
          hiddenList = mockDb.getLeaderboardHidden();
        }
      }

      setRawWinners(winnersList);
      setRawRegistrations(regsList);
      setRawProfiles(profilesList);
      setRawOverrides(overridesList);
      setRawHidden(hiddenList);

      // Build initial activity feed
      const tourneyMap = Object.fromEntries(currentTourneys.map(t => [t.id, t]));
      
      let pMap: Record<string, any> = {};
      if (Array.isArray(profilesList)) {
        pMap = Object.fromEntries(profilesList.map(p => [p.id, p]));
      } else {
        pMap = profilesList;
      }

      const activitiesList: { text: string; time: number }[] = [];

      // 1. Add registrations
      regsList.forEach(r => {
        const name = pMap[r.user_id]?.name || r.ign || 'Gamer';
        const tTitle = tourneyMap[r.tournament_id]?.title || 'Tournament';
        activitiesList.push({
          text: `Player ${name} registered for ${tTitle}`,
          time: new Date(r.created_at || Date.now()).getTime()
        });
      });

      // 2. Add winners
      winnersList.forEach(w => {
        const name = pMap[w.user_id]?.name || 'Gamer';
        const tTitle = tourneyMap[w.tournament_id]?.title || 'Tournament';
        activitiesList.push({
          text: `Player ${name} secured Rank ${w.rank} in ${tTitle} winning ₹${w.prize_won}`,
          time: new Date(w.created_at || Date.now()).getTime()
        });
      });

      // 3. Add approved withdrawals
      withdrawalsList.forEach(w => {
        if (w.status === 'Approved') {
          const name = pMap[w.user_id]?.name || `User_${w.user_id.slice(0, 5)}`;
          activitiesList.push({
            text: `Withdrawal of ₹${w.amount} processed instantly for ${name}`,
            time: new Date(w.created_at || Date.now()).getTime()
          });
        }
      });

      // Sort by time descending
      activitiesList.sort((a, b) => b.time - a.time);

      if (activitiesList.length > 0) {
        setLiveActivities(activitiesList.slice(0, 8).map(a => a.text));
      }
    } catch (err) {
      console.error('Error loading leaderboard or activities:', err);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      let currentTourneys: Tournament[] = [];
      if (isMockEnabled) {
        const mockData = mockDb.getTournaments();
        const sorted = [...mockData].sort((a: any, b: any) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
        setTournaments(sorted as Tournament[]);
        currentTourneys = sorted;

        const wdList = mockDb.getWithdrawals().filter((w: any) => w.status === 'Approved');
        setWithdrawals(wdList);
      } else {
        // 1. Fetch tournaments
        const { data: tData, error: tError } = await supabase
          .from('tournaments')
          .select('*')
          .order('start_time', { ascending: true });

        if (tError) throw tError;
        if (tData && tData.length > 0) {
          setTournaments(tData as Tournament[]);
          currentTourneys = tData;
        } else {
          setTournaments([]);
          currentTourneys = [];
        }

        // 2. Fetch withdrawals for proofs showcase
        const { data: wdData } = await supabase
          .from('withdrawals')
          .select('*')
          .eq('status', 'Approved')
          .order('created_at', { ascending: false })
          .limit(10);
        if (wdData) {
          setWithdrawals(wdData);
        }


      }

      await loadLeaderboardAndActivities(currentTourneys);

    } catch (err) {
      console.error('Error fetching landing data:', err);
      if (isMockEnabled) {
        setTournaments(mockTournaments);
        await loadLeaderboardAndActivities(mockTournaments);
      } else {
        setTournaments([]);
        await loadLeaderboardAndActivities([]);
      }
    } finally {
      setLoading(false);
    }
  };

  // Fetch tournaments and withdrawals
  useEffect(() => {
    fetchData();

    if (isMockEnabled) {
      // Setup real-time activity marquee simulation
      const interval = setInterval(() => {
        const users = ['Ninja_007', 'GhostRider', 'Raptor_IGN', 'GamerGod', 'XenonFF', 'Spectre_BGMI'];
        const games = ['Mash Arena BGMI Squad Showdown', 'Free Fire Solo Clash Royale', 'BGMI Duo Marksman Cup'];
        const actions = [
          `Player ${users[Math.floor(Math.random() * users.length)]} check-in completed for ${games[Math.floor(Math.random() * games.length)]}`,
          `Player ${users[Math.floor(Math.random() * users.length)]} registered for ${games[Math.floor(Math.random() * games.length)]}`,
          `New tournament lobby published by administrators`,
          `Withdrawal request processed instantly to UPI ID ${users[Math.floor(Math.random() * users.length)]}@upi`
        ];
        const randomAction = actions[Math.floor(Math.random() * actions.length)];
        setLiveActivities(prev => [randomAction, ...prev.slice(0, 5)]);
      }, 6000);

      return () => clearInterval(interval);
    } else {
      // Setup Supabase Realtime subscriptions
      const registrationsChannel = supabase
        .channel('public:registrations')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'registrations' }, () => {
          fetchData();
        })
        .subscribe();

      const winnersChannel = supabase
        .channel('public:winners')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'winners' }, () => {
          fetchData();
        })
        .subscribe();

      const withdrawalsChannel = supabase
        .channel('public:withdrawals')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'withdrawals' }, () => {
          fetchData();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(registrationsChannel);
        supabase.removeChannel(winnersChannel);
        supabase.removeChannel(withdrawalsChannel);
      };
    }
  }, []);

  // Winners Carousel auto-scroll
  useEffect(() => {
    const timer = setInterval(() => {
      setCarouselIndex((prevIndex) => (prevIndex + 1) % mockWinners.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const formatCountdown = (timeStr: string) => {
    const diff = new Date(timeStr).getTime() - Date.now();
    if (diff <= 0) return 'Live / Started';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${mins}m remaining`;
  };

  return (
    <div className="w-full flex flex-col relative overflow-hidden premium-cyber-bg">
      {/* Background neon glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[700px] h-[700px] rounded-full bg-purple-900/15 blur-[150px] pointer-events-none animate-pulse duration-[6000ms]" />
      <div className="absolute top-[35%] right-[-10%] w-[600px] h-[600px] rounded-full bg-cyan-900/15 blur-[150px] pointer-events-none animate-pulse duration-[8000ms]" />
      <div className="absolute bottom-[10%] left-[10%] w-[500px] h-[500px] rounded-full bg-pink-900/10 blur-[150px] pointer-events-none" />

      {/* HERO SECTION */}
      <section className="relative pt-20 pb-12 sm:pt-32 sm:pb-20 px-4 max-w-7xl mx-auto w-full flex flex-col items-center justify-center text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="space-y-6 max-w-3xl"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-950/40 border border-purple-500/30 text-purple-400 text-xs sm:text-sm font-bold tracking-wider uppercase mb-2">
            <Zap className="w-4 h-4 text-purple-400 animate-pulse" />
            Competitive Arena Live
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-tight">
            Play <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-500 text-glow-purple">BGMI</span> & <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-teal-400 text-glow-cyan">Free Fire</span> Tournaments. <br />
            <span className="text-zinc-100">Win Real Rewards.</span>
          </h1>

          <p className="text-base sm:text-xl text-zinc-400 leading-relaxed max-w-2xl mx-auto">
            Experience premium, automated esports matchmaking. Enter competitive lobbies, dominate the map, and withdraw cash prizes instantly to your UPI.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6">
            <Link
              href="/dashboard"
              className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-[0_0_25px_rgba(147,51,234,0.45)] hover:shadow-[0_0_35px_rgba(147,51,234,0.65)] transition-all flex items-center justify-center gap-2 group border border-purple-400/20 text-base"
            >
              Join Tournaments
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <a
              href="#upcoming-tournaments"
              className="w-full sm:w-auto px-8 py-4 bg-zinc-900/80 hover:bg-zinc-800/80 text-zinc-300 hover:text-white font-bold rounded-xl border border-zinc-800 transition-all flex items-center justify-center gap-2 text-base"
            >
              <Play className="w-4 h-4" />
              View Live Matches
            </a>
          </div>
        </motion.div>
      </section>

      {/* LIVE ACTIVITY TICKER */}
      <div className="w-full bg-zinc-950/80 border-y border-zinc-900 py-3.5 relative overflow-hidden backdrop-blur-sm z-20">
        <div className="max-w-7xl mx-auto px-4 flex items-center gap-4">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded bg-purple-950/40 border border-purple-500/20 text-purple-400 text-[10px] font-black uppercase tracking-wider flex-shrink-0">
            <Flame className="w-3.5 h-3.5 animate-bounce" />
            Live Feed
          </div>
          <div className="w-full overflow-hidden relative h-5">
            <div className="flex gap-12 animate-marquee whitespace-nowrap text-xs text-zinc-450 font-semibold absolute">
              {liveActivities.map((act, index) => (
                <span key={index} className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  {act}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* LIVE STATISTICS */}
      <section className="border-b border-zinc-900 bg-zinc-950/20 py-12 px-4">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { label: 'Active Players', value: '45,820+', icon: Users, color: 'text-purple-400' },
            { label: 'Total Prize Distributed', value: '₹12,45,000+', icon: Trophy, color: 'text-cyan-400' },
            { label: 'Tournaments Finished', value: '1,420+', icon: Award, color: 'text-purple-400' },
            { label: 'Live/Today Matches', value: '24', icon: Play, color: 'text-emerald-400' }
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="space-y-2 flex flex-col items-center"
            >
              <div className={`p-3 rounded-xl bg-zinc-900 border border-zinc-850 ${stat.color} mb-1`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <div className="text-2xl sm:text-3xl font-black tracking-tight text-white">{stat.value}</div>
              <div className="text-xs sm:text-sm text-zinc-400 font-semibold">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* TOURNAMENTS SECTION */}
      <section id="upcoming-tournaments" className="py-20 px-4 max-w-7xl mx-auto w-full">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-12">
          <div>
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
              Featured Tournaments
            </h2>
            <p className="text-sm sm:text-base text-zinc-400 mt-2">
              Ready up. Register now to book your slots before they overflow.
            </p>
          </div>
          <Link
            href="/dashboard"
            className="text-purple-400 hover:text-purple-300 font-bold flex items-center gap-1.5 transition-colors group text-sm sm:text-base"
          >
            Explore Dashboard
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Tournaments Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-80 rounded-2xl bg-zinc-900/40 border border-zinc-800 animate-pulse" />
            ))
          ) : (
            tournaments.map((t, idx) => {
              const isBGMI = t.game === 'BGMI';
              const filledPercent = (t.filled_slots / t.total_slots) * 100;
              return (
                <motion.div
                  key={t.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1 }}
                  whileHover={{ y: -8 }}
                  className="rounded-2xl glass-panel border border-zinc-800/80 p-5 sm:p-6 flex flex-col justify-between hover:border-purple-500/30 transition-all duration-300 relative overflow-hidden group"
                >
                  {/* Game Glow Line */}
                  <div className={`absolute top-0 left-0 right-0 h-[3px] ${isBGMI ? 'bg-gradient-to-r from-purple-500 to-indigo-500 shadow-[0_0_15px_rgba(147,51,234,0.7)]' : 'bg-gradient-to-r from-cyan-500 to-blue-500 shadow-[0_0_15px_rgba(6,182,212,0.7)]'}`} />

                  {/* Header */}
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <span className={`px-2.5 py-1 rounded text-xs font-black tracking-widest uppercase ${isBGMI ? 'bg-purple-950/50 text-purple-400 border border-purple-500/20' : 'bg-cyan-950/50 text-cyan-400 border border-cyan-500/20'}`}>
                        {t.game}
                      </span>
                      <span className="text-zinc-500 text-xs font-semibold flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(t.start_time).toLocaleDateString()}
                      </span>
                    </div>

                    <h3 className="text-lg sm:text-xl font-bold text-zinc-100 group-hover:text-white transition-colors line-clamp-1 mb-2">
                      {t.title}
                    </h3>

                    {/* Mode info */}
                    <div className="flex gap-4 text-xs text-zinc-400 mb-6 font-semibold">
                      <span>Mode: <strong className="text-zinc-200">{t.mode}</strong></span>
                      <span>•</span>
                      <span>Map: <strong className="text-zinc-200">{isBGMI ? 'Erangel' : 'Bermuda'}</strong></span>
                    </div>

                    {/* Prize & Fee Panels */}
                    <div className="grid grid-cols-2 gap-4 py-3.5 px-4 bg-zinc-950/80 rounded-xl border border-zinc-900 mb-6">
                      <div>
                        <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Prize Pool</div>
                        <div className="text-lg font-black text-emerald-400">
                          ₹{t.entry_fee > 0 ? (Number(t.entry_fee) * t.total_slots * 0.50).toFixed(0) : t.prize_pool}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Entry Fee</div>
                        <div className="text-lg font-black text-zinc-200">
                          {t.entry_fee === 0 ? 'FREE' : `₹${t.entry_fee}`}
                        </div>
                      </div>
                    </div>

                    {/* Slot Fill meter */}
                    <div className="space-y-2 mb-6">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-zinc-400">Slots Filled</span>
                        <span className="text-zinc-200">{t.filled_slots}/{t.total_slots}</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-zinc-900 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${isBGMI ? 'bg-purple-500' : 'bg-cyan-500'}`}
                          style={{ width: `${filledPercent}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-2 flex items-center justify-between border-t border-zinc-900 mt-4">
                    <span className="text-[11px] text-zinc-500 font-bold uppercase">
                      {formatCountdown(t.start_time)}
                    </span>
                    <Link
                      href={`/tournaments/${t.id}`}
                      className={`px-5 py-2.5 rounded-lg text-xs font-bold transition-all ${isBGMI ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-[0_0_10px_rgba(147,51,234,0.2)]' : 'bg-cyan-600 hover:bg-cyan-500 text-zinc-950 font-black'}`}
                    >
                      View Details
                    </Link>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </section>

      {/* PUBLIC LEADERBOARD SECTION */}
      <section className="bg-zinc-950/20 border-y border-zinc-900 py-20 px-4">
        <div className="max-w-7xl mx-auto w-full space-y-12">
          <div className="text-center space-y-2 max-w-xl mx-auto">
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight flex items-center justify-center gap-2">
              <Trophy className="w-8 h-8 sm:w-10 sm:h-10 text-cyan-400" />
              Public Leaderboard
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400">
              The top elite players inside Mash Arena. Leaderboards calculate daily.
            </p>
            
            {/* Tabs Headers */}
            <div className="flex bg-zinc-950/80 p-1 rounded-xl border border-zinc-900 w-full max-w-xs mx-auto mt-6">
              {(['weekly', 'monthly', 'allTime'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setLeaderboardTab(tab)}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all uppercase tracking-wider ${
                    leaderboardTab === tab
                      ? 'bg-cyan-600 text-zinc-950 font-black'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {tab === 'allTime' ? 'All Time' : tab}
                </button>
              ))}
            </div>

            {/* Game Filters */}
            <div className="flex bg-zinc-950/80 p-1.5 rounded-xl border border-zinc-900 w-full max-w-xs mx-auto mt-4 gap-1">
              {(['All', 'BGMI', 'Free Fire'] as const).map((game) => (
                <button
                  key={game}
                  onClick={() => setLeaderboardGame(game)}
                  className={`flex-1 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold transition-all uppercase tracking-wider ${
                    leaderboardGame === game
                      ? 'bg-purple-600 text-zinc-100 font-bold border border-purple-500/30'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {game === 'All' ? 'All Games' : game}
                </button>
              ))}
            </div>
          </div>

          {/* Leaderboard Cards & Table */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {/* Top 3 Premium Grid */}
            <div className="lg:col-span-1 space-y-4">
              <h3 className="text-sm font-bold uppercase text-zinc-550 tracking-widest mb-4 flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-purple-400" /> Top Champions
              </h3>
              {(leaderboardData[leaderboardTab]?.length > 0 ? leaderboardData[leaderboardTab] : mockLeaderboard[leaderboardTab]).slice(0, 3).map((player, idx) => {
                const colors = [
                  'from-purple-950/40 to-zinc-900 border-purple-500/30 shadow-[0_0_15px_rgba(147,51,234,0.15)]',
                  'from-cyan-950/30 to-zinc-900 border-cyan-500/20 shadow-[0_0_10px_rgba(6,182,212,0.1)]',
                  'from-amber-950/20 to-zinc-900 border-amber-500/20'
                ];
                return (
                  <div key={idx} className={`p-4 bg-gradient-to-br border rounded-2xl flex items-center justify-between gap-4 ${colors[idx]}`}>
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{player.avatar}</span>
                      <div>
                        <div className="font-black text-sm text-zinc-100">{player.name}</div>
                        <div className="text-[10px] text-zinc-500 font-bold">{player.wins} Tournament Wins</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-zinc-500 font-semibold">Earnings</div>
                      <div className="font-mono font-black text-sm text-emerald-400">₹{player.earnings}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Table Details */}
            <div className="lg:col-span-2 glass-panel border border-zinc-850 rounded-2xl p-5 sm:p-6">
              <h3 className="text-sm font-bold uppercase text-zinc-450 tracking-wider mb-6">Detailed Rankings</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-900 text-zinc-500 font-bold uppercase pb-3">
                      <th className="pb-3">Rank</th>
                      <th className="pb-3">Player Name</th>
                      <th className="pb-3">Wins</th>
                      <th className="pb-3">Participation</th>
                      <th className="pb-3 text-right">Total Earnings</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-950">
                    {(leaderboardData[leaderboardTab]?.length > 0 ? leaderboardData[leaderboardTab] : mockLeaderboard[leaderboardTab]).slice(0, 10).map((p, idx) => (
                      <tr key={idx} className="text-zinc-350 hover:bg-zinc-900/10">
                        <td className="py-4 font-black text-zinc-550">#{idx + 1}</td>
                        <td className="py-4 font-bold text-zinc-200 flex items-center gap-2">
                          <span className="text-base">{p.avatar}</span>
                          {p.name}
                        </td>
                        <td className="py-4 font-bold">{p.wins} wins</td>
                        <td className="py-4 text-zinc-500">{p.matches} matches</td>
                        <td className="py-4 text-right font-mono font-black text-emerald-400">₹{p.earnings}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* WITHDRAWAL TRUST SHOWCASE */}
      <section className="py-20 px-4 max-w-7xl mx-auto w-full">
        <div className="text-center space-y-2 max-w-xl mx-auto mb-12">
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight flex items-center justify-center gap-2">
            <CheckCircle2 className="w-8 h-8 sm:w-10 sm:h-10 text-emerald-400 animate-pulse" />
            Verified Withdrawals
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400">
            Real proofs. Real payments. We display recently approved UPI withdrawals to ensure complete platform transparency.
          </p>
        </div>

        {withdrawals.length === 0 ? (
          <p className="text-xs text-zinc-500 italic text-center py-6">No verified withdrawals found yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {withdrawals.slice(0, 4).map((w, idx) => (
              <div
                key={w.id}
                className="p-4 rounded-2xl glass-panel border border-zinc-800/80 hover:border-emerald-500/20 transition-all duration-300 flex flex-col justify-between gap-4 group"
              >
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs text-zinc-500 font-bold uppercase">
                    <span>Gamer</span>
                    <span className="text-[10px] bg-emerald-950/40 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20">
                      Paid
                    </span>
                  </div>
                  <div className="font-black text-zinc-200">User ID: {w.user_id.slice(0, 12)}...</div>
                  <div className="text-xs text-zinc-500 font-semibold">
                    UPI ID: <span className="font-mono text-zinc-400">{w.upi_id}</span>
                  </div>
                </div>

                <div className="space-y-3 pt-3 border-t border-zinc-900">
                  <div className="flex justify-between items-end">
                    <div>
                      <span className="block text-[10px] text-zinc-500 uppercase font-black">Amount</span>
                      <strong className="text-base font-black text-emerald-400">₹{w.amount}</strong>
                    </div>
                    <span className="text-[10px] text-zinc-500 font-semibold">{new Date(w.created_at).toLocaleDateString()}</span>
                  </div>

                  <button
                    onClick={() => setSelectedWithdrawal(w)}
                    className="w-full py-2 bg-zinc-950 hover:bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-900 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    View Receipt
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* HOW IT WORKS */}
      <section className="bg-zinc-950/40 border-y border-zinc-900 py-20 px-4">
        <div className="max-w-7xl mx-auto w-full text-center">
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight mb-2">
            How It Works
          </h2>
          <p className="text-sm sm:text-base text-zinc-400 max-w-lg mx-auto mb-16">
            Get started in 5 simple steps. Zero complexities.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-8 relative">
            {[
              { step: '1', title: 'Register', desc: 'Create a free profile and add your BGMI/Free Fire game IDs.' },
              { step: '2', title: 'Deposit Funds', desc: 'Add mock funds securely into your personal gaming wallet.' },
              { step: '3', title: 'Join Lobby', desc: 'Find a match, pay the entry fee, and reserve your tournament slot.' },
              { step: '4', title: 'Receive Code', desc: 'Receive Room ID and password in your dashboard 15 mins prior.' },
              { step: '5', title: 'Win & Payout', desc: 'Score kills or chicken dinner, get prizes credited, and withdraw.' }
            ].map((s, idx) => (
              <div key={s.step} className="flex flex-col items-center space-y-4 relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-xl font-black text-purple-400 shadow-[0_0_15px_rgba(147,51,234,0.1)]">
                  {s.step}
                </div>
                <h3 className="text-lg font-bold text-zinc-200">{s.title}</h3>
                <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed max-w-xs">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* INTERACTIVE VIDEO TUTORIAL MODAL */}
        {showTutorial && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm">
            <div className="w-full max-w-5xl bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col md:flex-row h-[90vh] md:h-[600px]">
              {/* Left Column: Playable Video Player */}
              <div className="w-full md:w-3/5 bg-black flex flex-col justify-between relative p-4 border-b md:border-b-0 md:border-r border-zinc-850">
                {/* Top info */}
                <div className="flex justify-between items-center text-[10px] text-zinc-400 z-10 mb-2">
                  <span className="font-bold text-zinc-300">Mash Arena Playable Tutorial Video</span>
                  <span className="px-2 py-0.5 rounded bg-purple-600 text-white font-extrabold text-[9px] uppercase tracking-wider animate-pulse">Playable Video</span>
                </div>

                {/* The video iframe */}
                <div className="flex-grow w-full relative bg-zinc-950 rounded-xl overflow-hidden min-h-[220px] md:min-h-0">
                  <iframe
                    src="https://www.youtube.com/embed/dQw4w9WgXcQ"
                    title="Mash Arena Tutorial Walkthrough Video"
                    className="absolute inset-0 w-full h-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                </div>

                {/* Player Branding */}
                <div className="flex justify-between items-center text-zinc-500 text-[10px] pt-3 font-semibold">
                  <span>Configured by Admin settings</span>
                  <span>Mash Arena Playback System</span>
                </div>
              </div>

              {/* Right Column: Hinglish Step-by-Step Clicks Guide */}
              <div className="w-full md:w-2/5 bg-zinc-900 p-6 flex flex-col justify-between overflow-y-auto">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-ping" />
                      Hinglish Step-by-Step Clicks Guide
                    </h3>
                    <button 
                      onClick={() => setShowTutorial(false)}
                      className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Interactive Steps Selection Tabs */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {['Profile & Wallet', 'Join Tournaments', 'Room Code Lobby', 'Winner Winnings'].map((stepTitle, idx) => (
                      <button
                        key={idx}
                        onClick={() => setTutorialIndex(idx)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-black border transition-all ${
                          tutorialIndex === idx
                            ? 'bg-purple-600 border-purple-500 text-white'
                            : 'bg-zinc-950 border-zinc-850 text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        {stepTitle}
                      </button>
                    ))}
                  </div>

                  {/* Steps Content explaining exactly where to click to do what */}
                  <div className="space-y-3">
                    {tutorialIndex === 0 && (
                      <div className="space-y-3 text-xs leading-relaxed text-zinc-300">
                        <div className="p-3 bg-purple-950/20 border border-purple-500/20 rounded-xl font-bold text-purple-300">
                          👤 Step 1: Profile aur Wallet Setup
                        </div>
                        <p>
                          <strong>Kahan click karein:</strong>
                          <br />
                          1. Screen ke top right corner me <strong>MASH ARENA</strong> profile dropdown ya <strong>Dashboard</strong> button par click karein.
                          <br />
                          2. Page ke bottom me scroll karke <strong>Profile configuration</strong> me jaa kar apna BGMI / Free Fire UID aur IGN save karein.
                          <br />
                          3. Dashboard me wallet card par <strong>Add Cash</strong> par click karein, open QR scan karein, pay karke UTR ID submit karein.
                        </p>
                        <p className="text-[11px] text-zinc-500 italic">
                          Hinglish Script: "Top bar me Dashboard click karke profile details configure karein, fir Wallet balance card se deposit details save karein."
                        </p>
                      </div>
                    )}

                    {tutorialIndex === 1 && (
                      <div className="space-y-3 text-xs leading-relaxed text-zinc-300">
                        <div className="p-3 bg-purple-950/20 border border-purple-500/20 rounded-xl font-bold text-purple-300">
                          🏆 Step 2: Tournaments Lobbies me register hona
                        </div>
                        <p>
                          <strong>Kahan click karein:</strong>
                          <br />
                          1. Logo ya <strong>Home</strong> link par click karke homepage par jayein.
                          <br />
                          2. Apna pasandida match search karein aur card ke bottom right corner me <strong>View Details</strong> button click karein.
                          <br />
                          3. Details panel me <strong>Pay & Register</strong> button click karein (agar coupon code hai to insert karke click apply karein).
                        </p>
                        <p className="text-[11px] text-zinc-500 italic">
                          Hinglish Script: "Match card par View Details aur fir register confirm karne ke liye Pay & Register button click karein."
                        </p>
                      </div>
                    )}

                    {tutorialIndex === 2 && (
                      <div className="space-y-3 text-xs leading-relaxed text-zinc-300">
                        <div className="p-3 bg-purple-950/20 border border-purple-500/20 rounded-xl font-bold text-purple-300">
                          🔑 Step 3: Room ID aur Password live receive karna
                        </div>
                        <p>
                          <strong>Kahan click karein:</strong>
                          <br />
                          1. Match day start hone se 15 minutes pehle top menu me <strong>Dashboard</strong> link click karein.
                          <br />
                          2. Active Lobbies section me apne match card ke green button <strong>Enter Lobby Page</strong> par click karein.
                          <br />
                          3. Room Card me show hone wale <strong>Room ID aur Password</strong> credentials ko copy karke game app me join room click karein.
                        </p>
                        <p className="text-[11px] text-zinc-500 italic">
                          Hinglish Script: "Match lobby page me yellow box me Room credentials show ho jayenge, copy karke game me enter karein."
                        </p>
                      </div>
                    )}

                    {tutorialIndex === 3 && (
                      <div className="space-y-3 text-xs leading-relaxed text-zinc-300">
                        <div className="p-3 bg-purple-950/20 border border-purple-500/20 rounded-xl font-bold text-purple-300">
                          💰 Step 4: Standings, Payouts aur Withdraw karna
                        </div>
                        <p>
                          <strong>Kahan click karein:</strong>
                          <br />
                          1. Game final hone ke baad admin direct winnings distribute kar dega (Rank 1, 2, or 3).
                          <br />
                          2. Apne winnings balance check karne ke liye top right corner me <strong>Wallet</strong> balance par click karein.
                          <br />
                          3. Winnings panel me <strong>Withdraw</strong> button click karein, amount aur upi ID enter karke request submit click karein!
                        </p>
                        <p className="text-[11px] text-zinc-500 italic">
                          Hinglish Script: "Admin results publish karte hi payout seedhe wallet winnings me aayega. Wallet section me UPI ID aur Amount enter karke request submit karein."
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-zinc-850 flex gap-2 mt-6">
                  <button
                    onClick={() => {
                      if (tutorialIndex === 3) {
                        setShowTutorial(false);
                      } else {
                        setTutorialIndex(prev => prev + 1);
                      }
                    }}
                    className="flex-grow py-2.5 bg-purple-600 hover:bg-purple-500 text-zinc-100 rounded-xl text-xs font-bold transition-colors"
                  >
                    {tutorialIndex === 3 ? 'Close Guide (गाइड बंद करें)' : 'Next Step (अगला स्टेप)'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* WINNER SHOWCASE CAROUSEL */}
      <section className="py-20 px-4 max-w-7xl mx-auto w-full text-center">
        <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight mb-2">
          Winner Showcase
        </h2>
        <p className="text-sm sm:text-base text-zinc-400 mb-12">
          Join the hall of fame. Real players winning real cash.
        </p>

        <div className="max-w-xl mx-auto glass-panel border border-zinc-800/80 rounded-2xl p-6 sm:p-8 hover:border-purple-500/20 transition-colors relative overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={carouselIndex}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.4 }}
              className="space-y-4"
            >
              <div className="flex justify-center mb-2">
                <div className="p-3 rounded-full bg-emerald-950/50 border border-emerald-500/30 text-emerald-400">
                  <Star className="w-8 h-8 fill-emerald-400" />
                </div>
              </div>
              <div className="text-xl sm:text-2xl font-black text-white">
                {mockWinners[carouselIndex].name}
              </div>
              <div className="text-sm font-semibold text-zinc-400">
                Won <strong className="text-emerald-400 font-extrabold text-base">₹{mockWinners[carouselIndex].amount}</strong> in {mockWinners[carouselIndex].tournament}
              </div>
              <div className="inline-block px-3 py-1 rounded-full bg-zinc-950 border border-zinc-900 text-xs font-bold text-zinc-400 uppercase">
                Rank #{mockWinners[carouselIndex].rank} • {mockWinners[carouselIndex].game}
              </div>

              {/* Mock Proof Box */}
              <div className="mt-4 pt-4 border-t border-zinc-900 flex items-center justify-center gap-2 text-[10px] sm:text-xs text-zinc-500">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                Verified Screenshot Proof uploaded in Dashboard
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Dots Indicator */}
          <div className="flex justify-center gap-1.5 mt-6">
            {mockWinners.map((_, i) => (
              <button
                key={i}
                onClick={() => setCarouselIndex(i)}
                className={`w-2 h-2 rounded-full transition-all ${carouselIndex === i ? 'bg-purple-500 w-4' : 'bg-zinc-800'}`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* FAQ SECTION */}
      <section className="bg-zinc-950/40 border-t border-zinc-900 py-20 px-4">
        <div className="max-w-3xl mx-auto w-full">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight flex items-center justify-center gap-2.5">
              <HelpCircle className="w-8 h-8 sm:w-12 sm:h-12 text-purple-400" />
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => {
              const isOpen = activeFaq === idx;
              return (
                <div
                  key={idx}
                  className="rounded-xl border border-zinc-850 glass-panel overflow-hidden transition-all duration-300"
                >
                  <button
                    onClick={() => setActiveFaq(isOpen ? null : idx)}
                    className="w-full flex items-center justify-between p-5 text-left font-bold text-zinc-200 hover:text-white focus:outline-none"
                  >
                    <span>{faq.question}</span>
                    <ChevronDown className={`w-5 h-5 text-purple-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </button>
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <div className="p-5 pt-0 text-sm text-zinc-400 leading-relaxed border-t border-zinc-900">
                          {faq.answer}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* PROOF SCREENSHOT LIGHTBOX MODAL */}
      <AnimatePresence>
        {selectedWithdrawal && (
          <div 
            onClick={() => setSelectedWithdrawal(null)}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-950/95 backdrop-blur-md cursor-zoom-out"
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative max-w-md w-full bg-zinc-900/90 border border-zinc-800/80 rounded-3xl overflow-hidden p-6 shadow-[0_0_50px_rgba(0,0,0,0.8)] backdrop-blur-xl cursor-default"
            >
              {/* Close Button */}
              <button
                onClick={() => setSelectedWithdrawal(null)}
                className="absolute top-4 right-4 z-10 p-2 rounded-full bg-zinc-950/80 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
              >
                <ChevronDown className="w-5 h-5 rotate-90" />
              </button>

              {/* Premium Digital Receipt */}
              <div className="flex flex-col justify-between space-y-6 bg-zinc-950/60 rounded-2xl p-5 border border-zinc-850">
                <div className="space-y-4">
                  {/* Payout Header */}
                  <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
                    <div>
                      <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Verified Payout</span>
                      <h3 className="font-extrabold text-sm text-zinc-155 flex items-center gap-1.5">
                        <Trophy className="w-4 h-4 text-purple-400" />
                        Mash Arena
                      </h3>
                    </div>
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/50 border border-emerald-500/30 text-emerald-400 text-[10px] font-black uppercase tracking-wider shadow-[0_0_10px_rgba(16,185,129,0.15)]">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Success
                    </div>
                  </div>

                  {/* Transaction Amount */}
                  <div className="text-center py-4 bg-zinc-900/40 rounded-xl border border-zinc-900/60">
                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Transferred Amount</span>
                    <strong className="text-3xl font-black text-emerald-400 font-mono tracking-tight block mt-1">
                      ₹{Number(selectedWithdrawal.amount).toFixed(2)}
                    </strong>
                  </div>

                  {/* Transaction Metadata */}
                  <div className="space-y-2.5 text-xs">
                    <div className="flex justify-between items-center py-1.5 border-b border-zinc-900/30">
                      <span className="text-zinc-500 font-medium">Recipient User ID</span>
                      <span className="font-mono text-zinc-350 font-semibold">{selectedWithdrawal.user_id.slice(0, 16)}...</span>
                    </div>
                    <div className="flex justify-between items-center py-1.5 border-b border-zinc-900/30">
                      <span className="text-zinc-500 font-medium">Destination UPI ID</span>
                      <span className="font-mono text-zinc-200 font-bold">{selectedWithdrawal.upi_id}</span>
                    </div>
                    <div className="flex justify-between items-center py-1.5 border-b border-zinc-900/30">
                      <span className="text-zinc-500 font-medium">Transaction Date</span>
                      <span className="text-zinc-350 font-semibold">{new Date(selectedWithdrawal.created_at).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center py-1.5 border-b border-zinc-900/30">
                      <span className="text-zinc-500 font-medium">Reference ID</span>
                      <span className="font-mono text-purple-400 font-bold tracking-wider">
                        TXN{selectedWithdrawal.id.slice(0, 8).toUpperCase()}{new Date(selectedWithdrawal.created_at).getTime().toString().slice(-4)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Verification Footer Banner */}
                <div className="p-3 bg-purple-950/20 border border-purple-500/10 rounded-xl flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400">
                    <CheckCircle2 className="w-4 h-4 text-purple-400" />
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-150 font-bold block">UPI Payout Verified</span>
                    <span className="text-[9px] text-zinc-550 block font-semibold">Funds cleared instantly to recipient's bank account</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
