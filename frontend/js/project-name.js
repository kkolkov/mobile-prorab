import {validArea} from './validation.js';

export function updateNameArea(name, area){
  if (!validArea(area)) return name;
  const value = String(Number(String(area).replace(',', '.')));
  return name.replace(/(^|\s)\d+(?:[.,]\d+)?(\s*м²\s*)$/u, (_, space, unit) => space + value + unit);
}
