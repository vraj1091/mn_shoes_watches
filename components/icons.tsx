import type { ComponentType } from "react";
import * as P from "@phosphor-icons/react/dist/ssr";

/**
 * The one icon set (Part 3): Phosphor, light weight. These are server-rendered SVGs. Client
 * components receive them as props or children instead of importing icons, which keeps every
 * weight variant of every icon out of the browser bundle.
 */

type PhosphorIcon = ComponentType<{
  size?: number;
  weight?: "light";
  className?: string;
  "aria-hidden"?: boolean;
  "aria-label"?: string;
  role?: string;
}>;

export type IconProps = {
  size?: number;
  className?: string;
  /** Give a label only when the icon is the sole content of a control. */
  label?: string;
};

function icon(Component: PhosphorIcon) {
  function Icon({ size = 22, className, label }: IconProps) {
    return label ? (
      <Component size={size} weight="light" className={className} role="img" aria-label={label} />
    ) : (
      <Component size={size} weight="light" className={className} aria-hidden />
    );
  }
  return Icon;
}

export const SearchIcon = icon(P.MagnifyingGlassIcon);
export const MenuIcon = icon(P.ListIcon);
export const CloseIcon = icon(P.XIcon);
export const BagIcon = icon(P.HandbagIcon);
export const HeartIcon = icon(P.HeartIcon);
export const UserIcon = icon(P.UserIcon);
export const WhatsappIcon = icon(P.WhatsappLogoIcon);
export const InstagramIcon = icon(P.InstagramLogoIcon);
export const FacebookIcon = icon(P.FacebookLogoIcon);
export const YoutubeIcon = icon(P.YoutubeLogoIcon);
export const XLogoIcon = icon(P.XLogoIcon);
export const CaretDownIcon = icon(P.CaretDownIcon);
export const CaretRightIcon = icon(P.CaretRightIcon);
export const MapPinIcon = icon(P.MapPinIcon);
export const PhoneIcon = icon(P.PhoneIcon);
export const ClockIcon = icon(P.ClockIcon);
export const ArrowRightIcon = icon(P.ArrowRightIcon);
export const ArrowLeftIcon = icon(P.ArrowLeftIcon);
export const EmailIcon = icon(P.EnvelopeSimpleIcon);
export const GoogleIcon = icon(P.GoogleLogoIcon);
export const MobileIcon = icon(P.DeviceMobileIcon);
export const ShieldIcon = icon(P.ShieldCheckIcon);
export const SignOutIcon = icon(P.SignOutIcon);
export const HomeIcon = icon(P.HouseIcon);
export const SettingsIcon = icon(P.GearIcon);
export const WarningIcon = icon(P.WarningCircleIcon);
export const CheckIcon = icon(P.CheckCircleIcon);
export const KeyIcon = icon(P.KeyIcon);
export const SunIcon = icon(P.SunIcon);
export const MoonIcon = icon(P.MoonIcon);
export const AutoThemeIcon = icon(P.MonitorIcon);
export const StoreIcon = icon(P.StorefrontIcon);
export const InfoIcon = icon(P.InfoIcon);
export const FilterIcon = icon(P.SlidersHorizontalIcon);
export const RulerIcon = icon(P.RulerIcon);
export const TruckIcon = icon(P.TruckIcon);
export const ReturnIcon = icon(P.ArrowCounterClockwiseIcon);
export const DropIcon = icon(P.DropIcon);
export const StarIcon = icon(P.StarIcon);
export const PlayIcon = icon(P.PlayIcon);
