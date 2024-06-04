import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import proxyListStore from "@/stores/proxy-list";
import { Label } from "@radix-ui/react-label";
import { PlusIcon } from "lucide-react";
import React from "react";

export function AddProxyGroupDialog({ onDone }: { onDone: () => void }) {
  const [groupName, setGroupName] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const { addGroup } = proxyListStore();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          <PlusIcon className="h-4 w-4" />
          Add Group
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Group</DialogTitle>
          <DialogDescription>
            Add a new group to organize your proxies.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center space-x-2">
          <div className="grid flex-1 gap-2">
            <Label htmlFor="name" className="sr-only">
              Group Name
            </Label>
            <Input
              id="name"
              placeholder="ex) Workplace"
              value={groupName}
              onChange={(e) => {
                setGroupName(e.target.value);
              }}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            type="submit"
            disabled={!groupName || groupName.length === 0}
            onClick={() => {
              if (!groupName || groupName.length === 0) return;
              addGroup(groupName);
              setGroupName("");
              setOpen(false);
            }}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
