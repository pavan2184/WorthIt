from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


CostFrequency = Literal[
    "one_time",
    "per_use",
    "per_day",
    "per_week",
    "per_month",
    "per_year",
]


DecisionType = Literal[
    "rent_vs_pay_per_use",
    "subscription_vs_pay_per_use",
    "buy_vs_rent",
    "generic",
]


InputMode = Literal["user_values", "use_estimates"]
TrackerOptionKey = Literal["option_a", "option_b"]
TrackerSpendKind = Literal["variable", "fixed"]
TrackerExpenseFrequency = Literal["per_use", "per_day", "per_month", "per_year"]


class CostItem(BaseModel):
    id: str
    label: str
    amount: float = Field(ge=0)
    frequency: CostFrequency
    included: bool = True
    hidden: bool = False


class DecisionOption(BaseModel):
    name: str
    costs: list[CostItem] = Field(default_factory=list)


class UsageModel(BaseModel):
    uses_per_day: float = Field(ge=0)
    days: int = Field(gt=0)
    confidence: float = Field(default=0.7, ge=0, le=1)
    value_of_time_per_hour: float = Field(default=0, ge=0)
    minutes_saved_per_use_by_option_a: float = 0


class DecisionPayload(BaseModel):
    title: str
    decision_type: DecisionType = "generic"
    currency: str = "VND"
    option_a: DecisionOption
    option_b: DecisionOption
    usage: UsageModel
    convenience_score: float = Field(default=50, ge=0, le=100)
    flexibility_score: float = Field(default=50, ge=0, le=100)
    risk_score: float = Field(default=50, ge=0, le=100)


class ScenarioResult(BaseModel):
    label: str
    uses: float
    option_a_total: float
    option_b_total: float
    savings: float


class ChartPoint(BaseModel):
    uses: float
    option_a_total: float
    option_b_total: float


class CalculationResult(BaseModel):
    expected_uses: float
    option_a_total: float
    option_b_total: float
    raw_savings: float
    time_savings_value: float
    value_adjusted_savings: float
    break_even_uses: float | None
    break_even_uses_per_day: float | None
    financial_score: float
    usage_score: float
    worth_it_score: float
    verdict_label: str
    verdict_summary: str
    scenario_results: list[ScenarioResult]
    chart_points: list[ChartPoint]


class TrackerEntryCreate(BaseModel):
    option_key: TrackerOptionKey = "option_a"
    spend_kind: TrackerSpendKind = "variable"
    expense_frequency: TrackerExpenseFrequency = "per_use"
    date: str
    uses: float = Field(default=1, ge=0)
    option_a_spend: float = Field(default=0, ge=0)
    option_b_spend: float = Field(default=0, ge=0)
    note: str = ""


class TrackerEntry(TrackerEntryCreate):
    id: str
    decision_id: str
    created_at: datetime


class TrackerSummary(BaseModel):
    days_logged: int
    actual_uses: float
    actual_option_a_uses: float
    actual_option_b_uses: float
    actual_option_a_spend: float
    actual_option_b_spend: float
    actual_option_a_fixed_spend: float
    actual_option_b_fixed_spend: float
    actual_option_a_variable_spend: float
    actual_option_b_variable_spend: float
    matched_option_b_spend: float
    matched_option_b_uses: float
    observed_uses_per_day: float
    observed_option_a_variable_per_use: float
    observed_option_b_variable_per_use: float
    projected_uses: float
    projected_option_a_total: float
    projected_option_b_total: float
    projected_savings: float
    refined_break_even_uses: float | None
    remaining_uses_to_break_even: float | None
    projected_break_even_days_remaining: float | None
    live_option_a_cost_to_date: float
    live_option_b_cost_to_date: float
    live_savings_to_date: float
    verdict_label: str
    verdict_summary: str


class TrackerResponse(BaseModel):
    decision_id: str
    payload: DecisionPayload
    result: CalculationResult
    entries: list[TrackerEntry]
    summary: TrackerSummary


class FollowUpQuestion(BaseModel):
    id: str
    label: str
    helper_text: str
    target: Literal["cost", "usage", "score"]
    default_value: float
    unit: str
    option: Literal["option_a", "option_b"] | None = None
    cost_id: str | None = None
    field: str | None = None
    required: bool = True
    minimum: float = 0


class ParseRequest(BaseModel):
    raw_text: str
    currency: str = "VND"
    input_mode: InputMode = "use_estimates"


class ParseResponse(BaseModel):
    draft_decision: DecisionPayload
    missing_inputs: list[str]
    suggested_hidden_costs: list[str]
    follow_up_questions: list[FollowUpQuestion] = Field(default_factory=list)
