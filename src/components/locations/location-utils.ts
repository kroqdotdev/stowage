export type LocationTreeItem = {
  id: string;
  name: string;
  parentId: string | null;
  description: string | null;
  path: string;
  createdAt: number;
  updatedAt: number;
};

export function buildLocationChildrenMap(locations: LocationTreeItem[]) {
  const map = new Map<string | null, LocationTreeItem[]>();
  const ids = new Set(locations.map((location) => location.id));
  for (const location of locations) {
    // An orphan (parent deleted or unreadable) shows as a root.
    const key =
      location.parentId && ids.has(location.parentId) ? location.parentId : null;
    const existing = map.get(key);
    if (existing) existing.push(location);
    else map.set(key, [location]);
  }
  for (const list of map.values()) {
    list.sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
    );
  }
  return map;
}

export function collectDescendantIds(
  locationId: string,
  childrenByParent: Map<string | null, LocationTreeItem[]>,
) {
  const descendants = new Set<string>();
  const stack = [locationId];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;
    for (const child of childrenByParent.get(current) ?? []) {
      if (!descendants.has(child.id)) {
        descendants.add(child.id);
        stack.push(child.id);
      }
    }
  }
  return descendants;
}
