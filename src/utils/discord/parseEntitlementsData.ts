import { Interaction } from "discord.js";

export const parseEntitlementsData = (interaction: Interaction) => {
  const entitlements = interaction.entitlements;

  const testEntitlement = entitlements.find(
    (ent) => ent.startsTimestamp === null && ent.endsTimestamp === null
  );

  const purchasedEntitlement = entitlements.find(
    (ent) => ent.startsTimestamp !== null && ent.endsTimestamp !== null
  );

  const hasPremium = entitlements.size > 0;

  return {
    testEntitlement,
    purchasedEntitlement,
    hasPremium,
    hasTestEntitlement: !!testEntitlement,
    hasPurchaseEntitlement: !!purchasedEntitlement,
  };
};
