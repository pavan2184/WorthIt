"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { DecisionDashboard } from "@/components/DecisionDashboard";
import { DecisionInput } from "@/components/DecisionInput";
import { parseDecision } from "@/lib/api";
import { type CurrencyCode } from "@/lib/currency";
import type {
  DecisionPayload,
  FollowUpQuestion,
  InputMode,
  ParseResponse,
} from "@/lib/types";

type NewDecisionClientProps = {
  initialPrompt: string;
  initialInputMode: InputMode;
  initialCurrency: CurrencyCode;
  initialDays: number;
};

export function NewDecisionClient({
  initialPrompt,
  initialInputMode,
  initialCurrency,
  initialDays,
}: NewDecisionClientProps) {
  const [rawText, setRawText] = useState(initialPrompt);
  const [inputMode, setInputMode] = useState<InputMode>(initialInputMode);
  const [decision, setDecision] = useState<DecisionPayload | null>(null);
  const [parseResponse, setParseResponse] = useState<ParseResponse | null>(null);
  const [questionValues, setQuestionValues] = useState<Record<string, string>>(
    {}
  );
  const [unknownQuestionIds, setUnknownQuestionIds] = useState<
    Record<string, boolean>
  >({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const didAutoParse = useRef(false);

  const parsePrompt = useCallback(async (
    text: string,
    mode: InputMode,
    selectedCurrency: CurrencyCode,
    selectedDays: number
  ) => {
    const prompt = text.trim();
    if (!prompt) return;

    setLoading(true);
    setError(null);

    try {
      const parsed = withSelectedPeriod(
        await parseDecision(prompt, mode, selectedCurrency),
        selectedDays
      );
      setParseResponse(parsed);
      setQuestionValues(
        Object.fromEntries(
          parsed.follow_up_questions.map((question) => [
            question.id,
            String(question.default_value),
          ])
        )
      );
      setUnknownQuestionIds({});

      if (mode === "user_values" && parsed.follow_up_questions.length > 0) {
        setDecision(null);
      } else {
        setDecision(parsed.draft_decision);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to analyze");
    } finally {
      setLoading(false);
    }
  }, []);

  const analyze = () => {
    void parsePrompt(rawText, inputMode, initialCurrency, initialDays);
  };

  const updateQuestionValue = (questionId: string, value: string) => {
    setQuestionValues((current) => ({
      ...current,
      [questionId]: value,
    }));
  };

  const updateQuestionUnknown = (questionId: string, unknown: boolean) => {
    setUnknownQuestionIds((current) => ({
      ...current,
      [questionId]: unknown,
    }));
  };

  const buildDashboardFromAnswers = () => {
    if (!parseResponse) return;

    setDecision(
      applyQuestionAnswers(
        parseResponse.draft_decision,
        parseResponse.follow_up_questions,
        questionValues,
        unknownQuestionIds
      )
    );
  };

  useEffect(() => {
    if (!initialPrompt || didAutoParse.current) return;
    didAutoParse.current = true;
    void parsePrompt(initialPrompt, initialInputMode, initialCurrency, initialDays);
  }, [initialCurrency, initialDays, initialInputMode, initialPrompt, parsePrompt]);

  const showFollowUpQuestions =
    Boolean(parseResponse) &&
    inputMode === "user_values" &&
    !decision &&
    (parseResponse?.follow_up_questions.length || 0) > 0;

  return (
    <main className="min-h-screen bg-worth-page">
      <AppHeader active="new" />
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="space-y-5">
          {showFollowUpQuestions && parseResponse ? (
            <AnalyzedQuestionCard
              title={parseResponse.draft_decision.title}
              rawText={rawText}
              onEdit={() => {
                setParseResponse(null);
                setDecision(null);
              }}
            />
          ) : !decision ? (
            <DecisionInput
              value={rawText}
              onChange={setRawText}
              onAnalyze={analyze}
              inputMode={inputMode}
              onInputModeChange={setInputMode}
              loading={loading}
              title="New decision"
            />
          ) : null}

          {error && (
            <div className="rounded-lg border border-red-200 bg-white p-4 text-sm text-red-600">
              {error}
            </div>
          )}

          {showFollowUpQuestions && parseResponse && (
              <FollowUpQuestionsPanel
                questions={parseResponse.follow_up_questions}
                values={questionValues}
                unknownQuestionIds={unknownQuestionIds}
                onValueChange={updateQuestionValue}
                onUnknownChange={updateQuestionUnknown}
                onContinue={buildDashboardFromAnswers}
              />
          )}

          {parseResponse &&
            inputMode === "user_values" &&
            !decision &&
            parseResponse.follow_up_questions.length === 0 && (
              <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-500 shadow-subtle">
                No extra values are needed for this draft.
              </div>
          )}

          {decision && <DecisionDashboard initialDecision={decision} />}
        </div>
      </div>
    </main>
  );
}

type AnalyzedQuestionCardProps = {
  title: string;
  rawText: string;
  onEdit: () => void;
};

function AnalyzedQuestionCard({
  title,
  rawText,
  onEdit,
}: AnalyzedQuestionCardProps) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-subtle">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Analyzed question
          </p>
          <h1 className="mt-1 text-xl font-semibold text-slate-900">{title}</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            {rawText}
          </p>
        </div>
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:border-worth-brand hover:text-worth-brand"
        >
          Edit question
        </button>
      </div>
    </section>
  );
}

type FollowUpQuestionsPanelProps = {
  questions: FollowUpQuestion[];
  values: Record<string, string>;
  unknownQuestionIds: Record<string, boolean>;
  onValueChange: (questionId: string, value: string) => void;
  onUnknownChange: (questionId: string, unknown: boolean) => void;
  onContinue: () => void;
};

function FollowUpQuestionsPanel({
  questions,
  values,
  unknownQuestionIds,
  onValueChange,
  onUnknownChange,
  onContinue,
}: FollowUpQuestionsPanelProps) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-subtle">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Assumption intake
          </p>
          <h2 className="mt-1 text-lg font-semibold text-slate-900">
            WorthIt analyzed your question
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Answer these values to build the decision model with your numbers.
          </p>
        </div>
        <button
          type="button"
          onClick={onContinue}
          className="inline-flex h-10 items-center justify-center rounded-lg bg-worth-accent px-4 text-sm font-medium text-white transition hover:bg-worth-accent-hover"
        >
          Build dashboard
        </button>
      </div>

      <div className="mx-auto mt-5 grid max-w-3xl gap-3">
        {questions.map((question) => (
          <div
            key={question.id}
            className="rounded-lg border border-slate-200 bg-worth-page p-4"
          >
            <span className="block text-sm font-medium text-slate-900">
              {question.label}
            </span>
            <span className="mt-1 block text-xs leading-5 text-slate-500">
              {question.helper_text}
            </span>
            <div className="mt-3 grid grid-cols-[1fr_auto] overflow-hidden rounded-lg border border-slate-200 bg-white">
              <input
                type="number"
                min={question.minimum}
                disabled={Boolean(unknownQuestionIds[question.id])}
                value={values[question.id] ?? ""}
                onChange={(event) =>
                  onValueChange(question.id, event.target.value)
                }
                className="h-10 min-w-0 border-0 px-3 text-sm text-slate-900 outline-none focus:ring-0 disabled:bg-slate-100 disabled:text-slate-400"
              />
              <span className="flex h-10 items-center border-l border-slate-200 px-3 text-xs text-slate-500">
                {question.unit}
              </span>
            </div>
            <label className="mt-3 flex cursor-pointer items-start gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={Boolean(unknownQuestionIds[question.id])}
                onChange={(event) =>
                  onUnknownChange(question.id, event.target.checked)
                }
                className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-worth-brand"
              />
              <span>
                I don&apos;t know
                <span className="block text-xs leading-5 text-slate-500">
                  Use WorthIt&apos;s estimate of {question.default_value}{" "}
                  {question.unit}.
                </span>
              </span>
            </label>
          </div>
        ))}
      </div>
    </section>
  );
}

