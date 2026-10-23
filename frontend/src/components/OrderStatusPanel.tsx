import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import type { DeliveryMethod, OrderStatus } from "@/lib/api/types";

const FLOW: OrderStatus[] = ["NEW", "CONFIRMED", "SHIPPED", "DELIVERED"];
const FLOW_HAND: OrderStatus[] = ["NEW", "CONFIRMED", "DELIVERED"];

export default function OrderStatusPanel({
  status,
  deliveryMethod,
}: {
  status: OrderStatus;
  deliveryMethod: DeliveryMethod;
}) {
  const t = useTranslations("order");
  const hand = deliveryMethod === "HAND_TO_HAND";
  const steps = hand ? FLOW_HAND : FLOW;
  const index = steps.indexOf(status);
  const exceptional = index < 0; // cancelled, not reached, returned

  const stepLabel = (s: OrderStatus) => (hand && s === "DELIVERED" ? t("steps.HANDED_OVER") : t(`steps.${s}`));
  const messageKey = hand && (status === "CONFIRMED" || status === "DELIVERED") ? `${status}_HAND` : status;

  return (
    <div>
      {exceptional ? (
        <p className="mx-auto w-fit rounded-full bg-cocoa/10 px-4 py-1 text-xs uppercase tracking-wider">
          {t(`steps.${status}`)}
        </p>
      ) : (
        <ol className="flex items-start justify-between gap-2" aria-label={t("progress")}>
          {steps.map((step, i) => {
            const current = i === index;
            const done = i < index || (current && status === "DELIVERED");
            return (
              <li
                key={step}
                aria-current={current ? "step" : undefined}
                className="flex flex-1 flex-col items-center text-center"
              >
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-full border text-sm font-medium ${
                    done
                      ? "border-rose-dark bg-rose-dark text-white"
                      : current
                        ? "border-rose-dark bg-blush text-rose-dark"
                        : "border-rose/30 text-cocoa/40"
                  }`}
                >
                  {done ? <Check className="h-4 w-4" aria-hidden /> : i + 1}
                </span>
                <span className={`mt-2 text-xs ${current ? "font-medium text-cocoa" : "text-cocoa/60"}`}>
                  {stepLabel(step)}
                </span>
              </li>
            );
          })}
        </ol>
      )}
      <p className="mt-6 text-center text-lg text-cocoa/85">{t(`messages.${messageKey}`)}</p>
    </div>
  );
}