import { describe, it, expect } from "vitest";
import { formatearFecha } from "./utils";

describe("formatearFecha", () => {
    it("debería formatear correctamente una fecha YYYY-MM-DD", () => {
        expect(formatearFecha("2024-04-28")).toBe("28 Abr 2024");
    });

    it("debería manejar correctamente meses de un solo dígito", () => {
        expect(formatearFecha("2024-01-05")).toBe("5 Ene 2024");
    });

    it("debería retornar string vacío si no hay fecha", () => {
        expect(formatearFecha("")).toBe("");
        expect(formatearFecha(null)).toBe("");
    });
});
