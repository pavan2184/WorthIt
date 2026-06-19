from datetime import datetime, timezone

from app.models.decision import (
    CostItem,
    DecisionOption,
    DecisionPayload,
    TrackerEntry,
    UsageModel,
)
from app.services.tracker import build_tracker_response


def test_tracker_refines_projection_from_logged_usage():
    payload = DecisionPayload(
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
                    id="parking",
                    label="Parking",
                    amount=5000,
                    frequency="per_use",
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
        usage=UsageModel(
            uses_per_day=2,
            days=30,
            confidence=0.7,
        ),
    )
    decision_doc = {
        "id": "decision-1",
        "payload": payload.model_dump(),
    }
    entry = TrackerEntry(
        id="entry-1",
        decision_id="decision-1",
        date="2026-06-15",
        uses=4,
        option_a_spend=24000,
        option_b_spend=0,
        note="First day",
        created_at=datetime.now(timezone.utc),
    )

    response = build_tracker_response(decision_doc, [entry.model_dump()])

    assert response.summary.days_logged == 1
    assert response.summary.actual_uses == 1
    assert response.summary.actual_option_a_uses == 1
    assert response.summary.actual_option_b_uses == 0
    assert response.summary.observed_uses_per_day == 1
    assert response.summary.projected_uses == 30
    assert response.summary.observed_option_a_variable_per_use == 24000
    assert response.summary.verdict_label == "Behind pace"


def test_tracker_uses_option_b_logs_to_refine_alternative_cost():
    payload = DecisionPayload(
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
                    id="parking",
                    label="Parking",
                    amount=5000,
                    frequency="per_use",
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
        usage=UsageModel(
            uses_per_day=2,
            days=30,
            confidence=0.7,
        ),
    )
    decision_doc = {
        "id": "decision-1",
        "payload": payload.model_dump(),
    }
    option_b_entry = TrackerEntry(
        id="entry-1",
        decision_id="decision-1",
        option_key="option_b",
        date="2026-06-15",
        uses=2,
        option_a_spend=0,
        option_b_spend=90000,
        note="Fallback rides",
        created_at=datetime.now(timezone.utc),
    )

    response = build_tracker_response(decision_doc, [option_b_entry.model_dump()])

    assert response.summary.actual_uses == 1
    assert response.summary.actual_option_a_uses == 0
    assert response.summary.actual_option_b_uses == 1
    assert response.summary.observed_option_b_variable_per_use == 90000
    assert response.summary.observed_uses_per_day == 1


