"use client";

import { useState, useCallback, useRef } from "react";
import Papa from "papaparse";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  Upload,
  CheckCircle2,
  FileSpreadsheet,
  AlertCircle,
  Loader2,
  RotateCcw,
  CircleCheck,
  CircleX,
  FileText,
  TriangleAlert,
  Info,
} from "lucide-react";
import { ENV } from "@/utils/env";

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = "upload" | "importing" | "results";

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

interface ValidationIssue {
  label: string;
  count: number;
  severity: "error" | "warning";
}

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

const PREVIEW_LIMIT = 20;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function computeValidation(data: Record<string, string>[]): ValidationIssue[] {
  if (data.length === 0) return [];

  const issues: ValidationIssue[] = [];
  const emailCounts: Record<string, number> = {};

  let missingEmail = 0;
  let missingName = 0;
  let invalidPhone = 0;

  for (const row of data) {
    const email = row["email"]?.trim() ?? "";
    const name = row["name"]?.trim() ?? "";
    const phone = row["mobile_without_country_code"]?.trim() ?? "";

    if (!email) missingEmail++;
    else emailCounts[email] = (emailCounts[email] ?? 0) + 1;

    if (!name) missingName++;

    if (phone && !/^\d{7,15}$/.test(phone)) invalidPhone++;
  }

  const duplicateEmails = Object.values(emailCounts).filter((c) => c > 1).reduce((a, b) => a + (b - 1), 0);

  if (missingEmail > 0) issues.push({ label: "Missing email", count: missingEmail, severity: "error" });
  if (missingName > 0) issues.push({ label: "Missing name", count: missingName, severity: "error" });
  if (invalidPhone > 0) issues.push({ label: "Invalid phone", count: invalidPhone, severity: "warning" });
  if (duplicateEmails > 0) issues.push({ label: "Duplicate row", count: duplicateEmails, severity: "warning" });

  return issues;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
  icon,
  iconBg,
  label,
  value,
  valueClass,
}: {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-3">
          <div className={cn("rounded-full p-2", iconBg)}>{icon}</div>
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className={cn("text-2xl font-bold tabular-nums", valueClass ?? "")}>
              {value}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ValidationBadge({ issue }: { issue: ValidationIssue }) {
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border",
        issue.severity === "error"
          ? "bg-destructive/10 text-destructive border-destructive/20"
          : "bg-amber-50 text-amber-700 border-amber-200"
      )}
    >
      {issue.severity === "error" ? (
        <CircleX className="size-3 shrink-0" />
      ) : (
        <TriangleAlert className="size-3 shrink-0" />
      )}
      {issue.label}
      <span className="font-semibold ml-0.5">({issue.count})</span>
    </div>
  );
}

