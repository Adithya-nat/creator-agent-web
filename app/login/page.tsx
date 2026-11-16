import type { Metadata } from "next";
import { AuthStage } from "./AuthStage";

export const metadata: Metadata = { title: "Log in · Creator Agent" };

export default function LoginPage() {
  return <AuthStage mode="login" />;
}
