# Parkview Advance - Business Context Document

> Business context for the AI agent. Include in system prompt alongside schema.

---

## Company Overview

**Parkview Advance, LLC** is a small business financial services company founded in 2018, headquartered in Stamford, CT. 

**Business Model:** Parkview operates as both a **direct funder** (in-house funded deals) and a **broker** (brokered deals to external funders). This dual model is reflected in the database.

---

## Core Products

| Product | Description | Database Indicator |
|---------|-------------|-------------------|
| **Receivables Based Financing** | Working capital from future receivables | deal_type field |
| **Business Line of Credit** | Revolving credit facility | is_loc = true |
| **Equipment Financing** | Asset-backed equipment loans | deal_type field |
| **Asset-Based Loans** | Secured by inventory/equipment | deal_type field |
| **SBA Products** | Government-backed loans (brokered) | Via external lenders |

---

## Business Model in Database

### In-House vs Brokered

| Type | lenders.inhouse_funded | Description |
|------|----------------------|-------------|
| **In-House** | true | Parkview provides capital directly |
| **Brokered** | false | Parkview brokers to external funder, earns commission |

### Rep Types

| Type | reps.iso | Description |
|------|----------|-------------|
| **In-House Rep** | false | Parkview employee, earns commission on deals |
| **ISO Partner** | true | External broker org, refers deals for commission |

---

## Commission & Revenue Flow

### Deal Revenue Components
```
funded_deals.commission  → Commission earned on deal
funded_deals.psf         → Professional Service Fee
funded_deals.total_rev   → Total revenue (commission + psf)
```

### Payment Flow (Brokered Deals)
```
1. Deal funds → External funder pays Parkview
   (funder_paid_parkview = true)
   
2. Parkview pays rep/ISO
   (parkview_rep_paid = true OR iso_paid = true)
```

### Commission Tracking Tables
- **commission_payout_reps** → In-house rep payments
- **commission_payout_iso** → ISO partner payments

Both track: commission_amount, paid status, paid_date, requested flag

### Split Deals
When `funded_deals.split_rep` is populated, the deal commission is split between the primary rep and split rep.

---

## Key Data Relationships

```
funded_deals
    ├── rep_id → reps (who sourced the deal)
    ├── lender_id → lenders (who funded it)
    ├── business_main_id → business_main (standardized name)
    └── commission_payout_* (payment tracking)

reps
    ├── iso boolean (partner type)
    └── rep_commission_percent (payout rate)

lenders
    └── inhouse_funded boolean (in-house vs brokered)
```

---

## Common Metrics & KPIs

### Volume Metrics
- Total funded amount (daily/weekly/monthly/YTD)
- Deal count
- Average deal size
- Volume by rep, lender, deal_type, lead_source

### Commission Metrics
- Total commission earned
- Commission by rep/ISO
- Unpaid commission (commission_payout_*.paid = false)
- Requested payments (requested = true)

### Payment Status
- Awaiting funder payment (funder_paid_parkview = false for brokered)
- Rep payments pending (parkview_rep_paid = false)
- ISO payments pending (iso_paid = false)

### Performance
- Top reps by volume
- Lender distribution
- In-house vs brokered ratio
- Factor rate averages

---

## Data Pipeline

```
Gravity Form 37 → n8n (flow.clearscrub.io) → Supabase
                                                ↓
                           internal_funded_form (raw)
                                                ↓
                              funded_deals (processed)
                                                ↓
                         commission_payout_* (auto-created)
```

---

## Important Conventions

1. **Denormalized Fields:** `rep` and `lender` columns in funded_deals store names directly alongside foreign keys for query convenience

2. **sdeal_id:** Schlomo deal ID. Auto-assigned with '9' prefix for brokered deals via database trigger

3. **Date Field:** `funded_date` is the authoritative funding date (DATE type)

4. **Fuzzy Search:** `business_main` table has trigram indexes for fuzzy business name matching

5. **Payment Status Values:** payment_status column typically contains 'Pending', 'Paid', 'Requested'

---

## Glossary Quick Reference

| Term | Meaning |
|------|---------|
| **Funded Deal** | Completed transaction, capital disbursed |
| **ISO** | Independent Sales Organization (external partner) |
| **In-House Rep** | Parkview employee |
| **Brokered** | Deal funded by external lender |
| **Factor Rate** | Cost multiplier (e.g., 1.30) |
| **PSF** | Professional Service Fee |
| **Commission** | Parkview's earnings on deal |
| **Rep Commission** | Rep's share of commission |
| **RTR** | Remaining To Receive (not in current schema) |
| **LOC** | Line of Credit (is_loc = true) |

---

*Based on Parkview Platform Supabase schema - December 2024*
