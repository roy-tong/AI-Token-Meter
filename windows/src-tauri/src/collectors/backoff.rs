use super::CollectionError;
use crate::domain::ProviderId;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct Backoff {
    pub kind: String,
    pub failures: u32,
    pub recorded_at: i64,
    pub next_eligible_at: i64,
}
impl Backoff {
    pub fn eligible(&self, now: i64, manual: bool) -> bool {
        let mut normalized = self.clone();
        normalized.normalize_clock(now);
        now >= normalized.next_eligible_at
            || (manual && (self.kind == "network" || self.kind == "cli"))
    }
    pub fn normalize_clock(&mut self, now: i64) {
        if now < self.recorded_at {
            self.next_eligible_at = now.saturating_add(
                self.next_eligible_at
                    .saturating_sub(self.recorded_at)
                    .clamp(0, 86400),
            );
            self.recorded_at = now;
        }
        if self.next_eligible_at.saturating_sub(now) > 86400 {
            self.next_eligible_at = now.saturating_add(86400);
            self.recorded_at = now;
        }
    }
    pub fn failure(
        previous: Option<&Self>,
        provider: ProviderId,
        error: CollectionError,
        now: i64,
    ) -> Self {
        let (kind, base, cap, retry) = match error {
            CollectionError::RateLimited(seconds) => ("rateLimited", 60u64, 900u64, seconds),
            CollectionError::AuthenticationRequired | CollectionError::SetupRequired => {
                ("authentication", 900, 900, 0)
            }
            _ if provider == ProviderId::DeepSeek => ("network", 30, 600, 0),
            _ => ("cli", 30, 300, 0),
        };
        let failures = previous
            .filter(|p| p.kind == kind)
            .map_or(1, |p| p.failures.saturating_add(1).min(10));
        let wait = (base * 2u64.pow(failures - 1))
            .min(cap)
            .max(retry)
            .min(86400);
        Self {
            kind: kind.into(),
            failures,
            recorded_at: now,
            next_eligible_at: now.saturating_add(wait as i64),
        }
    }
}
