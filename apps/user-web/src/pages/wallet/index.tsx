import { useState } from 'react'
import { api } from '../../services/api'
import { usePageVisible } from '../../hooks/usePageVisible'
import { useToast } from '../../hooks/useToast'

const WALLET_LABEL: Record<string, string> = {
  HEALTH_COIN: 'HealthCoin',
  MUTUAL_HEALTH_COIN: 'MutualCoin',
  UNIVERSAL_HEALTH_COIN: 'UniversalCoin',
}

const WALLET_COLOR: Record<string, string> = {
  HEALTH_COIN: '#1677ff',
  MUTUAL_HEALTH_COIN: '#52c41a',
  UNIVERSAL_HEALTH_COIN: '#722ed1',
}

const TX_LABEL: Record<string, string> = {
  ORDER_REWARD: 'Purchase Reward',
  REFERRAL_L1_REWARD: 'Referral Reward (Direct)',
  REFERRAL_L2_REWARD: 'Referral Reward (L2)',
  REGIONAL_REWARD: 'Regional Reward',
  ORDER_PAYMENT: 'Payment',
  WITHDRAWAL: 'Withdrawal',
  REFUND: 'Refund',
  ADMIN_ADJUSTMENT: 'Admin Adjustment',
}

const TX_CREDIT_TYPES = new Set([
  'ORDER_REWARD',
  'REFERRAL_L1_REWARD',
  'REFERRAL_L2_REWARD',
  'REGIONAL_REWARD',
  'REFUND',
])

type PayoutMethod = 'BANK' | 'ALIPAY' | 'WECHAT'

const PAYOUT_LABELS: Record<PayoutMethod, string> = {
  BANK: 'Bank Transfer',
  ALIPAY: 'Alipay',
  WECHAT: 'WeChat Pay',
}

