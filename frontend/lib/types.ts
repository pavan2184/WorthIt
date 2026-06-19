export type CostFrequency =
  | "one_time"
  | "per_use"
  | "per_day"
  | "per_week"
  | "per_month"
  | "per_year";

export type DecisionType =
  | "rent_vs_pay_per_use"
  | "subscription_vs_pay_per_use"
  | "buy_vs_rent"
  | "generic";

export type InputMode = "user_values" | "use_estimates";

export type CostItem = {
  id: string;
  label: string;
  amount: number;
  frequency: CostFrequency;
  included: boolean;
  hidden: boolean;
};

export type DecisionOption = {
  name: string;
  costs: CostItem[];
};

export type UsageModel = {
  uses_per_day: number;
  days: number;
  confidence: number;
  value_of_time_per_hour: number;
  minutes_saved_per_use_by_option_a: number;
};

export type DecisionPayload = {
  title: string;
  decision_type: DecisionType;
  currency: string;
  option_a: DecisionOption;
  option_b: DecisionOption;
  usage: UsageModel;
  convenience_score: number;
  flexibility_score: number;
  risk_score: number;
};

export type ScenarioResult = {
  label: string;
  uses: number;
  option_a_total: number;
  option_b_total: number;
  savings: number;
};

export type ChartPoint = {
  uses: number;
  option_a_total: number;
  option_b_total: number;
};

export type CalculationResult = {
  expected_uses: number;
  option_a_total: number;
  option_b_total: number;
  raw_savings: number;
  time_savings_value: number;
  value_adjusted_savings: number;
  break_even_uses: number | null;
  break_even_uses_per_day: number | null;
  financial_score: number;
  usage_score: number;
  worth_it_score: number;
  verdict_label: string;
  verdict_summary: string;
  scenario_results: ScenarioResult[];
  chart_points: ChartPoint[];
};

export type FollowUpQuestion = {
  id: string;
  label: string;
  helper_text: string;
  target: "cost" | "usage" | "score";
  default_value: number;
  unit: string;
  option: "option_a" | "option_b" | null;
  cost_id: string | null;
  field: string | null;
  required: boolean;
  minimum: number;
};

export type ParseResponse = {
  draft_decision: DecisionPayload;
  missing_inputs: string[];
  suggested_hidden_costs: string[];
  follow_up_questions: FollowUpQuestion[];
};

export type SavedDecision = {
  id: string;
  payload: DecisionPayload;
  result: CalculationResult;
  created_at: string;
  updated_at: string;
};

export type TrackerEntryInput = {
  option_key: "option_a" | "option_b";
  spend_kind: "variable" | "fixed";
  expense_frequency: "per_use" | "per_day" | "per_month" | "per_year";
  date: string;
  uses: number;
  option_a_spend: number;
  option_b_spend: number;
  note: string;
};

export type TrackerEntry = TrackerEntryInput & {
  id: string;
  decision_id: string;
  created_at: string;
};

export type TrackerSummary = {
  days_logged: number;
  actual_uses: number;
  actual_option_a_uses: number;
  actual_option_b_uses: number;
  actual_option_a_spend: number;
  actual_option_b_spend: number;
  actual_option_a_fixed_spend: number;
  actual_option_b_fixed_spend: number;
  actual_option_a_variable_spend: number;
  actual_option_b_variable_spend: number;
  matched_option_b_spend: number;
  matched_option_b_uses: number;
  observed_uses_per_day: number;
  observed_option_a_variable_per_use: number;
  observed_option_b_variable_per_use: number;
  projected_uses: number;
  projected_option_a_total: number;
  projected_option_b_total: number;
  projected_savings: number;
  refined_break_even_uses: number | null;
  remaining_uses_to_break_even: number | null;
  projected_break_even_days_remaining: number | null;
  live_option_a_cost_to_date: number;
  live_option_b_cost_to_date: number;
  live_savings_to_date: number;
  verdict_label: string;
  verdict_summary: string;
};

export type TrackerResponse = {
  decision_id: string;
  payload: DecisionPayload;
  result: CalculationResult;
  entries: TrackerEntry[];
  summary: TrackerSummary;
};
