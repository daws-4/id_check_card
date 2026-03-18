"use client";

import { useEffect, useState } from "react";
import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell } from "@heroui/table";
import { Button } from "@heroui/button";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure } from "@heroui/modal";
import { Input } from "@heroui/input";
import { Select, SelectItem } from "@heroui/select";
import { Spinner } from "@heroui/spinner";

interface Organization {
  _id: string;
  name: string;
}

interface Reader {
  _id: string;
  esp32_id: string;
  organization_id: Organization | null;
  location?: string;
  status: string;
}

export default function ReadersPage() {
  const [readers, setReaders] = useState<Reader[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  
  // Form State
  const [selectedReader, setSelectedReader] = useState<Reader | null>(null);
  const [esp32Id, setEsp32Id] = useState("");
  const [orgId, setOrgId] = useState("");
  const [location, setLocation] = useState("");
  const [status, setStatus] = useState("active");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [readersRes, orgsRes] = await Promise.all([
        fetch("/api/readers"),
        fetch("/api/organizations")
      ]);
      
      if (readersRes.ok) setReaders(await readersRes.json());
      if (orgsRes.ok) setOrganizations(await orgsRes.json());
    } catch (error) {
      console.error("Failed to fetch data", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (reader?: Reader) => {
    if (reader) {
      setSelectedReader(reader);
      setEsp32Id(reader.esp32_id);
      setOrgId(reader.organization_id?._id || "");
      setLocation(reader.location || "");
      setStatus(reader.status);
    } else {
      setSelectedReader(null);
      setEsp32Id("");
      setOrgId("");
      setLocation("");
      setStatus("active");
    }
    onOpen();
  };

  const handleSubmit = async (onClose: () => void) => {
    try {
      setIsSubmitting(true);
      
      const payload = {
        esp32_id: esp32Id,
        organization_id: orgId,
        location,
        status
      };

      const url = selectedReader ? `/api/readers/${selectedReader._id}` : "/api/readers";
      const method = selectedReader ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      if (res.ok) {
        await fetchData();
        onClose();
      } else {
        console.error("Failed to save reader");
      }
    } catch (error) {
      console.error("Error saving reader", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Lectores y Dispositivos</h2>
        <Button color="primary" onPress={() => handleOpenModal()}>
          Agregar Lector
        </Button>
      </div>

      <Table aria-label="Readers table">
        <TableHeader>
          <TableColumn>ID ESP32</TableColumn>
          <TableColumn>ORGANIZACIÓN</TableColumn>
          <TableColumn>UBICACIÓN</TableColumn>
          <TableColumn>ESTADO</TableColumn>
          <TableColumn>ACCIONES</TableColumn>
        </TableHeader>
        <TableBody
          items={readers}
          emptyContent={loading ? <Spinner /> : "No se encontraron lectores."}
        >
          {(reader) => (
            <TableRow key={reader._id}>
              <TableCell className="font-mono">{reader.esp32_id}</TableCell>
              <TableCell>{reader.organization_id?.name || "Sin asignar"}</TableCell>
              <TableCell>{reader.location || "N/A"}</TableCell>
              <TableCell>
                <span className={`capitalize px-2 py-1 rounded-full text-xs ${reader.status === 'active' ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger'}`}>
                  {reader.status === 'active' ? 'activo' : reader.status === 'inactive' ? 'inactivo' : 'mantenimiento'}
                </span>
              </TableCell>
              <TableCell>
                <Button size="sm" variant="flat" onPress={() => handleOpenModal(reader)}>
                  Editar/Reasignar
                </Button>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                {selectedReader ? "Editar/Reasignar Lector" : "Registrar Nuevo Lector"}
              </ModalHeader>
              <ModalBody>
                <Input 
                  label="ID ESP32" 
                  placeholder="ej. DEV_001" 
                  variant="bordered"
                  value={esp32Id}
                  onValueChange={setEsp32Id}
                  isDisabled={!!selectedReader} // Don't allow changing the physical ID easily
                />
                
                <Select 
                  label="Organización" 
                  placeholder="Selecciona una organización"
                  variant="bordered" 
                  selectedKeys={orgId ? [orgId] : []}
                  onChange={(e) => setOrgId(e.target.value)}
                >
                  {organizations.map((org) => (
                    <SelectItem key={org._id}>
                      {org.name}
                    </SelectItem>
                  ))}
                </Select>

                <Input 
                  label="Ubicación (Opcional)" 
                  placeholder="ej. Entrada Principal" 
                  variant="bordered"
                  value={location}
                  onValueChange={setLocation}
                />

                <Select 
                  label="Estado" 
                  variant="bordered" 
                  selectedKeys={[status]}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <SelectItem key="active">Activo</SelectItem>
                  <SelectItem key="inactive">Inactivo</SelectItem>
                  <SelectItem key="maintenance">Mantenimiento</SelectItem>
                </Select>
              </ModalBody>
              <ModalFooter>
                <Button color="danger" variant="flat" onPress={onClose}>
                  Cancelar
                </Button>
                <Button color="primary" onPress={() => handleSubmit(onClose)} isLoading={isSubmitting}>
                  {selectedReader ? "Guardar Cambios" : "Registrar"}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
