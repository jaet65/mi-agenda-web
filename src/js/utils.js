/**
 * Formatea una fecha en formato YYYY-MM-DD a un formato legible en español
 * @param {string} fechaStr 
 * @returns {string}
 */
export function formatearFecha(fechaStr) {
    if (!fechaStr) return "";
    const [year, month, day] = fechaStr.split("-");
    const meses = [
        "Ene", "Feb", "Mar", "Abr", "May", "Jun",
        "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"
    ];
    return `${parseInt(day)} ${meses[parseInt(month) - 1]} ${year}`;
}
