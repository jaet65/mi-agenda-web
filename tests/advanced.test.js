import { describe, it, expect, vi, beforeEach } from "vitest";
import fs from "fs";
import path from "path";

// Mocks exhaustivos para evitar errores de importación en app.js
vi.mock("firebase/app", () => ({ initializeApp: vi.fn() }));
vi.mock("firebase/firestore", () => ({
    getFirestore: vi.fn(),
    collection: vi.fn(),
    addDoc: vi.fn(),
    getDocs: vi.fn(),
    deleteDoc: vi.fn(),
    doc: vi.fn(),
    query: vi.fn(),
    where: vi.fn(),
    writeBatch: vi.fn(),
    updateDoc: vi.fn(),
    setDoc: vi.fn()
}));
vi.mock("firebase/auth", () => ({
    getAuth: vi.fn(),
    GoogleAuthProvider: vi.fn(),
    signInWithPopup: vi.fn(),
    signOut: vi.fn(),
    onAuthStateChanged: vi.fn()
}));
vi.mock("leaflet", () => ({
    map: vi.fn().mockImplementation(function() {
        return { setView: vi.fn(), addTo: vi.fn(), removeLayer: vi.fn() };
    }),
    tileLayer: vi.fn().mockImplementation(function() {
        return { addTo: vi.fn() };
    }),
    Icon: vi.fn().mockImplementation(function() {
        return {};
    }),
    marker: vi.fn().mockImplementation(function() {
        return { addTo: vi.fn(), bindPopup: vi.fn() };
    })
}));
vi.mock("fullcalendar", () => ({
    Calendar: vi.fn().mockImplementation(function() {
        return { render: vi.fn(), setOption: vi.fn(), getOption: vi.fn(), getEventById: vi.fn(), gotoDate: vi.fn() };
    })
}));
vi.mock("@fullcalendar/multimonth", () => ({ default: {} }));
vi.mock("xlsx", () => ({ read: vi.fn(), utils: { sheet_to_json: vi.fn() } }));
vi.mock("html2canvas", () => ({ default: vi.fn() }));
vi.mock("html2pdf.js", () => ({ default: vi.fn() }));
vi.mock("pdf-lib", () => ({ PDFDocument: { create: vi.fn() } }));

describe("Pruebas Avanzadas - Interacción y Lógica", () => {
    beforeEach(async () => {
        // Limpiar mocks y módulos
        vi.resetModules();
        vi.clearAllMocks();

        // 1. Configurar el DOM antes de cargar el script
        const html = fs.readFileSync(path.resolve(__dirname, "../index.html"), "utf8");
        document.documentElement.innerHTML = html;

        // 2. Mock de funciones globales
        global.alert = vi.fn();
        global.fetch = vi.fn();
        global.localStorage = {
            getItem: vi.fn(() => null),
            setItem: vi.fn(),
            removeItem: vi.fn(),
            clear: vi.fn()
        };

        // 3. Mock de matchMedia (requerido por algunas librerías)
        Object.defineProperty(window, "matchMedia", {
            writable: true,
            value: vi.fn().mockImplementation(query => ({
                matches: false,
                media: query,
                onchange: null,
                addListener: vi.fn(),
                removeListener: vi.fn(),
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
                dispatchEvent: vi.fn(),
            })),
        });

        // 4. Importar app.js
        await import("../src/js/app.js");
        
        // Disparar DOMContentLoaded manualmente para activar los listeners iniciales
        document.dispatchEvent(new Event("DOMContentLoaded"));
    });

    it("debería abrir y cerrar el menú móvil al hacer clic", () => {
        const menu = document.getElementById("mobile-menu");
        
        // Buscamos el botón de hamburguesa. En index.html está definido con onclick="toggleMenu()"
        // pero app.js también podría registrar listeners.
        // Como toggleMenu está en el scope global (window.toggleMenu), lo probamos directamente.
        
        expect(menu.classList.contains("open")).toBe(false);

        window.toggleMenu();
        expect(menu.classList.contains("open")).toBe(true);

        window.toggleMenu();
        expect(menu.classList.contains("open")).toBe(false);
    });

    it("guardarReserva debería validar campos obligatorios", async () => {
        // Aseguramos que los campos están vacíos
        document.getElementById("nombreInput").value = "";
        document.getElementById("fechaInicio").value = "";

        // Llamamos a la función global
        await window.guardarReserva();

        // Verificamos que se alertó al usuario
        expect(global.alert).toHaveBeenCalledWith(expect.stringContaining("Faltan datos obligatorios"));
    });

    it("el buscador debería limpiar resultados si el texto es muy corto", async () => {
        const searchInput = document.getElementById("globalSearch");
        const resultsList = document.getElementById("globalSearchResults");

        // Simulamos entrada de un solo carácter
        searchInput.value = "A";
        searchInput.dispatchEvent(new Event("input"));

        // Según app.js: if (texto.length < 2) { resultsList.style.display = "none"; return; }
        expect(resultsList.style.display).toBe("none");
        expect(resultsList.innerHTML).toBe("");
    });

    it("debería contener los elementos de costo y estado de facturación en el modal de detalles", () => {
        expect(document.getElementById("seccionAdminFinanzas")).not.toBeNull();
        expect(document.getElementById("detCostoInput")).not.toBeNull();
        expect(document.getElementById("tristateCheckboxContainer")).not.toBeNull();
        expect(document.getElementById("tristateBox")).not.toBeNull();
        expect(document.getElementById("tristateStatusBadge")).not.toBeNull();
        expect(document.getElementById("btnGuardarFinanzas")).not.toBeNull();
    });

    it("las pills de facturación deben marcarse según Sin facturar o Facturada", () => {
        const pillSin = document.getElementById("pillSinFacturar");
        const pillFac = document.getElementById("pillFacturada");

        window.seleccionarEstadoFactura("Facturada");
        expect(pillFac.classList.contains("active")).toBe(true);
        expect(pillSin.classList.contains("active")).toBe(false);

        window.seleccionarEstadoFactura("Sin facturar");
        expect(pillSin.classList.contains("active")).toBe(true);
        expect(pillFac.classList.contains("active")).toBe(false);
    });

    it("el reporte ejecutivo debe renderizar la columna Facturado", () => {
        window.generarReporte();
        const tbody = document.getElementById("tablaReporteCuerpo");
        expect(tbody.querySelector("td")).not.toBeNull();
    });
});

