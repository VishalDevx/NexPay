"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, RefreshCw, Ban, Eye } from "lucide-react";

export default function InvestigationPage() {
  return (
    <Card className="">
      <CardHeader>
        <div className="flex items-center gap-4">
          <CardTitle>Transaction Investigation</CardTitle>
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search by payment ID..." className=" bg-muted/50 pl-9 text-white" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6 rounded-xl bg-muted/50 p-6">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {[
              { label: "Audit Trail", value: "12 state changes" },
              { label: "Ledger Entries", value: "8 entries" },
              { label: "Fraud Events", value: "3 rules triggered" },
              { label: "Actions", value: "Refund available" },
            ].map((s) => (
              <div key={s.label} className="rounded-lg bg-slate-800 p-3">
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-sm font-medium text-white">{s.value}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-3">
            <Button className="bg-amber-600 text-white hover:bg-amber-500"><RefreshCw className="mr-1 h-4 w-4" /> Manual Refund</Button>
            <Button className="bg-red-600 text-white hover:bg-red-500"><Ban className="mr-1 h-4 w-4" /> Freeze Merchant</Button>
            <Button variant="outline" className="border-slate-600 text-foreground"><Eye className="mr-1 h-4 w-4" /> View Raw Ledger</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
