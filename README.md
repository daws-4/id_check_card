# Secure-Pass-NFC

Secure-Pass-NFC es una plataforma centralizada integral (Web, Móvil y Hardware) de control de acceso y gestión de personal/estudiantes. Utiliza tecnología NFC (RFID) para que cada usuario disponga de una tarjeta única con su ID válido en toda la plataforma, sin importar a cuántas organizaciones pertenezca.

## 🚀 Tecnologías Utilizadas

- **Next.js (React & JavaScript)**: Framework principal para el servidor (API Routes) y la plataforma web (Paneles de administración y reportes).
- **MongoDB**: Base de datos NoSQL flexible, ideal para el modelo centralizado.
- **n8n**: Plataforma de automatización de flujos de trabajo e integración de agentes de IA, funcionando funcionalmente como un backend alternativo e inteligente para notificaciones y tareas.
- **React Native + Expo**: Para el desarrollo de la aplicación móvil multiplataforma (iOS y Android).
- **ESP32 (programado en entorno Arduino) y Lectores NFC**: Hardware especializado para la lectura de las tarjetas RFID en los puntos de acceso físico.
- **PocketBase**: Backend as a Service complementario (opcional/según surja la necesidad).
- **Resend y React Email**: Infraestructura moderna basada en API para el envío de correos transaccionales (invitaciones, recuperación de contraseñas) con plantillas dinámicas y responsivas construidas totalmente en React.

---

## 🌟 Últimas Novedades y Mejoras Arquitectónicas

### 🔑 "OAuth Invitado": Inicio de Sesión seguro con Google
- **Login B2B estricto sin auto-registro:** Se implementó autenticación social con Google a través de NextAuth, pero estructurada **exclusivamente para usuarios pre-registrados** por un administrador. Si un correo ajeno a las organizaciones intenta ingresar, el sistema le deniega el acceso, protegiendo la base de datos de usuarios fantasma.
- **Auto-Activación de cuentas:** Si un empleado (en estado `pending`) decide usar el botón de "Continuar con Google" por primera vez, el sistema confirmará silenciosamente su identidad, omitirá la tediosa creación de una contraseña manual y lo promoverá al estado `active` automáticamente.
- **Modelo sin contraseñas:** El esquema de la DB en Mongoose ya no obliga a poseer un `password_hash`, esto permite fluidez a las personas que eligen amarrar su cuenta únicamente a sus credenciales de Google, almacenando los métodos de conexión efectivos de cada uno en `auth_providers`.

### 📧 Migración a Infraestructura de Email Moderna (Resend + React Email)
- **Eliminación de SMTP Tradicional:** Se reemplazó la dependencia de `nodemailer` y configuraciones SMTP complejas (o autoalojamiento como Mailcow) por la API nativa y robusta de **Resend**. Esto elimina problemas de reputación de IP, puertos de servidor bloqueados o caídas a SPAM.
- **Plantillas de Correo en React:** Todos los correos del sistema (Invitaciones de usuario, Recuperación de credenciales) fueron refactorizados como **Componentes React** utilizando la librería `react-email`. Esto garantiza que los correos sean responsivos, tipados con TypeScript y se visualicen de manera consistente y profesional en cualquier cliente de correo electrónico (Gmail, Outlook, Apple Mail).
- **Integración Segura en la Nube:** La integración ahora solo depende de una única variable de entorno (`RESEND_API_KEY`), haciendo infinitamente más simple el despliegue tanto en local como en Vercel/Coolify.

