import DrinkForm from "@/components/admin/drink-form";

export const dynamic = "force-dynamic";

export default async function AdminDrinkNewPage() {
  return <DrinkForm mode="create" initial={{}} />;
}
