import http.server
import ssl
import os
import datetime

# --- Dependencia para generar certificados ---
try:
    from cryptography import x509
    from cryptography.x509.oid import NameOID
    from cryptography.hazmat.primitives import hashes, serialization
    from cryptography.hazmat.primitives.asymmetric import rsa
except ImportError:
    print("─" * 60)
    print("⚠️  Dependencia 'cryptography' no encontrada.")
    print("   Se necesita para generar el certificado SSL automáticamente.")
    print("\n   Por favor, instálala ejecutando el siguiente comando:")
    print("   pip install cryptography")
    print("─" * 60)
    exit(1)

# --- Configuración ---
# Puerto donde se ejecutará el servidor HTTPS
PORT = 8000
# Directorio que contiene los archivos web (donde está tu index.html)
WEB_DIRECTORY = "public"
# Nombres para los archivos de certificado y clave
CERT_FILE = "cert.pem"
KEY_FILE = "key.pem"
# -------------------

def generar_certificado_si_no_existe():
    """Verifica si los archivos de certificado existen y, si no, los crea."""
    if os.path.exists(CERT_FILE) and os.path.exists(KEY_FILE):
        return # Los archivos ya existen, no se hace nada.

    print("🔐 No se encontraron certificados SSL. Generando unos nuevos...")

    # 1. Generar clave privada
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)

    # 2. Crear el sujeto del certificado (información básica)
    subject = issuer = x509.Name([
        x509.NameAttribute(NameOID.COUNTRY_NAME, u"MX"),
        x509.NameAttribute(NameOID.STATE_OR_PROVINCE_NAME, u"Local"),
        x509.NameAttribute(NameOID.LOCALITY_NAME, u"Development"),
        x509.NameAttribute(NameOID.ORGANIZATION_NAME, u"Local Dev Server"),
        x509.NameAttribute(NameOID.COMMON_NAME, u"localhost"),
    ])

    # 3. Construir el certificado
    cert = x509.CertificateBuilder().subject_name(
        subject
    ).issuer_name(
        issuer
    ).public_key(
        private_key.public_key()
    ).serial_number(
        x509.random_serial_number()
    ).not_valid_before(
        datetime.datetime.now(datetime.timezone.utc)
    ).not_valid_after(
        datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=365)
    ).add_extension(
        x509.SubjectAlternativeName([x509.DNSName(u"localhost")]),
        critical=False,
    ).sign(private_key, hashes.SHA256())

    # 4. Guardar la clave y el certificado en archivos .pem
    with open(KEY_FILE, "wb") as f:
        f.write(private_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.TraditionalOpenSSL,
            encryption_algorithm=serialization.NoEncryption(),
        ))
    with open(CERT_FILE, "wb") as f:
        f.write(cert.public_bytes(serialization.Encoding.PEM))
    
    print(f"✅ Certificados '{KEY_FILE}' y '{CERT_FILE}' creados con éxito.")


# --- Inicio del Servidor ---

generar_certificado_si_no_existe()

print(f"🚀 Iniciando servidor de desarrollo seguro en https://localhost:{PORT}")
print("Recuerda que tu navegador mostrará una advertencia de seguridad.")
print("Debes aceptarla para continuar (ej: 'Avanzado' -> 'Continuar a localhost').")

# Creamos un manejador de solicitudes que opera desde el subdirectorio 'public'
class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=WEB_DIRECTORY, **kwargs)

# Creamos el servidor HTTP estándar
server_address = ('0.0.0.0', PORT)
httpd = http.server.HTTPServer(server_address, Handler)

# --- Envolver el socket con SSL usando el método moderno (SSLContext) ---
# 1. Crear un contexto SSL seguro.
context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
# 2. Cargar nuestro certificado y clave privada generados.
context.load_cert_chain(keyfile=KEY_FILE, certfile=CERT_FILE)
# 3. Envolver el socket del servidor HTTP con nuestro contexto SSL.
httpd.socket = context.wrap_socket(httpd.socket, server_side=True)

httpd.serve_forever()