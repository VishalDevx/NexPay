"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import {
  Shield, Lock, FileSearch, Globe, FileText, Bug,
  Check, AlertTriangle, Download, ExternalLink,
} from "lucide-react";

const complianceReports = [
  { jurisdiction: "India (TDS)", report: "TDS Deduction Summary Q1 2026", status: "ready", period: "Jan-Mar 2026" },
  { jurisdiction: "EU (VAT)", report: "VAT Summary Q1 2026", status: "generating", period: "Jan-Mar 2026" },
  { jurisdiction: "US (IRS)", report: "1099-K 2025", status: "ready", period: "Calendar Year 2025" },
];

export default function CompliancePage() {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Compliance & Security</h1>
        <p className="text-sm text-gray-500 mt-1">PCI-DSS, data encryption, AML screening, and regulatory reports</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-emerald-200 bg-emerald-50/50">
          <CardContent className="p-5 flex items-center gap-4">
            <Shield className="w-8 h-8 text-emerald-600" />
            <div>
              <p className="font-semibold">PCI-DSS Level 1</p>
              <p className="text-xs text-emerald-600">Compliant</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="p-5 flex items-center gap-4">
            <Lock className="w-8 h-8 text-blue-600" />
            <div>
              <p className="font-semibold">AES-256 Encryption</p>
              <p className="text-xs text-blue-600">At rest + TLS 1.3</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="p-5 flex items-center gap-4">
            <Globe className="w-8 h-8 text-amber-600" />
            <div>
              <p className="font-semibold">GDPR Compliant</p>
              <p className="text-xs text-amber-600">DPA available</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-purple-200 bg-purple-50/50">
          <CardContent className="p-5 flex items-center gap-4">
            <FileSearch className="w-8 h-8 text-purple-600" />
            <div>
              <p className="font-semibold">AML/KYT Screening</p>
              <p className="text-xs text-purple-600">OFAC + UN sanctions</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Compliance Reports</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Jurisdiction</TableHead>
                  <TableHead>Report</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {complianceReports.map((r) => (
                  <TableRow key={r.report}>
                    <TableCell className="font-medium">{r.jurisdiction}</TableCell>
                    <TableCell className="text-sm">{r.report}</TableCell>
                    <TableCell>
                      <Badge variant={r.status === "ready" ? "success" : "warning"}>
                        {r.status === "ready" ? "Ready" : "Generating"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {r.status === "ready" && (
                        <Button variant="ghost" size="sm"><Download className="w-4 h-4" /></Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Security & Compliance</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-gray-50 rounded-xl p-4 border">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-medium">PCI-DSS Compliance Mode</p>
                  <p className="text-sm text-gray-500 mt-1">Card data never touches your server. Hosted fields via iframe. Tokenization of all card numbers.</p>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 border">
              <div className="flex items-start gap-3">
                <Lock className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-medium">Data Encryption</p>
                  <p className="text-sm text-gray-500 mt-1">AES-256 at rest, TLS 1.3 in transit. Envelope encryption per-merchant. HSM-backed key storage available.</p>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 border">
              <div className="flex items-start gap-3">
                <Globe className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-medium">GDPR / Data Privacy</p>
                  <p className="text-sm text-gray-500 mt-1">Right-to-erasure workflow. Data export for customers. Retention policy configurable.</p>
                  <div className="flex gap-2 mt-2">
                    <Button variant="outline" size="sm">Download DPA</Button>
                    <Button variant="outline" size="sm">Request Data Export</Button>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 border">
              <div className="flex items-start gap-3">
                <Bug className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-medium">Penetration Testing</p>
                  <p className="text-sm text-gray-500 mt-1">Quarterly pen test reports published. Bug bounty program with rewards.</p>
                  <div className="flex gap-2 mt-2">
                    <Button variant="outline" size="sm">View Latest Report</Button>
                    <Button variant="outline" size="sm">Submit Bug</Button>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
