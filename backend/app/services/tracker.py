from app.models.decision import (
    CalculationResult,
    DecisionPayload,
    TrackerEntry,
    TrackerResponse,
    TrackerSummary,
)
from app.services.calculator import calculate_decision, split_costs


def _round_optional(value: float | None, digits: int = 2) -> float | None:
    return round(value, digits) if value is not None else None


def _build_tracker_summary(
    payload: DecisionPayload, entries: list[TrackerEntry]
) -> TrackerSummary:
    days = payload.usage.days
    option_a_fixed, option_a_variable = split_costs(payload.option_a, days)
    option_b_fixed, option_b_variable = split_costs(payload.option_b, days)

    logged_dates = {entry.date for entry in entries}
    days_logged = len(logged_dates)
    option_a_entries = [entry for entry in entries if entry.option_key == "option_a"]
    option_b_entries = [entry for entry in entries if entry.option_key == "option_b"]
    option_a_fixed_entries = [
        entry
        for entry in option_a_entries
        if _is_fixed_entry(
            entry=entry,
            option_fixed=option_a_fixed,
            option_variable=option_a_variable,
            comparison_variable=option_b_variable,
        )
    ]
    option_b_fixed_entries = [
        entry
        for entry in option_b_entries
        if _is_fixed_entry(
            entry=entry,
            option_fixed=option_b_fixed,
            option_variable=option_b_variable,
            comparison_variable=option_a_variable,
        )
    ]
    option_a_variable_entries = [
        entry for entry in option_a_entries if entry not in option_a_fixed_entries
    ]
    option_b_variable_entries = [
        entry for entry in option_b_entries if entry not in option_b_fixed_entries
    ]

    actual_option_a_uses = len(option_a_entries)
    actual_option_b_uses = len(option_b_entries)
    actual_uses = actual_option_a_uses + actual_option_b_uses
    actual_option_a_variable_uses = len(option_a_variable_entries)
    actual_option_b_variable_uses = len(option_b_variable_entries)
    matched_option_b_entries = [
        entry
        for entry in option_a_entries
        if entry.expense_frequency == "per_use" and entry.option_b_spend > 0
    ]
    matched_option_b_spend = sum(
        entry.option_b_spend for entry in matched_option_b_entries
    )
    matched_option_b_uses = len(matched_option_b_entries)
    actual_option_a_fixed_spend = sum(
        entry.option_a_spend for entry in option_a_fixed_entries
    )
    actual_option_b_fixed_spend = sum(
        entry.option_b_spend for entry in option_b_fixed_entries
    )
    projected_option_a_logged_fixed = sum(
        _normalize_logged_expense(entry.option_a_spend, entry.expense_frequency, days)
        for entry in option_a_fixed_entries
    )
    projected_option_b_logged_fixed = sum(
        _normalize_logged_expense(entry.option_b_spend, entry.expense_frequency, days)
        for entry in option_b_fixed_entries
    )
    actual_option_a_variable_spend = sum(
        entry.option_a_spend for entry in option_a_variable_entries
    )
    actual_option_b_variable_spend = sum(
        entry.option_b_spend for entry in option_b_variable_entries
    )
    actual_option_a_spend = actual_option_a_fixed_spend + actual_option_a_variable_spend
    actual_option_b_spend = actual_option_b_fixed_spend + actual_option_b_variable_spend

    observed_uses_per_day = (
        actual_uses / days_logged
        if days_logged > 0 and actual_uses > 0
        else payload.usage.uses_per_day
    )
    projected_uses = observed_uses_per_day * days

    observed_option_a_variable = (
        actual_option_a_variable_spend / actual_option_a_variable_uses
        if actual_option_a_variable_uses > 0 and actual_option_a_variable_spend > 0
        else option_a_variable
    )
    option_b_reference_spend = actual_option_b_variable_spend + matched_option_b_spend
    option_b_reference_uses = actual_option_b_variable_uses + matched_option_b_uses

    observed_option_b_variable = (
        option_b_reference_spend / option_b_reference_uses
        if option_b_reference_uses > 0 and option_b_reference_spend > 0
        else option_b_variable
    )
    projected_option_a_fixed = _projected_fixed_cost(
        option=payload.option_a,
        days=days,
        projected_logged_fixed=projected_option_a_logged_fixed,
    )
    projected_option_b_fixed = _projected_fixed_cost(
        option=payload.option_b,
        days=days,
        projected_logged_fixed=projected_option_b_logged_fixed,
    )

    projected_option_a_total = projected_option_a_fixed + (
        observed_option_a_variable * projected_uses
    )
    projected_option_b_total = projected_option_b_fixed + (
        observed_option_b_variable * projected_uses
    )
    projected_savings = projected_option_b_total - projected_option_a_total

    denominator = observed_option_b_variable - observed_option_a_variable
    numerator = projected_option_a_fixed - projected_option_b_fixed
    refined_break_even_uses = None

    if denominator > 0:
        refined_break_even_uses = max(numerator / denominator, 0)

    remaining_uses = (
        max(refined_break_even_uses - actual_option_a_uses, 0)
        if refined_break_even_uses is not None
        else None
    )
    days_remaining = (
        remaining_uses / observed_uses_per_day
        if remaining_uses is not None and observed_uses_per_day > 0
        else None
    )

    live_option_a_cost_to_date = actual_option_a_spend
    live_option_b_cost_to_date = actual_option_b_spend + matched_option_b_spend
    live_savings_to_date = live_option_b_cost_to_date - live_option_a_cost_to_date

    verdict_label = _tracker_verdict_label(
        actual_uses=actual_option_a_uses,
        projected_savings=projected_savings,
        refined_break_even_uses=refined_break_even_uses,
    )
    verdict_summary = _tracker_verdict_summary(
        payload=payload,
        actual_uses=actual_option_a_uses,
        projected_uses=projected_uses,
        projected_savings=projected_savings,
        remaining_uses=remaining_uses,
        days_remaining=days_remaining,
        refined_break_even_uses=refined_break_even_uses,
    )

    return TrackerSummary(
        days_logged=days_logged,
        actual_uses=round(actual_uses, 2),
        actual_option_a_uses=round(actual_option_a_uses, 2),
        actual_option_b_uses=round(actual_option_b_uses, 2),
        actual_option_a_spend=round(actual_option_a_spend, 2),
        actual_option_b_spend=round(actual_option_b_spend, 2),
        actual_option_a_fixed_spend=round(actual_option_a_fixed_spend, 2),
        actual_option_b_fixed_spend=round(actual_option_b_fixed_spend, 2),
        actual_option_a_variable_spend=round(actual_option_a_variable_spend, 2),
        actual_option_b_variable_spend=round(actual_option_b_variable_spend, 2),
        matched_option_b_spend=round(matched_option_b_spend, 2),
        matched_option_b_uses=round(matched_option_b_uses, 2),
        observed_uses_per_day=round(observed_uses_per_day, 2),
        observed_option_a_variable_per_use=round(observed_option_a_variable, 2),
        observed_option_b_variable_per_use=round(observed_option_b_variable, 2),
        projected_uses=round(projected_uses, 2),
        projected_option_a_total=round(projected_option_a_total, 2),
        projected_option_b_total=round(projected_option_b_total, 2),
        projected_savings=round(projected_savings, 2),
        refined_break_even_uses=_round_optional(refined_break_even_uses),
        remaining_uses_to_break_even=_round_optional(remaining_uses),
        projected_break_even_days_remaining=_round_optional(days_remaining),
        live_option_a_cost_to_date=round(live_option_a_cost_to_date, 2),
        live_option_b_cost_to_date=round(live_option_b_cost_to_date, 2),
        live_savings_to_date=round(live_savings_to_date, 2),
        verdict_label=verdict_label,
        verdict_summary=verdict_summary,
    )


