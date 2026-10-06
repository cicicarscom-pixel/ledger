'use client';

import { useState } from 'react';
import { resolveAlert } from './actions';

export function AlertActions({ alertId }: { alertId: string }) {
  const [loading, setLoading] = useState(false);

  const handleResolve = async () => {
    setLoading(true);
    await resolveAlert(alertId);
    setLoading(false);
  };

  return (
    <button 
      disabled={loading} 
      onClick={handleResolve}
      className="text-xs text-primary hover:underline ml-auto shrink-0 disabled:opacity-50"
    >
      Çözüldü
    </button>
  );
}
