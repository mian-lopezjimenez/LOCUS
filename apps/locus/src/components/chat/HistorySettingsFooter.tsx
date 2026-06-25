import { Settings } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ROUTES } from "@/lib/routes";

type HistorySettingsFooterProps = {
  collapsed: boolean;
};

export function HistorySettingsFooter({ collapsed }: HistorySettingsFooterProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const isActive = location.pathname === ROUTES.settings;

  return (
    <div
      className={cn(
        "flex shrink-0 border-t border-sidebar-border p-2",
        collapsed ? "justify-center" : "w-full",
      )}
    >
      <Button
        type="button"
        variant={isActive ? "secondary" : "ghost"}
        size={collapsed ? "icon-sm" : "sm"}
        className={cn(
          "text-muted-foreground",
          !collapsed && "h-8 w-full justify-start gap-2 px-2 text-xs",
          isActive && "text-foreground",
        )}
        aria-label="Ajustes"
        aria-current={isActive ? "page" : undefined}
        onClick={() => navigate(ROUTES.settings)}
      >
        <Settings className="size-4 shrink-0" />
        {!collapsed && <span>Ajustes</span>}
      </Button>
    </div>
  );
}
