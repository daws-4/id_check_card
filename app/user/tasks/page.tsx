"use client";

import { useEffect, useState } from "react";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Chip } from "@heroui/chip";
import { Button } from "@heroui/button";
import { Spinner } from "@heroui/spinner";
import { ListChecks, CheckCircle2, Circle, Clock, RefreshCw } from "lucide-react";

export default function TasksPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState<string | null>(null);
  const [uncompleting, setUncompleting] = useState<string | null>(null);

  const fetchData = () => {
    setLoading(true);
    fetch("/api/user/dashboard")
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleComplete = async (taskId: string) => {
    setCompleting(taskId);
    try {
      const res = await fetch(`/api/user/tasks/${taskId}/complete`, {
        method: "POST",
      });
      if (res.ok) fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setCompleting(null);
    }
  };

  const handleUncomplete = async (taskId: string) => {
    setUncompleting(taskId);
    try {
      const res = await fetch(`/api/user/tasks/${taskId}/complete`, {
        method: "DELETE",
      });
      if (res.ok) fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setUncompleting(null);
    }
  };

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

  const { pendingTasks = [], completedTasks = [], groups = [] } = data;

  // Group tasks by group
  const groupMap: Record<string, { name: string; pending: any[]; completed: any[] }> = {};
  for (const g of groups) {
    groupMap[g._id] = { name: g.name, pending: [], completed: [] };
  }
  for (const t of pendingTasks) {
    if (groupMap[t.group_id]) groupMap[t.group_id].pending.push(t);
  }
  for (const t of completedTasks) {
    if (groupMap[t.group_id]) groupMap[t.group_id].completed.push(t);
  }

  const totalPending = pendingTasks.length;
  const totalCompleted = completedTasks.length;
  const totalTasks = totalPending + totalCompleted;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[var(--color-carbon-black)]">Tareas</h1>
          <p className="text-gray-500 mt-1">Gestiona tus tareas asignadas</p>
        </div>
        <div className="flex items-center gap-3">
          <Chip size="lg" variant="flat" color="warning" startContent={<Circle className="w-3 h-3" />}>
            {totalPending} pendientes
          </Chip>
          <Chip size="lg" variant="flat" color="success" startContent={<CheckCircle2 className="w-3 h-3" />}>
            {totalCompleted} completadas
          </Chip>
        </div>
      </div>

      {/* Progress bar */}
      {totalTasks > 0 && (
        <div className="bg-white rounded-xl p-5 shadow-md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Progreso General</span>
            <span className="text-sm font-bold text-[var(--color-tropical-teal)]">
              {Math.round((totalCompleted / totalTasks) * 100)}%
            </span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-3">
            <div
              className="bg-gradient-to-r from-[var(--color-tropical-teal)] to-[var(--color-electric-sapphire)] h-3 rounded-full transition-all duration-500"
              style={{ width: `${(totalCompleted / totalTasks) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Tasks by group */}
      {Object.entries(groupMap).map(([gId, gData]) => {
        if (gData.pending.length === 0 && gData.completed.length === 0) return null;
        return (
          <Card key={gId} className="bg-white shadow-md border-none">
            <CardHeader className="px-6 pt-5 pb-0">
              <div className="flex items-center gap-3">
                <ListChecks className="w-5 h-5 text-[var(--color-electric-sapphire)]" />
                <h3 className="text-lg font-bold">{gData.name}</h3>
                <Chip size="sm" variant="flat">
                  {gData.pending.length + gData.completed.length} tareas
                </Chip>
              </div>
            </CardHeader>
            <CardBody className="px-6 py-4 space-y-3">
              {/* Pending */}
              {gData.pending.map((t: any) => (
                <TaskRow
                  key={t._id}
                  task={t}
                  completed={false}
                  loading={completing === t._id}
                  onAction={() => handleComplete(t._id)}
                />
              ))}
              {/* Completed */}
              {gData.completed.map((t: any) => (
                <TaskRow
                  key={t._id}
                  task={t}
                  completed
                  loading={uncompleting === t._id}
                  onAction={() => handleUncomplete(t._id)}
                />
              ))}
            </CardBody>
          </Card>
        );
      })}

      {totalTasks === 0 && (
        <div className="text-center text-gray-400 py-20">
          <ListChecks className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="text-lg">Sin tareas asignadas</p>
        </div>
      )}
    </div>
  );
}

function TaskRow({
  task,
  completed,
  loading,
  onAction,
}: {
  task: any;
  completed: boolean;
  loading: boolean;
  onAction: () => void;
}) {
  const isOverdue =
    !completed && task.due_date && new Date(task.due_date) < new Date();

  return (
    <div
      className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
        completed
          ? "border-emerald-200 bg-emerald-50/50 opacity-70"
          : isOverdue
            ? "border-red-200 bg-red-50/50"
            : "border-gray-200 hover:border-[var(--color-electric-sapphire)]/30"
      }`}
    >
      <div className="flex items-start gap-3 flex-1">
        <button
          onClick={onAction}
          disabled={loading}
          className="mt-0.5 flex-shrink-0"
        >
          {completed ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          ) : (
            <Circle className="w-5 h-5 text-gray-300 hover:text-[var(--color-tropical-teal)] transition-colors" />
          )}
        </button>
        <div className="flex-1">
          <p
            className={`font-semibold text-sm ${
              completed ? "line-through text-gray-400" : ""
            }`}
          >
            {task.title}
          </p>
          {task.description && (
            <p className="text-xs text-gray-400 mt-1">{task.description}</p>
          )}
          <div className="flex items-center gap-2 mt-2">
            {task.due_date && (
              <Chip
                size="sm"
                variant="flat"
                color={isOverdue ? "danger" : "warning"}
                startContent={<Clock className="w-3 h-3" />}
              >
                {new Date(task.due_date).toLocaleDateString("es-ES", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
                {isOverdue && " (vencida)"}
              </Chip>
            )}
            {task.is_recurring && (
              <Chip
                size="sm"
                variant="flat"
                color="secondary"
                startContent={<RefreshCw className="w-3 h-3" />}
              >
                {task.recurrence === "weekly"
                  ? "Semanal"
                  : task.recurrence === "monthly"
                    ? "Mensual"
                    : "Anual"}
              </Chip>
            )}
          </div>
        </div>
      </div>
      <Button
        size="sm"
        variant="flat"
        color={completed ? "default" : "success"}
        isLoading={loading}
        onPress={onAction}
      >
        {completed ? "Desmarcar" : "Completar"}
      </Button>
    </div>
  );
}
