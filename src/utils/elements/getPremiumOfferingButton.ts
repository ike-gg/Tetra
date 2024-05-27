import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";

interface Options {
  withActionRowWrapper?: boolean;
}

type ButtonReturnType = ButtonBuilder | ActionRowBuilder<ButtonBuilder>;

function getPremiumOfferingButton(): ButtonBuilder;
function getPremiumOfferingButton(
  options: Options
): ActionRowBuilder<ButtonBuilder>;
function getPremiumOfferingButton(options?: Options): ButtonReturnType {
  const { withActionRowWrapper = false } = options || {};

  const premiumOfferingButton = new ButtonBuilder()
    .setStyle(ButtonStyle.Success)
    .setCustomId("premiumoffering")
    .setEmoji({ name: "⭐" })
    .setLabel("Remove watermark");

  if (withActionRowWrapper) {
    const actionRow = new ActionRowBuilder<ButtonBuilder>();
    actionRow.addComponents(premiumOfferingButton);
    return actionRow;
  }

  return premiumOfferingButton;
}

export { getPremiumOfferingButton };
