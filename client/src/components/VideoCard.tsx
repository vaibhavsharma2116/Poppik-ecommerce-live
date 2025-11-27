import React from 'react'

export type Video = {
  id: string
  title: string
  channel: string
  meta?: string
  thumbnail: string
  duration?: string
  views?: string
  updated?: string
  redirectUrl?: string
  badge?: string
}

export default function VideoCard({ video, onClick }: { video: Video; onClick?: (video: Video) => void }) {
  return (
    <div className="group">
      <div
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        onClick={onClick ? () => onClick(video) : undefined}
        onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick(video) } : undefined}
        className={`relative rounded-lg overflow-hidden bg-gray-100 shadow-sm hover:shadow-md transition-shadow duration-150 ${onClick ? 'cursor-pointer' : ''}`}
      >
        <img
          src={video.thumbnail}
          alt={video.title}
          className="w-full h-44 object-cover sm:h-36 md:h-44 lg:h-40"
          loading="lazy"
        />

        {video.badge && (
          <div className="absolute left-2 top-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded">{video.badge}</div>
        )}

        {video.duration && (
          <div className="absolute right-2 bottom-2 bg-black/70 text-white text-xs px-2 py-0.5 rounded">
            {video.duration}
          </div>
        )}

        <button
          aria-label={`Open menu for ${video.title}`}
          className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150 text-white"
          onClick={(e) => { e.stopPropagation(); /* placeholder for menu */ }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
            <circle cx="5" cy="12" r="2" />
            <circle cx="12" cy="12" r="2" />
            <circle cx="19" cy="12" r="2" />
          </svg>
        </button>
      </div>

      <div className="mt-3 text-sm">
        <div className="font-medium text-gray-900 line-clamp-2">{video.title}</div>
        <div className="text-gray-600 text-xs mt-1">{video.channel}</div>
        <div className="text-gray-500 text-xs mt-0.5">{video.views ?? ''} {video.updated ? `• ${video.updated}` : ''}</div>
      </div>
    </div>
  )
}