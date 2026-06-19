import { TrackerClient } from "./TrackerClient";

type TrackerPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function TrackerPage({ params }: TrackerPageProps) {
  const resolvedParams = await params;

  return <TrackerClient id={resolvedParams.id} />;
}
