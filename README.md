# Secure-Pass-NFC

Secure-Pass-NFC es una plataforma centralizada integral (Web, Móvil y Hardware) de control de acceso y gestión de personal/estudiantes. Utiliza tecnología NFC (RFID) para que cada usuario disponga de una tarjeta única con su ID válido en toda la plataforma, sin importar a cuántas organizaciones pertenezca.

## 🚀 Tecnologías Utilizadas

- **Next.js (React & JavaScript)**: Framework principal para el servidor (API Routes) y la plataforma web (Paneles de administración y reportes).
- **MongoDB**: Base de datos NoSQL flexible, ideal para el modelo centralizado.
- **n8n**: Plataforma de automatización de flujos de trabajo e integración de agentes de IA, funcionando funcionalmente como un backend alternativo e inteligente para notificaciones y tareas.
- **React Native + Expo**: Para el desarrollo de la aplicación móvil multiplataforma (iOS y Android).
- **ESP32 (programado en entorno Arduino) y Lectores NFC**: Hardware especializado para la lectura de las tarjetas RFID en los puntos de acceso físico.
- **PocketBase**: Backend as a Service complementario (opcional/según surja la necesidad).

---

## 🎯 Arquitectura Centralizada

El núcleo de la aplicación es su **centralización**. Todas las organizaciones bajo este ecosistema operan sobre el mismo servidor y base de datos, lo que elimina la redundancia de registros. 

**Ejemplo de flujo:**
Si un usuario trabaja en una empresa en la mañana y asiste a otra organización en la tarde, utilizará la **misma tarjeta NFC** (con un único ID). Cuando la tarjeta pasa por el lector, el ESP32 transmite el **ID de la tarjeta** y su propio **ID de lector hardcodeado**. El sistema busca a qué organización pertenece ese ID de lector en ese momento, procesando la entrada en la organización correspondiente sin requerir que el usuario esté registrado dos veces en la base de datos global. Esto permite reubicar o asignar fácilmente los lectores a distintas instituciones sin tocar el código del dispositivo.

---

## 🏗️ Fases y Plan de Trabajo

### Fase 1: Base de Datos Centralizada (MongoDB)
Diseño de los modelos de datos usando referencias:
- **Users**: Datos personales, credenciales de acceso y el ID único grabado en la tarjeta NFC.
- **Organizations**: Detalles de la entidad (empresa, colegio, etc.).
- **Memberships**: Colección que vincula a un *User* con una *Organization* determinando su rol.
- **Readers / Devices**: Colección para registrar los lectores físicos, vinculando el `esp32_id` único con una `organization_id` y su estado.
- **AttendanceLogs**: Registros de lectura (usuario, organización, lector que registró, timestamp, tipo de evento).

### Fase 2: Plataforma Web (Administrativa y Servidor en Next.js)
El servidor Next.js actuará como gestor principal y proveerá las interfaces de administración:
- **Recepción de Datos (API Endpoint)**: Recibe el payload del ESP32 (`card_id` y `esp32_id`), cruza los datos para identificar la organización y registra la asistencia.
- **Panel Súper Administrador**: Gestión global de organizaciones y dispositivos (asignar un ID de ESP32 a una institución específica o reubicarlo).
- **Panel de Organización**: Dashboard en tiempo real exclusivo para cada institución, permitiendo gestionar sus empleados/estudiantes, ver reportes, generar credenciales y monitorear la asistencia.

### Fase 3: Automatizaciones e Integración IA (n8n)
- **Workflows de Notificación**: Recepción de webhooks desde el servidor Next.js para disparar notificaciones, reportes o correos automáticos (p.ej., notificar a padres el ingreso de un estudiante vía WhatsApp/Email).

### Fase 4: Integración del Hardware (ESP32)
Dispositivo externo ubicado en los puntos de control programado vía Arduino IDE:
- **Código Plug & Play**: El ESP32 solo lee la tarjeta y envía el `card_id` junto a su `esp32_id` hardcodeado en el código fuente.
- **Reubicación Flexible**: Al estar validado el lector desde el backend, mover un lector de una puerta o institución a otra solo requiere un cambio en la base de datos, sin reprogramar el microcontrolador.

### Fase 5: Plataforma Móvil (React Native + Expo)
Aplicación móvil con funciones duales y uso avanzado de hardware:
- **Uso para Usuarios Finales**: Vistas de historial de asistencia, notas o información relevante según la organización.
- **Uso para Administradores**: Funciones de gestión limitadas en comparación a la web, enfocadas en revisión rápida en campo y estatus.
- **Emulación NFC (Tarjeta Alternativa)**: Si el dispositivo móvil del usuario cuenta con tecnología NFC, la aplicación le permitirá utilizar el propio teléfono como una credencial de acceso válida en caso de no portar su tarjeta física.

