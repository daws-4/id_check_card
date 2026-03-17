import { Card, CardBody } from "@heroui/card";

export default async function AdminDashboardPage() {
  // We'd typically fetch real stats here
  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-2xl font-bold">Platform Overview</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card shadow="sm">
          <CardBody className="p-6">
            <h3 className="text-medium font-medium text-default-500">Total Organizations</h3>
            <p className="text-3xl font-bold mt-2">--</p>
          </CardBody>
        </Card>
        
        <Card shadow="sm">
          <CardBody className="p-6">
            <h3 className="text-medium font-medium text-default-500">Active Readers</h3>
            <p className="text-3xl font-bold mt-2">--</p>
          </CardBody>
        </Card>

        <Card shadow="sm">
          <CardBody className="p-6">
            <h3 className="text-medium font-medium text-default-500">Total Users</h3>
            <p className="text-3xl font-bold mt-2">--</p>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
