import type { Metadata } from "next";
import { AuthStage } from "../login/AuthStage";

export const metadata: Metadata = { title: "Sign up · Creator Agent" };

export default function SignupPage() {
  return <AuthStage mode="signup" />;
}
