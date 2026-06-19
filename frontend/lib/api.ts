import type {
  CalculationResult,
  DecisionPayload,
  InputMode,
  ParseResponse,
  SavedDecision,
  TrackerEntryInput,
  TrackerResponse,
} from "./types";
import { DEFAULT_CURRENCY, type CurrencyCode } from "./currency";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8012";

async function parseJson<T>(res: Response, message: string): Promise<T> {
  if (!res.ok) {
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

export async function parseDecision(
  rawText: string,
  inputMode: InputMode = "use_estimates",
  currency: CurrencyCode | string = DEFAULT_CURRENCY
): Promise<ParseResponse> {
  const res = await fetch(`${API_BASE_URL}/api/parse`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      raw_text: rawText,
      currency,
      input_mode: inputMode,
    }),
  });

  return parseJson<ParseResponse>(res, "Failed to parse decision");
}

export async function calculateDecision(
  decision: DecisionPayload
): Promise<CalculationResult> {
  const res = await fetch(`${API_BASE_URL}/api/decisions/calculate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(decision),
  });

  return parseJson<CalculationResult>(res, "Failed to calculate decision");
}

export async function saveDecision(
  decision: DecisionPayload
): Promise<SavedDecision> {
  const res = await fetch(`${API_BASE_URL}/api/decisions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(decision),
  });

  return parseJson<SavedDecision>(res, "Failed to save decision");
}

export async function listDecisions(
  signal?: AbortSignal
): Promise<SavedDecision[]> {
  const res = await fetch(`${API_BASE_URL}/api/decisions`, {
    cache: "no-store",
    signal,
  });

  return parseJson<SavedDecision[]>(res, "Failed to load decisions");
}

export async function getDecision(id: string): Promise<SavedDecision> {
  const res = await fetch(`${API_BASE_URL}/api/decisions/${id}`, {
    cache: "no-store",
  });

  return parseJson<SavedDecision>(res, "Failed to load decision");
}

export async function deleteDecision(id: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/decisions/${id}`, {
    method: "DELETE",
  });

  await parseJson<{ deleted: boolean }>(res, "Failed to delete decision");
}

export async function getTracker(
  id: string,
  signal?: AbortSignal
): Promise<TrackerResponse> {
  const res = await fetch(`${API_BASE_URL}/api/trackers/${id}`, {
    cache: "no-store",
    signal,
  });

  return parseJson<TrackerResponse>(res, "Failed to load tracker");
}

export async function addTrackerEntry(
  id: string,
  entry: TrackerEntryInput
): Promise<TrackerResponse> {
  const res = await fetch(`${API_BASE_URL}/api/trackers/${id}/entries`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(entry),
  });

  return parseJson<TrackerResponse>(res, "Failed to add tracker entry");
}
