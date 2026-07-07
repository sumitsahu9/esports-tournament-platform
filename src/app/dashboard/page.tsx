'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { isMockEnabled, mockDb, calculateLeaderboard, type LeaderboardOverride, type LeaderboardPlayer } from '@/lib/mockDb';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Wallet as WalletIcon, Trophy, Calendar, User, 
  ArrowUpRight, ArrowDownLeft, Plus, Send, 
  History, Settings, Gamepad2, Loader2, ArrowRight,
  MessageSquare, ShieldAlert, Users, Check, X
} from 'lucide-react';
import Link from 'next/link';

interface JoinedTournament {
  id: string;
  title: string;
  game: 'BGMI' | 'Free Fire';
  mode: string;
  entry_fee: number;
  start_time: string;
  prize_pool: number;
  status: 'Upcoming' | 'Live' | 'Completed';
  total_slots: number;
  registrations: {
    ign: string;
    game_id?: string | null;
    payment_status?: string | null;
  };
}

interface Transaction {
  id: string;
  type: 'Deposit' | 'Entry Fee' | 'Prize Credit' | 'Withdrawal';
  amount: number;
  status: 'Pending' | 'Completed' | 'Failed' | 'Cancelled';
  description: string;
  created_at: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, profile, wallet, loading, refreshWallet, refreshProfile } = useAuth();

  const [activeTab, setActiveTab] = useState<'overview' | 'tournaments' | 'wallet' | 'profile' | 'teams' | 'tickets' | 'leaderboard'>('overview');
  const [tourneyFilter, setTourneyFilter] = useState<'Upcoming' | 'Live' | 'Completed'>('Upcoming');

  const [joinedTourneys, setJoinedTourneys] = useState<JoinedTournament[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  
  // Leaderboard States
  const [rawWinners, setRawWinners] = useState<any[]>([]);
  const [rawRegistrations, setRawRegistrations] = useState<any[]>([]);
  const [rawProfiles, setRawProfiles] = useState<any>([]);
  const [leaderboardOverrides, setLeaderboardOverrides] = useState<LeaderboardOverride[]>([]);
  const [rawHidden, setRawHidden] = useState<string[]>([]);
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [leaderboardTab, setLeaderboardTab] = useState<'weekly' | 'monthly' | 'allTime'>('weekly');
  const [leaderboardGame, setLeaderboardGame] = useState<'All' | 'BGMI' | 'Free Fire'>('All');

  const [dataLoading, setDataLoading] = useState(true);

  // Support Tickets
  const [activeTicket, setActiveTicket] = useState<any | null>(null);
  const [creatingTicket, setCreatingTicket] = useState(false);
  const [ticketMessages, setTicketMessages] = useState<any[]>([]);
  const [replyMessage, setReplyMessage] = useState('');
  const [tickets, setTickets] = useState<any[]>([]);
  
  // Create ticket form states
  const [newTicketCategory, setNewTicketCategory] = useState('Tournament Issue');
  const [newTicketTitle, setNewTicketTitle] = useState('');
  const [newTicketMessage, setNewTicketMessage] = useState('');

  // Clan / Team
  const [myTeam, setMyTeam] = useState<any | null>(null);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [newTeamName, setNewTeamName] = useState('');
  const [teamInvites, setTeamInvites] = useState<any[]>([]);
  const [teamError, setTeamError] = useState<string | null>(null);

  // Forms states
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [upiId, setUpiId] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [depositStep, setDepositStep] = useState<1 | 2>(1);
  const [depositMethod, setDepositMethod] = useState<'gateway' | 'manual'>('gateway');
  const [upiReferenceId, setUpiReferenceId] = useState('');
  const [paymentQr, setPaymentQr] = useState('/payment_qr.jpg');

  // Profile Edit fields
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editBgmiCharId, setEditBgmiCharId] = useState('');
  const [editBgmiIgn, setEditBgmiIgn] = useState('');
  const [editFfUid, setEditFfUid] = useState('');
  const [editFfIgn, setEditFfIgn] = useState('');
  const [editPicUrl, setEditPicUrl] = useState('');

  // Protect route
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading]);

  // Calculate filtered leaderboard data on the fly
  const leaderboardData = React.useMemo(() => {
    return calculateLeaderboard(leaderboardTab, leaderboardGame, rawWinners, rawRegistrations, rawProfiles, tournaments, leaderboardOverrides, rawHidden);
  }, [leaderboardTab, leaderboardGame, rawWinners, rawRegistrations, rawProfiles, tournaments, leaderboardOverrides, rawHidden]);

  // Find current user's rank
  const currentUserRankInfo = React.useMemo(() => {
    if (!profile) return { rank: -1, stats: null };
    const list = leaderboardData;
    const idx = list.findIndex(p => p.name === profile.name || p.user_id === profile.id);
    if (idx !== -1) {
      return { rank: idx + 1, stats: list[idx] };
    }
    return { rank: -1, stats: null };
  }, [leaderboardData, profile]);

  // Fetch joined tournaments and transactions
  const fetchDashboardData = async () => {
    if (!user) return;
    try {
      setDataLoading(true);

      if (isMockEnabled) {
        // 1. Fetch registrations with tournament details
        const allRegs = mockDb.getRegistrations();
        const userRegs = allRegs.filter((r: any) => r.user_id === user.id);
        const tourneyList = mockDb.getTournaments();

        const list: JoinedTournament[] = userRegs
          .map((r: any) => {
            const tourney = tourneyList.find((t: any) => t.id === r.tournament_id);
            if (!tourney) return null;
            return {
              id: tourney.id,
              title: tourney.title,
              game: tourney.game,
              mode: tourney.mode,
              entry_fee: Number(tourney.entry_fee),
              start_time: tourney.start_time,
              prize_pool: Number(tourney.prize_pool),
              status: tourney.status,
              total_slots: Number(tourney.total_slots || 0),
              registrations: {
                ign: r.ign,
                game_id: r.game_id,
              }
            };
          })
          .filter((t: any) => t !== null) as JoinedTournament[];
        setJoinedTourneys(list);

        // 2. Fetch Transactions
        if (wallet) {
          const allTxs = mockDb.getTransactions();
          const txs = allTxs
            .filter((t: any) => t.wallet_id === wallet.id)
            .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          setTransactions(txs as Transaction[]);
        }

        // Fetch Payment QR Setting
        const qr = mockDb.getPaymentQr();
        setPaymentQr(qr);

        // 3. Fetch Support Tickets
        const ticketsList = mockDb.getTickets().filter((t: any) => t.user_id === user.id)
          .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setTickets(ticketsList);

        // 4. Fetch Clan / Team
        const membersList = mockDb.getTeamMembers();
        const userMember = membersList.find((m: any) => m.user_id === user.id);
        if (userMember) {
          const team = mockDb.getTeams().find((t: any) => t.id === userMember.team_id);
          if (team) {
            setMyTeam(team);
            const profilesMap = mockDb.getProfiles();
            const members = membersList.filter((m: any) => m.team_id === team.id).map((m: any) => ({
              ...m,
              profile: profilesMap[m.user_id] || { name: 'Player', email: '' }
            }));
            setTeamMembers(members);
          } else {
            setMyTeam(null);
            setTeamMembers([]);
          }
        } else {
          setMyTeam(null);
          setTeamMembers([]);
        }

        // 5. Fetch Team Invites
        const invites = mockDb.getTeamInvites().filter((i: any) => i.invitee_email?.toLowerCase() === user.email?.toLowerCase() && i.status === 'Pending');
        setTeamInvites(invites);

        // 6. Fetch Leaderboard Data
        const winList = mockDb.getWinners();
        setRawWinners(winList);
        const regList = mockDb.getRegistrations();
        setRawRegistrations(regList);
        const profsMap = mockDb.getProfiles();
        setRawProfiles(profsMap);
        const tourneysList = mockDb.getTournaments();
        setTournaments(tourneysList);
        const overridesList = mockDb.getLeaderboardOverrides();
        setLeaderboardOverrides(overridesList);
        const hiddenList = mockDb.getLeaderboardHidden();
        setRawHidden(hiddenList);

        setDataLoading(false);
        return;
      }

      // 1. Fetch registrations with tournament details
      const { data: regData, error: regError } = await supabase
        .from('registrations')
        .select(`
          ign,
          game_id,
          tournaments (
            id,
            title,
            game,
            mode,
            entry_fee,
            start_time,
            prize_pool,
            status,
            total_slots
          )
        `)
        .eq('user_id', user.id);

      if (!regError && regData) {
        const list: JoinedTournament[] = regData
          .filter((r: any) => r.tournaments !== null)
          .map((r: any) => ({
            id: r.tournaments.id,
            title: r.tournaments.title,
            game: r.tournaments.game,
            mode: r.tournaments.mode,
            entry_fee: Number(r.tournaments.entry_fee),
            start_time: r.tournaments.start_time,
            prize_pool: Number(r.tournaments.prize_pool),
            status: r.tournaments.status,
            total_slots: Number(r.tournaments.total_slots || 0),
            registrations: {
              ign: r.ign,
              game_id: r.game_id,
            }
          }));
        setJoinedTourneys(list);
      }

      // 2. Fetch Transactions
      if (wallet) {
        const { data: txData, error: txError } = await supabase
          .from('transactions')
          .select('*')
          .eq('wallet_id', wallet.id)
          .order('created_at', { ascending: false });

        if (!txError && txData) {
          setTransactions(txData as Transaction[]);
        }
      }

      // Fetch Payment QR Setting from admin_settings
      try {
        const { data: settingsData } = await supabase
          .from('admin_settings')
          .select('value')
          .eq('key', 'payment_qr')
          .maybeSingle();
        if (settingsData) {
          setPaymentQr(settingsData.value);
        }
      } catch (err) {
        console.error('Failed to fetch admin settings QR:', err);
      }

      // 3. Fetch Support Tickets
      const { data: ticketsData } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (ticketsData) setTickets(ticketsData);

      // 4. Fetch Clan / Team
      const { data: memberData } = await supabase
        .from('team_members')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (memberData) {
        const { data: teamData } = await supabase
          .from('teams')
          .select('*')
          .eq('id', memberData.team_id)
          .maybeSingle();

        if (teamData) {
          setMyTeam(teamData);
          
          // Get all members of the team
          const { data: membersList } = await supabase
            .from('team_members')
            .select('*, profiles:user_id(name, email, profile_picture)')
            .eq('team_id', teamData.id);

          if (membersList) {
            const mappedMembers = membersList.map((m: any) => ({
              ...m,
              profile: m.profiles || { name: 'Player', email: '' }
            }));
            setTeamMembers(mappedMembers);
          }
        } else {
          setMyTeam(null);
          setTeamMembers([]);
        }
      } else {
        setMyTeam(null);
        setTeamMembers([]);
      }

      // 5. Fetch Team Invites
      try {
        const { data: invitesData } = await supabase
          .from('team_invites')
          .select('*')
          .eq('invitee_email', user.email?.toLowerCase())
          .eq('status', 'Pending');
        if (invitesData) setTeamInvites(invitesData);
      } catch (inviteErr) {
        setTeamInvites([]);
      }

      // 6. Fetch Leaderboard Data
      try {
        const { data: winData } = await supabase.from('winners').select('*');
        setRawWinners(winData || []);
        
        const { data: regData } = await supabase.from('registrations').select('*');
        setRawRegistrations(regData || []);
        
        const { data: profData } = await supabase.from('profiles').select('id, name, email');
        setRawProfiles(profData || []);
        
        const { data: tourneysData } = await supabase.from('tournaments').select('*');
        setTournaments(tourneysData || []);
        
        let overridesList: any[] = [];
        try {
          const { data: ovData } = await supabase.from('leaderboard_overrides').select('*');
          overridesList = ovData || [];
        } catch {
          overridesList = mockDb.getLeaderboardOverrides();
        }
        setLeaderboardOverrides(overridesList);

        let hiddenList: string[] = [];
        try {
          const { data: hidData } = await supabase.from('leaderboard_hidden').select('id');
          hiddenList = hidData?.map((h: any) => h.id) || [];
        } catch {
          hiddenList = mockDb.getLeaderboardHidden();
        }
        setRawHidden(hiddenList);
      } catch (leaderboardErr) {
        console.error('Error fetching supabase leaderboard:', leaderboardErr);
      }

    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    if (user && wallet) {
      fetchDashboardData();
    }
  }, [user, wallet?.id]);

  // Verify Cashfree redirect callback on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const cfOrderId = urlParams.get('cf_order_id');
    
    if (cfOrderId && user) {
      const verifyPayment = async () => {
        try {
          setDataLoading(true);
          const sessionToken = (await supabase.auth.getSession()).data.session?.access_token;
          const res = await fetch('/api/cashfree/verify', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${sessionToken}`
            },
            body: JSON.stringify({
              order_id: cfOrderId,
              mock: cfOrderId.includes('cf_mock')
            })
          });
          
          const verifyData = await res.json();
          if (res.ok && verifyData.success) {
            alert('Winnings/Deposit balance credited successfully!');
          } else {
            alert(verifyData.message || 'Payment verification failed');
          }
          // Clear query params
          router.replace('/dashboard');
          await refreshWallet();
          await fetchDashboardData();
        } catch (err: any) {
          console.error(err);
          alert(err.message || 'Error verifying payment status');
          router.replace('/dashboard');
        } finally {
          setDataLoading(false);
        }
      };
      
      verifyPayment();
    }
  }, [user]);

  // Populate profile edit form
  useEffect(() => {
    if (profile) {
      setEditName(profile.name || '');
      setEditPhone(profile.phone_number || '');
      setEditBgmiCharId(profile.bgmi_character_id || '');
      setEditBgmiIgn(profile.bgmi_ign || '');
      setEditFfUid(profile.freefire_uid || '');
      setEditFfIgn(profile.freefire_ign || '');
      setEditPicUrl(profile.profile_picture || '');
    }
  }, [profile]);

  // Real-time support messages for the user
  useEffect(() => {
    if (!activeTicket) {
      setTicketMessages([]);
      return;
    }

    const fetchTicketMessages = async () => {
      try {
        if (isMockEnabled) {
          const allMsgs = mockDb.getMessages();
          const msgs = allMsgs.filter((m: any) => m.ticket_id === activeTicket.id)
            .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
          setTicketMessages(msgs);
        } else {
          const { data, error } = await supabase
            .from('support_messages')
            .select('*')
            .eq('ticket_id', activeTicket.id)
            .order('created_at', { ascending: true });
          if (error) throw error;
          if (data) setTicketMessages(data);
        }
      } catch (err) {
        console.error('Error fetching messages:', err);
      }
    };

    fetchTicketMessages();

    let channel: any;
    let mockInterval: any;

    if (!isMockEnabled) {
      channel = supabase
        .channel(`public:support_messages:ticket_id=eq.${activeTicket.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'support_messages',
            filter: `ticket_id=eq.${activeTicket.id}`,
          },
          (payload) => {
            setTicketMessages(prev => [...prev, payload.new]);
          }
        )
        .subscribe();
    } else {
      mockInterval = setInterval(fetchTicketMessages, 3000);
    }

    return () => {
      if (channel) supabase.removeChannel(channel);
      if (mockInterval) clearInterval(mockInterval);
    };
  }, [activeTicket]);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTicketTitle.trim() || !newTicketMessage.trim() || !user) return;
    setActionLoading(true);
    setTeamError(null);
    try {
      const ticketId = Math.random().toString();
      if (isMockEnabled) {
        const ticketsList = mockDb.getTickets();
        const newTicket = {
          id: ticketId,
          user_id: user.id,
          title: newTicketTitle,
          category: newTicketCategory,
          status: 'Open',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        ticketsList.push(newTicket);
        mockDb.saveTickets(ticketsList);

        // Add initial message
        const messagesList = mockDb.getMessages();
        messagesList.push({
          id: Math.random().toString(),
          ticket_id: ticketId,
          sender_id: user.id,
          message: newTicketMessage,
          is_admin: false,
          created_at: new Date().toISOString()
        });
        mockDb.saveMessages(messagesList);

        alert('Support ticket created successfully!');
        setNewTicketTitle('');
        setNewTicketMessage('');
        setCreatingTicket(false);
        await fetchDashboardData();
        return;
      }

      // Supabase flow
      const { data: ticketData, error: ticketError } = await supabase
        .from('support_tickets')
        .insert({
          user_id: user.id,
          title: newTicketTitle,
          category: newTicketCategory,
          status: 'Open'
        })
        .select()
        .single();

      if (ticketError) throw ticketError;

      if (ticketData) {
        const { error: msgError } = await supabase
          .from('support_messages')
          .insert({
            ticket_id: ticketData.id,
            sender_id: user.id,
            message: newTicketMessage,
            is_admin: false
          });
        if (msgError) throw msgError;
      }

      alert('Support ticket created successfully!');
      setNewTicketTitle('');
      setNewTicketMessage('');
      setCreatingTicket(false);
      await fetchDashboardData();
    } catch (err: any) {
      alert(err.message || 'Failed to create support ticket');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReplyTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTicket || !replyMessage.trim() || !user) return;
    setActionLoading(true);
    try {
      if (isMockEnabled) {
        const messagesList = mockDb.getMessages();
        const newMsg = {
          id: Math.random().toString(),
          ticket_id: activeTicket.id,
          sender_id: user.id,
          message: replyMessage,
          is_admin: false,
          created_at: new Date().toISOString()
        };
        messagesList.push(newMsg);
        mockDb.saveMessages(messagesList);

        // Update ticket status
        const ticketsList = mockDb.getTickets();
        const tIdx = ticketsList.findIndex((t: any) => t.id === activeTicket.id);
        if (tIdx !== -1 && (ticketsList[tIdx].status === 'Resolved' || ticketsList[tIdx].status === 'Closed')) {
          ticketsList[tIdx].status = 'Open';
          ticketsList[tIdx].updated_at = new Date().toISOString();
          mockDb.saveTickets(ticketsList);
          setActiveTicket((prev: any) => ({ ...prev, status: 'Open' }));
        }

        setReplyMessage('');
        const filtered = messagesList.filter((m: any) => m.ticket_id === activeTicket.id)
          .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        setTicketMessages(filtered);
        await fetchDashboardData();
        return;
      }

      // Supabase flow
      const { error: replyError } = await supabase
        .from('support_messages')
        .insert({
          ticket_id: activeTicket.id,
          sender_id: user.id,
          message: replyMessage,
          is_admin: false
        });

      if (replyError) throw replyError;

      // Re-open if resolved/closed
      if (activeTicket.status === 'Resolved' || activeTicket.status === 'Closed') {
        await supabase
          .from('support_tickets')
          .update({ status: 'Open', updated_at: new Date().toISOString() })
          .eq('id', activeTicket.id);
        setActiveTicket((prev: any) => ({ ...prev, status: 'Open' }));
      }

      setReplyMessage('');
      const { data } = await supabase
        .from('support_messages')
        .select('*')
        .eq('ticket_id', activeTicket.id)
        .order('created_at', { ascending: true });
      if (data) setTicketMessages(data);
      await fetchDashboardData();
    } catch (err: any) {
      alert(err.message || 'Failed to send reply');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim() || !user) return;
    setActionLoading(true);
    setTeamError(null);
    try {
      const teamId = Math.random().toString();
      const teamLogo = `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(newTeamName)}`;

      if (isMockEnabled) {
        const teamsList = mockDb.getTeams();
        if (teamsList.some((t: any) => t.name.toLowerCase() === newTeamName.toLowerCase())) {
          setTeamError('Team name already exists!');
          setActionLoading(false);
          return;
        }

        const newTeam = {
          id: teamId,
          name: newTeamName,
          logo_url: teamLogo,
          captain_id: user.id,
          created_at: new Date().toISOString()
        };
        teamsList.push(newTeam);
        mockDb.saveTeams(teamsList);

        // Add member
        const membersList = mockDb.getTeamMembers();
        membersList.push({
          id: Math.random().toString(),
          team_id: teamId,
          user_id: user.id,
          role: 'Captain',
          joined_at: new Date().toISOString()
        });
        mockDb.saveTeamMembers(membersList);

        alert('Team created successfully!');
        setNewTeamName('');
        await fetchDashboardData();
        return;
      }

      // Supabase flow
      const { data: existingMember } = await supabase
        .from('team_members')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingMember) {
        setTeamError('You are already in a team! Leave or disband it first.');
        setActionLoading(false);
        return;
      }

      const { data: teamData, error: teamErrorVal } = await supabase
        .from('teams')
        .insert({
          name: newTeamName,
          logo_url: teamLogo,
          captain_id: user.id
        })
        .select()
        .single();

      if (teamErrorVal) throw teamErrorVal;

      if (teamData) {
        const { error: memberError } = await supabase
          .from('team_members')
          .insert({
            team_id: teamData.id,
            user_id: user.id,
            role: 'Captain'
          });
        if (memberError) throw memberError;
      }

      alert('Team created successfully!');
      setNewTeamName('');
      await fetchDashboardData();
    } catch (err: any) {
      setTeamError(err.message || 'Failed to create team');
    } finally {
      setActionLoading(false);
    }
  };

  const handleLeaveTeam = async () => {
    if (!myTeam || !user) return;
    const isCaptain = teamMembers.find(m => m.user_id === user.id)?.role === 'Captain';
    const msg = isCaptain 
      ? 'Are you sure you want to DISBAND this team? All members will be removed.'
      : 'Are you sure you want to LEAVE this team?';
    if (!confirm(msg)) return;
    
    setActionLoading(true);
    setTeamError(null);
    try {
      if (isMockEnabled) {
        if (isCaptain) {
          const teamsList = mockDb.getTeams().filter((t: any) => t.id !== myTeam.id);
          mockDb.saveTeams(teamsList);
          const membersList = mockDb.getTeamMembers().filter((m: any) => m.team_id !== myTeam.id);
          mockDb.saveTeamMembers(membersList);
        } else {
          const membersList = mockDb.getTeamMembers().filter((m: any) => !(m.team_id === myTeam.id && m.user_id === user.id));
          mockDb.saveTeamMembers(membersList);
        }
        alert(isCaptain ? 'Team disbanded.' : 'You left the team.');
        setMyTeam(null);
        setTeamMembers([]);
        await fetchDashboardData();
        return;
      }

      // Supabase flow
      if (isCaptain) {
        const { error } = await supabase
          .from('teams')
          .delete()
          .eq('id', myTeam.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('team_members')
          .delete()
          .eq('team_id', myTeam.id)
          .eq('user_id', user.id);
        if (error) throw error;
      }

      alert(isCaptain ? 'Team disbanded.' : 'You left the team.');
      setMyTeam(null);
      setTeamMembers([]);
      await fetchDashboardData();
    } catch (err: any) {
      setTeamError(err.message || 'Failed to leave team');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !myTeam || !user) return;
    setActionLoading(true);
    setTeamError(null);
    try {
      if (isMockEnabled) {
        const profilesMap = mockDb.getProfiles();
        const invitee = Object.values(profilesMap).find((p: any) => p.email?.toLowerCase() === inviteEmail.toLowerCase()) as any;
        if (!invitee) {
          setTeamError('Player with this email not found on Mash Arena!');
          setActionLoading(false);
          return;
        }

        const membersList = mockDb.getTeamMembers();
        if (membersList.some((m: any) => m.user_id === invitee.id)) {
          setTeamError('Player is already a member of a clan!');
          setActionLoading(false);
          return;
        }

        const invites = mockDb.getTeamInvites();
        if (invites.some((i: any) => i.team_id === myTeam.id && i.invitee_email?.toLowerCase() === inviteEmail.toLowerCase() && i.status === 'Pending')) {
          setTeamError('Invite already sent to this player!');
          setActionLoading(false);
          return;
        }

        invites.push({
          id: Math.random().toString(),
          team_id: myTeam.id,
          team_name: myTeam.name,
          invitee_email: inviteEmail.toLowerCase(),
          created_at: new Date().toISOString(),
          status: 'Pending'
        });
        mockDb.saveTeamInvites(invites);

        const notifications = mockDb.getNotifications();
        notifications.push({
          id: Math.random().toString(),
          user_id: invitee.id,
          title: 'Squad Invitation',
          message: `You have been invited to join the clan: "${myTeam.name}"! Go to Clan tab in dashboard to accept.`,
          type: 'Team Invite',
          is_read: false,
          created_at: new Date().toISOString()
        });
        mockDb.saveNotifications(notifications);

        alert('Invite sent successfully!');
        setInviteEmail('');
        await fetchDashboardData();
        return;
      }

      // Supabase flow
      const { data: inviteeProfiles, error: searchError } = await supabase
        .from('profiles')
        .select('*')
        .ilike('email', inviteEmail.trim())
        .maybeSingle();

      if (searchError || !inviteeProfiles) {
        setTeamError('Player with this email not found on Mash Arena!');
        setActionLoading(false);
        return;
      }

      const { data: memberCheck } = await supabase
        .from('team_members')
        .select('*')
        .eq('user_id', inviteeProfiles.id)
        .maybeSingle();

      if (memberCheck) {
        setTeamError('Player is already a member of a clan!');
        setActionLoading(false);
        return;
      }

      const { error: inviteError } = await supabase
        .from('team_invites')
        .insert({
          team_id: myTeam.id,
          team_name: myTeam.name,
          invitee_email: inviteEmail.trim().toLowerCase(),
          status: 'Pending'
        });

      if (inviteError) throw inviteError;

      await supabase.from('notifications').insert({
        user_id: inviteeProfiles.id,
        title: 'Squad Invitation',
        message: `You have been invited to join the clan: "${myTeam.name}"! Go to Clan tab in dashboard to accept.`,
        type: 'Team Invite'
      });

      alert('Invite sent successfully!');
      setInviteEmail('');
      await fetchDashboardData();
    } catch (err: any) {
      setTeamError(err.message || 'Failed to send invite');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAcceptInvite = async (invite: any) => {
    if (!user) return;
    setActionLoading(true);
    setTeamError(null);
    try {
      if (isMockEnabled) {
        const membersList = mockDb.getTeamMembers();
        if (membersList.some((m: any) => m.user_id === user.id)) {
          setTeamError('You are already in a team! Leave it first.');
          setActionLoading(false);
          return;
        }

        membersList.push({
          id: Math.random().toString(),
          team_id: invite.team_id,
          user_id: user.id,
          role: 'Member',
          joined_at: new Date().toISOString()
        });
        mockDb.saveTeamMembers(membersList);

        const invites = mockDb.getTeamInvites();
        const iIdx = invites.findIndex((i: any) => i.id === invite.id);
        if (iIdx !== -1) {
          invites[iIdx].status = 'Accepted';
          mockDb.saveTeamInvites(invites);
        }

        alert('Joined team successfully!');
        await fetchDashboardData();
        return;
      }

      // Supabase flow
      const { data: userMemberCheck } = await supabase
        .from('team_members')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (userMemberCheck) {
        setTeamError('You are already in a team! Leave it first.');
        setActionLoading(false);
        return;
      }

      const { error: joinError } = await supabase
        .from('team_members')
        .insert({
          team_id: invite.team_id,
          user_id: user.id,
          role: 'Member'
        });

      if (joinError) throw joinError;

      await supabase
        .from('team_invites')
        .update({ status: 'Accepted' })
        .eq('id', invite.id);

      alert('Joined team successfully!');
      await fetchDashboardData();
    } catch (err: any) {
      setTeamError(err.message || 'Failed to accept invite');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeclineInvite = async (inviteId: string) => {
    setActionLoading(true);
    setTeamError(null);
    try {
      if (isMockEnabled) {
        const invites = mockDb.getTeamInvites();
        const iIdx = invites.findIndex((i: any) => i.id === inviteId);
        if (iIdx !== -1) {
          invites[iIdx].status = 'Declined';
          mockDb.saveTeamInvites(invites);
        }
        alert('Invitation declined.');
        await fetchDashboardData();
        return;
      }

      await supabase
        .from('team_invites')
        .update({ status: 'Declined' })
        .eq('id', inviteId);

      alert('Invitation declined.');
      await fetchDashboardData();
    } catch (err: any) {
      setTeamError(err.message || 'Failed to decline invite');
    } finally {
      setActionLoading(false);
    }
  };

  const loadCashfreeScript = () => {
    return new Promise((resolve) => {
      if ((window as any).Cashfree) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleGatewayDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(depositAmount);
    if (!amount || amount <= 0) {
      setFormError('Please enter a valid deposit amount');
      return;
    }

    setActionLoading(true);
    setFormError(null);

    try {
      const res = await fetch('/api/cashfree/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          customerId: user?.id || 'cust_anon',
          customerEmail: user?.email || 'customer@example.com',
          customerPhone: (profile as any)?.phone || '9999999999',
          returnUrl: window.location.href.split('?')[0] + '?cf_order_id={order_id}'
        })
      });

      const orderData = await res.json();
      if (!res.ok) throw new Error(orderData.error || 'Failed to initiate gateway payment');

      if (orderData.mock) {
        // Simulated Mock Payment Verification
        const sessionToken = (await supabase.auth.getSession()).data.session?.access_token;
        const verifyRes = await fetch('/api/cashfree/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionToken}`
          },
          body: JSON.stringify({
            order_id: orderData.cf_order_id,
            amount: orderData.order_amount,
            mock: true
          })
        });

        const verifyData = await verifyRes.json();
        if (!verifyRes.ok) throw new Error(verifyData.error || 'Payment verification failed');

        alert(`Mock payment successful! ₹${amount} has been instantly added to your wallet.`);
        setDepositAmount('');
        await refreshWallet();
        await fetchDashboardData();
        return;
      }

      // Real Cashfree integration
      const loaded = await loadCashfreeScript();
      if (!loaded) throw new Error('Failed to load Cashfree Payment SDK');

      const cashfreeEnv = process.env.NEXT_PUBLIC_CASHFREE_ENV === 'production' ? 'production' : 'sandbox';
      const cashfree = (window as any).Cashfree({
        mode: cashfreeEnv
      });

      await cashfree.checkout({
        paymentSessionId: orderData.payment_session_id,
        redirectTarget: "_self"
      });
    } catch (err: any) {
      console.error(err);
      setFormError(err.message || 'Payment initiation failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(depositAmount);
    if (!amount || amount <= 0) {
      setFormError('Please enter a valid deposit amount');
      return;
    }

    if (depositStep === 1) {
      setFormError(null);
      setDepositStep(2);
      return;
    }

    // Step 2: Validate reference ID (must be exactly 12 digits)
    if (!/^\d{12}$/.test(upiReferenceId)) {
      setFormError('Please enter a valid 12-digit UPI Reference ID');
      return;
    }

    setActionLoading(true);
    setFormError(null);

    try {
      if (isMockEnabled) {
        if (!user) throw new Error('Unauthorized');
        const walletsMap = mockDb.getWallets();
        const userWallet = walletsMap[user.id] || {
          id: `w-${user.id}`,
          user_id: user.id,
          deposit_balance: 0,
          winning_balance: 0,
          created_at: new Date().toISOString()
        };
        // Do not add balance instantly! It will be added once approved.
        const allTxs = mockDb.getTransactions();
        allTxs.push({
          id: `tx-${Date.now()}`,
          wallet_id: userWallet.id,
          type: 'Deposit',
          amount: amount,
          status: 'Pending',
          description: `UPI Ref: ${upiReferenceId}`,
          created_at: new Date().toISOString()
        });
        mockDb.saveTransactions(allTxs);

        alert(`Payment received! Your deposit request of ₹${amount} is pending admin verification and approval.`);
        setDepositAmount('');
        setUpiReferenceId('');
        setDepositStep(1);
        await refreshWallet();
        await fetchDashboardData();
        return;
      }

      // Supabase mode
      if (!user) throw new Error('Unauthorized');

      // Call secure transactional RPC to request manual deposit atomically
      const { data, error } = await supabase.rpc('request_manual_deposit', {
        p_amount: amount,
        p_upi_ref: upiReferenceId
      });

      if (error) throw error;

      alert(`Payment received! Your deposit request of ₹${amount} is pending admin verification and approval.`);
      setDepositAmount('');
      setUpiReferenceId('');
      setDepositStep(1);
      await refreshWallet();
      await fetchDashboardData();
    } catch (err: any) {
      console.error(err);
      setFormError(err.message || 'Deposit failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(withdrawAmount);
    if (!amount || amount <= 0) {
      setFormError('Please enter a valid withdrawal amount');
      return;
    }
    if (!upiId) {
      setFormError('Please enter your UPI ID');
      return;
    }

    setActionLoading(true);
    setFormError(null);

    try {
      if (isMockEnabled) {
        if (!user) throw new Error('Unauthorized');
        
        // Min limit is ₹100
        const minLimit = 100;
        if (amount < minLimit) {
          throw new Error(`Minimum withdrawal limit is ₹${minLimit}`);
        }

        const walletsMap = mockDb.getWallets();
        const userWallet = walletsMap[user.id];
        if (!userWallet || userWallet.winning_balance < amount) {
          throw new Error('Insufficient winning balance for withdrawal');
        }

        // Deduct from winning balance
        userWallet.winning_balance -= amount;
        walletsMap[user.id] = userWallet;
        mockDb.saveWallets(walletsMap);

        // Add to withdrawals list
        const allWithdrawals = mockDb.getWithdrawals();
        const withdrawalId = `wdr-${Date.now()}`;
        allWithdrawals.push({
          id: withdrawalId,
          user_id: user.id,
          upi_id: upiId,
          amount: amount,
          status: 'Pending',
          created_at: new Date().toISOString()
        });
        mockDb.saveWithdrawals(allWithdrawals);

        // Add pending transaction
        const allTxs = mockDb.getTransactions();
        allTxs.push({
          id: `tx-${Date.now()}`,
          wallet_id: userWallet.id,
          type: 'Withdrawal',
          amount: amount,
          status: 'Pending',
          reference_id: withdrawalId,
          description: `Withdrawal request to UPI: ${upiId}`,
          created_at: new Date().toISOString()
        });
        mockDb.saveTransactions(allTxs);

        alert(`Withdrawal request of ₹${amount} submitted successfully!`);
        setWithdrawAmount('');
        setUpiId('');
        await refreshWallet();
        await fetchDashboardData();
        return;
      }

      const { data, error } = await supabase.rpc('submit_withdrawal', {
        p_amount: amount,
        p_upi_id: upiId,
      });

      if (error) throw error;

      alert(`Withdrawal request of ₹${amount} submitted successfully!`);
      setWithdrawAmount('');
      setUpiId('');
      await refreshWallet();
      await fetchDashboardData();
    } catch (err: any) {
      console.error(err);
      setFormError(err.message || 'Withdrawal failed. Winning wallet might have insufficient balance.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setFormError(null);

    try {
      if (isMockEnabled) {
        if (!user) throw new Error('Unauthorized');
        const profilesMap = mockDb.getProfiles();
        const existing = profilesMap[user.id] || {
          id: user.id,
          email: user.email,
          is_admin: user.email?.toLowerCase() === 'sumit903970@gmail.com',
          created_at: new Date().toISOString()
        };
        
        profilesMap[user.id] = {
          ...existing,
          name: editName,
          phone_number: editPhone || null,
          bgmi_character_id: editBgmiCharId || null,
          bgmi_ign: editBgmiIgn || null,
          freefire_uid: editFfUid || null,
          freefire_ign: editFfIgn || null,
          profile_picture: editPicUrl || null
        };
        mockDb.saveProfiles(profilesMap);

        alert('Profile updated successfully!');
        await refreshProfile();
        await fetchDashboardData();
        return;
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          name: editName,
          phone_number: editPhone || null,
          bgmi_character_id: editBgmiCharId || null,
          bgmi_ign: editBgmiIgn || null,
          freefire_uid: editFfUid || null,
          freefire_ign: editFfIgn || null,
          profile_picture: editPicUrl || null,
        })
        .eq('id', user?.id);

      if (error) throw error;

      alert('Profile updated successfully!');
      await refreshProfile();
      await fetchDashboardData();
    } catch (err: any) {
      console.error(err);
      setFormError(err.message || 'Failed to update profile');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="flex-grow flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-10 h-10 text-purple-500 animate-spin" />
      </div>
    );
  }

  // Calculate wallet summary stats
  const depBal = wallet?.deposit_balance || 0;
  const winBal = wallet?.winning_balance || 0;
  const bonusBal = wallet?.bonus_balance || 0;
  const totalBal = depBal + winBal + bonusBal;

  const filteredTourneys = joinedTourneys.filter((t) => t.status === tourneyFilter);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 w-full space-y-8">
      {/* Welcome header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-zinc-900 pb-6">
        <div>
          <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            Dashboard
          </h1>
          <p className="text-zinc-400 text-xs sm:text-sm mt-1">
            Welcome back, <strong className="text-purple-400">{profile?.name}</strong>. Ready for your next chicken dinner?
          </p>
        </div>

        {/* Dashboard Tabs Selectors */}
        <div className="flex bg-zinc-950 p-1.5 rounded-xl border border-zinc-900 w-full sm:w-auto overflow-x-auto gap-1">
          {([
            { id: 'overview', label: 'Overview' },
            { id: 'tournaments', label: 'My Matches' },
            { id: 'wallet', label: 'Wallet' },
            { id: 'leaderboard', label: 'Leaderboard' },
            { id: 'teams', label: 'Clan/Team' },
            { id: 'tickets', label: 'Support' },
            { id: 'profile', label: 'Profile' }
          ] as const).map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setFormError(null);
              }}
              className={`flex-shrink-0 px-3 py-2 rounded-lg text-xs font-bold tracking-wide transition-all ${
                activeTab === tab.id
                  ? 'bg-purple-600 text-white shadow'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-8"
          >
            {/* Summary statistics cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">

              {/* Card 2: Total Winnings */}
              <div className="p-5 bg-zinc-900 border border-zinc-850 rounded-2xl space-y-3">
                <div className="flex justify-between items-start">
                  <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Total Winnings</div>
                  <Trophy className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="text-3xl font-black text-emerald-400">₹{winBal.toFixed(2)}</div>
                <div className="text-[10px] text-zinc-500 font-semibold">
                  Withdrawable balance is equal to winnings
                </div>
              </div>

              {/* Card 3: Joined Tournaments */}
              <div className="p-5 bg-zinc-900 border border-zinc-850 rounded-2xl space-y-3">
                <div className="flex justify-between items-start">
                  <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Joined Tourneys</div>
                  <Gamepad2 className="w-5 h-5 text-cyan-400" />
                </div>
                <div className="text-3xl font-black text-cyan-400">{joinedTourneys.length}</div>
                <div className="text-[10px] text-zinc-500 font-semibold">
                  {joinedTourneys.filter((t) => t.status === 'Upcoming').length} upcoming matches
                </div>
              </div>

              {/* Card 4: Registered Games */}
              <div className="p-5 bg-zinc-900 border border-zinc-850 rounded-2xl space-y-3">
                <div className="flex justify-between items-start">
                  <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Game IDs Linked</div>
                  <User className="w-5 h-5 text-purple-400" />
                </div>
                <div className="text-xs text-zinc-300 font-semibold space-y-1">
                  <div className="truncate">BGMI: <span className="text-zinc-100">{profile?.bgmi_ign || 'Not linked'}</span></div>
                  <div className="truncate">FF: <span className="text-zinc-100">{profile?.freefire_ign || 'Not linked'}</span></div>
                </div>
              </div>
            </div>

            {/* Quick Actions Panel */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Joined Tournaments shortcuts */}
              <div className="lg:col-span-2 glass-panel border border-zinc-800/80 rounded-2xl p-5 sm:p-6 space-y-4">
                <h3 className="text-lg font-bold text-zinc-200">Recent Registrations</h3>
                {joinedTourneys.length === 0 ? (
                  <div className="py-12 text-center text-zinc-500 space-y-3">
                    <p className="text-sm">You haven't joined any tournaments yet.</p>
                    <Link
                      href="/"
                      className="inline-flex items-center gap-1 text-xs font-bold text-purple-400 hover:underline"
                    >
                      Browse upcoming tournaments
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                ) : (
                  <div className="divide-y divide-zinc-900 space-y-4">
                    {joinedTourneys.slice(0, 3).map((t) => (
                      <div key={t.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 first:pt-0">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-black uppercase text-purple-400 tracking-wider">
                              {t.game}
                            </span>
                            <span className="text-[10px] text-zinc-500">
                              {t.mode}
                            </span>
                          </div>
                          <h4 className="font-bold text-zinc-200 hover:text-white transition-colors">
                            {t.title}
                          </h4>
                          <span className="text-[10px] text-zinc-500 font-semibold">
                            {new Date(t.start_time).toLocaleString()}
                          </span>
                        </div>
                        <Link
                          href={`/tournaments/${t.id}`}
                          className="px-4 py-2 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 rounded-lg text-xs font-bold text-zinc-300 text-center"
                        >
                          View Lobby Details
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Request Payout Form */}
              <div className="p-5 glass-panel border border-zinc-800/80 rounded-2xl space-y-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-emerald-400 mb-2">
                    <Send className="w-5 h-5" />
                    <h3 className="font-bold text-zinc-200">Request Payout</h3>
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Withdraw funds from your Winnings wallet directly to your UPI ID (Min: ₹100).
                  </p>
                </div>

                <form onSubmit={handleWithdrawal} className="space-y-3">
                  <input
                    type="number"
                    required
                    min="1"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    placeholder="Amount (e.g. ₹150)"
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg focus:border-cyan-500/50 focus:outline-none text-sm text-zinc-100 transition-colors"
                  />
                  <input
                    type="text"
                    required
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    placeholder="UPI ID (e.g. yourname@ybl)"
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg focus:border-cyan-500/50 focus:outline-none text-sm text-zinc-100 transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
                  >
                    {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Request Payout'}
                  </button>
                </form>
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB 2: MY TOURNAMENTS */}
        {activeTab === 'tournaments' && (
          <motion.div
            key="tournaments"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            {/* Filter tags (Upcoming, Live, Completed) */}
            <div className="flex gap-2 border-b border-zinc-900 pb-3">
              {(['Upcoming', 'Live', 'Completed'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setTourneyFilter(filter)}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                    tourneyFilter === filter
                      ? 'bg-zinc-900 border border-zinc-800 text-purple-400'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {filter} Lobbies
                </button>
              ))}
            </div>

            {/* List joined lobbies */}
            {dataLoading ? (
              <div className="py-12 flex justify-center"><Loader2 className="w-8 h-8 text-purple-500 animate-spin" /></div>
            ) : filteredTourneys.length === 0 ? (
              <div className="text-center py-16 text-zinc-500">
                No joined tournaments found under <strong className="text-zinc-300">{tourneyFilter}</strong>.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredTourneys.map((t) => (
                  <div
                    key={t.id}
                    className="p-5 glass-panel border border-zinc-800/80 rounded-2xl flex flex-col justify-between hover:border-purple-500/20 transition-all duration-300 relative overflow-hidden"
                  >
                    <div className="absolute top-0 left-0 right-0 h-[2px] bg-purple-500/30" />
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-purple-950/45 text-purple-400 border border-purple-500/20">
                          {t.game}
                        </span>
                        <span className="text-[10px] text-zinc-500 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(t.start_time).toLocaleString()}
                        </span>
                      </div>

                      <h3 className="text-lg font-bold text-zinc-100">{t.title}</h3>
                      <div className="text-xs text-zinc-400 mt-1 space-y-1">
                        <div>Mode: <strong>{t.mode}</strong> | Prize Pool: <strong className="text-emerald-400">₹{t.entry_fee > 0 ? (Number(t.entry_fee) * t.total_slots * 0.50).toFixed(0) : t.prize_pool}</strong></div>
                        <div className="pt-2 border-t border-zinc-950 mt-2 text-[11px] space-y-1">
                          <div>Registered IGN: <strong className="text-zinc-200">{t.registrations.ign}</strong> ({t.registrations.game_id || 'No UID'})</div>
                          <div>Payment Status: <span className={`font-bold ${t.registrations.payment_status === 'Paid' ? 'text-emerald-450' : 'text-yellow-500'}`}>{t.registrations.payment_status || 'Pending'}</span></div>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 mt-4 border-t border-zinc-955 flex justify-between items-center">
                      <div>
                        {t.registrations.payment_status !== 'Paid' && (
                          <span className="text-[10px] text-yellow-500 font-bold bg-yellow-950/20 border border-yellow-500/20 px-2 py-0.5 rounded">
                            ⚠️ Unpaid
                          </span>
                        )}
                      </div>
                      <Link
                        href={`/tournaments/${t.id}`}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
                          t.registrations.payment_status !== 'Paid'
                            ? 'bg-yellow-600 hover:bg-yellow-500 text-black'
                            : 'bg-purple-600 hover:bg-purple-500 text-white'
                        }`}
                      >
                        {t.registrations.payment_status !== 'Paid' ? 'Pay Now & Book Slot' : 'Enter Lobby page'}
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* TAB 3: WALLET */}
        {activeTab === 'wallet' && (
          <motion.div
            key="wallet"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-8"
          >
            {/* Left: Balances & Actions Forms */}
            <div className="lg:col-span-2 space-y-8">
              {formError && (
                <div className="p-3 bg-red-950/40 border border-red-500/30 rounded-lg text-xs text-red-400 font-semibold text-center">
                  {formError}
                </div>
              )}

              {/* Action panels grid */}
              <div className="max-w-md">

                {/* Withdraw Form */}
                <div className="p-5 glass-panel border border-zinc-800/80 rounded-2xl space-y-4">
                  <div className="flex items-center gap-2 text-emerald-400">
                    <Send className="w-5 h-5" />
                    <h3 className="font-bold text-zinc-200">Request Payout</h3>
                  </div>
                  <p className="text-xs text-zinc-400">
                    Withdraw funds from your Winning wallet. (Min: ₹100).
                  </p>

                  <form onSubmit={handleWithdrawal} className="space-y-3">
                    <input
                      type="number"
                      required
                      min="1"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      placeholder="Amount (e.g. ₹150)"
                      className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg focus:border-cyan-500/50 focus:outline-none text-sm text-zinc-100 transition-colors"
                    />
                    <input
                      type="text"
                      required
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      placeholder="UPI ID (e.g. yourname@ybl)"
                      className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg focus:border-cyan-500/50 focus:outline-none text-sm text-zinc-100 transition-colors"
                    />
                    <button
                      type="submit"
                      disabled={actionLoading}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
                    >
                      {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Request Payout'}
                    </button>
                  </form>
                </div>
              </div>

              {/* Transaction history list */}
              <div className="glass-panel border border-zinc-800/80 rounded-2xl p-5 sm:p-6 space-y-4">
                <h3 className="text-lg font-bold text-zinc-200 flex items-center gap-2">
                  <History className="w-5 h-5 text-purple-400" />
                  Transaction Log
                </h3>

                {dataLoading ? (
                  <div className="py-8 flex justify-center"><Loader2 className="w-6 h-6 text-purple-500 animate-spin" /></div>
                ) : transactions.length === 0 ? (
                  <p className="text-xs text-zinc-500 italic text-center py-6">No transactions recorded yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-zinc-900 text-zinc-500 font-bold uppercase">
                          <th className="pb-3">Type</th>
                          <th className="pb-3">Amount</th>
                          <th className="pb-3">Status</th>
                          <th className="pb-3 hidden sm:table-cell">Details</th>
                          <th className="pb-3">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-950">
                        {transactions.map((tx) => {
                          const isAdd = tx.type === 'Deposit' || tx.type === 'Prize Credit';
                          const statusColors = {
                            Completed: 'bg-emerald-950/40 text-emerald-400 border border-emerald-500/20',
                            Pending: 'bg-yellow-950/40 text-yellow-400 border border-yellow-500/20',
                            Failed: 'bg-red-950/40 text-red-400 border border-red-500/20',
                            Cancelled: 'bg-zinc-800 text-zinc-400',
                          };
                          return (
                            <tr key={tx.id} className="text-zinc-350">
                              <td className="py-3.5 font-bold flex items-center gap-1.5">
                                {isAdd ? (
                                  <ArrowDownLeft className="w-4.5 h-4.5 text-emerald-400" />
                                ) : (
                                  <ArrowUpRight className="w-4.5 h-4.5 text-red-400" />
                                )}
                                {tx.type}
                              </td>
                              <td className={`py-3.5 font-black ${isAdd ? 'text-emerald-400' : 'text-zinc-200'}`}>
                                {isAdd ? '+' : '-'}₹{tx.amount.toFixed(2)}
                              </td>
                              <td className="py-3.5">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${statusColors[tx.status]}`}>
                                  {tx.status}
                                </span>
                              </td>
                              <td className="py-3.5 hidden sm:table-cell text-zinc-500 max-w-xs truncate" title={tx.description}>
                                {tx.description}
                              </td>
                              <td className="py-3.5 text-zinc-500">
                                {new Date(tx.created_at).toLocaleDateString()}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Balance Cards */}
            <div className="space-y-6">
              <div className="p-5 glass-panel-purple border border-purple-500/30 rounded-2xl space-y-4">
                <h3 className="font-bold text-zinc-200 uppercase text-xs tracking-wider">Deposit Wallet</h3>
                <div className="text-3xl font-black text-white">₹{depBal.toFixed(2)}</div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Used specifically for register fees inside paid tournament lobbies. Cannot be withdrawn directly.
                </p>
              </div>

              <div className="p-5 glass-panel-cyan border border-cyan-500/30 rounded-2xl space-y-4">
                <h3 className="font-bold text-zinc-200 uppercase text-xs tracking-wider">Winnings Wallet</h3>
                <div className="text-3xl font-black text-emerald-400">₹{winBal.toFixed(2)}</div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Automatically credited when you place in the Top 3 inside completed tournaments. Fully withdrawable.
                </p>
              </div>

              <div className="p-5 bg-gradient-to-br from-indigo-950/20 to-zinc-900 border border-indigo-500/25 rounded-2xl space-y-4">
                <h3 className="font-bold text-zinc-200 uppercase text-xs tracking-wider">Bonus Wallet</h3>
                <div className="text-3xl font-black text-indigo-400">₹{bonusBal.toFixed(2)}</div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Promotional balance. Used automatically to discount registration entry fees. Non-withdrawable.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB 4: PROFILE */}
        {activeTab === 'profile' && (
          <motion.div
            key="profile"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="max-w-2xl mx-auto glass-panel border border-zinc-800/80 rounded-2xl p-6 sm:p-8 space-y-6"
          >
            <div>
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Settings className="w-5 h-5 text-purple-400" />
                Linked Profiles & Details
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                Manage your credentials and in-game profiles
              </p>
            </div>

            {formError && (
              <div className="p-3 bg-red-950/40 border border-red-500/30 rounded-lg text-xs text-red-400 font-semibold text-center">
                {formError}
              </div>
            )}

            <form onSubmit={handleUpdateProfile} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Full Name */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Full Name</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:border-purple-500/50 focus:outline-none text-sm text-zinc-100 transition-colors"
                  />
                </div>

                {/* Phone */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Phone / WhatsApp</label>
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:border-purple-500/50 focus:outline-none text-sm text-zinc-100 transition-colors"
                  />
                </div>
              </div>

              {/* Profile Pic Link */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Profile Picture URL</label>
                <input
                  type="url"
                  value={editPicUrl}
                  onChange={(e) => setEditPicUrl(e.target.value)}
                  placeholder="https://example.com/avatar.jpg"
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:border-purple-500/50 focus:outline-none text-sm text-zinc-100 transition-colors"
                />
              </div>

              {/* Game Profile details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* BGMI settings */}
                <div className="p-4 bg-purple-950/10 border border-purple-500/10 rounded-xl space-y-3">
                  <h4 className="text-xs font-black uppercase text-purple-400 tracking-wider flex items-center gap-1.5">
                    <Gamepad2 className="w-4 h-4 text-purple-400" />
                    BGMI Account Details
                  </h4>
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={editBgmiCharId}
                      onChange={(e) => setEditBgmiCharId(e.target.value)}
                      placeholder="BGMI UID"
                      className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg focus:border-purple-500/50 focus:outline-none text-xs text-zinc-105 transition-colors"
                    />
                    <input
                      type="text"
                      value={editBgmiIgn}
                      onChange={(e) => setEditBgmiIgn(e.target.value)}
                      placeholder="BGMI In-Game Name (IGN)"
                      className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg focus:border-purple-500/50 focus:outline-none text-xs text-zinc-105 transition-colors"
                    />
                  </div>
                </div>

                {/* Free fire settings */}
                <div className="p-4 bg-cyan-950/10 border border-cyan-500/10 rounded-xl space-y-3">
                  <h4 className="text-xs font-black uppercase text-cyan-400 tracking-wider flex items-center gap-1.5">
                    <Gamepad2 className="w-4 h-4 text-cyan-400" />
                    Free Fire Account Details
                  </h4>
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={editFfUid}
                      onChange={(e) => setEditFfUid(e.target.value)}
                      placeholder="Free Fire UID"
                      className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg focus:border-cyan-500/50 focus:outline-none text-xs text-zinc-105 transition-colors"
                    />
                    <input
                      type="text"
                      value={editFfIgn}
                      onChange={(e) => setEditFfIgn(e.target.value)}
                      placeholder="Free Fire In-Game Name (IGN)"
                      className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg focus:border-cyan-500/50 focus:outline-none text-xs text-zinc-105 transition-colors"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs shadow-[0_0_15px_rgba(147,51,234,0.25)] transition-all flex items-center justify-center gap-1.5"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {/* TAB 5: CLAN / TEAMS */}
        {activeTab === 'teams' && (
          <motion.div
            key="teams"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-8"
          >
            <div className="glass-panel border border-zinc-800/80 rounded-2xl p-6 sm:p-8 space-y-6">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-purple-400" />
                  Clan & Team Management
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Form squads, invite friends, and coordinate team tournament bookings.
                </p>
              </div>

              {teamError && (
                <div className="p-3 bg-red-950/40 border border-red-500/30 rounded-lg text-xs text-red-400 font-semibold">
                  {teamError}
                </div>
              )}

              {myTeam ? (
                // IF IN TEAM
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 bg-zinc-900/60 border border-zinc-850 rounded-2xl">
                    <div className="flex items-center gap-4">
                      <img
                        src={myTeam.logo_url}
                        alt={myTeam.name}
                        className="w-16 h-16 rounded-xl border border-purple-500/20 bg-zinc-950 p-1"
                      />
                      <div>
                        <h4 className="text-lg font-black text-white">{myTeam.name}</h4>
                        <p className="text-xs text-zinc-550">
                          Formed: {new Date(myTeam.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    
                    <button
                      onClick={handleLeaveTeam}
                      disabled={actionLoading}
                      className="px-4 py-2 border border-red-500/20 hover:border-red-500/40 bg-red-950/15 text-red-400 rounded-lg text-xs font-bold transition-all"
                    >
                      {teamMembers.find(m => m.user_id === user.id)?.role === 'Captain' ? 'Disband Team' : 'Leave Team'}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Member Directory */}
                    <div className="lg:col-span-2 space-y-4">
                      <h4 className="text-xs font-black uppercase text-zinc-400 tracking-wider">Squad Members ({teamMembers.length})</h4>
                      <div className="divide-y divide-zinc-950 bg-zinc-950/40 border border-zinc-900 rounded-2xl overflow-hidden">
                        {teamMembers.map((m) => (
                          <div key={m.id} className="p-4 flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                              {m.profile?.profile_picture ? (
                                <img src={m.profile.profile_picture} className="w-8 h-8 rounded-full object-cover" />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-purple-950/30 border border-purple-500/10 flex items-center justify-center text-xs font-bold text-purple-400">
                                  {(m.profile?.name || 'Player')[0].toUpperCase()}
                                </div>
                              )}
                              <div>
                                <div className="text-sm font-bold text-zinc-200">{m.profile?.name || 'Player'}</div>
                                <div className="text-[10px] text-zinc-555">{m.profile?.email || ''}</div>
                              </div>
                            </div>
                            <span className={`px-2.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                              m.role === 'Captain' 
                                ? 'bg-purple-950 text-purple-400 border border-purple-500/20' 
                                : 'bg-zinc-900 text-zinc-450 border border-zinc-800'
                            }`}>
                              {m.role}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Captain settings: invite */}
                    {teamMembers.find(m => m.user_id === user.id)?.role === 'Captain' && (
                      <div className="p-5 bg-purple-950/10 border border-purple-500/15 rounded-2xl space-y-4">
                        <h4 className="text-xs font-black uppercase text-purple-400 tracking-wider">Invite Player</h4>
                        <p className="text-xs text-zinc-400">
                          Search for Mash Arena players using their registered email.
                        </p>
                        <form onSubmit={handleSendInvite} className="space-y-3">
                          <input
                            type="email"
                            required
                            value={inviteEmail}
                            onChange={(e) => setInviteEmail(e.target.value)}
                            placeholder="player@email.com"
                            className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg focus:border-purple-500/50 focus:outline-none text-xs text-zinc-100 transition-colors"
                          />
                          <button
                            type="submit"
                            disabled={actionLoading}
                            className="w-full py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-bold text-xs transition-colors flex justify-center items-center gap-1.5"
                          >
                            {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Send Invite'}
                          </button>
                        </form>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                // IF NOT IN TEAM: Create or join
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                  {/* Create Clan card */}
                  <div className="p-5 bg-zinc-900/40 border border-zinc-850 rounded-2xl space-y-4">
                    <h4 className="text-base font-bold text-zinc-200">Start Your Squad</h4>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      Registering squad matches requires a team. Create a new clan and invite your teammates.
                    </p>
                    <form onSubmit={handleCreateTeam} className="space-y-3">
                      <input
                        type="text"
                        required
                        value={newTeamName}
                        onChange={(e) => setNewTeamName(e.target.value)}
                        placeholder="Team Name (e.g. MASH ARENA KINGS)"
                        className="w-full px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-lg focus:border-purple-500/50 focus:outline-none text-xs text-zinc-100 transition-colors"
                      />
                      <button
                        type="submit"
                        disabled={actionLoading}
                        className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-bold text-xs transition-colors flex justify-center items-center gap-1.5"
                      >
                        {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Create Team'}
                      </button>
                    </form>
                  </div>

                  {/* Team Invites panel */}
                  <div className="p-5 bg-zinc-900/40 border border-zinc-850 rounded-2xl space-y-4">
                    <h4 className="text-base font-bold text-zinc-200">Squad Invitations</h4>
                    <p className="text-xs text-zinc-400">
                      Pending invites from clan captains.
                    </p>
                    {teamInvites.length === 0 ? (
                      <div className="py-8 text-center text-xs text-zinc-650 italic">
                        No invitations pending.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {teamInvites.map((invite) => (
                          <div key={invite.id} className="p-3 bg-zinc-950/80 border border-zinc-900 rounded-xl flex items-center justify-between gap-3 text-xs">
                            <div>
                              <strong className="text-zinc-200">{invite.team_name}</strong>
                              <span className="block text-[9px] text-zinc-505">
                                Invited: {new Date(invite.created_at).toLocaleDateString()}
                              </span>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleAcceptInvite(invite)}
                                className="p-1.5 bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 rounded-lg hover:bg-emerald-900/30 transition-all"
                                title="Accept"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeclineInvite(invite.id)}
                                className="p-1.5 bg-red-950/40 border border-red-500/30 text-red-400 rounded-lg hover:bg-red-900/30 transition-all"
                                title="Decline"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* TAB 6: SUPPORT TICKETS */}
        {activeTab === 'tickets' && (
          <motion.div
            key="tickets"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-8"
          >
            <div className="glass-panel border border-zinc-800/80 rounded-2xl p-6 sm:p-8 space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-purple-400" />
                    Help & Support Center
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    Connect directly with support operators. File ticket issues, withdraw payouts, or report bugs.
                  </p>
                </div>

                {!activeTicket && !creatingTicket && (
                  <button
                    onClick={() => setCreatingTicket(true)}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold transition-colors"
                  >
                    New Support Ticket
                  </button>
                )}
              </div>

              {activeTicket ? (
                // ACTIVE CHAT VIEW
                <div className="border border-zinc-900 rounded-2xl overflow-hidden bg-zinc-950/20">
                  {/* Chat header */}
                  <div className="p-4 bg-zinc-900/60 border-b border-zinc-900 flex justify-between items-center">
                    <div>
                      <button
                        onClick={() => {
                          setActiveTicket(null);
                          setTicketMessages([]);
                        }}
                        className="text-xs font-bold text-purple-400 hover:text-purple-300 flex items-center gap-1 mb-1"
                      >
                        ← Back to Ticket List
                      </button>
                      <h4 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                        {activeTicket.title}
                        <span className="text-[10px] text-zinc-500 font-medium">({activeTicket.category})</span>
                      </h4>
                    </div>

                    <span className={`px-2.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                      activeTicket.status === 'Open' ? 'bg-purple-950 text-purple-400 border border-purple-500/20' :
                      activeTicket.status === 'In Progress' ? 'bg-yellow-950 text-yellow-400 border border-yellow-500/20' :
                      activeTicket.status === 'Resolved' ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/20' :
                      'bg-zinc-900 text-zinc-500'
                    }`}>
                      {activeTicket.status}
                    </span>
                  </div>

                  {/* Messages list */}
                  <div className="p-4 h-80 overflow-y-auto space-y-4 bg-zinc-950/40">
                    {ticketMessages.length === 0 ? (
                      <div className="text-center text-xs text-zinc-650 py-12">No messages in this chat.</div>
                    ) : (
                      ticketMessages.map((msg) => {
                        const isAdmin = msg.is_admin;
                        return (
                          <div
                            key={msg.id}
                            className={`flex ${isAdmin ? 'justify-start' : 'justify-end'}`}
                          >
                            <div className={`p-3.5 rounded-2xl max-w-[80%] text-xs border ${
                              isAdmin
                                ? 'bg-cyan-950/15 border-cyan-500/20 text-zinc-200 rounded-tl-none'
                                : 'bg-purple-950/20 border-purple-500/25 text-zinc-200 rounded-tr-none'
                            }`}>
                              <div className="flex justify-between items-center gap-4 mb-1 text-[9px] font-bold text-zinc-500">
                                <span>{isAdmin ? 'SUPPORT OPERATOR' : 'YOU'}</span>
                                <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                              <p className="leading-relaxed whitespace-pre-wrap">{msg.message}</p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Input form */}
                  {activeTicket.status !== 'Closed' ? (
                    <form onSubmit={handleReplyTicket} className="p-3 bg-zinc-950 border-t border-zinc-900 flex gap-2">
                      <input
                        type="text"
                        required
                        value={replyMessage}
                        onChange={(e) => setReplyMessage(e.target.value)}
                        placeholder="Write support reply..."
                        className="flex-grow px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg focus:border-purple-500/50 focus:outline-none text-xs text-zinc-100"
                      />
                      <button
                        type="submit"
                        disabled={actionLoading}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold transition-all"
                      >
                        Send
                      </button>
                    </form>
                  ) : (
                    <div className="p-4 text-center text-xs text-zinc-500 bg-zinc-950/50 border-t border-zinc-900">
                      This ticket has been marked as closed. You can submit a new ticket for further assistance.
                    </div>
                  )}
                </div>
              ) : creatingTicket ? (
                // CREATE TICKET FORM
                <div className="p-5 bg-zinc-900/30 border border-zinc-850 rounded-2xl space-y-4 max-w-xl mx-auto">
                  <h4 className="text-base font-bold text-zinc-250">Open Support Ticket</h4>
                  <form onSubmit={handleCreateTicket} className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500">Category</label>
                      <select
                        value={newTicketCategory}
                        onChange={(e) => setNewTicketCategory(e.target.value)}
                        className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg focus:border-purple-500/50 focus:outline-none text-xs text-zinc-200"
                      >
                        {['Tournament Issue', 'Withdrawal Issue', 'Registration Issue', 'Account Issue', 'Technical Issue', 'Other'].map((cat) => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500">Ticket Title</label>
                      <input
                        type="text"
                        required
                        value={newTicketTitle}
                        onChange={(e) => setNewTicketTitle(e.target.value)}
                        placeholder="e.g. Slots booked but not credited / Wallet debit failed"
                        className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg focus:border-purple-500/50 focus:outline-none text-xs text-zinc-100"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500">Explain the issue</label>
                      <textarea
                        required
                        rows={4}
                        value={newTicketMessage}
                        onChange={(e) => setNewTicketMessage(e.target.value)}
                        placeholder="Provide transactional reference IDs, tournament ID or details about the issue..."
                        className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg focus:border-purple-500/50 focus:outline-none text-xs text-zinc-100"
                      />
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setCreatingTicket(false)}
                        className="px-4 py-2 border border-zinc-855 text-zinc-400 rounded-lg text-xs font-bold hover:text-zinc-200 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={actionLoading}
                        className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5"
                      >
                        {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Submit Ticket'}
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                // LIST TICKETS VIEW
                <div className="space-y-4">
                  {tickets.length === 0 ? (
                    <div className="text-center py-12 text-zinc-500 border border-zinc-900 rounded-2xl p-6 bg-zinc-950/20">
                      <MessageSquare className="w-10 h-10 mx-auto text-zinc-700 mb-2" />
                      <p className="text-sm font-bold">No tickets opened yet</p>
                      <p className="text-xs text-zinc-605 max-w-xs mx-auto mt-1">
                        If you face any issues with deposits, tournament entry, or winnings payout, open a support ticket.
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-zinc-900 bg-zinc-950/40 border border-zinc-900 rounded-2xl overflow-hidden">
                      {tickets.map((t) => (
                        <div key={t.id} className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all hover:bg-zinc-900/10">
                          <div>
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-purple-950/50 text-purple-400 border border-purple-500/10">
                                {t.category}
                              </span>
                              <span className="text-[9px] text-zinc-550">
                                Opened: {new Date(t.created_at).toLocaleDateString()}
                              </span>
                            </div>
                            <h4 className="text-sm font-bold text-zinc-250">{t.title}</h4>
                          </div>

                          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                            <span className={`px-2.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                              t.status === 'Open' ? 'bg-purple-950 text-purple-400 border border-purple-500/20' :
                              t.status === 'In Progress' ? 'bg-yellow-950 text-yellow-400 border border-yellow-500/20' :
                              t.status === 'Resolved' ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/20' :
                              'bg-zinc-900 text-zinc-500'
                            }`}>
                              {t.status}
                            </span>
                            <button
                              onClick={() => setActiveTicket(t)}
                              className="px-4 py-1.5 bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 text-zinc-300 rounded-lg text-[10px] font-bold tracking-wider uppercase"
                            >
                              Chat Support
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* TAB: LEADERBOARD */}
        {activeTab === 'leaderboard' && (
          <motion.div
            key="leaderboard"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            {/* Top Rank Status Card */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 p-6 bg-gradient-to-br from-purple-950/40 to-zinc-900 border border-purple-500/20 rounded-2xl relative overflow-hidden flex flex-col justify-between">
                <div className="absolute top-[-20%] right-[-10%] w-[180px] h-[180px] rounded-full bg-purple-500/10 blur-xl pointer-events-none" />
                
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-purple-400 bg-purple-950/50 px-2.5 py-1 rounded border border-purple-500/10 inline-block mb-3">
                    Your Arena Standing
                  </span>
                  <h3 className="text-2xl font-black text-white">
                    {currentUserRankInfo.rank !== -1 ? (
                      <>
                        You are ranked <span className="text-purple-400">#{currentUserRankInfo.rank}</span> overall!
                      </>
                    ) : (
                      "You are currently Unranked"
                    )}
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1 max-w-lg font-medium leading-relaxed">
                    {currentUserRankInfo.rank !== -1 
                      ? "Keep dominating tournaments to climb to the top of the leaderboards and earn exclusive badges!" 
                      : "Register and play in upcoming tournaments to get ranked on the leaderboards and show your supremacy."}
                  </p>
                </div>

                <div className="flex gap-6 pt-6 border-t border-zinc-900 mt-6 text-xs font-semibold">
                  <div>
                    <span className="text-zinc-500 block text-[9px] uppercase tracking-wider">Tournament Wins</span>
                    <strong className="text-zinc-200 text-sm font-black">{currentUserRankInfo.stats?.wins || 0} wins</strong>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[9px] uppercase tracking-wider">Total Earnings</span>
                    <strong className="text-emerald-400 text-sm font-black">₹{currentUserRankInfo.stats?.earnings || 0}</strong>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[9px] uppercase tracking-wider">Participation</span>
                    <strong className="text-zinc-200 text-sm font-black">{currentUserRankInfo.stats?.matches || 0} matches</strong>
                  </div>
                </div>
              </div>

              {/* Game Info Panel */}
              <div className="p-6 bg-gradient-to-br from-cyan-950/20 to-zinc-900 border border-cyan-500/15 rounded-2xl flex flex-col justify-between relative overflow-hidden">
                <div className="absolute bottom-[-10%] right-[-10%] w-[120px] h-[120px] rounded-full bg-cyan-500/5 blur-xl pointer-events-none" />
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-cyan-400 bg-cyan-950/50 px-2.5 py-1 rounded border border-cyan-500/10 inline-block mb-3">
                    Tournament Rules
                  </span>
                  <h4 className="text-sm font-bold text-zinc-250">How to get ranked?</h4>
                  <ul className="text-[11px] text-zinc-450 mt-3 space-y-2 list-disc pl-4 font-semibold">
                    <li>Ranks recalculate instantly on match completion</li>
                    <li>Points are sorted by Cash Earnings, Wins, and Matches</li>
                    <li>Weekly lists reset every Sunday night</li>
                    <li>Top 3 players receive custom Profile Badges</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Filters & Leaderboard Table */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-zinc-950/60 p-4 rounded-xl border border-zinc-900">
                {/* Game selector */}
                <div className="flex bg-zinc-950 p-1 rounded-lg border border-zinc-850 w-full sm:w-auto">
                  {(['All', 'BGMI', 'Free Fire'] as const).map((g) => (
                    <button
                      key={g}
                      onClick={() => setLeaderboardGame(g)}
                      className={`px-4 py-2 rounded-md text-xs font-bold transition-all ${
                        leaderboardGame === g
                          ? 'bg-purple-600 text-white'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {g === 'All' ? 'All Games' : g}
                    </button>
                  ))}
                </div>

                {/* Timeframe Selector */}
                <div className="flex bg-zinc-950 p-1 rounded-lg border border-zinc-850 w-full sm:w-auto">
                  {(['weekly', 'monthly', 'allTime'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setLeaderboardTab(t)}
                      className={`px-4 py-2 rounded-md text-xs font-bold transition-all uppercase tracking-wide ${
                        leaderboardTab === t
                          ? 'bg-cyan-600 text-zinc-950 font-black'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {t === 'allTime' ? 'All Time' : t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Leaderboard Table List */}
              {leaderboardData.length === 0 ? (
                <div className="text-center py-12 text-zinc-500 border border-zinc-900 rounded-2xl p-6 bg-zinc-950/20">
                  <Trophy className="w-10 h-10 mx-auto text-zinc-700 mb-2" />
                  <p className="text-sm font-bold">Leaderboard is empty</p>
                  <p className="text-xs text-zinc-600 max-w-xs mx-auto mt-1">
                    No matching player data found for this filter. Start registering for tournaments to set the scores!
                  </p>
                </div>
              ) : (
                <div className="glass-panel border border-zinc-850 rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-zinc-900 text-zinc-500 font-bold uppercase bg-zinc-950/40">
                          <th className="p-4 w-[80px]">Rank</th>
                          <th className="p-4">Player Name</th>
                          <th className="p-4">Wins</th>
                          <th className="p-4">Participation</th>
                          <th className="p-4 text-right">Total Earnings</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-955">
                        {leaderboardData.slice(0, 15).map((player, idx) => {
                          const isCurrentUser = profile && (player.name === profile.name || player.user_id === profile.id);
                          return (
                            <tr 
                              key={player.name} 
                              className={`text-zinc-355 transition-all ${
                                isCurrentUser 
                                  ? 'bg-purple-900/10 hover:bg-purple-900/20 font-bold text-white shadow-[inset_4px_0_0_#9333ea]' 
                                  : 'hover:bg-zinc-900/10'
                              }`}
                            >
                              <td className="p-4 text-base font-black text-zinc-550">
                                {isCurrentUser ? (
                                  <span className="text-purple-400">#{idx + 1}</span>
                                ) : (
                                  `#${idx + 1}`
                                )}
                              </td>
                              <td className="p-4 flex items-center gap-2">
                                <span className="text-lg">{player.avatar}</span>
                                <div className="flex items-center gap-1.5">
                                  <span>{player.name}</span>
                                  {isCurrentUser && (
                                    <span className="px-1.5 py-0.5 rounded bg-purple-600 text-white text-[8px] font-black uppercase tracking-wider">
                                      You
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="p-4">{player.wins} wins</td>
                              <td className="p-4 text-zinc-550">{player.matches} matches</td>
                              <td className="p-4 text-right font-mono font-black text-emerald-400">₹{player.earnings}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
