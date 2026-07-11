import LeadsTable from "@/components/LeadsTable";

export default function RootPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold">All Leads</h1>
        <p className="text-muted-foreground text-sm">
          Every lead successfully imported across all jobs.
        </p>
      </div>
      <LeadsTable />
    </div>
  );
}
