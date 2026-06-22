'use client';

import React from 'react';
import Link from 'next/link';
import { Mail, ShieldCheck, Heart, ArrowUpRight, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const { profile } = useAuth();

  return (
    <footer className="w-full bg-zinc-950/75 border-t border-zinc-900 mt-auto backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-12">
          {/* Brand Col */}
          <div className="md:col-span-2 space-y-4">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-xl sm:text-2xl font-black tracking-wider text-gradient-purple-cyan font-sans">
                VORTEX
              </span>
              <span className="px-1.5 py-0.5 text-[10px] font-bold tracking-widest text-cyan-400 border border-cyan-500/30 rounded bg-cyan-950/40">
                PRO
              </span>
            </Link>
            <p className="text-sm text-zinc-400 max-w-sm leading-relaxed">
              The ultimate arena for mobile esports athletes. Compete in BGMI and Free Fire tournaments daily, prove your squad's dominance, and cash out real cash rewards securely.
            </p>
            <div className="flex items-center gap-4 text-xs text-zinc-500 pt-2">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                Fairplay Guaranteed
              </span>
              <span className="h-4 w-px bg-zinc-800" />
              <span>Anti-Cheat Protected</span>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold uppercase tracking-wider text-zinc-200">
              Platform
            </h4>
            <ul className="space-y-2">
              <li>
                <Link href="/" className="text-sm text-zinc-400 hover:text-purple-400 transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="text-sm text-zinc-400 hover:text-purple-400 transition-colors">
                  User Dashboard
                </Link>
              </li>
              <li>
                <Link href="/dashboard?tab=wallet" className="text-sm text-zinc-400 hover:text-purple-400 transition-colors">
                  My Wallet & Deposits
                </Link>
              </li>
              <li>
                <Link href="/admin" className="text-sm text-zinc-400 hover:text-purple-400 transition-colors">
                  Admin Panel
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal and Support */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold uppercase tracking-wider text-zinc-200">
              Support & Legal
            </h4>
            <ul className="space-y-2 text-sm text-zinc-400">
              <li>
                <Link href="/terms" className="hover:text-purple-400 transition-colors flex items-center gap-0.5">
                  Terms of Service
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-purple-400 transition-colors flex items-center gap-0.5">
                  Privacy Policy
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </li>
              <li>
                <Link href="/refunds" className="hover:text-purple-400 transition-colors flex items-center gap-0.5">
                  Refund Policy
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </li>
              <li>
                <Link href="/fairplay" className="hover:text-purple-400 transition-colors flex items-center gap-0.5">
                  Fair Play Policy
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </li>
              <li>
                <Link href="/rules" className="hover:text-purple-400 transition-colors flex items-center gap-0.5">
                  Tournament Rules
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </li>
              <li className="pt-2 border-t border-zinc-900 mt-2">
                <a
                  href="mailto:gussarsaurabh@gmail.com"
                  className="flex items-center gap-2 hover:text-purple-400 transition-colors text-zinc-300"
                >
                  <Mail className="w-4 h-4 text-purple-400" />
                  gussarsaurabh@gmail.com
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Legal bar */}
        <div className="border-t border-zinc-900 mt-10 sm:mt-16 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-center">
          <p className="text-xs text-zinc-500">
            &copy; {currentYear} Vortex Esports. All rights reserved. BGMI and Free Fire are trademarks of their respective owners.
          </p>
          <p className="text-xs text-zinc-500 flex items-center justify-center gap-1.5">
            Designed for gamers with <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500" />
          </p>
        </div>
      </div>
    </footer>
  );
}
