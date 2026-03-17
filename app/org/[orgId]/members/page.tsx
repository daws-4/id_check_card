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
  const [selectedUserId, setSelectedUserId] = useState("");
  const [role, setRole] = useState("user");
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
    setSelectedUserId("");
    setRole("user");
    onOpen();
  };

  const handleAddMember = async (onClose: () => void) => {
    try {
      setIsSubmitting(true);
      const payload = {
        user_id: selectedUserId,
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
        <h2 className="text-2xl font-bold">Organization Members</h2>
        <Button color="primary" onPress={handleOpenModal}>
          Add Member
        </Button>
      </div>

      <Table aria-label="Members table">
        <TableHeader>
          <TableColumn>NAME</TableColumn>
          <TableColumn>EMAIL</TableColumn>
          <TableColumn>NFC CARD ID</TableColumn>
          <TableColumn>ROLE</TableColumn>
          <TableColumn>JOINED</TableColumn>
        </TableHeader>
        <TableBody
          items={memberships}
          emptyContent={loading ? <Spinner /> : "No members found in this organization."}
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
              <ModalHeader className="flex flex-col gap-1">Add Member to Organization</ModalHeader>
              <ModalBody>
                <Select 
                  label="Select User" 
                  placeholder="Choose an existing user"
                  variant="bordered" 
                  selectedKeys={selectedUserId ? [selectedUserId] : []}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                >
                  {users.map((user) => (
                    <SelectItem key={user._id} value={user._id}>
                      {user.name} ({user.email})
                    </SelectItem>
                  ))}
                </Select>

                <Select 
                  label="Role" 
                  variant="bordered" 
                  selectedKeys={[role]}
                  onChange={(e) => setRole(e.target.value)}
                >
                  <SelectItem key="user" value="user">Standard User</SelectItem>
                  <SelectItem key="admin" value="admin">Admin</SelectItem>
                </Select>
                
                <p className="text-xs text-default-500 mt-2">
                  * Note: For this flow, the user must already exist in the global database. 
                </p>
              </ModalBody>
              <ModalFooter>
                <Button color="danger" variant="flat" onPress={onClose}>
                  Cancel
                </Button>
                <Button color="primary" onPress={() => handleAddMember(onClose)} isLoading={isSubmitting} isDisabled={!selectedUserId}>
                  Add
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
