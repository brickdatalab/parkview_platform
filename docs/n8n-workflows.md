# n8n Workflow Documentation

**n8n Instance:** flow.clearscrub.io
**Last Updated:** 2025-12-09

This document describes the automated workflows that power data ingestion for the Parkview Dashboard.

---

## Overview: Data Flow Architecture

```
                                    ┌─────────────────────┐
                                    │   Schlomo System    │
                                    │   (via Zapier)      │
                                    └──────────┬──────────┘
                                               │
                                               ▼
┌─────────────────────┐            ┌─────────────────────┐
│  Notion Form Magic  │            │ new-schlomo-id-to-  │
│  (Lovable App)      │            │ supa workflow       │
└──────────┬──────────┘            └──────────┬──────────┘
           │                                  │
           ▼                                  ▼
┌─────────────────────┐            ┌─────────────────────┐
│ create_business_    │            │ schlomo_parkview_   │
│ main workflow       │            │ deals table         │
└──────────┬──────────┘            └─────────────────────┘
           │
           ▼
┌─────────────────────┐
│ business_main       │
│ table               │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ funded-form-        │
│ internal workflow   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────┐
│                    Supabase Tables                      │
│  ┌─────────────────┐  ┌─────────────────┐              │
│  │internal_funded_ │  │  funded_deals   │              │
│  │form             │  │                 │              │
│  └─────────────────┘  └────────┬────────┘              │
│                                │                        │
│           ┌────────────────────┼────────────────────┐  │
│           ▼                    ▼                    ▼  │
│  ┌─────────────────┐  ┌─────────────────┐             │
│  │commission_      │  │commission_      │             │
│  │payout_reps      │  │payout_iso       │             │
│  └─────────────────┘  └─────────────────┘             │
└─────────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────┐
│  Parkview Dashboard │
│  (Next.js App)      │
└─────────────────────┘
```

---

## Workflow 1: create_business_main row

**Workflow ID:** `mBvKBRIruyyClGJK`
**Status:** Active
**Created:** 2025-12-05
**Trigger:** Webhook (POST)

### Purpose

Creates a standardized business record in the `business_main` table before a funded deal is submitted. This ensures every deal has a normalized, deduplicated business name for reporting and analytics.

### Trigger

- **Type:** HTTP POST Webhook
- **Endpoint:** `https://flow.clearscrub.io/webhook/create_business_main`
- **Called by:** Notion Form Magic app (Lovable) when user enters a new business name

### Input Data (Webhook Body)

```json
{
  "business_main_id": "uuid-generated-by-frontend",
  "deal_name": "Business Name As Entered"
}
```

### Processing Steps

1. **Receive webhook** with business name and pre-generated UUID
2. **Normalize the business name:**
   - Convert to lowercase
   - Remove special characters (keep only alphanumeric and spaces)
   - Collapse multiple spaces to single space
   - Trim whitespace
3. **Insert into `business_main` table:**
   - `id` = provided UUID (allows frontend to reference before insert completes)
   - `deal_name_canonical` = original business name (preserves casing)
   - `deal_name_normalized` = normalized version (for fuzzy search)

### Output

Creates one row in `business_main` table with the business identity that will be referenced by funded deals.

### Relationship to Dashboard

The `business_main.id` is passed to the funded form workflow and stored in `funded_deals.business_main_id`, enabling:
- Deduplication of businesses across multiple deals
- Fuzzy search via trigram index on `deal_name_normalized`
- Consistent business naming in reports

---

## Workflow 2: funded-form-internal

**Workflow ID:** `pDnT5bWoWwys1Q4G`
**Status:** Active
**Created:** 2025-12-03
**Trigger:** Webhook (POST)

### Purpose

The main data pipeline for funded deals. Receives form submissions from the Notion Form Magic app and:
1. Archives raw submission to `internal_funded_form`
2. Looks up rep and lender metadata
3. Calculates commission values
4. Creates the funded deal record
5. Creates the appropriate commission payout record (Rep or ISO)

### Trigger

- **Type:** HTTP POST Webhook
- **Endpoint:** `https://flow.clearscrub.io/webhook/funded_form_lovable`
- **Called by:** Notion Form Magic app after user submits funded deal form

### Input Data (Webhook Body)

```json
{
  "deal_type": "New Business | Renewal",
  "deal_name": "Business Name",
  "business_main_id": "uuid-from-business-lookup",
  "lender": "Lender Name",
  "rep": "Rep Name | ISO - Partner Name",
  "funded": "50000.00",
  "rate": "1.44",
  "term": "360",
  "commission": "4000",
  "psf": "200",
  "funded_date": "2025-12-05",
  "lead_source": "Lead Source",
  "merchant_email": "email@example.com",
  "merchant_phone": "(555) 123-4567",
  "file_upload": "url or null",
  "loc": "TRUE | FALSE",
  "notes": "optional notes"
}
```

### Processing Steps

#### Step 1: Archive Raw Submission
Insert all form data into `internal_funded_form` table as-is for audit trail.

#### Step 2: Calculate Derived Values
JavaScript code node computes:
- `total_revenue` = commission + PSF
- `is_iso` = true if rep name starts with "ISO"

#### Step 3: Lookup Lender
Query `lenders` table by name to get:
- `lender.id` (UUID)
- `lender.inhouse_funded` (boolean - determines if brokered deal)

#### Step 4: Lookup Rep
Query `reps` table by name (strips "ISO - " prefix if present) to get:
- `rep.id` (UUID)
- `rep.rep_commission_percent` (decimal, e.g., 0.50 = 50%)
- `rep.iso` (boolean)

