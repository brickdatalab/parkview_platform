import type { FundedDeal, DealWithPayment } from './database'

// Column definitions for Funded Deals
export type ColumnId =
  | 'deal_name'
  | 'rep'
  | 'lender'
  | 'funded_date'
  | 'funded_amount'
  | 'factor_rate'
  | 'term'
  | 'commission'
  | 'psf'
  | 'total_rev'
  | 'rep_commission'
  | 'deal_type'
  | 'lead_source'
  | 'sdeal_id'

// Column definitions for Commissions (extends base with payment_status)
export type CommissionColumnId =
  | 'deal_name'
  | 'rep'
  | 'lender'
  | 'funded_date'
  | 'funded_amount'
  | 'rep_commission'
  | 'deal_type'
  | 'payment_status'
  | 'sdeal_id'

export interface ColumnDef {
  id: ColumnId
  label: string
  accessor: keyof FundedDeal
  align?: 'left' | 'right'
  format?: 'currency' | 'factor' | 'date' | 'text'
  sortable?: boolean
  filterable?: boolean
  width?: string
}

export interface CommissionColumnDef {
  id: CommissionColumnId
  label: string
  accessor: keyof DealWithPayment
  align?: 'left' | 'right' | 'center'
  format?: 'currency' | 'factor' | 'date' | 'text' | 'status'
  sortable?: boolean
  filterable?: boolean
  width?: string
}

// All available columns
export const ALL_COLUMNS: ColumnDef[] = [
  { id: 'deal_name', label: 'Deal Name', accessor: 'deal_name', align: 'left', format: 'text', sortable: true, filterable: true },
  { id: 'rep', label: 'Rep', accessor: 'rep', align: 'left', format: 'text', sortable: true, filterable: true },
  { id: 'lender', label: 'Lender', accessor: 'lender', align: 'left', format: 'text', sortable: true, filterable: true },
  { id: 'funded_date', label: 'Funded Date', accessor: 'funded_date', align: 'left', format: 'date', sortable: true, filterable: true },
  { id: 'funded_amount', label: 'Funded Amount', accessor: 'funded_amount', align: 'right', format: 'currency', sortable: true, filterable: true },
  { id: 'factor_rate', label: 'Factor Rate', accessor: 'factor_rate', align: 'right', format: 'factor', sortable: true, filterable: false },
  { id: 'term', label: 'Term', accessor: 'term', align: 'right', format: 'text', sortable: true, filterable: true },
  { id: 'commission', label: 'Commission', accessor: 'commission', align: 'right', format: 'currency', sortable: true, filterable: false },
  { id: 'psf', label: 'PSF', accessor: 'psf', align: 'right', format: 'currency', sortable: true, filterable: false },
  { id: 'total_rev', label: 'Total Rev', accessor: 'total_rev', align: 'right', format: 'currency', sortable: true, filterable: false },
  { id: 'rep_commission', label: 'Rep Commission', accessor: 'rep_commission', align: 'right', format: 'currency', sortable: true, filterable: false },
  { id: 'deal_type', label: 'Deal Type', accessor: 'deal_type', align: 'left', format: 'text', sortable: true, filterable: true },
  { id: 'lead_source', label: 'Lead Source', accessor: 'lead_source', align: 'left', format: 'text', sortable: true, filterable: true },
  { id: 'sdeal_id', label: 'sDeal ID', accessor: 'sdeal_id', align: 'left', format: 'text', sortable: true, filterable: false },
]

// Default visible columns
export const DEFAULT_VISIBLE_COLUMNS: ColumnId[] = [
  'deal_name',
  'rep',
  'lender',
  'funded_date',
  'funded_amount',
  'factor_rate',
  'term',
  'commission',
  'psf',
  'total_rev',
  'rep_commission',
]

// Sort configuration
export type SortDirection = 'asc' | 'desc' | null

export interface SortConfig {
  columnId: ColumnId
  direction: SortDirection
  priority: number // 1 = primary, 2 = secondary, etc.
}

