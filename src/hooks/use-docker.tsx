import { Command } from "@tauri-apps/plugin-shell";

interface DockerContainerStatus {
  isRunning: boolean;
  error?: string;
}

export default function useDocker() {
  const checkDockerContainerStatus = async (
    dockerComposePath: string
  ): Promise<DockerContainerStatus> => {
    try {
      // Execute docker compose ps command
      const command = Command.create("check-docker-container", [
        "compose",
        "-f",
        dockerComposePath,
        "ps",
        "--format",
        "json", // Use JSON format for easier parsing
      ]);

      const result = await command.execute();

      if (result.code !== 0) {
        console.log(`Docker command failed with status ${result.code}: ${result.stderr}`);
        return {
          isRunning: false,
          error: `Docker command failed with status ${result.code}: ${result.stderr}`,
        };
      }

      // Parse the JSON output
      const containers = JSON.parse(result.stdout);
      console.log(containers);
      // Check if any container is running
      // Docker compose ps returns an array of containers with their states
      const runningContainers = containers.filter(
        (container: any) => container.State === "running"
      );

      return {
        isRunning: runningContainers.length > 0,
      };
    } catch (error) {
      return {
        isRunning: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  };

  return {
    checkDockerContainerStatus,
  };
}
