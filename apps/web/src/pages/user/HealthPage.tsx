import { useEffect, useRef, useState } from 'react'
import { api } from '../../services/api'
import { message, Spin, Empty } from 'antd'

const FILE_TYPE_LABEL: Record<string, string> = { image: 'Image', pdf: 'PDF' }
const FILE_TYPE_COLOR: Record<string, string> = { image: '#1677ff', pdf: '#ff4d4f' }

export default function HealthPage() {
  const [records, setRecords] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchRecords = async () => {
    setLoading(true)
    try {
      const data: any = await api.listHealthRecords()
      setRecords(data ?? [])
    } catch {}
    finally { setLoading(false) }
  }

  useEffect(() => { fetchRecords() }, [])

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const fileName = file.name || `record-${Date.now()}.jpg`
    const fileType = file.type.startsWith('image/') ? 'image' : 'pdf'
    setUploading(true)
    try {
      const uploadRes: any = await api.uploadFile(file)
      const fileUrl = uploadRes.url
      await api.saveHealthRecord({ fileUrl, fileType, fileName })
      message.success('Saved successfully')
      fetchRecords()
    } catch (err: any) { message.error(err?.message || 'Save failed') } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleUploadClick = () => fileInputRef.current?.click()

  const handleDelete = async (id: string) => {
    const ok = window.confirm('Delete this record? This cannot be undone.')
    if (!ok) return
    try { await api.deleteHealthRecord(id); message.success('Deleted'); fetchRecords() }
    catch { message.error('Delete failed') }
  }

  const handleView = (record: any) => { window.open(record.fileUrl, '_blank') }

  return (
    <div style={{ minHeight: '100%' }}>
      <div style={{ background: '#fff', margin: 12, borderRadius: 10, padding: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 16, fontWeight: 500 }}>My Health Records</div>
          <input ref={fileInputRef} type="file" accept="image/*,.pdf" style={{ display: 'none' }} onChange={handleFileChange} />
          <button disabled={uploading} onClick={handleUploadClick} style={{ background: '#1677ff', color: '#fff', borderRadius: 6, padding: '8px 14px', fontSize: 14, opacity: uploading ? 0.7 : 1, border: 'none', cursor: 'pointer' }}>
            {uploading ? 'Uploading...' : '+ Upload'}
          </button>
        </div>
        <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>Store your medical reports, lab results, and prescriptions securely.</div>
      </div>

      <div style={{ overflowY: 'auto' }}>
        {loading && <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>}
        {!loading && !records.length && (
          <div style={{ textAlign: 'center', padding: '60px 24px' }}>
            <Empty description="No health records yet" />
            <div style={{ fontSize: 13, color: '#bbb', marginTop: 8 }}>Tap "Upload" to add your first record</div>
          </div>
        )}
        {records.map((record: any) => (
          <div key={record.id} style={{ background: '#fff', margin: '8px 12px', borderRadius: 10, padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 40, height: 40, borderRadius: 8, background: FILE_TYPE_COLOR[record.fileType] + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: 11, color: FILE_TYPE_COLOR[record.fileType], fontWeight: 'bold' }}>{FILE_TYPE_LABEL[record.fileType]}</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, color: '#333', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={record.fileName}>{record.fileName}</div>
                <div style={{ fontSize: 12, color: '#999' }}>{new Date(record.createdAt).toLocaleDateString('zh-CN')}</div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <span onClick={() => handleView(record)} style={{ fontSize: 13, color: '#1677ff', padding: '4px 8px', cursor: 'pointer' }}>View</span>
                <span onClick={() => handleDelete(record.id)} style={{ fontSize: 13, color: '#ff4d4f', padding: '4px 8px', cursor: 'pointer' }}>Delete</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
