import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ModelInfo } from "@/types/models";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger
        size="sm"
        className="h-8 min-w-0 flex-1 max-w-[220px] border-border bg-secondary text-xs"
        aria-label="Seleccionar modelo"
      >
        <SelectValue placeholder="Modelo" />
      </SelectTrigger>
      <SelectContent>
        {models.length === 0 ? (
          <SelectItem value={value}>{value}</SelectItem>
        ) : (
          models.map((model) => (
            <SelectItem key={model.id} value={model.id}>
              {model.label}
              {model.supportsVision ? " · visión" : ""}
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
}

type IconButtonProps = {
  label: string;
  title: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  children: React.ReactNode;
};

export function IconButton({
  label,
  title,
  onClick,
  disabled,
  active,
  children,
}: IconButtonProps) {
  return (
    <Button
      type="button"
      variant={active ? "secondary" : "ghost"}
      size="icon-sm"
      title={title}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={cn(active && "bg-primary/20 text-primary")}
    >
      {children}
    </Button>
  );
}
