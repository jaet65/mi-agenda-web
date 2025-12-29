const fs = require('fs');

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
        hour12: true // Poner en false si prefieres 24h
    };

    // Usamos Intl para formatear correctamente sin errores de servidor
    return new Intl.DateTimeFormat('es-MX', opciones).format(fecha);
};

// 2. Generar el string de versión
const fechaActual = obtenerFechaCDMX(); // Ej: "28/01/2025, 07:30 p. m."
const nuevaVersion = `1.0.${Date.now().toString().slice(-4)}`; // Ejemplo de versión autogenerada
const textoFooter = `TrackSIM v${nuevaVersion} | Actualizado: ${fechaActual}`;
const indexPath = path.join(__dirname, 'public', 'index.html');
let content = fs.readFileSync(indexPath, 'utf8');

// Reemplazar el texto dentro del span con id app-version
content = content.replace(/id="app-version">.*?<\/span>/, `id="app-version">${version}</span>`);

fs.writeFileSync(indexPath, content);
console.log(`Versión actualizada a: ${version}`);