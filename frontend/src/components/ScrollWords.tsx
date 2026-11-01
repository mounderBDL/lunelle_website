/**
 * A title whose words rise out of a blur while you scroll (ScrollScrub drives them; styles in globals.css).
 * Screen readers get the normal sentence; the animated copy is hidden from them.
 */
export default function ScrollWords({ text, accentLast = false }: { text: string; accentLast?: boolean }) {
  const words = text.split(" ");
  const last = words.length - 1;

  return (
    <>
      <span className="sr-only">{text}</span>
      <span aria-hidden>
        {words.map((word, i) => (
          <span key={i}>
            <span
              data-sc="word"
              data-i={i}
              className={`inline-block ${accentLast && i === last ? "italic text-rose-dark" : ""}`}
            >
              {word}
            </span>
            {i < last ? " " : null}
          </span>
        ))}
      </span>
    </>
  );
}