# 🎭 Carnavales Chajarí 2027

Formulario de inscripción online para las comparsas de los **Carnavales de Chajarí 2027**.

Cada comparsa tiene su propio link de inscripción para compartir con los interesados. Los integrantes se anotan desde el celular en segundos: pasistas y ritmistas, con autorización de tutor para menores de 12 años.

---

## ✨ ¿Qué hace?

- 📝 **Formulario público** de inscripción por comparsa (compartible por WhatsApp/Instagram)
- 💃 **Categorías**: Passista (baila) y Ritmista (batucada)
- 👶 **Autorización de tutor** automática para menores de 12 años
- 🔐 **Panel de administración** para que cada comparsa gestione sus integrantes
- 📊 **Estadísticas en vivo**: total, passistas, ritmistas, promedio de edad
- 📥 **Carga masiva** por Excel o pegando datos
- 🔍 **Búsqueda y filtros** por nombre, DNI, edad y tipo
- 📤 **Exportación a Excel**
- 📱 **Mobile-first** — diseñado para usar desde el celular
- 📲 **Instalable como app** (PWA)

---

## 🎭 Comparsas participantes

| Comparsa   | Club            | Color    |
| ---------- | --------------- | -------- |
| 🟢 Fénix   | Ferro           | Verde    |
| 🔵 Sirirí  | Vélez           | Celeste  |
| 🟣 Aluminé | Primero de Mayo | Violeta  |
| 🟡 Amarú   | San Clemente    | Amarillo |

---

## 🔗 Links de inscripción

```
/inscripcion/fenix     → Fénix (Ferro)
/inscripcion/sisiri    → Sirirí (Vélez)
/inscripcion/alumine   → Aluminé (Primero de Mayo)
/inscripcion/amaru     → Amarú (San Clemente)
```

Compartí el link de tu comparsa por WhatsApp y los interesados se inscriben solos.

---

## 🛠️ Stack

- **Next.js 16** (App Router)
- **React 19**
- **Tailwind CSS 4**
- **Firebase Realtime Database**

---

## 🚀 Desarrollo local

```bash
# Instalar dependencias
npm install

# Configurar .env.local (ver abajo)

# Correr en desarrollo
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000).

### Variables de entorno

Crear `.env.local` en la raíz:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=tu_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=tu_proyecto.firebaseapp.com
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://tu_proyecto-default-rtdb.firebaseio.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=tu_proyecto
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=tu_proyecto.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

---

## 📁 Estructura

```
src/
├── app/
│   ├── page.jsx              # Login
│   ├── inicio/               # Panel de cada comparsa
│   ├── panel/                # Panel del administrador general
│   ├── inscripcion/[id]/     # Formulario público
│   └── not-found.jsx         # 404
├── components/
│   ├── FormInscripcion.jsx
│   ├── ModalCargaMasiva.jsx
│   └── ProtectedRoute.jsx
├── firebase/
│   └── firebase.js
└── lib/
    ├── comparsas.js
    └── dates.js
```

---

## 📝 Scripts

| Comando         | Descripción            |
| --------------- | ---------------------- |
| `npm run dev`   | Servidor de desarrollo |
| `npm run build` | Build de producción    |
| `npm start`     | Servidor de producción |
| `npm run lint`  | Linter                 |

---

## 📲 Instalar como app

El sitio funciona como PWA. Para instalarlo:

- **Android (Chrome)**: menú → _"Agregar a pantalla de inicio"_
- **iOS (Safari)**: Compartir → _"Agregar a inicio"_
- **Desktop**: ícono de instalación en la barra de direcciones

---

## 🚢 Deploy

Recomendado: [Vercel](https://vercel.com)

1. Subir el repo a GitHub
2. Importar en Vercel
3. Configurar las variables de entorno
4. Deploy ✅

---

## 📄 Licencia

Uso interno para los **Carnavales de Chajarí**. Todos los derechos reservados.

---

<p align="center">
  Hecho con 💜 para el Carnaval de Chajarí 🎭
</p>
