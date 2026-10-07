"use client";

import Link from "next/link";
import { useState } from "react";
import type { PersonalisedLabel, Variant } from "@/data/types";
import { formatPrice, fromPrice } from "@/lib/format";
import { LABEL_FEE, cleanLabel } from "@/lib/labels";
import { buttonClass } from "./button";
import { useCart } from "./cart";
import { LabelEditor, focusLabelInput } from "./personalised-label";

type Props = {
  href: string;
  title: string;
  image: string;
  optionName: string;
  variants: Variant[];
  subscription?: { discount: number; interval: string };
  /** Ask whether the customer wants a personalised label, once a flavour is chosen. */
  personalisedLabel?: PersonalisedLabel;
  soldOut?: boolean;
  /** Original button wording, e.g. "Add To Cart" or "Register". */
  actionLabel: string;
};

export function PurchaseForm({
  href,
  title,
  image,
  optionName,
  variants,
  subscription,
  personalisedLabel,
  soldOut,
  actionLabel,
}: Props) {
  const { items, addItem } = useCart();
  const [variantIndex, setVariantIndex] = useState<number | "">("");
  const [quantity, setQuantity] = useState(1);
  const [subscribe, setSubscribe] = useState(false);
  /** null until the customer answers Yes or No. */
  const [wantsLabel, setWantsLabel] = useState<boolean | null>(null);
  const [labelInput, setLabelInput] = useState("");
  const [addedKey, setAddedKey] = useState<string>();
  const [missingWords, setMissingWords] = useState(false);

  const variant = variantIndex === "" ? undefined : variants[variantIndex];
  const basePrice = variant?.price ?? fromPrice(variants);
  const subscribePrice = (price: number) =>
    subscription ? Math.round(price * (1 - subscription.discount) * 100) / 100 : price;
  const unitPrice = subscribe ? subscribePrice(basePrice) : basePrice;
  const unavailable = soldOut || variant?.soldOut;

  const labelText = personalisedLabel && wantsLabel ? cleanLabel(labelInput) : "";
  // The fee is charged once per wording, so it's already covered if the cart has it.
  const labelInCart = !!labelText && items.some((i) => i.label?.toLowerCase() === labelText.toLowerCase());
  const total = unitPrice * quantity + (labelText && !labelInCart ? LABEL_FEE : 0);
  // "Added to cart" shows only while the form still matches what was added.
  const formKey = [variantIndex, quantity, subscribe, labelText].join("|");
  const added = addedKey === formKey;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!variant || unavailable) return;
    if (wantsLabel && !labelText) {
      setMissingWords(true);
      focusLabelInput();
      return;
    }
    addItem({
      href,
      title,
      image,
      variant: variant.label,
      frequency: subscribe && subscription ? subscription.interval : undefined,
      label: labelText || undefined,
      unitPrice,
      quantity,
    });
    setAddedKey(formKey);
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <p className="text-3xl text-gold">
        {!variant && "from "}
        {formatPrice(unitPrice)}
      </p>

      <label className="block">
        <span className="eyebrow mb-2 block text-cream/70">{optionName}:</span>
        <select
          required
          value={variantIndex}
          onChange={(e) => {
            const index = e.target.value === "" ? "" : Number(e.target.value);
            setVariantIndex(index);
          }}
          className="w-full appearance-none rounded-xl border border-white/15 bg-cacao-800 bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%228%22><path d=%22M1 1l5 5 5-5%22 fill=%22none%22 stroke=%22%23d9ad68%22 stroke-width=%221.5%22/></svg>')] bg-[length:12px] bg-[right_1.1rem_center] bg-no-repeat px-4 py-3.5 pr-10 font-sans text-base text-cream focus:border-gold focus:outline-none"
        >
          <option value="">Select {optionName}</option>
          {variants.map((v, i) => (
            <option key={v.label} value={i} disabled={v.soldOut}>
              {v.label}
              {v.soldOut ? " (Sold Out)" : ""}
            </option>
          ))}
        </select>
      </label>

      {personalisedLabel && variant && (
        <LabelFields
          label={personalisedLabel}
          flavour={variant.label}
          wanted={wantsLabel}
          onWantedChange={setWantsLabel}
          text={labelInput}
          onTextChange={setLabelInput}
          missingWords={missingWords && !!wantsLabel && !labelText}
        />
      )}

      {subscription && (
        <fieldset>
          <legend className="eyebrow mb-2 text-cream/70">Frequency:</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            <ChoiceCard
              checked={!subscribe}
              onChange={() => setSubscribe(false)}
              label="One time purchase"
              price={`from ${formatPrice(basePrice)}`}
            />
            <ChoiceCard
              checked={subscribe}
              onChange={() => setSubscribe(true)}
              label="Subscribe"
              price={`from ${formatPrice(subscribePrice(basePrice))}`}
              detail={subscription.interval}
            />
          </div>
        </fieldset>
      )}

      {!soldOut && (
        <label className="block">
          <span className="eyebrow mb-2 block text-cream/70">Quantity:</span>
          <div className="inline-flex items-center rounded-full border border-white/15">
            <button
              type="button"
              aria-label="Decrease quantity"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="h-11 w-11 text-xl text-cream/80 hover:text-gold"
            >
              −
            </button>
            <input
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
              className="w-12 bg-transparent text-center font-sans text-base [appearance:textfield] focus:outline-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <button
              type="button"
              aria-label="Increase quantity"
              onClick={() => setQuantity((q) => q + 1)}
              className="h-11 w-11 text-xl text-cream/80 hover:text-gold"
            >
              +
            </button>
          </div>
        </label>
      )}

      {personalisedLabel && variant && !unavailable && (
        <dl className="space-y-2 rounded-xl bg-cacao-950/50 px-5 py-4">
          <div className="flex justify-between gap-4">
            <dt>
              {title} · {variant.label} × {quantity}
            </dt>
            <dd className="shrink-0">{formatPrice(unitPrice * quantity)}</dd>
          </div>
          {labelText && (
            <div className="flex justify-between gap-4 text-cream/85">
              <dt>Personalised label “{labelText}”</dt>
              <dd className="shrink-0">{labelInCart ? "Already in cart" : formatPrice(LABEL_FEE)}</dd>
            </div>
          )}
        </dl>
      )}

      <button
        type="submit"
        disabled={!!unavailable}
        className={`${buttonClass()} w-full disabled:cursor-not-allowed disabled:bg-cacao-700 disabled:text-cream/50`}
      >
        {unavailable ? "Sold Out" : personalisedLabel && variant ? `${actionLabel} · ${formatPrice(total)}` : actionLabel}
      </button>

      {added && (
        <p role="status" className="font-sans text-base text-cream/80">
          Added to cart ·{" "}
          <Link href="/cart" className="text-gold underline underline-offset-4">
            View cart
          </Link>
        </p>
      )}
    </form>
  );
}

