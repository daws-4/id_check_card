"use client";

import { useEffect, useState } from "react";
import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell } from "@heroui/table";
import { Button } from "@heroui/button";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure } from "@heroui/modal";
import { Input } from "@heroui/input";
import { Select, SelectItem } from "@heroui/select";
import { Spinner } from "@heroui/spinner";
import { Pagination } from "@heroui/pagination";
import { useParams, useRouter } from "next/navigation";
import { Search, Plus } from "lucide-react";

interface Group {
  _id: string;
  name: string;
  type: string;
}

export default function GroupsPage() {
  const params = useParams();
  const orgId = params?.orgId as string;
  const router = useRouter();

  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  
  // Form State
  const [name, setName] = useState("");
  const [type, setType] = useState("work");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pagination & Search State
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  useEffect(() => {
    fetchGroups();
  }, [orgId, page, limit, search]);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/groups?organization_id=${orgId}&page=${page}&limit=${limit}&search=${search}`);
      if (res.ok) {
        const data = await res.json();
        setGroups(data.groups);
        setTotal(data.total);
        setTotalPages(data.pages);
      }
    } catch (error) {
      console.error("Failed to fetch groups", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (onClose: () => void) => {
    try {
      setIsSubmitting(true);
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organization_id: orgId, name, type }),
      });
      
      if (res.ok) {
        await fetchGroups();
        onClose();
        setName("");
        setType("work");
      } else {
        console.error("Failed to create group");
      }
    } catch (error) {
      console.error("Error creating group", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h2 className="text-2xl font-bold">Grupos de la Organización</h2>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Input 
            placeholder="Buscar grupos..." 
            startContent={<Search className="w-4 h-4 text-gray-400" />}
            value={search}
            onValueChange={(v) => { setSearch(v); setPage(1); }}
            className="w-full sm:w-64"
            size="sm"
            variant="bordered"
          />
          <Button color="primary" onPress={onOpen} startContent={<Plus className="w-4 h-4" />}>
            Crear Grupo
          </Button>
        </div>
      </div>

      <Table aria-label="Groups table" selectionMode="single" onRowAction={(key) => router.push(`/org/${orgId}/groups/${key}`)}>
        <TableHeader>
          <TableColumn>NOMBRE</TableColumn>
          <TableColumn>TIPO</TableColumn>
          <TableColumn>ACCIONES</TableColumn>
        </TableHeader>
        <TableBody
          items={groups}
          emptyContent={loading ? <Spinner /> : "No se encontraron grupos."}
        >
          {(group) => (
            <TableRow key={group._id} className="cursor-pointer hover:bg-default-100">
              <TableCell className="font-semibold">{group.name}</TableCell>
              <TableCell>
                <span className="capitalize px-2 py-1 bg-default-200 rounded-full text-xs">
                  {group.type}
                </span>
              </TableCell>
              <TableCell>
                <Button size="sm" variant="flat" onPress={() => router.push(`/org/${orgId}/groups/${group._id}`)}>
                  Ver Detalles
                </Button>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {/* Pagination */}
      <div className="p-4 bg-white dark:bg-[#1a1b1e] rounded-2xl shadow-sm border border-gray-100 dark:border-default-100 flex flex-col md:flex-row justify-between items-center gap-4">
        <p className="text-sm text-gray-500">Mostrando {groups.length} de {total} grupos</p>
        <Pagination
          total={totalPages}
          initialPage={1}
          page={page}
          onChange={(p) => setPage(p)}
          showControls
          color="primary"
          variant="flat"
          size="sm"
        />
      </div>

      <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">Crear Grupo</ModalHeader>
              <ModalBody>
                <Input 
                  autoFocus 
                  label="Nombre del Grupo" 
                  placeholder="Ej. Equipo de Desarrollo" 
                  variant="bordered"
                  value={name}
                  onValueChange={setName}
                />
                <Select 
                  label="Tipo" 
                  variant="bordered" 
                  selectedKeys={[type]}
                  onChange={(e) => setType(e.target.value)}
                >
                  <SelectItem key="work">Trabajo</SelectItem>
                  <SelectItem key="study">Estudio</SelectItem>
                </Select>
              </ModalBody>
              <ModalFooter>
                <Button color="danger" variant="flat" onPress={onClose}>
                  Cancelar
                </Button>
                <Button color="primary" onPress={() => handleCreate(onClose)} isLoading={isSubmitting} isDisabled={!name}>
                  Crear
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
