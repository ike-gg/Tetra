import { Avatar, AvatarFallback, AvatarImage } from "@ui-sdk/react/avatar";

import { cn } from "@/lib/cn";

const SIZES = {
  sm: "size-6 text-[0.625rem]",
  lg: "size-14 text-base",
};

type ChannelAvatarProps = {
  channel: { avatarUrl: string; displayName: string };
  size?: keyof typeof SIZES;
  className?: string;
};

// Decorative: the channel's name is always written next to it. Square, like every avatar.
export function ChannelAvatar({ channel, size = "sm", className }: ChannelAvatarProps) {
  return (
    <Avatar
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center overflow-hidden bg-neutral-800 font-medium text-neutral-300",
        SIZES[size],
        className
      )}
    >
      {channel.avatarUrl && (
        <AvatarImage
          src={channel.avatarUrl}
          alt=""
          loading="lazy"
          draggable={false}
          className="size-full object-cover"
        />
      )}
      <AvatarFallback>{channel.displayName.slice(0, 1).toUpperCase()}</AvatarFallback>
    </Avatar>
  );
}
