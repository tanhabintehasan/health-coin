import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../services/api'
import { useAuthStore } from '../../store/auth.store'
import { Drawer, Form, Input, Button, message, Cascader, Spin, Modal, Select, DatePicker } from 'antd'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'

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

  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [securityOpen, setSecurityOpen] = useState(false)
  const [securityLoading, setSecurityLoading] = useState(false)
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')

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
      name: user?.name || '',
      gender: user?.gender || undefined,
      birthday: user?.birthday ? dayjs(user.birthday) : undefined,
      email: user?.email || '',
      bio: user?.bio || '',
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
        name: values.name,
        gender: values.gender,
        birthday: values.birthday ? values.birthday.format('YYYY-MM-DD') : undefined,
        email: values.email,
        bio: values.bio,
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

  const handleAvatarClick = () => {
    fileInputRef.current?.click()
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      message.error('请上传图片文件')
      return
    }
    setUploadingAvatar(true)
    try {
      const { url } = await api.uploadFile(file)
      const updated = await api.updateMe({ avatarUrl: url })
      setUser({ ...user, ...updated })
      message.success('头像上传成功')
    } catch (err: any) {
      message.error(typeof err === 'string' ? err : '上传失败')
    } finally {
      setUploadingAvatar(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword || !confirmNewPassword) {
      message.error('请填写所有密码字段')
      return
    }
    if (newPassword.length < 6) {
      message.error('新密码长度不能少于6位')
      return
    }
    if (newPassword !== confirmNewPassword) {
      message.error('两次输入的新密码不一致')
      return
    }
    setSecurityLoading(true)
    try {
      await api.changePassword(oldPassword, newPassword)
      message.success('密码修改成功')
      setSecurityOpen(false)
      setOldPassword('')
      setNewPassword('')
      setConfirmNewPassword('')
    } catch (err: any) {
      message.error(typeof err === 'string' ? err : '修改密码失败')
    } finally {
      setSecurityLoading(false)
    }
  }

  const tier = membership?.currentTier
  const tierColor = tier ? TIER_COLOR[tier.name] ?? '#1677ff' : '#1677ff'

  return (
    <div style={{ minHeight: '100%' }}>
      <div style={{ background: `linear-gradient(135deg, ${tierColor}, #1677ff)`, padding: '32px 20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Spin spinning={uploadingAvatar}>
            <div
              onClick={handleAvatarClick}
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: 'rgba(255,255,255,.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                position: 'relative',
                overflow: 'hidden',
                flexShrink: 0,
              }}
            >
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <UserOutlined style={{ fontSize: 28, color: '#fff' }} />
              )}
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                style={{ display: 'none' }}
                onChange={handleAvatarChange}
              />
            </div>
          </Spin>
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

      <div style={{ background: '#fff', margin: 12, borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ padding: '8px 16px 4px' }}>
          <div style={{ fontSize: 12, color: '#999', fontWeight: 500, letterSpacing: '0.5px' }}>ACCOUNT SECURITY</div>
        </div>
        <div onClick={() => setSecurityOpen(true)} style={{ padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', minHeight: 48 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <LockOutlined style={{ fontSize: 18, color: '#666' }} />
            </div>
            <div style={{ fontSize: 15, color: '#333' }}>Change Password</div>
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
            <Form.Item name="name" label="姓名">
              <Input placeholder="请输入真实姓名" />
            </Form.Item>
            <Form.Item name="gender" label="Gender">
              <Select
                placeholder="请选择性别"
                options={[
                  { value: 'male', label: '男' },
                  { value: 'female', label: '女' },
                  { value: 'other', label: '其他' },
                ]}
              />
            </Form.Item>
            <Form.Item name="birthday" label="Birthday">
              <DatePicker placeholder="请选择生日" style={{ width: '100%' }} format="YYYY-MM-DD" />
            </Form.Item>
            <Form.Item
              name="email"
              label="Email"
              rules={[{ type: 'email', message: '请输入有效的邮箱地址' }]}
            >
              <Input placeholder="Enter your email" />
            </Form.Item>
            <Form.Item name="bio" label="个人简介">
              <Input.TextArea rows={3} placeholder="介绍一下自己" />
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

      <Modal
        title="Change Password"
        open={securityOpen}
        onCancel={() => setSecurityOpen(false)}
        onOk={handleChangePassword}
        confirmLoading={securityLoading}
        maskClosable={false}
      >
        <Form layout="vertical">
          <Form.Item label="Current Password" required>
            <Input.Password placeholder="Enter current password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} />
          </Form.Item>
          <Form.Item label="New Password" required>
            <Input.Password placeholder="Enter new password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          </Form.Item>
          <Form.Item label="Confirm New Password" required>
            <Input.Password placeholder="Confirm new password" value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
