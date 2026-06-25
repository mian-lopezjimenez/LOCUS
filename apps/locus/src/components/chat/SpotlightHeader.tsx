import { ChevronDown, Cpu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TooltipHint } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { ModelInfo } from "@/types/models";

type ModelSelectProps = {
  models: ModelInfo[];
  value: string;
  disabled?: boolean;
  onChange: (modelId: string) => void;
};

export function ModelSelect({
  models,
  value,
  disabled,
  onChange,
}: ModelSelectProps) {
  const current =
    models.find((model) => model.id === value) ??
    ({ id: value, label: value, supportsVision: false } satisfies ModelInfo);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled}
          className="h-7 max-w-[min(100%,12rem)] gap-1.5 px-2 text-xs text-muted-foreground"
          aria-label="Seleccionar modelo"
        >
          <Cpu className="size-3.5 shrink-0" />
          <span className="truncate">{current.label}</span>
          <ChevronDown className="size-3.5 shrink-0 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-w-72">
        <DropdownMenuRadioGroup value={value} onValueChange={onChange}>
          {models.length === 0 ? (
            <DropdownMenuRadioItem value={value}>{value}</DropdownMenuRadioItem>
          ) : (
            models.map((model) => (
              <DropdownMenuRadioItem key={model.id} value={model.id}>
                <span className="truncate">
                  {model.label}
                  {model.supportsVision ? " · visión" : ""}
                </span>
              </DropdownMenuRadioItem>
            ))
          )}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

type IconButtonProps = {
  label: string;
  tooltip?: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  children: React.ReactNode;
};

export function IconButton({
  label,
  tooltip,
  onClick,
  disabled,
  active,
  children,
}: IconButtonProps) {
  const button = (
    <Button
      type="button"
      variant={active ? "secondary" : "ghost"}
      size="icon-sm"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={cn(active && "bg-primary/20 text-primary")}
    >
      {children}
    </Button>
  );

  if (!tooltip) {
    return button;
  }

  return <TooltipHint content={tooltip}>{button}</TooltipHint>;
}
