import { Card, CardBody } from "@heroui/card";
import { headers } from "next/headers";

export default async function OrgDashboardPage({ params }: { params: { orgId: string } }) {
  // Wait for the dynamic param to resolve
  const { orgId } = await params;
  
  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-2xl font-bold">Organization Overview</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card shadow="sm">
          <CardBody className="p-6">
            <h3 className="text-medium font-medium text-default-500">Total Members</h3>
            <p className="text-3xl font-bold mt-2">--</p>
          </CardBody>
        </Card>
        
        <Card shadow="sm">
          <CardBody className="p-6">
            <h3 className="text-medium font-medium text-default-500">Active Devices</h3>
            <p className="text-3xl font-bold mt-2">--</p>
          </CardBody>
        </Card>

        <Card shadow="sm">
          <CardBody className="p-6">
            <h3 className="text-medium font-medium text-default-500">Today's Check-ins</h3>
            <p className="text-3xl font-bold mt-2">--</p>
          </CardBody>
        </Card>
      </div>
      
      <div className="mt-8">
        <h3 className="text-xl font-semibold mb-4">Recent Activity</h3>
        <Card>
            <CardBody className="py-12 flex justify-center items-center text-default-500">
                Activity stream will appear here
            </CardBody>
        </Card>
      </div>
    </div>
  );
}
