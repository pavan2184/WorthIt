HIDDEN_COST_TEMPLATES = {
    "scooter": [
        {
            "id": "fuel",
            "label": "Fuel",
            "amount": 300000,
            "frequency": "per_month",
        },
        {
            "id": "parking",
            "label": "Parking",
            "amount": 5000,
            "frequency": "per_use",
        },
        {
            "id": "repair_risk",
            "label": "Repair risk buffer",
            "amount": 150000,
            "frequency": "per_month",
        },
        {
            "id": "rainy_day_fallback",
            "label": "Rainy-day Grab fallback",
            "amount": 200000,
            "frequency": "per_month",
        },
    ],
    "gym": [
        {
            "id": "joining_fee",
            "label": "Joining fee",
            "amount": 300000,
            "frequency": "one_time",
        },
        {
            "id": "travel_cost",
            "label": "Travel cost",
            "amount": 20000,
            "frequency": "per_use",
        },
    ],
    "subscription": [
        {
            "id": "unused_months",
            "label": "Unused months risk",
            "amount": 0,
            "frequency": "per_month",
        }
    ],
}
