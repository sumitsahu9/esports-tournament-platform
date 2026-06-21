'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { isMockEnabled } from '@/lib/mockDb';
import { motion } from 'framer-motion';
import { Mail, Lock, Loader2, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { loginMockUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      if (isMockEnabled) {
        if (email.toLowerCase() === 'sumit903970@gmail.com' && password !== '9039709836#') {
          throw new Error('Invalid email or password');
        }
        await loginMockUser(email);
        router.push('/dashboard');
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      router.push('/dashboard');
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Invalid email or password');
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
        <form onSubmit={handleLogin} className="space-y-6">
          <div className="text-center">
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Log In
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1">
              Enter your credentials to enter the arena
            </p>
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-950/40 border border-red-500/30 rounded-lg text-xs text-red-400 font-semibold text-center">
              {errorMsg}
            </div>
          )}

          <div className="space-y-4">
            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-zinc-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter email address"
                  className="w-full pl-11 pr-4 py-3 bg-zinc-950/70 border border-zinc-800 rounded-xl focus:border-purple-500/50 focus:outline-none text-sm text-zinc-100 transition-colors"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Password</label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-purple-400 hover:underline font-semibold"
                >
                  Forgot Password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-zinc-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full pl-11 pr-4 py-3 bg-zinc-950/70 border border-zinc-800 rounded-xl focus:border-purple-500/50 focus:outline-none text-sm text-zinc-100 transition-colors"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-[0_0_15px_rgba(147,51,234,0.3)] hover:shadow-[0_0_20px_rgba(147,51,234,0.5)] transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Logging In...
              </>
            ) : (
              <>
                Enter Lobby
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          <div className="text-center text-xs text-zinc-500 pt-4 border-t border-zinc-900">
            Don't have an account?{' '}
            <Link href="/signup" className="text-purple-400 hover:underline font-bold">
              Sign Up
            </Link>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
