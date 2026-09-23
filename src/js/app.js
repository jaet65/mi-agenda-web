import { Calendar } from "fullcalendar";
import multiMonthPlugin from "@fullcalendar/multimonth"; // Nota: Puede que necesitemos instalar esto si no está en el bundle principal, pero probaremos con el import directo si el bundle lo permite.
import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import * as XLSX from "xlsx";
import html2canvas from "html2canvas";
import html2pdf from "html2pdf.js";
import { PDFDocument } from "pdf-lib";

// Cache para evitar recargas
const aniosCargados = new Set();
let cargandoDatos = false; // Semáforo para no llamar dos veces seguidas

const API_KEY_HERE = "vtP_Ocp9-jUl3SG6HpMHLSaRQoumNPiDV7SyOYmNkZA"; // Reemplaza con tu llave de HERE

// --- DETECCIÓN DE SWIPE (DESLIZAR) PARA CAMBIAR AÑO ---
const sidebarSwipe = document.getElementById("map-sidebar");
let touchStartX = 0;
let touchEndX = 0;

// 1. Detectar dónde empieza el toque
sidebarSwipe.addEventListener("touchstart", (e) => {
    touchStartX = e.changedTouches[0].screenX;
}, { passive: true });

// 2. Detectar dónde termina el toque
sidebarSwipe.addEventListener("touchend", (e) => {
    touchEndX = e.changedTouches[0].screenX;
    manejarSwipe();
}, { passive: true });

function manejarSwipe() {
    if (!sidebarSwipe.classList.contains("open")) return;
    // Mínima distancia para considerar que fue un deslizamiento intencional (50px)
    const umbral = 50;
    const distancia = touchEndX - touchStartX;

    if (Math.abs(distancia) < umbral) return; // Fue un toque accidental o muy corto

    if (distancia < 0) {
        // Deslizó hacia la IZQUIERDA ( <-- ) 
        // Significa "Traer el futuro", avanzar año
        cambiarAnoMapa(1);
        animarCambioAno("derecha"); // Opcional: Feedback visual
    } else {
        // Deslizó hacia la DERECHA ( --> )
        // Significa "Traer el pasado", retroceder año
        cambiarAnoMapa(-1);
        animarCambioAno("izquierda"); // Opcional: Feedback visual
    }
}

// Pequeña animación visual para confirmar la acción
function animarCambioAno(direccion) {
    const display = document.getElementById("map-year-display");
    display.style.transition = "transform 0.2s, opacity 0.2s";

    // Efecto de salida
    const x = direccion === "derecha" ? "-20px" : "20px";
    display.style.transform = `translateX(${x})`;
    display.style.opacity = "0.5";

    setTimeout(() => {
        // Restaurar
        display.style.transform = "translateX(0)";
        display.style.opacity = "1";
    }, 200);
}

// --- DETECCIÓN DE GESTOS DEFINITIVA (ZOOM Y SWIPE) ---
const calendarElement = document.getElementById("calendar");
let touchStartXCal = 0;
let touchEndXCal = 0;

let distanciaInicioPinch = 0;
let isPinching = false;

calendarElement.addEventListener("touchstart", (e) => {
    if (e.touches.length === 2) {
        isPinching = true;
        distanciaInicioPinch = Math.hypot(
            e.touches[0].pageX - e.touches[1].pageX,
            e.touches[0].pageY - e.touches[1].pageY
        );
    } else {
        isPinching = false;
        touchStartXCal = e.changedTouches[0].screenX;
    }
}, { passive: true });

calendarElement.addEventListener("touchmove", (e) => {
    if (isPinching && e.touches.length === 2) {
        const distanciaActual = Math.hypot(
            e.touches[0].pageX - e.touches[1].pageX,
            e.touches[0].pageY - e.touches[1].pageY
        );

        // Sensibilidad 20px
        if (Math.abs(distanciaActual - distanciaInicioPinch) > 20) {
            if (distanciaActual > distanciaInicioPinch) {
                ajustarZoom(-1); // Zoom In (Menos columnas)
            } else {
                ajustarZoom(1);  // Zoom Out (Más columnas)
            }
            distanciaInicioPinch = distanciaActual;
        }
    }
}, { passive: true });

calendarElement.addEventListener("touchend", (e) => {
    if (!isPinching && e.changedTouches.length > 0) {
        touchEndXCal = e.changedTouches[0].screenX;
        manejarSwipeCalendario();
    }
    if (e.touches.length < 2) isPinching = false;
}, { passive: true });

function manejarSwipeCalendario() {
    if (isPinching || !calendar) return;
    const diff = touchEndXCal - touchStartXCal;
    if (Math.abs(diff) < 150) return; // Aumentado a 150 para reducir la sensibilidad

    if (diff < 0) calendar.next();
    else calendar.prev();
}

function ajustarZoom(delta) {
    if (!calendar || calendar.view.type !== "multiMonthYear") return;

    // Detectar límites
    const esCelular = window.innerWidth < 768;
    const limiteMax = esCelular ? 2 : 4;

    // Leer valor actual (ahora sí funciona leerlo directo)
    let colsActuales = calendar.getOption("multiMonthMaxColumns") || (esCelular ? 1 : 4);
    let nuevasCols = colsActuales + delta;

    if (nuevasCols < 1) nuevasCols = 1;
    if (nuevasCols > limiteMax) nuevasCols = limiteMax;

    if (nuevasCols !== colsActuales) {
        // Aplicar cambio directo
        calendar.setOption("multiMonthMaxColumns", nuevasCols);
        console.log(`Zoom: ${colsActuales} -> ${nuevasCols}`);
    }
}

import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, query, where, writeBatch, updateDoc, setDoc } from "firebase/firestore";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { ADMIN_EMAILS } from "./admin-config.js"; // Importar ADMIN_EMAILS
window.toggleMenu = function () {
    const menu = document.getElementById("mobile-menu");
    if (menu) {
        menu.classList.toggle("open");
    }
};

const firebaseConfig = {
    apiKey: "AIzaSyCN7AD2GO_Ks4tcMxLMkG6jODKUaTPwlIk",
    authDomain: "agendaservicios.firebaseapp.com",
    projectId: "agendaservicios",
    storageBucket: "agendaservicios.firebasestorage.app",
    messagingSenderId: "1068275517204",
    appId: "1:1068275517204:web:9bdd41c8233bc1fda06401"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app); // Inicializar Firebase Auth
const db = getFirestore(app);

let calendar;
let map;
let markers = [];
let esAdmin = false;
let currentTileLayer; // Para poder cambiar el tema del mapa
const HERE_STYLE_LIGHT = "explore.day";
const HERE_STYLE_DARK = "lite.night"; // Estilo oscuro de HERE Maps

let eventoSeleccionadoID = null;
let grupoSeleccionadoID = null;
let statsPorAno = {};
let montosPorAno = {};

let modoEdicion = false;
let idGrupoEdicion = null;
let urlEdicion = null;
let costoEdicion = null;
let estadoFacturaEdicion = "Sin facturar";
let estadoFacturaActual = "Sin facturar";
let globalReservas = []; // Inicializar como array vacío
let currentMapYear = new Date().getFullYear();

