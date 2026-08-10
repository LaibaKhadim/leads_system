import { getVerifiedSession, STALE_SESSION_RESPONSE } from "@/lib/session";
import {
  getLead,
  updateLeadStatus,
  assignLead,
  setDealValue,
  updateLeadFields,
  EDITABLE_LEAD_FIELDS,
} from "@/lib/leads";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getVerifiedSession();
  if (!session) {
    return NextResponse.json(STALE_SESSION_RESPONSE, { status: 401 });
  }

  const { id } = await params;
  const lead = await getLead(id);

  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  return NextResponse.json(lead);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getVerifiedSession();
  if (!session) {
    return NextResponse.json(STALE_SESSION_RESPONSE, { status: 401 });
  }

  const { id } = await params;
  const lead = await getLead(id);

  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  const data = await request.json();

  if (data.status) {
    await updateLeadStatus(id, data.status, data.dealValue !== undefined ? data.dealValue : undefined);
  } else if (data.dealValue !== undefined) {
    await setDealValue(id, data.dealValue);
  }

  if (data.assignedToId !== undefined) {
    await assignLead(id, data.assignedToId);
  }

  const fieldUpdates: Record<string, any> = {};
  for (const field of EDITABLE_LEAD_FIELDS) {
    if (data[field] !== undefined) fieldUpdates[field] = data[field];
  }
  if (Object.keys(fieldUpdates).length > 0) {
    await updateLeadFields(id, fieldUpdates);
  }

  const updated = await getLead(id);
  return NextResponse.json(updated);
}
