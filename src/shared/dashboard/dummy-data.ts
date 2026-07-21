export const revenueTrend = [
  { month: "Apr", revenue: 1240000, target: 1200000 },
  { month: "May", revenue: 1380000, target: 1300000 },
  { month: "Jun", revenue: 1510000, target: 1400000 },
  { month: "Jul", revenue: 1420000, target: 1500000 },
  { month: "Aug", revenue: 1680000, target: 1550000 },
  { month: "Sep", revenue: 1820000, target: 1600000 },
  { month: "Oct", revenue: 1910000, target: 1700000 },
  { month: "Nov", revenue: 2040000, target: 1800000 },
  { month: "Dec", revenue: 2210000, target: 1900000 },
  { month: "Jan", revenue: 2130000, target: 2000000 },
  { month: "Feb", revenue: 2380000, target: 2100000 },
  { month: "Mar", revenue: 2540000, target: 2200000 },
];

export const monthlySales = [
  { month: "Apr", orders: 142, value: 1240000 },
  { month: "May", orders: 158, value: 1380000 },
  { month: "Jun", orders: 176, value: 1510000 },
  { month: "Jul", orders: 165, value: 1420000 },
  { month: "Aug", orders: 189, value: 1680000 },
  { month: "Sep", orders: 204, value: 1820000 },
];

export const purchaseTrend = [
  { month: "Apr", value: 820000 },
  { month: "May", value: 910000 },
  { month: "Jun", value: 1040000 },
  { month: "Jul", value: 980000 },
  { month: "Aug", value: 1120000 },
  { month: "Sep", value: 1240000 },
];

export const customerDistribution = [
  { name: "Manufacturing", value: 38 },
  { name: "Retail", value: 24 },
  { name: "Wholesale", value: 18 },
  { name: "Services", value: 12 },
  { name: "Others", value: 8 },
];

export const topProducts = [
  { name: "Steel Rod 12mm", sales: 480000, units: 1240 },
  { name: "Copper Wire 2.5sqmm", sales: 412000, units: 3180 },
  { name: "PVC Pipe 4-inch", sales: 358000, units: 890 },
  { name: "Cement Bag 50kg", sales: 316000, units: 2140 },
  { name: "Aluminum Sheet 1mm", sales: 274000, units: 620 },
];

export const topCustomers = [
  { name: "Ashok Industries", value: 842000, orders: 24 },
  { name: "Kirloskar Traders", value: 726000, orders: 19 },
  { name: "Bharat Enterprises", value: 618000, orders: 22 },
  { name: "Sundaram & Co.", value: 544000, orders: 15 },
  { name: "Reliance Metals", value: 482000, orders: 12 },
];

export const cashFlow = [
  { day: "Mon", inflow: 240000, outflow: 180000 },
  { day: "Tue", inflow: 310000, outflow: 210000 },
  { day: "Wed", inflow: 280000, outflow: 260000 },
  { day: "Thu", inflow: 350000, outflow: 230000 },
  { day: "Fri", inflow: 420000, outflow: 310000 },
  { day: "Sat", inflow: 180000, outflow: 120000 },
];

export function formatINR(n: number, compact = true): string {
  if (compact) {
    if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`;
    if (n >= 1e5) return `₹${(n / 1e5).toFixed(2)} L`;
    if (n >= 1e3) return `₹${(n / 1e3).toFixed(1)} K`;
  }
  return `₹${n.toLocaleString("en-IN")}`;
}
