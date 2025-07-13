import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { BottomNavigation } from './BottomNavigation';
import { MobileHeader } from './MobileHeader';

export const MobileLayout = () => {
  return (
    <div className="mobile-container">
      <MobileHeader />
      <main className="mobile-content">
        <Outlet />
      </main>
      <BottomNavigation />
    </div>
  );
};