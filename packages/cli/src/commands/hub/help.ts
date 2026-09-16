import type { Command } from "commander";

const resolutionHelp =
  "\nHub origin precedence: command origin/--hub, Q8IDEVAI_HUB_URL, active stored login, then https://hub.q8idevai.sh.\nCredential precedence: --api-key, Q8IDEVAI_HUB_API_KEY, then a stored login for the exact resolved origin.\n";

export function addHubResolutionHelp(command: Command): Command {
  return command.addHelpText("after", resolutionHelp);
}
