# 🤖 Automatización de Facturación con N8N

Esta guía detalla cómo configurar un flujo de trabajo en tu propia instancia de **n8n** para disparar automáticamente la facturación mensual del sistema *Secure Pass* hospedado en **Coolify**.

## 🛠️ Requisitos Previos

- Tener acceso a tu instancia de **n8n**.
- Haber configurado la variable de entorno `CRON_SECRET` dentro de Coolify (en la sección Environment Variables de tu aplicación de Next.js).
  - *Actualmente en tu `.env` de desarrollo es: `super_secret_cron_token_12345`*
- Conocer la **URL o IP base** por donde Coolify expone tu plataforma a la internet (Ej. `https://mi-plataforma.com`).

---

## ⚙️ Configuración del Flujo (Workflow) en n8n

### Nodo 1: Iniciador (Schedule Trigger)
El orquestador debe ser quien lleve el conteo del tiempo para no afectar los recursos de la plataforma principal.
1. Abre n8n, haz clic en **[ Add Workflow ]** y crea un nuevo nodo de tipo **Schedule Trigger**.
2. Dale clic al nodo recién creado y como regla de ejecución selecciona cambiar a la opción **"Cron Expression"**.
3. En la caja de texto ingresa la expresión:
   ```text
   0 0 1 * *
   ```
   > 💡 **Explicación:** Esto significa *minuto 0, hora 0, el día 1 de cualquier mes*. Por lo que tu servidor realizará el cierre cíclico a la medianoche entre los meses (Ej. La noche que va del 31 de Mayo al 1 de Junio).

### Nodo 2: Emisión del Pulso (HTTP Request)
Arrastra el cordón de salida del nodo **Schedule** y añade un nuevo nodo del tipo **HTTP Request Node**. Adentro, configúralo con los siguientes parámetros:

- **Method:** `POST`
- **URL:** `http://TU_DOMINIO_DE_COOLIFY/api/billing/cron`
- **Authentication:** `Generic Credential Type`
- Selecciona `Header Auth`.
- En el botón de crear credenciales, coloca:
  - **Name:** `Authorization`
  - **Value:** `Bearer super_secret_cron_token_12345` *(Nota: Recuerda incluir la palabra Bearer y un espacio antes del secreto).*

---

## 🎯 ¿Qué sucede internamente?

Cuando las manecillas del tiempo marcan el primer segundo del nuevo mes, n8n dispara la solicitud `POST`. Esto desencadena una reacción en cadena muy precisa dentro de tu API:

1. **Validación:** El Endpoint de Next.js (`/api/billing/cron/route.ts`) confirmará que el token es correcto.
2. **Cálculo de Retroactividad:** Sabiendo que se disparó el día 1 del nuevo mes, el Endpoint autocalculará las fechas exactas de inicio y fin del **mes inmediatamente anterior**.
3. **Escaneo de Organizaciones:** Buscará en la Base de Datos a todas las organizaciones que tengan un plan configurado (Ya sea `"Tarifa por Defecto"` o `"Tarifa Personalizada"`).
4. **Agrupación Segura:** Emitirá los recibos con `status: 'pending'` contando solamente a los usuarios (`User.status === 'active'`) y tarjetas que hayan estado válidas.

---

## ☑️ Verificación

- Dale al interruptor **"Active"** en la esquina del Workflow de n8n para guardarlo.
- Puedes utilizar el botón **"Test Step"** (teniendo tu container de Coolify andando con la variable de entorno seteada) y comprobar inmediatamente en la Base de Datos o en el Panel de Super Admin que las facturas de prueba hayan sido exitosas.
