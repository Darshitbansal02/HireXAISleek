const fs = require('fs');
const path = require('path');
const http = require('http');

// 1. Read .env.local
const envPath = path.join(__dirname, '..', '.env.local');
let apiBaseUrl = '';

try {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const match = envContent.match(/NEXT_PUBLIC_API_BASE_URL=(.*)/);
    if (match) {
        apiBaseUrl = match[1].trim();
    }
} catch (err) {
    console.error("❌ Could not read .env.local");
    process.exit(1);
}

console.log(`\n🔍 Configuration Check:`);
console.log(`   NEXT_PUBLIC_API_BASE_URL = ${apiBaseUrl}`);

if (!apiBaseUrl) {
    console.error("❌ NEXT_PUBLIC_API_BASE_URL is missing in .env.local");
    process.exit(1);
}

// 2. Helper to make requests
function checkUrl(url, description) {
    return new Promise((resolve) => {
        console.log(`\nTesting ${description}:`);
        console.log(`   URL: ${url}`);

        const req = http.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    console.log(`   ✅ Success (Status: ${res.statusCode})`);
                    resolve(true);
                } else {
                    console.log(`   ⚠️  Failed (Status: ${res.statusCode})`);
                    console.log(`      Response: ${data.substring(0, 100)}...`);
                    resolve(false);
                }
            });
        });

        req.on('error', (err) => {
            console.log(`   ❌ Connection Error: ${err.message}`);
            if (err.message.includes('ECONNREFUSED')) {
                console.log("      (Is the backend server running on port 8000?)");
            }
            resolve(false);
        });
    });
}

async function runTests() {
    // Test 1: Direct Backend Root Health (Baseline)
    // Assuming backend is on port 8000 based on the env var
    const backendOrigin = new URL(apiBaseUrl).origin;
    const rootHealth = `${backendOrigin}/health`;

    console.log("\n--- 1. Checking Backend Status (Direct) ---");
    const backendUp = await checkUrl(rootHealth, "Backend Root Health");

    if (!backendUp) {
        console.error("\n❌ CRITICAL: Backend does not appear to be running or reachable.");
        console.error("   Please start the backend server (python main.py) and try again.");
        return;
    }

    // Test 2: API Client Health Check
    // This mimics api-client.ts: client.get("/health") with baseURL
    console.log("\n--- 2. Checking Frontend API Client Configuration ---");
    const apiClientHealth = `${apiBaseUrl}/health`;
    const clientHealthSuccess = await checkUrl(apiClientHealth, "API Client Health Endpoint");

    // Test 3: Actual API Endpoint (e.g., /v1/auth/me - requires auth usually, but checking 401 vs 404 is useful)
    // Or just check if /v1 docs exist
    const docsUrl = `${apiBaseUrl}/v1/docs`; // Based on main.py: API_V1_STR/docs -> /api/v1/docs
    // Wait, main.py says: docs_url=f"{settings.API_V1_STR}/docs" -> /api/v1/docs
    // If base URL is .../api, then .../api/v1/docs should exist?
    // No, API_V1_STR is /api/v1.
    // If base URL is .../api.
    // Then we need to append /v1/docs?
    // Let's look at main.py again.
    // app.include_router(..., prefix="/api/v1/...")
    // So the path is /api/v1/...
    // If base URL is http://localhost:8000/api
    // Then client.get("/v1/...") -> http://localhost:8000/api/v1/...
    // This matches!

    const apiDocs = `${apiBaseUrl}/v1/docs`;
    // Actually main.py docs_url is relative to app root?
    // app = FastAPI(docs_url=f"{settings.API_V1_STR}/docs") -> /api/v1/docs
    // So http://localhost:8000/api/v1/docs

    const docsSuccess = await checkUrl(apiDocs, "API V1 Docs (Connectivity Check)");

    console.log("\n--- Summary ---");
    if (clientHealthSuccess && docsSuccess) {
        console.log("✅ All systems go! Frontend is correctly configured to talk to Backend.");
    } else if (!clientHealthSuccess && docsSuccess) {
        console.log("⚠️  Partial Success: API endpoints work, but the specific '/health' endpoint expected by the client is missing.");
        console.log("   Fix: The backend needs to expose '/api/health' or the client should use root '/health'.");
    } else {
        console.log("❌ Connectivity Issues Detected.");
    }
}

runTests();
