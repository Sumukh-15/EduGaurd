"use client";

import React, { useEffect } from "react";
import { AlertOctagon, RefreshCw } from "lucide-react";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error("Global Layout Error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-[#F7F8F4] text-[#12181E] flex items-center justify-center p-6 font-sans antialiased">
        <div className="max-w-md w-full text-center p-8 rounded-3xl bg-white border border-[#12181E]/10 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-[#FDEEEE] text-[#E85D5D] mx-auto flex items-center justify-center mb-5">
            <AlertOctagon className="w-8 h-8" />
          </div>

          <span className="text-[11px] font-bold uppercase tracking-wider text-[#E85D5D] bg-[#FDEEEE] px-2.5 py-1 rounded-md">
            Critical System Notice
          </span>

          <h1 className="text-2xl font-black mt-3">An application error occurred</h1>

          <p className="text-xs text-[#52606D] mt-2 leading-relaxed">
            The application layout encountered an unexpected issue. Please reload to restore the session.
          </p>

          <div className="mt-6 flex justify-center">
            <button
              onClick={() => reset()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#27AC1F] hover:bg-[#1E8717] text-white text-xs font-bold transition-all shadow-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reload Application
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
