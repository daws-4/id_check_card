"use client";

import { useEffect, useState } from "react";
import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell } from "@heroui/table";
import { Button } from "@heroui/button";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure } from "@heroui/modal";
import { Input } from "@heroui/input";
import { Select, SelectItem } from "@heroui/select";
import { Spinner } from "@heroui/spinner";

interface User {
  _id: string;
  name: string;
  email: string;
  nfc_card_id: string;
  role: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  
  // Form State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nfcCardId, setNfcCardId] = useState("");
  const [role, setRole] = useState("user");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/users");
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

  const handleCreate = async (onClose: () => void) => {
    try {
      setIsSubmitting(true);
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, nfc_card_id: nfcCardId, role }),
      });
      
      if (res.ok) {
        await fetchUsers();
        onClose();
        setName("");
        setEmail("");
        setPassword("");
        setNfcCardId("");
        setRole("user");
      } else {
        console.error("Failed to create user");
      }
    } catch (error) {
      console.error("Error creating user", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-[var(--color-tropical-teal)]">Usuarios</h2>
        <Button color="primary" onPress={onOpen} className="bg-[var(--color-electric-sapphire)]">
          Agregar Usuario
        </Button>
      </div>

      <Table aria-label="Users table">
        <TableHeader>
          <TableColumn>NOMBRE</TableColumn>
          <TableColumn>CORREO</TableColumn>
          <TableColumn>ID NFC</TableColumn>
          <TableColumn>ROL</TableColumn>
        </TableHeader>
        <TableBody
          items={users}
          emptyContent={loading ? <Spinner /> : "No se encontraron usuarios."}
        >
          {(user) => (
            <TableRow key={user._id}>
              <TableCell>{user.name}</TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell className="font-mono text-xs">{user.nfc_card_id}</TableCell>
              <TableCell className="capitalize">{user.role}</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">Crear Usuario</ModalHeader>
              <ModalBody>
                <Input 
                  autoFocus 
                  label="Nombre" 
                  placeholder="Ingresa el nombre completo" 
                  variant="bordered"
                  value={name}
                  onValueChange={setName}
                />
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
                  placeholder="Ingresa la contraseña" 
                  variant="bordered"
                  value={password}
                  onValueChange={setPassword}
                />
                <Input 
                  label="ID Tarjeta NFC" 
                  placeholder="Ingresa el ID NFC" 
                  variant="bordered"
                  value={nfcCardId}
                  onValueChange={setNfcCardId}
                />
                <Select 
                  label="Rol" 
                  variant="bordered" 
                  selectedKeys={[role]}
                  onChange={(e) => setRole(e.target.value)}
                >
                  <SelectItem key="user">Usuario</SelectItem>
                  <SelectItem key="org_admin">Admin de Organización</SelectItem>
                  <SelectItem key="superadmin">Superadmin</SelectItem>
                </Select>
              </ModalBody>
              <ModalFooter>
                <Button color="danger" variant="flat" onPress={onClose}>
                  Cancelar
                </Button>
                <Button color="primary" onPress={() => handleCreate(onClose)} isLoading={isSubmitting}>
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
