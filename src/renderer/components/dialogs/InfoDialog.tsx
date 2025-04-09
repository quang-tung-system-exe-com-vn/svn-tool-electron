// src/renderer/components/dialogs/InfoDialog.tsx
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

export function InfoDialog() {
  const { t } = useTranslation();

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          className="w-full justify-start p-2 h-8 font-normal"
        >
          {t("menu.about")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("aboutDialog.title")}</DialogTitle>
          <DialogDescription>{t("aboutDialog.description")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2 text-sm">
          <p>
            <strong>{t("aboutDialog.developer")}:</strong> Nguyễn Quang Tùng
          </p>
          <p>
            <strong>{t("aboutDialog.version")}:</strong> 1.0.0
          </p>
          <p>
            <strong>{t("aboutDialog.email")}:</strong>{" "}
            quang-tung@system-exe.com.vn
          </p>
          <p>
            <strong>{t("aboutDialog.github")}:</strong>{" "}
            <a
              href="https://github.com/quang-tung-system-exe-com-vn"
              className="text-blue-600"
              target="_blank"
              rel="noreferrer"
            >
              https://github.com/quang-tung-system-exe-com-vn
            </a>
          </p>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button>{t("aboutDialog.close")}</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
