import React from 'react';
import { BrandLogo } from './BrandLogo';
import { X, Send, ArrowUpRight } from 'lucide-react';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  const socialLinks = [
    { 
      name: 'X (Twitter)', 
      href: 'https://x.com/AyushMishra', 
      icon: <X className="w-5 h-5" /> 
    },
    { 
      name: 'GitHub', 
      href: 'https://github.com/aayushkumarmishra', 
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" title="GitHub">
          <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.28 1.15-.28 2.35 0 3.5-.73 1.02-1.08 2.25-1 3.5 0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/>
        </svg>
      )
    },
    { 
      name: 'Telegram', 
      href: 'https://t.me/+3NlArnuptl8yZGRl', 
      icon: <Send className="w-5 h-5" /> 
    },
    { 
      name: 'LinkedIn', 
      href: 'https://www.linkedin.com/in/ayush-kumar-m-558b631b0', 
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect width="4" height="12" x="2" y="9"/><circle cx="4" cy="4" r="2"/>
        </svg>
      )
    },
  ];

  const quickLinks = [
    { name: 'BMI Calculator', href: '/#calculator' },
    { name: 'How it Works', href: '/#how-it-works' },
    { name: 'BMI Categories', href: '/#bmi-categories' },
    { name: 'FAQ', href: '/#faq' },
  ];

  const legalLinks = [
    { name: 'WHO Guidelines', href: 'https://www.who.int/data/gho/data/themes/topics/topic-details/GHO/body-mass-index', external: true },
    { name: 'About Us', href: '/about' },
    { name: 'Contact Us', href: '/contact' },
    { name: 'Privacy Policy', href: '/privacy-policy' },
    { name: 'Terms of Use', href: '/terms-and-conditions' },
  ];

  return (
    <footer className="bg-canvas border-t border-hairline pt-12 pb-12 lg:pt-16 lg:pb-16 relative z-10">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-x-8 gap-y-12 lg:gap-16 mb-12 lg:mb-16">
          
          {/* LEFT SIDE: Brand & Social */}
          <div className="md:col-span-2 lg:col-span-5 space-y-6 min-w-0">
            <a href="/" className="inline-flex items-center gap-3 group">
              <BrandLogo className="w-10 h-10 transition-transform duration-500 group-hover:rotate-6 group-hover:scale-110" variant="ink" />
              <div className="flex flex-col">
                <span className="font-black text-xl tracking-tighter text-ink leading-tight">QuickBMI</span>
                <span className="text-[9px] font-mono font-bold text-status-healthy/90 uppercase tracking-widest">Real-time BMI Engine</span>
              </div>
            </a>
            <div className="space-y-6">
              <p className="text-mute text-sm leading-relaxed max-w-md font-medium">
                Professional BMI analysis platform for accurate body measurement insights. Empowering wellness through precision analytics.
              </p>
              <div className="flex flex-wrap gap-3">
                {socialLinks.map((social) => (
                  <a
                    key={social.name}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative w-10 h-10 flex items-center justify-center rounded-xl bg-canvas-soft border border-hairline text-mute hover:text-ink hover:border-hairline-strong transition-all duration-500 shadow-premium-sm hover:shadow-premium-md hover:-translate-y-1 active:scale-95 group"
                    aria-label={social.name}
                  >
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-ink text-canvas text-[9px] font-mono font-bold rounded-md opacity-0 group-hover:opacity-100 group-hover:-top-10 transition-all duration-500 pointer-events-none whitespace-nowrap shadow-premium-lg z-20">
                      {social.name}
                      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-ink rotate-45" />
                    </div>
                    <span className="transition-transform duration-500 group-hover:scale-105 relative z-10 scale-90">
                      {social.icon}
                    </span>
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* CENTER: Quick Links */}
          <div className="lg:col-span-3 space-y-6 min-w-0">
            <h4 className="text-[10px] font-mono font-bold text-mute uppercase tracking-[0.3em]">Quick Links</h4>
            <ul className="space-y-4">
              {quickLinks.map((link) => (
                <li key={link.name}>
                  <a 
                    href={link.href} 
                    className="text-sm font-bold text-ink/60 hover:text-ink transition-colors duration-200"
                  >
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* RIGHT SIDE: Scientific / Legal */}
          <div className="lg:col-span-4 space-y-6 min-w-0">
            <h4 className="text-[10px] font-mono font-bold text-mute uppercase tracking-[0.3em]">Scientific & Legal</h4>
            <ul className="space-y-4">
              {legalLinks.map((link) => (
                <li key={link.name}>
                  <a 
                    href={link.href} 
                    target={link.external ? "_blank" : undefined}
                    rel={link.external ? "noopener noreferrer" : undefined}
                    className="group flex items-center text-sm font-bold text-ink/60 hover:text-ink transition-colors duration-200"
                  >
                    {link.name}
                    {link.external && <ArrowUpRight className="w-3 h-3 ml-1.5 opacity-0 group-hover:opacity-100 transition-all -translate-y-0.5" />}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Row */}
        <div className="pt-8 border-t border-hairline/50 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-[10px] font-mono font-bold text-mute uppercase tracking-[0.1em] text-center md:text-left">
            © {currentYear} QuickBMI · Built by <span className="text-ink">Ayush Mishra</span>
          </div>
          <div className="text-[10px] font-mono font-bold text-mute uppercase tracking-[0.1em] opacity-60 text-center md:text-right">
            WHO Compliant • Privacy First • Real-Time Analysis
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
