'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';
import { checkApiHealth } from '@/lib/api';

export function ApiStatusBanner() {
  const [online, setOnline] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);

  const probe = async () => {
    setChecking(true);
    const ok = await checkApiHealth();
    setOnline(ok);
    setChecking(false);
  };

  useEffect(() => {
    probe();
    const interval = setInterval(probe, 10000);
    return () => clearInterval(interval);
  }, []);

  if (online === null) return null;

  if (online) {
    return (
      <div className="mx-4 mt-4 max-w-6xl lg:mx-auto flex items-center gap-2 text-sm text-green-400/90 glass px-4 py-2 rounded-xl border-green-500/20">
        <CheckCircle2 className="w-4 h-4 shrink-0" />
        <span>API connected — uploads enabled</span>
      </div>
    );
  }

  return (
    <div className="mx-4 mt-4 max-w-6xl lg:mx-auto glass px-4 py-3 rounded-xl border-amber-500/30 bg-amber-500/10">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-start gap-2 text-amber-200 text-sm flex-1">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Compression API offline</p>
            <p className="text-amber-200/80 mt-1">
              Uploads require the backend on port 4000. In the project folder run:{' '}
              <code className="bg-black/30 px-1.5 py-0.5 rounded text-xs">npm run dev</code>{' '}
              (starts web + API) or in a second terminal:{' '}
              <code className="bg-black/30 px-1.5 py-0.5 rounded text-xs">
                npm run dev -w @ultra/backend
              </code>
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={probe}
          disabled={checking}
          className="btn-ghost text-sm flex items-center gap-2 shrink-0 border border-amber-500/30"
        >
          <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
          Retry
        </button>
      </div>
    </div>
  );
}
