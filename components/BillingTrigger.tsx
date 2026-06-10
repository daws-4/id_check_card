"use client";

import { useEffect } from "react";

export default function BillingTrigger() {
  useEffect(() => {
    // Realiza un fetch silencioso al endpoint de facturación
    // El servidor verificará si hoy es >= 17 y si la facturación del mes actual está pendiente
    fetch("/api/billing/cron", { method: "POST" })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Server responded with ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        if (data.status === 'executed') {
          console.log("[BillingTrigger] Facturación del ciclo actual generada exitosamente.");
        }
      })
      .catch((err) => {
        // Fallo silencioso en consola para evitar molestias en el flujo del usuario
        console.warn("[BillingTrigger] Verificación silenciosa de facturación omitida o fallida:", err.message);
      });
  }, []);

  return null;
}