// Multi-select filter
export interface ColumnFilter {
  columnId: ColumnId
  selectedValues: string[]
}

// Date range filter
export interface DateRangeFilter {
  startDate: string | null
  endDate: string | null
}

// Group by options for Funded Deals
export type GroupByOption =
  | 'none'
  | 'funded_date_day'
  | 'funded_date_month'
  | 'funded_date_year'
  | 'deal_name'
  | 'lender'
  | 'rep'
  | 'funded_amount_range'
  | 'term'

export const GROUP_BY_OPTIONS: { value: GroupByOption; label: string }[] = [
  { value: 'none', label: 'No Grouping' },
  { value: 'funded_date_day', label: 'Funded Date (Day)' },
  { value: 'funded_date_month', label: 'Funded Date (Month)' },
  { value: 'funded_date_year', label: 'Funded Date (Year)' },
  { value: 'deal_name', label: 'Deal Name' },
  { value: 'lender', label: 'Lender' },
  { value: 'rep', label: 'Rep' },
  { value: 'funded_amount_range', label: 'Funded Amount Range' },
  { value: 'term', label: 'Term' },
]

// Group by options for Commissions (includes payment_status)
export type CommissionGroupByOption =
  | 'none'
  | 'funded_date_day'
  | 'funded_date_month'
  | 'funded_date_year'
  | 'lender'
  | 'rep'
  | 'payment_status'

export const COMMISSION_GROUP_BY_OPTIONS: { value: CommissionGroupByOption; label: string }[] = [
  { value: 'none', label: 'No Grouping' },
  { value: 'funded_date_day', label: 'Funded Date (Day)' },
  { value: 'funded_date_month', label: 'Funded Date (Month)' },
  { value: 'funded_date_year', label: 'Funded Date (Year)' },
  { value: 'lender', label: 'Lender' },
  { value: 'rep', label: 'Rep' },
  { value: 'payment_status', label: 'Payment Status' },
]

// Amount ranges for grouping
export type AmountRange = '$0-50K' | '$50K-100K' | '$100K-250K' | '$250K+'

export const AMOUNT_RANGES: { label: AmountRange; min: number; max: number }[] = [
  { label: '$0-50K', min: 0, max: 50000 },
  { label: '$50K-100K', min: 50000, max: 100000 },
  { label: '$100K-250K', min: 100000, max: 250000 },
  { label: '$250K+', min: 250000, max: Infinity },
]

// Grouped data structure
export interface GroupedData {
  groupKey: string
  groupLabel: string
  deals: FundedDeal[]
  totals: GroupTotals
  isExpanded: boolean
}

export interface GroupTotals {
  count: number
  totalFunded: number
  totalCommission: number
  totalPsf: number
  totalRev: number
  totalRepCommission: number
  avgFactorRate: number
}

// Quick filter options
export interface QuickFilters {
  isoOnly: boolean
  inhouseOnly: boolean
  newBusinessOnly: boolean
  pendingPayment: boolean
  thisMonth: boolean
  locOnly: boolean
}

export const DEFAULT_QUICK_FILTERS: QuickFilters = {
  isoOnly: false,
  inhouseOnly: false,
  newBusinessOnly: false,
  pendingPayment: false,
  thisMonth: false,
  locOnly: false,
}

// Complete table state
export interface TableState {
  visibleColumns: ColumnId[]
  sortConfigs: SortConfig[]
  filters: ColumnFilter[]
  dateRange: DateRangeFilter
  groupBy: GroupByOption
  searchQuery: string
  pageSize: number
  currentPage: number
  quickFilters: QuickFilters
}

// Saved view
export interface SavedView {
  id: string
  name: string
  state: TableState
  createdAt: string
  updatedAt: string
}

// Default table state
export const DEFAULT_TABLE_STATE: TableState = {
  visibleColumns: DEFAULT_VISIBLE_COLUMNS,
  sortConfigs: [{ columnId: 'funded_date', direction: 'desc', priority: 1 }],
  filters: [],
  dateRange: { startDate: null, endDate: null },
  groupBy: 'none',
  searchQuery: '',
  pageSize: 50,
  currentPage: 1,
  quickFilters: DEFAULT_QUICK_FILTERS,
}

