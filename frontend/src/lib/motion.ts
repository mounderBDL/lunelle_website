import { useCartUi } from "@/store/cartUi";

export const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const SAFE_URL = /^https?:\/\/[^"'\\\s()]+$/;

/**
 * A small copy of the product floats from `origin` to the cart icon, which then gives a little bump.
 * If anything is missing (or the visitor asked for less motion), only the bump happens.
 */
export function flyToCart(origin: HTMLElement | null, imageUrl: string | null) {
  const bump = () => useCartUi.getState().bump();
  const target = document.querySelector<HTMLElement>("[data-cart-target]");

  if (!origin || !target || prefersReducedMotion() || typeof origin.animate !== "function") {
    bump();
    return;
  }

  const from = origin.getBoundingClientRect();
  const to = target.getBoundingClientRect();
  if (to.width === 0 || from.width === 0) {
    bump();
    return;
  }

  const size = 56;
  const startX = from.left + from.width / 2 - size / 2;
  const startY = from.top + from.height / 2 - size / 2;
  const dx = to.left + to.width / 2 - size / 2 - startX;
  const dy = to.top + to.height / 2 - size / 2 - startY;
  const lift = Math.min(140, Math.abs(dy) * 0.35 + 50);

  const ghost = document.createElement("div");
  ghost.setAttribute("aria-hidden", "true");
  Object.assign(ghost.style, {
    position: "fixed",
    left: `${startX}px`,
    top: `${startY}px`,
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: "9999px",
    border: "3px solid #fff",
    boxShadow: "0 12px 30px -8px rgba(154, 85, 96, 0.55)",
    backgroundColor: "var(--color-petal-200)",
    zIndex: "9999",
    pointerEvents: "none",
  });
  if (imageUrl && SAFE_URL.test(imageUrl)) {
    ghost.style.backgroundImage = `url("${imageUrl}")`;
    ghost.style.backgroundSize = "cover";
    ghost.style.backgroundPosition = "center";
  }
  document.body.appendChild(ghost);

  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    ghost.remove();
    bump();
  };

  const animation = ghost.animate(
    [
      { transform: "translate(0, 0) scale(1)", opacity: 1, offset: 0 },
      { transform: `translate(${dx * 0.45}px, ${dy * 0.45 - lift}px) scale(0.8)`, opacity: 1, offset: 0.45 },
      { transform: `translate(${dx}px, ${dy}px) scale(0.28)`, opacity: 0.35, offset: 1 },
    ],
    { duration: 720, easing: "cubic-bezier(0.45, 0.05, 0.25, 1)", fill: "forwards" },
  );
  animation.onfinish = finish;
  animation.oncancel = finish;
  window.setTimeout(finish, 1500); // safety net: the copy never stays on screen
}