import { getAllReps } from "@/lib/users";
import LeadDetail from "@/components/LeadDetail";

export default async function OwnerLeadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const reps = await getAllReps();

  return (
    <LeadDetail
      leadId={id}
      showAssign
      reps={reps.map((r) => ({ id: r.id, name: r.name }))}
    />
  );
}
