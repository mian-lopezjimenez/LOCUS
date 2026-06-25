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
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-sidebar-border px-3 py-2.5">
          <span className="shrink-0 text-sm font-medium text-muted-foreground">
            Chats
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 shrink-0 gap-1 text-primary"
            onClick={onCreate}
            disabled={loading}
            title="Nueva conversación"
          >
            <Plus className="size-4" />
            Nueva
          </Button>
        </div>

        <ScrollArea className="min-h-0 flex-1">
          <ul className="space-y-1 p-2">
            {conversations.map((conversation) => (
              <li
                key={conversation.id}
                className={cn("relative w-full", !loading && "group")}
              >
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => onSelect(conversation.id)}
                  title={conversation.title}
                  className={cn(
                    "relative w-full min-w-0 overflow-hidden rounded-lg border border-transparent px-3 py-2.5 text-left transition-[padding,colors] disabled:pointer-events-none disabled:opacity-50",
                    !loading && "group-hover:pr-11 hover:bg-sidebar-accent",
                    conversation.id === activeConversationId &&
                      "border-primary/25 bg-primary/15",
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      "pointer-events-none absolute inset-y-0 right-0 w-14 opacity-0 transition-opacity",
                      !loading && "group-hover:opacity-100",
                      conversation.id === activeConversationId
                        ? "bg-gradient-to-l from-primary/15 to-transparent"
                        : "bg-gradient-to-l from-sidebar-accent to-transparent",
                    )}
                  />
                  <p className="relative overflow-hidden text-ellipsis whitespace-nowrap text-sm">
                    {conversation.title}
                  </p>
                  <p className="relative mt-0.5 overflow-hidden text-ellipsis whitespace-nowrap text-xs text-muted-foreground">
                    {formatConversationDate(conversation.updatedAt)}
                  </p>
                </button>

                <div
                  className={cn(
                    "absolute top-1.5 right-1.5 z-10 rounded-md border border-border bg-popover p-0.5 shadow-sm",
                    "pointer-events-none translate-y-1 opacity-0 transition-[opacity,transform]",
                    !loading &&
                      "group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:translate-y-0 group-focus-within:opacity-100",
                  )}
                >
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    className="hover:bg-destructive/15"
                    title="Eliminar conversación"
                    aria-label={`Eliminar ${conversation.title}`}
                    disabled={loading}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      setPendingDelete(conversation);
                    }}
                  >
                    <Trash2 className="size-3.5 text-destructive" />
                  </Button>
                </div>
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
