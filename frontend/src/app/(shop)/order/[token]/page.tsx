import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import OrderDetails from "@/components/OrderDetails";
import OrderStatusPanel from "@/components/OrderStatusPanel";
import WaxSeal from "@/components/WaxSeal";
import { loadOrder } from "@/lib/api/catalog";

type Props = { params: Promise<{ token: string }> };

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("order");
  return { title: t("title"), robots: { index: false, follow: false } };
}

export default async function OrderPage({ params }: Props) {
  const { token } = await params;
  const [t, order] = await Promise.all([getTranslations("order"), loadOrder(token)]);
  if (!order) {
    notFound();
  }

  const active = order.status === "NEW" || order.status === "CONFIRMED" || order.status === "SHIPPED";

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <header className="text-center">
        <WaxSeal className="mx-auto h-28 w-28" />
        <h1 className="mt-6 text-5xl">{t("thanks")}</h1>
        <p className="mt-3 text-cocoa/75">{t("received")}</p>
      </header>

      <div className="mt-10 rounded-2xl border border-rose/20 bg-white/50 p-6 text-center sm:p-8">
        <p className="text-xs uppercase tracking-[0.25em] text-cocoa/60">{t("orderCode")}</p>
        <p className="mt-2 font-display text-4xl tracking-wide">{order.code}</p>
        <div className="mt-8">
          <OrderStatusPanel status={order.status} deliveryMethod={order.deliveryMethod} />
        </div>
        {active && <p className="mx-auto mt-6 max-w-xl text-sm text-cocoa/75">{t(`next.${order.deliveryMethod}`)}</p>}
      </div>

      <div className="mt-8">
        <OrderDetails order={order} />
      </div>

      <div className="mt-8 text-center text-sm text-cocoa/70">
        <p>{t("keepCode")}</p>
        <Link
          href={`/track?code=${encodeURIComponent(order.code)}`}
          className="mt-3 inline-block underline hover:text-rose-dark"
        >
          {t("track")}
        </Link>
      </div>
    </div>
  );
}