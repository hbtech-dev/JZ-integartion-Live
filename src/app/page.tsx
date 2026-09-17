'use client';

import React, { useState } from 'react';
import {
  Smartphone,
  CreditCard,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  Copy,
  Check,
  ArrowRight,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';

interface Transaction {
  id: string;
  txnRefNo: string;
  amount: number;
  mobileNumber: string;
  status: 'SUCCESS' | 'FAILED';
  message: string;
  timestamp: string;
}

export default function JazzCashCheckoutPage() {
  // Input states
  const [mobileNumber, setMobileNumber] = useState('03111982255');
  const [amount, setAmount] = useState('500');

  // Status & UI states
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState('');
  const [activeChip, setActiveChip] = useState('500');
  const [copiedRef, setCopiedRef] = useState(false);

  // Modals & Panels
  const [receipt, setReceipt] = useState<any | null>(null);

  // Transactions History
  const [history, setHistory] = useState<Transaction[]>([]);

  // Quick Amount presets
  const quickAmounts = ['100', '500', '1000', '2500', '5000'];

  // Detect Carrier
  const getCarrierInfo = (num: string) => {
    const cleaned = num.replace(/[^0-9]/g, '');
    const prefix = cleaned.startsWith('92') ? '0' + cleaned.substring(2, 5) : cleaned.substring(0, 4);

    if (['0300', '0301', '0302', '0303', '0304', '0305', '0306', '0307', '0308', '0309'].includes(prefix)) {
      return { name: 'Jazz', color: '#ff5500' };
    }
    if (['0320', '0321', '0322', '0323', '0324', '0325'].includes(prefix)) {
      return { name: 'Warid (Jazz)', color: '#ff5500' };
    }
    if (['0310', '0311', '0312', '0313', '0314', '0315', '0316', '0317', '0318'].includes(prefix)) {
      return { name: 'Zong', color: '#84cc16' };
    }
    if (['0340', '0341', '0342', '0343', '0344', '0345', '0346', '0347', '0348', '0349'].includes(prefix)) {
      return { name: 'Telenor', color: '#0ea5e9' };
    }
    if (['0331', '0332', '0333', '0334', '0335', '0336', '0337'].includes(prefix)) {
      return { name: 'Ufone', color: '#f97316' };
    }
    return { name: 'Mobile', color: '#94a3b8' };
  };

  const carrier = getCarrierInfo(mobileNumber);

  const handleChipClick = (val: string) => {
    setAmount(val);
    setActiveChip(val);
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAmount(e.target.value);
    setActiveChip(e.target.value);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2000);
  };

  // Main Payment Action
  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mobileNumber || !amount) return;

    setIsProcessing(true);
    setProcessingStep('Connecting to JazzCash...');

    try {
      const response = await fetch('/api/jazzcash/mwallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mobileNumber,
          amount: parseFloat(amount),
        }),
      });

      const data = await response.json();
      setReceipt(data);

      // Add to history
      const newTxn: Transaction = {
        id: Date.now().toString(),
        txnRefNo: data.txnRefNo || `T-${Date.now()}`,
        amount: parseFloat(amount),
        mobileNumber,
        status: data.success ? 'SUCCESS' : 'FAILED',
        message: data.message,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      };

      setHistory((prev) => [newTxn, ...prev]);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Network error occurred';
      setReceipt({
        success: false,
        message: errorMsg,
        amount: parseFloat(amount),
        txnRefNo: 'ERR-' + Date.now().toString().slice(-6),
      });
    } finally {
      setIsProcessing(false);
      setProcessingStep('');
    }
  };

  // Redirect to JazzCash portal if needed
  const handleOpenHostedPortal = async () => {
    setIsProcessing(true);
    setProcessingStep('Opening JazzCash portal...');
    try {
      const res = await fetch('/api/jazzcash/hosted', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mobileNumber,
          amount: parseFloat(amount),
        }),
      });
      const data = await res.json();
      if (data.success && data.postUrl) {
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = data.postUrl;
        Object.entries(data.payload).forEach(([k, v]) => {
          if (v !== undefined && v !== null && v !== '') {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = k;
            input.value = String(v);
            form.appendChild(input);
          }
        });
        document.body.appendChild(form);
        form.submit();
      }
    } catch {
      setIsProcessing(false);
      setProcessingStep('');
    }
  };

  return (
    <main style={{ minHeight: '100vh', padding: '32px 16px 60px' }}>
      <div style={{ maxWidth: '880px', margin: '0 auto' }}>
        
        {/* Header */}
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '32px',
            paddingBottom: '20px',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '12px',
                background: 'var(--jazz-gradient)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 20px rgba(255, 85, 0, 0.35)',
                fontWeight: '800',
                fontSize: '1.4rem',
                color: '#fff',
                letterSpacing: '-1px',
              }}
            >
              JC
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h1 style={{ fontSize: '1.3rem', fontWeight: '700', letterSpacing: '-0.02em' }}>
                  JazzCash Payment
                </h1>
                <span className="badge badge-success">Live Account</span>
              </div>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                Merchant: MC990543 • Direct Mobile Checkout
              </p>
            </div>
          </div>
        </header>

        {/* Main Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '24px',
            alignItems: 'start',
          }}
        >
          {/* Simple One-Card Checkout */}
          <section className="glass-panel" style={{ padding: '32px 28px' }}>
            <div style={{ marginBottom: '24px' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#fff' }}>
                Enter Phone & Amount
              </h2>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Enter your JazzCash mobile number to proceed with payment.
              </p>
            </div>

            <form onSubmit={handleSubmitPayment}>
              {/* Phone Number Input */}
              <div className="form-group">
                <label className="form-label" htmlFor="phone-input">
                  <span>Phone Number</span>
                  <span
                    style={{
                      fontSize: '0.78rem',
                      color: carrier.color,
                      fontWeight: '600',
                      background: 'rgba(255,255,255,0.06)',
                      padding: '2px 8px',
                      borderRadius: '6px',
                    }}
                  >
                    {carrier.name}
                  </span>
                </label>
                <div className="input-container">
                  <span className="input-icon">
                    <Smartphone size={19} />
                  </span>
                  <input
                    id="phone-input"
                    type="tel"
                    className="form-input"
                    placeholder="03001234567"
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value)}
                    required
                    maxLength={13}
                  />
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '0.78rem',
                    color: 'var(--text-muted)',
                    marginTop: '2px',
                  }}
                >
                  <span>Format: 03XXXXXXXXX</span>
                  <span>11 digits</span>
                </div>
              </div>

              {/* Amount Input */}
              <div className="form-group">
                <label className="form-label" htmlFor="amount-input">
                  <span>Amount (PKR)</span>
                </label>
                <div className="input-container">
                  <span className="input-icon">
                    <CreditCard size={19} />
                  </span>
                  <input
                    id="amount-input"
                    type="number"
                    min="1"
                    step="any"
                    className="form-input"
                    placeholder="500"
                    value={amount}
                    onChange={handleAmountChange}
                    required
                  />
                  <span
                    style={{
                      position: 'absolute',
                      right: '16px',
                      fontWeight: '700',
                      color: 'var(--jazz-orange)',
                      fontSize: '0.95rem',
                      pointerEvents: 'none',
                    }}
                  >
                    PKR
                  </span>
                </div>

                {/* Quick Selection Chips */}
                <div className="chips-grid">
                  {quickAmounts.map((q) => (
                    <button
                      key={q}
                      type="button"
                      className={`chip-btn ${activeChip === q ? 'active' : ''}`}
                      onClick={() => handleChipClick(q)}
                    >
                      Rs. {parseInt(q).toLocaleString()}
                    </button>
                  ))}
                  <button
                    type="button"
                    className={`chip-btn ${!quickAmounts.includes(activeChip) ? 'active' : ''}`}
                    onClick={() => {
                      const custom = prompt('Enter amount in PKR:', '1500');
                      if (custom && !isNaN(parseFloat(custom))) {
                        setAmount(custom);
                        setActiveChip(custom);
                      }
                    }}
                  >
                    Custom...
                  </button>
                </div>
              </div>

              {/* Pay Action Button */}
              <button
                type="submit"
                disabled={isProcessing || !mobileNumber || !amount}
                className="btn-jazz"
                style={{ width: '100%', padding: '16px 24px', fontSize: '1.1rem', marginTop: '10px' }}
              >
                {isProcessing ? (
                  <>
                    <RefreshCw size={20} className="animate-spin" />
                    <span>Processing Payment...</span>
                  </>
                ) : (
                  <>
                    <span>Pay PKR {amount ? parseFloat(amount).toLocaleString() : '0'}</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>

              {/* Live Processing Step Note */}
              {isProcessing && (
                <div
                  className="animate-fade-in"
                  style={{
                    marginTop: '14px',
                    textAlign: 'center',
                    fontSize: '0.84rem',
                    color: 'var(--jazz-orange)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                  }}
                >
                  <Clock size={15} className="animate-spin" />
                  <span>{processingStep}</span>
                </div>
              )}

              {/* Security Guarantee Note */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  marginTop: '20px',
                  fontSize: '0.8rem',
                  color: 'var(--text-muted)',
                }}
              >
                <ShieldCheck size={16} color="#10b981" />
                <span>HMAC-SHA256 Encrypted JazzCash Live Gateway</span>
              </div>
            </form>
          </section>

          {/* Right Column: Information & History */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Quick Info Card */}
            <section className="glass-panel" style={{ padding: '24px' }}>
              <h3
                style={{
                  fontSize: '1rem',
                  fontWeight: '600',
                  marginBottom: '12px',
                  color: '#fff',
                }}
              >
                Payment Instructions
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                1. Enter your active 11-digit JazzCash mobile number.<br />
                2. Enter the amount and click <strong>Pay</strong>.<br />
                3. You will receive an MPIN prompt on your mobile screen to confirm the transaction.
              </p>
            </section>

            {/* Session Transactions History */}
            <section className="glass-panel" style={{ padding: '24px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '16px',
                }}
              >
                <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#fff' }}>
                  Transactions
                </h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {history.length} logged
                </span>
              </div>

              {history.length === 0 ? (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '24px 12px',
                    color: 'var(--text-muted)',
                    fontSize: '0.85rem',
                  }}
                >
                  <Clock size={28} style={{ opacity: 0.4, margin: '0 auto 8px' }} />
                  <p>No transactions yet.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '280px', overflowY: 'auto' }}>
                  {history.map((t) => (
                    <div
                      key={t.id}
                      style={{
                        padding: '12px',
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-sm)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span
                            style={{
                              fontSize: '0.85rem',
                              fontWeight: '600',
                              color: t.status === 'SUCCESS' ? '#34d399' : '#f87171',
                            }}
                          >
                            PKR {t.amount.toLocaleString()}
                          </span>
                          <span
                            style={{
                              fontSize: '0.7rem',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              background: t.status === 'SUCCESS' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                              color: t.status === 'SUCCESS' ? '#34d399' : '#f87171',
                            }}
                          >
                            {t.status}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '3px' }}>
                          Ref: {t.txnRefNo} • {t.mobileNumber}
                        </div>
                        {t.message && (
                          <div
                            style={{
                              fontSize: '0.72rem',
                              color: t.status === 'SUCCESS' ? '#34d399' : '#fca5a5',
                              marginTop: '3px',
                              lineHeight: 1.3,
                            }}
                          >
                            {t.message}
                          </div>
                        )}
                      </div>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {t.timestamp}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>

          </div>
        </div>

        {/* Transaction Receipt Modal */}
        {receipt && (
          <div className="modal-backdrop" onClick={() => setReceipt(null)}>
            <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                {receipt.success ? (
                  <div
                    style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '50%',
                      background: 'rgba(16, 185, 129, 0.15)',
                      border: '2px solid rgba(16, 185, 129, 0.4)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 12px',
                    }}
                  >
                    <CheckCircle2 size={36} color="#10b981" />
                  </div>
                ) : (
                  <div
                    style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '50%',
                      background: 'rgba(239, 68, 68, 0.15)',
                      border: '2px solid rgba(239, 68, 68, 0.4)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 12px',
                    }}
                  >
                    <AlertCircle size={36} color="#ef4444" />
                  </div>
                )}

                <h3 style={{ fontSize: '1.4rem', fontWeight: '700', color: '#fff' }}>
                  {receipt.success ? 'Payment Successful' : 'Transaction Not Completed'}
                </h3>
                <p
                  style={{
                    fontSize: '0.88rem',
                    color: receipt.success ? '#34d399' : '#f87171',
                    marginTop: '4px',
                  }}
                >
                  {receipt.message}
                </p>
              </div>

              {/* Receipt Data Table */}
              <div
                style={{
                  background: 'rgba(0,0,0,0.35)',
                  borderRadius: 'var(--radius-md)',
                  padding: '16px',
                  marginBottom: '20px',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  fontSize: '0.88rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Amount</span>
                  <strong style={{ color: '#fff', fontSize: '1rem' }}>
                    PKR {receipt.amount ? receipt.amount.toLocaleString() : amount}
                  </strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Transaction Ref</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <code style={{ color: 'var(--jazz-orange)', fontSize: '0.85rem' }}>
                      {receipt.txnRefNo || 'N/A'}
                    </code>
                    <button
                      onClick={() => handleCopy(receipt.txnRefNo || '')}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        padding: '2px',
                      }}
                      title="Copy Reference"
                    >
                      {copiedRef ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>

                {receipt.responseCode && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Response Code</span>
                    <span style={{ color: receipt.success ? '#10b981' : '#ef4444', fontWeight: '600' }}>
                      {receipt.responseCode}
                    </span>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Mobile</span>
                  <span style={{ color: '#fff' }}>{receipt.mobileNumber || mobileNumber}</span>
                </div>
              </div>

              {/* If connection failed due to localhost firewall, offer 1-click fallback */}
              {!receipt.success && receipt.message?.includes('ECONNRESET') && (
                <div
                  style={{
                    padding: '12px',
                    background: 'rgba(255, 85, 0, 0.1)',
                    border: '1px solid rgba(255, 85, 0, 0.3)',
                    borderRadius: 'var(--radius-sm)',
                    marginBottom: '16px',
                    fontSize: '0.8rem',
                    color: '#fdba74',
                    lineHeight: 1.4,
                  }}
                >
                  <strong>Notice:</strong> JazzCash live production requires IP whitelisting for direct server calls. You can either deploy to Vercel/server, or click below to complete via the JazzCash portal:
                  <button
                    onClick={() => {
                      setReceipt(null);
                      handleOpenHostedPortal();
                    }}
                    className="btn-jazz"
                    style={{ width: '100%', marginTop: '10px', padding: '10px', fontSize: '0.9rem' }}
                  >
                    <ExternalLink size={15} />
                    Complete via JazzCash Portal
                  </button>
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => setReceipt(null)}
                  className="btn-outline"
                  style={{ flex: 1, padding: '12px', justifyContent: 'center' }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
