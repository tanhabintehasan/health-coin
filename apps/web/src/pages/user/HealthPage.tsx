import { useEffect, useRef, useState } from 'react'
import { api } from '../../services/api'
import { message, Spin, Empty, Modal, Image } from 'antd'

const FILE_TYPE_LABEL: Record<string, string> = { image: 'Image', pdf: 'PDF' }
const FILE_TYPE_COLOR: Record<string, string> = { image: '#1677ff', pdf: '#ff4d4f' }

export default function HealthPage() {
  const [records, setRecords] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<{ open: boolean; url: string; type: string; name: string }>({
    open: false,
    url: '',
    type: '',
    name: '',
  })
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

  const handleView = (record: any) => {
    setPreview({ open: true, url: record.fileUrl, type: record.fileType, name: record.fileName })
  }

  const isImage = preview.type === 'image'

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
        <div style={{ fontSize: 12, color: '#cf1322', background: '#fff2f0', borderRadius: 6, padding: '8px 12px', marginTop: 8, lineHeight: 1.5 }}>
          <b>⚠️ 上传须知：</b>此功能专为上传您的医疗报告、化验单和处方而设。为维护良好网络环境，<b>严禁上传任何色情、暴力或与医疗无关的图片及文件</b>，违规内容将被删除并可能追究责任。
        </div>
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
              {record.fileType === 'image' && record.fileUrl ? (
                <Image
                  src={record.fileUrl}
                  alt={record.fileName}
                  style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover', flexShrink: 0, cursor: 'pointer' }}
                  preview={{ src: record.fileUrl }}
                />
              ) : (
                <div style={{ width: 48, height: 48, borderRadius: 8, background: FILE_TYPE_COLOR[record.fileType] + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: 11, color: FILE_TYPE_COLOR[record.fileType], fontWeight: 'bold' }}>{FILE_TYPE_LABEL[record.fileType]}</span>
                </div>
              )}
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

      <Modal
        open={preview.open}
        title={preview.name}
        footer={null}
        onCancel={() => setPreview({ ...preview, open: false })}
        width={isImage ? 720 : 900}
        centered
      >
        {isImage ? (
          <Image src={preview.url} alt={preview.name} style={{ width: '100%' }} preview={false} />
        ) : (
          <iframe
            src={preview.url}
            title={preview.name}
            style={{ width: '100%', height: '70vh', border: 'none' }}
          />
        )}
      </Modal>
    </div>
  )
}
