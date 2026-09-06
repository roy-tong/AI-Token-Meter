import Foundation
import Testing
@testable import AIMeterCore

@Suite("Floating strip preferences and idle folding")
struct FloatingStripPreferencesTests {
    @Test func unknownFieldsDoNotEraseRecognizedPreferences() throws {
        let data = Data(#"{"density":"future","foldDelay":5,"orderedProviders":["codex","future","claude"],"hiddenProviders":["claude"]}"#.utf8)
        let value = try JSONDecoder().decode(FloatingStripPreferences.self, from: data)
        #expect(value.density == .compact)
        #expect(value.foldDelay == .fiveSeconds)
        #expect(value.visibleProviders == [.codex, .deepSeek])
    }
    @Test func restoresDefaultsAndSanitizesLayout() throws {
        let suite = UUID().uuidString
        let defaults = UserDefaults(suiteName: suite)!
        defer { defaults.removePersistentDomain(forName: suite) }
        let store = FloatingStripPreferencesStore(defaults: defaults)
        var value = store.load()
        #expect(value.density == .compact)
        #expect(value.foldDelay == .never)
        value.orderedProviders = [.codex, .codex]
        value.hiddenProviders = [.claude, .codex, .deepSeek]
        store.save(value)
        let restored = store.load()
        #expect(restored.orderedProviders == [.codex, .claude, .deepSeek])
        #expect(restored.visibleProviders == [.codex])
        #expect(!restored.settingVisible(.codex, visible: false).visibleProviders.isEmpty)
    }

    @Test func providerRemovalShrinksOnlyTheMiddle() {
        #expect(FloatingStripDensity.compact.height(providerCount: 2) == 228)
        #expect(FloatingStripDensity.compact.height(providerCount: 1) == 170)
        #expect(FloatingStripDensity.comfortable.height(providerCount: 2) == 284)
    }

    @Test func hiddenDeadlineExpiresWithoutChangingPreference() {
        let value = FloatingStripPreferences(hiddenUntil: 100)
        #expect(value.isTemporarilyHidden(now: 99))
        #expect(!value.isTemporarilyHidden(now: 100))
    }

    @Test func foldDeadlineIsCancelledByInteraction() {
        var state = FloatingStripFoldState()
        state.update(now: 0, delay: 5, locked: false)
        state.update(now: 4, delay: 5, locked: true)
        state.update(now: 6, delay: 5, locked: false)
        state.update(now: 10, delay: 5, locked: false)
        #expect(!state.isFolded)
        state.update(now: 11, delay: 5, locked: false)
        #expect(state.isFolded)
        state.update(now: 12, delay: 5, locked: true)
        #expect(!state.isFolded)
        state.update(now: 30, delay: 0, locked: false)
        #expect(!state.isFolded)
    }
}
