export type ExportFormat = 'csv' | 'pdf'
export type ExportRangePreset = 'selected' | 'today' | 'last7' | 'last30' | 'custom' | 'all'
export type CsvExportMode = 'analytics' | 'full'

export interface ReportsExportRequest {
  format: ExportFormat
  rangePreset: ExportRangePreset
  dateFrom: string
  dateTo: string
  csvMode: CsvExportMode
  includeYearly: boolean
  includeMonthly: boolean
  includeDetail: boolean
}
