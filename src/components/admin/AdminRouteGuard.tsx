import React, { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { getClinicianSession } from '../../lib/clinicianAuth';

interface AdminRouteGuardProps {
  children: React.ReactNode;
}

const ADMIN_ROLES = ['ADMIN', 'SUPER_ADMIN', 'HOSPITAL_ADMIN'];

export function AdminRouteGuard({ children }: AdminRouteGuardProps) {
  const [, setLocation] = useLocation();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(() => {
    const session = getClinicianSession();
    if (!session || !session.access_token || !ADMIN_ROLES.includes(session.role.toUpperCase())) {
      return false;
    }
    return true;
  });

  useEffect(() => {
    const session = getClinicianSession();
    const authorized = Boolean(
      session &&
      session.access_token &&
      ADMIN_ROLES.includes(session.role.toUpperCase())
    );

    setIsAuthorized(authorized);

    if (!authorized) {
      setLocation('/admin/login');
    }
  }, [setLocation]);

  // If unauthorized, do not render any protected admin UI
  if (isAuthorized === false) {
    return null;
  }

  // Brief initial evaluation state (prevents flash of admin content)
  if (isAuthorized === null) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-teal-500 border-t-transparent animate-spin" />
          <span className="text-xs font-mono tracking-wider uppercase text-slate-500">
            Verifying Admin Authorization...
          </span>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export default AdminRouteGuard;
