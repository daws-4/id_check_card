"use client";

import { useEffect, useState } from "react";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Chip } from "@heroui/chip";
import { Spinner } from "@heroui/spinner";
import {
  BarChart3,
  Clock,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  CalendarDays,
  Building2,
  BookOpen,
  Briefcase,
} from "lucide-react";

const STUDY_ORG_TYPES = new Set(["school", "university", "library"]);

function isStudyOrg(orgType: string): boolean {
  return STUDY_ORG_TYPES.has(orgType);
}

function getHoursLabel(orgType: string): string {
  return isStudyOrg(orgType) ? "Horas Estudiadas" : "Horas Trabajadas";
}

function getHoursLabelToday(orgType: string): string {
  return isStudyOrg(orgType) ? "Horas de Estudio Hoy" : "Horas Trabajadas Hoy";
}

const ORG_BAR_COLORS = [
  { active: "from-[var(--color-electric-sapphire)] to-[var(--color-tropical-teal)]", inactive: "from-[var(--color-maya-blue)]/60 to-[var(--color-maya-blue)]/20" },
  { active: "from-purple-500 to-fuchsia-400", inactive: "from-purple-400/50 to-purple-300/20" },
  { active: "from-amber-500 to-orange-400", inactive: "from-amber-400/50 to-amber-300/20" },
  { active: "from-emerald-500 to-teal-400", inactive: "from-emerald-400/50 to-emerald-300/20" },
  { active: "from-rose-500 to-pink-400", inactive: "from-rose-400/50 to-rose-300/20" },
];

