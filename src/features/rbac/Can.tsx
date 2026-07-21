import type { ReactNode } from 'react';
import { useAuth } from '@/lib/auth-context';

export function Can({ permission, fallback = null, children }: { permission: string; fallback?: ReactNode; children: ReactNode }) {
  const { hasPermission } = useAuth();
  if (!hasPermission(permission)) return <>{fallback}</>;
  return <>{children}</>;
}

export function usePermission(permission: string) {
  const { hasPermission } = useAuth();
  return hasPermission(permission);
}
