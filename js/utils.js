export const formatDate = (value) => {
  if (!value) return '';
  return String(value).split(' ')[0];
};

export const titleCaseFirst = (value) => {
  if (!value) return '';
  const text = String(value);
  return text.charAt(0).toUpperCase() + text.slice(1);
};

export const truncateText = (text, length = 200) => {
  if (!text) return '';
  if (text.length <= length) return text;
  return `${text.slice(0, length).trim()}…`;
};