export default function MetricsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/user/dashboard")
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

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
        Error al cargar las métricas.
      </div>
    );
  }

  const { metrics, recentLogs = [], organizations = [] } = data;
  const dailyHoursByOrg: any[] = metrics.dailyHoursByOrg || [];

  // Determine the aggregate label: if ALL orgs are study → "Horas Estudiadas", else mixed
  const allStudy = organizations.every((o: any) => isStudyOrg(o.type));
  const allWork = organizations.every((o: any) => !isStudyOrg(o.type));
  const aggregateLabel = allStudy
    ? "Horas de Estudio Hoy"
    : allWork
      ? "Horas Trabajadas Hoy"
      : "Horas Registradas Hoy";

  const aggregateGaugeLabel = allStudy
    ? "Asistidas hoy"
    : allWork
      ? "Trabajadas hoy"
      : "Registradas hoy";

  // Late arrivals from recent logs
  const lateEntries = recentLogs.filter(
    (l: any) => l.type === "entrada" && l.status === "late"
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-[var(--color-carbon-black)]">
          Métricas de Cumplimiento
        </h1>
        <p className="text-gray-500 mt-1">
          Análisis detallado de tu desempeño y puntualidad
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <MetricCard
          icon={<CheckCircle2 className="w-6 h-6" />}
          iconBg="bg-emerald-100 text-emerald-600"
          label="Cumplimiento de Horario"
          value={`${metrics.scheduleCompliance}%`}
          subtext={
            metrics.scheduleCompliance >= 80
              ? "¡Excelente!"
              : metrics.scheduleCompliance >= 50
                ? "Puede mejorar"
                : "Necesita atención"
          }
          subtextColor={
            metrics.scheduleCompliance >= 80
              ? "text-emerald-500"
              : metrics.scheduleCompliance >= 50
                ? "text-amber-500"
                : "text-red-500"
          }
        />
        <MetricCard
          icon={<Clock className="w-6 h-6" />}
          iconBg="bg-blue-100 text-blue-600"
          label={aggregateLabel}
          value={`${metrics.totalHoursWorked}h`}
          subtext={metrics.expectedMinutesToday > 0 ? `de ${(metrics.expectedMinutesToday / 60).toFixed(1)}h esperadas` : "Sin horario hoy"}
        />
        <MetricCard
          icon={<CalendarDays className="w-6 h-6" />}
          iconBg="bg-cyan-100 text-cyan-600"
          label="Cumplimiento de Horas"
          value={`${metrics.dailyCompliance ?? 100}%`}
          subtext={
            (metrics.dailyCompliance ?? 100) >= 100
              ? "Horas completadas"
              : `Faltan ${metrics.hoursDeficit || 0} min`
          }
          subtextColor={(metrics.dailyCompliance ?? 100) >= 100 ? "text-emerald-500" : "text-amber-500"}
        />
        <MetricCard
          icon={<TrendingUp className="w-6 h-6" />}
          iconBg="bg-purple-100 text-purple-600"
          label="Tiempo Extra Real"
          value={`${metrics.overtimeMinutes} min`}
          subtext={metrics.overtimeMinutes > 0 ? "Excedente sobre las horas esperadas" : "Sin excedente hoy"}
          subtextColor={metrics.overtimeMinutes === 0 ? "text-emerald-500" : undefined}
        />
        <MetricCard
          icon={<AlertTriangle className="w-6 h-6" />}
          iconBg="bg-amber-100 text-amber-600"
          label="Llegadas Tarde"
          value={String(metrics.lateArrivals)}
          subtext={
            metrics.lateArrivals > 0
              ? `~${metrics.avgLateMinutes} min promedio`
              : "¡Sin retrasos!"
          }
          subtextColor={metrics.lateArrivals === 0 ? "text-emerald-500" : undefined}
        />
      </div>

      {/* Per-Organization Weekly Charts */}
      {dailyHoursByOrg.length > 0 ? (
        dailyHoursByOrg.map((orgData: any, orgIdx: number) => {
          const colors = ORG_BAR_COLORS[orgIdx % ORG_BAR_COLORS.length];
          const isStudy = isStudyOrg(orgData.orgType);
          const hoursLabel = getHoursLabel(orgData.orgType);
          const maxMinutes = Math.max(
            ...orgData.dailyHours.map((d: any) => d.minutes),
            1
          );
          const totalWeekMinutes = orgData.dailyHours.reduce(
            (sum: number, d: any) => sum + d.minutes,
            0
          );
          const OrgIcon = isStudy ? BookOpen : Briefcase;

          return (
            <Card key={orgData.orgId} className="bg-white shadow-md border-none">
              <CardHeader className="px-6 pt-5 pb-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <OrgIcon className={`w-5 h-5 ${isStudy ? "text-violet-500" : "text-[var(--color-tropical-teal)]"}`} />
                  <h3 className="text-lg font-bold">{orgData.orgName}</h3>
                  <Chip
                    size="sm"
                    variant="flat"
                    color={isStudy ? "secondary" : "primary"}
                    startContent={<Building2 className="w-3 h-3" />}
                  >
                    {hoursLabel}
                  </Chip>
                  <span className="text-sm text-gray-400 ml-auto">
                    Total semana: <span className="font-semibold text-gray-600">{(totalWeekMinutes / 60).toFixed(1)}h</span>
                  </span>
                </div>
              </CardHeader>
              <CardBody className="px-6 py-6">
                <div className="flex items-end gap-4 h-48">
                  {orgData.dailyHours.map((d: any, idx: number) => {
                    const heightPct =
                      maxMinutes > 0 ? (d.minutes / maxMinutes) * 100 : 0;
                    const hours = (d.minutes / 60).toFixed(1);
                    const isToday = idx === new Date().getDay();

                    return (
                      <div
                        key={d.day}
                        className="flex flex-col items-center flex-1 gap-2"
                      >
                        <span className="text-xs font-mono text-gray-500">
                          {hours}h
                        </span>
                        <div className="w-full relative" style={{ height: "140px" }}>
                          <div
                            className={`absolute bottom-0 w-full rounded-t-lg transition-all duration-700 bg-gradient-to-t ${
                              isToday ? colors.active : colors.inactive
                            }`}
                            style={{
                              height: `${Math.max(heightPct, 2)}%`,
                            }}
                          />
                        </div>
                        <span
                          className={`text-xs font-semibold ${
                            isToday
                              ? isStudy
                                ? "text-violet-500"
                                : "text-[var(--color-tropical-teal)]"
                              : "text-gray-400"
                          }`}
                        >
                          {d.day}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardBody>
            </Card>
          );
        })
      ) : (
        /* Fallback: aggregate chart if no per-org data */
        <Card className="bg-white shadow-md border-none">
          <CardHeader className="px-6 pt-5 pb-0">
            <div className="flex items-center gap-3">
              <CalendarDays className="w-5 h-5 text-[var(--color-tropical-teal)]" />
              <h3 className="text-lg font-bold">Horas por Día — Esta Semana</h3>
            </div>
          </CardHeader>
          <CardBody className="px-6 py-6">
            <div className="flex items-end gap-4 h-48">
              {metrics.dailyHours.map((d: any, idx: number) => {
                const maxDailyMinutes = Math.max(
                  ...metrics.dailyHours.map((dd: any) => dd.minutes),
                  1
                );
                const heightPct =
                  maxDailyMinutes > 0
                    ? (d.minutes / maxDailyMinutes) * 100
                    : 0;
                const hours = (d.minutes / 60).toFixed(1);
                const isToday = idx === new Date().getDay();

                return (
                  <div
                    key={d.day}
                    className="flex flex-col items-center flex-1 gap-2"
                  >
                    <span className="text-xs font-mono text-gray-500">
                      {hours}h
                    </span>
                    <div className="w-full relative" style={{ height: "140px" }}>
                      <div
                        className={`absolute bottom-0 w-full rounded-t-lg transition-all duration-700 ${
                          isToday
                            ? "bg-gradient-to-t from-[var(--color-electric-sapphire)] to-[var(--color-tropical-teal)]"
                            : "bg-gradient-to-t from-[var(--color-maya-blue)]/60 to-[var(--color-maya-blue)]/20"
                        }`}
                        style={{
                          height: `${Math.max(heightPct, 2)}%`,
                        }}
                      />
                    </div>
                    <span
                      className={`text-xs font-semibold ${
                        isToday
                          ? "text-[var(--color-tropical-teal)]"
                          : "text-gray-400"
                      }`}
                    >
                      {d.day}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Compliance Gauge */}
      <Card className="bg-white shadow-md border-none">
        <CardHeader className="px-6 pt-5 pb-0">
          <div className="flex items-center gap-3">
            <BarChart3 className="w-5 h-5 text-[var(--color-electric-sapphire)]" />
            <h3 className="text-lg font-bold">Indicador de Cumplimiento</h3>
          </div>
        </CardHeader>
        <CardBody className="px-6 py-6">
          <div className="flex items-center justify-center">
            <div className="relative w-48 h-48">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                <circle
                  cx="60"
                  cy="60"
                  r="50"
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="12"
                />
                <circle
                  cx="60"
                  cy="60"
                  r="50"
                  fill="none"
                  stroke={
                    metrics.scheduleCompliance >= 80
                      ? "#10b981"
                      : metrics.scheduleCompliance >= 50
                        ? "#f59e0b"
                        : "#ef4444"
                  }
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray={`${(metrics.scheduleCompliance / 100) * 314} 314`}
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-bold text-[var(--color-carbon-black)]">
                  {metrics.scheduleCompliance}%
                </span>
                <span className="text-xs text-gray-400 mt-1">Cumplimiento</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-4 mt-6 text-center">
            <div>
              <p className="text-2xl font-bold text-gray-400">
                {metrics.expectedMinutesToday > 0 ? `${(metrics.expectedMinutesToday / 60).toFixed(1)}h` : "—"}
              </p>
              <p className="text-xs text-gray-400">
                Esperadas hoy
              </p>
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--color-tropical-teal)]">
                {metrics.totalHoursWorked}h
              </p>
              <p className="text-xs text-gray-400">
                {aggregateGaugeLabel}
              </p>
            </div>
            <div>
              <p className={`text-2xl font-bold ${metrics.overtimeMinutes > 0 ? "text-purple-500" : "text-emerald-500"}`}>
                {metrics.overtimeMinutes}m
              </p>
              <p className="text-xs text-gray-400">Extra real</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-500">
                {metrics.weeklyLateCount}
              </p>
              <p className="text-xs text-gray-400">Retrasos semana</p>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Late Arrivals History */}
      <Card className="bg-white shadow-md border-none">
        <CardHeader className="px-6 pt-5 pb-0">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <h3 className="text-lg font-bold">Historial de Llegadas Tarde</h3>
          </div>
        </CardHeader>
        <CardBody className="px-6 py-4">
          {lateEntries.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
              <p className="text-gray-400">¡Sin llegadas tarde registradas!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {lateEntries.map((log: any) => (
                <div
                  key={log._id}
                  className="flex items-center justify-between p-3 rounded-xl border border-red-100 bg-red-50/30"
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-red-100 text-red-500 rounded-lg p-2">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">
                        {new Date(log.timestamp).toLocaleDateString("es-ES", {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                        })}
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(log.timestamp).toLocaleTimeString("es-ES", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {" — "}
                        {log.organization_id?.name || ""}
                      </p>
                    </div>
                  </div>
                  <Chip size="sm" variant="flat" color="danger">
                    +{Math.abs(log.time_variance_minutes || 0)} min
                  </Chip>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function MetricCard({
  icon,
  iconBg,
  label,
  value,
  subtext,
  subtextColor,
}: {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: string;
  subtext?: string;
  subtextColor?: string;
}) {
  return (
    <Card className="bg-white shadow-md border-none">
      <CardBody className="flex flex-row items-center gap-4 p-5">
        <div className={`rounded-xl p-3 ${iconBg}`}>{icon}</div>
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
          {subtext && (
            <p className={`text-xs ${subtextColor || "text-gray-400"}`}>
              {subtext}
            </p>
          )}
        </div>
      </CardBody>
    </Card>
  );
}