def _is_fixed_entry(
    entry: TrackerEntry,
    option_fixed: float,
    option_variable: float,
    comparison_variable: float,
) -> bool:
    if entry.expense_frequency != "per_use":
        return True

    if entry.spend_kind == "fixed":
        return True

    spend = (
        entry.option_a_spend
        if entry.option_key == "option_a"
        else entry.option_b_spend
    )
    if option_fixed <= 0 or spend <= 0:
        return False

    per_use = spend
    fixed_like_threshold = max(option_variable * 10, comparison_variable * 3, 100_000)

    return spend >= option_fixed * 0.5 and per_use > fixed_like_threshold


def _normalize_logged_expense(amount: float, frequency: str, days: int) -> float:
    if frequency == "per_day":
        return amount * days
    if frequency == "per_month":
        return amount * (days / 30)
    if frequency == "per_year":
        return amount * (days / 365)
    return amount


def _projected_fixed_cost(
    option,
    days: int,
    projected_logged_fixed: float,
) -> float:
    if projected_logged_fixed <= 0:
        fixed_cost, _ = split_costs(option, days)
        return fixed_cost

    return projected_logged_fixed + _included_hidden_fixed_cost(option, days)


def _included_hidden_fixed_cost(option, days: int) -> float:
    return sum(
        _normalize_logged_expense(cost.amount, cost.frequency, days)
        for cost in option.costs
        if cost.included and cost.hidden and cost.frequency != "per_use"
    )


def _tracker_verdict_label(
    actual_uses: float,
    projected_savings: float,
    refined_break_even_uses: float | None,
) -> str:
    if refined_break_even_uses is None:
        return "No clear break-even"
    if actual_uses >= refined_break_even_uses:
        return "Break-even reached"
    if projected_savings >= 0:
        return "On track"
    return "Behind pace"


def _tracker_verdict_summary(
    payload: DecisionPayload,
    actual_uses: float,
    projected_uses: float,
    projected_savings: float,
    remaining_uses: float | None,
    days_remaining: float | None,
    refined_break_even_uses: float | None,
) -> str:
    if refined_break_even_uses is None:
        return (
            "Your logged costs do not currently create a normal break-even point. "
            f"{payload.option_a.name} needs a lower per-use cost than "
            f"{payload.option_b.name} to break even through usage."
        )

    if actual_uses >= refined_break_even_uses:
        return (
            f"You have logged {actual_uses:.0f} uses, which is at or above the "
            f"current break-even point of {refined_break_even_uses:.0f} uses."
        )

    if projected_savings >= 0:
        return (
            f"Based on your logs, you are tracking toward about "
            f"{projected_uses:.0f} uses. You need about "
            f"{(remaining_uses or 0):.0f} more uses to break even."
        )

    return (
        f"Based on your logs, you are tracking toward about {projected_uses:.0f} "
        f"uses and still need about {(remaining_uses or 0):.0f} more uses. "
        f"At the current pace, that is roughly {(days_remaining or 0):.1f} days."
    )


def build_tracker_response(
    decision_doc: dict, entry_docs: list[dict]
) -> TrackerResponse:
    payload = DecisionPayload.model_validate(decision_doc["payload"])
    result = CalculationResult.model_validate(
        decision_doc.get("result") or calculate_decision(payload).model_dump()
    )
    entries = [TrackerEntry.model_validate(entry_doc) for entry_doc in entry_docs]

    return TrackerResponse(
        decision_id=decision_doc["id"],
        payload=payload,
        result=result,
        entries=entries,
        summary=_build_tracker_summary(payload, entries),
    )
