"use client";

import { useEffect, useState } from "react";
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from "@heroui/dropdown";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure } from "@heroui/modal";
import { Input } from "@heroui/input";
import { Select, SelectItem } from "@heroui/select";
import { Spinner } from "@heroui/spinner";
import { Button } from "@heroui/button";
import { Plus, MoreVertical, Router } from "lucide-react";

interface Organization {
  _id: string;
  name: string;
}

interface Group {
  _id: string;
  name: string;
}

interface Reader {
  _id: string;
  esp32_id: string;
  organization_id: Organization | null;
  group_id?: Group | null;
  location?: string;
  status: string;
}

export default function ReadersPage() {
  const [readers, setReaders] = useState<Reader[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  
  const [groups, setGroups] = useState<Group[]>([]);
  
  // Form State
  const [selectedReader, setSelectedReader] = useState<Reader | null>(null);
  const [esp32Id, setEsp32Id] = useState("");
  const [orgId, setOrgId] = useState("");
  const [groupId, setGroupId] = useState("");
  const [location, setLocation] = useState("");
  const [status, setStatus] = useState("active");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (orgId) {
      fetch(`/api/groups?organization_id=${orgId}`)
        .then(res => res.ok ? res.json() : [])
        .then(data => setGroups(data))
        .catch(console.error);
    } else {
      setGroups([]);
    }
  }, [orgId]);

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
      setGroupId(reader.group_id?._id || "");
      setLocation(reader.location || "");
      setStatus(reader.status);
    } else {
      setSelectedReader(null);
      setEsp32Id("");
      setOrgId("");
      setGroupId("");
      setLocation("");
      setStatus("active");
    }
    onOpen();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Seguro que deseas eliminar este lector?")) return;
    try {
      const res = await fetch(`/api/readers/${id}`, { method: 'DELETE' });
      if (res.ok) await fetchData();
    } catch (error) {
      console.error("Failed to delete reader", error);
    }
  };

  const handleSubmit = async (onClose: () => void) => {
    try {
      setIsSubmitting(true);
      
      const payload = {
        esp32_id: esp32Id,
        organization_id: orgId,
        group_id: (groupId && groupId !== "none") ? groupId : undefined,
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
    <section>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h3 className="text-[var(--color-carbon-black)] text-2xl font-bold">Lectores y Dispositivos</h3>
        <button 
          onClick={() => handleOpenModal()}
          className="bg-[var(--color-maya-blue)] hover:bg-[var(--color-tropical-teal)] text-white font-medium px-5 py-2.5 rounded-xl shadow-md shadow-[var(--color-maya-blue)]/30 transition-all flex items-center gap-2 transform hover:-translate-y-0.5 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Agregar Lector
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[var(--color-lavender-mist)]/50 border-b border-gray-100">
                <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">ID ESP32</th>
                <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Organización</th>
                <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Ubicación</th>
                <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center">
                    <Spinner />
                  </td>
                </tr>
              ) : readers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-500">
                    No se encontraron lectores.
                  </td>
                </tr>
              ) : (
                readers.map((reader, idx) => (
                  <tr key={reader._id} className="hover:bg-[var(--color-lavender-mist)]/30 transition-colors group">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold bg-[var(--color-electric-sapphire)]/10 text-[var(--color-electric-sapphire)]`}>
                          <Router className="w-5 h-5" />
                        </div>
                        <span className="font-semibold text-carbon-black font-mono">{reader.esp32_id}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{reader.organization_id?.name || "Sin asignar"}</span>
                        {reader.group_id && <span className="text-xs text-gray-500 mt-0.5">Grupo: {reader.group_id.name}</span>}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-sm text-gray-600">
                      {reader.location || "N/A"}
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-3 py-1 text-xs font-medium rounded-full border ${reader.status === 'active' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'}`}>
                        {reader.status === 'active' ? 'Activo' : reader.status === 'inactive' ? 'Inactivo' : 'Mantenimiento'}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <Dropdown>
                        <DropdownTrigger>
                          <button className="p-2 text-gray-400 hover:text-[var(--color-tropical-teal)] transition-colors rounded-lg hover:bg-[var(--color-tropical-teal)]/10 cursor-pointer">
                            <MoreVertical className="w-5 h-5" />
                          </button>
                        </DropdownTrigger>
                        <DropdownMenu aria-label="Acciones">
                          <DropdownItem key="edit" onPress={() => handleOpenModal(reader)}>Editar</DropdownItem>
                          <DropdownItem key="delete" className="text-danger" color="danger" onPress={() => handleDelete(reader._id)}>Eliminar</DropdownItem>
                        </DropdownMenu>
                      </Dropdown>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

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
                    <SelectItem key={org._id} textValue={org.name}>
                      {org.name}
                    </SelectItem>
                  ))}
                </Select>

                <Select 
                  label="Grupo (Opcional)" 
                  placeholder={orgId ? "Selecciona un grupo" : "Selecciona primero una organización"}
                  variant="bordered" 
                  selectedKeys={groupId ? [groupId] : []}
                  onChange={(e) => setGroupId(e.target.value)}
                  isDisabled={!orgId || groups.length === 0}
                >
                  {[
                    <SelectItem key="none">-- Ninguno --</SelectItem>,
                    ...groups.map((group) => (
                      <SelectItem key={group._id} textValue={group.name}>
                        {group.name}
                      </SelectItem>
                    ))
                  ]}
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
    </section>
  );
}