function LabelFields({
  label,
  flavour,
  wanted,
  onWantedChange,
  text,
  onTextChange,
  missingWords,
}: {
  label: PersonalisedLabel;
  flavour: string;
  wanted: boolean | null;
  onWantedChange: (wanted: boolean) => void;
  text: string;
  onTextChange: (text: string) => void;
  missingWords: boolean;
}) {
  return (
    <fieldset>
      <legend className="eyebrow mb-2 text-cream/70">Would you like a personalised label?</legend>
      <div className="grid grid-cols-2 gap-2">
        <ChoiceCard
          name="personalised-label"
          required
          checked={wanted === true}
          onChange={() => onWantedChange(true)}
          label="Yes"
        />
        <ChoiceCard
          name="personalised-label"
          required
          checked={wanted === false}
          onChange={() => onWantedChange(false)}
          label="No"
        />
      </div>

      {wanted && (
        <div className="mt-6">
          <LabelEditor label={label} flavour={flavour} text={text} onTextChange={onTextChange} />
          <p className="mt-3 text-center text-base text-cream/70">
            A personalised label is {formatPrice(LABEL_FEE)} one-off, however many bars you add with these words.
          </p>
        </div>
      )}

      {missingWords && (
        <p role="alert" className="mt-3 text-base text-gold">
          Add your words to the label first, or choose “No”.
        </p>
      )}
    </fieldset>
  );
}

function ChoiceCard({
  name,
  required,
  checked,
  onChange,
  label,
  price,
  detail,
}: {
  name?: string;
  required?: boolean;
  checked: boolean;
  onChange: () => void;
  label: string;
  price?: string;
  detail?: string;
}) {
  return (
    <label
      className={`flex cursor-pointer flex-col rounded-xl border px-4 py-3 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-gold/60 ${
        checked ? "border-gold bg-cacao-800" : "border-white/15 hover:border-white/30"
      }`}
    >
      <input
        type="radio"
        name={name}
        required={required}
        checked={checked}
        onChange={onChange}
        className="sr-only"
      />
      <span className="font-sans text-base text-cream">{label}</span>
      {price && (
        <span className="text-cream/70">
          {price}
          {detail && <span className="block text-sm">{detail}</span>}
        </span>
      )}
    </label>
  );
}
