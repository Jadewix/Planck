# Project inquiries → Google Sheets

The contact section and case-study cards open one three-step form on the existing page. It collects the project type, description, relevant follow-up answers, name, email, optional company, a free-text budget/currency, launch timeframe, and permission to contact the visitor about the project. Questions differ for mobile apps, websites/web applications, UI/UX work, and visitors who need advice.

The browser posts to `/api/inquiries` on this site's Cloudflare Worker. The Worker validates the submission and forwards it to a Google Apps Script web app. The script appends a row to a private Google Sheet and acknowledges the submission ID. The website shows success only after that acknowledgment. A public Google API key or browser-side spreadsheet credential is not used.

## Required one-time setup

### 1. Create your sheet and its bound script

1. Create the Google Sheet that should receive inquiries. Keep the spreadsheet private.
2. In that sheet, open **Extensions → Apps Script**.
3. Replace the starter code with the complete contents of [`google-apps-script/Code.gs`](../google-apps-script/Code.gs).
4. In Apps Script **Project Settings → Script Properties**, add `LEAD_WEBHOOK_SECRET`: a long, random secret of at least 32 characters. Use a password manager to generate it, or generate it locally with `openssl rand -hex 32`. Do not put it in source code, the spreadsheet, or chat.
5. Select and run `setupLeadSheet` once. Authorize the script in your Google account. It records the bound spreadsheet ID and creates an **Inquiries** tab with the expected columns. It refuses to overwrite a tab with different headers. Do not rename/reorder those columns without updating the script.

### 2. Deploy the script as a web app

1. Choose **Deploy → New deployment → Web app**.
2. Set **Execute as** to your account, and **Who has access** to **Anyone**. The private shared secret protects writes; the spreadsheet itself does not need public sharing.
3. Deploy, then copy the URL ending in `/exec` (not the development `/dev` URL).
4. If your Google Workspace administrator does not allow this deployment mode, the receiver cannot run with these settings; use an approved integration instead. Do not change sheet sharing to work around it.

After editing receiver code later, update the deployment to a new script version. Saving source alone does not update a deployed web app.

### 3. Configure the production Cloudflare Worker

In your Worker’s **Settings → Variables and Secrets**, add:

| Name | Type | Value |
| --- | --- | --- |
| `GOOGLE_APPS_SCRIPT_URL` | Variable (or secret) | The Apps Script `/exec` URL from step 2 |
| `LEAD_WEBHOOK_SECRET` | Secret | Exactly the same secret as the Apps Script property |

Use runtime Worker settings, not just repository build variables. Redeploy the repository after saving these values. The build command remains `npm run build`; the deploy command remains `npx wrangler deploy`. `wrangler.jsonc` now contains the Worker entry point and an `ASSETS` binding. `/api/*` runs through the Worker; the portfolio remains static assets.

No real URL or secret is committed. Without these settings, the endpoint returns an unavailable response and the form keeps the answers, with an email fallback. It does **not** pretend the inquiry was saved.

### 4. Check the live connection

From the deployed website, submit a clearly labelled test inquiry and confirm one row appears in **Inquiries**, including the conditional answers and budget. Confirm that the success screen appears. Retry the same submission after an interrupted response if testing duplicate handling; the same submission ID should yield one row. A new completed inquiry intentionally creates a new row.

Do not consider Google delivery verified until this real-sheet test succeeds. Automated tests execute the actual Apps Script source against a simulated spreadsheet service; they do not access your Google account.

## Local development

Use Node 24. Copy `.dev.vars.example` to `.dev.vars` if `.dev.vars` does not already exist and supply your development Apps Script URL and secret there. These local values are ignored by Git. Never overwrite an existing local configuration blindly.

```sh
npm ci
npm run worker:dev
```

This builds the assets and runs the whole application, including `/api/inquiries`, on port 8787. For Vite hot reload, also run `npm run dev`; the dev server proxies `/api` to the local Worker on port 8787. The production-preview command serves only built static files; it does not supply the API.

## Validation

```sh
npm run check
```

`test:api` uses Node's built-in test runner. It executes the real Worker handler and Apps Script source with a simulated Sheets service, checking field validation, each project branch, column mapping, shared-secret rejection, formula-safe cell values, write failures, timeouts, and duplicate prevention after a lost response.

Playwright tests desktop and mobile inquiry paths, required fields, conditional questions, switching services, free-text budgets, retry preservation, failure responses, and opening the form from a case study. Browser network routes simulate the acknowledged API response; the separate API tests verify the backend contract. CI runs both.

## Editing questions and storage

- `shared/inquiries.js`: project types, labels/options, field limits, and server validation.
- `src/scripts/inquiry.js`: form rendering, steps, submission, and retry state.
- `worker/index.js`: same-origin JSON endpoint and Google forwarding.
- `google-apps-script/Code.gs`: spreadsheet columns and private receiver.
- `tests/inquiries.test.mjs`, `tests/inquiry.spec.js`: API/receiver and browser coverage.

If adding a question, update its sheet column and receiver mapping too. Common and conditional values go into separate columns rather than one unreadable JSON cell. Unknown input fields are discarded. Spreadsheet-formula prefixes are escaped. The receiver uses a write lock and submission-ID lookup to avoid duplicate rows. Google/Apps Script quotas still apply.

Inquiries remain in browser memory while the page is open, including after a send failure. They are not placed in local storage or analytics. The receiver does not log form values or secrets. The form asks only for project information and contact permission; it does not subscribe visitors to marketing. Manage retention and access in the lead spreadsheet.

The endpoint enforces same-origin requests, a body-size limit, branch validation, and a honeypot. For public traffic, configure a Cloudflare rate-limit/WAF rule for `POST /api/inquiries`; no CAPTCHA credentials are required by this implementation. The handler also supports an optional Workers rate-limit binding named `INQUIRY_RATE_LIMITER` if you choose to configure one. Same-origin checks and honeypots are not a substitute for traffic controls.
