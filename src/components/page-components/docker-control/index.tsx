import DockerIcon from "@/components/icons/docker";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CertificateManager } from "@/helpers/certificate-manager";
import useDocker from "@/hooks/use-docker";
import proxyListStore from "@/stores/proxy-list";
import systemStatusStore from "@/stores/system-status";
import { appDataDir, resolveResource } from "@tauri-apps/api/path";
import {
  BaseDirectory,
  readTextFile,
  writeTextFile,
} from "@tauri-apps/plugin-fs";
import { Command } from "@tauri-apps/plugin-shell";
import { ChevronDownIcon, CircleStop, LogsIcon, RotateCcw } from "lucide-react";
import { forwardRef, useCallback, useState } from "react";
import { toast } from "sonner";
import DockerLogModal from "../proxy-list/docker-log";

const ButtonWithDropdown = forwardRef<
  HTMLButtonElement,
  {
    onStart: () => void;
    onStop: () => void;
    onRestart: () => void;
    onShowLogs: () => void;
  }
>(({ onStart, onStop, onRestart, onShowLogs }, ref) => {
  const { proxyList } = proxyListStore();
  const { isDockerContainerRunning } = systemStatusStore();

  const proxyListHasDuplicatePorts = proxyList.some(
    (proxy, index, self) =>
      index !== self.findIndex((t) => t.port === proxy.port)
  );

  return (
    <div className="divide-primary-foreground/30 inline-flex divide-x rounded-md shadow-xs rtl:space-x-reverse">
      <Button
        variant={isDockerContainerRunning ? "secondary" : "default"}
        className="rounded-none shadow-none first:rounded-s-md last:rounded-e-md focus-visible:z-10"
        size="sm"
        onClick={isDockerContainerRunning ? onStop : onStart}
        disabled={proxyList.length === 0 || proxyListHasDuplicatePorts}
      >
        <DockerIcon className="w-4 h-4" />
        {isDockerContainerRunning ? "Stop Container" : "Start Container"}
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant={isDockerContainerRunning ? "secondary" : "default"}
            className="rounded-none shadow-none first:rounded-s-md last:rounded-e-md focus-visible:z-10"
            size="icon-sm"
            aria-label="Options"
            disabled={proxyList.length === 0 || proxyListHasDuplicatePorts}
          >
            <ChevronDownIcon size={16} aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="bottom" sideOffset={4} align="end">
          <DropdownMenuItem
            onClick={onStop}
            disabled={!isDockerContainerRunning}
          >
            <CircleStop className="opacity-60 w-4 h-4" aria-hidden="true" />
            Stop Container
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={onRestart}
            disabled={!isDockerContainerRunning}
          >
            <RotateCcw className="opacity-60 w-4 h-4" aria-hidden="true" />
            Restart Container
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onShowLogs}>
            <LogsIcon className="opacity-60 w-4 h-4" aria-hidden="true" />
            Open Logs
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
});

ButtonWithDropdown.displayName = "ButtonWithDropdown";

