from app.models.decision import (
    CostItem,
    DecisionOption,
    DecisionPayload,
    FollowUpQuestion,
    ParseRequest,
    ParseResponse,
    UsageModel,
)


_VND_PER_CURRENCY_UNIT = {
    "VND": 1,
    "USD": 25_000,
    "EUR": 27_000,
    "GBP": 31_500,
    "SGD": 18_500,
    "INR": 300,
    "JPY": 170,
    "AUD": 16_500,
    "CAD": 18_500,
}


async def parse_decision_text(request: ParseRequest) -> ParseResponse:
    text = request.raw_text.lower()
    currency = normalize_currency(request.currency)

    if "scooter" in text and ("grab" in text or "grabbike" in text):
        return apply_input_mode(build_scooter_vs_grab_draft(currency), request.input_mode)

    if "gym" in text:
        return apply_input_mode(build_gym_draft(currency), request.input_mode)

    if "camera" in text and "rent" in text:
        return apply_input_mode(build_camera_draft(currency), request.input_mode)

    if "netflix" in text:
        return apply_input_mode(build_netflix_draft(currency), request.input_mode)

    if "subscription" in text or "pay-per-use" in text:
        return apply_input_mode(build_subscription_draft(currency), request.input_mode)

    if "cowork" in text or "cafe" in text or "café" in text:
        return apply_input_mode(build_coworking_draft(currency), request.input_mode)

    return apply_input_mode(build_generic_draft(request.raw_text, currency), request.input_mode)


def apply_input_mode(response: ParseResponse, input_mode: str) -> ParseResponse:
    if input_mode == "user_values":
        return ParseResponse(
            draft_decision=response.draft_decision,
            missing_inputs=response.missing_inputs,
            suggested_hidden_costs=response.suggested_hidden_costs,
            follow_up_questions=build_follow_up_questions(response.draft_decision),
        )

    return ParseResponse(
        draft_decision=response.draft_decision,
        missing_inputs=[],
        suggested_hidden_costs=response.suggested_hidden_costs,
        follow_up_questions=[],
    )


def build_follow_up_questions(payload: DecisionPayload) -> list[FollowUpQuestion]:
    questions: list[FollowUpQuestion] = []
    usage_label, usage_helper_text, usage_unit = usage_question_copy(payload)

    for option_key, option in [
        ("option_a", payload.option_a),
        ("option_b", payload.option_b),
    ]:
        for cost in option.costs:
            if not cost.included:
                continue

            questions.append(
                FollowUpQuestion(
                    id=f"{option_key}_{cost.id}",
                    label=f"{cost.label} for {option.name}",
                    helper_text="Enter the value you already know. You can edit it again in the dashboard.",
                    target="cost",
                    option=option_key,
                    cost_id=cost.id,
                    default_value=cost.amount,
                    unit=cost_unit(payload.currency, cost.frequency),
                )
            )

    questions.extend(
        [
            FollowUpQuestion(
                id="usage_uses_per_day",
                label=usage_label,
                helper_text=usage_helper_text,
                target="usage",
                field="uses_per_day",
                default_value=payload.usage.uses_per_day,
                unit=usage_unit,
            ),
            FollowUpQuestion(
                id="usage_days",
                label="Decision period",
                helper_text="How many days should this comparison cover?",
                target="usage",
                field="days",
                default_value=payload.usage.days,
                unit="days",
                minimum=1,
            ),
        ]
    )

    return questions


def usage_question_copy(payload: DecisionPayload) -> tuple[str, str, str]:
    decision_text = " ".join(
        [payload.title, payload.option_a.name, payload.option_b.name]
    ).lower()

    if any(
        token in decision_text
        for token in ["scooter", "grab", "trip", "ride"]
    ):
        return (
            "Expected trips per day",
            "Count one ride as one use.",
            "trips/day",
        )

    if any(
        token in decision_text
        for token in ["netflix", "pay-per-view", "movie", "show"]
    ):
        return (
            "Expected movies or shows per day",
            "Count one movie, episode, or rental as one use.",
            "views/day",
        )

    if "gym" in decision_text or "day pass" in decision_text:
        return (
            "Expected visits per day",
            "Count one gym visit as one use.",
            "visits/day",
        )

    if "cowork" in decision_text or "cafe" in decision_text:
        return (
            "Expected work sessions per day",
            "Count one work session as one use.",
            "sessions/day",
        )

    return (
        "Expected uses per day",
        "Count one use of either option.",
        "uses/day",
    )


def cost_unit(currency: str, frequency: str) -> str:
    labels = {
        "one_time": f"{currency} one-time",
        "per_use": f"{currency}/use",
        "per_day": f"{currency}/day",
        "per_week": f"{currency}/week",
        "per_month": f"{currency}/month",
        "per_year": f"{currency}/year",
    }

    return labels.get(frequency, currency)


def normalize_currency(currency: str) -> str:
    normalized = (currency or "VND").upper()
    return normalized if normalized in _VND_PER_CURRENCY_UNIT else "VND"


