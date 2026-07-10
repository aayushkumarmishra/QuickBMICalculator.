import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';

interface Option {
  value: string;
  label: string;
  desc?: string;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  label?: string;
  className?: string;
  variant?: 'default' | 'chip';
}

export const Select: React.FC<SelectProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Select option',
  label,
  className = '',
  variant = 'default'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [searchQuery, setSearchQuery] = useState('');
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0, placement: 'bottom' as 'top' | 'bottom', maxHeight: '240px' });

  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<any>(null);

  // Generate unique ID for ARIA accessibility
  const internalId = React.useId ? React.useId() : 'select-' + Math.random().toString(36).substr(2, 9);
  const uniqueId = internalId.replace(/:/g, ''); // Clean colon tags for ID compliance

  const selectedOption = options.find(o => o.value === value);

  // Position, Flip, and Clamp Calculations
  const updateCoords = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const menuHeight = menuRef.current ? menuRef.current.offsetHeight : (options.length * 52 + 16);
      
      const spaceBelow = window.innerHeight - rect.bottom - 16; // 16px safety margin
      const spaceAbove = rect.top - 16;
      
      let placement: 'top' | 'bottom' = 'bottom';
      let maxHeight = '240px';
      let top = rect.bottom + window.scrollY;

      if (spaceBelow < menuHeight && spaceAbove > spaceBelow) {
        placement = 'top';
        top = rect.top - menuHeight + window.scrollY;
        maxHeight = `${Math.min(spaceAbove, 240)}px`;
      } else {
        placement = 'bottom';
        maxHeight = `${Math.min(spaceBelow, 240)}px`;
      }

      // If it's a chip, let the menu have a minimum width to display options fully
      const width = variant === 'chip' ? Math.max(rect.width, 120) : rect.width;

      setCoords({
        top,
        left: rect.left + window.scrollX,
        width,
        placement,
        maxHeight
      });
    }
  };

  useEffect(() => {
    if (isOpen) {
      updateCoords();
      // Measure again next frame once menu is rendered to update coordinates with actual height
      requestAnimationFrame(() => {
        updateCoords();
      });
      window.addEventListener('resize', updateCoords);
      window.addEventListener('scroll', updateCoords, true);
    }
    return () => {
      window.removeEventListener('resize', updateCoords);
      window.removeEventListener('scroll', updateCoords, true);
    };
  }, [isOpen, options.length]);

  // Scroll active option into view
  useEffect(() => {
    if (isOpen && activeIndex >= 0) {
      const activeEl = document.getElementById(`${uniqueId}-opt-${activeIndex}`);
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [activeIndex, isOpen, uniqueId]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isOpen &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node) &&
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Keyboard navigation & Type-ahead
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        setIsOpen(true);
        const idx = options.findIndex(o => o.value === value);
        setActiveIndex(idx >= 0 ? idx : 0);
      }
      return;
    }

    // Type-Ahead Logic
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      clearTimeout(searchTimeoutRef.current);
      const nextQuery = searchQuery + e.key.toLowerCase();
      setSearchQuery(nextQuery);

      searchTimeoutRef.current = setTimeout(() => {
        setSearchQuery('');
      }, 1000);

      const matchIdx = options.findIndex(o => 
        o.label.toLowerCase().startsWith(nextQuery)
      );
      if (matchIdx >= 0) {
        setActiveIndex(matchIdx);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex(prev => (prev + 1) % options.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex(prev => (prev - 1 + options.length) % options.length);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < options.length) {
          onChange(options[activeIndex].value);
          setIsOpen(false);
          triggerRef.current?.focus();
        }
        break;
      case 'Escape':
        setIsOpen(false);
        triggerRef.current?.focus();
        break;
      case 'Tab':
        // Let standard tab flow exit naturally without double handling trigger focus
        setIsOpen(false);
        break;
      case 'Home':
        e.preventDefault();
        setActiveIndex(0);
        break;
      case 'End':
        e.preventDefault();
        setActiveIndex(options.length - 1);
        break;
      default:
        break;
    }
  };

  const triggerClass = variant === 'chip'
    ? `w-full bg-transparent pl-1 pr-6 py-2 text-[10px] font-mono font-bold text-mute dark:text-mute/90 uppercase tracking-widest focus:outline-none focus:text-ink dark:focus:text-white transition-all cursor-pointer h-full flex items-center justify-between select-none relative focus-ring rounded ${className}`
    : `w-full bg-canvas border-[1.5px] border-hairline rounded-ui h-14 px-5 pr-12 text-left text-xs sm:text-sm font-mono font-bold uppercase tracking-[0.08em] text-ink dark:text-[#f5f5f5] focus:outline-none focus:border-accent focus:ring-[3px] focus:ring-accent-wash hover:border-hairline-strong transition-all shadow-premium-sm flex items-center justify-between focus-ring cursor-pointer select-none ${className}`;

  return (
    <div className="relative w-full">
      <button
        id={`${uniqueId}-trigger`}
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={isOpen ? `${uniqueId}-menu` : undefined}
        aria-activedescendant={isOpen && activeIndex >= 0 ? `${uniqueId}-opt-${activeIndex}` : undefined}
        aria-label={label}
        onKeyDown={handleKeyDown}
        onClick={() => setIsOpen(!isOpen)}
        className={triggerClass}
      >
        <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
        {variant === 'chip' ? (
          <ChevronDown className="absolute right-0.5 top-1/2 -translate-y-1/2 w-2.5 h-2.5 text-mute pointer-events-none" />
        ) : (
          <ChevronDown className={`w-4 h-4 text-mute transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
        )}
      </button>

      {isOpen && createPortal(
        <div
          id={`${uniqueId}-menu`}
          ref={menuRef}
          role="listbox"
          aria-labelledby={`${uniqueId}-trigger`}
          style={{
            position: 'absolute',
            top: coords.placement === 'top' ? `${coords.top - 8}px` : `${coords.top + 8}px`,
            left: `${coords.left}px`,
            width: `${coords.width}px`,
            maxHeight: coords.maxHeight,
            zIndex: 9999
          }}
          className={`bg-canvas border border-hairline rounded-ui shadow-premium-xl overflow-hidden animate-fade-in py-1.5 focus:outline-none overflow-y-auto ${coords.placement === 'top' ? 'origin-bottom' : 'origin-top'}`}
        >
          {options.map((opt, i) => {
            const isSelected = opt.value === value;
            const isActive = i === activeIndex;
            return (
              <div
                id={`${uniqueId}-opt-${i}`}
                key={opt.value}
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                  triggerRef.current?.focus();
                }}
                onMouseEnter={() => setActiveIndex(i)}
                className={`px-5 py-3 cursor-pointer transition-colors flex flex-col gap-0.5 select-none ${
                  isSelected 
                    ? 'bg-accent-wash/30 dark:bg-accent/20 text-ink dark:text-[#f5f5f5]' 
                    : isActive 
                      ? 'bg-surface-2 text-ink dark:text-[#f5f5f5]' 
                      : 'text-mute hover:text-ink dark:hover:text-[#f5f5f5]'
                }`}
              >
                <div className="flex justify-between items-center w-full">
                  <span className="text-xs sm:text-sm font-mono font-bold uppercase tracking-[0.08em]">{opt.label}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-accent" />}
                </div>
                {opt.desc && (
                  <span className="text-[10px] font-sans font-medium text-mute/70 normal-case leading-tight">{opt.desc}</span>
                )}
              </div>
            );
          })}
        </div>,
        document.body
      )}
    </div>
  );
};
