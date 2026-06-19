from app.models.decision import CostItem, DecisionOption, DecisionPayload, UsageModel
from app.services.calculator import calculate_decision, normalized_fixed_cost


def scooter_payload(include_repair: bool = False) -> DecisionPayload:
    return DecisionPayload(
        title="Scooter rental vs GrabBike",
        decision_type="rent_vs_pay_per_use",
        currency="VND",
        option_a=DecisionOption(
            name="Monthly scooter rental",
            costs=[
                CostItem(
                    id="rental",
                    label="Monthly rental",
                    amount=1800000,
                    frequency="per_month",
                ),
                CostItem(
                    id="fuel",
                    label="Fuel",
                    amount=300000,
                    frequency="per_month",
                    hidden=True,
                ),
                CostItem(
                    id="parking",
                    label="Parking",
                    amount=5000,
                    frequency="per_use",
                    hidden=True,
                ),
                CostItem(
                    id="repair_risk",
                    label="Repair risk buffer",
                    amount=150000,
                    frequency="per_month",
                    included=include_repair,
                    hidden=True,
                ),
            ],
        ),
        option_b=DecisionOption(
            name="GrabBike",
            costs=[
                CostItem(
                    id="grab_fare",
                    label="Average GrabBike fare",
                    amount=35000,
                    frequency="per_use",
                )
            ],
        ),
        usage=UsageModel(uses_per_day=2, days=30, confidence=0.7),
        convenience_score=75,
        flexibility_score=55,
        risk_score=60,
    )


def test_scooter_vs_grab_calculation():
    result = calculate_decision(scooter_payload())

    assert result.expected_uses == 60
    assert result.option_a_total == 2400000
    assert result.option_b_total == 2100000
    assert result.raw_savings == -300000
    assert result.break_even_uses == 70
    assert result.break_even_uses_per_day == 2.33
    assert result.verdict_label == "Close call"


def test_hidden_cost_toggle_changes_total():
    without_repair = calculate_decision(scooter_payload(include_repair=False))
    with_repair = calculate_decision(scooter_payload(include_repair=True))

    assert without_repair.option_a_total == 2400000
    assert with_repair.option_a_total == 2550000
    assert with_repair.raw_savings == -450000


def test_no_break_even_when_option_a_per_use_not_lower():
    payload = scooter_payload()
    payload.option_a.costs.append(
        CostItem(
            id="expensive_variable",
            label="Expensive variable cost",
            amount=40000,
            frequency="per_use",
        )
    )

    result = calculate_decision(payload)

    assert result.break_even_uses is None
    assert result.usage_score == 50


def test_fixed_cost_normalization():
    assert normalized_fixed_cost(100, "one_time", 30) == 100
    assert normalized_fixed_cost(100, "per_day", 30) == 3000
    assert normalized_fixed_cost(700, "per_week", 14) == 1400
    assert normalized_fixed_cost(3000, "per_month", 15) == 1500
    assert round(normalized_fixed_cost(3650, "per_year", 30), 2) == 300
