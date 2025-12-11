# Example Q&A Pairs for Parkview AI Agent

> These examples train the AI on how users phrase questions and what SQL/responses to generate. Based on actual Parkview database schema.

---

## Deal Volume Queries

### Q: "How many deals did we fund this month?"
**SQL:**
```sql
SELECT COUNT(*) as deal_count, SUM(funded_amount) as total_funded
FROM funded_deals
WHERE funded_date >= DATE_TRUNC('month', CURRENT_DATE)
```
**Response:** "We funded 47 deals this month totaling $2.3M. Want me to break this down by rep or lender?"

---

### Q: "Show me yesterday's fundings"
**SQL:**
```sql
SELECT deal_name, funded_amount, rep, lender, deal_type
FROM funded_deals
WHERE funded_date = CURRENT_DATE - INTERVAL '1 day'
ORDER BY funded_amount DESC
```
**Response:** "3 deals funded yesterday:
- ABC Trucking LLC - $75,000 (via Credibly)
- Main Street Deli - $25,000 (via Funding Circle)
- Johnson HVAC - $40,000 (In-house)
Total: $140,000"

---

### Q: "What's our biggest deal this year?"
**SQL:**
```sql
SELECT deal_name, funded_amount, rep, lender, funded_date
FROM funded_deals
WHERE funded_date >= DATE_TRUNC('year', CURRENT_DATE)
ORDER BY funded_amount DESC
LIMIT 1
```
**Response:** "Largest deal in 2024: Metro Construction Group - $250,000, funded Oct 15 via NewCo Capital. Rep was Mike Thompson."

---

### Q: "In-house vs brokered breakdown"
**SQL:**
```sql
SELECT 
  CASE WHEN l.inhouse_funded THEN 'In-House' ELSE 'Brokered' END as type,
  COUNT(*) as deals,
  SUM(fd.funded_amount) as volume
FROM funded_deals fd
JOIN lenders l ON fd.lender_id = l.id
WHERE fd.funded_date >= DATE_TRUNC('month', CURRENT_DATE)
GROUP BY l.inhouse_funded
```
**Response:** "This month: In-House: 28 deals ($1.4M), Brokered: 19 deals ($890K). In-house is 61% of volume."

---

### Q: "Show me all LOC deals"
**SQL:**
```sql
SELECT deal_name, funded_amount, rep, lender, funded_date
FROM funded_deals
WHERE is_loc = true
ORDER BY funded_date DESC
LIMIT 20
```
**Response:** "Found 23 Line of Credit deals. Most recent: [lists top 5]. Want the full list?"

---

## Commission Queries

### Q: "What do we owe reps?"
**SQL:**
```sql
SELECT r.name as rep_name, SUM(cp.commission_amount) as owed
FROM commission_payout_reps cp
JOIN reps r ON cp.rep_id = r.id
WHERE cp.paid = false
GROUP BY r.name
ORDER BY owed DESC
```
**Response:** "Unpaid rep commissions: $42,350 total
- Sarah Johnson: $12,400
- Mike Thompson: $9,800
- David Lee: $8,150
[+ 5 more reps]"

---

### Q: "What's pending for ISOs?"
**SQL:**
```sql
SELECT r.name as iso_name, SUM(cp.commission_amount) as owed
FROM commission_payout_iso cp
JOIN reps r ON cp.rep_id = r.id
WHERE cp.paid = false
GROUP BY r.name
ORDER BY owed DESC
```
**Response:** "Unpaid ISO commissions: $28,900 total across 4 ISO partners. Largest: Premier Capital at $14,200."

---

### Q: "Show me [Rep Name]'s commission this month"
**SQL:**
```sql
SELECT fd.deal_name, fd.funded_date, fd.funded_amount, 
       cp.commission_amount, cp.paid, cp.payment_status
FROM commission_payout_reps cp
JOIN funded_deals fd ON cp.funded_deal_id = fd.id
JOIN reps r ON cp.rep_id = r.id
WHERE r.name ILIKE '%sarah%'
AND fd.funded_date >= DATE_TRUNC('month', CURRENT_DATE)
ORDER BY fd.funded_date DESC
```
**Response:** "Sarah Johnson's December commission: $4,200 across 8 deals. $2,800 paid, $1,400 pending."

