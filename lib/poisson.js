export function poisson(lambda, k) {
  let f = 1;
  for (let i = 1; i <= k; i++) f *= i;
  return Math.exp(-lambda) * Math.pow(lambda, k) / f;
}
