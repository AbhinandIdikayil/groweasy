"use client";

import { useState } from "react";
import ImportsList from "@/components/ImportsList";
import CSVImportDashboard from "@/components/CSVImportDashboard";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Upload } from "lucide-react";

export default function ImportsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [listKey, setListKey] = useState(0);

  const handleImportComplete = () => {
    setListKey((k) => k + 1);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold">Upload History</h1>
          <p className="text-muted-foreground text-sm">
            All past CSV imports. Click a row to inspect allowed and skipped
            records.
          </p>
        </div>
        <Button
          id="open-upload-dialog-btn"
          onClick={() => setDialogOpen(true)}
          className="shrink-0 mt-1 bg-highlight text-highlight-foreground hover:bg-highlight/90"
        >
          <Upload data-icon="inline-start" />
          Upload CSV
        </Button>
      </div>

      {/* History list — key re-mounts after import to re-fetch */}
      <ImportsList key={listKey} />

      {/* Upload dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="w-[90vw] max-w-275 max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Upload CSV</DialogTitle>
            <DialogDescription>
              Import a CSV file to bulk-upload leads into the CRM. After
              submitting, the upload history will refresh automatically.
            </DialogDescription>
          </DialogHeader>
          <CSVImportDashboard onImportComplete={handleImportComplete} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
