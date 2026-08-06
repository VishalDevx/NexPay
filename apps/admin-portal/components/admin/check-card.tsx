import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, XCircle, type LucideIcon } from "lucide-react";

export function CheckCard({
  label,
  ok,
  detail,
  icon: Icon,
}: {
  label: string;
  ok: boolean;
  detail: string;
  icon: LucideIcon;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon size={15} className="text-muted-foreground" strokeWidth={1.75} />
            <span className="text-[13px] font-medium">{label}</span>
          </div>
          {ok ? (
            <CheckCircle size={15} className="text-emerald-600" />
          ) : (
            <XCircle size={15} className="text-amber-600" />
          )}
        </div>
        <p className="truncate text-[11px] text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  );
}
