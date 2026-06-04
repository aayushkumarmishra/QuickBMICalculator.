import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from 'framer-motion';
import { ThemeToggle } from './ThemeToggle';
import { BrandLogo } from './BrandLogo';
import { Menu, X } from 'lucide-react';

export const Navbar: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const { scrollY } = useScroll();
  const lastScrollY = useRef(0);
  const scrollStopTimer = useRef<NodeJS.Timeout | null>(null);
  const scrollThreshold = 10;

  useMotionValueEvent(scrollY, "change", (latest) => {
    // Determine if scrolled enough to show background
    setIsScrolled(latest > 20);

    // Calculate direction and distance
    const diff = latest - lastScrollY.current;
    
    // Intelligent Visibility Logic
    if (Math.abs(diff) > scrollThreshold) {
      if (diff > 0 && latest > 100) {
        // Scrolling Down - Hide
        setIsVisible(false);
      } else {
        // Scrolling Up - Show
        setIsVisible(true);
      }
      lastScrollY.current = latest;
    }

    // Scroll Stop Logic: Gently reveal after 400ms of inactivity
    if (scrollStopTimer.current) clearTimeout(scrollStopTimer.current);
    scrollStopTimer.current = setTimeout(() => {
      setIsVisible(true);
    }, 400);
  });

  const navLinks = [
    { name: 'How it works', href: '/#how-it-works' },
    { name: 'BMI Categories', href: '/#bmi-categories' },
    { name: 'FAQ', href: '/#faq' },
    { name: 'About', href: '/about' },
    { name: 'Contact', href: '/contact' },
  ];

  return (
    <motion.nav 
      initial={{ y: 0 }}
      animate={{ 
        y: isVisible ? 0 : -100,
        opacity: isVisible ? 1 : 0
      }}
      transition={{ 
        duration: 0.5, 
        ease: [0.16, 1, 0.3, 1] 
      }}
      className={`h-16 fixed top-0 left-0 right-0 z-50 flex items-center transition-all duration-700 ${
        isScrolled 
          ? 'bg-canvas/60 backdrop-blur-2xl shadow-[0_10px_30px_-10px_rgba(0,0,0,0.1)]' 
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 w-full flex items-center justify-between">
        <a href="/" className="flex items-center gap-2.5 group relative z-50">
          <div className="relative">
            <BrandLogo className="w-8 h-8 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3" />
            <div className="absolute inset-0 bg-primary/10 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-full" />
          </div>
          <span className="font-bold text-xl tracking-tighter text-ink leading-none">QuickBMI</span>
        </a>
        
        {/* Desktop Navigation - Premium & Spaced */}
        <div className="hidden lg:flex items-center gap-8 xl:gap-12">
          <div className="flex items-center gap-6 xl:gap-10">
            {navLinks.map((item) => (
              <a 
                key={item.name}
                href={item.href} 
                className="text-[13px] font-bold text-mute hover:text-ink transition-all duration-300 relative group flex items-center"
              >
                <span className="relative z-10">{item.name}</span>
                <span className="absolute -bottom-1 left-0 w-0 h-[1.5px] bg-ink/80 transition-all duration-500 cubic-bezier(0.16, 1, 0.3, 1) group-hover:w-full" />
              </a>
            ))}
          </div>
          
          <div className="flex items-center gap-6 xl:gap-8 pl-6 xl:pl-10 border-l border-hairline/40">
            <ThemeToggle />
            <a 
              href="/#calculator" 
              className="relative px-6 xl:px-7 py-2.5 bg-ink text-canvas rounded-pill text-[11px] font-black uppercase tracking-[0.15em] transition-all duration-500 hover:scale-[1.04] active:scale-[0.96] shadow-premium-md hover:shadow-premium-xl group overflow-hidden"
            >
              <span className="relative z-10">Calculate</span>
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              {/* Subtle Depth Line */}
              <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-white/20 opacity-30" />
            </a>
          </div>
        </div>

        {/* Mobile Toggle */}
        <div className="flex items-center gap-4 lg:hidden">
          <ThemeToggle />
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2.5 text-ink transition-all hover:bg-canvas-soft rounded-xl relative z-50 active:scale-90"
            aria-label="Toggle Menu"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="absolute top-0 left-0 w-full h-[100dvh] bg-canvas pt-24 px-6 lg:hidden z-40"
          >
            <div className="flex flex-col gap-8">
              {navLinks.map((item) => (
                <a 
                  key={item.name}
                  href={item.href} 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-2xl font-bold text-ink hover:text-mute transition-colors"
                >
                  {item.name}
                </a>
              ))}
              <div className="pt-8 border-t border-hairline">
                <a 
                  href="/#calculator" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-full py-4 bg-ink text-canvas rounded-pill text-center font-bold text-sm uppercase tracking-widest block shadow-premium-lg"
                >
                  Calculate Now
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
};


