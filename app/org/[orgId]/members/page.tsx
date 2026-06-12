"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@heroui/button";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure } from "@heroui/modal";
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from "@heroui/dropdown";
import { Input } from "@heroui/input";
import { Select, SelectItem } from "@heroui/select";
import { Checkbox } from "@heroui/checkbox";
import { Autocomplete, AutocompleteItem } from "@heroui/autocomplete";
import { Spinner } from "@heroui/spinner";
import { Pagination } from "@heroui/pagination";
import { useParams } from "next/navigation";
import { MoreVertical, Search, Plus, Trash2, CreditCard, Clock, X } from "lucide-react";

interface User {
  _id: string;
  name: string;
  last_name?: string;
  email: string;
  has_nfc_card?: boolean;
  document_id?: string;
  role: string;
  status?: string;
}

interface Membership {
  _id: string;
  user_id: User;
  role: string;
  plan_name?: string;
  plan_status?: 'active' | 'expired' | 'suspended';
  expiration_date?: string;
  remaining_sessions?: number;
  notes?: string;
  createdAt: string;
}

export default function MembersPage() {
  const params = useParams();
  const orgId = params?.orgId as string;

  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set());
  const [isBulkLoading, setIsBulkLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pagination & Search State
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [search, setSearch] = useState("");
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Subscription capacity states
  const [orgLimit, setOrgLimit] = useState<number | null>(null);
  const [orgActiveCount, setOrgActiveCount] = useState<number>(0);

  // Form State
  const [mode, setMode] = useState<"select" | "create">("select");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [role, setRole] = useState("user");
  // New User State
  const [newName, setNewName] = useState("");
  const [newLastName, setNewLastName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newBirthDate, setNewBirthDate] = useState("");
  const [newDocumentId, setNewDocumentId] = useState("");
  const [newDocPrefix, setNewDocPrefix] = useState("V");
  const [newBloodType, setNewBloodType] = useState("");
  const [newUserType, setNewUserType] = useState("worker");
  const [newStrictSchedule, setNewStrictSchedule] = useState(false);

  const [orgType, setOrgType] = useState<string>("");
  const [requiresMembership, setRequiresMembership] = useState(false);

  const { 
    isOpen: isGymModalOpen, 
    onOpen: onGymModalOpen, 
    onOpenChange: onGymModalOpenChange 
  } = useDisclosure();
  const [selectedMembership, setSelectedMembership] = useState<Membership | null>(null);
  
  // Gym membership form states
  const [gymPlanName, setGymPlanName] = useState("");
  const [gymPlanStatus, setGymPlanStatus] = useState<'active' | 'expired' | 'suspended'>('active');
  const [gymExpirationDate, setGymExpirationDate] = useState("");
  const [gymRemainingSessions, setGymRemainingSessions] = useState<number | "">("");
  const [gymNotes, setGymNotes] = useState("");
  const [isUpdatingGymPlan, setIsUpdatingGymPlan] = useState(false);

  useEffect(() => {
    fetchData();
  }, [orgId, page, limit, search]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [membersRes, usersRes, orgRes, previewRes] = await Promise.all([
        fetch(`/api/memberships?organization_id=${orgId}&page=${page}&limit=${limit}&search=${search}`),
        fetch("/api/users?limit=100"),
        fetch(`/api/organizations/${orgId}`),
        fetch(`/api/billing/preview/${orgId}`)
      ]);
      
      if (membersRes.ok) {
        const data = await membersRes.json();
        setMemberships(data.memberships);
        setTotal(data.total);
        setTotalPages(data.pages);
      }
      if (usersRes.ok) {
        const data = await usersRes.json();
        setUsers(data.users || data);
      }
      if (orgRes.ok) {
        const orgData = await orgRes.json();
        setOrgLimit(orgData.max_users_limit || 50);
        setOrgType(orgData.type || "");
        const type = orgData.type || "";
        const validationEnabled = type === 'gym' || type === 'membership_venue';
        setRequiresMembership(!!validationEnabled);
      }
      if (previewRes.ok) {
        const previewData = await previewRes.json();
        setOrgActiveCount(previewData.active_users_count || 0);
      }
    } catch (error) {
      console.error("Failed to fetch data", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = () => {
    setMode("select");
    setSelectedUserId("");
    setSearchTerm("");
    setRole("user");
    setNewName("");
    setNewLastName("");
    setNewEmail("");
    setNewBirthDate("");
    setNewDocumentId("");
    setNewDocPrefix("V");
    setNewBloodType("");
    setNewUserType("worker");
    setNewStrictSchedule(false);
    onOpen();
  };

  const handleAddMember = async (onClose: () => void) => {
    try {
      if (orgLimit !== null && orgActiveCount >= orgLimit) {
        alert(`Límite de usuarios alcanzado (${orgActiveCount} / ${orgLimit}). No puedes agregar más miembros en tu plan actual. Contacta al administrador del sistema.`);
        return;
      }

      setIsSubmitting(true);
      
      let finalUserId = selectedUserId;
      let membershipCreatedInApi = false;
      
      if (mode === "create") {
        const createRes = await fetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            name: newName, 
            last_name: newLastName,
            email: newEmail, 
            birth_date: newBirthDate || undefined,
            document_id: newDocumentId ? `${newDocPrefix}-${newDocumentId}` : undefined,
            blood_type: newBloodType,
            user_type: newUserType,
            strict_schedule_enforcement: newStrictSchedule,
            organization_id: orgId,
            role: role === "admin" ? "org_admin" : "user" 
          }),
        });
        if (!createRes.ok) {
           const errData = await createRes.json().catch(() => ({}));
           alert(`Error: ${errData.message || errData.error || "El correo ya existe para este rol"}`);
           console.error("Failed to create user", errData);
           setIsSubmitting(false);
           return;
        }
        const createData = await createRes.json();
        finalUserId = createData.user._id;
        
        if (role === "admin") {
          membershipCreatedInApi = true;
        }
      }

      if (!membershipCreatedInApi) {
        const payload = {
          user_id: finalUserId,
          organization_id: orgId,
          role
        };

        const res = await fetch("/api/memberships", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          alert(`Error al asociar miembro: ${errData.message || errData.error || "No se pudo procesar la solicitud"}`);
          setIsSubmitting(false);
          return;
        }
      }

      // Refresh regardless
      await fetchData();
      onClose();
    } catch (error) {
      console.error("Error adding member", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPlanStatusBadge = (status?: string) => {
    switch (status) {
      case 'active': return <span className="px-2 py-1 rounded-full text-xs font-medium bg-success/20 text-success">Activo</span>;
      case 'suspended': return <span className="px-2 py-1 rounded-full text-xs font-medium bg-warning/20 text-warning">Suspendido</span>;
      case 'expired': return <span className="px-2 py-1 rounded-full text-xs font-medium bg-danger/20 text-danger">Vencido</span>;
      default: return <span className="px-2 py-1 rounded-full text-xs font-medium bg-default-200">Sin Plan</span>;
    }
  };

  const handleOpenGymModal = (membership: Membership) => {
    setSelectedMembership(membership);
    setGymPlanName(membership.plan_name || "");
    setGymPlanStatus(membership.plan_status || "active");
    setGymExpirationDate(
      membership.expiration_date 
        ? new Date(membership.expiration_date).toISOString().split('T')[0] 
        : ""
    );
    setGymRemainingSessions(
      membership.remaining_sessions !== undefined && membership.remaining_sessions !== null
        ? membership.remaining_sessions
        : ""
    );
    setGymNotes(membership.notes || "");
    onGymModalOpen();
  };

  const handleUpdateGymMembership = async (onClose: () => void) => {
    if (!selectedMembership) return;
    setIsUpdatingGymPlan(true);
    try {
      const res = await fetch(`/api/memberships/${selectedMembership._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan_name: gymPlanName,
          plan_status: gymPlanStatus,
          expiration_date: gymExpirationDate ? new Date(gymExpirationDate) : null,
          remaining_sessions: gymRemainingSessions !== "" ? Number(gymRemainingSessions) : null,
          notes: gymNotes
        })
      });

      if (res.ok) {
        alert("Membresía actualizada con éxito");
        await fetchData();
        onClose();
      } else {
        const err = await res.json();
        alert(`Error al actualizar membresía: ${err.error || "Error desconocido"}`);
      }
    } catch (error) {
      console.error("Error updating gym membership", error);
      alert("Error al guardar cambios");
    } finally {
      setIsUpdatingGymPlan(false);
    }
  };

  const toggleAll = () => {
    if (selectedMemberIds.size === memberships.length) {
      setSelectedMemberIds(new Set());
    } else {
      setSelectedMemberIds(new Set(memberships.map(m => m._id)));
    }
  };

  const toggleMember = (id: string) => {
    const next = new Set(selectedMemberIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedMemberIds(next);
  };

  const handleBulkAction = async (action: 'delete' | 'assign_card' | 'enable_strict' | 'disable_strict') => {
    const idsToProcess = Array.from(selectedMemberIds);

    if (idsToProcess.length === 0) return;

    if (action === 'delete') {
      if (!confirm(`¿Eliminar ${idsToProcess.length} miembro(s) de la organización?`)) return;
      try {
        setIsBulkLoading(true);
        const res = await fetch('/api/memberships/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ membershipIds: idsToProcess })
        });
        if (res.ok) {
          setSelectedMemberIds(new Set());
          await fetchData();
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsBulkLoading(false);
      }
    } else if (action === 'assign_card') {
      if (!confirm(`¿Asignar tarjeta NFC a ${idsToProcess.length} miembro(s)?`)) return;
      try {
        setIsBulkLoading(true);
        const membershipsMap = new Map(memberships.map(m => [m._id, m.user_id._id]));
        const userIds = idsToProcess.map(mId => membershipsMap.get(mId)).filter(Boolean);
        
        const res = await fetch('/api/users/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'assign_card', userIds })
        });
        if (res.ok) {
          setSelectedMemberIds(new Set());
          await fetchData();
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsBulkLoading(false);
      }
    } else if (action === 'enable_strict' || action === 'disable_strict') {
      const verb = action === 'enable_strict' ? 'Activar' : 'Desactivar';
      if (!confirm(`¿${verb} Horario Estricto a ${idsToProcess.length} miembro(s)?`)) return;
      try {
        setIsBulkLoading(true);
        const membershipsMap = new Map(memberships.map(m => [m._id, m.user_id._id]));
        const userIds = idsToProcess.map(mId => membershipsMap.get(mId)).filter(Boolean);
        
        const res = await fetch('/api/users/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, userIds })
        });
        if (res.ok) {
          setSelectedMemberIds(new Set());
          await fetchData();
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsBulkLoading(false);
      }
    }
  };

  const handleRemoveMember = async (membershipId: string) => {
    if (!confirm("¿Eliminar este miembro de la organización?")) return;
    try {
      const res = await fetch('/api/memberships/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ membershipIds: [membershipId] })
      });
      if (res.ok) await fetchData();
    } catch (err) { console.error(err); }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'active': return <span className="px-2 py-1 rounded-full text-xs font-medium bg-success/20 text-success">Activo</span>;
      case 'pending': return <span className="px-2 py-1 rounded-full text-xs font-medium bg-warning/20 text-warning">Pendiente</span>;
      default: return <span className="px-2 py-1 rounded-full text-xs font-medium bg-danger/20 text-danger">Inactivo</span>;
    }
  };

  const selectedCount = selectedMemberIds.size;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <h2 className="text-2xl font-bold">Miembros de la Organización</h2>
          {orgLimit !== null && (
            <span className={`text-xs font-semibold px-3 py-1 rounded-full border inline-flex w-fit items-center gap-1.5 ${
              orgActiveCount >= orgLimit
                ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200/50'
                : 'bg-gray-50 dark:bg-zinc-800 text-gray-600 dark:text-gray-300 border-divider'
            }`}>
              Capacidad: {orgActiveCount} / {orgLimit} activos {orgActiveCount >= orgLimit && '⚠️ Límite Alcanzado'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {selectedCount > 0 && (
            <>
              <Button color="secondary" variant="flat" size="sm" isLoading={isBulkLoading} onPress={() => handleBulkAction('assign_card')}>
                Tarjeta ({selectedCount})
              </Button>
              <Button color="warning" variant="flat" size="sm" isLoading={isBulkLoading} onPress={() => handleBulkAction('enable_strict')}>
                + Estricto
              </Button>
              <Button color="default" variant="flat" size="sm" isLoading={isBulkLoading} onPress={() => handleBulkAction('disable_strict')}>
                - Estricto
              </Button>
              <Button color="danger" variant="flat" size="sm" isLoading={isBulkLoading} onPress={() => handleBulkAction('delete')}>
                Eliminar ({selectedCount})
              </Button>
            </>
          )}
          <Input 
            placeholder="Buscar por nombre, email, cédula..." 
            startContent={<Search className="w-4 h-4 text-gray-400" />}
            value={search}
            onValueChange={(v) => { setSearch(v); setPage(1); }}
            className="w-full md:w-64"
            size="sm"
            variant="bordered"
          />
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 whitespace-nowrap">Mostrar:</span>
            <select 
              className="bg-transparent border border-divider rounded-lg text-xs p-1 cursor-pointer"
              value={limit}
              onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
            >
              {[15, 30, 50, 100].map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <Button 
            color={orgLimit !== null && orgActiveCount >= orgLimit ? "danger" : "primary"} 
            onPress={handleOpenModal} 
            startContent={<Plus className="w-4 h-4" />}
            isDisabled={orgLimit !== null && orgActiveCount >= orgLimit}
          >
            {orgLimit !== null && orgActiveCount >= orgLimit ? "Límite Alcanzado" : "Agregar Miembro"}
          </Button>
        </div>
      </div>

      <div className="bg-content1 rounded-2xl shadow-sm border border-divider overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-default-50/50 border-b border-divider">
                <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider w-12">
                  <Checkbox
                    isSelected={memberships.length > 0 && selectedMemberIds.size === memberships.length}
                    onValueChange={toggleAll}
                  />
                </th>
                <th className="py-4 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">NOMBRE</th>
                <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">CORREO</th>
                {requiresMembership ? (
                  <>
                    <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">PLAN</th>
                    <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">ESTADO PLAN</th>
                    <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">SESIONES</th>
                    <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">VENCIMIENTO</th>
                  </>
                ) : (
                  <>
                    <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">ESTADO</th>
                    <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">TIENE TARJETA</th>
                    <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">SE UNIÓ</th>
                  </>
                )}
                <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">ROL</th>
                <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">ACCIONES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-default-100">
              {loading ? (
                <tr>
                  <td colSpan={requiresMembership ? 9 : 8} className="py-8 text-center">
                    <Spinner />
                  </td>
                </tr>
              ) : memberships.length === 0 ? (
                <tr>
                  <td colSpan={requiresMembership ? 9 : 8} className="py-8 text-center text-gray-500">
                    No se encontraron miembros en esta organización.
                  </td>
                </tr>
              ) : (
                memberships.map((membership) => (
                  <tr key={membership._id} className="hover:bg-default-50/50 transition-colors group">
                    <td className="py-4 px-6">
                      <Checkbox
                        isSelected={selectedMemberIds.has(membership._id)}
                        onValueChange={() => toggleMember(membership._id)}
                      />
                    </td>
                    <td className="py-4 px-4 font-medium">
                      <Link href={`/org/${orgId}/members/${membership.user_id?._id}`} className="hover:text-primary transition-colors">
                        {membership.user_id?.name || "Unknown"} {membership.user_id?.last_name || ""}
                      </Link>
                    </td>
                    <td className="py-4 px-6 text-sm">{membership.user_id?.email || "N/A"}</td>
                    {requiresMembership ? (
                      <>
                        <td className="py-4 px-6 text-sm font-semibold">{membership.plan_name || "Sin Plan"}</td>
                        <td className="py-4 px-6">{getPlanStatusBadge(membership.plan_status)}</td>
                        <td className="py-4 px-6 text-sm">
                          {membership.remaining_sessions !== undefined && membership.remaining_sessions !== null
                            ? membership.remaining_sessions
                            : "Ilimitado"}
                        </td>
                        <td className="py-4 px-6 text-sm text-default-500">
                          {membership.expiration_date 
                            ? new Date(membership.expiration_date).toLocaleDateString()
                            : "Sin Vencimiento"}
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="py-4 px-6">{getStatusBadge(membership.user_id?.status)}</td>
                        <td className="py-4 px-6">
                          <span className={`px-2 py-1 rounded-full text-xs ${membership.user_id?.has_nfc_card ? 'bg-success/20 text-success' : 'bg-default-200'}`}>
                            {membership.user_id?.has_nfc_card ? 'Sí' : 'No'}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-default-500 text-sm">
                          {new Date(membership.createdAt).toLocaleDateString()}
                        </td>
                      </>
                    )}
                    <td className="py-4 px-6">
                      <span className={`capitalize px-2 py-1 rounded-full text-xs ${membership.role === 'admin' ? 'bg-primary/20 text-primary' : 'bg-default-200'}`}>
                        {membership.role}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <Dropdown>
                        <DropdownTrigger>
                          <button className="p-1.5 text-default-400 hover:text-primary transition-colors rounded-lg hover:bg-primary/10 cursor-pointer">
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </DropdownTrigger>
                        {requiresMembership ? (
                          <DropdownMenu aria-label="Acciones de miembro">
                            <DropdownItem key="detail" href={`/org/${orgId}/members/${membership.user_id?._id}`}>Ver / Editar Datos</DropdownItem>
                            <DropdownItem key="membership" onPress={() => handleOpenGymModal(membership)}>Gestionar Membresía</DropdownItem>
                            <DropdownItem key="qr" href={`/org/${orgId}/members/${membership.user_id?._id}#qr`}>Perfil QR</DropdownItem>
                            <DropdownItem key="remove" className="text-danger" color="danger" onPress={() => handleRemoveMember(membership._id)}>Quitar de Org</DropdownItem>
                          </DropdownMenu>
                        ) : (
                          <DropdownMenu aria-label="Acciones de miembro">
                            <DropdownItem key="detail" href={`/org/${orgId}/members/${membership.user_id?._id}`}>Ver / Editar Datos</DropdownItem>
                            <DropdownItem key="qr" href={`/org/${orgId}/members/${membership.user_id?._id}#qr`}>Perfil QR</DropdownItem>
                            <DropdownItem key="remove" className="text-danger" color="danger" onPress={() => handleRemoveMember(membership._id)}>Quitar de Org</DropdownItem>
                          </DropdownMenu>
                        )}
                      </Dropdown>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="p-4 bg-content1 rounded-2xl shadow-sm border border-divider flex flex-col md:flex-row justify-between items-center gap-4">
        <p className="text-sm text-gray-500">Mostrando {memberships.length} de {total} miembros</p>
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
              <ModalHeader className="flex flex-col gap-1">Agregar Miembro a la Organización</ModalHeader>
              <ModalBody>
                <div className="flex gap-2">
                  <Button color={mode === "select" ? "primary" : "default"} onPress={() => setMode("select")} className="flex-1">Seleccionar Existente</Button>
                  <Button color={mode === "create" ? "primary" : "default"} onPress={() => setMode("create")} className="flex-1">Crear Nuevo</Button>
                </div>

                {mode === "select" ? (
                  <Autocomplete 
                    label="Seleccionar Usuario" 
                    placeholder="Buscar por nombre, correo o cédula"
                    variant="bordered" 
                    selectedKey={selectedUserId}
                    onSelectionChange={(key) => setSelectedUserId(key?.toString() || "")}
                    inputValue={searchTerm}
                    onInputChange={setSearchTerm}
                    items={users.filter(u => {
                      if (u.role === 'superadmin') return false;
                      if (memberships.some(m => m.user_id?._id === u._id)) return false;
                      if (!searchTerm) return true;
                      const s = searchTerm.toLowerCase();
                      return u.name.toLowerCase().includes(s) || 
                             (u.last_name?.toLowerCase().includes(s) || false) ||
                             u.email.toLowerCase().includes(s) ||
                             (u.document_id?.toLowerCase().includes(s) || false);
                    })}
                  >
                    {(item) => (
                      <AutocompleteItem key={item._id} textValue={`${item.name} ${item.last_name || ""} - ${item.email}`}>
                        <div className="flex flex-col">
                          <span className="font-semibold">{item.name} {item.last_name || ""}</span>
                          <span className="text-small text-default-400">{item.email} {item.document_id ? `| C.I: ${item.document_id}` : ""}</span>
                        </div>
                      </AutocompleteItem>
                    )}
                  </Autocomplete>
                ) : (
                  <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-2 gap-4">
                      <Input label="Nombre" placeholder="Ingresa el nombre" variant="bordered" value={newName} onValueChange={setNewName} />
                      {role === "user" && (
                        <Input label="Apellido" placeholder="Ingresa el apellido" variant="bordered" value={newLastName} onValueChange={setNewLastName} />
                      )}
                      {role === "admin" && (
                        <div className="flex gap-2">
                          <Select label="Tipo" variant="bordered" selectedKeys={[newDocPrefix]} onChange={(e) => setNewDocPrefix(e.target.value)} className="w-24 flex-shrink-0">
                            <SelectItem key="V">V-</SelectItem>
                            <SelectItem key="E">E-</SelectItem>
                          </Select>
                          <Input label="Cédula" placeholder="Ej. 12345678" variant="bordered" value={newDocumentId} onValueChange={(v) => setNewDocumentId(v.replace(/\D/g, ''))} />
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <Input label="Fecha Nacimiento" type="date" variant="bordered" value={newBirthDate} onValueChange={setNewBirthDate} />
                      {role === "user" && (
                        <div className="flex gap-2">
                          <Select label="Tipo" variant="bordered" selectedKeys={[newDocPrefix]} onChange={(e) => setNewDocPrefix(e.target.value)} className="w-24 flex-shrink-0">
                            <SelectItem key="V">V-</SelectItem>
                            <SelectItem key="E">E-</SelectItem>
                          </Select>
                          <Input label="Cédula" placeholder="Ej. 12345678" variant="bordered" value={newDocumentId} onValueChange={(v) => setNewDocumentId(v.replace(/\D/g, ''))} />
                        </div>
                      )}
                      {role === "admin" && (
                         <Input label="Correo" type="email" placeholder="Ingresa el correo" variant="bordered" value={newEmail} onValueChange={setNewEmail} />
                      )}
                    </div>
                    {role === "user" && (
                      <Select label="Tipo de Sangre" variant="bordered" selectedKeys={newBloodType ? new Set([newBloodType]) : new Set([])} onChange={(e) => setNewBloodType(e.target.value)}>
                        <SelectItem key="A+">A+</SelectItem>
                        <SelectItem key="A-">A-</SelectItem>
                        <SelectItem key="B+">B+</SelectItem>
                        <SelectItem key="B-">B-</SelectItem>
                        <SelectItem key="AB+">AB+</SelectItem>
                        <SelectItem key="AB-">AB-</SelectItem>
                        <SelectItem key="O+">O+</SelectItem>
                        <SelectItem key="O-">O-</SelectItem>
                      </Select>
                    )}
                    {role === "user" && (
                      <div className="flex flex-col gap-2">
                        <Select label="Tipo de Usuario" variant="bordered" selectedKeys={new Set([newUserType])} onChange={(e) => setNewUserType(e.target.value)}>
                          <SelectItem key="worker">Trabajador</SelectItem>
                          <SelectItem key="student">Estudiante</SelectItem>
                        </Select>
                        <Checkbox 
                          color="warning"
                          isSelected={newStrictSchedule} 
                          onValueChange={setNewStrictSchedule} 
                          size="sm"
                        >
                          <div className="flex flex-col">
                            <span>Horario Estricto Activo</span>
                            <span className="text-tiny text-default-400">Impide acumular horas extra y tiempos libres</span>
                          </div>
                        </Checkbox>
                      </div>
                    )}
                    {role === "user" && (
                      <Input label="Correo" type="email" placeholder="Ingresa el correo" variant="bordered" value={newEmail} onValueChange={setNewEmail} />
                    )}
                    <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 text-sm text-primary">
                      Se enviará un correo de invitación para que el usuario defina su propia contraseña.
                    </div>
                  </div>
                )}

                <Select 
                  label="Rol en la Organización" 
                  variant="bordered" 
                  selectedKeys={new Set([role])}
                  onChange={(e) => setRole(e.target.value)}
                >
                  <SelectItem key="user">Usuario Estándar</SelectItem>
                  <SelectItem key="admin">Administrador</SelectItem>
                </Select>
              </ModalBody>
              <ModalFooter>
                <Button color="danger" variant="flat" onPress={onClose}>
                  Cancelar
                </Button>
                <Button color="primary" onPress={() => handleAddMember(onClose)} isLoading={isSubmitting} isDisabled={mode === "select" ? !selectedUserId : (!newName || !newEmail)}>
                  Agregar
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      <Modal isOpen={isGymModalOpen} onOpenChange={onGymModalOpenChange} backdrop="blur">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                <h3 className="text-xl font-bold">Gestionar Membresía de Fitness</h3>
                <p className="text-xs text-default-500 font-normal">
                  Cliente: {selectedMembership?.user_id?.name} {selectedMembership?.user_id?.last_name || ""}
                </p>
              </ModalHeader>
              <ModalBody className="gap-4">
                <Input
                  label="Nombre del Plan"
                  placeholder="Ej: Plan VIP Mensual, Pase Diario..."
                  variant="bordered"
                  value={gymPlanName}
                  onValueChange={setGymPlanName}
                />
                
                <Select
                  label="Estado del Plan"
                  variant="bordered"
                  selectedKeys={gymPlanStatus ? new Set([gymPlanStatus]) : new Set([])}
                  onChange={(e) => setGymPlanStatus(e.target.value as any)}
                >
                  <SelectItem key="active">Activo</SelectItem>
                  <SelectItem key="expired">Vencido / Expirado</SelectItem>
                  <SelectItem key="suspended">Suspendido</SelectItem>
                </Select>

                <Input
                  label="Fecha de Vencimiento"
                  type="date"
                  variant="bordered"
                  value={gymExpirationDate}
                  onValueChange={setGymExpirationDate}
                />

                <Input
                  label="Sesiones Restantes (Opcional)"
                  type="number"
                  placeholder="Dejar vacío para ilimitadas"
                  variant="bordered"
                  value={gymRemainingSessions !== undefined && gymRemainingSessions !== null ? gymRemainingSessions.toString() : ""}
                  onValueChange={(v) => setGymRemainingSessions(v === "" ? "" : Number(v))}
                />

                <Input
                  label="Notas / Observaciones"
                  placeholder="Notas adicionales sobre el plan..."
                  variant="bordered"
                  value={gymNotes}
                  onValueChange={setGymNotes}
                />
              </ModalBody>
              <ModalFooter>
                <Button color="danger" variant="flat" onPress={onClose}>
                  Cancelar
                </Button>
                <Button 
                  color="primary" 
                  onPress={() => handleUpdateGymMembership(onClose)} 
                  isLoading={isUpdatingGymPlan}
                >
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
