import { ButtonBuilder, ButtonStyle } from "discord.js";

interface Options {
  label?: string;
  style?: ButtonStyle;
}

function getPremiumOfferingButton(options?: Options) {
  const { style = ButtonStyle.Primary, label = "Tetra Plus" } = options || {};

  const premiumOfferingButton = new ButtonBuilder()
    .setStyle(style)
    .setCustomId("premiumoffering")
    .setEmoji({
      name: "⭐",
    })
    .setLabel(label);

  return premiumOfferingButton;
}

export { getPremiumOfferingButton };
