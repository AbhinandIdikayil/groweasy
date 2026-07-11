"use client";

import { useState } from "react";
import Papa from "papaparse";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function LeadImport() {
  const [data, setData] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [step, setStep] = useState<"upload" | "preview" | "result">("upload");
  const [result, setResult] = useState<any>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setHeaders(Object.keys(results.data[0] || {}));
        setData(results.data);
        setStep("preview");
      },
    });
  };

  const confirmImport = async () => {
    // Mocking API call
    console.log("Sending data to backend...", data);
    setResult({
      success: 95,
      skipped: 5,
      total: 100,
    });
    setStep("result");
  };

  return (
    <div className="space-y-6">
      {step === "upload" && (
        <Card>
          <CardHeader>
            <CardTitle>Import Leads</CardTitle>
          </CardHeader>
          <CardContent>
            <Input type="file" accept=".csv" onChange={handleFileUpload} />
          </CardContent>
        </Card>
      )}

      {step === "preview" && (
        <Card>
          <CardHeader className="flex flex-row justify-between items-center">
            <CardTitle>Preview Data</CardTitle>
            <Button onClick={confirmImport}>Confirm Import</Button>
          </CardHeader>
          <CardContent className="h-[500px] overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  {headers.map((h) => <TableHead key={h}>{h}</TableHead>)}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((row, i) => (
                  <TableRow key={i}>
                    {headers.map((h) => <TableCell key={h}>{row[h]}</TableCell>)}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {step === "result" && result && (
        <Card>
          <CardHeader>
            <CardTitle>Import Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-muted rounded">Successfully parsed: {result.success}</div>
              <div className="p-4 bg-muted rounded">Skipped records: {result.skipped}</div>
              <div className="p-4 bg-muted rounded font-bold">Total: {result.total}</div>
            </div>
            <Button className="mt-4" onClick={() => setStep("upload")}>Import New File</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
