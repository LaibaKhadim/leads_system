import LeadDetail from "@/components/LeadDetail";

export default async function RepLeadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <LeadDetail leadId={id} />;
}