def test_monthly_logged_expense_is_not_multiplied_by_uses():
    payload = DecisionPayload(
        title="Scooter rental vs GrabBike",
        decision_type="rent_vs_pay_per_use",
        currency="VND",
        option_a=DecisionOption(
            name="Monthly scooter rental",
            costs=[
                CostItem(
                    id="rental",
                    label="Monthly rental",
                    amount=1600000,
                    frequency="per_month",
                ),
                CostItem(
                    id="parking",
                    label="Parking",
                    amount=5000,
                    frequency="per_use",
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
        usage=UsageModel(
            uses_per_day=1,
            days=30,
            confidence=0.7,
        ),
    )
    decision_doc = {
        "id": "decision-1",
        "payload": payload.model_dump(),
    }
    monthly_rental_entry = TrackerEntry(
        id="entry-1",
        decision_id="decision-1",
        option_key="option_a",
        spend_kind="fixed",
        expense_frequency="per_month",
        date="2026-06-15",
        uses=0,
        option_a_spend=1600000,
        option_b_spend=0,
        note="Monthly rental paid",
        created_at=datetime.now(timezone.utc),
    )

    response = build_tracker_response(
        decision_doc, [monthly_rental_entry.model_dump()]
    )

    assert response.summary.projected_uses == 30
    assert response.summary.observed_option_a_variable_per_use == 5000
    assert response.summary.projected_option_a_total == 1750000
    assert response.summary.projected_option_a_total < 3000000


def test_logged_monthly_expense_replaces_suggested_fixed_cost():
    payload = DecisionPayload(
        title="Scooter rental vs GrabBike",
        decision_type="rent_vs_pay_per_use",
        currency="VND",
        option_a=DecisionOption(
            name="Monthly scooter rental",
            costs=[
                CostItem(
                    id="monthly_rental",
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
        usage=UsageModel(
            uses_per_day=2,
            days=30,
            confidence=0.7,
        ),
    )
    decision_doc = {
        "id": "decision-1",
        "payload": payload.model_dump(),
    }
    monthly_rental_entry = TrackerEntry(
        id="entry-1",
        decision_id="decision-1",
        option_key="option_a",
        spend_kind="fixed",
        expense_frequency="per_month",
        date="2026-06-15",
        uses=0,
        option_a_spend=1600000,
        option_b_spend=0,
        note="Monthly rental paid",
        created_at=datetime.now(timezone.utc),
    )

    response = build_tracker_response(
        decision_doc, [monthly_rental_entry.model_dump()]
    )

    assert response.summary.projected_uses == 30
    assert response.summary.projected_option_a_total == 2050000


def test_logged_option_b_fixed_expense_replaces_suggested_fixed_cost():
    payload = DecisionPayload(
        title="Membership vs day pass",
        decision_type="subscription_vs_pay_per_use",
        currency="VND",
        option_a=DecisionOption(
            name="Day pass",
            costs=[
                CostItem(
                    id="day_pass",
                    label="Day pass",
                    amount=80000,
                    frequency="per_use",
                )
            ],
        ),
        option_b=DecisionOption(
            name="Gym membership",
            costs=[
                CostItem(
                    id="membership",
                    label="Monthly membership",
                    amount=900000,
                    frequency="per_month",
                ),
                CostItem(
                    id="locker",
                    label="Locker",
                    amount=100000,
                    frequency="per_month",
                    hidden=True,
                ),
            ],
        ),
        usage=UsageModel(
            uses_per_day=0.5,
            days=30,
            confidence=0.7,
        ),
    )
    decision_doc = {
        "id": "decision-1",
        "payload": payload.model_dump(),
    }
    membership_entry = TrackerEntry(
        id="entry-1",
        decision_id="decision-1",
        option_key="option_b",
        spend_kind="fixed",
        expense_frequency="per_month",
        date="2026-06-15",
        uses=0,
        option_a_spend=0,
        option_b_spend=700000,
        note="Membership paid",
        created_at=datetime.now(timezone.utc),
    )

    response = build_tracker_response(decision_doc, [membership_entry.model_dump()])

    assert response.summary.projected_option_b_total == 800000


def test_recurring_logged_expense_can_still_count_usage():
    payload = DecisionPayload(
        title="Scooter rental vs GrabBike",
        decision_type="rent_vs_pay_per_use",
        currency="VND",
        option_a=DecisionOption(
            name="Monthly scooter rental",
            costs=[
                CostItem(
                    id="rental",
                    label="Monthly rental",
                    amount=1600000,
                    frequency="per_month",
                ),
                CostItem(
                    id="parking",
                    label="Parking",
                    amount=5000,
                    frequency="per_use",
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
        usage=UsageModel(
            uses_per_day=1,
            days=30,
            confidence=0.7,
        ),
    )
    decision_doc = {
        "id": "decision-1",
        "payload": payload.model_dump(),
    }
    daily_entry = TrackerEntry(
        id="entry-1",
        decision_id="decision-1",
        option_key="option_a",
        spend_kind="fixed",
        expense_frequency="per_day",
        date="2026-06-15",
        uses=3,
        option_a_spend=10000,
        option_b_spend=0,
        note="Daily parking package",
        created_at=datetime.now(timezone.utc),
    )

    response = build_tracker_response(decision_doc, [daily_entry.model_dump()])

    assert response.summary.actual_uses == 1
    assert response.summary.actual_option_a_uses == 1
    assert response.summary.observed_uses_per_day == 1
    assert response.summary.projected_uses == 30
    assert response.summary.observed_option_a_variable_per_use == 5000


def test_option_a_log_can_match_would_have_been_option_b_cost():
    payload = DecisionPayload(
        title="Scooter rental vs GrabBike",
        decision_type="rent_vs_pay_per_use",
        currency="VND",
        option_a=DecisionOption(
            name="Monthly scooter rental",
            costs=[
                CostItem(
                    id="rental",
                    label="Monthly rental",
                    amount=1600000,
                    frequency="per_month",
                ),
                CostItem(
                    id="parking",
                    label="Parking",
                    amount=5000,
                    frequency="per_use",
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
        usage=UsageModel(
            uses_per_day=1,
            days=30,
            confidence=0.7,
        ),
    )
    decision_doc = {
        "id": "decision-1",
        "payload": payload.model_dump(),
    }
    scooter_entry = TrackerEntry(
        id="entry-1",
        decision_id="decision-1",
        option_key="option_a",
        spend_kind="variable",
        expense_frequency="per_use",
        date="2026-06-15",
        uses=2,
        option_a_spend=10000,
        option_b_spend=90000,
        note="Matched trip: 8 km at 18:30",
        created_at=datetime.now(timezone.utc),
    )

    response = build_tracker_response(decision_doc, [scooter_entry.model_dump()])

    assert response.summary.actual_uses == 1
    assert response.summary.matched_option_b_spend == 90000
    assert response.summary.matched_option_b_uses == 1
    assert response.summary.observed_option_b_variable_per_use == 90000
    assert response.summary.live_savings_to_date > 0


def test_recurring_option_a_cost_does_not_match_option_b_trip_cost():
    payload = DecisionPayload(
        title="Scooter rental vs GrabBike",
        decision_type="rent_vs_pay_per_use",
        currency="VND",
        option_a=DecisionOption(
            name="Monthly scooter rental",
            costs=[
                CostItem(
                    id="rental",
                    label="Monthly rental",
                    amount=1600000,
                    frequency="per_month",
                ),
                CostItem(
                    id="parking",
                    label="Parking",
                    amount=5000,
                    frequency="per_use",
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
        usage=UsageModel(
            uses_per_day=1,
            days=30,
            confidence=0.7,
        ),
    )
    decision_doc = {
        "id": "decision-1",
        "payload": payload.model_dump(),
    }
    monthly_rental_entry = TrackerEntry(
        id="entry-1",
        decision_id="decision-1",
        option_key="option_a",
        spend_kind="fixed",
        expense_frequency="per_month",
        date="2026-06-15",
        uses=0,
        option_a_spend=1600000,
        option_b_spend=90000,
        note="Monthly rental paid",
        created_at=datetime.now(timezone.utc),
    )

    response = build_tracker_response(
        decision_doc, [monthly_rental_entry.model_dump()]
    )

    assert response.summary.matched_option_b_spend == 0
    assert response.summary.matched_option_b_uses == 0
    assert response.summary.observed_option_b_variable_per_use == 35000


def test_live_savings_to_date_does_not_offset_with_untracked_estimate():
    payload = DecisionPayload(
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
                    id="parking",
                    label="Parking",
                    amount=5000,
                    frequency="per_use",
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
        usage=UsageModel(
            uses_per_day=2,
            days=30,
            confidence=0.7,
        ),
    )
    decision_doc = {
        "id": "decision-1",
        "payload": payload.model_dump(),
    }
    monthly_rental_entry = TrackerEntry(
        id="entry-1",
        decision_id="decision-1",
        option_key="option_a",
        spend_kind="fixed",
        expense_frequency="per_month",
        date="2026-06-15",
        uses=1,
        option_a_spend=1800000,
        option_b_spend=0,
        note="Monthly rental paid",
        created_at=datetime.now(timezone.utc),
    )

    response = build_tracker_response(
        decision_doc, [monthly_rental_entry.model_dump()]
    )

    assert response.summary.actual_option_a_spend == 1800000
    assert response.summary.actual_option_b_spend == 0
    assert response.summary.matched_option_b_spend == 0
    assert response.summary.live_option_a_cost_to_date == 1800000
    assert response.summary.live_option_b_cost_to_date == 0
    assert response.summary.live_savings_to_date == -1800000
