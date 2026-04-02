import { Building2, Router, Users } from "lucide-react";

export default async function AdminDashboardPage() {
  // We'd typically fetch real stats here
  return (
    <section className="mb-10">
      <h3 className="text-[var(--color-carbon-black)] dark:text-gray-100 text-2xl font-bold mb-6">Resumen de la Plataforma</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Tarjeta 1 */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-white/10 hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-[var(--color-tropical-teal)]/10 rounded-full blur-2xl"></div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-gray-500 font-medium text-sm">Total Organizaciones</p>
            <div className="p-2 bg-[var(--color-electric-sapphire)]/10 dark:bg-[var(--color-electric-sapphire)]/20 rounded-lg text-[var(--color-electric-sapphire)]">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <p className="text-4xl font-bold text-[var(--color-carbon-black)] dark:text-white">--</p>
        </div>

        {/* Tarjeta 2 */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-white/10 hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-[var(--color-maya-blue)]/10 rounded-full blur-2xl"></div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-gray-500 font-medium text-sm">Lectores Activos</p>
            <div className="p-2 bg-[var(--color-maya-blue)]/10 dark:bg-[var(--color-maya-blue)]/20 rounded-lg text-[var(--color-maya-blue)]">
              <Router className="w-5 h-5" />
            </div>
          </div>
          <p className="text-4xl font-bold text-[var(--color-carbon-black)] dark:text-white">--</p>
        </div>

        {/* Tarjeta 3 */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-white/10 hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-[var(--color-electric-sapphire)]/10 rounded-full blur-2xl"></div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-gray-500 font-medium text-sm">Total Usuarios</p>
            <div className="p-2 bg-[var(--color-tropical-teal)]/10 dark:bg-[var(--color-tropical-teal)]/20 rounded-lg text-[var(--color-tropical-teal)]">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <p className="text-4xl font-bold text-[var(--color-carbon-black)] dark:text-white">--</p>
        </div>
      </div>
    </section>
  );
}
