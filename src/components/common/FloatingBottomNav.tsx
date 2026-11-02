import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { House, Sparkle, CalendarCheck } from '@phosphor-icons/react';
import { useSiteConfig } from '@/context/SiteConfigContext';
import { slugify } from '@/lib/slugify';
import { LiquidGlass } from './LiquidGlass';

interface FloatingBottomNavProps {
  onOpenBooking?: () => void;
}

export const FloatingBottomNav: React.FC<FloatingBottomNavProps> = ({ onOpenBooking }) => {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);

  // Smooth smart scroll detection: hide on scroll down, show on scroll up
  useEffect(() => {
    const threshold = 10; // minimum scroll movement in pixels to prevent micro-flicker

    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // Always visible at the very top of the page
      if (currentScrollY <= 24) {
        setIsVisible(true);
        lastScrollY.current = currentScrollY;
        return;
      }

      const diff = currentScrollY - lastScrollY.current;

      // User scrolls down -> hide nav smoothly to reveal content and footer
      if (diff > threshold) {
        setIsVisible(false);
      }
      // User scrolls up (swipe up) -> show nav smoothly
      else if (diff < -threshold) {
        setIsVisible(true);
      }

      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const { config } = useSiteConfig();
  const currentSlug = tenantSlug || slugify(config.branding.name || 'carwash');
  const currentPath = location.pathname;
  const basePath = `/s/${currentSlug}`;

  // Exactly 3 tabs: Главная, Услуги, Моя запись.
  const navItems = [
    {
      id: 'home',
      label: 'Главная',
      icon: House,
      path: basePath,
      isActive: currentPath === basePath || currentPath === `${basePath}/`,
    },
    {
      id: 'services',
      label: 'Услуги',
      icon: Sparkle,
      path: `${basePath}#services`,
      isActive: location.hash === '#services',
      isAnchor: true,
    },
    {
      id: 'booking',
      label: 'Моя запись',
      icon: CalendarCheck,
      path: `${basePath}/my-booking`,
      isActive: currentPath.includes('/my-booking'),
    },
  ];

  const handleNavClick = (item: (typeof navItems)[0]) => {
    if (item.id === 'services' && onOpenBooking) {
      // If user clicks services, scroll to services
      const el = document.getElementById('services');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
        return;
      }
    }

    if (item.isAnchor) {
      if (currentPath !== basePath && currentPath !== `${basePath}/`) {
        navigate(item.path);
      } else {
        const el = document.getElementById('services');
        el?.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      navigate(item.path);
    }
  };

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-40 flex justify-center px-4 transition-all duration-300 ease-out ${
        isVisible
          ? 'translate-y-0 opacity-100 pointer-events-none'
          : 'translate-y-24 opacity-0 pointer-events-none'
      }`}
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 12px), 12px)' }}
    >
      <div className={`w-full max-w-sm ${isVisible ? 'pointer-events-auto' : 'pointer-events-none'}`}>
        <LiquidGlass intensity={0.25} rounded="rounded-2xl" className="p-1">
          <nav className="flex items-center justify-around" aria-label="Основная навигация">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item)}
                  className={`group relative flex flex-1 flex-col items-center justify-center py-2 px-3 rounded-xl transition-all duration-150 active:scale-95 focus:outline-none ${
                    item.isActive ? 'text-accent-blue' : 'text-[#86868B] hover:text-[#F5F5F7]'
                  }`}
                >
                  <div className="relative">
                    <Icon
                      size={22}
                      weight={item.isActive ? 'fill' : 'regular'}
                      className="transition-transform duration-150 group-hover:scale-105"
                    />
                    {item.isActive && (
                      <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-accent-blue shadow-[0_0_8px_var(--apple-accent-blue)]" />
                    )}
                  </div>
                  <span
                    className={`mt-1 text-[11px] font-sans font-medium tracking-tight ${
                      item.isActive ? 'text-[#F5F5F7] font-semibold' : 'text-[#86868B]'
                    }`}
                  >
                    {item.label}
                  </span>
                </button>
              );
            })}
          </nav>
        </LiquidGlass>
      </div>
    </div>
  );
};
