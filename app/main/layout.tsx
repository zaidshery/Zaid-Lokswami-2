'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/lib/store/appStore';
import Header from '../components/layout/Header';
import BottomNav from '../components/layout/BottomNav';
import MobileMenu from '../components/layout/MobileMenu';
import Footer from '../components/layout/Footer';
import LokswamiAIBot from '../components/ai/LokswamiAIBot';
import BreakingNews from '../components/content/BreakingNews';
import Container from '../components/common/Container';
import DailyEpaperAlert from '../components/notifications/DailyEpaperAlert';
import SmartEngagementPopup from '../components/notifications/SmartEngagementPopup';
import { breakingNews } from '@/lib/mock/data';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const {
    setIsMobile,
    setIsTablet,
    toggleMobileMenu,
    isMobileMenuOpen,
    setMobileMenuOpen,
    isImmersiveVideoMode,
  } = useAppStore();


  useEffect(() => {
    const checkDevice = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setIsTablet(width >= 768 && width < 1024);
    };

    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, [setIsMobile, setIsTablet]);

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 overflow-x-hidden transition-colors duration-500">
      {/* Breaking News Bar (Top) */}
      {!isImmersiveVideoMode ? <BreakingNews news={breakingNews} /> : null}

      {/* Header (below breaking bar) */}
      {!isImmersiveVideoMode ? <Header /> : null}

      {/* Mobile Menu Drawer */}
      <MobileMenu isOpen={isMobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />

      <main
        className={
          isImmersiveVideoMode
            ? 'pb-[calc(var(--bottom-nav-height)+env(safe-area-inset-bottom)+0.5rem)] pt-0 xl:pb-4'
            : 'pb-[calc(var(--bottom-nav-height)+env(safe-area-inset-bottom)+0.5rem)] pt-[8.4rem] md:pt-[9.1rem] xl:pb-4'
        }
      >
        <Container
          className={
            isImmersiveVideoMode
              ? 'py-0 !max-w-none !px-0'
              : 'py-4 md:py-5 !px-3 sm:!px-5 lg:!px-6'
          }
        >
          {children}
        </Container>
      </main>

      {/* Footer */}
      {!isImmersiveVideoMode ? (
        <div className="block">
          <Footer />
        </div>
      ) : null}

      {!isImmersiveVideoMode ? <DailyEpaperAlert /> : null}
      {!isImmersiveVideoMode ? <SmartEngagementPopup /> : null}
      {!isImmersiveVideoMode ? <LokswamiAIBot /> : null}

      {/* Bottom Navigation - Mobile + Tablet (below 1280px) */}
      <BottomNav onMenuClick={toggleMobileMenu} isMenuOpen={isMobileMenuOpen} />
    </div>
  );
}
