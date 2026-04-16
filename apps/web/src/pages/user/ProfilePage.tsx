import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../services/api'
import { useAuthStore } from '../../store/auth.store'
import { Drawer, Form, Input, Button, message, Cascader, Spin } from 'antd'

const TIER_COLOR: Record<string, string> = {
  BRONZE: '#cd7f32', SILVER: '#a8a9ad', GOLD: '#ffd700', PLATINUM: '#e5e4e2', DIAMOND: '#00bfff', CROWN: '#9400d3',
}

interface RegionNode {
  id: string
  name: string
  code: string
  level: number
  children?: RegionNode[]
}

function mapRegionTree(nodes: RegionNode[]): any[] {
  return nodes.map((n) => ({
    value: n.id,
    label: n.name,
    children: n.children && n.children.length > 0 ? mapRegionTree(n.children) : undefined,
  }))
}

export default function ProfilePage() {
  const [membership, setMembership] = useState<any>(null)
  const { user, logout: clearAuth, setUser } = useAuthStore()
  const navigate = useNavigate()

  const [editOpen, setEditOpen] = useState(false)
  const [form] = Form.useForm()
  const [saving, setSaving] = useState(false)
  const [regionTree, setRegionTree] = useState<any[]>([])
  const [regionsLoading, setRegionsLoading] = useState(false)

  useEffect(() => {
    api.getMyMembership().then(setMembership).catch(() => {})
  }, [])

  const logout = () => {
    const ok = window.confirm('Are you sure you want to logout?')
    if (ok) { clearAuth(); navigate('/login') }
  }

  const openEdit = async () => {
    setEditOpen(true)
    form.setFieldsValue({
      nickname: user?.nickname || '',
      regionId: user?.regionId ? [user.regionId] : undefined,
    })
    if (regionTree.length === 0) {
      setRegionsLoading(true)
      try {
        const tree: RegionNode[] = await api.getRegionsTree()
        setRegionTree(mapRegionTree(tree))
      } catch {
        message.error('Failed to load regions')
      } finally {
        setRegionsLoading(false)
      }
    }
  }

  const saveProfile = async (values: any) => {
    setSaving(true)
    try {
      const payload: any = {
        nickname: values.nickname,
      }
      const selectedRegion = values.regionId
      if (Array.isArray(selectedRegion) && selectedRegion.length > 0) {
        payload.regionId = selectedRegion[selectedRegion.length - 1]
      }
      const updated = await api.updateMe(payload)
      setUser({ ...user, ...updated })
      message.success('Profile updated successfully')
      setEditOpen(false)
    } catch (err: any) {
      message.error(typeof err === 'string' ? err : 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  const tier = membership?.currentTier
  const tierColor = tier ? TIER_COLOR[tier.name] ?? '#1677ff' : '#1677ff'

  return (
    <div style={{ minHeight: '100%' }}>
      <div style={{ background: `linear-gradient(135deg, ${tierColor}, #1677ff)`, padding: '32px 20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(255,255,255,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 28 }}>👤</span>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 18, fontWeight: 'bold', color: '#fff' }}>{user?.phone ? `${user.phone.slice(0, 3)}****${user.phone.slice(-4)}` : 'User'}</div>
            {user?.nickname && (
              <div style={{ fontSize: 14, color: 'rgba(255,255,255,.9)', marginTop: 2 }}>{user.nickname}</div>
            )}
            {tier && (
              <div style={{ display: 'inline-flex', alignItems: 'center', background: 'rgba(255,255,255,.2)', borderRadius: 12, padding: '2px 10px', marginTop: 4 }}>
                <span style={{ fontSize: 12, color: '#fff', fontWeight: 500 }}>{tier.name}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {membership && (
        <div style={{ background: '#fff', margin: 12, borderRadius: 10, padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: '#333' }}>Membership Level</div>
            <div style={{ fontSize: 14, color: tierColor, fontWeight: 'bold' }}>{tier?.name ?? 'BRONZE'}</div>
          </div>
          {membership.nextTier ? (
            <>
              <div style={{ background: '#f0f0f0', borderRadius: 4, height: 6, overflow: 'hidden', marginBottom: 8 }}>
                <div style={{ height: '100%', borderRadius: 4, background: tierColor, width: `${membership.progressPercent ?? 0}%` }} />
              </div>
              <div style={{ fontSize: 12, color: '#999' }}>{(Number(membership.coinsToNextTier ?? 0) / 100).toFixed(0)} HC to {membership.nextTier.name}</div>
            </>
          ) : (
            <div style={{ fontSize: 12, color: '#52c41a' }}>Maximum tier reached!</div>
          )}
        </div>
      )}

      <div style={{ background: '#fff', margin: 12, borderRadius: 10, overflow: 'hidden' }}>
        {[
          { label: 'My Orders', iconBg: '#e6f4ff', iconColor: '#1677ff', iconChar: '\u{1F4E6}', path: '/portal/user/orders' },
          { label: 'My Wallet', iconBg: '#f6ffed', iconColor: '#52c41a', iconChar: '\u{1F4B0}', path: '/portal/user/wallet' },
          { label: 'Referral', iconBg: '#f9f0ff', iconColor: '#722ed1', iconChar: '\u{1F465}', path: '/portal/user/referral' },
          { label: 'Health Records', iconBg: '#fff7e6', iconColor: '#fa8c16', iconChar: '\u{1F3E5}', path: '/portal/user/health' },
        ].map((item, idx, arr) => (
          <div key={item.label} onClick={() => navigate(item.path)} style={{ padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: idx < arr.length - 1 ? '1px solid #f0f0f0' : 'none', cursor: 'pointer', minHeight: 48 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: item.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 18, color: item.iconColor }}>{item.iconChar}</span>
              </div>
              <div style={{ fontSize: 15, color: '#333' }}>{item.label}</div>
            </div>
            <span style={{ color: '#bbb', fontSize: 16 }}>›</span>
          </div>
        ))}
      </div>

      <div style={{ background: '#fff', margin: 12, borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ padding: '8px 16px 4px' }}>
          <div style={{ fontSize: 12, color: '#999', fontWeight: 500, letterSpacing: '0.5px' }}>SETTINGS</div>
        </div>
        <div onClick={openEdit} style={{ padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', minHeight: 48 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 18, color: '#666' }}>✎</span>
            </div>
            <div style={{ fontSize: 15, color: '#333' }}>Edit Profile</div>
          </div>
          <span style={{ color: '#bbb', fontSize: 16 }}>›</span>
        </div>
      </div>

      <div style={{ margin: 12, paddingBottom: 24 }}>
        <button onClick={logout} style={{ width: '100%', background: '#fff', color: '#ff4d4f', border: '1.5px solid #ff4d4f', borderRadius: 10, padding: '14px 12px', fontSize: 15, fontWeight: 500, cursor: 'pointer', minHeight: 48 }}>
          Logout
        </button>
      </div>

      <Drawer title="Edit Profile" open={editOpen} onClose={() => setEditOpen(false)} width={360}>
        <Spin spinning={regionsLoading} tip="Loading regions...">
          <Form form={form} layout="vertical" onFinish={saveProfile}>
            <Form.Item
              name="nickname"
              label="Nickname"
              rules={[{ max: 100, message: 'Nickname too long' }]}
            >
              <Input placeholder="Enter your nickname" />
            </Form.Item>
            <Form.Item name="regionId" label="Region">
              <Cascader
                options={regionTree}
                placeholder="Select your region"
                changeOnSelect
              />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" loading={saving} block>
                Save
              </Button>
            </Form.Item>
          </Form>
        </Spin>
      </Drawer>
    </div>
  )
}
