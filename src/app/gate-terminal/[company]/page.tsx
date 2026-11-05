import React from "react";
import GateTerminalView from "../GateTerminalView";

interface PageProps {
  params: Promise<{ company: string }>;
}

export default async function CompanyGateTerminalPage({ params }: PageProps) {
  const resolvedParams = await params;
  const companySlug = resolvedParams.company || "celebrity";

  return <GateTerminalView initialCompanySlug={companySlug} />;
}
