import SourceForm from "@/components/admin/source-form";

export const dynamic = "force-dynamic";

export default async function AdminSourceNewPage() {
  return <SourceForm mode="create" initial={{}} />;
}
