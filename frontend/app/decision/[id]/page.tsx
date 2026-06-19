import { DecisionDetailClient } from "./DecisionDetailClient";

type DecisionDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function DecisionDetailPage({
  params,
}: DecisionDetailPageProps) {
  const resolvedParams = await params;

  return <DecisionDetailClient id={resolvedParams.id} />;
}
