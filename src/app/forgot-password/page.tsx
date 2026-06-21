'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';
import { Mail, Loader2, ArrowLeft, CheckCircle } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [email, setEmail] = useState('');

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login`,
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
        {success ? (
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