// Icono para la reserva más próxima (Gold)
const goldIcon = new L.Icon({
    iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const blueIcon = new L.Icon({
    iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const redIcon = new L.Icon({
    iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const greyIcon = new L.Icon({
    iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-grey.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

document.addEventListener("DOMContentLoaded", function () {
    // --- GESTIÓN DE TEMA (MODO OSCURO) ---
    // Inyectamos los botones y aplicamos el tema guardado.
    inyectarBotonesTema();
    applyTheme(localStorage.getItem("agenda_theme") || "light");

    var calendarEl = document.getElementById("calendar");
    const esMovil = window.innerWidth < 768;

    const headerYearLabel = document.getElementById("header-year-label");
    if (headerYearLabel) headerYearLabel.textContent = currentMapYear;

    // 1. Configuración del Calendario (Esto es ligero)
    calendar = new Calendar(calendarEl, {
        plugins: [multiMonthPlugin], // Añadir el plugin si usamos imports individuales
        eventContent: function (arg) {
            let container = document.createElement("div");
            container.style.display = "flex";
            container.style.justifyContent = "space-between";
            container.style.alignItems = "center";
            container.style.width = "100%";
            container.style.padding = "0 2px";

            let titleEl = document.createElement("div");
            titleEl.innerHTML = arg.event.title;
            titleEl.style.overflow = "hidden";
            titleEl.style.textOverflow = "ellipsis";
            titleEl.style.whiteSpace = "nowrap";
            container.appendChild(titleEl);

            if (arg.event.extendedProps.pdfUrl) {
                let iconEl = document.createElement("span");
                iconEl.innerHTML = " 📎";
                iconEl.style.fontSize = "1.0em";
                iconEl.style.marginLeft = "4px";
                iconEl.style.color = "white";
                container.appendChild(iconEl);
            }
            return { domNodes: [container] };
        },
        // Nuevo: Permite añadir atributos personalizados al DOM del evento para fácil selección
        eventDidMount: function (info) {
            if (info.el) {
                info.el.setAttribute("data-event-id", info.event.id);
            }
        },
        height: "100%",
        initialView: "multiMonthYear",
        locale: "es",

        customButtons: {
            // CAMBIO 1: Al hacer clic en HOY, forzamos la vista de AÑO y vamos a la fecha
            btnHoy: {
                text: "Hoy",
                click: function () {
                    calendar.changeView("multiMonthYear");
                    calendar.today();
                }
            },
            btnCustomAgenda: {
                text: "Agenda",
                click: function () { mostrarVistaAgenda(); }
            }
        },

        headerToolbar: {
            left: "prev,next btnHoy",
            center: "title",
            // CAMBIO 2: Quitamos 'dayGridMonth' de la barra derecha
            right: "btnCustomAgenda"
        },

        views: {
            // CAMBIO 3: Eliminamos la configuración de dayGridMonth
            multiMonthYear: { buttonText: "Año" }
        },

        dateClick: function (info) {
            if (!esAdmin) return;
            const parts = info.dateStr.split("-");
            const localDate = new Date(parts[0], parts[1] - 1, parts[2]);
            if (localDate.getDay() === 0) { alert("⛔ Servicio no disponible los domingos."); return; }
            const fechaClickeada = info.dateStr;
            const ocupado = globalReservas.some(r => fechaClickeada >= r.data.fechaInicio && fechaClickeada <= r.data.fechaFin);
            if (ocupado) alert("⚠️ Fecha no disponible.");
            else abrirModalCrear(info.dateStr);
        },
        eventClick: function (info) {
            if (info.event.display === "background") return;
            if (info.event.start.getDay() === 0) { alert("⛔ Servicio no disponible los domingos."); return; }
            mostrarDetalles(info.event);
        }
    });

    // 2. Renderizar el calendario vacío (Instantáneo)
    calendar.render();

    // 3. Inicializar Mapa (Ligero si no agregamos pines aún)
    map = L.map("map-canvas").setView([23.6345, -102.5528], 5);
    setMapTileLayer(); // Usar la nueva función para establecer el mapa base
    document.getElementById("map-year-display").textContent = currentMapYear;

    // 4. CARGA DE DATOS DIFERIDA (EL TRUCO FINAL)
    // Esperamos 100ms para que el navegador termine de pintar la interfaz inicial.
    // Esto saca la carga de datos del proceso de arranque (DOMContentLoaded).
    setTimeout(() => {
        cargarReservas();

        // --- NOTIFICACIONES ---
        // 1. Solicitar permiso al cargar la app
        solicitarPermisoNotificaciones().then(permissionGranted => {
            // 2. Revisar eventos próximos cada hora si tenemos permiso
            if (permissionGranted) setInterval(verificarEventosProximos, 3600000); // 3600000 ms = 1 hora
        });
    }, 100);
});

function inyectarBotonesTema() {
    // Solo inyectamos en el menú (que ahora es el mismo para desktop y móvil)
    const menuContainer = document.getElementById("mobile-menu");
    if (menuContainer) {
        const themeBtn = document.createElement("button");
        themeBtn.id = "menu-btn-theme-toggle";
        themeBtn.innerHTML = "🌓 Cambiar Tema";
        themeBtn.addEventListener("click", toggleTheme);

        // Añadir una sección de "Apariencia" para el botón
        const appearanceTitle = document.createElement("div");
        appearanceTitle.className = "mobile-section-title";
        appearanceTitle.innerText = "APARIENCIA";

        // Insertar el título y el botón al principio del menú
        menuContainer.insertBefore(themeBtn, menuContainer.firstChild);
        menuContainer.insertBefore(appearanceTitle, themeBtn);
    }
}

function applyTheme(theme) {
    if (theme === "dark") {
        document.body.classList.add("dark-mode");
    } else {
        document.body.classList.remove("dark-mode");
    }
    // Actualizar el mapa si ya está inicializado
    if (map) {
        setMapTileLayer();
    }
}

function toggleTheme() {
    const currentTheme = document.body.classList.contains("dark-mode") ? "light" : "dark";
    localStorage.setItem("agenda_theme", currentTheme);
    applyTheme(currentTheme);
}

function setMapTileLayer() {
    if (!map) return;

    if (currentTileLayer) {
        map.removeLayer(currentTileLayer);
    }
    const isDark = document.body.classList.contains("dark-mode");
    const style = isDark ? HERE_STYLE_DARK : HERE_STYLE_LIGHT;

    currentTileLayer = L.tileLayer(`https://maps.hereapi.com/v3/base/mc/{z}/{x}/{y}/png8?style=${style}&apiKey=${API_KEY_HERE}`, {
        attribution: "© 2024 HERE",
        maxZoom: 20
    }).addTo(map);
}

// --- NOTIFICACIONES DE ESCRITORIO (CLIENT-SIDE) ---

// 2. Verificar eventos y pedir al Service Worker que notifique
// Se mueve esta función a una posición anterior para que esté definida cuando se le llama.
async function verificarEventosProximos() {
    // globalReservas está inicializado como array vacío, así que `.length` es seguro.
    if (Notification.permission !== "granted" || globalReservas.length === 0) return;

    const swRegistration = await navigator.serviceWorker.ready;
    if (!swRegistration) return;

    // Obtenemos las fechas clave para las notificaciones
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0); // Normalizar a inicio del día
    const manana = new Date(hoy);
    manana.setDate(hoy.getDate() + 1);
    const semana = new Date(hoy);
    semana.setDate(hoy.getDate() + 7);

    // Convertimos a formato YYYY-MM-DD
    const hoyStr = hoy.toISOString().split("T")[0];
    const mananaStr = manana.toISOString().split("T")[0];
    const semanaStr = semana.toISOString().split("T")[0];

    // El sistema de notificados ahora guarda el ID y el tipo de aviso (ej: "idReserva_7d")
    const notificados = JSON.parse(localStorage.getItem("notificacionesEnviadas") || "[]");

    for (const reserva of globalReservas) {
        const id = reserva.id;
        const fechaInicio = reserva.data.fechaInicio; // Esto es YYYY-MM-DD
        const body = `Cliente: ${reserva.data.cliente}
Ciudad: ${reserva.data.ciudad}`;

        // Notificación de 7 días
        if (fechaInicio === semanaStr && !notificados.includes(`${id}_7d`)) {
            swRegistration.showNotification("🗓️ Servicio en 1 Semana", { body, icon: "./icon-192.png" });
            notificados.push(`${id}_7d`);
        }

        // Notificación de 1 día
        if (fechaInicio === mananaStr && !notificados.includes(`${id}_1d`)) {
            swRegistration.showNotification("🗓️ Servicio Mañana", { body, icon: "./icon-192.png" });
            notificados.push(`${id}_1d`);
        }

        // Notificación del mismo día
        if (fechaInicio === hoyStr && !notificados.includes(`${id}_0d`)) {
            swRegistration.showNotification("✅ Servicio para Hoy", { body, icon: "./icon-192.png" });
            notificados.push(`${id}_0d`);
        }
    }
    localStorage.setItem("notificacionesEnviadas", JSON.stringify(notificados));
}

// --- NOTIFICACIONES DE ESCRITORIO (CLIENT-SIDE) ---

// 1. Solicitar permiso al usuario (Devuelve una promesa)
async function solicitarPermisoNotificaciones() {
    if (!("Notification" in window) || !navigator.serviceWorker) {
        console.log("Este navegador no soporta notificaciones.");
        return false;
    }
    // Si el permiso ya fue concedido, no hacemos nada y devolvemos true
    if (Notification.permission === "granted") {
        console.log("El permiso de notificación ya estaba concedido.");
        verificarEventosProximos(); // Hacemos una primera verificación al cargar
        return true;
    }
    // Si fue denegado, no podemos volver a preguntar
    if (Notification.permission === "denied") {
        console.log("El permiso de notificación fue denegado previamente.");
        return false;
    }
    // Si no se ha decidido (default), solicitamos permiso
    const permission = await Notification.requestPermission();
    if (permission === "granted") { console.log("Permiso de notificación concedido."); verificarEventosProximos(); return true; }
    return false;
}

// Función centralizada para actualizar la UI en base al estado de 'esAdmin'
function actualizarUIConEstadoAdmin() {
    const adminStatus = document.getElementById("admin-status");

    // Elementos del menú unificado
    const menuLogin = document.getElementById("mobile-btn-login");
    const menuLogout = document.getElementById("mobile-btn-logout");
    const menuReporte = document.getElementById("mobile-btn-reporte");
    const menuHojaRuta = document.getElementById("mobile-btn-hoja-ruta");
    const menuImport = document.getElementById("mobile-btn-import");

    if (esAdmin) {
        if (adminStatus && auth.currentUser) adminStatus.innerText = "🔰";
        if (adminStatus) adminStatus.style.display = "inline-block";

        // Items del menú
        if (menuLogin) menuLogin.style.display = "none";
        if (menuLogout) menuLogout.style.display = "block";
        if (menuReporte) menuReporte.style.display = "block";
        if (menuHojaRuta) menuHojaRuta.style.display = "block";
        if (menuImport) menuImport.style.display = "block";
    } else {
        if (adminStatus) adminStatus.style.display = "none";

        // Items del menú
        if (menuLogin) menuLogin.style.display = "block";
        if (menuLogout) menuLogout.style.display = "none";
        if (menuReporte) menuReporte.style.display = "none";
        if (menuHojaRuta) menuHojaRuta.style.display = "none";
        if (menuImport) menuImport.style.display = "none";
    }
    actualizarHeaderAdmin();
}

// --- Manejo del estado de autenticación (Mantener sesión activa si el usuario recarga) ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        // Usuario autenticado. Verificar si es admin.
        if (ADMIN_EMAILS.includes(user.email)) {
            esAdmin = true;
            console.log(`Sesión reestablecida como administrador: ${user.email}`);
        } else {
            // Si por alguna razón el usuario autenticado no está en la lista ADMIN_EMAILS,
            // lo deslogueamos. Esto es una medida de seguridad.
            signOut(auth);
            esAdmin = false;
            console.warn(`Usuario autenticado (${user.email}) no es administrador y fue deslogueado.`);
        }
    } else {
        esAdmin = false; // Usuario no autenticado
    }
    actualizarUIConEstadoAdmin(); // Llama a una función para actualizar la UI según 'esAdmin'
});

// --- BUSCADOR GLOBAL ---
const searchInput = document.getElementById("globalSearch");
const resultsList = document.getElementById("globalSearchResults");

searchInput.addEventListener("input", function () {
    const texto = this.value.toLowerCase().trim();
    resultsList.innerHTML = "";
    if (texto.length < 2) { resultsList.style.display = "none"; return; }

    const encontrados = globalReservas.filter(r => {
        const cliente = (r.data.cliente || "").toLowerCase();
        const ciudad = (r.data.ciudad || "").toLowerCase();
        return cliente.includes(texto) || ciudad.includes(texto);
    }).sort((a, b) => a.start - b.start).slice(0, 8);

    if (encontrados.length === 0) { resultsList.style.display = "none"; return; }
    resultsList.style.display = "block";

    encontrados.forEach(reserva => {
        const li = document.createElement("li");
        li.className = "search-result-item";
        const fechaStr = formatearFecha(reserva.data.fechaInicio);
        li.innerHTML = `
            <div>
                <div class="result-main">👤 ${reserva.data.cliente}</div>
                <div class="result-sub">📍 ${reserva.data.ciudad.split(",")[0]}</div>
            </div>
            <div class="result-sub" style="color:#007bff;">${fechaStr}</div>
        `;
        li.onclick = () => { seleccionarResultado(reserva); };
        resultsList.appendChild(li);
    });
});

document.addEventListener("click", (e) => {
    if (!searchInput.contains(e.target) && !resultsList.contains(e.target)) { resultsList.style.display = "none"; }
});

window.seleccionarResultado = function (reserva) {
    resultsList.style.display = "none";
    searchInput.value = "";
    const mapaVisible = document.getElementById("map-view").style.display !== "none";

    if (mapaVisible) {
        const yearReserva = reserva.start.getFullYear();
        if (yearReserva !== currentMapYear) {
            currentMapYear = yearReserva;
            document.getElementById("map-year-display").textContent = currentMapYear;
            actualizarMapaYLista();
        }
        if (reserva.data.lat && reserva.data.lng) {
            map.flyTo([reserva.data.lat, reserva.data.lng], 12);
            setTimeout(() => {
                const marker = markers.find(m => {
                    const mLL = m.getLatLng();
                    return Math.abs(mLL.lat - reserva.data.lat) < 0.0001 && Math.abs(mLL.lng - reserva.data.lng) < 0.0001;
                });
                if (marker) marker.openPopup();
            }, 500);
        } else { alert("Esta reserva no tiene coordenadas."); }
    } else {
        if (document.getElementById("agenda-view").style.display === "block") {
            mostrarCalendario();
        }
        resaltarEventoEnCalendario(reserva.id);
    }
};

// Nueva función para resaltar un evento en el calendario
function resaltarEventoEnCalendario(reservaId) {
    // Asegurarse de que la vista de calendario esté activa
    if (document.getElementById("calendar-container").style.display === "none") {
        mostrarCalendario();
    }

    const evento = calendar.getEventById(reservaId);
    if (!evento) {
        console.warn(`Evento con ID ${reservaId} no encontrado en el calendario.`);
        return;
    }

    // Navegar a la fecha del evento
    calendar.gotoDate(evento.start);

    // Pequeño retraso para asegurar que FullCalendar ha renderizado el evento
    setTimeout(() => {
        // Seleccionar el elemento DOM del evento
        // Usamos el atributo data-event-id que añadimos en eventDidMount
        const eventEl = document.querySelector(`.fc-event[data-event-id='${reservaId}']`);

        if (eventEl) {
            eventEl.classList.add("event-blink");
            // Quitar la animación después de unos segundos
            setTimeout(() => {
                eventEl.classList.remove("event-blink");
            }, 3000); // Parpadea por 3 segundos

            // Opcional: Hacer scroll al evento si está fuera de la vista
            eventEl.scrollIntoView({ behavior: "smooth", block: "center" });
        }
    }, 300); // Esperar 300ms para el renderizado
}

// --- AUTOCOMPLETE DE DIRECCIÓN (MEJORADO PARA DIRECCIONES COMPLEJAS) ---
const inputDireccion = document.getElementById("direccionInput");
const listaSugerencias = document.getElementById("listaSugerencias");
let timeoutBuscador = null;

inputDireccion.addEventListener("input", function () {
    const texto = this.value;

    document.getElementById("latTemp").value = "";
    document.getElementById("lonTemp").value = "";

    listaSugerencias.innerHTML = "";
    listaSugerencias.style.display = "none";

    if (texto.length < 3) return;

    clearTimeout(timeoutBuscador);
    timeoutBuscador = setTimeout(async () => {
        try {
            // Detectar si el usuario escribió un CP (5 dígitos)
            const matchCP = texto.match(/\b\d{5}\b/);
            const cpEncontrado = matchCP ? matchCP[0] : null;

            // URL base con búsqueda libre
            let url = `https://geocode.search.hereapi.com/v1/geocode?q=${encodeURIComponent(texto)}&apiKey=${API_KEY_HERE}&lang=es&limit=8`;

            // Si hay CP, usamos el parámetro qq (Qualified Query) para filtrar por código postal
            if (cpEncontrado) {
                url += `&qq=postalCode=${cpEncontrado}`;
            }

            const respuesta = await fetch(url);
            const data = await respuesta.json();

            if (data.items && data.items.length > 0) {
                listaSugerencias.style.display = "block";
                data.items.forEach(item => {
                    const li = document.createElement("li");
                    li.className = "suggestion-item";

                    // Extraer ciudad/localidad de la jerarquía de HERE
                    const ciudad = item.address.city || item.address.locality || item.address.district || "";

                    li.innerHTML = `<strong>📍 ${item.title}</strong><br><small>${item.address.label}</small>`;

                    li.onclick = function () {
                        inputDireccion.value = item.address.label;
                        document.getElementById("latTemp").value = item.position.lat;
                        document.getElementById("lonTemp").value = item.position.lng;
                        document.getElementById("ciudadInput").value = ciudad;
                        listaSugerencias.style.display = "none";
                    };
                    listaSugerencias.appendChild(li);
                });
            }
        } catch (e) { console.error("Error en HERE Maps:", e); }
    }, 600);
});

const inputCiudad = document.getElementById("ciudadInput");
const listaSugerenciasCiudad = document.getElementById("listaSugerenciasCiudad");
let timeoutCiudad = null;

inputCiudad.addEventListener("input", function () {
    if (this.readOnly) return;
    const texto = this.value.trim();
    const API_KEY_HERE = "vtP_Ocp9-jUl3SG6HpMHLSaRQoumNPiDV7SyOYmNkZA";

    listaSugerenciasCiudad.innerHTML = "";
    listaSugerenciasCiudad.style.display = "none";

    if (texto.length < 3) return;

    clearTimeout(timeoutCiudad);
    timeoutCiudad = setTimeout(async () => {
        try {
            const matchCP = texto.match(/\b\d{5}\b/);
            let url = `https://geocode.search.hereapi.com/v1/geocode?apiKey=${API_KEY_HERE}&lang=es&limit=5`;

            if (matchCP) {
                // Si el texto es un CP, busca la ciudad vinculada a él
                url += `&qq=postalCode=${matchCP[0]}`;
            } else {
                // Si es texto normal, busca por nombre de ciudad
                url += `&q=${encodeURIComponent(texto)}&types=city`;
            }

            const respuesta = await fetch(url);
            const data = await respuesta.json();

            if (data.items && data.items.length > 0) {
                listaSugerenciasCiudad.style.display = "block";
                data.items.forEach(item => {
                    const li = document.createElement("li");
                    li.className = "suggestion-item";

                    const nombreCiudad = item.address.city || item.address.locality || item.title;
                    const estado = item.address.state || "";

                    li.innerHTML = `<strong>🏙️ ${nombreCiudad}</strong><br><small>${estado}, CP: ${item.address.postalCode || ""}</small>`;

                    li.onclick = function () {
                        inputCiudad.value = nombreCiudad;
                        if (!document.getElementById("latTemp").value) {
                            document.getElementById("latTemp").value = item.position.lat;
                            document.getElementById("lonTemp").value = item.position.lng;
                        }
                        listaSugerenciasCiudad.style.display = "none";
                    };
                    listaSugerenciasCiudad.appendChild(li);
                });
            }
        } catch (e) { console.error("Error ciudad CP:", e); }
    }, 400);
});
document.addEventListener("click", function (e) {
    if (e.target !== inputDireccion) listaSugerencias.style.display = "none";
    if (e.target !== inputCiudad) listaSugerenciasCiudad.style.display = "none";
});

// --- GUARDAR RESERVA ---
window.guardarReserva = async function () {
    // 1. Obtener valores del formulario
    const fechaInicioStr = document.getElementById("fechaInicio").value;
    const fechaFinStr = document.getElementById("fechaFin").value;
    const ciudad = document.getElementById("ciudadInput").value;
    const nombre = document.getElementById("nombreInput").value;
    const direccion = document.getElementById("direccionInput").value;

    const esEspecial = document.getElementById("eventoEspecialCheck").checked;
    // Coordenadas (pueden venir de un Plus Code previo o estar vacías)
    let lat = document.getElementById("latTemp").value;
    let lon = document.getElementById("lonTemp").value;

    // 2. Validaciones básicas
    if (nombre === "" || fechaInicioStr === "") {
        alert("⚠️ Faltan datos obligatorios: Cliente o Fechas.");
        return;
    }

    // 3. LÓGICA DE BÚSQUEDA DE MAPA
    // Solo buscamos si NO tenemos coordenadas fijadas Y hay texto en la dirección
    if ((lat === "" || lon === "") && direccion.length > 2) {
        const btn = document.querySelector("#reservaModal .btn-save");
        const textoOriginal = btn.innerHTML; // Guardamos el texto actual del botón

        // Feedback visual de carga
        btn.innerHTML = "<span class=\"loader\"></span> Buscando en Mapa...";
        btn.disabled = true;

        try {
            const matchCP = direccion.match(/\b\d{5}\b/);
            const cpEncontrado = matchCP ? matchCP[0] : null;

            let url = `https://geocode.search.hereapi.com/v1/geocode?q=${encodeURIComponent(direccion)}&apiKey=${API_KEY_HERE}&lang=es&limit=5`;

            if (cpEncontrado) {
                url += `&qq=postalCode=${cpEncontrado}`;
            }

            const resp = await fetch(url);
            const data = await resp.json();

            // Restauramos el botón antes de decidir qué hacer
            btn.innerHTML = textoOriginal;
            btn.disabled = false;

            if (data.items && data.items.length > 0) {
                // CASO A: Encontramos ubicación
                // Llamamos al selector, el cual llenará lat/lon y CERRARÁ el proceso.
                // Esto permite al usuario editar el texto de la dirección antes de volver a dar clic en guardar.
                mostrarSelectorUbicacion(data.items);
                return; // <--- IMPORTANTE: DETENEMOS AQUÍ
            } else {
                // CASO B: No encontramos nada, mostramos opciones manuales
                mostrarModalSinResultados();
                return; // <--- IMPORTANTE: DETENEMOS AQUÍ
            }
        } catch (e) {
            console.error(e);
            alert("Error de conexión con HERE Maps.");
            btn.innerHTML = textoOriginal;
            btn.disabled = false;
            habilitarManual();
            return;
        }
    }

    // 4. PROCESAMIENTO DE DATOS
    // Si llegamos aquí es porque:
    // a) Ya teníamos coordenadas fijadas (lat/lon tienen valor).
    // b) O el usuario decidió guardar "Sin Ciudad" (lat/lon vacíos, pero se asume manual).

    let ciudadFinal = ciudad.trim();
    if (ciudadFinal === "" || ciudadFinal === "Desconocida" || ciudadFinal === "Ubicación") {
        const partes = direccion.split(",");
        if (partes.length >= 2) {
            ciudadFinal = partes[partes.length - 2].replace(/\d+/g, "").trim();
        } else {
            ciudadFinal = "Sin Ciudad";
        }
    }

    const rangos = calcularRangosSinDomingo(fechaInicioStr, fechaFinStr);
    if (rangos.length === 0) {
        alert("⚠️ No has seleccionado ningún día laborable.");
        return;
    }

    const grupoId = modoEdicion ? idGrupoEdicion : Date.now().toString();

    // UI Guardando
    const btnFinal = document.querySelector("#reservaModal .btn-save");
    btnFinal.innerHTML = "💾 Guardando...";
    btnFinal.disabled = true;

    try {
        // Si es edición, borramos lo anterior
        if (modoEdicion && idGrupoEdicion) {
            const q = query(collection(db, "reservas"), where("groupId", "==", idGrupoEdicion));
            const querySnapshot = await getDocs(q);
            const batch = writeBatch(db);
            querySnapshot.forEach((doc) => { batch.delete(doc.ref); });
            await batch.commit();
        }

        // Guardamos en Firebase
        for (let r of rangos) {
            let fInicio = r.start.toISOString().split("T")[0];
            let fFin = r.end.toISOString().split("T")[0];

            await addDoc(collection(db, "reservas"), {
                fechaInicio: fInicio,
                fechaFin: fFin,
                ciudad: ciudadFinal,
                cliente: nombre,
                direccion: direccion, // <--- Aquí se guarda el texto que tú editaste (ej. "Parque Industrial")
                lat: lat,             // <--- Aquí se guardan las coordenadas del Plus Code (ej. RVJV+VQ)
                lng: lon,
                groupId: grupoId,
                creado: new Date(),
                pdfUrl: urlEdicion,
                esEspecial: esEspecial,
                costo: (costoEdicion !== undefined && costoEdicion !== null) ? costoEdicion : null,
                estadoFactura: estadoFacturaEdicion || "Sin facturar"
            });
        }

        await cargarReservas(true);
        cerrarModal("reservaModal");
        document.getElementById("successModal").style.display = "block";
    } catch (e) {
        console.error(e);
        alert("Error al guardar en base de datos.");
    } finally {
        // Restauramos el botón a su estado original para la próxima vez
        btnFinal.innerHTML = "💾 Guardar Reserva";
        btnFinal.style.background = "#28a745";
        btnFinal.disabled = false;
    }
};

window.mostrarSelectorUbicacion = function (items) {
    const lista = document.getElementById("listaCoincidencias");
    lista.innerHTML = "";

    items.forEach(item => {
        const li = document.createElement("li");
        li.className = "match-item";

        // Extraemos datos de HERE
        const ciudad = item.address.city || item.address.locality || item.address.district || "Ubicación";
        const direccionDetectada = item.address.label;

        li.innerHTML = `<strong>${ciudad}</strong><br><small>${direccionDetectada}</small>`;

        li.onclick = function () {
            // 1. Llenamos las coordenadas (Lo más importante)
            document.getElementById("latTemp").value = item.position.lat;
            document.getElementById("lonTemp").value = item.position.lng;

            // 2. Llenamos ciudad y dirección sugerida
            document.getElementById("ciudadInput").value = ciudad;
            document.getElementById("direccionInput").value = direccionDetectada;

            // 3. CAMBIO IMPORTANTE:
            // Ya NO guardamos automáticamente. 
            // Cerramos el modal y avisamos al usuario que puede editar.
            cerrarModal("selectionModal");

            // 4. Enfocamos el campo de dirección para que puedas editarlo si salió genérico
            const inputDir = document.getElementById("direccionInput");
            inputDir.focus();
            inputDir.select(); // Selecciona el texto para borrarlo fácil si quieres

            // Cambiamos el texto del botón para indicar que ya tenemos ubicación
            const btnSave = document.querySelector("#reservaModal .btn-save");
            btnSave.innerHTML = "✅ Ubicación fijada. Clic para Guardar.";
            btnSave.style.background = "#17a2b8"; // Color azul informativo
        };
        lista.appendChild(li);
    });
    document.getElementById("selectionModal").style.display = "block";
};

window.mostrarModalSinResultados = function () {
    const lista = document.getElementById("listaCoincidencias");
    lista.innerHTML = "<li style='padding:15px; color:#666;'>No se encontraron coincidencias exactas.</li>";
    document.getElementById("selectionModal").style.display = "block";
};

window.habilitarManual = function () {
    const inputC = document.getElementById("ciudadInput");
    inputC.readOnly = false;
    inputC.placeholder = "Escribe ciudad para buscar...";
    inputC.focus();
    cerrarModal("selectionModal");
};

window.usarSinCiudad = function () {
    document.getElementById("ciudadInput").value = "Sin Ciudad";
    cerrarModal("selectionModal");
    guardarReserva();
};

window.reintentarDireccion = function () {
    cerrarModal("selectionModal");
    document.getElementById("direccionInput").focus();
};

function calcularEstadisticas() {
    statsPorAno = {};
    montosPorAno = {};
    const gruposProcesadosPorAno = {};

    globalReservas.forEach(item => {
        if (item.data.esEspecial === true) {
            return; // Excluir eventos especiales del cálculo
        }

        const fechaStringInicio = item.data.fechaInicio;
        const fechaStringFin = item.data.fechaFin;
        if (!fechaStringInicio) return;

        const current = new Date(fechaStringInicio + "T12:00:00");
        const fechaLimite = new Date(fechaStringFin + "T12:00:00");

        let diasTotales = Math.floor((fechaLimite - current) / (1000 * 60 * 60 * 24)) + 1;
        if (diasTotales < 1) diasTotales = 1;

        const semanas = diasTotales / 5;
        const yearInicio = new Date(fechaStringInicio + "T12:00:00").getFullYear();

        // 1. Semanas por año
        if (!statsPorAno[yearInicio]) {
            statsPorAno[yearInicio] = 0;
        }
        statsPorAno[yearInicio] += semanas;

        // 2. Monto total por año (evitar duplicar el costo del mismo groupId en el mismo año)
        if (!montosPorAno[yearInicio]) {
            montosPorAno[yearInicio] = 0;
            gruposProcesadosPorAno[yearInicio] = new Set();
        }

        const gid = item.data.groupId || item.id;
        if (gid && !gruposProcesadosPorAno[yearInicio].has(gid)) {
            gruposProcesadosPorAno[yearInicio].add(gid);
            montosPorAno[yearInicio] += Number(item.data.costo || 0);
        }
    });

    actualizarHeaderAdmin();
}

function actualizarHeaderAdmin() {
    const statsDiv = document.getElementById("admin-stats");
    const montoStatsDiv = document.getElementById("admin-monto-stats");

    if (esAdmin) {
        // --- 1. Tarjeta Reporte de Semanas ---
        const years = Object.keys(statsPorAno).sort();

        if (years.length === 0) {
            if (statsDiv) {
                statsDiv.textContent = "0 Semanas";
                statsDiv.onclick = null;
            }
        } else {
            const ultimoAno = years[years.length - 1];
            const semanasUltimo = statsPorAno[ultimoAno].toFixed(1);

            if (statsDiv) {
                statsDiv.innerHTML = `📊 ${ultimoAno}: ${semanasUltimo} Sem <span style="font-size:0.8em">ℹ️</span>`;
                statsDiv.onclick = function () {
                    const listaUl = document.getElementById("listaStats");
                    listaUl.innerHTML = "";

                    years.slice().reverse().forEach(y => {
                        const li = document.createElement("li");
                        li.className = "match-item";
                        li.style.display = "flex";
                        li.style.justifyContent = "space-between";
                        li.style.cursor = "default";

                        li.innerHTML = `
                            <strong style="color:#2c3e50;">Año ${y}</strong>
                            <span style="color:#007bff; font-weight:bold;">${statsPorAno[y].toFixed(1)} Semanas</span>
                        `;
                        listaUl.appendChild(li);
                    });

                    document.getElementById("statsModal").style.display = "block";
                };
            }
        }
        if (statsDiv) statsDiv.style.display = "inline-block";

        // --- 2. Tarjeta Monto Total Por Año (Abre Summary / Reporte Ejecutivo) ---
        if (montoStatsDiv) {
            const mYears = Object.keys(montosPorAno).sort();
            if (mYears.length === 0) {
                montoStatsDiv.textContent = "💰 $0 MXN";
                montoStatsDiv.onclick = function () {
                    window.abrirReporteModal();
                };
            } else {
                const ultimoAnoMonto = mYears[mYears.length - 1];
                const montoUltimo = montosPorAno[ultimoAnoMonto] || 0;
                const montoFormatted = Number(montoUltimo).toLocaleString("es-MX", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
                montoStatsDiv.innerHTML = `💰 ${ultimoAnoMonto}: $${montoFormatted} MXN <span style="font-size:0.8em">ℹ️</span>`;
                montoStatsDiv.title = "Ver Reporte Ejecutivo";
                montoStatsDiv.onclick = function () {
                    window.abrirReporteModal(ultimoAnoMonto);
                };
            }
            montoStatsDiv.style.display = "inline-block";
        }
    } else {
        if (statsDiv) statsDiv.style.display = "none";
        if (montoStatsDiv) montoStatsDiv.style.display = "none";
    }
}

window.cambiarAnoMapa = function (delta) {
    currentMapYear += delta;
    document.getElementById("map-year-display").textContent = currentMapYear;
    const headerYearLabel = document.getElementById("header-year-label");
    if (headerYearLabel) headerYearLabel.textContent = currentMapYear;
    actualizarMapaYLista();
};

// --- SISTEMA DE VISTAS ---
window.mostrarMapa = function () {
    document.getElementById("calendar-container").style.display = "none";
    document.getElementById("agenda-view").style.display = "none";
    const hrView = document.getElementById("hoja-ruta-view");
    if (hrView) hrView.style.display = "none";
    document.getElementById("map-view").style.display = "flex";

    // Ocultamos el botón de mapa en el menú si ya estamos en el mapa (opcional)
    const btnMap = document.getElementById("mobile-btn-map");
    if (btnMap) btnMap.style.display = "none";
    setTimeout(() => { map.invalidateSize(); }, 200);
};

window.mostrarCalendario = function () {
    document.getElementById("map-view").style.display = "none";
    document.getElementById("agenda-view").style.display = "none";
    const hrView = document.getElementById("hoja-ruta-view");
    if (hrView) hrView.style.display = "none";
    document.getElementById("calendar-container").style.display = "block";

    // Mostramos el botón de mapa en el menú si volvemos al calendario
    const btnMap = document.getElementById("mobile-btn-map");
    if (btnMap) btnMap.style.display = "block";
    calendar.updateSize();
};

window.mostrarVistaAgenda = function () {
    document.getElementById("calendar-container").style.display = "none";
    document.getElementById("map-view").style.display = "none";
    const hrView = document.getElementById("hoja-ruta-view");
    if (hrView) hrView.style.display = "none";
    document.getElementById("agenda-view").style.display = "block";

    // Mostramos el botón de mapa en el menú si volvemos a la agenda
    const btnMap = document.getElementById("mobile-btn-map");
    if (btnMap) btnMap.style.display = "block";
    renderizarAgendaCustom();
};

function renderizarAgendaCustom() {
    let listaOrdenada = [...globalReservas];
    listaOrdenada.sort((a, b) => a.start - b.start);

    const agendaContainer = document.getElementById("lista-agenda-custom");
    agendaContainer.innerHTML = "";

    if (listaOrdenada.length === 0) {
        agendaContainer.innerHTML = "<li style=\"text-align:center; padding:20px; color:#777;\">No hay reservas registradas.</li>";
        return;
    }

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const gruposAgenda = [];

    // 1. Agrupación de reservas (Lógica existente)
    listaOrdenada.forEach((reserva, index) => {
        if (index === 0) {
            gruposAgenda.push({
                ciudad: reserva.data.ciudad,
                cliente: reserva.data.cliente,
                direccion: reserva.data.direccion,
                inicio: reserva.data.fechaInicio,
                fin: reserva.data.fechaFin,
                esEspecial: reserva.data.esEspecial || false,
                reservaObj: reserva
            });
            return;
        }

        const ultimo = gruposAgenda[gruposAgenda.length - 1];

        if (ultimo.reservaObj.data.groupId === reserva.data.groupId) {
            ultimo.fin = reserva.data.fechaFin;
        } else {
            gruposAgenda.push({
                ciudad: reserva.data.ciudad,
                cliente: reserva.data.cliente,
                direccion: reserva.data.direccion,
                inicio: reserva.data.fechaInicio,
                fin: reserva.data.fechaFin,
                esEspecial: reserva.data.esEspecial || false,
                reservaObj: reserva
            });
        }
    });

    // Variable para marcar solo el primer evento futuro encontrado
    let proximoEncontrado = false;

    // 2. Renderizado de tarjetas
    gruposAgenda.forEach(grupo => {
        // Convertir fecha fin a objeto Date para comparar
        // (Sumamos 1 día a la fecha fin para que el evento de "hoy" no cuente como pasado hasta mañana)
        const fechaFinObj = new Date(grupo.fin + "T00:00:00");
        fechaFinObj.setDate(fechaFinObj.getDate() + 1);

        const esPasado = fechaFinObj < hoy;

        const card = document.createElement("li");
        let claseEspecial = grupo.esEspecial ? " especial" : "";
        card.className = "agenda-card" + (esPasado ? " pasada" : "") + claseEspecial;

        // NUEVO: Detectar el elemento objetivo para el Scroll
        // Si NO es pasado y aun no hemos encontrado el "próximo", este es el ganador.
        if (!esPasado && !proximoEncontrado) {
            card.id = "scroll-objetivo"; // Le ponemos una marca
            card.style.borderLeftColor = "#f1c40f"; // Opcional: Color dorado para resaltar
            proximoEncontrado = true; // Ya no marcamos más
        }

        let direccionHtml = grupo.direccion ? `<small>📍 ${grupo.direccion}</small>` : "";

        const tieneDoc = grupo.reservaObj.data.pdfUrl;
        const enlaceDocHtml = (tieneDoc)
            ? `<div style="margin-top:6px; border-top:1px solid #eee; padding-top:4px;">
                 <a href="${tieneDoc}" target="_blank" style="color:#007bff; text-decoration:none; font-size:0.85rem; font-weight:bold;">
                   📄 Ver Documentación (Drive)
                 </a>
               </div>`
            : "";

        const badgeEspecialHtml = grupo.esEspecial
            ? "<span class=\"badge-especial\">⭐ Evento Especial</span>"
            : "";

        card.innerHTML = `
            ${badgeEspecialHtml}
            <div class="ruta-ciudad">${grupo.ciudad}</div>
            <div class="ruta-cliente">👤 ${grupo.cliente} ${direccionHtml}</div>
            <div class="ruta-fechas">📅 ${formatearFecha(grupo.inicio)} ➝ ${formatearFecha(grupo.fin)}</div>
            ${enlaceDocHtml}
        `;

        card.onclick = () => {
            const evento = calendar.getEventById(grupo.reservaObj.id);
            if (evento) mostrarDetalles(evento);
        };

        agendaContainer.appendChild(card);
    });

    // NUEVO: Ejecutar el scroll automático
    setTimeout(() => {
        const objetivo = document.getElementById("scroll-objetivo");
        if (objetivo) {
            objetivo.scrollIntoView({ behavior: "smooth", block: "center" });
        } else {
            // Si todo es pasado, opcionalmente podrías hacer scroll al final
            // agendaContainer.scrollTop = agendaContainer.scrollHeight;
        }
    }, 300); // Pequeño delay para asegurar que el DOM se pintó
}

function configurarDiasEspeciales() {
    calendar.addEvent({ daysOfWeek: [0], display: "background", color: "#e0e0e0" });
    calendar.addEvent({ daysOfWeek: [6], display: "background", color: "#fff9c4" });
}

function calcularRangosSinDomingo(fechaInicioStr, fechaFinStr) {
    let start = new Date(fechaInicioStr + "T00:00:00");
    let end = new Date(fechaFinStr + "T00:00:00");
    let diasHabiles = [];
    let current = new Date(start);
    while (current <= end) {
        if (current.getDay() !== 0) diasHabiles.push(new Date(current));
        current.setDate(current.getDate() + 1);
    }
    let rangos = [];
    if (diasHabiles.length === 0) return rangos;
    let rangoActual = { start: new Date(diasHabiles[0]), end: new Date(diasHabiles[0]) };
    for (let i = 1; i < diasHabiles.length; i++) {
        let diff = (diasHabiles[i] - diasHabiles[i - 1]) / (1000 * 60 * 60 * 24);
        if (diff === 1) rangoActual.end = new Date(diasHabiles[i]);
        else { rangos.push(rangoActual); rangoActual = { start: new Date(diasHabiles[i]), end: new Date(diasHabiles[i]) }; }
    }
    rangos.push(rangoActual);
    return rangos;
}

function formatearFecha(fechaStr) {
    if (!fechaStr) return "";
    const partes = fechaStr.split("-");
    const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    return `${partes[2]}/${meses[parseInt(partes[1]) - 1]}/${partes[0]}`;
}

async function cargarReservas(forzarRecarga = false) {
    const calendarEl = document.getElementById("calendar");
    const loadingOverlay = document.getElementById("loading-overlay");

    if (loadingOverlay) loadingOverlay.style.display = "flex";
    calendarEl.style.opacity = "0.5";
    document.body.style.cursor = "wait";

    try {
        // --- 1. CACHÉ LOCAL CON TIEMPO DE EXPIRACIÓN ---
        const cacheGuardado = localStorage.getItem("agenda_reservas_cache");
        const cacheTimestamp = localStorage.getItem("agenda_reservas_timestamp"); // Leemos la hora guardada

        let datosParaProcesar = [];
        let origenDatos = "";

        // Calculamos si el caché es válido (Menor a 5 min = 300,000 ms)
        const ahora = Date.now();
        const esCacheValido = cacheTimestamp && (ahora - parseInt(cacheTimestamp) < 300000);

        if (!forzarRecarga && cacheGuardado) {
            if (esCacheValido) {
                console.log("⚡ Usando Caché Local (Fresco)...");
                try {
                    datosParaProcesar = JSON.parse(cacheGuardado);
                    origenDatos = "CACHE";
                } catch (err) {
                    console.warn("Caché corrupto, descargando...");
                    origenDatos = "FIREBASE";
                }
            } else {
                console.log("⌛ Caché expirado (+5 min). Forzando descarga...");
                origenDatos = "FIREBASE";
            }
        }

        // --- 2. FIREBASE (Si no hay caché o expiró) ---
        if (datosParaProcesar.length === 0 || origenDatos === "FIREBASE") {
            console.log("⬇️ Descargando de Firebase...");
            datosParaProcesar = []; // Limpiamos lista por seguridad

            const q = query(
                collection(db, "reservas"),
                where("fechaInicio", ">=", "2020-01-01"),
                where("fechaInicio", "<=", "2030-12-31")
            );
            const querySnapshot = await getDocs(q);

            querySnapshot.forEach((documento) => {
                const data = documento.data();
                if (data.fechaInicio && data.fechaFin) {
                    datosParaProcesar.push({
                        id: documento.id,
                        data: data,
                        start: data.fechaInicio,
                        end: data.fechaFin
                    });
                }
            });

            // Guardamos en caché CON LA HORA ACTUAL
            try {
                localStorage.setItem("agenda_reservas_cache", JSON.stringify(datosParaProcesar));
                localStorage.setItem("agenda_reservas_timestamp", Date.now().toString()); // Guardamos timestamp
            } catch (e) { console.warn("Memoria llena", e); }
        }

        // --- 3. PROCESAMIENTO MASIVO (OPTIMIZACIÓN CLAVE) ---

        // A. Limpiamos memoria
        calendar.removeAllEvents();
        globalReservas = [];

        // B. Preparamos el arreglo para FullCalendar (Batch)
        const eventosFullCalendar = [];

        datosParaProcesar.forEach(item => {
            // Reconvertir strings a Objetos Date
            const startObj = new Date(item.start);
            const endObj = new Date(item.end);

            // Memoria Global
            globalReservas.push({
                id: item.id,
                data: item.data,
                start: startObj,
                end: endObj
            });

            // Preparar objeto para el Calendario
            // Calculamos fecha visual (+1 día)
            let fechaFinVisual = new Date(endObj);
            fechaFinVisual.setDate(fechaFinVisual.getDate() + 1);

            const esEspecial = item.data.esEspecial || false;
            const colorEvento = esEspecial ? "#7F00FF" : "#FF5733"; // Naranja para especial, rojo para normal

            eventosFullCalendar.push({
                id: item.id,
                title: "📍 " + (item.data.ciudad ? item.data.ciudad.split(",")[0] : "Sin ciudad") + " - " + item.data.cliente,
                start: item.data.fechaInicio,
                end: fechaFinVisual.toISOString().split("T")[0],
                allDay: true,
                backgroundColor: colorEvento,
                borderColor: colorEvento,
                extendedProps: {
                    cliente: item.data.cliente,
                    direccion: item.data.direccion,
                    fechaFinReal: item.data.fechaFin,
                    ciudadCompleta: item.data.ciudad,
                    groupId: item.data.groupId,
                    pdfUrl: item.data.pdfUrl,
                    lat: item.data.lat,
                    lng: item.data.lng,
                    esEspecial: esEspecial,
                    costo: (item.data.costo !== undefined && item.data.costo !== null) ? item.data.costo : null,
                    estadoFactura: item.data.estadoFactura || "Sin facturar"
                }
            });
        });

        // C. INSERCIÓN ÚNICA (Esto baja el tiempo de 10s a 0.5s)
        calendar.addEventSource(eventosFullCalendar);

        // --- 4. ACTUALIZACIÓN UI DIFERIDA ---
        // Usamos setTimeout para liberar el hilo principal y que el navegador "respire"
        setTimeout(() => {
            calcularEstadisticas();
            actualizarMapaYLista(); // Actualiza la lista lateral y mapa
        }, 50);

    } catch (error) {
        console.error("Error crítico:", error);
    } finally {
        calendarEl.style.opacity = "1";
        document.body.style.cursor = "default";
        if (loadingOverlay) loadingOverlay.style.display = "none";
    }
}

// --- Función auxiliar para no repetir código de "addEvent" ---
function agregarEventoAlCalendario(data, id) {
    // Calculamos fecha fin visual (+1 día para que FullCalendar llene el cuadro completo)
    let fechaFinObj = new Date(data.fechaFin + "T00:00:00");
    let fechaFinVisual = new Date(fechaFinObj);
    fechaFinVisual.setDate(fechaFinVisual.getDate() + 1);

    const esEspecial = data.esEspecial || false;
    const colorEvento = esEspecial ? "#e67e22" : "#FF5733";

    calendar.addEvent({
        id: id,
        title: "📍 " + (data.ciudad ? data.ciudad.split(",")[0] : "Sin ciudad") + " - " + data.cliente,
        start: data.fechaInicio,
        end: fechaFinVisual.toISOString().split("T")[0],
        allDay: true,
        backgroundColor: colorEvento,
        borderColor: colorEvento,
        extendedProps: {
            cliente: data.cliente,
            direccion: data.direccion,
            fechaFinReal: data.fechaFin,
            ciudadCompleta: data.ciudad,
            groupId: data.groupId,
            pdfUrl: data.pdfUrl,
            esEspecial: esEspecial,
            lat: data.lat,
            lng: data.lng,
            costo: (data.costo !== undefined && data.costo !== null) ? data.costo : null,
            estadoFactura: data.estadoFactura || "Sin facturar"
        }
    });
}

window.actualizarMapaYLista = function (centrarHoy = false) {
    if (!globalReservas) return;

    // Diferir la ejecución para que no bloquee la interfaz inmediata
    requestAnimationFrame(() => {
        const listaDelAnio = globalReservas.filter(r => r.start.getFullYear() === currentMapYear || r.end.getFullYear() === currentMapYear);
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);

        // 1. Ordenar
        let listaVisualizar = [...listaDelAnio].sort((a, b) => a.start - b.start);
        const reservaProxima = listaVisualizar.find(r => r.start > hoy);

        const getPrioridad = (r) => {
            if (r.start <= hoy && r.end >= hoy) return 3;
            if (r === reservaProxima) return 2;
            if (r.end < hoy) return 0;
            return 1;
        };

        const getNombreEstado = (prioridad) => {
            switch (prioridad) {
                case 3: return "activo";
                case 2: return "destacado";
                case 0: return "pasado";
                default: return "futuro";
            }
        };

        // --- PASO 1: CALCULAR Y AGRUPAR ---
        const rutasAgrupadas = [];

        listaVisualizar.forEach((reserva, index) => {
            const ciudadActual = reserva.data.ciudad ? reserva.data.ciudad.split(",")[0].trim() : "Desconocida";
            const prioridadActual = getPrioridad(reserva);

            if (index === 0) {
                rutasAgrupadas.push({
                    ciudad: ciudadActual,
                    inicio: reserva.data.fechaInicio,
                    fin: reserva.data.fechaFin,
                    clientes: [reserva.data.cliente],
                    lat: reserva.data.lat,
                    lng: reserva.data.lng,
                    prioridadGrupo: prioridadActual
                });
                return;
            }

            const ultimoGrupo = rutasAgrupadas[rutasAgrupadas.length - 1];
            const finAnterior = new Date(ultimoGrupo.fin + "T00:00:00");
            const inicioActual = new Date(reserva.data.fechaInicio + "T00:00:00");
            const diferenciaTiempo = inicioActual - finAnterior;
            const diasDiferencia = Math.ceil(diferenciaTiempo / (1000 * 60 * 60 * 24));

            if (ultimoGrupo.ciudad === ciudadActual && diasDiferencia <= 3) {
                ultimoGrupo.fin = reserva.data.fechaFin;
                if (prioridadActual > ultimoGrupo.prioridadGrupo) ultimoGrupo.prioridadGrupo = prioridadActual;
                if (!ultimoGrupo.clientes.includes(reserva.data.cliente)) ultimoGrupo.clientes.push(reserva.data.cliente);
            } else {
                rutasAgrupadas.push({
                    ciudad: ciudadActual,
                    inicio: reserva.data.fechaInicio,
                    fin: reserva.data.fechaFin,
                    clientes: [reserva.data.cliente],
                    lat: reserva.data.lat,
                    lng: reserva.data.lng,
                    prioridadGrupo: prioridadActual
                });
            }
        });

        // --- PASO 2: RENDERIZAR LISTA (Batch Fragment) ---
        const ulLista = document.getElementById("lista-rutas");
        if (ulLista) {
            ulLista.innerHTML = "";
            if (rutasAgrupadas.length === 0) {
                ulLista.innerHTML = "<li style=\"padding:15px;color:#999;text-align:center;\">Sin reservas este año.</li>";
            } else {
                const fragmento = document.createDocumentFragment();
                rutasAgrupadas.forEach(grupo => {
                    const li = document.createElement("li");
                    let estadoTexto = getNombreEstado(grupo.prioridadGrupo);
                    let claseEstado = "";
                    if (estadoTexto === "pasado") claseEstado = " pasada";
                    else if (estadoTexto === "activo") claseEstado = " activa";
                    else if (estadoTexto === "destacado") claseEstado = " destacada";

                    li.className = "ruta-item" + claseEstado;
                    const clientesHTML = grupo.clientes.map(c => `<div style="padding-left:10px; margin-bottom:2px;">• ${c}</div>`).join("");

                    li.innerHTML = `
                        <div class="ruta-ciudad">${grupo.ciudad}</div>
                        <div class="ruta-fechas">📅 ${formatearFecha(grupo.inicio)} ➝ ${formatearFecha(grupo.fin)}</div>
                        <div class="ruta-cliente" style="margin-top:8px; border-top:1px dashed #dedede; padding-top:4px;">${clientesHTML}</div>
                    `;

                    li.onclick = () => {
                        if (typeof map !== "undefined" && map && grupo.lat && grupo.lng) {
                            map.flyTo([grupo.lat, grupo.lng], 13);
                            // Búsqueda optimizada de marcador en el grupo
                            if (window.markersLayer) {
                                window.markersLayer.eachLayer(layer => {
                                    const latLng = layer.getLatLng();
                                    if (Math.abs(latLng.lat - grupo.lat) < 0.0001 && Math.abs(latLng.lng - grupo.lng) < 0.0001) {
                                        layer.openPopup();
                                    }
                                });
                            }
                        }
                    };
                    fragmento.appendChild(li);
                });
                ulLista.appendChild(fragmento);

                // Scroll diferido para evitar Forced Reflow
                setTimeout(() => {
                    const destacado = ulLista.querySelector(".ruta-item.destacada, .ruta-item.activa");
                    if (destacado) destacado.scrollIntoView({ behavior: "smooth", block: "center" });
                }, 100);
            }
        }

        // --- PASO 3: RENDERIZAR MAPA (OPTIMIZACIÓN LAYER GROUP) ---
        if (typeof map !== "undefined" && map) {

            // 1. Crear el grupo de capas si no existe
            if (!window.markersLayer) {
                window.markersLayer = L.layerGroup().addTo(map);
            }

            // 2. Limpiar el grupo de golpe (Mucho más rápido que un bucle removeLayer)
            window.markersLayer.clearLayers();

            const ciudadesMap = {};

            listaVisualizar.forEach(r => {
                if (!r.data.lat || !r.data.lng) return;
                const nombreCiudad = r.data.ciudad ? r.data.ciudad.split(",")[0].trim() : "Ubicación";

                if (!ciudadesMap[nombreCiudad]) {
                    ciudadesMap[nombreCiudad] = {
                        lat: r.data.lat, lng: r.data.lng, clientes: new Set(), diasTotales: 0, prioridadVisual: 0
                    };
                }
                ciudadesMap[nombreCiudad].clientes.add(r.data.cliente);

                // Corrección: Usar el método de 'T12:00:00' para evitar problemas de zona horaria
                // al contar los días, igual que en la función de estadísticas.
                const fechaStringInicio = r.data.fechaInicio;
                const fechaStringFin = r.data.fechaFin;
                let current = new Date(fechaStringInicio + "T12:00:00");
                const fechaLimite = new Date(fechaStringFin + "T12:00:00");

                while (current <= fechaLimite) {
                    if (current.getDay() !== 0) ciudadesMap[nombreCiudad].diasTotales++;
                    current.setDate(current.getDate() + 1);
                }

                let p = getPrioridad(r);
                if (p > ciudadesMap[nombreCiudad].prioridadVisual) ciudadesMap[nombreCiudad].prioridadVisual = p;
            });

            // 3. Crear marcadores y agregarlos AL GRUPO (no al mapa directamente)
            const nuevosMarcadores = [];

            Object.keys(ciudadesMap).forEach(ciudadKey => {
                const datos = ciudadesMap[ciudadKey];
                let icono = blueIcon;
                let zIndex = 500;

                if (datos.prioridadVisual === 0) { icono = greyIcon; zIndex = 100; }
                else if (datos.prioridadVisual === 2) { icono = goldIcon; zIndex = 900; }
                else if (datos.prioridadVisual === 3) { icono = redIcon; zIndex = 1000; }

                // NOTA: Ya no usamos .addTo(map) aquí.
                const marker = L.marker([datos.lat, datos.lng], { icon: icono, zIndexOffset: zIndex });

                const listaClientesVertical = Array.from(datos.clientes).map(c => `<div style="margin-bottom:3px;">• ${c}</div>`).join("");

                marker.bindPopup(`
                    <div style="text-align:center; min-width:160px;">
                        <h3 style="margin:0; color:#2c3e50; font-size:1.1rem;">${ciudadKey}</h3>
                        <hr style="border:0; border-top:1px solid #eee; margin:8px 0;">
                        <div style="text-align:left; font-size:0.9rem; line-height:1.4;">
                            <strong style="color:#333;">👥 Clientes:</strong>
                            <div style="margin-top:5px; margin-left:5px; max-height:100px; overflow-y:auto; color:#555;">${listaClientesVertical}</div>
                            <br>
                            <div style="border-top:1px dashed #ccc; padding-top:5px;">
                                ⏱️ <b>Días ocupados:</b> ${datos.diasTotales}
                            </div>
                        </div>
                    </div>
                `);

                // Agregar al grupo
                window.markersLayer.addLayer(marker);
            });
        }
    });
};

// --- FUNCIÓN RECUPERADA: EXPORTAR CALENDARIO ---
window.exportarCalendario = async function () {
    if (globalReservas.length === 0) {
        alert("⚠️ No hay eventos para sincronizar.");
        return;
    }

    const btn = document.getElementById("mobile-btn-export");
    const originalText = btn ? btn.innerHTML : "🗓️ Sync Calendar";
    const headerSpinner = document.getElementById("sync-spinner");

    if (btn) {
        btn.innerHTML = "⏳ Sincronizando...";
        btn.disabled = true;
    }
    if (headerSpinner) {
        headerSpinner.style.display = "inline-flex";
        headerSpinner.style.background = "conic-gradient(var(--accent-color) 0deg, var(--border-color) 0deg)";
        const valEl = headerSpinner.querySelector(".progress-value");
        if (valEl) valEl.innerText = "0%";
    }

    try {
        // 1. Obtener token de acceso de Google con permisos de calendario
        const provider = new GoogleAuthProvider();
        provider.addScope("https://www.googleapis.com/auth/calendar.events");
        provider.addScope("https://www.googleapis.com/auth/calendar"); // Necesario para leer y crear calendarios

        // Forzar siempre solicitar permisos
        provider.setCustomParameters({
            prompt: "consent select_account"
        });

        const result = await signInWithPopup(auth, provider);
        const credential = GoogleAuthProvider.credentialFromResult(result);
        const token = credential.accessToken;

        if (!token) {
            throw new Error("No se pudo obtener el token de acceso.");
        }

        // 2. Buscar o crear el calendario "Agenda TrackSIM"
        let targetCalendarId = "primary";
        let calendarWasCreated = false;
        const calendarName = "Agenda TrackSIM";

        try {
            const listResp = await fetch("https://www.googleapis.com/calendar/v3/users/me/calendarList", {
                headers: { "Authorization": `Bearer ${token}` }
            });

            if (listResp.ok) {
                const listData = await listResp.json();
                const existingCal = listData.items?.find(c => c.summary === calendarName);

                if (existingCal) {
                    targetCalendarId = existingCal.id;
                } else {
                    // Crear el calendario
                    const createResp = await fetch("https://www.googleapis.com/calendar/v3/calendars", {
                        method: "POST",
                        headers: {
                            "Authorization": `Bearer ${token}`,
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({ summary: calendarName })
                    });

                    if (createResp.ok) {
                        const newCal = await createResp.json();
                        targetCalendarId = newCal.id;
                        calendarWasCreated = true;
                    }
                }
            }
        } catch (e) {
            console.error("Error al buscar/crear el calendario secundario:", e);
            // Fallback a 'primary' en caso de error o falta de permisos
        }

        let sincronizados = 0;
        let actualizados = 0;
        let omitidos = 0;
        const totalReservas = globalReservas.length;
        let procesados = 0;
        const validGoogleIds = new Set();

        // Función ligera para generar una firma del contenido del evento
        const computeHash = (data) => [
            data.cliente || "",
            data.ciudad || "",
            data.direccion || "",
            data.fechaInicio || "",
            data.fechaFin || ""
        ].join("|");

        let targetCalendarEventIds = null;
        if (!calendarWasCreated) {
            targetCalendarEventIds = new Set();
            let eventPageToken = null;
            let eventListFailed = false;

            do {
                let eventListUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(targetCalendarId)}/events?maxResults=250`;
                if (eventPageToken) eventListUrl += `&pageToken=${encodeURIComponent(eventPageToken)}`;

                const eventListResponse = await fetch(eventListUrl, {
                    headers: { "Authorization": `Bearer ${token}` }
                });

                if (!eventListResponse.ok) {
                    eventListFailed = true;
                    break;
                }

                const eventListData = await eventListResponse.json();
                for (const event of eventListData.items || []) {
                    if (event.id) targetCalendarEventIds.add(event.id);
                }
                eventPageToken = eventListData.nextPageToken;
            } while (eventPageToken);

            if (eventListFailed) targetCalendarEventIds = null;
        }

        for (const reserva of globalReservas) {
            const ciudad = reserva.data.ciudad || "Sin ciudad";
            const cliente = reserva.data.cliente || "Cliente";
            const direccion = reserva.data.direccion || "";
            const descripcion = "Gestionado desde Agenda TrackSIM. https://agendaservicios.web.app/index.html";

            // Formato de Google Calendar para eventos de todo el día: YYYY-MM-DD
            const startStr = reserva.data.fechaInicio;

            // Google Calendar también requiere que la fecha de fin de un evento de todo el día sea el día siguiente
            const endDateObj = new Date(reserva.data.fechaFin + "T00:00:00");
            endDateObj.setDate(endDateObj.getDate() + 1);
            const endStr = endDateObj.toISOString().split("T")[0];

            const eventBody = {
                summary: `${cliente} - ${ciudad}`,
                location: ciudad + (direccion ? ", " + direccion : ""),
                description: descripcion,
                start: { date: startStr },
                end: { date: endStr }
            };

            const savedEventId = reserva.data.googleEventId;
            const eventWasFound = targetCalendarEventIds?.has(savedEventId);
            const existingEventId = calendarWasCreated || (targetCalendarEventIds && !eventWasFound)
                ? null
                : savedEventId;
            const currentHash = computeHash(reserva.data);
            const savedHash = reserva.data.googleEventHash;
            const encodedCalId = encodeURIComponent(targetCalendarId);

            let existingEventIsInTargetCalendar = false;
            if (existingEventId && targetCalendarEventIds === null && savedHash === currentHash) {
                const existingEventResponse = await fetch(
                    `https://www.googleapis.com/calendar/v3/calendars/${encodedCalId}/events/${encodeURIComponent(existingEventId)}`,
                    { headers: { "Authorization": `Bearer ${token}` } }
                );
                existingEventIsInTargetCalendar = existingEventResponse.ok;
            }

            // Si ya existe en Google Calendar y el contenido no cambió, omitir
            if (existingEventId && savedHash && savedHash === currentHash && existingEventIsInTargetCalendar) {
                validGoogleIds.add(existingEventId);
                omitidos++;
                procesados++;
                if (headerSpinner) {
                    const pct = Math.round((procesados / totalReservas) * 100);
                    headerSpinner.style.background = `conic-gradient(var(--accent-color) ${pct * 3.6}deg, var(--border-color) 0deg)`;
                    const valEl = headerSpinner.querySelector(".progress-value");
                    if (valEl) valEl.innerText = `${pct}%`;
                }
                continue;
            }

            // Asegurarnos de usar el calendario correcto en la URL (codificamos targetCalendarId por si acaso)
            let url = `https://www.googleapis.com/calendar/v3/calendars/${encodedCalId}/events`;
            let method = "POST";

            if (existingEventId) {
                url = `https://www.googleapis.com/calendar/v3/calendars/${encodedCalId}/events/${existingEventId}`;
                method = "PUT";
            }

            const response = await fetch(url, {
                method: method,
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(eventBody)
            });

            if (!response.ok) {
                // Si el evento fue borrado manualmente, intentar crearlo de nuevo
                if (method === "PUT" && (response.status === 404 || response.status === 410)) {
                    const postResponse = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodedCalId}/events`, {
                        method: "POST",
                        headers: {
                            "Authorization": `Bearer ${token}`,
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify(eventBody)
                    });

                    if (postResponse.ok) {
                        const data = await postResponse.json();
                        await updateDoc(doc(db, "reservas", reserva.id), {
                            googleEventId: data.id,
                            googleEventHash: currentHash
                        });
                        reserva.data.googleEventId = data.id;
                        reserva.data.googleEventHash = currentHash;
                        validGoogleIds.add(data.id);
                        sincronizados++;
                    }
                } else {
                    console.error("Error al sincronizar evento:", await response.text());
                }
            } else {
                if (method === "POST") {
                    const data = await response.json();
                    await updateDoc(doc(db, "reservas", reserva.id), { googleEventId: data.id, googleEventHash: currentHash });
                    reserva.data.googleEventId = data.id;
                    reserva.data.googleEventHash = currentHash;
                    validGoogleIds.add(data.id);
                    sincronizados++;
                } else {
                    await updateDoc(doc(db, "reservas", reserva.id), { googleEventHash: currentHash });
                    reserva.data.googleEventHash = currentHash;
                    validGoogleIds.add(existingEventId);
                    actualizados++;
                }
            }

            procesados++;
            if (headerSpinner) {
                const percentage = Math.round((procesados / totalReservas) * 100);
                headerSpinner.style.background = `conic-gradient(var(--accent-color) ${percentage * 3.6}deg, var(--border-color) 0deg)`;
                const valEl = headerSpinner.querySelector(".progress-value");
                if (valEl) valEl.innerText = `${percentage}%`;
            }
        }
        // 3. Limpiar eventos "huérfanos" (eliminados de Firebase o editados)
        let pageToken = null;
        let deletedOrphans = 0;
        const calIdUrl = encodeURIComponent(targetCalendarId);

        do {
            let listUrl = `https://www.googleapis.com/calendar/v3/calendars/${calIdUrl}/events?maxResults=250`;
            if (pageToken) listUrl += `&pageToken=${pageToken}`;

            const listResp = await fetch(listUrl, {
                headers: { "Authorization": `Bearer ${token}` }
            });

            if (listResp.ok) {
                const listData = await listResp.json();
                if (listData.items) {
                    for (const ev of listData.items) {
                        if (ev.id && !validGoogleIds.has(ev.id)) {
                            await fetch(`https://www.googleapis.com/calendar/v3/calendars/${calIdUrl}/events/${ev.id}`, {
                                method: "DELETE",
                                headers: { "Authorization": `Bearer ${token}` }
                            });
                            deletedOrphans++;
                        }
                    }
                }
                pageToken = listData.nextPageToken;
            } else {
                break;
            }
        } while (pageToken);

        const msjOrphans = deletedOrphans > 0 ? `\nLimpiados (antiguos): ${deletedOrphans}` : "";
        const msjOmitidos = omitidos > 0 ? `\nSin cambios (omitidos): ${omitidos}` : "";
        alert(`✅ Sincronización exitosa en el calendario "${calendarName}".\nCreados: ${sincronizados}\nActualizados: ${actualizados}${msjOmitidos}${msjOrphans}`);

    } catch (error) {
        console.error("Error en sincronización con Google Calendar:", error);
        alert(`❌ Error al sincronizar: ${error.message}`);
    } finally {
        if (btn) {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
        if (headerSpinner) headerSpinner.style.display = "none";
    }
};

window.compartirApp = async function () {
    const shareData = {
        title: "Agenda TrackSIM",
        text: "Consulta la gestión de itinerarios y servicios TrackSIM.",
        url: window.location.href
    };
    try {
        if (navigator.share) {
            await navigator.share(shareData);
        } else {
            await navigator.clipboard.writeText(window.location.href);
            alert("🔗 Vínculo copiado al portapapeles.");
        }
    } catch (err) { console.log("Error al compartir:", err); }
};

window.verQR = function () {
    const url = window.location.href;
    const qrImg = document.getElementById("imagenQR");
    qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`;
    document.getElementById("qrModal").style.display = "block";
};

window.abrirModalCrear = function (fecha) {
    // Resetear variables
    modoEdicion = false;
    idGrupoEdicion = null;
    urlEdicion = null; // <--- LIMPIAMOS LA VARIABLE AQUÍ
    costoEdicion = null;
    estadoFacturaEdicion = "Sin facturar";

    // Limpiar campos
    document.getElementById("fechaInicio").value = fecha;
    document.getElementById("fechaFin").value = fecha;
    document.getElementById("ciudadInput").value = "";
    document.getElementById("ciudadInput").readOnly = true;
    document.getElementById("nombreInput").value = "";
    document.getElementById("direccionInput").value = "";
    document.getElementById("latTemp").value = "";
    document.getElementById("lonTemp").value = "";
    document.getElementById("eventoEspecialCheck").checked = false;

    // Resetear botón
    const btn = document.querySelector("#reservaModal .btn-save");
    btn.textContent = "💾 Guardar Reserva";
    btn.style.background = "#28a745";
    btn.style.color = "white";

    document.getElementById("reservaModal").style.display = "block";
};

window.prepararEdicion = function () {
    if (!eventoSeleccionadoID) return;
    const evento = calendar.getEventById(eventoSeleccionadoID);
    if (!evento) return;

    // Guardar el estado actual
    modoEdicion = true;
    idGrupoEdicion = evento.extendedProps.groupId;
    urlEdicion = evento.extendedProps.pdfUrl || null; // <--- CAPTURAMOS EL LINK AQUÍ
    costoEdicion = (evento.extendedProps.costo !== undefined && evento.extendedProps.costo !== null) ? evento.extendedProps.costo : null;
    estadoFacturaEdicion = evento.extendedProps.estadoFactura || "Sin facturar";

    // Llenar el formulario
    document.getElementById("fechaInicio").value = evento.start.toISOString().split("T")[0];
    document.getElementById("fechaFin").value = evento.extendedProps.fechaFinReal;
    document.getElementById("nombreInput").value = evento.extendedProps.cliente;
    document.getElementById("direccionInput").value = evento.extendedProps.direccion || "";
    document.getElementById("ciudadInput").value = evento.extendedProps.ciudadCompleta || "";

    document.getElementById("eventoEspecialCheck").checked = evento.extendedProps.esEspecial || false;
    const originalLat = evento.extendedProps.lat || "";
    const originalLng = evento.extendedProps.lng || "";

    const reservaOriginal = globalReservas.find(r => r.id === eventoSeleccionadoID);
    if (reservaOriginal) {
        document.getElementById("latTemp").value = reservaOriginal.data.lat || "";
        document.getElementById("lonTemp").value = reservaOriginal.data.lng || "";
    }

    // Cambiar texto del botón
    const btnGuardar = document.querySelector("#reservaModal .btn-save");
    btnGuardar.textContent = "📝 Actualizar Reserva";
    btnGuardar.style.background = "#ffc107";
    btnGuardar.style.color = "#333";

    cerrarModal("detalleModal");
    document.getElementById("reservaModal").style.display = "block";
};

// 1. Nueva función para eliminar el enlace
window.eliminarEnlaceDrive = async function () {
    if (!confirm("¿Estás seguro de que deseas eliminar este enlace?")) return;
    if (!eventoSeleccionadoID) return;

    try {
        const docRef = doc(db, "reservas", eventoSeleccionadoID);
        // Actualizamos el campo a null para borrarlo
        await updateDoc(docRef, { pdfUrl: null });

        alert("🗑️ Enlace eliminado.");
        await cargarReservas(true);
        cerrarModal("detalleModal");
    } catch (error) {
        console.error("Error al eliminar enlace:", error);
        alert("Error al eliminar.");
    }
};

// 2. Función actualizada para habilitar edición
window.habilitarEdicionDrive = function () {
    const input = document.getElementById("driveUrlInput");
    const btnGuardar = document.getElementById("btnGuardarDrive");
    const btnEliminar = document.getElementById("btnEliminarDrive");

    // Habilitar escritura
    input.readOnly = false;
    input.focus();

    // Cambiar icono a guardar
    btnGuardar.textContent = "💾";
    btnGuardar.classList.remove("btn-drive-edit");
    btnGuardar.classList.add("btn-drive-save");
    btnGuardar.onclick = function () { window.guardarEnlaceDrive(); };

    // Mantener visible el botón de eliminar
    btnEliminar.style.display = "block";
};
// --- FUNCIONES DE FINANZAS Y FACTURACIÓN (VISTA ADMINISTRADOR) ---
window.toggleColapsoAdminFinanzas = function () {
    const body = document.getElementById("adminFinanzasBody");
    const icono = document.getElementById("iconoColapsoAdminFinanzas");
    if (!body) return;
    const estaOculto = window.getComputedStyle(body).display === "none";
    body.style.display = estaOculto ? "block" : "none";
    if (icono) {
        icono.style.transform = estaOculto ? "rotate(180deg)" : "rotate(0deg)";
    }
};

window.setColapsoAdminFinanzas = function (abierto) {
    const body = document.getElementById("adminFinanzasBody");
    const icono = document.getElementById("iconoColapsoAdminFinanzas");
    if (!body) return;
    body.style.display = abierto ? "block" : "none";
    if (icono) {
        icono.style.transform = abierto ? "rotate(180deg)" : "rotate(0deg)";
    }
};

window.actualizarResumenAdminFinanzas = function () {
    const resumenEl = document.getElementById("adminFinanzasResumen");
    if (!resumenEl) return;
    const inputCosto = document.getElementById("detCostoInput");
    const valCosto = inputCosto ? inputCosto.value.trim() : "";
    const estado = estadoFacturaActual || "Sin facturar";

    let textoCosto = "";
    if (valCosto !== "") {
        const num = parseFloat(valCosto);
        if (!isNaN(num)) {
            textoCosto = `$${num.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        }
    }

    if (textoCosto || estado !== "Sin facturar") {
        resumenEl.textContent = `${textoCosto ? textoCosto + " • " : ""}${estado}`;
        resumenEl.style.display = "inline-block";
    } else {
        resumenEl.textContent = "";
        resumenEl.style.display = "none";
    }
};

window.seleccionarEstadoFactura = function (nuevoEstado) {
    const estadosValidos = ["Sin facturar", "Facturada"];
    if (!estadosValidos.includes(nuevoEstado)) {
        nuevoEstado = "Sin facturar";
    }
    estadoFacturaActual = nuevoEstado;

    const box = document.getElementById("tristateBox");
    const icon = document.getElementById("tristateIcon");
    const badge = document.getElementById("tristateStatusBadge");
    const container = document.getElementById("tristateCheckboxContainer");

    const pillSin = document.getElementById("pillSinFacturar");
    const pillFac = document.getElementById("pillFacturada");

    [pillSin, pillFac].forEach(p => p && p.classList.remove("active"));

    if (box) {
        box.classList.remove("state-sin-facturar", "state-solicitada", "state-facturada");
    }
    if (badge) {
        badge.classList.remove("badge-sin-facturar", "badge-solicitada", "badge-facturada");
    }

    if (nuevoEstado === "Sin facturar") {
        if (box) box.classList.add("state-sin-facturar");
        if (icon) icon.textContent = "⬜";
        if (badge) {
            badge.classList.add("badge-sin-facturar");
            badge.textContent = "Sin facturar";
        }
        if (container) container.setAttribute("aria-checked", "false");
        if (pillSin) pillSin.classList.add("active");
    } else if (nuevoEstado === "Facturada") {
        if (box) box.classList.add("state-facturada");
        if (icon) icon.textContent = "✅";
        if (badge) {
            badge.classList.add("badge-facturada");
            badge.textContent = "Facturada";
        }
        if (container) container.setAttribute("aria-checked", "true");
        if (pillFac) pillFac.classList.add("active");
    }

    if (typeof window.actualizarResumenAdminFinanzas === "function") {
        window.actualizarResumenAdminFinanzas();
    }
};

window.avanzarEstadoFactura = function () {
    const orden = ["Sin facturar", "Facturada"];
    const indice = orden.indexOf(estadoFacturaActual);
    const siguienteIndice = (indice + 1) % orden.length;
    window.seleccionarEstadoFactura(orden[siguienteIndice]);
};

window.teclaEstadoFactura = function (event) {
    if (event.key === " " || event.key === "Enter") {
        event.preventDefault();
        window.avanzarEstadoFactura();
    }
};

window.guardarAdminFinanzas = async function () {
    if (!eventoSeleccionadoID) return;

    const inputCosto = document.getElementById("detCostoInput");
    const valCosto = inputCosto ? inputCosto.value.trim() : "";
    let costoFinal = null;
    if (valCosto !== "") {
        const num = parseFloat(valCosto);
        if (isNaN(num) || num < 0) {
            alert("⚠️ Por favor ingresa un monto válido mayor o igual a 0.");
            if (inputCosto) inputCosto.focus();
            return;
        }
        costoFinal = Math.round(num * 100) / 100;
    }

    const estadoFacturaFinal = estadoFacturaActual || "Sin facturar";
    const btn = document.getElementById("btnGuardarFinanzas");
    const feedback = document.getElementById("finanzasFeedback");

    if (btn) {
        btn.disabled = true;
        btn.innerHTML = "⏳ Guardando...";
    }

    try {
        const datosActualizar = {
            costo: costoFinal,
            estadoFactura: estadoFacturaFinal
        };

        // Si pertenece a un grupo, actualizar todos los documentos del grupo
        if (grupoSeleccionadoID) {
            const q = query(collection(db, "reservas"), where("groupId", "==", grupoSeleccionadoID));
            const querySnapshot = await getDocs(q);
            const batch = writeBatch(db);
            querySnapshot.forEach(docSnap => {
                batch.update(docSnap.ref, datosActualizar);
            });
            await batch.commit();

            // Actualizar memoria global
            globalReservas.forEach(r => {
                if (r.data.groupId === grupoSeleccionadoID) {
                    r.data.costo = costoFinal;
                    r.data.estadoFactura = estadoFacturaFinal;
                    const ev = calendar.getEventById(r.id);
                    if (ev) {
                        ev.setExtendedProp("costo", costoFinal);
                        ev.setExtendedProp("estadoFactura", estadoFacturaFinal);
                    }
                }
            });
        } else {
            const docRef = doc(db, "reservas", eventoSeleccionadoID);
            await updateDoc(docRef, datosActualizar);

            const r = globalReservas.find(res => res.id === eventoSeleccionadoID);
            if (r) {
                r.data.costo = costoFinal;
                r.data.estadoFactura = estadoFacturaFinal;
            }
            const ev = calendar.getEventById(eventoSeleccionadoID);
            if (ev) {
                ev.setExtendedProp("costo", costoFinal);
                ev.setExtendedProp("estadoFactura", estadoFacturaFinal);
            }
        }

        // Actualizar caché de localStorage para que persista inmediatamente
        try {
            localStorage.setItem("agenda_reservas_cache", JSON.stringify(globalReservas.map(item => ({
                id: item.id,
                data: item.data,
                start: item.data.fechaInicio,
                end: item.data.fechaFin
            }))));
            localStorage.setItem("agenda_reservas_timestamp", Date.now().toString());
        } catch (e) {
            console.warn("No se pudo actualizar localStorage:", e);
        }

        calcularEstadisticas();

        if (btn) {
            btn.innerHTML = "✅ ¡Guardado!";
            btn.style.background = "#198754";
        }
        if (feedback) {
            feedback.style.display = "block";
            feedback.style.color = "#28a745";
            feedback.textContent = "Datos guardados correctamente.";
        }

        setTimeout(() => {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = "💾 Guardar Costo y Factura";
                btn.style.background = "#28a745";
            }
            if (feedback) {
                feedback.style.display = "none";
            }
        }, 2200);

    } catch (err) {
        console.error("Error al guardar finanzas:", err);
        alert("❌ Error al guardar datos en la base de datos.");
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = "💾 Guardar Costo y Factura";
            btn.style.background = "#28a745";
        }
    }
};

// 3. Función actualizada mostrarDetalles (Controla qué botones se ven)
window.mostrarDetalles = function (evento) {
    eventoSeleccionadoID = evento.id;
    grupoSeleccionadoID = evento.extendedProps.groupId || null;

    const seccionAdminFinanzas = document.getElementById("seccionAdminFinanzas");
    const seccionPDF = document.getElementById("seccionPDF");
    const pdfInfo = document.getElementById("pdfInfo");
    const linkPDF = document.getElementById("linkPDF");
    const adminPDFInput = document.getElementById("adminPDFInput");
    const driveUrlInput = document.getElementById("driveUrlInput");
    const btnGuardarDrive = document.getElementById("btnGuardarDrive");
    const btnEliminarDrive = document.getElementById("btnEliminarDrive");
    const btnEliminar = document.getElementById("btnEliminar");
    const btnEditar = document.getElementById("btnEditar");

    // 1. Llenar datos básicos
    document.getElementById("detCliente").innerText = evento.extendedProps.cliente || "No especificado";
    document.getElementById("detCiudad").innerText = evento.extendedProps.ciudadCompleta || evento.title;

    // --- INICIO CAMBIOS DIRECCIÓN E ICONOS ---
    const direccionTexto = evento.extendedProps.direccion;
    const spanDireccion = document.getElementById("detDireccion");

    if (direccionTexto && direccionTexto.trim().length > 0) {
        const urlMaps = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(direccionTexto)}`;
        // Escapamos comillas simples por seguridad para la función onclick
        const textoSeguroParaCopiar = direccionTexto.replace(/'/g, "\\\\'");

        // NUEVA ESTRUCTURA HTML:
        // Usamos un contenedor flex para alinear texto e iconos
        spanDireccion.innerHTML = `
            <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 10px;">
                <span style="flex-grow: 1; word-break: break-word;">📍 ${direccionTexto}</span>
                
                <div style="display: flex; gap: 8px; align-items: center; flex-shrink: 0;">
                    <span title="Copiar dirección al portapapeles" 
                          style="cursor: pointer; font-size: 1.3em; transition: transform 0.1s;"
                          onmouseover="this.style.transform='scale(1.2)'"
                          onmouseout="this.style.transform='scale(1)'"
                          onclick="copiarTextoAlPortapapeles('${textoSeguroParaCopiar}', this)">
                        📋
                    </span>
                    
                    <a href="${urlMaps}" target="_blank" title="Abrir ubicación en Google Maps" 
                       style="text-decoration:none; font-size: 1.3em; color: #007bff; transition: transform 0.1s;"
                       onmouseover="this.style.transform='scale(1.2)'"
                       onmouseout="this.style.transform='scale(1)'">
                        📌
                    </a>
                </div>
            </div>`;
    } else {
        spanDireccion.innerText = "Sin dirección registrada";
    }
    // --- FIN CAMBIOS DIRECCIÓN ---

    // Fechas — Clickeables para navegar al calendario
    const fechaInicioStr = evento.start.toISOString().split("T")[0];
    const fechaFinStr = evento.extendedProps.fechaFinReal || fechaInicioStr;
    const detFechasEl = document.getElementById("detFechas");
    detFechasEl.innerHTML = `
        <span id="det-fecha-link"
              title="📅 Ver en el calendario"
              style="cursor:pointer; color:#007bff; text-decoration:underline; text-decoration-style:dotted;"
              onclick="irAlCalendarioDesdeDetalle('${eventoSeleccionadoID}', '${fechaInicioStr}')"
              onmouseover="this.style.textDecorationStyle='solid'"
              onmouseout="this.style.textDecorationStyle='dotted'">
            ${fechaInicioStr} ➝ ${fechaFinStr}
        </span>
        <span title="Ver en el calendario" style="font-size:0.8em; color:#999; margin-left:4px;">📅</span>
    `;

    // Lógica de Finanzas y Facturación (Exclusivo Administrador)
    if (esAdmin) {
        if (seccionAdminFinanzas) {
            seccionAdminFinanzas.style.display = "block";
            const inputCosto = document.getElementById("detCostoInput");
            if (inputCosto) {
                const c = evento.extendedProps.costo;
                inputCosto.value = (c !== undefined && c !== null) ? c : "";
            }
            const estadoF = evento.extendedProps.estadoFactura || "Sin facturar";
            window.seleccionarEstadoFactura(estadoF);
            const feedback = document.getElementById("finanzasFeedback");
            if (feedback) feedback.style.display = "none";
            const btnGuardarFin = document.getElementById("btnGuardarFinanzas");
            if (btnGuardarFin) {
                btnGuardarFin.innerHTML = "💾 Guardar Costo y Factura";
                btnGuardarFin.disabled = false;
                btnGuardarFin.style.background = "#28a745";
            }
        }
    } else {
        if (seccionAdminFinanzas) {
            seccionAdminFinanzas.style.display = "none";
        }
    }

    // Lógica de PDF, Admin, botones
    const urlExistente = evento.extendedProps.pdfUrl;
    if (esAdmin) {
        seccionPDF.style.display = "block";
        adminPDFInput.style.display = "block";
        btnEliminar.style.display = "block";
        btnEditar.style.display = "block";

        if (urlExistente) {
            pdfInfo.style.display = "flex";
            linkPDF.href = urlExistente;
            driveUrlInput.value = urlExistente;
            driveUrlInput.readOnly = true;
            btnGuardarDrive.textContent = "✏️";
            btnGuardarDrive.classList.remove("btn-drive-save");
            btnGuardarDrive.classList.add("btn-drive-edit");
            btnGuardarDrive.onclick = function () { window.habilitarEdicionDrive(); };
            btnEliminarDrive.style.display = "block";
        } else {
            pdfInfo.style.display = "none";
            driveUrlInput.value = "";
            driveUrlInput.readOnly = false;
            driveUrlInput.placeholder = "Pegar enlace de Google Drive";
            btnGuardarDrive.textContent = "💾";
            btnGuardarDrive.classList.remove("btn-drive-edit");
            btnGuardarDrive.classList.add("btn-drive-save");
            btnGuardarDrive.onclick = function () { window.guardarEnlaceDrive(); };
            btnEliminarDrive.style.display = "none";
        }
    } else {
        if (urlExistente) {
            pdfInfo.style.display = "flex";
            linkPDF.href = urlExistente;
            driveUrlInput.value = urlExistente;
            driveUrlInput.readOnly = true;
            seccionPDF.style.display = "block";
            adminPDFInput.style.display = "none";
            btnEliminar.style.display = "none";
            btnEditar.style.display = "none";
        } else {
            seccionPDF.style.display = "none";
        }
    }
    document.getElementById("detalleModal").style.display = "block";
};

window.cerrarModal = function (idModal) { document.getElementById(idModal).style.display = "none"; };

// Navega al calendario desde la vista de detalles (al hacer clic en la fecha)
window.irAlCalendarioDesdeDetalle = function (reservaId, fechaInicio) {
    cerrarModal("detalleModal");
    mostrarCalendario();
    if (fechaInicio) {
        calendar.gotoDate(fechaInicio);
    }
    if (reservaId) {
        setTimeout(() => {
            resaltarEventoEnCalendario(reservaId);
        }, 350); // Esperar que el calendario termine de renderizar
    }
};

window.borrarReserva = async function () {
    if (!eventoSeleccionadoID) return;

    // 1. Buscamos la reserva en nuestros datos locales para obtener su Group ID
    const reservaActual = globalReservas.find(r => r.id === eventoSeleccionadoID);
    const groupId = reservaActual ? reservaActual.data.groupId : null;

    let mensajeConfirmacion = "⚠️ ¿Estás seguro de eliminar esta reserva? ⚠️";

    // Si detectamos que es parte de un grupo, avisamos al usuario
    if (groupId) {
        mensajeConfirmacion = "⚠️ ¿Deseas eliminar la reservación completa?";
    }

    if (!confirm(mensajeConfirmacion)) return;

    try {
        if (groupId) {
            // OPCIÓN A: Borrar todo el grupo (Todas las semanas vinculadas)

            // 1. Buscamos todas las reservas con ese groupId
            const q = query(collection(db, "reservas"), where("groupId", "==", groupId));
            const querySnapshot = await getDocs(q);

            // 2. Preparamos un "batch" para borrar todas de golpe
            const batch = writeBatch(db);
            querySnapshot.forEach((doc) => {
                batch.delete(doc.ref);
            });

            // 3. Ejecutamos el borrado masivo
            await batch.commit();

        } else {
            // OPCIÓN B: Borrado simple (Por si es una reserva antigua sin groupId)
            await deleteDoc(doc(db, "reservas", eventoSeleccionadoID));
        }

        cerrarModal("detalleModal");
        await cargarReservas(true); // Recargar calendario y mapa
        alert("🗑️ Reservación eliminada correctamente.");

    } catch (error) {
        console.error("Error al borrar:", error);
        alert("Hubo un error al intentar borrar.");
    }
};

// 1. Modificar iniciarSesion para abrir el modal en lugar del prompt
window.iniciarSesion = async function () {
    const provider = new GoogleAuthProvider();
    provider.addScope("profile");
    provider.addScope("email");

    // Forzar que siempre se muestre el selector de cuentas de Google. [1, 3, 6]
    provider.setCustomParameters({
        prompt: "select_account"
    });

    try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;

        if (ADMIN_EMAILS.includes(user.email)) {
            console.log(`Login exitoso como administrador: ${user.email}`);
            esAdmin = true; // Setear la variable global
            actualizarUIConEstadoAdmin(); // Actualizar la UI
        } else {
            // Si el correo no está en la lista de administradores, cerrar sesión inmediatamente
            await signOut(auth);
            alert("❌ Acceso denegado: Tu cuenta no tiene permisos de administrador.");
            console.warn(`Intento de login fallido: ${user.email} no es un administrador autorizado.`);
        }
    } catch (error) {
        console.error("Error durante el login con Google:", error);
        alert(`Error al iniciar sesión: ${error.message}`);
    }
};

// 2. Función actualizada para cerrar sesión
window.cerrarSesion = async function () {
    try {
        await signOut(auth);
        console.log("Cierre de sesión de administrador");
        // onAuthStateChanged se encargará de setear esAdmin a false y actualizar la UI
    } catch (error) {
        console.error("Error al cerrar sesión:", error);
        alert(`Error al cerrar sesión: ${error.message}`);
    }
};

window.ajustarMapa = function () {
    // Coordenadas originales utilizadas al cargar el mapa por primera vez
    const latOriginal = 23.6345;
    const lonOriginal = -102.5528;
    const zoomOriginal = 5;

    if (map) {
        map.flyTo([latOriginal, lonOriginal], zoomOriginal, {
            duration: 1.5
        });
        map.closePopup();
    }
};

window.guardarEnlaceDrive = async function () {
    const url = document.getElementById("driveUrlInput").value;
    if (!url) return alert("Por favor, pega un enlace válido.");
    if (!eventoSeleccionadoID) return;

    try {
        const docRef = doc(db, "reservas", eventoSeleccionadoID);
        await updateDoc(docRef, { pdfUrl: url });
        alert("✅ Enlace de Drive guardado.");
        await cargarReservas(true); // Refresca el calendario
        cerrarModal("detalleModal");
    } catch (error) {
        console.error("Error al guardar link:", error);
        alert("Error al guardar en base de datos.");
    }
};
// ---------------------------------------------------------
// CIERRE DE MODALES: Tecla ESC y Clic fuera del contenido
// ---------------------------------------------------------

// 1. Cerrar con tecla Escape
document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
        const modales = document.querySelectorAll(".modal");
        modales.forEach(modal => {
            modal.style.display = "none";
        });
    }
});

// 2. Cerrar al hacer clic en el fondo oscuro (.modal)
// Se usa 'window' para capturar clics globales
window.addEventListener("click", function (event) {
    // Verificamos si el elemento clickeado tiene la clase 'modal'
    // (Esto significa que clickeó el fondo, no el 'modal-content')
    if (event.target.classList.contains("modal")) {
        event.target.style.display = "none";
    }
});

// --- FUNCIONES DE IMPORTACIÓN CSV ---
// Función para abrir el selector de archivos
window.abrirSelectorCSV = function () {
    const input = document.getElementById("fileInput"); // <--- Debe coincidir con el ID del HTML
    if (input) {
        input.click();
    } else {
        console.error("No se encontró el elemento <input type='file' id='fileInput'>");
        alert("Error: No se encuentra el campo de carga de archivos. Recarga la página.");
    }
};

window.procesarArchivoExcel = function (input) {
    const archivo = input.files[0];
    if (!archivo) return;

    // 1. Referencias al Overlay (Spinner Pantalla Completa)
    const overlay = document.getElementById("loading-overlay");
    const textoOverlay = overlay.querySelector("p"); // El texto debajo del spinner
    const textoOriginalOverlay = textoOverlay.innerText; // Guardamos "Cargando Agenda..." para restaurarlo luego

    // Referencias al botón (para evitar doble clic de fondo)
    const btnImport = document.getElementById("btnImport");
    if (btnImport) btnImport.disabled = true;

    const reader = new FileReader();

    reader.onload = async function (e) {
        try {
            // 2. ACTIVAR SPINNER
            overlay.style.display = "flex";
            textoOverlay.innerText = "📂 Analizando Excel...";

            // --- LECTURA DEL ARCHIVO ---
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: "array", cellDates: true, dateNF: "yyyy-mm-dd" });
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const lineas = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "", raw: false });

            if (lineas.length < 2) {
                alert("El archivo Excel parece estar vacío.");
                return;
            }

            // Pausa momentánea para ocultar spinner y mostrar confirmación (el confirm bloquea el render)
            overlay.style.display = "none";

            if (!confirm(`Procesando Excel (${lineas.length - 1} filas).

MODO DE PRECISIÓN:
1. Si hay Coordenadas (Col F y G) -> Se usan directo.
2. Si no -> Se busca la Dirección en el mapa.

¿Continuar?`)) {
                input.value = "";
                if (btnImport) btnImport.disabled = false;
                textoOverlay.innerText = textoOriginalOverlay;
                return;
            }

            // 3. REACTIVAR SPINNER PARA EL PROCESO
            overlay.style.display = "flex";
            textoOverlay.innerText = "🚀 Iniciando motor de importación...";

            let contExito = 0;
            let contError = 0;
            let contCoordsDirectas = 0;

            // Batch config
            const BATCH_SIZE = 400;
            let batch = writeBatch(db);
            let operationCounter = 0;

            const formatearFecha = (val) => {
                if (!val) return null;
                if (val instanceof Date) return val.toISOString().split("T")[0];
                let str = val.toString().trim();
                if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
                if (str.includes("/")) {
                    const partes = str.split("/");
                    if (partes.length === 3) {
                        let dia = partes[0].padStart(2, "0");
                        let mes = partes[1].padStart(2, "0");
                        let ano = partes[2];
                        if (ano.length === 2) ano = "20" + ano;
                        return `${ano}-${mes}-${dia}`;
                    }
                }
                return null;
            };

            const obtenerCoordenadasDeAPI = async (direccion, ciudad) => {
                if (!direccion || direccion.length < 2) return { lat: "", lng: "" };
                try {
                    let url = `https://geocode.search.hereapi.com/v1/geocode?q=${encodeURIComponent(direccion)}&apiKey=${API_KEY_HERE}&lang=es&limit=1`;
                    if (ciudad && ciudad.length > 2 && ciudad !== "Sin Ciudad") url += `&qq=city=${encodeURIComponent(ciudad)};country=MEX`;
                    else url += "&qq=country=MEX";

                    const res = await fetch(url);
                    const data = await res.json();

                    if (data.items && data.items.length > 0) {
                        return { lat: data.items[0].position.lat, lng: data.items[0].position.lng };
                    }
                } catch (e) { console.error("Error Geo", e); }
                return { lat: "", lng: "" };
            };

            const esperar = (ms) => new Promise(resolve => setTimeout(resolve, ms));

            // --- BUCLE PRINCIPAL ---
            for (let i = 1; i < lineas.length; i++) {
                const fila = lineas[i];
                if (!fila || fila.length === 0) continue;

                // 4. ACTUALIZAR TEXTO DEL SPINNER CON EL PROGRESO
                textoOverlay.innerText = `⏳ Importando fila ${i} de ${lineas.length - 1}...`;

                // --- MAPEO DE COLUMNAS ---
                const rawInicio = fila[0];
                const rawFin = fila[1];
                const cliente = fila[2] ? fila[2].toString().trim() : "Cliente";
                const ciudad = fila[3] ? fila[3].toString().trim() : "Sin Ciudad";
                const direccionTexto = fila[4] ? fila[4].toString().trim() : "";
                const rawLat = fila[5];
                const rawLng = fila[6];
                const rawEsp = fila[7] ? fila[7].toString().trim() : "";
                const esEspecial = rawEsp.toUpperCase() === "X";

                const fInicio = formatearFecha(rawInicio);
                const fFin = formatearFecha(rawFin);

                if (!fInicio || !fFin) { contError++; continue; }

                // --- LÓGICA DE UBICACIÓN ---
                let latFinal = "";
                let lngFinal = "";

                if (rawLat && rawLng && !isNaN(parseFloat(rawLat)) && !isNaN(parseFloat(rawLng))) {
                    latFinal = parseFloat(rawLat);
                    lngFinal = parseFloat(rawLng);
                    contCoordsDirectas++;
                } else {
                    const coordsAPI = await obtenerCoordenadasDeAPI(direccionTexto, ciudad);
                    latFinal = coordsAPI.lat;
                    lngFinal = coordsAPI.lng;
                    await esperar(150);
                }

                const rangos = calcularRangosSinDomingo(fInicio, fFin);
                if (rangos.length === 0) { contError++; continue; }

                const cleanClient = cliente.replace(/[^a-zA-Z0-9]/g, "");
                const groupId = `GRP_${fInicio}_${cleanClient}`;

                for (let r of rangos) {
                    let startStr = r.start.toISOString().split("T")[0];
                    let endStr = r.end.toISOString().split("T")[0];
                    const docId = `${startStr}_${cleanClient}`;
                    const docRef = doc(db, "reservas", docId);

                    batch.set(docRef, {
                        fechaInicio: startStr,
                        fechaFin: endStr,
                        cliente: cliente,
                        ciudad: ciudad,
                        direccion: direccionTexto,
                        lat: latFinal,
                        lng: lngFinal,
                        groupId: groupId,
                        creado: new Date(),
                        esEspecial: esEspecial
                        // pdfUrl: null  <-- Mantenemos comentada esta línea para no borrar adjuntos
                    }, { merge: true });

                    operationCounter++;
                    contExito++;

                    if (operationCounter >= BATCH_SIZE) {
                        await batch.commit();
                        batch = writeBatch(db);
                        operationCounter = 0;
                    }
                }
            }

            if (operationCounter > 0) await batch.commit();

            // 5. MENSAJE FINAL
            textoOverlay.innerText = "✅ Finalizando...";

            alert(`Importación Completada.
✅ Total Registros: ${contExito}
🎯 Usaron Coordenadas Exactas: ${contCoordsDirectas}
🗺️ Buscados en Mapa: ${contExito - contCoordsDirectas}`);

            await cargarReservas(true); // Recarga forzada

        } catch (error) {
            console.error(error);
            alert("Error crítico en el archivo Excel: " + error.message);
        } finally {
            // 6. LIMPIEZA FINAL: OCULTAR SPINNER Y RESTAURAR TEXTO
            overlay.style.display = "none";
            textoOverlay.innerText = textoOriginalOverlay; // "Cargando Agenda..."

            if (btnImport) btnImport.disabled = false;
            input.value = "";
        }
    };
    reader.readAsArrayBuffer(archivo);
};

