import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// En ESM, __dirname no está disponible, lo recreamos:
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Configuración de Fecha (CDMX)
const obtenerFechaCDMX = () => {
    const fecha = new Date();
    const opciones = {
        timeZone: 'America/Mexico_City',
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', hour12: true
    };
    return new Intl.DateTimeFormat('es-MX', opciones).format(fecha);
};

// 2. BUSCADOR INTELIGENTE DE INDEX.HTML
const posiblesRutas = [
    path.join(__dirname, 'index.html'),           // Raíz (Nueva estructura Vite)
    path.join(__dirname, 'public', 'index.html'), // Antigua estructura
    path.join(__dirname, 'src', 'index.html'),    
    path.join(__dirname, '..', 'index.html')      
];

let indexPath = null;

for (const ruta of posiblesRutas) {
    if (fs.existsSync(ruta)) {
        indexPath = ruta;
        break; 
    }
}

if (!indexPath) {
    console.error("❌ ERROR CRÍTICO: No se encontró 'index.html'.");
    process.exit(1); 
}

// 3. Generar datos
const fechaActual = obtenerFechaCDMX();
const version = `2026`; // Podrías automatizar esto con el año actual si prefieres

console.log(`ℹ️ Archivo encontrado en: ${indexPath}`);
console.log(`ℹ️ Generando versión: ${version} | Fecha: ${fechaActual}`);

try {
    // A) ACTUALIZAR EL HTML
    let html = fs.readFileSync(indexPath, 'utf8');
    const regex = /TrackSIM v.*?<\/span>/; 
    const nuevoContenido = `TrackSIM v${version} (${fechaActual})</span>`;

    if (regex.test(html)) {
        html = html.replace(regex, nuevoContenido);
        fs.writeFileSync(indexPath, html);
        console.log("✅ ÉXITO: Versión actualizada en el HTML.");
    } else {
        console.warn("⚠️ ALERTA: No se encontró el span de versión en el HTML.");
    }

    // B) CREAR ARCHIVO VERSION.JSON
    // Ahora lo creamos en la carpeta public para que sea servido por Vite
    const versionJsonPath = path.join(__dirname, 'public', 'version.json');
    const jsonContent = JSON.stringify({ version: version, fecha: fechaActual });
    
    fs.writeFileSync(versionJsonPath, jsonContent);
    console.log(`✅ ÉXITO: Archivo version.json creado en ${versionJsonPath}`);

} catch (error) {
    console.error("❌ Error inesperado:", error.message);
    process.exit(1);
}