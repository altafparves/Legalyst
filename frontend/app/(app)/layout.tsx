import { Nav } from "@/components/nav";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <Nav />
      <main className="flex-1">{children}</main>
    </>
  );
}
