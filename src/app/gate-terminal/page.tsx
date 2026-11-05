import React from "react";
import GateTerminalView from "./GateTerminalView";

interface PageProps {
  searchParams?: Promise<{ company?: string }>;
}

export default async function StandaloneGateTerminalRootPage({ searchParams }: PageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const companySlug = resolvedSearchParams.company || "celebrity";

  return <GateTerminalView initialCompanySlug={companySlug} />;
}
