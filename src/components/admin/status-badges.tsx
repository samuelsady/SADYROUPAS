import type { AppointmentStatus, InventoryStatus, NotificationStatus, PrintJobStatus } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import {
  appointmentStatusLabel, appointmentStatusTone, inventoryStatusLabel, inventoryStatusTone, notificationStatusLabel, notificationStatusTone, printStatusLabel, printStatusTone,
} from "@/lib/labels";

export const AppointmentStatusBadge = ({ status }: { status: AppointmentStatus }) => <Badge tone={appointmentStatusTone[status]} dot>{appointmentStatusLabel[status]}</Badge>;
export const InventoryStatusBadge = ({ status }: { status: InventoryStatus }) => <Badge tone={inventoryStatusTone[status]} dot>{inventoryStatusLabel[status]}</Badge>;
export const PrintStatusBadge = ({ status }: { status: PrintJobStatus }) => <Badge tone={printStatusTone[status]}>{printStatusLabel[status]}</Badge>;
export const NotificationStatusBadge = ({ status }: { status: NotificationStatus }) => <Badge tone={notificationStatusTone[status]}>{notificationStatusLabel[status]}</Badge>;
