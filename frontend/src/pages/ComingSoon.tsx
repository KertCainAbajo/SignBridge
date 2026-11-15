import { Construction } from 'lucide-react'
import { EmptyState } from '../components/ui/States'
import { PageHeader } from '../layouts/AppShell'

/** Honest placeholder for modules scheduled in a later phase. */
export default function ComingSoon({ title, description, phase }: { title: string; description: string; phase: string }) {
  return (
    <>
      <PageHeader title={title} description={description} />
      <EmptyState icon={<Construction className="size-7" />} title="Not available yet">
        This module is being built in {phase} of the SignBridge roadmap.
      </EmptyState>
    </>
  )
}
