"use client";

import { Button } from "@/components/ui/button";
import { CertificateManager } from "@/helpers/certificate-manager";
import { EndpointManager } from "@/helpers/endpoint-manager";
import { cn } from "@/lib/utils";
import { invoke } from "@tauri-apps/api";
import { confirm } from "@tauri-apps/api/dialog";
import { BaseDirectory, readTextFile, writeTextFile } from "@tauri-apps/api/fs";
import { appDataDir, resolveResource } from "@tauri-apps/api/path";
import { Command, open as shellOpen } from "@tauri-apps/api/shell";
import { useCallback, useEffect, useState } from "react";
import { EndpointData } from "./add";
import CreateProxyV2SideComponent from "./add-new";
import DockerLogModal from "./docker-log";
import RequestPasswordModal from "./request-certificate-trust";
import EndpointListTable from "./table";

export default function EndpointListComponent() {
  const [loaded, setLoaded] = useState(false);
  const [endpointList, setEndpointList] = useState([]);
  const [openSide, setOpenSide] = useState(false);
  const [dockerModalOpen, setDockerModalOpen] = useState(false);
  const [dockerProcessStream, setDockerProcessStream] = useState<any>("");
  const [passwordModalShown, setPasswordModalOpen] = useState(false);
  const [currentEndpoint, setCurrentEndpoint] = useState<EndpointData>();
  const [dockerNeedsRestart, setDockerNeedsRestart] = useState(false);

  const appendDockerProcessStream = useCallback((line: any) => {
    if (typeof line === "string") {
      setDockerProcessStream((prev: any) => prev + `\n${line}`);
    } else {
      setDockerProcessStream((prev: any) => prev + line);
    }
  }, []);

  const stopDocker = async () => {
    const appDataDirPath = await appDataDir();
    const command = new Command("stop-docker-compose", [
      "compose",
      "-f",
      `${appDataDirPath}/docker-compose.yml`,
      "down",
    ]);
    command.on("close", (data) => {
      if (data.code == 0) {
        appendDockerProcessStream(`✅ Stopping Docker successfully finished.`);
      } else {
        appendDockerProcessStream(
          `🚨 Stopping Docker failed with code ${data.code} and signal ${data.signal}`
        );
      }
      appendDockerProcessStream("💤 Waiting for docker to settle...");
    });
    command.on("error", (error) => console.error(`command error: "${error}"`));
    command.stdout.on("data", (line) => appendDockerProcessStream(`${line}`));
    command.stderr.on("data", (line) => appendDockerProcessStream(`${line}`));
    const child = await command.spawn();
    setDockerProcessStream(`👉 Stopping Docker...`);
  };
  const startDocker = async () => {
    setDockerModalOpen(true);
    setDockerNeedsRestart(false);

    await stopDocker();

    await new Promise((resolve) => setTimeout(resolve, 2500));

    const resourcePath = await resolveResource(
      "bundle/templates/docker-compose.yml.template"
    );
    console.log(`resourcePath: ${resourcePath}`);
    const dockerComposeTemplate = await readTextFile(resourcePath);

    appendDockerProcessStream(`👉 Starting Docker...`);
    await writeTextFile(`docker-compose.yml`, dockerComposeTemplate, {
      dir: BaseDirectory.AppData,
    });

    const appDataDirPath = await appDataDir();

    const command = new Command("run-docker-compose", [
      "compose",
      "-v",
      "-f",
      `${appDataDirPath}/docker-compose.yml`,
      "up",
      "-d",
    ]);
    command.on("close", (data) => {
      if (data.code == 0) {
        appendDockerProcessStream(`✅ Starting Docker successfully finished.`);
      } else {
        appendDockerProcessStream(
          `🚨 Starting Docker failed with code ${data.code} and signal ${data.signal}`
        );
      }
    });
    command.on("error", (error) => console.error(`command error: "${error}"`));
    command.stdout.on("data", (line) => appendDockerProcessStream(`${line}`));
    command.stderr.on("data", (line) => appendDockerProcessStream(`${line}`));
    const child = await command.spawn();
    appendDockerProcessStream(`command spawned with pid ${child.pid}`);
  };

  const onDeleteFromHosts = useCallback(
    async (endpoint: EndpointData, password: string) => {
      invoke("delete_line_from_hosts", {
        hostname: endpoint.hostname,
        password: password,
      });
    },
    []
  );

  const openAppData = useCallback(async () => {
    const appDataDirPath = await appDataDir();
    shellOpen(appDataDirPath);
  }, []);

  const onDeleteEndpoint = useCallback(async (endpoint: EndpointData) => {
    setCurrentEndpoint(endpoint);
    const confirmed = await confirm(
      `Are you sure to delete ${endpoint.nickname}?`
    );
    if (!confirmed) {
      return;
    }

    invoke("remove_cert_from_keychain", {
      name: `${endpoint.hostname}`,
    });
    setDockerNeedsRestart(true);
    setPasswordModalOpen(true);
  }, []);

  const prepareConfigPage = useCallback(async () => {
    const mgr = EndpointManager.sharedManager();
    const list = await mgr.get();
    setEndpointList(list);
    setLoaded(true);
  }, []);

  const addEndpoint = useCallback(async (data: EndpointData) => {
    const mgr = EndpointManager.sharedManager();
    const endpointList = await mgr.get();
    if (endpointList.find((e: EndpointData) => e.hostname === data.hostname)) {
      // already exists
      return;
    }
    endpointList.push(data);
    mgr.save(endpointList);
    setDockerNeedsRestart(true);
    setEndpointList(endpointList);
  }, []);

  useEffect(() => {
    prepareConfigPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const shouldShowAddButton = loaded;

  return (
    <div className="flex flex-col min-h-screen text-gray-100 bg-gray-900">
      <div className="">
        <DockerLogModal
          stream={dockerProcessStream}
          isOpen={dockerModalOpen}
          onClosed={() => {
            setDockerModalOpen(false);
          }}
        />
        <CreateProxyV2SideComponent
          open={openSide}
          setOpen={setOpenSide}
          onAdd={(data) => {
            setCurrentEndpoint(data);
            addEndpoint(data);
          }}
        />
        <RequestPasswordModal
          description={
            "Ophiuchi wants to edit: /etc/hosts. If you cancel, you can edit it manually."
          }
          isOpen={passwordModalShown}
          onConfirm={function (password: string): void {
            setPasswordModalOpen(false);
            if (!currentEndpoint) return;
            onDeleteFromHosts(currentEndpoint, password);
            const endpointManager = EndpointManager.sharedManager();
            const configHelper = new CertificateManager();
            configHelper.deleteCertificateFiles(currentEndpoint.hostname);
            configHelper.deleteNginxConfigurationFiles(
              currentEndpoint.hostname
            );

            const copiedList = [...endpointList];
            const index = copiedList.findIndex((e: EndpointData) => {
              return e.hostname === currentEndpoint.hostname;
            });
            copiedList.splice(index, 1);

            endpointManager.save(copiedList);
            setEndpointList(copiedList);
          }}
        />
        <div className="flex gap-2 px-4 py-4 fixed top-0 left-0 right-0 bg-gray-700">
          <Button
            variant={"default"}
            onClick={() => {
              if (endpointList.length === 0) {
                return;
              }
              startDocker();
            }}
            className={cn(dockerNeedsRestart ? "animate-bounce" : "")}
            disabled={endpointList.length === 0}
          >
            {dockerNeedsRestart ? "Restart Docker To Apply" : "Start Docker "}
          </Button>
          <div
            className="p-2 underline cursor-pointer text-sm"
            onClick={() => {
              openAppData();
            }}
          >
            Open docker-compose folder
          </div>
          <a
            className="p-2 underline cursor-pointer text-sm"
            href={`https://heavenly-tent-fff.notion.site/Ophiuchi-Developers-Toolkit-734dc4f766fe40aebfe0da3cbbc304f5?pvs=4`}
            target="_blank"
          >
            Help
          </a>
        </div>
      </div>

      <div className="p-4 mt-20">
        <EndpointListTable
          list={endpointList}
          onDeleteEndpoint={onDeleteEndpoint}
          onAddEndpoint={() => {
            setOpenSide(true);
          }}
        />
      </div>
    </div>
  );
}
