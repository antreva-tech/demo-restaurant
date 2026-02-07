"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useRef } from "react";
import { formatDOP } from "@/lib/money";
import { useCart } from "./CartContext";
import { createOnlineOrder } from "@/server/actions/online-orders";
import { TurnstileWidget } from "./TurnstileWidget";

interface CheckoutFormProps {
  restaurantSlug: string;
  locationSlug: string;
  restaurantName: string;
  locationName: string;
}

/**
 * Checkout — UberEats-inspired: cart lines with quantity controls,
 * order summary, customer form, prominent place-order CTA.
 */
export function CheckoutForm({
  restaurantSlug,
  locationSlug,
  restaurantName,
  locationName,
}: CheckoutFormProps) {
  const cart = useCart();
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [orderNumber, setOrderNumber] = useState<number | null>(null);
  const turnstileToken = useRef<string | null>(null);

  if (cart.itemCount === 0 && status !== "success") {
    router.replace(`/r/${restaurantSlug}/l/${locationSlug}`);
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("submitting");
    setErrorMessage("");

    const result = await createOnlineOrder({
      restaurantSlug,
      locationSlug,
      items: cart.items.map((i) => ({
        menuItemId: i.menuItemId,
        name: i.name,
        unitPriceCents: i.unitPriceCents,
        quantity: i.quantity,
      })),
      customerName: name.trim(),
      customerPhone: phone.trim(),
      notes: notes.trim() || null,
      turnstileToken: turnstileToken.current,
    });

    if ("ok" in result && result.ok) {
      cart.clearCart();
      setName("");
      setPhone("");
      setNotes("");
      setOrderNumber("orderNumber" in result ? result.orderNumber : null);
      setStatus("success");
    } else {
      setStatus("error");
      setErrorMessage("error" in result ? result.error : "Error al enviar el pedido.");
    }
  };

  if (status === "success") {
    return (
      <div className="mx-auto max-w-md px-4 py-8 sm:py-12">
        <div className="rounded-2xl border-2 border-green-200 bg-green-50/90 px-6 py-10 text-center shadow-sm">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-green-500 text-4xl text-white shadow-md">
            ✓
          </div>
          <h2 className="text-2xl font-bold text-green-800 sm:text-3xl">
            ¡Todo listo!
          </h2>
          <p className="mt-2 text-lg font-medium text-green-700">
            Pedido recibido correctamente
          </p>
          {orderNumber != null && (
            <p className="mt-3 rounded-lg bg-white/70 px-4 py-2 font-mono text-lg font-semibold text-green-800">
              N.º de pedido: {orderNumber}
            </p>
          )}
          <p className="mt-4 text-sm text-green-800/90">
            Te contactaremos pronto para confirmar. Guarda este número de pedido por si necesitas consultar.
          </p>
          <Link
            href={`/r/${restaurantSlug}/l/${locationSlug}`}
            className="mt-8 inline-block min-h-[48px] rounded-xl bg-green-600 px-6 py-3 font-semibold text-white shadow transition hover:bg-green-700 active:opacity-90"
          >
            Volver al menú
          </Link>
        </div>
      </div>
    );
  }

  const subtotalCents = cart.items.reduce(
    (s, i) => s + i.unitPriceCents * i.quantity,
    0
  );
  const taxCents = Math.round((subtotalCents * 18) / 100);
  const totalCents = subtotalCents + taxCents;

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-lg px-4 pb-32 pt-6">
      {/* Cart items — UberEats-style list with quantity controls */}
      <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <h3 className="text-base font-semibold text-[#2d3748]">Tu pedido</h3>
        <ul className="mt-4 space-y-4">
          {cart.items.map((i) => (
            <CheckoutLineItem
              key={i.menuItemId}
              name={i.name}
              unitPriceCents={i.unitPriceCents}
              quantity={i.quantity}
              onIncrement={() => cart.updateQuantity(i.menuItemId, i.quantity + 1)}
              onDecrement={() =>
                i.quantity <= 1
                  ? cart.removeItem(i.menuItemId)
                  : cart.updateQuantity(i.menuItemId, i.quantity - 1)
              }
            />
          ))}
        </ul>
        <div className="mt-4 border-t border-gray-100 pt-4 text-sm">
          <Row label="Subtotal" value={formatDOP(subtotalCents)} />
          <Row label="Impuesto (aprox.)" value={formatDOP(taxCents)} />
          <div className="mt-2 flex justify-between font-semibold text-[#2d3748]">
            <span>Total</span>
            <span>{formatDOP(totalCents)}</span>
          </div>
        </div>
      </section>

      {/* Customer details */}
      <section className="mt-8">
        <h3 className="mb-4 text-base font-semibold text-[#2d3748]">
          Datos de contacto
        </h3>
        <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <LabelInput
            id="checkout-name"
            label="Nombre *"
            type="text"
            required
            value={name}
            onChange={setName}
            placeholder="Tu nombre"
            disabled={status === "submitting"}
          />
          <LabelInput
            id="checkout-phone"
            label="Teléfono *"
            type="tel"
            required
            value={phone}
            onChange={setPhone}
            placeholder="Ej. 809-555-1234"
            disabled={status === "submitting"}
          />
          <div>
            <label
              htmlFor="checkout-notes"
              className="block text-sm font-medium text-[#4a5568]"
            >
              Notas del pedido
            </label>
            <textarea
              id="checkout-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Instrucciones especiales, alergias, etc."
              rows={3}
              className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-[#2d3748] placeholder:text-gray-400 focus:border-antreva-blue focus:outline-none focus:ring-2 focus:ring-antreva-blue/20"
              disabled={status === "submitting"}
            />
          </div>
        </div>
      </section>

      {/* Cloudflare Turnstile anti-bot verification (renders nothing when not configured) */}
      <div className="mt-6">
        <TurnstileWidget
          onSuccess={(token) => { turnstileToken.current = token; }}
          onExpire={() => { turnstileToken.current = null; }}
        />
      </div>

      {status === "error" && (
        <p className="mt-4 text-sm text-red-600" role="alert">
          {errorMessage}
        </p>
      )}

      {/* Sticky bottom CTA — safe area for home indicator, 48px touch targets */}
      <div className="safe-area-bottom fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white px-4 py-4 shadow-[0_-4px_12px_rgba(0,0,0,0.08)]">
        <div className="mx-auto flex max-w-lg flex-col gap-3">
          <button
            type="submit"
            disabled={status === "submitting"}
            className="min-h-[48px] w-full rounded-xl bg-antreva-blue px-4 py-3 font-semibold text-white transition active:opacity-90 disabled:opacity-70 sm:hover:bg-[#1557b0]"
          >
            {status === "submitting" ? "Enviando…" : `Enviar pedido · ${formatDOP(totalCents)}`}
          </button>
          <Link
            href={`/r/${restaurantSlug}/l/${locationSlug}`}
            className="min-h-[48px] flex items-center justify-center rounded-xl border border-gray-200 py-3 text-sm font-medium text-[#4a5568] transition active:bg-gray-100 sm:hover:bg-gray-50"
          >
            Volver al menú
          </Link>
        </div>
      </div>
    </form>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-[#718096]">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function LabelInput({
  id,
  label,
  type,
  required,
  value,
  onChange,
  placeholder,
  disabled,
}: {
  id: string;
  label: string;
  type: string;
  required?: boolean;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  disabled?: boolean;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-[#4a5568]">
        {label}
      </label>
      <input
        id={id}
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-[#2d3748] placeholder:text-gray-400 focus:border-antreva-blue focus:outline-none focus:ring-2 focus:ring-antreva-blue/20"
        disabled={disabled}
      />
    </div>
  );
}

/**
 * Single line in checkout: name, quantity controls, line total.
 * No image to keep layout simple; optional thumb can be added via menu item lookup.
 */
function CheckoutLineItem({
  name,
  unitPriceCents,
  quantity,
  onIncrement,
  onDecrement,
}: {
  name: string;
  unitPriceCents: number;
  quantity: number;
  onIncrement: () => void;
  onDecrement: () => void;
}) {
  const lineTotal = unitPriceCents * quantity;
  return (
    <li className="flex items-center justify-between gap-4 border-b border-gray-50 pb-4 last:border-0 last:pb-0">
      <div className="min-w-0 flex-1">
        <p className="font-medium text-[#2d3748]">{name}</p>
        <p className="text-sm text-[#718096]">{formatDOP(lineTotal)}</p>
      </div>
      <div className="flex shrink-0 items-center gap-0 rounded-lg border border-gray-200 bg-gray-50">
        <button
          type="button"
          onClick={onDecrement}
          className="flex min-h-[44px] min-w-[44px] items-center justify-center text-[#4a5568] active:bg-gray-200 sm:hover:bg-gray-200"
          aria-label="Quitar uno"
        >
          −
        </button>
        <span className="min-w-[2rem] text-center text-sm font-semibold text-[#2d3748]">
          {quantity}
        </span>
        <button
          type="button"
          onClick={onIncrement}
          className="flex min-h-[44px] min-w-[44px] items-center justify-center text-[#4a5568] active:bg-gray-200 sm:hover:bg-gray-200"
          aria-label="Añadir uno"
        >
          +
        </button>
      </div>
    </li>
  );
}
