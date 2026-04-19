import { useState, useEffect, type ReactNode } from 'react'
import { View, Text, Input, Button, Image, Picker } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { api } from '../../../services/api'
import { useUserStore } from '../../../store/user.store'

const GENDER_OPTIONS = ['Male', 'Female', 'Other']
const GENDER_MAP: Record<string, string> = { Male: '男', Female: '女', Other: '其他' }

const BASE_URL = (process.env.TARO_APP_API_URL || 'http://localhost:10000/api/v1').replace(/\/api\/v1$/, '')

export default function ProfileInfoPage() {
  const { user, setAuth } = useUserStore()
  const [avatar, setAvatar] = useState('')
  const [nickname, setNickname] = useState('')
  const [name, setName] = useState('')
  const [gender, setGender] = useState('')
  const [birthday, setBirthday] = useState('')
  const [email, setEmail] = useState('')
  const [bio, setBio] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    if (user) {
      setAvatar(user.avatarUrl || '')
      setNickname(user.nickname || '')
      setName(user.name || '')
      setGender(user.gender || '')
      setBirthday(user.birthday || '')
      setEmail(user.email || '')
      setBio(user.bio || '')
    }
  }, [user])

  const handleChooseAvatar = async () => {
    try {
      const res = await Taro.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera'],
      })
      const filePath = res.tempFilePaths[0]
      if (!filePath) return
      setUploading(true)
      const uploadRes: any = await Taro.uploadFile({
        url: `${BASE_URL}/upload`,
        filePath,
        name: 'file',
        header: {
          Authorization: `Bearer ${Taro.getStorageSync('access_token') || ''}`,
        },
      })
      const data = JSON.parse(uploadRes.data)
      if (data?.url) {
        setAvatar(data.url)
        Taro.showToast({ title: 'Uploaded', icon: 'success' })
      } else {
        throw new Error(data?.message || 'Upload failed')
      }
    } catch (err: any) {
      Taro.showToast({ title: err?.message || err || 'Upload failed', icon: 'error' })
    } finally {
      setUploading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload = {
        avatarUrl: avatar,
        nickname,
        name,
        gender,
        birthday,
        email,
        bio,
      }
      const updated = await api.updateMe(payload)
      setAuth(updated, Taro.getStorageSync('access_token'))
      Taro.showToast({ title: 'Saved', icon: 'success' })
      setTimeout(() => Taro.navigateBack(), 600)
    } catch (err: any) {
      Taro.showToast({ title: err || 'Save failed', icon: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const genderIndex = GENDER_OPTIONS.indexOf(gender)

  return (
    <View style={{ background: '#f5f5f5', minHeight: '100vh', paddingBottom: '24px' }}>
      <View style={{ background: '#fff', margin: '12px', borderRadius: '10px', padding: '24px', textAlign: 'center' }}>
        <View
          onClick={handleChooseAvatar}
          style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: '#f0f0f0',
            margin: '0 auto 12px',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
          }}
        >
          {avatar ? (
            <Image src={avatar} style={{ width: '100%', height: '100%' }} mode='aspectFill' />
          ) : (
            <Text style={{ fontSize: '32px' }}>📷</Text>
          )}
          {uploading && (
            <View style={{
              position: 'absolute', inset: 0, background: 'rgba(0,0,0,.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Text style={{ color: '#fff', fontSize: '12px' }}>Uploading</Text>
            </View>
          )}
        </View>
        <Text style={{ fontSize: '13px', color: '#999' }}>Tap to change avatar</Text>
      </View>

      <View style={{ background: '#fff', margin: '0 12px', borderRadius: '10px', padding: '16px' }}>
        <FormField label='Nickname'>
          <Input
            placeholder='Enter nickname'
            value={nickname}
            onInput={(e) => setNickname(e.detail.value)}
            style={inputStyle}
          />
        </FormField>
        <FormField label='Name'>
          <Input
            placeholder='Enter your name'
            value={name}
            onInput={(e) => setName(e.detail.value)}
            style={inputStyle}
          />
        </FormField>
        <FormField label='Gender'>
          <Picker mode='selector' range={GENDER_OPTIONS} value={genderIndex >= 0 ? genderIndex : 0} onChange={(e) => setGender(GENDER_OPTIONS[e.detail.value])}>
            <View style={{ ...inputStyle, display: 'flex', alignItems: 'center' }}>
              <Text style={{ color: gender ? '#333' : '#999' }}>{gender ? GENDER_MAP[gender] || gender : 'Select gender'}</Text>
            </View>
          </Picker>
        </FormField>
        <FormField label='Birthday'>
          <Picker mode='date' value={birthday || ''} onChange={(e) => setBirthday(e.detail.value)}>
            <View style={{ ...inputStyle, display: 'flex', alignItems: 'center' }}>
              <Text style={{ color: birthday ? '#333' : '#999' }}>{birthday || 'Select birthday'}</Text>
            </View>
          </Picker>
        </FormField>
        <FormField label='Email'>
          <Input
            placeholder='Enter email'
            value={email}
            onInput={(e) => setEmail(e.detail.value)}
            style={inputStyle}
          />
        </FormField>
        <FormField label='Bio'>
          <Input
            placeholder='Tell us about yourself'
            value={bio}
            onInput={(e) => setBio(e.detail.value)}
            style={inputStyle}
          />
        </FormField>
      </View>

      <View style={{ margin: '16px 12px' }}>
        <Button
          onClick={handleSave}
          loading={saving}
          style={{
            background: '#1677ff', color: '#fff', borderRadius: '10px', width: '100%', fontSize: '16px',
          }}
        >
          Save
        </Button>
      </View>
    </View>
  )
}

function FormField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={{ marginBottom: '16px' }}>
      <Text style={{ fontSize: '14px', color: '#333', display: 'block', marginBottom: '8px', fontWeight: '500' }}>{label}</Text>
      {children}
    </View>
  )
}

const inputStyle: Record<string, any> = {
  border: '1px solid #d9d9d9',
  borderRadius: '8px',
  padding: '12px',
  fontSize: '15px',
  color: '#333',
}
