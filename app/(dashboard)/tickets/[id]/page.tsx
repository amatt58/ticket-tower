import { notFound } from "next/navigation";
import { AiSummaryCard } from "@/features/ai/components/ai-summary-card";
import { toTicketSummaryView } from "@/features/ai/server/mappers";
import { MessageComposer } from "@/features/tickets/components/message-composer";
import { MessageThread } from "@/features/tickets/components/message-thread";
import { TicketDescription } from "@/features/tickets/components/ticket-description";
import { TicketDetailHeader } from "@/features/tickets/components/ticket-detail-header";
import { TicketDetailSidebar } from "@/features/tickets/components/ticket-detail-sidebar";
import { toAssignableUser, toTicketDetail } from "@/features/tickets/server/mappers";
import { getAssignableUsers, getTicketById } from "@/features/tickets/server/queries";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";

export default async function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [ticketRecord, assignableUserRecords] = await Promise.all([
    getTicketById(id),
    getAssignableUsers(),
  ]);

  if (!ticketRecord) notFound();

  const ticket = toTicketDetail(ticketRecord);
  const assignableUsers = assignableUserRecords.map(toAssignableUser);
  const summary = toTicketSummaryView(ticketRecord);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-6">
        <TicketDetailHeader ticket={ticket} />

        <Tabs defaultValue="conversation">
          <TabsList>
            <TabsTrigger value="description">Description</TabsTrigger>
            <TabsTrigger value="conversation">Conversation</TabsTrigger>
            <TabsTrigger value="activity" disabled>
              Activity
            </TabsTrigger>
          </TabsList>
          <TabsContent value="description">
            <TicketDescription description={ticket.description} />
          </TabsContent>
          <TabsContent value="conversation" className="space-y-4">
            <MessageThread messages={ticket.messages} />
            <MessageComposer ticketId={ticket.id} />
          </TabsContent>
          <TabsContent value="activity">
            <p className="text-sm text-muted-foreground">
              The activity timeline is coming in a future release.
            </p>
          </TabsContent>
        </Tabs>
      </div>

      <div className="space-y-6">
        <AiSummaryCard ticketId={ticket.id} summary={summary} />
        <TicketDetailSidebar ticket={ticket} assignableUsers={assignableUsers} />
      </div>
    </div>
  );
}
