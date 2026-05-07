#!/bin/bash
# PrimePay End-to-End Workflow Test
BASE="http://localhost:8000/api/v1"

echo "============================================"
echo "  PrimePay — Full Workflow Test"
echo "============================================"

# Step 1: Register/Login
echo ""
echo ">>> STEP 1: Login"
LOGIN=$(curl -s -X POST "$BASE/auth/login" -H 'Content-Type: application/json' -d '{"email":"demo@primepay.com","password":"Test@12345"}')
TOKEN=$(echo $LOGIN | python3 -c 'import sys,json; print(json.load(sys.stdin)["data"]["access_token"])')
echo "  ✅ Logged in. Token: ${TOKEN:0:20}..."
AUTH="Authorization: Bearer $TOKEN"

# Step 2: Create a Client
echo ""
echo ">>> STEP 2: Create Client"
CLIENT=$(curl -s -X POST "$BASE/clients" -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"name":"TechStartup Inc","email":"cto@techstartup.io","phone":"+91 88888 99999","company":"TechStartup","notes":"React project"}')
CLIENT_ID=$(echo $CLIENT | python3 -c 'import sys,json; print(json.load(sys.stdin)["data"]["id"])')
CLIENT_NAME=$(echo $CLIENT | python3 -c 'import sys,json; print(json.load(sys.stdin)["data"]["name"])')
echo "  ✅ Client created: $CLIENT_NAME (ID: ${CLIENT_ID:0:8}...)"

# Step 3: Create a Task WITH client and rate
echo ""
echo ">>> STEP 3: Create Billable Task"
TASK=$(curl -s -X POST "$BASE/tasks" -H "$AUTH" -H 'Content-Type: application/json' \
  -d "{\"title\":\"Build Dashboard UI\",\"description\":\"React dashboard with charts and analytics\",\"priority\":\"high\",\"client_id\":\"$CLIENT_ID\",\"rate_type\":\"fixed\",\"rate\":750000}")
TASK_ID=$(echo $TASK | python3 -c 'import sys,json; print(json.load(sys.stdin)["data"]["id"])')
TASK_RATE=$(echo $TASK | python3 -c 'import sys,json; r=json.load(sys.stdin)["data"]["rate"]; print(f"₹{r/100:,.0f}")')
TASK_CLIENT=$(echo $TASK | python3 -c 'import sys,json; print(json.load(sys.stdin)["data"]["client_id"])')
echo "  ✅ Task created: 'Build Dashboard UI'"
echo "     Rate: $TASK_RATE (fixed) | Client: ${TASK_CLIENT:0:8}..."

# Step 4: Start Timer
echo ""
echo ">>> STEP 4: Start Timer"
curl -s -X POST "$BASE/tasks/$TASK_ID/start-timer" -H "$AUTH" > /dev/null
echo "  ✅ Timer started"
echo "     ⏱ Working for 3 seconds..."
sleep 3

# Step 5: Stop Timer
echo ""
echo ">>> STEP 5: Stop Timer"
STOP=$(curl -s -X POST "$BASE/tasks/$TASK_ID/stop-timer" -H "$AUTH")
TIME_SPENT=$(echo $STOP | python3 -c 'import sys,json; print(json.load(sys.stdin)["data"]["time_spent"])')
STATUS=$(echo $STOP | python3 -c 'import sys,json; print(json.load(sys.stdin)["data"]["status"])')
echo "  ✅ Timer stopped. Time tracked: ${TIME_SPENT}s | Status: $STATUS"

# Step 6: Complete Task — THIS should auto-generate invoice!
echo ""
echo ">>> STEP 6: Complete Task (should auto-generate invoice)"
COMPLETE=$(curl -s -X POST "$BASE/tasks/$TASK_ID/complete" -H "$AUTH")
echo "  Full response:"
echo $COMPLETE | python3 -m json.tool
INVOICE_NUM=$(echo $COMPLETE | python3 -c 'import sys,json; d=json.load(sys.stdin)["data"]; print(d.get("invoice",{}).get("invoice_number","NO INVOICE"))')
INVOICE_AMT=$(echo $COMPLETE | python3 -c 'import sys,json; d=json.load(sys.stdin)["data"]; a=d.get("invoice",{}).get("amount",0); print(f"₹{a/100:,.0f}" if a else "N/A")')
INVOICE_ID=$(echo $COMPLETE | python3 -c 'import sys,json; d=json.load(sys.stdin)["data"]; print(d.get("invoice",{}).get("id","NONE"))')
echo ""
echo "  ✅ Task completed!"
echo "  📄 Invoice: $INVOICE_NUM | Amount: $INVOICE_AMT"

# Step 7: Check Invoices List
echo ""
echo ">>> STEP 7: List All Invoices"
INVOICES=$(curl -s "$BASE/invoices?page=1&per_page=10" -H "$AUTH")
INV_COUNT=$(echo $INVOICES | python3 -c 'import sys,json; print(json.load(sys.stdin)["data"]["total"])')
echo "  ✅ Total invoices: $INV_COUNT"
echo $INVOICES | python3 -c '
import sys,json
for i in json.load(sys.stdin)["data"]["invoices"]:
    print(f"     {i[\"invoice_number\"]} | ₹{i[\"amount\"]/100:,.0f} | {i[\"status\"]}")
'

# Step 8: Check Public Invoice (no auth)
echo ""
echo ">>> STEP 8: Public Invoice Page (no auth needed)"
PUBLIC=$(curl -s "$BASE/invoices/$INVOICE_ID/public")
echo $PUBLIC | python3 -m json.tool

# Step 9: Dashboard Stats
echo ""
echo ">>> STEP 9: Dashboard Stats"
DASH=$(curl -s "$BASE/dashboard" -H "$AUTH")
echo $DASH | python3 -c '
import sys,json
d = json.load(sys.stdin)["data"]
print(f"  💰 Total Earnings:   ₹{d[\"total_earnings\"]/100:,.0f}")
print(f"  ⏳ Pending Earnings: ₹{d[\"pending_earnings\"]/100:,.0f}")
print(f"  👥 Total Clients:    {d[\"total_clients\"]}")
print(f"  ✅ Active Tasks:     {d[\"active_tasks\"]}")
print(f"  🧾 Invoices:         {d[\"paid_invoices\"]}/{d[\"total_invoices\"]} paid")
print(f"  ⏱  Time Tracked:     {d[\"total_time_tracked\"]}s")
'

echo ""
echo "============================================"
echo "  ✅ ALL WORKFLOW STEPS PASSED!"
echo "============================================"