// Page size options
export const PAGE_SIZE_OPTIONS = [25, 50, 100, -1] // -1 = All

// ============ COMMISSION TABLE TYPES ============

// All available commission columns
export const COMMISSION_COLUMNS: CommissionColumnDef[] = [
  { id: 'deal_name', label: 'Deal Name', accessor: 'deal_name', align: 'left', format: 'text', sortable: true, filterable: true },
  { id: 'rep', label: 'Rep', accessor: 'rep', align: 'left', format: 'text', sortable: true, filterable: true },
  { id: 'lender', label: 'Lender', accessor: 'lender', align: 'left', format: 'text', sortable: true, filterable: true },
  { id: 'funded_date', label: 'Funded Date', accessor: 'funded_date', align: 'left', format: 'date', sortable: true, filterable: true },
  { id: 'funded_amount', label: 'Funded Amount', accessor: 'funded_amount', align: 'right', format: 'currency', sortable: true, filterable: false },
  { id: 'rep_commission', label: 'Rep Commission', accessor: 'rep_commission', align: 'right', format: 'currency', sortable: true, filterable: false },
  { id: 'deal_type', label: 'Deal Type', accessor: 'deal_type', align: 'left', format: 'text', sortable: true, filterable: true },
  { id: 'payment_status', label: 'Payment Status', accessor: 'payment_status', align: 'center', format: 'status', sortable: true, filterable: true },
  { id: 'sdeal_id', label: 'Deal ID', accessor: 'sdeal_id', align: 'left', format: 'text', sortable: true, filterable: false },
]

// Default visible commission columns
export const DEFAULT_COMMISSION_VISIBLE_COLUMNS: CommissionColumnId[] = [
  'deal_name',
  'rep',
  'lender',
  'funded_date',
  'funded_amount',
  'rep_commission',
  'deal_type',
  'payment_status',
]

// Commission sort config
export interface CommissionSortConfig {
  columnId: CommissionColumnId
  direction: SortDirection
  priority: number
}

// Commission column filter
export interface CommissionColumnFilter {
  columnId: CommissionColumnId
  selectedValues: string[]
}

// Commission table state
export interface CommissionTableState {
  visibleColumns: CommissionColumnId[]
  sortConfigs: CommissionSortConfig[]
  filters: CommissionColumnFilter[]
  dateRange: DateRangeFilter
  groupBy: CommissionGroupByOption
  searchQuery: string
  pageSize: number
  currentPage: number
  selectedRep: string | null
  selectedMonth: number | null // 1-12
  selectedYear: number | null
}

// Commission grouped data
export interface CommissionGroupedData {
  groupKey: string
  groupLabel: string
  deals: DealWithPayment[]
  totals: CommissionGroupTotals
  isExpanded: boolean
}

export interface CommissionGroupTotals {
  count: number
  totalFunded: number
  totalRepCommission: number
  pendingCount: number
  paidCount: number
  clawbackCount: number
}

// Default commission table state
export const DEFAULT_COMMISSION_TABLE_STATE: CommissionTableState = {
  visibleColumns: DEFAULT_COMMISSION_VISIBLE_COLUMNS,
  sortConfigs: [{ columnId: 'funded_date', direction: 'desc', priority: 1 }],
  filters: [],
  dateRange: { startDate: null, endDate: null },
  groupBy: 'none',
  searchQuery: '',
  pageSize: 50,
  currentPage: 1,
  selectedRep: null,
  selectedMonth: null,
  selectedYear: null,
}

// Commission saved view
export interface CommissionSavedView {
  id: string
  name: string
  state: CommissionTableState
  createdAt: string
  updatedAt: string
}

// ============ REP COMMISSION TABLE TYPES ============

export type RepCommissionColumnId =
  | 'deal_name'
  | 'rep_name'
  | 'lender'
  | 'funded_date'
  | 'funded_amount'
  | 'commission'
  | 'paid_to_rep'
  | 'funder_paid'

