import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  Address,
  Customer,
  Invoice,
  Job,
  Service,
  Settings,
  UserProfile,
  Visit,
} from "../backend.d.ts";
import { useActor } from "./useActor";

// ─── Helpers ──────────────────────────────────────────────────
export function dateToNs(date: Date): bigint {
  return BigInt(date.getTime()) * 1_000_000n;
}

export function nsToDate(ns: bigint): Date {
  return new Date(Number(ns / 1_000_000n));
}

export function formatDate(ns: bigint): string {
  const d = nsToDate(ns);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatCurrency(amount: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount);
}

// ─── Customers ────────────────────────────────────────────────
export function useCustomers() {
  const { actor, isFetching } = useActor();
  return useQuery<Customer[]>({
    queryKey: ["customers"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listActiveCustomers();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useCustomer(id: string) {
  const { actor, isFetching } = useActor();
  return useQuery<Customer | null>({
    queryKey: ["customer", id],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getCustomer(id);
    },
    enabled: !!actor && !isFetching && !!id,
  });
}

export function useAddCustomer() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (customer: Customer) => {
      if (!actor) throw new Error("No actor");
      return actor.addCustomer(customer);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers"] });
    },
  });
}

// ─── Addresses ────────────────────────────────────────────────
export function useAddressesByCustomer(customerId: string) {
  const { actor, isFetching } = useActor();
  return useQuery<Address[]>({
    queryKey: ["addresses", customerId],
    queryFn: async () => {
      if (!actor || !customerId) return [];
      return actor.listAddressesByCustomer(customerId);
    },
    enabled: !!actor && !isFetching && !!customerId,
  });
}

export function useAddAddress() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (address: Address) => {
      if (!actor) throw new Error("No actor");
      return actor.addAddress(address);
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["addresses", vars.customerId] });
    },
  });
}

// ─── Jobs ─────────────────────────────────────────────────────
export function useJobsByAddress(addressId: string) {
  const { actor, isFetching } = useActor();
  return useQuery<Job[]>({
    queryKey: ["jobs-by-address", addressId],
    queryFn: async () => {
      if (!actor || !addressId) return [];
      return actor.getJobsByAddress(addressId);
    },
    enabled: !!actor && !isFetching && !!addressId,
  });
}

export function useJobsForCustomer(customerId: string, addresses: Address[]) {
  const { actor, isFetching } = useActor();
  return useQuery<Job[]>({
    queryKey: ["jobs-for-customer", customerId, addresses.map((a) => a.id)],
    queryFn: async () => {
      if (!actor || !customerId || addresses.length === 0) return [];
      const jobArrays = await Promise.all(
        addresses.map((addr) => actor.getJobsByAddress(addr.id)),
      );
      return jobArrays.flat();
    },
    enabled: !!actor && !isFetching && !!customerId && addresses.length > 0,
  });
}

export function useAddJob() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (job: Job) => {
      if (!actor) throw new Error("No actor");
      return actor.addJob(job);
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["jobs-by-address", vars.addressId] });
      qc.invalidateQueries({
        queryKey: ["jobs-for-customer", vars.customerId],
      });
      qc.invalidateQueries({ queryKey: ["all-jobs"] });
    },
  });
}

export function useUpdateJob() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (job: Job) => {
      if (!actor) throw new Error("No actor");
      return actor.updateJob(job);
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["all-jobs"] });
      qc.invalidateQueries({ queryKey: ["jobs-by-address", vars.addressId] });
      qc.invalidateQueries({
        queryKey: ["jobs-for-customer", vars.customerId],
      });
    },
  });
}

// ─── Visits ───────────────────────────────────────────────────
export function useListVisitsByJob(jobId: string) {
  const { actor, isFetching } = useActor();
  return useQuery<Visit[]>({
    queryKey: ["visits", jobId],
    queryFn: async () => {
      if (!actor || !jobId) return [];
      return actor.listVisitsByJob(jobId);
    },
    enabled: !!actor && !isFetching && !!jobId,
  });
}

export function useAddVisit() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (visit: Visit) => {
      if (!actor) throw new Error("No actor");
      return actor.addVisit(visit);
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["visits", vars.jobId] });
    },
  });
}

export function useUpdateVisit() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (visit: Visit) => {
      if (!actor) throw new Error("No actor");
      return actor.updateVisit(visit);
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["visits", vars.jobId] });
    },
  });
}

// ─── Services ─────────────────────────────────────────────────
export function useJobServices(jobId: string) {
  const { actor, isFetching } = useActor();
  return useQuery<Service[]>({
    queryKey: ["job-services", jobId],
    queryFn: async () => {
      if (!actor || !jobId) return [];
      return actor.getJobServices(jobId);
    },
    enabled: !!actor && !isFetching && !!jobId,
  });
}

export function useAddService() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (service: Service) => {
      if (!actor) throw new Error("No actor");
      return actor.addService(service);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["services"] });
    },
  });
}

// ─── Invoices ─────────────────────────────────────────────────
export function useInvoicesByCustomer(customerId: string) {
  const { actor, isFetching } = useActor();
  return useQuery<Invoice[]>({
    queryKey: ["invoices", customerId],
    queryFn: async () => {
      if (!actor || !customerId) return [];
      return actor.getInvoicesByCustomer(customerId);
    },
    enabled: !!actor && !isFetching && !!customerId,
  });
}

export function useAddInvoice() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (invoice: Invoice) => {
      if (!actor) throw new Error("No actor");
      return actor.addInvoice(invoice);
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["invoices", vars.customerId] });
      qc.invalidateQueries({ queryKey: ["all-invoices"] });
    },
  });
}

// ─── Settings ─────────────────────────────────────────────────
export function useSettings() {
  const { actor, isFetching } = useActor();
  return useQuery<Settings>({
    queryKey: ["settings"],
    queryFn: async () => {
      if (!actor) throw new Error("No actor");
      return actor.getSettings();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useUpdateSettings() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (settings: Settings) => {
      if (!actor) throw new Error("No actor");
      return actor.updateSettings(settings);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings"] });
    },
  });
}

// ─── User Profile ─────────────────────────────────────────────
export function useUserProfile() {
  const { actor, isFetching } = useActor();
  return useQuery<UserProfile | null>({
    queryKey: ["user-profile"],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getCallerUserProfile();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useSaveUserProfile() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (profile: UserProfile) => {
      if (!actor) throw new Error("No actor");
      return actor.saveCallerUserProfile(profile);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["user-profile"] });
    },
  });
}

// ─── Seed Data ────────────────────────────────────────────────
export function useLoadSeedData() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("No actor");
      return actor.loadSeedData();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers"] });
      qc.invalidateQueries({ queryKey: ["settings"] });
      qc.invalidateQueries({ queryKey: ["services"] });
    },
  });
}
