import { redirect } from "next/navigation";

export default function FieldsPage() {
  redirect("/taxonomy?tab=fields");
}
