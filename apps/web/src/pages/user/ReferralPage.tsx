import { useEffect, useState } from 'react'
import { api } from '../../services/api'
import { message, Spin } from 'antd'

export default function ReferralPage() {
  const [referral, setReferral] = useState<any>(null)
  const [referrals, setReferrals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const [ref, list] = await Promise.all([api.getMyReferral(), api.getMyReferrals()])
        setReferral(ref)
        const flat: any[] = []
        ;((list as any)?.directReferrals ?? []).forEach((r: any) => {
          flat.push({ ...r, level: 1 })
          ;(r.referrals ?? []).forEach((rr: any) => flat.push({ ...rr, level: 2 }))
        })
        setReferrals(flat)
      } catch {}
      finally { setLoading(false) }
    }
    fetchData()
  }, [])

  const fallbackCopy = (text: string): boolean => {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.left = '-9999px'
    textarea.style.top = '-9999px'
    document.body.appendChild(textarea)
    textarea.focus()
    textarea.select()
    let success = false
    try { success = document.execCommand('copy') } catch {}
    document.body.removeChild(textarea)
    return success
  }

  const copyToClipboard = async (text: string): Promise<boolean> => {
    if (navigator.clipboard && window.isSecureContext) {
      try { await navigator.clipboard.writeText(text); return true } catch {}
    }
    return fallbackCopy(text)
  }

  const copyCode = async () => {
    if (!referral?.referralCode) return
    const ok = await copyToClipboard(referral.referralCode)
    if (ok) message.success('Code copied!')
    else message.error('Copy failed — please copy manually')
  }

  const shareLink = async () => {
    if (!referral?.referralUrl) return
    try {
      if ((navigator as any).share) {
        await (navigator as any).share({ title: 'Join HealthCoin', url: referral.referralUrl })
        return
      }
    } catch {}
    const ok = await copyToClipboard(referral.referralUrl)
    if (ok) message.success('Link copied to clipboard!')
    else message.error('Share failed — please copy link manually')
  }

  const level1 = referrals.filter((r: any) => r.level === 1)
  const level2 = referrals.filter((r: any) => r.level === 2)

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}><Spin /></div>

  return (
    <div style={{ minHeight: '100%' }}>
      <div style={{ background: 'linear-gradient(135deg, #1677ff, #722ed1)', padding: '24px 16px', textAlign: 'center' }}>
        <div style={{ fontSize: 20, fontWeight: 'bold', color: '#fff', marginBottom: 8 }}>Refer & Earn</div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,.8)' }}>Earn HealthCoins for every friend you refer</div>
      </div>

      {referral?.qrCode && (
        <div style={{ background: '#fff', margin: 12, borderRadius: 10, padding: 20, textAlign: 'center' }}>
          <img src={referral.qrCode} alt="Referral QR" style={{ width: 160, maxWidth: '100%', height: 'auto', margin: '0 auto', display: 'block' }} />
          <div style={{ fontSize: 12, color: '#999', marginTop: 8 }}>Scan to join with your referral link</div>
        </div>
      )}

      <div style={{ background: '#fff', margin: 12, borderRadius: 10, padding: 16 }}>
        <div style={{ fontSize: 14, color: '#999', marginBottom: 8, textAlign: 'center' }}>Your Referral Code</div>
        <div style={{ background: '#f6f8ff', borderRadius: 8, padding: 16, textAlign: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: 24, fontWeight: 'bold', color: '#1677ff', letterSpacing: 4 }}>{referral?.referralCode ?? '------'}</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={copyCode} style={{ flex: 1, background: '#f0f5ff', color: '#1677ff', border: '1px solid #adc6ff', borderRadius: 8, padding: 10, fontSize: 14 }}>Copy Code</button>
          <button onClick={shareLink} style={{ flex: 1, background: '#1677ff', color: '#fff', borderRadius: 8, padding: 10, fontSize: 14 }}>Share</button>
        </div>
      </div>

      <div style={{ background: '#fff', margin: 12, borderRadius: 10, padding: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 16 }}>My Network</div>
        <div style={{ display: 'flex' }}>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 'bold', color: '#1677ff' }}>{level1.length}</div>
            <div style={{ fontSize: 12, color: '#999' }}>Direct Referrals (L1)</div>
          </div>
          <div style={{ width: 1, background: '#f0f0f0' }} />
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 'bold', color: '#722ed1' }}>{level2.length}</div>
            <div style={{ fontSize: 12, color: '#999' }}>Indirect (L2)</div>
          </div>
        </div>
      </div>

      {referrals.length > 0 && (
        <div style={{ background: '#fff', margin: 12, borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ fontSize: 14, fontWeight: 500, padding: '12px 16px', borderBottom: '1px solid #f0f0f0' }}>Referral List</div>
          {referrals.map((r: any, idx: number) => (
            <div key={r.id + idx} style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: idx < referrals.length - 1 ? '1px solid #f8f8f8' : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: r.level === 1 ? '#e6f4ff' : '#f9f0ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: 14, color: r.level === 1 ? '#1677ff' : '#722ed1', fontWeight: 'bold' }}>L{r.level}</span>
                </div>
                <span style={{ fontSize: 14, color: '#333', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.phone}</span>
              </div>
              <span style={{ fontSize: 12, color: '#bbb', marginLeft: 8, flexShrink: 0 }}>{r.createdAt?.slice(0, 10)}</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ background: '#fff', margin: 12, borderRadius: 10, padding: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 12 }}>How It Works</div>
        {[
          { step: '1', text: 'Share your referral code with friends' },
          { step: '2', text: 'Friend registers using your code' },
          { step: '3', text: 'Earn coins when they make purchases' },
          { step: '4', text: 'Earn from their referrals too (Level 2)' },
        ].map((item) => (
          <div key={item.step} style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
            <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#1677ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontSize: 12, color: '#fff', fontWeight: 'bold' }}>{item.step}</span>
            </div>
            <span style={{ fontSize: 13, color: '#666', flex: 1, lineHeight: 1.5 }}>{item.text}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
