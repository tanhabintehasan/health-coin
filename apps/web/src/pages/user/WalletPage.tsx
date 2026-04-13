import { useEffect, useState } from 'react'
import { api } from '../../services/api'
import { message, Spin, Empty } from 'antd'
import { useResponsive } from '../../hooks/useResponsive'

const WALLET_LABEL: Record<string, string> = {
  HEALTH_COIN: 'HealthCoin', MUTUAL_HEALTH_COIN: 'MutualCoin', UNIVERSAL_HEALTH_COIN: 'UniversalCoin',
}

const WALLET_COLOR: Record<string, string> = {
  HEALTH_COIN: '#1677ff', MUTUAL_HEALTH_COIN: '#52c41a', UNIVERSAL_HEALTH_COIN: '#722ed1',
}

const TX_LABEL: Record<string, string> = {
  ORDER_REWARD: 'Purchase Reward', REFERRAL_L1_REWARD: 'Referral Reward (Direct)', REFERRAL_L2_REWARD: 'Referral Reward (L2)',
  REGIONAL_REWARD: 'Regional Reward', ORDER_PAYMENT: 'Payment', WITHDRAWAL: 'Withdrawal', REFUND: 'Refund', ADMIN_ADJUSTMENT: 'Admin Adjustment',
}

const TX_CREDIT_TYPES = new Set(['ORDER_REWARD', 'REFERRAL_L1_REWARD', 'REFERRAL_L2_REWARD', 'REGIONAL_REWARD', 'REFUND'])

type PayoutMethod = 'BANK' | 'ALIPAY' | 'WECHAT'

const PAYOUT_LABELS: Record<PayoutMethod, string> = { BANK: 'Bank Transfer', ALIPAY: 'Alipay', WECHAT: 'WeChat Pay' }

