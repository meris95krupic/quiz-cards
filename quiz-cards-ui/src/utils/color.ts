const FALLBACK_GRADIENTS = [
  'linear-gradient(135deg, #6C63FF, #FF6584)',
  'linear-gradient(135deg, #43CBFF, #9708CC)',
  'linear-gradient(135deg, #F7971E, #FFD200)',
  'linear-gradient(135deg, #11998e, #38ef7d)',
  'linear-gradient(135deg, #ee0979, #ff6a00)',
];

export const getCardBackground = (
  cardBgColor?: string,
  listBgColor?: string,
  index = 0
): string => {
  if (cardBgColor) return cardBgColor;
  if (listBgColor) return listBgColor;
  return FALLBACK_GRADIENTS[index % FALLBACK_GRADIENTS.length];
};

export const hexToRgba = (hex: string, alpha: number): string => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return `rgba(108, 99, 255, ${alpha})`;
  const r = parseInt(result[1], 16);
  const g = parseInt(result[2], 16);
  const b = parseInt(result[3], 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};
