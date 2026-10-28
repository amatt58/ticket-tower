import { AssigneePicker } from "@/features/tickets/components/assignee-picker";
import type { AssignableUser, TicketDetail } from "@/features/tickets/types";
import { Badge } from "@/shared/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";

const dateFormatter = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" });

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="text-sm">{value}</div>
    </div>
  );
}

export function TicketDetailSidebar({
  ticket,
  assignableUsers,
}: {
  ticket: TicketDetail;
  assignableUsers: AssignableUser[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Field
          label="Assignee"
          value={
            <AssigneePicker
              ticketId={ticket.id}
              assigneeId={ticket.assignee?.id ?? null}
              users={assignableUsers}
            />
          }
        />
        <Field label="Created by" value={ticket.createdBy.name} />
        <Field label="Created" value={dateFormatter.format(ticket.createdAt)} />
        <Field label="Updated" value={dateFormatter.format(ticket.updatedAt)} />
        {ticket.dueAt && <Field label="Due" value={dateFormatter.format(ticket.dueAt)} />}
        {ticket.category && <Field label="Category" value={ticket.category} />}
        {ticket.tags.length > 0 && (
          <Field
            label="Tags"
            value={
              <div className="flex flex-wrap gap-1">
                {ticket.tags.map((tag) => (
                  <Badge key={tag} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>
            }
          />
        )}
      </CardContent>
    </Card>
  );
}
