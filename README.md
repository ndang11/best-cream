# 🍦 best-cream

A modern full-stack monorepo with:
- **Mobile (`apps/mobile`):** React Native + Expo + TypeScript
- **Server (`apps/server`):** Node.js + Express + TypeScript (**Pure ES Modules**, no CommonJS)
- **Shared (`packages/shared`):** Shared TypeScript types, interfaces, and schemas

---

## 📁 Repository Structure

```text
best-cream/
├── apps/
│   ├── mobile/         # React Native + Expo App
│   └── server/         # Express API (Pure ESM + TypeScript)
├── packages/
│   └── shared/         # Shared interfaces and types
├── package.json        # Workspaces configuration
└── .gitignore
```

---

## 🚀 Getting Started

### 1. Install Dependencies
From the repository root, install all dependencies across the monorepo:
```bash
npm install
```

### 2. Start Both Server and Mobile Concurrently
```bash
npm run dev
```

---

## 🛠️ Individual Commands

- **Run Backend Only (port 5000):**
  ```bash
  npm run dev:server
  ```
  Health Check: http://localhost:5000/api/health  
  Menu Endpoint: http://localhost:5000/api/menu

- **Run Mobile App Only:**
  ```bash
  npm run dev:mobile
  ```
  - Press `w` to open web preview
  - Press `a` for Android emulator
  - Press `i` for iOS simulator
  - Scan QR code with Expo Go app on your physical device

- **Build Backend:**
  ```bash
  npm run build:server
  ```