export default function WalletPage() {
  const [wallets, setWallets] = useState<any[]>([])
  const [transactions, setTransactions] = useState<any[]>([])
  const [selectedWallet, setSelectedWallet] = useState<string>('HEALTH_COIN')
  const WALLET_TYPES = ['HEALTH_COIN', 'MUTUAL_HEALTH_COIN', 'UNIVERSAL_HEALTH_COIN'] as const
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  const [withdrawStep, setWithdrawStep] = useState<0 | 1 | 2>(0)
  const [payoutMethod, setPayoutMethod] = useState<PayoutMethod>('ALIPAY')
  const [accountNumber, setAccountNumber] = useState('')
  const [accountName, setAccountName] = useState('')
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { isMobile } = useResponsive()

  const fetchWallets = async () => {
    const res: any = await api.getWallets()
    setWallets(res ?? [])
  }

  const fetchTransactions = async (reset = true, type = selectedWallet) => {
    setLoading(true)
    const nextPage = reset ? 1 : page
    try {
      const res: any = await api.getTransactions({ walletType: type, page: nextPage, limit: 20 })
      const items = res.data ?? []
      setTransactions(reset ? items : (prev) => [...prev, ...items])
      setHasMore(items.length === 20)
      if (!reset) setPage(nextPage + 1)
      else setPage(2)
    } catch {}
    finally { setLoading(false) }
  }

  useEffect(() => {
    fetchWallets()
    fetchTransactions(true, 'HEALTH_COIN')
  }, [])

  const handleWalletSwitch = (type: string) => {
    setSelectedWallet(type)
    setPage(1)
    setTransactions([])
    fetchTransactions(true, type)
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
    if (!amount || amount <= 0) { message.info('Enter a valid amount'); return }
    if (!accountNumber.trim()) { message.info('Enter account number'); return }
    setSubmitting(true)
    try {
      const payoutAccount = payoutMethod === 'BANK'
        ? { accountNumber: accountNumber.trim(), accountName: accountName.trim() }
        : { account: accountNumber.trim(), name: accountName.trim() }
      await api.requestWithdrawal({ payoutMethod, payoutAccount, amount: Math.round(amount * 100) })
      setWithdrawStep(0)
      message.success('Request submitted')
    } catch (err: any) { message.error(err || 'Failed to submit') } finally { setSubmitting(false) }
  }

  const healthCoinWallet = wallets.find((w: any) => w.walletType === 'HEALTH_COIN')
  const totalCoins = wallets.reduce((sum: number, w: any) => sum + Number(w.balance ?? 0), 0)

  const sheetPadding = isMobile ? '20px 16px calc(20px + env(safe-area-inset-bottom))' : '24px 16px'

  return (
    <div style={{ minHeight: '100%' }}>
      <div style={{ background: 'linear-gradient(135deg, #1677ff 0%, #4096ff 100%)', padding: '20px 16px 28px' }}>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,.8)', marginBottom: 8 }}>Total HealthCoin Balance</div>
        <div style={{ display: 'inline', fontSize: 36, fontWeight: 'bold', color: '#fff' }}>{(Number(healthCoinWallet?.balance ?? 0) / 100).toFixed(2)}</div>
        <span style={{ fontSize: 13, color: 'rgba(255,255,255,.7)' }}> HC</span>
        {totalCoins > 0 && (
          <div style={{ marginTop: 16 }}>
            {WALLET_TYPES.map((type) => {
              const wallet = wallets.find((w: any) => w.walletType === type)
              const balance = Number(wallet?.balance ?? 0)
              const pct = totalCoins > 0 ? Math.round((balance / totalCoins) * 100) : 0
              return (
                <div key={type} style={{ marginBottom: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,.75)' }}>{WALLET_LABEL[type]}</span>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,.75)' }}>{pct}%</span>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,.2)', borderRadius: 3, height: 4 }}>
                    <div style={{ background: '#fff', height: 4, borderRadius: 3, width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div style={{ background: '#fff', display: 'flex', borderBottom: '1px solid #f0f0f0' }}>
        {WALLET_TYPES.map((type) => {
          const wallet = wallets.find((w: any) => w.walletType === type)
          return (
            <div key={type} onClick={() => handleWalletSwitch(type)} style={{ flex: 1, padding: '12px 8px', textAlign: 'center', borderBottom: selectedWallet === type ? '2px solid #1677ff' : '2px solid transparent', cursor: 'pointer' }}>
              <div style={{ fontSize: 12, color: '#999' }}>{WALLET_LABEL[type]}</div>
              <div style={{ fontSize: 16, fontWeight: 'bold', color: WALLET_COLOR[type] }}>{(Number(wallet?.balance ?? 0) / 100).toFixed(2)}</div>
            </div>
          )
        })}
      </div>

      {selectedWallet === 'MUTUAL_HEALTH_COIN' && (
        <div style={{ background: '#fff', padding: '12px 16px', borderBottom: '1px solid #f0f0f0' }}>
          <div onClick={openWithdrawal} style={{ background: '#52c41a', borderRadius: 8, padding: 10, textAlign: 'center', cursor: 'pointer' }}>
            <div style={{ color: '#fff', fontSize: 14, fontWeight: 500 }}>Request Withdrawal</div>
          </div>
        </div>
      )}

      {withdrawStep === 1 && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 100, display: 'flex', alignItems: 'flex-end' }}>
          <div style={{ background: '#fff', width: '100%', borderRadius: '16px 16px 0 0', padding: sheetPadding }}>
            <div style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 4 }}>Withdrawal</div>
            <div style={{ fontSize: 12, color: '#999', marginBottom: 20 }}>Reviewed within 3 business days · 5% commission deducted</div>
            <div style={{ fontSize: 13, color: '#666', marginBottom: 8 }}>Payout Method</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              {(['ALIPAY', 'WECHAT', 'BANK'] as PayoutMethod[]).map((m) => (
                <div key={m} onClick={() => setPayoutMethod(m)} style={{ flex: 1, padding: '10px 4px', borderRadius: 8, textAlign: 'center', border: `2px solid ${payoutMethod === m ? '#52c41a' : '#e8e8e8'}`, background: payoutMethod === m ? '#f6ffed' : '#fff', cursor: 'pointer' }}>
                  <div style={{ fontSize: 12, color: payoutMethod === m ? '#52c41a' : '#666', fontWeight: payoutMethod === m ? 'bold' : 'normal' }}>{PAYOUT_LABELS[m]}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 13, color: '#666', marginBottom: 6 }}>{payoutMethod === 'BANK' ? 'Bank Account Number' : `${PAYOUT_LABELS[payoutMethod]} Account`}</div>
            <div style={{ border: '1px solid #e8e8e8', borderRadius: 8, padding: '10px 12px', marginBottom: 12 }}>
              <input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} placeholder={payoutMethod === 'BANK' ? 'Card number' : 'Phone / account ID'} style={{ width: '100%', fontSize: 14, border: 'none', outline: 'none' }} />
            </div>
            <div style={{ fontSize: 13, color: '#666', marginBottom: 6 }}>Account Name</div>
            <div style={{ border: '1px solid #e8e8e8', borderRadius: 8, padding: '10px 12px', marginBottom: 20 }}>
              <input value={accountName} onChange={(e) => setAccountName(e.target.value)} placeholder="Real name on account" style={{ width: '100%', fontSize: 14, border: 'none', outline: 'none' }} />
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <div onClick={() => setWithdrawStep(0)} style={{ flex: 1, padding: 12, borderRadius: 8, border: '1px solid #d9d9d9', textAlign: 'center', cursor: 'pointer' }}><div style={{ color: '#666', fontSize: 14 }}>Cancel</div></div>
              <div onClick={() => { if (!accountNumber.trim()) { message.info('Enter account number'); return } setWithdrawStep(2) }} style={{ flex: 2, padding: 12, borderRadius: 8, background: '#52c41a', textAlign: 'center', cursor: 'pointer' }}><div style={{ color: '#fff', fontSize: 14, fontWeight: 500 }}>Next</div></div>
            </div>
          </div>
        </div>
      )}

      {withdrawStep === 2 && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 100, display: 'flex', alignItems: 'flex-end' }}>
          <div style={{ background: '#fff', width: '100%', borderRadius: '16px 16px 0 0', padding: sheetPadding }}>
            <div style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 4 }}>Withdrawal Amount</div>
            <div style={{ fontSize: 12, color: '#999', marginBottom: 20 }}>To: {PAYOUT_LABELS[payoutMethod]} · {accountNumber}</div>
            <div style={{ fontSize: 13, color: '#666', marginBottom: 6 }}>Amount (MHC)</div>
            <div style={{ border: '1px solid #e8e8e8', borderRadius: 8, padding: '10px 12px', marginBottom: 8, display: 'flex', alignItems: 'center' }}>
              <span style={{ fontSize: 18, color: '#52c41a', marginRight: 6 }}>¥</span>
              <input type="number" step="0.01" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} placeholder="0.00" style={{ flex: 1, fontSize: 18, fontWeight: 'bold', border: 'none', outline: 'none' }} />
            </div>
            <div style={{ fontSize: 11, color: '#fa8c16', marginBottom: 20 }}>5% commission fee will be deducted from the withdrawal amount</div>
            <div style={{ display: 'flex', gap: 12 }}>
              <div onClick={() => setWithdrawStep(1)} style={{ flex: 1, padding: 12, borderRadius: 8, border: '1px solid #d9d9d9', textAlign: 'center', cursor: 'pointer' }}><div style={{ color: '#666', fontSize: 14 }}>Back</div></div>
              <div onClick={submitting ? undefined : submitWithdrawal} style={{ flex: 2, padding: 12, borderRadius: 8, background: submitting ? '#ccc' : '#52c41a', textAlign: 'center', cursor: submitting ? 'not-allowed' : 'pointer' }}>
                <div style={{ color: '#fff', fontSize: 14, fontWeight: 500 }}>{submitting ? 'Submitting...' : 'Submit Request'}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={{ margin: '12px 0' }}>
        <div style={{ fontSize: 14, color: '#666', padding: '0 16px 8px' }}>Transaction History</div>
        <div style={{ overflowY: 'auto' }} onScroll={(e) => { const target = e.currentTarget; if (target.scrollTop + target.clientHeight >= target.scrollHeight - 50) { if (hasMore && !loading) fetchTransactions(false) } }}>
          {transactions.length === 0 && !loading && (
            <div style={{ textAlign: 'center', padding: '60px 24px' }}>
              <Empty description="No transactions yet" />
            </div>
          )}
          {transactions.map((tx: any) => {
            const isCredit = TX_CREDIT_TYPES.has(tx.txType) || Number(tx.amount) > 0
            return (
              <div key={tx.id} style={{ background: '#fff', marginBottom: 1, padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap', minWidth: 0 }}>
                    <div style={{ padding: '2px 8px', borderRadius: 10, background: isCredit ? '#f6ffed' : '#fff1f0', border: `1px solid ${isCredit ? '#b7eb8f' : '#ffa39e'}` }}>
                      <span style={{ fontSize: 11, color: isCredit ? '#52c41a' : '#ff4d4f', fontWeight: 500 }}>{isCredit ? 'Credit' : 'Debit'}</span>
                    </div>
                    <span style={{ fontSize: 14, color: '#333', wordBreak: 'break-word' }}>{TX_LABEL[tx.txType] ?? tx.txType}</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#bbb' }}>{tx.createdAt?.slice(0, 16).replace('T', ' ')}</div>
                  {tx.note && <div style={{ fontSize: 11, color: '#999', wordBreak: 'break-word' }}>{tx.note}</div>}
                </div>
                <div style={{ fontSize: 15, fontWeight: 'bold', color: isCredit ? '#52c41a' : '#ff4d4f', marginLeft: 12, whiteSpace: 'nowrap' }}>{isCredit ? '+' : ''}{(Number(tx.amount) / 100).toFixed(2)}</div>
              </div>
            )
          })}
          {loading && <div style={{ textAlign: 'center', padding: 16 }}><Spin size="small" /></div>}
        </div>
      </div>
    </div>
  )
}