// --- Función auxiliar para copiar texto al portapapeles ---
window.copiarTextoAlPortapapeles = function (texto, elementoIcono) {
    if (!texto) return;

    // API moderna de portapapeles
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(texto)
            .then(() => {
                // Feedback visual: cambiar icono temporalmente
                const iconoOriginal = elementoIcono.innerText;
                elementoIcono.innerText = "✅";
                // Restaurar el icono original después de 1.5 segundos
                setTimeout(() => {
                    elementoIcono.innerText = iconoOriginal;
                }, 1500);
            })
            .catch(err => {
                console.error("Error al copiar: ", err);
                alert("Hubo un problema al intentar copiar automáticamente.");
            });
    } else {
        // Método de respaldo (fallback) para navegadores muy viejos
        const textArea = document.createElement("textarea");
        textArea.value = texto;
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand("copy");
            alert("Dirección copiada.");
        } catch (err) {
            alert("No se pudo copiar la dirección.");
        }
        document.body.removeChild(textArea);
    }
};

window.toggleItinerary = function () {
    const sidebar = document.getElementById("map-sidebar");
    const icon = document.getElementById("itinerary-toggle-icon");

    // Solo actuar si estamos en modo móvil (verificando si el header está colapsado o tiene la clase)
    // Aunque la clase .open solo afecta en móvil por el CSS media query, es seguro alternarla siempre.

    if (sidebar.classList.contains("open")) {
        sidebar.classList.remove("open");
        if (icon) icon.style.transform = "rotate(0deg)"; // Flecha arriba
    } else {
        sidebar.classList.add("open");
        if (icon) icon.style.transform = "rotate(180deg)"; // Flecha abajo
    }
};

