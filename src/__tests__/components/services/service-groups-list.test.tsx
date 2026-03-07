import { beforeEach, describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { render, screen } from "@testing-library/react";
import { getFunctionName } from "convex/server";
import { ServiceGroupsList } from "@/components/services/service-groups-list";

const mockUseQuery = vi.fn();
const createGroupMock = vi.fn().mockResolvedValue({ groupId: "group1" });
const updateGroupMock = vi.fn().mockResolvedValue(null);
const deleteGroupMock = vi.fn().mockResolvedValue(null);

vi.mock("convex/react", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useMutation: (reference: unknown) => {
    const functionName = getFunctionName(reference as never);
    if (functionName === "serviceGroups:createGroup") {
      return createGroupMock;
    }
    if (functionName === "serviceGroups:updateGroup") {
      return updateGroupMock;
    }
    if (functionName === "serviceGroups:deleteGroup") {
      return deleteGroupMock;
    }
    return vi.fn();
  },
}));

describe("ServiceGroupsList", () => {
  beforeEach(() => {
    mockUseQuery.mockReset();
    createGroupMock.mockClear();
    updateGroupMock.mockClear();
    deleteGroupMock.mockClear();
  });

  it("renders groups and allows admins to open create dialog", async () => {
    const user = userEvent.setup();
    mockUseQuery.mockImplementation((reference: unknown) => {
      const functionName = getFunctionName(reference as never);
      if (functionName === "users:getCurrentUser") {
        return { _id: "user1", role: "admin" };
      }
      if (functionName === "serviceGroups:listGroups") {
        return [
          {
            _id: "group1",
            _creationTime: 1,
            name: "Engine checks",
            description: "Quarterly",
            createdAt: 1,
            updatedAt: 1,
            assetCount: 2,
            fieldCount: 3,
          },
        ];
      }
      return undefined;
    });

    render(<ServiceGroupsList />);

    expect(screen.getByText("Engine checks")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Create group" }));
    expect(
      screen.getByRole("heading", { name: "Create service group" }),
    ).toBeVisible();
  });
});
