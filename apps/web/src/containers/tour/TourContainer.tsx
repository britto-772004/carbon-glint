import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { GuidedTour } from '../../components/tour/GuidedTour';
import { TourMenuDialog } from '../../components/tour/TourMenuDialog';
import { exampleCsv, exampleFor, INDUSTRY_EXAMPLES } from '../../lib/industry-examples';
import { firstStepOf, placeCard, TOUR_CHAPTERS, TOUR_STEPS, type Rect } from '../../lib/tour';

const SEEN_KEY = 'cg.tour.v1.seen';
const INDUSTRY_KEY = 'cg.tour.v1.industry';

const read = (key: string) => {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};
const write = (key: string, value: string) => {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* private mode — the tour still works, it just won't remember */
  }
};

export interface TourContainerProps {
  menuOpen: boolean;
  onMenuOpenChange: (open: boolean) => void;
  /** The company's industry, used as the default example set. */
  industryCode?: string | null;
}

/** Guided tour state: chapter menu, current step, navigation between pages, spotlight measurement. */
export function TourContainer({ menuOpen, onMenuOpenChange, industryCode }: TourContainerProps) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [stepIndex, setStepIndex] = useState<number | null>(null);
  const [industry, setIndustry] = useState(() => read(INDUSTRY_KEY) ?? industryCode ?? 'it_software');
  const [target, setTarget] = useState<Rect | null>(null);
  const [viewport, setViewport] = useState({ width: window.innerWidth, height: window.innerHeight });

  const step = stepIndex === null ? null : TOUR_STEPS[stepIndex]!;

  // First visit: offer the tour once.
  useEffect(() => {
    if (!read(SEEN_KEY)) {
      write(SEEN_KEY, '1');
      onMenuOpenChange(true);
    }
  }, [onMenuOpenChange]);

  // Each step lives on a page: go there.
  useEffect(() => {
    if (step && pathname !== step.route) navigate(step.route);
  }, [step, pathname, navigate]);

  // Find, scroll to and measure the spotlight target (it may render a moment after navigation).
  useEffect(() => {
    if (!step) return;
    let tries = 0;
    let el: Element | null = null;
    let timer: number | undefined;
    const measure = () => {
      setViewport({ width: window.innerWidth, height: window.innerHeight });
      const r = el?.getBoundingClientRect();
      setTarget(
        r && r.width > 0 && r.height > 0 ? { top: r.top, left: r.left, width: r.width, height: r.height } : null,
      );
    };
    const find = () => {
      el = step.target ? document.querySelector(`[data-tour="${step.target}"]`) : null;
      const visible = el && el.getBoundingClientRect().width > 0;
      if (visible) {
        el!.scrollIntoView({ block: 'center', behavior: 'smooth' });
        timer = window.setTimeout(measure, 350);
      } else if (step.target && tries++ < 20) {
        timer = window.setTimeout(find, 150);
      } else {
        el = null;
        measure();
      }
    };
    find();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [step, pathname]);

  const chooseIndustry = (code: string) => {
    setIndustry(code);
    write(INDUSTRY_KEY, code);
  };
  const start = (chapter: string | null) => {
    onMenuOpenChange(false);
    setTarget(null);
    setStepIndex(chapter ? firstStepOf(chapter) : 0);
  };
  const go = (i: number) => {
    setTarget(null);
    setStepIndex(Math.min(Math.max(0, i), TOUR_STEPS.length - 1));
  };
  const example = exampleFor(industry);
  const download = (i: number) => {
    const d = example.definitions[i];
    if (!d) return;
    const url = URL.createObjectURL(new Blob([exampleCsv(d)], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${example.industryCode}-scope${d.scope}-${d.categoryCode.toLowerCase()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <TourMenuDialog
        open={menuOpen}
        chapters={TOUR_CHAPTERS.map((name) => ({ name, steps: TOUR_STEPS.filter((s) => s.chapter === name).length }))}
        industries={INDUSTRY_EXAMPLES}
        industryCode={example.industryCode}
        onIndustry={chooseIndustry}
        onStart={start}
        onClose={() => onMenuOpenChange(false)}
      />
      {step && stepIndex !== null && (
        <GuidedTour
          step={step}
          index={stepIndex}
          total={TOUR_STEPS.length}
          target={target}
          cardPosition={placeCard(target, viewport)}
          example={example}
          onBack={() => go(stepIndex - 1)}
          onNext={() => go(stepIndex + 1)}
          onClose={() => setStepIndex(null)}
          onOpenMenu={() => {
            setStepIndex(null);
            onMenuOpenChange(true);
          }}
          onDownloadExample={download}
        />
      )}
    </>
  );
}
