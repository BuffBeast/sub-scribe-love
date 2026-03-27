/**
 * Credit pricing calculator based on connections & add-ons chart.
 *
 * Formula derived from the pricing table:
 *   base = 0.5 + (connections × 0.5)
 *   addon_cost = add_ons × 0.1 × connections
 *   total = base + addon_cost
 *
 * Examples:
 *   1 conn, 0 addons → 1.0
 *   2 conn, 1 addon  → 1.7
 *   5 conn, 3 addons → 4.5
 */
export function calculateCredits(connections: number, addOns: number): number {
  const base = 0.5 + connections * 0.5;
  const addonCost = addOns * 0.1 * connections;
  return Math.round((base + addonCost) * 10) / 10; // round to 1 decimal
}

export function creditsPerConnection(connections: number, addOns: number): number {
  if (connections === 0) return 0;
  return Math.round((calculateCredits(connections, addOns) / connections) * 10) / 10;
}
