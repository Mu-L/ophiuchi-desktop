"use client";

import {
  TooltipProvider
} from "@/components/ui/tooltip";
import proxyListStore from "@/stores/proxy-list";
import { appDataDir } from "@tauri-apps/api/path";
import { open as shellOpen } from "@tauri-apps/plugin-shell";
import { useCallback } from "react";
import ProxyListTable from "./table";

export default function ProxyListComponent() {
  const { proxyList } = proxyListStore();

  const openAppData = useCallback(async () => {
    const appDataDirPath = await appDataDir();
    shellOpen(appDataDirPath);
  }, []);

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex flex-col h-full">
        <div className="">
          {/* <div className="flex flex-col gap-2 mb-4">
            <Label className="text-base font-medium">Select Group</Label>
            <div className="flex gap-2 items-center">
              <ProxyGroupSelect
                onAddGroupButton={() => {
                  // wow!
                }}
              />
              <DockerControl />
            </div>
          </div> */}
          <ProxyListTable />
        </div>
      </div>
    </TooltipProvider>
  );
}
