import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

// Función auxiliar para limpiar comillas de las variables de entorno
const cleanEnvVar = (val: string | undefined): string => {
  if (!val) return "";
  return val.replace(/"/g, "").trim();
};

const endpoint = cleanEnvVar(process.env.CLOUDFLARE_R2_ENDPOINT);
const accessKeyId = cleanEnvVar(process.env.CLOUDFLARE_R2_ACCESS_KEY_ID);
const secretAccessKey = cleanEnvVar(process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY);

// Inicializar el cliente S3 configurado para Cloudflare R2
const r2Client = new S3Client({
  region: "auto",
  endpoint: endpoint,
  credentials: {
    accessKeyId: accessKeyId,
    secretAccessKey: secretAccessKey,
  },
});

/**
 * Sube un archivo en formato Buffer al bucket de R2.
 * @param buffer Contenido binario del archivo
 * @param key Ruta virtual dentro del bucket (ej: "profiles/user123_1718000000.jpg")
 * @param contentType Tipo MIME del archivo (ej: "image/jpeg")
 * @returns URL pública del archivo subido
 */
export async function uploadToR2(
  buffer: Buffer,
  key: string,
  contentType: string
): Promise<string> {
  const bucketName = cleanEnvVar(process.env.CLOUDFLARE_R2_BUCKET_NAME);
  const publicUrlRaw = cleanEnvVar(process.env.CLOUDFLARE_R2_PUBLIC_URL);

  if (!bucketName || !publicUrlRaw) {
    throw new Error("Faltan variables de entorno para Cloudflare R2");
  }

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  });

  await r2Client.send(command);

  // Asegurarnos de que el dominio público comience con https://
  let publicDomain = publicUrlRaw;
  if (!publicDomain.startsWith("http://") && !publicDomain.startsWith("https://")) {
    publicDomain = `https://${publicDomain}`;
  }

  // Normalizar el dominio público quitando la barra final
  const cleanDomain = publicDomain.endsWith("/") ? publicDomain.slice(0, -1) : publicDomain;
  return `${cleanDomain}/${key}`;
}

/**
 * Elimina un archivo del bucket de R2 a partir de su key o de su URL completa.
 * @param keyOrUrl Ruta virtual del archivo (ej: "profiles/user123.jpg") o URL pública completa
 */
export async function deleteFromR2(keyOrUrl: string): Promise<void> {
  const bucketName = cleanEnvVar(process.env.CLOUDFLARE_R2_BUCKET_NAME);
  const publicUrlRaw = cleanEnvVar(process.env.CLOUDFLARE_R2_PUBLIC_URL);

  if (!bucketName) {
    throw new Error("Falta la variable de entorno CLOUDFLARE_R2_BUCKET_NAME");
  }

  let key = keyOrUrl;

  // Si nos pasan la URL completa, extraer el key quitando el dominio público
  if (publicUrlRaw) {
    let publicDomain = publicUrlRaw;
    if (!publicDomain.startsWith("http://") && !publicDomain.startsWith("https://")) {
      publicDomain = `https://${publicDomain}`;
    }
    const cleanDomain = publicDomain.endsWith("/") ? publicDomain : `${publicDomain}/`;
    
    if (keyOrUrl.startsWith(cleanDomain)) {
      key = keyOrUrl.replace(cleanDomain, "");
    }
  }

  const command = new DeleteObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  await r2Client.send(command);
}
export { r2Client };
