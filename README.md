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
Si un usuario trabaja en una empresa en la mañana y asiste a otra organización en la tarde, utilizará la **misma tarjeta NFC** (con un único ID). Cuando la tarjeta pasa por el lector, el ESP32 transmite el ID del usuario y su identificador propio (para identificar a la organización). El sistema procesa la entrada en la organización correspondiente sin requerir que el usuario esté registrado dos veces en la base de datos global.

---

## 🏗️ Fases y Estructura del Proyecto

### Fase 1: Base de Datos Centralizada (MongoDB)
Diseño de los modelos de datos usando referencias:
- **Users**: Datos personales, credenciales de acceso y el ID único grabado en la tarjeta NFC.
- **Organizations**: Detalles de la entidad (empresa, colegio, etc.).
- **Memberships**: Colección que vincula a un *User* con una *Organization* determinando su rol.
- **AttendanceLogs**: Registros de lectura del ESP32 (usuario, organización, timestamp, tipo de evento: entrada o salida).

### Fase 2: Plataforma Web, Servidor y Automatizaciones (Next.js & n8n)
El servidor Next.js actuará como gestor principal, apoyado por n8n para la automatización:
- **Recepción de Datos (ESP32)**: Endpoint que valida el ID de tarjeta y el origen del lector, registrando la asistencia.
- **Automatización e IA (n8n)**: Recepción de webhooks desde el servidor para disparar notificaciones, reportes o correos automáticos (p.ej. notificar a los padres el ingreso de un estudiante).
- **Paneles Web**:
  - *Súper Administrador*: Gestión global de organizaciones.
  - *Panel de Organización*: Dashboard en tiempo real según conveniencia de la empresa (control de empleados, reportes) o colegio (entradas/salidas, carga de notas, horarios y tareas).

### Fase 3: Plataforma Móvil (React Native + Expo)
Aplicación para el usuario final (empleados, estudiantes, representantes) para proveer información en tiempo real:
- **Accesos y Reportes**: Vistas del historial de entradas/salidas.
- **Información Específica por Organización**: Si es un colegio, los padres pueden ver horarios de clase, notas y lista de tareas. Si es una empresa, visualización de horas de trabajo y estatus, adaptándose según la membresía del usuario.

### Fase 4: Integración del Hardware (ESP32)
Dispositivo externo ubicado en los puntos de control programado vía Arduino IDE. Se recomienda:
- **Mapeo de hardware**: El ESP32 envía el ID de la tarjeta NFC junto a su propia dirección MAC única. El servidor Next.js reconoce a qué organización pertenece ese lector, permitiendo que el hardware sea escalable y tenga el mismo código base ("plug and play" para el instalador).

### Fase 5: Pruebas y Despliegue
- **Pruebas de Carga**: Simulación masiva de lecturas para validar a MongoDB y Next.js.
- **Despliegue**: Plataforma web en servidores escalables, base de datos en clúster y app móvil subida a tiendas.
