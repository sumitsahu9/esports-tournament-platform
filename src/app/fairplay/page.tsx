'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert, ArrowLeft, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export default function FairPlayPage() {
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
            <ShieldAlert className="w-10 h-10 text-cyan-400 animate-pulse" />
            Fair Play Policy
          </h1>
          <p className="text-zinc-500 text-xs sm:text-sm mt-2 font-mono">
            Vortex Anti-Cheat Security & Integrity Guidelines
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel border border-zinc-900 rounded-2xl p-6 sm:p-8 space-y-6 bg-zinc-950/40"
        >
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-100 uppercase tracking-wide">Competitive Integrity Promise</h2>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Vortex is built by gamers, for gamers. We believe esports should be a pure display of skill, tactical coordination, and dedication. To ensure a 100% fair and level playing field, we enforce a strict competitive integrity framework.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-lg font-bold text-zinc-100 uppercase tracking-wide">1. Prohibited Violations</h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-zinc-900/50 border border-zinc-900 rounded-xl space-y-1.5">
                <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">Hacks & Third-Party Scripts</span>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  Use of aimbots, wallhacks, recoil controllers, speed hacks, or custom modified game client scripts is strictly banned.
                </p>
              </div>

              <div className="p-4 bg-zinc-900/50 border border-zinc-900 rounded-xl space-y-1.5">
                <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">Emulator & Peripheral Abuse</span>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  All matches are mobile-only. Using emulators (BlueStacks, LDPlayer) or connecting mouse & keyboards is forbidden.
                </p>
              </div>

              <div className="p-4 bg-zinc-900/50 border border-zinc-900 rounded-xl space-y-1.5">
                <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">Teaming & Collusion</span>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  Teaming up with opponent squads or coordinating matches to trade lobby positions will lead to permanent platform blacklist.
                </p>
              </div>

              <div className="p-4 bg-zinc-900/50 border border-zinc-900 rounded-xl space-y-1.5">
                <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">Account Sharing & Ringing</span>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  Letting another player play on your registered IGN during a tournament is considered account ringing and is bannable.
                </p>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-100 uppercase tracking-wide">2. Monitoring & Proof Requirements</h2>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Our moderator team sits inside lobbies to verify registrations and record gameplay. After the match finishes:
            </p>
            <ul className="list-disc pl-5 text-sm text-zinc-400 space-y-2 mt-2">
              <li>Admins record lobby standings and cross-match with platform signups.</li>
              <li>Winners are required to capture result screenshots showing their placement grid.</li>
              <li>Admins upload official match proof screenshots to public databases to guarantee trust.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-100 uppercase tracking-wide">3. Penalties & Bans</h2>
            <p className="text-sm text-zinc-400 leading-relaxed">
              If a moderator confirms a rule violation:
            </p>
            <div className="space-y-2.5 mt-2">
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>Immediate disqualification from the ongoing tournament.</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>Permanent ban of the player's Account, Game UID, and IGN.</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>Forfeiture of all wallet balances and pending withdrawal requests.</span>
              </div>
            </div>
          </section>
        </motion.div>
      </div>
    </div>
  );
}
