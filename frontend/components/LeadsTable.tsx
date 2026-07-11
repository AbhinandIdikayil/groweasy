"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertCircle,
  Inbox,
  RefreshCcw,
  Search,
  Users,
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

// ─── Constants ────────────────────────────────────────────────────────────────

const CRM_STATUS_OPTIONS = [
  "all",
  "GOOD_LEAD_FOLLOW_UP",
  "DID_NOT_CONNECT",
  "BAD_LEAD",
  "SALE_DONE",
] as const;

const CRM_STATUS_LABELS: Record<string, string> = {
  GOOD_LEAD_FOLLOW_UP: "Follow Up",
  DID_NOT_CONNECT: "Did Not Connect",
  BAD_LEAD: "Bad Lead",
  SALE_DONE: "Sale Done",
  all: "All statuses",
};

function crmStatusVariant(
  status: string
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "GOOD_LEAD_FOLLOW_UP":
      return "default";
    case "SALE_DONE":
      return "default";
    case "BAD_LEAD":
      return "destructive";
    default:
      return "secondary";
  }
}

function formatDate(raw: string) {
  if (!raw) return "—";
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function LeadsTable() {
  const [records, setRecords] = useState<CRMRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${ENV.NEXT_PUBLIC_API}/api/leads`);
      if (!res.ok)
        throw new Error(`Failed to fetch leads (status ${res.status})`);
      const data: CRMRecord[] = await res.json();
      setRecords(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchRecords();
  }, [fetchRecords]);

  // ── Client-side filtering ────────────────────────────────────────────────

  const filtered = records.filter((r) => {
    const q = search.trim().toLowerCase();
    const matchesSearch =
      q === "" ||
      r.name?.toLowerCase().includes(q) ||
      r.email?.toLowerCase().includes(q) ||
      r.company?.toLowerCase().includes(q) ||
      r.mobile_without_country_code?.includes(q);
    const matchesStatus =
      statusFilter === "all" || r.crm_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="size-4 text-muted-foreground" />
              Imported Leads
              {!loading && (
                <Badge variant="secondary">
                  {filtered.length} / {records.length}
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="mt-1">
              All leads imported from CSV files. Search by name, email, company,
              or phone.
            </CardDescription>
          </div>
          <Button
            id="refresh-leads-btn"
            variant="outline"
            size="sm"
            onClick={fetchRecords}
            disabled={loading}
          >
            <RefreshCcw
              data-icon="inline-start"
              className={cn(loading && "animate-spin")}
            />
            Refresh
          </Button>
        </div>

        {/* Search + filter */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
            <Input
              id="leads-search-input"
              placeholder="Search by name, email, company, phone…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "all")}>
            <SelectTrigger id="leads-status-filter" className="w-full sm:w-52">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              {CRM_STATUS_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>
                  {CRM_STATUS_LABELS[s] ?? s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent>
        {/* Error */}
        {error && (
          <div
            role="alert"
            className="mb-4 flex items-center gap-2 text-destructive text-sm"
          >
            <AlertCircle className="size-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        )}

        {/* Empty — no data at all */}
        {!loading && !error && records.length === 0 && (
          <div className="py-16 text-center text-muted-foreground">
            <Inbox className="size-10 mx-auto mb-3" />
            <p>No leads yet. Import a CSV to get started.</p>
          </div>
        )}

        {/* Empty — filtered */}
        {!loading && !error && records.length > 0 && filtered.length === 0 && (
          <div className="py-16 text-center text-muted-foreground">
            <Search className="size-8 mx-auto mb-3" />
            <p>No leads match your search or filter.</p>
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

        {/* Table */}
        {!loading && !error && filtered.length > 0 && (
          <div className="border rounded-lg overflow-hidden">
            <div className="overflow-auto max-h-140">
              <Table className="min-w-225">
                <TableHeader className="sticky top-0 z-10 bg-muted/30">
                  <TableRow>
                    <TableHead className="font-semibold w-10">#</TableHead>
                    <TableHead className="font-semibold">Name</TableHead>
                    <TableHead className="font-semibold">Email</TableHead>
                    <TableHead className="font-semibold">Phone</TableHead>
                    <TableHead className="font-semibold">Company</TableHead>
                    <TableHead className="font-semibold">City</TableHead>
                    <TableHead className="font-semibold">Country</TableHead>
                    <TableHead className="font-semibold">Lead Owner</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold">Source</TableHead>
                    <TableHead className="font-semibold">Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r, i) => (
                    <TableRow key={`${r.email}-${i}`} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="text-muted-foreground tabular-nums text-xs">
                        {i + 1}
                      </TableCell>

                      {/* Name */}
                      <TableCell className="font-medium whitespace-nowrap">
                        {r.name || <span className="text-muted-foreground">—</span>}
                      </TableCell>

                      {/* Email */}
                      <TableCell>
                        <Tooltip>
                          <TooltipTrigger>
                            <span className="text-xs text-muted-foreground max-w-40 truncate block">
                              {r.email || "—"}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            <p className="text-xs">{r.email}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>

                      {/* Phone */}
                      <TableCell className="tabular-nums text-sm whitespace-nowrap">
                        {r.country_code && r.mobile_without_country_code
                          ? `+${r.country_code} ${r.mobile_without_country_code}`
                          : r.mobile_without_country_code || <span className="text-muted-foreground">—</span>}
                      </TableCell>

                      {/* Company */}
                      <TableCell className="max-w-35 truncate" title={r.company}>
                        {r.company || <span className="text-muted-foreground">—</span>}
                      </TableCell>

                      {/* City */}
                      <TableCell className="whitespace-nowrap">
                        {r.city || <span className="text-muted-foreground">—</span>}
                      </TableCell>

                      {/* Country */}
                      <TableCell className="whitespace-nowrap">
                        {r.country || <span className="text-muted-foreground">—</span>}
                      </TableCell>

                      {/* Lead Owner */}
                      <TableCell className="whitespace-nowrap text-sm">
                        {r.lead_owner || <span className="text-muted-foreground">—</span>}
                      </TableCell>

                      {/* CRM Status */}
                      <TableCell>
                        {r.crm_status ? (
                          <Badge variant={crmStatusVariant(r.crm_status)} className="whitespace-nowrap text-xs">
                            {CRM_STATUS_LABELS[r.crm_status] ?? r.crm_status}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>

                      {/* Data Source */}
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {r.data_source
                          ? r.data_source.replace(/_/g, " ")
                          : "—"}
                      </TableCell>

                      {/* Created At */}
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(r.created_at)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Footer */}
            <div className="border-t px-4 py-2 bg-muted/20 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Showing {filtered.length.toLocaleString()} of{" "}
                {records.length.toLocaleString()} leads
              </span>
              <Button
                id="refresh-leads-footer-btn"
                variant="ghost"
                size="sm"
                onClick={fetchRecords}
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
  );
}
