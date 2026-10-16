import { Industry } from './industries';

export type TemplateKind = 'recurring' | 'pack' | 'fee';
export type TemplateFrequency = 'monthly' | 'weekly' | 'yearly' | 'one_time';

export interface TemplateProgram {
  /** Stable id, unique within an industry. Clients send this back to apply a program. */
  key: string;
  name: string;
  description: string;
  billingFrequency: TemplateFrequency;
  /** Prefilled default; the owner can change it. */
  suggestedPrice: number;
  /** Typical market range, shown as helper text. */
  priceRange: [number, number];
  /** Class packs: number of sessions included. Only applied when Class Booking is enabled. */
  maxClasses?: number;
  /** Fixed-length programs: auto-cancel after this many billing cycles. */
  maxBillingCycles?: number;
  kind: TemplateKind;
  /** Pre-checked in the picker. */
  defaultSelected: boolean;
}

export interface IndustryTemplate {
  industry: Industry;
  label: string;
  programs: TemplateProgram[];
}

/**
 * Starter programs by industry. Prices are rounded midpoints of published fee sheets and
 * pricing guides (see docs/specs/program-templates.md) and are only defaults — programs are
 * always created inactive so owners review them before anything is billable.
 *
 * Only charges that can be enrolled once per student belong here. Repeatable charges (belt tests,
 * costumes, drop-ins) and per-family fees are intentionally excluded; see the spec.
 */
