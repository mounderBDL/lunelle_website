-- failed login and order-lookup attempts, shared by every server copy and kept across restarts
CREATE TABLE attempt_failure (
    id           BIGSERIAL PRIMARY KEY,
    scope        VARCHAR(20)  NOT NULL,
    attempt_key  VARCHAR(400) NOT NULL,
    created_at   TIMESTAMPTZ  NOT NULL
);

CREATE INDEX idx_attempt_failure_scope_key ON attempt_failure (scope, attempt_key, created_at);
CREATE INDEX idx_attempt_failure_created ON attempt_failure (created_at);