def estimate_amount(amount_vnd: float, currency: str) -> float:
    converted = amount_vnd / _VND_PER_CURRENCY_UNIT.get(currency, 1)
    return round(converted) if currency == "VND" else round(converted, 2)


def build_scooter_vs_grab_draft(currency: str) -> ParseResponse:
    draft = DecisionPayload(
        title="Scooter rental vs GrabBike",
        decision_type="rent_vs_pay_per_use",
        currency=currency,
        option_a=DecisionOption(
            name="Monthly scooter rental",
            costs=[
                CostItem(
                    id="monthly_rental",
                    label="Monthly rental",
                    amount=estimate_amount(1_800_000, currency),
                    frequency="per_month",
                ),
                CostItem(
                    id="fuel",
                    label="Fuel",
                    amount=estimate_amount(300_000, currency),
                    frequency="per_month",
                    hidden=True,
                ),
                CostItem(
                    id="parking",
                    label="Parking",
                    amount=estimate_amount(5_000, currency),
                    frequency="per_use",
                    hidden=True,
                ),
                CostItem(
                    id="repair_risk",
                    label="Repair risk buffer",
                    amount=estimate_amount(150_000, currency),
                    frequency="per_month",
                    included=False,
                    hidden=True,
                ),
                CostItem(
                    id="rainy_day_fallback",
                    label="Rainy-day Grab fallback",
                    amount=estimate_amount(200_000, currency),
                    frequency="per_month",
                    included=False,
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
                    amount=estimate_amount(35_000, currency),
                    frequency="per_use",
                )
            ],
        ),
        usage=UsageModel(
            uses_per_day=2,
            days=30,
            confidence=0.7,
            value_of_time_per_hour=0,
            minutes_saved_per_use_by_option_a=0,
        ),
        convenience_score=75,
        flexibility_score=55,
        risk_score=60,
    )

    return ParseResponse(
        draft_decision=draft,
        missing_inputs=[
            "actual monthly rental cost",
            "average GrabBike fare",
            "expected trips per day",
            "fuel cost per month",
        ],
        suggested_hidden_costs=[
            "fuel",
            "parking",
            "repair liability",
            "deposit risk",
            "rainy-day fallback rides",
            "license or safety risk",
        ],
    )


def build_gym_draft(currency: str) -> ParseResponse:
    draft = DecisionPayload(
        title="Gym membership vs day pass",
        decision_type="subscription_vs_pay_per_use",
        currency=currency,
        option_a=DecisionOption(
            name="Monthly gym membership",
            costs=[
                CostItem(
                    id="membership",
                    label="Monthly membership",
                    amount=estimate_amount(900_000, currency),
                    frequency="per_month",
                ),
                CostItem(
                    id="joining_fee",
                    label="Joining fee",
                    amount=estimate_amount(300_000, currency),
                    frequency="one_time",
                    included=False,
                    hidden=True,
                ),
            ],
        ),
        option_b=DecisionOption(
            name="Day pass",
            costs=[
                CostItem(
                    id="day_pass",
                    label="Day pass",
                    amount=estimate_amount(80_000, currency),
                    frequency="per_use",
                )
            ],
        ),
        usage=UsageModel(uses_per_day=0.4, days=30, confidence=0.65),
        convenience_score=70,
        flexibility_score=60,
        risk_score=75,
    )

    return ParseResponse(
        draft_decision=draft,
        missing_inputs=[
            "monthly membership cost",
            "day pass cost",
            "expected visits per week",
        ],
        suggested_hidden_costs=[
            "joining fee",
            "cancellation fee",
            "travel time",
            "unused days",
        ],
    )


def build_camera_draft(currency: str) -> ParseResponse:
    draft = DecisionPayload(
        title="Buy camera vs rent camera",
        decision_type="buy_vs_rent",
        currency=currency,
        option_a=DecisionOption(
            name="Buy camera",
            costs=[
                CostItem(
                    id="purchase_price",
                    label="Purchase price",
                    amount=estimate_amount(5_000_000, currency),
                    frequency="one_time",
                ),
                CostItem(
                    id="maintenance",
                    label="Maintenance buffer",
                    amount=estimate_amount(500_000, currency),
                    frequency="per_year",
                    included=False,
                    hidden=True,
                ),
            ],
        ),
        option_b=DecisionOption(
            name="Rent camera",
            costs=[
                CostItem(
                    id="rental_per_day",
                    label="Rental cost per use",
                    amount=estimate_amount(300_000, currency),
                    frequency="per_use",
                )
            ],
        ),
        usage=UsageModel(uses_per_day=0.1, days=365, confidence=0.6),
        convenience_score=65,
        flexibility_score=50,
        risk_score=55,
    )

    return ParseResponse(
        draft_decision=draft,
        missing_inputs=[
            "purchase price",
            "rental price per use",
            "expected number of uses",
        ],
        suggested_hidden_costs=[
            "maintenance",
            "storage",
            "depreciation",
            "repair risk",
        ],
    )


