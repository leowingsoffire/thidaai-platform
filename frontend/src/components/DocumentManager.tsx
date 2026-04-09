import { useState, useEffect, useRef } from 'react'
import { api, type DocumentAttachment } from '../api'
import { Upload, FileText, Trash2, Download, X, Paperclip, Image, File, FileSpreadsheet } from 'lucide-react'

const CATEGORY_OPTIONS: Record<string, string[]> = {
  policy:       ['contract', 'kyc', 'medical', 'financial', 'proposal', 'other'],
  claim:        ['supporting', 'medical', 'financial', 'photo', 'police_report', 'other'],
  client:       ['kyc', 'photo', 'financial', 'medical', 'other'],
  underwriting: ['medical', 'financial', 'kyc', 'risk_report', 'other'],
  corporate:    ['contract', 'financial', 'proposal', 'employee_list', 'other'],
}

const FILE_ICONS: Record<string, typeof FileText> = {
  'application/pdf': FileText,
  'image/png': Image, 'image/jpeg': Image, 'image/jpg': Image,
  'image/gif': Image, 'image/webp': Image,
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': FileSpreadsheet,
  'application/vnd.ms-excel': FileSpreadsheet,
  'text/csv': FileSpreadsheet,
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

interface Props {
  entityType: 'policy' | 'claim' | 'client' | 'underwriting' | 'corporate'
  entityId: string
  compact?: boolean  // compact mode for embedding in modals/rows
}

export default function DocumentManager({ entityType, entityId, compact }: Props) {
  const [docs, setDocs] = useState<DocumentAttachment[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [category, setCategory] = useState('other')
  const [notes, setNotes] = useState('')
  const [showUploadForm, setShowUploadForm] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const categories = CATEGORY_OPTIONS[entityType] || ['other']

  const loadDocs = () => {
    api.getDocuments(entityType, entityId)
      .then(setDocs)
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadDocs() }, [entityType, entityId])

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setUploading(true)
    try {
      for (let i = 0; i < files.length; i++) {
        await api.uploadDocument(entityType, entityId, files[i], category, notes)
      }
      setNotes('')
      setShowUploadForm(false)
      loadDocs()
    } catch (err: any) {
      alert(err.message || 'Upload failed')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handleDelete = async (doc: DocumentAttachment) => {
    if (!confirm(`Delete "${doc.original_name}"?`)) return
    try {
      await api.deleteDocument(doc.id)
      loadDocs()
    } catch (err: any) { alert(err.message) }
  }

  const handleDownload = (doc: DocumentAttachment) => {
    const url = api.getDocumentDownloadUrl(doc.id)
    const token = localStorage.getItem('token')
    // Use fetch + blob for authenticated download
    fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then(r => { if (!r.ok) throw new Error('Download failed'); return r.blob() })
      .then(blob => {
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = doc.original_name
        a.click()
        URL.revokeObjectURL(a.href)
      })
      .catch(() => alert('Download failed'))
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    handleUpload(e.dataTransfer.files)
  }

  const FileIcon = ({ contentType }: { contentType: string }) => {
    const Ico = FILE_ICONS[contentType] || File
    return <Ico size={16} />
  }

  const categoryLabel = (cat: string) => cat.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

  if (loading) return <div style={{ padding: 12, fontSize: 13, color: 'var(--text-dim)' }}>Loading documents...</div>

  return (
    <div style={{ marginTop: compact ? 0 : 16 }}>
      {/* Header */}
      {!compact && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-primary)' }}>
            <Paperclip size={16} /> Documents ({docs.length})
          </h3>
          <button
            className="btn-primary"
            style={{ fontSize: 12, padding: '6px 12px' }}
            onClick={() => setShowUploadForm(!showUploadForm)}
          >
            <Upload size={13} /> Upload
          </button>
        </div>
      )}

      {/* Upload Area */}
      {(showUploadForm || compact) && (
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          style={{
            border: `2px dashed ${dragOver ? '#6366f1' : 'var(--border-card)'}`,
            borderRadius: 10,
            padding: compact ? 12 : 16,
            textAlign: 'center',
            background: dragOver ? 'rgba(99,102,241,0.05)' : 'var(--bg-elevated)',
            transition: 'all 0.2s',
            marginBottom: 12,
          }}
        >
          <Upload size={compact ? 20 : 28} color="var(--text-dim)" style={{ marginBottom: 6 }} />
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>
            {uploading ? 'Uploading...' : 'Drag & drop files here, or click to browse'}
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              style={{ fontSize: 12, padding: '4px 8px', borderRadius: 6, minWidth: 100 }}
            >
              {categories.map(c => <option key={c} value={c}>{categoryLabel(c)}</option>)}
            </select>
            <input
              type="text"
              placeholder="Notes (optional)"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              style={{ fontSize: 12, padding: '4px 8px', borderRadius: 6, width: 160, border: '1px solid var(--border-card)' }}
            />
            <input
              ref={fileRef}
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.png,.jpg,.jpeg,.gif,.webp,.txt,.rtf,.odt"
              style={{ display: 'none' }}
              onChange={e => handleUpload(e.target.files)}
            />
            <button
              className="btn-primary"
              style={{ fontSize: 12, padding: '5px 12px' }}
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
            >
              {uploading ? 'Uploading...' : 'Browse Files'}
            </button>
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 6 }}>
            PDF, DOC, XLS, Images — Max 20 MB per file
          </div>
        </div>
      )}

      {/* Document List */}
      {docs.length === 0 ? (
        <div style={{ fontSize: 13, color: 'var(--text-dim)', textAlign: 'center', padding: 16 }}>
          No documents attached yet
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {docs.map(doc => (
            <div key={doc.id} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 12px', borderRadius: 8,
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-card)',
              transition: 'all 0.15s',
            }}>
              <div style={{ color: doc.content_type.includes('pdf') ? '#ef4444' : doc.content_type.includes('image') ? '#10b981' : '#6366f1', flexShrink: 0 }}>
                <FileIcon contentType={doc.content_type} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 13, fontWeight: 500, color: 'var(--text-primary)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>{doc.original_name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <span>{formatBytes(doc.file_size)}</span>
                  <span style={{ textTransform: 'capitalize' }}>{doc.category?.replace(/_/g, ' ')}</span>
                  {doc.uploaded_by && <span>by {doc.uploaded_by}</span>}
                  <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                </div>
                {doc.notes && <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>{doc.notes}</div>}
              </div>
              <button
                onClick={() => handleDownload(doc)}
                title="Download"
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: '#3b82f6', padding: 4,
                }}
              >
                <Download size={15} />
              </button>
              <button
                onClick={() => handleDelete(doc)}
                title="Delete"
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: '#ef4444', padding: 4,
                }}
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
