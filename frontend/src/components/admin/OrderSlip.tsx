import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { formatPhone } from "@/lib/admin/format";
import type { OrderDetail } from "@/lib/admin/types";
import { formatDateTime, formatMoney, localized } from "@/lib/format";

/** Only visible when printing (see .print-only in globals.css). */
export default function OrderSlip({ order }: { order: OrderDetail }) {
  const t = useTranslations("admin.detail");
  const locale = useLocale();
  const hand = order.deliveryMethod === "HAND_TO_HAND";
  const where = [order.address, order.communeName, order.wilayaName].filter(Boolean).join(", ");

  return (
    <section className="print-only" aria-hidden>
      <div className="flex items-center justify-between border-b border-black pb-4">
        <Image src="/brand/logo.png" alt="" width={200} height={70} className="h-14 w-auto" />
        <div className="text-right">
          <p className="text-xs uppercase tracking-widest">{t("slip.title")}</p>
          <p className="text-2xl font-bold tabular-nums">{order.code}</p>
          <p className="text-xs">{formatDateTime(order.createdAt, locale)}</p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-8 text-sm">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest">{t("slip.customer")}</p>
          <p className="mt-1 text-base font-semibold">{order.customerName}</p>
          <p className="tabular-nums">{formatPhone(order.phone)}</p>
          {order.customerNote && <p className="mt-2 italic">“{order.customerNote}”</p>}
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-widest">{t("slip.delivery")}</p>
          <p className="mt-1 text-base font-semibold">{t(`method.${order.deliveryMethod}`)}</p>
          {hand ? (
            <>
              {order.handoverPlace && <p>{order.handoverPlace}</p>}
              {order.handoverAt && <p>{formatDateTime(order.handoverAt, locale)}</p>}
            </>
          ) : (
            <p>{where}</p>
          )}
          {order.trackingNumber && <p className="tabular-nums">{order.trackingNumber}</p>}
        </div>
      </div>

      <table className="mt-8 w-full border-collapse text-sm">
        <tbody>
          {order.items.map((item) => (
            <tr key={item.id} className="border-b border-black/20 align-top">
              <td className="py-2 pr-4">
                <span className="font-semibold">
                  {item.quantity} × {localized(item.name, locale)}
                </span>
                {item.type === "VARIANT" && item.variantLabel && <span> ({item.variantLabel})</span>}
                {item.type === "PACK" &&
                  item.components.map((c, i) => (
                    <span key={i} className="block pl-4 text-xs">
                      {c.quantity} × {localized(c.name, locale)} ({c.variantLabel})
                    </span>
                  ))}
              </td>
              <td className="py-2 text-right tabular-nums">{formatMoney(item.lineTotal, locale)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="ml-auto mt-4 w-72 text-sm">
        <p className="flex justify-between">
          <span>{t("subtotal")}</span>
          <span className="tabular-nums">{formatMoney(order.subtotal, locale)}</span>
        </p>
        <p className="flex justify-between">
          <span>{t("delivery")}</span>
          <span className="tabular-nums">{order.deliveryFee === 0 ? t("free") : formatMoney(order.deliveryFee, locale)}</span>
        </p>
        <p className="mt-2 flex items-baseline justify-between border-t-2 border-black pt-2">
          <span className="text-xs font-bold uppercase tracking-wider">{t("slip.collect")}</span>
          <span className="text-xl font-bold tabular-nums">{formatMoney(order.total, locale)}</span>
        </p>
      </div>

      <p className="mt-12 text-center text-xs">{t("slip.thanks")}</p>
    </section>
  );
}