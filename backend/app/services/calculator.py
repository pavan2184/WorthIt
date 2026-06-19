from app.models.decision import (
    CalculationResult,
    ChartPoint,
    DecisionOption,
    DecisionPayload,
    ScenarioResult,
)


def clamp(value: float, minimum: float = 0, maximum: float = 100) -> float:
    return max(minimum, min(maximum, value))


def normalized_fixed_cost(amount: float, frequency: str, days: int) -> float:
    if frequency == "one_time":
        return amount
    if frequency == "per_day":
        return amount * days
    if frequency == "per_week":
        return amount * (days / 7)
    if frequency == "per_month":
        return amount * (days / 30)
    if frequency == "per_year":
        return amount * (days / 365)
    return 0


def split_costs(option: DecisionOption, days: int) -> tuple[float, float]:
    fixed_cost = 0.0
    variable_cost_per_use = 0.0

    for cost in option.costs:
        if not cost.included:
            continue

        if cost.frequency == "per_use":
            variable_cost_per_use += cost.amount
        else:
            fixed_cost += normalized_fixed_cost(
                amount=cost.amount,
                frequency=cost.frequency,
                days=days,
            )

    return fixed_cost, variable_cost_per_use


def calculate_total(option: DecisionOption, days: int, uses: float) -> float:
    fixed_cost, variable_cost_per_use = split_costs(option, days)
    return fixed_cost + variable_cost_per_use * uses


def calculate_break_even_uses(payload: DecisionPayload) -> float | None:
    days = payload.usage.days
    option_a_fixed, option_a_variable = split_costs(payload.option_a, days)
    option_b_fixed, option_b_variable = split_costs(payload.option_b, days)

    denominator = option_b_variable - option_a_variable
    numerator = option_a_fixed - option_b_fixed

    if denominator <= 0:
        return None

    break_even = numerator / denominator

    if break_even < 0:
        return 0

    return break_even


def calculate_financial_score(
    value_adjusted_savings: float, option_b_total: float
) -> float:
    baseline = max(option_b_total, 1)
    savings_ratio = value_adjusted_savings / baseline
    return clamp(50 + savings_ratio * 250)


def calculate_usage_score(expected_uses: float, break_even_uses: float | None) -> float:
    if break_even_uses is None:
        return 50

    if break_even_uses == 0:
        return 100

    return clamp((expected_uses / break_even_uses) * 100)


def calculate_worth_it_score(
    financial_score: float,
    usage_score: float,
    convenience_score: float,
    flexibility_score: float,
    risk_score: float,
    confidence: float,
) -> float:
    raw_score = (
        0.40 * financial_score
        + 0.20 * usage_score
        + 0.15 * convenience_score
        + 0.10 * flexibility_score
        + 0.10 * risk_score
        + 0.05 * (confidence * 100)
    )
    return clamp(raw_score)


def get_verdict_label(score: float) -> str:
    if score >= 75:
        return "Worth it"
    if score >= 60:
        return "Probably worth it"
    if score >= 45:
        return "Close call"
    return "Not worth it"


def build_verdict_summary(
    payload: DecisionPayload,
    expected_uses: float,
    raw_savings: float,
    break_even_uses: float | None,
    break_even_uses_per_day: float | None,
) -> str:
    if break_even_uses is None:
        if raw_savings > 0:
            return (
                f"{payload.option_a.name} appears cheaper over this time period, "
                "but the alternative does not become more expensive with usage "
                "based on the current assumptions."
            )
        return (
            f"{payload.option_a.name} does not clearly break even because its "
            f"per-use cost is not lower than {payload.option_b.name}."
        )

    if raw_savings >= 0:
        return (
            f"At your expected usage of {expected_uses:.0f} uses, "
            f"{payload.option_a.name} is cheaper than {payload.option_b.name}. "
            f"The break-even point is around {break_even_uses:.0f} uses."
        )

    return (
        f"At your expected usage of {expected_uses:.0f} uses, "
        f"{payload.option_a.name} does not financially break even yet. "
        f"You need around {break_even_uses:.0f} uses total, or "
        f"{(break_even_uses_per_day or 0):.1f} uses per day, to break even."
    )


