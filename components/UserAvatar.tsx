interface UserAvatarProps {
  avatar: string | null;
  email: string;
  size?: "sm" | "md" | "header";
}

const SIZES = {
  sm: "w-6 h-6 text-xs",
  md: "w-8 h-8 text-base",
  header: "w-7 h-7 text-base",
};

export function UserAvatar({ avatar, email, size = "sm" }: UserAvatarProps) {
  const dim = SIZES[size];
  if (avatar) {
    return (
      <span className={`${dim} flex items-center justify-center`}>
        {avatar}
      </span>
    );
  }
  return (
    <span
      className={`${dim} rounded-full bg-indigo-100 dark:bg-indigo-900/40 retro:bg-transparent retro:border retro:border-retro-green text-indigo-600 dark:text-indigo-400 retro:text-retro-green flex items-center justify-center font-medium uppercase`}
    >
      {email?.[0] ?? "?"}
    </span>
  );
}
