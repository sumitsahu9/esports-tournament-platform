'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Menu, X, Wallet, User as UserIcon, Shield, LogOut, Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { isMockEnabled, mockDb } from '@/lib/mockDb';
import { supabase } from '@/lib/supabase';

export default function Navbar() {
  const { user, profile, wallet, signOut, loading } = useAuth();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationOpen, setNotificationOpen] = useState(false);

  // Notifications fetching
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    const fetchNotifications = async () => {
      try {
        if (isMockEnabled) {
          const all = mockDb.getNotifications();
          const list = all
            .filter((n: any) => n.user_id === user.id)
            .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          setNotifications(list);
          setUnreadCount(list.filter((n: any) => !n.is_read).length);
        } else {
          const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

          if (error) throw error;
          if (data) {
            setNotifications(data);
            setUnreadCount(data.filter((n: any) => !n.is_read).length);
          }
        }
      } catch (err) {
        console.error('Error fetching notifications in navbar:', err);
      }
    };

    fetchNotifications();

    let channel: any;
    let mockInterval: any;

    if (isMockEnabled) {
      mockInterval = setInterval(() => {
        fetchNotifications();
      }, 5000);
    } else {
      channel = supabase
        .channel(`public:notifications:user_id=eq.${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            fetchNotifications();
          }
        )
        .subscribe();
    }

    return () => {
      if (channel) supabase.removeChannel(channel);
      if (mockInterval) clearInterval(mockInterval);
    };
  }, [user]);

  const handleMarkAllRead = async () => {
    if (!user || notifications.length === 0) return;
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
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        setUnreadCount(0);
      } else {
        const { error } = await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('user_id', user.id);
        if (error) throw error;
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        setUnreadCount(0);
      }
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  const navLinks = [
    { name: 'Home', href: '/' },
    { name: 'Dashboard', href: '/dashboard' },
  ];

  // Total wallet balance
  const walletBalance = wallet ? wallet.deposit_balance + wallet.winning_balance : 0;

  const toggleMobileMenu = () => setMobileMenuOpen(!mobileMenuOpen);

  return (
    <header className="sticky top-0 z-50 w-full glass-panel border-b border-zinc-800/80 backdrop-blur-md bg-zinc-950/75">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-xl sm:text-2xl font-black tracking-wider text-gradient-purple-cyan font-sans">
                MASH ARENA
              </span>
              <span className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-bold tracking-widest text-cyan-400 border border-cyan-500/30 rounded bg-cyan-950/40">
                PRO
              </span>
            </Link>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex space-x-1 sm:space-x-4">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`px-3 py-2 rounded-lg text-sm font-semibold tracking-wide transition-all duration-300 ${
                    isActive
                      ? 'text-purple-400 bg-purple-950/35 border border-purple-500/20'
                      : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/50 border border-transparent'
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}
            {profile?.is_admin && (
              <Link
                href="/admin"
                className={`px-3 py-2 rounded-lg text-sm font-semibold tracking-wide transition-all duration-300 flex items-center gap-1.5 ${
                  pathname.startsWith('/admin')
                    ? 'text-cyan-400 bg-cyan-950/35 border border-cyan-500/20'
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/50 border border-transparent'
                }`}
              >
                <Shield className="w-4 h-4 text-cyan-400" />
                Admin Panel
              </Link>
            )}
          </nav>

          {/* Desktop User Panel */}
          <div className="hidden md:flex items-center gap-4">
            {loading ? (
              <div className="w-8 h-8 rounded-full border border-purple-500/30 animate-spin border-t-purple-500" />
            ) : user ? (
              <div className="flex items-center gap-4">
                {/* Wallet Balance widget */}
                <Link
                  href="/dashboard"
                  className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-900/80 border border-zinc-800 hover:border-purple-500/40 transition-all duration-300 group"
                >
                  <Wallet className="w-4 h-4 text-purple-400 group-hover:scale-110 transition-transform" />
                  <span className="text-xs text-zinc-400">Wallet:</span>
                  <span className="text-sm font-bold text-zinc-200">₹{walletBalance.toFixed(2)}</span>
                </Link>

                {/* Notifications Bell */}
                <div className="relative">
                  <button
                    onClick={() => setNotificationOpen(!notificationOpen)}
                    className="p-2 text-zinc-400 hover:text-zinc-100 rounded-lg hover:bg-zinc-900/50 transition-all relative flex items-center justify-center"
                    title="Notifications"
                  >
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 rounded-full bg-purple-600 text-[9px] font-bold text-white flex items-center justify-center animate-pulse shadow-md">
                        {unreadCount}
                      </span>
                    )}
                  </button>

                  <AnimatePresence>
                    {notificationOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-40"
                          onClick={() => setNotificationOpen(false)}
                        />
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="absolute right-0 mt-3 w-80 glass-panel border border-zinc-800 rounded-2xl bg-zinc-950/95 shadow-2xl z-50 overflow-hidden"
                        >
                          <div className="p-4 border-b border-zinc-800/80 flex items-center justify-between">
                            <span className="text-xs font-bold text-zinc-350">Notifications</span>
                            {unreadCount > 0 && (
                              <button
                                onClick={handleMarkAllRead}
                                className="text-[10px] uppercase tracking-wider text-purple-450 hover:text-purple-300 font-bold transition-colors"
                              >
                                Mark all read
                              </button>
                            )}
                          </div>
                          <div className="max-h-60 overflow-y-auto divide-y divide-zinc-900">
                            {notifications.length === 0 ? (
                              <div className="p-6 text-center text-xs text-zinc-500">
                                No new notifications.
                              </div>
                            ) : (
                              notifications.slice(0, 5).map((n) => (
                                <div
                                  key={n.id}
                                  className={`p-3.5 text-xs transition-colors hover:bg-zinc-900/30 flex flex-col gap-1 ${
                                    n.is_read ? 'opacity-60' : 'bg-purple-950/10'
                                  }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="font-bold text-zinc-200">{n.title}</span>
                                    {!n.is_read && (
                                      <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                                    )}
                                  </div>
                                  <p className="text-zinc-450 leading-relaxed">{n.message}</p>
                                  <span className="text-[9px] text-zinc-500 font-medium">
                                    {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                              ))
                            )}
                          </div>
                          <div className="p-3 border-t border-zinc-800/80 text-center bg-zinc-950/40">
                            <Link
                              href="/notifications"
                              onClick={() => setNotificationOpen(false)}
                              className="text-xs font-bold text-purple-400 hover:text-purple-300 transition-colors block w-full py-1"
                            >
                              View all notifications
                            </Link>
                          </div>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>

                {/* Profile Link */}
                <Link
                  href="/dashboard"
                  className="flex items-center gap-2 text-zinc-300 hover:text-purple-400 transition-colors"
                >
                  {profile?.profile_picture ? (
                    <img
                      src={profile.profile_picture}
                      alt={profile.name}
                      className="w-8 h-8 rounded-full border border-purple-500/30 object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-purple-950/50 border border-purple-500/30 flex items-center justify-center">
                      <UserIcon className="w-4 h-4 text-purple-400" />
                    </div>
                  )}
                  <span className="text-sm font-medium max-w-[120px] truncate">{profile?.name}</span>
                </Link>

                {/* Log out button */}
                <button
                  onClick={signOut}
                  className="p-2 text-zinc-400 hover:text-red-400 rounded-lg hover:bg-red-950/20 transition-all"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  href="/login"
                  className="px-4 py-2 text-sm font-bold text-zinc-300 hover:text-zinc-100 transition-colors"
                >
                  Login
                </Link>
                <Link
                  href="/signup"
                  className="px-5 py-2 text-sm font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg hover:from-purple-500 hover:to-indigo-500 transition-all shadow-[0_0_15px_rgba(147,51,234,0.3)] hover:shadow-[0_0_20px_rgba(147,51,234,0.5)] border border-purple-500/30"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={toggleMobileMenu}
              className="p-2 text-zinc-400 hover:text-zinc-200 focus:outline-none"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden glass-panel border-t border-zinc-800/80 bg-zinc-950/95 overflow-hidden"
          >
            <div className="px-4 pt-2 pb-6 space-y-4">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block px-3 py-2.5 rounded-lg text-base font-semibold ${
                    pathname === link.href
                      ? 'text-purple-400 bg-purple-950/30 border border-purple-500/20'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {link.name}
                </Link>
              ))}

              {profile?.is_admin && (
                <Link
                  href="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-base font-semibold ${
                    pathname.startsWith('/admin')
                      ? 'text-cyan-400 bg-cyan-950/30 border border-cyan-500/20'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Shield className="w-4 h-4 text-cyan-400" />
                  Admin Panel
                </Link>
              )}

              {/* Wallet info & User settings for Mobile */}
              {user ? (
                <div className="pt-4 border-t border-zinc-800/60 space-y-4">
                  {/* Notifications link for Mobile */}
                  <Link
                    href="/notifications"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-base font-semibold ${
                      pathname === '/notifications'
                        ? 'text-purple-400 bg-purple-950/30 border border-purple-500/20'
                        : 'text-zinc-400 hover:text-zinc-205'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-purple-400" />
                      Notifications
                    </span>
                    {unreadCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-purple-600 text-[10px] font-bold text-white">
                        {unreadCount}
                      </span>
                    )}
                  </Link>

                  <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800">
                    <div className="flex items-center gap-2">
                      <Wallet className="w-5 h-5 text-purple-400" />
                      <span className="text-sm text-zinc-400">Wallet Balance:</span>
                    </div>
                    <span className="text-base font-black text-zinc-100">₹{walletBalance.toFixed(2)}</span>
                  </div>

                  <div className="flex items-center gap-3 px-3">
                    {profile?.profile_picture ? (
                      <img
                        src={profile.profile_picture}
                        alt={profile.name}
                        className="w-10 h-10 rounded-full border border-purple-500/30"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-purple-950/50 border border-purple-500/30 flex items-center justify-center">
                        <UserIcon className="w-5 h-5 text-purple-400" />
                      </div>
                    )}
                    <div>
                      <div className="text-sm font-semibold text-zinc-200">{profile?.name}</div>
                      <div className="text-xs text-zinc-500">{profile?.email}</div>
                    </div>
                  </div>

                  <button
                    onClick={async () => {
                      setMobileMenuOpen(false);
                      await signOut();
                    }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-red-500/20 hover:border-red-500/40 text-red-400 bg-red-950/10 rounded-lg text-sm font-bold transition-all"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              ) : (
                <div className="pt-4 border-t border-zinc-800/60 grid grid-cols-2 gap-3">
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-center px-4 py-2.5 rounded-lg text-zinc-300 font-bold hover:text-zinc-100 bg-zinc-900 border border-zinc-800"
                  >
                    Login
                  </Link>
                  <Link
                    href="/signup"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-center px-4 py-2.5 text-white bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg font-bold shadow-[0_0_15px_rgba(147,51,234,0.3)] border border-purple-500/30"
                  >
                    Sign Up
                  </Link>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
