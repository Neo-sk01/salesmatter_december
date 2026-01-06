
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function testRawTavily() {
    const apiKey = process.env.TAVILY_API_KEY;
    console.log("Testing raw fetch...");
    try {
        const response = await fetch("https://api.tavily.com/search", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                api_key: apiKey,
                query: "Tesla Elon Musk",
                search_depth: "basic",
                include_answer: false,
                include_images: false,
                include_raw_content: false,
                max_results: 5
            })
        });

        if (!response.ok) {
            console.error(`Error: ${response.status} ${response.statusText}`);
            const text = await response.text();
            console.error(text);
        } else {
            const data = await response.json();
            console.log("Success:", JSON.stringify(data, null, 2).substring(0, 500));
        }
    } catch (e) {
        console.error("Fetch failed:", e);
    }
}

testRawTavily();
