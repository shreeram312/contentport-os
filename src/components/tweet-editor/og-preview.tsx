'use client'
import { X, Loader2 } from 'lucide-react'
import Image from 'next/image'
import { Button } from '../ui/button'
import { Card, CardContent } from '../ui/card'
import Link from 'next/link'

interface OGData {
  url: string
  title?: string
  description?: string
  image?: string
  siteName?: string
  loading?: boolean
  error?: string
}

interface OGPreviewProps {
  ogData: OGData | null
  onRemove: () => void
}

export function OGPreview({ ogData, onRemove }: OGPreviewProps) {
  if (!ogData) return null

  const data = ogData

  if (data.loading) {
    return (
      <Card className="mt-3 border-stone-200">
        <CardContent className="p-3">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-4 w-4 animate-spin text-stone-500" />
            <span className="text-sm text-stone-600">Fetching link preview...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (data.error) {
    // Only show error card if there's actually an error message
    if (!data.error.trim()) return null

    // Don't show error card if there's no URL or meaningful content
    if (!data.url || !data.url.trim()) return null

    return (
      <Card className="mt-3 border-stone-200">
        <CardContent className="p-3">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-stone-500 mb-1">Link preview</p>
              <h4 className="text-sm font-medium text-stone-900 line-clamp-2 mb-1">
                {data.url}
              </h4>
              <p className="text-xs text-stone-600 line-clamp-2">
                Unable to load preview
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onRemove}
              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
          {data.url && <Link href={data.url} target="_blank" rel="noopener noreferrer" />}
        </CardContent>
      </Card>
    )
  }

  // Don't render preview if there's no URL
  if (!data.url || !data.url.trim()) return null

  return (
    <Card className="mt-3 border-stone-200">
      <CardContent className="p-0">
        <div className="relative group">
          <div className="flex">
            {data.image && (
              <div className="w-24 h-24 flex-shrink-0">
                <Image
                  src={data.image!}
                  alt={data.title || 'Link preview'}
                  width={96}
                  height={96}
                  className="w-full h-full object-cover rounded-l-lg"
                />
              </div>
            )}
            <div className="flex-1 p-3 min-w-0">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  {data.siteName && (
                    <p className="text-xs text-stone-500 mb-1">{data.siteName}</p>
                  )}
                  {data.title && (
                    <h4 className="text-sm font-medium text-stone-900 line-clamp-2 mb-1">
                      {data.title}
                    </h4>
                  )}
                  {data.description && (
                    <p className="text-xs text-stone-600 line-clamp-2">
                      {data.description.length > 100
                        ? data.description.slice(0, 100) + '...'
                        : data.description}
                    </p>
                  )}
                  {/* Always show URL if no other content */}
                  {!data.title && !data.description && (
                    <h4 className="text-sm font-medium text-stone-900 line-clamp-2 mb-1">
                      {data.url}
                    </h4>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onRemove}
                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
          {data.url && <Link href={data.url} target="_blank" rel="noopener noreferrer" />}
        </div>
      </CardContent>
    </Card>
  )
}