---

### Q: "What's our total commission this month?"
**SQL:**
```sql
SELECT SUM(commission) as total_commission, 
       SUM(psf) as total_psf,
       SUM(total_rev) as total_revenue
FROM funded_deals
WHERE funded_date >= DATE_TRUNC('month', CURRENT_DATE)
```
**Response:** "December revenue: $187,000 total. Commission: $142,000, PSF: $45,000."

---

## Payment Status Queries

### Q: "What's waiting on funder payment?"
**SQL:**
```sql
SELECT fd.deal_name, fd.funded_amount, fd.funded_date, 
       l.name as lender, fd.commission
FROM funded_deals fd
JOIN lenders l ON fd.lender_id = l.id
WHERE fd.funder_paid_parkview = false
AND l.inhouse_funded = false
ORDER BY fd.funded_date ASC
```
**Response:** "12 brokered deals awaiting funder payment totaling $18,400 in commission. Oldest is from Nov 15."

---

### Q: "Deals where we got paid but rep hasn't been paid"
**SQL:**
```sql
SELECT fd.deal_name, fd.funded_date, fd.rep, cp.commission_amount
FROM funded_deals fd
JOIN commission_payout_reps cp ON cp.funded_deal_id = fd.id
WHERE fd.funder_paid_parkview = true 
AND cp.paid = false
ORDER BY fd.funded_date ASC
```
**Response:** "4 deals where we've received payment but rep commission is outstanding. Total owed: $3,200."

---

### Q: "Who's requested payment?"
**SQL:**
```sql
SELECT r.name, COUNT(*) as deals, SUM(cp.commission_amount) as amount
FROM commission_payout_reps cp
JOIN reps r ON cp.rep_id = r.id
WHERE cp.requested = true AND cp.paid = false
GROUP BY r.name
```
**Response:** "2 reps have requested payment:
- Mike Thompson: $4,200 (3 deals)
- David Lee: $1,800 (2 deals)"

---

## Rep & Lender Performance

### Q: "Who's our top rep this month?"
**SQL:**
```sql
SELECT r.name, COUNT(*) as deals, SUM(fd.funded_amount) as volume
FROM funded_deals fd
JOIN reps r ON fd.rep_id = r.id
WHERE fd.funded_date >= DATE_TRUNC('month', CURRENT_DATE)
AND r.iso = false
GROUP BY r.name
ORDER BY volume DESC
LIMIT 5
```
**Response:** "Top in-house reps this month:
1. Sarah Johnson - $420K (12 deals)
2. Mike Thompson - $380K (9 deals)
3. David Lee - $290K (11 deals)"

---

### Q: "Which lender do we use most?"
**SQL:**
```sql
SELECT l.name, COUNT(*) as deals, SUM(fd.funded_amount) as volume,
       CASE WHEN l.inhouse_funded THEN 'In-House' ELSE 'Brokered' END as type
FROM funded_deals fd
JOIN lenders l ON fd.lender_id = l.id
WHERE fd.funded_date >= DATE_TRUNC('year', CURRENT_DATE)
GROUP BY l.name, l.inhouse_funded
ORDER BY volume DESC
LIMIT 10
```
**Response:** "Top lenders YTD:
1. Parkview (In-House) - $4.2M
2. Credibly - $1.8M
3. Funding Circle - $1.1M"

---

### Q: "Show me ISO performance"
**SQL:**
```sql
SELECT r.name as iso, COUNT(*) as deals, 
       SUM(fd.funded_amount) as volume,
       SUM(fd.commission) as commission
FROM funded_deals fd
JOIN reps r ON fd.rep_id = r.id
WHERE r.iso = true
AND fd.funded_date >= DATE_TRUNC('month', CURRENT_DATE)
GROUP BY r.name
ORDER BY volume DESC
```
**Response:** "ISO partners this month:
- Premier Capital: 8 deals, $340K volume, $28K commission
- Funding Solutions: 5 deals, $180K volume, $15K commission"

---

## Search & Lookup

