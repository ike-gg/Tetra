import {
  AttachmentBuilder,
  ChatInputCommandInteraction,
  SlashCommandBuilder,
} from "discord.js";

import fetch from "node-fetch";
import { DiscordBot } from "../types";
import getTikTokVideo from "../utils/getTikTokVideo";
import * as fs from "fs";
//@ts-ignore
import videoshow from "videoshow";
import getBufferFromUrl from "../emotes/source/getBufferFromUrl";
import { tetraTempDirectory } from "../constants";
import sharp from "sharp";
import { FeedbackManager } from "../utils/managers/FeedbackManager";
import { Messages } from "../constants/messages";

const importEmote = {
  data: new SlashCommandBuilder()
    .setName("tiktok")
    .setDescription("tiktacz")
    .addStringOption((option) =>
      option.setName("url").setDescription("tiktok url").setRequired(true)
    )
    .addIntegerOption((option) =>
      option
        .setName("time")
        .setDescription(
          "set time for each slide in seconds, default 3, not required"
        )
        .setRequired(false)
        .setMaxValue(15)
    ),
  async execute(interaction: ChatInputCommandInteraction, client: DiscordBot) {
    await new FeedbackManager(interaction).warning(Messages.NEW_MEDIA_COMMAND);
  },
};

export default importEmote;
