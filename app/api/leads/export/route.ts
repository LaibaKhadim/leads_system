import { getVerifiedSession, STALE_SESSION_RESPONSE } from "@/lib/session";
import { getLeads } from "@/lib/leads";
import { NextRequest, NextResponse } from "next/server";
import { utils, write } from "xlsx";

export async function GET(request: NextRequest) {
  const session = await getVerifiedSession();
  if (!session) {
    return NextResponse.json(STALE_SESSION_RESPONSE, { status: 401 });
  }

  const url = new URL(request.url);
  const status = url.searchParams.get("status") || undefined;
  const search = url.searchParams.get("search") || undefined;
  const fromDate = url.searchParams.get("fromDate") || undefined;
  const toDate = url.searchParams.get("toDate") || undefined;

  let assignedToId: string | null | undefined = undefined;
  if (session.user.role === "REP") {
    assignedToId = session.user.id;
  }

  const leads = await getLeads({
    status: status as any,
    assignedToId,
    search: search || undefined,
    fromDate: fromDate || undefined,
    toDate: toDate || undefined,
  });

  // Transform leads to export format. Extra imported columns vary per lead,
  // so collect the full set across this result and add one export column
  // per unique extra field, filled in only where that lead has it.
  const extraKeys = new Set<string>();
  for (const lead of leads) {
    if (lead.extraData) {
      for (const key of Object.keys(lead.extraData)) extraKeys.add(key);
    }
  }
  const extraKeyList = [...extraKeys];

  const exportData = leads.map((lead) => {
    const row: Record<string, any> = {
      Name: lead.name,
      Email: lead.email || "",
      Phone: lead.phone || "",
      Company: lead.company || "",
      City: lead.city || "",
      Source: lead.source || "",
      Date: lead.leadDate || "",
      "Price Quoted": lead.priceQuoted ?? "",
      "Price Closed": lead.dealValue ?? "",
      "Client Budget": lead.clientBudget ?? "",
      Status: lead.status,
      Tags: lead.tags.map((t) => t.label).join(", "),
      Notes: lead.noteCount,
    };
    for (const key of extraKeyList) {
      row[key] = lead.extraData?.[key] ?? "";
    }
    return row;
  });

  const worksheet = utils.json_to_sheet(exportData);
  const workbook = utils.book_new();
  utils.book_append_sheet(workbook, worksheet, "Leads");

  // Auto-size columns
  const colWidths = [
    { wch: 20 },
    { wch: 25 },
    { wch: 15 },
    { wch: 20 },
    { wch: 15 },
    { wch: 15 },
    { wch: 12 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 12 },
    { wch: 30 },
    { wch: 8 },
    ...extraKeyList.map(() => ({ wch: 18 })),
  ];
  worksheet["!cols"] = colWidths;

  const buffer = write(workbook, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": "attachment; filename=leads.xlsx",
    },
  });
}
