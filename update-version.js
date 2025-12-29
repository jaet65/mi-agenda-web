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
// Intentará buscar el archivo en estas rutas en orden
const posiblesRutas = [
    path.join(__dirname, 'index.html'),           // En la raíz (junto al script)
    path.join(__dirname, 'public', 'index.html'), // En carpeta public
    path.join(__dirname, 'src', 'index.html'),    // En carpeta src
    path.join(__dirname, '..', 'index.html')      // En la carpeta superior (si el script está en /scripts)
];

let indexPath = null;

// Recorremos las rutas para ver cuál existe
for (const ruta of posiblesRutas) {
    if (fs.existsSync(ruta)) {
        indexPath = ruta;
        break; // ¡Encontrado!
    }
}

if (!indexPath) {
    console.error("❌ ERROR CRÍTICO: No se encontró 'index.html'.");
    console.error("   Se buscó en las siguientes rutas:");
    posiblesRutas.forEach(r => console.error(`   - ${r}`));
    process.exit(1); // Detiene el GitHub Action con error
}

// 3. Generar datos
const fechaActual = obtenerFechaCDMX();
const version = `1.0.${Math.floor(Date.now() / 1000)}`;

console.log(`ℹ️ Archivo encontrado en: ${indexPath}`);
console.log(`ℹ️ Generando versión: ${version} | Fecha: ${fechaActual}`);

try {
    let html = fs.readFileSync(indexPath, 'utf8');

    // Regex para encontrar "TrackSIM v" seguido de cualquier cosa hasta el cierre del span o final de línea
    // Adaptado para ser más flexible
    const regex = /TrackSIM v.*?<\/span>/; 
    
    // Si tu footer tiene otro formato, el script intentará buscar solo "TrackSIM v..."
    // Asegúrate que tu HTML tenga <span id="app-version">...</span> o texto similar
    
    const nuevoContenido = `TrackSIM v${version} (${fechaActual})</span>`;

    if (regex.test(html)) {
        html = html.replace(regex, nuevoContenido);
        fs.writeFileSync(indexPath, html);
        console.log("✅ ÉXITO: Versión actualizada en el HTML.");
    } else {
        console.warn("⚠️ ALERTA: No se encontró el texto 'TrackSIM v...' en el HTML para reemplazar.");
        console.warn("   Asegúrate de que en tu index.html el footer diga algo como: TrackSIM v1.0.0</span>");
    }

} catch (error) {
    console.error("❌ Error inesperado:", error.message);
    process.exit(1);
}