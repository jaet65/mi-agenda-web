# 🏎️ Agenda TrackSIM - Web App

![TrackSIM Logo](public/TrackSIM%20LOGO%20GIF.gif)

**Agenda TrackSIM** es una Aplicación Web Progresiva (PWA) diseñada para la gestión logística, planificación de itinerarios y seguimiento de servicios de simuladores de manejo. Permite visualizar reservas tanto en un calendario interactivo como en un mapa georreferenciado, facilitando la administración de rutas y clientes.

## 📋 Características Principales

* **📅 Calendario Interactivo:**
    * Vista anual y mensual utilizando **FullCalendar v6**.
    * Identificación visual de eventos pasados, presentes y futuros.
* **🗺️ Mapa de Itinerarios (Geolocalización):**
    * Integración con **Leaflet** y **HERE Maps API**.
    * Marcadores agrupados por ciudad y prioridad (Verde: Hoy, Dorado: Próximo, Azul: Futuro, Gris: Pasado).
    * Cálculo automático de rutas y tiempos entre servicios.
* **☁️ Backend en Firebase:**
    * Base de datos en tiempo real con **Firestore**.
    * Autenticación de administradores.
* **📥 Importación Masiva:**
    * Soporte para carga de archivos Excel (`.xlsx`, `.xls`) mediante **SheetJS**.
    * **Geocodificación Automática:** Si el Excel no tiene coordenadas, la app busca la dirección automáticamente usando la API de HERE Maps.
* **📱 PWA (Progressive Web App):**
    * Diseño *Responsive* (Móvil/Escritorio).
    * Instalable en dispositivos móviles y funcionamiento offline parcial mediante **Service Workers**.
* **🔐 Modo Administrador:**
    * Gestión CRUD (Crear, Leer, Actualizar, Borrar) de reservas.
    * Enlace de documentación (PDFs en Google Drive) a las reservas.

## 🛠️ Tecnologías Utilizadas

* **Frontend:** HTML5, CSS3 (Vanilla), JavaScript (ES6+).
* **Entorno de Desarrollo:** [Vite](https://vitejs.dev/) (Node.js).
* **Mapas:** Leaflet.js, HERE Maps API.
* **Calendario:** FullCalendar v6.
* **Datos y Hosting:** Google Firebase (Firestore, Hosting, Auth).
* **Utilidades:** SheetJS (Excel), html2pdf.js, pdf-lib, html2canvas.

## 🚀 Instalación y Ejecución Local

Para ejecutar este proyecto localmente, necesitas tener instalado [Node.js](https://nodejs.org/).

1.  **Clonar el repositorio:**
    ```bash
    git clone <URL_DEL_REPOSITORIO>
    cd mi-agenda-web
    ```

2.  **Instalar dependencias:**
    ```bash
    npm install
    ```

3.  **Ejecutar el servidor de desarrollo:**
    ```bash
    npm run dev
    ```
    La aplicación estará disponible en `http://localhost:5173`.

4.  **Construir para producción:**
    ```bash
    npm run build
    ```
    Esto generará la carpeta `dist/` con los archivos optimizados.

## 🔄 Despliegue Automático (CI/CD)

El proyecto cuenta con flujos de trabajo de GitHub Actions:

1.  **Pull Request:** Genera una URL de previsualización temporal en Firebase.
2.  **Merge a Main:**
    * Ejecuta el script de versionado.
    * Despliega la versión productiva a Firebase Hosting.

## 📂 Estructura del Proyecto

```text
/
├── src/                 # Código fuente
│   ├── js/              # Lógica principal (app.js, config)
│   └── css/             # Estilos de la aplicación
├── public/              # Assets estáticos (imágenes, manifest, sw.js)
├── index.html           # Punto de entrada principal (raíz)
├── vite.config.js       # Configuración de Vite
├── package.json         # Dependencias y scripts de NPM
├── firebase.json        # Configuración de hosting
└── ...
```