// --- SISTEMA DE AUTO-ACTUALIZACIÓN ---
async function verificarNuevaVersion() {
    try {
        // 1. Obtener la versión que tiene el HTML cargado actualmente
        // Nota: Esto depende del span que ya tienes: <span id="app-version">1.0.X</span>
        const elementoVersion = document.getElementById("app-version");
        if (!elementoVersion) return;

        // Limpiamos el texto para obtener solo el número "1.0.XXXX"
        // Asume formato "1.0.1234 (Fecha)" -> split toma la primera parte
        const versionLocal = elementoVersion.innerText.split(" ")[0].trim();

        // 2. Consultar al servidor la versión real (usamos timestamp para evitar caché)
        const respuesta = await fetch(`version.json?t=${new Date().getTime()}`, { cache: "no-store" });
        if (!respuesta.ok) return;

        const datosServidor = await respuesta.json();
        const versionServidor = datosServidor.version;

        console.log(`Versión Local: ${versionLocal} | Versión Servidor: ${versionServidor}`);

        // 3. Comparar y recargar si es necesario
        if (versionServidor && versionLocal !== versionServidor) {
            console.log("🔄 Nueva versión detectada. Actualizando...");

            // Opción A: Recarga silenciosa (puede perder datos no guardados)
            // window.location.reload(true);

            // Opción B (Recomendada): Preguntar al usuario o mostrar un aviso discreto
            if (confirm(`¡Nueva actualización disponible!

Se recargará la página para obtener las mejoras.`)) {
                // El 'true' fuerza la recarga desde el servidor, ignorando caché
                window.location.reload(true);
            }
        }
    } catch (error) {
        console.log("No se pudo verificar actualizaciones:", error);
    }
}