### 🔐 Sistema de Registro por Invitación y Autenticación por Email
- **Eliminación de contraseñas definidas por admin:** Se reemplazó el flujo inseguro donde un administrador creaba contraseñas al registrar usuarios. Ahora, al crear un usuario o administrador, se genera un **token de invitación criptográfico** (`crypto.randomBytes`) y se envía un correo electrónico con un enlace único para completar el registro.
- **Página `/complete-registration`:** Formulario donde el usuario invitado define su propia contraseña de forma segura. Incluye validación visual en tiempo real de requisitos (8+ caracteres, mayúscula, número, coincidencia). El token se valida vía GET antes de mostrar el formulario.
- **Página `/forgot-password`:** Permite solicitar un enlace de restablecimiento de contraseña por email. Diseñado con seguridad anti-enumeración (siempre muestra éxito sin importar si el correo existe).
- **Página `/reset-password`:** Formulario para establecer una nueva contraseña tras recibir el enlace de recuperación. Mismo UX de validación visual que el registro.
- **API `/api/auth/resend-invite`:** Endpoint para reenviar invitaciones desde el panel de administración a usuarios que aún están en estado `pending`.
- **API `/api/auth/change-password`:** Endpoint para cambio de contraseña autenticado con validación jerárquica de permisos.
- **Modelo User ampliado:** Nuevos campos `status` (`pending` | `active`), `invite_token`, `invite_token_expires`, `reset_token`, `reset_token_expires` para soportar el ciclo completo de autenticación.

### 🪪 Validación de Documentos de Identidad
- **Cédulas de usuario:** Validación regex `^[VE]-\d+$` a nivel de base de datos. En la UI del panel de administrador, selector de prefijo (`V-` / `E-`) con campo numérico separado que solo acepta dígitos.
- **RIF de organizaciones:** Validación regex `^J-\d+$` a nivel de base de datos. En la UI del panel de organizaciones, prefijo `J-` fijo con campo numérico limpio.
- **Indices sparse únicos:** Ambos campos (`document_id` en User, `tax_id` en Organization) usan `unique: true, sparse: true` para permitir valores nulos sin conflictos.

### ⏳ Motor de Asistencia Estricta (Anti-Recuperación)
- **Bloqueo Estricto de Horas Libres:** La arquitectura ha evolucionado para no solo medir *entrada y salida*, sino para cruzar dinámicamente dichos registros con la agenda trazada. Usando el toggle de "Horario Estricto" (`strict_schedule_enforcement`), los estudiantes y pasantes no pueden acumular horas ni sobreescribir sus recargos por tardanzas permaneciendo en tiempos neutros (ej. almuerzos), contabilizando matemática y exclusivamente la *intersección* de tiempo presencial vs tiempo planificado.
- **Manejo Desacoplado de Tolerancias:** Incorporado el estatus silente `out_of_schedule`. Si ocurre un marcaje NFC más de 60 minutos aislado a cualquier horario, la red inteligente previene castigar ese marcaje aislándolo de métricas perjudiciales como *late* o *early_leave*.
- **Controles Masivos (Bulk):** Integrados botones operacionales masivos (`+ Estricto` / `- Estricto`) a lo largo de las vistas administrativas.

### 📊 Estado de Usuarios y Gestión Mejorada
- **Columna de Estado visible:** Las tablas de usuarios y administradores ahora muestran un badge de estado (`Activo` verde / `Pendiente` amarillo) para identificar rápidamente quiénes han completado su registro.
- **Acciones contextuales:** El menú de acciones (tres puntos) muestra la opción "Reenviar Invitación" únicamente para usuarios en estado `pending`.
- **Acciones masivas (Bulk):** La tabla de usuarios globales soporta selección múltiple con checkboxes para eliminar o asignar tarjetas NFC en lote (`/api/users/bulk`).

### 📝 Mejoras Previas (v1)
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
- **Users**: Datos personales mejorados (nombre, apellido, fecha_nacimiento, blood_type, document_id único con validación V-/E-), credenciales de acceso, rol global, estado (`pending`/`active`), tokens de invitación/reset, y el indicador booleano `has_nfc_card`. Los emails son únicos exclusivamente por rol.
- **Organizations**: Detalles de la entidad (empresa, colegio, etc.) con RIF validado (J-).
- **Memberships**: Colección que vincula a un *User* con una *Organization* determinando su rol.
- **Readers / Devices**: Colección para registrar los lectores físicos, vinculando el `esp32_id` único con una `organization_id` y su estado.
- **AttendanceLogs**: Registros de lectura (usuario, organización, lector que registró, timestamp, tipo de evento).

