import { useRef, useState } from 'react'
import { api } from '../../services/api'
import { usePageVisible } from '../../hooks/usePageVisible'
import { useToast } from '../../hooks/useToast'

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
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { showToast } = useToast()

  const fetchRecords = async () => {
    setLoading(true)
    try {
      const data: any = await api.listHealthRecords()
      setRecords(data ?? [])
    } catch {}
    finally { setLoading(false) }
  }

  usePageVisible(() => { fetchRecords() })

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const fileName = file.name || `record-${Date.now()}.jpg`
    const fileType = file.type.startsWith('image/') ? 'image' : 'pdf'

    // In production, upload to OSS first and use the returned URL.
    // For local dev, create an object URL.
    const fileUrl = URL.createObjectURL(file)

    setUploading(true)
    try {
      await api.saveHealthRecord({ fileUrl, fileType, fileName })
      showToast('Saved successfully', 'success')
      fetchRecords()
    } catch (err: any) {
      showToast(err || 'Save failed', 'error')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleDelete = async (id: string) => {
    const ok = window.confirm('Delete this record? This cannot be undone.')
    if (!ok) return
    try {
      await api.deleteHealthRecord(id)
      showToast('Deleted', 'success')
      fetchRecords()
    } catch {
      showToast('Delete failed', 'error')
    }
  }

  const handleView = (record: any) => {
    if (record.fileType === 'image') {
      window.open(record.fileUrl, '_blank')
    } else {
      window.open(record.fileUrl, '_blank')
    }
  }

  return (
    <div style={{ background: '#f5f5f5', minHeight: '100vh' }}>
      <div style={{ background: '#fff', margin: '12px', borderRadius: '10px', padding: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '16px', fontWeight: 500 }}>My Health Records</div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
          <button
            disabled={uploading}
            onClick={handleUploadClick}
            style={{ background: '#1677ff', color: '#fff', borderRadius: '6px', padding: '6px 12px', fontSize: '13px', opacity: uploading ? 0.7 : 1 }}
          >
            {uploading ? 'Uploading...' : '+ Upload'}
          </button>
        </div>
        <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
          Store your medical reports, lab results, and prescriptions securely.
        </div>
      </div>

      <div style={{ overflowY: 'auto' }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{ color: '#999' }}>Loading...</div>
          </div>
        )}
        {!loading && !records.length && (
          <div style={{ textAlign: 'center', padding: '60px 24px' }}>
            <div style={{ fontSize: '16px', color: '#999' }}>No health records yet</div>
            <div style={{ fontSize: '13px', color: '#bbb', marginTop: '8px' }}>
              Tap "Upload" to add your first record
            </div>
          </div>
        )}
        {records.map((record: any) => (
          <div
            key={record.id}
            style={{ background: '#fff', margin: '8px 12px', borderRadius: '10px', padding: '14px' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '40px', height: '40px', borderRadius: '8px',
                  background: FILE_TYPE_COLOR[record.fileType] + '20',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <span style={{ fontSize: '11px', color: FILE_TYPE_COLOR[record.fileType], fontWeight: 'bold' }}>
                  {FILE_TYPE_LABEL[record.fileType]}
                </span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '14px', color: '#333', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{record.fileName}</div>
                <div style={{ fontSize: '12px', color: '#999' }}>
                  {new Date(record.createdAt).toLocaleDateString('zh-CN')}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <span
                  onClick={() => handleView(record)}
                  style={{ fontSize: '13px', color: '#1677ff', padding: '4px 8px', cursor: 'pointer' }}
                >
                  View
                </span>
                <span
                  onClick={() => handleDelete(record.id)}
                  style={{ fontSize: '13px', color: '#ff4d4f', padding: '4px 8px', cursor: 'pointer' }}
                >
                  Delete
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
