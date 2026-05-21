"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import Link from "next/link";
import { ArrowLeft, Upload, X, FileText, Check, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface UploadedFile {
  name: string;
  size: number;
  type: string;
  progress: number;
  status: "uploading" | "done" | "error";
  error?: string;
}

const requiredDocs = [
  { id: "pan_gst", label: "PAN / GST certificate", hint: "PDF, JPG, PNG. Max 5MB", accept: ".pdf,.jpg,.jpeg,.png" },
  { id: "director_id", label: "Director ID proof (Aadhaar / SSN / Passport)", hint: "PDF, JPG, PNG. Max 5MB", accept: ".pdf,.jpg,.jpeg,.png" },
  { id: "bank_statement", label: "Bank statement (last 3 months)", hint: "PDF only. Max 10MB", accept: ".pdf" },
  { id: "address_proof", label: "Business address proof (utility bill / lease)", hint: "PDF, JPG, PNG. Max 5MB", accept: ".pdf,.jpg,.jpeg,.png" },
];

export default function DocumentsPage() {
  const router = useRouter();
  const [files, setFiles] = useState<Record<string, UploadedFile>>({});
  const [dragOver, setDragOver] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const handleFile = async (docId: string, file: File) => {
    const maxSize = docId === "bank_statement" ? 10 * 1024 * 1024 : 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setFiles((prev) => ({
        ...prev,
        [docId]: {
          name: file.name,
          size: file.size,
          type: file.type,
          progress: 0,
          status: "error",
          error: "File too large",
        },
      }));
      return;
    }

    setFiles((prev) => ({
      ...prev,
      [docId]: {
        name: file.name,
        size: file.size,
        type: file.type,
        progress: 0,
        status: "uploading",
      },
    }));

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      const base64Data = base64.split(",")[1];

      setFiles((prev) => ({
        ...prev,
        [docId]: { ...prev[docId]!, progress: 50 },
      }));

      try {
        await api.post("/uploads", {
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          fileData: base64Data,
          category: "KYC",
        });

        setFiles((prev) => ({
          ...prev,
          [docId]: { ...prev[docId]!, progress: 100, status: "done" },
        }));
      } catch (err) {
        console.error(err);
        setFiles((prev) => ({
          ...prev,
          [docId]: { ...prev[docId]!, status: "error", error: "Upload failed" },
        }));
      }
    };
    reader.onerror = () => {
      setFiles((prev) => ({
        ...prev,
        [docId]: { ...prev[docId]!, status: "error", error: "Read failed" },
      }));
    };
    reader.readAsDataURL(file);
  };

  const removeFile = (docId: string) => {
    const newFiles = { ...files };
    delete newFiles[docId];
    setFiles(newFiles);
  };

  const allUploaded = requiredDocs.every((doc) => files[doc.id]?.status === "done");

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link href="/onboarding/business-profile" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition">
        <ArrowLeft className="w-4 h-4" /> Back to business profile
      </Link>

      <div>
        <h1 className="text-2xl font-bold">KYC Documents</h1>
        <p className="text-gray-500 mt-1">Upload the required documents for verification</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Required Documents</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {requiredDocs.map((doc) => (
            <div
              key={doc.id}
              onDragOver={(e) => { e.preventDefault(); setDragOver(doc.id); }}
              onDragLeave={() => setDragOver(null)}
              onDrop={(e) => { e.preventDefault(); setDragOver(null); const f = e.dataTransfer.files[0]; if (f) handleFile(doc.id, f); }}
              className={`border-2 border-dashed rounded-xl p-4 transition ${
                files[doc.id]?.status === "done"
                  ? "border-emerald-300 bg-emerald-50"
                  : dragOver === doc.id
                  ? "border-blue-400 bg-blue-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="text-sm font-medium">{doc.label}</h4>
                  <p className="text-xs text-gray-500 mt-0.5">{doc.hint}</p>
                </div>
                <input
                  ref={(el) => { fileInputRefs.current[doc.id] = el; }}
                  type="file"
                  accept={doc.accept}
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(doc.id, f);
                  }}
                />
                {!files[doc.id] ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRefs.current[doc.id]?.click()}
                  >
                    <Upload className="w-4 h-4 mr-1" /> Upload
                  </Button>
                ) : null}
              </div>

              {files[doc.id] && (
                <div className="mt-3 flex items-center gap-3">
                  <FileText className="w-8 h-8 text-gray-400" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{files[doc.id]!.name}</p>
                    <p className="text-xs text-gray-500">
                      {(files[doc.id]!.size / 1024).toFixed(1)} KB
                    </p>
                    {files[doc.id]!.status === "uploading" && (
                      <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                        <div
                          className="bg-blue-500 h-1.5 rounded-full transition-all"
                          style={{ width: `${files[doc.id]!.progress}%` }}
                        />
                      </div>
                    )}
                    {files[doc.id]!.status === "error" && (
                      <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
                        <AlertCircle className="w-3 h-3" /> {files[doc.id]!.error}
                      </p>
                    )}
                  </div>
                  {files[doc.id]!.status === "done" ? (
                    <Check className="w-5 h-5 text-emerald-500" />
                  ) : (
                    <button onClick={() => removeFile(doc.id)} className="text-gray-400 hover:text-red-500">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}

          <div className="flex justify-end gap-3 pt-4">
            <Link href="/onboarding/business-profile">
              <Button type="button" variant="outline">Previous</Button>
            </Link>
            <Link href={allUploaded ? "/onboarding/bank-account" : "#"}>
              <Button
                className="bg-blue-600 hover:bg-blue-500 text-white"
                disabled={!allUploaded}
              >
                Continue to Bank Account
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
