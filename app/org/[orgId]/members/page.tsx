"use client";

import { useEffect, useState } from "react";
import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell } from "@heroui/table";
import { Button } from "@heroui/button";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure } from "@heroui/modal";
import { Input } from "@heroui/input";
import { Select, SelectItem } from "@heroui/select";
import { Autocomplete, AutocompleteItem } from "@heroui/autocomplete";
import { Spinner } from "@heroui/spinner";
import { useParams } from "next/navigation";

interface User {
  _id: string;
  name: string;
  last_name?: string;
  email: string;
  has_nfc_card?: boolean;
  document_id?: string;
  role: string;
}

interface Membership {
  _id: string;
  user_id: User;
  role: string;
  createdAt: string;
}

export default function MembersPage() {
  const params = useParams();
  const orgId = params?.orgId as string;

  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  
  // Form State
  const [mode, setMode] = useState<"select" | "create">("select");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [role, setRole] = useState("user");
  // New User State
  const [newName, setNewName] = useState("");
  const [newLastName, setNewLastName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newBirthDate, setNewBirthDate] = useState("");
  const [newDocumentId, setNewDocumentId] = useState("");
  const [newBloodType, setNewBloodType] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, [orgId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [membersRes, usersRes] = await Promise.all([
        fetch(`/api/memberships?organization_id=${orgId}`),
        fetch("/api/users")
      ]);
      
      if (membersRes.ok) setMemberships(await membersRes.json());
      if (usersRes.ok) setUsers(await usersRes.json());
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
    setNewPassword("");
    setNewBirthDate("");
    setNewDocumentId("");
    setNewBloodType("");
    onOpen();
  };

  const handleAddMember = async (onClose: () => void) => {
    try {
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
            password: newPassword, 
            birth_date: newBirthDate || undefined,
            document_id: newDocumentId,
            blood_type: newBloodType,
            organization_id: orgId,
            role: role === "admin" ? "org_admin" : "user" 
          }),
        });
        if (!createRes.ok) {
           const errData = await createRes.json();
           alert(`Error: ${errData.error || "El correo ya existe para este rol"}`);
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
          console.error("Failed to add member");
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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Miembros de la Organización</h2>
        <Button color="primary" onPress={handleOpenModal}>
          Agregar Miembro
        </Button>
      </div>

      <Table aria-label="Members table">
        <TableHeader>
          <TableColumn>NOMBRE</TableColumn>
          <TableColumn>CORREO</TableColumn>
          <TableColumn>ID (SISTEMA)</TableColumn>
          <TableColumn>TIENE TARJETA</TableColumn>
          <TableColumn>ROL</TableColumn>
          <TableColumn>SE UNIÓ</TableColumn>
        </TableHeader>
        <TableBody
          items={memberships}
          emptyContent={loading ? <Spinner /> : "No se encontraron miembros en esta organización."}
        >
          {(membership) => (
            <TableRow key={membership._id}>
              <TableCell className="font-medium">
                {membership.user_id?.name || "Unknown User"} {membership.user_id?.last_name || ""}
              </TableCell>
              <TableCell>{membership.user_id?.email || "N/A"}</TableCell>
              <TableCell className="font-mono text-xs text-default-500">{membership.user_id?._id || "N/A"}</TableCell>
              <TableCell>
                <span className={`px-2 py-1 rounded-full text-xs ${membership.user_id?.has_nfc_card ? 'bg-success/20 text-success' : 'bg-default-200'}`}>
                  {membership.user_id?.has_nfc_card ? 'Sí' : 'No'}
                </span>
              </TableCell>
              <TableCell>
                <span className={`capitalize px-2 py-1 rounded-full text-xs ${membership.role === 'admin' ? 'bg-primary/20 text-primary' : 'bg-default-200'}`}>
                  {membership.role}
                </span>
              </TableCell>
              <TableCell className="text-default-500 text-sm">
                {new Date(membership.createdAt).toLocaleDateString()}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

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
                        <Input label="Número de Cédula" placeholder="Número de cédula" variant="bordered" value={newDocumentId} onValueChange={setNewDocumentId} />
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <Input label="Fecha Nacimiento" type="date" variant="bordered" value={newBirthDate} onValueChange={setNewBirthDate} />
                      {role === "user" && (
                        <Input label="Cédula" placeholder="Número de cédula" variant="bordered" value={newDocumentId} onValueChange={setNewDocumentId} />
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
                      <Input label="Correo" type="email" placeholder="Ingresa el correo" variant="bordered" value={newEmail} onValueChange={setNewEmail} />
                    )}
                    <Input label="Contraseña" type="password" placeholder="Ingresa la contraseña" variant="bordered" value={newPassword} onValueChange={setNewPassword} />
                  </div>
                )}

                <Select 
                  label="Rol en la Organización" 
                  variant="bordered" 
                  selectedKeys={new Set([role])}
                  defaultSelectedKeys={new Set(["user"])}
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
                <Button color="primary" onPress={() => handleAddMember(onClose)} isLoading={isSubmitting} isDisabled={mode === "select" ? !selectedUserId : (!newName || !newEmail || !newPassword)}>
                  Agregar
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
