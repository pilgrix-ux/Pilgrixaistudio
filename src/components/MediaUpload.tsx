/**
 * Media upload area component
 */

import { Upload, Music, Image as ImageIcon, Video, FileText } from 'lucide-react'
import { useRef } from 'react'

interface MediaUploadProps {
  onFileSelect: (files: File[]) => void
  isLoading?: boolean
}

export function MediaUpload({
  onFileSelect,
  isLoading = false,
}: MediaUploadProps): JSX.Element {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleClick = (): void => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ): void => {
    const files = Array.from(event.currentTarget.files || [])
    if (files.length > 0) {
      onFileSelect(files)
    }
  }

  const supportedFormats = [
    { icon: ImageIcon, label: 'Images', types: 'JPG, PNG, WebP, GIF' },
    { icon: Video, label: 'Videos', types: 'MP4, WebM, MOV' },
    { icon: Music, label: 'Audio', types: 'MP3, WAV, OGG' },
    { icon: FileText, label: 'Documents', types: 'PDF, DOCX' },
  ]

  return (
    <div className="rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-8">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileChange}
        disabled={isLoading}
      />

      <div className="space-y-4">
        {/* Upload prompt */}
        <div className="text-center">
          <div className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-brand-100">
            <Upload className="h-6 w-6 text-brand-600" />
          </div>
          <h3 className="font-semibold text-slate-900">Upload media</h3>
          <p className="mt-1 text-sm text-slate-600">
            Drag files here or{' '}
            <button
              onClick={handleClick}
              disabled={isLoading}
              className="font-medium text-brand-600 hover:text-brand-700"
            >
              browse
            </button>
          </p>
        </div>

        {/* Supported formats */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {supportedFormats.map(({ icon: Icon, label, types }) => (
            <div
              key={label}
              className="rounded-lg bg-white p-3 text-center text-xs"
            >
              <Icon className="mx-auto mb-1 h-5 w-5 text-slate-400" />
              <p className="font-medium text-slate-900">{label}</p>
              <p className="text-slate-500">{types}</p>
            </div>
          ))}
        </div>

        {/* Size info */}
        <p className="text-center text-xs text-slate-500">
          Max file size: 100 MB per file
        </p>
      </div>
    </div>
  )
}