function applyQuestionAnswers(
  draft: DecisionPayload,
  questions: FollowUpQuestion[],
  values: Record<string, string>,
  unknownQuestionIds: Record<string, boolean>
): DecisionPayload {
  let next = {
    ...draft,
    option_a: {
      ...draft.option_a,
      costs: draft.option_a.costs.map((cost) => ({ ...cost })),
    },
    option_b: {
      ...draft.option_b,
      costs: draft.option_b.costs.map((cost) => ({ ...cost })),
    },
    usage: {
      ...draft.usage,
    },
  };

  for (const question of questions) {
    const numericValue = unknownQuestionIds[question.id]
      ? question.default_value
      : Number(values[question.id] || question.default_value);
    const value = Math.max(question.minimum, numericValue);

    if (question.target === "cost" && question.option && question.cost_id) {
      next = {
        ...next,
        [question.option]: {
          ...next[question.option],
          costs: next[question.option].costs.map((cost) =>
            cost.id === question.cost_id ? { ...cost, amount: value } : cost
          ),
        },
      };
    }

    if (question.target === "usage" && question.field) {
      next = {
        ...next,
        usage: {
          ...next.usage,
          [question.field]:
            question.field === "days" ? Math.max(1, Math.round(value)) : value,
        },
      };
    }
  }

  return next;
}

function withSelectedPeriod(
  response: ParseResponse,
  selectedDays: number
): ParseResponse {
  return {
    ...response,
    draft_decision: {
      ...response.draft_decision,
      usage: {
        ...response.draft_decision.usage,
        days: selectedDays,
      },
    },
    follow_up_questions: response.follow_up_questions.map((question) =>
      question.id === "usage_days"
        ? { ...question, default_value: selectedDays }
        : question
    ),
  };
}