export default function DockerControl({}: {}) {
  const { proxyList } = proxyListStore();
  const { checkDockerContainerStatus } = useDocker();
  const [dockerProcessStream, setDockerProcessStream] = useState<any>("");
  const [dockerModalOpen, setDockerModalOpen] = useState(false);
  const [detailedLog, setDetailedLog] = useState<any>("");

  const appendDockerProcessStream = useCallback(
    (line: any, isDetail: boolean = false) => {
      if (typeof line === "string") {
        if (isDetail) {
        } else {
          setDockerProcessStream((prev: any) => prev + `${line}`);
        }
        setDetailedLog((prev: any) => prev + `${line}`);
      } else {
        if (isDetail) {
        } else {
          setDockerProcessStream((prev: any) => prev + line);
        }
        setDetailedLog((prev: any) => prev + line);
      }
    },
    []
  );

  const checkDockerContainerExists = async () => {
    const appDataDirPath = await appDataDir();
    const dockerComposePath = `${appDataDirPath}/docker-compose.yml`;
    const lines: string[] = [];
    return new Promise<boolean>((resolve) => {
      const command = Command.create("check-docker-container-exists", [
        "compose",
        "-f",
        dockerComposePath,
        "ps",
        "--all",
      ]);
      command.on("close", (data) => {
        const linesFlattened = lines.join("\n");
        appendDockerProcessStream(`${linesFlattened}`, true);
        if (linesFlattened.includes("ophiuchi-nginx")) {
          appendDockerProcessStream(
            `✅ Container exists. Ophiuchi will stop and remove container...\n`
          );
          resolve(true);
        } else {
          appendDockerProcessStream(
            `🚧 Container doesn't exist. Ophiuchi will create and start container...\n`
          );
          resolve(false);
        }
        // if (data.code == 0) {
        //   resolve(true);
        // } else {
        //   resolve(false);
        // }
      });
      command.on("error", (error) =>
        console.error(`command error: "${error}"`)
      );
      const child = command.spawn();

      appendDockerProcessStream(`👉 Checking if container exists...\n`);
      command.stdout.on("data", (line) => {
        // check line output data and find if "ophiuchi-nginx" exists
        lines.push(`${line}`);
      });
      // command.stderr.on("data", (line) => appendDockerProcessStream(`${line}`));
    });
  };

  const waitForContainerStop = async () => {
    return new Promise<void>(async (resolve, reject) => {
      const startTime = Date.now();
      const appDataDirPath = await appDataDir();
      const checkInterval = setInterval(async () => {
        if (!(await checkDockerContainerStatus(appDataDirPath)).isRunning) {
          clearInterval(checkInterval);
          resolve();
        } else if (Date.now() - startTime > 30000) {
          clearInterval(checkInterval);
          appendDockerProcessStream(
            "⚠️ Container stop timeout after 30 seconds\n"
          );
          reject(new Error("Container stop timeout"));
        }
      }, 500);
    });
  };

  const stopDocker = async () => {
    return new Promise<void>(async (resolve, reject) => {
      const toastId = toast.loading(`Stopping container...`);
      const command = Command.create("run-docker-compose", [
        "compose",
        "-f",
        `${await appDataDir()}/docker-compose.yml`,
        "down",
      ]);
      command.on("close", async (data) => {
        if (data.code == 0) {
          appendDockerProcessStream("💤 Waiting for container to stop...\n");

          try {
            await waitForContainerStop();
            appendDockerProcessStream("✅ Container removed successfully!\n");
            resolve();
            toast.success(`Container stopped and removed successfully!`, {
              id: toastId,
            });
          } catch (error) {
            // log output
            appendDockerProcessStream(
              `🚨 Remove container failed timeout after 30 seconds\n`
            );
            resolve();
            toast.error(`Container stop and remove failed due to timeout!`, {
              id: toastId,
            });
          }
        } else {
          appendDockerProcessStream(
            `🚨 Remove container failed with code ${data.code} and signal ${data.signal}\n`
          );
          resolve();
          toast.error(`Container stop and remove failed!`, {
            id: toastId,
          });
        }
      });
      command.on("error", (error) =>
        appendDockerProcessStream(`command error: "${error}"\n`, true)
      );
      command.stdout.on("data", (line) =>
        appendDockerProcessStream(`${line}`, true)
      );
      command.stderr.on("data", (line) =>
        appendDockerProcessStream(`${line}`, true)
      );
      const child = await command.spawn();
      appendDockerProcessStream(`👉 Stopping Container...\n`);
      appendDockerProcessStream(
        `Command spawned with pid ${child.pid}\n`,
        true
      );
    });
  };

  const startDocker = async () => {
    const exists = await checkDockerContainerExists();
    if (exists) {
      await stopDocker();
    }

    const certMgr = CertificateManager.shared();
    const toastId = toast.loading(
      `Generating ${proxyList.length} nginx configuration files...`
    );
    const nginxGen = proxyList.map((proxy) => {
      return certMgr.generateNginxConfigurationFiles(
        proxy.hostname,
        proxy.port
      );
    });

    // generate nginx configuration files
    await Promise.all(nginxGen);
    toast.success(`Generated ${proxyList.length} nginx configuration files`, {
      id: toastId,
    });

    const resourcePath = await resolveResource(
      "bundle/templates/docker-compose.yml.template"
    );

    console.log(`resourcePath: ${resourcePath}`);
    const dockerComposeTemplate = await readTextFile(resourcePath);

    const toastId2 = toast.loading(`Starting container...`);

    appendDockerProcessStream(`👉 Starting container...\n`);
    await writeTextFile(`docker-compose.yml`, dockerComposeTemplate, {
      baseDir: BaseDirectory.AppData,
    });

    const appDataDirPath = await appDataDir();
    const command = Command.create("run-docker-compose", [
      "compose",
      "-f",
      `${appDataDirPath}/docker-compose.yml`,
      "up",
      "-d",
    ]);
    command.on("close", (data) => {
      if (data.code == 0) {
        appendDockerProcessStream(
          `✅ Starting container successfully finished!\n`
        );
        toast.success(`Starting container successfully finished!`, {
          id: toastId2,
        });
      } else {
        appendDockerProcessStream(
          `🚨 Starting container failed with code ${data.code} and signal ${data.signal}\n`
        );
        toast.error(`Starting container failed!`, {
          id: toastId2,
        });
      }
    });
    command.on("error", (error) => {
      appendDockerProcessStream(`command error: "${error}"\n`, true);
      toast.error(`Starting container failed!`, {
        id: toastId2,
      });
    });
    command.stdout.on("data", (line) =>
      appendDockerProcessStream(`${line}`, true)
    );
    command.stderr.on("data", (line) =>
      appendDockerProcessStream(`${line}`, true)
    );
    const child = await command.spawn();
    appendDockerProcessStream(`Command spawned with pid ${child.pid}\n`, true);
  };

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <ButtonWithDropdown
            onStart={() => {
              if (proxyList.length === 0) {
                return;
              }
              startDocker();
            }}
            onStop={() => {
              stopDocker();
            }}
            onRestart={() => {
              if (proxyList.length === 0) {
                return;
              }
              startDocker();
            }}
            onShowLogs={() => {
              setDockerModalOpen(true);
            }}
          />
        </TooltipTrigger>
        <TooltipContent side="bottom" sideOffset={12}>
          <p>Start docker container to apply your current proxy list.</p>
        </TooltipContent>
      </Tooltip>

      <DockerLogModal
        stream={dockerProcessStream}
        detailedStream={detailedLog}
        isOpen={dockerModalOpen}
        onClosed={() => {
          setDockerModalOpen(false);
        }}
      />
    </>
  );
}
