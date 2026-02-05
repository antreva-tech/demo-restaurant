"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { createUser, updateUser, setUserPin } from "@/server/actions/users";
import type { User } from "@prisma/client";
import { Role } from "@prisma/client";

const ROLES: { value: Role; label: string }[] = [
  { value: "OWNER", label: "Propietario" },
  { value: "ADMIN", label: "Administrador" },
  { value: "MANAGER", label: "Gerente" },
  { value: "EMPLOYEE", label: "Empleado" },
];

export function UsersTable({ users }: { users: User[] }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [pinUserId, setPinUserId] = useState<string | null>(null);
  const [pinValue, setPinValue] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = e.currentTarget;
    const formData = new FormData(form);
    const res = editing ? await updateUser(editing.id, formData) : await createUser(formData);
    setLoading(false);
    if (res?.ok) {
      setOpen(false);
      setEditing(null);
      window.location.reload();
    } else {
      alert((res as { error?: string })?.error ?? "Error");
    }
  }

  async function handleSetPin(e: React.FormEvent) {
    e.preventDefault();
    if (!pinUserId || !pinValue) return;
    setLoading(true);
    const res = await setUserPin(pinUserId, pinValue);
    setLoading(false);
    if (res?.ok) {
      setPinUserId(null);
      setPinValue("");
      window.location.reload();
    } else {
      alert((res as { error?: string })?.error ?? "Error");
    }
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b text-antreva-navy">
              <th className="pb-2 pr-4">Nombre</th>
              <th className="pb-2 pr-4">Correo</th>
              <th className="pb-2 pr-4">Rol</th>
              <th className="pb-2 pr-4">Nº empleado</th>
              <th className="pb-2 pr-4">PIN</th>
              <th className="pb-2"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b text-antreva-navy">
                <td className="py-2 pr-4 font-medium">{u.name}</td>
                <td className="py-2 pr-4 text-antreva-navy">{u.email}</td>
                <td className="py-2 pr-4">{u.role}</td>
                <td className="py-2 pr-4">{u.employeeNumber ?? "—"}</td>
                <td className="py-2 pr-4">{u.pinHash ? "Configurado" : "—"}</td>
                <td className="py-2 flex gap-1">
                  <Button variant="goldGhost" size="sm" onClick={() => { setEditing(u); setOpen(true); }}>Editar</Button>
                  <Button variant="goldGhost" size="sm" onClick={() => { setPinUserId(u.id); setPinValue(""); }}>PIN</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Button className="mt-4" variant="gold" onClick={() => { setEditing(null); setOpen(true); }}>Agregar usuario</Button>

      <Modal open={open} onClose={() => { setOpen(false); setEditing(null); }} title={editing ? "Editar usuario" : "Nuevo usuario"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input name="name" label="Nombre" defaultValue={editing?.name} required labelClassName="text-antreva-navy" />
          <Input name="email" label="Correo" type="email" defaultValue={editing?.email} required disabled={!!editing} labelClassName="text-antreva-navy" />
          {!editing && <Input name="password" label="Contraseña" type="password" required labelClassName="text-antreva-navy" />}
          {editing && <Input name="password" label="Nueva contraseña (dejar vacío para no cambiar)" type="password" labelClassName="text-antreva-navy" />}
          <div>
            <label className="mb-1 block text-sm font-medium text-antreva-navy">Rol</label>
            <select name="role" defaultValue={editing?.role} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-antreva-navy">
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
          <Input name="employeeNumber" label="Número de empleado (para POS)" defaultValue={editing?.employeeNumber ?? ""} labelClassName="text-antreva-navy" />
          <label className="flex items-center gap-2">
            <input type="checkbox" name="isActive" defaultChecked={editing?.isActive ?? true} />
            <span className="text-sm text-antreva-navy">Activo</span>
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="goldSecondary" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" variant="gold" disabled={loading}>{loading ? "Guardando…" : "Guardar"}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!pinUserId} onClose={() => { setPinUserId(null); setPinValue(""); }} title="Establecer / restablecer PIN">
        <form onSubmit={handleSetPin} className="space-y-4">
          <Input
            label="PIN (4-6 dígitos)"
            labelClassName="text-antreva-navy"
            type="password"
            inputMode="numeric"
            maxLength={6}
            value={pinValue}
            onChange={(e) => setPinValue(e.target.value)}
            required
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="goldSecondary" onClick={() => setPinUserId(null)}>Cancelar</Button>
            <Button type="submit" variant="gold" disabled={loading || pinValue.length < 4}>Guardar PIN</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
