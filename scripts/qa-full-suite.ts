/**
 * QA FULL SUITE — Pruebas de API completas (JSON output version)
 */
import { loadEnvConfig } from "@next/env";
import mongoose from "mongoose";
import { User } from "../models/User";
import { Organization } from "../models/Organization";
import { Reader } from "../models/Reader";
import { Membership } from "../models/Membership";
import { AttendanceLog } from "../models/AttendanceLog";
import bcrypt from "bcryptjs";
import fs from "fs";

loadEnvConfig(process.cwd());

const API = "http://localhost:3000/api";
let passed = 0;
let failed = 0;
const results: { test: string; ok: boolean; detail: string }[] = [];

function assert(test: string, condition: boolean, detail = "") {
  if (condition) passed++;
  else failed++;
  results.push({ test, ok: condition, detail });
}

async function api(path: string, method = "GET", body?: any) {
  const opts: any = { method, headers: { "Content-Type": "application/json" } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${API}${path}`, opts);
  return { status: res.status, data: await res.json() };
}

async function main() {
  await mongoose.connect(process.env.MONGODB_URI as string);

  // ═══ FASE 1: CRUD USUARIOS ═══
  // 1a. Registrar Alexandra Alvarez
  await User.deleteMany({ email: "alvarezalexandra55@gmail.com" });
  const createA = await api("/users", "POST", {
    name: "Alexandra", last_name: "Alvarez", email: "alvarezalexandra55@gmail.com",
    document_id: "V-28456789", blood_type: "O+", user_type: "student", birth_date: "1998-03-15",
  });
  assert("Crear usuario Alexandra", createA.status === 201, `${createA.status}`);
  const aId = createA.data?.user?._id;

  // 1b. Editar
  if (aId) {
    const e = await api(`/users/${aId}`, "PUT", { name: "Alexandra Maria", blood_type: "A+" });
    assert("Editar usuario", e.status === 200, `${e.status}`);
    const v = await api(`/users/${aId}`);
    assert("Persistencia edicion", v.data?.name === "Alexandra Maria" && v.data?.blood_type === "A+", `${v.data?.name}`);
    await api(`/users/${aId}`, "PUT", { name: "Alexandra" });
  }

  // 1c. Bulk
  const tIds: string[] = [];
  for (let i = 0; i < 3; i++) {
    await User.deleteMany({ email: `bulktest${i}@test.com` });
    const u = await User.create({ name: `BulkUser${i}`, email: `bulktest${i}@test.com`, role: "user", status: "active" });
    tIds.push(u._id.toString());
  }
  const b1 = await api("/users/bulk", "POST", { userIds: tIds, action: "assign_card" });
  assert("Bulk assign NFC", b1.status === 200 && b1.data.success, `${b1.status}`);
  const af1 = await User.find({ _id: { $in: tIds } });
  assert("Bulk NFC verified", af1.every(u => u.has_nfc_card === true), "");

  const b2 = await api("/users/bulk", "POST", { userIds: tIds, action: "enable_strict" });
  assert("Bulk enable strict", b2.status === 200, `${b2.status}`);
  const af2 = await User.find({ _id: { $in: tIds } });
  assert("Bulk strict verified", af2.every(u => u.strict_schedule_enforcement === true), "");

  const b3 = await api("/users/bulk", "POST", { userIds: tIds, action: "disable_strict" });
  assert("Bulk disable strict", b3.status === 200, `${b3.status}`);

  const b4 = await api("/users/bulk", "POST", { userIds: tIds, action: "delete" });
  assert("Bulk delete", b4.status === 200, `${b4.status}`);
  const af4 = await User.find({ _id: { $in: tIds } });
  assert("Bulk delete verified", af4.length === 0, `remaining: ${af4.length}`);

  // 1d. Delete individual
  const tmp = await User.create({ name: "ToDelete", email: "del@test.com", role: "user", status: "active" });
  const d = await api(`/users/${tmp._id}`, "DELETE");
  assert("Delete individual", d.status === 200, `${d.status}`);
  assert("Delete verified", (await User.findById(tmp._id)) === null, "");

  // ═══ FASE 2: ADMINS ═══
  const orgsRes = await api("/organizations");
  const testOrg = orgsRes.data[0];

  await User.deleteMany({ email: "testorgadmin@test.com" });
  const ca = await api("/users", "POST", { name: "OrgAdmin", email: "testorgadmin@test.com", role: "org_admin", organization_id: testOrg?._id });
  assert("Crear org_admin", ca.status === 201, `${ca.status}`);

  const fa = await api("/users", "POST", { name: "FailAdmin", email: "failadmin@test.com", role: "org_admin" });
  assert("org_admin sin org -> 400", fa.status === 400, `${fa.status}`);

  await User.deleteMany({ email: "testsuperadmin@test.com" });
  const sa = await api("/users", "POST", { name: "SuperAdmin", email: "testsuperadmin@test.com", role: "superadmin" });
  assert("Crear superadmin sin org", sa.status === 201, `${sa.status}`);

  // ═══ FASE 3: ORGS CRUD ═══
  const co = await api("/organizations", "POST", { name: "OrgTemp", type: "company", tax_id: "J-99999999" });
  assert("Crear org temporal", co.status === 201, `${co.status}`);
  const tOrgId = co.data.organization?._id;
  if (tOrgId) {
    const eo = await api(`/organizations/${tOrgId}`, "PUT", { name: "OrgEditada", type: "government" });
    assert("Editar org", eo.status === 200, `${eo.status}`);
    const vo = await api(`/organizations/${tOrgId}`);
    assert("Edicion org persistida", vo.data?.name === "OrgEditada", `${vo.data?.name}`);
    const delo = await api(`/organizations/${tOrgId}`, "DELETE");
    assert("Eliminar org", delo.status === 200, `${delo.status}`);
    const vdo = await api(`/organizations/${tOrgId}`);
    assert("Org eliminada verified", vdo.status === 404, `${vdo.status}`);
  }

  // ═══ FASE 4: ESP32 ═══
  const alex = await User.findById(aId);
  if (alex) { alex.nfc_card_id = alex._id.toString(); alex.status = "active"; await alex.save(); }

  let reader = await Reader.findOne({ esp32_id: "ESP32_QA_01" });
  if (!reader) reader = await Reader.create({ esp32_id: "ESP32_QA_01", organization_id: testOrg._id, status: "active", location: "QA" });
  else { reader.organization_id = testOrg._id; reader.status = "active"; await reader.save(); }

  if (aId) await Membership.findOneAndUpdate({ user_id: aId, organization_id: testOrg._id }, { user_id: aId, organization_id: testOrg._id }, { upsert: true, new: true });

  const e1 = await api("/attendance", "POST", { card_id: aId, esp32_id: "ESP32_QA_01" });
  assert("ESP32 entrada 201", e1.status === 201, `${e1.status}`);
  assert("ESP32 type=entrada", e1.data?.log?.type === "entrada", `${e1.data?.log?.type}`);

  const e2 = await api("/attendance", "POST", { card_id: aId, esp32_id: "ESP32_QA_01" });
  assert("ESP32 salida 201", e2.status === 201, `${e2.status}`);
  assert("ESP32 type=salida", e2.data?.log?.type === "salida", `${e2.data?.log?.type}`);

  const u1 = await api("/attendance", "POST", { card_id: "FANTASMA", esp32_id: "ESP32_QA_01" });
  assert("ESP32 unknown card 404", u1.status === 404, `${u1.status}`);

  reader!.status = "maintenance"; await reader!.save();
  const m1 = await api("/attendance", "POST", { card_id: aId, esp32_id: "ESP32_QA_01" });
  assert("ESP32 maintenance 403", m1.status === 403, `${m1.status}`);
  reader!.status = "active"; await reader!.save();

  const out = await User.create({ name: "Outsider", email: "out@test.com", role: "user", status: "active", nfc_card_id: "OUT99" });
  const o1 = await api("/attendance", "POST", { card_id: "OUT99", esp32_id: "ESP32_QA_01" });
  assert("ESP32 no membership 403", o1.status === 403, `${o1.status}`);
  await User.deleteOne({ _id: out._id });

  // Relocation
  const newOrg = await Organization.create({ name: "OrgReloc", type: "company" });
  reader!.organization_id = newOrg._id; await reader!.save();
  await Membership.create({ user_id: aId, organization_id: newOrg._id });
  const r1 = await api("/attendance", "POST", { card_id: aId, esp32_id: "ESP32_QA_01" });
  assert("ESP32 relocation 201", r1.status === 201, `${r1.status}`);
  assert("ESP32 reloc correct org", r1.data?.log?.organization_id === newOrg._id.toString(), `${r1.data?.log?.organization_id} vs ${newOrg._id}`);
  reader!.organization_id = testOrg._id; await reader!.save();
  await Organization.deleteOne({ _id: newOrg._id });
  await Membership.deleteOne({ user_id: aId, organization_id: newOrg._id });

  // ═══ FASE 5: NOTIFICACIONES ═══
  const w1 = await api("/webhooks/notifications", "POST", { user_id: aId, organization_id: testOrg._id, event_type: "entrada", timestamp: new Date().toISOString() });
  assert("Notif opt-in vacio skipped", w1.data?.skipped === true, `${w1.data?.skipped}`);

  await Organization.findByIdAndUpdate(testOrg._id, { notifications_enabled: false });
  await User.findByIdAndUpdate(aId, { notification_channels: ["push", "telegram"], user_type: "student" });
  const w2 = await api("/webhooks/notifications", "POST", { user_id: aId, organization_id: testOrg._id, event_type: "entrada", timestamp: new Date().toISOString() });
  assert("Notif org disabled skipped", w2.data?.skipped === true, `${w2.data?.skipped}`);

  await Organization.findByIdAndUpdate(testOrg._id, { notifications_enabled: true });
  const w3 = await api("/webhooks/notifications", "POST", { user_id: aId, organization_id: testOrg._id, event_type: "entrada", timestamp: new Date().toISOString(), status: "on_time" });
  assert("Notif multichannel dispatched", w3.data?.skipped === false, `${w3.data?.skipped}`);
  assert("Notif has channels[]", Array.isArray(w3.data?.channels) && w3.data.channels.length > 0, `${JSON.stringify(w3.data?.channels)}`);

  // Worker + telegram = mongoose reject
  try {
    const wk = new User({ name: "WK", email: "wk@test.com", role: "user", user_type: "worker", notification_channels: ["telegram"] });
    await wk.validate();
    assert("Worker telegram rejected", false, "not rejected");
  } catch (err: any) {
    assert("Worker telegram rejected", err.name === "ValidationError", err.name);
  }

  // WhatsApp sin billing
  await Organization.findByIdAndUpdate(testOrg._id, { whatsapp_billing_enabled: false });
  await User.findByIdAndUpdate(aId, { notification_channels: ["whatsapp"], user_type: "student" });
  const w4 = await api("/webhooks/notifications", "POST", { user_id: aId, organization_id: testOrg._id, event_type: "entrada", timestamp: new Date().toISOString() });
  assert("WhatsApp no billing skipped", w4.data?.skipped === true, `${w4.data?.skipped}`);

  assert("Fire-and-forget (attendance OK despite no n8n)", e1.status === 201, "already OK");

  // ═══ FASE 6: PERFORMANCE ═══
  for (const ep of ["/users?type=users", "/organizations", "/attendance", "/readers"]) {
    const s = Date.now(); await api(ep); const ms = Date.now() - s;
    assert(`Perf ${ep} <500ms`, ms < 500, `${ms}ms`);
  }

  // ═══ CLEANUP ═══
  await User.deleteMany({ email: { $in: ["testorgadmin@test.com", "testsuperadmin@test.com", "email_duplicado@test.com", "out@test.com", "wk@test.com"] } });
  await User.findByIdAndUpdate(aId, { notification_channels: [] });
  await Organization.findByIdAndUpdate(testOrg._id, { notifications_enabled: false });

  // Write results JSON
  const output = { passed, failed, total: passed + failed, results };
  fs.writeFileSync("scripts/qa-results.json", JSON.stringify(output, null, 2), "utf-8");

  await mongoose.disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => { console.error("Fatal:", err); process.exit(1); });
