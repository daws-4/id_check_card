"use client";

import { useEffect, useState } from "react";
import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell } from "@heroui/table";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { Chip } from "@heroui/chip";
import { Spinner } from "@heroui/spinner";
import { useParams } from "next/navigation";
import { Download, FileSpreadsheet, FileText, Filter, CalendarDays } from "lucide-react";

interface User {
  _id: string;
  name: string;
  last_name?: string;
  email: string;
  document_id?: string;
}

interface Reader {
  _id: string;
  location: string;
  esp32_id: string;
}

interface AttendanceLog {
  _id: string;
  user_id: User;
  reader_id: Reader;
  type: string;
  status?: string;
  time_variance_minutes?: number;
  timestamp: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: "success" | "danger" | "warning" | "secondary" | "default" }> = {
  on_time: { label: "A Tiempo", color: "success" },
  late: { label: "Retraso", color: "danger" },
  early_leave: { label: "Salida Temp.", color: "warning" },
  overtime: { label: "Tiempo Extra", color: "secondary" },
  out_of_schedule: { label: "Fuera de Horario", color: "default" },
};

export default function AttendancePage() {
  const params = useParams();
  const orgId = params?.orgId as string;

  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<"excel" | "pdf" | null>(null);

  // Date filter state
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  useEffect(() => {
    fetchLogs();
  }, [orgId]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/attendance?organization_id=${orgId}`);
      if (res.ok) {
        setLogs(await res.json());
      }
    } catch (error) {
      console.error("Failed to fetch attendance logs", error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: "excel" | "pdf") => {
    setExporting(format);
    try {
      const params = new URLSearchParams({ organization_id: orgId });
      if (fromDate) params.set("from", fromDate);
      if (toDate) params.set("to", toDate);

      const res = await fetch(`/api/reports/${format}?${params.toString()}`);
      if (!res.ok) {
        const err = await res.json();
        alert(`Error al exportar: ${err.error || "Error desconocido"}`);
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = res.headers.get("Content-Disposition")?.split("filename=")[1]?.replace(/"/g, "") || `reporte.${format === "excel" ? "xlsx" : "pdf"}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(`Failed to export ${format}`, err);
      alert("Error al generar el reporte");
    } finally {
      setExporting(null);
    }
  };

  // Summary metrics
  const totalEntries = logs.filter((l) => l.type === "entrada").length;
  const totalExits = logs.filter((l) => l.type === "salida").length;
  const lateCount = logs.filter((l) => l.status === "late").length;
  const onTimeCount = logs.filter((l) => l.status === "on_time").length;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Reportes de Asistencia</h2>
          <p className="text-sm text-default-500 mt-1">
            {logs.length} registros encontrados
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            color="success"
            variant="flat"
            size="sm"
            startContent={<FileSpreadsheet className="w-4 h-4" />}
            isLoading={exporting === "excel"}
            isDisabled={exporting !== null}
            onPress={() => handleExport("excel")}
          >
            Excel
          </Button>
          <Button
            color="danger"
            variant="flat"
            size="sm"
            startContent={<FileText className="w-4 h-4" />}
            isLoading={exporting === "pdf"}
            isDisabled={exporting !== null}
            onPress={() => handleExport("pdf")}
          >
            PDF
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-default-50 rounded-xl p-4 shadow-sm border border-default-100">
          <p className="text-xs text-default-500 uppercase tracking-wider">Entradas</p>
          <p className="text-2xl font-bold text-primary mt-1">{totalEntries}</p>
        </div>
        <div className="bg-white dark:bg-default-50 rounded-xl p-4 shadow-sm border border-default-100">
          <p className="text-xs text-default-500 uppercase tracking-wider">Salidas</p>
          <p className="text-2xl font-bold text-secondary mt-1">{totalExits}</p>
        </div>
        <div className="bg-white dark:bg-default-50 rounded-xl p-4 shadow-sm border border-default-100">
          <p className="text-xs text-default-500 uppercase tracking-wider">A Tiempo</p>
          <p className="text-2xl font-bold text-success mt-1">{onTimeCount}</p>
        </div>
        <div className="bg-white dark:bg-default-50 rounded-xl p-4 shadow-sm border border-default-100">
          <p className="text-xs text-default-500 uppercase tracking-wider">Retrasos</p>
          <p className="text-2xl font-bold text-danger mt-1">{lateCount}</p>
        </div>
      </div>

      {/* Date Filters */}
      <div className="flex items-end gap-3 bg-white dark:bg-default-50 p-4 rounded-xl shadow-sm border border-default-100">
        <CalendarDays className="w-5 h-5 text-default-400 mb-2" />
        <Input
          label="Desde"
          type="date"
          variant="bordered"
          size="sm"
          value={fromDate}
          onValueChange={setFromDate}
          className="max-w-[180px]"
        />
        <Input
          label="Hasta"
          type="date"
          variant="bordered"
          size="sm"
          value={toDate}
          onValueChange={setToDate}
          className="max-w-[180px]"
        />
        <p className="text-xs text-default-400 mb-2">
          Los filtros de fecha aplican solo a las exportaciones (Excel / PDF)
        </p>
      </div>

      {/* Table */}
      <Table aria-label="Tabla de registros de asistencia">
        <TableHeader>
          <TableColumn>FECHA Y HORA</TableColumn>
          <TableColumn>NOMBRE</TableColumn>
          <TableColumn>TIPO</TableColumn>
          <TableColumn>ESTADO</TableColumn>
          <TableColumn>VARIACIÓN</TableColumn>
          <TableColumn>LECTOR</TableColumn>
        </TableHeader>
        <TableBody
          items={logs}
          emptyContent={loading ? <Spinner /> : "No se encontraron registros de asistencia."}
        >
          {(log) => (
            <TableRow key={log._id}>
              <TableCell className="font-medium whitespace-nowrap">
                {new Date(log.timestamp).toLocaleString("es-ES", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </TableCell>
              <TableCell>
                <div className="flex flex-col">
                  <span className="font-semibold">{log.user_id?.name || "Desconocido"} {log.user_id?.last_name || ""}</span>
                  <span className="text-xs text-default-500 font-mono">
                    {log.user_id?.document_id ? `C.I: ${log.user_id.document_id}` : `ID: ${log.user_id?._id || "N/A"}`}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <Chip
                  size="sm"
                  variant="flat"
                  color={log.type === "entrada" ? "success" : "warning"}
                >
                  {log.type === "entrada" ? "Entrada" : "Salida"}
                </Chip>
              </TableCell>
              <TableCell>
                {log.status && STATUS_CONFIG[log.status] ? (
                  <Chip
                    size="sm"
                    variant="dot"
                    color={STATUS_CONFIG[log.status].color}
                  >
                    {STATUS_CONFIG[log.status].label}
                  </Chip>
                ) : (
                  <span className="text-default-300">—</span>
                )}
              </TableCell>
              <TableCell>
                {log.time_variance_minutes !== undefined ? (
                  <span
                    className={`font-mono text-xs font-semibold ${
                      log.time_variance_minutes > 0
                        ? "text-danger"
                        : log.time_variance_minutes < 0
                          ? "text-success"
                          : "text-default-400"
                    }`}
                  >
                    {log.time_variance_minutes > 0 ? "+" : ""}
                    {log.time_variance_minutes} min
                  </span>
                ) : (
                  <span className="text-default-300">—</span>
                )}
              </TableCell>
              <TableCell>
                <div className="flex flex-col">
                  <span>{log.reader_id?.location || "Desconocido"}</span>
                  <span className="text-xs text-default-500 font-mono">{log.reader_id?.esp32_id || "N/A"}</span>
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
