import Link from "next/link";
import { CTA, FAQS, FEATURES, FOOTER_LINKS, HERO, HIGHLIGHTS, HOW, STEPS, type Feature } from "./content";
import { FeatureScreen, HeroStage, STEP_VISUALS } from "./phone-mockups";
import "./landing.css";

/**
 * 비로그인 홈(/) 랜딩 — 히어로(앱 홈 피드 폰) → 특징 띠 → 3단계 → 기능 3종(앱 화면) → FAQ → CTA.
 * 상태 없는 정적 페이지. FAQ 아코디언은 <details>라 클라이언트 상태가 필요 없다.
 * 색은 전부 테마 토큰이라 무드(다정함/캐주얼)·다크 모드를 그대로 따른다.
 */
export function MarketingLanding() {
  return (
    <div className="lp">
      <Hero />
      <Highlights />
      <HowItWorks />
      <Features />
      <Faq />
      <Cta />
      <LandingFooter />
    </div>
  );
}

function Hero() {
  return (
    <section className="lp-hero">
      <div className="lp-inner lp-hero-inner">
        <div className="lp-hero-copy">
          <h1 className="lp-display">{HERO.title}</h1>
          <p className="lp-lead">{HERO.body}</p>
          <div className="lp-cta-row">
            <Link className="btn btn-primary lp-btn-lg" href="/register">
              무료로 시작하기
            </Link>
            <Link className="btn btn-secondary lp-btn-lg" href="/login">
              로그인
            </Link>
          </div>
        </div>
        <HeroStage />
      </div>
    </section>
  );
}

function Highlights() {
  return (
    <section className="lp-highlights">
      <dl className="lp-inner lp-highlights-inner">
        {HIGHLIGHTS.map((item) => (
          <div key={item.value} className="lp-highlight">
            <dt>{item.label}</dt>
            <dd>{item.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function HowItWorks() {
  return (
    <section id="how" className="lp-how">
      <div className="lp-inner lp-center">
        <span className="lp-kicker">{HOW.kicker}</span>
        <h2 className="lp-h2">{HOW.title}</h2>
        <p className="lp-sub">{HOW.subtitle}</p>
        <ol className="lp-steps">
          {STEPS.map((step) => (
            <li key={step.no} className="lp-step">
              <span className="lp-step-no">{step.no}</span>
              <div aria-hidden>{STEP_VISUALS[step.visual]}</div>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function Features() {
  return (
    <section className="lp-features">
      {FEATURES.map((feature) => (
        <FeatureRow key={feature.id} feature={feature} />
      ))}
    </section>
  );
}

function FeatureRow({ feature }: { feature: Feature }) {
  return (
    <div id={feature.id} className={`lp-inner lp-feature${feature.reverse ? " lp-feature-reverse" : ""}`}>
      <div className="lp-feature-copy">
        <span className="lp-eyebrow">{feature.eyebrow}</span>
        <h2 className="lp-h2">{feature.title}</h2>
        <p className="lp-lead">{feature.body}</p>
      </div>
      <div className="lp-shot">
        <FeatureScreen screen={feature.screen} />
      </div>
    </div>
  );
}

function Faq() {
  return (
    <section id="faq" className="lp-faq">
      <div className="lp-inner lp-center">
        <span className="lp-kicker">FAQ</span>
        <h2 className="lp-h2">자주 묻는 질문</h2>
        <div className="lp-faq-list">
          {FAQS.map((item) => (
            <details key={item.q} className="lp-faq-item">
              <summary>{item.q}</summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function Cta() {
  return (
    <section className="lp-cta">
      <div className="lp-inner lp-center">
        <h2 className="lp-h2">{CTA.title}</h2>
        <p className="lp-sub">{CTA.body}</p>
        <div className="lp-cta-row">
          <Link className="btn lp-btn-lg lp-btn-light" href="/register">
            무료로 시작하기
          </Link>
          <Link className="btn lp-btn-lg lp-btn-outline-light" href="/login">
            로그인
          </Link>
        </div>
      </div>
    </section>
  );
}

function LandingFooter() {
  return (
    <footer className="lp-footer">
      <div className="lp-inner lp-footer-inner">
        <span>© 2026 StoryGroup</span>
        <nav>
          {FOOTER_LINKS.map((link) => (
            <Link key={link.href} href={link.href}>
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
