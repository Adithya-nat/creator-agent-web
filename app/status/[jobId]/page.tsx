import { StatusView } from "@/components/StatusView";

export default function StatusPage({
  params,
}: {
  params: { jobId: string };
}) {
  return <StatusView jobId={params.jobId} />;
}
