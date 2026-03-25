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

## 🌟 Últimas Novedades y Mejoras Arqutitectónicas

- **Evolución del Esquema de Usuarios:** Transición exitosa alejándose de identificadores `nfc_card_id` físicos obsoletos (reemplazado por lógica booleana `has_nfc_card`). Perfil enriquecido dinámicamente con distinción entre `nombre` y `apellido`, `fecha de nacimiento`, `tipo de sangre` y `document_id` (cédula).
- **Control de Roles y Login Estricto:** Introducción de índices compuestos en MongoDB (`email` + `role`). Un mismo correo puede coexistir sin conflictos asumiendo un rol de `usuario` y `administrador` en paralelo. NextAuth evalúa inteligentemente qué portal se está utilizando (`/login` vs `/admin-login`) y redirige sutilmente sin mezclar las cuentas.
- **Auto-Completado Avanzado (UX/UI):** Implementación de selectores inteligentes de usuarios al agregar miembros a organizaciones. Incluye buscador instantáneo por cédula, nombre y correo, ocultando a los perfiles ya emparejados.
- **Formularios Dinámicos por Rol:** Los campos como el tipo de sangre y los apellidos solo se exigen al registrar cuentas de usuarios estándar, limpiando la vista para registro de perfiles administrativos globales.
- **Accesibilidad e Interfaz:** Refinamiento de cursores en tablas, re-estructuración idiomática al español en "Reportes de Asistencia" (Attendance Logs) y reparaciones anti-tree shaking del compilador Next.js.

---

## 🎯 Arquitectura Centralizada

El núcleo de la aplicación es su **centralización**. Todas las organizaciones bajo este ecosistema operan sobre el mismo servidor y base de datos, lo que elimina la redundancia de registros. 

**Ejemplo de flujo:**
Si un usuario trabaja en una empresa en la mañana y asiste a otra organización en la tarde, utilizará la **misma tarjeta NFC** (con un único ID). Cuando la tarjeta pasa por el lector, el ESP32 transmite el **ID de la tarjeta** y su propio **ID de lector hardcodeado**. El sistema busca a qué organización pertenece ese ID de lector en ese momento, procesando la entrada en la organización correspondiente sin requerir que el usuario esté registrado dos veces en la base de datos global. Esto permite reubicar o asignar fácilmente los lectores a distintas instituciones sin tocar el código del dispositivo.

---

## 🏗️ Fases y Plan de Trabajo

### Fase 1: Base de Datos Centralizada (MongoDB)
Diseño de los modelos de datos usando referencias:
- **Users**: Datos personales mejorados (nombre, apellido, fecha_nacimiento, blood_type, document_id único), credenciales de acceso, rol global, y el indicador booleano `has_nfc_card`. Los emails son únicos exclusivamente por rol.
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
- [x] Configurar el cluster de MongoDB (ej. MongoDB Atlas) y obtener la URI de conexión.
- [x] Crear el esquema `User` (ampliado con schema dinámico por rol, `document_id` con sparse index, índices cruzados email+role).
- [x] Crear el esquema `Organization` (nombre, tipo, configuraciones básicas).
- [x] Crear el esquema `Membership` (user_id, organization_id, rol: admin/user).
- [x] Crear el esquema `Reader` o `Device` (`esp32_id` único, organization_id referenciada, ubicación, estado).
- [x] Crear el esquema `AttendanceLog` (user_id, organization_id, reader_id, timestamp, tipo: entrada/salida).

### 2. Backend & API (Next.js)
- [x] Configurar la conexión a MongoDB usando Mongoose.
- [x] Crear endpoint `POST /api/attendance` para recibir datos del ESP32.
- [x] Lógica del endpoint `attendance`: Validar `esp32_id` para obtener la organización, buscar al usuario por `card_id`, verificar membresía y guardar el log.
- [x] Crear endpoints CRUD para la gestión de Usuarios, Organizaciones y Lectores.
- [x] Configurar la autenticación (ej. NextAuth.js) para proteger rutas y aislar inteligentemente los portales `/login` y `/admin-login` con soporte paralelo de correos electrónicos.
- [x] Optimizar la depuración de Mongoose para soportar compilación severa (tree-shaking) al enriquecer esquemas.