#### Step 5: Branch Based on Rep Type

**IF Rep (iso = false):**
1. Create `funded_deals` row with:
   - Normalized deal name (title case, no special chars)
   - All financial data
   - `rep_commission` = `rep_commission_percent` × `total_revenue`
   - Foreign keys: `rep_id`, `lender_id`, `business_main_id`, `internal_form_id`
2. Create `commission_payout_reps` row with:
   - `funded_deal_id` linking to the deal
   - `commission_amount` = calculated rep commission
   - `split_percentage` = rep's commission percent
   - `is_primary_rep` = true

**IF ISO (iso = true):**
1. Create `funded_deals` row with:
   - Same data but `lead_source` = "ISO"
   - No `rep_commission` calculated (ISOs negotiate separately)
2. Create `commission_payout_iso` row with:
   - `funded_deal_id` linking to the deal
   - `commission_amount` = raw commission from form (full amount to ISO)

### Output

- 1 row in `internal_funded_form` (raw archive)
- 1 row in `funded_deals` (processed deal)
- 1 row in either `commission_payout_reps` OR `commission_payout_iso`

### Business Logic Notes

1. **Deal Name Normalization:** `"ACME corp!!!"` becomes `"Acme Corp"` via:
   ```javascript
   deal_name.replace(/[^a-zA-Z0-9\s]/g, '')  // remove special chars
     .replace(/\s+/g, ' ')                    // collapse spaces
     .trim()                                  // trim whitespace
     .split(' ').map(word =>                  // title case
       word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
     ).join(' ')
   ```

2. **Rep Commission Calculation:**
   - `total_revenue` = commission + PSF
   - `rep_commission` = `rep_commission_percent` × `total_revenue`
   - Example: $4,000 commission + $200 PSF = $4,200 total, at 50% = $2,100 to rep

3. **ISO vs Rep Detection:**
   - If rep name starts with "ISO - ", it's an ISO partner
   - The prefix is stripped when looking up the rep record
   - ISO deals don't calculate `rep_commission` (paid full commission amount)

### Relationship to Dashboard

This workflow populates the three main data views:
- **Funded Deals page:** Reads from `funded_deals`
- **Rep Commissions page:** Reads from `commission_payout_reps` joined with `funded_deals`
- **ISO Commissions page:** Reads from `commission_payout_iso` joined with `funded_deals`

---

## Workflow 3: new-schlomo-id-to-supa

**Workflow ID:** `LNDcXgjyyFORlQYW`
**Status:** Active
**Created:** 2025-12-04
**Trigger:** Webhook (POST)

### Purpose

Ingests deal data from the Schlomo funding system (external lender platform). This captures deals that are funded through Parkview's in-house funding arm, providing the `sdeal_id` (Schlomo Deal ID) that links to the external system.

### Trigger

- **Type:** HTTP POST Webhook
- **Endpoint:** `https://flow.clearscrub.io/webhook/sdealid-supa`
- **Called by:** Zapier automation connected to Schlomo system

### Input Data (Webhook Body)

```json
{
  "sdeal_id": "1239157",
  "date": "11/28/2025",
  "deal_name": "BUSINESS NAME LLC",
  "funded_amount": "$100,000.00"
}
```

### Processing Steps

1. **Receive webhook** from Zapier with Schlomo deal data
2. **Parse funded amount:** Remove `$` and commas, convert to decimal
3. **Insert into `schlomo_parkview_deals` table:**
   - `sdeal_id` = Schlomo's unique identifier
   - `date` = funding date from Schlomo
   - `deal_name` = business name as recorded in Schlomo
   - `funded_amount` = parsed numeric value

### Output

Creates one row in `schlomo_parkview_deals` table.

### Relationship to Dashboard

The `schlomo_parkview_deals` table serves as a reference for matching Schlomo-funded deals:
- `funded_deals.sdeal_id` can reference records in this table
- Enables reconciliation between internal records and Schlomo system
- For brokered deals (non-Schlomo), the database trigger `assign_sdeal_id_for_brokered` auto-generates IDs starting with "9"

### Business Context

Parkview operates in two modes:
1. **In-house funded:** Deals funded through Schlomo (their own capital) - these get real `sdeal_id` values
2. **Brokered:** Deals funded through external lenders - these get auto-generated `sdeal_id` starting with "9"

---

## Integration Summary

| Workflow | Trigger Source | Supabase Tables Written | Dashboard Impact |
|----------|---------------|------------------------|------------------|
| create_business_main | Notion Form Magic | `business_main` | Enables business deduplication |
| funded-form-internal | Notion Form Magic | `internal_funded_form`, `funded_deals`, `commission_payout_reps` OR `commission_payout_iso` | Populates all main views |
| new-schlomo-id-to-supa | Zapier/Schlomo | `schlomo_parkview_deals` | Reference data for deal matching |

---

## Webhook Endpoints Reference

| Endpoint | Workflow | Method |
|----------|----------|--------|
| `https://flow.clearscrub.io/webhook/create_business_main` | create_business_main row | POST |
| `https://flow.clearscrub.io/webhook/funded_form_lovable` | funded-form-internal | POST |
| `https://flow.clearscrub.io/webhook/sdealid-supa` | new-schlomo-id-to-supa | POST |

---

## Error Handling

All workflows use n8n's default error handling. If a step fails:
- Execution stops at the failed node
- Error is logged in n8n execution history
- No partial data is committed (each Supabase insert is independent)

For production monitoring, check the n8n execution logs at `flow.clearscrub.io`.
