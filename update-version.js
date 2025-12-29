const fs = require('fs');
const path = require('path');

// Generar una versión basada en la fecha y hora (Ej: 2023.12.18@15:30)
const now = new Date();
const version = `${now.getFullYear()}.${now.getMonth() + 1}.${now.getDate()}@${now.getHours()}:${now.getMinutes()}`;

const indexPath = path.join(__dirname, 'public', 'index.html');
let content = fs.readFileSync(indexPath, 'utf8');

// Reemplazar el texto dentro del span con id app-version
content = content.replace(/id="app-version">.*?<\/span>/, `id="app-version">${version}</span>`);

fs.writeFileSync(indexPath, content);
console.log(`Versión actualizada a: ${version}`);