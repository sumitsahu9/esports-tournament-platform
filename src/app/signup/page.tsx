'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { isMockEnabled } from '@/lib/mockDb';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Mail, Lock, Phone, Gamepad2, ArrowRight, ArrowLeft, Loader2, CheckCircle } from 'lucide-react';

export default function SignupPage() {
  const router = useRouter();
  const { registerMockUser } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isUnconfirmed, setIsUnconfirmed] = useState(false);

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');

  // Game Profiles
  const [bgmiCharId, setBgmiCharId] = useState('');
  const [bgmiIgn, setBgmiIgn] = useState('');
  const [ffUid, setFfUid] = useState('');
  const [ffIgn, setFfIgn] = useState('');

  const nextStep = () => {
    if (step === 1) {
      if (!name || !email || !password) {
        setErrorMsg('Please fill in all account credentials');
        return;
      }
      if (password.length < 6) {
        setErrorMsg('Password must be at least 6 characters long');
        return;
      }
      setErrorMsg(null);
      setStep(2);
    }
  };

  const prevStep = () => {
    setErrorMsg(null);
    setStep(1);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    const cleanEmail = email.trim();

    try {
      if (isMockEnabled) {
        await registerMockUser({
          email: cleanEmail,
          name,
          phone,
          bgmiCharId,
          bgmiIgn,
          ffUid,
          ffIgn
        });
        setSuccess(true);
        setTimeout(() => {
          router.push('/dashboard');
        }, 3000);
        return;
      }

      // 1. Sign up with Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            name: name,
            phone_number: phone || null,
            bgmi_character_id: bgmiCharId || null,
            bgmi_ign: bgmiIgn || null,
            freefire_uid: ffUid || null,
            freefire_ign: ffIgn || null,
          }
        }
      });

      if (error) throw error;

      if (data.user) {
        // 2. Update the profile table with optional details (fallback in case RLS permits)
        try {
          await supabase
            .from('profiles')
            .update({
              phone_number: phone || null,
              bgmi_character_id: bgmiCharId || null,
              bgmi_ign: bgmiIgn || null,
              freefire_uid: ffUid || null,
              freefire_ign: ffIgn || null,
            })
            .eq('id', data.user.id);
        } catch (profileError) {
          console.warn('Fallback update profile warning (handled via trigger):', profileError);
        }

        const emailUnconfirmed = !data.session;
        setIsUnconfirmed(emailUnconfirmed);
        setSuccess(true);
        
        if (!emailUnconfirmed) {
          setTimeout(() => {
            router.push('/dashboard');
          }, 3000);
        }
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'An error occurred during signup');
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
          <div className="text-center py-8 space-y-4">
            <div className="flex justify-center">
              <CheckCircle className="w-16 h-16 text-emerald-500 animate-bounce" />
            </div>
            <h2 className="text-2xl font-black text-white">Registration Successful!</h2>
            {isUnconfirmed ? (
              <>
                <p className="text-sm text-zinc-400">
                  📧 <strong>Verification link sent!</strong> We've sent a confirmation email. Please verify your email before logging in.
                </p>
                <div className="pt-4">
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-1.5 text-sm font-bold text-purple-400 hover:underline"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Go to Login
                  </Link>
                </div>
              </>
            ) : (
              <p className="text-sm text-zinc-400">
                Your account has been created. Redirecting to dashboard...
              </p>
            )}
          </div>
        ) : (
          <form onSubmit={handleSignup} className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Create Account
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400 mt-1">
                {step === 1 ? 'Step 1: Account credentials' : 'Step 2: Gaming profiles'}
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-950/40 border border-red-500/30 rounded-lg text-xs text-red-400 font-semibold text-center">
                {errorMsg}
              </div>
            )}

            <AnimatePresence mode="wait">
              {step === 1 ? (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  {/* Full Name */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-zinc-500" />
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Enter full name"
                        className="w-full pl-11 pr-4 py-3 bg-zinc-950/70 border border-zinc-800 rounded-xl focus:border-purple-500/50 focus:outline-none text-sm text-zinc-100 transition-colors"
                      />
                    </div>
                  </div>

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
                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-zinc-500" />
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Create password (min 6 chars)"
                        className="w-full pl-11 pr-4 py-3 bg-zinc-950/70 border border-zinc-800 rounded-xl focus:border-purple-500/50 focus:outline-none text-sm text-zinc-100 transition-colors"
                      />
                    </div>
                  </div>

                  {/* Phone */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Phone (WhatsApp)</label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-zinc-500" />
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="Enter contact number"
                        className="w-full pl-11 pr-4 py-3 bg-zinc-950/70 border border-zinc-800 rounded-xl focus:border-purple-500/50 focus:outline-none text-sm text-zinc-100 transition-colors"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={nextStep}
                    className="w-full py-3.5 bg-zinc-900 border border-zinc-800 hover:border-purple-500/30 text-zinc-200 rounded-xl font-bold transition-all flex items-center justify-center gap-2 text-sm mt-6"
                  >
                    Set Up Gaming IDs
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  {/* BGMI IDs */}
                  <div className="p-4 bg-purple-950/10 border border-purple-500/10 rounded-xl space-y-3">
                    <h4 className="text-xs font-black uppercase text-purple-400 tracking-wider flex items-center gap-1.5">
                      <Gamepad2 className="w-4 h-4 text-purple-400" />
                      BGMI Account (Optional)
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        value={bgmiCharId}
                        onChange={(e) => setBgmiCharId(e.target.value)}
                        placeholder="Character ID"
                        className="w-full px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-lg focus:border-purple-500/50 focus:outline-none text-xs text-zinc-100 transition-colors"
                      />
                      <input
                        type="text"
                        value={bgmiIgn}
                        onChange={(e) => setBgmiIgn(e.target.value)}
                        placeholder="In-Game Name (IGN)"
                        className="w-full px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-lg focus:border-purple-500/50 focus:outline-none text-xs text-zinc-100 transition-colors"
                      />
                    </div>
                  </div>

                  {/* Free Fire IDs */}
                  <div className="p-4 bg-cyan-950/10 border border-cyan-500/10 rounded-xl space-y-3">
                    <h4 className="text-xs font-black uppercase text-cyan-400 tracking-wider flex items-center gap-1.5">
                      <Gamepad2 className="w-4 h-4 text-cyan-400" />
                      Free Fire Account (Optional)
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        value={ffUid}
                        onChange={(e) => setFfUid(e.target.value)}
                        placeholder="UID"
                        className="w-full px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-lg focus:border-cyan-500/50 focus:outline-none text-xs text-zinc-100 transition-colors"
                      />
                      <input
                        type="text"
                        value={ffIgn}
                        onChange={(e) => setFfIgn(e.target.value)}
                        placeholder="In-Game Name (IGN)"
                        className="w-full px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-lg focus:border-cyan-500/50 focus:outline-none text-xs text-zinc-100 transition-colors"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-6">
                    <button
                      type="button"
                      onClick={prevStep}
                      className="py-3 bg-zinc-900 border border-zinc-855 hover:bg-zinc-855 text-zinc-300 rounded-xl font-bold text-sm flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl font-bold text-sm shadow-[0_0_15px_rgba(147,51,234,0.3)] flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Registering...
                        </>
                      ) : (
                        <>
                          Register
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="text-center text-xs text-zinc-500 pt-4 border-t border-zinc-900">
              Already have an account?{' '}
              <Link href="/login" className="text-purple-400 hover:underline font-bold">
                Log In
              </Link>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
}