def build_scenarios(payload: DecisionPayload) -> list[ScenarioResult]:
    days = payload.usage.days
    base_uses_per_day = payload.usage.uses_per_day

    scenario_inputs = [
        ("Light usage", base_uses_per_day * 0.5),
        ("Expected usage", base_uses_per_day),
        ("Heavy usage", base_uses_per_day * 1.5),
    ]

    scenarios: list[ScenarioResult] = []

    for label, uses_per_day in scenario_inputs:
        uses = uses_per_day * days
        option_a_total = calculate_total(payload.option_a, days, uses)
        option_b_total = calculate_total(payload.option_b, days, uses)

        scenarios.append(
            ScenarioResult(
                label=label,
                uses=round(uses, 2),
                option_a_total=round(option_a_total, 2),
                option_b_total=round(option_b_total, 2),
                savings=round(option_b_total - option_a_total, 2),
            )
        )

    return scenarios


def build_chart_points(payload: DecisionPayload) -> list[ChartPoint]:
    days = payload.usage.days
    expected_uses = payload.usage.uses_per_day * days
    break_even_uses = calculate_break_even_uses(payload)

    max_uses = max(
        expected_uses * 1.75,
        (break_even_uses or 0) * 1.5,
        20,
    )
    step = max(max_uses / 20, 1)

    points: list[ChartPoint] = []
    current = 0.0

    while current <= max_uses + 0.001:
        option_a_total = calculate_total(payload.option_a, days, current)
        option_b_total = calculate_total(payload.option_b, days, current)

        points.append(
            ChartPoint(
                uses=round(current, 2),
                option_a_total=round(option_a_total, 2),
                option_b_total=round(option_b_total, 2),
            )
        )
        current += step

    return points


def calculate_decision(payload: DecisionPayload) -> CalculationResult:
    days = payload.usage.days
    expected_uses = payload.usage.uses_per_day * days

    option_a_total = calculate_total(payload.option_a, days, expected_uses)
    option_b_total = calculate_total(payload.option_b, days, expected_uses)
    raw_savings = option_b_total - option_a_total

    time_savings_value = (
        expected_uses
        * (payload.usage.minutes_saved_per_use_by_option_a / 60)
        * payload.usage.value_of_time_per_hour
    )
    value_adjusted_savings = raw_savings + time_savings_value

    break_even_uses = calculate_break_even_uses(payload)
    break_even_uses_per_day = (
        break_even_uses / days if break_even_uses is not None else None
    )

    financial_score = calculate_financial_score(
        value_adjusted_savings=value_adjusted_savings,
        option_b_total=option_b_total,
    )
    usage_score = calculate_usage_score(
        expected_uses=expected_uses,
        break_even_uses=break_even_uses,
    )
    worth_it_score = calculate_worth_it_score(
        financial_score=financial_score,
        usage_score=usage_score,
        convenience_score=payload.convenience_score,
        flexibility_score=payload.flexibility_score,
        risk_score=payload.risk_score,
        confidence=payload.usage.confidence,
    )

    return CalculationResult(
        expected_uses=round(expected_uses, 2),
        option_a_total=round(option_a_total, 2),
        option_b_total=round(option_b_total, 2),
        raw_savings=round(raw_savings, 2),
        time_savings_value=round(time_savings_value, 2),
        value_adjusted_savings=round(value_adjusted_savings, 2),
        break_even_uses=round(break_even_uses, 2)
        if break_even_uses is not None
        else None,
        break_even_uses_per_day=round(break_even_uses_per_day, 2)
        if break_even_uses_per_day is not None
        else None,
        financial_score=round(financial_score, 2),
        usage_score=round(usage_score, 2),
        worth_it_score=round(worth_it_score, 2),
        verdict_label=get_verdict_label(worth_it_score),
        verdict_summary=build_verdict_summary(
            payload=payload,
            expected_uses=expected_uses,
            raw_savings=raw_savings,
            break_even_uses=break_even_uses,
            break_even_uses_per_day=break_even_uses_per_day,
        ),
        scenario_results=build_scenarios(payload),
        chart_points=build_chart_points(payload),
    )
