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
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className={`absolute top-full right-0 mt-3 ${
              isMobile ? 'w-[240px]' : 'w-[300px]'
            } bg-surface border border-hairline rounded-ui shadow-premium-lg overflow-hidden z-[100]`}
          >
            <div className="p-4 border-b border-hairline flex items-center gap-3">
              <div className="w-10 h-10 shrink-0 rounded-full bg-ink flex items-center justify-center font-black text-canvas text-sm shadow-premium-sm">
                {getFirstLetter()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-ink truncate max-w-[180px]">
                  {user?.user_metadata?.full_name || 'Premium User'}
                </p>
                <p className="font-mono text-mute text-xs truncate">
                  {user?.email || ''}
                </p>
              </div>
            </div>

            <div className="p-2">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-ink-soft hover:text-ink hover:bg-surface-2 rounded-ui focus-ring transition-colors"
              >
                <LogOut className="w-4 h-4 shrink-0" />
                <span>Sign Out</span>
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
  const [isMobileToolsOpen, setIsMobileToolsOpen] = useState(false);
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
        duration: 0.35, 
        ease: [0.16, 1, 0.3, 1] 
      }}
      style={{ zIndex: isModalOpen ? -1 : 50 }}
      className="sticky top-0 left-0 right-0 z-50 flex items-center h-[68px] bg-canvas/80 backdrop-blur-[14px] backdrop-saturate-[1.2] border-b border-hairline transition-all duration-500"
    >
      <div className="max-w-[1180px] mx-auto px-5 w-full flex items-center h-full">
        {/* Left: Brand Logo & Wordmark */}
        <a href={isAdmin ? "/admin" : "/"} className="flex items-center gap-2.5 group z-50 shrink-0">
          <div className="w-[34px] h-[34px] rounded-[10px] bg-ink text-canvas flex items-center justify-center font-bold text-lg select-none transition-transform duration-300 group-hover:scale-105 active:scale-95">
            B
          </div>
          <span className="font-bold tracking-[-0.03em] text-ink text-lg leading-none">QuickBMICalculator</span>
        </a>
        
        {/* Center: Links (Desktop) */}
        <div className="hidden lg:flex items-center gap-6 xl:gap-8 ml-8">
          {primaryLinks.map((item) => (
            <a 
              key={item.name}
              href={item.href} 
              className="text-sm font-medium text-ink-soft hover:text-ink transition-colors relative flex items-center"
            >
              {item.name}
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
                className={`text-sm font-medium transition-colors flex items-center gap-1 cursor-pointer ${
                  isToolsOpen ? 'text-ink' : 'text-ink-soft hover:text-ink'
                }`}
              >
                Tools
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${isToolsOpen ? 'rotate-180' : ''}`} />
              </button>
              
              <AnimatePresence>
                {isToolsOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ duration: 0.15, ease: 'easeOut' }}
                    className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-52 bg-canvas border border-hairline rounded-[12px] shadow-premium-xl overflow-hidden py-1.5 z-[100]"
                  >
                    <div className="absolute inset-x-0 -top-4 h-4 bg-transparent" />
                    {toolLinks.map((tool) => (
                      <a 
                        key={tool.name}
                        href={tool.href}
                        className="block px-4 py-2 text-sm font-medium text-ink-soft hover:text-ink hover:bg-surface-2 transition-colors"
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
              className="text-sm font-medium text-ink-soft hover:text-ink transition-colors relative flex items-center"
            >
              {item.name}
            </a>
          ))}

          {secondaryLinks.map((item) => (
            <a 
              key={item.name}
              href={item.href} 
              className="text-sm font-medium text-ink-soft hover:text-ink transition-colors relative flex items-center"
            >
              {item.name}
            </a>
          ))}

          {isMounted && user && authenticatedLinks.map((item) => (
            <a 
              key={item.name}
              href={item.href} 
              className="text-sm font-medium text-ink-soft hover:text-ink transition-colors relative flex items-center"
            >
              {item.name}
            </a>
          ))}
        </div>

        {/* Right Panel (Desktop) */}
        <div className="hidden lg:flex items-center gap-4 ml-auto">
          <ThemeToggle />

          {!isAdmin && (
            <a 
              href={calcHref} 
              className="bg-ink text-canvas rounded-full px-5 py-2.5 text-sm font-semibold hover:-translate-y-px transition-all duration-300 focus-ring cursor-pointer flex items-center justify-center shadow-premium-sm hover:shadow-premium-md shrink-0"
            >
              Calculate
            </a>
          )}

          {isMounted ? (
            user ? (
              <ProfileDropdown user={user} handleLogout={handleLogout} />
            ) : (
              <a href="/login" className="text-sm font-medium text-ink-soft hover:text-ink transition-colors px-1">Sign In</a>
            )
          ) : (
            <div className="w-14 h-5 bg-surface-2 rounded animate-pulse" />
          )}
        </div>

        {/* Mobile Toggle & Auth (Mobile only, <lg) */}
        <div className="flex items-center gap-4 lg:hidden ml-auto relative z-50">
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-1.5 text-ink transition-all hover:bg-canvas-soft rounded-lg relative active:scale-95 cursor-pointer"
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
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="absolute top-0 left-0 w-full h-[100dvh] bg-surface lg:hidden z-40 overflow-hidden shadow-premium-lg"
          >
            <div className="flex flex-col h-full">
              {/* Sticky Header */}
              <div className="shrink-0 bg-surface border-b border-hairline px-5 py-4 flex items-center justify-between">
                <a href={isAdmin ? "/admin" : "/"} onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-2.5">
                  <div className="w-[34px] h-[34px] rounded-[10px] bg-ink text-canvas flex items-center justify-center font-bold text-lg select-none">B</div>
                  <span className="font-bold tracking-[-0.03em] text-ink text-lg leading-none">QuickBMICalculator</span>
                </a>
                <div className="flex items-center gap-3">
                  <ThemeToggle />
                  <button
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="p-1.5 text-ink transition-all hover:bg-surface-2 rounded-lg relative active:scale-95 cursor-pointer"
                    aria-label="Close Menu"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {/* Scrollable Body */}
              <div className="flex-1 overflow-y-auto px-5 py-5 space-y-0.5">
                {/* Signed-in Profile Block */}
                {user && (
                  <div className="flex items-center gap-3 pb-4 mb-3 border-b border-hairline">
                    <div className="w-11 h-11 rounded-[10px] bg-ink flex items-center justify-center font-black text-canvas text-sm shrink-0">
                      {String(user?.user_metadata?.full_name || user?.email || 'U').charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-ink truncate max-w-[180px]">{user?.user_metadata?.full_name || 'Premium User'}</p>
                      <p className="font-mono text-xs text-mute truncate max-w-[180px]">{user?.email || ''}</p>
                    </div>
                  </div>
                )}

                {/* Nav Links */}
                {primaryLinks.map((item) => (
                  <a
                    key={item.name}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center w-full px-4 py-3 text-sm font-semibold text-ink rounded-xl hover:bg-surface-2 transition-colors"
                  >
                    {item.name}
                  </a>
                ))}

                {/* Tools Accordion */}
                {!isAdmin && (
                  <div>
                    <button
                      onClick={() => setIsMobileToolsOpen(!isMobileToolsOpen)}
                      className="flex items-center justify-between w-full px-4 py-3 text-sm font-semibold text-ink rounded-xl hover:bg-surface-2 transition-colors cursor-pointer"
                    >
                      <span>Tools</span>
                      <ChevronDown
                        className={`w-4 h-4 text-mute transition-transform duration-300 ease-out ${
                          isMobileToolsOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                    <div
                      className="grid transition-all duration-300 ease-out"
                      style={{
                        gridTemplateRows: isMobileToolsOpen ? '1fr' : '0fr',
                        opacity: isMobileToolsOpen ? 1 : 0,
                      }}
                    >
                      <div className="overflow-hidden">
                        <div className="pt-1 pb-2 pl-4 space-y-0.5">
                          {toolLinks.map((tool) => (
                            <a
                              key={tool.name}
                              href={tool.href}
                              onClick={() => setIsMobileMenuOpen(false)}
                              className="flex items-center w-full px-4 py-2.5 text-sm font-medium text-mute hover:text-ink rounded-xl hover:bg-surface-2 transition-colors min-h-[44px]"
                            >
                              {tool.name}
                            </a>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tertiary Links */}
                {tertiaryLinks.map((item) => (
                  <a
                    key={item.name}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center w-full px-4 py-3 text-sm font-semibold text-ink rounded-xl hover:bg-surface-2 transition-colors"
                  >
                    {item.name}
                  </a>
                ))}

                {/* Secondary Links */}
                {secondaryLinks.map((item) => (
                  <a
                    key={item.name}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center w-full px-4 py-3 text-sm font-semibold text-ink rounded-xl hover:bg-surface-2 transition-colors"
                  >
                    {item.name}
                  </a>
                ))}

                {/* Authenticated Links */}
                {user && authenticatedLinks.map((item) => (
                  <a
                    key={item.name}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center w-full px-4 py-3 text-sm font-semibold text-ink rounded-xl hover:bg-surface-2 transition-colors"
                  >
                    {item.name}
                  </a>
                ))}
              </div>

              {/* Sticky Footer */}
              <div className="shrink-0 bg-surface border-t border-hairline px-5 py-4 space-y-3">
                {user ? (
                  <button
                    onClick={() => { handleLogout(); setIsMobileMenuOpen(false); }}
                    className="flex items-center gap-3 w-full px-4 py-3 text-sm font-semibold text-red-500 dark:text-red-400 rounded-xl hover:bg-surface-2 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 shrink-0" />
                    <span>Sign Out</span>
                  </button>
                ) : (
                  <div className="flex gap-3">
                    <a
                      href="/login"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex-1 py-3 border border-hairline text-ink rounded-full text-center font-semibold text-sm hover:bg-surface-2 transition-colors"
                    >
                      Sign In
                    </a>
                    <a
                      href="/signup"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex-1 py-3 bg-accent text-white rounded-full text-center font-semibold text-sm hover:opacity-90 transition-opacity"
                    >
                      Join Free
                    </a>
                  </div>
                )}
                {!isAdmin && (
                  <a
                    href={calcHref}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center justify-center gap-2 w-full py-3.5 bg-ink text-canvas rounded-full text-[11px] font-mono font-bold uppercase tracking-[0.16em] hover:-translate-y-px transition-all duration-300"
                  >
                    Calculate Now
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
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
