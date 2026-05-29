'use client';

import Link from 'next/link';
import { Check, Zap, Cloud, Crown } from 'lucide-react';

const plans = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    icon: Zap,
    desc: 'Try local compression with limits',
    features: [
      'Up to 500MB per file',
      '10 jobs per day',
      '3 files per batch',
      'CPU encoding only',
      'Basic presets',
    ],
    cta: 'Current plan',
    highlight: false,
  },
  {
    id: 'premium',
    name: 'Premium',
    price: '$12/mo',
    icon: Crown,
    desc: 'Unlimited local power',
    features: [
      'Up to 50GB per file',
      'Unlimited jobs',
      '100 files per batch',
      'GPU acceleration (NVENC/QSV)',
      'AI smart presets',
      'Pause / resume / cancel',
      'Priority processing',
    ],
    cta: 'Upgrade to Premium',
    highlight: true,
  },
  {
    id: 'cloud',
    name: 'Cloud',
    price: '$29/mo',
    icon: Cloud,
    desc: 'Optional cloud compression farm',
    features: [
      'Everything in Premium',
      '100GB file limit',
      'Cloud GPU workers',
      'Batch API access',
      'Team workspaces',
      'Still optional — local default',
    ],
    cta: 'Contact sales',
    highlight: false,
  },
];

export default function PricingPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-16">
      <div className="text-center mb-14">
        <h1 className="text-4xl font-bold mb-4">Simple, honest pricing</h1>
        <p className="text-gray-400 max-w-xl mx-auto">
          Local processing is always free at heart. Pay for limits, GPU, and optional cloud — never
          to unlock your own files.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`glass p-8 flex flex-col ${
              plan.highlight ? 'ring-2 ring-indigo-500 scale-[1.02]' : ''
            }`}
          >
            <plan.icon className="w-10 h-10 text-indigo-400 mb-4" />
            <h2 className="text-2xl font-bold">{plan.name}</h2>
            <p className="text-3xl font-bold my-2">{plan.price}</p>
            <p className="text-sm text-gray-400 mb-6">{plan.desc}</p>
            <ul className="space-y-3 mb-8 flex-1">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm">
                  <Check className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>
            <Link
              href="/dashboard"
              className={plan.highlight ? 'btn-primary text-center' : 'btn-ghost border border-white/10 text-center rounded-xl py-3'}
            >
              {plan.cta}
            </Link>
          </div>
        ))}
      </div>

      <div className="mt-16 glass p-8 text-center">
        <h3 className="font-semibold text-lg mb-2">Monetization philosophy</h3>
        <p className="text-gray-400 text-sm max-w-2xl mx-auto">
          Free tier drives adoption with fair limits. Premium unlocks GPU, huge files, and AI presets.
          Cloud is optional for teams who want remote workers — your files stay encrypted in transit
          and you can always use offline local mode.
        </p>
      </div>
    </div>
  );
}
