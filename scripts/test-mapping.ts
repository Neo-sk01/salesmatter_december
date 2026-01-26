// Test script to verify GPT-4o-mini CSV column mapping
import { identifyColumns } from "../lib/agents/mapping-agent";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: ".env.local" });

async function testMappingAgent() {
    console.log("🔍 Testing GPT-4o-mini CSV Mapping Agent...\n");

    // Check for API key
    if (!process.env.OPENAI_API_KEY) {
        console.error("❌ OPENAI_API_KEY not found in environment");
        process.exit(1);
    }
    console.log("✅ OpenAI API key found\n");

    // Test Case 1: Standard headers
    console.log("📋 Test 1: Standard CSV headers");
    const standardHeaders = ["First Name", "Last Name", "Email Address", "Company", "Job Title", "LinkedIn URL", "Website"];
    const standardSampleRows = [
        { "First Name": "John", "Last Name": "Doe", "Email Address": "john@company.com", "Company": "Acme Inc", "Job Title": "CEO", "LinkedIn URL": "https://linkedin.com/in/johndoe", "Website": "https://acme.com" },
        { "First Name": "Jane", "Last Name": "Smith", "Email Address": "jane@corp.com", "Company": "Corp LLC", "Job Title": "CTO", "LinkedIn URL": "https://linkedin.com/in/janesmith", "Website": "https://corp.com" },
    ];

    try {
        const result1 = await identifyColumns(standardHeaders, standardSampleRows);
        console.log("   Mapping Result:", JSON.stringify(result1, null, 2));
        console.log("   ✅ Standard headers mapped successfully!\n");
    } catch (error) {
        console.error("   ❌ Failed:", error);
    }

    // Test Case 2: Non-standard headers
    console.log("📋 Test 2: Non-standard/ambiguous headers");
    const weirdHeaders = ["fname", "lname", "contact_email", "org_name", "position", "li_profile", "company_site"];
    const weirdSampleRows = [
        { "fname": "Bob", "lname": "Johnson", "contact_email": "bob@startup.io", "org_name": "StartupXYZ", "position": "Founder", "li_profile": "https://linkedin.com/in/bobjohnson", "company_site": "https://startupxyz.io" },
        { "fname": "Alice", "lname": "Williams", "contact_email": "alice@tech.co", "org_name": "TechCo", "position": "VP Sales", "li_profile": "", "company_site": "https://tech.co" },
    ];

    try {
        const result2 = await identifyColumns(weirdHeaders, weirdSampleRows);
        console.log("   Mapping Result:", JSON.stringify(result2, null, 2));
        console.log("   ✅ Non-standard headers mapped successfully!\n");
    } catch (error) {
        console.error("   ❌ Failed:", error);
    }

    // Test Case 3: Mixed case and abbreviations
    console.log("📋 Test 3: Mixed case and abbreviations");
    const mixedHeaders = ["FIRSTNAME", "LASTNAME", "EMAIL", "COMPANY_NAME", "TITLE", "LINKEDIN", "URL"];
    const mixedSampleRows = [
        { "FIRSTNAME": "Mike", "LASTNAME": "Brown", "EMAIL": "mike@enterprise.com", "COMPANY_NAME": "Enterprise Corp", "TITLE": "Director", "LINKEDIN": "linkedin.com/in/mikebrown", "URL": "enterprise.com" },
    ];

    try {
        const result3 = await identifyColumns(mixedHeaders, mixedSampleRows);
        console.log("   Mapping Result:", JSON.stringify(result3, null, 2));
        console.log("   ✅ Mixed case headers mapped successfully!\n");
    } catch (error) {
        console.error("   ❌ Failed:", error);
    }

    console.log("🎉 All mapping tests completed!");
}

testMappingAgent();