export interface RepCommissionColumnDef {
  id: RepCommissionColumnId
  label: string
  accessor: string
  align?: 'left' | 'right' | 'center'
  format?: 'currency' | 'date' | 'text' | 'status'
  sortable?: boolean
  filterable?: boolean
  width?: number
}

export const REP_COMMISSION_COLUMNS: RepCommissionColumnDef[] = [
  { id: 'deal_name', label: 'Deal Name', accessor: 'deal_name', align: 'left', format: 'text', sortable: true, filterable: true, width: 200 },
  { id: 'rep_name', label: 'Rep', accessor: 'rep_name', align: 'left', format: 'text', sortable: true, filterable: true, width: 140 },
  { id: 'lender', label: 'Lender', accessor: 'lender', align: 'left', format: 'text', sortable: true, filterable: true, width: 140 },
  { id: 'funded_date', label: 'Funded Date', accessor: 'funded_date', align: 'left', format: 'date', sortable: true, filterable: true, width: 110 },
  { id: 'funded_amount', label: 'Funded Amount', accessor: 'funded_amount', align: 'right', format: 'currency', sortable: true, filterable: false, width: 130 },
  { id: 'commission', label: 'Commission', accessor: 'commission_amount', align: 'right', format: 'currency', sortable: true, filterable: false, width: 120 },
  { id: 'paid_to_rep', label: 'Paid to Rep', accessor: 'paid', align: 'center', format: 'status', sortable: true, filterable: true, width: 110 },
  { id: 'funder_paid', label: 'Funder Paid Us', accessor: 'funder_paid_parkview', align: 'center', format: 'status', sortable: true, filterable: true, width: 120 },
]

export const DEFAULT_REP_COMMISSION_VISIBLE_COLUMNS: RepCommissionColumnId[] = [
  'deal_name',
  'rep_name',
  'lender',
  'funded_date',
  'funded_amount',
  'commission',
  'paid_to_rep',
  'funder_paid',
]

export type RepCommissionGroupByOption =
  | 'none'
  | 'rep_name'
  | 'lender'
  | 'paid_to_rep'
  | 'funder_paid'
  | 'funded_date_month'
  | 'funded_date_year'

export const REP_COMMISSION_GROUP_BY_OPTIONS: { value: RepCommissionGroupByOption; label: string }[] = [
  { value: 'none', label: 'No Grouping' },
  { value: 'rep_name', label: 'Rep' },
  { value: 'lender', label: 'Lender' },
  { value: 'paid_to_rep', label: 'Paid to Rep' },
  { value: 'funder_paid', label: 'Funder Paid Us' },
  { value: 'funded_date_month', label: 'Funded Date (Month)' },
  { value: 'funded_date_year', label: 'Funded Date (Year)' },
]

export interface RepCommissionSortConfig {
  columnId: RepCommissionColumnId
  direction: SortDirection
  priority: number
}

export interface RepCommissionFilter {
  columnId: RepCommissionColumnId
  selectedValues: string[]
}

export interface RepCommissionTableState {
  visibleColumns: RepCommissionColumnId[]
  sortConfigs: RepCommissionSortConfig[]
  filters: RepCommissionFilter[]
  dateRange: DateRangeFilter
  groupBy: RepCommissionGroupByOption
  searchQuery: string
  pageSize: number
  currentPage: number
}

export const DEFAULT_REP_COMMISSION_TABLE_STATE: RepCommissionTableState = {
  visibleColumns: DEFAULT_REP_COMMISSION_VISIBLE_COLUMNS,
  sortConfigs: [{ columnId: 'funded_date', direction: 'desc', priority: 1 }],
  filters: [],
  dateRange: { startDate: null, endDate: null },
  groupBy: 'none',
  searchQuery: '',
  pageSize: 50,
  currentPage: 1,
}

export interface RepCommissionSavedView {
  id: string
  name: string
  state: RepCommissionTableState
  createdAt: string
  updatedAt: string
}

