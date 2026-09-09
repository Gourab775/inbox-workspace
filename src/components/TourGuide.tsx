/**
 * TourGuide — first-run spotlight tour of the workspace.
 *
 * Lightweight custom implementation (no dependency): a dim overlay with a
 * highlight ring around the current step's ``[data-tour]`` target plus a
 * positioned tooltip card (title / body / Back / Next / Skip / dots).
 *
 * Steps missing from the DOM (e.g. narrow layouts) are skipped, never fatal.
 * Closing (Skip / Finish / Esc / backdrop click) persists ``tour-seen`` so
 * the tour auto-starts only on the very first visit; the header "Tour"
 * button replays it anytime.
 */
import { useCallback, useEffect, useState } from 'react';
import { tokens } from '../design-tokens';
import { useI18n, type TranslationKey } from '../i18n';
import { Icon } from '../icons';

export const TOUR_SEEN_KEY = 'inbox-workspace-tour-seen';

interface Step {
  target: string;
  titleKey: TranslationKey;
  bodyKey: TranslationKey;
}

const STEPS: Step[] = [
  { target: '[data-tour="fetch"]', titleKey: 'tourFetchTitle', bodyKey: 'tourFetchBody' },
  { target: '[data-tour="ai"]', titleKey: 'tourAiTitle', bodyKey: 'tourAiBody' },
  { target: '[data-tour="inbox"]', titleKey: 'tourInboxTitle', bodyKey: 'tourInboxBody' },
  { target: '[data-tour="center"]', titleKey: 'tourCenterTitle', bodyKey: 'tourCenterBody' },
  { target: '[data-tour="pipeline"]', titleKey: 'tourPipelineTitle', bodyKey: 'tourPipelineBody' },
  { target: '[data-tour="history"]', titleKey: 'tourHistoryTitle', bodyKey: 'tourHistoryBody' },
  { target: '[data-tour="theme"]', titleKey: 'tourThemeTitle', bodyKey: 'tourThemeBody' },
];

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function TourGuide({ open, onClose }: Props) {
  const { t } = useI18n();
  const [stepIdx, setStepIdx] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);

  const step = STEPS[stepIdx];

  const markSeen = useCallback(() => {
    try {
      window.localStorage.setItem(TOUR_SEEN_KEY, '1');
    } catch {
      /* noop */
    }
  }, []);

  const close = useCallback(() => {
    markSeen();
    onClose();
  }, [markSeen, onClose]);

  // Reset to the first step whenever the tour (re)opens.
  useEffect(() => {
    if (open) setStepIdx(0);
  }, [open ]);

  // Track the target rect; skip steps whose target isn't in the DOM.
  useEffect(() => {
    if (!open) return;
    let alive = true;
    const measure = () => {
      if (!alive) return;
      // Walk forward past targets absent from the DOM.
      let idx = stepIdx;
      let el: Element | null = null;
      while (idx < STEPS.length) {
        el = document.querySelector(STEPS[idx].target);
        if (el) break;
        idx += 1;
      }
      if (!el || idx >= STEPS.length) {
        close();
        return;
      }
      if (idx !== stepIdx) {
        setStepIdx(idx);
        return;
      }
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    };
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      alive = false;
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [open, stepIdx, close]);

  // Esc dismisses.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close]);

  if (!open || !rect) return null;

  const isLast = stepIdx === STEPS.length - 1;
  const pad = 6;
  const ring: Rect = {
    top: Math.max(0, rect.top - pad),
    left: Math.max(0, rect.left - pad),
    width: rect.width + pad * 2,
    height: rect.height + pad * 2,
  };

  // Tooltip placement: below the target when there's room, else above.
  // Clamped horizontally so it never leaves the viewport.
  const tipWidth = Math.min(320, window.innerWidth - 32);
  const below = ring.top + ring.height + 12 + 190 < window.innerHeight;
  const tipTop = below ? ring.top + ring.height + 12 : Math.max(12, ring.top - 202);
  const tipLeft = Math.max(
    16,
    Math.min(window.innerWidth - tipWidth - 16, ring.left + ring.width / 2 - tipWidth / 2),
  );

  return (
    <>
      <div style={overlay} onClick={close} aria-hidden />
      <div
        style={{
          ...ringStyle,
          top: ring.top,
          left: ring.left,
          width: ring.width,
          height: ring.height,
        }}
        aria-hidden
      />
      <div
        role="dialog"
        aria-label={t(step.titleKey)}
        style={{ ...tip, top: tipTop, left: tipLeft, width: tipWidth }}
      >
        <div style={tipHeader}>
          <span style={tipKicker}>
            {t('tourStepOf', { i: stepIdx + 1, t: STEPS.length })}
          </span>
          <button type="button" onClick={close} style={iconBtn} title={t('tourSkip')}>
            <Icon name="x" size={13} />
          </button>
        </div>
        <h3 style={tipTitle}>{t(step.titleKey)}</h3>
        <p style={tipBody}>{t(step.bodyKey)}</p>
        <div style={dots}>
          {STEPS.map((s, i) => (
            <span
              key={s.target}
              style={{
                ...dot,
                background: i === stepIdx ? tokens.color.brand : tokens.color.border,
              }}
            />
          ))}
        </div>
        <div style={tipActions}>
          <button
            type="button"
            onClick={close}
            style={skipBtn}
          >
            {t('tourSkip')}
          </button>
          <div style={{ display: 'flex', gap: tokens.space[2] }}>
            {stepIdx > 0 && (
              <button
                type="button"
                onClick={() => setStepIdx((i) => Math.max(0, i - 1))}
                style={skipBtn}
              >
                {t('tourBack')}
              </button>
            )}
            <button
              type="button"
              onClick={() => (isLast ? close() : setStepIdx((i) => i + 1))}
              style={nextBtn}
            >
              {isLast ? t('tourFinish') : t('tourNext')}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

const overlay: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0, 0, 0, 0.45)',
  zIndex: 200,
};

