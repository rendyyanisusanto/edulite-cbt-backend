# CBT Edulite — Backend

Backend API untuk sistem CBT Edulite, dibangun di atas Node.js + Express.js.

## Persyaratan

- Node.js v18+ (gunakan Node v20+ untuk fitur `node --watch`)
- MySQL / MariaDB — database `edulite-remake` harus aktif
- Database Edulite existing sudah berisi tabel `users`, `roles`, `user_roles`

## Instalasi

```bash
cd backend
npm install
```

## Konfigurasi

Salin `.env.example` ke `.env` dan sesuaikan:

```bash
cp .env.example .env
```

Isi minimal yang perlu disesuaikan:

```env
DB_USER=root
DB_PASSWORD=your_db_password
JWT_SECRET=ganti-dengan-secret-yang-aman
```

## Menjalankan

**Development (hot-reload):**
```bash
npm run dev
```

**Production:**
```bash
npm start
```

## Endpoint

| Method | Path | Auth | Deskripsi |
|--------|------|------|-----------|
| `GET` | `/api/health` | - | Status server dan database |
| `POST` | `/api/auth/login` | - | Login menggunakan akun Edulite |
| `GET` | `/api/auth/me` | Bearer | Data user saat ini |
| `POST` | `/api/auth/logout` | Bearer | Logout (stateless) |

## Autentikasi

Backend menggunakan akun dari database Edulite existing (`users`, `roles`, `user_roles`).

Role yang diizinkan masuk ke CBT:
- `SUPERADMIN` → dipetakan ke `ADMIN` di CBT
- `ADMIN` → dipetakan ke `ADMIN` di CBT
- `GURU` → dipetakan ke `GURU` di CBT

## Keamanan

- Password diverifikasi menggunakan bcrypt (sesuai format hash existing)
- JWT berlaku selama `JWT_EXPIRES_IN` (default: 8 jam)
- Login dibatasi 10 percobaan per 15 menit per IP
- Tidak ada data sensitif yang dikembalikan ke frontend
