'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Shield, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function PrivacyPage() {
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
            <Shield className="w-10 h-10 text-cyan-400" />
            Privacy Policy
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
            <h2 className="text-lg font-bold text-zinc-100 uppercase tracking-wide">1. Information We Collect</h2>
            <p className="text-sm text-zinc-400 leading-relaxed">
              We collect information that you directly provide to us during account signup, linked profile updates, or support conversations. This includes your name, email address, phone number, in-game characters credentials (BGMI UID, Free Fire UID, IGNs), and UPI ID details for payouts.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-100 uppercase tracking-wide">2. How We Use Your Data</h2>
            <ul className="list-disc pl-5 text-sm text-zinc-400 space-y-2">
              <li>To register and seat you in tournament lobby grids.</li>
              <li>To securely calculate platform cuts, prize pool credits, and payouts.</li>
              <li>To send you real-time notification alerts (winnings, room details, maintenance updates).</li>
              <li>To check cheating, unauthorized emulator logins, or terms violations.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-100 uppercase tracking-wide">3. Data Security & Storage</h2>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Your passwords and transaction tokens are protected by Supabase's secure authentication framework. We store UPI IDs and cash logs with encrypted tables. RLS (Row-Level Security) rules prevent other users from viewing your private wallet data.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-100 uppercase tracking-wide">4. Third-Party Sharing</h2>
            <p className="text-sm text-zinc-400 leading-relaxed">
              We do not sell, rent, or trade your personal information. Payout processing information is shared strictly with secure banking networks to complete withdrawal credits.
            </p>
          </section>
        </motion.div>
      </div>
    </div>
  );
}
