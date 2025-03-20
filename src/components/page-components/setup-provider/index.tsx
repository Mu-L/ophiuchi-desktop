/* eslint-disable @next/next/no-img-element */
"use client";

import { SystemHelper } from "@/helpers/system";
import useDocker from "@/hooks/use-docker";
import { certKeychainStore } from "@/stores/cert-keychain-store";
import proxyListStore from "@/stores/proxy-list";
import systemStatusStore from "@/stores/system-status";
// When using the Tauri API npm package:
import { invoke } from "@tauri-apps/api/core";
import { appDataDir } from "@tauri-apps/api/path";
import { useCallback, useEffect } from "react";
import { useInterval } from "usehooks-ts";

export function SystemSetupProvider(props: any) {
  const {
    isDockerInstalled,
    setIsDockerInstalled,
    setIsCheckDone,
    setIsDockerContainerRunning,
  } = systemStatusStore();
  const { init: initCertKeychainStore } = certKeychainStore();
  const { checkDockerContainerStatus } = useDocker();
  const { load } = proxyListStore();

  const checkDockerContainerRunning = async () => {
    const appDataDirPath = await appDataDir();
    const dockerComposePath = `${appDataDirPath}/docker-compose.yml`;
    checkDockerContainerStatus(dockerComposePath).then((status) => {
      setIsDockerContainerRunning(status.isRunning, status.containerInfo);
    });
  };

  useInterval(
    () => {
      checkDockerContainerRunning();
    },

    isDockerInstalled ? 3000 : null
  );

  useEffect(() => {
    initCertKeychainStore();
    checkDockerContainerRunning();
  }, []);

  async function checkDocker() {
    try {
      const isInstalled = (await invoke("check_docker_installed")) as boolean;
      setIsDockerInstalled(isInstalled);
      return isInstalled;
    } catch (error) {
      console.error("Error checking Docker installation:", error);
    }
  }

  const onStartApp = useCallback(async () => {
    const systemHelper = new SystemHelper();
    await systemHelper.boot();
    await checkDocker();
    load();
    setIsCheckDone(true);
  }, []);

  useEffect(() => {
    onStartApp();
  }, []);

  return props.children;
}
