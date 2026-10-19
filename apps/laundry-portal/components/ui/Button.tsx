import { useId, type ButtonHTMLAttributes, type ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'text' | 'destructive';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  full?: boolean;
  icon?: ReactNode;
  // DESIGN.md: a disabled button shows its reason nearby ("Weigh first").
  // Setting a reason also disables the button.
  disabledReason?: string | null;
};

export function Button({
  variant = 'primary',
  full,
  icon,
  disabledReason,
  className,
  children,
  type = 'button',
  disabled,
  ...rest
}: Props) {
  const reasonId = useId();
  const cls = ['btn', `btn-${variant}`, full ? 'full' : '', className ?? ''].filter(Boolean).join(' ');
  const button = (
    <button
      type={type}
      className={cls}
      disabled={disabled || !!disabledReason}
      aria-describedby={disabledReason ? reasonId : undefined}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
  if (!disabledReason) return button;
  return (
    <span style={{ display: full ? 'block' : 'inline-block' }}>
      {button}
      <span id={reasonId} className="btn-reason">
        {disabledReason}
      </span>
    </span>
  );
}
