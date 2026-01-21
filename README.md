# 🏎️ Agenda TrackSIM - Web App

![TrackSIM Logo](public/TrackSIM%20LOGO%20GIF.gif)

**Agenda TrackSIM** es una Aplicación Web Progresiva (PWA) diseñada para la gestión logística, planificación de itinerarios y seguimiento de servicios de simuladores de manejo. Permite visualizar reservas tanto en un calendario interactivo como en un mapa georreferenciado, facilitando la administración de rutas y clientes.

## 📋 Características Principales

* **📅 Calendario Interactivo:**
    * Vista anual y mensual utilizando *FullCalendar*.
    * Identificación visual de eventos pasados, presentes y futuros.
* **🗺️ Mapa de Itinerarios (Geolocalización):**
    * Integración con **Leaflet** y **HERE Maps API**.
    * Marcadores agrupados por ciudad y prioridad (Verde: Hoy, Dorado: Próximo, Azul: Futuro, Gris: Pasado).
    * Cálculo automático de rutas y tiempos entre servicios.
* **☁️ Backend en Firebase:**
    * Base de datos en tiempo real con **Firestore**.
    * Hospedaje seguro mediante **Firebase Hosting**.
* **📥 Importación Masiva:**
    * Soporte para carga de archivos Excel (`.xlsx`, `.xls`) mediante *SheetJS*.
    * **Geocodificación Automática:** Si el Excel no tiene coordenadas, la app busca la dirección automáticamente usando la API de HERE Maps.
* **📱 PWA (Progressive Web App):**
    * Diseño *Responsive* (Móvil/Escritorio).
    * Instalable en dispositivos móviles (Android/iOS) gracias al `manifest.json`.
* **🔐 Modo Administrador:**
    * Gestión CRUD (Crear, Leer, Actualizar, Borrar) de reservas.
    * Enlace de documentación (PDFs en Google Drive) a las reservas.
* **⚙️ Automatización (CI/CD):**
    * Actualización automática de versión y fecha de despliegue mediante GitHub Actions.

## 🛠️ Tecnologías Utilizadas

* **Frontend:** HTML5, CSS3, JavaScript (ES6 Modules).
* **Mapas:** Leaflet.js, HERE Maps API.
* **Calendario:** FullCalendar v6.
* **Datos y Hosting:** Google Firebase (Firestore, Hosting, Auth).
* **Utilidades:** SheetJS (Excel), Node.js (Script de versionado).

## 🚀 Instalación y Ejecución Local

Para probar la aplicación en tu máquina local, es **muy recomendable** usar un servidor HTTPS para asegurar que todas las funcionalidades de la PWA (como notificaciones y Service Workers) operen correctamente.

1.  **Clonar el repositorio:**
    ```bash
    git clone <URL_DEL_REPOSITORIO>
    cd mi-agenda-web
    ```

2.  **Instalar dependencias de Python:**
    El servidor de desarrollo local requiere la librería `cryptography` para generar certificados SSL.
    ```bash
    pip install cryptography
    ```

3.  **Ejecutar el servidor HTTPS local:**
    El proyecto incluye un script `server.py` listo para usar.
    ```bash
    python server.py
    ```
    La primera vez que lo ejecutes, creará los archivos `cert.pem` y `key.pem`.

4.  **Acceder a la aplicación:**
    Abre tu navegador y ve a **`https://localhost:8000`**.
    *   Tu navegador mostrará una advertencia de seguridad porque el certificado es autofirmado. Debes aceptarla para continuar (generalmente en "Avanzado" > "Continuar a localhost").

### Alternativa (Despliegue con Firebase)
Si prefieres usar el ecosistema de Firebase para el desarrollo:
1.  Instala las herramientas de Firebase: `npm install -g firebase-tools`
2.  Inicia sesión: `firebase login`
3.  Ejecuta el emulador: `firebase serve`

## 🔄 Despliegue Automático (CI/CD)

El proyecto cuenta con flujos de trabajo de GitHub Actions configurados en `.github/workflows`:

1.  **Pull Request (`firebase-hosting-pull-request.yml`):**
    * Al crear un PR, se genera una URL de previsualización temporal en Firebase para probar los cambios.
2.  **Merge a Main (`firebase-hosting-merge.yml`):**
    * Al hacer push o merge a la rama `main`:
        1.  Se ejecuta el script `node update-version.js`.
        2.  Este script actualiza automáticamente la versión y la fecha (Zona horaria CDMX) en `public/index.html` y genera `version.json`.
        3.  Se despliega la versión productiva a Firebase Hosting (`channelId: live`).

## 📂 Estructura del Proyecto

```text
/
├── .github/workflows/   # Scripts de despliegue automático (GitHub Actions)
├── public/              # Archivos públicos estáticos
│   ├── index.html       # Lógica principal de la aplicación (JS embebido)
│   ├── 404.html         # Página de error
│   ├── manifest.json    # Configuración PWA
│   ├── favicon.ico      # Iconos
│   └── ...
├── update-version.js    # Script Node.js para auto-versionado
├── firebase.json        # Configuración de hosting y headers
├── .firebaserc          # Configuración del proyecto Firebase
└── .gitignore           # Archivos ignorados por Git