function PreviewTable({
  data,
  headers,
}: {
  data: Record<string, string>[];
  headers: string[];
}) {
  const shown = data.slice(0, PREVIEW_LIMIT);

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="overflow-auto max-h-95">
        <Table className="min-w-150">
          <TableHeader className="sticky top-0 z-10 bg-background">
            <TableRow>
              <TableHead className="font-semibold w-10 text-muted-foreground">#</TableHead>
              {headers.map((h) => (
                <TableHead key={h} className="font-semibold whitespace-nowrap">
                  {h}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {shown.map((row, i) => (
              <TableRow key={i}>
                <TableCell className="text-muted-foreground tabular-nums text-xs">{i + 1}</TableCell>
                {headers.map((h) => (
                  <TableCell key={h} className="max-w-45 truncate" title={row[h]}>
                    {row[h] || <span className="text-muted-foreground">&mdash;</span>}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="border-t px-4 py-2 flex items-center justify-between bg-muted/30">
        <span className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Info className="size-3" />
          Showing {shown.length.toLocaleString()} of {data.length.toLocaleString()} rows
        </span>
        {data.length > PREVIEW_LIMIT && (
          <span className="text-xs text-muted-foreground">
            +{(data.length - PREVIEW_LIMIT).toLocaleString()} more rows will be submitted
          </span>
        )}
      </div>
    </div>
  );
}

function AllowedTable({ records }: { records: CRMRecord[] }) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="overflow-auto max-h-100">
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
  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="overflow-auto max-h-100">
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

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CSVImportDashboard({
  onImportComplete,
}: {
  onImportComplete?: (result: BatchJobResult) => void;
}) {
  const [step, setStep] = useState<Step>("upload");
  const [data, setData] = useState<Record<string, string>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<number>(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const [jobResult, setJobResult] = useState<BatchJobResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validationIssues = computeValidation(data);
  const hasErrors = validationIssues.some((v) => v.severity === "error");

  // ── File processing ──────────────────────────────────────────────────────

  const processFile = useCallback((file: File) => {
    if (!file.name.endsWith(".csv")) {
      setError("Please upload a valid CSV file.");
      return;
    }
    setError(null);
    setFileName(file.name);
    setFileSize(file.size);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          setError("Error parsing CSV: " + results.errors[0].message);
          return;
        }
        if (results.data.length === 0) {
          setError("The CSV file is empty.");
          return;
        }
        const parsed = results.data as Record<string, string>[];
        setHeaders(Object.keys(parsed[0]));
        setData(parsed);
      },
    });
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  // ── Submit ───────────────────────────────────────────────────────────────

  const handleConfirmImport = async () => {
    setStep("importing");
    setError(null);
    setUploading(true);

    try {
      const csvString = Papa.unparse(data);
      const blob = new Blob([csvString], { type: "text/csv" });
      const file = new File([blob], fileName || "upload.csv", { type: "text/csv" });

      const formData = new FormData();
      formData.append("file", file);

      const uploadRes = await fetch(`${ENV.NEXT_PUBLIC_API}/api/leads/bulk-upload`, {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) {
        const errBody = await uploadRes.json().catch(() => null);
        throw new Error(errBody?.message || `Upload failed with status ${uploadRes.status}`);
      }

      const { jobId } = await uploadRes.json();

      let result: BatchJobResult | null = null;
      const maxAttempts = 30;

      for (let i = 0; i < maxAttempts; i++) {
        await new Promise((r) => setTimeout(r, 2000));

        const resultsRes = await fetch(`${ENV.NEXT_PUBLIC_API}/api/leads/bulk-upload`);
        if (!resultsRes.ok) continue;

        const allJobs: BatchJobResult[] = await resultsRes.json();
        const matching = allJobs.find((j) => j.jobId === jobId);

        if (matching && matching.status !== "processing") {
          result = matching;
          break;
        }
      }

      if (!result) throw new Error("Timed out waiting for processing to complete.");

      setJobResult(result);
      setStep("results");
      onImportComplete?.(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
      setStep("upload");
    } finally {
      setUploading(false);
    }
  };

  // ── Reset ────────────────────────────────────────────────────────────────

  const handleReset = () => {
    setStep("upload");
    setData([]);
    setHeaders([]);
    setFileName(null);
    setFileSize(0);
    setJobResult(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6">
      {/* ── Importing state ─────────────────────────────────────────────── */}
      {step === "importing" && (
        <Card>
          <CardContent className="py-20 text-center">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="size-10 text-primary animate-spin" aria-label="Loading" />
              <div>
                <p className="text-lg font-semibold">Processing your data…</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Uploading {data.length.toLocaleString()} records to the server
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Upload / Preview state ───────────────────────────────────────── */}
      {step === "upload" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Left — Drop zone + preview table */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            {/* Drop zone */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              aria-label="Upload CSV file by clicking or dragging"
              className={cn(
                "relative border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors",
                isDragOver
                  ? "border-highlight bg-highlight-muted"
                  : "border-muted-foreground/25 hover:border-highlight/50 hover:bg-highlight-muted/40"
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
                aria-hidden="true"
              />
              <div className="flex flex-col items-center gap-3">
                <div
                  className={cn(
                    "rounded-full p-4 transition-colors",
                    isDragOver ? "bg-highlight/15" : "bg-muted"
                  )}
                >
                  <Upload
                    className={cn(
                      "size-8",
                      isDragOver ? "text-highlight" : "text-muted-foreground"
                    )}
                  />
                </div>
                <div>
                  <p className="text-base font-medium">
                    {isDragOver ? "Drop your CSV here" : "Drag & drop your CSV file here"}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">or click to browse</p>
                </div>
                <p className="text-xs text-muted-foreground">Supports standard CSV files</p>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div
                role="alert"
                className="flex items-center gap-2 text-destructive text-sm"
              >
                <AlertCircle className="size-4 shrink-0" />
                {error}
              </div>
            )}

            {/* Preview CSV */}
            {data.length > 0 && headers.length > 0 && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold">Preview CSV</h2>
                  <Badge variant="secondary">{data.length.toLocaleString()} rows</Badge>
                </div>
                <PreviewTable data={data} headers={headers} />
              </div>
            )}
          </div>

          {/* Right — Import Summary card */}
          <div className="flex flex-col gap-4">
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="size-4 shrink-0 text-muted-foreground" />
                  Import Summary
                </CardTitle>
                {!fileName && (
                  <CardDescription>
                    Upload a CSV file to see a summary and validation details here.
                  </CardDescription>
                )}
              </CardHeader>

              {fileName && (
                <CardContent className="flex flex-col gap-4">
                  {/* File details */}
                  <div className="rounded-lg bg-muted/50 p-3 flex flex-col gap-1">
                    <p className="text-sm font-medium truncate" title={fileName}>
                      {fileName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatBytes(fileSize)} · {data.length.toLocaleString()} rows · {headers.length} columns
                    </p>
                  </div>

                  <Separator />

                  {/* Validation */}
                  <div className="flex flex-col gap-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Validation
                    </p>
                    {validationIssues.length === 0 ? (
                      <div className="flex items-center gap-2 text-sm text-green-700">
                        <CheckCircle2 className="size-4 shrink-0" />
                        All rows look good
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {validationIssues.map((issue) => (
                          <ValidationBadge key={issue.label} issue={issue} />
                        ))}
                      </div>
                    )}
                    {hasErrors && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Rows with errors will be skipped during import.
                      </p>
                    )}
                  </div>

                  <Separator />

                  {/* Action bar */}
                  <div className="flex flex-col gap-2">
                    <Button
                      id="csv-submit-btn"
                      onClick={handleConfirmImport}
                      disabled={uploading || data.length === 0}
                      className="w-full"
                    >
                      <Upload data-icon="inline-start" />
                      Submit Import
                    </Button>
                    <Button
                      id="csv-reset-btn"
                      variant="outline"
                      onClick={handleReset}
                      className="w-full"
                    >
                      <RotateCcw data-icon="inline-start" />
                      Reset
                    </Button>
                  </div>
                </CardContent>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* ── Results state ────────────────────────────────────────────────── */}
      {step === "results" && jobResult && (
        <div className="flex flex-col gap-6">
          {/* Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={<FileSpreadsheet className="size-5 text-primary" />}
              iconBg="bg-primary/10"
              label="Total Rows"
              value={jobResult.totalRecords.toLocaleString()}
            />
            <StatCard
              icon={<CircleCheck className="size-5 text-green-600" />}
              iconBg="bg-green-100"
              label="Allowed"
              value={jobResult.totalImported.toLocaleString()}
              valueClass="text-green-600"
            />
            <StatCard
              icon={<CircleX className="size-5 text-destructive" />}
              iconBg="bg-destructive/10"
              label="Skipped"
              value={jobResult.totalSkipped.toLocaleString()}
              valueClass="text-destructive"
            />
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-muted p-2">
                    <CheckCircle2 className="size-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Job Status</p>
                    <Badge
                      variant={jobResult.status === "completed" ? "default" : "secondary"}
                      className="mt-1 capitalize"
                    >
                      {jobResult.status}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Results tabs */}
          {(jobResult.records.length > 0 || jobResult.skippedRecords.length > 0) ? (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-base">Import Results</CardTitle>
                  <CardDescription>
                    Import ID: <span className="font-mono text-xs">{jobResult.jobId}</span>
                  </CardDescription>
                </div>
                <Button
                  id="import-another-btn"
                  variant="outline"
                  onClick={handleReset}
                >
                  <RotateCcw data-icon="inline-start" />
                  Import Another
                </Button>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="allowed">
                  <TabsList>
                    <TabsTrigger value="allowed" id="results-tab-allowed">
                      <CircleCheck data-icon="inline-start" className="text-green-600" />
                      Allowed
                      <Badge variant="secondary" className="ml-1.5">
                        {jobResult.records.length}
                      </Badge>
                    </TabsTrigger>
                    <TabsTrigger value="skipped" id="results-tab-skipped">
                      <CircleX data-icon="inline-start" className="text-destructive" />
                      Skipped
                      <Badge variant="secondary" className="ml-1.5">
                        {jobResult.skippedRecords.length}
                      </Badge>
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="allowed" className="mt-4">
                    {jobResult.records.length === 0 ? (
                      <div className="py-10 text-center text-sm text-muted-foreground">
                        No allowed records for this job.
                      </div>
                    ) : (
                      <AllowedTable records={jobResult.records} />
                    )}
                  </TabsContent>

                  <TabsContent value="skipped" className="mt-4">
                    {jobResult.skippedRecords.length === 0 ? (
                      <div className="py-10 text-center text-sm text-muted-foreground">
                        No skipped records — all rows were allowed.
                      </div>
                    ) : (
                      <SkippedTable records={jobResult.skippedRecords} />
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <CheckCircle2 className="size-10 mx-auto mb-3 text-green-600" />
                <p>Import completed. No detailed records to display.</p>
                <Button
                  id="import-another-empty-btn"
                  variant="outline"
                  onClick={handleReset}
                  className="mt-4"
                >
                  <RotateCcw data-icon="inline-start" />
                  Import Another
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
