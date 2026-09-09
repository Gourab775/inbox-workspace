/**
 * Design tokens — Minimal premium style.
 *
 * Inspired by Linear / Vercel / Raycast: neutral surfaces, disciplined
 * spacing, near-zero decoration, and a single muted teal accent that
 * surfaces only where it earns attention. No gradients on surfaces,
 * no heavy shadows; hierarchy comes from typography weight + spacing,
 * not from color volume.
 *
 * Dark mode: every ``color`` token resolves to a CSS variable declared in
 * ``index.css`` (``:root`` = light, ``[data-theme="dark"]`` = dark), so
 * components keep consuming ``tokens.color.*`` unchanged and the theme
 * flips with a single ``data-theme`` attribute on <html>.
 */

export const tokens = {
  color: {
    // Surfaces — layered neutral grays (zero hue tint)
    bg: 'var(--c-bg)',
    surface: 'var(--c-surface)',
    surfaceHover: 'var(--c-surface-hover)',
    surfaceMuted: 'var(--c-surface-muted)',
    surfaceElevated: 'var(--c-surface-elevated)',
    gradientBrand: 'var(--c-gradient-brand)',
    gradientBrandStrong: 'var(--c-gradient-brand-strong)',

    // Borders — barely there
    border: 'var(--c-border)',
    borderStrong: 'var(--c-border-strong)',
    borderSubtle: 'var(--c-border-subtle)',

    // Text — high contrast hierarchy (no mid-tone confusion)
    text: 'var(--c-text)',
    textMuted: 'var(--c-text-muted)',
    textSubtle: 'var(--c-text-subtle)',
    textDisabled: 'var(--c-text-disabled)',
    textInverted: 'var(--c-text-inverted)',

    // Brand — muted teal (used sparingly: active states, primary CTA, links)
    brand: 'var(--c-brand)',
    brandHover: 'var(--c-brand-hover)',
    brandSoft: 'var(--c-brand-soft)',
    brandSofter: 'var(--c-brand-softer)',
    brandBorder: 'var(--c-brand-border)',

    // Status — desaturated, understated
    success: 'var(--c-success)',
    successSoft: 'var(--c-success-soft)',
    warning: 'var(--c-warning)',
    warningSoft: 'var(--c-warning-soft)',
    danger: 'var(--c-danger)',
    dangerSoft: 'var(--c-danger-soft)',
    info: 'var(--c-info)',
    infoSoft: 'var(--c-info-soft)',

    // Email category palette — more muted / fewer bright primaries
    categoryUrgent: 'var(--c-cat-urgent)',
    categoryMeeting: 'var(--c-cat-meeting)',
    categoryInternal: 'var(--c-cat-internal)',
    categoryMarketing: 'var(--c-cat-marketing)',
    categoryNotification: 'var(--c-cat-notification)',
    categoryFollowup: 'var(--c-cat-followup)',
    categorySpam: 'var(--c-cat-spam)',
    categoryBilling: 'var(--c-cat-billing)',
    categoryOther: 'var(--c-cat-other)',
  },

  font: {
    sans: "'Inter', 'Plus Jakarta Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    mono: "'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, monospace",
  },

  fontSize: {
    xs: 11,
    sm: 12,
    base: 13,
    md: 14,
    lg: 15,
    xl: 18,
    '2xl': 20,
    '3xl': 26,
  },

  fontWeight: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },

  lineHeight: {
    tight: 1.3,
    snug: 1.5,
    normal: 1.6,
    relaxed: 1.75,
  },

  space: {
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    5: 20,
    6: 28,
    7: 36,
    8: 48,
  } as Record<number, number>,

  radius: {
    sm: 4,
    md: 6,
    lg: 8,
    xl: 12,
    '2xl': 16,
    pill: 999,
  },

  shadow: {
    sm: '0 1px 2px rgba(0, 0, 0, 0.03)',
    md: '0 2px 6px rgba(0, 0, 0, 0.04)',
    pop: '0 8px 24px rgba(0, 0, 0, 0.06), 0 2px 4px rgba(0, 0, 0, 0.02)',
    focus: '0 0 0 2px rgba(13, 148, 136, 0.12)',
    inset: 'inset 0 0 0 1px rgba(0, 0, 0, 0.04)',
  },

  motion: {
    fast: '100ms ease',
    base: '150ms ease',
    slow: '220ms cubic-bezier(0.2, 0, 0, 1)',
    spring: '280ms cubic-bezier(0.34, 1.56, 0.64, 1)',
  },
} as const;
