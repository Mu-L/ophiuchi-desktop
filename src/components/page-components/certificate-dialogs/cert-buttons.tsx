"use client";

import AddToHostsDialog from "@/components/page-components/certificate-dialogs/add-to-hosts";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CertificateManager } from "@/helpers/certificate-manager";
import { IProxyData } from "@/helpers/proxy-manager/interfaces";
import { ICON_SIZE, ICON_STROKE_WIDTH } from "@/lib/constants";
import { certKeychainStore } from "@/stores/cert-keychain-store";
import { appDataDir } from "@tauri-apps/api/path";
import { open as shellOpen } from "@tauri-apps/plugin-shell";
import { CheckIcon, LoaderCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import AddCertificateToKeychainDialog from "./add-to-keychain";
import GenerateCertificateDialog from "./generate";

export default function PrepareButtons({ item }: { item: IProxyData }) {
  const [certExist, setCertExist] = useState<boolean | undefined>(undefined);
  const { certOnKeychain } = certKeychainStore();

  const openCert = useCallback(async (data: IProxyData) => {
    const appDataDirPath = await appDataDir();
    const certPath = `${appDataDirPath}/cert/${data.hostname}`;
    shellOpen(certPath);
  }, []);

  async function checkExist(hostname: string) {
    const configHelper = CertificateManager.shared();
    const exists = await configHelper.checkCertificateExists(hostname);
    setCertExist(exists);
  }

  useEffect(() => {
    checkExist(item.hostname);
  }, [item.hostname]);

  if (certExist === undefined) {
    return (
      <div>
        <LoaderCircle
          size={ICON_SIZE}
          strokeWidth={ICON_STROKE_WIDTH}
          className="animate-spin"
        />
      </div>
    );
  }

  if (!certExist) {
    return (
      <GenerateCertificateDialog
        item={item}
        onDone={() => {
          checkExist(item.hostname);
        }}
      />
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={"outline"}
            size={"sm"}
            onClick={() => {
              openCert(item);
            }}
          >
            <CheckIcon
              className="text-green-500"
              size={ICON_SIZE}
              strokeWidth={ICON_STROKE_WIDTH}
            />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left">
          <p>Show in Finder.</p>
        </TooltipContent>
      </Tooltip>
      <AddCertificateToKeychainDialog
        item={item}
        onDone={() => {
          //
        }}
      />
      <AddToHostsDialog
        hostname={item.hostname}
        onClose={() => {
          //
        }}
      />
    </div>
  );
}