export default function WalletPage() {
  const [wallets, setWallets] = useState<any[]>([])
  const [transactions, setTransactions] = useState<any[]>([])
  const [selectedWallet, setSelectedWallet] = useState<string>('HEALTH_COIN')
  const WALLET_TYPES = ['HEALTH_COIN', 'MUTUAL_HEALTH_COIN', 'UNIVERSAL_HEALTH_COIN'] as const
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const { showToast } = useToast()

  // Withdrawal modal state
  const [withdrawStep, setWithdrawStep] = useState<0 | 1 | 2>(0) // 0=closed 1=method+account 2=amount
  const [payoutMethod, setPayoutMethod] = useState<PayoutMethod>('ALIPAY')
  const [accountNumber, setAccountNumber] = useState('')
  const [accountName, setAccountName] = useState('')
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const fetchWallets = async () => {
    const res: any = await api.getWallets()
    setWallets(res ?? [])
  }

  const fetchTransactions = async (reset = true) => {
    setLoading(true)
    const nextPage = reset ? 1 : page
    try {
      const res: any = await api.getTransactions({ walletType: selectedWallet, page: nextPage, limit: 20 })
      const items = res.data ?? []
      setTransactions(reset ? items : (prev) => [...prev, ...items])
      setHasMore(items.length === 20)
      if (!reset) setPage(nextPage + 1)
      else setPage(2)
    } catch {}
    finally { setLoading(false) }
  }

  usePageVisible(() => {
    fetchWallets()
    fetchTransactions()
  })

  const handleWalletSwitch = (type: string) => {
    setSelectedWallet(type)
    setPage(1)
    setTransactions([])
    fetchTransactionsByType(type)
  }

  const fetchTransactionsByType = async (type: string) => {
    setLoading(true)
    try {
      const res: any = await api.getTransactions({ walletType: type, page: 1, limit: 20 })
      setTransactions(res.data ?? [])
      setHasMore((res.data ?? []).length === 20)
      setPage(2)
    } catch {}
    finally { setLoading(false) }
  }

  const openWithdrawal = () => {
    setPayoutMethod('ALIPAY')
    setAccountNumber('')
    setAccountName('')
    setWithdrawAmount('')
    setWithdrawStep(1)
  }

  const submitWithdrawal = async () => {
    const amount = parseFloat(withdrawAmount)
    if (!amount || amount <= 0) {
      showToast('Enter a valid amount', 'info')
      return
    }
    if (!accountNumber.trim()) {
      showToast('Enter account number', 'info')
      return
    }
    setSubmitting(true)
    try {
      const payoutAccount = payoutMethod === 'BANK'
        ? { accountNumber: accountNumber.trim(), accountName: accountName.trim() }
        : { account: accountNumber.trim(), name: accountName.trim() }
      await api.requestWithdrawal({
        payoutMethod,
        payoutAccount,
        amount: Math.round(amount * 100),
      })
      setWithdrawStep(0)
      showToast('Request submitted', 'success')
    } catch (err: any) {
      showToast(err || 'Failed to submit', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const healthCoinWallet = wallets.find((w: any) => w.walletType === 'HEALTH_COIN')
  const totalCoins = wallets.reduce((sum: number, w: any) => sum + Number(w.balance ?? 0), 0)

  return (
    <div style={{ background: '#f5f5f5', minHeight: '100vh', paddingBottom: '20px' }}>
      {/* Balance cards */}
      <div style={{ background: 'linear-gradient(135deg, #1677ff 0%, #4096ff 100%)', padding: '20px 16px 28px' }}>
        <div style={{ fontSize: '14px', color: 'rgba(255,255,255,.8)', marginBottom: '8px' }}>
          Total HealthCoin Balance
        </div>
        <div style={{ display: 'inline', fontSize: '36px', fontWeight: 'bold', color: '#fff' }}>
          {(Number(healthCoinWallet?.balance ?? 0) / 100).toFixed(2)}
        </div>
        <span style={{ fontSize: '13px', color: 'rgba(255,255,255,.7)' }}> HC</span>

        {/* Mini progress bars for each wallet type */}
        {totalCoins > 0 && (
          <div style={{ marginTop: '16px' }}>
            {WALLET_TYPES.map((type) => {
              const wallet = wallets.find((w: any) => w.walletType === type)
              const balance = Number(wallet?.balance ?? 0)
              const pct = totalCoins > 0 ? Math.round((balance / totalCoins) * 100) : 0
              return (
                <div key={type} style={{ marginBottom: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                    <span style={{ fontSize: '11px', color: 'rgba(255,255,255,.75)' }}>{WALLET_LABEL[type]}</span>
                    <span style={{ fontSize: '11px', color: 'rgba(255,255,255,.75)' }}>{pct}%</span>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,.2)', borderRadius: '3px', height: '4px' }}>
                    <div style={{ background: '#fff', height: '4px', borderRadius: '3px', width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Wallet type tabs */}
      <div style={{ background: '#fff', display: 'flex', borderBottom: '1px solid #f0f0f0', marginTop: '-1px' }}>
        {WALLET_TYPES.map((type) => {
          const wallet = wallets.find((w: any) => w.walletType === type)
          return (
            <div
              key={type}
              onClick={() => handleWalletSwitch(type)}
              style={{
                flex: 1, padding: '12px 8px', textAlign: 'center',
                borderBottom: selectedWallet === type ? '2px solid #1677ff' : '2px solid transparent', cursor: 'pointer',
              }}
            >
              <div style={{ fontSize: '12px', color: '#999' }}>{WALLET_LABEL[type]}</div>
              <div style={{ fontSize: '16px', fontWeight: 'bold', color: WALLET_COLOR[type] }}>
                {(Number(wallet?.balance ?? 0) / 100).toFixed(2)}
              </div>
            </div>
          )
        })}
      </div>

      {/* Withdrawal button for MutualCoin */}
      {selectedWallet === 'MUTUAL_HEALTH_COIN' && (
        <div style={{ background: '#fff', padding: '12px 16px', borderBottom: '1px solid #f0f0f0' }}>
          <div
            onClick={openWithdrawal}
            style={{ background: '#52c41a', borderRadius: '8px', padding: '10px', textAlign: 'center', cursor: 'pointer' }}
          >
            <div style={{ color: '#fff', fontSize: '14px', fontWeight: 500 }}>Request Withdrawal</div>
          </div>
        </div>
      )}

      {/* Withdrawal modal — step 1: payout method + account */}
      {withdrawStep === 1 && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 100, display: 'flex', alignItems: 'flex-end' }}>
          <div style={{ background: '#fff', width: '100%', borderRadius: '16px 16px 0 0', padding: '24px 16px' }}>
            <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '4px' }}>Withdrawal</div>
            <div style={{ fontSize: '12px', color: '#999', marginBottom: '20px' }}>Reviewed within 3 business days · 5% commission deducted</div>

            {/* Payout method selector */}
            <div style={{ fontSize: '13px', color: '#666', marginBottom: '8px' }}>Payout Method</div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              {(['ALIPAY', 'WECHAT', 'BANK'] as PayoutMethod[]).map((m) => (
                <div
                  key={m}
                  onClick={() => setPayoutMethod(m)}
                  style={{
                    flex: 1, padding: '10px 4px', borderRadius: '8px', textAlign: 'center',
                    border: `2px solid ${payoutMethod === m ? '#52c41a' : '#e8e8e8'}`,
                    background: payoutMethod === m ? '#f6ffed' : '#fff', cursor: 'pointer',
                  }}
                >
                  <div style={{ fontSize: '12px', color: payoutMethod === m ? '#52c41a' : '#666', fontWeight: payoutMethod === m ? 'bold' : 'normal' }}>
                    {PAYOUT_LABELS[m]}
                  </div>
                </div>
              ))}
            </div>

            {/* Account number */}
            <div style={{ fontSize: '13px', color: '#666', marginBottom: '6px' }}>
              {payoutMethod === 'BANK' ? 'Bank Account Number' : `${PAYOUT_LABELS[payoutMethod]} Account`}
            </div>
            <div style={{ border: '1px solid #e8e8e8', borderRadius: '8px', padding: '10px 12px', marginBottom: '12px' }}>
              <input
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder={payoutMethod === 'BANK' ? 'Card number' : 'Phone / account ID'}
                style={{ width: '100%', fontSize: '14px', border: 'none', outline: 'none' }}
              />
            </div>

            {/* Account name */}
            <div style={{ fontSize: '13px', color: '#666', marginBottom: '6px' }}>Account Name</div>
            <div style={{ border: '1px solid #e8e8e8', borderRadius: '8px', padding: '10px 12px', marginBottom: '20px' }}>
              <input
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder="Real name on account"
                style={{ width: '100%', fontSize: '14px', border: 'none', outline: 'none' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <div onClick={() => setWithdrawStep(0)} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #d9d9d9', textAlign: 'center', cursor: 'pointer' }}>
                <div style={{ color: '#666', fontSize: '14px' }}>Cancel</div>
              </div>
              <div
                onClick={() => {
                  if (!accountNumber.trim()) { showToast('Enter account number', 'info'); return }
                  setWithdrawStep(2)
                }}
                style={{ flex: 2, padding: '12px', borderRadius: '8px', background: '#52c41a', textAlign: 'center', cursor: 'pointer' }}
              >
                <div style={{ color: '#fff', fontSize: '14px', fontWeight: 500 }}>Next</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Withdrawal modal — step 2: amount */}
      {withdrawStep === 2 && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 100, display: 'flex', alignItems: 'flex-end' }}>
          <div style={{ background: '#fff', width: '100%', borderRadius: '16px 16px 0 0', padding: '24px 16px' }}>
            <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '4px' }}>Withdrawal Amount</div>
            <div style={{ fontSize: '12px', color: '#999', marginBottom: '20px' }}>
              To: {PAYOUT_LABELS[payoutMethod]} · {accountNumber}
            </div>

            <div style={{ fontSize: '13px', color: '#666', marginBottom: '6px' }}>Amount (MHC)</div>
            <div style={{ border: '1px solid #e8e8e8', borderRadius: '8px', padding: '10px 12px', marginBottom: '8px', display: 'flex', alignItems: 'center' }}>
              <span style={{ fontSize: '18px', color: '#52c41a', marginRight: '6px' }}>¥</span>
              <input
                type="number"
                step="0.01"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder="0.00"
                style={{ flex: 1, fontSize: '18px', fontWeight: 'bold', border: 'none', outline: 'none' }}
              />
            </div>
            <div style={{ fontSize: '11px', color: '#fa8c16', marginBottom: '20px' }}>
              5% commission fee will be deducted from the withdrawal amount
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <div onClick={() => setWithdrawStep(1)} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #d9d9d9', textAlign: 'center', cursor: 'pointer' }}>
                <div style={{ color: '#666', fontSize: '14px' }}>Back</div>
              </div>
              <div
                onClick={submitting ? undefined : submitWithdrawal}
                style={{ flex: 2, padding: '12px', borderRadius: '8px', background: submitting ? '#ccc' : '#52c41a', textAlign: 'center', cursor: submitting ? 'not-allowed' : 'pointer' }}
              >
                <div style={{ color: '#fff', fontSize: '14px', fontWeight: 500 }}>{submitting ? 'Submitting...' : 'Submit Request'}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transaction history */}
      <div style={{ margin: '12px 0' }}>
        <div style={{ fontSize: '14px', color: '#666', padding: '0 16px 8px' }}>
          Transaction History
        </div>
        <div
          style={{ overflowY: 'auto' }}
          onScroll={(e) => {
            const target = e.currentTarget
            if (target.scrollTop + target.clientHeight >= target.scrollHeight - 50) {
              if (hasMore && !loading) fetchTransactions(false)
            }
          }}
        >
          {transactions.length === 0 && !loading && (
            <div style={{ textAlign: 'center', padding: '60px 24px' }}>
              <div style={{ fontSize: '36px', marginBottom: '12px' }}>&#128196;</div>
              <div style={{ fontSize: '15px', color: '#999', marginBottom: '4px' }}>No transactions yet</div>
              <div style={{ fontSize: '13px', color: '#bbb' }}>Your transaction history will appear here</div>
            </div>
          )}
          {transactions.map((tx: any) => {
            const isCredit = TX_CREDIT_TYPES.has(tx.txType) || Number(tx.amount) > 0
            return (
              <div
                key={tx.id}
                style={{ background: '#fff', marginBottom: '1px', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <div style={{
                      padding: '2px 8px', borderRadius: '10px',
                      background: isCredit ? '#f6ffed' : '#fff1f0',
                      border: `1px solid ${isCredit ? '#b7eb8f' : '#ffa39e'}`,
                    }}>
                      <span style={{ fontSize: '11px', color: isCredit ? '#52c41a' : '#ff4d4f', fontWeight: 500 }}>
                        {isCredit ? 'Credit' : 'Debit'}
                      </span>
                    </div>
                    <span style={{ fontSize: '14px', color: '#333' }}>
                      {TX_LABEL[tx.txType] ?? tx.txType}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#bbb' }}>{tx.createdAt?.slice(0, 16).replace('T', ' ')}</div>
                  {tx.note && <div style={{ fontSize: '11px', color: '#999' }}>{tx.note}</div>}
                </div>
                <div style={{
                  fontSize: '15px', fontWeight: 'bold',
                  color: isCredit ? '#52c41a' : '#ff4d4f',
                }}>
                  {isCredit ? '+' : ''}{(Number(tx.amount) / 100).toFixed(2)}
                </div>
              </div>
            )
          })}
          {loading && (
            <div style={{ textAlign: 'center', padding: '16px' }}>
              <div style={{ color: '#bbb' }}>Loading...</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
