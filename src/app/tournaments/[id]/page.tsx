'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { isMockEnabled, mockDb } from '@/lib/mockDb';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, Calendar, Users, Award, ShieldAlert,
  Loader2, CheckCircle2, Key, Info, Gamepad2, ArrowLeft,
  Camera, Upload, ExternalLink, Tag, Play
} from 'lucide-react';
import Link from 'next/link';

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
  room_published: boolean;
}

interface Registration {
  id: string;
  tournament_id: string;
  user_id: string;
  game_id: string;
  ign: string;
  created_at: string;
  profiles?: {
    name: string;
  };
}

interface RoomDetails {
  room_id: string;
  room_password: string;
}

export default function TournamentDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user, profile, wallet, refreshWallet } = useAuth();

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [isJoined, setIsJoined] = useState(false);
  const [userRegistration, setUserRegistration] = useState<any | null>(null);
  const [roomDetails, setRoomDetails] = useState<RoomDetails | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [joinLoading, setJoinLoading] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form inputs for joining
  const [gameIdInput, setGameIdInput] = useState('');
  const [ignInput, setIgnInput] = useState('');

  // Coupon states
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<any | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [discountAmount, setDiscountAmount] = useState(0);

  // Proofs states
  const [proofs, setProofs] = useState<any[]>([]);
  const [proofTitle, setProofTitle] = useState('');
  const [proofUrl, setProofUrl] = useState('');
  const [uploadingProof, setUploadingProof] = useState(false);
  const [activeLightboxImage, setActiveLightboxImage] = useState<string | null>(null);

  const handleStartGame = (game: 'BGMI' | 'Free Fire') => {
    const isAndroid = /Android/i.test(navigator.userAgent);
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

    let appUri = '';
    let playStoreUrl = '';
    let appStoreUrl = '';
    let desktopUrl = '';

    if (game === 'BGMI') {
      appUri = 'imobile://';
      playStoreUrl = 'https://play.google.com/store/apps/details?id=com.pubg.imobile';
      appStoreUrl = 'https://apps.apple.com/in/app/battlegrounds-mobile-india/id1526436257';
      desktopUrl = 'https://www.battlegroundsmobileindia.com/';
    } else {
      appUri = 'freefire://';
      playStoreUrl = 'https://play.google.com/store/apps/details?id=com.dts.freefireth';
      appStoreUrl = 'https://apps.apple.com/us/app/garena-free-fire-winterlands/id1300142457';
      desktopUrl = 'https://ff.garena.com/';
    }

    const downloadUrl = isAndroid ? playStoreUrl : isIOS ? appStoreUrl : desktopUrl;

    const start = Date.now();
    window.location.href = appUri;

    setTimeout(() => {
      if (Date.now() - start < 2200) {
        const confirmDownload = window.confirm(
          `It seems ${game} is not installed on your device. Would you like to download it from the official store or website?`
        );
        if (confirmDownload) {
          window.open(downloadUrl, '_blank');
        }
      }
    }, 2000);
  };

  // Helper check-in window functions
  const checkInWindowOpen = () => {
    if (!tournament) return false;
    const startTime = new Date(tournament.start_time).getTime();
    const now = Date.now();
    const timeDiff = startTime - now;
    const thirtyMins = 30 * 60 * 1000;
    const fiveMins = 5 * 60 * 1000;
    return timeDiff <= thirtyMins && timeDiff >= fiveMins;
  };

  const checkInExpired = () => {
    if (!tournament) return false;
    const startTime = new Date(tournament.start_time).getTime();
    const now = Date.now();
    const timeDiff = startTime - now;
    const fiveMins = 5 * 60 * 1000;
    return timeDiff < fiveMins;
  };

  // Fetch all details
  const fetchAllData = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);

      if (isMockEnabled) {
        // 1. Fetch Tournament
        const tourneyList = mockDb.getTournaments();
        const found = tourneyList.find((t: any) => t.id === id) as Tournament | undefined;
        if (!found) {
          setErrorMsg('Tournament not found');
          setLoading(false);
          return;
        }
        setTournament(found);

        // Check and auto-transition Pending check-ins to DNQ if check-in has expired
        const startTime = new Date(found.start_time).getTime();
        const now = Date.now();
        const timeDiff = startTime - now;
        const fiveMins = 5 * 60 * 1000;
        if (timeDiff < fiveMins) {
          const allRegs = mockDb.getRegistrations();
          let changed = false;
          const updatedRegs = allRegs.map((r: any) => {
            if (r.tournament_id === id && (!r.check_in_status || r.check_in_status === 'Pending')) {
              changed = true;
              return { ...r, check_in_status: 'DNQ' };
            }
            return r;
          });
          if (changed) {
            mockDb.saveRegistrations(updatedRegs);
          }
        }

        // 2. Fetch registrations for this tournament
        const allRegs = mockDb.getRegistrations();
        const regs = allRegs.filter((r: any) => r.tournament_id === id);
        const profilesMap = mockDb.getProfiles();
        const mappedRegs = regs.map((r: any) => ({
          ...r,
          profiles: {
            name: profilesMap[r.user_id]?.name || 'Player'
          }
        }));
        setRegistrations(mappedRegs);

        if (user) {
          const userReg = mappedRegs.find((r: any) => r.user_id === user.id);
          if (userReg) {
            setIsJoined(true);
            setUserRegistration(userReg);
          }
        }

        // 3. Fetch Room details if joined and published
        if (user && found.room_published) {
          const roomsMap = mockDb.getRooms();
          const room = roomsMap[id as string];
          if (room) {
            setRoomDetails(room);
          }
        }

        // 4. Fetch Proofs
        const allProofs = mockDb.getMatchProofs();
        setProofs(allProofs.filter((p: any) => p.tournament_id === id));
        setLoading(false);
        return;
      }

      // 1. Fetch Tournament
      const { data: tourneyData, error: tourneyError } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', id)
        .single();

      let currentTourney = tourneyData as Tournament | null;

      if (tourneyError) {
        console.warn('Tournament not found, using mock data');
        const fallback = getMockTournament(id as string);
        if (fallback) {
          setTournament(fallback);
          currentTourney = fallback;
        } else {
          setErrorMsg('Tournament not found');
        }
      } else {
        setTournament(tourneyData as Tournament);
      }

      // Check and auto-transition Pending check-ins to DNQ if check-in has expired
      if (currentTourney) {
        const startTime = new Date(currentTourney.start_time).getTime();
        const now = Date.now();
        const timeDiff = startTime - now;
        const fiveMins = 5 * 60 * 1000;
        if (timeDiff < fiveMins) {
          await supabase
            .from('registrations')
            .update({ check_in_status: 'DNQ' })
            .eq('tournament_id', id)
            .eq('check_in_status', 'Pending');
        }
      }

      // 2. Fetch registrations for this tournament
      let regsData = null;
      let regsError = null;

      const { data: joinedData, error: joinError } = await supabase
        .from('registrations')
        .select('*, profiles(name)')
        .eq('tournament_id', id);

      if (!joinError && joinedData) {
        regsData = joinedData;
      } else {
        // Fallback: fetch registrations and profiles separately
        const { data: rawRegs, error: rawError } = await supabase
          .from('registrations')
          .select('*')
          .eq('tournament_id', id);

        if (!rawError && rawRegs) {
          if (rawRegs.length > 0) {
            const userIds = rawRegs.map(r => r.user_id);
            const { data: profilesData } = await supabase
              .from('profiles')
              .select('id, name')
              .in('id', userIds);

            const profMap: Record<string, any> = {};
            if (profilesData) {
              profilesData.forEach(p => {
                profMap[p.id] = p;
              });
            }
            regsData = rawRegs.map(r => ({
              ...r,
              profiles: profMap[r.user_id] || { name: 'Player' }
            }));
          } else {
            regsData = [];
          }
        } else {
          regsError = rawError;
        }
      }

      if (!regsError && regsData) {
        setRegistrations(regsData as any[]);
        
        // Check if current user is registered
        if (user) {
          const userReg = regsData.find(r => r.user_id === user.id);
          if (userReg) {
            setIsJoined(true);
            setUserRegistration(userReg);
          }
        }
      }

      // 3. Fetch Room details if joined and published
      if (user && (tourneyData?.room_published || (tourneyData === null && getMockTournament(id as string)?.room_published))) {
        const { data: roomData, error: roomError } = await supabase
          .from('tournament_rooms')
          .select('*')
          .eq('tournament_id', id)
          .single();

        if (!roomError && roomData) {
          setRoomDetails(roomData as RoomDetails);
        }
      }

      // 4. Fetch Match Proofs
      const { data: proofsData } = await supabase
        .from('match_proofs')
        .select('*')
        .eq('tournament_id', id);
      if (proofsData) {
        setProofs(proofsData);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to load tournament details');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyCoupon = async () => {
    if (!couponInput) return;
    setCouponError(null);
    try {
      if (isMockEnabled) {
        const coupons = mockDb.getCoupons();
        const coupon = coupons.find((c: any) => c.code.toUpperCase() === couponInput.toUpperCase());
        if (!coupon) throw new Error('Invalid coupon code');
        if (new Date() > new Date(coupon.expiry_date)) throw new Error('Coupon has expired');
        if (coupon.times_used >= coupon.usage_limit) throw new Error('Coupon usage limit reached');
        
        setAppliedCoupon(coupon);
        let discount = 0;
        if (coupon.type === 'Fixed') {
          discount = coupon.value;
        } else {
          discount = (coupon.value / 100) * (tournament?.entry_fee || 0);
        }
        if (discount > (tournament?.entry_fee || 0)) discount = tournament?.entry_fee || 0;
        setDiscountAmount(discount);
        alert(`Coupon ${coupon.code} applied! Discount: ₹${discount}`);
      } else {
        const { data, error } = await supabase
          .from('coupons')
          .select('*')
          .eq('code', couponInput.trim().toUpperCase())
          .maybeSingle();
        
        if (error) throw error;
        if (!data) throw new Error('Invalid coupon code');
        if (new Date() > new Date(data.expiry_date)) throw new Error('Coupon has expired');
        if (data.times_used >= data.usage_limit) throw new Error('Coupon usage limit reached');

        setAppliedCoupon(data);
        let discount = 0;
        if (data.type === 'Fixed') {
          discount = data.value;
        } else {
          discount = (data.value / 100) * (tournament?.entry_fee || 0);
        }
        if (discount > (tournament?.entry_fee || 0)) discount = tournament?.entry_fee || 0;
        setDiscountAmount(discount);
        alert(`Coupon ${data.code} applied! Discount: ₹${discount}`);
      }
    } catch (err: any) {
      console.error(err);
      setCouponError(err.message || 'Failed to apply coupon');
      setAppliedCoupon(null);
      setDiscountAmount(0);
    }
  };

  const handleCheckIn = async () => {
    if (!user || !userRegistration) return;
    setJoinLoading(true);
    try {
      if (isMockEnabled) {
        const allRegs = mockDb.getRegistrations();
        const rIdx = allRegs.findIndex((r: any) => r.id === userRegistration.id);
        if (rIdx !== -1) {
          allRegs[rIdx].check_in_status = 'Checked In';
          mockDb.saveRegistrations(allRegs);
        }
        
        // Add audit log
        const auditLogs = mockDb.getAuditLogs();
        auditLogs.push({
          id: `audit-${Date.now()}`,
          action_by: user.id,
          action: 'Check-In',
          target_type: 'Registration',
          target_id: userRegistration.id,
          details: `User checked in for tournament ID: ${id}`,
          created_at: new Date().toISOString(),
        });
        mockDb.saveAuditLogs(auditLogs);

        alert('Checked in successfully!');
        await fetchAllData();
      } else {
        const { error } = await supabase
          .from('registrations')
          .update({ check_in_status: 'Checked In' })
          .eq('id', userRegistration.id);
        if (error) throw error;

        // Log audit
        await supabase.from('audit_logs').insert({
          action_by: user.id,
          action: 'Check-In',
          target_type: 'Registration',
          target_id: userRegistration.id,
          details: `User checked in for tournament ID: ${id}`,
        });

        alert('Checked in successfully!');
        await fetchAllData();
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Check-in failed');
    } finally {
      setJoinLoading(false);
    }
  };

  const handleUploadProof = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proofTitle || !proofUrl || !user) return;
    setUploadingProof(true);
    try {
      if (isMockEnabled) {
        const allProofs = mockDb.getMatchProofs();
        const newProof = {
          id: `proof-${Date.now()}`,
          tournament_id: id,
          title: proofTitle,
          image_url: proofUrl,
          uploaded_by: user.id,
          created_at: new Date().toISOString()
        };
        allProofs.push(newProof);
        mockDb.saveMatchProofs(allProofs);

        setProofTitle('');
        setProofUrl('');
        await fetchAllData();
        alert('Match proof uploaded successfully!');
      } else {
        const { error } = await supabase
          .from('match_proofs')
          .insert({
            tournament_id: id,
            title: proofTitle,
            image_url: proofUrl,
            uploaded_by: user.id
          });

        if (error) throw error;

        setProofTitle('');
        setProofUrl('');
        await fetchAllData();
        alert('Match proof uploaded successfully!');
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to upload proof');
    } finally {
      setUploadingProof(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [id, user]);

  // Autofill forms on modal open
  useEffect(() => {
    if (profile && showJoinModal) {
      const isBGMI = tournament?.game === 'BGMI';
      if (isBGMI) {
        setGameIdInput(profile.bgmi_character_id || '');
        setIgnInput(profile.bgmi_ign || '');
      } else {
        setGameIdInput(profile.freefire_uid || '');
        setIgnInput(profile.freefire_ign || '');
      }
    }
  }, [profile, showJoinModal, tournament]);

  const getMockTournament = (mockId: string): Tournament | null => {
    const list = [
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
    return (list.find(t => t.id === mockId) as Tournament) || null;
  };

  const handleJoinTournament = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gameIdInput || !ignInput) {
      alert('Please fill in both fields');
      return;
    }

    setJoinLoading(true);
    setErrorMsg(null);

    try {
      if (isMockEnabled) {
        if (!user) throw new Error('Unauthorized');
        
        // Load tournament
        const tourneyList = mockDb.getTournaments();
        const tIdx = tourneyList.findIndex((t: any) => t.id === id);
        if (tIdx === -1) throw new Error('Tournament not found');
        const tourney = tourneyList[tIdx];

        if (tourney.status !== 'Upcoming') {
          throw new Error('Registrations are closed for this tournament');
        }
        if (tourney.filled_slots >= tourney.total_slots) {
          throw new Error('Tournament slots are full');
        }

        // Check registration
        const allRegs = mockDb.getRegistrations();
        if (allRegs.some((r: any) => r.tournament_id === id && r.user_id === user.id)) {
          throw new Error('You are already registered for this tournament');
        }

        // Get wallet (include bonus wallet)
        const walletsMap = mockDb.getWallets();
        const userWallet = walletsMap[user.id] || {
          id: `w-${user.id}`,
          user_id: user.id,
          deposit_balance: 0,
          winning_balance: 0,
          bonus_balance: 0,
          created_at: new Date().toISOString()
        };

        const checkoutFee = tourney.entry_fee - discountAmount;
        const totalBal = userWallet.deposit_balance + userWallet.winning_balance + (userWallet.bonus_balance || 0);
        if (totalBal < checkoutFee) {
          throw new Error('Insufficient wallet balance. Please add funds');
        }

        // Deduct Order: Bonus -> Deposit -> Winning
        let remainingFee = checkoutFee;
        let deductBonus = 0;
        let deductDeposit = 0;
        let deductWinning = 0;

        if (userWallet.bonus_balance >= remainingFee) {
          deductBonus = remainingFee;
          remainingFee = 0;
        } else {
          deductBonus = userWallet.bonus_balance || 0;
          remainingFee -= deductBonus;
        }

        if (remainingFee > 0) {
          if (userWallet.deposit_balance >= remainingFee) {
            deductDeposit = remainingFee;
            remainingFee = 0;
          } else {
            deductDeposit = userWallet.deposit_balance;
            remainingFee -= deductDeposit;
          }
        }

        if (remainingFee > 0) {
          deductWinning = remainingFee;
        }

        userWallet.bonus_balance = (userWallet.bonus_balance || 0) - deductBonus;
        userWallet.deposit_balance -= deductDeposit;
        userWallet.winning_balance -= deductWinning;
        walletsMap[user.id] = userWallet;
        mockDb.saveWallets(walletsMap);

        // Update Coupon count
        if (appliedCoupon) {
          const coupons = mockDb.getCoupons();
          const cIdx = coupons.findIndex((c: any) => c.id === appliedCoupon.id);
          if (cIdx !== -1) {
            coupons[cIdx].times_used += 1;
            mockDb.saveCoupons(coupons);
          }
        }

        // Add registration
        const regId = `reg-${Date.now()}`;
        const newReg = {
          id: regId,
          tournament_id: id,
          user_id: user.id,
          game_id: gameIdInput,
          ign: ignInput,
          coupon_discount: discountAmount,
          check_in_status: 'Pending',
          created_at: new Date().toISOString()
        };
        allRegs.push(newReg);
        mockDb.saveRegistrations(allRegs);

        // Increment slots
        tourney.filled_slots += 1;
        tourneyList[tIdx] = tourney;
        mockDb.saveTournaments(tourneyList);

        // Add transaction
        const allTx = mockDb.getTransactions();
        allTx.push({
          id: `tx-${Date.now()}`,
          wallet_id: userWallet.id,
          type: 'Entry Fee',
          amount: checkoutFee,
          status: 'Completed',
          reference_id: regId,
          description: `Registration fee for tournament ${tourney.title} (Discount: ₹${discountAmount})`,
          created_at: new Date().toISOString()
        });
        mockDb.saveTransactions(allTx);

        alert('Joined tournament successfully!');
        setShowJoinModal(false);
        setAppliedCoupon(null);
        setCouponInput('');
        setDiscountAmount(0);
        await refreshWallet();
        await fetchAllData();
        return;
      }

      // 1. Call custom RPC database transaction
      const { data, error } = await supabase.rpc('register_for_tournament', {
        p_tournament_id: id,
        p_game_id: gameIdInput,
        p_ign: ignInput,
        p_coupon_code: appliedCoupon?.code || null
      });

      if (error) throw error;

      // 2. Success
      alert('Joined tournament successfully!');
      setShowJoinModal(false);
      setAppliedCoupon(null);
      setCouponInput('');
      setDiscountAmount(0);
      await refreshWallet();
      await fetchAllData();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'An error occurred during registration. Check wallet balance.');
    } finally {
      setJoinLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-grow flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-10 h-10 text-purple-500 animate-spin" />
      </div>
    );
  }

  if (errorMsg && !tournament) {
    return (
      <div className="flex-grow max-w-md mx-auto py-20 px-4 text-center space-y-4">
        <ShieldAlert className="w-16 h-16 text-red-500 mx-auto" />
        <h2 className="text-xl font-bold text-white">Oops!</h2>
        <p className="text-zinc-400 text-sm">{errorMsg}</p>
        <Link href="/" className="inline-block px-5 py-2 bg-zinc-900 rounded-lg text-xs text-zinc-300">
          Back to Home
        </Link>
      </div>
    );
  }

  if (!tournament) return null;

  const isBGMI = tournament.game === 'BGMI';
  const totalBalance = wallet ? wallet.deposit_balance + wallet.winning_balance + (wallet.bonus_balance || 0) : 0;
  const isBalanceSufficient = totalBalance >= (tournament.entry_fee - discountAmount);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 w-full space-y-8">
      {/* Back Button */}
      <div>
        <Link href="/" className="inline-flex items-center gap-1 text-sm font-semibold text-zinc-400 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Matches
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left: Tournament Info */}
        <div className="lg:col-span-2 space-y-6 sm:space-y-8">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-1 rounded text-xs font-black tracking-wider uppercase ${isBGMI ? 'bg-purple-950/50 text-purple-400 border border-purple-500/20' : 'bg-cyan-950/50 text-cyan-400 border border-cyan-500/20'}`}>
                {tournament.game}
              </span>
              <span className="px-2.5 py-1 rounded bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs font-semibold uppercase">
                {tournament.mode}
              </span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black text-white leading-tight">
              {tournament.title}
            </h1>

            <p className="text-xs sm:text-sm text-zinc-400 flex items-center gap-1.5 font-semibold">
              <Calendar className="w-4 h-4 text-purple-400" />
              Starts On: {new Date(tournament.start_time).toLocaleString()}
            </p>
          </div>

          {/* Details list */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 bg-zinc-950/80 rounded-xl border border-zinc-900 text-center space-y-1">
              <Trophy className="w-5 h-5 text-emerald-400 mx-auto" />
              <div className="text-[10px] text-zinc-500 uppercase font-black">Prize Pool</div>
              <div className="text-base sm:text-lg font-black text-emerald-400">₹{tournament.prize_pool}</div>
            </div>
            <div className="p-4 bg-zinc-950/80 rounded-xl border border-zinc-900 text-center space-y-1">
              <Award className="w-5 h-5 text-purple-400 mx-auto" />
              <div className="text-[10px] text-zinc-500 uppercase font-black">Entry Fee</div>
              <div className="text-base sm:text-lg font-black text-zinc-200">
                {tournament.entry_fee === 0 ? 'FREE' : `₹${tournament.entry_fee}`}
              </div>
            </div>
            <div className="p-4 bg-zinc-950/80 rounded-xl border border-zinc-900 text-center space-y-1">
              <Users className="w-5 h-5 text-cyan-400 mx-auto" />
              <div className="text-[10px] text-zinc-500 uppercase font-black">Slots</div>
              <div className="text-base sm:text-lg font-black text-zinc-200">{tournament.filled_slots}/{tournament.total_slots}</div>
            </div>
          </div>

          {/* Rules Section */}
          <div className="glass-panel border border-zinc-800/80 rounded-xl p-5 sm:p-6 space-y-4">
            <h3 className="text-lg font-bold text-zinc-200 flex items-center gap-2">
              <Info className="w-5 h-5 text-purple-400" />
              Tournament Rules
            </h3>
            <div className="text-sm text-zinc-400 leading-relaxed whitespace-pre-line">
              {tournament.rules || 'No custom rules defined. Standard tournament policies apply.'}
              <br /><br />
              <strong>Platform Match Guidelines:</strong>
              <ul className="list-disc pl-5 mt-2 space-y-1.5 text-zinc-400">
                <li>Teaming up or hacking will result in an immediate permanent ban.</li>
                <li>Make sure your In-Game Name matches your registered IGN exactly.</li>
                <li>Room ID and password will be displayed on this page 15 minutes before start.</li>
                <li>Only registered players who enter the room are eligible for rewards.</li>
              </ul>
            </div>
          </div>

          {/* Match Proofs Gallery */}
          <div className="glass-panel border border-zinc-800/80 rounded-xl p-5 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h3 className="text-lg font-bold text-zinc-200 flex items-center gap-2">
                  <Camera className="w-5 h-5 text-purple-400" />
                  Payment Proof Gallery
                </h3>
                <p className="text-xs text-zinc-550">
                  Verified screenshots of UPI prize payments made to the tournament winners.
                </p>
              </div>
              
              {profile?.is_admin && (
                <div className="text-xs font-bold text-purple-400">
                  Admin Control Panel Enabled
                </div>
              )}
            </div>

            {/* Admin proof uploading */}
            {profile?.is_admin && (
              <form onSubmit={handleUploadProof} className="p-4 bg-zinc-950/60 border border-zinc-900 rounded-xl grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  type="text"
                  required
                  value={proofTitle}
                  onChange={(e) => setProofTitle(e.target.value)}
                  placeholder="Payment Title (e.g. Rank 1 UPI Payout)"
                  className="px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-100 focus:outline-none"
                />
                <input
                  type="url"
                  required
                  value={proofUrl}
                  onChange={(e) => setProofUrl(e.target.value)}
                  placeholder="Payment Screenshot Image URL"
                  className="px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-100 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={uploadingProof}
                  className="py-2 bg-purple-650 hover:bg-purple-550 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all"
                >
                  <Upload className="w-3.5 h-3.5" />
                  {uploadingProof ? 'Uploading...' : 'Publish Payment Proof'}
                </button>
              </form>
            )}

            {proofs.length === 0 ? (
              <p className="text-xs text-zinc-550 italic text-center py-6">
                No payment proof screenshots published yet.
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {proofs.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => setActiveLightboxImage(p.image_url)}
                    className="group cursor-pointer relative rounded-xl border border-zinc-900 overflow-hidden bg-zinc-950 aspect-[4/3] transition-all hover:border-purple-500/30"
                  >
                    <img
                      src={p.image_url}
                      alt={p.title}
                      className="w-full h-full object-cover transition-transform duration-350 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 to-transparent flex flex-col justify-end p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-[10px] font-black text-white truncate">{p.title}</span>
                      <span className="text-[8px] text-zinc-400">Click to view</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Registered Players List */}
          <div className="glass-panel border border-zinc-800/80 rounded-xl p-5 sm:p-6 space-y-4">
            <h3 className="text-lg font-bold text-zinc-200 flex items-center gap-2">
              <Users className="w-5 h-5 text-cyan-400" />
              Registered Players ({registrations.length})
            </h3>
            {registrations.length === 0 ? (
              <p className="text-sm text-zinc-500 italic">No registrations yet. Be the first to join!</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {registrations.map((reg, idx) => {
                  const checkedIn = reg.check_in_status === 'Checked In';
                  const dnq = reg.check_in_status === 'DNQ';
                  return (
                    <div
                      key={reg.id}
                      className={`p-3 rounded-lg border flex items-center justify-between gap-2 text-xs font-semibold ${
                        checkedIn ? 'bg-purple-950/10 border-purple-500/20 text-purple-300' :
                        dnq ? 'bg-zinc-900 border-zinc-950 text-zinc-550 line-through' :
                        'bg-zinc-950/60 border-zinc-900 text-zinc-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-zinc-650">#{idx + 1}</span>
                        <span className="truncate" title={reg.ign}>{reg.ign}</span>
                      </div>
                      <span className="text-[8px] font-black tracking-widest uppercase">
                        {reg.check_in_status || 'Pending'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: Joining / Code Delivery Box */}
        <div className="space-y-6">
          {isJoined ? (
            /* Joined Card */
            <div className="glass-panel-purple border border-purple-500/30 rounded-2xl p-6 space-y-5">
              <div className="flex items-center gap-2 text-purple-400">
                <CheckCircle2 className="w-6 h-6" />
                <h3 className="text-lg font-bold">Successfully Registered</h3>
              </div>

              <div className="space-y-2.5 text-sm text-zinc-400">
                <div className="flex justify-between border-b border-zinc-900 pb-2">
                  <span>Registered IGN:</span>
                  <strong className="text-zinc-200">{userRegistration?.ign}</strong>
                </div>
                <div className="flex justify-between border-b border-zinc-900 pb-2">
                  <span>Registered Game ID:</span>
                  <strong className="text-zinc-200">{userRegistration?.game_id}</strong>
                </div>
                <div className="flex justify-between border-b border-zinc-900 pb-2">
                  <span>Check-In Status:</span>
                  <strong className={userRegistration?.check_in_status === 'Checked In' ? 'text-purple-400' : 'text-yellow-405'}>
                    {userRegistration?.check_in_status || 'Pending'}
                  </strong>
                </div>
              </div>

              {/* Secure check-in controls */}
              {userRegistration?.check_in_status !== 'Checked In' && (
                <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/80 space-y-3">
                  <h4 className="text-xs font-black uppercase text-zinc-450 tracking-wider">
                    Check-In Verification Required
                  </h4>
                  {checkInWindowOpen() ? (
                    <button
                      onClick={handleCheckIn}
                      disabled={joinLoading}
                      className="w-full py-2.5 bg-purple-650 hover:bg-purple-550 text-white rounded-lg text-xs font-bold transition-all shadow-[0_0_10px_rgba(147,51,234,0.2)] flex justify-center items-center gap-1.5"
                    >
                      {joinLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Complete Check-In Now'}
                    </button>
                  ) : checkInExpired() ? (
                    <div className="text-[10px] text-red-400 font-bold uppercase">
                      ⚠️ Check-in closed. You did not queue (DNQ) in time.
                    </div>
                  ) : (
                    <p className="text-[10px] text-zinc-550 leading-relaxed">
                      Check-in window opens 30 minutes before the start time and closes 5 minutes before match start.
                    </p>
                  )}
                </div>
              )}

              {/* Room details secure box */}
              <div className="p-4 bg-zinc-950/90 rounded-xl border border-zinc-900 space-y-3">
                <h4 className="text-xs font-black uppercase text-zinc-405 tracking-wider flex items-center gap-1.5">
                  <Key className="w-4 h-4 text-purple-400" />
                  Room Access Credentials
                </h4>
                {tournament.room_published && roomDetails && (userRegistration?.check_in_status === 'Checked In' || userRegistration?.check_in_status === 'Pending' || isMockEnabled) ? (
                  <div className="space-y-2.5 pt-2">
                    <div className="flex justify-between items-center bg-zinc-900 p-2.5 rounded border border-zinc-800">
                      <span className="text-xs text-zinc-400">Room ID:</span>
                      <span className="text-sm font-mono font-bold text-white selection:bg-purple-600 select-all">{roomDetails.room_id}</span>
                    </div>
                    <div className="flex justify-between items-center bg-zinc-900 p-2.5 rounded border border-zinc-800">
                      <span className="text-xs text-zinc-400">Password:</span>
                      <span className="text-sm font-mono font-bold text-white selection:bg-purple-600 select-all">{roomDetails.room_password}</span>
                    </div>
                    <button
                      onClick={() => handleStartGame(tournament.game)}
                      className="w-full mt-2.5 py-2.5 px-4 rounded-lg bg-purple-600 hover:bg-purple-700 text-zinc-100 font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-[0_0_10px_rgba(147,51,234,0.3)] border border-purple-500/25 active:scale-95 cursor-pointer"
                    >
                      <Play className="w-4 h-4 fill-current text-white" />
                      Start Game ({tournament.game})
                    </button>
                  </div>
                ) : !tournament.room_published ? (
                  <p className="text-xs text-zinc-500 leading-relaxed pt-1">
                    Room details will be published by the admin 15 minutes before the match start time. Keep this tab open.
                  </p>
                ) : (
                  <p className="text-xs text-red-405 leading-relaxed pt-1 font-semibold">
                    You did not complete check-in. Room details are hidden due to DNQ penalty.
                  </p>
                )}
              </div>
            </div>
          ) : (
            /* Join lobby Card */
            <div className="glass-panel border border-zinc-800/80 rounded-2xl p-6 space-y-6">
              <h3 className="text-lg font-bold text-zinc-200">Registration Portal</h3>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between border-b border-zinc-900 pb-2">
                  <span className="text-zinc-400">Entry Fee:</span>
                  <strong className="text-zinc-200">
                    {tournament.entry_fee === 0 ? 'FREE' : `₹${tournament.entry_fee}`}
                  </strong>
                </div>
                <div className="flex justify-between border-b border-zinc-900 pb-2">
                  <span className="text-zinc-400">Total Slots:</span>
                  <strong className="text-zinc-200">{tournament.total_slots}</strong>
                </div>
                <div className="flex justify-between border-b border-zinc-900 pb-2">
                  <span className="text-zinc-400">Available:</span>
                  <strong className="text-emerald-400">
                    {tournament.total_slots - tournament.filled_slots} slots left
                  </strong>
                </div>
              </div>

              {!user ? (
                <Link
                  href="/login"
                  className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl text-center flex items-center justify-center text-sm"
                >
                  Log In to Register
                </Link>
              ) : (
                <button
                  onClick={() => setShowJoinModal(true)}
                  disabled={tournament.filled_slots >= tournament.total_slots}
                  className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:from-zinc-800 disabled:to-zinc-800 text-white font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(147,51,234,0.3)] text-sm flex items-center justify-center"
                >
                  {tournament.filled_slots >= tournament.total_slots ? 'Lobby Full' : 'Book Your Slot'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Join Lobby Modal Dialog */}
      <AnimatePresence>
        {showJoinModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md glass-panel border border-zinc-800 rounded-2xl p-6 space-y-6 relative"
            >
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Gamepad2 className="w-5 h-5 text-purple-400" />
                  Join Tournament
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Enter your {tournament.game} credentials below
                </p>
              </div>

              {errorMsg && (
                <div className="p-3 bg-red-950/40 border border-red-500/30 rounded-lg text-xs text-red-400 font-semibold text-center">
                  {errorMsg}
                </div>
              )}

              <form onSubmit={handleJoinTournament} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                    {isBGMI ? 'BGMI Character ID' : 'Free Fire UID'}
                  </label>
                  <input
                    type="text"
                    required
                    value={gameIdInput}
                    onChange={(e) => setGameIdInput(e.target.value)}
                    placeholder={isBGMI ? 'e.g. 5124792341' : 'e.g. 84291845'}
                    className="w-full px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-lg focus:border-purple-500/50 focus:outline-none text-sm text-zinc-100 transition-colors"
                  />
                </div>

                {/* In Game Name (IGN) */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                    In Game Name (IGN)
                  </label>
                  <input
                    type="text"
                    required
                    value={ignInput}
                    onChange={(e) => setIgnInput(e.target.value)}
                    placeholder="e.g. 〆MASH・RAPTOR"
                    className="w-full px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-lg focus:border-purple-500/50 focus:outline-none text-sm text-zinc-100 transition-colors"
                  />
                </div>

                {/* Coupon Code Input */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                    Coupon Code
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value)}
                      placeholder="e.g. MASH50"
                      className="flex-grow px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-lg focus:border-purple-500/50 focus:outline-none text-xs text-zinc-100 transition-colors uppercase"
                    />
                    <button
                      type="button"
                      onClick={handleApplyCoupon}
                      className="px-3.5 bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 rounded-lg text-xs font-bold text-purple-400 flex items-center gap-1"
                    >
                      <Tag className="w-3.5 h-3.5" />
                      Apply
                    </button>
                  </div>
                  {couponError && (
                    <span className="text-[10px] text-red-400 font-bold block mt-1">{couponError}</span>
                  )}
                  {appliedCoupon && (
                    <span className="text-[10px] text-emerald-400 font-bold block mt-1">
                      Coupon Applied: {appliedCoupon.code} (-₹{discountAmount})
                    </span>
                  )}
                </div>

                {/* Balance validation check */}
                <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-900 space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-zinc-500">Wallet balance:</span>
                    <span className="text-zinc-200">₹{totalBalance.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-zinc-500">Registration fee:</span>
                    <span className="text-zinc-200">₹{tournament.entry_fee.toFixed(2)}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-xs font-semibold text-emerald-450">
                      <span>Discount:</span>
                      <span>-₹{discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xs font-bold pt-1.5 border-t border-zinc-900 mt-1">
                    <span className="text-zinc-400">Total payable:</span>
                    <span className="text-white">₹{(tournament.entry_fee - discountAmount).toFixed(2)}</span>
                  </div>
                  {!isBalanceSufficient && (
                    <div className="text-[10px] text-red-400 font-bold uppercase pt-1.5 border-t border-zinc-900 mt-1">
                      ⚠️ Insufficient funds. Add mock deposits in Dashboard.
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setErrorMsg(null);
                      setCouponError(null);
                      setAppliedCoupon(null);
                      setDiscountAmount(0);
                      setCouponInput('');
                      setShowJoinModal(false);
                    }}
                    className="py-2.5 bg-zinc-900 border border-zinc-850 hover:bg-zinc-850 text-zinc-300 rounded-xl font-bold text-xs transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={joinLoading || !isBalanceSufficient}
                    className="py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:from-zinc-800 disabled:to-zinc-800 text-white rounded-xl font-bold text-xs shadow-[0_0_15px_rgba(147,51,234,0.3)] transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    {joinLoading ? (
                      <>
                        <Loader2 className="w-4.5 h-4.5 animate-spin" />
                        Joining Lobby...
                      </>
                    ) : (
                      'Confirm Join'
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Full-Screen Lightbox Modal */}
      <AnimatePresence>
        {activeLightboxImage && (
          <div
            onClick={() => setActiveLightboxImage(null)}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/95 cursor-zoom-out"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-4xl max-h-[85vh] overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900"
            >
              <img
                src={activeLightboxImage}
                alt="Match Proof Lightbox"
                className="max-w-full max-h-[80vh] object-contain"
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
