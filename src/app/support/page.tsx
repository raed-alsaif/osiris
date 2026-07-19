// ─────────────────────────────────────────────────────────────
// RUPES OSINT — Support Page
// Drop this file into the OSIRIS Vercel fork at:
//   app/support/page.tsx   (Next.js App Router)
// Route: https://osiris.raedalsaif.com/support
// ─────────────────────────────────────────────────────────────

'use client';

import { useState } from 'react';

const WALLETS = [
  {
    asset: 'USDT',
    network: 'TRC20 (Tron)',
    address: 'TR9gmh6wx51aEugnGzwagEmzTHuo1J6Sjw',
    note: 'Lowest fees. Send only USDT on the Tron (TRC20) network.',
  },
] as const;

const TOKENS = {
  bg: '#0B0F14',
  panel: '#10161D',
  panelHi: '#141C25',
  border: '#1E2836',
  gold: '#D4A84A',
  goldDim: 'rgba(212,168,74,0.14)',
  ink: '#E6E9EE',
  inkDim: '#8A96A6',
  danger: '#FF6C6C',
};

export default function SupportPage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        background: TOKENS.bg,
        color: TOKENS.ink,
        fontFamily:
          'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Inter, sans-serif',
        padding: '48px 20px 96px',
      }}
    >
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <div style={{ marginBottom: 32 }}>
          <div
            style={{
              fontSize: 11,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: TOKENS.gold,
              marginBottom: 12,
            }}
          >
            RUPES OSINT · Support
          </div>
          <h1
            style={{
              fontSize: 34,
              fontWeight: 700,
              letterSpacing: '-0.02em',
              margin: 0,
              lineHeight: 1.15,
            }}
          >
            Support RUPES OSINT
          </h1>
          <p
            style={{
              color: TOKENS.inkDim,
              fontSize: 15,
              lineHeight: 1.6,
              marginTop: 14,
              maxWidth: 560,
            }}
          >
            RUPES OSINT is an independent, non-commercial intelligence
            collection and visualization platform. Contributions fund
            infrastructure, data feeds, and continued open development.
          </p>
        </div>

        <section
          style={{
            background: TOKENS.panel,
            border: `1px solid ${TOKENS.border}`,
            borderRadius: 14,
            padding: 24,
            marginBottom: 20,
          }}
        >
          <div
            style={{
              fontSize: 11,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: TOKENS.gold,
              marginBottom: 18,
            }}
          >
            Accepted Assets
          </div>

          {WALLETS.map((w) => (
            <WalletRow key={w.asset + w.network} wallet={w} />
          ))}
        </section>

        <section
          style={{
            background: TOKENS.panel,
            border: `1px solid ${TOKENS.border}`,
            borderRadius: 14,
            padding: 20,
            marginBottom: 20,
          }}
        >
          <div
            style={{
              fontSize: 11,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: TOKENS.danger,
              marginBottom: 10,
            }}
          >
            Before You Send
          </div>
          <ul
            style={{
              margin: 0,
              paddingLeft: 18,
              color: TOKENS.inkDim,
              fontSize: 14,
              lineHeight: 1.7,
            }}
          >
            <li>
              Send only the exact asset on the exact network shown. Wrong-network
              transfers are unrecoverable.
            </li>
            <li>Contributions are non-refundable and non-tax-deductible.</li>
            <li>
              RUPES OSINT does not issue tokens, securities, or investment
              instruments.
            </li>
          </ul>
        </section>

        <div
          style={{
            textAlign: 'center',
            color: TOKENS.inkDim,
            fontSize: 12,
            marginTop: 40,
          }}
        >
          <a
            href="/"
            style={{
              color: TOKENS.gold,
              textDecoration: 'none',
              borderBottom: `1px solid ${TOKENS.goldDim}`,
              paddingBottom: 2,
            }}
          >
            ← Back to RUPES OSINT
          </a>
        </div>
      </div>
    </main>
  );
}

function WalletRow({
  wallet,
}: {
  wallet: { asset: string; network: string; address: string; note: string };
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(wallet.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* noop */
    }
  };

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&bgcolor=10161D&color=E6E9EE&margin=8&data=${encodeURIComponent(
    wallet.address,
  )}`;

  return (
    <div
      style={{
        background: TOKENS.panelHi,
        border: `1px solid ${TOKENS.border}`,
        borderRadius: 12,
        padding: 20,
        display: 'grid',
        gridTemplateColumns: '180px 1fr',
        gap: 20,
        alignItems: 'center',
      }}
    >
      <img
        src={qrUrl}
        alt={`${wallet.asset} ${wallet.network} QR code`}
        width={180}
        height={180}
        style={{
          borderRadius: 8,
          border: `1px solid ${TOKENS.border}`,
          background: TOKENS.panel,
          display: 'block',
        }}
      />

      <div style={{ minWidth: 0 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 10,
            marginBottom: 6,
          }}
        >
          <span style={{ fontSize: 20, fontWeight: 700 }}>{wallet.asset}</span>
          <span
            style={{
              fontSize: 11,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: TOKENS.gold,
              background: TOKENS.goldDim,
              padding: '3px 8px',
              borderRadius: 999,
            }}
          >
            {wallet.network}
          </span>
        </div>

        <div
          style={{
            color: TOKENS.inkDim,
            fontSize: 12.5,
            lineHeight: 1.55,
            marginBottom: 12,
          }}
        >
          {wallet.note}
        </div>

        <div
          style={{
            background: TOKENS.bg,
            border: `1px solid ${TOKENS.border}`,
            borderRadius: 8,
            padding: '10px 12px',
            fontFamily:
              'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace',
            fontSize: 12.5,
            wordBreak: 'break-all',
            color: TOKENS.ink,
            marginBottom: 10,
          }}
        >
          {wallet.address}
        </div>

        <button
          onClick={copy}
          style={{
            appearance: 'none',
            cursor: 'pointer',
            background: copied ? TOKENS.gold : 'transparent',
            color: copied ? TOKENS.bg : TOKENS.gold,
            border: `1px solid ${TOKENS.gold}`,
            borderRadius: 8,
            padding: '8px 14px',
            fontSize: 12.5,
            fontWeight: 600,
            letterSpacing: '0.04em',
            transition: 'all 0.15s ease',
          }}
        >
          {copied ? '✓ Copied' : 'Copy address'}
        </button>
      </div>
    </div>
  );
}
