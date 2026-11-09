import Link from "next/link";
import { CalendarOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

/* Shown on the planner views when an admin has turned scheduling off. */
export function SchedulingDisabled() {
  return (
    <EmptyState
      icon={CalendarOff}
      title="Service scheduling is turned off."
      description="An admin can turn it on in Settings. Service history on each asset still works."
      action={
        <Button asChild variant="outline">
          <Link href="/settings">Open Settings</Link>
        </Button>
      }
    />
  );
}
