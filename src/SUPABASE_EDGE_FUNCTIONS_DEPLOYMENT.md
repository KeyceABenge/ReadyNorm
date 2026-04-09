# Supabase Edge Functions Deployment Guide
## Phases 1 & 2 — 13 Functions

---

## Prerequisites

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link to your project
supabase link --project-ref zamrusolomzustgenpin
```

---

## 1. Set Secrets (BEFORE deploying functions)

```bash
supabase secrets set \
  OPENAI_API_KEY="your-openai-api-key" \
  SENDGRID_API_KEY="your-sendgrid-api-key" \
  SUPABASE_URL="https://zamrusolomzustgenpin.supabase.co" \
  SUPABASE_SERVICE_ROLE_KEY="your-supabase-service-role-key"
```

Verify:
```bash
supabase secrets list
```

You should see all 4 secrets listed.

---

## 2. Create the folder structure

From your project root, create:

```
supabase/
  functions/
    invokeLLM/
      index.ts
    sendEmail/
      index.ts
    generateImage/
      index.ts
    extractData/
      index.ts
    listOrgUsers/
      index.ts
    transferOwnership/
      index.ts
    removeUserAccess/
      index.ts
    seedDemoData/
      index.ts
    logSecurityEvent/
      index.ts
    sendPasswordReset/
      index.ts
    liveSimulation/
      index.ts
    imageProxy/
      index.ts
    fileProxy/
      index.ts