const ringStyle: React.CSSProperties = {
  position: 'fixed',
  border: `2px solid ${tokens.color.brand}`,
  borderRadius: tokens.radius.lg,
  boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.45)',
  zIndex: 201,
  pointerEvents: 'none',
  transition: 'top 200ms ease, left 200ms ease, width 200ms ease, height 200ms ease',
};

const tip: React.CSSProperties = {
  position: 'fixed',
  zIndex: 202,
  background: tokens.color.surfaceElevated,
  border: `1px solid ${tokens.color.border}`,
  borderRadius: tokens.radius.xl,
  boxShadow: tokens.shadow.pop,
  padding: `${tokens.space[4]}px`,
  display: 'flex',
  flexDirection: 'column',
  gap: tokens.space[2],
};

const tipHeader: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
};

const tipKicker: React.CSSProperties = {
  fontSize: tokens.fontSize.xs,
  fontFamily: tokens.font.mono,
  color: tokens.color.brand,
  fontWeight: tokens.fontWeight.semibold,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
};

const iconBtn: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 24,
  height: 24,
  borderRadius: tokens.radius.sm,
  border: 'none',
  background: 'transparent',
  color: tokens.color.textSubtle,
  cursor: 'pointer',
};

const tipTitle: React.CSSProperties = {
  margin: 0,
  fontSize: tokens.fontSize.lg,
  fontWeight: tokens.fontWeight.semibold,
  color: tokens.color.text,
};

const tipBody: React.CSSProperties = {
  margin: 0,
  fontSize: tokens.fontSize.base,
  lineHeight: 1.6,
  color: tokens.color.textMuted,
};

const dots: React.CSSProperties = {
  display: 'flex',
  gap: 6,
  marginTop: tokens.space[1],
};

const dot: React.CSSProperties = {
  width: 6,
  height: 6,
  borderRadius: 999,
};

const tipActions: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginTop: tokens.space[2],
};

const skipBtn: React.CSSProperties = {
  padding: '7px 12px',
  borderRadius: tokens.radius.md,
  border: `1px solid ${tokens.color.border}`,
  background: 'transparent',
  color: tokens.color.textMuted,
  fontSize: tokens.fontSize.sm,
  fontWeight: tokens.fontWeight.medium,
  cursor: 'pointer',
};

const nextBtn: React.CSSProperties = {
  ...skipBtn,
  background: tokens.color.text,
  color: tokens.color.textInverted,
  border: '1px solid transparent',
};
