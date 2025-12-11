# Supabase Schema Documentation

**Project ID:** `irssizfmrqeqcxwdvkhx`
**Region:** `us-east-1`
**Dashboard:** https://supabase.com/dashboard/project/irssizfmrqeqcxwdvkhx
**Generated:** 2025-12-11

---

## Table of Contents

1. [Overview](#overview)
2. [Public Schema Tables](#public-schema-tables)
   - [funded_deals](#funded_deals)
   - [business_main](#business_main)
   - [reps](#reps)
   - [lenders](#lenders)
   - [commission_payout_reps](#commission_payout_reps)
   - [commission_payout_iso](#commission_payout_iso)
   - [clawbacks](#clawbacks)
   - [internal_funded_form](#internal_funded_form)
   - [schlomo_parkview_deals](#schlomo_parkview_deals)
   - [application](#application)
   - [parkview-data](#parkview-data)
   - [users](#users)
3. [Auth Schema Tables](#auth-schema-tables)
4. [Storage Schema Tables](#storage-schema-tables)
5. [Relationships & Foreign Keys](#relationships--foreign-keys)
6. [Indexes](#indexes)
7. [Row Level Security (RLS) Policies](#row-level-security-rls-policies)
8. [Functions & RPCs](#functions--rpcs)
9. [Triggers](#triggers)
10. [Sequences](#sequences)
11. [Custom Types & Enums](#custom-types--enums)
12. [Extensions](#extensions)
13. [Migration History](#migration-history)
14. [Edge Functions](#edge-functions)

---

## Overview

This database supports the Parkview Advance platform with two main applications:
- **Parkview Dashboard** (Next.js) - Internal dashboard for funded deals, commissions, payment tracking
- **Funded Form** (Vite + React) - External form for submitting funded deal data

### Table Row Counts (Estimated)

| Table | Rows | Description |
|-------|------|-------------|
| `parkview-data` | ~8,202,085 | Leads data |
| `application` | ~18,745 | Application submissions |
| `funded_deals` | ~3,760 | Master funded deals |
| `internal_funded_form` | ~3,151 | Gravity Form raw entries |
| `commission_payout_reps` | ~2,681 | Rep commission payouts |
| `business_main` | ~1,879 | Standardized business names |
| `schlomo_parkview_deals` | ~1,517 | Schlomo deals data |
| `commission_payout_iso` | ~1,077 | ISO commission payouts |
| `reps` | ~134 | Sales representatives |
| `lenders` | ~112 | Lender lookup |
| `users` | ~1 | Dashboard users |
| `clawbacks` | ~0 | Clawback tracking (new table) |

---

## Public Schema Tables

### funded_deals

**Description:** Master funded deals table - primary source of truth for all funded MCA/business loan deals

**RLS Enabled:** Yes

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | `gen_random_uuid()` | Primary key |
| `sdeal_id` | varchar | YES | - | Schlomo deal ID |
| `deal_name` | varchar | NO | - | Business/deal name |
| `rep` | varchar | YES | - | Rep name (denormalized) |
| `lender` | varchar | YES | - | Lender name (denormalized) |
| `funded_date` | date | YES | - | Authoritative funding date from Gravity Form Field 13 |
| `funded_amount` | numeric | YES | - | Funded amount |
| `factor_rate` | numeric | YES | - | Factor rate |
| `term` | varchar | YES | - | Term |
| `commission` | numeric | YES | - | Commission amount |
| `psf` | numeric | YES | - | PSF |
| `total_rev` | numeric | YES | - | Total revenue |
| `commission_pct` | numeric | YES | - | Commission percentage |
| `rep_commission` | numeric | YES | - | Rep commission |
| `deal_type` | varchar | YES | - | Deal type |
| `lead_source` | varchar | YES | - | Lead source |
| `email` | varchar | YES | - | Contact email |
| `phone` | varchar | YES | - | Contact phone |
| `merchant_name` | varchar | YES | - | Merchant name |
| `sub_id` | varchar | YES | - | Sub ID |
| `parkview_rep_paid` | boolean | YES | `false` | Rep payment status |
| `iso_paid` | boolean | YES | `false` | ISO payment status |
| `funder_paid_parkview` | boolean | YES | `false` | Funder payment status |
| `funder_paid_date` | timestamptz | YES | - | Date when funder paid Parkview |
| `created_at` | timestamptz | YES | `now()` | Created timestamp |
| `updated_at` | timestamptz | YES | `now()` | Updated timestamp |
| `split_rep` | varchar | YES | - | Second rep name for split commission deals (Form Field 19) |
| `internal_form_id` | uuid | YES | - | FK to internal_funded_form |
| `rep_id` | uuid | YES | - | FK to reps |
| `lender_id` | uuid | YES | - | FK to lenders |
| `is_loc` | boolean | YES | - | Is line of credit |
| `business_main_id` | uuid | NO | - | FK to business_main |

**Primary Key:** `id`

**Indexes:**
- `funded_deals_pkey` - UNIQUE btree on `(id)`
- `idx_funded_deals_deal_name` - btree on `(deal_name)`
- `idx_funded_deals_funded_date` - btree on `(funded_date)`
- `idx_funded_deals_internal_form_id` - btree on `(internal_form_id)`
- `idx_funded_deals_lender` - btree on `(lender)`
- `idx_funded_deals_lender_id` - btree on `(lender_id)`
- `idx_funded_deals_rep` - btree on `(rep)`
- `idx_funded_deals_rep_id` - btree on `(rep_id)`
- `idx_funded_deals_sdeal_id` - btree on `(sdeal_id)`

---

### business_main

**Description:** Standardized business names lookup table for funded_deals

**RLS Enabled:** Yes

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | `gen_random_uuid()` | Primary key |
| `deal_name_canonical` | text | NO | - | Canonical business name (unique) |
| `deal_name_normalized` | text | NO | - | Normalized name for search |
| `created_at` | timestamptz | YES | `now()` | Created timestamp |
| `updated_at` | timestamptz | YES | `now()` | Updated timestamp |
| `dba_canonical` | text | YES | - | DBA canonical name |
| `dba_normalized` | text | YES | - | DBA normalized name |

**Primary Key:** `id`

**Unique Constraints:**
- `businesses_canonical_name_unique` on `(deal_name_canonical)`

**Indexes:**
- `businesses_pkey` - UNIQUE btree on `(id)`
- `businesses_canonical_name_unique` - UNIQUE btree on `(deal_name_canonical)`
- `businesses_normalized_name_idx` - btree on `(deal_name_normalized)`
- `businesses_normalized_name_trgm_idx` - GIN trigram on `(deal_name_normalized)` for fuzzy search

---

### reps

**Description:** Sales representatives lookup table

**RLS Enabled:** Yes

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | `gen_random_uuid()` | Primary key |
| `name` | text | NO | - | Rep name |
| `created_at` | timestamptz | NO | `timezone('utc', now())` | Created timestamp |
| `updated_at` | timestamptz | NO | `timezone('utc', now())` | Updated timestamp |
| `rep_commission_percent` | numeric | YES | `NULL` | Commission percentage as decimal (e.g., 0.50 = 50%). NULL for ISOs |
| `iso` | boolean | NO | - | true = ISO partner, false = in-house rep |
| `email` | text | YES | - | Rep email address |

**Primary Key:** `id`

**Indexes:**
- `reps_pkey` - UNIQUE btree on `(id)`

---

### lenders

**Description:** Lender lookup table

**RLS Enabled:** Yes

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | `gen_random_uuid()` | Primary key |
| `name` | text | NO | - | Lender name |
| `created_at` | timestamptz | NO | `timezone('utc', now())` | Created timestamp |
| `updated_at` | timestamptz | NO | `timezone('utc', now())` | Updated timestamp |
| `inhouse_funded` | boolean | YES | - | True if in-house funded, false if brokered |

**Primary Key:** `id`

**Indexes:**
- `lenders_pkey` - UNIQUE btree on `(id)`

---

### commission_payout_reps

**Description:** Tracks commission payment status per rep per deal. Dashboard reads deals from funded_deals, writes payment updates here.

**RLS Enabled:** Yes

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | `gen_random_uuid()` | Primary key |
| `funded_deal_id` | uuid | NO | - | FK to funded_deals |
| `rep_id` | uuid | NO | - | FK to reps |
| `commission_amount` | numeric | YES | - | Commission amount |
| `split_percentage` | numeric | YES | - | Split percentage |
| `is_primary_rep` | boolean | YES | `true` | Is primary rep |
| `paid` | boolean | YES | `false` | Payment status |
| `paid_date` | date | YES | - | Payment date |
| `requested` | boolean | YES | `false` | Request status |
| `payment_status` | varchar | YES | `'Pending'` | Payment status text |
| `notes` | text | YES | - | Notes |
| `created_at` | timestamptz | YES | `now()` | Created timestamp |
| `updated_at` | timestamptz | YES | `now()` | Updated timestamp |
| `business_main_id` | uuid | NO | - | FK to business_main |

**Primary Key:** `id`

**Indexes:**
- `commission_payout_pkey` - UNIQUE btree on `(id)`
- `idx_commission_payout_deal_rep` - UNIQUE btree on `(funded_deal_id, rep_id)`
- `idx_commission_payout_funded_deal` - btree on `(funded_deal_id)`
- `idx_commission_payout_paid` - btree on `(paid)`
- `idx_commission_payout_payment_status` - btree on `(payment_status)`
- `idx_commission_payout_rep` - btree on `(rep_id)`

---

### commission_payout_iso

**Description:** Commission payout table for ISO deals

**RLS Enabled:** Yes

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | `gen_random_uuid()` | Primary key |
| `funded_deal_id` | uuid | NO | - | FK to funded_deals |
| `rep_id` | uuid | NO | - | FK to reps |
| `commission_amount` | numeric | YES | - | Commission amount |
| `paid` | boolean | YES | `false` | Payment status |
| `paid_date` | date | YES | - | Payment date |
| `payment_status` | varchar | YES | `'Pending'` | Payment status text |
| `notes` | text | YES | - | Notes |
| `created_at` | timestamptz | YES | `now()` | Created timestamp |
| `updated_at` | timestamptz | YES | `now()` | Updated timestamp |
| `business_main_id` | uuid | NO | - | FK to business_main |

**Primary Key:** `id`

**Indexes:**
- `commission_payout_iso_pkey` - UNIQUE btree on `(id)`
- `commission_payout_iso_funded_deal_id_rep_id_idx` - UNIQUE btree on `(funded_deal_id, rep_id)`
- `commission_payout_iso_funded_deal_id_idx` - btree on `(funded_deal_id)`
- `commission_payout_iso_paid_idx` - btree on `(paid)`
- `commission_payout_iso_payment_status_idx` - btree on `(payment_status)`
- `commission_payout_iso_rep_id_idx` - btree on `(rep_id)`

---

### clawbacks

**Description:** Tracks clawback records for commissions when deals are reversed or cancelled

**RLS Enabled:** Yes

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | `gen_random_uuid()` | Primary key |
| `funded_deal_id` | uuid | NO | - | FK to funded_deals |
| `clawback_type` | text | NO | - | Type: 'rep', 'iso', or 'brokered' |
| `clawback_date` | timestamptz | NO | `now()` | When clawback occurred |
| `notes` | text | YES | - | Optional notes |
| `created_at` | timestamptz | YES | `now()` | Created timestamp |
| `updated_at` | timestamptz | YES | `now()` | Updated timestamp |

**Primary Key:** `id`

**Foreign Keys:**
- `clawbacks_funded_deal_id_fkey` references `funded_deals.id`

---

### internal_funded_form

**Description:** Gravity Form raw entries

**RLS Enabled:** Yes

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | `gen_random_uuid()` | Primary key |
| `deal_type` | text | YES | - | Deal type |
| `deal_name` | text | YES | - | Deal name |
| `lender` | text | YES | - | Lender name |
| `deal_number` | text | YES | - | Deal number |
| `rep_name` | text | YES | - | Rep name |
| `second_rep_name` | text | YES | - | Second rep name |
| `funded_amount` | numeric | YES | - | Funded amount |
| `rate` | numeric | YES | - | Rate |
| `term` | numeric | YES | - | Term |
| `commission` | numeric | YES | - | Commission |
| `psf` | numeric | YES | - | PSF |
| `funded_date` | date | YES | - | Funded date |
| `lead_source` | text | YES | - | Lead source |
| `merchant_email` | text | YES | - | Merchant email |
| `merchant_phone` | text | YES | - | Merchant phone |
| `uploaded_files` | text | YES | - | Uploaded files |
| `entry_id` | text | YES | - | Entry ID |
| `created_at` | timestamptz | NO | `timezone('utc', now())` | Created timestamp |
| `updated_at` | timestamptz | NO | `timezone('utc', now())` | Updated timestamp |

**Primary Key:** `id`

**Indexes:**
- `internal_funded_form_duplicate_pkey` - UNIQUE btree on `(id)`
- `internal_funded_form_duplicate_fund_date_idx` - btree on `(funded_date DESC NULLS LAST)`
- `internal_funded_form_duplicate_lead_source_idx` - btree on `(lead_source)` WHERE lead_source IS NOT NULL
- `internal_funded_form_duplicate_lower_idx` - btree on `(lower(deal_name))` WHERE deal_name IS NOT NULL
- `internal_funded_form_duplicate_rep_name_lender_fund_date_idx` - btree on `(rep_name, lender, funded_date DESC)`

---

### schlomo_parkview_deals

**Description:** Schlomo deals data with linkage to funded_deals

**RLS Enabled:** Yes

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | `gen_random_uuid()` | Primary key |
| `sdeal_id` | varchar | YES | - | Schlomo deal ID |
| `date` | date | YES | - | Deal date |
| `deal_name` | text | YES | - | Deal name |
| `funded_amount` | numeric | YES | - | Funded amount |
| `created_at` | timestamptz | YES | `now()` | Created timestamp |
| `updated_at` | timestamptz | YES | `now()` | Updated timestamp |
| `funded_deal_id` | uuid | YES | - | FK to funded_deals |

**Primary Key:** `id`

**Indexes:**
- `parkview_deals_pkey` - UNIQUE btree on `(id)`
- `idx_schlomo_funded_deal_id` - btree on `(funded_deal_id)`
- `idx_schlomo_parkview_deals_deal_name` - btree on `(deal_name)`
- `idx_schlomo_parkview_deals_sdeal_id` - btree on `(sdeal_id)`

---

### application

**Description:** Application submissions (archived from multiple form sources)

**RLS Enabled:** Yes

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | `gen_random_uuid()` | Primary key |
| `source_table` | text | NO | - | Source table identifier |
| `original_id` | text | YES | - | Original record ID |
| `business_name` | text | YES | - | Business name |
| `first_name` | text | YES | - | First name |
| `last_name` | text | YES | - | Last name |
| `email` | text | YES | - | Email |
| `email_normalized` | text | YES | - | Normalized email |
| `phone` | text | YES | - | Phone |
| `phone_normalized` | text | YES | - | Normalized phone |
| `cell_phone` | text | YES | - | Cell phone |
| `app_parameter` | text | YES | - | App parameter |
| `entry_id` | text | YES | - | Entry ID |
| `entry_date` | text | YES | - | Entry date |
| `owner2_first_name` | text | YES | - | Owner 2 first name |
| `owner2_last_name` | text | YES | - | Owner 2 last name |
| `owner2_email` | text | YES | - | Owner 2 email |
| `owner2_cell_number` | text | YES | - | Owner 2 cell |
| `app_id` | text | YES | - | App ID |
| `original_referrer` | text | YES | - | Original referrer |
| `tax_id` | text | YES | - | Tax ID |
| `business_start_date` | text | YES | - | Business start date |
| `business_address_street` | text | YES | - | Street address |
| `business_address_line_2` | text | YES | - | Address line 2 |
| `business_address_city` | text | YES | - | City |
| `business_address_state` | text | YES | - | State |
| `business_address_zip` | text | YES | - | ZIP |
| `business_address_country` | text | YES | - | Country |
| `business_website` | text | YES | - | Website |
| `intern` | text | YES | - | Intern |
| `original_referrer_full` | text | YES | - | Full referrer |
| `oref` | text | YES | - | Oref |
| `owner1_suffix` | text | YES | - | Owner 1 suffix |
| `owner1_ownership_percentage` | numeric | YES | - | Owner 1 percentage |
| `owner1_home_address_street` | text | YES | - | Owner 1 street |
| `owner1_home_address_line_2` | text | YES | - | Owner 1 address line 2 |
| `owner1_home_address_city` | text | YES | - | Owner 1 city |
| `owner1_home_address_state` | text | YES | - | Owner 1 state |
| `owner1_home_address_zip` | text | YES | - | Owner 1 ZIP |
| `owner1_home_address_country` | text | YES | - | Owner 1 country |
| `owner1_ssn` | text | YES | - | Owner 1 SSN |
| `owner1_date_of_birth` | text | YES | - | Owner 1 DOB |
| `owner2_suffix` | text | YES | - | Owner 2 suffix |
| `owner2_ownership_percentage` | numeric | YES | - | Owner 2 percentage |
| `owner2_home_address_street` | text | YES | - | Owner 2 street |
| `owner2_home_address_city` | text | YES | - | Owner 2 city |
| `owner2_home_address_state` | text | YES | - | Owner 2 state |
| `owner2_home_address_zip` | text | YES | - | Owner 2 ZIP |
| `owner2_home_address_country` | text | YES | - | Owner 2 country |
| `owner2_ssn` | text | YES | - | Owner 2 SSN |
| `owner2_date_of_birth` | text | YES | - | Owner 2 DOB |
| `requested_amount` | numeric | YES | - | Requested amount |
| `estimated_gross_annual_revenue` | numeric | YES | - | Estimated revenue |
| `have_you_applied_for_erc_grant` | text | YES | - | ERC grant status |
| `number_of_w2_employees_2020` | text | YES | - | W2 employee count |
| `do_you_currently_have_open_loans` | text | YES | - | Open loans status |
| `number_of_open_loans` | integer | YES | - | Open loan count |
| `email_contact` | text | YES | - | Email contact |
| `submit_bank_statements_online` | text | YES | - | Bank statement submission |
| `bank_statement_1_url` | text | YES | - | Bank statement 1 URL |
| `bank_statement_2_url` | text | YES | - | Bank statement 2 URL |
| `bank_statement_3_url` | text | YES | - | Bank statement 3 URL |
| `month_to_date_upload_url` | text | YES | - | MTD upload URL |
| `submit_credit_card_statements_online` | text | YES | - | CC statement submission |
| `owner1_signature_text` | text | YES | - | Owner 1 signature |
| `date_owner1_signed` | text | YES | - | Owner 1 sign date |
| `owner2_signature_text` | text | YES | - | Owner 2 signature |
| `date_owner2_signed` | text | YES | - | Owner 2 sign date |
| `status` | text | YES | - | Status |
| `h2` | text | YES | - | H2 |
| `signature_authorization_consent` | text | YES | - | Auth consent |
| `signature_authorization_text` | text | YES | - | Auth text |
| `first_owner_signature_url` | text | YES | - | Owner 1 sig URL |
| `second_owner_signature_url` | text | YES | - | Owner 2 sig URL |
| `date_updated` | text | YES | - | Date updated |
| `source_url` | text | YES | - | Source URL |
| `user_ip` | text | YES | - | User IP |
| `pdf_application_pdf_url` | text | YES | - | PDF URL |
| `created_at` | timestamptz | YES | `now()` | Created timestamp |
| `updated_at` | timestamptz | YES | `now()` | Updated timestamp |
| `funded_deal_id` | uuid | YES | - | FK to funded_deals |

**Primary Key:** `id`

**Indexes:**
- `archived_submissions_pkey` - UNIQUE btree on `(id)`
- `idx_application_funded_deal_id` - btree on `(funded_deal_id)`
- `idx_archived_submissions_email_normalized` - btree on `(email_normalized)`
- `idx_archived_submissions_phone_normalized` - btree on `(phone_normalized)`
- `idx_archived_submissions_source_table` - btree on `(source_table)`

---

### parkview-data

**Description:** Leads data

**RLS Enabled:** Yes

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | `gen_random_uuid()` | Primary key |
| `first_name` | text | YES | - | First name |
| `last_name` | text | YES | - | Last name |
| `company` | text | YES | - | Company |
| `phone` | text | YES | - | Phone |
| `phone2` | text | YES | - | Phone 2 |
| `email` | text | YES | - | Email |
| `filename` | text | YES | - | Source filename |
| `finger_id` | uuid | YES | - | Fingerprint ID |

**Primary Key:** `id`

**Indexes:**
- `parkview-data_pkey` - UNIQUE btree on `(id)`
- `idx_parkview_data_filename` - btree on `(filename)` WHERE filename IS NOT NULL
- `idx_parkview_data_phone` - btree on `(phone)` WHERE phone IS NOT NULL

---

### users

**Description:** Dashboard user accounts

**RLS Enabled:** Yes

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | `gen_random_uuid()` | Primary key |
| `username` | text | NO | - | Username (unique) |
| `password_hash` | text | NO | - | Password hash |
| `created_at` | timestamptz | NO | `timezone('utc', now())` | Created timestamp |
| `updated_at` | timestamptz | NO | `timezone('utc', now())` | Updated timestamp |

**Primary Key:** `id`

**Unique Constraints:**
- `users_username_key` on `(username)`

**Indexes:**
- `users_pkey` - UNIQUE btree on `(id)`
- `users_username_key` - UNIQUE btree on `(username)`

---

## Auth Schema Tables

The `auth` schema contains Supabase's built-in authentication tables. Key tables include:

| Table | Description | RLS |
|-------|-------------|-----|
| `users` | User login data | Yes |
| `sessions` | Session data | Yes |
| `refresh_tokens` | Token refresh storage | Yes |
| `identities` | User identities | Yes |
| `mfa_factors` | MFA factor metadata | Yes |
| `mfa_challenges` | MFA challenge metadata | Yes |
| `mfa_amr_claims` | MFA AMR claims | Yes |
| `sso_providers` | SSO provider info | Yes |
| `sso_domains` | SSO domain mapping | Yes |
| `saml_providers` | SAML provider connections | Yes |
| `saml_relay_states` | SAML relay state info | Yes |
| `flow_state` | PKCE login metadata | Yes |
| `one_time_tokens` | One-time tokens | Yes |
| `oauth_clients` | OAuth clients | No |
| `oauth_authorizations` | OAuth authorizations | No |
| `oauth_consents` | OAuth consents | No |
| `audit_log_entries` | User action audit trail | Yes |
| `instances` | Multi-site user management | Yes |
| `schema_migrations` | Auth system updates | Yes |

### Key Auth Enums

- `aal_level`: `{aal1, aal2, aal3}`
- `factor_type`: `{totp, webauthn, phone}`
- `factor_status`: `{unverified, verified}`
- `code_challenge_method`: `{s256, plain}`
- `one_time_token_type`: `{confirmation_token, reauthentication_token, recovery_token, email_change_token_new, email_change_token_current, phone_change_token}`
- `oauth_authorization_status`: `{pending, approved, denied, expired}`
- `oauth_client_type`: `{public, confidential}`
- `oauth_registration_type`: `{dynamic, manual}`
- `oauth_response_type`: `{code}`

---

## Storage Schema Tables

The `storage` schema manages file storage:

| Table | Description | RLS |
|-------|-------------|-----|
| `buckets` | Storage buckets | Yes |
| `objects` | Stored objects | Yes |
| `prefixes` | Folder prefixes | Yes |
| `s3_multipart_uploads` | Multipart upload tracking | Yes |
| `s3_multipart_uploads_parts` | Upload parts | Yes |
| `buckets_analytics` | Analytics buckets | Yes |
| `buckets_vectors` | Vector buckets | Yes |
| `vector_indexes` | Vector indexes | Yes |
| `migrations` | Storage migrations | Yes |

### Storage Enum

- `buckettype`: `{STANDARD, ANALYTICS, VECTOR}`

---

## Relationships & Foreign Keys

### Entity Relationship Diagram (Text)

```
business_main (1) <------ (N) funded_deals
                 <------ (N) commission_payout_reps
                 <------ (N) commission_payout_iso

reps (1) <------ (N) funded_deals
         <------ (N) commission_payout_reps
         <------ (N) commission_payout_iso

lenders (1) <------ (N) funded_deals

internal_funded_form (1) <------ (1) funded_deals

funded_deals (1) <------ (N) commission_payout_reps
             (1) <------ (N) commission_payout_iso
             (1) <------ (N) schlomo_parkview_deals
             (1) <------ (N) application
             (1) <------ (N) clawbacks
```

### Foreign Key Details

| Table | Constraint | Column | References | On Update | On Delete |
|-------|------------|--------|------------|-----------|-----------|
| `application` | `application_funded_deal_id_fkey` | `funded_deal_id` | `funded_deals.id` | NO ACTION | SET NULL |
| `clawbacks` | `clawbacks_funded_deal_id_fkey` | `funded_deal_id` | `funded_deals.id` | NO ACTION | CASCADE |
| `commission_payout_iso` | `commission_payout_iso_business_main_id_fkey` | `business_main_id` | `business_main.id` | CASCADE | RESTRICT |
| `commission_payout_iso` | `commission_payout_iso_funded_deal_id_fkey` | `funded_deal_id` | `funded_deals.id` | NO ACTION | CASCADE |
| `commission_payout_iso` | `commission_payout_iso_rep_id_fkey` | `rep_id` | `reps.id` | NO ACTION | RESTRICT |
| `commission_payout_reps` | `commission_payout_funded_deal_id_fkey` | `funded_deal_id` | `funded_deals.id` | NO ACTION | CASCADE |
| `commission_payout_reps` | `commission_payout_rep_id_fkey` | `rep_id` | `reps.id` | NO ACTION | RESTRICT |
| `commission_payout_reps` | `commission_payout_reps_business_main_id_fkey` | `business_main_id` | `business_main.id` | CASCADE | RESTRICT |
| `funded_deals` | `funded_deals_business_main_id_fkey` | `business_main_id` | `business_main.id` | CASCADE | RESTRICT |
| `funded_deals` | `funded_deals_internal_form_id_fkey` | `internal_form_id` | `internal_funded_form.id` | NO ACTION | NO ACTION |
| `funded_deals` | `funded_deals_lender_id_fkey` | `lender_id` | `lenders.id` | NO ACTION | NO ACTION |
| `funded_deals` | `funded_deals_rep_id_fkey` | `rep_id` | `reps.id` | NO ACTION | NO ACTION |
| `schlomo_parkview_deals` | `schlomo_parkview_deals_funded_deal_id_fkey` | `funded_deal_id` | `funded_deals.id` | NO ACTION | SET NULL |

---

## Indexes

### Public Schema Indexes

| Table | Index Name | Type | Columns | Notes |
|-------|------------|------|---------|-------|
| `application` | `archived_submissions_pkey` | UNIQUE btree | `id` | Primary key |
| `application` | `idx_application_funded_deal_id` | btree | `funded_deal_id` | FK lookup |
| `application` | `idx_archived_submissions_email_normalized` | btree | `email_normalized` | Email search |
| `application` | `idx_archived_submissions_phone_normalized` | btree | `phone_normalized` | Phone search |
| `application` | `idx_archived_submissions_source_table` | btree | `source_table` | Source filtering |
| `business_main` | `businesses_pkey` | UNIQUE btree | `id` | Primary key |
| `business_main` | `businesses_canonical_name_unique` | UNIQUE btree | `deal_name_canonical` | Unique constraint |
| `business_main` | `businesses_normalized_name_idx` | btree | `deal_name_normalized` | Name search |
| `business_main` | `businesses_normalized_name_trgm_idx` | GIN | `deal_name_normalized gin_trgm_ops` | Fuzzy search |
| `commission_payout_iso` | `commission_payout_iso_pkey` | UNIQUE btree | `id` | Primary key |
| `commission_payout_iso` | `commission_payout_iso_funded_deal_id_rep_id_idx` | UNIQUE btree | `funded_deal_id, rep_id` | Composite unique |
| `commission_payout_iso` | `commission_payout_iso_funded_deal_id_idx` | btree | `funded_deal_id` | FK lookup |
| `commission_payout_iso` | `commission_payout_iso_paid_idx` | btree | `paid` | Status filter |
| `commission_payout_iso` | `commission_payout_iso_payment_status_idx` | btree | `payment_status` | Status filter |
| `commission_payout_iso` | `commission_payout_iso_rep_id_idx` | btree | `rep_id` | FK lookup |
| `commission_payout_reps` | `commission_payout_pkey` | UNIQUE btree | `id` | Primary key |
| `commission_payout_reps` | `idx_commission_payout_deal_rep` | UNIQUE btree | `funded_deal_id, rep_id` | Composite unique |
| `commission_payout_reps` | `idx_commission_payout_funded_deal` | btree | `funded_deal_id` | FK lookup |
| `commission_payout_reps` | `idx_commission_payout_paid` | btree | `paid` | Status filter |
| `commission_payout_reps` | `idx_commission_payout_payment_status` | btree | `payment_status` | Status filter |
| `commission_payout_reps` | `idx_commission_payout_rep` | btree | `rep_id` | FK lookup |
| `funded_deals` | `funded_deals_pkey` | UNIQUE btree | `id` | Primary key |
| `funded_deals` | `idx_funded_deals_deal_name` | btree | `deal_name` | Name search |
| `funded_deals` | `idx_funded_deals_funded_date` | btree | `funded_date` | Date filtering |
| `funded_deals` | `idx_funded_deals_internal_form_id` | btree | `internal_form_id` | FK lookup |
| `funded_deals` | `idx_funded_deals_lender` | btree | `lender` | Lender filter |
| `funded_deals` | `idx_funded_deals_lender_id` | btree | `lender_id` | FK lookup |
| `funded_deals` | `idx_funded_deals_rep` | btree | `rep` | Rep filter |
| `funded_deals` | `idx_funded_deals_rep_id` | btree | `rep_id` | FK lookup |
| `funded_deals` | `idx_funded_deals_sdeal_id` | btree | `sdeal_id` | Schlomo ID lookup |
| `internal_funded_form` | `internal_funded_form_duplicate_pkey` | UNIQUE btree | `id` | Primary key |
| `internal_funded_form` | `internal_funded_form_duplicate_fund_date_idx` | btree | `funded_date DESC NULLS LAST` | Date sort |
| `internal_funded_form` | `internal_funded_form_duplicate_lead_source_idx` | btree | `lead_source` | Partial: WHERE NOT NULL |
| `internal_funded_form` | `internal_funded_form_duplicate_lower_idx` | btree | `lower(deal_name)` | Partial: WHERE NOT NULL |
| `internal_funded_form` | `internal_funded_form_duplicate_rep_name_lender_fund_date_idx` | btree | `rep_name, lender, funded_date DESC` | Composite |
| `lenders` | `lenders_pkey` | UNIQUE btree | `id` | Primary key |
| `parkview-data` | `parkview-data_pkey` | UNIQUE btree | `id` | Primary key |
| `parkview-data` | `idx_parkview_data_filename` | btree | `filename` | Partial: WHERE NOT NULL |
| `parkview-data` | `idx_parkview_data_phone` | btree | `phone` | Partial: WHERE NOT NULL |
| `reps` | `reps_pkey` | UNIQUE btree | `id` | Primary key |
| `schlomo_parkview_deals` | `parkview_deals_pkey` | UNIQUE btree | `id` | Primary key |
| `schlomo_parkview_deals` | `idx_schlomo_funded_deal_id` | btree | `funded_deal_id` | FK lookup |
| `schlomo_parkview_deals` | `idx_schlomo_parkview_deals_deal_name` | btree | `deal_name` | Name search |
| `schlomo_parkview_deals` | `idx_schlomo_parkview_deals_sdeal_id` | btree | `sdeal_id` | ID lookup |
| `users` | `users_pkey` | UNIQUE btree | `id` | Primary key |
| `users` | `users_username_key` | UNIQUE btree | `username` | Unique constraint |

---

## Row Level Security (RLS) Policies

### Public Schema Policies

| Table | Policy Name | Permissive | Roles | Command | Condition |
|-------|-------------|------------|-------|---------|-----------|
| `commission_payout_reps` | Allow anonymous read access to commission_payout | PERMISSIVE | `{anon}` | SELECT | `true` |
| `funded_deals` | Allow anonymous read access to funded_deals | PERMISSIVE | `{anon}` | SELECT | `true` |
| `lenders` | Allow anonymous read access to lenders | PERMISSIVE | `{anon}` | SELECT | `true` |
| `reps` | Allow anonymous read access to reps | PERMISSIVE | `{anon}` | SELECT | `true` |

**Note:** The following tables have RLS enabled but no explicit policies defined (access controlled by service role):
- `application`
- `business_main`
- `clawbacks`
- `commission_payout_iso`
- `internal_funded_form`
- `parkview-data`
- `schlomo_parkview_deals`
- `users`

---

## Functions & RPCs

### Custom Functions

#### `assign_sdeal_id_for_brokered()`

**Returns:** trigger
**Language:** plpgsql
**Security:** INVOKER
**Volatility:** VOLATILE

**Description:** Automatically assigns sdeal_id for brokered deals (where lender.inhouse_funded = FALSE). Generates sequential IDs starting with '9' prefix (starting at 9991468).

```sql
CREATE OR REPLACE FUNCTION public.assign_sdeal_id_for_brokered()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_inhouse_funded BOOLEAN;
    v_max_sdeal_id TEXT;
    v_next_sdeal_id BIGINT;
BEGIN
    IF NEW.lender_id IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT inhouse_funded INTO v_inhouse_funded
    FROM lenders
    WHERE id = NEW.lender_id;

    IF v_inhouse_funded IS NULL OR v_inhouse_funded = TRUE THEN
        RETURN NEW;
    END IF;

    SELECT MAX(sdeal_id) INTO v_max_sdeal_id
    FROM funded_deals
    WHERE sdeal_id ~ '^9[0-9]+$';

    IF v_max_sdeal_id IS NULL THEN
        v_next_sdeal_id := 9991468;
    ELSE
        v_next_sdeal_id := v_max_sdeal_id::BIGINT + 1;
    END IF;

    UPDATE funded_deals
    SET sdeal_id = v_next_sdeal_id::TEXT
    WHERE id = NEW.id;

    RETURN NEW;
END;
$function$
```

---

#### `verify_user_password(p_username text, p_password text)`

**Returns:** TABLE(user_id uuid, username text)
**Language:** plpgsql
**Security:** DEFINER
**Volatility:** VOLATILE

**Description:** Verifies user password for dashboard authentication.

```sql
CREATE OR REPLACE FUNCTION public.verify_user_password(p_username text, p_password text)
 RETURNS TABLE(user_id uuid, username text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT id, users.username
  FROM users
  WHERE users.username = p_username
    AND password_hash = crypt(p_password, password_hash);
END;
$function$
```

---

#### `get_funded_stats()`

**Returns:** json
**Language:** plpgsql
**Security:** INVOKER
**Volatility:** VOLATILE

**Description:** Returns aggregate statistics for funded deals (references deprecated master_funded_sheet table).

---

### pg_trgm Functions (Extension)

The following functions are from the `pg_trgm` extension for trigram-based fuzzy text search:

- `similarity(text, text)` - Returns similarity between two strings (0-1)
- `show_trgm(text)` - Shows trigrams for a string
- `word_similarity(text, text)` - Word-based similarity
- `strict_word_similarity(text, text)` - Strict word similarity
- `set_limit(real)` - Sets similarity threshold
- `show_limit()` - Shows current threshold

---

## Triggers

### Public Schema Triggers

| Trigger | Table | Event | Timing | Action |
|---------|-------|-------|--------|--------|
| `trigger_assign_sdeal_id` | `funded_deals` | INSERT | AFTER | `EXECUTE FUNCTION assign_sdeal_id_for_brokered()` |

### Storage Schema Triggers

| Trigger | Table | Event | Timing | Action |
|---------|-------|-------|--------|--------|
| `enforce_bucket_name_length_trigger` | `buckets` | INSERT, UPDATE | BEFORE | `EXECUTE FUNCTION storage.enforce_bucket_name_length()` |
| `objects_insert_create_prefix` | `objects` | INSERT | BEFORE | `EXECUTE FUNCTION storage.objects_insert_prefix_trigger()` |
| `objects_update_create_prefix` | `objects` | UPDATE | BEFORE | `EXECUTE FUNCTION storage.objects_update_prefix_trigger()` |
| `objects_delete_delete_prefix` | `objects` | DELETE | AFTER | `EXECUTE FUNCTION storage.delete_prefix_hierarchy_trigger()` |
| `update_objects_updated_at` | `objects` | UPDATE | BEFORE | `EXECUTE FUNCTION storage.update_updated_at_column()` |
| `prefixes_create_hierarchy` | `prefixes` | INSERT | BEFORE | `EXECUTE FUNCTION storage.prefixes_insert_trigger()` |
| `prefixes_delete_hierarchy` | `prefixes` | DELETE | AFTER | `EXECUTE FUNCTION storage.delete_prefix_hierarchy_trigger()` |

### Realtime Schema Triggers

| Trigger | Table | Event | Timing | Action |
|---------|-------|-------|--------|--------|
| `tr_check_filters` | `subscription` | INSERT, UPDATE | BEFORE | `EXECUTE FUNCTION realtime.subscription_check_filters()` |

---

## Sequences

| Schema | Sequence | Data Type | Start | Min | Max | Increment |
|--------|----------|-----------|-------|-----|-----|-----------|
| `auth` | `refresh_tokens_id_seq` | bigint | 1 | 1 | 9223372036854775807 | 1 |
| `extensions` | `us_gaz_id_seq` | integer | 1 | 1 | 2147483647 | 1 |
| `extensions` | `us_lex_id_seq` | integer | 1 | 1 | 2147483647 | 1 |
| `extensions` | `us_rules_id_seq` | integer | 1 | 1 | 2147483647 | 1 |
| `realtime` | `subscription_id_seq` | bigint | 1 | 1 | 9223372036854775807 | 1 |

---

## Custom Types & Enums

### Auth Schema Enums

| Type | Values |
|------|--------|
| `aal_level` | `aal1`, `aal2`, `aal3` |
| `code_challenge_method` | `s256`, `plain` |
| `factor_status` | `unverified`, `verified` |
| `factor_type` | `totp`, `webauthn`, `phone` |
| `oauth_authorization_status` | `pending`, `approved`, `denied`, `expired` |
| `oauth_client_type` | `public`, `confidential` |
| `oauth_registration_type` | `dynamic`, `manual` |
| `oauth_response_type` | `code` |
| `one_time_token_type` | `confirmation_token`, `reauthentication_token`, `recovery_token`, `email_change_token_new`, `email_change_token_current`, `phone_change_token` |

### Realtime Schema Enums

| Type | Values |
|------|--------|
| `action` | `INSERT`, `UPDATE`, `DELETE`, `TRUNCATE`, `ERROR` |
| `equality_op` | `eq`, `neq`, `lt`, `lte`, `gt`, `gte`, `in` |

### Storage Schema Enums

| Type | Values |
|------|--------|
| `buckettype` | `STANDARD`, `ANALYTICS`, `VECTOR` |

---

## Extensions

### Installed Extensions

| Extension | Schema | Version | Description |
|-----------|--------|---------|-------------|
| `pg_graphql` | graphql | 1.5.11 | GraphQL support |
| `supabase_vault` | vault | 0.3.1 | Vault for secrets |
| `pgcrypto` | extensions | 1.3 | Cryptographic functions |
| `pg_net` | extensions | 0.19.5 | Async HTTP |
| `pg_jsonschema` | extensions | 0.3.3 | JSON schema validation |
| `pg_stat_statements` | extensions | 1.11 | Query statistics |
| `rum` | extensions | 1.3 | RUM index access method |
| `btree_gin` | extensions | 1.3 | GIN index support |
| `http` | extensions | 1.6 | HTTP client |
| `pg_trgm` | public | 1.6 | Trigram text similarity |
| `address_standardizer` | extensions | 3.3.7 | Address parsing |
| `address_standardizer_data_us` | extensions | 3.3.7 | US address data |
| `unaccent` | extensions | 1.1 | Accent removal |
| `moddatetime` | extensions | 1.0 | Modification time tracking |
| `hypopg` | extensions | 1.4.1 | Hypothetical indexes |
| `citext` | extensions | 1.6 | Case-insensitive text |
| `autoinc` | extensions | 1.0 | Autoincrementing |
| `vector` | extensions | 0.8.0 | Vector data type |
| `index_advisor` | extensions | 0.2.0 | Query index advisor |
| `uuid-ossp` | extensions | 1.1 | UUID generation |
| `plpgsql` | pg_catalog | 1.0 | PL/pgSQL language |

---

## Migration History

| Version | Name | Description |
|---------|------|-------------|
| 20251203174519 | drop_fingers_and_main_suppress | Cleanup |
| 20251203174645 | add_leads_table_comments | Comments |
| 20251203175009 | add_table_descriptions | Descriptions |
| 20251203175208 | mark_tables_deprecated | Deprecation |
| 20251203175950 | create_archived_submissions_table | Application table |
| 20251203180534 | drop_merged_submission_tables | Cleanup |
| 20251203180834 | update_submission_table_descriptions | Descriptions |
| 20251203184830 | add_rep_commission_percent_column | Rep commission % |
| 20251203185102 | add_iso_boolean_column | ISO flag |
| 20251203191135 | create_funded_deals_table | Core table |
| 20251203191637 | add_split_rep_column | Split commissions |
| 20251203191851 | remove_rep_id_column | Schema change |
| 20251203200737 | create_parkview_deals_table | Schlomo deals |
| 20251203200817 | rename_parkview_deals_to_schlomo | Rename |
| 20251203201008 | add_inhouse_funded_to_lenders | Lender flag |
| 20251203201144 | update_lenders_table | Lender updates |
| 20251203201542 | clean_lender_data | Data cleanup |
| 20251203201838 | fix_funded_deals_lenders | FK fix |
| 20251203202318 | clean_internal_funded_form_reps_and_lenders | Data cleanup |
| 20251203202458 | add_ml_consulting_to_reps | Add rep |
| 20251203202731 | set_inhouse_funded_values | Data update |
| 20251203203406 | create_commission_payout_table | Commission tracking |
| 20251203204518 | add_fk_columns_to_funded_deals | FK columns |
| 20251203204705 | fix_funded_deals_reps_and_backfill | Data backfill |
| 20251203204727 | add_westwood_rep_and_backfill | Add rep |
| 20251203225417 | create_commission_payout_trigger | Trigger |
| 20251203230748 | add_dashboard_read_policies | RLS policies |
| 20251204031702 | add_email_column_to_reps | Rep email |
| 20251204040459 | rename_commission_payout_to_commission_payout_reps | Rename |
| 20251204042207 | create_sdeal_id_auto_assign_trigger | Auto ID trigger |
| 20251204042713 | fix_commission_payout_function_table_name | Fix function |
| 20251204042812 | drop_commission_payout_triggers | Remove triggers |
| 20251204043645 | add_is_loc_column_to_funded_deals | LOC flag |
| 20251204051827 | add_funded_deal_id_fk_to_schlomo | FK addition |
| 20251204053118 | add_funded_deal_id_fk_to_application | FK addition |
| 20251204150030 | create_businesses_table | Business lookup |
| 20251205005316 | rename_businesses_to_business_main | Rename |
| 20251205031357 | drop_fdupdate_temp | Cleanup |
| 20251205031614 | add_business_main_id_to_funded_deals | FK addition |
| 20251205135311 | drop_temp2match | Cleanup |
| 20251205142255 | add_funded_deals_business_main_fkey | FK constraint |
| 20251205142307 | add_commission_payout_iso_business_main_fkey | FK constraint |
| 20251205142321 | add_commission_payout_reps_business_main_fkey | FK constraint |
| 20251211XXXXXX | add_funder_paid_date_to_funded_deals | Add funder_paid_date column |
| 20251211XXXXXX | create_clawbacks_table | Clawback tracking |

---

## Edge Functions

**No edge functions are currently deployed.**

---

## Notes

### Data Pipeline

```
Gravity Form 37 --> n8n (flow.clearscrub.io) --> Supabase --> Dashboard
                                                   ^
                        notion-form-magic form ----+
```

### Important Considerations

1. **Date Format:** `funded_deals.funded_date` is stored as a proper DATE type (migrated from MM/DD/YYYY strings)

2. **Denormalized Data:** Both `rep` and `lender` columns in `funded_deals` store names directly alongside foreign keys (`rep_id`, `lender_id`) for query convenience

3. **Business Name Normalization:** The `business_main` table provides standardized business names with trigram indexing for fuzzy search

4. **Commission Tracking:** Two separate tables track commissions:
   - `commission_payout_reps` - For in-house rep commissions (~2,681 records)
   - `commission_payout_iso` - For ISO partner commissions (~1,077 records)

5. **Auto-Generated IDs:** Brokered deals (where `lender.inhouse_funded = FALSE`) automatically get `sdeal_id` values starting with '9' via trigger

6. **Clawback Tracking:** The `clawbacks` table tracks commission clawbacks when deals are reversed or cancelled, with support for rep, ISO, and brokered deal types

---

*Document generated automatically. For updates, re-run schema documentation generation.*