```

Copy the code from the `supabase/functions/*/index.ts` files in this project into those folders.

---

## 3. Deploy ALL functions

```bash
# Deploy all at once
supabase functions deploy invokeLLM --no-verify-jwt
supabase functions deploy sendEmail --no-verify-jwt
supabase functions deploy generateImage --no-verify-jwt
supabase functions deploy extractData --no-verify-jwt
supabase functions deploy listOrgUsers --no-verify-jwt
supabase functions deploy transferOwnership --no-verify-jwt
supabase functions deploy removeUserAccess --no-verify-jwt
supabase functions deploy seedDemoData --no-verify-jwt
supabase functions deploy logSecurityEvent --no-verify-jwt
supabase functions deploy sendPasswordReset --no-verify-jwt
supabase functions deploy liveSimulation --no-verify-jwt
supabase functions deploy imageProxy --no-verify-jwt
supabase functions deploy fileProxy --no-verify-jwt
```

> **Why `--no-verify-jwt`?**  
> We handle JWT validation ourselves inside each function (via `supabase.auth.getUser(token)`).
> The public proxy functions (imageProxy, fileProxy) intentionally allow unauthenticated GET requests.
> Using `--no-verify-jwt` prevents Supabase from rejecting requests before our code runs.

### Or deploy all in one command:
```bash
for fn in invokeLLM sendEmail generateImage extractData listOrgUsers transferOwnership removeUserAccess seedDemoData logSecurityEvent sendPasswordReset liveSimulation imageProxy fileProxy; do
  supabase functions deploy $fn --no-verify-jwt
done
```

---

## 4. Function URLs

All functions are at:
```
https://zamrusolomzustgenpin.supabase.co/functions/v1/{functionName}
```

| Function | URL |
|----------|-----|
| invokeLLM | `https://zamrusolomzustgenpin.supabase.co/functions/v1/invokeLLM` |
| sendEmail | `https://zamrusolomzustgenpin.supabase.co/functions/v1/sendEmail` |
| generateImage | `https://zamrusolomzustgenpin.supabase.co/functions/v1/generateImage` |
| extractData | `https://zamrusolomzustgenpin.supabase.co/functions/v1/extractData` |
| listOrgUsers | `https://zamrusolomzustgenpin.supabase.co/functions/v1/listOrgUsers` |
| transferOwnership | `https://zamrusolomzustgenpin.supabase.co/functions/v1/transferOwnership` |
| removeUserAccess | `https://zamrusolomzustgenpin.supabase.co/functions/v1/removeUserAccess` |
| seedDemoData | `https://zamrusolomzustgenpin.supabase.co/functions/v1/seedDemoData` |
| logSecurityEvent | `https://zamrusolomzustgenpin.supabase.co/functions/v1/logSecurityEvent` |
| sendPasswordReset | `https://zamrusolomzustgenpin.supabase.co/functions/v1/sendPasswordReset` |
| liveSimulation | `https://zamrusolomzustgenpin.supabase.co/functions/v1/liveSimulation` |
| imageProxy | `https://zamrusolomzustgenpin.supabase.co/functions/v1/imageProxy` |
| fileProxy | `https://zamrusolomzustgenpin.supabase.co/functions/v1/fileProxy` |

---

## 5. Frontend Mapping

The frontend adapter (`lib/adapters/functions.js`) calls:
```js
`${SUPABASE_URL}/functions/v1/${functionName}`
```

With headers:
```js
{
  'Content-Type': 'application/json',
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${userJWT}`
}
```

The function names used by the frontend match the folder names exactly.

---

## 6. Smoke Test Checklist

After deployment, test each function:

### 6a. invokeLLM (AI call)
```bash
curl -X POST https://zamrusolomzustgenpin.supabase.co/functions/v1/invokeLLM \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SUPABASE_USER_JWT" \
  -H "apikey: sb_publishable_p-ZZcpZzIqRW1dRNoHT69Q_l8l2XH3Q" \
  -d '{"prompt": "Say hello in one word"}'
```
✅ Expected: `{"result": "Hello!"}`

### 6b. sendEmail
```bash
curl -X POST https://zamrusolomzustgenpin.supabase.co/functions/v1/sendEmail \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SUPABASE_USER_JWT" \
  -H "apikey: sb_publishable_p-ZZcpZzIqRW1dRNoHT69Q_l8l2XH3Q" \
  -d '{"to": "your@email.com", "subject": "Edge Function Test", "body": "<h1>It works!</h1>"}'
```
✅ Expected: `{"success": true}`

### 6c. generateImage
```bash
curl -X POST https://zamrusolomzustgenpin.supabase.co/functions/v1/generateImage \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SUPABASE_USER_JWT" \
  -H "apikey: sb_publishable_p-ZZcpZzIqRW1dRNoHT69Q_l8l2XH3Q" \
  -d '{"prompt": "A simple blue circle on white background"}'
```
✅ Expected: `{"url": "https://oaidalleapi..."}`

### 6d. extractData
```bash
curl -X POST https://zamrusolomzustgenpin.supabase.co/functions/v1/extractData \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SUPABASE_USER_JWT" \
  -H "apikey: sb_publishable_p-ZZcpZzIqRW1dRNoHT69Q_l8l2XH3Q" \
  -d '{"file_url": "https://upload.wikimedia.org/wikipedia/commons/4/47/PNG_transparency_demonstration_1.png", "json_schema": {"type": "object", "properties": {"description": {"type": "string"}}}}'
```
✅ Expected: `{"status": "success", "output": {...}}`

### 6e. imageProxy (public GET)
```bash
curl -v "https://zamrusolomzustgenpin.supabase.co/functions/v1/imageProxy?url=https://upload.wikimedia.org/wikipedia/commons/4/47/PNG_transparency_demonstration_1.png"
```
✅ Expected: Binary image data, Content-Type: image/png

### 6f. fileProxy (public GET)
```bash
curl -v "https://zamrusolomzustgenpin.supabase.co/functions/v1/fileProxy?url=https://upload.wikimedia.org/wikipedia/commons/4/47/PNG_transparency_demonstration_1.png"
```
✅ Expected: Binary image data with proper Content-Type

### 6g. listOrgUsers
```bash
curl -X POST https://zamrusolomzustgenpin.supabase.co/functions/v1/listOrgUsers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SUPABASE_USER_JWT" \
  -H "apikey: sb_publishable_p-ZZcpZzIqRW1dRNoHT69Q_l8l2XH3Q" \
  -d '{"organization_id": "6963b67ddbac5f88e846f626"}'
```
✅ Expected: `{"users": [...]}`

### 6h. logSecurityEvent
```bash
curl -X POST https://zamrusolomzustgenpin.supabase.co/functions/v1/logSecurityEvent \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SUPABASE_USER_JWT" \
  -H "apikey: sb_publishable_p-ZZcpZzIqRW1dRNoHT69Q_l8l2XH3Q" \
  -d '{"event_type": "test_event", "organization_id": "6963b67ddbac5f88e846f626", "details": "Smoke test"}'
```
✅ Expected: `{"status": "logged", "event_type": "test_event"}`

### 6i. sendPasswordReset (no JWT needed)
```bash
curl -X POST https://zamrusolomzustgenpin.supabase.co/functions/v1/sendPasswordReset \
  -H "Content-Type: application/json" \
  -H "apikey: sb_publishable_p-ZZcpZzIqRW1dRNoHT69Q_l8l2XH3Q" \
  -d '{"email": "your@email.com"}'
```
✅ Expected: `{"success": true, "message": "Password reset email sent"}`

### Getting a user JWT for testing:
```js
// In browser console on your app:
const { data } = await supabase.auth.getSession();
console.log(data.session.access_token);
```

---

## 7. Post-Deployment Verification

1. ✅ Open the app in browser
2. ✅ Navigate to Manager Dashboard → verify data loads (listOrgUsers works)
3. ✅ Open an SSOP → trigger AI generation (invokeLLM works)
4. ✅ Upload an SDS PDF → verify extraction (extractData works)
5. ✅ Check that proxied images load (imageProxy/fileProxy work)
6. ✅ Send a shift handoff email (sendEmail works)
7. ✅ Check Supabase Dashboard → Edge Functions → Invocations tab for logs

---

## 8. NOT YET MIGRATED

- `fetchExecutiveData` — still uses Base44 SDK for entity access (Phase 3)
- `auditLogger` — triggered by Base44 entity automations (Phase 3)
- Migration batch scripts (`migrateBatch*`) — to be deleted after Phase 3