"use client";

import { useEffect, useState } from "react";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Chip } from "@heroui/chip";
import { Spinner } from "@heroui/spinner";
import { Calendar, Clock } from "lucide-react";

const DAY_NAMES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

const BLOCK_COLORS = [
  { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700", accent: "bg-blue-500" },
  { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", accent: "bg-emerald-500" },
  { bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-700", accent: "bg-purple-500" },
  { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", accent: "bg-amber-500" },
  { bg: "bg-cyan-50", border: "border-cyan-200", text: "text-cyan-700", accent: "bg-cyan-500" },
  { bg: "bg-pink-50", border: "border-pink-200", text: "text-pink-700", accent: "bg-pink-500" },
  { bg: "bg-rose-50", border: "border-rose-200", text: "text-rose-700", accent: "bg-rose-500" },
  { bg: "bg-indigo-50", border: "border-indigo-200", text: "text-indigo-700", accent: "bg-indigo-500" },
];

interface FullSchedule {
  _id: string;
  title: string;
  start_time: string;
  end_time: string;
  days_of_week: number[];
  groupName: string;
  groupId: string;
}

export default function SchedulesPage() {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [allSchedules, setAllSchedules] = useState<FullSchedule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      setLoading(true);
      // 1. Get dashboard data (groups list)
      const dashRes = await fetch("/api/user/dashboard");
      if (!dashRes.ok) throw new Error("Dashboard fetch failed");
      const dash = await dashRes.json();
      setDashboardData(dash);

      // 2. Fetch all schedules from every group the user belongs to
      const groups: any[] = dash.groups || [];
      const schedulePromises = groups.map(async (g: any) => {
        try {
          const res = await fetch(`/api/groups/${g._id}/schedules`);
          if (!res.ok) return [];
          const schedules = await res.json();
          return (Array.isArray(schedules) ? schedules : []).map((s: any) => ({
            ...s,
            groupName: g.name,
            groupId: g._id,
          }));
        } catch {
          return [];
        }
      });

      const results = await Promise.all(schedulePromises);
      const merged = results.flat();

      // Sort by start_time for consistent display
      merged.sort((a, b) => a.start_time.localeCompare(b.start_time));
      setAllSchedules(merged);
    } catch (error) {
      console.error("Failed to load schedule data", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner size="lg" color="primary" />
      </div>
    );
  }

  if (!dashboardData) {
    return <div className="text-center text-gray-500 mt-20">Error al cargar datos</div>;
  }

  const todayWeekday = new Date().getDay();
  const groups: any[] = dashboardData.groups || [];

  // Build a color map per group for consistent coloring
  const groupColorMap: Record<string, typeof BLOCK_COLORS[0]> = {};
  groups.forEach((g: any, idx: number) => {
    groupColorMap[g._id] = BLOCK_COLORS[idx % BLOCK_COLORS.length];
  });

  // Group schedules by day of week for the visual grid
  const schedulesByDay: Record<number, FullSchedule[]> = {};
  for (let d = 0; d < 7; d++) {
    schedulesByDay[d] = [];
  }
  for (const schedule of allSchedules) {
    for (const day of schedule.days_of_week) {
      if (day >= 0 && day <= 6) {
        schedulesByDay[day].push(schedule);
      }
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-[var(--color-carbon-black)]">Horarios</h1>
        <p className="text-gray-500 mt-1">Vista semanal de tus horarios asignados</p>
      </div>

      {/* Weekly Header */}
      <div className="grid grid-cols-7 gap-3">
        {DAY_NAMES.map((day, idx) => (
          <div
            key={day}
            className={`text-center py-2 rounded-lg font-semibold text-sm ${
              idx === todayWeekday
                ? "bg-[var(--color-tropical-teal)] text-white shadow-md shadow-[var(--color-tropical-teal)]/30"
                : "bg-white text-gray-600 border border-gray-100"
            }`}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Schedule blocks per day */}
      <div className="grid grid-cols-7 gap-3 min-h-[250px]">
        {[0, 1, 2, 3, 4, 5, 6].map((dayIdx) => {
          const daySchedules = schedulesByDay[dayIdx];
          const isToday = dayIdx === todayWeekday;

          return (
            <div
              key={dayIdx}
              className={`rounded-xl border p-2 space-y-2 min-h-[200px] transition-colors ${
                isToday
                  ? "border-[var(--color-tropical-teal)]/40 bg-[var(--color-tropical-teal)]/5"
                  : "border-gray-200 bg-white"
              }`}
            >
              {daySchedules.length > 0 ? (
                daySchedules.map((s) => {
                  const colors = groupColorMap[s.groupId] || BLOCK_COLORS[0];
                  return (
                    <div
                      key={`${s._id}-${dayIdx}`}
                      className={`p-2.5 rounded-lg border ${colors.bg} ${colors.border} relative overflow-hidden`}
                    >
                      <div className={`absolute left-0 top-0 bottom-0 w-1 ${colors.accent} rounded-l-lg`} />
                      <p className={`font-semibold text-xs ${colors.text} truncate pl-1.5`}>{s.title}</p>
                      <div className="flex items-center gap-1 mt-1 pl-1.5">
                        <Clock className={`w-3 h-3 ${colors.text} opacity-60`} />
                        <p className={`text-[11px] ${colors.text} opacity-70`}>
                          {s.start_time} — {s.end_time}
                        </p>
                      </div>
                      <p className="text-[10px] text-gray-400 mt-0.5 truncate pl-1.5">{s.groupName}</p>
                    </div>
                  );
                })
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-xs text-gray-300">Sin clases</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Detailed list by group */}
      <h2 className="text-xl font-bold mt-8">Detalle por Grupo</h2>
      {groups.length > 0 ? (
        groups.map((group: any) => {
          const groupSchedules = allSchedules.filter((s) => s.groupId === group._id);
          const colors = groupColorMap[group._id] || BLOCK_COLORS[0];

          return (
            <Card key={group._id} className="bg-white shadow-md border-none">
              <CardHeader className="px-6 pt-5 pb-0">
                <div className="flex items-center gap-3">
                  <Calendar className={`w-5 h-5 ${colors.text}`} />
                  <h3 className="text-lg font-bold">{group.name}</h3>
                  <Chip size="sm" variant="flat" color={group.role === "leader" ? "warning" : "default"}>
                    {group.role === "leader" ? "Líder" : "Miembro"}
                  </Chip>
                </div>
              </CardHeader>
              <CardBody className="px-6 py-4">
                {groupSchedules.length === 0 ? (
                  <p className="text-gray-400 text-sm">Sin horarios asignados</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-gray-400 border-b">
                          <th className="pb-3 font-medium">Actividad</th>
                          <th className="pb-3 font-medium">Hora Inicio</th>
                          <th className="pb-3 font-medium">Hora Fin</th>
                          <th className="pb-3 font-medium">Días</th>
                        </tr>
                      </thead>
                      <tbody>
                        {groupSchedules.map((s) => (
                          <tr key={s._id} className="border-b border-gray-50">
                            <td className="py-3 font-semibold">{s.title}</td>
                            <td className="py-3">{s.start_time}</td>
                            <td className="py-3">{s.end_time}</td>
                            <td className="py-3">
                              <div className="flex gap-1 flex-wrap">
                                {s.days_of_week.map((d: number) => (
                                  <Chip
                                    key={d}
                                    size="sm"
                                    variant="flat"
                                    color={d === new Date().getDay() ? "success" : "default"}
                                  >
                                    {DAY_NAMES[d]}
                                  </Chip>
                                ))}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardBody>
            </Card>
          );
        })
      ) : (
        <p className="text-gray-400 text-center py-10">No perteneces a ningún grupo</p>
      )}
    </div>
  );
}
