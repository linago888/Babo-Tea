import SearchQueryForm from "@/components/admin/search-query-form";

export const dynamic = "force-dynamic";

export default function AdminSearchQueryNewPage() {
  return <SearchQueryForm mode="create" initial={{}} />;
}
