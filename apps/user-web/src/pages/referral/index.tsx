import { useState } from 'react'
import { api } from '../../services/api'
import { usePageVisible } from '../../hooks/usePageVisible'
import { useToast } from '../../hooks/useToast'

export default function ReferralPage() {
  const [referral, setReferral] = useState<any>(null)
  const [referrals, setReferrals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const { showToast } = useToast()

  const fetchData = async () => {
    setLoading(true)
    try {
      const [ref, list] = await Promise.all([
        api.getMyReferral(),
        api.getMyReferrals(),
      ])
      setReferral(ref)
      // Flatten referrals list for display
      const flat: any[] = []
      ;(list ?? []).forEach((r: any) => {
        flat.push({ ...r, level: 1 })
        ;(r.referrals ?? []).forEach((rr: any) => {
          flat.push({ ...rr, level: 2 })
        })
      })
      setReferrals(flat)
    } catch {}
    finally { setLoading(false) }
  }

  usePageVisible(() => { fetchData() })

  const copyCode = async () => {
    if (!referral?.referralCode) return
    try {
      await navigator.clipboard.writeText(referral.referralCode)
      showToast('Code copied!', 'success')
    } catch {
      showToast('Copy failed', 'error')
    }
  }

  const shareLink = async () => {
    if (!referral?.referralUrl) return
    try {
      if ((navigator as any).share) {
        await (navigator as any).share({ title: 'Join HealthCoin', url: referral.referralUrl })
      } else {
        await navigator.clipboard.writeText(referral.referralUrl)
        showToast('Link copied!', 'success')
      }
    } catch {
      showToast('Share failed', 'error')
    }
  }

  const level1 = referrals.filter((r: any) => r.level === 1)
  const level2 = referrals.filter((r: any) => r.level === 2)

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <div style={{ color: '#999' }}>Loading...</div>
      </div>
    )
  }

  return (
    <div style={{ background: '#f5f5f5', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #1677ff, #722ed1)', padding: '24px 16px', textAlign: 'center' }}>
        <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#fff', marginBottom: '8px' }}>
          Refer & Earn
        </div>
        <div style={{ fontSize: '13px', color: 'rgba(255,255,255,.8)' }}>
          Earn HealthCoins for every friend you refer
        </div>
      </div>

      {/* QR Code */}
      {referral?.qrCode && (
        <div style={{ background: '#fff', margin: '12px', borderRadius: '10px', padding: '20px', textAlign: 'center' }}>
          <img
            src={referral.qrCode}
            alt="Referral QR"
            style={{ width: '160px', height: '160px', margin: '0 auto', display: 'block' }}
          />
          <div style={{ fontSize: '12px', color: '#999', marginTop: '8px' }}>
            Scan to join with your referral link
          </div>
        </div>
      )}

      {/* Referral code */}
      <div style={{ background: '#fff', margin: '12px', borderRadius: '10px', padding: '16px' }}>
        <div style={{ fontSize: '14px', color: '#999', marginBottom: '8px', textAlign: 'center' }}>
          Your Referral Code
        </div>
        <div style={{ background: '#f6f8ff', borderRadius: '8px', padding: '16px', textAlign: 'center', marginBottom: '12px' }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1677ff', letterSpacing: '4px' }}>
            {referral?.referralCode ?? '------'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={copyCode} style={{ flex: 1, background: '#f0f5ff', color: '#1677ff', border: '1px solid #adc6ff', borderRadius: '8px', padding: '10px', fontSize: '14px' }}>
            Copy Code
          </button>
          <button onClick={shareLink} style={{ flex: 1, background: '#1677ff', color: '#fff', borderRadius: '8px', padding: '10px', fontSize: '14px' }}>
            Share
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ background: '#fff', margin: '12px', borderRadius: '10px', padding: '16px' }}>
        <div style={{ fontSize: '14px', fontWeight: 500, marginBottom: '16px' }}>My Network</div>
        <div style={{ display: 'flex' }}>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#1677ff' }}>{level1.length}</div>
            <div style={{ fontSize: '12px', color: '#999' }}>Direct Referrals (L1)</div>
          </div>
          <div style={{ width: '1px', background: '#f0f0f0' }} />
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#722ed1' }}>{level2.length}</div>
            <div style={{ fontSize: '12px', color: '#999' }}>Indirect (L2)</div>
          </div>
        </div>
      </div>

      {/* Referral list */}
      {referrals.length > 0 && (
        <div style={{ background: '#fff', margin: '12px', borderRadius: '10px', overflow: 'hidden' }}>
          <div style={{ fontSize: '14px', fontWeight: 500, padding: '12px 16px', borderBottom: '1px solid #f0f0f0' }}>
            Referral List
          </div>
          {referrals.map((r: any, idx: number) => (
            <div
              key={r.id + idx}
              style={{
                padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                borderBottom: idx < referrals.length - 1 ? '1px solid #f8f8f8' : 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '32px', height: '32px', borderRadius: '50%',
                  background: r.level === 1 ? '#e6f4ff' : '#f9f0ff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span style={{ fontSize: '14px', color: r.level === 1 ? '#1677ff' : '#722ed1', fontWeight: 'bold' }}>
                    L{r.level}
                  </span>
                </div>
                <span style={{ fontSize: '14px', color: '#333' }}>{r.phone}</span>
              </div>
              <span style={{ fontSize: '12px', color: '#bbb' }}>{r.createdAt?.slice(0, 10)}</span>
            </div>
          ))}
        </div>
      )}

      {/* How it works */}
      <div style={{ background: '#fff', margin: '12px', borderRadius: '10px', padding: '16px' }}>
        <div style={{ fontSize: '14px', fontWeight: 500, marginBottom: '12px' }}>How It Works</div>
        {[
          { step: '1', text: 'Share your referral code with friends' },
          { step: '2', text: 'Friend registers using your code' },
          { step: '3', text: 'Earn coins when they make purchases' },
          { step: '4', text: 'Earn from their referrals too (Level 2)' },
        ].map((item) => (
          <div key={item.step} style={{ display: 'flex', gap: '12px', marginBottom: '10px' }}>
            <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#1677ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontSize: '12px', color: '#fff', fontWeight: 'bold' }}>{item.step}</span>
            </div>
            <span style={{ fontSize: '13px', color: '#666', flex: 1, lineHeight: 1.5 }}>{item.text}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
