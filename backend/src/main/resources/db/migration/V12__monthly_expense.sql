-- Running costs that are not the bottles themselves (visit cards, boxes, bags...), kept per month.
CREATE TABLE monthly_expense (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    month      DATE         NOT NULL,
    label      VARCHAR(60)  NOT NULL,
    amount     BIGINT       NOT NULL CHECK (amount > 0),
    created_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT monthly_expense_first_day CHECK (EXTRACT(DAY FROM month) = 1)
);

CREATE INDEX idx_monthly_expense_month ON monthly_expense (month);
