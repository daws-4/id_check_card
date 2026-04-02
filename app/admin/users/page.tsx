"use client";

import { useEffect, useState } from "react";
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from "@heroui/dropdown";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure } from "@heroui/modal";
import { Input } from "@heroui/input";
import { Select, SelectItem } from "@heroui/select";
import { Spinner } from "@heroui/spinner";
import { Button } from "@heroui/button";
import { Checkbox } from "@heroui/checkbox";
import { Plus, MoreVertical, Trash, CreditCard, Mail } from "lucide-react";

interface User {
  _id: string;
  name: string;
  last_name?: string;
  email: string;
  has_nfc_card: boolean;
  birth_date?: string;
  document_id?: string;
  blood_type?: string;
  user_type?: "student" | "worker";
  role: string;
  status?: "pending" | "active";
  strict_schedule_enforcement?: boolean;
}

interface Organization {
  _id: string;
  name: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  
  // Form State
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [name, setName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [documentId, setDocumentId] = useState("");
  const [docPrefix, setDocPrefix] = useState("V");
  const [bloodType, setBloodType] = useState("");
  const [userType, setUserType] = useState("worker");
  const [strictSchedule, setStrictSchedule] = useState(false);
  const [role, setRole] = useState("user");
  const [organizationId, setOrganizationId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Bulk State
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [isBulkLoading, setIsBulkLoading] = useState(false);

  // Resend invite state
  const [resendingUserId, setResendingUserId] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
    fetchOrganizations();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/users?type=users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (error) {
      console.error("Failed to fetch users", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrganizations = async () => {
    try {
      const res = await fetch("/api/organizations");
      if (res.ok) {
        const data = await res.json();
        setOrganizations(data);
      }
    } catch (error) {
      console.error("Failed to fetch organizations", error);
    }
  };

  const handleOpenModal = (user?: User) => {
    if (user) {
      setSelectedUser(user);
      setName(user.name);
      setLastName(user.last_name || "");
      setEmail(user.email);
      setBirthDate(user.birth_date ? new Date(user.birth_date).toISOString().split('T')[0] : "");
      setDocumentId(user.document_id ? user.document_id.replace(/^[VE]-/, '') : "");
      setDocPrefix(user.document_id?.startsWith('E-') ? 'E' : 'V');
      setBloodType(user.blood_type || "");
      setUserType(user.user_type || "worker");
      setStrictSchedule(user.strict_schedule_enforcement || false);
      setRole(user.role);
    } else {
      setSelectedUser(null);
      setName("");
      setLastName("");
      setEmail("");
      setBirthDate("");
      setDocumentId("");
      setDocPrefix("V");
      setBloodType("");
      setUserType("worker");
      setRole("user");
      setStrictSchedule(false);
    }
    onOpen();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Seguro que deseas eliminar este usuario?")) return;
    try {
      const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
      if (res.ok) await fetchUsers();
    } catch (error) {
      console.error("Failed to delete user", error);
    }
  };

  const handleResendInvite = async (userId: string) => {
    try {
      setResendingUserId(userId);
      const res = await fetch('/api/auth/resend-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      if (res.ok) {
        alert('Invitación reenviada exitosamente.');
      } else {
        const err = await res.json();
        alert(err.error || 'Error al reenviar la invitación.');
      }
    } catch (error) {
      console.error('Failed to resend invite', error);
    } finally {
      setResendingUserId(null);
    }
  };

  const handleSubmit = async (onClose: () => void) => {
    try {
      setIsSubmitting(true);
      const url = selectedUser ? `/api/users/${selectedUser._id}` : "/api/users";
      const method = selectedUser ? "PUT" : "POST";
      
      const payload: any = { 
        name, 
        last_name: lastName, 
        email, 
        role, 
        organization_id: organizationId,
        birth_date: birthDate || undefined,
        document_id: documentId ? `${docPrefix}-${documentId}` : undefined,
        blood_type: bloodType,
        user_type: userType,
        strict_schedule_enforcement: strictSchedule
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      if (res.ok) {
        await fetchUsers();
        onClose();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to save user");
        console.error("Failed to save user", err);
      }
    } catch (error) {
      console.error("Error saving user", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBulkAction = async (action: 'delete' | 'assign_card' | 'enable_strict' | 'disable_strict') => {
    const idsToProcess = Array.from(selectedUserIds);
    if (idsToProcess.length === 0) return;

    if (action === 'delete') {
      if (!confirm(`¿Eliminar ${idsToProcess.length} usuario(s) de todo el sistema?`)) return;
    } else if (action === 'assign_card') {
      if (!confirm(`¿Asignar tarjeta NFC a ${idsToProcess.length} usuario(s)?`)) return;
    } else {
      if (!confirm(`¿${action === 'enable_strict' ? 'Activar' : 'Desactivar'} Horario Estricto a ${idsToProcess.length} usuario(s)?`)) return;
    }

    try {
      setIsBulkLoading(true);
      const res = await fetch('/api/users/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, userIds: idsToProcess })
      });
      if (res.ok) {
        setSelectedUserIds(new Set());
        await fetchUsers();
      } else {
        const err = await res.json();
        alert(err.error || "Error in bulk action");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsBulkLoading(false);
    }
  };

  const toggleAll = () => {
    if (selectedUserIds.size === users.length) {
      setSelectedUserIds(new Set());
    } else {
      setSelectedUserIds(new Set(users.map(u => u._id)));
    }
  };

  const toggleUser = (id: string) => {
    const next = new Set(selectedUserIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedUserIds(next);
  };

  const getInitials = (userName: string) => {
    return userName.substring(0, 2).toUpperCase();
  };

  const getStatusBadge = (status?: string) => {
    if (status === 'active') {
      return <span className="px-3 py-1 text-xs font-medium rounded-full border bg-success/20 text-success border-success/30">Activo</span>;
    }
    return <span className="px-3 py-1 text-xs font-medium rounded-full border bg-warning/20 text-warning border-warning/30">Pendiente</span>;
  };

  return (
    <section>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h3 className="text-[var(--color-carbon-black)] text-2xl font-bold">Usuarios Globales</h3>
        <div className="flex items-center gap-2">
          {selectedUserIds.size > 0 && (
            <>
              <Button color="secondary" variant="flat" onPress={() => handleBulkAction('assign_card')} isLoading={isBulkLoading}>
                <CreditCard className="w-4 h-4 mr-1" />
                Tarjetas ({selectedUserIds.size})
              </Button>
              <Button color="warning" variant="flat" onPress={() => handleBulkAction('enable_strict')} isLoading={isBulkLoading}>
                + Estricto ({selectedUserIds.size})
              </Button>
              <Button color="default" variant="flat" onPress={() => handleBulkAction('disable_strict')} isLoading={isBulkLoading}>
                - Estricto ({selectedUserIds.size})
              </Button>
              <Button color="danger" variant="flat" onPress={() => handleBulkAction('delete')} isLoading={isBulkLoading}>
                <Trash className="w-4 h-4 mr-1" />
                ({selectedUserIds.size})
              </Button>
            </>
          )}
          <button 
            onClick={() => handleOpenModal()}
            className="bg-[var(--color-electric-sapphire)] hover:bg-blue-600 text-white font-medium px-5 py-2.5 rounded-xl shadow-md shadow-[var(--color-electric-sapphire)]/30 transition-all flex items-center gap-2 transform hover:-translate-y-0.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Agregar Usuario
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-[var(--color-lavender-mist)]/50 border-b border-gray-100">
                <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider w-12">
                  <Checkbox 
                    isSelected={users.length > 0 && selectedUserIds.size === users.length} 
                    onValueChange={toggleAll}
                  />
                </th>
                <th className="py-4 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Usuario</th>
                <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Cédula</th>
                <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Correo</th>
                <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Tipo Sangre</th>
                <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Tiene Tarjeta</th>
                <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center">
                    <Spinner />
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-gray-500">
                    No se encontraron usuarios.
                  </td>
                </tr>
              ) : (
                users.map((user, idx) => (
                  <tr key={user._id} className="hover:bg-[var(--color-lavender-mist)]/30 transition-colors group">
                    <td className="py-4 px-6">
                      <Checkbox 
                        isSelected={selectedUserIds.has(user._id)} 
                        onValueChange={() => toggleUser(user._id)}
                      />
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold ${idx % 2 === 0 ? 'bg-[var(--color-maya-blue)]/10 text-[var(--color-maya-blue)]' : 'bg-[var(--color-tropical-teal)]/10 text-[var(--color-tropical-teal)]'}`}>
                          {getInitials(user.name)}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-semibold text-[var(--color-carbon-black)]">{user.name} {user.last_name || ""}</span>
                          {user.birth_date && <span className="text-xs text-gray-400 font-medium tracking-wide">Nac: {new Date(user.birth_date).toLocaleDateString(undefined, { timeZone: 'UTC' })}</span>}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-sm text-gray-500 font-mono">
                      {user.document_id || "N/A"}
                    </td>
                    <td className="py-4 px-6 text-sm">
                      {user.email}
                    </td>
                    <td className="py-4 px-6">
                      {getStatusBadge(user.status)}
                    </td>
                    <td className="py-4 px-6 text-sm">
                      {user.blood_type || "N/A"}
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-3 py-1 text-xs font-medium rounded-full border ${user.has_nfc_card ? 'bg-success/20 text-success border-success/30' : 'bg-default-100 text-default-500 border-default-200'}`}>
                        {user.has_nfc_card ? 'Sí' : 'No'}
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
                          <DropdownItem key="edit" onPress={() => handleOpenModal(user)}>Editar</DropdownItem>
                          {user.status === 'pending' ? (
                            <DropdownItem 
                              key="resend" 
                              onPress={() => handleResendInvite(user._id)}
                              startContent={<Mail className="w-4 h-4" />}
                              className="text-warning"
                            >
                              {resendingUserId === user._id ? 'Enviando...' : 'Reenviar Invitación'}
                            </DropdownItem>
                          ) : (
                            <DropdownItem key="resend-placeholder" className="hidden">-</DropdownItem>
                          )}
                          <DropdownItem key="delete" className="text-danger" color="danger" onPress={() => handleDelete(user._id)}>Eliminar</DropdownItem>
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
              <ModalHeader className="flex flex-col gap-1">{selectedUser ? "Editar Usuario" : "Crear Usuario"}</ModalHeader>
              <ModalBody>
                <div className="grid grid-cols-2 gap-4">
                  <Input 
                    autoFocus 
                    label="Nombre" 
                    placeholder="Ingresa el nombre" 
                    variant="bordered"
                    value={name}
                    onValueChange={setName}
                  />
                  <Input 
                    label="Apellido" 
                    placeholder="Ingresa el apellido" 
                    variant="bordered"
                    value={lastName}
                    onValueChange={setLastName}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input 
                    label="Fecha de Nacimiento" 
                    type="date"
                    variant="bordered"
                    value={birthDate}
                    onValueChange={setBirthDate}
                  />
                  <div className="flex gap-2">
                    <Select 
                      label="Tipo" 
                      variant="bordered" 
                      selectedKeys={[docPrefix]}
                      onChange={(e) => setDocPrefix(e.target.value)}
                      className="w-24 flex-shrink-0"
                    >
                      <SelectItem key="V">V-</SelectItem>
                      <SelectItem key="E">E-</SelectItem>
                    </Select>
                    <Input 
                      label="Número de Cédula" 
                      placeholder="Ej. 12345678" 
                      variant="bordered"
                      value={documentId}
                      onValueChange={(v) => setDocumentId(v.replace(/\D/g, ''))}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Select 
                    label="Tipo de Sangre" 
                    variant="bordered" 
                    selectedKeys={bloodType ? [bloodType] : []}
                    onChange={(e) => setBloodType(e.target.value)}
                  >
                    <SelectItem key="A+">A+</SelectItem>
                    <SelectItem key="A-">A-</SelectItem>
                    <SelectItem key="B+">B+</SelectItem>
                    <SelectItem key="B-">B-</SelectItem>
                    <SelectItem key="AB+">AB+</SelectItem>
                    <SelectItem key="AB-">AB-</SelectItem>
                    <SelectItem key="O+">O+</SelectItem>
                    <SelectItem key="O-">O-</SelectItem>
                  </Select>
                  <div className="flex flex-col gap-2">
                    <Select 
                      label="Tipo de Usuario" 
                      variant="bordered" 
                      selectedKeys={[userType]}
                      onChange={(e) => setUserType(e.target.value)}
                    >
                      <SelectItem key="worker">Trabajador</SelectItem>
                      <SelectItem key="student">Estudiante</SelectItem>
                    </Select>
                    
                    <Checkbox 
                      color="warning"
                      isSelected={strictSchedule} 
                      onValueChange={setStrictSchedule} 
                      size="sm"
                    >
                      <div className="flex flex-col">
                        <span>Horario Estricto Activo</span>
                        <span className="text-tiny text-default-400">Impide recuperar horas libres</span>
                      </div>
                    </Checkbox>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Select 
                    label="Rol" 
                    variant="bordered" 
                    selectedKeys={[role]}
                    onChange={(e) => setRole(e.target.value)}
                    isDisabled={true}
                  >
                    <SelectItem key="user">Usuario normal</SelectItem>
                  </Select>
                  <Input 
                    label="Correo" 
                    type="email"
                    placeholder="Ingresa el correo" 
                    variant="bordered"
                    value={email}
                    onValueChange={setEmail}
                  />
                </div>
                {!selectedUser && (
                  <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                    <p className="text-sm text-primary flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      Se enviará un correo de invitación para que el usuario defina su propia contraseña.
                    </p>
                  </div>
                )}
              </ModalBody>
              <ModalFooter>
                <Button color="danger" variant="flat" onPress={onClose}>
                  Cancelar
                </Button>
                <Button color="primary" onPress={() => handleSubmit(onClose)} isLoading={isSubmitting}>
                  {selectedUser ? "Guardar Cambios" : "Crear e Invitar"}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </section>
  );
}
