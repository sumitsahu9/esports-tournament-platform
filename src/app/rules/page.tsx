'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Gamepad2, ArrowLeft, Terminal } from 'lucide-react';
import Link from 'next/link';

export default function RulesPage() {
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
            <Gamepad2 className="w-10 h-10 text-purple-400" />
            Tournament Rules
          </h1>
          <p className="text-zinc-500 text-xs sm:text-sm mt-2 font-mono">
            Standard Lobby Settings & Tournament Protocols
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel border border-zinc-900 rounded-2xl p-6 sm:p-8 space-y-6 bg-zinc-950/40"
        >
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-100 uppercase tracking-wide">Standard Lobby Configurations</h2>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
              <div className="p-3 bg-zinc-900/60 border border-zinc-900 rounded-lg text-center">
                <span className="block text-[10px] text-zinc-500 uppercase font-black">Platform</span>
                <span className="text-xs font-bold text-white">Mobile Only</span>
              </div>
              <div className="p-3 bg-zinc-900/60 border border-zinc-900 rounded-lg text-center">
                <span className="block text-[10px] text-zinc-500 uppercase font-black">Emulators</span>
                <span className="text-xs font-bold text-red-400">Strictly Banned</span>
              </div>
              <div className="p-3 bg-zinc-900/60 border border-zinc-900 rounded-lg text-center">
                <span className="block text-[10px] text-zinc-500 uppercase font-black">Vortex Check-In</span>
                <span className="text-xs font-bold text-white">Required</span>
              </div>
              <div className="p-3 bg-zinc-900/60 border border-zinc-900 rounded-lg text-center">
                <span className="block text-[10px] text-zinc-500 uppercase font-black">Lobby Mode</span>
                <span className="text-xs font-bold text-white">TPP / Classic</span>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-100 uppercase tracking-wide">1. Registration & Lobby Entry</h2>
            <ul className="list-disc pl-5 text-sm text-zinc-400 space-y-2">
              <li>Your In-Game Name (IGN) and Game character ID must match your registered details on the platform exactly.</li>
              <li>Only registered players are allowed inside the custom room slots. Any unregistered player entering the custom room will be kicked by moderators immediately.</li>
              <li>Under no circumstances should you share the Room ID and Password with players outside the tournament registry. Sharing credentials is a bannable offense.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-100 uppercase tracking-wide">2. Player Check-In Rules</h2>
            <p className="text-sm text-zinc-400 leading-relaxed">
              To guarantee that matches start on time and slots are filled with active players, check-in is mandatory:
            </p>
            <ul className="list-disc pl-5 text-sm text-zinc-400 space-y-1.5 mt-2">
              <li>Check-in opens **30 minutes** before the scheduled match start time.</li>
              <li>Check-in closes **5 minutes** before the scheduled match start time.</li>
              <li>Failure to check in within this window results in a **DNQ** status. You will not be allowed in the room, and your registration fee will not be refunded.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-100 uppercase tracking-wide">3. Point Splits & Standings</h2>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Match winnings are calculated and distributed based on final survival placement standings (Lobby Standings):
            </p>
            <div className="p-4 bg-zinc-900/40 border border-zinc-900 rounded-xl space-y-2 text-xs text-zinc-400 font-mono">
              <div className="flex justify-between">
                <span>Rank 1 (Winner Winner Chicken Dinner / Booyah)</span>
                <strong className="text-emerald-400">50% of Prize Pool</strong>
              </div>
              <div className="flex justify-between">
                <span>Rank 2</span>
                <strong className="text-cyan-400">30% of Prize Pool</strong>
              </div>
              <div className="flex justify-between">
                <span>Rank 3</span>
                <strong className="text-amber-500">20% of Prize Pool</strong>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-100 uppercase tracking-wide">4. Technical & Game Outages</h2>
            <p className="text-sm text-zinc-400 leading-relaxed">
              If a match starts but a player disconnects due to personal connectivity issues, the match will proceed, and no points adjustment or refund will be given. If the game server itself crashes globally, administrators will reschedule the match and refund entries.
            </p>
          </section>
        </motion.div>
      </div>
    </div>
  );
}
