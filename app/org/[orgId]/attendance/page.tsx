"use client";

import { useEffect, useState } from "react";
import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell } from "@heroui/table";
import { Spinner } from "@heroui/spinner";
import { useParams } from "next/navigation";

interface User {
  _id: string;
  name: string;
  email: string;
  nfc_card_id: string;
}

interface Reader {
  _id: string;
  location: string;
  esp32_id: string;
}

interface AttendanceLog {
  _id: string;
  user_id: User;
  reader_id: Reader;
  type: string;
  timestamp: string;
}

export default function AttendancePage() {
  const params = useParams();
  const orgId = params?.orgId as string;

  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, [orgId]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/attendance?organization_id=${orgId}`);
      if (res.ok) {
        setLogs(await res.json());
      }
    } catch (error) {
      console.error("Failed to fetch attendance logs", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Attendance Reports</h2>
      </div>

      <Table aria-label="Attendance logs table">
        <TableHeader>
          <TableColumn>TIMESTAMP</TableColumn>
          <TableColumn>NAME</TableColumn>
          <TableColumn>EVENT TYPE</TableColumn>
          <TableColumn>LOCATION / READER</TableColumn>
        </TableHeader>
        <TableBody
          items={logs}
          emptyContent={loading ? <Spinner /> : "No attendance logs found."}
        >
          {(log) => (
            <TableRow key={log._id}>
              <TableCell className="font-medium whitespace-nowrap">
                {new Date(log.timestamp).toLocaleString()}
              </TableCell>
              <TableCell>
                <div className="flex flex-col">
                  <span>{log.user_id?.name || "Unknown User"}</span>
                  <span className="text-xs text-default-500">{log.user_id?.nfc_card_id || "N/A"}</span>
                </div>
              </TableCell>
              <TableCell>
                <span className={`capitalize px-2 py-1 rounded-full text-xs font-semibold ${log.type === 'entrada' ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'}`}>
                  {log.type === 'entrada' ? 'Check-in' : 'Check-out'}
                </span>
              </TableCell>
              <TableCell>
                <div className="flex flex-col">
                  <span>{log.reader_id?.location || "Unknown Location"}</span>
                  <span className="text-xs text-default-500 font-mono">{log.reader_id?.esp32_id || "N/A"}</span>
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
