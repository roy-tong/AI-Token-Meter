use ai_token_meter_windows::collectors::{
    CollectionError,
    refresh::{ProviderRefreshRequest, RefreshCoordinator, RefreshPriority, RefreshResult},
};
use ai_token_meter_windows::domain::ProviderId;
use std::sync::{
    Arc,
    atomic::{AtomicUsize, Ordering},
};

#[test]
fn clock_rollback_preserves_rate_limit_wait() {
    use ai_token_meter_windows::collectors::backoff::Backoff;
    let mut state = Backoff::failure(
        None,
        ProviderId::DeepSeek,
        CollectionError::RateLimited(90),
        100,
    );
    state.normalize_clock(99);
    assert!(!state.eligible(99, true));
    assert_eq!(state.next_eligible_at, 189);
    assert!(state.eligible(189, true));
}

#[test]
fn matches_shared_backoff_contract() {
    use ai_token_meter_windows::collectors::backoff::Backoff;
    let value: serde_json::Value = serde_json::from_str(include_str!(
        "../../../contracts/fixtures/auxiliary/strip-behavior.json"
    ))
    .unwrap();
    for row in value["backoff"].as_array().unwrap() {
        let (provider, error) = match row["kind"].as_str().unwrap() {
            "rateLimited" => (ProviderId::DeepSeek, CollectionError::RateLimited(0)),
            "authentication" => (ProviderId::Claude, CollectionError::AuthenticationRequired),
            "network" => (ProviderId::DeepSeek, CollectionError::Transport),
            _ => (ProviderId::Codex, CollectionError::Transport),
        };
        let mut state = Backoff::failure(None, provider, error, 100);
        assert_eq!(state.next_eligible_at - 100, row["first"].as_i64().unwrap());
        for _ in 0..10 {
            state = Backoff::failure(Some(&state), provider, error, 100);
        }
        assert_eq!(state.next_eligible_at - 100, row["cap"].as_i64().unwrap());
    }
}

#[test]
fn rate_limit_survives_restart_and_manual_requests_without_recollecting() {
    let dir = tempfile::tempdir().unwrap();
    let path = dir.path().join("backoff.json");
    let calls = Arc::new(AtomicUsize::new(0));
    for _ in 0..2 {
        let coordinator = RefreshCoordinator::with_backoff_path(Some(path.clone()));
        let calls = calls.clone();
        let request = ProviderRefreshRequest::new(ProviderId::DeepSeek, move |_| {
            calls.fetch_add(1, Ordering::SeqCst);
            Err(CollectionError::RateLimited(90))
        });
        let result = coordinator.refresh(request, RefreshPriority::Manual);
        assert!(matches!(
            result,
            RefreshResult::Failed(_) | RefreshResult::Deferred(_)
        ));
    }
    assert_eq!(calls.load(Ordering::SeqCst), 1);
}
