"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { storageService } from '../../lib/storage';
import { shouldShowMaintenanceBlock } from '../../lib/portalRules';
import MaintenanceBlock from '../../components/MaintenanceBlock';

export default function HomeRoutePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isBlocked, setIsBlocked] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      const [settings, forms] = await Promise.all([
        storageService.getSettings(),
        storageService.getForms(),
      ]);

      if (shouldShowMaintenanceBlock(settings, forms)) {
        setIsBlocked(true);
      } else {
        router.replace('/');
      }
      setIsLoading(false);
    };
    loadData();
  }, [router]);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: 'var(--bg-app)' }}>
        <p style={{ color: 'var(--text-muted)' }}>Cargando...</p>
      </div>
    );
  }

  if (isBlocked) {
    return <MaintenanceBlock />;
  }

  return null;
}