### 3. Paneles Administrativos Web (Next.js)
- [x] Desarrollar el **Panel Súper Administrador**: vistas para crear/editar organizaciones y dar de alta/reasignar IDs de lectores (`esp32_id`).
- [x] Desarrollar el **Panel de Organización**: dashboard principal con métricas.
- [x] Panel de Org: Vista para gestionar miembros, incluyendo un Buscador Autocompletado inteligente con validación por ID y Cédula en vivo.
- [x] Panel de Org: Vista de reportes de asistencia en tiempo real, traducida e internacionalizada (ES).

### 4. Automatizaciones (n8n)
- [x] Configurar una instancia de n8n (local o cloud).
- [ ] Modificar el endpoint `POST /api/attendance` de Next.js para enviar un Webhook a n8n después de registrar un log válido.
- [ ] Crear un workflow en n8n que reciba el Webhook y envíe una alerta (ej. un correo de prueba o mensaje de Telegram/WhatsApp) informando la entrada/salida.

### 5. Hardware (ESP32)
- [x] Instalar librerías necesarias en Arduino IDE (WiFi, HTTPClient, MFRC522 para RFID).
- [x] Escribir el código para conectar el ESP32 a una red WiFi.
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

# PANELES / INTERFACES

## WEB

### PANEL SÚPER ADMINISTRADOR
- [ ] Contar con todas las funciones de edición que tiene el panel de organización.
- [ ] Crear, editar y eliminar todas las organizaciones del sistema.

### PANEL DE ORGANIZACIÓN
- [x] Crear nuevos usuarios o añadir usuarios de forma inteligente usando un buscador (Autocompletado) a la organización, incluyendo adaptabilidad dinámica de formularios según el tipo de persona a afiliar.
- [x] Crear y gestionar distintos grupos de usuarios (catalogados como grupos de estudio o grupos de trabajo).
- [x] Asignar usuarios normales como líderes de un grupo.
- [x] Permitir a los líderes de un grupo editar, añadir o eliminar usuarios, así como asignarles tareas con fecha límite o repetitivas dentro del grupo asignado.
- [x] Asignar horarios a los grupos (con títulos de materias, clases o actividades).
- [x] Asignar tareas a los grupos, ya sean con fecha límite o repetitivas (una vez a la semana, al mes o al año).
- [x] Registrar la hora de paso por algún lector y asociar lectores a la organización en general o dedicarlos a un grupo en específico.
> **Nota para Web:** Para la versión web se deben añadir a futuro aún más opciones y métricas de análisis que las indicadas en esta versión esencial.

### PANEL DE USUARIO (Normal / Líder de Grupo)
- [ ] Visualizar de manera clara sus horarios y tareas asignadas.
- [ ] Ver y/o editar su información personal (sujeto a si la organización lo permite).
- [ ] Marcar manualmente como completadas sus tareas.
- [ ] (Automático) Marcar horarios como cumplidos al pasar por un lector NFC a tiempo.
- [ ] Calcular y mostrar de forma métrica el cumplimiento: si se cumplió con el horario esperado, cuánto tiempo se estuvo dentro de la organización, horas trabajadas de más (tiempo extra) y tiempo de retraso a la llegada.

---

## MOBILE

### PANEL SÚPER ADMINISTRADOR
- [ ] Contar con todas las funciones de edición que tiene el panel de organización.
- [ ] Crear, editar y eliminar todas las organizaciones del sistema.

### PANEL DE ORGANIZACIÓN
- [ ] Crear nuevos usuarios o añadir usuarios ya existentes en el sistema global a la organización.
- [ ] Crear y visualizar los distintos grupos de usuarios (estudio o trabajo).
- [ ] Gestionar qué usuarios actúan como líderes de su grupo (acceso móvil a líderes para añadir/quitar/editar integrantes y asignar tareas con fecha límite o repetitivas).
- [ ] Asignar horarios y revisar tareas (estatus de límite, y de las tareas recurrentes).
- [ ] Consultar el registro de los lectores dedicados (general de la organización o propios del grupo).

### PANEL DE USUARIO (Normal / Líder de Grupo)
- [ ] Visualizar los horarios inmediatos y tareas pendientes desde la aplicación del celular.
- [ ] Ver su perfil y actualizar su información personal (solo si la configuración de la organización lo ha habilitado).
- [ ] Marcar rápido que sus tareas fueron efectuadas (completadas).
- [ ] Ver sus marcajes en tiempo real (cumplimiento automático verificado vía NFC).
- [ ] Analizar en su vista de la app: si llegó a tiempo, su tiempo transcurrido en las instalaciones orgánicas, su tiempo extra y las llegadas o registros con retraso.