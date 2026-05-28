import CityForm from "@/components/admin/city-form";

export const dynamic = "force-dynamic";

export default async function AdminCityNewPage() {
  return <CityForm mode="create" initial={{}} />;
}
