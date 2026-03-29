import type { DailySummary } from '@/types/domain'

export const mockReportSummaries: DailySummary[] = [
  {
    totalEntries: 27,
    totalExits: 23,
    avgStayMinutes: 142,
    peakHour: '08:00 - 09:00',
    occupancyRate: 72,
  },
  {
    totalEntries: 31,
    totalExits: 29,
    avgStayMinutes: 138,
    peakHour: '07:00 - 08:00',
    occupancyRate: 76,
  },
  {
    totalEntries: 24,
    totalExits: 24,
    avgStayMinutes: 126,
    peakHour: '09:00 - 10:00',
    occupancyRate: 64,
  },
]
