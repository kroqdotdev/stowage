import { ServicesHeader } from "@/components/services/services-header";

export default function ServicesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <ServicesHeader />
      {children}
    </div>
  );
}
