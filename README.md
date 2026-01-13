# WAF Dashboard

A modern, dark-themed Next.js dashboard for managing an ML-powered Web Application Firewall (WAF) system.

![WAF Dashboard](https://github.com/user-attachments/assets/3e4e9a21-1a0c-4c99-9b73-b6dd3b26bf4d)

## Features

### 🔐 Authentication

- Clean login and registration pages
- Secure authentication using HttpOnly cookies
- Protected routes with automatic redirection

### 📊 Dashboard Home

- Real-time system status monitoring (Gateway, Database, ML Scorer)
- Quick statistics (Total Requests, Blocked Threats, Flagged Activity)
- Live threat feed with SSE (Server-Sent Events)
- Color-coded threat levels and severity indicators

### 🌐 Domain Management

- List all protected domains with status badges
- Add new domains with modal interface
- Domain verification with nameserver assignment
- View domain details and DNS records

### 🛡️ Security Rules

- Two tabs: Global Rules and Custom Rules
- Toggle switches to enable/disable rules per domain
- Add custom rules with flexible conditions:
  - Field selection (path, query, body, header)
  - Operators (contains, regex, equals)
  - Actions (score addition or hard block)
  - Custom tags for categorization

### 📝 Attack Logs

- Comprehensive attack log table with expandable rows
- Columns: Timestamp, IP, Path, Reason, Status, Source, Score, Confidence
- Full request details view (method, URL, headers, body)
- Filter capabilities and color-coded severity

### ⚙️ Settings

- User profile information display
- API URL configuration with localStorage persistence
- Secure logout functionality

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **UI Components**: Custom components (shadcn/ui inspired)
- **Icons**: Lucide React
- **State Management**: Zustand
- **Notifications**: Sonner (Toast notifications)
- **Animations**: Framer Motion

## Design

- **Theme**: Dark mode with cybersecurity aesthetic
- **Colors**:
  - Background: `#0a0a0f`, `#111827`
  - Accent Cyan: `#06b6d4`
  - Threat Red: `#ef4444`
  - Safe Green: `#22c55e`
- **Typography**: System fonts (clean, modern sans-serif)
- **Animations**: Smooth transitions, hover effects, loading skeletons

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

1. Clone the repository:

```bash
git clone https://github.com/jiniyasshah/waf-dashboard.git
cd waf-dashboard
```

2. Install dependencies:

```bash
npm install
```

3. Run the development server:

```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Building for Production

```bash
npm run build
npm start
```

## API Configuration

The dashboard requires a backend API URL to be configured. On first load, you'll be prompted to enter your API base URL (e.g., `https://api.example.com`). This can be changed later in Settings.

### API Endpoints

All requests include `credentials: 'include'` for HttpOnly cookie authentication:

- **Auth**: `/api/auth/login`, `/api/auth/register`, `/api/auth/check`, `/api/auth/logout`
- **System**: `/api/status`
- **Domains**: `/api/domains`, `/api/domains/add`, `/api/domains/verify`
- **DNS**: `/api/dns/records`
- **Rules**: `/api/rules/global`, `/api/rules/custom`, `/api/rules/custom/add`, `/api/rules/toggle`
- **Logs**: `/api/logs/secure`, `/api/logs/stream` (SSE)

## Error Handling

The application implements comprehensive error handling:

- User-friendly error messages (no technical jargon)
- Toast notifications for feedback
- Graceful fallbacks when API is unavailable
- No app crashes on network errors

## Project Structure

```
waf-dashboard/
├── app/
│   ├── (auth)/           # Authentication pages
│   │   ├── login/
│   │   └── register/
│   ├── (dashboard)/      # Protected dashboard pages
│   │   ├── page.tsx      # Dashboard home
│   │   ├── domains/
│   │   ├── rules/
│   │   ├── logs/
│   │   └── settings/
│   ├── layout.tsx        # Root layout
│   └── globals.css       # Global styles
├── components/
│   ├── ui/               # Reusable UI components
│   ├── dashboard/        # Dashboard-specific components
│   └── providers/        # Context providers
├── lib/
│   ├── api.ts           # API client
│   ├── auth-store.ts    # Auth state management
│   └── utils.ts         # Utility functions
└── types/
    └── index.ts         # TypeScript type definitions
```

## Screenshots

### Login Page

![Login](https://github.com/user-attachments/assets/12c9f5ac-e030-4c00-9824-5a3abe0297db)

### Register Page

![Register](https://github.com/user-attachments/assets/5c76c052-cfdb-498d-947f-02356daecf29)

### Dashboard with API Configuration

![Dashboard](https://github.com/user-attachments/assets/3e4e9a21-1a0c-4c99-9b73-b6dd3b26bf4d)

### Domains Page

![Domains](https://github.com/user-attachments/assets/1370b035-5e91-4cf7-af3a-72f376ac5e05)

### Rules Page

![Rules](https://github.com/user-attachments/assets/d5e726df-64c8-40e9-bd2f-7df9edd4075c)

### Logs Page

![Logs](https://github.com/user-attachments/assets/1fe10c19-cc02-4d61-ba49-eb39432b8d42)

### Settings Page

![Settings](https://github.com/user-attachments/assets/0e0142c0-db5a-4833-ba26-136a25bd463d)

## License

ISC

## Author

Created for WAF security operations management.
# waf_front2
