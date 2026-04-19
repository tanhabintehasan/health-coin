import { useState } from 'react'
import { View, Text, Button, ScrollView } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { api } from '../../services/api'

const FILE_TYPE_LABEL: Record<string, string> = {
  image: 'Image',
  pdf: 'PDF',
}

const FILE_TYPE_COLOR: Record<string, string> = {
  image: '#1677ff',
  pdf: '#ff4d4f',
}

export default function HealthRecordsPage() {
  const [records, setRecords] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)

  const fetchRecords = async () => {
    setLoading(true)
    try {
      const data: any = await api.listHealthRecords()
      setRecords(data ?? [])
    } catch (err: any) {
      Taro.showToast({ title: err || 'Failed to load records', icon: 'error' })
    } finally { setLoading(false) }
  }

  useDidShow(() => { fetchRecords() })

  const handleUpload = async () => {
    try {
      const res = await Taro.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera'],
      })

      const filePath = res.tempFilePaths[0]
      if (!filePath) return
      const fileName = filePath.split('/').pop() || `record-${Date.now()}.jpg`

      setUploading(true)
      const uploadRes = await api.uploadFile(filePath)
      const ossUrl = uploadRes.url
      if (!ossUrl) throw new Error('Upload did not return a URL')

      await api.saveHealthRecord({
        fileUrl: ossUrl,
        fileType: 'image',
        fileName,
      })
      Taro.showToast({ title: 'Saved successfully', icon: 'success' })
      fetchRecords()
    } catch (err: any) {
      if (err !== 'cancel') {
        Taro.showToast({ title: err || 'Save failed', icon: 'error' })
      }
    } finally { setUploading(false) }
  }

  const handleDelete = async (id: string) => {
    const res = await Taro.showModal({ title: 'Delete this record?', content: 'This cannot be undone.' })
    if (!res.confirm) return
    try {
      await api.deleteHealthRecord(id)
      Taro.showToast({ title: 'Deleted', icon: 'success' })
      fetchRecords()
    } catch (err: any) {
      Taro.showToast({ title: err || 'Delete failed', icon: 'error' })
    }
  }

  const handleView = (record: any) => {
    if (record.fileType === 'image') {
      Taro.previewImage({ urls: [record.fileUrl], current: record.fileUrl })
    } else {
      // For PDF, open in browser
      Taro.showToast({ title: 'Open PDF in browser', icon: 'none' })
    }
  }

  return (
    <View style={{ background: '#f5f5f5', minHeight: '100vh' }}>
      <View style={{ background: '#fff', margin: '12px', borderRadius: '10px', padding: '16px' }}>
        <View style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontSize: '16px', fontWeight: '500' }}>My Health Records</Text>
          <Button
            size="mini"
            loading={uploading}
            onClick={handleUpload}
            style={{ background: '#1677ff', color: '#fff', borderRadius: '6px', fontSize: '13px' }}
          >
            + Upload
          </Button>
        </View>
        <Text style={{ fontSize: '12px', color: '#999', marginTop: '4px', display: 'block' }}>
          Store your medical reports, lab results, and prescriptions securely.
        </Text>
      </View>

      <ScrollView scrollY style={{ flex: 1 }}>
        {loading && (
          <View style={{ textAlign: 'center', padding: '40px' }}>
            <Text style={{ color: '#999' }}>Loading...</Text>
          </View>
        )}
        {!loading && !records.length && (
          <View style={{ textAlign: 'center', padding: '60px 24px' }}>
            <Text style={{ fontSize: '16px', color: '#999', display: 'block' }}>No health records yet</Text>
            <Text style={{ fontSize: '13px', color: '#bbb', marginTop: '8px', display: 'block' }}>
              Tap "Upload" to add your first record
            </Text>
          </View>
        )}
        {records.map((record: any) => (
          <View
            key={record.id}
            style={{ background: '#fff', margin: '8px 12px', borderRadius: '10px', padding: '14px' }}
          >
            <View style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <View
                style={{
                  width: '40px', height: '40px', borderRadius: '8px',
                  background: FILE_TYPE_COLOR[record.fileType] + '20',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: '11px', color: FILE_TYPE_COLOR[record.fileType], fontWeight: 'bold' }}>
                  {FILE_TYPE_LABEL[record.fileType]}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: '14px', color: '#333', display: 'block' }}>{record.fileName}</Text>
                <Text style={{ fontSize: '12px', color: '#999' }}>
                  {new Date(record.createdAt).toLocaleDateString('zh-CN')}
                </Text>
              </View>
              <View style={{ display: 'flex', gap: '8px' }}>
                <Text
                  onClick={() => handleView(record)}
                  style={{ fontSize: '13px', color: '#1677ff', padding: '4px 8px' }}
                >
                  View
                </Text>
                <Text
                  onClick={() => handleDelete(record.id)}
                  style={{ fontSize: '13px', color: '#ff4d4f', padding: '4px 8px' }}
                >
                  Delete
                </Text>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  )
}
