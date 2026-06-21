'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Scale, ArrowLeft, ShieldAlert } from 'lucide-react';
import Link from 'next/link';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#07070a] text-zinc-300 py-16 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] rounded-full bg-purple-900/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-cyan-900/5 blur-[120px] pointer-events-none" />

      <div className="max-w-4xl mx-auto space-y-8 relative z-10">
        <div>
          <Link href="/" className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-500 hover:text-white transition-colors mb-6">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Arena
          </Link>
          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight flex items-center gap-3">
            <Scale className="w-10 h-10 text-purple-400" />
            Terms of Service
          </h1>
          <p className="text-zinc-500 text-xs sm:text-sm mt-2 font-mono">
            Last Updated: June 18, 2026
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel border border-zinc-900 rounded-2xl p-6 sm:p-8 space-y-6 bg-zinc-950/40"
        >
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-100 uppercase tracking-wide">1. Agreement to Terms</h2>
            <p className="text-sm text-zinc-400 leading-relaxed">
              By accessing and participating in tournaments on Vortex Esports, you agree to comply with and be bound by these Terms of Service. If you do not agree, please do not use our services.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-100 uppercase tracking-wide">2. User Eligibility & Accounts</h2>
            <p className="text-sm text-zinc-400 leading-relaxed">
              You must be at least 18 years of age or have parental consent to join paid tournaments. You agree to provide accurate, complete, and current information, including linked game details (BGMI UID, Free Fire UID, IGNs). Creating multiple dummy accounts is strictly prohibited.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-100 uppercase tracking-wide">3. Wallet Deposits & Withdrawals</h2>
            <ul className="list-disc pl-5 text-sm text-zinc-400 space-y-2">
              <li>Deposit balances are non-refundable and can only be used to register for tournaments.</li>
              <li>Winnings wallet balances can be withdrawn once they exceed the minimum limit of ₹100.</li>
              <li>Withdrawals will be processed to the designated UPI account after administrator verification of match results and fairplay status.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-100 uppercase tracking-wide">4. Fair Play & Anti-Cheat</h2>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Vortex maintains a strict zero-tolerance policy against hacking, cheating, teaming, emulators, or toxic behavior. Any player caught violating tournament rules will have their account immediately terminated, their slot cancelled without refund, and winnings forfeited.
            </p>
            <div className="p-3 bg-red-950/20 border border-red-500/20 rounded-xl flex items-start gap-2.5 text-xs text-red-400">
              <ShieldAlert className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>We actively monitor tournament recordings, in-game stats, and community reporting to ensure competitive integrity.</span>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-100 uppercase tracking-wide">5. Limitation of Liability</h2>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Vortex Esports is not responsible for server crashes, internet disruptions, in-game bugs, or device compatibility issues that might affect your tournament performance.
            </p>
          </section>
        </motion.div>
      </div>
    </div>
  );
}
