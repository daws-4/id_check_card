import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "./api/auth/[...nextauth]/route";

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  const role = (session.user as any)?.role;
  const orgs = (session.user as any)?.orgs || [];

  if (role === 'superadmin') {
    redirect('/admin');
  } else if (role === 'org_admin' && orgs.length > 0) {
    redirect(`/org/${orgs[0]}`);
  }

  // Regular user — redirect to user panel
  if (role === 'user') {
    redirect('/user');
  }

  // Fallback
  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Bienvenido</h1>
        <p className="text-default-500">Redirigiendo...</p>
      </div>
    </div>
  );
}
