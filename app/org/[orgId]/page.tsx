import { Card, CardBody } from "@heroui/card";
import { headers } from "next/headers";

export default async function OrgDashboardPage({ params }: { params: { orgId: string } }) {
  // Wait for the dynamic param to resolve
  const { orgId } = await params;
  
  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-2xl font-bold">Resumen de la Organización</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card shadow="sm">
          <CardBody className="p-6">
            <h3 className="text-medium font-medium text-default-500">Miembros Activos</h3>
            <p className="text-3xl font-bold mt-2">--</p>
          </CardBody>
        </Card>
        
        <Card shadow="sm">
          <CardBody className="p-6">
            <h3 className="text-medium font-medium text-default-500">Asistencia Hoy</h3>
            <p className="text-3xl font-bold mt-2">--</p>
          </CardBody>
        </Card>
      </div>
      
      <div className="mt-8">
        <h3 className="text-xl font-bold mb-4">Actividad Reciente</h3>
        <Card shadow="sm">
          <CardBody className="p-6 text-center text-default-500">
            Los datos de actividad se cargarán aquí.
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
