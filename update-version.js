const fs = require('fs');
const path = require('path');

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
    path.join(__dirname, 'public', 'index.html'), 
    path.join(__dirname, 'index.html'),           
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
const version = `${Math.floor(Date.now() / 1000)}`;

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

    // B) CREAR ARCHIVO VERSION.JSON (NUEVO)
    // Esto crea un archivo ligero que la app consultará
    const dir = path.dirname(indexPath);
    const versionJsonPath = path.join(dir, 'version.json');
    const jsonContent = JSON.stringify({ version: version, fecha: fechaActual });
    
    fs.writeFileSync(versionJsonPath, jsonContent);
    console.log(`✅ ÉXITO: Archivo version.json creado en ${versionJsonPath}`);

} catch (error) {
    console.error("❌ Error inesperado:", error.message);
    process.exit(1);
}