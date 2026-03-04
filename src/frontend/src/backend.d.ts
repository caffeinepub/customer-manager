import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface Customer {
    id: string;
    name: string;
    tags: Array<string>;
    isActive: boolean;
    email: string;
    notes?: string;
    phone: string;
}
export interface Settings {
    invoiceStartingNumber: bigint;
    paymentTermsDays: bigint;
    defaultTaxRate: number;
    companyEmail: string;
    invoicePrefix: string;
    defaultLaborRate: number;
    currency: string;
    companyName: string;
    companyPhone: string;
    companyAddress: string;
}
export interface Job {
    id: string;
    startTime: Time;
    status: string;
    endTime: Time;
    cost: number;
    isActive: boolean;
    addressId: string;
    notes?: string;
    customerId: string;
    serviceId: string;
}
export type Time = bigint;
export interface Address {
    id: string;
    street: string;
    country: string;
    city: string;
    postalCode: string;
    state: string;
    isPrimary: boolean;
    addressLabel: string;
    notes?: string;
    customerId: string;
}
export interface Service {
    id: string;
    name: string;
    description: string;
    isActive: boolean;
    notes?: string;
    price: number;
    laborRate: number;
}
export interface Invoice {
    id: string;
    status: string;
    dateIssued: Time;
    dueDate: Time;
    timeEntryIds: Array<string>;
    jobIds: Array<string>;
    materialEntryIds: Array<string>;
    totalAmount: number;
    notes?: string;
    timeBlockIds: Array<string>;
    customerId: string;
}
export interface Visit {
    id: string;
    startTime?: Time;
    status: string;
    endTime?: Time;
    scheduledDate: Time;
    createdAt: Time;
    laborHours: number;
    jobId: string;
    photoIds: Array<string>;
    updatedAt: Time;
    notes?: string;
    internalNotes?: string;
    laborCost: number;
    laborRate: number;
}
export interface UserProfile {
    name: string;
    role: string;
    isActive: boolean;
    email: string;
    phone: string;
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addAddress(address: Address): Promise<void>;
    addCustomer(customer: Customer): Promise<void>;
    addInvoice(invoice: Invoice): Promise<void>;
    addJob(job: Job): Promise<void>;
    addService(service: Service): Promise<void>;
    addVisit(visit: Visit): Promise<void>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    getActiveAddressesByCustomer(customerId: string): Promise<Array<Address>>;
    getAddress(id: string): Promise<Address | null>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getCustomer(id: string): Promise<Customer | null>;
    getInvoicesByCustomer(customerId: string): Promise<Array<Invoice>>;
    getJob(id: string): Promise<Job | null>;
    getJobServices(jobId: string): Promise<Array<Service>>;
    getJobsByAddress(addressId: string): Promise<Array<Job>>;
    getSettings(): Promise<Settings>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    getVisit(id: string): Promise<Visit | null>;
    isCallerAdmin(): Promise<boolean>;
    listActiveCustomers(): Promise<Array<Customer>>;
    listAddressesByCustomer(customerId: string): Promise<Array<Address>>;
    listVisitsByJob(jobId: string): Promise<Array<Visit>>;
    loadSeedData(): Promise<void>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    updateJob(job: Job): Promise<void>;
    updateSettings(newSettings: Settings): Promise<void>;
    updateVisit(visit: Visit): Promise<void>;
}
