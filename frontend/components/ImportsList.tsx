"use client";

import { Fragment, useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  RefreshCcw,
  ChevronDown,
  ChevronRight,
  CircleCheck,
  CircleX,
  Clock,
  AlertCircle,
  Inbox,
  Search,
  CircleDot,
} from "lucide-react";
import { ENV } from "@/utils/env";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CRMRecord {
  created_at: string;
  name: string;
  email: string;
  country_code: string;
  mobile_without_country_code: string;
  company: string;
  city: string;
  state: string;
  country: string;
  lead_owner: string;
  crm_status: string;
  crm_note: string;
  data_source: string;
  possession_time: string;
  description: string;
}

interface BatchJobResult {
  jobId: string;
  status: "processing" | "completed" | "failed";
  totalRecords: number;
  totalSkipped: number;
  totalImported: number;
  records: CRMRecord[];
  skippedRecords: { row: number; reason: string }[];
  error?: string;
}

type StatusFilter = "all" | "completed" | "processing" | "failed";

// ─── Constants ────────────────────────────────────────────────────────────────

const CRM_FIELDS: (keyof CRMRecord)[] = [
  "name",
  "email",
  "mobile_without_country_code",
  "company",
  "city",
  "state",
  "country",
  "lead_owner",
  "crm_status",
  "data_source",
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  if (status === "completed") {
    return (
      <div className="flex items-center gap-1.5 text-green-700">
        <CircleCheck className="size-3.5 shrink-0" />
        <span className="text-xs font-medium capitalize">Completed</span>
      </div>
    );
  }
  if (status === "failed") {
    return (
      <div className="flex items-center gap-1.5 text-destructive">
        <CircleX className="size-3.5 shrink-0" />
        <span className="text-xs font-medium capitalize">Failed</span>
      </div>
    );
  }
  if (status === "processing") {
    return (
      <div className="flex items-center gap-1.5 text-amber-600">
        <Clock className="size-3.5 shrink-0 animate-spin" />
        <span className="text-xs font-medium capitalize">Processing</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5 text-muted-foreground">
      <CircleDot className="size-3.5 shrink-0" />
      <span className="text-xs font-medium capitalize">{status}</span>
    </div>
  );
}

function AllowedTable({ records }: { records: CRMRecord[] }) {
  if (records.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        No allowed records for this job.
      </p>
    );
  }
  return (
    <div className="border rounded-lg overflow-hidden bg-background">
      <div className="overflow-auto max-h-75">
        <Table className="min-w-200">
          <TableHeader className="sticky top-0 z-10 bg-background">
            <TableRow>
              <TableHead className="font-semibold w-10">#</TableHead>
              {CRM_FIELDS.map((f) => (
                <TableHead key={f} className="font-semibold whitespace-nowrap">
                  {f.replace(/_/g, " ")}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.map((record, i) => (
              <TableRow key={i}>
                <TableCell className="text-muted-foreground tabular-nums">{i + 1}</TableCell>
                {CRM_FIELDS.map((f) => (
                  <TableCell key={f} className="max-w-50 truncate" title={record[f]}>
                    {record[f] || <span className="text-muted-foreground">&mdash;</span>}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function SkippedTable({ records }: { records: { row: number; reason: string }[] }) {
  if (records.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        No skipped records — all rows were allowed.
      </p>
    );
  }
  return (
    <div className="border rounded-lg overflow-hidden bg-background">
      <div className="overflow-auto max-h-50">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-background">
            <TableRow>
              <TableHead className="font-semibold w-10">#</TableHead>
              <TableHead className="font-semibold w-24">Row</TableHead>
              <TableHead className="font-semibold">Reason</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.map((r, i) => (
              <TableRow key={i}>
                <TableCell className="text-muted-foreground tabular-nums">{i + 1}</TableCell>
                <TableCell className="tabular-nums">{r.row}</TableCell>
                <TableCell className="text-muted-foreground">{r.reason}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function ExpandedJobPanel({ job }: { job: BatchJobResult }) {
  return (
    <div className="bg-muted/30 border-t px-4 py-4 flex flex-col gap-4">
      {job.error && (
        <div
          role="alert"
          className="flex items-center gap-2 text-destructive text-sm"
        >
          <AlertCircle className="size-4 shrink-0" />
          {job.error}
        </div>
      )}

      <Tabs defaultValue="allowed">
        <TabsList>
          <TabsTrigger value="allowed" id={`tab-allowed-${job.jobId}`}>
            <CircleCheck data-icon="inline-start" className="text-green-600" />
            Allowed Records
            <Badge variant="secondary" className="ml-1.5">
              {job.records.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="skipped" id={`tab-skipped-${job.jobId}`}>
            <CircleX data-icon="inline-start" className="text-destructive" />
            Skipped Records
            <Badge variant="secondary" className="ml-1.5">
              {job.skippedRecords.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="allowed" className="mt-3">
          <AllowedTable records={job.records} />
        </TabsContent>
        <TabsContent value="skipped" className="mt-3">
          <SkippedTable records={job.skippedRecords} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ImportsList() {
  const [jobs, setJobs] = useState<BatchJobResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${ENV.NEXT_PUBLIC_API}/api/leads/bulk-upload`);
      if (!res.ok) throw new Error(`Failed to fetch (status ${res.status})`);
      const data: BatchJobResult[] = await res.json();
      setJobs(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchJobs();
  }, [fetchJobs]);

  const toggleExpand = (jobId: string) => {
    setExpandedJobId((prev) => (prev === jobId ? null : jobId));
  };

  // ── Client-side filtering ────────────────────────────────────────────────

  const filteredJobs = jobs.filter((job) => {
    const matchesSearch =
      search.trim() === "" ||
      job.jobId.toLowerCase().includes(search.trim().toLowerCase());
    const matchesStatus = statusFilter === "all" || job.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                Upload History
                {!loading && (
                  <Badge variant="secondary">{filteredJobs.length} / {jobs.length}</Badge>
                )}
              </CardTitle>
              <CardDescription className="mt-1">
                All past CSV imports. Click a row to inspect allowed and skipped records.
              </CardDescription>
            </div>
            <Button
              id="refresh-imports-btn"
              variant="outline"
              size="sm"
              onClick={fetchJobs}
              disabled={loading}
            >
              <RefreshCcw
                data-icon="inline-start"
                className={cn(loading && "animate-spin")}
              />
              Refresh
            </Button>
          </div>

          {/* Search + filter bar */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
              <Input
                id="job-search-input"
                placeholder="Search by Import ID…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as StatusFilter)}
            >
              <SelectTrigger id="status-filter" className="w-full sm:w-44">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent>
          {/* Error */}
          {error && (
            <div role="alert" className="mb-4 flex items-center gap-2 text-destructive text-sm">
              <AlertCircle className="size-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Loading skeletons */}
          {loading && (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && jobs.length === 0 && (
            <div className="py-16 text-center text-muted-foreground">
              <Inbox className="size-10 mx-auto mb-3" />
              <p>No uploads yet. Import a CSV to get started.</p>
            </div>
          )}

          {/* No results after filter */}
          {!loading && !error && jobs.length > 0 && filteredJobs.length === 0 && (
            <div className="py-16 text-center text-muted-foreground">
              <Search className="size-8 mx-auto mb-3" />
              <p>No jobs match your search or filter.</p>
              <Button
                variant="ghost"
                size="sm"
                className="mt-3"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("all");
                }}
              >
                Clear filters
              </Button>
            </div>
          )}

          {/* Jobs table */}
          {!loading && !error && filteredJobs.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead className="w-8" />
                    <TableHead className="font-semibold">Import ID</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold text-right">Total</TableHead>
                    <TableHead className="font-semibold text-right text-green-700">Allowed</TableHead>
                    <TableHead className="font-semibold text-right text-destructive">Skipped</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredJobs.map((job) => (
                    <Fragment key={job.jobId}>
                      <TableRow
                        className="cursor-pointer hover:bg-muted/40 transition-colors"
                        onClick={() => toggleExpand(job.jobId)}
                        aria-expanded={expandedJobId === job.jobId}
                      >
                        {/* Expand chevron */}
                        <TableCell className="w-8 text-muted-foreground">
                          {expandedJobId === job.jobId ? (
                            <ChevronDown className="size-4" />
                          ) : (
                            <ChevronRight className="size-4" />
                          )}
                        </TableCell>

                        {/* Import ID with tooltip */}
                        <TableCell>
                          <Tooltip>
                            <TooltipTrigger>
                              <span className="font-mono text-xs text-muted-foreground max-w-35 truncate block">
                                {job.jobId}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="right">
                              <p className="font-mono text-xs">{job.jobId}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TableCell>

                        {/* Status */}
                        <TableCell>
                          <StatusBadge status={job.status} />
                        </TableCell>

                        {/* Numeric columns */}
                        <TableCell className="text-right tabular-nums text-sm">
                          {job.totalRecords.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-sm text-green-700 font-medium">
                          {job.totalImported.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-sm text-destructive font-medium">
                          {job.totalSkipped.toLocaleString()}
                        </TableCell>
                      </TableRow>

                      {/* Expanded panel */}
                      {expandedJobId === job.jobId && (
                        <TableRow key={`${job.jobId}-expanded`}>
                          <TableCell colSpan={6} className="p-0">
                            <ExpandedJobPanel job={job} />
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  ))}
                </TableBody>
              </Table>

              {/* Table footer */}
              <Separator />
              <div className="px-4 py-2 bg-muted/20 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  Showing {filteredJobs.length} of {jobs.length} jobs
                </span>
                <Button
                  id="refresh-footer-btn"
                  variant="ghost"
                  size="sm"
                  onClick={fetchJobs}
                  disabled={loading}
                  className="h-7 text-xs"
                >
                  <RefreshCcw
                    data-icon="inline-start"
                    className={cn("size-3", loading && "animate-spin")}
                  />
                  Refresh
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