### Fase 2: Plataforma Web (Administrativa y Servidor en Next.js)
El servidor Next.js actuará como gestor principal y proveerá las interfaces de administración:
- **Recepción de Datos (API Endpoint)**: Recibe el payload del ESP32 (`card_id` y `esp32_id`), cruza los datos para identificar la organización y registra la asistencia.
- **Panel Súper Administrador**: Gestión global de organizaciones, usuarios globales, administradores y dispositivos (asignar un ID de ESP32 a una institución específica o reubicarlo).
- **Panel de Organización**: Dashboard en tiempo real exclusivo para cada institución, permitiendo gestionar sus empleados/estudiantes, ver reportes, generar credenciales y monitorear la asistencia.
- **Sistema de Registro por Email**: Flujo completo de invitaciones, completar registro, olvidé contraseña y restablecer contraseña.

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
- [x] Crear el esquema `User` (ampliado con schema dinámico por rol, `document_id` con sparse index y validación V-/E-, índices cruzados email+role, campos `status`, `invite_token`, `reset_token`).
- [x] Crear el esquema `Organization` (nombre, tipo, `tax_id` con validación J-, configuraciones básicas).
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
- [x] Migrar sistema de correos a Resend + React Email (eliminando Nodemailer) para garantizar integrabilidad, entrega segura, plantillas tipadas y portabilidad completa a la nube.
- [x] Crear endpoint `POST /api/auth/complete-registration` (validación de token GET + activación POST).
- [x] Crear endpoint `POST /api/auth/forgot-password` (generación de reset token + envío de email).
- [x] Crear endpoint `POST /api/auth/reset-password` (validación de token GET + cambio POST).
- [x] Crear endpoint `POST /api/auth/resend-invite` (reenvío de invitación para usuarios pendientes).
- [x] Crear endpoint `POST /api/auth/change-password` (cambio autenticado con jerarquía de permisos).
- [x] Crear endpoint `POST /api/users/bulk` (acciones masivas: eliminar / asignar tarjeta NFC).
- [x] Configurar "OAuth Invitado" con NextAuth (GoogleProvider) validando existencia en DB, interceptador de seguridad anti intrusos y con activador de perfiles automático.

### 3. Paneles Administrativos Web (Next.js)
- [x] Desarrollar el **Panel Súper Administrador**: vistas para crear/editar organizaciones y dar de alta/reasignar IDs de lectores (`esp32_id`).
- [x] Desarrollar el **Panel de Organización**: dashboard principal con métricas.
- [x] Panel de Org: Vista para gestionar miembros, incluyendo un Buscador Autocompletado inteligente con validación por ID y Cédula en vivo.
- [x] Panel de Org: Vista de reportes de asistencia en tiempo real, traducida e internacionalizada (ES).
- [x] Panel Súper Admin: **Gestión de Administradores** con tabla que muestra estado (Activo/Pendiente), correo de invitación al crear, y opción de reenviar invitación.
- [x] Panel Súper Admin: **Gestión de Usuarios Globales** con selección múltiple (checkboxes), acciones masivas (eliminar / asignar tarjeta), columna de estado, y selector de prefijo V-/E- para cédulas.
- [x] Panel Súper Admin: **Gestión de Organizaciones** con tabla incluyendo RIF con prefijo J-, tipo de organización con 14 categorías traducidas al español.
- [x] Página de **Completar Registro** (`/complete-registration`) con validación visual de requisitos de contraseña.
- [x] Página de **Olvidé Contraseña** (`/forgot-password`) con diseño anti-enumeración.
- [x] Página de **Restablecer Contraseña** (`/reset-password`) con validación de token y formulario de nueva contraseña.
- [x] Interfaz de **Login de Usuarios** (`/login`) ajustada con botón "Continuar con Google" y detección de errores OAuth vía URL (`?error=AccessDenied`).

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
- [x] Inicializar el proyecto con Expo (`npx create-expo-app`) y configurar el entorno Android.
- [ ] Implementar la pantalla de Login y gestión de tokens JWT (conectado al API de Next.js).
- [ ] **Modo Usuario Final**: Pantalla para visualizar el historial personal de accesos.
- [ ] **Modo Administrador**: Pantalla para ver el resumen rápido de asistencia de la organización.
- [ ] Investigar/Implementar módulo de emulación NFC (`Host Card Emulation` - HCE) o similar en React Native para usar el teléfono como tarjeta.

