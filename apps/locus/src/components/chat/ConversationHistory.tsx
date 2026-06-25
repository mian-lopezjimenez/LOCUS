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
import { HISTORY_SIDEBAR_WIDTH } from "@/lib/constants";
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
        className="flex h-full min-w-0 shrink-0 flex-col overflow-hidden border-r border-sidebar-border bg-sidebar text-sidebar-foreground"
        style={{ width: HISTORY_SIDEBAR_WIDTH }}
        aria-label="Historial de conversaciones"
      >
        <div className="flex items-center justify-between border-b border-sidebar-border px-3 py-2.5">
          <span className="text-sm font-medium text-muted-foreground">
            Chats
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 gap-1 text-primary"
            onClick={onCreate}
            disabled={loading}
            title="Nueva conversación"
          >
            <Plus className="size-4" />
            Nueva
          </Button>
        </div>

        <ScrollArea className="min-h-0 min-w-0 flex-1 [&_[data-slot=scroll-area-viewport]]:min-w-0">
          <ul className="space-y-1 p-2">
            {conversations.map((conversation) => (
              <li
                key={conversation.id}
                className="group flex min-w-0 items-stretch gap-1"
              >
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => onSelect(conversation.id)}
                  title={conversation.title}
                  className={cn(
                    "flex min-w-0 flex-1 flex-col items-start gap-0.5 overflow-hidden rounded-lg border border-transparent px-3 py-2.5 text-left transition-colors",
                    "hover:bg-sidebar-accent disabled:opacity-50",
                    conversation.id === activeConversationId &&
                      "border-primary/25 bg-primary/15",
                  )}
                >
                  <span className="block w-full truncate text-sm">
                    {conversation.title}
                  </span>
                  <span className="block w-full truncate text-xs text-muted-foreground">
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