// Ejecutar verificación al cargar
window.addEventListener("load", () => {
    setTimeout(verificarNuevaVersion, 3000); // Espera 3 seg para no alentar el inicio
});

// Ejecutar verificación cada vez que la app vuelve a primer plano (común en celulares)
document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
        verificarNuevaVersion();
    }
});

document.addEventListener("click", function (event) {
    const menu = document.getElementById("mobile-menu");
    const hamburger = document.querySelector(".hamburger-btn");

    // Verificamos si el menú existe y si está abierto
    if (menu && menu.classList.contains("open")) {
        // Si el clic NO fue dentro del menú Y TAMPOCO en el botón de hamburguesa
        if (!menu.contains(event.target) && !hamburger.contains(event.target)) {
            menu.classList.remove("open");
        }
    }
});

// Función de ayuda para depuración desde la consola del navegador.
// Se define en un script no-módulo para ser accesible globalmente.
function testNotificaciones() {
    console.log("🧪 Forzando la verificación de notificaciones...");
    // La función verificarEventosProximos() está en el módulo, por lo que no podemos llamarla directamente.
    // En su lugar, disparamos un evento personalizado que el módulo escuchará.
    window.dispatchEvent(new CustomEvent("test-notificaciones"));
}

// 1. Registrar Service Worker
if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        navigator.serviceWorker.register("sw.js") // Ruta corregida
            .then(reg => console.log("Service Worker registrado: ", reg.scope))
            .catch(err => console.log("Service Worker falló: ", err));
    });
}

