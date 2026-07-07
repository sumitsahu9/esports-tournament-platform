'use client';

import React from 'react';

export default function WhatsappSupport() {
  const phoneNumber = '919509221209'; // 9509221209 with India prefix
  const message = encodeURIComponent('Hello Mash Arena Support, I need help with...');
  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${message}`;

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-[9999] flex items-center group cursor-pointer"
      aria-label="Contact Support on WhatsApp"
    >
      {/* Tooltip text bubble */}
      <div className="absolute right-16 bg-zinc-950/95 border border-zinc-800/80 text-zinc-100 text-[11px] font-bold px-3 py-2 rounded-xl shadow-2xl opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 pointer-events-none whitespace-nowrap flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
        Need help? Chat with Support
      </div>

      {/* Pulsing Outer Ring */}
      <span className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping opacity-75 pointer-events-none group-hover:bg-emerald-500/30"></span>

      {/* Floating Action Button */}
      <div className="w-14 h-14 bg-gradient-to-tr from-emerald-600 to-green-400 hover:from-emerald-500 hover:to-green-300 text-white rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.35)] hover:shadow-[0_0_25px_rgba(16,185,129,0.6)] transition-all duration-300 transform group-hover:scale-110 border border-emerald-500/20">
        <svg className="w-7 h-7 fill-current drop-shadow-[0_2px_4px_rgba(0,0,0,0.15)]" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.262 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.457L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.42 9.863-9.864.002-2.637-1.023-5.116-2.887-6.98C16.578 1.897 14.1 1.87 11.997 1.87c-5.44 0-9.866 4.418-9.87 9.865-.001 1.761.464 3.479 1.348 5.025l-.995 3.637 3.725-.977zm11.367-7.46c-.327-.164-1.93-.953-2.229-1.062-.299-.109-.517-.164-.736.164-.218.327-.844 1.062-1.035 1.28-.19.218-.381.245-.708.081-.328-.164-1.383-.51-2.635-1.627-.975-.87-1.633-1.944-1.824-2.27-.19-.328-.02-.505.143-.668.147-.147.327-.382.49-.573.164-.19.219-.327.328-.545.109-.219.055-.409-.028-.573-.081-.164-.736-1.772-1.008-2.427-.265-.636-.532-.55-.736-.56-.19-.01-.409-.012-.627-.012-.218 0-.573.082-.873.409-.3.327-1.145 1.118-1.145 2.727s1.172 3.164 1.336 3.382c.164.218 2.307 3.522 5.59 4.943.78.337 1.39.539 1.862.69.784.249 1.497.214 2.061.129.629-.094 1.93-.789 2.202-1.552.272-.764.272-1.418.19-1.552-.081-.135-.3-.218-.627-.382z"/>
        </svg>
      </div>
    </a>
  );
}
