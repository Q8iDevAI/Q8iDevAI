import { describe, expect, it } from "vitest";
import { availableStarterTriggerConnections } from "./starter-trigger.js";

describe("starter trigger connections", () => {
  it("returns only concrete connections that can back the generated trigger", () => {
    expect(
      availableStarterTriggerConnections(
        {
          github: [
            {
              slug: "github-getq8idevai",
              accountLogin: "getq8idevai",
              accountType: "Organization",
              repositories: ["getq8idevai/q8idevai"],
            },
          ],
          slack: [{ slug: "q8idevai", teamName: "Q8iDevAI" }],
          discord: [{ slug: "q8idevai-discord", guildName: "Q8iDevAI Discord" }],
          daemons: [],
          linear: [],
        },
        "getq8idevai/q8idevai",
      ),
    ).toEqual([
      {
        id: "github:getq8idevai/q8idevai",
        label: "GitHub — getq8idevai/q8idevai",
        provider: "github",
        filters: { connection: "github-getq8idevai", repo: "getq8idevai/q8idevai" },
      },
      {
        id: "slack:q8idevai",
        label: "Slack — Q8iDevAI",
        provider: "slack",
        filters: { connection: "q8idevai" },
      },
      {
        id: "discord:q8idevai-discord",
        label: "Discord — Q8iDevAI Discord",
        provider: "discord",
        filters: { connection: "q8idevai-discord" },
      },
    ]);
  });

  it("does not offer GitHub when the current repository is not connected", () => {
    expect(
      availableStarterTriggerConnections(
        {
          github: [
            {
              slug: "github-getq8idevai",
              accountLogin: "getq8idevai",
              accountType: "Organization",
              repositories: ["getq8idevai/hub"],
            },
          ],
          slack: [],
          discord: [],
          daemons: [],
          linear: [],
        },
        "getq8idevai/q8idevai",
      ),
    ).toEqual([]);
  });
});
