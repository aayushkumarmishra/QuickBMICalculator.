import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from 'framer-motion';
import { ThemeToggle } from './ThemeToggle';
import { BrandLogo } from './BrandLogo';
import { Menu, X, ChevronDown, LogOut } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { logActivity } from '../lib/audit';
import type { User as SupabaseUser } from '@supabase/supabase-js';

const ProfileDropdown: React.FC<{ user: SupabaseUser; handleLogout: () => void; isMobile?: boolean }> = ({ user, handleLogout, isMobile }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getFirstLetter = () => {
    try {
      const name = user?.user_metadata?.full_name || user?.email || 'U';
      return String(name).charAt(0).toUpperCase() || 'U';
    } catch (e) {
      return 'U';
    }
  };

  if (!user) return null;

  return (
    <div className="relative flex items-center" ref={dropdownRef}>
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileTap={{ scale: 0.85, rotate: -10 }}
        whileHover={{ scale: 1.1 }}
        transition={{ type: "spring", stiffness: 400, damping: 17 }}
        className={`${
          isMobile ? 'w-7 h-7 text-[8px]' : 'w-9 h-9 text-[11px]'
        } rounded-full bg-canvas border border-hairline flex items-center justify-center font-black text-ink shadow-premium-sm hover:shadow-premium-md overflow-hidden group relative z-10 cursor-pointer`}
      >
        <motion.div 
          animate={{ rotate: isOpen ? 360 : 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="absolute inset-0 bg-ink/[0.03] opacity-0 group-hover:opacity-100 transition-opacity" 
        />
        <span className="relative z-10 tracking-tight opacity-70 group-hover:opacity-100 transition-opacity">{getFirstLetter()}</span>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="profile-dropdown-content"
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className={`absolute top-full right-0 mt-3 ${
              isMobile ? 'w-[240px]' : 'w-[300px]'
            } bg-canvas/60 backdrop-blur-2xl border border-hairline rounded-[2.5rem] shadow-premium-2xl overflow-hidden z-[100] origin-top-right`}
          >
            <div className="p-8 border-b border-hairline/50 relative flex items-center gap-5 bg-gradient-to-br from-canvas/50 to-transparent">
              <div className="w-12 h-12 rounded-full bg-ink flex items-center justify-center font-black text-canvas text-[12px] shadow-premium-md">
                {getFirstLetter()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-black text-ink truncate leading-tight mb-1">
                  {user?.user_metadata?.full_name || 'Premium User'}
                </p>
                <p className="text-[10px] font-bold text-mute truncate opacity-60 tracking-[0.1em] uppercase">
                  {user?.email || ''}
                </p>
              </div>
            </div>
            
            <div className="p-2.5">
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-between px-6 py-5 text-[10px] font-black uppercase tracking-[0.25em] text-mute hover:text-red-500 hover:bg-red-500/5 rounded-[1.5rem] transition-all group"
              >
                <span className="flex items-center gap-4">
                  <LogOut className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                  Sign Out
                </span>
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 opacity-0 group-hover:opacity-100 transition-opacity shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const Navbar: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const handleModalOpen = () => setIsModalOpen(true);
    const handleModalClose = () => setIsModalOpen(false);
    window.addEventListener('modalOpen', handleModalOpen);
    window.addEventListener('modalClose', handleModalClose);
    return () => {
      window.removeEventListener('modalOpen', handleModalOpen);
      window.removeEventListener('modalClose', handleModalClose);
    };
  }, []);

  const { scrollY } = useScroll();
  const lastScrollY = useRef(0);
  const scrollStopTimer = useRef<any>(null);
  const scrollThreshold = 10;

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle();
    setRole(data?.role || 'user');
  };

  useEffect(() => {
    setIsMounted(true);
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) fetchProfile(currentUser.id);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        fetchProfile(currentUser.id);
      } else {
        setRole(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    // Log user logout
    try {
      await logActivity('User Logout', 'user', user?.id || null, `User logged out`);
    } catch (logErr) {
      console.error('Failed to log user logout:', logErr);
    }

    await supabase.auth.signOut();
    
    // Clear role cookie
    document.cookie = 'sb-role=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';

    // Clear calculator states on logout
    const calculatorKeys = [
      'bmi_calculator_state',
      'bmr_calculator_state',
      'calorie_calculator_state',
      'ideal_weight_calculator_state',
      'water_intake_calculator_state',
      'body_fat_calculator_state',
      'lean_body_mass_calculator_state',
      'protein_intake_calculator_state',
      'macro_calculator_state',
      'daily_nutrition_calculator_state'
    ];
    calculatorKeys.forEach(key => sessionStorage.removeItem(key));

    window.location.replace('/login');
  };

  useMotionValueEvent(scrollY, "change", (latest) => {
    setIsScrolled(latest > 20);

    const diff = latest - lastScrollY.current;
    
    if (Math.abs(diff) > scrollThreshold) {
      if (diff > 0 && latest > 100) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
      lastScrollY.current = latest;
    }

    if (scrollStopTimer.current) clearTimeout(scrollStopTimer.current);
    scrollStopTimer.current = setTimeout(() => {
      setIsVisible(true);
    }, 400);
  });

  const [calcHref, setCalcHref] = useState('/#calculator');
  const [faqHref, setFaqHref] = useState('/#faq');
  const [howItWorksHref, setHowItWorksHref] = useState('/#how-it-works');
  const [bmiCategoriesHref, setBmiCategoriesHref] = useState('/#bmi-categories');

  const isAdmin = role === 'admin' && (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin'));

  const adminLinks = [
    { name: 'Dashboard', href: '/admin' },
  ];

  const primaryLinks = isAdmin ? adminLinks : [
    { name: 'How it works', href: howItWorksHref },
  ];

  const tertiaryLinks = isAdmin ? [] : [
    { name: 'BMI Categories', href: bmiCategoriesHref },
    { name: 'FAQ', href: faqHref },
    { name: 'Blog', href: '/blog' },
  ];

  const secondaryLinks = isAdmin ? [] : [
    { name: 'About', href: '/about' },
    { name: 'Contact', href: '/contact' },
  ];

  const authenticatedLinks = isAdmin ? [] : [
    { name: 'Tracker', href: '/tracker' },
  ];

  const toolLinks = [
    { name: 'BMI Calculator', href: '/' },
    { name: 'BMR Calculator', href: '/bmr-calculator/' },
    { name: 'Calorie Calculator', href: '/calorie-calculator/' },
    { name: 'Water Intake Calculator', href: '/water-intake-calculator/' },
    { name: 'Ideal Weight Calculator', href: '/ideal-weight-calculator/' },
    { name: 'Body Fat Calculator', href: '/body-fat-calculator/' },
    { name: 'Lean Body Mass Calculator', href: '/lean-body-mass-calculator/' },
    { name: 'Protein Intake Calculator', href: '/protein-intake-calculator/' },
    { name: 'Macro Calculator', href: '/macro-calculator/' },
    { name: 'Daily Nutrition Calculator', href: '/daily-nutrition-calculator/' },
  ];

  useEffect(() => {
    const currentPage = window.location.pathname;
    const calculatorPages = [
      '/',
      '/bmr-calculator',
      '/bmr-calculator/',
      '/calorie-calculator',
      '/calorie-calculator/',
      '/water-intake-calculator',
      '/water-intake-calculator/',
      '/ideal-weight-calculator',
      '/ideal-weight-calculator/',
      '/body-fat-calculator',
      '/body-fat-calculator/',
      '/lean-body-mass-calculator',
      '/lean-body-mass-calculator/',
      '/protein-intake-calculator',
      '/protein-intake-calculator/',
      '/macro-calculator',
      '/macro-calculator/',
      '/daily-nutrition-calculator',
      '/daily-nutrition-calculator/'
    ];
    
    const isHomePage = currentPage === '/' || currentPage === '';
    const isCalculatorPage = calculatorPages.includes(currentPage);

    if (isCalculatorPage) {
      setCalcHref('#calculator');
      setFaqHref('#faq');
    } else {
      setCalcHref('/#calculator');
      setFaqHref('/#faq');
    }

    if (isHomePage) {
      setHowItWorksHref('#how-it-works');
      setBmiCategoriesHref('#bmi-categories');
    } else {
      setHowItWorksHref('/#how-it-works');
      setBmiCategoriesHref('/#bmi-categories');
    }
  }, []);

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
      style={{ zIndex: isModalOpen ? -1 : 50 }}
      className={`h-20 sticky top-0 left-0 right-0 z-50 flex items-center transition-all duration-700 ${
        isScrolled 
          ? 'bg-canvas/60 backdrop-blur-2xl shadow-[0_10px_30px_-10px_rgba(0,0,0,0.1)]' 
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 w-full flex items-center justify-between">
        <a href={isAdmin ? "/admin" : "/"} className="flex items-center gap-2.5 group relative z-50">
          <div className="relative">
            <BrandLogo className="w-8 h-8 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3" />
            <div className="absolute inset-0 bg-primary/10 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-full" />
          </div>
          <span className="font-bold text-xl tracking-tighter text-ink leading-none">QuickBMI</span>
        </a>
        
        {/* Desktop Navigation - Premium & Spaced */}
        <div className="hidden lg:flex items-center gap-6 xl:gap-8">
          <div className="flex items-center gap-6 xl:gap-8">
            {primaryLinks.map((item) => (
              <a 
                key={item.name}
                href={item.href} 
                className="text-[13px] font-bold text-mute hover:text-ink transition-all duration-300 relative group flex items-center"
              >
                <span className="relative z-10">{item.name}</span>
                <span className="absolute -bottom-1 left-0 w-0 h-[1.5px] bg-ink/80 transition-all duration-500 cubic-bezier(0.16, 1, 0.3, 1) group-hover:w-full" />
              </a>
            ))}

            {/* Tools Dropdown - Hide for Admin */}
            {!isAdmin && (
              <div 
                className="relative group"
                onMouseEnter={() => setIsToolsOpen(true)}
                onMouseLeave={() => setIsToolsOpen(false)}
              >
                <button 
                  className={`text-[13px] font-bold transition-all duration-300 flex items-center gap-1 ${
                    isToolsOpen ? 'text-ink' : 'text-mute hover:text-ink'
                  }`}
                >
                  Tools
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${isToolsOpen ? 'rotate-180' : ''}`} />
                </button>
                
                <AnimatePresence>
                  {isToolsOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                      className="absolute top-full left-1/2 -translate-x-1/2 mt-4 w-56 bg-canvas border border-hairline rounded-2xl shadow-premium-xl overflow-hidden py-2"
                    >
                      <div className="absolute inset-x-0 -top-4 h-4 bg-transparent" />
                      {toolLinks.map((tool) => (
                        <a 
                          key={tool.name}
                          href={tool.href}
                          className="block px-5 py-3 text-[13px] font-bold text-mute hover:text-ink hover:bg-canvas-soft transition-colors first:pt-4 last:pb-4"
                        >
                          {tool.name}
                        </a>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {tertiaryLinks.map((item) => (
              <a 
                key={item.name}
                href={item.href} 
                className="text-[13px] font-bold text-mute hover:text-ink transition-all duration-300 relative group flex items-center"
              >
                <span className="relative z-10">{item.name}</span>
                <span className="absolute -bottom-1 left-0 w-0 h-[1.5px] bg-ink/80 transition-all duration-500 cubic-bezier(0.16, 1, 0.3, 1) group-hover:w-full" />
              </a>
            ))}

            {secondaryLinks.map((item) => (
              <a 
                key={item.name}
                href={item.href} 
                className="text-[13px] font-bold text-mute hover:text-ink transition-all duration-300 relative group flex items-center"
              >
                <span className="relative z-10">{item.name}</span>
                <span className="absolute -bottom-1 left-0 w-0 h-[1.5px] bg-ink/80 transition-all duration-500 cubic-bezier(0.16, 1, 0.3, 1) group-hover:w-full" />
              </a>
            ))}

            {isMounted && user && authenticatedLinks.map((item) => (
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
          
          <div className="flex items-center gap-4 xl:gap-5">
            <ThemeToggle />
            {!isAdmin && (
              <a 
                href={calcHref} 
                className="relative px-5 xl:px-6 py-2.5 bg-ink text-canvas rounded-pill text-[10px] font-black uppercase tracking-[0.15em] transition-all duration-500 hover:scale-[1.04] active:scale-[0.96] shadow-premium-md hover:shadow-premium-xl group overflow-hidden whitespace-nowrap"
              >
                <span className="relative z-10">Calculate</span>
                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-white/20 opacity-30" />
              </a>
            )}

            {isMounted ? (
              user ? (
                <ProfileDropdown user={user} handleLogout={handleLogout} />
              ) : (
                <a href="/login" className="text-[13px] font-bold text-mute hover:text-ink transition-colors px-1">Sign In</a>
              )
            ) : (
              <div className="w-8 h-8 rounded-full bg-canvas-soft animate-pulse" />
            )}
          </div>
        </div>

        {/* Mobile Toggle & Auth */}
        <div className="flex items-center gap-2 lg:hidden relative z-50">
          <ThemeToggle />
          {isMounted && user && (
            <ProfileDropdown user={user} handleLogout={handleLogout} isMobile={true} />
          )}

          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2.5 text-ink transition-all hover:bg-canvas-soft rounded-xl relative active:scale-90"
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
            key="mobile-menu-overlay"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="absolute top-0 left-0 w-full h-[100dvh] bg-canvas pt-24 px-6 lg:hidden z-40 overflow-y-auto"
          >
            <div className="flex flex-col gap-7 pb-12">
              {primaryLinks.map((item) => (
                <a 
                  key={item.name}
                  href={item.href} 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-2xl font-bold text-ink hover:text-mute transition-colors"
                >
                  {item.name}
                </a>
              ))}
              
              {!isAdmin && (
                <div className="flex flex-col gap-4 pl-5 border-l-2 border-hairline/60 my-2">
                  <span className="text-[11px] uppercase tracking-[0.2em] text-mute font-black mb-1">Tools</span>
                  {toolLinks.map((tool) => (
                    <a 
                      key={tool.name}
                      href={tool.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="text-xl font-bold text-mute hover:text-ink transition-colors"
                    >
                      {tool.name}
                    </a>
                  ))}
                </div>
              )}

              {tertiaryLinks.map((item) => (
                <a 
                  key={item.name}
                  href={item.href} 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-2xl font-bold text-ink hover:text-mute transition-colors"
                >
                  {item.name}
                </a>
              ))}

              {secondaryLinks.map((item) => (
                <a 
                  key={item.name}
                  href={item.href} 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-2xl font-bold text-ink hover:text-mute transition-colors"
                >
                  {item.name}
                </a>
              ))}

              {user && authenticatedLinks.map((item) => (
                <a 
                  key={item.name}
                  href={item.href} 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-2xl font-bold text-ink hover:text-mute transition-colors"
                >
                  {item.name}
                </a>
              ))}
              
              <div className="pt-6 border-t border-hairline flex flex-col gap-4">
                {!user && (
                  <div className="grid grid-cols-2 gap-4">
                    <a 
                      href="/login" 
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="py-4 border border-hairline text-ink rounded-pill text-center font-bold text-sm uppercase tracking-widest"
                    >
                      Sign In
                    </a>
                    <a 
                      href="/signup" 
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="py-4 bg-canvas-soft border border-hairline text-ink rounded-pill text-center font-bold text-sm uppercase tracking-widest"
                    >
                      Join Free
                    </a>
                  </div>
                )}
                {!isAdmin && (
                  <a 
                    href={calcHref} 
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="w-full py-4 bg-ink text-canvas rounded-pill text-center font-bold text-sm uppercase tracking-widest block shadow-premium-lg"
                  >
                    Calculate Now
                  </a>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
};
