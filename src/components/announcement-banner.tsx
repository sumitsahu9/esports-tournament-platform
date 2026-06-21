'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { isMockEnabled, mockDb } from '@/lib/mockDb';
import { Megaphone, X, AlertTriangle, ShieldAlert, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Announcement {
  id: string;
  title: string;
  message: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  type: string;
  published_at: string;
  expires_at: string | null;
}

export default function AnnouncementBanner() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dismissed, setDismissed] = useState<string[]>([]);

  useEffect(() => {
    async function fetchAnnouncements() {
      try {
        let active: Announcement[] = [];

        if (isMockEnabled) {
          const all = mockDb.getAnnouncements();
          active = all.filter((a: any) => {
            const isPublished = new Date(a.published_at) <= new Date();
            const notExpired = !a.expires_at || new Date(a.expires_at) > new Date();
            return isPublished && notExpired;
          });
        } else {
          const { data } = await supabase
            .from('announcements')
            .select('*')
            .order('published_at', { ascending: false });

          if (data) {
            active = data.filter((a: any) => {
              const isPublished = new Date(a.published_at) <= new Date();
              const notExpired = !a.expires_at || new Date(a.expires_at) > new Date();
              return isPublished && notExpired;
            });
          }
        }

        setAnnouncements(active);
      } catch (err) {
        console.error('Error fetching announcements:', err);
      }
    }
    fetchAnnouncements();

    // Refresh every minute to expire/publish scheduled items
    const interval = setInterval(fetchAnnouncements, 60000);
    return () => clearInterval(interval);
  }, []);

  const visibleAnnouncements = announcements.filter(a => !dismissed.includes(a.id));

  if (visibleAnnouncements.length === 0) return null;

  const current = visibleAnnouncements[currentIndex];

  const handleDismiss = (id: string) => {
    setDismissed(prev => [...prev, id]);
    if (currentIndex >= visibleAnnouncements.length - 1) {
      setCurrentIndex(0);
    }
  };

  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case 'Critical':
        return {
          bg: 'bg-red-950/90 text-red-300 border-red-500/30',
          icon: <ShieldAlert className="w-4 h-4 text-red-400 animate-pulse flex-shrink-0" />,
          label: 'Critical Alert'
        };
      case 'High':
        return {
          bg: 'bg-amber-950/90 text-amber-300 border-amber-500/30',
          icon: <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />,
          label: 'Warning'
        };
      case 'Medium':
        return {
          bg: 'bg-cyan-950/90 text-cyan-300 border-cyan-500/30',
          icon: <Info className="w-4 h-4 text-cyan-400 flex-shrink-0" />,
          label: 'Notice'
        };
      default:
        return {
          bg: 'bg-purple-950/90 text-purple-300 border-purple-500/30',
          icon: <Megaphone className="w-4 h-4 text-purple-400 flex-shrink-0" />,
          label: 'Update'
        };
    }
  };

  const style = getPriorityStyle(current.priority);

  return (
    <div className={`w-full ${style.bg} border-b py-2 px-4 transition-all duration-300 z-50 relative backdrop-blur-sm flex items-center justify-between gap-4 text-xs font-semibold`}>
      <div className="flex items-center gap-2 max-w-[90%] overflow-hidden">
        {style.icon}
        <span className="font-black uppercase tracking-wider text-[10px] bg-zinc-950/80 px-2 py-0.5 rounded border border-zinc-900">
          {style.label}
        </span>
        <strong className="text-white font-black truncate">{current.title}:</strong>
        <span className="truncate text-zinc-300 font-medium">{current.message}</span>
      </div>

      <div className="flex items-center gap-3">
        {visibleAnnouncements.length > 1 && (
          <button 
            onClick={() => setCurrentIndex(prev => (prev + 1) % visibleAnnouncements.length)}
            className="text-[10px] text-zinc-500 hover:text-white uppercase tracking-wider font-black"
          >
            Next ({currentIndex + 1}/{visibleAnnouncements.length})
          </button>
        )}
        <button
          onClick={() => handleDismiss(current.id)}
          className="text-zinc-500 hover:text-white p-0.5 rounded transition-colors"
          title="Dismiss banner"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
