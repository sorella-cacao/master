"use client";

import Link from "next/link";
import { useState } from "react";
import type { PersonalisedLabel, Variant } from "@/data/types";
import { formatPrice, fromPrice } from "@/lib/format";
import { LABEL_FEE, MAX_LABEL_WORDS, cleanLabel, limitWords } from "@/lib/labels";
import { buttonClass } from "./button";
import { useCart } from "./cart";
import { type LabelChoice, LabelPreview, useLabelChoice } from "./personalised-label";

type Props = {
  href: string;
  title: string;
  image: string;
  optionName: string;
  variants: Variant[];
  subscription?: { discount: number; interval: string };
  /** Ask whether the customer wants a personalised label (needs LabelChoiceProvider). */
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
  const { addItem } = useCart();
  const labelChoice = useLabelChoice();
  const offerLabel = personalisedLabel && labelChoice ? { label: personalisedLabel, choice: labelChoice } : undefined;
  const [variantIndex, setVariantIndex] = useState<number | "">("");
  const [quantity, setQuantity] = useState(1);
  const [subscribe, setSubscribe] = useState(false);
  const [added, setAdded] = useState(false);

  const variant = variantIndex === "" ? undefined : variants[variantIndex];
  const basePrice = variant?.price ?? fromPrice(variants);
  const subscribePrice = (price: number) =>
    subscription ? Math.round(price * (1 - subscription.discount) * 100) / 100 : price;
  const unitPrice = subscribe ? subscribePrice(basePrice) : basePrice;
  const unavailable = soldOut || variant?.soldOut;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!variant || unavailable) return;
    const label = offerLabel?.choice.wanted ? cleanLabel(offerLabel.choice.text) : undefined;
    if (offerLabel?.choice.wanted && !label) return;
    addItem({
      href,
      title,
      image,
      variant: variant.label,
      frequency: subscribe && subscription ? subscription.interval : undefined,
      label,
      unitPrice,
      quantity,
    });
    setAdded(true);
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
            labelChoice?.setFlavour(index === "" ? undefined : variants[index].label);
            setAdded(false);
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

      {offerLabel && (
        <LabelFields label={offerLabel.label} choice={offerLabel.choice} onChange={() => setAdded(false)} />
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

      <button
        type="submit"
        disabled={!!unavailable}
        className={`${buttonClass()} w-full disabled:cursor-not-allowed disabled:bg-cacao-700 disabled:text-cream/50`}
      >
        {unavailable ? "Sold Out" : actionLabel}
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
  choice,
  onChange,
}: {
  label: PersonalisedLabel;
  choice: LabelChoice;
  onChange: () => void;
}) {
  return (
    <fieldset>
      <legend className="eyebrow mb-2 text-cream/70">Would you like a personalised label?</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        <ChoiceCard
          name="personalised-label"
          required
          checked={choice.wanted === true}
          onChange={() => {
            choice.setWanted(true);
            onChange();
          }}
          label="Yes please"
          price={`+ ${formatPrice(LABEL_FEE)} per label`}
          detail="One-off, however many bars"
        />
        <ChoiceCard
          name="personalised-label"
          required
          checked={choice.wanted === false}
          onChange={() => {
            choice.setWanted(false);
            onChange();
          }}
          label="No thanks"
          price="Sorella Cacao label"
        />
      </div>

      {choice.wanted && (
        <div className="mt-6 space-y-6">
          <label className="block">
            <span className="eyebrow mb-2 block text-cream/70">
              Your label (up to {MAX_LABEL_WORDS} words):
            </span>
            <input
              type="text"
              required
              maxLength={40}
              value={choice.text}
              onChange={(e) => {
                choice.setText(limitWords(e.target.value));
                onChange();
              }}
              placeholder="e.g. Happy Birthday Mum"
              className="w-full rounded-xl border border-white/15 bg-cacao-800 px-4 py-3.5 font-sans text-base text-cream placeholder:text-cream/40 focus:border-gold focus:outline-none"
            />
            <span className="mt-2 block text-base text-cream/60">
              Printed in place of “Sorella Cacao” at the top of the label.
            </span>
          </label>
          {/* On wide screens the preview replaces the product photo instead. */}
          <div className="lg:hidden">
            <LabelPreview label={label} text={choice.text} flavour={choice.flavour} />
          </div>
        </div>
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
  price: string;
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
      <span className="text-cream/70">
        {price}
        {detail && <span className="block text-sm">{detail}</span>}
      </span>
    </label>
  );
}
