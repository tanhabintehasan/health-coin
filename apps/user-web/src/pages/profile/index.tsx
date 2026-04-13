import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../services/api'
import { useUserStore } from '../../store/user.store'
import { usePageVisible } from '../../hooks/usePageVisible'

const TIER_COLOR: Record<string, string> = {
  BRONZE: '#cd7f32',
  SILVER: '#a8a9ad',
  GOLD: '#ffd700',
  PLATINUM: '#e5e4e2',
  DIAMOND: '#00bfff',
  CROWN: '#9400d3',
}

export default function ProfilePage() {
  const [membership, setMembership] = useState<any>(null)
  const { user, logout: clearAuth } = useUserStore()
  const navigate = useNavigate()

  const fetchMembership = async () => {
    try {
      const res = await api.getMyMembership()
      setMembership(res)
    } catch {}
  }

  usePageVisible(() => { fetchMembership() })

  const logout = () => {
    const ok = window.confirm('Are you sure you want to logout?')
    if (ok) {
      clearAuth()
      navigate('/auth')
    }
  }

  const tier = membership?.currentTier
  const tierColor = tier ? TIER_COLOR[tier.name] ?? '#1677ff' : '#1677ff'

  return (
    <div style={{ background: '#f5f5f5', minHeight: '100vh' }}>
      {/* Profile header */}
      <div style={{ background: `linear-gradient(135deg, ${tierColor}, #1677ff)`, padding: '32px 20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(255,255,255,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '28px' }}>👤</span>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#fff' }}>
              {user?.phone ? `${user.phone.slice(0, 3)}****${user.phone.slice(-4)}` : 'User'}
            </div>
            {tier && (
              <div style={{ display: 'inline-flex', alignItems: 'center', background: 'rgba(255,255,255,.2)', borderRadius: '12px', padding: '2px 10px', marginTop: '4px' }}>
                <span style={{ fontSize: '12px', color: '#fff', fontWeight: 500 }}>{tier.name}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Membership progress */}
      {membership && (
        <div style={{ background: '#fff', margin: '12px', borderRadius: '10px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div style={{ fontSize: '14px', fontWeight: 500, color: '#333' }}>Membership Level</div>
            <div style={{ fontSize: '14px', color: tierColor, fontWeight: 'bold' }}>{tier?.name ?? 'BRONZE'}</div>
          </div>
          {membership.nextTier && (
            <>
              <div style={{ background: '#f0f0f0', borderRadius: '4px', height: '6px', overflow: 'hidden', marginBottom: '8px' }}>
                <div style={{
                  height: '100%', borderRadius: '4px', background: tierColor,
                  width: `${membership.progressPercent ?? 0}%`,
                }} />
              </div>
              <div style={{ fontSize: '12px', color: '#999' }}>
                {(Number(membership.coinsToNextTier ?? 0) / 100).toFixed(0)} HC to {membership.nextTier.name}
              </div>
            </>
          )}
          {!membership.nextTier && (
            <div style={{ fontSize: '12px', color: '#52c41a' }}>Maximum tier reached!</div>
          )}
        </div>
      )}

      {/* Menu items */}
      <div style={{ background: '#fff', margin: '12px', borderRadius: '10px', overflow: 'hidden' }}>
        {[
          { label: 'My Orders', iconBg: '#e6f4ff', iconColor: '#1677ff', iconChar: '\u{1F4E6}', path: '/orders' },
          { label: 'My Wallet', iconBg: '#f6ffed', iconColor: '#52c41a', iconChar: '\u{1F4B0}', path: '/wallet' },
          { label: 'Referral', iconBg: '#f9f0ff', iconColor: '#722ed1', iconChar: '\u{1F465}', path: '/referral' },
          { label: 'Health Records', iconBg: '#fff7e6', iconColor: '#fa8c16', iconChar: '\u{1F3E5}', path: '/health' },
        ].map((item, idx, arr) => (
          <div
            key={item.label}
            onClick={() => navigate(item.path)}
            style={{
              padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              borderBottom: idx < arr.length - 1 ? '1px solid #f0f0f0' : 'none', cursor: 'pointer',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '10px', background: item.iconBg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ fontSize: '18px', color: item.iconColor }}>{item.iconChar}</span>
              </div>
              <div style={{ fontSize: '15px', color: '#333' }}>{item.label}</div>
            </div>
            <span style={{ color: '#bbb', fontSize: '16px' }}>›</span>
          </div>
        ))}
      </div>

      {/* Settings section */}
      <div style={{ background: '#fff', margin: '12px', borderRadius: '10px', overflow: 'hidden' }}>
        <div style={{ padding: '8px 16px 4px' }}>
          <div style={{ fontSize: '12px', color: '#999', fontWeight: 500, letterSpacing: '0.5px' }}>SETTINGS</div>
        </div>
        <div
          onClick={() => alert('Edit profile not implemented in this demo')}
          style={{ padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px', background: '#f0f0f0',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontSize: '18px', color: '#666' }}>&#9998;</span>
            </div>
            <div style={{ fontSize: '15px', color: '#333' }}>Edit Profile</div>
          </div>
          <span style={{ color: '#bbb', fontSize: '16px' }}>›</span>
        </div>
      </div>

      {/* Logout */}
      <div style={{ margin: '12px', paddingBottom: '80px' }}>
        <button
          onClick={logout}
          style={{
            width: '100%',
            background: '#fff', color: '#ff4d4f', border: '1.5px solid #ff4d4f',
            borderRadius: '10px', padding: '12px', fontSize: '15px', fontWeight: 500,
          }}
        >
          Logout
        </button>
      </div>
    </div>
  )
}
