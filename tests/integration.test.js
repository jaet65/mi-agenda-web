import { describe, it, expect, vi, beforeEach } from "vitest";
import fs from "fs";
import path from "path";

// Mocks de todas las dependencias externas
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

describe("Smoke Test - Integración de Funcionalidades", () => {
    beforeEach(() => {
        // Cargar el HTML en el DOM de prueba
        const html = fs.readFileSync(path.resolve(__dirname, "../index.html"), "utf8");
        document.documentElement.innerHTML = html;
        
        // Mock de variables globales que app.js podría esperar
        global.localStorage = {
            getItem: vi.fn(),
            setItem: vi.fn(),
            removeItem: vi.fn(),
            clear: vi.fn()
        };
    });

    it("debería cargar el DOM correctamente", () => {
        expect(document.getElementById("loading-overlay")).not.toBeNull();
        expect(document.querySelector(".header h1").textContent).toContain("Agenda TrackSIM");
    });

    it("debería tener los elementos de navegación", () => {
        expect(document.getElementById("mobile-menu")).not.toBeNull();
        expect(document.getElementById("mobile-btn-map")).not.toBeNull();
        expect(document.getElementById("mobile-btn-login")).not.toBeNull();
    });

    it("debería tener el contenedor del calendario y el mapa", () => {
        expect(document.getElementById("calendar")).not.toBeNull();
        expect(document.getElementById("map-canvas")).not.toBeNull();
    });

    it("debería tener los modales listos", () => {
        expect(document.getElementById("reservaModal")).not.toBeNull();
        expect(document.getElementById("detalleModal")).not.toBeNull();
        expect(document.getElementById("reporteModal")).not.toBeNull();
    });

    it("el buscador global debería estar presente", () => {
        const searchInput = document.getElementById("globalSearch");
        expect(searchInput).not.toBeNull();
        expect(searchInput.placeholder).toBe("🔍 Buscar...");
    });
});
