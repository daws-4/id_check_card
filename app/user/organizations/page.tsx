"use client";

import { useEffect, useState } from "react";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Chip } from "@heroui/chip";
import { Spinner } from "@heroui/spinner";
import { Building2, Users, Calendar, Crown, User } from "lucide-react";

const ORG_TYPE_LABELS: Record<string, string> = {
  company: "Empresa",
  school: "Escuela",
  university: "Universidad",
  hospital: "Hospital / Clínica",
  factory: "Fábrica / Industria",
  coworking: "Coworking",
  residential: "Conjunto Residencial",
  club: "Club Deportivo",
  event: "Evento / Conferencia",
  government: "Entidad Gubernamental",
  ngo: "ONG / Fundación",
  library: "Biblioteca",
  gym: "Gimnasio",
  other: "Otro",
};

const ORG_COLORS = [
  { bg: "from-blue-500 to-blue-600", light: "bg-blue-50", text: "text-blue-600", border: "border-blue-200" },
  { bg: "from-emerald-500 to-emerald-600", light: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-200" },
  { bg: "from-purple-500 to-purple-600", light: "bg-purple-50", text: "text-purple-600", border: "border-purple-200" },
  { bg: "from-amber-500 to-amber-600", light: "bg-amber-50", text: "text-amber-600", border: "border-amber-200" },
  { bg: "from-rose-500 to-rose-600", light: "bg-rose-50", text: "text-rose-600", border: "border-rose-200" },
];

const GROUP_COLORS = [
  "bg-sky-50 border-sky-200 text-sky-700",
  "bg-violet-50 border-violet-200 text-violet-700",
  "bg-teal-50 border-teal-200 text-teal-700",
  "bg-orange-50 border-orange-200 text-orange-700",
  "bg-fuchsia-50 border-fuchsia-200 text-fuchsia-700",
];

interface OrgData {
  _id: string;
  name: string;
  type: string;
}

interface GroupData {
  _id: string;
  name: string;
  type: string;
  role: string;
  organization_id?: string;
}

export default function UserOrganizationsPage() {
  const [organizations, setOrganizations] = useState<OrgData[]>([]);
  const [groups, setGroups] = useState<GroupData[]>([]);
  const [groupsByOrg, setGroupsByOrg] = useState<Record<string, GroupData[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/user/dashboard");
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();

      const orgs: OrgData[] = data.organizations || [];
      const grps: GroupData[] = data.groups || [];
      setOrganizations(orgs);
      setGroups(grps);

      // Now fetch groups per org to map them
      const orgGroupMap: Record<string, GroupData[]> = {};
      for (const org of orgs) {
        orgGroupMap[org._id] = [];
      }

      // Fetch group details per organization to get the org mapping
      for (const org of orgs) {
        try {
          const gRes = await fetch(`/api/groups?organization_id=${org._id}`);
          if (gRes.ok) {
            const orgGroups = await gRes.json();
            // Filter only groups the user belongs to
            const userGroupIds = new Set(grps.map((g) => g._id));
            const filtered = orgGroups
              .filter((g: any) => userGroupIds.has(g._id))
              .map((g: any) => {
                const userGroup = grps.find((ug) => ug._id === g._id);
                return { ...g, role: userGroup?.role || "member" };
              });
            orgGroupMap[org._id] = filtered;
          }
        } catch {
          // skip
        }
      }

      setGroupsByOrg(orgGroupMap);
    } catch (error) {
      console.error("Error loading organizations", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner size="lg" color="primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-[var(--color-carbon-black)]">Mis Organizaciones</h1>
        <p className="text-gray-500 mt-1">
          Organizaciones y grupos a los que perteneces
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-blue-500" />
            </div>
            <span className="text-sm text-gray-500 font-medium">Organizaciones</span>
          </div>
          <p className="text-3xl font-bold text-gray-800">{organizations.length}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-emerald-500" />
            </div>
            <span className="text-sm text-gray-500 font-medium">Grupos</span>
          </div>
          <p className="text-3xl font-bold text-gray-800">{groups.length}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <Crown className="w-5 h-5 text-amber-500" />
            </div>
            <span className="text-sm text-gray-500 font-medium">Líder en</span>
          </div>
          <p className="text-3xl font-bold text-gray-800">
            {groups.filter((g) => g.role === "leader").length}
            <span className="text-sm text-gray-400 font-normal ml-1">grupo(s)</span>
          </p>
        </div>
      </div>

      {/* Organizations list */}
      {organizations.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 border border-gray-100 shadow-sm text-center">
          <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-400 text-lg">No perteneces a ninguna organización</p>
        </div>
      ) : (
        <div className="space-y-6">
          {organizations.map((org, orgIdx) => {
            const colors = ORG_COLORS[orgIdx % ORG_COLORS.length];
            const orgGroups = groupsByOrg[org._id] || [];

            return (
              <Card key={org._id} className="bg-white shadow-md border-none overflow-visible">
                <CardHeader className="p-0">
                  <div className={`w-full bg-gradient-to-r ${colors.bg} rounded-t-xl px-6 py-5`}>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                        <Building2 className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white">{org.name}</h3>
                        <p className="text-white/70 text-sm">
                          {ORG_TYPE_LABELS[org.type] || org.type}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardBody className="px-6 py-5">
                  {orgGroups.length === 0 ? (
                    <p className="text-gray-400 text-sm py-2">
                      No perteneces a ningún grupo en esta organización
                    </p>
                  ) : (
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <Users className={`w-4 h-4 ${colors.text}`} />
                        <h4 className="font-semibold text-sm text-gray-700">
                          Grupos ({orgGroups.length})
                        </h4>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {orgGroups.map((group, gIdx) => {
                          const gColor = GROUP_COLORS[gIdx % GROUP_COLORS.length];
                          return (
                            <div
                              key={group._id}
                              className={`rounded-xl border p-4 ${gColor} transition-transform hover:scale-[1.02]`}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-sm truncate">{group.name}</p>
                                  <p className="text-xs opacity-70 mt-0.5">
                                    {group.type === "study" ? "Grupo de Estudio" : "Grupo de Trabajo"}
                                  </p>
                                </div>
                                <Chip
                                  size="sm"
                                  variant="flat"
                                  color={group.role === "leader" ? "warning" : "default"}
                                  startContent={
                                    group.role === "leader" ? (
                                      <Crown className="w-3 h-3" />
                                    ) : (
                                      <User className="w-3 h-3" />
                                    )
                                  }
                                >
                                  {group.role === "leader" ? "Líder" : "Miembro"}
                                </Chip>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
