import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonWrapperProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  show: boolean;
  children: ReactNode;
};

export function ButtonWrapper({ show, children, ...buttonProps }: ButtonWrapperProps) {
  if (!show) {
    return null;
  }

  return <button {...buttonProps}>{children}</button>;
}