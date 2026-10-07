/**
 * Camada de serviços — toda regra de negócio passa por aqui.
 * Páginas, Server Actions, rotas de API e (no futuro) a IA da V3 chamam
 * estes serviços; nenhum deles acessa a impressora ou o WhatsApp diretamente.
 */
export { AppointmentService } from "./appointment.service";
export { AvailabilityService } from "./availability/availability.service";
export { CustomerService } from "./customer.service";
export { CatalogService } from "./catalog.service";
export { InventoryService } from "./inventory.service";
export { NotificationService } from "./notification/notification.service";
export { PrintService } from "./print/print.service";
export { AuditService } from "./audit.service";
export { SettingsService } from "./settings.service";
export { StorageService } from "./storage/storage.service";
export { DashboardService } from "./dashboard.service";
export { SearchService } from "./search.service";
export { AuthService } from "./auth.service";
export * as RentalRules from "./rental.service";
