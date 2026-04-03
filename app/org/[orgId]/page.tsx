import { Card, CardBody } from "@heroui/card";
import { Chip } from "@heroui/chip";
import connectDB from "@/config/db";
import { Membership } from "@/models/Membership";
import { AttendanceLog } from "@/models/AttendanceLog";

const STATUS_CONFIG: Record<string, { label: string; color: "success" | "danger" | "warning" | "secondary" | "default" }> = {
  on_time: { label: "A Tiempo", color: "success" },
  late: { label: "Retraso", color: "danger" },
  early_leave: { label: "Salida Temp.", color: "warning" },
  overtime: { label: "Tiempo Extra", color: "secondary" },
  out_of_schedule: { label: "Fuera Horario", color: "default" },
};

export default async function OrgDashboardPage({ params }: { params: { orgId: string } }) {
  // Wait for the dynamic param to resolve
  const { orgId } = await params;
  
  await connectDB();

  // Calculate today's boundaries
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  // Fetch metrics concurrently
  const [activeMembers, todayAttendance, recentActivity] = await Promise.all([
    Membership.countDocuments({ organization_id: orgId }),
    AttendanceLog.countDocuments({ 
      organization_id: orgId, 
      type: "entrada",
      timestamp: { $gte: todayStart, $lte: todayEnd }
    }),
    AttendanceLog.find({ organization_id: orgId })
      .sort({ timestamp: -1 })
      .limit(5)
      .populate('user_id', 'name last_name document_id')
      .populate('reader_id', 'location esp32_id')
  ]);
  
  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-2xl font-bold">Resumen de la Organización</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card shadow="sm">
          <CardBody className="p-6">
            <h3 className="text-medium font-medium text-default-500">Miembros Activos</h3>
            <p className="text-3xl font-bold mt-2 text-primary">{activeMembers}</p>
          </CardBody>
        </Card>
        
        <Card shadow="sm">
          <CardBody className="p-6">
            <h3 className="text-medium font-medium text-default-500">Asistencia Hoy</h3>
            <p className="text-3xl font-bold mt-2 text-success">{todayAttendance}</p>
          </CardBody>
        </Card>
      </div>
      
      <div className="mt-8">
        <h3 className="text-xl font-bold mb-4">Actividad Reciente</h3>
        <Card shadow="sm">
          <CardBody className="p-0 overflow-hidden">
            {recentActivity.length === 0 ? (
              <div className="p-6 text-center text-default-500">
                No hay actividad reciente.
              </div>
            ) : (
              <ul className="divide-y divide-default-100">
                {recentActivity.map((log: any) => (
                  <li key={log._id.toString()} className="p-4 flex items-center justify-between hover:bg-default-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-full ${log.type === "entrada" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          {log.type === "entrada" ? (
                            <>
                              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                              <polyline points="10 17 15 12 10 7" />
                              <line x1="15" y1="12" x2="3" y2="12" />
                            </>
                          ) : (
                            <>
                              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                              <polyline points="16 17 21 12 16 7" />
                              <line x1="21" y1="12" x2="9" y2="12" />
                            </>
                          )}
                        </svg>
                      </div>
                      <div>
                        <p className="font-semibold">{log.user_id?.name || "Desconocido"} {log.user_id?.last_name || ""}</p>
                        <p className="text-xs text-default-500">
                          Lector: {log.reader_id?.location || log.reader_id?.esp32_id || "Desconocido"} •{" "}
                          {new Date(log.timestamp).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                    {log.status && STATUS_CONFIG[log.status] && (
                      <Chip size="sm" variant="flat" color={STATUS_CONFIG[log.status].color}>
                        {STATUS_CONFIG[log.status].label}
                      </Chip>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
