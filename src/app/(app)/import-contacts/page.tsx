"use client";

import React, { useState, useRef, useMemo } from "react";
import { useCompany } from "@/providers/company-provider";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
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
  Upload,
  FileText,
  Check,
  X,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
} from "lucide-react";

const CONTACT_FIELDS = [
  { key: "first_name", label: "First Name", required: true },
  { key: "last_name", label: "Last Name", required: true },
  { key: "email", label: "Email", required: true },
  { key: "phone", label: "Phone", required: false },
  { key: "address_line1", label: "Street Address", required: false },
  { key: "city", label: "City", required: false },
  { key: "state", label: "State", required: false },
  { key: "zip", label: "ZIP", required: false },
  { key: "notes", label: "Notes", required: false },
];

const SKIP_VALUE = "__SKIP__";

export default function ImportContactsPage() {
  const { currentCompanyId } = useCompany();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(1);
  const [csvData, setCsvData] = useState<string[][]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [fileName, setFileName] = useState("");
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [importComplete, setImportComplete] = useState(false);
  const [importedCount, setImportedCount] = useState(0);

  // Parse CSV file
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text
        .split("\n")
        .map((line) => {
          // Simple CSV parsing (handles basic cases)
          const cells: string[] = [];
          let current = "";
          let inQuotes = false;

          for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
              inQuotes = !inQuotes;
            } else if (char === "," && !inQuotes) {
              cells.push(current.trim());
              current = "";
            } else {
              current += char;
            }
          }
          cells.push(current.trim());
          return cells;
        })
        .filter((row) => row.some((cell) => cell.length > 0));

      if (lines.length < 2) return;

      const headers = lines[0];
      const data = lines.slice(1);
      setCsvHeaders(headers);
      setCsvData(data);

      // Auto-map columns
      const autoMapping: Record<string, string> = {};
      CONTACT_FIELDS.forEach((field) => {
        const matchIndex = headers.findIndex(
          (h) =>
            h.toLowerCase().replace(/[_\s-]/g, "") ===
            field.key.toLowerCase().replace(/[_\s-]/g, "")
        );
        if (matchIndex !== -1) {
          autoMapping[field.key] = String(matchIndex);
        } else {
          // Try partial matching
          const partialMatch = headers.findIndex((h) =>
            h.toLowerCase().includes(field.label.toLowerCase().split(" ")[0].toLowerCase())
          );
          if (partialMatch !== -1 && !Object.values(autoMapping).includes(String(partialMatch))) {
            autoMapping[field.key] = String(partialMatch);
          }
        }
      });
      setColumnMapping(autoMapping);
      setStep(2);
    };
    reader.readAsText(file);
  };

  // Preview mapped data
  const mappedPreview = useMemo(() => {
    return csvData.slice(0, 5).map((row) => {
      const mapped: Record<string, string> = {};
      CONTACT_FIELDS.forEach((field) => {
        const colIndex = columnMapping[field.key];
        if (colIndex && colIndex !== SKIP_VALUE) {
          mapped[field.key] = row[parseInt(colIndex)] || "";
        }
      });
      return mapped;
    });
  }, [csvData, columnMapping]);

  // Validation
  const validationErrors = useMemo(() => {
    const errors: string[] = [];
    const requiredFields = CONTACT_FIELDS.filter((f) => f.required);
    requiredFields.forEach((field) => {
      if (!columnMapping[field.key] || columnMapping[field.key] === SKIP_VALUE) {
        errors.push(`Required field "${field.label}" is not mapped`);
      }
    });
    return errors;
  }, [columnMapping]);

  // Handle mock import
  const handleImport = () => {
    // Mock import - just show success
    setImportedCount(csvData.length);
    setImportComplete(true);
    setStep(4);
  };

  // Reset
  const handleReset = () => {
    setStep(1);
    setCsvData([]);
    setCsvHeaders([]);
    setFileName("");
    setColumnMapping({});
    setImportComplete(false);
    setImportedCount(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground">
            Import Contacts
          </h1>
          <p className="text-muted-foreground mt-2">
            Upload a CSV file to bulk import contacts into your account
          </p>
        </div>

        {/* Progress Steps */}
        <Card className="shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              {[
                { num: 1, label: "Upload" },
                { num: 2, label: "Map Columns" },
                { num: 3, label: "Review" },
                { num: 4, label: "Import" },
              ].map((s, idx) => (
                <React.Fragment key={s.num}>
                  <div className="flex flex-col items-center gap-1">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                        step >= s.num
                          ? step > s.num
                            ? "bg-green-500 text-white"
                            : "bg-gradient-to-r from-green-500 to-emerald-600 text-white"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {step > s.num ? (
                        <Check className="w-5 h-5" />
                      ) : (
                        s.num
                      )}
                    </div>
                    <span
                      className={`text-xs font-medium ${
                        step >= s.num ? "text-green-600" : "text-muted-foreground"
                      }`}
                    >
                      {s.label}
                    </span>
                  </div>
                  {idx < 3 && (
                    <div
                      className={`flex-1 h-0.5 mx-2 ${
                        step > s.num ? "bg-green-500" : "bg-muted"
                      }`}
                    />
                  )}
                </React.Fragment>
              ))}
            </div>
            <Progress
              value={(step / 4) * 100}
              className="h-1"
            />
          </CardContent>
        </Card>

        {/* Step 1: Upload */}
        {step === 1 && (
          <Card className="shadow-lg">
            <CardHeader className="bg-gradient-to-r from-card-header-from to-card-header-to border-b">
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-green-600" />
                Step 1: Upload CSV File
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8">
              <div
                className="border-2 border-dashed border-border rounded-xl p-12 text-center hover:border-green-400 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  Click to upload CSV
                </h3>
                <p className="text-muted-foreground mb-4">or drag and drop your file here</p>
                <p className="text-sm text-muted-foreground">
                  Supported format: .csv with headers in the first row
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>

              <div className="mt-6 p-4 bg-muted rounded-lg">
                <h4 className="font-semibold text-foreground mb-2 text-sm">
                  Expected columns:
                </h4>
                <div className="flex flex-wrap gap-2">
                  {CONTACT_FIELDS.map((field) => (
                    <Badge
                      key={field.key}
                      variant="outline"
                      className={
                        field.required
                          ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/20 dark:text-green-400 dark:border-green-800/40"
                          : ""
                      }
                    >
                      {field.label}
                      {field.required && " *"}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Map Columns */}
        {step === 2 && (
          <Card className="shadow-lg">
            <CardHeader className="bg-gradient-to-r from-card-header-from to-card-header-to border-b">
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-green-600" />
                Step 2: Map Columns
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="mb-4 flex items-center gap-2">
                <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-950/20 dark:text-green-400">
                  {fileName}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {csvData.length} rows, {csvHeaders.length} columns
                </span>
              </div>

              <div className="space-y-4">
                {CONTACT_FIELDS.map((field) => (
                  <div
                    key={field.key}
                    className="grid grid-cols-2 gap-4 items-center"
                  >
                    <Label className="flex items-center gap-2">
                      {field.label}
                      {field.required && (
                        <span className="text-red-500 text-xs">required</span>
                      )}
                    </Label>
                    <Select
                      value={columnMapping[field.key] || SKIP_VALUE}
                      onValueChange={(val) =>
                        setColumnMapping((prev) => ({
                          ...prev,
                          [field.key]: val,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select column" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={SKIP_VALUE}>-- Skip --</SelectItem>
                        {csvHeaders.map((header, idx) => (
                          <SelectItem key={idx} value={String(idx)}>
                            {header}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>

              {/* Preview */}
              {mappedPreview.length > 0 && (
                <div className="mt-6">
                  <h4 className="font-semibold text-foreground mb-3 text-sm">
                    Preview (first 5 rows):
                  </h4>
                  <div className="overflow-x-auto border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted">
                          {CONTACT_FIELDS.filter(
                            (f) =>
                              columnMapping[f.key] &&
                              columnMapping[f.key] !== SKIP_VALUE
                          ).map((field) => (
                            <TableHead key={field.key} className="text-xs">
                              {field.label}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {mappedPreview.map((row, idx) => (
                          <TableRow key={idx}>
                            {CONTACT_FIELDS.filter(
                              (f) =>
                                columnMapping[f.key] &&
                                columnMapping[f.key] !== SKIP_VALUE
                            ).map((field) => (
                              <TableCell key={field.key} className="text-sm">
                                {row[field.key] || (
                                  <span className="text-muted-foreground">--</span>
                                )}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {validationErrors.length > 0 && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="w-4 h-4 text-red-500" />
                    <span className="text-sm font-medium text-red-700">
                      Missing required fields:
                    </span>
                  </div>
                  <ul className="text-sm text-red-600 list-disc list-inside">
                    {validationErrors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex justify-between mt-6 pt-4 border-t">
                <Button variant="outline" onClick={() => setStep(1)}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button
                  onClick={() => setStep(3)}
                  disabled={validationErrors.length > 0}
                  className="bg-gradient-to-r from-green-500 to-emerald-600"
                >
                  Review
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Review */}
        {step === 3 && (
          <Card className="shadow-lg">
            <CardHeader className="bg-gradient-to-r from-card-header-from to-card-header-to border-b">
              <CardTitle className="flex items-center gap-2">
                <Check className="w-5 h-5 text-green-600" />
                Step 3: Review & Confirm
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 dark:bg-green-950/20 dark:border-green-800/40">
                <h4 className="font-semibold text-green-800 mb-2">
                  Import Summary
                </h4>
                <ul className="text-sm text-green-700 space-y-1">
                  <li>
                    File: <strong>{fileName}</strong>
                  </li>
                  <li>
                    Total rows to import: <strong>{csvData.length}</strong>
                  </li>
                  <li>
                    Mapped fields:{" "}
                    <strong>
                      {
                        Object.values(columnMapping).filter(
                          (v) => v !== SKIP_VALUE
                        ).length
                      }
                    </strong>{" "}
                    of {CONTACT_FIELDS.length}
                  </li>
                </ul>
              </div>

              <h4 className="font-semibold text-foreground mb-3">
                Column Mapping:
              </h4>
              <div className="space-y-2 mb-6">
                {CONTACT_FIELDS.map((field) => {
                  const colIdx = columnMapping[field.key];
                  const mapped =
                    colIdx && colIdx !== SKIP_VALUE
                      ? csvHeaders[parseInt(colIdx)]
                      : null;
                  return (
                    <div
                      key={field.key}
                      className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted"
                    >
                      <span className="text-sm font-medium text-foreground">
                        {field.label}
                        {field.required && (
                          <span className="text-red-500 ml-1">*</span>
                        )}
                      </span>
                      {mapped ? (
                        <Badge
                          variant="outline"
                          className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950/20 dark:text-green-400 dark:border-green-800/40"
                        >
                          <Check className="w-3 h-3 mr-1" />
                          {mapped}
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="bg-muted text-muted-foreground"
                        >
                          <X className="w-3 h-3 mr-1" />
                          Skipped
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-between pt-4 border-t">
                <Button variant="outline" onClick={() => setStep(2)}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button
                  onClick={handleImport}
                  className="bg-gradient-to-r from-green-500 to-emerald-600 shadow-lg"
                >
                  Import {csvData.length} Contacts
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Complete */}
        {step === 4 && (
          <Card className="shadow-lg">
            <CardContent className="p-12 text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                <CheckCircle2 className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-foreground mb-3">
                Import Complete!
              </h2>
              <p className="text-lg text-muted-foreground mb-2">
                Successfully imported{" "}
                <strong className="text-green-600">{importedCount}</strong>{" "}
                contacts
              </p>
              <p className="text-sm text-muted-foreground mb-8">
                Your contacts are now available in the Contacts page
              </p>
              <div className="flex justify-center gap-4">
                <Button variant="outline" onClick={handleReset}>
                  Import More
                </Button>
                <Button
                  onClick={() => (window.location.href = "/contacts")}
                  className="bg-gradient-to-r from-green-500 to-emerald-600"
                >
                  View Contacts
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
