# Especificación de Integración ESP32 ↔ Backend Id_CheckCard

## Endpoint de Registro de Asistencia

| Campo | Valor |
|-------|-------|
| **URL** | `POST https://<TU_DOMINIO>/api/attendance` |
| **Content-Type** | `application/json` |
| **Autenticación** | Ninguna (el ESP32 se valida por su `esp32_id` registrado) |

## Estructura del Body (JSON)

```json
{
  "card_id": "<UID_LEIDO_DE_LA_TARJETA_NFC>",
  "esp32_id": "<IDENTIFICADOR_UNICO_DEL_LECTOR>"
}
```

### Campos

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `card_id` | `string` | El UID que el módulo RFID/NFC (RC522 o PN532) lee de la tarjeta. En nuestro sistema, este UID corresponde al `_id` de MongoDB del usuario (ObjectId de 24 caracteres hex). |
| `esp32_id` | `string` | Identificador único del dispositivo ESP32, pre-registrado en el panel de Súper Admin bajo "Lectores y Dispositivos". Ejemplo: `"ESP32_ENTRADA_01"`. |

## Respuestas del Backend

### ✅ 201 Created — Registro Exitoso

El backend detecta automáticamente si es **entrada** o **salida** basándose en el último registro del día para ese usuario en esa organización.

```json
{
  "message": "Attendance logged successfully",
  "log": {
    "_id": "69d02bf74523...",
    "user_id": "69c0b8f01...",
    "organization_id": "69d02493...",
    "reader_id": "69d024a4...",
    "type": "entrada",          // "entrada" | "salida" (automático)
    "status": "on_time",        // "on_time" | "late" | "early_leave" | "overtime" | "out_of_schedule"
    "time_variance_minutes": -3, // negativo = llegó antes, positivo = llegó tarde
    "timestamp": "2026-04-03T21:09:55.123Z"
  }
}
```

**Acción ESP32:** LED Verde + 1 beep corto.

### ❌ 400 Bad Request — Campos faltantes

```json
{ "error": "Missing card_id or esp32_id" }
```

**Causa:** El JSON del body no contiene `card_id` o `esp32_id`.

### ❌ 404 Not Found — Lector o Tarjeta Desconocida

```json
{ "error": "Reader not found or unauthorized" }
```
o
```json
{ "error": "User not found for this card" }
```

**Causa:** El `esp32_id` no está registrado en el sistema, o la tarjeta NFC no está asociada a ningún usuario.

**Acción ESP32:** LED Rojo + 3 beeps largos.

### ❌ 403 Forbidden — Acceso Denegado

```json
{ "error": "Reader is not active" }
```
o
```json
{ "error": "User does not belong to this organization" }
```

**Causa:** El lector está en estado `maintenance` o `inactive`, o el usuario tiene tarjeta pero no tiene membresía en la organización a la que pertenece el lector.

**Acción ESP32:** LED Amarillo + 2 beeps medios.

## Flujo de Lógica del Backend

```
ESP32 envía { card_id, esp32_id }
      │
      ├─ 1. Buscar Reader por esp32_id
      │     └─ ¿No existe? → 404
      │     └─ ¿status ≠ active? → 403
      │
      ├─ 2. Buscar User por nfc_card_id = card_id
      │     └─ ¿No existe? → 404
      │
      ├─ 3. Verificar Membership (user + reader.organization)
      │     └─ ¿No existe? → 403
      │
      ├─ 4. Determinar tipo (entrada/salida)
      │     └─ Último log hoy del user en org:
      │           Si fue "entrada" → ahora es "salida"
      │           Si fue "salida" o no existe → ahora es "entrada"
      │
      ├─ 5. Calcular status de cumplimiento
      │     └─ Buscar horarios del grupo del usuario
      │     └─ Comparar hora actual vs horario más cercano
      │     └─ 5 min de gracia para "on_time"
      │
      ├─ 6. Crear AttendanceLog
      │
      └─ 7. Disparar webhook de notificaciones (fire-and-forget)
            └─ No bloquea la respuesta al ESP32
```

## Ejemplo de Código Arduino/ESP32

```cpp
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

const char* API_URL = "https://tu-dominio.com/api/attendance";
const char* ESP32_ID = "ESP32_ENTRADA_01";

void sendAttendance(String cardId) {
  HTTPClient http;
  http.begin(API_URL);
  http.addHeader("Content-Type", "application/json");

  StaticJsonDocument<200> doc;
  doc["card_id"] = cardId;
  doc["esp32_id"] = ESP32_ID;

  String body;
  serializeJson(doc, body);

  int httpCode = http.POST(body);
  String response = http.getString();

  if (httpCode == 201) {
    // ✅ Registro exitoso
    StaticJsonDocument<512> resDoc;
    deserializeJson(resDoc, response);
    const char* type = resDoc["log"]["type"];
    // type == "entrada" → LED verde
    // type == "salida"  → LED azul
    beepSuccess();
  } else if (httpCode == 404) {
    // ❌ Tarjeta o lector no reconocido
    beepError();
  } else if (httpCode == 403) {
    // ❌ Sin permiso (mantenimiento o sin membresía)
    beepWarning();
  }

  http.end();
}
```

## Configuración del Lector en el Panel

1. Navegar a **Lectores y Dispositivos** en el panel de Súper Admin.
2. Crear un nuevo lector con:
   - **ESP32 ID**: El mismo string hardcodeado en el firmware (ej: `ESP32_ENTRADA_01`)
   - **Organización**: La org a la que pertenece la puerta/entrada
   - **Ubicación**: Descripción física (ej: "Entrada Principal Edificio A")
3. El lector debe estar en estado **Activo** para aceptar registros.

## Formato de la Tarjeta NFC

La tarjeta NFC debe contener el **ObjectId de MongoDB** del usuario como su UID readable. Este valor de 24 caracteres hexadecimales (ejemplo: `69c0b8f0191fe3d21ef3385a`) se almacena en el campo `nfc_card_id` del documento del usuario en la base de datos.

Cuando el módulo RC522/PN532 lee la tarjeta, debe extraer este UID y enviarlo como `card_id` en el JSON del POST.
