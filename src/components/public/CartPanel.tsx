"use client";

import { useEffect, useState } from "react";
import { formatDOP } from "@/lib/money";
import { createOnlineOrder } from "@/server/actions/online-orders";
import type { CartContextValue } from "./CartContext";

const PANEL_DURATION_MS = 350;

interface CartPanelProps {
  open: boolean;
  onClose: () => void;
  cart: CartContextValue;
  restaurantSlug: string;
  locationSlug: string;
  /** Tax rate in basis points (e.g. 1800 = 18%). Shown in "tax included" message. */
  taxRateBps?: number;
}

/**
 * Cart panel: full checkout in-panel. Right drawer (desktop) or modal (mobile).
 * Cart items, contact form (name, phone, notes), place order. Success state then close.
 */
export function CartPanel({ open, onClose, cart, restaurantSlug, locationSlug, taxRateBps = 1800 }: CartPanelProps) {
  const [hasEntered, setHasEntered] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      setHasEntered(false);
      setIsExiting(false);
      const t = requestAnimationFrame(() => {
        requestAnimationFrame(() => setHasEntered(true));
      });
      return () => cancelAnimationFrame(t);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [open, onClose]);

  function handleClose() {
    if (status === "submitting") return;
    setIsExiting(true);
    setTimeout(() => onClose(), PANEL_DURATION_MS);
  }

  async function handleSubmit(e: React.FormEvent) {
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
    });
    if ("ok" in result && result.ok) {
      cart.clearCart();
      setStatus("success");
    } else {
      setStatus("error");
      setErrorMessage("error" in result ? result.error : "Error al enviar el pedido.");
    }
  }

  const totalCents = cart.items.reduce((s, i) => s + i.unitPriceCents * i.quantity, 0);

  if (!open) return null;

  const visible = hasEntered && !isExiting;

  return (
    <>
      {/* Backdrop — blurred, click to close */}
      <div
        className={`fixed inset-0 z-40 bg-black/30 backdrop-blur-md transition-opacity duration-[350ms] ease-out md:bg-black/25 ${
          visible ? "opacity-100" : "opacity-0"
        }`}
        onClick={handleClose}
        aria-hidden
      />
      {/* Panel — slides up on mobile, in from right on desktop */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 flex max-h-[88vh] flex-col rounded-t-2xl bg-white shadow-2xl transition-transform duration-[350ms] ease-out md:bottom-0 md:left-auto md:right-0 md:top-0 md:max-h-none md:w-[28rem] md:max-w-full md:rounded-none md:shadow-xl ${
          visible
            ? "translate-y-0 md:translate-x-0"
            : "translate-y-full md:translate-y-0 md:translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-panel-title"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-4 py-3">
          <h2 id="cart-panel-title" className="text-lg font-semibold text-gray-900">
            {status === "success" ? "Pedido enviado" : "Tu carrito"}
          </h2>
          <button
            type="button"
            onClick={handleClose}
            disabled={status === "submitting"}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
            aria-label="Cerrar"
          >
            <span className="text-xl leading-none">×</span>
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {status === "success" ? (
            <div className="flex flex-col items-center py-8 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-2xl text-green-600">
                ✓
              </div>
              <p className="text-lg font-semibold text-gray-900">Pedido recibido</p>
              <p className="mt-2 text-sm text-gray-600">
                Te contactaremos pronto para confirmar tu pedido.
              </p>
              <button
                type="button"
                onClick={handleClose}
                className="mt-6 min-h-[48px] rounded-xl bg-menu-gold px-6 py-3 font-semibold text-menu-brown transition hover:bg-menu-gold-hover"
              >
                Cerrar
              </button>
            </div>
          ) : (
            <form id="cart-panel-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
              <ul className="space-y-4">
                {cart.items.map((i) => (
                  <li
                    key={i.menuItemId}
                    className="flex items-center justify-between gap-3 border-b border-gray-100 pb-4 last:border-0 last:pb-0"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900">{i.name}</p>
                      <p className="text-sm text-gray-500">
                        {formatDOP(i.unitPriceCents * i.quantity)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center rounded-lg border border-gray-200 bg-gray-50">
                      <button
                        type="button"
                        onClick={() =>
                          i.quantity <= 1
                            ? cart.removeItem(i.menuItemId)
                            : cart.updateQuantity(i.menuItemId, i.quantity - 1)
                        }
                        className="flex min-h-[40px] min-w-[40px] items-center justify-center text-gray-600 hover:bg-gray-200"
                        aria-label="Quitar uno"
                      >
                        −
                      </button>
                      <span className="min-w-[2rem] text-center text-sm font-semibold text-gray-900">
                        {i.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => cart.updateQuantity(i.menuItemId, i.quantity + 1)}
                        className="flex min-h-[40px] min-w-[40px] items-center justify-center text-gray-600 hover:bg-gray-200"
                        aria-label="Añadir uno"
                      >
                        +
                      </button>
                    </div>
                  </li>
                ))}
              </ul>

              <section className="border-t border-gray-100 pt-4">
                <h3 className="mb-3 text-sm font-semibold text-gray-900">Datos de contacto</h3>
                <div className="space-y-3">
                  <LabelInput
                    id="panel-name"
                    label="Nombre *"
                    type="text"
                    required
                    value={name}
                    onChange={setName}
                    placeholder="Tu nombre"
                    disabled={status === "submitting"}
                  />
                  <LabelInput
                    id="panel-phone"
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
                      htmlFor="panel-notes"
                      className="block text-sm font-medium text-gray-600"
                    >
                      Notas del pedido
                    </label>
                    <textarea
                      id="panel-notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Instrucciones especiales, alergias, etc."
                      rows={2}
                      className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-menu-gold focus:outline-none focus:ring-2 focus:ring-menu-gold/20"
                      disabled={status === "submitting"}
                    />
                  </div>
                </div>
              </section>

              {status === "error" && (
                <p className="text-sm text-red-600" role="alert">
                  {errorMessage}
                </p>
              )}
            </form>
          )}
        </div>

        {status !== "success" && (
          <div className="shrink-0 border-t border-gray-200 px-4 py-4">
            <p className="mb-3 text-xs text-gray-500">
              El impuesto ({Math.round(taxRateBps / 100)}%) está incluido en el precio de los productos.
            </p>
            <div className="mb-4 flex justify-between text-lg font-semibold text-gray-900">
              <span>Total</span>
              <span>{formatDOP(totalCents)}</span>
            </div>
            <button
              type="submit"
              form="cart-panel-form"
              disabled={status === "submitting"}
              className="flex min-h-[48px] w-full items-center justify-center rounded-xl bg-menu-gold px-4 py-3 font-semibold text-menu-brown transition hover:bg-menu-gold-hover disabled:opacity-70"
            >
              {status === "submitting"
                ? "Enviando…"
                : `Enviar pedido · ${formatDOP(totalCents)}`}
            </button>
          </div>
        )}
      </div>
    </>
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
      <label htmlFor={id} className="block text-sm font-medium text-gray-600">
        {label}
      </label>
      <input
        id={id}
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-menu-gold focus:outline-none focus:ring-2 focus:ring-menu-gold/20"
        disabled={disabled}
      />
    </div>
  );
}
