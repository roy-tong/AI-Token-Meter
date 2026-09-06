import type { ProviderId, UsageSnapshot } from "../state/usage"
import { UsageRing } from "./UsageRing"
import { defaultStripPreferences, type StripPreferences } from "../state/stripPreferences"
import type { CSSProperties } from "react"

type FloatingStripProps = {
  snapshots: UsageSnapshot[]
  activeProvider: ProviderId | null
  onProviderActivate: (provider: ProviderId) => void
  preferences?: StripPreferences
  folded?: boolean
  onInteraction?: (kind: "pointer" | "focus", active: boolean) => void
  onContextMenu?: () => void
}

export function FloatingStrip({ snapshots, activeProvider, onProviderActivate, preferences = defaultStripPreferences,
  folded = false, onInteraction, onContextMenu }: FloatingStripProps) {
  const visible = preferences.orderedProviders.filter(id => !preferences.hiddenProviders.includes(id))
    .map(id => snapshots.find(s => s.providerId === id)).filter(s => s != null)
  const compact = preferences.density === "compact"
  const width = compact ? 78 : 108
  const height = (compact ? 286 : 356) - (3 - Math.max(visible.length, 1)) * (compact ? 58 : 72)
  const style = { "--strip-width": `${width}px`, "--strip-height": `${height}px`,
    "--strip-ring": compact ? "48px" : "60px", "--strip-gap": compact ? "10px" : "12px",
    "--strip-logo": compact ? "21px" : "26.4px", "--strip-line": compact ? "3.5px" : "5px" } as CSSProperties
  if (folded) return <button aria-label="Expand floating meter" className="meter-folded"
    onPointerEnter={() => onInteraction?.("pointer", true)}
    onPointerLeave={() => onInteraction?.("pointer", false)}
    onFocus={() => onInteraction?.("focus", true)} onBlur={() => onInteraction?.("focus", false)}
    onContextMenu={event => { event.preventDefault(); onContextMenu?.() }}
    onClick={() => onInteraction?.("pointer", true)}><span /></button>
  return (
    <>
      <MeterClipPaths density={preferences.density} count={visible.length} />
      <nav
        aria-label="AI usage providers"
        className="floating-strip"
        data-density={preferences.density}
        style={style}
        onPointerEnter={() => onInteraction?.("pointer", true)}
        onPointerLeave={() => onInteraction?.("pointer", false)}
        onFocus={() => onInteraction?.("focus", true)}
        onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) onInteraction?.("focus", false) }}
        onContextMenu={event => { event.preventDefault(); onContextMenu?.() }}
        onPointerDown={(event) => {
          if (event.button === 0 && !(event.target as HTMLElement).closest("button")) {
            window.dispatchEvent(new CustomEvent("meter-drag-requested"))
          }
        }}
      >
        <div aria-hidden="true" className="floating-strip__drag-handle" />
        {visible.map((snapshot) => (
          <UsageRing
            key={snapshot.providerId}
            onActivate={() => onProviderActivate(snapshot.providerId)}
            selected={activeProvider === snapshot.providerId}
            snapshot={snapshot}
          />
        ))}
      </nav>
    </>
  )
}

export function MeterClipPaths({ density = "comfortable", count = 3 }: { density?: string, count?: number }) {
  const compact = density === "compact"
  const width = compact ? 78 : 108
  const removed = (3 - Math.max(count, 1)) * (compact ? 58 : 72)
  const height = (compact ? 286 : 356) - removed
  const path = compact
    ? `M 78 12 C 71 17 63 21 48 22 C 21 23 0 42 0 70 L 0 ${216-removed} C 0 ${244-removed} 21 ${263-removed} 48 ${264-removed} C 63 ${265-removed} 71 ${269-removed} 78 ${274-removed} Z`
    : `M 108 16 C 98 23 88 27 66 28 C 29 29 0 54 0 88 L 0 ${268-removed} C 0 ${302-removed} 29 ${327-removed} 66 ${328-removed} C 88 ${329-removed} 98 ${333-removed} 108 ${340-removed} Z`
  return (
    <svg aria-hidden="true" className="meter-clip-paths" focusable="false">
      <defs>
        <clipPath id="strip-clip-right" clipPathUnits="objectBoundingBox">
          <path d={path} transform={`scale(${1/width} ${1/height})`} />
        </clipPath>
        <clipPath id="strip-clip-left" clipPathUnits="objectBoundingBox">
          <path d={path} transform={`translate(1 0) scale(${-1/width} ${1/height})`} />
        </clipPath>
        <clipPath id="meter-clip-right" clipPathUnits="objectBoundingBox">
          <path d="M 1 0.0449438 C 0.9074074 0.0646067 0.8148148 0.0758427 0.6111111 0.0786517 C 0.2685185 0.0814607 0 0.1516854 0 0.247191 L 0 0.752809 C 0 0.8483146 0.2685185 0.9185393 0.6111111 0.9213483 C 0.8148148 0.9241573 0.9074074 0.9353933 1 0.9550562 Z" />
        </clipPath>
        <clipPath id="meter-clip-left" clipPathUnits="objectBoundingBox">
          <path d="M 0 0.0449438 C 0.0925926 0.0646067 0.1851852 0.0758427 0.3888889 0.0786517 C 0.7314815 0.0814607 1 0.1516854 1 0.247191 L 1 0.752809 C 1 0.8483146 0.7314815 0.9185393 0.3888889 0.9213483 C 0.1851852 0.9241573 0.0925926 0.9353933 0 0.9550562 Z" />
        </clipPath>
      </defs>
    </svg>
  )
}
