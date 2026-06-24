import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';

interface TrackerHeroProps {
  backLink?: { href: string; label: string };
  metadata?: React.ReactNode;
  title: React.ReactNode;
  description: string;
  rightContent?: React.ReactNode;
}

export const TrackerHero: React.FC<TrackerHeroProps> = ({ 
  backLink, 
  metadata, 
  title, 
  description, 
  rightContent 
}) => {
  return (
    <div className="w-full relative">
      {/* Back Button - Absolute positioned to preserve baseline rhythm across pages */}
      {backLink && (
        <div className="absolute -top-12 left-0 h-6">
          <a 
            href={backLink.href} 
            className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-ink/50 hover:text-ink transition-all group py-3 pr-4 hover:gap-3"
          >
            <ArrowLeft className="w-3 h-3 transition-transform group-hover:-translate-x-1" />
            {backLink.label}
          </a>
        </div>
      )}

      <div className="relative flex flex-col items-center text-center gap-6">
        <div className="max-w-3xl mx-auto pb-4 lg:pb-6">
          {metadata && (
            <div className="flex flex-wrap justify-center items-center gap-3 mb-6">
              {metadata}
            </div>
          )}
          
          <h1 className="text-5xl sm:text-7xl lg:text-8xl xl:text-9xl font-black tracking-[-0.06em] text-ink leading-[0.85] mb-8">
            {title}
          </h1>
          
          <p className="text-lg sm:text-xl lg:text-2xl text-body font-medium opacity-60 leading-tight max-w-xl mx-auto">
            {description}
          </p>
        </div>

        {rightContent && (
          <div className="lg:absolute lg:right-0 lg:top-1/2 lg:-translate-y-1/2 flex-shrink-0">
            <div className="relative">
              {/* Subtle glow behind right content to prevent flat feeling */}
              <div className="absolute -inset-4 bg-primary/5 blur-2xl rounded-full opacity-0 lg:opacity-100 pointer-events-none" />
              <div className="relative z-10">
                {rightContent}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
