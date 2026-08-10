import { createLead } from "@/lib/leads";
import db from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { read, utils } from "xlsx";
import { randomUUID } from "crypto";
import { getVerifiedSession, STALE_SESSION_RESPONSE } from "@/lib/session";

export async function POST(request: NextRequest) {
  const session = await getVerifiedSession();
  if (!session) {
    return NextResponse.json(STALE_SESSION_RESPONSE, { status: 401 });
  }
  if (session.user.role !== "OWNER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const workbook = read(buffer);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = utils.sheet_to_json(worksheet);

    if (!Array.isArray(data) || data.length === 0) {
      return NextResponse.json({ error: "Invalid or empty file" }, { status: 400 });
    }

    // Flexible column mapping — case/whitespace/punctuation-insensitive, with
    // aliases covering common Google Maps / Apify scrape export headers.
    const normalize = (s: string) => s.toLowerCase().trim().replace(/[\s_-]+/g, "");

    const aliasGroups: Record<string, string[]> = {
      name: ["name", "person", "fullname", "title", "businessname", "companyname", "business"],
      email: ["email", "e-mail", "emailaddress"],
      phone: ["phone", "contact", "phonenumber", "mobile", "whatsapp", "telephone"],
      company: ["company", "organization", "business", "businessname"],
      city: ["city", "location", "address", "town"],
      source: ["source", "channel", "category", "categoryname", "industry"],
      date: ["date", "leaddate", "datefound", "scrapedate"],
      priceQuoted: ["pricequoted", "quote", "quotedprice", "quotedamount"],
      clientBudget: ["budget", "clientbudget", "customerbudget"],
    };

    const columnMap: Record<string, string> = {};
    const firstRow = data[0] as Record<string, any>;
    const detectedHeaders = Object.keys(firstRow);
    const normalizedHeaders = new Map(detectedHeaders.map((h) => [normalize(h), h]));

    for (const field in aliasGroups) {
      for (const alias of aliasGroups[field]) {
        const match = normalizedHeaders.get(alias);
        if (match) {
          columnMap[field] = match;
          break;
        }
      }
    }

    if (!columnMap.name) {
      return NextResponse.json(
        {
          error: `Couldn't find a name/business column. Detected headers: ${detectedHeaders.join(", ")}`,
          detectedHeaders,
        },
        { status: 400 }
      );
    }

    const batchId = randomUUID();
    const now = Date.now();
    const existingEmails = new Set<string>();
    const existingPhones = new Set<string>();

    // Get existing emails and phones for duplicate detection
    const existing = (await db
      .prepare("SELECT email, phone FROM leads WHERE email IS NOT NULL OR phone IS NOT NULL")
      .all()) as any[];

    for (const row of existing) {
      if (row.email) existingEmails.add(row.email.toLowerCase());
      if (row.phone) existingPhones.add(row.phone);
    }

    const created: any[] = [];
    const duplicates: any[] = [];
    let skippedNoName = 0;

    for (const row of data) {
      const name = (row as any)[columnMap.name]?.toString().trim();
      const email = columnMap.email
        ? (row as any)[columnMap.email]?.toString().trim().toLowerCase()
        : undefined;
      const phone = columnMap.phone ? (row as any)[columnMap.phone]?.toString().trim() : undefined;
      const company = columnMap.company
        ? (row as any)[columnMap.company]?.toString().trim()
        : undefined;
      const city = columnMap.city ? (row as any)[columnMap.city]?.toString().trim() : undefined;
      const source = columnMap.source
        ? (row as any)[columnMap.source]?.toString().trim()
        : undefined;
      const date = columnMap.date ? (row as any)[columnMap.date]?.toString().trim() : undefined;
      const priceQuotedRaw = columnMap.priceQuoted
        ? (row as any)[columnMap.priceQuoted]
        : undefined;
      const clientBudgetRaw = columnMap.clientBudget
        ? (row as any)[columnMap.clientBudget]
        : undefined;
      const priceQuoted =
        priceQuotedRaw !== undefined && priceQuotedRaw !== "" && !isNaN(Number(priceQuotedRaw))
          ? Number(priceQuotedRaw)
          : undefined;
      const clientBudget =
        clientBudgetRaw !== undefined && clientBudgetRaw !== "" && !isNaN(Number(clientBudgetRaw))
          ? Number(clientBudgetRaw)
          : undefined;

      // Every column that wasn't mapped to a known field is kept as-is so
      // nothing from the uploaded file is lost — it's shown in full on the
      // lead detail page under "All imported data".
      const mappedSourceColumns = new Set(Object.values(columnMap));
      const extraData: Record<string, string> = {};
      for (const header of detectedHeaders) {
        if (mappedSourceColumns.has(header)) continue;
        const value = (row as any)[header];
        if (value !== undefined && value !== null && value !== "") {
          extraData[header] = value.toString().trim();
        }
      }

      if (!name) {
        skippedNoName++;
        continue;
      }

      // Check for duplicates
      if ((email && existingEmails.has(email)) || (phone && existingPhones.has(phone))) {
        duplicates.push({ name, email, phone, reason: "Duplicate" });
        continue;
      }

      const lead = await createLead({
        name,
        email: email || null,
        phone: phone || null,
        company: company || null,
        city: city || null,
        source: source || null,
        leadDate: date || null,
        priceQuoted: priceQuoted ?? null,
        clientBudget: clientBudget ?? null,
        extraData: Object.keys(extraData).length > 0 ? extraData : null,
        batchId,
      });

      // Track in set for this batch
      if (email) existingEmails.add(email);
      if (phone) existingPhones.add(phone);

      created.push(lead);
    }

    // Record batch. getVerifiedSession() already confirmed the user exists,
    // but guard the insert itself too in case the account is removed in the
    // brief window between that check and this write.
    try {
      await db
        .prepare(
          "INSERT INTO upload_batches (id, uploadedBy, count, createdAt) VALUES (?, ?, ?, ?)"
        )
        .run(batchId, session.user.id, created.length, now);
    } catch (batchError: any) {
      if (batchError?.code === "SQLITE_CONSTRAINT_FOREIGNKEY") {
        return NextResponse.json(STALE_SESSION_RESPONSE, { status: 401 });
      }
      throw batchError;
    }

    return NextResponse.json({
      success: true,
      imported: created.length,
      duplicates: duplicates.length,
      skippedNoName,
      columnMap,
      detectedHeaders,
      leads: created,
      duplicatesList: duplicates,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to process file" },
      { status: 500 }
    );
  }
}
