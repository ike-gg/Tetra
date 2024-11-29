import { Interaction } from "discord.js";
import {
  DiscordBot,
  ExecutableButtonInteraction,
  ExecutableCommandInteraction,
  ExecutableSelectMenu,
} from "./types";
import { FeedbackManager } from "./utils/managers/FeedbackManager";
import interactionLogger from "./utils/interactionLoggers";
import { BANNEDLIST } from "./bannedusers";
import { TetraEmbed } from "./utils/embedMessages/TetraEmbed";
import { env } from "./env";
import { BLACKLISTED_GUILDS } from "./blacklistedguilds";

const interactionHandler = async (interaction: Interaction, client: DiscordBot) => {
  const banDetails = BANNEDLIST.find(
    (bannedUser) => bannedUser.userId === interaction.user.id
  );

  const blacklistedGuild = BLACKLISTED_GUILDS.find(
    (guild) => guild.guildId === interaction.guildId
  );

  if (blacklistedGuild) blacklistedGuild.isActive && (await interaction.guild?.leave());

  if (banDetails) {
    if (!interaction.isRepliable()) return;
    interaction.reply({
      embeds: [
        TetraEmbed.error({
          title: "Banned",
          description: `Reason: ${banDetails.reason || "-"}`,
        }),
      ],
    });
    return;
  }

  if (interaction.isAutocomplete()) {
    const command = client.commands.get(
      interaction.commandName
    ) as ExecutableCommandInteraction;

    if (!command) return;

    try {
      command.autocomplete(interaction, client);
    } catch {
      console.error("not found autocomplete function for this.");
    }
  }

  if (interaction.isCommand()) {
    interactionLogger(interaction, client);

    const command = client.commands.get(
      interaction.commandName
    ) as ExecutableCommandInteraction;

    if (!command) return;

    try {
      command.execute(interaction, client);
    } catch {}
  }

  const isButtonInteraction = interaction.isButton();
  const isSelectMenuInteraction = interaction.isSelectMenu();

  if (isButtonInteraction || isSelectMenuInteraction) {
    const feedback = new FeedbackManager(interaction);

    const isDevCommand = interaction.message.interaction?.commandName.startsWith("dev");

    if (env.node_env === "development" && !isDevCommand) return;
    if (env.node_env === "production" && isDevCommand) return;

    const isForAll = interaction.customId.split(":")[1] === "all";

    const currentUserId = interaction.user.id;
    const originalUserId = interaction.message.interaction!.user.id;

    if (currentUserId !== originalUserId && !isForAll) {
      interaction.deferUpdate();
      return;
    }

    const interactionTaskId = interaction.customId.split(":")[0];

    let taskDetails;

    if (interactionTaskId === "cancelAction") {
      taskDetails = {
        action: "cancelAction",
      };
    } else if (interactionTaskId === "errorlog") {
      taskDetails = {
        action: "errorLog",
      };
    } else if (interactionTaskId === "premiumoffering") {
      taskDetails = {
        action: "premiumoffering",
      };
    } else if (interactionTaskId === "describeMedia") {
      taskDetails = {
        action: "describeMedia",
      };
    } else {
      taskDetails = client.tasks.getTask(interactionTaskId);
    }

    if (!taskDetails) {
      await feedback.removeComponents();
      await feedback.interactionTimeout();
      return;
    }

    if (isButtonInteraction) {
      const buttonInteraction = client.buttonInteractions.get(
        taskDetails.action
      ) as ExecutableButtonInteraction;

      if (!buttonInteraction) return;

      try {
        buttonInteraction.execute(interaction, client);
      } catch {
        console.error;
      }
    }

    if (isSelectMenuInteraction) {
      const selectMenuInteraction = client.selectMenu.get(
        taskDetails.action
      ) as ExecutableSelectMenu;

      if (!selectMenuInteraction) return;

      try {
        selectMenuInteraction.execute(interaction, client);
        await feedback.removeComponents();
      } catch {
        console.error;
      }
    }
  }
};

export default interactionHandler;
