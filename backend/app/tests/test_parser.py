import pytest

from app.models.decision import ParseRequest
from app.services.decision_parser import parse_decision_text


@pytest.mark.anyio
async def test_parse_with_estimates_has_no_missing_inputs():
    response = await parse_decision_text(
        ParseRequest(
            raw_text="Is renting a scooter in HCMC worth it compared to GrabBike?",
            input_mode="use_estimates",
        )
    )

    assert response.draft_decision.title == "Scooter rental vs GrabBike"
    assert response.missing_inputs == []
    assert response.follow_up_questions == []


@pytest.mark.anyio
async def test_parse_with_user_values_returns_inputs_to_confirm():
    response = await parse_decision_text(
        ParseRequest(
            raw_text="Is renting a scooter in HCMC worth it compared to GrabBike?",
            input_mode="user_values",
        )
    )

    assert "actual monthly rental cost" in response.missing_inputs
    assert "average GrabBike fare" in response.missing_inputs
    question_ids = {question.id for question in response.follow_up_questions}
    assert "option_a_monthly_rental" in question_ids
    assert "option_b_grab_fare" in question_ids
    assert "usage_uses_per_day" in question_ids
    usage_question = next(
        question
        for question in response.follow_up_questions
        if question.id == "usage_uses_per_day"
    )
    assert usage_question.label == "Expected trips per day"
    assert usage_question.unit == "trips/day"


@pytest.mark.anyio
async def test_parse_netflix_vs_pay_per_view():
    response = await parse_decision_text(
        ParseRequest(
            raw_text="Is a Netflix subscription worth it compared to pay-per-view?",
            input_mode="use_estimates",
        )
    )

    assert response.draft_decision.title == "Netflix subscription vs pay-per-view"
    assert response.draft_decision.decision_type == "subscription_vs_pay_per_use"
    assert response.draft_decision.option_a.name == "Netflix subscription"
    assert response.draft_decision.option_b.name == "Pay-per-view rentals"
    assert response.draft_decision.option_a.costs[0].id == "monthly_subscription"
    assert response.draft_decision.option_b.costs[0].id == "pay_per_view"
    assert response.missing_inputs == []


@pytest.mark.anyio
async def test_parse_selected_currency_scales_estimates():
    response = await parse_decision_text(
        ParseRequest(
            raw_text="Is a Netflix subscription worth it compared to pay-per-view?",
            currency="USD",
            input_mode="use_estimates",
        )
    )

    assert response.draft_decision.currency == "USD"
    assert response.draft_decision.option_a.costs[0].amount == 10.4
    assert response.draft_decision.option_b.costs[0].amount == 2.2


@pytest.mark.anyio
async def test_parse_netflix_user_values_returns_inputs_to_confirm():
    response = await parse_decision_text(
        ParseRequest(
            raw_text="Is a Netflix subscription worth it compared to pay-per-view?",
            input_mode="user_values",
        )
    )

    assert "monthly Netflix plan cost" in response.missing_inputs
    assert "average pay-per-view rental cost" in response.missing_inputs
    question_ids = {question.id for question in response.follow_up_questions}
    assert "option_a_monthly_subscription" in question_ids
    assert "option_b_pay_per_view" in question_ids
    assert "usage_uses_per_day" in question_ids
    usage_question = next(
        question
        for question in response.follow_up_questions
        if question.id == "usage_uses_per_day"
    )
    assert usage_question.label == "Expected movies or shows per day"
    assert usage_question.helper_text == "Count one movie, episode, or rental as one use."
    assert usage_question.unit == "views/day"
