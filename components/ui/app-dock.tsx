'use client';

import { Home, User, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Dock from '@/components/ui/dock';

export default function AppDock() {
  const router = useRouter();

  return (
    <Dock
      items={[
        {
          label: 'Dashboard',
          icon: <Home size={20} />,
          onClick: () => router.push('/dashboard'),
        },
        {
          label: 'Add Client',
          icon: <Plus size={20} />,
          onClick: () => router.push('/clients/new'),
        },
        {
          label: 'Clients',
          icon: <User size={20} />,
          onClick: () => router.push('/clients'),
        },
      ]}
    />
  );
}
