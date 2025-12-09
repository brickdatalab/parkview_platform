export interface Database {
  public: {
    Tables: {
      funded_deals: {
        Row: {
          id: string
          internal_form_id: string | null
          rep_id: string | null
          lender_id: string | null
          sdeal_id: string | null
          deal_name: string
          rep: string | null
          lender: string | null
          funded_date: string | null
          funded_amount: number | null
          factor_rate: number | null
          term: string | null
          commission: number | null
          psf: number | null
          total_rev: number | null
          commission_pct: number | null
          rep_commission: number | null
          deal_type: string | null
          lead_source: string | null
          email: string | null
          phone: string | null
          merchant_name: string | null
          sub_id: string | null
          split_rep: string | null
          parkview_rep_paid: boolean | null
          iso_paid: boolean | null
          funder_paid_parkview: boolean | null
          created_at: string | null
          updated_at: string | null
        }
      }
      commission_payout: {
        Row: {
          id: string
          funded_deal_id: string
          rep_id: string
          commission_amount: number | null
          split_percentage: number | null
          is_primary_rep: boolean | null
          paid: boolean | null
          paid_date: string | null
          requested: boolean | null
          payment_status: string | null
          notes: string | null
          created_at: string | null
          updated_at: string | null
        }
      }
      reps: {
        Row: {
          id: string
          name: string
          rep_commission_percent: number | null
          iso: boolean
          created_at: string
          updated_at: string
        }
      }
      lenders: {
        Row: {
          id: string
          name: string
          inhouse_funded: boolean | null
          created_at: string
          updated_at: string
        }
      }
    }
  }
}

export type FundedDeal = Database['public']['Tables']['funded_deals']['Row']
export type CommissionPayout = Database['public']['Tables']['commission_payout']['Row']
export type Rep = Database['public']['Tables']['reps']['Row']
export type Lender = Database['public']['Tables']['lenders']['Row']

export type PaymentStatus = 'Pending' | 'Paid' | 'Clawback'

export interface DealWithPayment extends FundedDeal {
  payment_status: PaymentStatus
  paid_date: string | null
}

export interface RepSummary {
  rep: string
  rep_id: string | null
  total_funded: number
  total_commission: number
  deal_count: number
  avg_factor: number
  total_psf: number
  psf_count: number
  total_rev: number
}

export interface QuarterData {
  quarter: string
  year: number
  data: RepSummary[]
}

export interface CommissionPayoutRep {
  id: string
  funded_deal_id: string
  rep_id: string
  commission_amount: number | null
  split_percentage: number | null
  is_primary_rep: boolean | null
  paid: boolean | null
  paid_date: string | null
  requested: boolean | null
  payment_status: string | null
  notes: string | null
  business_main_id: string | null
  created_at: string | null
  updated_at: string | null
  // Joined fields
  deal_name?: string
  rep_name?: string
  funded_date?: string
  funded_amount?: number
  lender?: string
  lender_inhouse?: boolean
  funder_paid_parkview?: boolean
}

export interface CommissionPayoutISO {
  id: string
  funded_deal_id: string
  rep_id: string
  commission_amount: number | null
  paid: boolean | null
  paid_date: string | null
  payment_status: string | null
  notes: string | null
  business_main_id: string | null
  created_at: string | null
  updated_at: string | null
  // Joined fields
  deal_name?: string
  iso_name?: string
  funded_date?: string
  funded_amount?: number
  lender?: string
}
