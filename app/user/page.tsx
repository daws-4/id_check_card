"use client";

import { useEffect, useState } from "react";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Chip } from "@heroui/chip";
import { Button } from "@heroui/button";
import { Spinner } from "@heroui/spinner";
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  Timer,
  TrendingUp,
  ArrowRight,
  Nfc,
} from "lucide-react";
import Link from "next/link";

interface DashboardData {
  userType: 'student' | 'worker';
  organizations: any[];
  groups: any[];
  todaySchedules: any[];
  pendingTasks: any[];
  completedTasks: any[];
  recentLogs: any[];
  metrics: {
    scheduleCompliance: number;
    totalHoursWorked: number;
    overtimeMinutes: number;
    lateArrivals: number;
    avgLateMinutes: number;
    dailyHours: { day: string; minutes: number }[];
    weeklyLateCount: number;
  };
  error?: string;
  details?: string;
  stack?: string;
}

export default function UserDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/user/dashboard")
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleCompleteTask = async (taskId: string) => {
    setCompleting(taskId);
    try {
      const res = await fetch(`/api/user/tasks/${taskId}/complete`, {
        method: "POST",
      });
      if (res.ok) {
        // Refresh data
        const refreshed = await fetch("/api/user/dashboard").then((r) =>
          r.json()
        );
        setData(refreshed);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCompleting(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner size="lg" color="primary" />
      </div>
    );
  }

  if (!data || data.error || !data.metrics) {
    return (
      <div className="text-center text-gray-500 mt-20">
        Error al cargar datos: {data?.error || "Desconocido"}
        <br />
        <span className="text-xs text-red-400 mt-2 block w-full max-w-2xl text-left bg-gray-100 p-2 mx-auto overflow-auto">
          {data?.details || ""} 
          <br/>
          {data?.stack || ""}
        </span>
      </div>
    );
  }

  const { todaySchedules, pendingTasks, recentLogs, metrics, userType } = data;

  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  function timeToMinutes(t: string): number {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  }

  return (
    <div className="space-y-8">
      {/* Title */}
      <div>
        <h1 className="text-3xl font-bold text-[var(--color-carbon-black)]">
          Dashboard
        </h1>
        <p className="text-gray-500 mt-1">
          Resumen de tu jornada —{" "}
          {now.toLocaleDateString("es-ES", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
        </p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Card className="bg-white shadow-md border-none">
          <CardBody className="flex flex-row items-center gap-4 p-5">
            <div className="bg-emerald-100 text-emerald-600 rounded-xl p-3">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Cumplimiento</p>
              <p className="text-2xl font-bold">
                {metrics.scheduleCompliance}%
              </p>
            </div>
          </CardBody>
        </Card>

        <Card className="bg-white shadow-md border-none">
          <CardBody className="flex flex-row items-center gap-4 p-5">
            <div className="bg-blue-100 text-blue-600 rounded-xl p-3">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500">
                {userType === "student" ? "Horas de Estudio" : "Horas Trabajadas"}
              </p>
              <p className="text-2xl font-bold">{metrics.totalHoursWorked}h</p>
            </div>
          </CardBody>
        </Card>

        <Card className="bg-white shadow-md border-none">
          <CardBody className="flex flex-row items-center gap-4 p-5">
            <div className="bg-purple-100 text-purple-600 rounded-xl p-3">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Tiempo Extra</p>
              <p className="text-2xl font-bold">
                {metrics.overtimeMinutes} min
              </p>
            </div>
          </CardBody>
        </Card>

        <Card className="bg-white shadow-md border-none">
          <CardBody className="flex flex-row items-center gap-4 p-5">
            <div className="bg-amber-100 text-amber-600 rounded-xl p-3">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Llegadas Tarde</p>
              <p className="text-2xl font-bold">{metrics.lateArrivals}</p>
              {metrics.lateArrivals > 0 && (
                <p className="text-xs text-gray-400">
                  ~{metrics.avgLateMinutes} min prom.
                </p>
              )}
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Two column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Schedules */}
        <Card className="bg-white shadow-md border-none">
          <CardHeader className="flex justify-between items-center px-6 pt-5 pb-0">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[var(--color-tropical-teal)]" />
              Horarios de Hoy
            </h3>
            <Link href="/user/schedules">
              <Button
                size="sm"
                variant="light"
                className="text-[var(--color-electric-sapphire)]"
                endContent={<ArrowRight className="w-4 h-4" />}
              >
                Ver todos
              </Button>
            </Link>
          </CardHeader>
          <CardBody className="px-6 py-4">
            {todaySchedules.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">
                Sin horarios para hoy
              </p>
            ) : (
              <div className="space-y-3">
                {todaySchedules.map((s: any) => {
                  const startMin = timeToMinutes(s.start_time);
                  const endMin = timeToMinutes(s.end_time);
                  const isActive =
                    nowMinutes >= startMin && nowMinutes <= endMin;
                  const isPast = nowMinutes > endMin;
                  const isFuture = nowMinutes < startMin;

                  return (
                    <div
                      key={s._id}
                      className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                        isActive
                          ? "border-emerald-300 bg-emerald-50"
                          : isPast
                            ? "border-gray-200 bg-gray-50 opacity-60"
                            : "border-blue-200 bg-blue-50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            isActive
                              ? "bg-emerald-500 animate-pulse"
                              : isPast
                                ? "bg-gray-400"
                                : "bg-blue-500"
                          }`}
                        />
                        <div>
                          <p className="font-semibold text-sm">{s.title}</p>
                          <p className="text-xs text-gray-500">
                            {s.groupName}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Chip
                          size="sm"
                          variant="flat"
                          color={
                            isActive
                              ? "success"
                              : isPast
                                ? "default"
                                : "primary"
                          }
                        >
                          {s.start_time} — {s.end_time}
                        </Chip>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Pending Tasks */}
        <Card className="bg-white shadow-md border-none">
          <CardHeader className="flex justify-between items-center px-6 pt-5 pb-0">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <ListChecks className="w-5 h-5 text-[var(--color-electric-sapphire)]" />
              Tareas Pendientes
            </h3>
            <Link href="/user/tasks">
              <Button
                size="sm"
                variant="light"
                className="text-[var(--color-electric-sapphire)]"
                endContent={<ArrowRight className="w-4 h-4" />}
              >
                Ver todas
              </Button>
            </Link>
          </CardHeader>
          <CardBody className="px-6 py-4">
            {pendingTasks.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">
                ¡No tienes tareas pendientes! 🎉
              </p>
            ) : (
              <div className="space-y-3">
                {pendingTasks.slice(0, 5).map((t: any) => (
                  <div
                    key={t._id}
                    className="flex items-center justify-between p-3 rounded-xl border border-gray-200 hover:border-[var(--color-electric-sapphire)]/30 transition-all"
                  >
                    <div className="flex-1">
                      <p className="font-semibold text-sm">{t.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-400">
                          {t.groupName}
                        </span>
                        {t.due_date && (
                          <Chip size="sm" variant="flat" color="warning">
                            {new Date(t.due_date).toLocaleDateString("es-ES", {
                              day: "numeric",
                              month: "short",
                            })}
                          </Chip>
                        )}
                        {t.is_recurring && (
                          <Chip size="sm" variant="flat" color="secondary">
                            {t.recurrence === "weekly"
                              ? "Semanal"
                              : t.recurrence === "monthly"
                                ? "Mensual"
                                : "Anual"}
                          </Chip>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      color="success"
                      variant="flat"
                      isLoading={completing === t._id}
                      onPress={() => handleCompleteTask(t._id)}
                    >
                      Completar
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Recent NFC Logs */}
      <Card className="bg-white shadow-md border-none">
        <CardHeader className="px-6 pt-5 pb-0">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Nfc className="w-5 h-5 text-[var(--color-maya-blue)]" />
            Últimos Registros NFC
          </h3>
        </CardHeader>
        <CardBody className="px-6 py-4">
          {recentLogs.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">
              Sin registros recientes
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-400 border-b">
                    <th className="pb-3 font-medium">Fecha/Hora</th>
                    <th className="pb-3 font-medium">Tipo</th>
                    <th className="pb-3 font-medium">Estado</th>
                    <th className="pb-3 font-medium">Variación</th>
                    <th className="pb-3 font-medium">Organización</th>
                  </tr>
                </thead>
                <tbody>
                  {recentLogs.slice(0, 5).map((log: any) => (
                    <tr key={log._id} className="border-b border-gray-50">
                      <td className="py-3">
                        {new Date(log.timestamp).toLocaleString("es-ES", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="py-3">
                        <Chip
                          size="sm"
                          variant="flat"
                          color={
                            log.type === "entrada" ? "primary" : "secondary"
                          }
                        >
                          {log.type === "entrada" ? "Entrada" : "Salida"}
                        </Chip>
                      </td>
                      <td className="py-3">
                        {log.status ? (
                          <Chip
                            size="sm"
                            variant="dot"
                            color={
                              log.status === "on_time"
                                ? "success"
                                : log.status === "late"
                                  ? "danger"
                                  : log.status === "overtime"
                                    ? "warning"
                                    : "default"
                            }
                          >
                            {log.status === "on_time"
                              ? "A tiempo"
                              : log.status === "late"
                                ? "Tarde"
                                : log.status === "overtime"
                                  ? "Extra"
                                  : "Salida temp."}
                          </Chip>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="py-3">
                        {log.time_variance_minutes !== undefined ? (
                          <span
                            className={`font-mono text-xs ${
                              log.time_variance_minutes > 0
                                ? "text-red-500"
                                : log.time_variance_minutes < 0
                                  ? "text-emerald-500"
                                  : "text-gray-400"
                            }`}
                          >
                            {log.time_variance_minutes > 0 ? "+" : ""}
                            {log.time_variance_minutes} min
                          </span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="py-3 text-gray-600">
                        {log.organization_id?.name || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function Calendar(props: any) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M8 2v4" />
      <path d="M16 2v4" />
      <rect width="18" height="18" x="3" y="4" rx="2" />
      <path d="M3 10h18" />
    </svg>
  );
}

function ListChecks(props: any) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="m3 17 2 2 4-4" />
      <path d="m3 7 2 2 4-4" />
      <path d="M13 6h8" />
      <path d="M13 12h8" />
      <path d="M13 18h8" />
    </svg>
  );
}
