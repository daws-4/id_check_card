"use client";

import { useEffect, useState } from "react";
import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell } from "@heroui/table";
import { Button } from "@heroui/button";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure } from "@heroui/modal";
import { Input } from "@heroui/input";
import { Select, SelectItem } from "@heroui/select";
import { Spinner } from "@heroui/spinner";
import { useParams } from "next/navigation";

interface User {
  _id: string;
  name: string;
  email: string;
  nfc_card_id: string;
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
  const [role, setRole] = useState("user");
  // New User State
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newNfc, setNewNfc] = useState("");
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
    setRole("user");
    setNewName("");
    setNewEmail("");
    setNewPassword("");
    setNewNfc("");
    onOpen();
  };

  const handleAddMember = async (onClose: () => void) => {
    try {
      setIsSubmitting(true);
      
      let finalUserId = selectedUserId;
      
      if (mode === "create") {
        const createRes = await fetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: newName, email: newEmail, password: newPassword, nfc_card_id: newNfc, role: "user" }),
        });
        if (!createRes.ok) {
           console.error("Failed to create user");
           setIsSubmitting(false);
           return;
        }
        const createData = await createRes.json();
        finalUserId = createData.user._id;
      }

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
      
      if (res.ok) {
        await fetchData();
        onClose();
      } else {
        console.error("Failed to add member");
      }
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
          <TableColumn>ID TARJETA NFC</TableColumn>
          <TableColumn>ROL</TableColumn>
          <TableColumn>SE UNIÓ</TableColumn>
        </TableHeader>
        <TableBody
          items={memberships}
          emptyContent={loading ? <Spinner /> : "No se encontraron miembros en esta organización."}
        >
          {(membership) => (
            <TableRow key={membership._id}>
              <TableCell className="font-medium">{membership.user_id?.name || "Unknown User"}</TableCell>
              <TableCell>{membership.user_id?.email || "N/A"}</TableCell>
              <TableCell className="font-mono text-xs">{membership.user_id?.nfc_card_id || "N/A"}</TableCell>
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
                  <Select 
                    label="Seleccionar Usuario" 
                    placeholder="Elige un usuario existente"
                    variant="bordered" 
                    selectedKeys={selectedUserId ? [selectedUserId] : []}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                  >
                    {users.map((user) => (
                      <SelectItem key={user._id}>
                        {user.name} ({user.email})
                      </SelectItem>
                    ))}
                  </Select>
                ) : (
                  <>
                    <Input label="Nombre" placeholder="Ingresa el nombre completo" variant="bordered" value={newName} onValueChange={setNewName} />
                    <Input label="Correo" type="email" placeholder="Ingresa el correo" variant="bordered" value={newEmail} onValueChange={setNewEmail} />
                    <Input label="Contraseña" type="password" placeholder="Ingresa la contraseña" variant="bordered" value={newPassword} onValueChange={setNewPassword} />
                    <Input label="ID Tarjeta NFC" placeholder="Ingresa el ID NFC" variant="bordered" value={newNfc} onValueChange={setNewNfc} />
                  </>
                )}

                <Select 
                  label="Rol en la Organización" 
                  variant="bordered" 
                  selectedKeys={[role]}
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
                <Button color="primary" onPress={() => handleAddMember(onClose)} isLoading={isSubmitting} isDisabled={mode === "select" ? !selectedUserId : (!newName || !newEmail || !newPassword || !newNfc)}>
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
