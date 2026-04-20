import { apiFetch } from "@/lib/api-client";

export type ServiceProvider = {
  id: string;
  name: string;
  contactEmail: string | null;
  contactPhone: string | null;
  notes: string | null;
  createdAt: number;
  updatedAt: number;
  createdBy: string;
  updatedBy: string;
};

export type ServiceProviderOption = { id: string; name: string };

type CreateInput = {
  name: string;
  contactEmail?: string | null;
  contactPhone?: string | null;
  notes?: string | null;
};

export async function listServiceProviders(): Promise<ServiceProvider[]> {
  const { providers } = await apiFetch<{ providers: ServiceProvider[] }>(
    "/api/service-providers",
  );
  return providers;
}

export async function listServiceProviderOptions(): Promise<
  ServiceProviderOption[]
> {
  const { providers } = await apiFetch<{ providers: ServiceProviderOption[] }>(
    "/api/service-providers?variant=options",
  );
  return providers;
}

export async function createServiceProvider(
  input: CreateInput,
): Promise<ServiceProvider> {
  const { provider } = await apiFetch<{ provider: ServiceProvider }>(
    "/api/service-providers",
    { method: "POST", body: input },
  );
  return provider;
}

export async function updateServiceProvider(
  providerId: string,
  input: CreateInput,
): Promise<ServiceProvider> {
  const { provider } = await apiFetch<{ provider: ServiceProvider }>(
    `/api/service-providers/${providerId}`,
    { method: "PATCH", body: input },
  );
  return provider;
}

export async function deleteServiceProvider(
  providerId: string,
): Promise<void> {
  await apiFetch(`/api/service-providers/${providerId}`, { method: "DELETE" });
}
