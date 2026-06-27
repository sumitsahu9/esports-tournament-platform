'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';
import { Mail, Loader2, ArrowLeft, CheckCircle, Lock } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [email, setEmail] = useState('');

  // Password recovery states
  const [isRecovery, setIsRecovery] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updateSuccess, setUpdateSuccess] = useState(false);

  useEffect(() => {
    // 1. Check URL query/hash parameters for recovery type
    if (
      typeof window !== 'undefined' &&
      (window.location.hash.includes('type=recovery') || window.location.search.includes('type=recovery'))
    ) {
      setIsRecovery(true);
    }

    // 2. Listen to auth state changes for PASSWORD_RECOVERY event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecovery(true);
      }
    });

    // 3. Check if there's an active session with access_token in hash on mount
    async function checkSession() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session && window.location.hash.includes('access_token')) {
        setIsRecovery(true);
      }
    }
    checkSession();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    const cleanEmail = email.trim();

    try {
      const redirectUrl = `${window.location.origin}/forgot-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: redirectUrl,
      });

      if (error) throw error;
      setSuccess(true);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }
    if (newPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;
      setUpdateSuccess(true);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to update password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden bg-[#07070a]">
      {/* Background glow lights */}
      <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] rounded-full bg-purple-900/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-cyan-900/10 blur-[100px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md glass-panel border border-zinc-800/80 rounded-2xl p-6 sm:p-8 hover:border-purple-500/20 transition-all duration-300 relative z-10"
      >
        {updateSuccess ? (
          <div className="text-center py-6 space-y-4">
            <div className="flex justify-center">
              <CheckCircle className="w-12 h-12 text-emerald-500" />
            </div>
            <h2 className="text-xl font-black text-white">Password Updated!</h2>
            <p className="text-sm text-zinc-400">
              Your password has been reset successfully. You can now log in with your new password.
            </p>
            <div className="pt-4">
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 text-sm font-bold text-purple-400 hover:underline"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Login
              </Link>
            </div>
          </div>
        ) : isRecovery ? (
          <form onSubmit={handleUpdatePassword} className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                New Password
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400 mt-1">
                Enter your new password to secure your account
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-950/40 border border-red-500/30 rounded-lg text-xs text-red-400 font-semibold text-center">
                {errorMsg}
              </div>
            )}

            <div className="space-y-4">
              {/* New Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-zinc-500" />
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full pl-11 pr-4 py-3 bg-zinc-950/70 border border-zinc-800 rounded-xl focus:border-purple-500/50 focus:outline-none text-sm text-zinc-100 transition-colors"
                  />
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-zinc-500" />
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="w-full pl-11 pr-4 py-3 bg-zinc-950/70 border border-zinc-800 rounded-xl focus:border-purple-500/50 focus:outline-none text-sm text-zinc-100 transition-colors"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-[0_0_15px_rgba(147,51,234,0.3)] transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Updating Password...
                </>
              ) : (
                'Update Password'
              )}
            </button>

            <div className="text-center text-xs text-zinc-500 pt-4 border-t border-zinc-900">
              <Link
                href="/login"
                className="inline-flex items-center gap-1 text-purple-400 hover:underline font-bold"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Login
              </Link>
            </div>
          </form>
        ) : success ? (
          <div className="text-center py-6 space-y-4">
            <div className="flex justify-center">
              <CheckCircle className="w-12 h-12 text-emerald-500" />
            </div>
            <h2 className="text-xl font-black text-white">Reset Email Sent!</h2>
            <p className="text-sm text-zinc-400">
              Check your inbox for a link to reset your password.
            </p>
            <div className="pt-4">
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 text-sm font-bold text-purple-400 hover:underline"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Login
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleReset} className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Reset Password
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400 mt-1">
                Enter your email address to receive a recovery link
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-950/40 border border-red-500/30 rounded-lg text-xs text-red-400 font-semibold text-center">
                {errorMsg}
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-zinc-500" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter account email"
                    className="w-full pl-11 pr-4 py-3 bg-zinc-950/70 border border-zinc-800 rounded-xl focus:border-purple-500/50 focus:outline-none text-sm text-zinc-100 transition-colors"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-[0_0_15px_rgba(147,51,234,0.3)] transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sending Link...
                </>
              ) : (
                'Send Recovery Link'
              )}
            </button>

            <div className="text-center text-xs text-zinc-500 pt-4 border-t border-zinc-900">
              <Link
                href="/login"
                className="inline-flex items-center gap-1 text-purple-400 hover:underline font-bold"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Login
              </Link>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
}