### 7. Pruebas y Despliegue
- [ ] Realizar pruebas locales integrando el ESP32, Next.js y la Base de Datos.
- [ ] Probar la reasignación de un lector (cambiar la organización de un `esp32_id` desde el panel web y verificar que los logs vayan a la nueva organización).
- [x] Optimizar y desplegar la plataforma web (Vercel, contenedores Docker/Coolify).
- [x] Compilar y probar la aplicación móvil en dispositivos Android (Dev Build configurado).

---

# PANELES / INTERFACES

## WEB

### PANEL SÚPER ADMINISTRADOR
- [x] Gestionar organizaciones (crear, editar, eliminar) con validación de RIF (J-) y 14 tipos de organización.
- [x] Gestionar administradores (crear con invitación por email, editar, eliminar, reenviar invitación).
- [x] Gestionar usuarios globales con acciones masivas (eliminar en lote, asignar tarjetas NFC en lote).
- [x] Gestionar lectores/dispositivos ESP32 (alta, reasignación entre organizaciones).
- [ ] Contar con todas las funciones de edición que tiene el panel de organización (vista detallada de org desde super admin).

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
- [x] Visualizar de manera clara sus horarios y tareas asignadas.
- [x] Ver y/o editar su información personal (sujeto a si la organización lo permite).
- [x] Marcar manualmente como completadas sus tareas.
- [x] (Automático) Marcar horarios como cumplidos al pasar por un lector NFC a tiempo.
- [x] Calcular y mostrar de forma métrica el cumplimiento: si se cumplió con el horario esperado, cuánto tiempo se estuvo dentro de la organización, horas trabajadas de más (tiempo extra) y tiempo de retraso a la llegada.

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

---

## 🧪 Plan de Pruebas (Testing Checklist)

> **Estado actual:** ⚠️ Ninguna prueba ha sido ejecutada formalmente. A continuación se listan todas las pruebas necesarias para validar el sistema.

### Autenticación y Registro
- [ ] **Login de usuario normal** (`/login`): Verificar que un usuario con estado `active` puede iniciar sesión correctamente.
- [ ] **Login de administrador** (`/admin-login`): Verificar que un admin/superadmin con estado `active` puede iniciar sesión correctamente.
- [ ] **Bloqueo de usuarios pendientes**: Verificar que usuarios con estado `pending` no pueden iniciar sesión.
- [ ] **Creación de usuario con invitación**: Al crear un usuario, verificar que se genera un token, se envía el email y el usuario queda en estado `pending`.
- [ ] **Creación de administrador con invitación**: Mismo flujo, verificando que se crea la membresía con la organización.
- [ ] **Completar registro (`/complete-registration`)**: Acceder con un token válido, validar que muestra el nombre/email del usuario, definir contraseña y verificar que el estado cambia a `active`.
- [ ] **Token expirado en registro**: Intentar completar registro con un token de más de 72 horas y verificar que se rechaza.
- [ ] **Token inválido en registro**: Acceder con un token inexistente y verificar el mensaje de error.
- [ ] **Olvidé contraseña (`/forgot-password`)**: Enviar correo de recuperación y verificar que se genera un reset_token.
- [ ] **Anti-enumeración**: Verificar que `/forgot-password` muestra éxito incluso con emails que no existen.
- [ ] **Restablecer contraseña (`/reset-password`)**: Acceder con token válido, establecer nueva contraseña y verificar el cambio.
- [ ] **Token expirado en reset**: Intentar restablecer con token de más de 1 hora y verificar rechazo.
- [ ] **Reenviar invitación**: Desde el panel admin, reenviar invitación a un usuario `pending` y verificar que se genera un nuevo token.
- [ ] **Cambio de contraseña autenticado**: Probar desde `/api/auth/change-password` con sesión activa.
- [ ] **OAuth: Cierre a extraños**: Tratar de iniciar sesión con Google con un email ajeno al sistema (debe arrojar banner rojo "Acceso denegado").
- [ ] **OAuth: Magia Auto-activadora**: Iniciar sesión por Google por primera vez sobre un usuario `pending` y validar tras bambalinas que ya figurará como `active`.
- [ ] **OAuth: Integridad de token JWT**: Comprobar que aun saltando la contraseña con Google, la app logra detectar a qué organizaciones pertenece el usuario (inyección jwt).

