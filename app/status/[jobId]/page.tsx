import { StatusView } from "@/components/StatusView";

export default async function StatusPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;
  return <StatusView jobId={jobId} />;
}
