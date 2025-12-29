const fs = require('fs');
const path = require('path'); // <--- ESTA ES LA LÍNEA QUE FALTABA

// 1. Configuración para obtener la hora exacta de CDMX
const obtenerFechaCDMX = () => {
    const fecha = new Date();
    
    // Configurar formateador con zona horaria de México
    const opciones = {
        timeZone: 'America/Mexico_City',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true // true para AM/PM, false para 24h
    };

    return new Intl.DateTimeFormat('es-MX', opciones).format(fecha);
};

// 2. Definir la ruta del archivo (Basado en tu error, está en la carpeta 'public')
const indexPath = path.join(__dirname, 'index.html'); 
// NOTA: Si tu index.html está dentro de una carpeta 'public', usa esta línea en su lugar:
// const indexPath = path.join(__dirname, 'public', 'index.html');

// 3. Generar los datos
const fechaActual = obtenerFechaCDMX(); 
// Generamos una versión basada en el timestamp para que sea única
const version = `1.0.${Math.floor(Date.now() / 1000)}`; 

console.log(`ℹ️ Generando versión: ${version} con fecha CDMX: ${fechaActual}`);

try {
    // 4. Leer el HTML
    let html = fs.readFileSync(indexPath, 'utf8');

    // 5. Reemplazar el contenido
    // Buscamos el span con id="app-version" o el texto genérico TrackSIM v...
    // Esta expresión regular busca "TrackSIM v" seguido de cualquier cosa hasta el cierre del span
    // y lo reemplaza con la nueva info.
    const regex = /TrackSIM v.*?<\/span>/;
    const nuevoContenido = `TrackSIM v${version} (${fechaActual})</span>`;

    if (html.match(regex)) {
        html = html.replace(regex, nuevoContenido);
        
        // 6. Guardar cambios
        fs.writeFileSync(indexPath, html);
        console.log("✅ index.html actualizado correctamente.");
    } else {
        console.warn("⚠️ No se encontró el patrón 'TrackSIM v...' en el HTML para reemplazar.");
    }

} catch (error) {
    console.error("❌ Error al actualizar el archivo:", error.message);
    process.exit(1); // Forzar error en GitHub Actions
}