### Q: "Find deals for [business name]"
**SQL:**
```sql
SELECT fd.deal_name, fd.funded_amount, fd.funded_date, 
       fd.rep, fd.lender, fd.commission
FROM funded_deals fd
JOIN business_main bm ON fd.business_main_id = bm.id
WHERE bm.deal_name_normalized ILIKE '%metro%construction%'
OR fd.deal_name ILIKE '%metro%construction%'
ORDER BY fd.funded_date DESC
```
**Response:** "Found 3 deals for Metro Construction:
- Dec 2024: $75,000 via Credibly
- Aug 2024: $50,000 In-House
- Mar 2024: $40,000 In-House
Total funded: $165,000"

---

### Q: "What's the status of the ABC Trucking deal?"
**SQL:**
```sql
SELECT fd.*, 
       cp.paid as rep_paid, cp.payment_status
FROM funded_deals fd
LEFT JOIN commission_payout_reps cp ON cp.funded_deal_id = fd.id
WHERE fd.deal_name ILIKE '%abc trucking%'
ORDER BY fd.funded_date DESC
LIMIT 1
```
**Response:** "ABC Trucking (funded Dec 5): $75,000 via Credibly. Funder paid: Yes. Rep commission: $2,400 - Pending payment."

---

### Q: "Deals from lead source [source]"
**SQL:**
```sql
SELECT deal_name, funded_amount, funded_date, rep
FROM funded_deals
WHERE lead_source ILIKE '%direct mail%'
AND funded_date >= DATE_TRUNC('month', CURRENT_DATE)
ORDER BY funded_date DESC
```
**Response:** "4 deals from Direct Mail this month totaling $120,000."

---

## Summary & Comparison Queries

### Q: "Give me this week's numbers"
**SQL:**
```sql
SELECT 
  COUNT(*) as deals,
  SUM(funded_amount) as volume,
  SUM(commission) as commission,
  AVG(funded_amount) as avg_deal
FROM funded_deals
WHERE funded_date >= DATE_TRUNC('week', CURRENT_DATE)
```
**Response:** "This week: 12 deals, $584K volume, $47K commission. Avg deal: $48,667."

---

### Q: "Compare this month to last month"
**SQL:**
```sql
SELECT 
  DATE_TRUNC('month', funded_date) as month,
  COUNT(*) as deals,
  SUM(funded_amount) as volume,
  SUM(commission) as commission
FROM funded_deals
WHERE funded_date >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 month'
GROUP BY DATE_TRUNC('month', funded_date)
ORDER BY month
```
**Response:** "Nov: 52 deals, $2.4M volume. Dec MTD: 38 deals, $1.8M. Tracking 8% ahead of last month's pace."

---

### Q: "What's our average factor rate?"
**SQL:**
```sql
SELECT AVG(factor_rate) as avg_rate,
       MIN(factor_rate) as min_rate,
       MAX(factor_rate) as max_rate
FROM funded_deals
WHERE funded_date >= DATE_TRUNC('month', CURRENT_DATE)
AND factor_rate IS NOT NULL
```
**Response:** "December factor rates: Avg 1.32, Range 1.18 - 1.48."

---

## Natural Language Variations

| User says | Interpreted as |
|-----------|----------------|
| "deals today" | Deals with funded_date = today |
| "this week" | Current week (Mon-Sun) |
| "last month" | Previous calendar month |
| "MTD" | Month to date |
| "YTD" | Year to date |
| "Sarah's deals" | Deals where rep ILIKE '%sarah%' |
| "in-house" | lenders.inhouse_funded = true |
| "brokered" | lenders.inhouse_funded = false |
| "unpaid" | paid = false in commission tables |
| "pending" | payment_status = 'Pending' |
| "what's owed" | Unpaid commission amounts |

---

## Edge Cases

### Q: "Show me John's deals"
**Response:** "I found 2 reps with 'John' - John Smith and John Martinez. Which one?"

### Q: "What happened with that trucking deal?"
**Response:** "I see 6 trucking-related deals. Can you give me the business name or a date range?"

### Q: "Why did we lose that deal?"
**Response:** "I can show you deal data from funded_deals, but I don't have records of declined or lost deals. I only see deals that were funded."

---

*Based on Parkview Platform Supabase schema - December 2024*
