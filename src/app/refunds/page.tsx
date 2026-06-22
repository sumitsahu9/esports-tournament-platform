'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { RotateCcw, ArrowLeft, Info } from 'lucide-react';
import Link from 'next/link';

export default function RefundsPage() {
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
            <RotateCcw className="w-10 h-10 text-purple-400" />
            Refund & Cancellation Policy
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
            <h2 className="text-lg font-bold text-zinc-100 uppercase tracking-wide">1. Registration Fee Refunds</h2>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Mash Arena operates on an esports match coordination model. Tournament entry fees are non-refundable once slot bookings are completed, except in the following scenarios:
            </p>
            <ul className="list-disc pl-5 text-sm text-zinc-400 space-y-1.5 mt-2">
              <li>The tournament is cancelled or rescheduled by the platform administrators.</li>
              <li>A technical glitch on the platform charged your wallet balance twice for the same booking.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-100 uppercase tracking-wide">2. Tournament Cancellations</h2>
            <p className="text-sm text-zinc-400 leading-relaxed">
              If an upcoming tournament is cancelled due to server outages, lack of minimum registrations, or official match cancellations, the registration entry fee will be fully refunded to the player's wallet balance within 24 hours.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-100 uppercase tracking-wide">3. Fairplay Disqualifications</h2>
            <p className="text-sm text-zinc-400 leading-relaxed">
              If you register for a tournament and are disqualified for cheating, violating match rules, using unauthorized emulators/pads, or toxic behavior in the lobby, you will not receive a refund. The entry fee is forfeited.
            </p>
            <div className="p-3 bg-purple-950/20 border border-purple-500/20 rounded-xl flex items-start gap-2.5 text-xs text-purple-400">
              <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>Players must check in 30 minutes before the match start. Missing the check-in window marks you as DNQ (Did Not Qualify) and entry fees will not be refunded.</span>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-100 uppercase tracking-wide">4. Wallet Deposits</h2>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Deposits added to your Mash Arena wallet are for platform match play credits only. Mock deposits are dummy test funds and carry no cash value. For actual production deployments, deposit balances are strictly non-refundable and non-withdrawable.
            </p>
          </section>
        </motion.div>
      </div>
    </div>
  );
}
