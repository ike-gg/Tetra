import { Avatar, AvatarFallback, AvatarImage } from "@ui-sdk/react/avatar";

import { cn } from "@/lib/cn";
import { type Guild, guildIconUrl, guildInitials } from "@/lib/guilds";

const SIZES = {
  sm: "size-5 text-[0.5625rem]",
  md: "size-10 text-xs",
  lg: "size-14 text-sm",
};

type GuildIconProps = {
  guild: Pick<Guild, "id" | "icon" | "name">;
  size?: keyof typeof SIZES;
  className?: string;
};

// Decorative: the server's name is always written next to it
export function GuildIcon({ guild, size = "md", className }: GuildIconProps) {
  const src = guildIconUrl(guild);

  return (
    <Avatar
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center overflow-hidden bg-neutral-800 font-medium text-neutral-300",
        SIZES[size],
        className
      )}
    >
      {src && (
        <AvatarImage
          src={src}
          alt=""
          loading="lazy"
          draggable={false}
          className="size-full object-cover"
        />
      )}
      <AvatarFallback>{guildInitials(guild.name)}</AvatarFallback>
    </Avatar>
  );
}
