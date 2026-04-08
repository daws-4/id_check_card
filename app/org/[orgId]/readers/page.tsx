"use client";

import { useEffect, useState } from "react";
import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell } from "@heroui/table";
import { Button } from "@heroui/button";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure } from "@heroui/modal";
import { Input } from "@heroui/input";
import { Spinner } from "@heroui/spinner";
import { useParams } from "next/navigation";
import { Wifi, WifiOff, Wrench, Activity } from "lucide-react";

interface ReaderData {
  _id: string;
  esp32_id: string;
  name?: string;
  location?: string;
  status: "active" | "inactive" | "maintenance";
  group_id?: { _id: string; name: string } | null;
  createdAt: string;
}

interface ReaderStats {
  total: number;
  today: number;
  lastReading: string | null;
}

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  active: { label: "Activo", color: "bg-emerald-500/15 text-emerald-600 border-emerald-500/25", icon: Wifi },
  inactive: { label: "Inactivo", color: "bg-gray-200 text-gray-500 border-gray-300", icon: WifiOff },
  maintenance: { label: "Mantenimiento", color: "bg-amber-500/15 text-amber-600 border-amber-500/25", icon: Wrench },
};

export default function OrgReadersPage() {
  const params = useParams();
  const orgId = params?.orgId as string;

  const [readers, setReaders] = useState<ReaderData[]>([]);
  const [stats, setStats] = useState<Record<string, ReaderStats>>({});
  const [loading, setLoading] = useState(true);

  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [editReader, setEditReader] = useState<ReaderData | null>(null);
  const [editName, setEditName] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, [orgId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [readersRes, statsRes] = await Promise.all([
        fetch(`/api/readers?organization_id=${orgId}`),
        fetch(`/api/readers/stats?organization_id=${orgId}`),
      ]);
      if (readersRes.ok) setReaders(await readersRes.json());
      if (statsRes.ok) setStats(await statsRes.json());
    } catch (error) {
      console.error("Failed to fetch readers", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEdit = (reader: ReaderData) => {
    setEditReader(reader);
    setEditName(reader.name || "");
    setEditLocation(reader.location || "");
    onOpen();
  };

  const handleSave = async (onClose: () => void) => {
    if (!editReader) return;
    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/readers/${editReader._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName, location: editLocation }),
      });
      if (res.ok) {
        await fetchData();
        onClose();
      } else {
        console.error("Failed to update reader");
      }
    } catch (error) {
      console.error("Error updating reader", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getDisplayName = (reader: ReaderData) => {
    return reader.name || reader.esp32_id;
  };

  const formatLastReading = (iso: string | null) => {
    if (!iso) return "Sin lecturas";
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "Hace un momento";
    if (diffMin < 60) return `Hace ${diffMin} min`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `Hace ${diffHours}h`;
    return d.toLocaleDateString(undefined, { timeZone: "UTC" });
  };

  // Summary cards
  const totalReaders = readers.length;
  const activeReaders = readers.filter((r) => r.status === "active").length;
  const totalReadingsToday = Object.values(stats).reduce((sum, s) => sum + s.today, 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Lectores NFC</h2>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-content1 rounded-2xl p-5 border border-divider shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Wifi className="w-5 h-5 text-blue-500" />
            </div>
            <span className="text-sm text-default-500 font-medium">Dispositivos Totales</span>
          </div>
          <p className="text-3xl font-bold text-foreground">{totalReaders}</p>
        </div>
        <div className="bg-content1 rounded-2xl p-5 border border-divider shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <Activity className="w-5 h-5 text-emerald-500" />
            </div>
            <span className="text-sm text-default-500 font-medium">Activos</span>
          </div>
          <p className="text-3xl font-bold text-foreground">
            {activeReaders}
            <span className="text-sm text-default-400 font-normal ml-1">/ {totalReaders}</span>
          </p>
        </div>
        <div className="bg-content1 rounded-2xl p-5 border border-divider shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
              <Activity className="w-5 h-5 text-violet-500" />
            </div>
            <span className="text-sm text-default-500 font-medium">Lecturas Hoy</span>
          </div>
          <p className="text-3xl font-bold text-foreground">{totalReadingsToday}</p>
        </div>
      </div>

      {/* Readers Table */}
      <Table aria-label="Readers table">
        <TableHeader>
          <TableColumn>DISPOSITIVO</TableColumn>
          <TableColumn>ID ESP32</TableColumn>
          <TableColumn>UBICACIÓN</TableColumn>
          <TableColumn>GRUPO</TableColumn>
          <TableColumn>ESTADO</TableColumn>
          <TableColumn>LECTURAS HOY</TableColumn>
          <TableColumn>ÚLTIMA LECTURA</TableColumn>
          <TableColumn>ACCIONES</TableColumn>
        </TableHeader>
        <TableBody
          items={readers}
          emptyContent={loading ? <Spinner /> : "No hay lectores asignados a esta organización."}
        >
          {(reader) => {
            const st = statusConfig[reader.status] || statusConfig.inactive;
            const StatusIcon = st.icon;
            const readerStats = stats[reader._id] || { total: 0, today: 0, lastReading: null };

            return (
              <TableRow key={reader._id}>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-semibold">{getDisplayName(reader)}</span>
                    {reader.name && (
                      <span className="text-xs text-default-400 font-mono">{reader.esp32_id}</span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="font-mono text-xs text-default-500">{reader.esp32_id}</TableCell>
                <TableCell>{reader.location || "—"}</TableCell>
                <TableCell>
                  <span className="text-xs text-default-500">
                    {reader.group_id?.name || "General"}
                  </span>
                </TableCell>
                <TableCell>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${st.color}`}>
                    <StatusIcon className="w-3.5 h-3.5" />
                    {st.label}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="font-semibold">{readerStats.today}</span>
                  <span className="text-xs text-default-400 ml-1">({readerStats.total} total)</span>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-default-500">
                    {formatLastReading(readerStats.lastReading)}
                  </span>
                </TableCell>
                <TableCell>
                  <Button size="sm" variant="flat" color="primary" onPress={() => handleOpenEdit(reader)}>
                    Editar
                  </Button>
                </TableCell>
              </TableRow>
            );
          }}
        </TableBody>
      </Table>

      {/* Edit Modal */}
      <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                Editar Lector
                {editReader && (
                  <span className="text-xs text-default-400 font-mono font-normal">{editReader.esp32_id}</span>
                )}
              </ModalHeader>
              <ModalBody>
                <Input
                  autoFocus
                  label="Nombre / Alias"
                  placeholder="Ej. Lector Principal, Comedor 1"
                  variant="bordered"
                  value={editName}
                  onValueChange={setEditName}
                  description="Un nombre descriptivo para identificar fácilmente este dispositivo."
                />
                <Input
                  label="Ubicación"
                  placeholder="Ej. Entrada Principal, Piso 2"
                  variant="bordered"
                  value={editLocation}
                  onValueChange={setEditLocation}
                  description="La ubicación física donde está instalado el lector."
                />
              </ModalBody>
              <ModalFooter>
                <Button color="danger" variant="flat" onPress={onClose}>
                  Cancelar
                </Button>
                <Button color="primary" onPress={() => handleSave(onClose)} isLoading={isSubmitting}>
                  Guardar Cambios
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
