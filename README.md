# Content Factory

An AI-assisted social media content production workspace.

## Product vision

Content Factory is a central workspace for planning, creating, adapting, reviewing, and organizing social media content. The interface follows the provided visual reference: a light canvas, generous spacing, rounded panels, orange accents, dark media preview, and a compact sidebar.

## Product principles

- Keep the workflow fast and understandable.
- Make generated output editable before it is published.
- Keep projects, brand voice, drafts, and content history organized.
- Make AI providers configurable; never expose secret API keys in client-side code.
- Show clear generation, error, and retry states.
- Treat publishing and scheduling as integrations that require explicit platform authorization.

## Core modules

1. **Dashboard** — weekly output, drafts needing review, scheduled posts, recent projects, and quick actions.
2. **Content Studio** — brief, audience, objective, tone, platform, format, language, and generation controls.
3. **Content Calendar** — planned, in-review, approved, scheduled, published, and failed content.
4. **Platform Adaptation** — adapt one content idea for Instagram, Facebook, TikTok, YouTube, LinkedIn, and X while respecting format constraints.
5. **Creative Assets** — organize image, video, thumbnail, and copy assets by project and campaign.
6. **Brand Workspace** — brand guidelines, tone of voice, audience profiles, reusable prompts, and prohibited claims.
7. **Review Workflow** — save drafts, version content, approve or reject, and record feedback.
8. **Analytics** — track platform metrics when connected; do not fabricate analytics where no integration exists.
9. **Integrations & Settings** — AI provider configuration, connected social accounts, access control, and usage limits.

## Suggested implementation phases

### Phase 1 — UI foundation
- Responsive dashboard and navigation.
- Design tokens based on the reference.
- Mock data clearly separated from production integrations.
- Accessible forms, loading states, empty states, and error feedback.

### Phase 2 — Content workflow
- Create and edit projects, briefs, drafts, and platform-specific variants.
- Persistent data model and authentication.
- Search, filters, saved versions, and content calendar.

### Phase 3 — AI
- Server-side generation endpoint.
- Configurable provider/model selection and structured output validation.
- Retry handling, usage metering, and safe secret management.

### Phase 4 — Publishing and analytics
- Connect supported platforms through their official APIs and OAuth flows.
- Scheduling queue, publishing status, retries, and audit trail.
- Analytics only from verified platform data.

## Initial architecture proposal

Choose the runtime and framework after checking the starter setup. Keep UI, domain logic, persistence, and external integrations separate. AI and social platform credentials must remain server-side and be provided through environment variables or a managed secrets system.

Suggested domain entities:
- User
- Workspace
- BrandProfile
- Project
- ContentBrief
- ContentDraft
- PlatformVariant
- Asset
- CalendarEntry
- SocialConnection
- GenerationJob
- AnalyticsSnapshot

## Definition of a useful first release

A user can create a project, define a brief and brand voice, generate or write a draft, adapt it to multiple platforms, edit and save each version, and view the work in a calendar. Publishing and analytics should be labeled as unavailable until the corresponding official integrations have been configured.

## Design direction

- Background: warm off-white / very light gray.
- Primary accent: vivid orange.
- Surfaces: white cards, rounded corners, subtle shadows.
- Media and featured-work areas: deep charcoal.
- Layout: compact sidebar, main workspace, and contextual panels.
- Typography: high-contrast headings, readable labels, restrained metadata.
- Responsive behavior: sidebar collapses on smaller screens; forms and cards stack on mobile.

## Current status

Repository initialized with product requirements. Application code and integrations are not implemented yet.