### Gestión de Usuarios (Panel Súper Admin)
- [ ] **Crear usuario normal**: Verificar nombre, apellido, email, cédula (con prefijo V-/E-), tipo de sangre, tipo de usuario.
- [ ] **Validación de cédula**: Verificar que solo acepta formato `V-12345` o `E-12345` y rechaza formatos inválidos.
- [ ] **Email duplicado mismo rol**: Verificar que rechaza emails duplicados para el mismo rol.
- [ ] **Email duplicado distinto rol**: Verificar que permite el mismo email para roles distintos (usuario + admin).
- [ ] **Editar usuario**: Modificar campos y verificar persistencia.
- [ ] **Eliminar usuario**: Confirmar eliminación y verificar remoción de la base de datos.
- **Selección masiva**: Seleccionar múltiples usuarios con checkboxes.
- **Eliminación masiva**: Seleccionar varios y ejecutar eliminación en lote.
- **Asignación masiva de tarjeta NFC**: Seleccionar varios y asignar NFC en lote.
- **Toggles masivos de reglas estrictas**: Aplicar estricciones de horario múltiples (`+ Estricto` y `- Estricto`) verificando persistencia.
- **Badge de estado**: Verificar que usuarios `active` muestran badge verde y `pending` badge amarillo.

### Gestión de Administradores (Panel Súper Admin)
- [ ] **Crear admin de organización**: Verificar que requiere seleccionar una organización.
- [ ] **Crear superadmin**: Verificar que no requiere organización.
- [ ] **Badge de estado en tabla**: Verificar visualización correcta de `Activo`/`Pendiente`.
- [ ] **Acción contextual de reenvío**: Verificar que solo aparece "Reenviar Invitación" para admins `pending`.

### Gestión de Organizaciones
- [ ] **Crear organización**: Verificar nombre, tipo (14 categorías) y RIF.
- [ ] **Validación de RIF**: Verificar que solo acepta formato `J-12345` y rechaza formatos inválidos.
- [ ] **Editar organización**: Modificar campos y verificar persistencia.
- [ ] **Eliminar organización**: Confirmar y verificar remoción.
- [ ] **Acceso al panel de org**: Verificar que "Ver Panel" redirige correctamente a `/org/[orgId]`.

### Panel de Organización
- [ ] **Dashboard con métricas**: Verificar que carga correctamente los datos de la organización.
- [ ] **Gestión de miembros**: Probar el autocompletado de búsqueda por nombre, cédula y correo.
- [ ] **Crear grupos**: Verificar creación de grupos de estudio y trabajo.
- [ ] **Asignar líderes**: Verificar asignación y permisos resultantes.
- [ ] **Asignar horarios**: Verificar asociación correcta con grupos.
- [ ] **Asignar tareas**: Verificar tareas con fecha límite y repetitivas.
- [ ] **Reportes de asistencia**: Verificar que los logs se muestran correctamente.
- [ ] **Asociación de lectores**: Verificar vinculación de lectores a organización o grupo específico.

### Panel de Usuario
- [ ] **Visualización de horarios**: Verificar que muestra horarios correctos para el usuario autenticado.
- [ ] **Visualización de tareas**: Verificar lista de tareas asignadas.
- [ ] **Completar tareas**: Verificar marcado manual como completada.
- [ ] **Métricas de cumplimiento**: Verificar cálculos de tiempo dentro, tiempo extra, retraso.
- [ ] **Motor Estricto (Visual)**: Si un usuario tiene habilitado el estricto, el dashboard debe convertir y mutar de "Horas" hacia "Horas Cumplidas: 3 / 4 h" e impedir el recuento de horas extras.
- [ ] **Edición de perfil**: Verificar edición cuando la organización lo permite y bloqueo cuando no.