export const PROGRAM_TEMPLATES: IndustryTemplate[] = [
  {
    industry: 'dance',
    label: 'Dance',
    programs: [
      {
        key: 'weekly_1hr',
        name: 'Weekly class (1 hour)',
        description: 'One hour of class per week, billed monthly.',
        billingFrequency: 'monthly',
        suggestedPrice: 75,
        priceRange: [60, 100],
        kind: 'recurring',
        defaultSelected: true,
      },
      {
        key: 'weekly_2hr',
        name: 'Weekly classes (2 hours)',
        description: 'Two hours of class per week, billed monthly.',
        billingFrequency: 'monthly',
        suggestedPrice: 139,
        priceRange: [110, 160],
        kind: 'recurring',
        defaultSelected: true,
      },
      {
        key: 'unlimited',
        name: 'Unlimited classes',
        description: 'Attend any scheduled class, billed monthly.',
        billingFrequency: 'monthly',
        suggestedPrice: 189,
        priceRange: [150, 220],
        kind: 'recurring',
        defaultSelected: false,
      },
      {
        key: 'private_30',
        name: 'Private lesson (30 min weekly)',
        description: 'A weekly 30-minute private lesson, billed monthly.',
        billingFrequency: 'monthly',
        suggestedPrice: 120,
        priceRange: [100, 150],
        kind: 'recurring',
        defaultSelected: false,
      },
      {
        key: 'registration',
        name: 'Registration fee',
        description: 'One-time registration fee per dancer.',
        billingFrequency: 'one_time',
        suggestedPrice: 40,
        priceRange: [25, 60],
        kind: 'fee',
        defaultSelected: true,
      },
    ],
  },
  {
    industry: 'martial_arts',
    label: 'Martial arts',
    programs: [
      {
        key: 'kids_membership',
        name: 'Kids membership',
        description: 'Unlimited kids classes, billed monthly.',
        billingFrequency: 'monthly',
        suggestedPrice: 120,
        priceRange: [80, 150],
        kind: 'recurring',
        defaultSelected: true,
      },
      {
        key: 'adult_membership',
        name: 'Adult membership',
        description: 'Unlimited adult classes, billed monthly.',
        billingFrequency: 'monthly',
        suggestedPrice: 150,
        priceRange: [100, 200],
        kind: 'recurring',
        defaultSelected: true,
      },
      {
        key: 'class_pass_10',
        name: '10-class pass',
        description: 'Ten classes to use at your own pace.',
        billingFrequency: 'one_time',
        suggestedPrice: 200,
        priceRange: [150, 300],
        maxClasses: 10,
        kind: 'pack',
        defaultSelected: false,
      },
      {
        key: 'private_pack_5',
        name: 'Private lesson pack (5)',
        description: 'Five one-on-one private lessons.',
        billingFrequency: 'one_time',
        suggestedPrice: 400,
        priceRange: [300, 700],
        maxClasses: 5,
        kind: 'pack',
        defaultSelected: false,
      },
      {
        key: 'enrollment_fee',
        name: 'Enrollment fee',
        description: 'One-time enrollment fee per student.',
        billingFrequency: 'one_time',
        suggestedPrice: 60,
        priceRange: [25, 150],
        kind: 'fee',
        defaultSelected: true,
      },
      {
        key: 'uniform',
        name: 'Uniform',
        description: 'Student uniform, charged once.',
        billingFrequency: 'one_time',
        suggestedPrice: 60,
        priceRange: [40, 120],
        kind: 'fee',
        defaultSelected: false,
      },
    ],
  },
  {
    industry: 'music',
    label: 'Music',
    programs: [
      {
        key: 'private_30',
        name: 'Private lesson (30 min weekly)',
        description: 'A weekly 30-minute private lesson, billed monthly.',
        billingFrequency: 'monthly',
        suggestedPrice: 160,
        priceRange: [120, 250],
        kind: 'recurring',
        defaultSelected: true,
      },
      {
        key: 'private_45',
        name: 'Private lesson (45 min weekly)',
        description: 'A weekly 45-minute private lesson, billed monthly.',
        billingFrequency: 'monthly',
        suggestedPrice: 225,
        priceRange: [180, 330],
        kind: 'recurring',
        defaultSelected: false,
      },
      {
        key: 'private_60',
        name: 'Private lesson (60 min weekly)',
        description: 'A weekly 60-minute private lesson, billed monthly.',
        billingFrequency: 'monthly',
        suggestedPrice: 285,
        priceRange: [200, 450],
        kind: 'recurring',
        defaultSelected: true,
      },
      {
        key: 'group_6wk',
        name: 'Group class (6 weeks)',
        description: 'A six-week group class, one weekly session.',
        billingFrequency: 'one_time',
        suggestedPrice: 180,
        priceRange: [150, 210],
        maxClasses: 6,
        kind: 'pack',
        defaultSelected: false,
      },
      {
        key: 'trial_lesson',
        name: 'Trial lesson',
        description: 'A single introductory lesson.',
        billingFrequency: 'one_time',
        suggestedPrice: 45,
        priceRange: [25, 50],
        maxClasses: 1,
        kind: 'pack',
        defaultSelected: false,
      },
    ],
  },
  {
    industry: 'swim',
    label: 'Swim',
    programs: [
      {
        key: 'group_weekly',
        name: 'Group lessons (weekly)',
        description: 'One group lesson per week, billed monthly.',
        billingFrequency: 'monthly',
        suggestedPrice: 140,
        priceRange: [90, 160],
        kind: 'recurring',
        defaultSelected: true,
      },
      {
        key: 'semi_private_weekly',
        name: 'Semi-private lessons (weekly)',
        description: 'One semi-private lesson (2–3 swimmers) per week, billed monthly.',
        billingFrequency: 'monthly',
        suggestedPrice: 300,
        priceRange: [250, 450],
        kind: 'recurring',
        defaultSelected: false,
      },
      {
        key: 'private_weekly',
        name: 'Private lessons (weekly)',
        description: 'One private lesson per week, billed monthly.',
        billingFrequency: 'monthly',
        suggestedPrice: 200,
        priceRange: [150, 350],
        kind: 'recurring',
        defaultSelected: false,
      },
    ],
  },
  {
    industry: 'gymnastics',
    label: 'Gymnastics',
    programs: [
      {
        key: 'preschool_45',
        name: 'Preschool class (45 min)',
        description: 'A weekly 45-minute preschool class, billed monthly.',
        billingFrequency: 'monthly',
        suggestedPrice: 64,
        priceRange: [45, 140],
        kind: 'recurring',
        defaultSelected: true,
      },
      {
        key: 'recreational_1hr',
        name: 'Recreational class (1 hour)',
        description: 'A weekly one-hour recreational class, billed monthly.',
        billingFrequency: 'monthly',
        suggestedPrice: 90,
        priceRange: [52, 137],
        kind: 'recurring',
        defaultSelected: true,
      },
      {
        key: 'team_track',
        name: 'Team track',
        description: 'Competitive team-track training, billed monthly.',
        billingFrequency: 'monthly',
        suggestedPrice: 130,
        priceRange: [100, 200],
        kind: 'recurring',
        defaultSelected: true,
      },
    ],
  },
  {
    industry: 'personal_training',
    label: 'Personal training',
    programs: [
      {
        key: 'pack_12_one_on_one',
        name: '12-session pack (1-on-1)',
        description: 'Twelve one-on-one personal training sessions.',
        billingFrequency: 'one_time',
        suggestedPrice: 420,
        priceRange: [275, 575],
        maxClasses: 12,
        kind: 'pack',
        defaultSelected: true,
      },
      {
        key: 'pack_12_small_group',
        name: '12-session pack (small group)',
        description: 'Twelve small-group training sessions.',
        billingFrequency: 'one_time',
        suggestedPrice: 240,
        priceRange: [100, 300],
        maxClasses: 12,
        kind: 'pack',
        defaultSelected: true,
      },
      {
        key: 'pack_12_partner',
        name: '12-session pack (partner)',
        description: 'Twelve partner training sessions, priced per person.',
        billingFrequency: 'one_time',
        suggestedPrice: 336,
        priceRange: [150, 336],
        maxClasses: 12,
        kind: 'pack',
        defaultSelected: false,
      },
    ],
  },
  {
    industry: 'other',
    label: 'Other',
    programs: [
      {
        key: 'monthly_membership',
        name: 'Monthly membership',
        description: 'Recurring membership, billed monthly.',
        billingFrequency: 'monthly',
        suggestedPrice: 100,
        priceRange: [25, 250],
        kind: 'recurring',
        defaultSelected: true,
      },
      {
        key: 'class_pass_10',
        name: '10-class pass',
        description: 'Ten classes to use at your own pace.',
        billingFrequency: 'one_time',
        suggestedPrice: 150,
        priceRange: [50, 300],
        maxClasses: 10,
        kind: 'pack',
        defaultSelected: false,
      },
      {
        key: 'registration',
        name: 'Registration fee',
        description: 'One-time registration fee.',
        billingFrequency: 'one_time',
        suggestedPrice: 25,
        priceRange: [0, 60],
        kind: 'fee',
        defaultSelected: false,
      },
    ],
  },
];

export const getTemplate = (industry: string): IndustryTemplate | undefined =>
  PROGRAM_TEMPLATES.find((t) => t.industry === industry);
