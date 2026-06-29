'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { isMockEnabled, mockDb, calculateLeaderboard, type LeaderboardOverride, type LeaderboardPlayer } from '@/lib/mockDb';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldAlert, ShieldCheck, Users, Trophy, Wallet, 
  Trash2, Edit, Plus, Check, X, Megaphone, Loader2, Calendar, Gamepad2,
  MessageSquare, Send, RefreshCw, UserCheck, Skull, Play
} from 'lucide-react';
import Link from 'next/link';

interface Profile {
  id: string;
  name: string;
  email: string;
  bgmi_ign: string | null;
  freefire_ign: string | null;
  is_admin: boolean;
}

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

interface Withdrawal {
  id: string;
  user_id: string;
  upi_id: string;
  amount: number;
  status: 'Pending' | 'Approved' | 'Rejected';
  created_at: string;
  profiles?: {
    name: string;
    email: string;
    bgmi_character_id?: string | null;
    bgmi_ign?: string | null;
    freefire_uid?: string | null;
    freefire_ign?: string | null;
  };
}

interface Registration {
  id: string;
  user_id: string;
  game_id: string;
  ign: string;
  check_in_status?: 'Checked In' | 'Pending' | 'DNQ';
  profiles?: {
    name: string;
  };
}

export default function AdminPanelPage() {
  const router = useRouter();
  const { user, profile, loading } = useAuth();

  const [activeTab, setActiveTab] = useState<'analytics' | 'tournaments' | 'withdrawals' | 'deposits' | 'results' | 'users' | 'verification' | 'anticheat' | 'support' | 'audits' | 'announcements' | 'leaderboard'>('analytics');
  
  const getVisibleTabs = () => {
    const role = profile?.role || 'Player';
    if (role === 'Super Admin') {
      return [
        { id: 'analytics', label: 'Analytics' },
        { id: 'tournaments', label: 'Tournaments' },
        { id: 'withdrawals', label: 'Withdrawals' },
        { id: 'deposits', label: 'Deposits' },
        { id: 'results', label: 'Results & Prizes' },
        { id: 'leaderboard', label: 'Edit Leaderboard' },
        { id: 'users', label: 'Players' },
        { id: 'verification', label: 'Verifications' },
        { id: 'anticheat', label: 'Anti-Cheat' },
        { id: 'support', label: 'Support Tickets' },
        { id: 'announcements', label: 'Announcements' },
        { id: 'audits', label: 'Audit Logs' }
      ] as const;
    }
    if (role === 'Tournament Admin') {
      return [
        { id: 'analytics', label: 'Analytics' },
        { id: 'tournaments', label: 'Tournaments' },
        { id: 'results', label: 'Results & Prizes' }
      ] as const;
    }
    if (role === 'Support Admin') {
      return [
        { id: 'support', label: 'Support Tickets' }
      ] as const;
    }
    if (role === 'Moderator') {
      return [
        { id: 'users', label: 'Players' },
        { id: 'verification', label: 'Verifications' },
        { id: 'anticheat', label: 'Anti-Cheat' },
        { id: 'announcements', label: 'Announcements' },
        { id: 'audits', label: 'Audit Logs' }
      ] as const;
    }
    return [] as any[];
  };
  
  // Data lists
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [newQrCodeUrl, setNewQrCodeUrl] = useState('');
  const [tutorialVideoUrl, setTutorialVideoUrl] = useState('');
  const [newTutorialVideoUrl, setNewTutorialVideoUrl] = useState('');
  const [selectedTourneyId, setSelectedTourneyId] = useState<string>('');
  const [regsForSelectedTourney, setRegsForSelectedTourney] = useState<Registration[]>([]);
  
  const [dataLoading, setDataLoading] = useState(true);
  const [btnLoading, setBtnLoading] = useState(false);

  // Tournament Create Form states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [tourneyTitle, setTourneyTitle] = useState('');
  const [tourneyGame, setTourneyGame] = useState<'BGMI' | 'Free Fire'>('BGMI');
  const [tourneyMode, setTourneyMode] = useState('Squad');
  const [tourneyFee, setTourneyFee] = useState('');
  const [tourneySlots, setTourneySlots] = useState('');
  const [tourneyTime, setTourneyTime] = useState('');
  const [tourneyRules, setTourneyRules] = useState('');

  // Room Publish Form states
  const [publishTourneyId, setPublishTourneyId] = useState<string | null>(null);
  const [roomIdInput, setRoomIdInput] = useState('');
  const [roomPasswordInput, setRoomPasswordInput] = useState('');

  // Results Form states
  const [winner1, setWinner1] = useState('');
  const [winner2, setWinner2] = useState('');
  const [winner3, setWinner3] = useState('');

  // Tournament Edit Form states
  const [editingTournament, setEditingTournament] = useState<Tournament | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editGame, setEditGame] = useState<'BGMI' | 'Free Fire'>('BGMI');
  const [editMode, setEditMode] = useState('Squad');
  const [editFee, setEditFee] = useState('');
  const [editSlots, setEditSlots] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editRules, setEditRules] = useState('');
  const [editStatus, setEditStatus] = useState<'Upcoming' | 'Live' | 'Completed'>('Upcoming');

  // Support Tickets states
  const [adminTickets, setAdminTickets] = useState<any[]>([]);
  const [ticketFilter, setTicketFilter] = useState<'Open' | 'In Progress' | 'Resolved' | 'Closed'>('Open');
  const [activeAdminTicket, setActiveAdminTicket] = useState<any | null>(null);
  const [adminTicketMessages, setAdminTicketMessages] = useState<any[]>([]);
  const [adminReplyMessage, setAdminReplyMessage] = useState('');

  // Verifications
  const [unverifiedProfiles, setUnverifiedProfiles] = useState<any[]>([]);

  // Anti-Cheat
  const [bannedList, setBannedList] = useState<any[]>([]);
  const [searchBannedUser, setSearchBannedUser] = useState('');
  const [banReasonInput, setBanReasonInput] = useState('');

  // Audits
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // Announcements
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [annTitle, setAnnTitle] = useState('');
  const [annMessage, setAnnMessage] = useState('');
  const [annPriority, setAnnPriority] = useState<'Low' | 'Medium' | 'High' | 'Critical'>('Low');
  const [annType, setAnnType] = useState<'Tournament Announcements' | 'Maintenance Alerts' | 'New Feature Updates' | 'Emergency Notices'>('Tournament Announcements');
  const [annExpiresAt, setAnnExpiresAt] = useState('');
  const [showAnnModal, setShowAnnModal] = useState(false);
  const [checkInFilter, setCheckInFilter] = useState<'All' | 'Checked In' | 'Pending' | 'DNQ'>('All');

  // Leaderboard States
  const [rawWinners, setRawWinners] = useState<any[]>([]);
  const [rawRegistrations, setRawRegistrations] = useState<any[]>([]);
  const [leaderboardOverrides, setLeaderboardOverrides] = useState<LeaderboardOverride[]>([]);
  const [leaderboardHidden, setLeaderboardHidden] = useState<string[]>([]);
  const [leaderboardTabFilter, setLeaderboardTabFilter] = useState<'weekly' | 'monthly' | 'allTime'>('weekly');
  const [leaderboardGameFilter, setLeaderboardGameFilter] = useState<'All' | 'BGMI' | 'Free Fire'>('All');
  
  // Modal states for editing overrides
  const [editingOverridePlayer, setEditingOverridePlayer] = useState<LeaderboardPlayer | null>(null);
  const [editWins, setEditWins] = useState('0');
  const [editEarnings, setEditEarnings] = useState('0');
  const [editMatches, setEditMatches] = useState('0');

  // Custom player states
  const [showCustomPlayerModal, setShowCustomPlayerModal] = useState(false);
  const [customUsername, setCustomUsername] = useState('');
  const [customWins, setCustomWins] = useState('0');
  const [customEarnings, setCustomEarnings] = useState('0');
  const [customMatches, setCustomMatches] = useState('0');
  const [customGame, setCustomGame] = useState<'All' | 'BGMI' | 'Free Fire'>('All');
  const [customTab, setCustomTab] = useState<'weekly' | 'monthly' | 'allTime'>('weekly');

  const adminLeaderboardData = React.useMemo(() => {
    return calculateLeaderboard(leaderboardTabFilter, leaderboardGameFilter, rawWinners, rawRegistrations, profiles, tournaments, leaderboardOverrides, leaderboardHidden);
  }, [leaderboardTabFilter, leaderboardGameFilter, rawWinners, rawRegistrations, profiles, tournaments, leaderboardOverrides, leaderboardHidden]);

  const startEditTournament = (t: Tournament) => {
    setEditingTournament(t);
    setEditTitle(t.title);
    setEditGame(t.game);
    setEditMode(t.mode);
    setEditFee(t.entry_fee.toString());
    setEditSlots(t.total_slots.toString());
    const d = new Date(t.start_time);
    const tzoffset = d.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(d.getTime() - tzoffset)).toISOString().slice(0, 16);
    setEditTime(localISOTime);
    setEditRules(t.rules || '');
    setEditStatus(t.status);
  };

  const handleEditTournament = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTournament) return;
    setBtnLoading(true);
    try {
      // 1. Title validation
      const cleanTitle = editTitle.trim();
      if (!cleanTitle) {
        throw new Error('Tournament title is required.');
      }

      // 2. Fee validation
      const fee = Number(editFee);
      if (isNaN(fee) || fee < 0) {
        throw new Error('Entry fee must be a valid non-negative number.');
      }

      // 3. Slots validation
      const slots = Number(editSlots);
      if (isNaN(slots) || !Number.isInteger(slots) || slots <= 0) {
        throw new Error('Total slots must be a valid positive integer.');
      }

      // 4. Date validation
      if (!editTime) {
        throw new Error('Please select a valid match start time.');
      }
      const parsedDate = new Date(editTime);
      if (isNaN(parsedDate.getTime())) {
        throw new Error('Invalid match start time.');
      }
      const startTimeISO = parsedDate.toISOString();

      const calculatedPool = 0.50 * (fee * slots);

      if (isMockEnabled) {
        const list = mockDb.getTournaments();
        const tIdx = list.findIndex((t: any) => t.id === editingTournament.id);
        if (tIdx !== -1) {
          list[tIdx] = {
            ...list[tIdx],
            title: cleanTitle,
            game: editGame,
            mode: editMode,
            entry_fee: fee,
            total_slots: slots,
            start_time: startTimeISO,
            prize_pool: calculatedPool,
            rules: editRules,
            status: editStatus
          };
          mockDb.saveTournaments(list);
        }

        alert('Tournament updated successfully!');
        setEditingTournament(null);
        await fetchData();
        return;
      }

      const { error } = await supabase
        .from('tournaments')
        .update({
          title: cleanTitle,
          game: editGame,
          mode: editMode,
          entry_fee: fee,
          total_slots: slots,
          start_time: startTimeISO,
          prize_pool: calculatedPool,
          rules: editRules,
          status: editStatus
        })
        .eq('id', editingTournament.id);

      if (error) throw error;
      alert('Tournament updated successfully!');
      setEditingTournament(null);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to update tournament');
    } finally {
      setBtnLoading(false);
    }
  };

  // Real-time Support Messages Subscription / Poller
  useEffect(() => {
    if (!activeAdminTicket) {
      setAdminTicketMessages([]);
      return;
    }

    const fetchTicketMessages = async () => {
      try {
        if (isMockEnabled) {
          const allMsgs = mockDb.getMessages();
          const msgs = allMsgs.filter((m: any) => m.ticket_id === activeAdminTicket.id)
            .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
          setAdminTicketMessages(msgs);
        } else {
          const { data, error } = await supabase
            .from('support_messages')
            .select('*')
            .eq('ticket_id', activeAdminTicket.id)
            .order('created_at', { ascending: true });
          if (error) throw error;
          if (data) setAdminTicketMessages(data);
        }
      } catch (err) {
        console.error('Error fetching ticket messages:', err);
      }
    };

    fetchTicketMessages();

    let channel: any;
    let mockInterval: any;

    if (!isMockEnabled) {
      channel = supabase
        .channel(`public:support_messages:ticket_id=eq.${activeAdminTicket.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'support_messages',
            filter: `ticket_id=eq.${activeAdminTicket.id}`,
          },
          (payload) => {
            setAdminTicketMessages(prev => [...prev, payload.new]);
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
  }, [activeAdminTicket]);

  const handleUpdateVerification = async (profileId: string, status: 'Verified' | 'Rejected') => {
    setBtnLoading(true);
    try {
      if (isMockEnabled) {
        const profilesMap = mockDb.getProfiles();
        if (profilesMap[profileId]) {
          profilesMap[profileId] = {
            ...profilesMap[profileId],
            verification_status: status
          };
          mockDb.saveProfiles(profilesMap);
          
          // Log audit
          const audits = mockDb.getAuditLogs();
          audits.push({
            id: Math.random().toString(),
            action_by: user?.id || 'system',
            action: 'Verify Player',
            target_type: 'User',
            target_id: profileId,
            details: `Set verification status of ${profilesMap[profileId].name} to ${status}`,
            created_at: new Date().toISOString()
          });
          mockDb.saveAuditLogs(audits);

          // Add system notification
          const notifications = mockDb.getNotifications();
          notifications.push({
            id: Math.random().toString(),
            user_id: profileId,
            title: `Verification ${status}`,
            message: status === 'Verified' 
              ? 'Your profile verification request was approved! You can now join tournaments.' 
              : 'Your profile verification request was rejected. Please update your profile details.',
            type: 'System Alert',
            is_read: false,
            created_at: new Date().toISOString()
          });
          mockDb.saveNotifications(notifications);
        }
        alert(`Verification status set to ${status}`);
        await fetchData();
        return;
      }

      const { error } = await supabase
        .from('profiles')
        .update({ verification_status: status })
        .eq('id', profileId);

      if (error) throw error;
      
      // Log audit
      await supabase.from('audit_logs').insert({
        action_by: user?.id,
        action: 'Verify Player',
        target_type: 'User',
        target_id: profileId,
        details: `Set verification status to ${status}`
      });

      // Send notification
      await supabase.from('notifications').insert({
        user_id: profileId,
        title: `Verification ${status}`,
        message: status === 'Verified' 
          ? 'Your profile verification request was approved! You can now join tournaments.' 
          : 'Your profile verification request was rejected. Please update your profile details.',
        type: 'System Alert'
      });

      alert(`Verification status set to ${status}`);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to update verification');
    } finally {
      setBtnLoading(false);
    }
  };

  const handleBanUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchBannedUser.trim() || !banReasonInput.trim()) return;
    setBtnLoading(true);
    try {
      let targetProfile: any = null;

      if (isMockEnabled) {
        const profilesMap = mockDb.getProfiles();
        const searchLower = searchBannedUser.toLowerCase();
        targetProfile = Object.values(profilesMap).find((p: any) => 
          p.email?.toLowerCase() === searchLower ||
          p.bgmi_ign?.toLowerCase() === searchLower ||
          p.bgmi_character_id === searchBannedUser ||
          p.freefire_ign?.toLowerCase() === searchLower ||
          p.freefire_uid === searchBannedUser
        );

        if (!targetProfile) {
          alert('Player not found!');
          setBtnLoading(false);
          return;
        }

        const bannedUsers = mockDb.getBannedUsers();
        bannedUsers[targetProfile.id] = banReasonInput;
        mockDb.saveBannedUsers(bannedUsers);

        // Add Ban Log
        const banLogs = mockDb.getBanLogs();
        banLogs.push({
          id: Math.random().toString(),
          target_id: targetProfile.id,
          type: 'User',
          target_value: targetProfile.name,
          reason: banReasonInput,
          action_by: user?.id || 'system',
          created_at: new Date().toISOString()
        });
        mockDb.saveBanLogs(banLogs);

        // Audit Log
        const audits = mockDb.getAuditLogs();
        audits.push({
          id: Math.random().toString(),
          action_by: user?.id || 'system',
          action: 'Ban User',
          target_type: 'User',
          target_id: targetProfile.id,
          details: `Banned user ${targetProfile.name} for: ${banReasonInput}`,
          created_at: new Date().toISOString()
        });
        mockDb.saveAuditLogs(audits);

        alert('Player banned permanently!');
        setSearchBannedUser('');
        setBanReasonInput('');
        await fetchData();
        return;
      }

      // Supabase flow
      const { data: foundProfiles, error: searchError } = await supabase
        .from('profiles')
        .select('*')
        .or(`email.eq.${searchBannedUser},bgmi_ign.eq.${searchBannedUser},bgmi_character_id.eq.${searchBannedUser},freefire_ign.eq.${searchBannedUser},freefire_uid.eq.${searchBannedUser}`);

      if (searchError) throw searchError;
      if (!foundProfiles || foundProfiles.length === 0) {
        alert('Player not found!');
        setBtnLoading(false);
        return;
      }

      targetProfile = foundProfiles[0];

      // Add to banned_users
      const { error: banError } = await supabase
        .from('banned_users')
        .insert({
          user_id: targetProfile.id,
          banned_by: user?.id,
          reason: banReasonInput
        });

      if (banError) throw banError;

      // Add Ban Log
      await supabase.from('ban_logs').insert({
        target_id: targetProfile.id,
        type: 'User',
        target_value: targetProfile.name,
        reason: banReasonInput,
        action_by: user?.id
      });

      // Audit Log
      await supabase.from('audit_logs').insert({
        action_by: user?.id,
        action: 'Ban User',
        target_type: 'User',
        target_id: targetProfile.id,
        details: `Banned user ${targetProfile.name} for: ${banReasonInput}`
      });

      alert('Player banned permanently!');
      setSearchBannedUser('');
      setBanReasonInput('');
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to ban player');
    } finally {
      setBtnLoading(false);
    }
  };

  const handleUnbanUser = async (userId: string) => {
    setBtnLoading(true);
    try {
      if (isMockEnabled) {
        const bannedUsers = mockDb.getBannedUsers();
        delete bannedUsers[userId];
        mockDb.saveBannedUsers(bannedUsers);

        // Audit Log
        const audits = mockDb.getAuditLogs();
        audits.push({
          id: Math.random().toString(),
          action_by: user?.id || 'system',
          action: 'Unban User',
          target_type: 'User',
          target_id: userId,
          details: `Lifted ban for user ID: ${userId}`,
          created_at: new Date().toISOString()
        });
        mockDb.saveAuditLogs(audits);

        alert('Player ban lifted.');
        await fetchData();
        return;
      }

      const { error } = await supabase
        .from('banned_users')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;

      // Audit Log
      await supabase.from('audit_logs').insert({
        action_by: user?.id,
        action: 'Unban User',
        target_type: 'User',
        target_id: userId,
        details: `Lifted ban for user ID: ${userId}`
      });

      alert('Player ban lifted.');
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to lift ban');
    } finally {
      setBtnLoading(false);
    }
  };

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!annTitle.trim() || !annMessage.trim()) return;

    // RBAC Authorization check
    const role = profile?.role || 'Player';
    if (role !== 'Super Admin' && role !== 'Moderator') {
      alert('Access denied. Only Super Admin and Moderators can manage announcements.');
      return;
    }

    setBtnLoading(true);
    try {
      const expDate = annExpiresAt ? new Date(annExpiresAt).toISOString() : null;
      const pubDate = new Date().toISOString();

      if (isMockEnabled) {
        const list = mockDb.getAnnouncements();
        const newAnn = {
          id: `ann-${Date.now()}`,
          title: annTitle,
          message: annMessage,
          priority: annPriority,
          type: annType,
          published_at: pubDate,
          expires_at: expDate
        };
        list.push(newAnn);
        mockDb.saveAnnouncements(list);

        // Add System Audit log
        const audits = mockDb.getAuditLogs();
        audits.push({
          id: Math.random().toString(),
          action_by: user?.id || 'system',
          action: 'Create Announcement',
          target_type: 'Announcement',
          target_id: newAnn.id,
          details: `Created announcement: "${annTitle}" (${annType})`,
          created_at: pubDate
        });
        mockDb.saveAuditLogs(audits);

        alert('Announcement created successfully!');
        setAnnTitle('');
        setAnnMessage('');
        setAnnPriority('Low');
        setAnnType('Tournament Announcements');
        setAnnExpiresAt('');
        setShowAnnModal(false);
        await fetchData();
        return;
      }

      const { data, error } = await supabase
        .from('announcements')
        .insert({
          title: annTitle,
          message: annMessage,
          priority: annPriority,
          type: annType,
          expires_at: expDate
        })
        .select();

      if (error) throw error;

      // Log audit
      await supabase.from('audit_logs').insert({
        action_by: user?.id,
        action: 'Create Announcement',
        target_type: 'Announcement',
        target_id: data?.[0]?.id || 'Global',
        details: `Created announcement: "${annTitle}" (${annType})`
      });

      alert('Announcement created successfully!');
      setAnnTitle('');
      setAnnMessage('');
      setAnnPriority('Low');
      setAnnType('Tournament Announcements');
      setAnnExpiresAt('');
      setShowAnnModal(false);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to create announcement');
    } finally {
      setBtnLoading(false);
    }
  };

  const handleDeleteAnnouncement = async (annId: string) => {
    if (!confirm('Are you sure you want to delete this announcement?')) return;

    // RBAC Authorization check
    const role = profile?.role || 'Player';
    if (role !== 'Super Admin' && role !== 'Moderator') {
      alert('Access denied. Only Super Admin and Moderators can manage announcements.');
      return;
    }

    try {
      if (isMockEnabled) {
        const list = mockDb.getAnnouncements();
        const filtered = list.filter((a: any) => a.id !== annId);
        mockDb.saveAnnouncements(filtered);

        // Add System Audit log
        const audits = mockDb.getAuditLogs();
        audits.push({
          id: Math.random().toString(),
          action_by: user?.id || 'system',
          action: 'Delete Announcement',
          target_type: 'Announcement',
          target_id: annId,
          details: `Deleted announcement ID: ${annId}`,
          created_at: new Date().toISOString()
        });
        mockDb.saveAuditLogs(audits);

        alert('Announcement deleted!');
        await fetchData();
        return;
      }

      const { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', annId);

      if (error) throw error;

      // Log audit
      await supabase.from('audit_logs').insert({
        action_by: user?.id,
        action: 'Delete Announcement',
        target_type: 'Announcement',
        target_id: annId,
        details: `Deleted announcement ID: ${annId}`
      });

      alert('Announcement deleted!');
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Delete failed');
    }
  };

  const handleAdminReplyTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAdminTicket || !adminReplyMessage.trim()) return;
    setBtnLoading(true);
    try {
      if (isMockEnabled) {
        const msgs = mockDb.getMessages();
        const newMsg = {
          id: Math.random().toString(),
          ticket_id: activeAdminTicket.id,
          sender_id: user?.id || 'system',
          message: adminReplyMessage,
          is_admin: true,
          created_at: new Date().toISOString()
        };
        msgs.push(newMsg);
        mockDb.saveMessages(msgs);

        // Update ticket status
        const tickets = mockDb.getTickets();
        const tIdx = tickets.findIndex((t: any) => t.id === activeAdminTicket.id);
        if (tIdx !== -1 && tickets[tIdx].status === 'Open') {
          tickets[tIdx].status = 'In Progress';
          tickets[tIdx].updated_at = new Date().toISOString();
          mockDb.saveTickets(tickets);
          setActiveAdminTicket((prev: any) => ({ ...prev, status: 'In Progress' }));
        }

        // Add user notification
        const notifications = mockDb.getNotifications();
        notifications.push({
          id: Math.random().toString(),
          user_id: activeAdminTicket.user_id,
          title: 'New Support Reply',
          message: `Admin replied to your support ticket: "${adminReplyMessage.slice(0, 40)}..."`,
          type: 'Support Message',
          is_read: false,
          created_at: new Date().toISOString()
        });
        mockDb.saveNotifications(notifications);

        setAdminReplyMessage('');
        // Reload messages
        const filtered = msgs.filter((m: any) => m.ticket_id === activeAdminTicket.id)
          .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        setAdminTicketMessages(filtered);
        await fetchData();
        setBtnLoading(false);
        return;
      }

      // Supabase flow
      const { error: replyError } = await supabase
        .from('support_messages')
        .insert({
          ticket_id: activeAdminTicket.id,
          sender_id: user?.id,
          message: adminReplyMessage,
          is_admin: true
        });

      if (replyError) throw replyError;

      // Update ticket status to In Progress
      if (activeAdminTicket.status === 'Open') {
        await supabase
          .from('support_tickets')
          .update({ status: 'In Progress', updated_at: new Date().toISOString() })
          .eq('id', activeAdminTicket.id);
        setActiveAdminTicket((prev: any) => ({ ...prev, status: 'In Progress' }));
      }

      // Add user notification
      await supabase.from('notifications').insert({
        user_id: activeAdminTicket.user_id,
        title: 'New Support Reply',
        message: `Admin replied to your support ticket: "${adminReplyMessage.slice(0, 40)}..."`,
        type: 'Support Message'
      });

      setAdminReplyMessage('');
      
      const { data } = await supabase
        .from('support_messages')
        .select('*')
        .eq('ticket_id', activeAdminTicket.id)
        .order('created_at', { ascending: true });
      if (data) setAdminTicketMessages(data);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to send reply');
    } finally {
      setBtnLoading(false);
    }
  };

  const handleUpdateTicketStatus = async (ticketId: string, status: 'Open' | 'In Progress' | 'Resolved' | 'Closed') => {
    setBtnLoading(true);
    try {
      if (isMockEnabled) {
        const tickets = mockDb.getTickets();
        const tIdx = tickets.findIndex((t: any) => t.id === ticketId);
        if (tIdx !== -1) {
          tickets[tIdx].status = status;
          tickets[tIdx].updated_at = new Date().toISOString();
          mockDb.saveTickets(tickets);
          
          if (activeAdminTicket && activeAdminTicket.id === ticketId) {
            setActiveAdminTicket((prev: any) => ({ ...prev, status }));
          }

          // User notification
          const notifications = mockDb.getNotifications();
          notifications.push({
            id: Math.random().toString(),
            user_id: tickets[tIdx].user_id,
            title: 'Support Ticket Updated',
            message: `Your support ticket status has been changed to: ${status}`,
            type: 'Support Status Update',
            is_read: false,
            created_at: new Date().toISOString()
          });
          mockDb.saveNotifications(notifications);
        }
        alert(`Ticket status updated to ${status}`);
        await fetchData();
        setBtnLoading(false);
        return;
      }

      const { error } = await supabase
        .from('support_tickets')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', ticketId);

      if (error) throw error;

      if (activeAdminTicket && activeAdminTicket.id === ticketId) {
        setActiveAdminTicket((prev: any) => ({ ...prev, status }));
      }

      // User notification
      const { data: ticketData } = await supabase
        .from('support_tickets')
        .select('user_id')
        .eq('id', ticketId)
        .single();

      if (ticketData) {
        await supabase.from('notifications').insert({
          user_id: ticketData.user_id,
          title: 'Support Ticket Updated',
          message: `Your support ticket status has been changed to: ${status}`,
          type: 'Support Status Update'
        });
      }

      alert(`Ticket status updated to ${status}`);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to update ticket status');
    } finally {
      setBtnLoading(false);
    }
  };

  // Verify Admin
  useEffect(() => {
    if (!loading && (!user || user.email?.toLowerCase() !== 'sumit903970@gmail.com' || !profile?.is_admin)) {
      router.push('/');
    }
  }, [user, profile, loading]);

  const fetchData = async () => {
    try {
      setDataLoading(true);

      if (isMockEnabled) {
        // 1. Tournaments
        const tourneys = mockDb.getTournaments();
        setTournaments(tourneys);

        // 2. Withdrawals
        const withdrawalsList = mockDb.getWithdrawals();
        const profilesMap = mockDb.getProfiles();
        const mappedWithdrawals = withdrawalsList.map((w: any) => ({
          ...w,
          profiles: {
            name: profilesMap[w.user_id]?.name || 'Player',
            email: profilesMap[w.user_id]?.email || '',
            bgmi_character_id: profilesMap[w.user_id]?.bgmi_character_id || null,
            bgmi_ign: profilesMap[w.user_id]?.bgmi_ign || null,
            freefire_uid: profilesMap[w.user_id]?.freefire_uid || null,
            freefire_ign: profilesMap[w.user_id]?.freefire_ign || null
          }
        })).sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setWithdrawals(mappedWithdrawals);

        // 3. Profiles
        const profs = Object.values(profilesMap) as Profile[];
        setProfiles(profs);

        // 4. Fetch Support Tickets
        const tickets = mockDb.getTickets();
        const mappedTickets = tickets.map((t: any) => ({
          ...t,
          profile: profilesMap[t.user_id] || { name: 'Player', email: '' }
        })).sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setAdminTickets(mappedTickets);

        // 5. Fetch Pending Verifications
        const unverified = profs.filter((p: any) => p.verification_status !== 'Verified');
        setUnverifiedProfiles(unverified);

        // 6. Fetch Banned Users
        const bannedUsersMap = mockDb.getBannedUsers();
        const bannedListMapped = Object.entries(bannedUsersMap).map(([userId, reason]: any) => {
          return {
            user_id: userId,
            reason: reason,
            profile: profilesMap[userId] || { name: 'Banned Player', email: '' }
          };
        });
        setBannedList(bannedListMapped);

        // 7. Fetch Audit Logs
        const audits = mockDb.getAuditLogs();
        const mappedAudits = audits.map((a: any) => ({
          ...a,
          profile: profilesMap[a.action_by] || { name: 'System', email: '' }
        })).sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setAuditLogs(mappedAudits);

        // 8. Fetch Announcements
        const anns = mockDb.getAnnouncements();
        setAnnouncements(anns.sort((a: any, b: any) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime()));

        // 9. Fetch Leaderboard Data
        const winList = mockDb.getWinners();
        setRawWinners(winList);
        const regList = mockDb.getRegistrations();
        setRawRegistrations(regList);
        const overridesList = mockDb.getLeaderboardOverrides();
        setLeaderboardOverrides(overridesList);
        const hiddenList = mockDb.getLeaderboardHidden();
        setLeaderboardHidden(hiddenList);

        // Fetch Transactions, Payment QR, and Tutorial Video Settings
        const txsList = mockDb.getTransactions();
        setTransactions(txsList);
        const qr = mockDb.getPaymentQr();
        setQrCodeUrl(qr);
        setNewQrCodeUrl(qr);
        const video = mockDb.getTutorialVideoUrl();
        setTutorialVideoUrl(video);
        setNewTutorialVideoUrl(video);

        setDataLoading(false);
        return;
      }
      
      // 1. Fetch Tournaments
      const { data: tourneysData } = await supabase
        .from('tournaments')
        .select('*')
        .order('created_at', { ascending: false });
      if (tourneysData) setTournaments(tourneysData as Tournament[]);

      // 2. Fetch Profiles
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      
      let pList: Profile[] = [];
      if (profilesData) {
        pList = profilesData as Profile[];
        setProfiles(pList);
      }

      const pMap: Record<string, any> = {};
      pList.forEach(p => {
        pMap[p.id] = p;
      });

      // 3. Fetch Withdrawals
      const { data: withdrawalsData } = await supabase
        .from('withdrawals')
        .select('*')
        .order('created_at', { ascending: false });
      if (withdrawalsData) {
        const mapped = withdrawalsData.map((w: any) => ({
          ...w,
          profiles: pMap[w.user_id] || { name: 'Player', email: '' }
        }));
        setWithdrawals(mapped);
      }

      // 4. Fetch Support Tickets
      const { data: ticketsData } = await supabase
        .from('support_tickets')
        .select('*')
        .order('created_at', { ascending: false });
      if (ticketsData) {
        const mapped = ticketsData.map((t: any) => ({
          ...t,
          profile: pMap[t.user_id] || { name: 'Player', email: '' }
        }));
        setAdminTickets(mapped);
      }

      // 5. Fetch Pending Verifications
      const unverified = pList.filter((p: any) => p.verification_status !== 'Verified');
      setUnverifiedProfiles(unverified);

      // 6. Fetch Banned Users
      const { data: bannedData } = await supabase
        .from('banned_users')
        .select('*')
        .order('created_at', { ascending: false });
      if (bannedData) {
        const mapped = bannedData.map((b: any) => ({
          ...b,
          profile: pMap[b.user_id] || { name: 'Banned Player', email: '' }
        }));
        setBannedList(mapped);
      }

      // 7. Fetch Audit Logs
      const { data: auditsData } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false });
      if (auditsData) {
        const mapped = auditsData.map((a: any) => ({
          ...a,
          profile: pMap[a.action_by] || { name: 'System', email: '' }
        }));
        setAuditLogs(mapped);
      }

      // 8. Fetch Announcements
      const { data: annsData } = await supabase
        .from('announcements')
        .select('*')
        .order('published_at', { ascending: false });
      if (annsData) {
        setAnnouncements(annsData);
      }

      // 9. Fetch Leaderboard Data
      const { data: winData } = await supabase.from('winners').select('*');
      setRawWinners(winData || []);
      const { data: regData } = await supabase.from('registrations').select('*');
      setRawRegistrations(regData || []);

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
      setLeaderboardHidden(hiddenList);

      // Fetch Transactions from Supabase
      try {
        const { data: walletsData } = await supabase
          .from('wallets')
          .select('id, user_id');
        
        const walletMap: Record<string, string> = {};
        if (walletsData) {
          walletsData.forEach((w: any) => {
            walletMap[w.id] = w.user_id;
          });
        }

        const { data: txsData } = await supabase
          .from('transactions')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (txsData) {
          const mappedTxs = txsData.map((tx: any) => ({
            ...tx,
            user_id: walletMap[tx.wallet_id] || null
          }));
          setTransactions(mappedTxs);
        }
      } catch (err) {
        console.error('Failed to fetch transactions:', err);
      }

      // Fetch Payment QR Setting from Supabase
      try {
        const { data: settingsData } = await supabase
          .from('admin_settings')
          .select('value')
          .eq('key', 'payment_qr')
          .maybeSingle();
        if (settingsData) {
          setQrCodeUrl(settingsData.value);
          setNewQrCodeUrl(settingsData.value);
        } else {
          setQrCodeUrl('/payment_qr.jpg');
          setNewQrCodeUrl('/payment_qr.jpg');
        }
      } catch (err) {
        console.error('Failed to fetch admin settings QR:', err);
      }

      // Fetch Tutorial Video Setting from Supabase
      try {
        const { data: videoData } = await supabase
          .from('admin_settings')
          .select('value')
          .eq('key', 'tutorial_video_url')
          .maybeSingle();
        if (videoData) {
          setTutorialVideoUrl(videoData.value);
          setNewTutorialVideoUrl(videoData.value);
        } else {
          setTutorialVideoUrl('https://www.youtube.com/embed/dQw4w9WgXcQ');
          setNewTutorialVideoUrl('https://www.youtube.com/embed/dQw4w9WgXcQ');
        }
      } catch (err) {
        console.error('Failed to fetch admin settings video URL:', err);
      }

    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    if (user && profile?.is_admin) {
      fetchData();
    }
  }, [user, profile]);

  // Fetch registrations when selected tournament changes for results/verification
  useEffect(() => {
    async function fetchRegs() {
      if (!selectedTourneyId) return;



      if (isMockEnabled) {
        const allRegs = mockDb.getRegistrations();
        const regs = allRegs.filter((r: any) => r.tournament_id === selectedTourneyId);
        const profilesMap = mockDb.getProfiles();
        const mappedRegs = regs.map((r: any) => ({
          ...r,
          profiles: {
            name: profilesMap[r.user_id]?.name || 'Player'
          }
        }));
        setRegsForSelectedTourney(mappedRegs);
        return;
      }
      let data = null;
      const { data: joinedData, error: joinError } = await supabase
        .from('registrations')
        .select('*, profiles(name)')
        .eq('tournament_id', selectedTourneyId);

      if (!joinError && joinedData) {
        data = joinedData;
      } else {
        // Fallback: fetch registrations and profiles separately
        const { data: rawRegs, error: rawError } = await supabase
          .from('registrations')
          .select('*')
          .eq('tournament_id', selectedTourneyId);

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
            data = rawRegs.map(r => ({
              ...r,
              profiles: profMap[r.user_id] || { name: 'Player' }
            }));
          } else {
            data = [];
          }
        }
      }

      if (data) {
        setRegsForSelectedTourney(data as any[]);
      }
    }
    fetchRegs();
  }, [selectedTourneyId, tournaments]);

  // Tab visibility guarantor based on RBAC roles
  useEffect(() => {
    const visible = getVisibleTabs();
    if (visible.length > 0 && !visible.some(t => t.id === activeTab)) {
      setActiveTab(visible[0].id);
    }
  }, [profile, activeTab]);

  const handleDeleteLeaderboardPlayer = async (player: LeaderboardPlayer) => {
    try {
      setBtnLoading(true);
      
      let updatedOverrides = [...leaderboardOverrides];
      if (player.is_override) {
        updatedOverrides = leaderboardOverrides.filter(ov => !(ov.username === player.name && ov.game === leaderboardGameFilter && ov.tab === leaderboardTabFilter));
        setLeaderboardOverrides(updatedOverrides);
        if (isMockEnabled) {
          mockDb.saveLeaderboardOverrides(updatedOverrides);
        } else {
          await supabase.from('leaderboard_overrides').delete().match({ username: player.name, game: leaderboardGameFilter, tab: leaderboardTabFilter });
        }
      }

      const updatedHidden = [...leaderboardHidden, `${player.name}-${leaderboardGameFilter}-${leaderboardTabFilter}`];
      setLeaderboardHidden(updatedHidden);
      if (isMockEnabled) {
        mockDb.saveLeaderboardHidden(updatedHidden);
      } else {
        try {
          await supabase.from('leaderboard_hidden').insert({
            id: `${player.name}-${leaderboardGameFilter}-${leaderboardTabFilter}`,
            username: player.name,
            game: leaderboardGameFilter,
            tab: leaderboardTabFilter
          });
        } catch {
          mockDb.saveLeaderboardHidden(updatedHidden);
        }
      }

      const log = {
        id: isMockEnabled ? `aud-${Date.now()}` : undefined,
        action_by: user?.id || 'system',
        action: 'Delete Leaderboard Player',
        target_type: 'Leaderboard',
        target_id: player.name,
        details: `Deleted/hid player ${player.name} from ${leaderboardGameFilter} (${leaderboardTabFilter}) standings`,
        created_at: new Date().toISOString()
      };
      if (isMockEnabled) {
        const logs = mockDb.getAuditLogs();
        mockDb.saveAuditLogs([log, ...logs]);
        setAuditLogs([log, ...auditLogs]);
      } else {
        await supabase.from('audit_logs').insert(log);
        const { data } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false });
        if (data) setAuditLogs(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setBtnLoading(false);
    }
  };

  const handleResetOverride = async (username: string, game: string, tab: string) => {
    try {
      setBtnLoading(true);
      const filtered = leaderboardOverrides.filter((ov) => !(ov.username === username && ov.game === game && ov.tab === tab));
      
      if (isMockEnabled) {
        mockDb.saveLeaderboardOverrides(filtered);
      } else {
        await supabase.from('leaderboard_overrides').delete().match({ username, game, tab });
      }
      
      setLeaderboardOverrides(filtered);
      
      // Log audit
      const log = {
        id: isMockEnabled ? `aud-${Date.now()}` : undefined,
        action_by: user?.id || 'system',
        action: 'Reset Leaderboard Override',
        target_type: 'Leaderboard',
        target_id: username,
        details: `Reset stats for ${username} to automatic on ${game} (${tab})`,
        created_at: new Date().toISOString()
      };
      if (isMockEnabled) {
        const logs = mockDb.getAuditLogs();
        mockDb.saveAuditLogs([log, ...logs]);
        setAuditLogs([log, ...auditLogs]);
      } else {
        await supabase.from('audit_logs').insert(log);
        const { data } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false });
        if (data) setAuditLogs(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setBtnLoading(false);
    }
  };

  const handleSaveOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOverridePlayer) return;
    
    try {
      setBtnLoading(true);
      const wins = Number(editWins);
      const earnings = Number(editEarnings);
      const matches = Number(editMatches);
      
      const newOverride: LeaderboardOverride = {
        id: `${editingOverridePlayer.name}-${leaderboardGameFilter}-${leaderboardTabFilter}`,
        username: editingOverridePlayer.name,
        user_id: editingOverridePlayer.user_id,
        game: leaderboardGameFilter,
        tab: leaderboardTabFilter,
        wins,
        earnings,
        matches,
        avatar: editingOverridePlayer.avatar
      };
      
      const updated = [...leaderboardOverrides];
      const existingIdx = updated.findIndex(ov => ov.username === editingOverridePlayer.name && ov.game === leaderboardGameFilter && ov.tab === leaderboardTabFilter);
      if (existingIdx !== -1) {
        updated[existingIdx] = newOverride;
      } else {
        updated.push(newOverride);
      }
      
      if (isMockEnabled) {
        mockDb.saveLeaderboardOverrides(updated);
      } else {
        await supabase.from('leaderboard_overrides').upsert(newOverride);
      }
      
      setLeaderboardOverrides(updated);
      setEditingOverridePlayer(null);

      // Audit log
      const log = {
        id: isMockEnabled ? `aud-${Date.now()}` : undefined,
        action_by: user?.id || 'system',
        action: 'Update Leaderboard Override',
        target_type: 'Leaderboard',
        target_id: editingOverridePlayer.name,
        details: `Set override for ${editingOverridePlayer.name}: ${wins} wins, ${matches} matches, ₹${earnings} earnings on ${leaderboardGameFilter} (${leaderboardTabFilter})`,
        created_at: new Date().toISOString()
      };
      if (isMockEnabled) {
        const logs = mockDb.getAuditLogs();
        mockDb.saveAuditLogs([log, ...logs]);
        setAuditLogs([log, ...auditLogs]);
      } else {
        await supabase.from('audit_logs').insert(log);
        const { data } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false });
        if (data) setAuditLogs(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setBtnLoading(false);
    }
  };

  const handleAddCustomPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customUsername.trim()) return;
    
    try {
      setBtnLoading(true);
      const wins = Number(customWins);
      const earnings = Number(customEarnings);
      const matches = Number(customMatches);
      
      const newOverride: LeaderboardOverride = {
        id: `${customUsername.trim()}-${customGame}-${customTab}`,
        username: customUsername.trim(),
        game: customGame,
        tab: customTab,
        wins,
        earnings,
        matches,
        avatar: '🔥'
      };
      
      const updated = [...leaderboardOverrides];
      const existingIdx = updated.findIndex(ov => ov.username === customUsername.trim() && ov.game === customGame && ov.tab === customTab);
      if (existingIdx !== -1) {
        updated[existingIdx] = newOverride;
      } else {
        updated.push(newOverride);
      }
      
      if (isMockEnabled) {
        mockDb.saveLeaderboardOverrides(updated);
      } else {
        await supabase.from('leaderboard_overrides').upsert(newOverride);
      }
      
      setLeaderboardOverrides(updated);
      setShowCustomPlayerModal(false);
      
      // Reset form
      setCustomUsername('');
      setCustomWins('0');
      setCustomEarnings('0');
      setCustomMatches('0');
      
      // Audit log
      const log = {
        id: isMockEnabled ? `aud-${Date.now()}` : undefined,
        action_by: user?.id || 'system',
        action: 'Add Custom Player Override',
        target_type: 'Leaderboard',
        target_id: customUsername.trim(),
        details: `Added custom player ${customUsername.trim()}: ${wins} wins, ${matches} matches, ₹${earnings} earnings on ${customGame} (${customTab})`,
        created_at: new Date().toISOString()
      };
      if (isMockEnabled) {
        const logs = mockDb.getAuditLogs();
        mockDb.saveAuditLogs([log, ...logs]);
        setAuditLogs([log, ...auditLogs]);
      } else {
        await supabase.from('audit_logs').insert(log);
        const { data } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false });
        if (data) setAuditLogs(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setBtnLoading(false);
    }
  };

  const handleCreateTournament = async (e: React.FormEvent) => {
    e.preventDefault();
    setBtnLoading(true);

    try {
      // 1. Title validation
      const cleanTitle = tourneyTitle.trim();
      if (!cleanTitle) {
        throw new Error('Tournament title is required.');
      }

      // 2. Fee validation
      const fee = Number(tourneyFee);
      if (isNaN(fee) || fee < 0) {
        throw new Error('Entry fee must be a valid non-negative number.');
      }

      // 3. Slots validation
      const slots = Number(tourneySlots);
      if (isNaN(slots) || !Number.isInteger(slots) || slots <= 0) {
        throw new Error('Total slots must be a valid positive integer.');
      }

      // 4. Date validation
      if (!tourneyTime) {
        throw new Error('Please select a valid match start time.');
      }
      const parsedDate = new Date(tourneyTime);
      if (isNaN(parsedDate.getTime())) {
        throw new Error('Invalid match start time.');
      }
      const startTimeISO = parsedDate.toISOString();
      
      // Automated prize pool calculation for initial value (100 players * entry fee = collection, 50% = pool)
      const calculatedPool = 0.50 * (fee * slots);

      if (isMockEnabled) {
        const list = mockDb.getTournaments();
        const newTourney = {
          id: `mock-tourney-${Date.now()}`,
          title: cleanTitle,
          game: tourneyGame,
          mode: tourneyMode,
          entry_fee: fee,
          total_slots: slots,
          filled_slots: 0,
          start_time: startTimeISO,
          prize_pool: calculatedPool,
          rules: tourneyRules,
          status: 'Upcoming',
          room_published: false
        };
        list.push(newTourney);
        mockDb.saveTournaments(list);

        alert('Tournament created successfully!');
        setShowCreateModal(false);
        // reset form
        setTourneyTitle('');
        setTourneyFee('');
        setTourneySlots('');
        setTourneyTime('');
        setTourneyRules('');
        await fetchData();
        return;
      }

      const { data, error } = await supabase
        .from('tournaments')
        .insert({
          title: cleanTitle,
          game: tourneyGame,
          mode: tourneyMode,
          entry_fee: fee,
          total_slots: slots,
          start_time: startTimeISO,
          prize_pool: calculatedPool,
          rules: tourneyRules,
          status: 'Upcoming'
        })
        .select();

      if (error) throw error;

      alert('Tournament created successfully!');
      setShowCreateModal(false);
      // reset form
      setTourneyTitle('');
      setTourneyFee('');
      setTourneySlots('');
      setTourneyTime('');
      setTourneyRules('');
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to create tournament');
    } finally {
      setBtnLoading(false);
    }
  };

  const handleDeleteTournament = async (tid: string) => {
    if (!confirm('Are you sure you want to delete this tournament?')) return;
    try {
      if (isMockEnabled) {
        const list = mockDb.getTournaments();
        const filtered = list.filter((t: any) => t.id !== tid);
        mockDb.saveTournaments(filtered);

        // Delete regs
        const regs = mockDb.getRegistrations();
        const filteredRegs = regs.filter((r: any) => r.tournament_id !== tid);
        mockDb.saveRegistrations(filteredRegs);

        // Delete room
        const rooms = mockDb.getRooms();
        delete rooms[tid];
        mockDb.saveRooms(rooms);

        alert('Tournament deleted!');
        await fetchData();
        return;
      }

      const { error } = await supabase.from('tournaments').delete().eq('id', tid);
      if (error) throw error;
      alert('Tournament deleted!');
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Delete failed');
    }
  };

  const handlePublishRoomDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!publishTourneyId || !roomIdInput || !roomPasswordInput) return;
    setBtnLoading(true);

    try {
      if (isMockEnabled) {
        // 1. Upsert Room details
        const roomsMap = mockDb.getRooms();
        roomsMap[publishTourneyId] = {
          room_id: roomIdInput,
          room_password: roomPasswordInput
        };
        mockDb.saveRooms(roomsMap);

        // 2. Mark room_published = true
        const tourneys = mockDb.getTournaments();
        const tIdx = tourneys.findIndex((t: any) => t.id === publishTourneyId);
        if (tIdx !== -1) {
          tourneys[tIdx].room_published = true;
          mockDb.saveTournaments(tourneys);
        }

        alert('Room credentials published successfully!');
        setPublishTourneyId(null);
        setRoomIdInput('');
        setRoomPasswordInput('');
        await fetchData();
        return;
      }

      // 1. Insert/Update Room details
      const { error: roomError } = await supabase
        .from('tournament_rooms')
        .upsert({
          tournament_id: publishTourneyId,
          room_id: roomIdInput,
          room_password: roomPasswordInput
        });

      if (roomError) throw roomError;

      // 2. Mark room_published = true on tournament
      const { error: tourneyError } = await supabase
        .from('tournaments')
        .update({ room_published: true })
        .eq('id', publishTourneyId);

      if (tourneyError) throw tourneyError;

      alert('Room credentials published successfully!');
      setPublishTourneyId(null);
      setRoomIdInput('');
      setRoomPasswordInput('');
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to publish room details');
    } finally {
      setBtnLoading(false);
    }
  };

  const handleProcessWithdrawal = async (wid: string, approve: boolean) => {
    try {
      if (isMockEnabled) {
        const withdrawals = mockDb.getWithdrawals();
        const wIdx = withdrawals.findIndex((w: any) => w.id === wid);
        if (wIdx === -1) throw new Error('Withdrawal request not found');
        const wdr = withdrawals[wIdx];

        if (wdr.status !== 'Pending') {
          throw new Error('Withdrawal request has already been processed');
        }

        if (approve) {
          wdr.status = 'Approved';
          withdrawals[wIdx] = wdr;
          mockDb.saveWithdrawals(withdrawals);

          // Update transaction
          const txs = mockDb.getTransactions();
          const tIdx = txs.findIndex((t: any) => t.reference_id === wid && t.type === 'Withdrawal');
          if (tIdx !== -1) {
            txs[tIdx].status = 'Completed';
            mockDb.saveTransactions(txs);
          }
        } else {
          wdr.status = 'Rejected';
          withdrawals[wIdx] = wdr;
          mockDb.saveWithdrawals(withdrawals);

          // Update transaction
          const txs = mockDb.getTransactions();
          const tIdx = txs.findIndex((t: any) => t.reference_id === wid && t.type === 'Withdrawal');
          if (tIdx !== -1) {
            txs[tIdx].status = 'Failed';
          }

          // Refund wallet
          const walletsMap = mockDb.getWallets();
          const userWallet = walletsMap[wdr.user_id];
          if (userWallet) {
            userWallet.winning_balance += wdr.amount;
            walletsMap[wdr.user_id] = userWallet;
            mockDb.saveWallets(walletsMap);

            // Add transaction log
            txs.push({
              id: `tx-${Date.now()}`,
              wallet_id: userWallet.id,
              type: 'Prize Credit',
              amount: wdr.amount,
              status: 'Completed',
              reference_id: wid,
              description: 'Refund for rejected withdrawal request',
              created_at: new Date().toISOString()
            });
          }
          mockDb.saveTransactions(txs);
        }

        alert(`Withdrawal request ${approve ? 'Approved' : 'Rejected'} successfully!`);
        await fetchData();
        return;
      }

      const { data, error } = await supabase.rpc('process_withdrawal', {
        p_withdrawal_id: wid,
        p_approve: approve
      });

      if (error) throw error;

      alert(`Withdrawal request ${approve ? 'Approved' : 'Rejected'} successfully!`);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Processing failed');
    }
  };

  const handleProcessDeposit = async (txId: string, approve: boolean) => {
    try {
      if (isMockEnabled) {
        const txs = mockDb.getTransactions();
        const tIdx = txs.findIndex((t: any) => t.id === txId);
        if (tIdx === -1) throw new Error('Transaction not found');
        const tx = txs[tIdx];

        const walletsMap = mockDb.getWallets();
        const wallets = Object.values(walletsMap);
        const wallet: any = wallets.find((w: any) => w.id === tx.wallet_id);
        if (!wallet) throw new Error('Wallet not found for this transaction');

        const prevStatus = tx.status;

        if (prevStatus === 'Pending') {
          if (approve) {
            tx.status = 'Completed';
            // Credit wallet balance now that it is approved
            wallet.deposit_balance = Number(wallet.deposit_balance) + Number(tx.amount);
          } else {
            tx.status = 'Failed';
            // Do nothing to the balance since it was never credited
          }
        } else if (prevStatus === 'Completed') {
          if (!approve) {
            tx.status = 'Failed';
            // Deduct balance because we are changing from Approved to Rejected
            wallet.deposit_balance = Number(wallet.deposit_balance) - Number(tx.amount);
          }
        } else if (prevStatus === 'Failed') {
          if (approve) {
            tx.status = 'Completed';
            // Add balance back because we are changing from Rejected to Approved
            wallet.deposit_balance = Number(wallet.deposit_balance) + Number(tx.amount);
          }
        }

        walletsMap[wallet.user_id] = wallet;
        mockDb.saveWallets(walletsMap);
        mockDb.saveTransactions(txs);
        alert(`Deposit request updated successfully!`);
        await fetchData();
        return;
      }

      // Supabase mode
      const { data: tx, error: txError } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', txId)
        .single();
      if (txError || !tx) throw new Error('Transaction not found');

      const prevStatus = tx.status;

      if (prevStatus === 'Pending') {
        if (approve) {
          const { error: updateTxError } = await supabase
            .from('transactions')
            .update({ status: 'Completed' })
            .eq('id', txId);
          if (updateTxError) throw updateTxError;

          // Fetch wallet and credit balance now that it is approved
          const { data: wallet, error: walletError } = await supabase
            .from('wallets')
            .select('*')
            .eq('id', tx.wallet_id)
            .single();
          if (walletError || !wallet) throw new Error('Wallet not found');

          const { error: updateWalletError } = await supabase
            .from('wallets')
            .update({ deposit_balance: Number(wallet.deposit_balance) + Number(tx.amount) })
            .eq('id', tx.wallet_id);
          if (updateWalletError) throw updateWalletError;
        } else {
          const { error: updateTxError } = await supabase
            .from('transactions')
            .update({ status: 'Failed' })
            .eq('id', txId);
          if (updateTxError) throw updateTxError;
          // Do nothing to the balance since it was never credited
        }
      } else if (prevStatus === 'Completed' && !approve) {
        // Change from Completed to Failed (Deduct balance)
        const { error: updateTxError } = await supabase
          .from('transactions')
          .update({ status: 'Failed' })
          .eq('id', txId);
        if (updateTxError) throw updateTxError;

        const { data: wallet, error: walletError } = await supabase
          .from('wallets')
          .select('*')
          .eq('id', tx.wallet_id)
          .single();
        if (walletError || !wallet) throw new Error('Wallet not found');

        const { error: updateWalletError } = await supabase
          .from('wallets')
          .update({ deposit_balance: Number(wallet.deposit_balance) - Number(tx.amount) })
          .eq('id', tx.wallet_id);
        if (updateWalletError) throw updateWalletError;

      } else if (prevStatus === 'Failed' && approve) {
        // Change from Failed to Completed (Add balance back)
        const { error: updateTxError } = await supabase
          .from('transactions')
          .update({ status: 'Completed' })
          .eq('id', txId);
        if (updateTxError) throw updateTxError;

        const { data: wallet, error: walletError } = await supabase
          .from('wallets')
          .select('*')
          .eq('id', tx.wallet_id)
          .single();
        if (walletError || !wallet) throw new Error('Wallet not found');

        const { error: updateWalletError } = await supabase
          .from('wallets')
          .update({ deposit_balance: Number(wallet.deposit_balance) + Number(tx.amount) })
          .eq('id', tx.wallet_id);
        if (updateWalletError) throw updateWalletError;
      }

      // Sync matching deposit record status if reference_id exists
      if (tx.reference_id) {
        await supabase
          .from('deposits')
          .update({ status: approve ? 'Completed' : 'Failed' })
          .eq('id', tx.reference_id);
      }

      // Send real-time notification to user
      const { data: walletObj } = await supabase
        .from('wallets')
        .select('user_id')
        .eq('id', tx.wallet_id)
        .single();

      if (walletObj) {
        const actionText = approve ? 'Approved' : 'Rejected';
        const notificationMsg = approve
          ? `Your manual deposit of ₹${tx.amount} has been verified and approved.`
          : `Your manual deposit of ₹${tx.amount} was rejected by the administrator.`;

        await supabase.from('notifications').insert({
          user_id: walletObj.user_id,
          title: `Deposit ${actionText}`,
          message: notificationMsg,
          type: `Deposit ${actionText}`
        });
      }

      // Insert audit log entry
      if (user?.id) {
        await supabase.from('audit_logs').insert({
          action_by: user.id,
          action: `${approve ? 'Approve' : 'Reject'} Deposit`,
          target_type: 'Deposit',
          target_id: txId,
          details: `Processed deposit transaction of ₹${tx.amount}`
        });
      }

      alert(`Deposit request updated successfully!`);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Processing failed');
    }
  };

  const handleProcessCheckIn = async (regId: string, status: 'Checked In' | 'DNQ' | 'Pending') => {
    try {
      if (isMockEnabled) {
        const regs = mockDb.getRegistrations();
        const rIdx = regs.findIndex((r: any) => r.id === regId);
        if (rIdx === -1) throw new Error('Registration record not found');
        
        regs[rIdx].check_in_status = status;
        mockDb.saveRegistrations(regs);
        
        // Refresh local registrations state
        setRawRegistrations(regs);
        if (selectedTourneyId) {
          const tourneyRegs = regs.filter((r: any) => r.tournament_id === selectedTourneyId);
          // map profiles
          const profilesMap = mockDb.getProfiles();
          const mappedRegs = tourneyRegs.map((r: any) => ({
            ...r,
            profiles: {
              name: profilesMap[r.user_id]?.name || 'Player',
              email: profilesMap[r.user_id]?.email || '',
              bgmi_character_id: profilesMap[r.user_id]?.bgmi_character_id || null,
              bgmi_ign: profilesMap[r.user_id]?.bgmi_ign || null,
              freefire_uid: profilesMap[r.user_id]?.freefire_uid || null,
              freefire_ign: profilesMap[r.user_id]?.freefire_ign || null
            }
          }));
          setRegsForSelectedTourney(mappedRegs);
        }
        await fetchData();
        return;
      }

      // Supabase mode
      const { error } = await supabase
        .from('registrations')
        .update({ check_in_status: status })
        .eq('id', regId);
      
      if (error) throw error;
      
      // Update local state to avoid delay
      setRegsForSelectedTourney(prev =>
        prev.map(r => r.id === regId ? { ...r, check_in_status: status } : r)
      );
      
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to update check-in status');
    }
  };

  const handleUpdateQrCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQrCodeUrl.trim()) {
      alert('Please enter a valid QR code path or URL');
      return;
    }
    
    setBtnLoading(true);
    try {
      if (isMockEnabled) {
        mockDb.savePaymentQr(newQrCodeUrl);
        setQrCodeUrl(newQrCodeUrl);
        alert('Payment QR Code updated successfully!');
        await fetchData();
        return;
      }

      const { error } = await supabase
        .from('admin_settings')
        .upsert({ key: 'payment_qr', value: newQrCodeUrl });
      
      if (error) throw error;
      setQrCodeUrl(newQrCodeUrl);
      alert('Payment QR Code updated successfully!');
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to update QR Code');
    } finally {
      setBtnLoading(false);
    }
  };

  const handleUpdateTutorialVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTutorialVideoUrl.trim()) {
      alert('Please enter a valid video URL');
      return;
    }
    
    setBtnLoading(true);
    try {
      if (isMockEnabled) {
        mockDb.saveTutorialVideoUrl(newTutorialVideoUrl);
        setTutorialVideoUrl(newTutorialVideoUrl);
        alert('Tutorial Video URL updated successfully!');
        await fetchData();
        return;
      }

      const { error } = await supabase
        .from('admin_settings')
        .upsert({ key: 'tutorial_video_url', value: newTutorialVideoUrl });
      
      if (error) throw error;
      setTutorialVideoUrl(newTutorialVideoUrl);
      alert('Tutorial Video URL updated successfully!');
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to update video URL');
    } finally {
      setBtnLoading(false);
    }
  };

  const handlePublishResults = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTourneyId) return;

    if (!winner1 && !winner2 && !winner3) {
      alert('Please select at least one winner (Rank 1, Rank 2, or Rank 3) to publish results.');
      return;
    }

    setBtnLoading(true);

    try {
      if (isMockEnabled) {
        // Load tournament
        const tourneyList = mockDb.getTournaments();
        const tIdx = tourneyList.findIndex((t: any) => t.id === selectedTourneyId);
        if (tIdx === -1) throw new Error('Tournament not found');
        const tourney = tourneyList[tIdx];

        if (tourney.status === 'Completed') {
          throw new Error('Results have already been published for this tournament');
        }

        // Calculate pool (50% entry fee pool)
        const entryFee = Number(tourney.entry_fee) || 0;
        const prizePool = entryFee > 0 
          ? (entryFee * tourney.filled_slots * 0.50) 
          : (Number(tourney.prize_pool) || 0);

        const p1 = 0.50 * prizePool; // Rank 1 = 50%
        const p2 = 0.30 * prizePool; // Rank 2 = 30%
        const p3 = 0.20 * prizePool; // Rank 3 = 20%

        const walletsMap = mockDb.getWallets();
        const txs = mockDb.getTransactions();
        const winnersList = mockDb.getWinners();

        // helper to credit user wallet and log transaction
        const creditWinner = (winnerUserId: string, rank: number, prize: number) => {
          if (!winnerUserId || prize <= 0) return;
          const userWallet = walletsMap[winnerUserId] || {
            id: `w-${winnerUserId}`,
            user_id: winnerUserId,
            deposit_balance: 0,
            winning_balance: 0,
            created_at: new Date().toISOString()
          };
          userWallet.winning_balance += prize;
          walletsMap[winnerUserId] = userWallet;

          txs.push({
            id: `tx-${Date.now()}-${rank}`,
            wallet_id: userWallet.id,
            type: 'Prize Credit',
            amount: prize,
            status: 'Completed',
            reference_id: `winner-${selectedTourneyId}-${rank}`,
            description: `Rank ${rank} prize for tournament ${tourney.title}`,
            created_at: new Date().toISOString()
          });

          winnersList.push({
            id: `winner-${selectedTourneyId}-${rank}-${Date.now()}`,
            tournament_id: selectedTourneyId,
            user_id: winnerUserId,
            rank: rank,
            prize_won: prize,
            created_at: new Date().toISOString()
          });
        };

        creditWinner(winner1, 1, p1);
        creditWinner(winner2, 2, p2);
        creditWinner(winner3, 3, p3);

        mockDb.saveWallets(walletsMap);
        mockDb.saveTransactions(txs);
        mockDb.saveWinners(winnersList);

        // Update tournament status
        tourney.status = 'Completed';
        tourneyList[tIdx] = tourney;
        mockDb.saveTournaments(tourneyList);

        alert('Winners published and prizes distributed successfully!');
        setWinner1('');
        setWinner2('');
        setWinner3('');
        setSelectedTourneyId('');
        await fetchData();
        return;
      }

      const { data, error } = await supabase.rpc('publish_tournament_results', {
        p_tournament_id: selectedTourneyId,
        p_rank1_user_id: winner1 || null,
        p_rank2_user_id: winner2 || null,
        p_rank3_user_id: winner3 || null
      });

      if (error) throw error;

      alert('Winners published and prizes distributed successfully!');
      setWinner1('');
      setWinner2('');
      setWinner3('');
      setSelectedTourneyId('');
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to publish results');
    } finally {
      setBtnLoading(false);
    }
  };

  if (loading || !user || !profile?.is_admin) {
    return (
      <div className="flex-grow flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-10 h-10 text-purple-500 animate-spin" />
      </div>
    );
  }

  // Calculate admin stats
  const totalUsers = profiles.length;
  const completedMatches = tournaments.filter(t => t.status === 'Completed');
  const liveMatches = tournaments.filter(t => t.status === 'Live');
  
  // Total platform revenue generated (which is 50% of the sum of entry_fee * filled_slots of completed tournaments)
  const totalRevenue = completedMatches.reduce((acc, curr) => {
    return acc + (Number(curr.entry_fee) * curr.filled_slots * 0.50);
  }, 0);

  const pendingWithdrawalSum = withdrawals
    .filter(w => w.status === 'Pending')
    .reduce((acc, curr) => acc + Number(curr.amount), 0);

  const visibleTabs = getVisibleTabs();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 w-full space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-zinc-900 pb-6">
        <div>
          <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-8 h-8 text-cyan-400" />
            Admin Control Panel
          </h1>
          <p className="text-zinc-400 text-xs sm:text-sm mt-1">
            Publish lobbies, verify registrations, approve payouts, and manage winnings.
          </p>
        </div>

        {/* Tab Headers */}
        <div className="flex bg-zinc-950 p-1.5 rounded-xl border border-zinc-900 w-full sm:w-auto overflow-x-auto gap-1">
          {visibleTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setActiveAdminTicket(null);
              }}
              className={`flex-shrink-0 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === tab.id
                  ? 'bg-cyan-600 text-zinc-950 font-black'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* TAB 1: ANALYTICS */}
        {activeTab === 'analytics' && visibleTabs.some(t => t.id === 'analytics') && (
          <motion.div
            key="analytics"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-8"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Card 1: Users */}
              <div className="p-5 bg-zinc-900 border border-zinc-850 rounded-2xl space-y-3">
                <div className="flex justify-between items-start text-zinc-400">
                  <span className="text-xs font-bold uppercase tracking-wider">Total Users</span>
                  <Users className="w-5 h-5 text-purple-400" />
                </div>
                <div className="text-3xl font-black text-white">{totalUsers}</div>
                <div className="text-[10px] text-zinc-500 font-semibold">Registered players pool</div>
              </div>

              {/* Card 2: Revenue */}
              <div className="p-5 bg-gradient-to-br from-cyan-950/20 to-zinc-900 border border-cyan-500/10 rounded-2xl space-y-3">
                <div className="flex justify-between items-start text-zinc-400">
                  <span className="text-xs font-bold uppercase tracking-wider">Platform Revenue</span>
                  <Trophy className="w-5 h-5 text-cyan-400" />
                </div>
                <div className="text-3xl font-black text-cyan-400">₹{totalRevenue.toFixed(2)}</div>
                <div className="text-[10px] text-zinc-500 font-semibold">50% cut of completed entry pools</div>
              </div>

              {/* Card 3: Pending Payouts */}
              <div className="p-5 bg-zinc-900 border border-zinc-850 rounded-2xl space-y-3">
                <div className="flex justify-between items-start text-zinc-400">
                  <span className="text-xs font-bold uppercase tracking-wider">Pending Payouts</span>
                  <Wallet className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="text-3xl font-black text-emerald-400">₹{pendingWithdrawalSum.toFixed(2)}</div>
                <div className="text-[10px] text-zinc-500 font-semibold">
                  {withdrawals.filter(w => w.status === 'Pending').length} pending UPI requests
                </div>
              </div>

              {/* Card 4: Live Lobbies */}
              <div className="p-5 bg-zinc-900 border border-zinc-850 rounded-2xl space-y-3">
                <div className="flex justify-between items-start text-zinc-400">
                  <span className="text-xs font-bold uppercase tracking-wider">Live Tourneys</span>
                  <Gamepad2 className="w-5 h-5 text-purple-400" />
                </div>
                <div className="text-3xl font-black text-white">{liveMatches.length}</div>
                <div className="text-[10px] text-zinc-500 font-semibold">Matches currently running</div>
              </div>
            </div>

            {/* Premium SVG charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Signups Trend Line Chart */}
              <div className="glass-panel border border-zinc-800 p-5 sm:p-6 rounded-2xl space-y-4">
                <h4 className="text-xs font-black uppercase text-zinc-400 tracking-wider">User Signup Growth</h4>
                <div className="h-64 w-full bg-zinc-950/40 rounded-xl p-2 border border-zinc-900 flex items-center justify-center relative">
                  <svg className="w-full h-full" viewBox="0 0 400 200" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="line-glow" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.4"/>
                        <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0"/>
                      </linearGradient>
                    </defs>
                    <line x1="0" y1="50" x2="400" y2="50" stroke="#1F2937" strokeWidth="0.5" />
                    <line x1="0" y1="100" x2="400" y2="100" stroke="#1F2937" strokeWidth="0.5" />
                    <line x1="0" y1="150" x2="400" y2="150" stroke="#1F2937" strokeWidth="0.5" />
                    <path d="M 0 180 Q 80 140 160 150 T 320 60 L 400 30 L 400 200 L 0 200 Z" fill="url(#line-glow)" />
                    <path d="M 0 180 Q 80 140 160 150 T 320 60 L 400 30" fill="none" stroke="#A78BFA" strokeWidth="3" strokeLinecap="round" />
                    <circle cx="160" cy="150" r="4" fill="#C084FC" />
                    <circle cx="320" cy="60" r="4" fill="#C084FC" />
                    <circle cx="400" cy="30" r="4" fill="#C084FC" />
                  </svg>
                  <div className="absolute bottom-2 left-2 text-[8px] text-zinc-550 font-bold">Week 1</div>
                  <div className="absolute bottom-2 right-2 text-[8px] text-zinc-550 font-bold">Today</div>
                </div>
              </div>

              {/* Revenue Trends Bar Chart */}
              <div className="glass-panel border border-zinc-800 p-5 sm:p-6 rounded-2xl space-y-4">
                <h4 className="text-xs font-black uppercase text-zinc-400 tracking-wider">Revenue Stream</h4>
                <div className="h-64 w-full bg-zinc-950/40 rounded-xl p-4 border border-zinc-900 flex items-end justify-between relative">
                  <div className="absolute inset-x-0 top-1/4 border-t border-zinc-900/60" />
                  <div className="absolute inset-x-0 top-2/4 border-t border-zinc-900/60" />
                  <div className="absolute inset-x-0 top-3/4 border-t border-zinc-900/60" />
                  
                  {[
                    { label: 'Mon', val: 30 },
                    { label: 'Tue', val: 45 },
                    { label: 'Wed', val: 20 },
                    { label: 'Thu', val: 75 },
                    { label: 'Fri', val: 60 },
                    { label: 'Sat', val: 95 },
                    { label: 'Sun', val: 80 }
                  ].map((bar, idx) => (
                    <div key={idx} className="flex flex-col items-center gap-2 z-10 w-[10%]">
                      <div className="text-[8px] text-cyan-400 font-black">₹{Math.floor(bar.val * (totalRevenue / 100) + 15)}</div>
                      <div 
                        className="w-full bg-gradient-to-t from-cyan-600 to-teal-400 rounded-t-md shadow-[0_0_10px_rgba(6,182,212,0.15)] transition-all hover:brightness-110" 
                        style={{ height: `${bar.val * 1.5}px` }}
                      />
                      <span className="text-[9px] text-zinc-500 font-bold">{bar.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB 2: TOURNAMENTS CRUD */}
        {activeTab === 'tournaments' && visibleTabs.some(t => t.id === 'tournaments') && (
          <motion.div
            key="tournaments"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-zinc-200">Tournaments Database</h3>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-zinc-950 font-black rounded-lg text-xs flex items-center gap-1.5 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create Tournament
              </button>
            </div>

            {dataLoading ? (
              <div className="py-12 flex justify-center"><Loader2 className="w-8 h-8 text-purple-500 animate-spin" /></div>
            ) : (
              <div className="glass-panel border border-zinc-850 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-900 text-zinc-500 font-bold uppercase bg-zinc-950/40">
                        <th className="p-4">Game</th>
                        <th className="p-4">Title</th>
                        <th className="p-4">Start Time</th>
                        <th className="p-4">Entry / Slots</th>
                        <th className="p-4">Status</th>
                        <th className="p-4">Credentials</th>
                        <th className="p-4 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-950">
                      {tournaments.map((t) => {
                        const isBGMI = t.game === 'BGMI';
                        return (
                          <tr key={t.id} className="text-zinc-350 hover:bg-zinc-900/10">
                            <td className="p-4">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${isBGMI ? 'bg-purple-950/40 text-purple-400' : 'bg-cyan-950/40 text-cyan-400'}`}>
                                {t.game}
                              </span>
                            </td>
                            <td className="p-4 font-bold text-zinc-200">{t.title}</td>
                            <td className="p-4 text-zinc-500">{new Date(t.start_time).toLocaleString()}</td>
                            <td className="p-4">
                              ₹{t.entry_fee} • <strong className="text-zinc-300">{t.filled_slots}/{t.total_slots}</strong>
                            </td>
                            <td className="p-4">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${t.status === 'Completed' ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-500/20' : t.status === 'Live' ? 'bg-red-950/40 text-red-400 border border-red-500/20 animate-pulse' : 'bg-zinc-800 text-zinc-400'}`}>
                                {t.status}
                              </span>
                            </td>
                            <td className="p-4">
                              {t.room_published ? (
                                <span className="text-emerald-400 font-bold flex items-center gap-1">
                                  <Check className="w-3.5 h-3.5" /> Published
                                </span>
                              ) : (
                                <button
                                  onClick={() => setPublishTourneyId(t.id)}
                                  className="text-purple-400 hover:underline font-bold text-xs flex items-center gap-1"
                                >
                                  <Megaphone className="w-3.5 h-3.5" /> Publish Room
                                </button>
                              )}
                            </td>
                            <td className="p-4 text-center flex items-center justify-center gap-2">
                              <button
                                onClick={() => startEditTournament(t)}
                                className="p-1.5 text-zinc-500 hover:text-cyan-400 hover:bg-cyan-950/20 rounded-lg transition-colors"
                                title="Edit Tournament"
                              >
                                <Edit className="w-4.5 h-4.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteTournament(t.id)}
                                className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-950/20 rounded-lg transition-colors"
                                title="Delete Tournament"
                              >
                                <Trash2 className="w-4.5 h-4.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* TAB 3: WITHDRAWAL REQUESTS */}
        {activeTab === 'withdrawals' && visibleTabs.some(t => t.id === 'withdrawals') && (
          <motion.div
            key="withdrawals"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            <h3 className="text-lg font-bold text-zinc-200">UPI Payout Requests</h3>

            {dataLoading ? (
              <div className="py-12 flex justify-center"><Loader2 className="w-8 h-8 text-purple-500 animate-spin" /></div>
            ) : withdrawals.length === 0 ? (
              <p className="text-zinc-500 text-xs italic">No withdrawal requests found.</p>
            ) : (
              <div className="glass-panel border border-zinc-850 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-900 text-zinc-500 font-bold uppercase bg-zinc-950/40">
                        <th className="p-4">User</th>
                        <th className="p-4">UPI ID</th>
                        <th className="p-4">Amount</th>
                        <th className="p-4">Status</th>
                        <th className="p-4">Date</th>
                        <th className="p-4 text-center">Payout Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-955">
                      {withdrawals.map((w) => (
                        <tr key={w.id} className="text-zinc-350 hover:bg-zinc-900/10">
                          <td className="p-4">
                            <div className="font-bold text-zinc-200">{w.profiles?.name}</div>
                            <div className="text-[10px] text-zinc-500">{w.profiles?.email}</div>
                            {w.profiles?.bgmi_character_id && (
                              <div className="text-[10px] text-purple-400 mt-1 font-semibold">
                                BGMI ID: {w.profiles?.bgmi_character_id} {w.profiles?.bgmi_ign ? `(${w.profiles?.bgmi_ign})` : ''}
                              </div>
                            )}
                            {w.profiles?.freefire_uid && (
                              <div className="text-[10px] text-cyan-400 mt-0.5 font-semibold">
                                FF UID: {w.profiles?.freefire_uid} {w.profiles?.freefire_ign ? `(${w.profiles?.freefire_ign})` : ''}
                              </div>
                            )}
                          </td>
                          <td className="p-4 font-mono">{w.upi_id}</td>
                          <td className="p-4 font-black text-emerald-400">₹{w.amount}</td>
                          <td className="p-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${w.status === 'Approved' ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/20' : w.status === 'Rejected' ? 'bg-red-950/40 text-red-400 border-red-500/20' : 'bg-yellow-950/40 text-yellow-400 border-yellow-500/20'}`}>
                              {w.status}
                            </span>
                          </td>
                          <td className="p-4 text-zinc-500">{new Date(w.created_at).toLocaleDateString()}</td>
                          <td className="p-4 text-center">
                            {w.status === 'Pending' ? (
                              <div className="flex justify-center gap-2">
                                <button
                                  onClick={() => handleProcessWithdrawal(w.id, true)}
                                  className="p-1 text-emerald-400 hover:bg-emerald-950/30 rounded border border-emerald-500/20"
                                  title="Approve Payout"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleProcessWithdrawal(w.id, false)}
                                  className="p-1 text-red-400 hover:bg-red-950/30 rounded border border-red-500/20"
                                  title="Reject Payout"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold border ${w.status === 'Approved' ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/20' : 'bg-red-950/40 text-red-400 border-red-500/20'}`}>
                                {w.status === 'Approved' ? 'Successful' : 'Rejected'}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* TAB: DEPOSIT REQUESTS & SETTINGS */}
        {activeTab === 'deposits' && visibleTabs.some(t => t.id === 'deposits') && (
          <motion.div
            key="deposits"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-8"
          >
            {/* Top: Edit QR Code Settings */}
            <div className="glass-panel border border-zinc-850 rounded-2xl p-5 sm:p-6 space-y-4">
              <h3 className="text-lg font-bold text-zinc-200 flex items-center gap-2">
                <Wallet className="w-5 h-5 text-purple-400" />
                Payment Settings (UPI QR Code)
              </h3>
              <p className="text-xs text-zinc-400 max-w-2xl">
                Update the UPI payment QR code displayed to players in their wallets. You can use local paths (e.g. <code>/payment_qr.jpg</code>) or online image URLs.
              </p>

              <form onSubmit={handleUpdateQrCode} className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                <div className="md:col-span-2 space-y-2">
                  <label className="text-[10px] text-zinc-500 uppercase tracking-wider block font-bold">QR Image Path or URL</label>
                  <input
                    type="text"
                    required
                    value={newQrCodeUrl}
                    onChange={(e) => setNewQrCodeUrl(e.target.value)}
                    placeholder="e.g. /payment_qr.jpg"
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg focus:border-cyan-500/50 focus:outline-none text-sm text-zinc-150 transition-colors"
                  />
                </div>
                <div>
                  <button
                    type="submit"
                    disabled={btnLoading}
                    className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 text-zinc-950 font-black rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5"
                  >
                    {btnLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update QR Code'}
                  </button>
                </div>
              </form>

              {/* Preview */}
              <div className="pt-2">
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider block font-bold mb-2">Current QR Preview</span>
                <div className="w-32 h-32 border border-zinc-800 p-1.5 rounded-lg bg-zinc-950">
                  <img
                    src={qrCodeUrl || '/payment_qr.jpg'}
                    alt="Current QR Code"
                    className="w-full h-full object-contain rounded"
                  />
                </div>
              </div>
            </div>

            {/* Tutorial Video Settings */}
            <div className="glass-panel border border-zinc-850 rounded-2xl p-5 sm:p-6 space-y-4">
              <h3 className="text-lg font-bold text-zinc-200 flex items-center gap-2">
                <Play className="w-5 h-5 text-purple-400" />
                How It Works Tutorial Video Settings
              </h3>
              <p className="text-xs text-zinc-400 max-w-2xl">
                Configure the URL of the playable tutorial video shown to players in the "How It Works" landing page section. You can use direct MP4/video file links or standard YouTube embed links (e.g. <code>https://www.youtube.com/embed/dQw4w9WgXcQ</code>).
              </p>

              <form onSubmit={handleUpdateTutorialVideo} className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                <div className="md:col-span-2 space-y-2">
                  <label className="text-[10px] text-zinc-500 uppercase tracking-wider block font-bold">Walkthrough Video URL</label>
                  <input
                    type="text"
                    required
                    value={newTutorialVideoUrl}
                    onChange={(e) => setNewTutorialVideoUrl(e.target.value)}
                    placeholder="e.g. https://www.youtube.com/embed/dQw4w9WgXcQ"
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg focus:border-cyan-500/50 focus:outline-none text-sm text-zinc-150 transition-colors"
                  />
                </div>
                <div>
                  <button
                    type="submit"
                    disabled={btnLoading}
                    className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 text-zinc-950 font-black rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5"
                  >
                    {btnLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update Video URL'}
                  </button>
                </div>
              </form>

              {/* Video Preview */}
              {tutorialVideoUrl && (
                <div className="pt-2">
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider block font-bold mb-2">Current Video Preview</span>
                  <div className="w-full max-w-md aspect-video border border-zinc-800 rounded-lg bg-zinc-950 overflow-hidden">
                    <iframe
                      src={tutorialVideoUrl}
                      title="Tutorial Video Preview"
                      className="w-full h-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Middle: Pending Deposit Requests */}
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-zinc-200">Pending Deposit Requests</h3>
              {dataLoading ? (
                <div className="py-12 flex justify-center"><Loader2 className="w-8 h-8 text-purple-500 animate-spin" /></div>
              ) : transactions.filter(t => t.type === 'Deposit' && t.status === 'Pending').length === 0 ? (
                <p className="text-zinc-500 text-xs italic">No pending deposit requests found.</p>
              ) : (
                <div className="glass-panel border border-zinc-850 rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-zinc-900 text-zinc-500 font-bold uppercase bg-zinc-950/40">
                          <th className="p-4">User</th>
                          <th className="p-4">UTR/UPI Ref/Txn ID</th>
                          <th className="p-4">Requested Amount</th>
                          <th className="p-4">Status</th>
                          <th className="p-4">Date</th>
                          <th className="p-4 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-955">
                        {(() => {
                          const profilesMap: Record<string, any> = {};
                          profiles.forEach(p => {
                            profilesMap[p.id] = p;
                          });

                          return transactions
                            .filter(t => t.type === 'Deposit' && t.status === 'Pending')
                            .map((tx) => {
                              const userId = tx.user_id || tx.wallet_id?.replace('w-', '');
                              const profile = profilesMap[userId] || { name: 'Player', email: 'Unknown Email' };
                              return (
                                <tr key={tx.id} className="text-zinc-350 hover:bg-zinc-900/10">
                                  <td className="p-4">
                                    <div className="font-bold text-zinc-200">{profile.name}</div>
                                    <div className="text-[10px] text-zinc-500">{profile.email}</div>
                                    {profile.bgmi_character_id && (
                                      <div className="text-[10px] text-purple-400 mt-1 font-semibold">
                                        BGMI ID: {profile.bgmi_character_id} {profile.bgmi_ign ? `(${profile.bgmi_ign})` : ''}
                                      </div>
                                    )}
                                    {profile.freefire_uid && (
                                      <div className="text-[10px] text-cyan-400 mt-0.5 font-semibold">
                                        FF UID: {profile.freefire_uid} {profile.freefire_ign ? `(${profile.freefire_ign})` : ''}
                                      </div>
                                    )}
                                  </td>
                                  <td className="p-4 font-mono font-bold text-zinc-300">{tx.description || 'N/A'}</td>
                                  <td className="p-4 font-black text-purple-400">₹{Number(tx.amount).toFixed(2)}</td>
                                  <td className="p-4">
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold border bg-yellow-950/40 text-yellow-400 border-yellow-500/20">
                                      {tx.status}
                                    </span>
                                  </td>
                                  <td className="p-4 text-zinc-500">{new Date(tx.created_at).toLocaleDateString()}</td>
                                  <td className="p-4 text-center">
                                    <div className="flex justify-center gap-2">
                                      <button
                                        onClick={() => handleProcessDeposit(tx.id, true)}
                                        className="p-1 text-emerald-400 hover:bg-emerald-950/30 rounded border border-emerald-500/20"
                                        title="Approve Deposit"
                                      >
                                        <Check className="w-4 h-4" />
                                      </button>
                                      <button
                                        onClick={() => handleProcessDeposit(tx.id, false)}
                                        className="p-1 text-red-400 hover:bg-red-950/30 rounded border border-red-500/20"
                                        title="Reject Deposit"
                                      >
                                        <X className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            });
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom: Past Deposits Log */}
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-zinc-200">Deposit History</h3>
              {dataLoading ? (
                <div className="py-12 flex justify-center"><Loader2 className="w-8 h-8 text-purple-500 animate-spin" /></div>
              ) : transactions.filter(t => t.type === 'Deposit' && t.status !== 'Pending').length === 0 ? (
                <p className="text-zinc-500 text-xs italic">No past deposits found.</p>
              ) : (
                <div className="glass-panel border border-zinc-850 rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-zinc-900 text-zinc-500 font-bold uppercase bg-zinc-950/40">
                          <th className="p-4">User</th>
                          <th className="p-4">UTR/UPI Ref/Txn ID</th>
                          <th className="p-4">Amount</th>
                          <th className="p-4">Status</th>
                          <th className="p-4">Date</th>
                          <th className="p-4 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-955">
                        {(() => {
                          const profilesMap: Record<string, any> = {};
                          profiles.forEach(p => {
                            profilesMap[p.id] = p;
                          });

                          return transactions
                            .filter(t => t.type === 'Deposit' && t.status !== 'Pending')
                            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                            .map((tx) => {
                              const userId = tx.user_id || tx.wallet_id?.replace('w-', '');
                              const profile = profilesMap[userId] || { name: 'Player', email: '' };
                              const isSuccess = tx.status === 'Completed';
                              return (
                                <tr key={tx.id} className="text-zinc-350 hover:bg-zinc-900/10">
                                  <td className="p-4">
                                    <div className="font-bold text-zinc-200">{profile.name}</div>
                                    <div className="text-[10px] text-zinc-500">{profile.email}</div>
                                  </td>
                                  <td className="p-4 font-mono text-zinc-400">{tx.description || 'N/A'}</td>
                                  <td className={`p-4 font-black ${isSuccess ? 'text-emerald-400' : 'text-zinc-400'}`}>₹{Number(tx.amount).toFixed(2)}</td>
                                  <td className="p-4">
                                    <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold border ${isSuccess ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/20' : 'bg-red-950/40 text-red-400 border-red-500/20'}`}>
                                      {isSuccess ? 'Successful' : 'Rejected'}
                                    </span>
                                  </td>
                                  <td className="p-4 text-zinc-500">{new Date(tx.created_at).toLocaleDateString()}</td>
                                  <td className="p-4 text-center">
                                    {isSuccess ? (
                                      <button
                                        onClick={() => handleProcessDeposit(tx.id, false)}
                                        className="px-2 py-1 bg-red-950/40 text-red-400 hover:bg-red-900/30 rounded border border-red-500/20 text-[10px] font-bold transition-colors"
                                        title="Undo Approval (Deduct Funds)"
                                      >
                                        Undo Approve
                                      </button>
                                    ) : (
                                      <button
                                        onClick={() => handleProcessDeposit(tx.id, true)}
                                        className="px-2 py-1 bg-emerald-950/40 text-emerald-400 hover:bg-emerald-900/30 rounded border border-emerald-500/20 text-[10px] font-bold transition-colors"
                                        title="Undo Rejection (Add Funds)"
                                      >
                                        Undo Reject
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              );
                            });
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* TAB 4: RESULTS & PRIZES */}
        {activeTab === 'results' && visibleTabs.some(t => t.id === 'results') && (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className={`w-full transition-all duration-300 ${
              selectedTourneyId ? 'max-w-7xl' : 'max-w-2xl mx-auto'
            }`}
          >
            <div className={`grid grid-cols-1 gap-8 ${
              selectedTourneyId ? 'lg:grid-cols-3' : ''
            }`}>
              {/* Form panel */}
              <div className={`${
                selectedTourneyId ? 'lg:col-span-1' : ''
              } glass-panel border border-zinc-800/85 rounded-2xl p-6 sm:p-8 space-y-6 h-fit`}>
                <div>
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-cyan-400" />
                    Publish Results & Prizes
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    Select a tournament and declare top 3 checked-in players.
                  </p>
                </div>

                <form onSubmit={handlePublishResults} className="space-y-6">
                  {/* Select Tournament */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Select Tournament</label>
                    <select
                      required
                      value={selectedTourneyId}
                      onChange={(e) => {
                        setSelectedTourneyId(e.target.value);
                        setWinner1('');
                        setWinner2('');
                        setWinner3('');
                      }}
                      className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-850 rounded-xl focus:outline-none text-sm text-zinc-100"
                    >
                      <option value="">-- Choose Lobby --</option>
                      {tournaments
                        .filter(t => t.status !== 'Completed')
                        .map(t => (
                          <option key={t.id} value={t.id}>
                            {t.title} ({t.game} - {new Date(t.start_time).toLocaleDateString()})
                          </option>
                        ))}
                    </select>
                  </div>

                  {selectedTourneyId && (
                    <div className="space-y-4 pt-2 border-t border-zinc-900">
                      {regsForSelectedTourney.length === 0 ? (
                        <p className="text-xs text-yellow-400 font-semibold">
                          ⚠️ No players are registered for this tournament.
                        </p>
                      ) : regsForSelectedTourney.filter(r => r.check_in_status === 'Checked In').length === 0 ? (
                        <div className="space-y-3">
                          <p className="text-xs text-red-400 font-semibold leading-relaxed">
                            ⚠️ No players have checked in for this tournament. Only checked-in players can claim prizes.
                          </p>
                          <div className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-1 text-[11px] text-zinc-400">
                            <strong>Lobby Check-in Stats:</strong>
                            <div className="flex justify-between"><span>Registered:</span> <span className="font-bold text-zinc-200">{regsForSelectedTourney.length}</span></div>
                            <div className="flex justify-between"><span>Checked In:</span> <span className="font-bold text-emerald-400">0</span></div>
                            <div className="flex justify-between"><span>Pending:</span> <span className="font-bold text-yellow-500">{regsForSelectedTourney.filter(r => !r.check_in_status || r.check_in_status === 'Pending').length}</span></div>
                            <div className="flex justify-between"><span>DNQ:</span> <span className="font-bold text-red-500">{regsForSelectedTourney.filter(r => r.check_in_status === 'DNQ').length}</span></div>
                          </div>
                        </div>
                      ) : (
                        <>
                          {(() => {
                            const tourney = tournaments.find(t => t.id === selectedTourneyId);
                            if (!tourney) return null;
                            const entryFee = Number(tourney.entry_fee) || 0;
                            const filledSlots = tourney.filled_slots || 0;
                            const prizePool = entryFee > 0 
                              ? (entryFee * filledSlots * 0.50) 
                              : (Number(tourney.prize_pool) || 0);

                            return (
                              <div className="p-3 bg-cyan-950/15 border border-cyan-500/20 rounded-xl text-xs text-zinc-400 leading-relaxed space-y-1">
                                <strong className="text-zinc-200">Prize Details (Filled Slots: {filledSlots}):</strong>
                                <div className="text-cyan-400 font-bold mb-1">Actual Prize Pool: ₹{prizePool.toFixed(2)}</div>
                                <div>• Rank 1 placement wins: ₹{(prizePool * 0.50).toFixed(2)} (50%)</div>
                                <div>• Rank 2 placement wins: ₹{(prizePool * 0.30).toFixed(2)} (30%)</div>
                                <div>• Rank 3 placement wins: ₹{(prizePool * 0.20).toFixed(2)} (20%)</div>
                              </div>
                            );
                          })()}

                          {/* Rank 1 Selection */}
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-emerald-400 uppercase tracking-wider">🏆 Rank 1 Winner (50%)</label>
                            <select
                              value={winner1}
                              onChange={(e) => setWinner1(e.target.value)}
                              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-850 rounded-lg text-sm text-zinc-200"
                            >
                              <option value="">-- Select Player (Optional) --</option>
                              {regsForSelectedTourney
                                .filter(r => r.check_in_status === 'Checked In' && r.user_id !== winner2 && r.user_id !== winner3)
                                .map(r => (
                                  <option key={r.user_id} value={r.user_id}>
                                    {r.ign} ({r.profiles?.name})
                                  </option>
                                ))}
                            </select>
                          </div>

                          {/* Rank 2 Selection */}
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-cyan-400 uppercase tracking-wider">🥈 Rank 2 Winner (30%)</label>
                            <select
                              value={winner2}
                              onChange={(e) => setWinner2(e.target.value)}
                              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-850 rounded-lg text-sm text-zinc-200"
                            >
                              <option value="">-- Select Player (Optional) --</option>
                              {regsForSelectedTourney
                                .filter(r => r.check_in_status === 'Checked In' && r.user_id !== winner1 && r.user_id !== winner3)
                                .map(r => (
                                  <option key={r.user_id} value={r.user_id}>
                                    {r.ign} ({r.profiles?.name})
                                  </option>
                                ))}
                            </select>
                          </div>

                          {/* Rank 3 Selection */}
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-amber-500 uppercase tracking-wider">🥉 Rank 3 Winner (20%)</label>
                            <select
                              value={winner3}
                              onChange={(e) => setWinner3(e.target.value)}
                              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-850 rounded-lg text-sm text-zinc-200"
                            >
                              <option value="">-- Select Player (Optional) --</option>
                              {regsForSelectedTourney
                                .filter(r => r.check_in_status === 'Checked In' && r.user_id !== winner1 && r.user_id !== winner2)
                                .map(r => (
                                  <option key={r.user_id} value={r.user_id}>
                                    {r.ign} ({r.profiles?.name})
                                  </option>
                                ))}
                            </select>
                          </div>

                          <div className="flex justify-end pt-4">
                            <button
                              type="submit"
                              disabled={btnLoading}
                              className="w-full px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-zinc-950 font-black rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors"
                            >
                              {btnLoading ? <Loader2 className="w-4.5 h-4.5 animate-spin" /> : 'Publish Results & Pay'}
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </form>
              </div>

              {/* Lobby stats and Player Check-In status directory on the right */}
              {selectedTourneyId && (
                <div className="lg:col-span-2 glass-panel border border-zinc-800/85 rounded-2xl p-6 sm:p-8 space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-900 pb-4">
                    <div>
                      <h4 className="text-base font-bold text-white">Player Check-In Directory</h4>
                      <p className="text-xs text-zinc-400 mt-0.5">Realtime lobby verification & eligibility check.</p>
                    </div>

                    {/* Filter buttons */}
                    <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-900 gap-1 w-fit self-end">
                      {(['All', 'Checked In', 'Pending', 'DNQ'] as const).map((filter) => {
                        const count = filter === 'All' 
                          ? regsForSelectedTourney.length 
                          : filter === 'Pending'
                            ? regsForSelectedTourney.filter(r => !r.check_in_status || r.check_in_status === 'Pending').length
                            : regsForSelectedTourney.filter(r => r.check_in_status === filter).length;
                        return (
                          <button
                            key={filter}
                            onClick={() => setCheckInFilter(filter)}
                            className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                              checkInFilter === filter
                                ? 'bg-zinc-900 text-cyan-400 border border-zinc-800'
                                : 'text-zinc-550 hover:text-zinc-300'
                            }`}
                          >
                            {filter} ({count})
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Summary Counters */}
                  <div className="grid grid-cols-4 gap-4 p-4 bg-zinc-950/40 border border-zinc-900 rounded-xl text-center">
                    <div className="space-y-1">
                      <div className="text-[10px] uppercase font-bold text-zinc-550">Registered</div>
                      <div className="text-xl font-black text-white">{regsForSelectedTourney.length}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-[10px] uppercase font-bold text-zinc-550">Checked In</div>
                      <div className="text-xl font-black text-emerald-400">
                        {regsForSelectedTourney.filter(r => r.check_in_status === 'Checked In').length}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-[10px] uppercase font-bold text-zinc-550">Pending</div>
                      <div className="text-xl font-black text-yellow-500">
                        {regsForSelectedTourney.filter(r => !r.check_in_status || r.check_in_status === 'Pending').length}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-[10px] uppercase font-bold text-zinc-550">DNQ (Failed)</div>
                      <div className="text-xl font-black text-red-500">
                        {regsForSelectedTourney.filter(r => r.check_in_status === 'DNQ').length}
                      </div>
                    </div>
                  </div>

                  {/* Table list */}
                  <div className="max-h-[350px] overflow-y-auto border border-zinc-900 rounded-xl bg-zinc-950/20">
                    {regsForSelectedTourney.filter(r => {
                      if (checkInFilter === 'All') return true;
                      if (checkInFilter === 'Pending') return !r.check_in_status || r.check_in_status === 'Pending';
                      return r.check_in_status === checkInFilter;
                    }).length === 0 ? (
                      <div className="p-8 text-center text-xs text-zinc-500 italic">
                        No players match this check-in status.
                      </div>
                    ) : (
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-zinc-900 text-zinc-550 font-bold uppercase bg-zinc-950/40">
                            <th className="p-3">Player name</th>
                            <th className="p-3">In-Game IGN</th>
                            <th className="p-3 text-center">Status</th>
                            <th className="p-3 text-center">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-955">
                          {regsForSelectedTourney.filter(r => {
                            if (checkInFilter === 'All') return true;
                            if (checkInFilter === 'Pending') return !r.check_in_status || r.check_in_status === 'Pending';
                            return r.check_in_status === checkInFilter;
                          }).map((r) => (
                            <tr key={r.id} className="text-zinc-350 hover:bg-zinc-900/10">
                              <td className="p-3 font-semibold text-zinc-200">{r.profiles?.name || 'Player'}</td>
                              <td className="p-3 font-mono">{r.ign}</td>
                              <td className="p-3 text-center">
                                <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                                  r.check_in_status === 'Checked In'
                                    ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-500/10'
                                    : r.check_in_status === 'DNQ'
                                      ? 'bg-red-950/40 text-red-400 border border-red-500/10'
                                      : 'bg-yellow-950/40 text-yellow-500 border border-yellow-500/10'
                                }`}>
                                  {r.check_in_status || 'Pending'}
                                </span>
                              </td>
                              <td className="p-3 text-center">
                                <select
                                  value={r.check_in_status || 'Pending'}
                                  onChange={(e) => handleProcessCheckIn(r.id, e.target.value as 'Checked In' | 'Pending' | 'DNQ')}
                                  className="bg-zinc-900 text-zinc-300 border border-zinc-800 rounded px-2.5 py-1 text-[10px] font-bold focus:outline-none focus:border-purple-505 cursor-pointer transition-colors"
                                >
                                  <option value="Pending" className="bg-zinc-950 text-yellow-500">Pending</option>
                                  <option value="Checked In" className="bg-zinc-950 text-emerald-400">Checked In</option>
                                  <option value="DNQ" className="bg-zinc-950 text-red-400">DNQ</option>
                                </select>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* TAB 5: USERS DATABASE */}
        {activeTab === 'users' && visibleTabs.some(t => t.id === 'users') && (
          <motion.div
            key="users"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            <h3 className="text-lg font-bold text-zinc-200">Registered Players Directory</h3>

            {dataLoading ? (
              <div className="py-12 flex justify-center"><Loader2 className="w-8 h-8 text-purple-500 animate-spin" /></div>
            ) : (
              <div className="glass-panel border border-zinc-850 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-900 text-zinc-500 font-bold uppercase bg-zinc-950/40">
                        <th className="p-4">User Name</th>
                        <th className="p-4">Email</th>
                        <th className="p-4">Role</th>
                        <th className="p-4">BGMI Profile</th>
                        <th className="p-4">Free Fire Profile</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-955">
                      {profiles.map((p) => (
                        <tr key={p.id} className="text-zinc-350 hover:bg-zinc-900/10">
                          <td className="p-4 font-bold text-zinc-200">{p.name}</td>
                          <td className="p-4">{p.email}</td>
                          <td className="p-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${p.is_admin ? 'bg-cyan-950/50 text-cyan-400 border border-cyan-500/30' : 'bg-zinc-800 text-zinc-400'}`}>
                              {p.is_admin ? 'Admin' : 'Player'}
                            </span>
                          </td>
                          <td className="p-4">
                            {p.bgmi_ign ? (
                              <div className="space-y-0.5">
                                <span className="font-bold text-zinc-300">{p.bgmi_ign}</span>
                                <span className="block text-[10px] text-zinc-500">UID: {p.bgmi_ign}</span>
                              </div>
                            ) : (
                              <span className="text-zinc-600 italic">Not Linked</span>
                            )}
                          </td>
                          <td className="p-4">
                            {p.freefire_ign ? (
                              <div className="space-y-0.5">
                                <span className="font-bold text-zinc-300">{p.freefire_ign}</span>
                                <span className="block text-[10px] text-zinc-500">UID: {p.freefire_ign}</span>
                              </div>
                            ) : (
                              <span className="text-zinc-600 italic">Not Linked</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* TAB 6: VERIFICATIONS */}
        {activeTab === 'verification' && visibleTabs.some(t => t.id === 'verification') && (
          <motion.div
            key="verification"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            <h3 className="text-lg font-bold text-zinc-200">Pending Player Profile Verifications</h3>

            {dataLoading ? (
              <div className="py-12 flex justify-center"><Loader2 className="w-8 h-8 text-purple-500 animate-spin" /></div>
            ) : unverifiedProfiles.length === 0 ? (
              <div className="glass-panel border border-zinc-850 rounded-2xl p-12 text-center text-zinc-500">
                All players profiles have been processed! No pending verifications.
              </div>
            ) : (
              <div className="glass-panel border border-zinc-850 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-900 text-zinc-500 font-bold uppercase bg-zinc-950/40">
                        <th className="p-4">Player</th>
                        <th className="p-4">BGMI Profile</th>
                        <th className="p-4">Free Fire Profile</th>
                        <th className="p-4">Status</th>
                        <th className="p-4 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-955">
                      {unverifiedProfiles.map((p) => (
                        <tr key={p.id} className="text-zinc-350 hover:bg-zinc-900/10">
                          <td className="p-4">
                            <div className="font-bold text-zinc-255">{p.name}</div>
                            <div className="text-[10px] text-zinc-500">{p.email}</div>
                          </td>
                          <td className="p-4">
                            {p.bgmi_ign ? (
                              <div className="space-y-0.5">
                                <span className="font-bold text-zinc-200">{p.bgmi_ign}</span>
                                <span className="block text-[10px] text-zinc-550">ID: {p.bgmi_character_id}</span>
                              </div>
                            ) : (
                              <span className="text-zinc-650 italic">Not Linked</span>
                            )}
                          </td>
                          <td className="p-4">
                            {p.freefire_ign ? (
                              <div className="space-y-0.5">
                                <span className="font-bold text-zinc-200">{p.freefire_ign}</span>
                                <span className="block text-[10px] text-zinc-555">UID: {p.freefire_uid}</span>
                              </div>
                            ) : (
                              <span className="text-zinc-650 italic">Not Linked</span>
                            )}
                          </td>
                          <td className="p-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              p.verification_status === 'Rejected' ? 'bg-red-950/40 text-red-400' : 'bg-yellow-950/40 text-yellow-405'
                            }`}>
                              {p.verification_status || 'Pending'}
                            </span>
                          </td>
                          <td className="p-4 text-center">
                            <div className="flex justify-center gap-2">
                              <button
                                onClick={() => handleUpdateVerification(p.id, 'Verified')}
                                className="p-1 text-emerald-400 hover:bg-emerald-950/30 rounded border border-emerald-500/20"
                                title="Verify Player"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleUpdateVerification(p.id, 'Rejected')}
                                className="p-1 text-red-400 hover:bg-red-950/30 rounded border border-red-500/20"
                                title="Reject Verification"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* TAB 7: ANTI-CHEAT / BLACKLIST */}
        {activeTab === 'anticheat' && visibleTabs.some(t => t.id === 'anticheat') && (
          <motion.div
            key="anticheat"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-8"
          >
            {/* Ban player form */}
            <div className="glass-panel border border-zinc-800/80 rounded-2xl p-5 sm:p-6 space-y-4 h-fit">
              <h3 className="text-base font-bold text-zinc-200 flex items-center gap-1.5">
                <Skull className="w-5 h-5 text-red-400" />
                Ban Player
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Immediately block a player from joining matches. Search by registered email, game IGN, or UID.
              </p>
              
              <form onSubmit={handleBanUser} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-zinc-500">Player Identifier</label>
                  <input
                    type="text"
                    required
                    value={searchBannedUser}
                    onChange={(e) => setSearchBannedUser(e.target.value)}
                    placeholder="Email / IGN / UID"
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-100 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-zinc-500">Reason for Ban</label>
                  <textarea
                    required
                    rows={3}
                    value={banReasonInput}
                    onChange={(e) => setBanReasonInput(e.target.value)}
                    placeholder="e.g. Wallhacking / Teaming up / Mock transaction fraud"
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-100 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={btnLoading}
                  className="w-full py-2 bg-red-650 hover:bg-red-555 text-white rounded-lg text-xs font-bold transition-all flex justify-center items-center gap-1.5"
                >
                  {btnLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Apply Permanent Ban'}
                </button>
              </form>
            </div>

            {/* Blacklist list */}
            <div className="lg:col-span-2 glass-panel border border-zinc-800/80 rounded-2xl p-5 sm:p-6 space-y-4">
              <h3 className="text-base font-bold text-zinc-200">Anti-Cheat System Blacklist</h3>
              {bannedList.length === 0 ? (
                <div className="py-12 text-center text-xs text-zinc-655 italic">
                  No active bans declared. Platform is clean.
                </div>
              ) : (
                <div className="divide-y divide-zinc-900 bg-zinc-950/40 border border-zinc-900 rounded-2xl overflow-hidden">
                  {bannedList.map((b) => (
                    <div key={b.user_id} className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-xs">
                      <div>
                        <h4 className="font-bold text-zinc-200">{b.profile?.name}</h4>
                        <span className="block text-[10px] text-zinc-500">Email: {b.profile?.email}</span>
                        <div className="mt-2 text-red-400 font-semibold leading-relaxed">
                          Reason: <span className="text-zinc-350 font-normal">{b.reason}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleUnbanUser(b.user_id)}
                        className="px-3 py-1.5 border border-zinc-800 hover:border-zinc-700 bg-zinc-950/40 hover:text-white rounded-lg text-[10px] font-bold"
                      >
                        Lift Ban
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* TAB 8: SUPPORT TICKETS LIST & CHAT RESPONDER */}
        {activeTab === 'support' && visibleTabs.some(t => t.id === 'support') && (
          <motion.div
            key="support"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-zinc-200">Support Ticket Center</h3>
              <div className="flex gap-2">
                {(['Open', 'In Progress', 'Resolved', 'Closed'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => {
                      setTicketFilter(filter);
                      setActiveAdminTicket(null);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      ticketFilter === filter
                        ? 'bg-zinc-900 border border-zinc-800 text-purple-400'
                        : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>

            {activeAdminTicket ? (
              // ACTIVE CHAT VIEW
              <div className="border border-zinc-900 rounded-2xl overflow-hidden bg-zinc-950/20">
                <div className="p-4 bg-zinc-900/60 border-b border-zinc-900 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <button
                      onClick={() => {
                        setActiveAdminTicket(null);
                        setAdminTicketMessages([]);
                      }}
                      className="text-xs font-bold text-purple-400 hover:text-purple-300 flex items-center gap-1 mb-1"
                    >
                      ← Back to Ticket List
                    </button>
                    <h4 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                      {activeAdminTicket.title}
                      <span className="text-[10px] text-zinc-500 font-medium">({activeAdminTicket.category})</span>
                    </h4>
                    <span className="text-[10px] text-zinc-500 block">
                      Opened by: <strong>{activeAdminTicket.profile?.name}</strong> ({activeAdminTicket.profile?.email})
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <select
                      value={activeAdminTicket.status}
                      onChange={(e) => handleUpdateTicketStatus(activeAdminTicket.id, e.target.value as any)}
                      className="px-2 py-1 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-350 focus:outline-none"
                    >
                      {['Open', 'In Progress', 'Resolved', 'Closed'].map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="p-4 h-80 overflow-y-auto space-y-4 bg-zinc-950/40">
                  {adminTicketMessages.map((msg) => {
                    const isAdmin = msg.is_admin;
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`p-3.5 rounded-2xl max-w-[80%] text-xs border ${
                          isAdmin
                            ? 'bg-cyan-950/15 border-cyan-500/20 text-zinc-200 rounded-tr-none'
                            : 'bg-purple-950/20 border-purple-500/25 text-zinc-200 rounded-tl-none'
                        }`}>
                          <div className="flex justify-between items-center gap-4 mb-1 text-[9px] font-bold text-zinc-500">
                            <span>{isAdmin ? 'YOU (SUPPORT OPERATOR)' : 'PLAYER'}</span>
                            <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <p className="leading-relaxed whitespace-pre-wrap">{msg.message}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {activeAdminTicket.status !== 'Closed' && (
                  <form onSubmit={handleAdminReplyTicket} className="p-3 bg-zinc-950 border-t border-zinc-900 flex gap-2">
                    <input
                      type="text"
                      required
                      value={adminReplyMessage}
                      onChange={(e) => setAdminReplyMessage(e.target.value)}
                      placeholder="Type reply to player..."
                      className="flex-grow px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg focus:border-purple-500/50 focus:outline-none text-xs text-zinc-100"
                    />
                    <button
                      type="submit"
                      disabled={btnLoading}
                      className="px-4 py-2 bg-purple-650 hover:bg-purple-550 text-white rounded-lg text-xs font-bold transition-all"
                    >
                      Send
                    </button>
                  </form>
                )}
              </div>
            ) : (
              // LIST VIEW
              <div className="glass-panel border border-zinc-850 rounded-2xl overflow-hidden">
                {adminTickets.filter(t => t.status === ticketFilter).length === 0 ? (
                  <div className="p-8 text-center text-xs text-zinc-500 italic">
                    No tickets found in status: {ticketFilter}
                  </div>
                ) : (
                  <div className="divide-y divide-zinc-900 bg-zinc-950/40">
                    {adminTickets
                      .filter(t => t.status === ticketFilter)
                      .map((t) => (
                        <div key={t.id} className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-xs hover:bg-zinc-900/10">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-purple-950/50 text-purple-400 border border-purple-500/10">
                                {t.category}
                              </span>
                              <span className="text-[10px] text-zinc-550">
                                Player: <strong>{t.profile?.name}</strong> | Updated: {new Date(t.updated_at).toLocaleDateString()}
                              </span>
                            </div>
                            <h4 className="text-sm font-bold text-zinc-250">{t.title}</h4>
                          </div>

                          <button
                            onClick={() => setActiveAdminTicket(t)}
                            className="px-4 py-1.5 bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 text-zinc-350 rounded-lg text-[10px] font-bold uppercase tracking-wider"
                          >
                            Respond
                          </button>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* TAB 9: AUDIT LOGS */}
        {activeTab === 'audits' && visibleTabs.some(t => t.id === 'audits') && (
          <motion.div
            key="audits"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            <h3 className="text-lg font-bold text-zinc-200">System Activity Audit Log</h3>

            {dataLoading ? (
              <div className="py-12 flex justify-center"><Loader2 className="w-8 h-8 text-purple-500 animate-spin" /></div>
            ) : auditLogs.length === 0 ? (
              <p className="text-zinc-500 text-xs italic">No activity recorded in audit logs.</p>
            ) : (
              <div className="glass-panel border border-zinc-850 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-900 text-zinc-500 font-bold uppercase bg-zinc-950/40">
                        <th className="p-4">Action By</th>
                        <th className="p-4">Action</th>
                        <th className="p-4">Target</th>
                        <th className="p-4">Details</th>
                        <th className="p-4">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-955">
                      {auditLogs.map((log) => (
                        <tr key={log.id} className="text-zinc-350 hover:bg-zinc-900/10">
                          <td className="p-4">
                            <div className="font-bold text-zinc-200">{log.profile?.name || 'System'}</div>
                            <div className="text-[10px] text-zinc-500">{log.profile?.email || 'masharena-system'}</div>
                          </td>
                          <td className="p-4">
                            <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-zinc-900 text-zinc-350 border border-zinc-800">
                              {log.action}
                            </span>
                          </td>
                          <td className="p-4 font-mono text-[10px] text-purple-400">
                            {log.target_type}: {log.target_id || 'Global'}
                          </td>
                          <td className="p-4 text-zinc-450 leading-relaxed max-w-xs truncate" title={log.details}>
                            {log.details}
                          </td>
                          <td className="p-4 text-zinc-500">{new Date(log.created_at).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* TAB: EDIT LEADERBOARD */}
        {activeTab === 'leaderboard' && visibleTabs.some(t => t.id === 'leaderboard') && (
          <motion.div
            key="leaderboard"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="text-lg font-bold text-zinc-200">Leaderboard Control Console</h3>
                <p className="text-xs text-zinc-500 mt-1">
                  Manage competitive standings. Add custom players or override stats for any player.
                </p>
              </div>
              <button
                onClick={() => {
                  setCustomGame(leaderboardGameFilter);
                  setCustomTab(leaderboardTabFilter);
                  setShowCustomPlayerModal(true);
                }}
                className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 transition-colors shadow-lg shadow-purple-500/25 border border-purple-400/20"
              >
                <Plus className="w-4 h-4" />
                Add Custom Player
              </button>
            </div>

            {/* Filters Bar */}
            <div className="flex flex-col sm:flex-row gap-4 bg-zinc-950/60 p-4 rounded-xl border border-zinc-900 justify-between items-center">
              {/* Game Selector */}
              <div className="flex bg-zinc-950 p-1 rounded-lg border border-zinc-855 w-full sm:w-auto">
                {(['All', 'BGMI', 'Free Fire'] as const).map((g) => (
                  <button
                    key={g}
                    onClick={() => setLeaderboardGameFilter(g)}
                    className={`px-4 py-2 rounded-md text-xs font-bold transition-all ${
                      leaderboardGameFilter === g
                        ? 'bg-purple-600 text-white'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {g === 'All' ? 'All Games' : g}
                  </button>
                ))}
              </div>

              {/* Timeframe Selector */}
              <div className="flex bg-zinc-950 p-1 rounded-lg border border-zinc-855 w-full sm:w-auto">
                {(['weekly', 'monthly', 'allTime'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setLeaderboardTabFilter(t)}
                    className={`px-4 py-2 rounded-md text-xs font-bold transition-all uppercase tracking-wide ${
                      leaderboardTabFilter === t
                        ? 'bg-cyan-600 text-zinc-950 font-black'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {t === 'allTime' ? 'All Time' : t}
                  </button>
                ))}
              </div>
            </div>

            {/* Standings Table */}
            {dataLoading ? (
              <div className="py-12 flex justify-center"><Loader2 className="w-8 h-8 text-purple-500 animate-spin" /></div>
            ) : adminLeaderboardData.length === 0 ? (
              <div className="glass-panel border border-zinc-850 rounded-2xl p-12 text-center text-zinc-550">
                No player statistics for this filter yet. Click &quot;Add Custom Player&quot; to seed or register players.
              </div>
            ) : (
              <div className="glass-panel border border-zinc-850 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-900 text-zinc-500 font-bold uppercase bg-zinc-950/40">
                        <th className="p-4 w-[80px]">Rank</th>
                        <th className="p-4">Player</th>
                        <th className="p-4">Wins</th>
                        <th className="p-4">Matches</th>
                        <th className="p-4 text-right">Earnings</th>
                        <th className="p-4 text-center">Type</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-955">
                      {adminLeaderboardData.map((player, idx) => (
                        <tr key={player.name} className="text-zinc-350 hover:bg-zinc-900/10">
                          <td className="p-4 font-black text-zinc-500 text-base">#{idx + 1}</td>
                          <td className="p-4 flex items-center gap-2">
                            <span className="text-lg">{player.avatar}</span>
                            <div className="font-bold text-zinc-200">{player.name}</div>
                          </td>
                          <td className="p-4 font-bold text-zinc-300">{player.wins} wins</td>
                          <td className="p-4 text-zinc-550">{player.matches} matches</td>
                          <td className="p-4 text-right font-mono font-black text-emerald-400">₹{player.earnings}</td>
                          <td className="p-4 text-center">
                            {player.is_override ? (
                              <span className="px-2 py-0.5 rounded bg-yellow-950/40 border border-yellow-500/20 text-yellow-500 text-[9px] font-black uppercase tracking-wider">
                                Override
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded bg-emerald-950/30 border border-emerald-500/10 text-emerald-500 text-[9px] font-bold uppercase tracking-wider">
                                Auto
                              </span>
                            )}
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex gap-2 justify-end">
                              <button
                                onClick={() => {
                                  setEditingOverridePlayer(player);
                                  setEditWins(String(player.wins));
                                  setEditEarnings(String(player.earnings));
                                  setEditMatches(String(player.matches));
                                }}
                                className="px-2.5 py-1.5 border border-zinc-800 hover:border-zinc-700 bg-zinc-900/40 rounded-lg text-[10px] font-bold hover:text-white transition-colors"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteLeaderboardPlayer(player)}
                                className="px-2.5 py-1.5 border border-red-955/45 hover:border-red-900 text-red-400 bg-red-955/10 rounded-lg text-[10px] font-bold hover:bg-red-950/30 transition-all"
                                disabled={btnLoading}
                              >
                                Delete
                              </button>
                              {player.is_override && (
                                <button
                                  onClick={() => handleResetOverride(player.name, leaderboardGameFilter, leaderboardTabFilter)}
                                  className="px-2.5 py-1.5 border border-red-955/40 hover:border-red-900 text-red-400 bg-red-955/10 rounded-lg text-[10px] font-bold hover:bg-red-950/30 transition-all"
                                  disabled={btnLoading}
                                >
                                  Reset
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* TAB 10: ANNOUNCEMENTS */}
        {activeTab === 'announcements' && visibleTabs.some(t => t.id === 'announcements') && (
          <motion.div
            key="announcements"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-zinc-200">Global Announcements</h3>
              <button
                onClick={() => setShowAnnModal(true)}
                className="px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-zinc-950 font-black rounded-lg text-xs flex items-center gap-1.5 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Publish Announcement
              </button>
            </div>

            {dataLoading ? (
              <div className="py-12 flex justify-center"><Loader2 className="w-8 h-8 text-purple-500 animate-spin" /></div>
            ) : announcements.length === 0 ? (
              <p className="text-zinc-550 text-xs italic">No announcements published yet.</p>
            ) : (
              <div className="glass-panel border border-zinc-850 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-900 text-zinc-500 font-bold uppercase bg-zinc-950/40">
                        <th className="p-4">Type</th>
                        <th className="p-4">Title</th>
                        <th className="p-4">Message</th>
                        <th className="p-4">Priority</th>
                        <th className="p-4">Expiry Date</th>
                        <th className="p-4 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-955">
                      {announcements.map((ann) => {
                        const isExpired = ann.expires_at ? new Date(ann.expires_at).getTime() < Date.now() : false;
                        return (
                          <tr key={ann.id} className="text-zinc-350 hover:bg-zinc-900/10">
                            <td className="p-4">
                              <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-zinc-900 text-zinc-300 border border-zinc-800">
                                {ann.type}
                              </span>
                            </td>
                            <td className="p-4 font-bold text-zinc-200">{ann.title}</td>
                            <td className="p-4 max-w-xs truncate" title={ann.message}>{ann.message}</td>
                            <td className="p-4">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                                ann.priority === 'Critical' ? 'bg-red-950/40 text-red-400 border border-red-500/20' :
                                ann.priority === 'High' ? 'bg-orange-950/40 text-orange-400 border border-orange-500/20' :
                                ann.priority === 'Medium' ? 'bg-cyan-950/40 text-cyan-400 border border-cyan-500/20' :
                                'bg-zinc-800 text-zinc-400'
                              }`}>
                                {ann.priority}
                              </span>
                            </td>
                            <td className="p-4">
                              {ann.expires_at ? (
                                <span className={`text-[10px] ${isExpired ? 'text-red-500 font-bold' : 'text-zinc-500'}`}>
                                  {new Date(ann.expires_at).toLocaleString()} {isExpired ? '(Expired)' : ''}
                                </span>
                              ) : (
                                <span className="text-zinc-600 italic">Never</span>
                              )}
                            </td>
                            <td className="p-4 text-center">
                              <button
                                onClick={() => handleDeleteAnnouncement(ann.id)}
                                className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-950/20 rounded-lg transition-colors"
                                title="Delete Announcement"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* CREATE TOURNAMENT MODAL */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg glass-panel border border-zinc-800 rounded-2xl p-6 space-y-6 overflow-y-auto max-h-[90vh]"
            >
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Plus className="w-5 h-5 text-cyan-400" />
                  Create Tournament Lobby
                </h3>
              </div>

              <form onSubmit={handleCreateTournament} className="space-y-4">
                {/* Title */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Tournament Title</label>
                  <input
                    type="text"
                    required
                    value={tourneyTitle}
                    onChange={(e) => setTourneyTitle(e.target.value)}
                    placeholder="e.g. Daily Erangel Squad Clash"
                    className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:border-cyan-500/50 focus:outline-none text-sm text-zinc-100"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Game */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Game</label>
                    <select
                      value={tourneyGame}
                      onChange={(e) => setTourneyGame(e.target.value as any)}
                      className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none text-sm text-zinc-100"
                    >
                      <option value="BGMI">BGMI</option>
                      <option value="Free Fire">Free Fire</option>
                    </select>
                  </div>

                  {/* Mode */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Mode</label>
                    <select
                      value={tourneyMode}
                      onChange={(e) => setTourneyMode(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none text-sm text-zinc-100"
                    >
                      <option value="Squad">Squad (4v4/Classic)</option>
                      <option value="Solo">Solo</option>
                      <option value="Duo">Duo</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Entry Fee */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Entry Fee (₹)</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={tourneyFee}
                      onChange={(e) => setTourneyFee(e.target.value)}
                      placeholder="e.g. 50"
                      className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:border-cyan-500/50 focus:outline-none text-sm text-zinc-100"
                    />
                  </div>

                  {/* Total Slots */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Total Slots</label>
                    <input
                      type="number"
                      required
                      min="2"
                      value={tourneySlots}
                      onChange={(e) => setTourneySlots(e.target.value)}
                      placeholder="e.g. 100"
                      className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:border-cyan-500/50 focus:outline-none text-sm text-zinc-100"
                    />
                  </div>
                </div>

                {/* Start Time */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Match Start Time</label>
                  <input
                    type="datetime-local"
                    required
                    value={tourneyTime}
                    onChange={(e) => setTourneyTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:border-cyan-500/50 focus:outline-none text-sm text-zinc-100"
                  />
                </div>

                {/* Rules */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Lobby Rules</label>
                  <textarea
                    value={tourneyRules}
                    onChange={(e) => setTourneyRules(e.target.value)}
                    placeholder="Enter custom match rules/guidelines..."
                    rows={3}
                    className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:border-cyan-500/50 focus:outline-none text-sm text-zinc-100"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="py-3 bg-zinc-900 border border-zinc-850 hover:bg-zinc-850 text-zinc-300 rounded-xl font-bold text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={btnLoading}
                    className="py-3 bg-cyan-600 hover:bg-cyan-500 text-zinc-950 font-black rounded-xl text-xs shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all flex items-center justify-center gap-1.5"
                  >
                    {btnLoading ? <Loader2 className="w-4.5 h-4.5 animate-spin" /> : 'Create Lobby'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* EDIT TOURNAMENT MODAL */}
      <AnimatePresence>
        {editingTournament && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg glass-panel border border-zinc-800 rounded-2xl p-6 space-y-6 overflow-y-auto max-h-[90vh]"
            >
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Edit className="w-5 h-5 text-cyan-400" />
                  Edit Tournament Lobby
                </h3>
              </div>

              <form onSubmit={handleEditTournament} className="space-y-4">
                {/* Title */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Tournament Title</label>
                  <input
                    type="text"
                    required
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:border-cyan-500/50 focus:outline-none text-sm text-zinc-100"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Game */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Game</label>
                    <select
                      value={editGame}
                      onChange={(e) => setEditGame(e.target.value as any)}
                      className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none text-sm text-zinc-100"
                    >
                      <option value="BGMI">BGMI</option>
                      <option value="Free Fire">Free Fire</option>
                    </select>
                  </div>

                  {/* Mode */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Mode</label>
                    <select
                      value={editMode}
                      onChange={(e) => setEditMode(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none text-sm text-zinc-100"
                    >
                      <option value="Squad">Squad (4v4/Classic)</option>
                      <option value="Solo">Solo</option>
                      <option value="Duo">Duo</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Entry Fee */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Entry Fee (₹)</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={editFee}
                      onChange={(e) => setEditFee(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:border-cyan-500/50 focus:outline-none text-sm text-zinc-100"
                    />
                  </div>

                  {/* Total Slots */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Total Slots</label>
                    <input
                      type="number"
                      required
                      min="2"
                      value={editSlots}
                      onChange={(e) => setEditSlots(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:border-cyan-500/50 focus:outline-none text-sm text-zinc-100"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Start Time */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Match Start Time</label>
                    <input
                      type="datetime-local"
                      required
                      value={editTime}
                      onChange={(e) => setEditTime(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:border-cyan-500/50 focus:outline-none text-sm text-zinc-100"
                    />
                  </div>

                  {/* Status */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Status</label>
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value as any)}
                      className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none text-sm text-zinc-100"
                    >
                      <option value="Upcoming">Upcoming</option>
                      <option value="Live">Live</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </div>
                </div>

                {/* Rules */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Lobby Rules</label>
                  <textarea
                    value={editRules}
                    onChange={(e) => setEditRules(e.target.value)}
                    rows={3}
                    className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:border-cyan-500/50 focus:outline-none text-sm text-zinc-100"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setEditingTournament(null)}
                    className="py-3 bg-zinc-900 border border-zinc-850 hover:bg-zinc-850 text-zinc-300 rounded-xl font-bold text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={btnLoading}
                    className="py-3 bg-cyan-600 hover:bg-cyan-500 text-zinc-950 font-black rounded-xl text-xs shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all flex items-center justify-center gap-1.5"
                  >
                    {btnLoading ? <Loader2 className="w-4.5 h-4.5 animate-spin" /> : 'Save Changes'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* PUBLISH ROOM DETAILS MODAL */}
      <AnimatePresence>
        {publishTourneyId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md glass-panel border border-zinc-800 rounded-2xl p-6 space-y-6"
            >
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Megaphone className="w-5 h-5 text-purple-400" />
                  Publish Room Credentials
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Credentials will become instantly visible to registered players
                </p>
              </div>

              <form onSubmit={handlePublishRoomDetails} className="space-y-4">
                {/* Room ID */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Room ID</label>
                  <input
                    type="text"
                    required
                    value={roomIdInput}
                    onChange={(e) => setRoomIdInput(e.target.value)}
                    placeholder="e.g. 542918"
                    className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:border-purple-500/50 focus:outline-none text-sm text-zinc-100"
                  />
                </div>

                {/* Password */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Password</label>
                  <input
                    type="text"
                    required
                    value={roomPasswordInput}
                    onChange={(e) => setRoomPasswordInput(e.target.value)}
                    placeholder="e.g. masharena777"
                    className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:border-purple-500/50 focus:outline-none text-sm text-zinc-100"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setPublishTourneyId(null)}
                    className="py-2.5 bg-zinc-900 border border-zinc-850 hover:bg-zinc-850 text-zinc-300 rounded-xl font-bold text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={btnLoading}
                    className="py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs shadow-[0_0_15px_rgba(147,51,234,0.3)] transition-all flex items-center justify-center gap-1.5"
                  >
                    {btnLoading ? <Loader2 className="w-4.5 h-4.5 animate-spin" /> : 'Publish Live'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CREATE ANNOUNCEMENT MODAL */}
      <AnimatePresence>
        {showAnnModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg glass-panel border border-zinc-800 rounded-2xl p-6 space-y-6 overflow-y-auto max-h-[90vh]"
            >
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Megaphone className="w-5 h-5 text-cyan-400" />
                  Publish Global Announcement
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Publish a new system alert, maintenance notice, or tournament announcement across the platform.
                </p>
              </div>

              <form onSubmit={handleCreateAnnouncement} className="space-y-4">
                {/* Title */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Announcement Title</label>
                  <input
                    type="text"
                    required
                    value={annTitle}
                    onChange={(e) => setAnnTitle(e.target.value)}
                    placeholder="e.g. Scheduled Maintenance Notice"
                    className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:border-cyan-500/50 focus:outline-none text-sm text-zinc-100"
                  />
                </div>

                {/* Message */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Message</label>
                  <textarea
                    required
                    value={annMessage}
                    onChange={(e) => setAnnMessage(e.target.value)}
                    placeholder="Enter announcement details..."
                    rows={4}
                    className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:border-cyan-500/50 focus:outline-none text-sm text-zinc-100"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Type */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Type</label>
                    <select
                      value={annType}
                      onChange={(e) => setAnnType(e.target.value as any)}
                      className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none text-sm text-zinc-100"
                    >
                      <option value="Tournament Announcements">Tournament Announcements</option>
                      <option value="Maintenance Alerts">Maintenance Alerts</option>
                      <option value="New Feature Updates">New Feature Updates</option>
                      <option value="Emergency Notices">Emergency Notices</option>
                    </select>
                  </div>

                  {/* Priority */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Priority</label>
                    <select
                      value={annPriority}
                      onChange={(e) => setAnnPriority(e.target.value as any)}
                      className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none text-sm text-zinc-100"
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                      <option value="Critical">Critical</option>
                    </select>
                  </div>
                </div>

                {/* Expiry Time */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Expiry Time (Optional)</label>
                  <input
                    type="datetime-local"
                    value={annExpiresAt}
                    onChange={(e) => setAnnExpiresAt(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:border-cyan-500/50 focus:outline-none text-sm text-zinc-100"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAnnModal(false);
                      setAnnTitle('');
                      setAnnMessage('');
                      setAnnExpiresAt('');
                      setAnnPriority('Low');
                      setAnnType('Tournament Announcements');
                    }}
                    className="py-3 bg-zinc-900 border border-zinc-850 hover:bg-zinc-850 text-zinc-300 rounded-xl font-bold text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={btnLoading}
                    className="py-3 bg-cyan-600 hover:bg-cyan-500 text-zinc-950 font-black rounded-xl text-xs shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all flex items-center justify-center gap-1.5"
                  >
                    {btnLoading ? <Loader2 className="w-4.5 h-4.5 animate-spin" /> : 'Publish'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* EDIT LEADERBOARD OVERRIDE MODAL */}
      <AnimatePresence>
        {editingOverridePlayer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md glass-panel border border-zinc-800 rounded-2xl p-6 space-y-6"
            >
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-purple-400" />
                  Override Player Stats
                </h3>
                <p className="text-xs text-zinc-400 mt-1 font-semibold">
                  Player Name: <span className="text-purple-400">{editingOverridePlayer.name}</span>
                </p>
                <p className="text-[10px] text-zinc-500 mt-0.5 uppercase tracking-wider">
                  Game: {leaderboardGameFilter} | Timeframe: {leaderboardTabFilter}
                </p>
              </div>

              <form onSubmit={handleSaveOverride} className="space-y-4">
                {/* Wins */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Wins</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={editWins}
                    onChange={(e) => setEditWins(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:border-purple-500/50 focus:outline-none text-sm text-zinc-100 font-bold"
                  />
                </div>

                {/* Matches */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Matches Played</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={editMatches}
                    onChange={(e) => setEditMatches(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:border-purple-500/50 focus:outline-none text-sm text-zinc-100 font-bold"
                  />
                </div>

                {/* Earnings */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Total Earnings (₹)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={editEarnings}
                    onChange={(e) => setEditEarnings(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:border-purple-500/50 focus:outline-none text-sm text-zinc-100 font-bold text-emerald-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setEditingOverridePlayer(null)}
                    className="py-2.5 bg-zinc-900 border border-zinc-850 hover:bg-zinc-850 text-zinc-300 rounded-xl font-bold text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={btnLoading}
                    className="py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs shadow-[0_0_15px_rgba(147,51,234,0.35)] transition-all flex items-center justify-center gap-1.5 border border-purple-400/20"
                  >
                    {btnLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Override'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ADD CUSTOM PLAYER OVERRIDE MODAL */}
      <AnimatePresence>
        {showCustomPlayerModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md glass-panel border border-zinc-800 rounded-2xl p-6 space-y-6"
            >
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-cyan-400" />
                  Add Custom Standings Player
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Create a manual standings override for a custom player or a player without dynamic history.
                </p>
              </div>

              <form onSubmit={handleAddCustomPlayer} className="space-y-4">
                {/* Username */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Username</label>
                  <input
                    type="text"
                    required
                    value={customUsername}
                    onChange={(e) => setCustomUsername(e.target.value)}
                    placeholder="e.g. ApexGamer"
                    className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:border-cyan-500/50 focus:outline-none text-sm text-zinc-100 font-bold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Target Game */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Game</label>
                    <select
                      value={customGame}
                      onChange={(e) => setCustomGame(e.target.value as any)}
                      className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none text-sm text-zinc-100 font-semibold"
                    >
                      <option value="All">All Games</option>
                      <option value="BGMI">BGMI</option>
                      <option value="Free Fire">Free Fire</option>
                    </select>
                  </div>

                  {/* Target Tab */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Timeframe</label>
                    <select
                      value={customTab}
                      onChange={(e) => setCustomTab(e.target.value as any)}
                      className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none text-sm text-zinc-100 font-semibold uppercase"
                    >
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="allTime">All Time</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {/* Wins */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-450 uppercase tracking-wider">Wins</label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={customWins}
                      onChange={(e) => setCustomWins(e.target.value)}
                      className="w-full px-2 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-center focus:outline-none text-sm text-zinc-100 font-bold"
                    />
                  </div>

                  {/* Matches */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-450 uppercase tracking-wider">Matches</label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={customMatches}
                      onChange={(e) => setCustomMatches(e.target.value)}
                      className="w-full px-2 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-center focus:outline-none text-sm text-zinc-100 font-bold"
                    />
                  </div>

                  {/* Earnings */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-455 uppercase tracking-wider">Earnings (₹)</label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={customEarnings}
                      onChange={(e) => setCustomEarnings(e.target.value)}
                      className="w-full px-2 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-center focus:outline-none text-sm text-emerald-400 font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowCustomPlayerModal(false)}
                    className="py-2.5 bg-zinc-900 border border-zinc-850 hover:bg-zinc-850 text-zinc-300 rounded-xl font-bold text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={btnLoading}
                    className="py-2.5 bg-cyan-600 hover:bg-cyan-500 text-zinc-950 font-black rounded-xl text-xs shadow-[0_0_15px_rgba(6,182,212,0.35)] transition-all flex items-center justify-center gap-1.5"
                  >
                    {btnLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Standings'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
