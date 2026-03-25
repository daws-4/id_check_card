"use client";

import { useEffect, useState } from "react";
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from "@heroui/dropdown";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure } from "@heroui/modal";
import { Input } from "@heroui/input";
import { Select, SelectItem } from "@heroui/select";
import { Spinner } from "@heroui/spinner";
import { Button } from "@heroui/button";
import { Plus, MoreVertical } from "lucide-react";

interface User {
  _id: string;
  name: string;
  last_name?: string;
  email: string;
  has_nfc_card: boolean;
  birth_date?: string;
  document_id?: string;
  blood_type?: string;
  role: string;
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
  const [password, setPassword] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [documentId, setDocumentId] = useState("");
  const [bloodType, setBloodType] = useState("");
  const [role, setRole] = useState("user");
  const [organizationId, setOrganizationId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      setDocumentId(user.document_id || "");
      setBloodType(user.blood_type || "");
      setRole(user.role);
    } else {
      setSelectedUser(null);
      setName("");
      setLastName("");
      setEmail("");
      setPassword("");
      setBirthDate("");
      setDocumentId("");
      setBloodType("");
      setRole("user");
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
        document_id: documentId,
        blood_type: bloodType
      };
      if (password) payload.password = password;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      if (res.ok) {
        await fetchUsers();
        onClose();
      } else {
        console.error("Failed to save user");
      }
    } catch (error) {
      console.error("Error saving user", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getInitials = (userName: string) => {
    return userName.substring(0, 2).toUpperCase();
  };

  return (
    <section>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h3 className="text-[var(--color-carbon-black)] text-2xl font-bold">Usuarios Globales</h3>
        <button 
          onClick={() => handleOpenModal()}
          className="bg-[var(--color-electric-sapphire)] hover:bg-blue-600 text-white font-medium px-5 py-2.5 rounded-xl shadow-md shadow-[var(--color-electric-sapphire)]/30 transition-all flex items-center gap-2 transform hover:-translate-y-0.5 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Agregar Usuario Global
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[var(--color-lavender-mist)]/50 border-b border-gray-100">
                <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Usuario</th>
                <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Cédula</th>
                <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Correo</th>
                <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Tipo Sangre</th>
                <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Tiene Tarjeta</th>
                <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center">
                    <Spinner />
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500">
                    No se encontraron usuarios.
                  </td>
                </tr>
              ) : (
                users.map((user, idx) => (
                  <tr key={user._id} className="hover:bg-[var(--color-lavender-mist)]/30 transition-colors group">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold ${idx % 2 === 0 ? 'bg-[var(--color-maya-blue)]/10 text-[var(--color-maya-blue)]' : 'bg-[var(--color-tropical-teal)]/10 text-[var(--color-tropical-teal)]'}`}>
                          {getInitials(user.name)}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-semibold text-[var(--color-carbon-black)]">{user.name} {user.last_name || ""}</span>
                          {user.birth_date && <span className="text-xs text-gray-400 font-medium tracking-wide">Nac: {new Date(user.birth_date).toLocaleDateString()}</span>}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-sm text-gray-500 font-mono">
                      {user.document_id || "N/A"}
                    </td>
                    <td className="py-4 px-6 text-sm">
                      {user.email}
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
                  <Input 
                    label="Número de Cédula" 
                    placeholder="Ingresa la cédula" 
                    variant="bordered"
                    value={documentId}
                    onValueChange={setDocumentId}
                  />
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
                  <Select 
                    label="Rol" 
                    variant="bordered" 
                    selectedKeys={[role]}
                    onChange={(e) => setRole(e.target.value)}
                    isDisabled={true}
                  >
                    <SelectItem key="user">Usuario normal</SelectItem>
                  </Select>
                </div>
                <Input 
                  label="Correo" 
                  type="email"
                  placeholder="Ingresa el correo" 
                  variant="bordered"
                  value={email}
                  onValueChange={setEmail}
                />
                <Input 
                  label="Contraseña" 
                  type="password"
                  placeholder={selectedUser ? "Dejar en blanco para mantener" : "Ingresa la contraseña"}
                  variant="bordered"
                  value={password}
                  onValueChange={setPassword}
                />
              </ModalBody>
              <ModalFooter>
                <Button color="danger" variant="flat" onPress={onClose}>
                  Cancelar
                </Button>
                <Button color="primary" onPress={() => handleSubmit(onClose)} isLoading={isSubmitting}>
                  {selectedUser ? "Guardar Cambios" : "Crear"}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </section>
  );
}
