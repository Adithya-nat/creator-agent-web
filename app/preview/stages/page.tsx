import { notFound } from "next/navigation";
import { Suspense } from "react";
import { StagePreview } from "./StagePreview";

/** Dev-only gallery of the generation stage scenes with mocked job state. */
export default function StagePreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <Suspense>
      <StagePreview />
    </Suspense>
  );
}
