import CompanyForm from "@/components/admin/company-form";

export const dynamic = "force-dynamic";

export default async function AdminCompanyNewPage() {
  return <CompanyForm mode="create" initial={{}} />;
}
