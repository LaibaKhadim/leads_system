const statusClass: Record<string, string> = {
  New: "status-new",
  Contacted: "status-contacted",
  Interested: "status-interested",
  Converted: "status-converted",
  Lost: "status-lost",
};

export default function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`status-badge ${statusClass[status] || "status-new"}`}>
      {status}
    </span>
  );
}
