import { useQuery } from "@tanstack/react-query";
import { fetchReferentReport, fetchReferentReports } from "@/lib/api/referentReports";

export function useReferentReports(referentId: string | undefined) {
  return useQuery({
    queryKey: ["referent-reports", referentId],
    queryFn: () => fetchReferentReports(referentId!),
    enabled: !!referentId,
    staleTime: 30_000,
  });
}

export function useReferentReport(reportId: string | undefined) {
  return useQuery({
    queryKey: ["referent-report", reportId],
    queryFn: () => fetchReferentReport(reportId!),
    enabled: !!reportId,
    staleTime: 60_000,
  });
}