// 2. Lógica del Botón de Instalación (Opcional pero recomendado)
let deferredPrompt;
// Escuchar el evento que indica que la app es instalable
window.addEventListener("beforeinstallprompt", (e) => {
    // Prevenir que Chrome muestre el banner automáticamente (opcional, si quieres control total)
    // e.preventDefault(); 

    // Guardar el evento para dispararlo cuando quieras
    deferredPrompt = e;

    // Mostrar un botón "Instalar" en tu menú (si tienes uno oculto)
    // Ejemplo: document.getElementById('btnInstallApp').style.display = 'block';
    console.log("App lista para instalar");
});

// Función para llamar desde un botón: <button onclick="instalarApp()">Instalar</button>
async function instalarApp() {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`Usuario eligió: ${outcome}`);
        deferredPrompt = null;
    }
}

// --- REPORTES EJECUTIVOS ---

window.abrirReporteModal = function (anoSeleccionado = null) {
    const modal = document.getElementById("reporteModal");
    const selectAno = document.getElementById("filtroAnoReporte");
    const inputCliente = document.getElementById("filtroClienteReporte");

    // Resetear
    inputCliente.value = "";

    // Obtener años únicos de las reservas
    const anos = new Set();
    globalReservas.forEach(r => {
        if (r.start) {
            anos.add(r.start.getFullYear());
        }
    });

    // Llenar select
    selectAno.innerHTML = "<option value=\"todos\">Todos los años</option>";
    Array.from(anos).sort((a, b) => b - a).forEach(ano => {
        const option = document.createElement("option");
        option.value = ano;
        option.textContent = ano;
        selectAno.appendChild(option);
    });

    // Seleccionar el año deseado o el año actual si está en la lista
    const currentYear = new Date().getFullYear();
    const anoTarget = anoSeleccionado ? parseInt(anoSeleccionado) : null;
    if (anoSeleccionado && (anoSeleccionado === "todos" || anos.has(anoTarget))) {
        selectAno.value = anoSeleccionado;
    } else if (anos.has(currentYear)) {
        selectAno.value = currentYear;
    }

    modal.style.display = "block";

    // Generar reporte inicial
    generarReporte();
};

function esEstadoFacturada(estado) {
    return estado === "Facturada";
}

function consolidarEstadoFactura(estados) {
    return (estados || []).some(esEstadoFacturada) ? "Facturada" : "Sin facturar";
}

function iconoEstadoFactura(estado) {
    return esEstadoFacturada(estado) ? "✅" : "⬜";
}

window.generarReporte = function () {
    const selectAno = document.getElementById("filtroAnoReporte").value;
    const inputCliente = document.getElementById("filtroClienteReporte").value.toLowerCase().trim();
    const tbody = document.getElementById("tablaReporteCuerpo");
    const subtitulo = document.getElementById("subtituloReporte");
    const kpiTotal = document.getElementById("kpiTotal");
    const kpiClientes = document.getElementById("kpiClientes");
    const kpiCiudad = document.getElementById("kpiCiudad");
    const kpiClientePrincipalDias = document.getElementById("kpiClientePrincipalDias");
    const kpiClientePrincipalMonto = document.getElementById("kpiClientePrincipalMonto");

    tbody.innerHTML = "";

    // Filtrar globalReservas
    let reservasFiltradas = globalReservas.filter(r => {
        if (r.data.esEspecial === true) {
            return false;
        }

        let matchAno = true;
        if (selectAno !== "todos" && r.start) {
            matchAno = r.start.getFullYear() === parseInt(selectAno);
        }

        let matchCliente = true;
        if (inputCliente !== "") {
            const clienteStr = (r.data.cliente || "").toLowerCase();
            matchCliente = clienteStr.includes(inputCliente);
        }

        return matchAno && matchCliente;
    });

    // Ordenar por cliente y luego fecha
    reservasFiltradas.sort((a, b) => {
        const cA = (a.data.cliente || "").toLowerCase().trim();
        const cB = (b.data.cliente || "").toLowerCase().trim();
        if (cA < cB) return -1;
        if (cA > cB) return 1;
        return a.start - b.start;
    });

    // Agrupar reservaciones consecutivas del mismo cliente (brecha <= 4 días)
    let reservasAgrupadas = [];

    const calcDias = (res) => {
        const startObj = new Date(res.data.fechaInicio + "T12:00:00");
        const endObj = new Date(res.data.fechaFin + "T12:00:00");
        let d = Math.floor((endObj - startObj) / (1000 * 60 * 60 * 24)) + 1;
        return d < 1 ? 1 : d;
    };

    const prepararReservaReporte = (res) => {
        const copy = JSON.parse(JSON.stringify(res));
        copy.start = new Date(copy.start);
        copy.end = new Date(copy.end);
        copy.diasReales = calcDias(copy);
        copy.estadosFactura = [copy.data.estadoFactura || "Sin facturar"];
        copy.data.estadoFactura = consolidarEstadoFactura(copy.estadosFactura);
        copy.gruposCosto = {};
        const gidCosto = copy.data.groupId || copy.id;
        copy.gruposCosto[gidCosto] = true;
        copy.data.costo = Number(copy.data.costo || 0);
        return copy;
    };

    if (reservasFiltradas.length > 0) {
        let current = prepararReservaReporte(reservasFiltradas[0]);

        for (let i = 1; i < reservasFiltradas.length; i++) {
            let next = prepararReservaReporte(reservasFiltradas[i]);

            const currentC = (current.data.cliente || "").toLowerCase().trim();
            const nextC = (next.data.cliente || "").toLowerCase().trim();

            if (currentC === nextC && currentC !== "") {
                const currentEndObj = new Date(current.data.fechaFin + "T12:00:00");
                const nextStartObj = new Date(next.data.fechaInicio + "T12:00:00");
                const gapDays = (nextStartObj - currentEndObj) / (1000 * 60 * 60 * 24);

                if (gapDays <= 4 && gapDays >= -400) {
                    const nextEndObj = new Date(next.data.fechaFin + "T12:00:00");
                    if (nextEndObj > currentEndObj) {
                        current.data.fechaFin = next.data.fechaFin;
                        current.end = next.end;
                    }
                    current.diasReales += next.diasReales; // Acumular días sin inflarlos
                    current.estadosFactura.push(...next.estadosFactura);
                    current.data.estadoFactura = consolidarEstadoFactura(current.estadosFactura);

                    const nextGidCosto = next.data.groupId || next.id;
                    if (!current.gruposCosto[nextGidCosto]) {
                        current.gruposCosto[nextGidCosto] = true;
                        current.data.costo = Number(current.data.costo || 0) + Number(next.data.costo || 0);
                    }
                    continue;
                }
            }
            reservasAgrupadas.push(current);
            current = next;
        }
        reservasAgrupadas.push(current);
    }

    // Ordenar las agupaciones por pura cronología
    reservasAgrupadas.sort((a, b) => a.start - b.start);

    // Preparar el subtítulo
    let subtituloTexto = `Filtros aplicados - Año: ${selectAno === "todos" ? "Todos" : selectAno}`;
    if (inputCliente) {
        subtituloTexto += ` | Cliente: "${inputCliente}"`;
    }
    subtitulo.textContent = subtituloTexto;

    // Actualizar Total KPI con cantidad agrupada
    kpiTotal.textContent = reservasAgrupadas.length;

    if (reservasAgrupadas.length === 0) {
        tbody.innerHTML = "<tr><td colspan=\"3\" style=\"text-align: center; padding: 15px; color: var(--text-color-muted);\">No hay reservaciones que coincidan con los filtros.</td></tr>";
        kpiClientes.textContent = "0";
        kpiCiudad.textContent = "-";
        if (kpiClientePrincipalDias) kpiClientePrincipalDias.textContent = "-";
        if (kpiClientePrincipalMonto) kpiClientePrincipalMonto.textContent = "-";
        return;
    }

    const clientesSet = new Set();
    const ciudadesCount = {};
    let totalDiasGlobales = 0;
    let totalAdmin = 0;

    // Poblar la tabla
    reservasAgrupadas.forEach(r => {
        if (r.data.cliente) clientesSet.add(r.data.cliente.trim().toLowerCase());

        let numDias = r.diasReales || 1; // Usar los días puros consolidados
        totalAdmin += Number(r.data.costo || 0);
        totalDiasGlobales += numDias;

        let ciudadDisplay = "N/A";
        if (r.data.ciudad) {
            ciudadDisplay = r.data.ciudad.split(",")[0].trim();
            ciudadesCount[ciudadDisplay] = (ciudadesCount[ciudadDisplay] || 0) + numDias; // Sumar dias
        }

        const tr = document.createElement("tr");

        const fI = r.data.fechaInicio ? r.data.fechaInicio.split("-") : [];
        const fF = r.data.fechaFin ? r.data.fechaFin.split("-") : [];
        const fechaInicioStr = fI.length === 3 ? `${fI[2]}/${fI[1]}/${fI[0]}` : r.data.fechaInicio;
        const fechaFinStr = fF.length === 3 ? `${fF[2]}/${fF[1]}/${fF[0]}` : r.data.fechaFin;
        const fechaDisplay = `${fechaInicioStr} - ${fechaFinStr}`;

        tr.innerHTML = `
            <td>${r.data.cliente || "N/A"}</td>
            <td>${ciudadDisplay}</td>
            <td>${fechaDisplay}</td>
            <td style="text-align: center; font-weight: 600;">${numDias}</td>
            <td style="text-align: right;">${Number(r.data.costo || 0).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN</td>
            <td style="text-align: center;" title="${esEstadoFacturada(r.data.estadoFactura) ? "Facturada" : "Sin facturar"}">${iconoEstadoFactura(r.data.estadoFactura)}</td>
        `;
        tbody.appendChild(tr);
    });

    // Actualizar otros KPIs
    kpiClientes.textContent = clientesSet.size;

    let maxCount = 0;
    let ciudadMax = "-";
    for (const [c, count] of Object.entries(ciudadesCount)) {
        if (count > maxCount) {
            maxCount = count;
            ciudadMax = c;
        }
    }
    kpiCiudad.textContent = ciudadMax;

    if (kpiClientePrincipalDias || kpiClientePrincipalMonto) {
        const clientesData = {};
        reservasAgrupadas.forEach(r => {
            const cliente = r.data.cliente ? r.data.cliente.trim() : "";
            if (cliente) {
                if (!clientesData[cliente]) {
                    clientesData[cliente] = {
                        count: 0,
                        dias: 0,
                        monto: 0,
                        sedes: new Set()
                    };
                }
                clientesData[cliente].count++;
                clientesData[cliente].dias += r.diasReales || 1;
                clientesData[cliente].monto += Number(r.data.costo || 0);
                if (r.data.ciudad) {
                    clientesData[cliente].sedes.add(r.data.ciudad.split(",")[0].trim());
                }
            }
        });

        let clientePrincipalDias = "-";
        let diasPrincipal = 0;
        let clientePrincipalMonto = "-";
        let montoPrincipal = 0;

        const candidatos = Object.entries(clientesData);

        if (candidatos.length > 0) {
            // 1. Cliente Principal por DÍAS (descendente por días, desempate por menos bloques y menos sedes)
            const candidatosDias = [...candidatos];
            candidatosDias.sort((a, b) => b[1].dias - a[1].dias);
            const maxDias = candidatosDias[0][1].dias;
            let empatadosPorDias = candidatosDias.filter(c => c[1].dias === maxDias);

            if (empatadosPorDias.length > 1) {
                empatadosPorDias.sort((a, b) => a[1].count - b[1].count);
                const minBloques = empatadosPorDias[0][1].count;
                empatadosPorDias = empatadosPorDias.filter(c => c[1].count === minBloques);
            }
            if (empatadosPorDias.length > 1) {
                empatadosPorDias.sort((a, b) => a[1].sedes.size - b[1].sedes.size);
            }

            clientePrincipalDias = empatadosPorDias[0][0];
            diasPrincipal = empatadosPorDias[0][1].dias;

            // 2. Cliente Principal por MONTO (descendente por monto, desempate por más días y menos bloques)
            const candidatosMonto = [...candidatos];
            candidatosMonto.sort((a, b) => b[1].monto - a[1].monto);
            const maxMonto = candidatosMonto[0][1].monto;
            let empatadosPorMonto = candidatosMonto.filter(c => c[1].monto === maxMonto);

            if (empatadosPorMonto.length > 1) {
                empatadosPorMonto.sort((a, b) => b[1].dias - a[1].dias);
                const maxDiasM = empatadosPorMonto[0][1].dias;
                empatadosPorMonto = empatadosPorMonto.filter(c => c[1].dias === maxDiasM);
            }
            if (empatadosPorMonto.length > 1) {
                empatadosPorMonto.sort((a, b) => a[1].count - b[1].count);
            }

            clientePrincipalMonto = empatadosPorMonto[0][0];
            montoPrincipal = empatadosPorMonto[0][1].monto;
        }

        if (kpiClientePrincipalDias) {
            kpiClientePrincipalDias.innerHTML = clientePrincipalDias !== "-"
                ? `${clientePrincipalDias} <span class="kpi-dual-subtext">(${diasPrincipal} días)</span>`
                : "-";
        }

        if (kpiClientePrincipalMonto) {
            const montoFormatted = `$${Number(montoPrincipal).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN`;
            kpiClientePrincipalMonto.innerHTML = clientePrincipalMonto !== "-"
                ? `${clientePrincipalMonto} <span class="kpi-dual-subtext">(${montoFormatted})</span>`
                : "-";
        }
    }

    let kpiSemanas = document.getElementById("kpiSemanas");
    if (kpiSemanas) {
        kpiSemanas.textContent = (totalDiasGlobales / 5).toFixed(1);
        const kpiTotalAdmin = document.getElementById("kpiTotalAdmin");
        if (kpiTotalAdmin) { kpiTotalAdmin.textContent = `$${Number(totalAdmin).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN`; }
    }
};

