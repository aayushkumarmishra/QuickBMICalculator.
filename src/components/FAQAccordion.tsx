import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus } from 'lucide-react';

interface FAQItem {
  q: string;
  a: string;
}

interface FAQAccordionProps {
  faqs: FAQItem[];
}

export const FAQAccordion: React.FC<FAQAccordionProps> = ({ faqs }) => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="w-full space-y-4 sm:space-y-6">
      {faqs.map((faq, index) => {
        const isOpen = openIndex === index;
        return (
          <div 
            key={index} 
            className="border border-hairline bg-canvas-soft/40 backdrop-blur-md rounded-2xl overflow-hidden transition-all duration-300 hover:border-hairline-strong shadow-premium-sm"
          >
            <button
              onClick={() => toggle(index)}
              className="w-full flex items-center justify-between p-6 sm:p-8 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-canvas rounded-2xl group"
              aria-expanded={isOpen}
            >
              <h3 className="text-lg sm:text-2xl font-black tracking-tight text-ink pr-8 leading-tight">
                {faq.q}
              </h3>
              <div 
                className={`w-10 h-10 rounded-full border flex items-center justify-center shrink-0 transition-all duration-500 shadow-premium-sm ${isOpen ? 'rotate-135 bg-ink text-canvas border-ink' : 'bg-canvas text-ink border-hairline group-hover:border-hairline-strong'}`}
              >
                <Plus className={`w-5 h-5 transition-transform duration-500 ${isOpen ? 'rotate-45' : ''}`} />
              </div>
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                >
                  <div className="px-6 sm:px-8 pb-6 sm:pb-8 pt-0">
                    <p className="text-base sm:text-lg text-body leading-relaxed font-medium opacity-80 pl-6 sm:pl-8 border-l-2 border-hairline-strong">
                      {faq.a}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
};
