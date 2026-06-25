import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import type { Conversation } from "@/types/conversation";
import { formatConversationDate } from "@/utils/date";

type ConversationHistoryProps = {
  conversations: Conversation[];
  activeConversationId: string;
  loading: boolean;
  onSelect: (conversationId: string) => void;
  onCreate: () => void;
  onDelete: (conversationId: string) => void;
};

export function ConversationHistory({
  conversations,
  activeConversationId,
  loading,
  onSelect,
  onCreate,
  onDelete,
}: ConversationHistoryProps) {
  const [pendingDelete, setPendingDelete] = useState<Conversation | null>(null);

  return (
    <>
      <aside
        className="absolute inset-0 z-10 flex flex-col bg-background"
        aria-label="Historial"
      >
        <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
          <span className="text-sm font-medium text-muted-foreground">
            Conversaciones
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 gap-1 text-primary"
            onClick={onCreate}
            disabled={loading}
          >
            <Plus className="size-4" />
            Nueva
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <ul className="space-y-1 p-2">
            {conversations.map((conversation) => (
              <li
                key={conversation.id}
                className="group flex items-stretch gap-1"
              >
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => onSelect(conversation.id)}
                  className={cn(
                    "flex min-w-0 flex-1 flex-col items-start gap-0.5 rounded-lg border border-transparent px-3 py-2.5 text-left transition-colors",
                    "hover:bg-accent disabled:opacity-50",
                    conversation.id === activeConversationId &&
                      "border-primary/25 bg-primary/15",
                  )}
                >
                  <span className="w-full truncate text-sm">
                    {conversation.title}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatConversationDate(conversation.updatedAt)}
                  </span>
                </button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                  title="Eliminar conversación"
                  aria-label={`Eliminar ${conversation.title}`}
                  disabled={loading}
                  onClick={() => setPendingDelete(conversation)}
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </li>
            ))}
          </ul>
        </ScrollArea>
      </aside>

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar conversación?</AlertDialogTitle>
            <AlertDialogDescription>
              Se borrará &quot;{pendingDelete?.title}&quot;. Esta acción no se
              puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (pendingDelete) {
                  onDelete(pendingDelete.id);
                  setPendingDelete(null);
                }
              }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function ConversationBar({ title }: { title: string }) {
  return (
    <div
      className="shrink-0 truncate border-b border-border/60 bg-card/60 px-3 py-1.5 text-xs text-muted-foreground"
      title={title}
    >
      {title}
    </div>
  );
}
