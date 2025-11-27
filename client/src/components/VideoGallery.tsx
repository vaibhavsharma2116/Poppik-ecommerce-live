import React, { useEffect, useState } from 'react'
import VideoCard, { Video } from './VideoCard'

export default function VideoGallery({ videos }: { videos?: Video[] }) {
	const [showAll, setShowAll] = useState(false)
	const [list, setList] = useState<Video[]>([])
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const initialVisible = 4

	useEffect(() => {
		if (videos && videos.length > 0) {
			setList(videos)
			return
		}

		let mounted = true
		setLoading(true)
		setError(null)

		fetch('/api/media?category=media&isActive=true')
			.then((res) => {
				if (!res.ok) throw new Error('Failed to fetch media')
				return res.json()
			})
			.then((data) => {
				if (!mounted) return
				const mapped: Video[] = (data || []).map((m: any) => {
					const metadata = m.metadata || {}
					return {
						id: String(m.id),
						title: m.title,
						channel: metadata.author || m.description || m.category || '',
						thumbnail: m.imageUrl || metadata.thumbnailUrl || '',
						duration: metadata.duration || (m.videoUrl ? '' : ''),
						views: metadata.views ? `${metadata.views}` : undefined,
						updated: m.updatedAt ? new Date(m.updatedAt).toLocaleDateString() : undefined,
						badge: metadata.badge || (m.type === 'audio' ? 'AUDIO' : undefined),
						redirectUrl: m.redirectUrl || metadata.redirectUrl || ''
					}
				})
				setList(mapped)
			})
			.catch((err) => {
				if (!mounted) return
				setError(err.message || 'Error')
			})
			.finally(() => {
				if (!mounted) return
				setLoading(false)
			})

		return () => {
			mounted = false
		}
	}, [videos])

	const visibleList = showAll ? list : list.slice(0, initialVisible)

	return (
		<div>
			{loading && (
				<div className="py-8 text-center text-gray-500">Loading videos…</div>
			)}

			{error && (
				<div className="py-4 text-center text-red-500">{error}</div>
			)}

			{!loading && !error && (
				<>
					<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
						{visibleList.map((v) => (
							<VideoCard
								key={v.id}
								video={v}
								onClick={async (video) => {
									// Track click then redirect to the configured URL (open in new tab)
									try {
										if (video.id) {
											const res = await fetch(`/api/media/${video.id}/click`, { method: 'POST' });
											if (res.ok) {
												const json = await res.json().catch(() => null);
												const redirectFromResp = json && (json.redirectUrl || json.redirect);
												if (redirectFromResp) {
													window.open(redirectFromResp, '_blank');
													return;
												}
											}
										}
									} catch (err) {
										// ignore tracking errors
									}

									// fallback: open redirectUrl if present in the object
									const redirect = (video as any).redirectUrl || (video as any).redirect || '';
									if (redirect) {
										window.open(redirect, '_blank');
									}
								}}
							/>
						))}
					</div>

					{list.length > initialVisible && (
						<div className="mt-6 text-center">
							<button
								onClick={() => setShowAll((s) => !s)}
								aria-expanded={showAll}
								className="inline-flex items-center justify-center gap-2 w-72 max-w-full mx-auto px-6 py-2 border border-gray-200 rounded-full text-sm font-medium text-gray-900 bg-white hover:bg-gray-50 shadow-sm transition-shadow"
							>
								<span>{showAll ? 'Show less' : 'Show more'}</span>
								<svg
									viewBox="0 0 24 24"
									width="20"
									height="20"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
									strokeLinecap="round"
									strokeLinejoin="round"
									className={`w-4 h-4 transform transition-transform duration-200 ${showAll ? 'rotate-180' : 'rotate-0'}`}
									aria-hidden="true"
								>
									<polyline points="6 9 12 15 18 9" />
								</svg>
							</button>
						</div>
					)}
				</>
			)}
		</div>
	)
}