// ============ ISO COMMISSION TABLE TYPES ============

export type ISOCommissionColumnId =
  | 'deal_name'
  | 'iso_name'
  | 'lender'
  | 'funded_date'
  | 'funded_amount'
  | 'commission'
  | 'paid_to_iso'

export interface ISOCommissionColumnDef {
  id: ISOCommissionColumnId
  label: string
  accessor: string
  align?: 'left' | 'right' | 'center'
  format?: 'currency' | 'date' | 'text' | 'status'
  sortable?: boolean
  filterable?: boolean
  width?: number
}

export const ISO_COMMISSION_COLUMNS: ISOCommissionColumnDef[] = [
  { id: 'deal_name', label: 'Deal Name', accessor: 'deal_name', align: 'left', format: 'text', sortable: true, filterable: true, width: 200 },
  { id: 'iso_name', label: 'ISO', accessor: 'iso_name', align: 'left', format: 'text', sortable: true, filterable: true, width: 150 },
  { id: 'lender', label: 'Lender', accessor: 'lender', align: 'left', format: 'text', sortable: true, filterable: true, width: 150 },
  { id: 'funded_date', label: 'Funded Date', accessor: 'funded_date', align: 'left', format: 'date', sortable: true, filterable: true, width: 110 },
  { id: 'funded_amount', label: 'Funded Amount', accessor: 'funded_amount', align: 'right', format: 'currency', sortable: true, filterable: false, width: 130 },
  { id: 'commission', label: 'Commission', accessor: 'commission_amount', align: 'right', format: 'currency', sortable: true, filterable: false, width: 120 },
  { id: 'paid_to_iso', label: 'Paid to ISO', accessor: 'paid', align: 'center', format: 'status', sortable: true, filterable: true, width: 120 },
]

export const DEFAULT_ISO_COMMISSION_VISIBLE_COLUMNS: ISOCommissionColumnId[] = [
  'deal_name',
  'iso_name',
  'lender',
  'funded_date',
  'funded_amount',
  'commission',
  'paid_to_iso',
]

export type ISOCommissionGroupByOption =
  | 'none'
  | 'iso_name'
  | 'lender'
  | 'paid_to_iso'
  | 'funded_date_month'
  | 'funded_date_year'

export const ISO_COMMISSION_GROUP_BY_OPTIONS: { value: ISOCommissionGroupByOption; label: string }[] = [
  { value: 'none', label: 'No Grouping' },
  { value: 'iso_name', label: 'ISO' },
  { value: 'lender', label: 'Lender' },
  { value: 'paid_to_iso', label: 'Paid to ISO' },
  { value: 'funded_date_month', label: 'Funded Date (Month)' },
  { value: 'funded_date_year', label: 'Funded Date (Year)' },
]

export interface ISOCommissionSortConfig {
  columnId: ISOCommissionColumnId
  direction: SortDirection
  priority: number
}

export interface ISOCommissionFilter {
  columnId: ISOCommissionColumnId
  selectedValues: string[]
}

export interface ISOCommissionTableState {
  visibleColumns: ISOCommissionColumnId[]
  sortConfigs: ISOCommissionSortConfig[]
  filters: ISOCommissionFilter[]
  dateRange: DateRangeFilter
  groupBy: ISOCommissionGroupByOption
  searchQuery: string
  pageSize: number
  currentPage: number
}

export const DEFAULT_ISO_COMMISSION_TABLE_STATE: ISOCommissionTableState = {
  visibleColumns: DEFAULT_ISO_COMMISSION_VISIBLE_COLUMNS,
  sortConfigs: [{ columnId: 'funded_date', direction: 'desc', priority: 1 }],
  filters: [],
  dateRange: { startDate: null, endDate: null },
  groupBy: 'none',
  searchQuery: '',
  pageSize: 50,
  currentPage: 1,
}

export interface ISOCommissionSavedView {
  id: string
  name: string
  state: ISOCommissionTableState
  createdAt: string
  updatedAt: string
}