### Fase 6: Pruebas y Despliegue
- **Pruebas End-to-End**: Simulación de lecturas cruzadas para validar reasignaciones de lectores y la robustez del servidor Next.js y base de datos.
- **Despliegue**: Plataforma web en servidores escalables y app móvil distribuida en las tiendas (iOS/Android).

---

## 📋 Tasklist (Plan de Ejecución)

A continuación, se desglosan las fases en tareas accionables para facilitar el desarrollo:

### 1. Base de Datos (MongoDB)
- [ ] Configurar el cluster de MongoDB (ej. MongoDB Atlas) y obtener la URI de conexión.
- [ ] Crear el esquema `User` (nombre, email, password_hash, `nfc_card_id` único).
- [ ] Crear el esquema `Organization` (nombre, tipo, configuraciones básicas).
- [ ] Crear el esquema `Membership` (user_id, organization_id, rol: admin/user).
- [ ] Crear el esquema `Reader` o `Device` (`esp32_id` único, organization_id referenciada, ubicación, estado).
- [ ] Crear el esquema `AttendanceLog` (user_id, organization_id, reader_id, timestamp, tipo: entrada/salida).

### 2. Backend & API (Next.js)
- [ ] Inicializar el proyecto Next.js (`npx create-next-app`).
- [ ] Configurar la conexión a MongoDB usando Mongoose.
- [ ] Crear endpoint `POST /api/attendance` para recibir datos del ESP32.
- [ ] Lógica del endpoint `attendance`: Validar `esp32_id` para obtener la organización, buscar al usuario por `card_id`, verificar membresía y guardar el log.
- [ ] Crear endpoints CRUD para la gestión de Usuarios, Organizaciones y Lectores.
- [ ] Configurar la autenticación (ej. NextAuth.js o JWT) para proteger las rutas de administración.

### 3. Paneles Administrativos Web (Next.js)
- [ ] Desarrollar el **Panel Súper Administrador**: vistas para crear/editar organizaciones y dar de alta/reasignar IDs de lectores (`esp32_id`).
- [ ] Desarrollar el **Panel de Organización**: dashboard principal con métricas.
- [ ] Panel de Org: Vista para gestionar miembros (empleados/estudiantes).
- [ ] Panel de Org: Vista de reportes de asistencia en tiempo real.

### 4. Automatizaciones (n8n)
- [ ] Configurar una instancia de n8n (local o cloud).
- [ ] Modificar el endpoint `POST /api/attendance` de Next.js para enviar un Webhook a n8n después de registrar un log válido.
- [ ] Crear un workflow en n8n que reciba el Webhook y envíe una alerta (ej. un correo de prueba o mensaje de Telegram/WhatsApp) informando la entrada/salida.

### 5. Hardware (ESP32)
- [ ] Instalar librerías necesarias en Arduino IDE (WiFi, HTTPClient, MFRC522 para RFID).
- [ ] Escribir el código para conectar el ESP32 a una red WiFi.
- [ ] Implementar la lectura del UID de la tarjeta a través del módulo MFRC522.
- [ ] Declarar la constante `esp32_id` (ej. `const String ESP32_ID = "DEV_001";`).
- [ ] Escribir la función HTTP POST que envíe el JSON `{"card_id": "...", "esp32_id": "..."}` al endpoint de Next.js cada vez que se detecte una tarjeta.

### 6. Plataforma Móvil (React Native + Expo)
- [ ] Inicializar el proyecto con Expo (`npx create-expo-app`).
- [ ] Implementar la pantalla de Login y gestión de tokens JWT (conectado al API de Next.js).
- [ ] **Modo Usuario Final**: Pantalla para visualizar el historial personal de accesos.
- [ ] **Modo Administrador**: Pantalla para ver el resumen rápido de asistencia de la organización.
- [ ] Investigar/Implementar módulo de emulación NFC (`Host Card Emulation` - HCE) o similar en React Native para usar el teléfono como tarjeta.

### 7. Pruebas y Despliegue
- [ ] Realizar pruebas locales integrando el ESP32, Next.js y la Base de Datos.
- [ ] Probar la reasignación de un lector (cambiar la organización de un `esp32_id` desde el panel web y verificar que los logs vayan a la nueva organización).
- [ ] Desplegar la plataforma web (ej. Vercel, Railway).
- [ ] Compilar y probar la aplicación móvil en dispositivos físicos.
