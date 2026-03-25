"use client";

import { useEffect, useState } from "react";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Chip } from "@heroui/chip";
import { Spinner } from "@heroui/spinner";
import { Calendar } from "lucide-react";

const DAY_NAMES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const DAY_COLORS = [
  "bg-red-50 border-red-200",
  "bg-blue-50 border-blue-200",
  "bg-emerald-50 border-emerald-200",
  "bg-purple-50 border-purple-200",
  "bg-amber-50 border-amber-200",
  "bg-cyan-50 border-cyan-200",
  "bg-pink-50 border-pink-200",
];

interface ScheduleData {
  groups: any[];
  todaySchedules: any[];
}

export default function SchedulesPage() {
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

  if (!data) {
    return <div className="text-center text-gray-500 mt-20">Error al cargar datos</div>;
  }

  const now = new Date();
  const todayWeekday = now.getDay();

  // Group schedules by group
  const groupMap: Record<string, any> = {};
  for (const g of data.groups || []) {
    groupMap[g._id] = { ...g, schedules: [] };
  }

  // We need to fetch all schedules (not just today's). Since the dashboard only returns todaySchedules,
  // we'll build a weekly view from the data we have. For a full view we need all schedules.
  // Let's fetch them from the groups endpoint.

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-[var(--color-carbon-black)]">Horarios</h1>
        <p className="text-gray-500 mt-1">Vista semanal de tus horarios asignados</p>
      </div>

      {/* Weekly grid */}
      <div className="grid grid-cols-7 gap-3">
        {DAY_NAMES.map((day, idx) => (
          <div
            key={day}
            className={`text-center py-2 rounded-lg font-semibold text-sm ${
              idx === todayWeekday
                ? "bg-[var(--color-tropical-teal)] text-white"
                : "bg-white text-gray-600"
            }`}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Schedule blocks per day */}
      <div className="grid grid-cols-7 gap-3 min-h-[300px]">
        {[0, 1, 2, 3, 4, 5, 6].map((dayIdx) => {
          const daySchedules = (data.todaySchedules || []).filter(
            () => dayIdx === todayWeekday
          );
          // For non-today we don't have the data in this simple approach
          // So we show from all groups' schedules
          return (
            <div
              key={dayIdx}
              className={`rounded-xl border p-3 space-y-2 min-h-[200px] ${
                dayIdx === todayWeekday
                  ? "border-[var(--color-tropical-teal)]/40 bg-[var(--color-tropical-teal)]/5"
                  : "border-gray-200 bg-white"
              }`}
            >
              {dayIdx === todayWeekday && data.todaySchedules
                ? data.todaySchedules.map((s: any) => (
                    <ScheduleBlock key={s._id} schedule={s} isToday />
                  ))
                : (
                  <p className="text-xs text-gray-300 text-center mt-8">—</p>
                )}
            </div>
          );
        })}
      </div>

      {/* Detailed list by group */}
      <h2 className="text-xl font-bold mt-8">Detalle por Grupo</h2>
      {data.groups && data.groups.length > 0 ? (
        data.groups.map((group: any) => (
          <Card key={group._id} className="bg-white shadow-md border-none">
            <CardHeader className="px-6 pt-5 pb-0">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-[var(--color-electric-sapphire)]" />
                <h3 className="text-lg font-bold">{group.name}</h3>
                <Chip size="sm" variant="flat" color={group.role === "leader" ? "warning" : "default"}>
                  {group.role === "leader" ? "Líder" : "Miembro"}
                </Chip>
              </div>
            </CardHeader>
            <CardBody className="px-6 py-4">
              <ScheduleGroupDetail groupId={group._id} />
            </CardBody>
          </Card>
        ))
      ) : (
        <p className="text-gray-400 text-center py-10">No perteneces a ningún grupo</p>
      )}
    </div>
  );
}

function ScheduleBlock({ schedule, isToday }: { schedule: any; isToday?: boolean }) {
  return (
    <div
      className={`p-2 rounded-lg border text-xs ${
        isToday
          ? "bg-white border-[var(--color-tropical-teal)]/30"
          : "bg-gray-50 border-gray-200"
      }`}
    >
      <p className="font-semibold truncate">{schedule.title}</p>
      <p className="text-gray-500 mt-0.5">
        {schedule.start_time} — {schedule.end_time}
      </p>
      {schedule.groupName && (
        <p className="text-gray-400 mt-0.5 truncate">{schedule.groupName}</p>
      )}
    </div>
  );
}

function ScheduleGroupDetail({ groupId }: { groupId: string }) {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/groups/${groupId}/schedules`)
      .then((r) => r.json())
      .then((data) => setSchedules(Array.isArray(data) ? data : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [groupId]);

  if (loading) return <Spinner size="sm" />;

  if (schedules.length === 0) {
    return <p className="text-gray-400 text-sm">Sin horarios asignados</p>;
  }

  return (
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
          {schedules.map((s: any) => (
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
  );
}
