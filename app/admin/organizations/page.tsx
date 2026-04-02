"use client";

import { useEffect, useState } from "react";
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from "@heroui/dropdown";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure } from "@heroui/modal";
import { Input } from "@heroui/input";
import { Select, SelectItem } from "@heroui/select";
import { Spinner } from "@heroui/spinner";
import { Button } from "@heroui/button";
import { Plus, MoreVertical } from "lucide-react";

interface Organization {
  _id: string;
  name: string;
  type: string;
  tax_id?: string;
  billing_plan?: string;
  billing_rates?: {
    cost_per_active_user: number;
    cost_per_active_reader: number;
    currency: string;
  };
}

const orgTypesTranslations: Record<string, string> = {
  company: "Empresa",
  school: "Escuela",
  university: "Universidad",
  hospital: "Hospital / Clínica",
  factory: "Fábrica / Industria",
  coworking: "Espacio de Coworking",
  residential: "Conjunto Residencial",
  club: "Club Deportivo",
  event: "Evento / Conferencia",
  government: "Entidad Institucional / Gobs",
  ngo: "ONG / Fundación",
  library: "Biblioteca",
  gym: "Gimnasio",
  other: "Otro"
};

export default function OrganizationsPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [name, setName] = useState("");
  const [type, setType] = useState("company");
  const [taxId, setTaxId] = useState("");
  const [billingPlan, setBillingPlan] = useState("none");
  const [costPerUser, setCostPerUser] = useState("");
  const [costPerReader, setCostPerReader] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/organizations");
      if (res.ok) {
        const data = await res.json();
        setOrganizations(data);
      }
    } catch (error) {
      console.error("Failed to fetch organizations", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (org?: Organization) => {
    if (org) {
      setSelectedOrg(org);
      setName(org.name);
      setType(org.type);
      setTaxId(org.tax_id ? org.tax_id.replace(/^J-/, '') : "");
      setBillingPlan(org.billing_plan || "none");
      setCostPerUser(org.billing_rates?.cost_per_active_user?.toString() || "");
      setCostPerReader(org.billing_rates?.cost_per_active_reader?.toString() || "");
      setCurrency(org.billing_rates?.currency || "USD");
    } else {
      setSelectedOrg(null);
      setName("");
      setType("company");
      setTaxId("");
      setBillingPlan("none");
      setCostPerUser("");
      setCostPerReader("");
      setCurrency("USD");
    }
    onOpen();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Seguro que deseas eliminar esta organización?")) return;
    try {
      const res = await fetch(`/api/organizations/${id}`, { method: "DELETE" });
      if (res.ok) await fetchOrganizations();
    } catch (error) {
      console.error("Failed to delete organization", error);
    }
  };

  const handleSubmit = async (onClose: () => void) => {
    try {
      setIsSubmitting(true);
      const url = selectedOrg ? `/api/organizations/${selectedOrg._id}` : "/api/organizations";
      const method = selectedOrg ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          name, 
          type, 
          tax_id: taxId ? `J-${taxId}` : undefined,
          billing_plan: billingPlan,
          billing_rates: billingPlan === 'custom' ? {
            cost_per_active_user: parseFloat(costPerUser) || 0,
            cost_per_active_reader: parseFloat(costPerReader) || 0,
            currency: currency
          } : undefined
        }),
      });
      
      if (res.ok) {
        await fetchOrganizations();
        onClose();
      } else {
        console.error("Failed to save organization");
      }
    } catch (error) {
      console.error("Error saving organization", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getInitials = (orgName: string) => {
    return orgName.substring(0, 2).toUpperCase();
  };

  return (
    <section>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h3 className="text-[var(--color-carbon-black)] dark:text-gray-100 text-2xl font-bold">Organizaciones</h3>
        <button 
          onClick={() => handleOpenModal()}
          className="bg-[var(--color-maya-blue)] hover:bg-[var(--color-tropical-teal)] text-white font-medium px-5 py-2.5 rounded-xl shadow-md shadow-[var(--color-maya-blue)]/30 transition-all flex items-center gap-2 transform hover:-translate-y-0.5 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Agregar Organización
        </button>
      </div>

      {/* Tabla de Organizaciones */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-100 dark:border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[var(--color-lavender-mist)]/50 dark:bg-white/5 border-b border-gray-100 dark:border-white/10">
                <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Nombre</th>
                <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Tipo</th>
                <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">RIF</th>
                <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">ID</th>
                <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/10">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-500">
                    <Spinner />
                  </td>
                </tr>
              ) : organizations.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-500">
                    No se encontraron organizaciones.
                  </td>
                </tr>
              ) : (
                organizations.map((org, idx) => (
                  <tr key={org._id} className="hover:bg-[var(--color-lavender-mist)]/30 dark:hover:bg-white/5 transition-colors group">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold ${idx % 2 === 0 ? 'bg-[var(--color-tropical-teal)]/10 dark:bg-[var(--color-tropical-teal)]/20 text-[var(--color-tropical-teal)]' : 'bg-[var(--color-electric-sapphire)]/10 dark:bg-[var(--color-electric-sapphire)]/20 text-[var(--color-electric-sapphire)]'}`}>
                          {getInitials(org.name)}
                        </div>
                        <span className="font-semibold text-[var(--color-carbon-black)] dark:text-gray-100">{org.name}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-3 py-1 text-xs font-medium rounded-full border ${idx % 2 === 0 ? 'bg-[var(--color-maya-blue)]/10 text-[var(--color-maya-blue)] border-[var(--color-maya-blue)]/20 dark:bg-[var(--color-maya-blue)]/20 dark:border-[var(--color-maya-blue)]/30' : 'bg-[var(--color-electric-sapphire)]/10 text-[var(--color-electric-sapphire)] border-[var(--color-electric-sapphire)]/20 dark:bg-[var(--color-electric-sapphire)]/20 dark:border-[var(--color-electric-sapphire)]/30'}`}>
                        {orgTypesTranslations[org.type] || org.type}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-sm text-gray-500 font-mono">
                      {org.tax_id || "—"}
                    </td>
                    <td className="py-4 px-6 text-sm text-gray-500 font-mono">
                      {org._id}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <Dropdown>
                        <DropdownTrigger>
                          <button className="p-2 text-gray-400 hover:text-[var(--color-tropical-teal)] transition-colors rounded-lg hover:bg-[var(--color-tropical-teal)]/10 cursor-pointer">
                            <MoreVertical className="w-5 h-5" />
                          </button>
                        </DropdownTrigger>
                        <DropdownMenu aria-label="Acciones">
                          <DropdownItem key="view" href={`/org/${org._id}`}>Ver Panel</DropdownItem>
                          <DropdownItem key="edit" onPress={() => handleOpenModal(org)}>Editar</DropdownItem>
                          <DropdownItem key="delete" className="text-danger" color="danger" onPress={() => handleDelete(org._id)}>Eliminar</DropdownItem>
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
              <ModalHeader className="flex flex-col gap-1">{selectedOrg ? "Editar Organización" : "Crear Organización"}</ModalHeader>
              <ModalBody>
                <Input 
                  autoFocus 
                  label="Nombre" 
                  placeholder="Ingresa el nombre de la organización" 
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
                  <SelectItem key="company">Empresa</SelectItem>
                  <SelectItem key="school">Escuela</SelectItem>
                  <SelectItem key="university">Universidad</SelectItem>
                  <SelectItem key="hospital">Hospital / Clínica</SelectItem>
                  <SelectItem key="factory">Fábrica / Industria</SelectItem>
                  <SelectItem key="coworking">Espacio de Coworking</SelectItem>
                  <SelectItem key="residential">Conjunto Residencial</SelectItem>
                  <SelectItem key="club">Club Deportivo</SelectItem>
                  <SelectItem key="event">Evento / Conferencia</SelectItem>
                  <SelectItem key="government">Entidad Institucional / Gobs</SelectItem>
                  <SelectItem key="ngo">ONG / Fundación</SelectItem>
                  <SelectItem key="library">Biblioteca</SelectItem>
                  <SelectItem key="gym">Gimnasio</SelectItem>
                  <SelectItem key="other">Otro</SelectItem>
                </Select>
                <div className="flex gap-2 items-end">
                  <span className="text-sm font-semibold text-gray-500 pb-2.5 flex-shrink-0">J-</span>
                  <Input 
                    label="RIF (Número de Identificación Fiscal)" 
                    placeholder="Ej. 123456789" 
                    variant="bordered"
                    value={taxId}
                    onValueChange={(v) => setTaxId(v.replace(/\D/g, ''))}
                    description="El RIF se guarda automáticamente con el prefijo J-"
                  />
                </div>

                <div className="mt-4 border-t border-gray-100 pt-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Configuración de Facturación</h4>
                  <Select 
                    label="Plan de Facturación" 
                    variant="bordered" 
                    selectedKeys={[billingPlan]}
                    onChange={(e) => setBillingPlan(e.target.value)}
                  >
                    <SelectItem key="none">Ninguno (No facturar)</SelectItem>
                    <SelectItem key="default">Tarifa por Defecto / Global</SelectItem>
                    <SelectItem key="custom">Tarifa Personalizada</SelectItem>
                  </Select>
                  
                  {billingPlan === 'custom' && (
                    <div className="grid grid-cols-2 gap-3 mt-3">
                      <Input 
                        label="Costo p/usuario" 
                        type="number"
                        step="0.01"
                        variant="bordered"
                        value={costPerUser}
                        onValueChange={setCostPerUser}
                        startContent={<span className="text-gray-400 text-sm">$</span>}
                      />
                      <Input 
                        label="Costo p/lector" 
                        type="number"
                        step="0.01"
                        variant="bordered"
                        value={costPerReader}
                        onValueChange={setCostPerReader}
                        startContent={<span className="text-gray-400 text-sm">$</span>}
                      />
                      <Select 
                        label="Moneda" 
                        variant="bordered" 
                        selectedKeys={[currency]}
                        onChange={(e) => setCurrency(e.target.value)}
                        className="col-span-2"
                      >
                        <SelectItem key="USD">USD (Dólares)</SelectItem>
                        <SelectItem key="VES">VES (Bolívares)</SelectItem>
                      </Select>
                    </div>
                  )}
                </div>
              </ModalBody>
              <ModalFooter>
                <Button color="danger" variant="flat" onPress={onClose}>
                  Cancelar
                </Button>
                <Button color="primary" onPress={() => handleSubmit(onClose)} isLoading={isSubmitting}>
                  {selectedOrg ? "Guardar Cambios" : "Crear"}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </section>
  );
}
