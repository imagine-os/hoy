# HoyOS

**HoyOS** is the operations system for HOY Wellness Center, a wellness club in Bogotá, Colombia,
built to become a multi-tenant platform for other studios later. One codebase serves the public
website, the customer app, the teacher app, the staff and admin desktop, the developer tooling and
the in-app documentation.

- Live (GitHub Pages, pending enablement in repo settings): **https://imagine-os.github.io/hoy/**
- Stack: Vite + React 18 + TypeScript, HashRouter, plain CSS design tokens, mock data layer shaped
  like the future Supabase schema.
- Rules for anyone (human or agent) working here: [`CLAUDE.md`](./CLAUDE.md).
- Plan: [`ROADMAP.md`](./ROADMAP.md) · Docs: [`docs/`](./docs/README.md) · Architecture: [`docs/architecture.md`](./docs/architecture.md)

## The testing hub

The root route `/#/` is a **testing hub** for private testing between the studio team and the
build team. It offers one card per experience:

| Card | Where it goes | Who it is for |
| --- | --- | --- |
| Website | `/#/site` | Everyone, before login |
| Customer app | `/#/app` | Members and drop-ins (mobile-first) |
| Teacher app | `/#/teach` | Teachers (mobile-first) |
| Staff & admin | `/#/staff`, `/#/admin` | Front desk, coordinator, admin, finance, super admin, maintenance (desktop-first) |
| Operations manual | `/#/manual` | How the club runs, in person and in software |
| Documentation & changelog | `/#/docs` | Prompt log, decisions, screenshots |
| Developer | `/#/dev/*` | Tokens, component library, specs, tables, layout editor |

Picking a staff role switches the **demo user** (fictional people, one per role). The header has
ES/EN, light/dark and, for super admins, a **dev mode** toggle that reveals the spec chip and the
inspector panel (`Ctrl+.`) on every page.

## Run it

```
npm i
npm run dev          # http://localhost:5173/#/
npm run build        # typecheck + production build to dist/
npm run screenshots  # regenerate docs/screenshots (Playwright, Chromium preinstalled)
```

## Resumen (ES)

HoyOS es el sistema operativo de HOY Wellness Center: sitio web público, app de clientes, app de
profesores, escritorio de staff y administración, herramientas de desarrollo y documentación en la
misma base de código. La ruta raíz es un **hub de pruebas** para elegir la experiencia y el rol
demo. Todo texto existe en español e inglés (el español es obligatorio). Las reglas de trabajo
están en `CLAUDE.md`; el plan, en `ROADMAP.md`.
