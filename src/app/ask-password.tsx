import { useEffect, useRef } from "react";
import { Button } from "./components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./components/ui/dialog";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";

export default function AskPasswordDialog({
  open,
  onSubmit,
}: {
  open: boolean;
  onSubmit?: (password: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const submitCode = () => {
    onSubmit?.(inputRef.current.value);
  };

  useEffect(() => {
    const handleClick = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        submitCode();
      }
    };

    window.addEventListener("keyup", handleClick);

    return () => {
      window.addEventListener("keyup", handleClick);
    };
  });

  return (
    <Dialog open={open} modal>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Insert Passkey</DialogTitle>
          <DialogDescription>
            This password is required for the application to work.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center space-x-2">
          <div className="grid flex-1 gap-2">
            <Label htmlFor="link" className="sr-only">
              Passkey
            </Label>
            <Input
              id="link"
              placeholder="Enter PEM key passcode"
              ref={inputRef}
            />
          </div>
        </div>
        <DialogFooter className="justify-end">
          <Button type="button" onClick={() => submitCode()}>
            Submit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
