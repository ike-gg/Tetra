import { Interaction } from "discord.js";

export const parseEntitlementsData = (interaction: Interaction) => {
  const entitlements = interaction.entitlements;

  const hasTestEntitlement = entitlements.some(
    (ent) => ent.startsTimestamp === null && ent.endsTimestamp === null
  );

  const hasPurchaseEntitlement = entitlements.some(
    (ent) => ent.startsTimestamp !== null && ent.endsTimestamp !== null
  );

  return { hasTestEntitlement, hasPurchaseEntitlement };
};