window.exportarReportePDF = async function () {
    const elemento = document.getElementById("reporteParaPdf");
    // Guardar estilos originales
    const colorOriginal = elemento.style.color;
    const bgOriginal = elemento.style.background;
    const opt = {
        html2canvas: {
            scale: 2,
            backgroundColor: null,
            // Forzar ancho de escritorio para que los media queries móviles no apliquen
            windowWidth: 1200,
            windowHeight: 900,
            onclone: function (doc) {
                // Set CSS variables only in the cloned document so the live UI doesn't flash transparent
                const docRoot = doc.documentElement;
                docRoot.style.setProperty("--text-color", "#000000");
                docRoot.style.setProperty("--text-color-muted", "#333333");
                docRoot.style.setProperty("--text-color-light", "#222222");
                docRoot.style.setProperty("--bg-color", "transparent");
                docRoot.style.setProperty("--card-bg", "transparent");
                docRoot.style.setProperty("--hover-bg", "rgba(0,0,0,0.03)");
                docRoot.style.setProperty("--border-color", "#cccccc");

                // Forzar layout de escritorio: evita que los @media (max-width: 768px) apliquen
                docRoot.style.setProperty("min-width", "1024px", "important");
                doc.body.style.setProperty("min-width", "1024px", "important");

                doc.body.style.setProperty("background", "transparent", "important");
                docRoot.style.setProperty("background", "transparent", "important");

                const el = doc.getElementById("reporteParaPdf");
                if (el) {
                    el.classList.add("pdf-export-mode"); // Sólo en el clon
                    // Asegurar que el contenido del reporte use el ancho completo de escritorio
                    el.style.setProperty("min-width", "700px", "important");
                    let anc = el.parentElement;
                    while (anc && anc !== doc.body && anc !== docRoot) {
                        anc.style.setProperty("background", "transparent", "important");
                        anc.style.setProperty("background-color", "transparent", "important");
                        anc = anc.parentElement;
                    }
                }
            }
        }
    };

    const btn = document.querySelector("#reporteModal .btn-action");
    const textOrig = btn.innerHTML;
    btn.innerHTML = "<span class=\"loader\" style=\"width:16px;height:16px;margin-right:8px;border-width:2px;vertical-align:middle;display:inline-block; border-top-color: white;\"></span> Generando PDF...";
    btn.disabled = true;

    try {
        // Ceder el control al navegador para que dibuje el spinner antes del bloqueo
        await new Promise(resolve => setTimeout(resolve, 50));

        // ... resto del código ...

        // Obtenemos canvas saltandonos JS PDF y cualquier blanco por defecto
        const canvas = await html2canvas(elemento, opt.html2canvas);

        // Cargar la plantilla usando directamente pdf-lib
        const resp = await fetch("template/TrackSIM Membretada.pdf");
        if (!resp.ok) throw new Error("Plantilla no encontrada");

        const templateBytes = await resp.arrayBuffer();
        // Usamos PDFDocument importado

        const mergedDoc = await PDFDocument.load(templateBytes);
        const templateDoc = await PDFDocument.load(templateBytes);

        const [templatePage] = mergedDoc.getPages();
        const { width, height } = templatePage.getSize();

        const marginX = 36;
        const marginYTop = 36;
        const marginYBottom = 36;
        const drawWidth = width - marginX * 2;
        const pageMaxHeight = height - marginYTop - marginYBottom;

        const pxToPtRatio = drawWidth / canvas.width;
        const pagePxHeight = pageMaxHeight / pxToPtRatio;

        let remainHeight = canvas.height;
        let yPos = 0;
        let pageIdx = 0;

        while (remainHeight > 0) {
            const chunkHeightPx = Math.min(pagePxHeight, remainHeight);
            const chunkCanvas = document.createElement("canvas");
            chunkCanvas.width = canvas.width;
            chunkCanvas.height = chunkHeightPx;
            const ctx = chunkCanvas.getContext("2d");

            // Hack brutal si el fondo sigue blanco: Forzar alpha
            ctx.drawImage(canvas, 0, yPos, canvas.width, chunkHeightPx, 0, 0, canvas.width, chunkHeightPx);

            const imgData = ctx.getImageData(0, 0, chunkCanvas.width, chunkCanvas.height);
            const data = imgData.data;
            for (let i = 0; i < data.length; i += 4) {
                if (data[i] > 240 && data[i + 1] > 240 && data[i + 2] > 240) {
                    data[i + 3] = 0; // Transparencia pura a los blancos
                }
            }
            ctx.putImageData(imgData, 0, 0);

            const pngData = chunkCanvas.toDataURL("image/png");
            const pngImage = await mergedDoc.embedPng(pngData);

            const drawHeight = chunkHeightPx * pxToPtRatio;

            let targetPage;
            if (pageIdx === 0) {
                targetPage = templatePage;
            } else {
                const [copiedPage] = await mergedDoc.copyPages(templateDoc, [0]);
                targetPage = mergedDoc.addPage(copiedPage);
            }

            targetPage.drawImage(pngImage, {
                x: marginX,
                y: height - marginYTop - drawHeight,
                width: drawWidth,
                height: drawHeight
            });

            remainHeight -= chunkHeightPx;
            yPos += chunkHeightPx;
            pageIdx++;
        }

        const finalPdfBytes = await mergedDoc.save();

        const blob = new Blob([finalPdfBytes], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        const fechaActual = new Date().toISOString().split("T")[0];
        a.href = url;
        a.download = `Summary_${fechaActual}.pdf`;
        a.click();
        URL.revokeObjectURL(url);

    } catch (err) {
        console.error("Error principal fusionando PDF exacto: ", err);
        alert("Hubo un error crítico al procesar y montar el PNG en el membrete.");
    } finally {
        btn.innerHTML = textOrig;
        btn.disabled = false;
    }
};

window.exportarReportePNG = async function () {
    const elemento = document.getElementById("reporteParaPdf");
    const opt = {
        html2canvas: {
            scale: 2,
            backgroundColor: null, // Permitir transparencia original
            // Forzar ancho de escritorio para que los media queries móviles no apliquen
            windowWidth: 1200,
            windowHeight: 900,
            onclone: function (doc) {
                const docRoot = doc.documentElement;
                docRoot.style.setProperty("--text-color", "#000000");
                docRoot.style.setProperty("--text-color-muted", "#333333");
                docRoot.style.setProperty("--text-color-light", "#222222");
                docRoot.style.setProperty("--bg-color", "transparent");
                docRoot.style.setProperty("--card-bg", "transparent");
                docRoot.style.setProperty("--hover-bg", "transparent");
                docRoot.style.setProperty("--border-color", "#cccccc");

                // Forzar layout de escritorio: evita que los @media (max-width: 768px) apliquen
                docRoot.style.setProperty("min-width", "1024px", "important");
                doc.body.style.setProperty("min-width", "1024px", "important");

                doc.body.style.setProperty("background", "transparent", "important");
                docRoot.style.setProperty("background", "transparent", "important");

                const el = doc.getElementById("reporteParaPdf");
                if (el) {
                    el.classList.add("pdf-export-mode");
                    // Asegurar que el contenido del reporte use el ancho completo de escritorio
                    el.style.setProperty("min-width", "700px", "important");

                    let anc = el.parentElement;
                    while (anc && anc !== doc.body && anc !== docRoot) {
                        anc.style.setProperty("background", "transparent", "important");
                        anc.style.setProperty("background-color", "transparent", "important");
                        anc = anc.parentElement;
                    }
                }
            }
        }
    };

    if (typeof html2canvas !== "undefined") {
        const btn = document.querySelector("#btnExportarPNG");
        const textOrig = btn ? btn.innerHTML : "🖼️ Exportar a PNG";
        if (btn) {
            btn.innerHTML = "<span class=\"loader\" style=\"width:16px;height:16px;margin-right:8px;border-width:2px;vertical-align:middle;display:inline-block; border-top-color: white;\"></span> Exportando...";
            btn.disabled = true;
        }

        try {
            await new Promise(resolve => setTimeout(resolve, 50));
            const canvas = await html2canvas(elemento, opt.html2canvas);

            // Crear canvas final con fondo transparente garantizado
            const finalCanvas = document.createElement("canvas");
            finalCanvas.width = canvas.width;
            finalCanvas.height = canvas.height;
            const ctx = finalCanvas.getContext("2d");

            // 1. Dibujar la marca de agua primero (al fondo)
            const img = new Image();
            img.src = "icon-512.png";
            img.crossOrigin = "Anonymous";

            await new Promise((resolve) => {
                img.onload = resolve;
                img.onerror = resolve; // Ignorar fallo para no bloquear
            });

            if (img.complete && img.naturalWidth > 0) {
                // Centrado exacto mitigando diferencias de aspecto si las hubiera
                const sizeW = canvas.width * 0.7;
                const sizeH = sizeW; // Asumiendo que el icono es un cuadrado perfecto
                const x = (canvas.width - sizeW) / 2;
                const y = (canvas.height - sizeH) / 2;

                ctx.globalAlpha = 0.10; // Opacidad reducida 
                ctx.drawImage(img, x, y, sizeW, sizeH);
                ctx.globalAlpha = 1.0;
            }

            // 2. Dibujar el contenido de html2canvas (que ahora tiene fondos transparentes) encima
            ctx.drawImage(canvas, 0, 0);

            const dataUrl = finalCanvas.toDataURL("image/png");

            const a = document.createElement("a");
            const fechaActual = new Date().toISOString().split("T")[0];
            a.href = dataUrl;
            a.download = `Summary_${fechaActual}.png`;
            a.click();
        } catch (err) {
            console.error("Error exportando PNG: ", err);
            alert("Hubo un error al exportar como PNG.");
        } finally {
            if (btn) {
                btn.innerHTML = textOrig;
                btn.disabled = false;
            }
        }
    } else {
        alert("Las dependencias (html2canvas) no están disponibles.");
    }
};

// --- HOJA DE RUTA MÁGICA CON SUGERENCIAS ---

// Distancia Haversine (en km)
function calcularDistancia(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity;

    // Ensure coordinates are numbers
    lat1 = parseFloat(lat1);
    lon1 = parseFloat(lon1);
    lat2 = parseFloat(lat2);
    lon2 = parseFloat(lon2);

    if (isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)) return Infinity;

    const R = 6371; // Radio de la Tierra en km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// Calcular días hábiles (Lunes a Viernes) entre dos fechas
function getDiasHabiles(startDateStr, endDateStr) {
    const start = new Date(startDateStr);
    const end = new Date(endDateStr);
    let count = 0;
    let curDate = new Date(start.getTime());

    // Si start >= end, no hay días hábiles intermedios
    if (curDate >= end) return 0;

    // Empezamos a contar desde el día SIGUIENTE a start, hasta el día ANTERIOR a end
    curDate.setDate(curDate.getDate() + 1);

    // Ignorar si el fin es el mismo o anterior al inicio + 1 día
    while (curDate < end) {
        const dayOfWeek = curDate.getDay();
        const isWeekend = (dayOfWeek === 5) || (dayOfWeek === 0);
        if (!isWeekend) {
            count++;
        }
        curDate.setDate(curDate.getDate() + 1);
    }
    return count;
}

function normalizeStr(str) {
    if (!str) return "";
    return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

let hojaRutaLeafletMap = null;
let hojaRutaMarkers = [];
let proximityRecommendationMarkers = [];
let pasadasGlobal = [];
let roadmapAnimationState = {
    status: "stopped", // "playing", "paused", "stopped"
    currentIndex: 0,
    timeoutId: null
};
let roadmapWaypoints = [];

function drawProximityRecommendations() {
    if (!hojaRutaLeafletMap) return;

    // First, clear any existing recommendation markers
    proximityRecommendationMarkers.forEach(m => {
        if (hojaRutaLeafletMap.hasLayer(m)) {
            hojaRutaLeafletMap.removeLayer(m);
        }
    });
    proximityRecommendationMarkers = [];

    // Only show recommendations at zoom level 8 or higher
    if (hojaRutaLeafletMap.getZoom() < 8) {
        return;
    }

    const bounds = hojaRutaLeafletMap.getBounds();

    const recommendations = pasadasGlobal.filter(p => {
        if (!p.data.lat || !p.data.lng) return false;

        const latLng = L.latLng(p.data.lat, p.data.lng);
        if (!bounds.contains(latLng)) return false;

        // Exclude if it's part of the main roadmap
        const isWaypoint = roadmapWaypoints.some(wp =>
            wp.lat && wp.lng &&
            Math.abs(parseFloat(wp.lat) - parseFloat(p.data.lat)) < 0.0001 &&
            Math.abs(parseFloat(wp.lng) - parseFloat(p.data.lng)) < 0.0001
        );
        if (isWaypoint) return false;

        // Exclude if it's already being shown as a recommendation (unlikely but safe)
        const isAlreadyDrawn = proximityRecommendationMarkers.some(m => {
            const mLatLng = m.getLatLng();
            return Math.abs(mLatLng.lat - p.data.lat) < 0.0001 && Math.abs(mLatLng.lng - p.data.lng) < 0.0001;
        });
        if (isAlreadyDrawn) return false;

        return true;
    });

    // Limit number of recommendations to avoid clutter
    const limitedRecommendations = recommendations.slice(0, 30);

    const recommendationIcon = new L.Icon({
        iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    });

    limitedRecommendations.forEach(rec => {
        const marker = L.marker([rec.data.lat, rec.data.lng], { icon: recommendationIcon, zIndexOffset: 50, opacity: 0.8 });
        marker.bindPopup(`<b>Sugerencia por cercanía</b><br><b>Cliente:</b> ${rec.data.cliente}<br><b>Ciudad:</b> ${rec.data.ciudad}`);
        marker.addTo(hojaRutaLeafletMap);
        proximityRecommendationMarkers.push(marker);
    });
}

window.mostrarHojaRutaView = function () {
    document.getElementById("calendar-container").style.display = "none";
    document.getElementById("map-view").style.display = "none";
    document.getElementById("agenda-view").style.display = "none";

    const view = document.getElementById("hoja-ruta-view");
    if (view) view.style.display = "block";

    const tbody = document.getElementById("tablaHojaRutaCuerpo");
    tbody.innerHTML = "";

    // 1. Fechas relativas
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split("T")[0];

    // 1.5. Obtener Ubicación y Empresa Actual (activa hoy, o la última pasada)
    let actual = globalReservas.find(r => r.data.fechaInicio <= todayStr && r.data.fechaFin >= todayStr && !r.data.esEspecial);
    let esActivaHoy = true;

    if (!actual) {
        // Si no hay activa hoy, buscar la última reserva pasada (excluyendo especiales)
        const pasadasOrdenadas = globalReservas
            .filter(r => (r.data.fechaFin || r.data.fechaInicio || "") < todayStr && !r.data.esEspecial)
            .sort((a, b) => (b.data.fechaFin || b.data.fechaInicio || "").localeCompare(a.data.fechaFin || a.data.fechaInicio || ""));
        if (pasadasOrdenadas.length > 0) {
            actual = pasadasOrdenadas[0];
            esActivaHoy = false;
        }
    }

    // 2. Separar reservas pasadas y futuras (excluyendo eventos especiales)
    let futuras = globalReservas.filter(r => (r.data.fechaInicio || "") >= todayStr && !r.data.esEspecial);

    // Si actual es activa hoy, la excluimos de futuras para que no se duplique
    if (actual && esActivaHoy) {
        futuras = futuras.filter(r => r.id !== actual.id);
    }

    // Volver a ordenar futuras por cronología
    futuras.sort((a, b) => (a.data.fechaInicio > b.data.fechaInicio) ? 1 : ((b.data.fechaInicio > a.data.fechaInicio) ? -1 : 0));

    // Extraer clientes con reservas futuras para EXCLUIRLOS de las recomendaciones
    const clientesFuturos = new Set(futuras.map(r => normalizeStr(r.data.cliente)));
    if (actual) {
        clientesFuturos.add(normalizeStr(actual.data.cliente));
    }

    // Filtramos pasadas (usaremos TODAS de todos los años disponibles para mayor precisión en ubicaciones)
    const pasadasBase = globalReservas.filter(r => (r.data.fechaInicio || "") < todayStr);
    pasadasGlobal = pasadasBase.filter(r => !clientesFuturos.has(normalizeStr(r.data.cliente)) && !r.data.esEspecial);

    const pasadas = pasadasGlobal;

    if (futuras.length === 0 && !actual) {
        tbody.innerHTML = "<tr><td colspan=\"2\" style=\"text-align:center;\">No hay reservas para la Hoja de Ruta.</td></tr>";
        return;
    }

    // --- Helper function para buscar recomendaciones y crear la fila de Tiempo Muerto ---
    function agregarFilaTiempoMuerto(fechaIniStr, fechaFinStr, ref1, ref2, ciudadRef1, ciudadRef2) {
        let gapDays = 0;
        if (fechaFinStr) {
            gapDays = getDiasHabiles(fechaIniStr, fechaFinStr);
            if (gapDays <= 5) return;
        }

        const trG = document.createElement("tr");
        trG.className = "row-tiempo-muerto";

        const c1 = normalizeStr(ciudadRef1 || "");
        const c2 = normalizeStr(ciudadRef2 || "");

        // --- Column 1: Match Exacto (City) ---
        let matchExacto = pasadas.filter(p => {
            const ciudadP = normalizeStr(p.data.ciudad);
            return (c1 && ciudadP === c1) || (c2 && ciudadP === c2);
        });

        // --- Column 2: Match Cercano (Distance < 100km) ---
        let matchCercano = [];
        if (ref1 || ref2) {
            matchCercano = pasadas.filter(p => {
                // Evitamos duplicar si ya está en matchExacto
                if (matchExacto.some(m => m.id === p.id)) return false;

                const d1 = ref1 ? calcularDistancia(ref1.lat, ref1.lng, p.data.lat, p.data.lng) : Infinity;
                const d2 = ref2 ? calcularDistancia(ref2.lat, ref2.lng, p.data.lat, p.data.lng) : Infinity;
                return d1 <= 150 || d2 <= 150;
            });
        }

        // Helper to format suggestion items
        function renderSugs(list, type, color) {
            if (list.length === 0) return "<div class=\"recomendacion-list\"><small>No se encontraron.</small></div>";

            // Limit to 3 and unique by client
            const unique = new Map();
            list.forEach(p => {
                const n = normalizeStr(p.data.cliente);
                if (!unique.has(n)) unique.set(n, p);
            });
            const uniqueList = Array.from(unique.values()).slice(0, 25);

            let html = uniqueList.map(p => `
                <div class="sugerencia-item">🤝 ${p.data.cliente} (<i>${p.data.ciudad}</i>) <span class="${color}">${type}</span></div>
            `).join("");
            return `<div class="recomendacion-list">${html}</div>`;
        }

        const colCityHtml = renderSugs(matchExacto, "Exacto", "badge-exacto");
        const colNearHtml = renderSugs(matchCercano, "< 150km", "badge-cerca");

        let labelUbicacion = "";
        if (ciudadRef1 && ciudadRef2) labelUbicacion = `Entre ${ciudadRef1} y ${ciudadRef2}`;
        else if (ciudadRef1) labelUbicacion = `Desde ${ciudadRef1}`;
        else if (ciudadRef2) labelUbicacion = `Hacia ${ciudadRef2}`;

        const diasTexto = fechaFinStr ? `(${gapDays - 1} días hábiles)` : "(Posterior)";

        trG.innerHTML = `
            <td colspan="2">
                <span class="text-tiempo-muerto">⚠️ Espacio Disponible ${diasTexto}</span>
                <div style="font-size: 0.85em; color: #555;">${labelUbicacion}</div>
                
                <div class="sugerencias-columns">
                    <div class="sugerencias-col">
                        <h4>🏙️ Por Ciudades</h4>
                        ${colCityHtml}
                    </div>
                    <div class="sugerencias-col">
                        <h4>📍 Por Cercanía</h4>
                        ${colNearHtml}
                    </div>
                </div>
            </td>
        `;
        tbody.appendChild(trG);
    }

    // Renderizar Ubicación y Empresa Actual al inicio si existe
    if (actual) {
        const trAct = document.createElement("tr");
        trAct.className = "row-reserva";
        trAct.style.cssText = "background-color: rgba(40, 167, 69, 0.12) !important; border-left: 6px solid #28a745;";

        const strFechaInicio = formatearFecha(actual.data.fechaInicio);
        const strFechaFin = actual.data.fechaFin ? formatearFecha(actual.data.fechaFin) : strFechaInicio;

        let labelDetalle = "<span style=\"background-color: #28a745; color: white; padding: 2px 6px; border-radius: 4px; font-size: 0.75em; font-weight: bold; display: inline-block; margin-bottom: 5px;\">📍 UBICACIÓN Y EMPRESA ACTUAL</span><br>";
        labelDetalle += `<strong>👤 ${actual.data.cliente}</strong><br>📍 ${actual.data.ciudad}`;
        if (actual.data.direccion) labelDetalle += `<br><small>🗺️ ${actual.data.direccion}</small>`;

        trAct.innerHTML = `
            <td style="white-space: nowrap; font-weight: bold; color: #28a745;">
                ⚡ ${esActivaHoy ? "Activo Ahora" : "Último Servicio"}<br>
                <small style="color: var(--text-color-light); font-weight: normal;">${strFechaInicio} al ${strFechaFin}</small>
            </td>
            <td>${labelDetalle}</td>
        `;
        tbody.appendChild(trAct);
    }

    // 2.5. Evaluar gap inicial (Desde la ubicación actual / Hoy hasta la primera reserva)
    if (futuras.length > 0) {
        let fechaInicioGap = todayStr;
        let refInicioGap = null;
        let ciudadInicioGap = null;

        if (actual) {
            refInicioGap = actual.data;
            ciudadInicioGap = actual.data.ciudad;
            if (actual.data.fechaFin && actual.data.fechaFin > todayStr) {
                fechaInicioGap = actual.data.fechaFin;
            }
        }
        agregarFilaTiempoMuerto(fechaInicioGap, futuras[0].data.fechaInicio, refInicioGap, futuras[0].data, ciudadInicioGap, futuras[0].data.ciudad);
    }

    // 3. Evaluar e iterar Tiempos Muertos
    for (let i = 0; i < futuras.length; i++) {
        const r1 = futuras[i];

        // Renderizar Reserva actual
        const trR = document.createElement("tr");
        trR.className = "row-reserva";
        const strFechaInicio = formatearFecha(r1.data.fechaInicio);
        const strFechaFin = r1.data.fechaFin ? formatearFecha(r1.data.fechaFin) : strFechaInicio;

        let labelDetalle = `<strong>👤 ${r1.data.cliente}</strong><br>📍 ${r1.data.ciudad}`;
        if (r1.data.direccion) labelDetalle += `<br><small>🗺️ ${r1.data.direccion}</small>`;

        trR.innerHTML = `
            <td style="white-space: nowrap;">📅 ${strFechaInicio}<br><small>a ${strFechaFin}</small></td>
            <td>${labelDetalle}</td>
        `;
        tbody.appendChild(trR);

        // Si hay una siguiente reserva, evaluamos el gap incremental con la siguiente
        if (i < futuras.length - 1) {
            const r2 = futuras[i + 1];
            agregarFilaTiempoMuerto(r1.data.fechaFin || r1.data.fechaInicio, r2.data.fechaInicio, r1.data, r2.data, r1.data.ciudad, r2.data.ciudad);
        }
    }

    // 3.5. Evaluar recomendaciones después de la última reservación (Espacio Disponible Posterior)
    let ultimoR = null;
    if (futuras.length > 0) {
        ultimoR = futuras[futuras.length - 1];
    } else if (actual) {
        ultimoR = actual;
    }

    if (ultimoR) {
        agregarFilaTiempoMuerto(ultimoR.data.fechaFin || ultimoR.data.fechaInicio, null, ultimoR.data, null, ultimoR.data.ciudad, null);
    }

    // 4. Inicializar y pintar Mapa Leaflet del Roadmap
    setTimeout(() => {
        if (!hojaRutaLeafletMap) {
            hojaRutaLeafletMap = L.map("hojaRutaMap", {
                // dragging: false, // Re-enable for better UX
                zoomControl: true, // Re-enable for better UX
                scrollWheelZoom: true,
                doubleClickZoom: true,
                touchZoom: true,
                boxZoom: true,
                keyboard: true,
                renderer: L.canvas() // Forzar renderizado Canvas para compatibilidad con PDF
            }).setView([23.6345, -102.5528], 5);
            L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
                attribution: "© OpenStreetMap",
                crossOrigin: true
            }).addTo(hojaRutaLeafletMap);

            hojaRutaLeafletMap.on("zoomend", drawProximityRecommendations);
            hojaRutaLeafletMap.on("moveend", drawProximityRecommendations);
        } else {
            hojaRutaLeafletMap.invalidateSize();
        }

        // Populate waypoints for animation
        roadmapWaypoints = [];
        if (actual && actual.data.lat && actual.data.lng) {
            roadmapWaypoints.push({
                lat: actual.data.lat,
                lng: actual.data.lng,
                popup: `<b>📍 Ubicación y Empresa Actual</b><br><b>${actual.data.cliente}</b><br>${actual.data.ciudad}`,
                isCurrent: true
            });
        }
        futuras.forEach((r, idx) => {
            if (r.data.lat && r.data.lng) {
                roadmapWaypoints.push({
                    lat: r.data.lat,
                    lng: r.data.lng,
                    popup: `<b>${idx + 1}. ${r.data.cliente}</b><br>${r.data.ciudad}<br>${formatearFecha(r.data.fechaInicio)}`,
                    isCurrent: false
                });
            }
        });

        // Initial static drawing
        resetRoadmapAnimation();

    }, 300);
};

