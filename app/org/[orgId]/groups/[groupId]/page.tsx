"use client";

import { useEffect, useState } from "react";
import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell } from "@heroui/table";
import { Button } from "@heroui/button";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure } from "@heroui/modal";
import { Input } from "@heroui/input";
import { Select, SelectItem } from "@heroui/select";
import { Spinner } from "@heroui/spinner";
import { Switch } from "@heroui/switch";
import { useParams, useRouter } from "next/navigation";
import { Users, Clock, ClipboardList, Edit2, Trash2, Plus, ArrowLeft } from "lucide-react";

// Types
interface User { _id: string; name: string; last_name?: string; email: string; user_type?: 'worker' | 'student'; }
interface Membership { _id: string; user_id: User; role: string; }
interface Task { _id: string; title: string; description: string; due_date?: string; is_recurring: boolean; recurrence?: string; }
interface Schedule { _id: string; title: string; start_time: string; end_time: string; days_of_week: number[]; }

export default function GroupDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params?.orgId as string;
  const groupId = params?.groupId as string;

  const [activeTab, setActiveTab] = useState<"members" | "schedules" | "tasks">("members");
  
  const [groupName, setGroupName] = useState("");
  const [groupType, setGroupType] = useState<'study' | 'work'>('work');
  
  // Data States
  const [members, setMembers] = useState<Membership[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [orgUsers, setOrgUsers] = useState<{_id: string; user_id: User}[]>([]); // To select from when adding to group
  const [loading, setLoading] = useState(true);

  // Modals
  const { isOpen: isMemberOpen, onOpen: onMemberOpen, onOpenChange: onMemberChange } = useDisclosure();
  const { isOpen: isTaskOpen, onOpen: onTaskOpen, onOpenChange: onTaskChange } = useDisclosure();
  const { isOpen: isScheduleOpen, onOpen: onScheduleOpen, onOpenChange: onScheduleChange } = useDisclosure();
  const { isOpen: isGroupEditOpen, onOpen: onGroupEditOpen, onOpenChange: onGroupEditChange } = useDisclosure();

  // Form States
  const [selectedUserId, setSelectedUserId] = useState("");
  const [memberRole, setMemberRole] = useState("member");
  
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [taskDue, setTaskDue] = useState("");
  const [taskIsRecurring, setTaskIsRecurring] = useState(false);
  const [taskRecurrence, setTaskRecurrence] = useState("weekly");
  
  const [schedTitle, setSchedTitle] = useState("");
  const [schedStart, setSchedStart] = useState("");
  const [schedEnd, setSchedEnd] = useState("");
  const [schedDays, setSchedDays] = useState<Set<string>>(new Set([]));

  // Edit States
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Group Edit Form States
  const [editGroupName, setEditGroupName] = useState("");
  const [editGroupType, setEditGroupType] = useState<'study' | 'work'>('work');
  const [isUpdatingGroup, setIsUpdatingGroup] = useState(false);

  useEffect(() => {
    fetchGroupData();
  }, [groupId]);

  useEffect(() => {
    if (activeTab === "members") fetchMembers();
    if (activeTab === "schedules") fetchSchedules();
    if (activeTab === "tasks") fetchTasks();
  }, [activeTab]);

  const fetchGroupData = async () => {
    try {
      const res = await fetch(`/api/groups/${groupId}`);
      if (res.ok) {
        const data = await res.json();
        setGroupName(data.name);
        setGroupType(data.type || 'work');
      }
    } catch(e) { console.error(e); }
  };

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/members`);
      if (res.ok) setMembers(await res.json());
      // Fetch org users to allow adding existing org members to the group
      const orgRes = await fetch(`/api/memberships?organization_id=${orgId}&limit=200`);
      if (orgRes.ok) {
        const orgData = await orgRes.json();
        setOrgUsers(orgData.memberships || []);
      }
    } catch(e) { console.error(e); } finally { setLoading(false); }
  };

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/tasks`);
      if (res.ok) setTasks(await res.json());
    } catch(e) { console.error(e); } finally { setLoading(false); }
  };

  const fetchSchedules = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/schedules`);
      if (res.ok) setSchedules(await res.json());
    } catch(e) { console.error(e); } finally { setLoading(false); }
  };

  const handleAddMember = async (onClose: () => void) => {
    try {
      const res = await fetch(`/api/groups/${groupId}/members`, {
        method: "POST", body: JSON.stringify({ user_id: selectedUserId, role: memberRole })
      });
      if (res.ok) { await fetchMembers(); onClose(); }
    } catch(e) { console.error(e); }
  };

  const handleAddTask = async (onClose: () => void) => {
    try {
      const payload = {
        title: taskTitle,
        description: taskDesc,
        due_date: taskDue || undefined,
        is_recurring: taskIsRecurring,
        recurrence: taskIsRecurring ? taskRecurrence : undefined
      };

      const url = editingTask
        ? `/api/groups/${groupId}/tasks?task_id=${editingTask._id}`
        : `/api/groups/${groupId}/tasks`;

      const method = editingTask ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        await fetchTasks();
        onClose();
        setTaskTitle("");
        setTaskDesc("");
        setTaskDue("");
        setTaskIsRecurring(false);
        setTaskRecurrence("weekly");
        setEditingTask(null);
      }
    } catch(e) { console.error(e); }
  };

  const handleAddSchedule = async (onClose: () => void) => {
    try {
      const daysArray = Array.from(schedDays).map(Number);
      const payload = {
        title: schedTitle,
        start_time: schedStart,
        end_time: schedEnd,
        days_of_week: daysArray
      };

      const url = editingSchedule
        ? `/api/groups/${groupId}/schedules?schedule_id=${editingSchedule._id}`
        : `/api/groups/${groupId}/schedules`;

      const method = editingSchedule ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        await fetchSchedules();
        onClose();
        setSchedTitle("");
        setSchedStart("");
        setSchedEnd("");
        setSchedDays(new Set());
        setEditingSchedule(null);
      }
    } catch(e) { console.error(e); }
  };

  const handleUpdateGroup = async (onClose: () => void) => {
    try {
      setIsUpdatingGroup(true);
      const res = await fetch(`/api/groups/${groupId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editGroupName, type: editGroupType })
      });
      if (res.ok) {
        setGroupName(editGroupName);
        setGroupType(editGroupType);
        onClose();
      }
    } catch(e) {
      console.error(e);
    } finally {
      setIsUpdatingGroup(false);
    }
  };

  const handleDeleteGroup = async () => {
    if (!confirm("¿Estás seguro de que deseas eliminar este grupo por completo? Esta acción no se puede deshacer y eliminará también sus horarios y tareas asociadas.")) return;
    try {
      const res = await fetch(`/api/groups/${groupId}`, {
        method: "DELETE"
      });
      if (res.ok) {
        router.push(`/org/${orgId}/groups`);
      }
    } catch(e) {
      console.error(e);
    }
  };

  const handleOpenNewSchedule = () => {
    setEditingSchedule(null);
    setSchedTitle("");
    setSchedStart("");
    setSchedEnd("");
    setSchedDays(new Set());
    onScheduleOpen();
  };

  const handleOpenNewTask = () => {
    setEditingTask(null);
    setTaskTitle("");
    setTaskDesc("");
    setTaskDue("");
    setTaskIsRecurring(false);
    setTaskRecurrence("weekly");
    onTaskOpen();
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-6">
        <div className="flex items-center gap-3">
          <Button
            isIconOnly
            variant="light"
            className="text-default-500 hover:text-default-800 rounded-xl"
            onPress={() => router.push(`/org/${orgId}/groups`)}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold">{groupName || <Spinner size="sm" />}</h2>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${groupType === 'work' ? 'bg-primary/20 text-primary' : 'bg-warning/20 text-warning'}`}>
              {groupType === 'work' ? 'Trabajo' : 'Estudio'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            color="primary" 
            variant="flat"
            size="sm"
            startContent={<Edit2 className="w-4 h-4" />}
            className="font-semibold rounded-xl"
            onPress={() => {
              setEditGroupName(groupName);
              setEditGroupType(groupType);
              onGroupEditOpen();
            }}
          >
            Editar Grupo
          </Button>
          <Button 
            color="danger" 
            variant="flat"
            size="sm"
            startContent={<Trash2 className="w-4 h-4" />}
            className="font-semibold rounded-xl"
            onPress={handleDeleteGroup}
          >
            Eliminar Grupo
          </Button>
        </div>
      </div>

      <div className="flex gap-1 bg-default-100 dark:bg-zinc-900/50 p-1.5 rounded-2xl w-fit border border-divider">
        <Button 
          variant="light"
          color={activeTab === "members" ? "primary" : "default"}
          className={`font-semibold rounded-xl px-5 py-2.5 transition-all cursor-pointer ${activeTab === "members" ? "bg-white dark:bg-zinc-800 shadow-sm text-primary" : "text-default-500 hover:text-default-800"}`}
          startContent={<Users className="w-4 h-4" />}
          onPress={() => setActiveTab("members")}
        >
          Miembros
        </Button>
        <Button 
          variant="light"
          color={activeTab === "schedules" ? "primary" : "default"}
          className={`font-semibold rounded-xl px-5 py-2.5 transition-all cursor-pointer ${activeTab === "schedules" ? "bg-white dark:bg-zinc-800 shadow-sm text-primary" : "text-default-500 hover:text-default-800"}`}
          startContent={<Clock className="w-4 h-4" />}
          onPress={() => setActiveTab("schedules")}
        >
          Horarios
        </Button>
        <Button 
          variant="light"
          color={activeTab === "tasks" ? "primary" : "default"}
          className={`font-semibold rounded-xl px-5 py-2.5 transition-all cursor-pointer ${activeTab === "tasks" ? "bg-white dark:bg-zinc-800 shadow-sm text-primary" : "text-default-500 hover:text-default-800"}`}
          startContent={<ClipboardList className="w-4 h-4" />}
          onPress={() => setActiveTab("tasks")}
        >
          Tareas
        </Button>
      </div>

      {activeTab === "members" && (
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold">Integrantes</h3>
            <Button color="primary" size="sm" startContent={<Plus className="w-4 h-4" />} className="font-semibold rounded-xl" onPress={onMemberOpen}>Añadir Integrante</Button>
          </div>
          <Table aria-label="Members">
            <TableHeader>
              <TableColumn>NOMBRE</TableColumn>
              <TableColumn>ROL</TableColumn>
              <TableColumn>ACCIONES</TableColumn>
            </TableHeader>
            <TableBody items={members} emptyContent={loading ? <Spinner/> : "No hay miembros."}>
              {(m) => (
                <TableRow key={m._id}>
                  <TableCell>{m.user_id?.name || 'Unknown'} {m.user_id?.last_name || ''}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${m.role === 'leader' ? 'bg-primary/20 text-primary' : 'bg-default-200'}`}>
                      {m.role === 'leader' ? 'Líder' : 'Miembro'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Button 
                      isIconOnly 
                      size="sm" 
                      color="danger" 
                      variant="light" 
                      title="Quitar integrante"
                      onPress={async () => {
                        if (confirm(`¿Estás seguro de que deseas quitar a ${m.user_id?.name} del grupo?`)) {
                          await fetch(`/api/groups/${groupId}/members?user_id=${m.user_id._id}`, { method: 'DELETE' });
                          fetchMembers();
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {activeTab === "schedules" && (
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold">Horarios Asignados</h3>
            <Button color="primary" size="sm" startContent={<Plus className="w-4 h-4" />} className="font-semibold rounded-xl" onPress={handleOpenNewSchedule}>Nuevo Horario</Button>
          </div>
          <Table aria-label="Schedules">
            <TableHeader>
              <TableColumn>TÍTULO</TableColumn>
              <TableColumn>HORARIO</TableColumn>
              <TableColumn>DÍAS</TableColumn>
              <TableColumn>ACCIONES</TableColumn>
            </TableHeader>
            <TableBody items={schedules} emptyContent={loading ? <Spinner/> : "No hay horarios."}>
              {(s) => (
                <TableRow key={s._id}>
                  <TableCell className="font-medium">{s.title}</TableCell>
                  <TableCell>{s.start_time} - {s.end_time}</TableCell>
                  <TableCell>{s.days_of_week.map(d => ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"][d]).join(", ")}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button 
                        isIconOnly 
                        size="sm" 
                        color="primary" 
                        variant="light" 
                        title="Editar Horario"
                        onPress={() => {
                          setEditingSchedule(s);
                          setSchedTitle(s.title);
                          setSchedStart(s.start_time);
                          setSchedEnd(s.end_time);
                          setSchedDays(new Set(s.days_of_week.map(String)));
                          onScheduleOpen();
                        }}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button 
                        isIconOnly 
                        size="sm" 
                        color="danger" 
                        variant="light" 
                        title="Eliminar Horario"
                        onPress={async () => {
                          if (confirm("¿Estás seguro de que deseas eliminar este horario?")) {
                            await fetch(`/api/groups/${groupId}/schedules?schedule_id=${s._id}`, { method: 'DELETE' });
                            fetchSchedules();
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {activeTab === "tasks" && (
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold">Tareas del Grupo</h3>
            <Button color="primary" size="sm" startContent={<Plus className="w-4 h-4" />} className="font-semibold rounded-xl" onPress={handleOpenNewTask}>Nueva Tarea</Button>
          </div>
          <Table aria-label="Tasks">
            <TableHeader>
              <TableColumn>TÍTULO</TableColumn>
              <TableColumn>VENCIMIENTO</TableColumn>
              <TableColumn>TIPO</TableColumn>
              <TableColumn>ACCIONES</TableColumn>
            </TableHeader>
            <TableBody items={tasks} emptyContent={loading ? <Spinner/> : "No hay tareas."}>
              {(t) => (
                <TableRow key={t._id}>
                  <TableCell className="font-medium">{t.title}</TableCell>
                  <TableCell>{t.due_date ? new Date(t.due_date).toLocaleDateString() : 'N/A'}</TableCell>
                  <TableCell>{t.is_recurring ? `Recurrente (${t.recurrence})` : 'Única'}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button 
                        isIconOnly 
                        size="sm" 
                        color="primary" 
                        variant="light" 
                        title="Editar Tarea"
                        onPress={() => {
                          setEditingTask(t);
                          setTaskTitle(t.title);
                          setTaskDesc(t.description || "");
                          setTaskDue(t.due_date ? new Date(t.due_date).toISOString().substring(0, 10) : "");
                          setTaskIsRecurring(t.is_recurring);
                          setTaskRecurrence(t.recurrence || "weekly");
                          onTaskOpen();
                        }}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button 
                        isIconOnly 
                        size="sm" 
                        color="danger" 
                        variant="light" 
                        title="Eliminar Tarea"
                        onPress={async () => {
                          if (confirm("¿Estás seguro de que deseas eliminar esta tarea?")) {
                            await fetch(`/api/groups/${groupId}/tasks?task_id=${t._id}`, { method: 'DELETE' });
                            fetchTasks();
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* MODALS */}
      <Modal isOpen={isMemberOpen} onOpenChange={onMemberChange}>
         <ModalContent>
           {(onClose) => (
             <>
                <ModalHeader>Añadir Integrante</ModalHeader>
                <ModalBody>
                  {(() => {
                    const requiredUserType = groupType === 'work' ? 'worker' : 'student';
                    const existingMemberIds = new Set(members.map(m => m.user_id?._id));
                    const filteredUsers = orgUsers.filter(ou => {
                      if (!ou.user_id) return false;
                      if (existingMemberIds.has(ou.user_id._id)) return false;
                      return ou.user_id.user_type === requiredUserType;
                    });
                    return (
                      <>
                        <div className="p-3 rounded-lg bg-default-100 text-sm text-default-600 mb-1">
                          Este grupo es de <strong>{groupType === 'work' ? 'Trabajo' : 'Estudio'}</strong>.
                          Solo se muestran usuarios tipo <strong>{requiredUserType === 'worker' ? 'Trabajador' : 'Estudiante'}</strong>.
                        </div>
                        {filteredUsers.length === 0 ? (
                          <div className="p-4 rounded-lg bg-warning/10 text-warning text-sm text-center">
                            No hay {requiredUserType === 'worker' ? 'trabajadores' : 'estudiantes'} disponibles para agregar.
                          </div>
                        ) : (
                          <Select label="Usuario de la Organización" selectedKeys={[selectedUserId]} onChange={e => setSelectedUserId(e.target.value)}>
                            {filteredUsers.map(ou => <SelectItem key={ou.user_id._id} textValue={ou.user_id.name}>{ou.user_id.name} — {ou.user_id.email}</SelectItem>)}
                          </Select>
                        )}
                      </>
                    );
                  })()}
                  <Select label="Rol" selectedKeys={[memberRole]} onChange={e => setMemberRole(e.target.value)}>
                    <SelectItem key="member">Miembro</SelectItem>
                    <SelectItem key="leader">Líder</SelectItem>
                  </Select>
               </ModalBody>
               <ModalFooter><Button color="primary" onPress={() => handleAddMember(onClose)}>Añadir</Button></ModalFooter>
             </>
           )}
         </ModalContent>
      </Modal>

      <Modal isOpen={isTaskOpen} onOpenChange={(open) => {
        if (!open) setEditingTask(null);
        onTaskChange();
      }}>
         <ModalContent>
           {(onClose) => (
             <>
               <ModalHeader>{editingTask ? "Editar Tarea" : "Nueva Tarea"}</ModalHeader>
               <ModalBody>
                 <Input label="Título" value={taskTitle} onValueChange={setTaskTitle} placeholder="Ej: Estudiar Rust" />
                 <Input label="Descripción" value={taskDesc} onValueChange={setTaskDesc} placeholder="Ej: 1 hr al día, dos veces por semana" />
                 <Input type="date" label="Fecha de Límite / Fin" value={taskDue} onValueChange={setTaskDue} placeholder=" " description="Ej: Hasta Junio aproximadamente" />
                 <div className="flex flex-col gap-2 p-3 bg-default-50 rounded-xl border border-divider">
                   <div className="flex items-center justify-between">
                     <span className="text-sm font-semibold">¿Es una tarea repetitiva?</span>
                     <Switch isSelected={taskIsRecurring} onValueChange={setTaskIsRecurring} size="sm" color="primary" />
                   </div>
                   {taskIsRecurring && (
                     <Select label="Frecuencia" size="sm" selectedKeys={[taskRecurrence]} onChange={e => setTaskRecurrence(e.target.value)} className="mt-2">
                       <SelectItem key="weekly">Semanal</SelectItem>
                       <SelectItem key="monthly">Mensual</SelectItem>
                       <SelectItem key="yearly">Anual</SelectItem>
                     </Select>
                   )}
                 </div>
               </ModalBody>
               <ModalFooter>
                 <Button color="primary" className="rounded-xl font-semibold" onPress={() => handleAddTask(onClose)}>
                   {editingTask ? "Guardar Cambios" : "Crear Tarea"}
                 </Button>
               </ModalFooter>
             </>
           )}
         </ModalContent>
      </Modal>

      <Modal isOpen={isScheduleOpen} onOpenChange={(open) => {
        if (!open) setEditingSchedule(null);
        onScheduleChange();
      }}>
         <ModalContent>
           {(onClose) => (
             <>
               <ModalHeader>{editingSchedule ? "Editar Horario" : "Nuevo Horario"}</ModalHeader>
               <ModalBody>
                 <Input label="Título (Materia/Turno)" value={schedTitle} onValueChange={setSchedTitle} />
                 <div className="flex gap-2">
                   <Input type="time" label="Inicio" value={schedStart} onValueChange={schedStart ? setSchedStart : undefined} placeholder=" " />
                   <Input type="time" label="Fin" value={schedEnd} onValueChange={schedEnd ? setSchedEnd : undefined} placeholder=" " />
                 </div>
                 <Select label="Días de la semana" selectionMode="multiple" selectedKeys={schedDays} onSelectionChange={(keys) => setSchedDays(new Set(Array.from(keys as Set<string>)))}>
                   <SelectItem key="1">Lunes</SelectItem>
                   <SelectItem key="2">Martes</SelectItem>
                   <SelectItem key="3">Miércoles</SelectItem>
                   <SelectItem key="4">Jueves</SelectItem>
                   <SelectItem key="5">Viernes</SelectItem>
                   <SelectItem key="6">Sábado</SelectItem>
                   <SelectItem key="0">Domingo</SelectItem>
                 </Select>
               </ModalBody>
               <ModalFooter>
                 <Button color="primary" className="rounded-xl font-semibold" onPress={() => handleAddSchedule(onClose)}>
                   {editingSchedule ? "Guardar Cambios" : "Crear Horario"}
                 </Button>
               </ModalFooter>
             </>
           )}
         </ModalContent>
      </Modal>

      {/* MODAL PARA EDITAR GRUPO */}
      <Modal isOpen={isGroupEditOpen} onOpenChange={onGroupEditChange}>
         <ModalContent>
           {(onClose) => (
             <>
               <ModalHeader>Editar Detalles del Grupo</ModalHeader>
               <ModalBody>
                 <Input 
                   label="Nombre del Grupo" 
                   value={editGroupName} 
                   onValueChange={setEditGroupName} 
                   placeholder="Nombre del grupo" 
                   isRequired
                 />
                 <Select 
                   label="Tipo de Grupo" 
                   selectedKeys={[editGroupType]} 
                   onChange={e => setEditGroupType(e.target.value as 'study' | 'work')}
                   isRequired
                 >
                   <SelectItem key="work">Trabajo (para Trabajadores)</SelectItem>
                   <SelectItem key="study">Estudio (para Estudiantes)</SelectItem>
                 </Select>
               </ModalBody>
               <ModalFooter>
                 <Button color="primary" className="rounded-xl font-semibold" isLoading={isUpdatingGroup} onPress={() => handleUpdateGroup(onClose)}>
                   Guardar Detalles
                 </Button>
               </ModalFooter>
             </>
           )}
         </ModalContent>
      </Modal>
    </div>
  );
}