### Emails y Transaccionales (Resend)
- [ ] **Validación de API Key**: Verificar que la instancia de `Resend` inicia correctamente sin errores de autenticación.
- [ ] **Email de invitación (React Email)**: Disparar creación de usuario y verificar que el correo renderizado vía React Email llega a tiempo, con formato perfecto y botón completamente funcional.
- [ ] **Email de recuperación**: Auditar que Resend entregue el correo de "Forgot Password" a la bandeja principal (no spam) y que el enlace envíe a `/reset-password?token=...`.
- [ ] **Fallback de errores de Envío**: Comprobar que si Resend falla (ej. límite de cuota mensual), el backend atrapa correctamente el error, arroja el log al administrador, pero no interrumpe fatalmente todo el servidor.
- [ ] **Verificación de Remitente**: Validar en el panel de Resend (DNS) que el remitente `onboarding@davidvillamizar.com` mantenga el estado `Verified`.

### Lectores y Asistencia
- [ ] **Alta de lector**: Crear un lector con `esp32_id` único y asignar a organización.
- [ ] **Reubicación de lector**: Cambiar la organización de un lector y verificar que logs nuevos van a la nueva org.
- [ ] **Registro de asistencia via API**: Enviar POST a `/api/attendance` con `card_id` y `esp32_id` y verificar el log.
- [ ] **Validación de membresía**: Verificar que un usuario que no pertenece a una org no puede registrar asistencia en ella.

### Despliegue y Rendimiento
- [ ] **Docker build**: Verificar que el Dockerfile construye correctamente.
- [ ] **Variables de entorno**: Verificar que la app funciona con las env vars de producción.
- [ ] **Performance de API**: Verificar tiempos de respuesta aceptables (< 500ms) en endpoints principales.
- [ ] **Paginación**: Verificar que listas largas no degradan rendimiento.

---

## 🔮 Futuras Implementaciones

### 💳 Pagos con Stripe
- [ ] Integración de **Stripe** como pasarela de pagos directamente en la plataforma web.
- [ ] Planes de suscripción para organizaciones (ej. Basic, Pro, Enterprise) con distintos límites de usuarios/lectores.
- [ ] **Renovación automática de membresías** de organizaciones (cobro recurrente mensual/anual).
- [ ] Panel de facturación dentro del dashboard de cada organización (historial de pagos, facturas descargables).
- [ ] Gestión de métodos de pago (tarjetas, domiciliación).
- [ ] Webhooks de Stripe para activar/suspender automáticamente organizaciones según estado de pago.
- [ ] Período de prueba gratuito configurable para nuevas organizaciones.
- [ ] Notificaciones previas al vencimiento de suscripción (7 días antes, 1 día antes, vencida).

### 📱 Mejoras Móviles
- [ ] Implementar el flujo de invitación/registro también en la app móvil (deep links).
- [ ] Push notifications para eventos de asistencia, tareas próximas y vencimientos.
- [ ] Modo offline con sincronización posterior.
- [ ] Emulación NFC completa (HCE) para usar el celular como tarjeta.

### 📊 Analytics y Reportería Avanzada
- [ ] Dashboard de analytics con gráficos interactivos (asistencia por período, tendencias, anomalías).
- [ ] Exportación de reportes a PDF/Excel.
- [ ] Alertas configurables (ej. notificar si un empleado llega tarde 3 veces consecutivas).
- [ ] Comparativas entre grupos/departamentos.

### 🔧 Infraestructura y Escalabilidad
- [ ] Implementar WebSockets para actualizaciones de asistencia en tiempo real.
- [ ] Caché con Redis para endpoints de alta consulta.
- [ ] Rate limiting en endpoints públicos (registro, forgot-password).
- [ ] Auditoría y logs detallados de acciones administrativas.
- [ ] Multi-idioma completo (EN/ES) con i18n.

### 🛡️ Seguridad
- [ ] Autenticación de dos factores (2FA) para administradores.
- [ ] Política de contraseñas configurable por organización.
- [ ] Gestión de sesiones activas (ver y cerrar sesiones desde otros dispositivos).
- [ ] Cifrado de datos sensibles en reposo.

### 🤖 Automatizaciones e IA
- [ ] Completar integración de n8n con webhooks de asistencia.
- [ ] Chatbot de IA para consultas rápidas de asistencia y métricas.
- [ ] Detección de patrones anómalos en asistencia con Machine Learning.
- [ ] Generación automática de informes semanales por organización.