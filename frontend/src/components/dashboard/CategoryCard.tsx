import { useNavigate } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import StatusDot from "@/components/shared/StatusDot";
import { Trash2 } from "lucide-react";
import type { CategoryStatus } from "@/types";

interface CategoryCardProps {
  id: string;
  name: string;
  status: CategoryStatus;
  restaurantId: string;
  dbId?: string;
  confirmed?: boolean;
  onDelete: () => void;
}

const STATUS_LABEL: Record<CategoryStatus, string> = {
  pending: "Not started",
  "waiting-json": "Awaiting JSON",
  validated: "Validated",
  saved: "Uploaded",
};

const STATUS_TO_PAGE: Record<CategoryStatus, "pending" | "active" | "done"> = {
  pending: "pending",
  "waiting-json": "active",
  validated: "active",
  saved: "done",
};

export default function CategoryCard({
  id,
  name,
  status,
  restaurantId,
  dbId,
  confirmed,
  onDelete,
}: CategoryCardProps) {
  const navigate = useNavigate();

  const borderAccent =
    status === "saved"
      ? confirmed
        ? "border-emerald-600"
        : "border-emerald-500"
      : status === "validated"
        ? "border-emerald-200"
        : status === "waiting-json"
          ? "border-amber-200"
          : "";

  const statusLabel =
    status === "saved" ? (confirmed ? "Confirmed" : "Uploaded") : STATUS_LABEL[status];

  return (
    <Card
      className={`cursor-pointer hover:shadow-md transition-shadow ${borderAccent}`}
      onClick={() =>
        dbId
          ? navigate(`/restaurant/${restaurantId}/edit/${id}`)
          : navigate(`/restaurant/${restaurantId}/category/${encodeURIComponent(name)}`)
      }
    >
      <CardHeader className="flex flex-row items-center gap-3 py-3">
        <StatusDot status={STATUS_TO_PAGE[status]} />
        <div className="flex-1 min-w-0">
          <CardTitle className="truncate">{name}</CardTitle>
          <CardDescription className={confirmed ? "text-emerald-600 font-medium" : undefined}>
            {statusLabel}
          </CardDescription>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="text-stone-400 hover:text-red-600 hover:bg-red-50"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </CardHeader>
    </Card>
  );
}
