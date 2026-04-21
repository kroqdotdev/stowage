import { parseJsonBody, withUser } from "@/server/auth/route";
import { ChangePasswordInput, changePassword } from "@/server/domain/users";

const ClientChangePassword = ChangePasswordInput.omit({ userId: true });

export const POST = withUser(
  "api/users/me/password",
  async (req, session, user) => {
    const body = ClientChangePassword.parse(await parseJsonBody(req));
    await changePassword(session.ctx, { ...body, userId: user.id });
    return { ok: true };
  },
);