function drawStaticRoadmap() {
    if (!hojaRutaLeafletMap) return;

    // Clear previous items
    hojaRutaMarkers.forEach(m => hojaRutaLeafletMap.removeLayer(m));
    hojaRutaMarkers = [];

    const navLatlngs = roadmapWaypoints.map(wp => [wp.lat, wp.lng]);

    roadmapWaypoints.forEach((waypoint, idx) => {
        let icon;
        if (waypoint.isCurrent) {
            icon = L.divIcon({
                className: "numbered-pin",
                html: "<div class=\"pin-container actual\"><span class=\"pin-number\" style=\"color: white;\">📍</span></div>",
                iconSize: [30, 42],
                iconAnchor: [15, 30]
            });
        } else {
            const futureIndex = roadmapWaypoints.findIndex(wp => !wp.isCurrent);
            const displayIndex = idx - futureIndex + 1;
            icon = L.divIcon({
                className: "numbered-pin",
                html: `<div class="pin-container"><span class="pin-number">${displayIndex}</span></div>`,
                iconSize: [30, 42],
                iconAnchor: [15, 30]
            });
        }

        const marker = L.marker([waypoint.lat, waypoint.lng], { icon: icon }).addTo(hojaRutaLeafletMap);
        marker.bindPopup(waypoint.popup);
        hojaRutaMarkers.push(marker);
    });

    if (navLatlngs.length > 1) {
        const polyline = L.polyline(navLatlngs, { color: "#ffc107", weight: 4, dashArray: "10, 10" }).addTo(hojaRutaLeafletMap);
        hojaRutaMarkers.push(polyline);
        hojaRutaLeafletMap.fitBounds(polyline.getBounds(), { padding: [30, 30] });
    } else if (navLatlngs.length === 1) {
        hojaRutaLeafletMap.flyTo(navLatlngs[0], 10);
    }
}

window.playRoadmapAnimation = function () {
    const btnPlay = document.getElementById("playRoadmapAnimation");
    const btnPause = document.getElementById("pauseRoadmapAnimation");
    const btnReset = document.getElementById("resetRoadmapAnimation");

    if (roadmapAnimationState.status === "paused") {
        roadmapAnimationState.status = "playing";
        if (btnPause) btnPause.innerHTML = "⏸️ Pausar";
        animateNextStep(); // Resume from current index
    } else {
        roadmapAnimationState.status = "playing";
        roadmapAnimationState.currentIndex = 0;
        if (btnPlay) btnPlay.style.display = "none";
        if (btnPause) btnPause.style.display = "inline-block";
        if (btnReset) btnReset.style.display = "inline-block";
        if (btnPause) btnPause.innerHTML = "⏸️ Pausar";

        hojaRutaMarkers.forEach(m => hojaRutaLeafletMap.removeLayer(m));
        hojaRutaMarkers = [];
        hojaRutaLeafletMap.closePopup();

        animateNextStep();
    }
};

window.pauseRoadmapAnimation = function () {
    const btnPause = document.getElementById("pauseRoadmapAnimation");

    if (roadmapAnimationState.status === "playing") {
        roadmapAnimationState.status = "paused";
        clearTimeout(roadmapAnimationState.timeoutId);
        if (btnPause) btnPause.innerHTML = "▶️ Reanudar";
    } else if (roadmapAnimationState.status === "paused") {
        playRoadmapAnimation(); // Simply resume
    }
};

window.resetRoadmapAnimation = function () {
    const btnPlay = document.getElementById("playRoadmapAnimation");
    const btnPause = document.getElementById("pauseRoadmapAnimation");
    const btnReset = document.getElementById("resetRoadmapAnimation");

    roadmapAnimationState.status = "stopped";
    roadmapAnimationState.currentIndex = 0;
    clearTimeout(roadmapAnimationState.timeoutId);

    if (btnPlay) btnPlay.style.display = "inline-block";
    if (btnPause) btnPause.style.display = "none";
    if (btnReset) btnReset.style.display = "none";

    drawStaticRoadmap();
};

function animateNextStep() {
    if (roadmapAnimationState.status !== "playing" || roadmapWaypoints.length === 0) {
        return;
    }

    const index = roadmapAnimationState.currentIndex;
    if (index >= roadmapWaypoints.length) {
        resetRoadmapAnimation();
        return;
    }

    const waypoint = roadmapWaypoints[index];
    const latLng = [waypoint.lat, waypoint.lng];

    hojaRutaLeafletMap.flyTo(latLng, 12, { duration: 2 });

    hojaRutaLeafletMap.once("moveend", () => {
        if (roadmapAnimationState.status !== "playing") return;

        // Add polyline segment from previous point
        if (index > 0) {
            const prevWaypoint = roadmapWaypoints[index - 1];
            const segment = L.polyline([[prevWaypoint.lat, prevWaypoint.lng], latLng], { color: "#ffc107", weight: 4 }).addTo(hojaRutaLeafletMap);
            hojaRutaMarkers.push(segment);
        }

        let icon;
        if (waypoint.isCurrent) {
            icon = L.divIcon({
                className: "numbered-pin",
                html: "<div class=\"pin-container actual\"><span class=\"pin-number\" style=\"color: white;\">📍</span></div>",
                iconSize: [30, 42],
                iconAnchor: [15, 30]
            });
        } else {
            const futureIndex = roadmapWaypoints.findIndex(wp => !wp.isCurrent);
            const displayIndex = index - futureIndex + 1;
            icon = L.divIcon({
                className: "numbered-pin",
                html: `<div class="pin-container"><span class="pin-number">${displayIndex}</span></div>`,
                iconSize: [30, 42],
                iconAnchor: [15, 30]
            });
        }

        const marker = L.marker(latLng, { icon: icon }).addTo(hojaRutaLeafletMap);
        marker.bindPopup(waypoint.popup).openPopup();
        hojaRutaMarkers.push(marker);

        roadmapAnimationState.currentIndex++;
        roadmapAnimationState.timeoutId = setTimeout(animateNextStep, 3000);
    });
}

// --- EXPORTACIÓN DE HOJA DE RUTA A PDF ---
window.exportarHojaRutaPDF = async function () {
    const elemento = document.getElementById("contenidoHojaRuta");
    const btn = document.getElementById("btnExportRoadmap");

    if (!elemento) return;

    const textOrig = btn.innerHTML;
    btn.innerHTML = "<span class=\"loader\" style=\"width:16px;height:16px;margin-right:8px;border-width:2px;vertical-align:middle;display:inline-block; border-top-color: white;\"></span> Generando PDF...";
    btn.disabled = true;

    // --- ESTRATEGIA DE CONTENIDO PURO ---
    // Para evitar CUALQUIER espacio en blanco o rastro del mapa, 
    // creamos un contenedor virtual nuevo con solo lo que queremos exportar.
    const exportContainer = document.createElement("div");
    exportContainer.style.cssText = "width: 100%; height: auto !important; background: transparent !important; padding: 0 !important; margin: 0 !important; overflow: visible !important;";

    // 1. Insertar Título profesional
    const tituloPDF = document.createElement("h1");
    tituloPDF.innerText = "Roadmap TrackSIM";
    tituloPDF.style.cssText = "text-align: center; margin-bottom: 30px; font-size: 22pt; color: #000000; font-family: 'Montserrat', sans-serif; background: transparent !important;";
    exportContainer.appendChild(tituloPDF);

    // 2. Clonar SOLO el contenedor de la tabla (itinerario)
    // Ignoramos el mapa y cualquier otro hermano
    const tableContainer = elemento.querySelector(".hoja-ruta-container");
    if (tableContainer) {
        const tableClone = tableContainer.cloneNode(true);
        // Limpieza de estilos del clon
        tableClone.style.cssText = "width: 100%; background: transparent !important; border: none !important; margin: 0 !important; padding: 0 !important;";

        // Forzar Montserrat y negro en todo el contenido de la tabla
        tableClone.querySelectorAll("*").forEach(el => {
            el.style.setProperty("color", "#000000", "important");
            el.style.setProperty("background", "transparent", "important");
            el.style.setProperty("background-color", "transparent", "important");
            el.style.setProperty("font-family", "'Montserrat', sans-serif", "important");
            el.style.setProperty("box-shadow", "none", "important");
        });
        exportContainer.appendChild(tableClone);
    }

    const opt = {
        margin: [100, 40, 60, 40], // [top, left, bottom, right] pt
        filename: "temp.pdf",
        image: { type: "png", quality: 0.98 },
        html2canvas: {
            scale: 2,
            useCORS: true,
            backgroundColor: null,
            logging: false
        },
        jsPDF: { unit: "pt", format: "letter", orientation: "portrait" },
        pagebreak: { mode: "css" }
    };

    try {
        await new Promise(resolve => setTimeout(resolve, 200));

        // 1. Generar el PDF usando el contenedor "puro"
        const contentPdfBuffer = await html2pdf().from(exportContainer).set(opt).output("arraybuffer");

        // 2. Cargar la plantilla y el contenido con pdf-lib
        // Usamos PDFDocument importado
        const contentDoc = await PDFDocument.load(contentPdfBuffer);

        const respTemplate = await fetch("template/TrackSIM Membretada.pdf");
        if (!respTemplate.ok) throw new Error("Plantilla no encontrada");
        const templateBytes = await respTemplate.arrayBuffer();
        const templateDoc = await PDFDocument.load(templateBytes);
        const [templatePageSource] = templateDoc.getPages();

        // 3. Crear el documento final mezclando ambos
        const finalDoc = await PDFDocument.create();
        const contentPages = await finalDoc.copyPages(contentDoc, contentDoc.getPageIndices());

        for (const contentPage of contentPages) {
            // Agregar una página basada en la plantilla
            const [newTemplatePage] = await finalDoc.copyPages(templateDoc, [0]);
            finalDoc.addPage(newTemplatePage);
            const { width, height } = newTemplatePage.getSize();

            // Embeber la página de contenido sobre la plantilla
            const embeddedContentPage = await finalDoc.embedPage(contentPage);
            newTemplatePage.drawPage(embeddedContentPage, {
                x: 0,
                y: 0,
                width: width,
                height: height
            });
        }

        // 4. Guardar y descargar
        const pdfBytes = await finalDoc.save();
        const blob = new Blob([pdfBytes], { type: "application/pdf" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `Roadmap_TrackSIM_${new Date().toISOString().split("T")[0]}.pdf`;
        link.click();

    } catch (e) {
        console.error(e);
        alert("Error al generar PDF: " + e.message);
    } finally {
        btn.innerHTML = textOrig;
        btn.disabled = false;
    }
};

// --- EXPORTACIÓN DE HOJA DE RUTA A PNG ---
window.exportarHojaRutaPNG = async function () {
    const elemento = document.getElementById("contenidoHojaRuta");
    const btn = document.getElementById("btnExportRoadmapPNG");

    if (!elemento) return;

    if (typeof html2canvas !== "undefined") {
        const textOrig = btn.innerHTML;
        btn.innerHTML = "<span class=\"loader\" style=\"width:16px;height:16px;margin-right:8px;border-width:2px;vertical-align:middle;display:inline-block; border-top-color: white;\"></span> Creando PNG...";
        btn.disabled = true;

        // Crear contenedor virtual para exportar el contenido puro sin el mapa
        const exportContainer = document.createElement("div");
        exportContainer.style.cssText = "position: absolute; left: -9999px; top: 0; width: 800px; height: auto; background: transparent !important; padding: 20px !important; margin: 0 !important; overflow: visible !important;";

        // 1. Insertar Título
        const titulo = document.createElement("h1");
        titulo.innerText = "Roadmap TrackSIM";
        titulo.style.cssText = "text-align: center; margin-bottom: 30px; font-size: 22pt; color: #000000; font-family: 'Montserrat', sans-serif; background: transparent !important;";
        exportContainer.appendChild(titulo);

        // 2. Clonar SOLO el contenedor de la tabla
        const tableContainer = elemento.querySelector(".hoja-ruta-container");
        if (tableContainer) {
            const tableClone = tableContainer.cloneNode(true);
            tableClone.style.cssText = "width: 100%; background: transparent !important; border: none !important; margin: 0 !important; padding: 0 !important;";
            tableClone.querySelectorAll("*").forEach(el => {
                el.style.setProperty("color", "#000000", "important");
                el.style.setProperty("background", "transparent", "important");
                el.style.setProperty("background-color", "transparent", "important");
                el.style.setProperty("font-family", "'Montserrat', sans-serif", "important");
                el.style.setProperty("box-shadow", "none", "important");
            });
            exportContainer.appendChild(tableClone);
        }

        // Es vital agregarlo al DOM para que html2canvas lo dibuje correctamente
        document.body.appendChild(exportContainer);

        try {
            await new Promise(resolve => setTimeout(resolve, 200));
            const canvas = await html2canvas(exportContainer, {
                scale: 2,
                backgroundColor: null, // Mantener alfa
                logging: false,
                useCORS: true
            });

            // Limpieza inmediata del DOM
            document.body.removeChild(exportContainer);

            // Crear el canvas definitivo para la marca de agua
            const finalCanvas = document.createElement("canvas");
            finalCanvas.width = canvas.width;
            finalCanvas.height = canvas.height;
            const ctx = finalCanvas.getContext("2d");

            // Dibujar la marca de agua primero
            const img = new Image();
            img.src = "icon-512.png";
            img.crossOrigin = "Anonymous";
            await new Promise((resolve) => {
                img.onload = resolve;
                img.onerror = resolve; // Ignorar fallo silenciosamente
            });

            if (img.complete && img.naturalWidth > 0) {
                const sizeW = Math.min(canvas.width, canvas.height) * 0.7;
                const sizeH = sizeW; // Asume imagen cuadrada
                const x = (canvas.width - sizeW) / 2;
                const y = (canvas.height - sizeH) / 2;
                ctx.globalAlpha = 0.10; // Opacidad reducida
                ctx.drawImage(img, x, y, sizeW, sizeH);
                ctx.globalAlpha = 1.0;
            }

            // Encimar el texto renderizado
            ctx.drawImage(canvas, 0, 0);

            // Descargar el PNG
            const dataUrl = finalCanvas.toDataURL("image/png");
            const a = document.createElement("a");
            a.href = dataUrl;
            a.download = `Roadmap_TrackSIM_${new Date().toISOString().split("T")[0]}.png`;
            a.click();

        } catch (err) {
            console.error("Error al generar PNG de Roadmap:", err);
            alert("Error al generar la imagen PNG.");
            if (document.body.contains(exportContainer)) {
                document.body.removeChild(exportContainer);
            }
        } finally {
            btn.innerHTML = textOrig;
            btn.disabled = false;
        }
    } else {
        alert("Librerías de captura (html2canvas) no cargadas.");
    }
};
