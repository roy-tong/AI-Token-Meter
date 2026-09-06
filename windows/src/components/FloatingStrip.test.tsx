import { fireEvent, render, screen } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"
import { FloatingStrip } from "./FloatingStrip"
import { unavailableSnapshots } from "../state/usage"
import { UsageRing } from "./UsageRing"
import behavior from "../../../contracts/fixtures/auxiliary/strip-behavior.json"
import { defaultStripPreferences } from "../state/stripPreferences"

describe("compact floating strip interactions", () => {
  it.each(behavior.densities)("matches shared $id dimensions", density => {
    render(<FloatingStrip snapshots={unavailableSnapshots} activeProvider={null} onProviderActivate={() => {}}
      preferences={{...defaultStripPreferences, density: density.id as "compact" | "comfortable"}} />)
    const style = screen.getByRole("navigation").style
    expect(style.getPropertyValue("--strip-width")).toBe(`${density.width}px`)
    expect(style.getPropertyValue("--strip-height")).toBe(`${density.height}px`)
    expect(style.getPropertyValue("--strip-ring")).toBe(`${density.ring}px`)
  })
  it("cached authentication failures retain quota and expose an action", () => {
    render(<UsageRing snapshot={{...unavailableSnapshots[0], status: "cached", usedRatio: 0.25, statusMessage: "Cached · sign in required"}} onActivate={() => {}} />)
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "25")
    expect(screen.getByRole("button")).toHaveAccessibleDescription("Action required")
  })
  it("refreshing keeps the last quota while announcing the separate operation", () => {
    render(<UsageRing snapshot={{...unavailableSnapshots[0], status: "refreshing", usedRatio: 0.25}} onActivate={() => {}} />)
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "25")
    expect(screen.getByRole("button")).toHaveAccessibleDescription("Refreshing")
  })
  it("renders only selected services in configured order", () => {
    render(<FloatingStrip snapshots={unavailableSnapshots} activeProvider={null} onProviderActivate={() => {}}
      preferences={{ density: "compact", foldDelay: 0, orderedProviders: ["deepseek", "codex", "claude"], hiddenProviders: ["codex"], hiddenUntil: null }} />)
    expect(screen.getAllByRole("button").map(b => b.getAttribute("aria-label"))).toEqual(["DeepSeek usage", "Claude Code usage"])
  })
  it("right clicking never starts dragging", () => {
    const drag = vi.fn()
    window.addEventListener("meter-drag-requested", drag)
    render(<FloatingStrip snapshots={unavailableSnapshots} activeProvider={null} onProviderActivate={() => {}} />)
    fireEvent.pointerDown(screen.getByRole("navigation"), { button: 2 })
    expect(drag).not.toHaveBeenCalled()
    window.removeEventListener("meter-drag-requested", drag)
  })
  it("folded handle exposes expansion instead of provider buttons", () => {
    render(<FloatingStrip snapshots={unavailableSnapshots} activeProvider={null} onProviderActivate={() => {}} folded />)
    expect(screen.queryByRole("button", {name: /Claude/})).not.toBeInTheDocument()
    expect(screen.getByRole("button", {name: "Expand floating meter"})).toBeInTheDocument()
  })
})
