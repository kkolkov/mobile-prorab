export function validArea(v){const n=Number(String(v).replace(',','.'));return Number.isFinite(n)&&n>=5&&n<=9999&&/^\d+(?:[.,]\d)?$/.test(String(v).trim())}
