'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { isMockEnabled, mockDb } from '@/lib/mockDb';
import { Bell, ArrowLeft, Trash2, CheckSquare, Loader2, Calendar } from 'lucide-react';
import Link from 'next/link';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

export default function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [btnLoading, setBtnLoading] = useState(false);

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      setLoading(true);
      if (isMockEnabled) {
        const all = mockDb.getNotifications();
        const list = all
          .filter((n: any) => n.user_id === user.id)
          .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setNotifications(list);
      } else {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        if (data) setNotifications(data);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [user]);

  const handleMarkAllRead = async () => {
    if (!user || notifications.length === 0) return;
    setBtnLoading(true);
    try {
      if (isMockEnabled) {
        const all = mockDb.getNotifications();
        const updated = all.map((n: any) => {
          if (n.user_id === user.id) {
            return { ...n, is_read: true };
          }
          return n;
        });
        mockDb.saveNotifications(updated);
        await fetchNotifications();
      } else {
        const { error } = await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('user_id', user.id);
        if (error) throw error;
        await fetchNotifications();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setBtnLoading(false);
    }
  };

  const handleClearAll = async () => {
    if (!user || notifications.length === 0) return;
    if (!confirm('Are you sure you want to clear your notification history?')) return;
    setBtnLoading(true);
    try {
      if (isMockEnabled) {
        const all = mockDb.getNotifications();
        const filtered = all.filter((n: any) => n.user_id !== user.id);
        mockDb.saveNotifications(filtered);
        await fetchNotifications();
      } else {
        const { error } = await supabase
          .from('notifications')
          .delete()
          .eq('user_id', user.id);
        if (error) throw error;
        await fetchNotifications();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setBtnLoading(false);
    }
  };

  const handleToggleRead = async (id: string, currentRead: boolean) => {
    if (!user) return;
    try {
      if (isMockEnabled) {
        const all = mockDb.getNotifications();
        const idx = all.findIndex((n: any) => n.id === id);
        if (idx !== -1) {
          all[idx].is_read = !currentRead;
          mockDb.saveNotifications(all);
        }
        await fetchNotifications();
      } else {
        const { error } = await supabase
          .from('notifications')
          .update({ is_read: !currentRead })
          .eq('id', id);
        if (error) throw error;
        await fetchNotifications();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-[#07070a] text-zinc-300 py-16 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] rounded-full bg-purple-900/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-cyan-900/5 blur-[120px] pointer-events-none" />

      <div className="max-w-4xl mx-auto space-y-8 relative z-10">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <Link href="/" className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-500 hover:text-white transition-colors mb-4">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Arena
            </Link>
            <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight flex items-center gap-3">
              <Bell className="w-10 h-10 text-purple-400" />
              Notifications Center
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1">
              Review tournament keys, reward claims, and general match updates.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleMarkAllRead}
              disabled={btnLoading || notifications.length === 0}
              className="px-4 py-2 border border-zinc-800 hover:border-zinc-700 bg-zinc-950/60 disabled:opacity-55 hover:text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
            >
              <CheckSquare className="w-4 h-4" />
              Mark All Read
            </button>
            <button
              onClick={handleClearAll}
              disabled={btnLoading || notifications.length === 0}
              className="px-4 py-2 border border-red-500/20 hover:border-red-500/40 bg-red-950/10 disabled:opacity-55 text-red-400 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
            >
              <Trash2 className="w-4 h-4" />
              Clear All
            </button>
          </div>
        </div>

        {loading ? (
          <div className="py-20 flex justify-center"><Loader2 className="w-10 h-10 text-purple-500 animate-spin" /></div>
        ) : notifications.length === 0 ? (
          <div className="glass-panel border border-zinc-900 rounded-2xl p-12 text-center text-zinc-500 space-y-2">
            <Bell className="w-12 h-12 mx-auto text-zinc-700" />
            <p className="text-sm font-semibold">Your inbox is clean</p>
            <p className="text-xs text-zinc-650 max-w-xs mx-auto">
              Any rewards, room entry credentials, or ticket updates will be displayed here in real-time.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {notifications.map((n) => {
              const bgClass = n.is_read ? 'bg-zinc-950/40 border-zinc-900/60' : 'bg-gradient-to-br from-purple-950/20 to-zinc-950 border-purple-500/20 shadow-[0_0_15px_rgba(147,51,234,0.05)]';
              return (
                <div
                  key={n.id}
                  className={`p-5 border rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all ${bgClass}`}
                >
                  <div className="space-y-1 max-w-[80%]">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${n.is_read ? 'bg-zinc-900 text-zinc-500' : 'bg-purple-950 text-purple-400'}`}>
                        {n.type || 'System'}
                      </span>
                      {!n.is_read && <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />}
                    </div>
                    <h4 className="font-bold text-zinc-200 text-sm sm:text-base">{n.title}</h4>
                    <p className="text-xs sm:text-sm text-zinc-405 leading-relaxed">{n.message}</p>
                    <div className="text-[10px] text-zinc-500 font-semibold flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(n.created_at).toLocaleString()}
                    </div>
                  </div>

                  <button
                    onClick={() => handleToggleRead(n.id, n.is_read)}
                    className={`text-[10px] uppercase font-black tracking-widest px-3 py-1.5 rounded-lg border transition-colors ${
                      n.is_read
                        ? 'border-zinc-800 text-zinc-500 hover:text-white'
                        : 'border-purple-500/30 text-purple-400 hover:bg-purple-950/40'
                    }`}
                  >
                    {n.is_read ? 'Mark Unread' : 'Mark Read'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
