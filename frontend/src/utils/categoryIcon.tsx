import {
  UtensilsCrossed, Sparkles, Flame, Soup, Wheat, CakeSlice, CupSoda,
  Beef, Fish, Salad, Sandwich, Pizza, IceCreamCone, Coffee, EggFried,
  Drumstick, CookingPot, Croissant, Cookie, GlassWater, Wine, Nut,
  type LucideIcon,
} from 'lucide-react';

// Ordered rules: first match wins. Keep specific patterns before generic ones.
const RULES: Array<[RegExp, LucideIcon]> = [
  [/tandoor|kabab|kebab|grill|tikka|seekh/, Flame],
  [/biryani|pulao|fried rice|steamed rice/, CookingPot],
  [/noodle|hakka|chow|ramen|pasta|spaghetti/, Soup],
  [/naan|bread|roti|paratha|kulcha/, Wheat],
  [/pizza/, Pizza],
  [/burger|sandwich|wrap|roll/, Sandwich],
  [/dessert|sweet|cake|pastry|mithai/, CakeSlice],
  [/ice.?cream|kulfi|gelato/, IceCreamCone],
  [/cookie|biscuit/, Cookie],
  [/croissant|bakery|bake/, Croissant],
  [/tea|coffee|cappuccino|latte/, Coffee],
  [/shake|smoothie|juice|mocktail|soda|cold drink/, CupSoda],
  [/beverage|drink|water/, GlassWater],
  [/cocktail|beer|wine|spirit|liquor|bar/, Wine],
  [/chicken|poultry|wings/, Drumstick],
  [/mutton|lamb|beef|steak|meat|bbq/, Beef],
  [/fish|seafood|prawn|shrimp|crab/, Fish],
  [/egg|omelet|omelette/, EggFried],
  [/salad|healthy|green/, Salad],
  [/soup|broth|shorba/, Soup],
  [/starter|appetizer|snack|nut/, Nut],
  [/main|curry|gravy|thali|combo|meal/, UtensilsCrossed],
];

export function getCategoryIcon(name: string | null | undefined): LucideIcon {
  if (!name) return UtensilsCrossed;
  const n = name.toLowerCase();
  for (const [re, icon] of RULES) {
    if (re.test(n)) return icon;
  }
  return UtensilsCrossed;
}

/** Icon used for the "All" pseudo-category. */
export const AllCategoryIcon = Sparkles;

interface CategoryIconProps {
  name: string | null | undefined;
  className?: string;
  strokeWidth?: number;
  style?: React.CSSProperties;
}

/** Renders the lucide icon for a category name. Use `__all__` for the "All" chip. */
export function CategoryIcon({ name, className, strokeWidth, style }: CategoryIconProps) {
  const Icon = name === '__all__' ? AllCategoryIcon : getCategoryIcon(name);
  return <Icon className={className} strokeWidth={strokeWidth} style={style} />;
}
