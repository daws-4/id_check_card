"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Chip } from "@heroui/chip";
import { Spinner } from "@heroui/spinner";
import { Activity, Clock, CheckCircle2, User as UserIcon, XCircle, FileText, ActivitySquare } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function LiveMonitorPage() {
  const params = useParams();
  const orgId = params?.orgId as string;
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch logic abstracted so we can call it over and over silently
  const fetchLogs = () => {
    fetch(`/api/attendance?organization_id=${orgId}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setLogs(data);
        }
      })
      .catch((err) => console.error("Error fetching live logs:", err))
      .finally(() => setLoading(false));
  };

  // Initial load & SSE setup
  useEffect(() => {
    fetchLogs();

    const evtSource = new EventSource("/api/stream");
    
    evtSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        // Any time someone logs in, refresh
        if (payload.userId) {
          fetchLogs();
        }
      } catch (e) {
        // Ignore parse errors (keep-alives)
      }
    };

    return () => {
      evtSource.close();
    };
  }, [orgId]);

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Spinner size="lg" color="primary" label="Cargando monitor en vivo..." />
      </div>
    );
  }

  // Get the most recent log
  const latestLog = logs.length > 0 ? logs[0] : null;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Title */}
      <div className="flex items-center gap-3">
        <div className="p-3 bg-[var(--color-electric-sapphire)]/10 text-[var(--color-electric-sapphire)] rounded-xl relative">
          <Activity className="w-8 h-8" />
          <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full animate-ping" />
          <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-[var(--color-carbon-black)] dark:text-white">
            Monitor en Vivo
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Visualización en tiempo real de los accesos a la organización
          </p>
        </div>
      </div>

      {latestLog ? (
        <div className="flex flex-col gap-8">
          {/* Main Showcase (Last scan) */}
          <div className="w-full">
            <AnimatePresence mode="popLayout">
              <motion.div
                key={latestLog._id}
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
              >
                <Card className="bg-white dark:bg-zinc-900 shadow-xl border-none overflow-hidden h-full min-h-[400px]">
                  {/* Status Banner */}
                  <div className={`h-3 w-full ${latestLog.type === "entrada" ? "bg-emerald-500" : "bg-blue-500"}`} />
                  
                  <CardBody className="p-8 flex flex-col md:flex-row items-center justify-center gap-8 text-center md:text-left">
                    {/* User Photo */}
                    <div className="relative shrink-0">
                      {latestLog.user_id?.photo_url ? (
                        <div className="w-40 h-40 md:w-48 md:h-48 rounded-full overflow-hidden shadow-lg border-4 border-white dark:border-zinc-800">
                          <img
                            src={latestLog.user_id.photo_url}
                            alt="Foto del usuario"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-40 h-40 md:w-48 md:h-48 rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center shadow-lg border-4 border-white dark:border-zinc-800 text-gray-400">
                          <UserIcon className="w-24 h-24" />
                        </div>
                      )}
                      <motion.div 
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, type: "spring" }}
                        className="absolute -bottom-2 md:bottom-2 right-1/2 translate-x-1/2 md:translate-x-0 md:right-2"
                      >
                        <Chip
                          size="lg"
                          color={latestLog.type === "entrada" ? "success" : "primary"}
                          className="shadow-md font-bold uppercase tracking-wider"
                        >
                          {latestLog.type === "entrada" ? "Entrada" : "Salida"}
                        </Chip>
                      </motion.div>
                    </div>

                    {/* Info */}
                    <div className="flex-1 space-y-4 min-w-0 md:pl-4">
                      <div>
                        <h2 className="text-3xl md:text-5xl font-extrabold text-gray-900 dark:text-white capitalize leading-tight break-words">
                          {latestLog.user_id?.name || "Desconocido"} {latestLog.user_id?.last_name || ""}
                        </h2>
                        <p className="text-xl text-gray-500 dark:text-gray-400 mt-1">
                          {latestLog.user_id?.user_type === 'student' ? 'Estudiante' : 'Trabajador/Staff'}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 pt-6 border-t border-gray-100 dark:border-zinc-800 text-left">
                        <div>
                          <p className="text-sm text-gray-500 flex items-center gap-1 justify-center md:justify-start"><FileText className="w-4 h-4"/> Documento</p>
                          <p className="font-semibold text-base sm:text-lg dark:text-gray-200 text-center md:text-left">{latestLog.user_id?.document_id || "N/A"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 flex items-center gap-1 justify-center md:justify-start"><ActivitySquare className="w-4 h-4"/> Sangre</p>
                          <p className="font-semibold text-base sm:text-lg dark:text-gray-200 text-center md:text-left">{latestLog.user_id?.blood_type || "N/A"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 flex items-center gap-1 justify-center md:justify-start"><Clock className="w-4 h-4"/> Registro</p>
                          <p className="font-semibold text-base sm:text-lg dark:text-gray-200 text-center md:text-left">
                            {new Date(latestLog.timestamp).toLocaleTimeString("es-ES", {
                              hour: '2-digit', minute: '2-digit', second: '2-digit'
                            })}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 flex items-center gap-1 justify-center md:justify-start"><CheckCircle2 className="w-4 h-4"/> Estado</p>
                          <div className="flex justify-center md:justify-start mt-0.5">
                            {latestLog.status ? (
                              <Chip size="sm" variant="dot" color={latestLog.status === "on_time" ? "success" : latestLog.status === "late" ? "danger" : "warning"}>
                                {latestLog.status === "on_time" ? "A tiempo" : latestLog.status === "late" ? "Tarde" : "Desfasado"}
                              </Chip>
                            ) : (
                              <span className="font-semibold dark:text-gray-200">—</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Recent History Centered Below */}
          <div className="w-full lg:w-[60%] xl:w-1/2 mx-auto">
            <Card className="bg-white dark:bg-zinc-900 shadow-md border-none h-[400px]">
              <CardHeader className="px-6 py-4 border-b border-gray-100 dark:border-zinc-800">
                <h3 className="font-bold flex items-center gap-2">
                  <Clock className="w-5 h-5 text-gray-400" /> Historial Reciente
                </h3>
              </CardHeader>
              <CardBody className="p-0">
                <div className="divide-y divide-gray-100 dark:divide-zinc-800 h-full overflow-y-auto">
                  {logs.slice(1, 21).map((log) => (
                    <div key={log._id} className="p-4 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors">
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 dark:bg-zinc-700 flex-shrink-0">
                        {log.user_id?.photo_url ? (
                          <img src={log.user_id.photo_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <UserIcon className="w-full h-full p-2 text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate dark:text-gray-200 text-gray-800">
                          {log.user_id?.name} {log.user_id?.last_name || ""}
                        </p>
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                          <span className={log.type === "entrada" ? "text-emerald-500" : "text-blue-500"}>
                            {log.type === "entrada" ? "Ent" : "Sal"}
                          </span>
                          • {new Date(log.timestamp).toLocaleTimeString("es-ES", {hour:'2-digit', minute:'2-digit'})}
                        </p>
                      </div>
                      {log.status === "late" && (
                        <div className="text-red-500"><XCircle className="w-4 h-4" /></div>
                      )}
                    </div>
                  ))}
                  {logs.length <= 1 && (
                    <div className="p-8 text-center text-gray-400 text-sm">
                      No hay otros registros anteriores
                    </div>
                  )}
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      ) : (
        <Card className="bg-white dark:bg-zinc-900 border-none shadow-sm h-64 flex flex-col items-center justify-center">
          <Activity className="w-12 h-12 text-gray-300 mb-3" />
          <h3 className="text-lg font-medium text-gray-500 dark:text-gray-400">Esperando el primer acceso...</h3>
          <p className="text-sm text-gray-400">Pasa una tarjeta por un lector de esta organización para ver la magia.</p>
        </Card>
      )}
    </div>
  );
}