def build_subscription_draft(currency: str) -> ParseResponse:
    draft = DecisionPayload(
        title="Subscription vs pay-per-use",
        decision_type="subscription_vs_pay_per_use",
        currency=currency,
        option_a=DecisionOption(
            name="Subscription",
            costs=[
                CostItem(
                    id="monthly_subscription",
                    label="Monthly subscription",
                    amount=estimate_amount(260_000, currency),
                    frequency="per_month",
                ),
                CostItem(
                    id="unused_months_risk",
                    label="Unused usage risk",
                    amount=0,
                    frequency="per_month",
                    included=False,
                    hidden=True,
                ),
            ],
        ),
        option_b=DecisionOption(
            name="Pay-per-use",
            costs=[
                CostItem(
                    id="pay_per_use",
                    label="Pay-per-use cost",
                    amount=estimate_amount(45_000, currency),
                    frequency="per_use",
                )
            ],
        ),
        usage=UsageModel(uses_per_day=0.25, days=30, confidence=0.6),
        convenience_score=65,
        flexibility_score=70,
        risk_score=75,
    )

    return ParseResponse(
        draft_decision=draft,
        missing_inputs=[
            "monthly subscription cost",
            "pay-per-use cost",
            "expected usage",
        ],
        suggested_hidden_costs=[
            "unused months",
            "cancellation friction",
            "intro pricing expiration",
        ],
    )


def build_netflix_draft(currency: str) -> ParseResponse:
    draft = DecisionPayload(
        title="Netflix subscription vs pay-per-view",
        decision_type="subscription_vs_pay_per_use",
        currency=currency,
        option_a=DecisionOption(
            name="Netflix subscription",
            costs=[
                CostItem(
                    id="monthly_subscription",
                    label="Monthly subscription",
                    amount=estimate_amount(260_000, currency),
                    frequency="per_month",
                ),
                CostItem(
                    id="unused_month_risk",
                    label="Unused month risk",
                    amount=0,
                    frequency="per_month",
                    included=False,
                    hidden=True,
                ),
            ],
        ),
        option_b=DecisionOption(
            name="Pay-per-view rentals",
            costs=[
                CostItem(
                    id="pay_per_view",
                    label="Pay-per-view rental",
                    amount=estimate_amount(55_000, currency),
                    frequency="per_use",
                ),
                CostItem(
                    id="rental_expiration",
                    label="Rental expiration risk",
                    amount=0,
                    frequency="per_use",
                    included=False,
                    hidden=True,
                ),
            ],
        ),
        usage=UsageModel(uses_per_day=0.3, days=30, confidence=0.65),
        convenience_score=80,
        flexibility_score=60,
        risk_score=70,
    )

    return ParseResponse(
        draft_decision=draft,
        missing_inputs=[
            "monthly Netflix plan cost",
            "average pay-per-view rental cost",
            "expected movies or shows watched per month",
        ],
        suggested_hidden_costs=[
            "unused months",
            "ad-supported plan tradeoffs",
            "account sharing limits",
            "rental expiration windows",
            "content availability",
        ],
    )


def build_coworking_draft(currency: str) -> ParseResponse:
    draft = DecisionPayload(
        title="Coworking pass vs cafes",
        decision_type="subscription_vs_pay_per_use",
        currency=currency,
        option_a=DecisionOption(
            name="Coworking pass",
            costs=[
                CostItem(
                    id="coworking_pass",
                    label="Monthly coworking pass",
                    amount=estimate_amount(2_500_000, currency),
                    frequency="per_month",
                )
            ],
        ),
        option_b=DecisionOption(
            name="Cafes",
            costs=[
                CostItem(
                    id="cafe_spend",
                    label="Cafe spend per visit",
                    amount=estimate_amount(120_000, currency),
                    frequency="per_use",
                )
            ],
        ),
        usage=UsageModel(uses_per_day=0.6, days=30, confidence=0.65),
        convenience_score=70,
        flexibility_score=70,
        risk_score=80,
    )

    return ParseResponse(
        draft_decision=draft,
        missing_inputs=[
            "monthly coworking pass cost",
            "average cafe spend",
            "expected work days",
        ],
        suggested_hidden_costs=[
            "commute",
            "meeting room fees",
            "minimum cafe spend",
        ],
    )


def build_generic_draft(raw_text: str, currency: str) -> ParseResponse:
    draft = DecisionPayload(
        title=raw_text[:60] or "Untitled decision",
        decision_type="generic",
        currency=currency,
        option_a=DecisionOption(
            name="Option A",
            costs=[
                CostItem(
                    id="option_a_main_cost",
                    label="Main cost",
                    amount=0,
                    frequency="one_time",
                )
            ],
        ),
        option_b=DecisionOption(
            name="Option B",
            costs=[
                CostItem(
                    id="option_b_per_use_cost",
                    label="Alternative cost per use",
                    amount=0,
                    frequency="per_use",
                )
            ],
        ),
        usage=UsageModel(uses_per_day=1, days=30, confidence=0.5),
    )

    return ParseResponse(
        draft_decision=draft,
        missing_inputs=[
            "cost of Option A",
            "cost of Option B",
            "expected usage",
            "time horizon",
        ],
        suggested_hidden_costs=[
            "maintenance",
            "travel time",
            "cancellation fees",
            "unused usage",
            "risk buffer",
        ],
    )
