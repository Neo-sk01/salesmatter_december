
import { NextRequest, NextResponse } from "next/server";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { createClient } from "@supabase/supabase-js";
import { identifyColumns, MappingAgentError } from "@/lib/agents/mapping-agent";

// Error response helper
function errorResponse(
    code: string,
    message: string,
    details?: string,
    status: number = 400
) {
    return NextResponse.json(
        {
            success: false,
            error: {
                code,
                message,
                details,
            },
        },
        { status }
    );
}

// Initialize Supabase Client
export async function POST(req: NextRequest) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    // Validate environment configuration
    if (!supabaseUrl || !supabaseKey) {
        console.error("Missing Supabase credentials in /api/ingest", {
            hasUrl: !!supabaseUrl,
            hasKey: !!supabaseKey,
        });
        return errorResponse(
            "CONFIG_ERROR",
            "Server configuration error",
            "Database credentials are not configured. Please contact support.",
            500
        );
    }

    if (!process.env.OPENAI_API_KEY) {
        console.error("Missing OPENAI_API_KEY in /api/ingest");
        return errorResponse(
            "CONFIG_ERROR",
            "Server configuration error",
            "AI mapping service is not configured. Please contact support.",
            500
        );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    let fileId: string | null = null;

    try {
        // Parse form data
        let formData;
        try {
            formData = await req.formData();
        } catch (formError) {
            return errorResponse(
                "INVALID_REQUEST",
                "Invalid file upload request",
                "The file upload was malformed. Please try again."
            );
        }

        const file = formData.get("file") as File;

        if (!file) {
            return errorResponse(
                "NO_FILE",
                "No file provided",
                "Please select a CSV or Excel file to upload."
            );
        }

        // Validate file size (max 10MB)
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
            return errorResponse(
                "FILE_TOO_LARGE",
                "File is too large",
                `Maximum file size is 10MB. Your file is ${(file.size / 1024 / 1024).toFixed(2)}MB.`
            );
        }

        // Validate file type
        const fileType = file.name.split(".").pop()?.toLowerCase();
        const supportedTypes = ["csv", "xlsx", "xls"];

        if (!fileType || !supportedTypes.includes(fileType)) {
            return errorResponse(
                "UNSUPPORTED_FILE_TYPE",
                "Unsupported file type",
                `Please upload a CSV or Excel file (.csv, .xlsx, .xls). You uploaded: .${fileType || "unknown"}`
            );
        }

        const buffer = await file.arrayBuffer();
        const fileSize = file.size;

        let data: any[] = [];
        let parseErrors: string[] = [];

        // Parse file based on type
        try {
            if (fileType === "csv") {
                const text = new TextDecoder().decode(buffer);

                if (!text.trim()) {
                    return errorResponse(
                        "EMPTY_FILE",
                        "File is empty",
                        "The uploaded CSV file contains no data. Please check your file and try again."
                    );
                }

                const result = Papa.parse(text, {
                    header: true,
                    skipEmptyLines: true,
                    transformHeader: (header: string) => header.trim(),
                });

                if (result.errors && result.errors.length > 0) {
                    parseErrors = result.errors.slice(0, 5).map(
                        (e: any) => `Row ${e.row}: ${e.message}`
                    );
                    console.warn("CSV parse warnings:", parseErrors);
                }

                data = result.data;
            } else if (["xlsx", "xls"].includes(fileType)) {
                const workbook = XLSX.read(buffer, { type: "array" });

                if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
                    return errorResponse(
                        "INVALID_EXCEL",
                        "Invalid Excel file",
                        "The Excel file contains no sheets. Please check your file and try again."
                    );
                }

                const sheetName = workbook.SheetNames[0];
                const sheet = workbook.Sheets[sheetName];

                if (!sheet) {
                    return errorResponse(
                        "EMPTY_SHEET",
                        "Excel sheet is empty",
                        "The first sheet in the Excel file is empty. Please check your file and try again."
                    );
                }

                data = XLSX.utils.sheet_to_json(sheet);
            }
        } catch (parseError: any) {
            console.error("File parsing error:", parseError);
            return errorResponse(
                "PARSE_ERROR",
                "Failed to parse file",
                `Could not read the ${fileType?.toUpperCase()} file. It may be corrupted or in an unsupported format.`,
                400
            );
        }

        // Validate parsed data
        if (!data || data.length === 0) {
            return errorResponse(
                "NO_DATA",
                "No data found in file",
                "The file was parsed but contains no data rows. Please ensure the file has data after the header row."
            );
        }

        // Get headers
        const headers = Object.keys(data[0]);
        if (headers.length === 0) {
            return errorResponse(
                "NO_HEADERS",
                "No column headers found",
                "Could not identify column headers in the file. Please ensure the first row contains column names."
            );
        }

        // Store file metadata in Supabase
        const { data: insertedFile, error: fileError } = await supabase
            .from("processed_files")
            .insert({
                filename: file.name,
                file_type: fileType,
                file_size_bytes: fileSize,
                row_count: data.length,
                description: `Imported via web interface on ${new Date().toLocaleDateString()}`,
                status: "processing", // Mark as processing initially
                file_data: [],
            })
            .select()
            .single();

        if (fileError) {
            console.error("Supabase file insert error:", fileError);
            return errorResponse(
                "DATABASE_ERROR",
                "Failed to save file record",
                "Could not save file information to the database. Please try again.",
                500
            );
        }

        fileId = insertedFile.id;

        // Map columns using GPT-4o-mini
        let mapping;
        const sampleRows = data.slice(0, 5);

        try {
            mapping = await identifyColumns(headers, sampleRows);
        } catch (mappingError: any) {
            // Update file status to failed
            await supabase
                .from("processed_files")
                .update({ status: "mapping_failed" })
                .eq("id", fileId);

            if (mappingError instanceof MappingAgentError) {
                return errorResponse(
                    mappingError.code,
                    mappingError.message,
                    mappingError.details,
                    mappingError.code === "MISSING_API_KEY" ? 500 : 400
                );
            }

            console.error("Column mapping error:", mappingError);
            return errorResponse(
                "MAPPING_ERROR",
                "Failed to map CSV columns",
                "The AI could not determine which columns contain your lead data. Please ensure columns are clearly named (e.g., 'First Name', 'Email', 'Company').",
                500
            );
        }

        // Validate that we have an email mapping (required for leads)
        if (!mapping.email) {
            await supabase
                .from("processed_files")
                .update({ status: "mapping_failed" })
                .eq("id", fileId);

            return errorResponse(
                "MISSING_EMAIL_COLUMN",
                "No email column found",
                "Could not identify an email column in your file. Email is required for each lead. Please ensure your file has a column with email addresses."
            );
        }

        // Transform data to leads
        const leads = data.map((row: any) => ({
            file_id: fileId,
            first_name: mapping.firstName ? (row[mapping.firstName] || "").toString().trim() : "",
            last_name: mapping.lastName ? (row[mapping.lastName] || "").toString().trim() : "",
            email: mapping.email ? (row[mapping.email] || "").toString().trim().toLowerCase() : "",
            company: mapping.company ? (row[mapping.company] || "").toString().trim() : "",
            role: mapping.role ? (row[mapping.role] || "").toString().trim() : "",
        }));

        // Filter valid leads (must have email)
        const validLeads = leads.filter((l: any) => {
            const email = l.email;
            // Basic email validation
            return email && email.includes("@") && email.includes(".");
        });

        const invalidCount = leads.length - validLeads.length;
        if (invalidCount > 0) {
            console.warn(`Skipped ${invalidCount} rows without valid email addresses`);
        }

        if (validLeads.length === 0) {
            await supabase
                .from("processed_files")
                .update({ status: "no_valid_leads" })
                .eq("id", fileId);

            return errorResponse(
                "NO_VALID_LEADS",
                "No valid leads found",
                `Found ${data.length} rows but none contained valid email addresses. Please check that your email column contains valid email addresses.`
            );
        }

        // Insert leads
        const { error: leadsError } = await supabase
            .from("leads")
            .insert(validLeads);

        if (leadsError) {
            console.error("Failed to insert leads:", leadsError);

            await supabase
                .from("processed_files")
                .update({ status: "lead_insert_failed" })
                .eq("id", fileId);

            return errorResponse(
                "LEAD_INSERT_ERROR",
                "Failed to save leads",
                "File was processed but leads could not be saved to the database. Please try again.",
                500
            );
        }

        // Update file status to success
        await supabase
            .from("processed_files")
            .update({
                status: "completed",
                row_count: validLeads.length
            })
            .eq("id", fileId);

        // Build response with warnings if any
        const warnings: string[] = [];
        if (invalidCount > 0) {
            warnings.push(`${invalidCount} rows were skipped due to missing or invalid email addresses.`);
        }
        if (parseErrors.length > 0) {
            warnings.push(`File had parsing issues: ${parseErrors.join("; ")}`);
        }

        return NextResponse.json({
            success: true,
            fileId: fileId,
            count: validLeads.length,
            totalRows: data.length,
            skippedRows: invalidCount,
            mapping: {
                firstName: mapping.firstName,
                lastName: mapping.lastName,
                email: mapping.email,
                company: mapping.company,
                role: mapping.role,
            },
            warnings: warnings.length > 0 ? warnings : undefined,
            data: data, // Return parsed data for client-side review
        });

    } catch (error: any) {
        console.error("Unexpected error processing file:", error);

        // Update file status if we have a file ID
        if (fileId) {
            await supabase
                .from("processed_files")
                .update({ status: "error" })
                .eq("id", fileId);
        }

        return errorResponse(
            "UNEXPECTED_ERROR",
            "An unexpected error occurred",
            "Something went wrong while processing your file. Please try again or contact support if the problem persists.",
            500
        );
    }
}
