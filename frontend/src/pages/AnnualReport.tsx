import { AnnualReportDossier } from '../components/ui/AnnualReportDossier'

/** Full-page statutory annual return — PoSH Act 2013 workplace submission format. */
export function AnnualReportPage() {
  return (
    <div className="flex flex-col gap-4">
      <AnnualReportDossier variant="full" />
    </div>
  )
}
