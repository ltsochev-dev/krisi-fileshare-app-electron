import { useState } from "react";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { LoaderPinwheel } from "lucide-react";

export default function AesKeyAndIvDialog({
  file,
  open,
  onSubmit,
  onCancel,
}: {
  file?: string;
  open: boolean;
  onSubmit?: (props: {
    wrappedKey: string;
    aesIv: string;
    filename: string;
  }) => void;
  onCancel?: () => void;
}) {
  const [loading, setLoading] = useState(false);

  const handleSubmit = (formData: FormData) => {
    const wrappedKey = formData.get("aesKey")?.toString()?.trim() ?? "";
    const aesIv = formData.get("aesIv")?.toString()?.trim() ?? "";
    const filename = formData.get("filename")?.toString()?.trim() ?? "";

    if (wrappedKey.length === 0 || aesIv.length === 0) {
      return;
    }

    onSubmit?.({ wrappedKey, aesIv, filename });
  };

  const handleLoadHashKeys = async () => {
    if (!window.electron) return;

    try {
      setLoading(true);

      const encryptedPassKey = localStorage.getItem("pem-key");

      const hash = file.split(/[/\\]/).pop();

      const res = await window.electron.loadKeys({ hash, encryptedPassKey });

      const payload = {
        wrappedKey: res.aesKey,
        aesIv: res.aesIv,
        filename: res.filename,
      };

      onSubmit?.(payload);
    } catch (e) {
      console.error("Error while fetching key data:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (open === false) {
      onCancel?.();
    }
  };

  return (
    <Dialog open={open} modal onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form action={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Configuring Keys</DialogTitle>
            <DialogDescription>
              You need to get decrypting information from the admin panel for
              this file.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="aesKey" className="text-right">
                AES Key
              </Label>
              <Input
                id="aesKey"
                name="aesKey"
                placeholder="Insert file's AES Key"
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="aesIv" className="text-right">
                AES IV
              </Label>
              <Input
                id="aesIv"
                name="aesIv"
                placeholder="Insert file's AES IV"
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="filename" className="text-right">
                Filename
              </Label>
              <Input
                id="filename"
                name="filename"
                placeholder="Choose a filename to store as"
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter className="justify-end">
            {file && (
              <Button
                type="button"
                variant="secondary"
                onClick={handleLoadHashKeys}
                disabled={loading}
              >
                {loading && (
                  <LoaderPinwheel className="mr-2 h-4 w-4 animate-spin" />
                )}
                Autoload
              </Button>
            )}
            <Button type="submit">Submit</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
