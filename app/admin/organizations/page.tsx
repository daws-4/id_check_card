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
  type: string;
}

export default function OrganizationsPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  
  // Form State
  const [name, setName] = useState("");
  const [type, setType] = useState("company");
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

  const handleCreate = async (onClose: () => void) => {
    try {
      setIsSubmitting(true);
      const res = await fetch("/api/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, type }),
      });
      
      if (res.ok) {
        await fetchOrganizations();
        onClose();
        setName("");
        setType("company");
      } else {
        console.error("Failed to create organization");
      }
    } catch (error) {
      console.error("Error creating organization", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Organizaciones</h2>
        <Button color="primary" onPress={onOpen}>
          Agregar Organización
        </Button>
      </div>

      <Table aria-label="Organizations table">
        <TableHeader>
          <TableColumn>NOMBRE</TableColumn>
          <TableColumn>TIPO</TableColumn>
          <TableColumn>ID</TableColumn>
        </TableHeader>
        <TableBody
          items={organizations}
          emptyContent={loading ? <Spinner /> : "No se encontraron organizaciones."}
        >
          {(org) => (
            <TableRow key={org._id}>
              <TableCell>{org.name}</TableCell>
              <TableCell className="capitalize">{org.type}</TableCell>
              <TableCell className="text-default-500 font-mono text-xs">{org._id}</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">Crear Organización</ModalHeader>
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
                  <SelectItem key="gym">Gimnasio</SelectItem>
                  <SelectItem key="other">Otro</SelectItem>
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
