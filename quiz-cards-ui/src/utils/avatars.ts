export const AVATAR_EMOJIS = ['👨🏻', '👩🏽', '👨🏿', '👩🏻', '👨🏽', '👩🏿', '🧔🏼', '👱🏾‍♀️', '👨🏾‍🦳', '👩🏼‍🦱'];

export const getAvatarEmoji = (avatarId: number): string => {
  return AVATAR_EMOJIS[(avatarId - 1) % AVATAR_EMOJIS.length] ?? AVATAR_EMOJIS[0];
};
