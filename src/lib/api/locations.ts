import { apiFetch } from "@/lib/api-client";

export type Location = {
  id: string;
  name: string;
  parentId: string | null;
  description: string | null;
  path: string;
  createdAt: number;
  updatedAt: number;
};

export async function listLocations(): Promise<Location[]> {
  const { locations } = await apiFetch<{ locations: Location[] }>(
    "/api/locations",
  );
  return locations;
}

export async function createLocation(input: {
  name: string;
  parentId?: string | null;
  description?: string | null;
}): Promise<Location> {
  const { location } = await apiFetch<{ location: Location }>(
    "/api/locations",
    { method: "POST", body: input },
  );
  return location;
}

export async function updateLocation(
  locationId: string,
  input: {
    name: string;
    parentId?: string | null;
    description?: string | null;
  },
): Promise<Location> {
  const { location } = await apiFetch<{ location: Location }>(
    `/api/locations/${locationId}`,
    { method: "PATCH", body: input },
  );
  return location;
}

export async function moveLocation(
  locationId: string,
  parentId: string | null,
): Promise<Location> {
  const { location } = await apiFetch<{ location: Location }>(
    `/api/locations/${locationId}/move`,
    { method: "POST", body: { parentId } },
  );
  return location;
}

export async function deleteLocation(locationId: string): Promise<void> {
  await apiFetch(`/api/locations/${locationId}`, { method: "DELETE" });
}
