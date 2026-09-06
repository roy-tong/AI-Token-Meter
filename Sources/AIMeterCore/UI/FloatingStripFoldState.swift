import Foundation

/// Monotonic time is supplied by the window owner; no detached timer can fold a new interaction.
public struct FloatingStripFoldState: Sendable {
    public private(set) var isFolded = false
    private var deadline: TimeInterval?
    private var previousDelay: TimeInterval = 0
    public init() {}

    public mutating func update(now: TimeInterval, delay: TimeInterval, locked: Bool) {
        if locked || delay <= 0 || delay != previousDelay {
            isFolded = false
            deadline = nil
        }
        previousDelay = delay
        guard !locked, delay > 0 else { return }
        if deadline == nil { deadline = now + delay }
        if let deadline, now >= deadline { isFolded = true }
    }
}
