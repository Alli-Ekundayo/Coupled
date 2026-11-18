import { useState } from 'react';

interface PricingSectionProps {
  onSelectPlan: () => void;
  onContactSales: () => void;
}

type BillingCycle = 'monthly' | 'annual';

interface PricingTier {
  id: string;
  name: string;
  monthlyPrice: string;
  annualPrice: string;
  unit: string;
  summary: string;
  features: string[];
  ctaLabel: string;
  variant: 'primary' | 'secondary';
  action: 'upload' | 'contact';
}

const PRICING_TIERS: PricingTier[] = [
  {
    id: 'starter',
    name: 'Starter',
    monthlyPrice: '$0',
    annualPrice: '$0',
    unit: 'per month',
    summary: 'For individual engineers testing prototypes and open-source hardware.',
    features: [
      'Up to 4 copper layers',
      '3 board layouts per month',
      'Standard DRC rule presets',
      'One-click KiCad export',
    ],
    ctaLabel: 'Start free',
    variant: 'secondary',
    action: 'upload',
  },
  {
    id: 'pro',
    name: 'Pro',
    monthlyPrice: '$49',
    annualPrice: '$39',
    unit: 'per seat / month',
    summary: 'For hardware teams shipping multi-layer production boards every week.',
    features: [
      'Unlimited layers and boards',
      'Impedance & differential pair tuning',
      'Custom fab-house rule decks',
      'KiCad + Gerber + IPC-2581 export',
    ],
    ctaLabel: 'Get started',
    variant: 'primary',
    action: 'upload',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    monthlyPrice: 'Custom',
    annualPrice: 'Custom',
    unit: 'annual contract',
    summary: 'For organizations needing air-gapped runners and custom EDA pipelines.',
    features: [
      'On-premise or VPC deployment',
      'Custom component library sync',
      'Dedicated layout engineering SLA',
      'SSO and audit logging',
    ],
    ctaLabel: 'Contact sales',
    variant: 'secondary',
    action: 'contact',
  },
];

export function PricingSection({
  onSelectPlan,
  onContactSales,
}: PricingSectionProps) {
  const [billing, setBilling] = useState<BillingCycle>('annual');

  return (
    <section
      id="pricing"
      aria-labelledby="pricing-heading"
      className="relative z-20 w-full border-t border-[var(--color-fg)] px-3 sm:px-5 lg:px-6"
    >
      <div className="w-full border-x border-[var(--color-fg)] px-5 py-16 md:px-10 md:py-24 lg:px-14 lg:py-28">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="font-mono-label text-xs font-medium uppercase tracking-[0.16em] text-[var(--color-fg)]">
              PRICING
            </p>
            <h2
              id="pricing-heading"
              className="font-display mt-4 max-w-[18ch] text-[clamp(1.75rem,3vw,2.75rem)] font-bold leading-[1.1] tracking-[-0.02em] text-[var(--color-fg)] [text-wrap:balance]"
            >
              Predictable pricing per engineering seat.
            </h2>
          </div>

          <div
            role="group"
            aria-label="Billing cycle"
            className="inline-flex w-fit border border-[var(--color-fg)] p-1"
          >
            <button
              type="button"
              aria-pressed={billing === 'monthly'}
              onClick={() => setBilling('monthly')}
              className={`rounded-[5px] px-4 py-2 text-xs font-medium transition-colors ${
                billing === 'monthly'
                  ? 'bg-[var(--color-fg)] text-[var(--color-bg)]'
                  : 'bg-transparent text-[var(--color-fg)] hover:bg-[var(--color-green)] hover:text-[var(--color-cream)]'
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              aria-pressed={billing === 'annual'}
              onClick={() => setBilling('annual')}
              className={`rounded-[5px] px-4 py-2 text-xs font-medium transition-colors ${
                billing === 'annual'
                  ? 'bg-[var(--color-fg)] text-[var(--color-bg)]'
                  : 'bg-transparent text-[var(--color-fg)] hover:bg-[var(--color-green)] hover:text-[var(--color-cream)]'
              }`}
            >
              Annual (-20%)
            </button>
          </div>
        </div>

        <div className="mt-12 grid grid-cols-1 divide-y divide-[var(--color-fg)] border border-[var(--color-fg)] lg:grid-cols-3 lg:divide-x lg:divide-y-0">
          {PRICING_TIERS.map((tier) => {
            const price =
              billing === 'annual' ? tier.annualPrice : tier.monthlyPrice;

            return (
              <div
                key={tier.id}
                className="flex flex-col justify-between p-6 md:p-8"
              >
                <div>
                  <p className="font-mono-label text-xs font-medium uppercase tracking-[0.14em] text-[var(--color-fg)]">
                    {tier.name}
                  </p>
                  <div className="mt-4 flex items-baseline gap-2">
                    <span className="font-display text-4xl font-bold tracking-[-0.03em] text-[var(--color-fg)]">
                      {price}
                    </span>
                    <span className="text-xs text-[var(--color-fg)]">
                      {tier.unit}
                    </span>
                  </div>
                  <p className="mt-4 text-[13px] leading-[1.65] text-[var(--color-fg)]">
                    {tier.summary}
                  </p>

                  <ul className="mt-6 flex flex-col divide-y divide-[var(--color-fg)] border-t border-[var(--color-fg)]">
                    {tier.features.map((feature) => (
                      <li
                        key={feature}
                        className="py-3 text-[13px] text-[var(--color-fg)]"
                      >
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={
                    tier.action === 'upload' ? onSelectPlan : onContactSales
                  }
                  className={`${
                    tier.variant === 'primary' ? 'btn-primary' : 'btn-secondary'
                  } mt-8 w-full px-5 py-3 text-[13px] font-medium`}
                >
                  {tier.ctaLabel}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
