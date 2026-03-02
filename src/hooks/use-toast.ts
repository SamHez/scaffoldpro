import { toast as sonnerToast } from "sonner";

interface ToastProps {
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
  action?: any;
}

export const toast = ({ title, description, variant, ...props }: ToastProps) => {
  if (variant === "destructive") {
    return sonnerToast.error(title, {
      description: description,
      ...props,
    });
  }

  return sonnerToast.success(title, {
    description: description,
    ...props,
  });
};

export function useToast() {
  return {
    toast,
    dismiss: (toastId?: string) => sonnerToast.dismiss(toastId),
    toasts: [], // Empty for backward compatibility
  };
}
