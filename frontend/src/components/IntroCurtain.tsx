/** The first-visit intro: a dark curtain with the slogan, which opens on the page. It is pure CSS, and a small script in layout.tsx decides if it plays. */
export default function IntroCurtain() {
  return (
    <div aria-hidden className="intro">
      <div className="intro-panel intro-panel-l" />
      <div className="intro-panel intro-panel-r" />
      <span className="intro-line" />
      <p className="intro-word">
        <span className="intro-up">The poetry</span> <span className="intro-down">of scent</span>
      </p>
    </div>
  );
}